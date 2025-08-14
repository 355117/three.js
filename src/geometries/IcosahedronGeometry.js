// 导入多面体几何体基类
import { PolyhedronGeometry } from "./PolyhedronGeometry.js";

/**
 * 用于表示二十面体的几何体类。
 * 二十面体是一个有20个等边三角形面的正多面体。
 *
 * ```js
 * const geometry = new THREE.IcosahedronGeometry();
 * const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
 * const icosahedron = new THREE.Mesh( geometry, material );
 * scene.add( icosahedron );
 * ```
 *
 * @augments PolyhedronGeometry
 */
class IcosahedronGeometry extends PolyhedronGeometry {
  /**
   * 构造一个新的二十面体几何体。
   *
   * @param {number} [radius=1] - 二十面体的半径。
   * @param {number} [detail=0] - 将此值设置为大于0会添加顶点，使其不再是标准二十面体。
   */
  constructor(radius = 1, detail = 0) {
    // 计算黄金比例，用于二十面体顶点坐标计算
    const t = (1 + Math.sqrt(5)) / 2;

    // 定义二十面体的12个顶点坐标
    // 这些顶点按照二十面体的数学定义排列
    const vertices = [
      -1,
      t,
      0,
      1,
      t,
      0,
      -1,
      -t,
      0,
      1,
      -t,
      0, // 第一组：±1, ±t, 0
      0,
      -1,
      t,
      0,
      1,
      t,
      0,
      -1,
      -t,
      0,
      1,
      -t, // 第二组：0, ±1, ±t
      t,
      0,
      -1,
      t,
      0,
      1,
      -t,
      0,
      -1,
      -t,
      0,
      1, // 第三组：±t, 0, ±1
    ];

    // 定义二十面体的20个三角形面的顶点索引
    // 每三个数字代表一个三角形面的三个顶点索引
    const indices = [
      0,
      11,
      5,
      0,
      5,
      1,
      0,
      1,
      7,
      0,
      7,
      10,
      0,
      10,
      11, // 顶点0周围的5个面
      1,
      5,
      9,
      5,
      11,
      4,
      11,
      10,
      2,
      10,
      7,
      6,
      7,
      1,
      8, // 上半部分的5个面
      3,
      9,
      4,
      3,
      4,
      2,
      3,
      2,
      6,
      3,
      6,
      8,
      3,
      8,
      9, // 顶点3周围的5个面
      4,
      9,
      5,
      2,
      4,
      11,
      6,
      2,
      10,
      8,
      6,
      7,
      9,
      8,
      1, // 下半部分的5个面
    ];

    // 调用父类构造函数，传入顶点、索引、半径和细分级别
    super(vertices, indices, radius, detail);

    // 设置几何体类型标识
    this.type = "IcosahedronGeometry";

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
   * @return {IcosahedronGeometry} 一个新的实例。
   */
  static fromJSON(data) {
    // 使用JSON数据中的半径和细分级别参数创建新的二十面体几何体实例
    return new IcosahedronGeometry(data.radius, data.detail);
  }
}

// 导出二十面体几何体类
export { IcosahedronGeometry };
