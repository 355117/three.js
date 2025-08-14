// 导入多面体几何体基类
import { PolyhedronGeometry } from "./PolyhedronGeometry.js";

/**
 * 四面体几何体类，用于创建正四面体
 * 四面体是最简单的三维多面体，由4个三角形面组成
 *
 * ```js
 * const geometry = new THREE.TetrahedronGeometry();
 * const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
 * const tetrahedron = new THREE.Mesh( geometry, material );
 * scene.add( tetrahedron );
 * ```
 *
 * @augments PolyhedronGeometry
 */
class TetrahedronGeometry extends PolyhedronGeometry {
  /**
   * 构造一个新的四面体几何体
   *
   * @param {number} [radius=1] - 四面体的半径（从中心到顶点的距离）
   * @param {number} [detail=0] - 细分级别，大于0的值会添加更多顶点，使其不再是标准四面体
   */
  constructor(radius = 1, detail = 0) {
    // 定义四面体的4个顶点坐标
    // 每3个数字表示一个顶点的x,y,z坐标
    const vertices = [1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, -1];

    // 定义四面体的4个三角形面的顶点索引
    // 每3个数字表示一个三角形面的3个顶点索引
    const indices = [2, 1, 0, 0, 3, 2, 1, 3, 0, 2, 3, 1];

    // 调用父类构造函数，传入顶点、索引、半径和细分级别
    super(vertices, indices, radius, detail);

    // 设置几何体类型标识
    this.type = "TetrahedronGeometry";

    /**
     * 保存用于生成几何体的构造参数
     * 实例化后的任何修改都不会改变几何体
     *
     * @type {Object}
     */
    this.parameters = {
      radius: radius, // 半径参数
      detail: detail, // 细分级别参数
    };
  }

  /**
   * 从JSON对象创建四面体几何体实例的工厂方法
   *
   * @param {Object} data - 表示序列化几何体的JSON对象
   * @return {TetrahedronGeometry} 新的四面体几何体实例
   */
  static fromJSON(data) {
    // 使用JSON数据中的参数创建新的四面体几何体实例
    return new TetrahedronGeometry(data.radius, data.detail);
  }
}

// 导出四面体几何体类
export { TetrahedronGeometry };
