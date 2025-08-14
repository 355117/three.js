// 导入3D包围盒类，用于计算对象的边界框
import { Box3 } from "../math/Box3.js";
// 导入线段对象类，用于创建由多个线段组成的几何体
import { LineSegments } from "../objects/LineSegments.js";
// 导入基础线材质类，用于定义线条的外观
import { LineBasicMaterial } from "../materials/LineBasicMaterial.js";
// 导入缓冲属性类，用于存储几何数据
import { BufferAttribute } from "../core/BufferAttribute.js";
// 导入缓冲几何体类，用于高效存储几何数据
import { BufferGeometry } from "../core/BufferGeometry.js";

// 创建私有包围盒对象，用于内部计算（使用@__PURE__标记进行优化）
const _box = /*@__PURE__*/ new Box3();

/**
 * 用于图形化显示对象周围世界轴对齐包围盒的辅助对象。
 * 实际的包围盒由Box3处理，这只是用于调试的可视化辅助器。
 * 当创建它的对象发生变换时，可以通过BoxHelper#update自动调整大小。
 * 注意对象必须有几何体才能工作，所以不适用于精灵。
 *
 * ```js
 * const sphere = new THREE.SphereGeometry();
 * const object = new THREE.Mesh( sphere, new THREE.MeshBasicMaterial( 0xff0000 ) );
 * const box = new THREE.BoxHelper( object, 0xffff00 );
 * scene.add( box );
 * ```
 *
 * @augments LineSegments
 */
class BoxHelper extends LineSegments {
  /**
   * 构造一个新的包围盒辅助器。
   *
   * @param {Object3D} [object] - 要显示世界轴对齐包围盒的3D对象。
   * @param {number|Color|string} [color=0xffff00] - 包围盒的颜色。
   */
  constructor(object, color = 0xffff00) {
    // 定义立方体线框的索引数组，每两个索引定义一条线段
    const indices = new Uint16Array([0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7]);
    // 创建8个顶点的位置数组（每个顶点3个坐标）
    const positions = new Float32Array(8 * 3);

    // 创建缓冲几何体对象
    const geometry = new BufferGeometry();
    // 设置索引缓冲，定义线段连接关系
    geometry.setIndex(new BufferAttribute(indices, 1));
    // 设置位置属性
    geometry.setAttribute("position", new BufferAttribute(positions, 3));

    // 调用父类构造函数，传入几何体和线材质
    super(geometry, new LineBasicMaterial({ color: color, toneMapped: false }));

    /**
     * 被可视化的3D对象。
     *
     * @type {Object3D}
     */
    this.object = object;
    // 设置对象类型标识
    this.type = "BoxHelper";

    // 禁用自动矩阵更新
    this.matrixAutoUpdate = false;

    // 初始化更新包围盒
    this.update();
  }

  /**
   * 更新辅助器的几何体以匹配对象的尺寸，包括任何子对象。
   */
  update() {
    // 如果对象已定义，从对象计算包围盒
    if (this.object !== undefined) {
      _box.setFromObject(this.object);
    }

    // 如果包围盒为空，直接返回
    if (_box.isEmpty()) return;

    // 获取包围盒的最小和最大点
    const min = _box.min;
    const max = _box.max;

    /*
    立方体顶点索引布局：
			5____4
		1/___0/|
		| 6__|_7
		2/___3/

		0: max.x, max.y, max.z  (右上前)
		1: min.x, max.y, max.z  (左上前)
		2: min.x, min.y, max.z  (左下前)
		3: max.x, min.y, max.z  (右下前)
		4: max.x, max.y, min.z  (右上后)
		5: min.x, max.y, min.z  (左上后)
		6: min.x, min.y, min.z  (左下后)
		7: max.x, min.y, min.z  (右下后)
		*/

    // 获取位置属性和其数组引用
    const position = this.geometry.attributes.position;
    const array = position.array;

    // 设置顶点0的坐标 (右上前)
    array[0] = max.x;
    array[1] = max.y;
    array[2] = max.z;
    // 设置顶点1的坐标 (左上前)
    array[3] = min.x;
    array[4] = max.y;
    array[5] = max.z;
    // 设置顶点2的坐标 (左下前)
    array[6] = min.x;
    array[7] = min.y;
    array[8] = max.z;
    // 设置顶点3的坐标 (右下前)
    array[9] = max.x;
    array[10] = min.y;
    array[11] = max.z;
    // 设置顶点4的坐标 (右上后)
    array[12] = max.x;
    array[13] = max.y;
    array[14] = min.z;
    // 设置顶点5的坐标 (左上后)
    array[15] = min.x;
    array[16] = max.y;
    array[17] = min.z;
    // 设置顶点6的坐标 (左下后)
    array[18] = min.x;
    array[19] = min.y;
    array[20] = min.z;
    // 设置顶点7的坐标 (右下后)
    array[21] = max.x;
    array[22] = min.y;
    array[23] = min.z;

    // 标记位置属性需要更新到GPU
    position.needsUpdate = true;

    // 重新计算几何体的包围球
    this.geometry.computeBoundingSphere();
  }

  /**
   * 为传入的对象更新线框包围盒。
   *
   * @param {Object3D} object - 要创建辅助器的3D对象。
   * @return {BoxHelper} 返回此实例的引用。
   */
  setFromObject(object) {
    // 设置要可视化的对象
    this.object = object;
    // 更新包围盒
    this.update();

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 复制另一个包围盒辅助器的属性到当前实例。
   *
   * @param {BoxHelper} source - 要复制的源包围盒辅助器。
   * @param {boolean} recursive - 是否递归复制子对象。
   * @return {BoxHelper} 返回当前实例以支持链式调用。
   */
  copy(source, recursive) {
    // 调用父类的复制方法
    super.copy(source, recursive);

    // 复制对象引用
    this.object = source.object;

    // 返回当前实例
    return this;
  }

  /**
   * 释放此实例分配的GPU相关资源。当此实例在应用中不再使用时调用此方法。
   */
  dispose() {
    // 释放几何体资源
    this.geometry.dispose();
    // 释放材质资源
    this.material.dispose();
  }
}

// 导出BoxHelper类
export { BoxHelper };
