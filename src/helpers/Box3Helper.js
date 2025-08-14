// 导入线段对象类，用于创建由多个线段组成的几何体
import { LineSegments } from "../objects/LineSegments.js";
// 导入基础线材质类，用于定义线条的外观
import { LineBasicMaterial } from "../materials/LineBasicMaterial.js";
// 导入缓冲属性类和32位浮点数缓冲属性类，用于存储几何数据
import { BufferAttribute, Float32BufferAttribute } from "../core/BufferAttribute.js";
// 导入缓冲几何体类，用于高效存储几何数据
import { BufferGeometry } from "../core/BufferGeometry.js";

/**
 * 用于可视化Box3实例的辅助对象。
 *
 * ```js
 * const box = new THREE.Box3();
 * box.setFromCenterAndSize( new THREE.Vector3( 1, 1, 1 ), new THREE.Vector3( 2, 1, 3 ) );
 *
 * const helper = new THREE.Box3Helper( box, 0xffff00 );
 * scene.add( helper )
 * ```
 *
 * @augments LineSegments
 */
class Box3Helper extends LineSegments {
  /**
   * 构造一个新的Box3辅助器。
   *
   * @param {Box3} box - 要可视化的包围盒。
   * @param {number|Color|string} [color=0xffff00] - 包围盒的颜色。
   */
  constructor(box, color = 0xffff00) {
    // 定义立方体线框的索引数组，每两个索引定义一条线段
    const indices = new Uint16Array([0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7]);

    // 定义立方体8个顶点的位置坐标（标准化的单位立方体）
    const positions = [1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1];

    // 创建缓冲几何体对象
    const geometry = new BufferGeometry();

    // 设置索引缓冲，定义线段连接关系
    geometry.setIndex(new BufferAttribute(indices, 1));

    // 设置位置属性，每3个数值表示一个顶点的xyz坐标
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));

    // 调用父类构造函数，传入几何体和线材质
    super(geometry, new LineBasicMaterial({ color: color, toneMapped: false }));

    /**
     * 被可视化的包围盒对象。
     *
     * @type {Box3}
     */
    this.box = box;

    // 设置对象类型标识
    this.type = "Box3Helper";

    // 计算几何体的包围球
    this.geometry.computeBoundingSphere();
  }

  /**
   * 更新对象的世界矩阵，根据包围盒的位置和大小调整辅助器的变换。
   *
   * @param {boolean} force - 是否强制更新矩阵。
   */
  updateMatrixWorld(force) {
    // 获取包围盒引用
    const box = this.box;

    // 如果包围盒为空，直接返回
    if (box.isEmpty()) return;

    // 将包围盒的中心点设置为辅助器的位置
    box.getCenter(this.position);

    // 将包围盒的尺寸设置为辅助器的缩放
    box.getSize(this.scale);

    // 将缩放值乘以0.5，因为标准立方体的边长是2，需要缩放到实际尺寸
    this.scale.multiplyScalar(0.5);

    // 调用父类的矩阵更新方法
    super.updateMatrixWorld(force);
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

// 导出Box3Helper类
export { Box3Helper };
