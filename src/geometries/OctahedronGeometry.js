// 导入多面体几何体基类
import { PolyhedronGeometry } from "./PolyhedronGeometry.js";

/**
 * 八面体几何体类，用于创建正八面体
 * 八面体是由8个三角形面组成的多面体，有6个顶点
 *
 * ```js
 * const geometry = new THREE.OctahedronGeometry();
 * const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
 * const octahedron = new THREE.Mesh( geometry, material );
 * scene.add( octahedron );
 * ```
 *
 * @augments PolyhedronGeometry
 */
class OctahedronGeometry extends PolyhedronGeometry {
  /**
   * 构造一个新的八面体几何体
   *
   * @param {number} [radius=1] - 八面体的半径（从中心到顶点的距离）
   * @param {number} [detail=0] - 细分级别，大于0的值会添加更多顶点，使其不再是标准八面体
   */
  constructor(radius = 1, detail = 0) {
    // 定义八面体的6个顶点坐标
    // 分别位于x、y、z轴的正负方向上
    const vertices = [
      1,
      0,
      0,
      -1,
      0,
      0,
      0,
      1,
      0, // 右、左、上顶点
      0,
      -1,
      0,
      0,
      0,
      1,
      0,
      0,
      -1, // 下、前、后顶点
    ];

    // 定义八面体的8个三角形面的顶点索引
    // 每3个数字表示一个三角形面的3个顶点索引
    const indices = [
      0,
      2,
      4,
      0,
      4,
      3,
      0,
      3,
      5, // 右侧的3个面
      0,
      5,
      2,
      1,
      2,
      5,
      1,
      5,
      3, // 右上面和左侧的2个面
      1,
      3,
      4,
      1,
      4,
      2, // 左侧的2个面
    ];

    // 调用父类构造函数，传入顶点、索引、半径和细分级别
    super(vertices, indices, radius, detail);

    // 设置几何体类型标识
    this.type = "OctahedronGeometry";

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
   * 从JSON对象创建八面体几何体实例的工厂方法
   *
   * @param {Object} data - 表示序列化几何体的JSON对象
   * @return {OctahedronGeometry} 新的八面体几何体实例
   */
  static fromJSON(data) {
    // 使用JSON数据中的参数创建新的八面体几何体实例
    return new OctahedronGeometry(data.radius, data.detail);
  }
}

// 导出八面体几何体类
export { OctahedronGeometry };
