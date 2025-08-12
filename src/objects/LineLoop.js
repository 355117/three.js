// 导入线条基类
import { Line } from "./Line.js";

/**
 * 连续闭合线条对象
 * 与普通线条（Line）几乎相同，唯一的区别是最后一个顶点会自动连接到第一个顶点，
 * 从而形成一个闭合的环形线条。常用于绘制多边形轮廓、边界线等需要闭合的图形。
 *
 * @augments Line
 */
class LineLoop extends Line {
  /**
   * 构造一个新的闭合线条对象
   *
   * @param {BufferGeometry} [geometry] - 线条的几何体，包含顶点位置等数据
   * @param {Material|Array<Material>} [material] - 线条的材质，可以是单个材质或材质数组
   */
  constructor(geometry, material) {
    // 调用父类构造函数，初始化基础线条属性
    super(geometry, material);

    /**
     * 用于类型检测的标志
     * 可以通过此属性判断对象是否为闭合线条
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isLineLoop = true;

    /**
     * 对象类型标识
     * 用于序列化和调试时识别对象类型
     *
     * @type {string}
     */
    this.type = "LineLoop";
  }
}

// 导出闭合线条类
export { LineLoop };
