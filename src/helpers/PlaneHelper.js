// 导入Line类，用于创建线条对象
import { Line } from "../objects/Line.js";
// 导入Mesh类，用于创建网格对象
import { Mesh } from "../objects/Mesh.js";
// 导入LineBasicMaterial类，用于创建基础线材质
import { LineBasicMaterial } from "../materials/LineBasicMaterial.js";
// 导入MeshBasicMaterial类，用于创建基础网格材质
import { MeshBasicMaterial } from "../materials/MeshBasicMaterial.js";
// 导入Float32BufferAttribute类，用于创建32位浮点数缓冲区属性
import { Float32BufferAttribute } from "../core/BufferAttribute.js";
// 导入BufferGeometry类，用于创建缓冲几何体
import { BufferGeometry } from "../core/BufferGeometry.js";

/**
 * 用于可视化平面实例的辅助对象
 *
 * 使用示例：
 * ```js
 * const plane = new THREE.Plane( new THREE.Vector3( 1, 1, 0.2 ), 3 );
 * const helper = new THREE.PlaneHelper( plane, 1, 0xffff00 );
 * scene.add( helper );
 * ```
 *
 * @augments Line
 */
class PlaneHelper extends Line {
  /**
   * 构造一个新的平面辅助器
   *
   * @param {Plane} plane - 要可视化的平面
   * @param {number} [size=1] - 平面辅助器的边长
   * @param {number|Color|string} [hex=0xffff00] - 辅助器的颜色
   */
  constructor(plane, size = 1, hex = 0xffff00) {
    // 保存颜色值
    const color = hex;

    // 定义平面边框的顶点位置（正方形边框）
    const positions = [1, -1, 0, -1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0, -1, -1, 0, 1, -1, 0, 1, 1, 0];

    // 创建边框几何体
    const geometry = new BufferGeometry();
    // 设置位置属性，每个顶点包含3个坐标值(x, y, z)
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    // 计算包围球
    geometry.computeBoundingSphere();

    // 调用父类构造函数，创建线条对象
    super(geometry, new LineBasicMaterial({ color: color, toneMapped: false }));

    // 设置对象类型标识
    this.type = "PlaneHelper";

    /**
     * 正在被可视化的平面
     *
     * @type {Plane}
     */
    this.plane = plane;

    /**
     * 平面辅助器的边长
     *
     * @type {number}
     * @default 1
     */
    this.size = size;

    // 定义平面填充的顶点位置（两个三角形组成正方形）
    const positions2 = [1, 1, 0, -1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0];

    // 创建填充几何体
    const geometry2 = new BufferGeometry();
    // 设置位置属性
    geometry2.setAttribute("position", new Float32BufferAttribute(positions2, 3));
    // 计算包围球
    geometry2.computeBoundingSphere();

    // 添加半透明的网格填充，用于更好地显示平面
    this.add(new Mesh(geometry2, new MeshBasicMaterial({ color: color, opacity: 0.2, transparent: true, depthWrite: false, toneMapped: false })));
  }

  /**
   * 更新世界矩阵，使辅助器与平面的位置和方向保持一致
   *
   * @param {boolean} force - 是否强制更新
   */
  updateMatrixWorld(force) {
    // 重置位置到原点
    this.position.set(0, 0, 0);

    // 设置缩放，使辅助器具有正确的大小
    this.scale.set(0.5 * this.size, 0.5 * this.size, 1);

    // 让辅助器朝向平面的法向量方向
    this.lookAt(this.plane.normal);

    // 沿着法向量方向移动到平面的正确位置
    this.translateZ(-this.plane.constant);

    // 调用父类的updateMatrixWorld方法
    super.updateMatrixWorld(force);
  }

  /**
   * 释放此实例分配的GPU相关资源。当应用程序中不再使用此实例时，
   * 应调用此方法以避免内存泄漏。
   */
  dispose() {
    // 释放边框几何体资源
    this.geometry.dispose();
    // 释放边框材质资源
    this.material.dispose();
    // 释放填充几何体资源
    this.children[0].geometry.dispose();
    // 释放填充材质资源
    this.children[0].material.dispose();
  }
}

// 导出PlaneHelper类
export { PlaneHelper };
