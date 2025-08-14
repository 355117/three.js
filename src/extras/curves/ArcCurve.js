// 导入椭圆曲线类，弧形曲线是椭圆曲线的特殊情况
import { EllipseCurve } from "./EllipseCurve.js";

/**
 * 表示弧形曲线的类
 * 弧形曲线是椭圆曲线的特殊情况，其中x和y方向的半径相等
 *
 * @augments EllipseCurve
 */
class ArcCurve extends EllipseCurve {
  /**
   * 构造一个新的弧形曲线
   *
   * @param {number} [aX=0] - 椭圆的X轴中心坐标
   * @param {number} [aY=0] - 椭圆的Y轴中心坐标
   * @param {number} [aRadius=1] - 椭圆在x方向的半径（对于弧形，x和y方向半径相等）
   * @param {number} [aStartAngle=0] - 曲线的起始角度（弧度），从正X轴开始计算
   * @param {number} [aEndAngle=Math.PI*2] - 曲线的结束角度（弧度），从正X轴开始计算
   * @param {boolean} [aClockwise=false] - 椭圆是否按顺时针方向绘制
   */
  constructor(aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise) {
    // 调用父类构造函数，传入相同的半径值使其成为圆弧而非椭圆弧
    super(aX, aY, aRadius, aRadius, aStartAngle, aEndAngle, aClockwise);

    /**
     * 用于类型检测的标志位
     * 可以通过检查此属性来确定对象是否为ArcCurve类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isArcCurve = true;

    // 设置曲线类型标识符
    this.type = "ArcCurve";
  }
}

// 导出ArcCurve类供其他模块使用
export { ArcCurve };
