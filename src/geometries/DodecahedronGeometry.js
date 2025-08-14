// 导入多面体几何体基类
import { PolyhedronGeometry } from "./PolyhedronGeometry.js";

/**
 * 用于表示十二面体的几何体类。
 * 十二面体是一个有12个正五边形面的正多面体。
 *
 * ```js
 * const geometry = new THREE.DodecahedronGeometry();
 * const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
 * const dodecahedron = new THREE.Mesh( geometry, material );
 * scene.add( dodecahedron );
 * ```
 *
 * @augments PolyhedronGeometry
 */
class DodecahedronGeometry extends PolyhedronGeometry {
  /**
   * 构造一个新的十二面体几何体。
   *
   * @param {number} [radius=1] - 十二面体的半径。
   * @param {number} [detail=0] - 将此值设置为大于0会添加顶点，使其不再是标准十二面体。
   */
  constructor(radius = 1, detail = 0) {
    // 计算黄金比例，用于十二面体顶点坐标计算
    const t = (1 + Math.sqrt(5)) / 2;
    // 计算黄金比例的倒数
    const r = 1 / t;

    // 定义十二面体的20个顶点坐标
    // 十二面体的顶点可以分为四组
    const vertices = [
      // 第一组：(±1, ±1, ±1) - 立方体的8个顶点
      -1,
      -1,
      -1,
      -1,
      -1,
      1,
      -1,
      1,
      -1,
      -1,
      1,
      1,
      1,
      -1,
      -1,
      1,
      -1,
      1,
      1,
      1,
      -1,
      1,
      1,
      1,

      // 第二组：(0, ±1/φ, ±φ) - 4个顶点
      0,
      -r,
      -t,
      0,
      -r,
      t,
      0,
      r,
      -t,
      0,
      r,
      t,

      // 第三组：(±1/φ, ±φ, 0) - 4个顶点
      -r,
      -t,
      0,
      -r,
      t,
      0,
      r,
      -t,
      0,
      r,
      t,
      0,

      // 第四组：(±φ, 0, ±1/φ) - 4个顶点
      -t,
      0,
      -r,
      t,
      0,
      -r,
      -t,
      0,
      r,
      t,
      0,
      r,
    ];

    // 定义十二面体的36个三角形面的顶点索引
    // 每三个数字代表一个三角形面的三个顶点索引
    // 十二面体的每个五边形面被分解为3个三角形
    const indices = [
      3,
      11,
      7,
      3,
      7,
      15,
      3,
      15,
      13, // 第一个五边形面的3个三角形
      7,
      19,
      17,
      7,
      17,
      6,
      7,
      6,
      15, // 第二个五边形面的3个三角形
      17,
      4,
      8,
      17,
      8,
      10,
      17,
      10,
      6, // 第三个五边形面的3个三角形
      8,
      0,
      16,
      8,
      16,
      2,
      8,
      2,
      10, // 第四个五边形面的3个三角形
      0,
      12,
      1,
      0,
      1,
      18,
      0,
      18,
      16, // 第五个五边形面的3个三角形
      6,
      10,
      2,
      6,
      2,
      13,
      6,
      13,
      15, // 第六个五边形面的3个三角形
      2,
      16,
      18,
      2,
      18,
      3,
      2,
      3,
      13, // 第七个五边形面的3个三角形
      18,
      1,
      9,
      18,
      9,
      11,
      18,
      11,
      3, // 第八个五边形面的3个三角形
      4,
      14,
      12,
      4,
      12,
      0,
      4,
      0,
      8, // 第九个五边形面的3个三角形
      11,
      9,
      5,
      11,
      5,
      19,
      11,
      19,
      7, // 第十个五边形面的3个三角形
      19,
      5,
      14,
      19,
      14,
      4,
      19,
      4,
      17, // 第十一个五边形面的3个三角形
      1,
      12,
      14,
      1,
      14,
      5,
      1,
      5,
      9, // 第十二个五边形面的3个三角形
    ];

    // 调用父类构造函数，传入顶点、索引、半径和细分级别
    super(vertices, indices, radius, detail);

    // 设置几何体类型标识
    this.type = "DodecahedronGeometry";

    /**
     * 保存用于生成几何体的构造函数参数。
     * 实例化后的任何修改都不会改变几何体。
     *
     * @type {Object}
     */
    this.parameters = {
      radius: radius, // 保存半径参数
      detail: detail, // 保存细分级别参数
    };
  }

  /**
   * 从给定的JSON对象创建此类实例的工厂方法。
   *
   * @param {Object} data - 表示序列化几何体的JSON对象。
   * @return {DodecahedronGeometry} 一个新的实例。
   */
  static fromJSON(data) {
    // 使用JSON数据中的半径和细分级别参数创建新的十二面体几何体实例
    return new DodecahedronGeometry(data.radius, data.detail);
  }
}

// 导出十二面体几何体类
export { DodecahedronGeometry };
