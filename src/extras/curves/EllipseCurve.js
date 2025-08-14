// 导入基础曲线类
import { Curve } from "../core/Curve.js";
// 导入二维向量类
import { Vector2 } from "../../math/Vector2.js";

/**
 * 表示椭圆曲线的类
 * 椭圆曲线可以绘制完整的椭圆或椭圆弧，支持旋转和方向控制
 *
 * ```js
 * const curve = new THREE.EllipseCurve(
 * 	0, 0,           // 椭圆中心坐标 (x, y)
 * 	10, 10,         // x和y方向的半径
 * 	0, 2 * Math.PI, // 起始角度和结束角度
 * 	false,          // 是否顺时针绘制
 * 	0               // 椭圆的旋转角度
 * );
 *
 * const points = curve.getPoints( 50 );  // 获取椭圆上的50个点
 * const geometry = new THREE.BufferGeometry().setFromPoints( points );
 *
 * const material = new THREE.LineBasicMaterial( { color: 0xff0000 } );
 *
 * // 创建最终的对象并添加到场景中
 * const ellipse = new THREE.Line( geometry, material );
 * ```
 *
 * @augments Curve
 */
class EllipseCurve extends Curve {
  /**
   * 构造一个新的椭圆曲线
   *
   * @param {number} [aX=0] - 椭圆的X轴中心坐标
   * @param {number} [aY=0] - 椭圆的Y轴中心坐标
   * @param {number} [xRadius=1] - 椭圆在x方向的半径
   * @param {number} [yRadius=1] - 椭圆在y方向的半径
   * @param {number} [aStartAngle=0] - 曲线的起始角度（弧度），从正X轴开始计算
   * @param {number} [aEndAngle=Math.PI*2] - 曲线的结束角度（弧度），从正X轴开始计算
   * @param {boolean} [aClockwise=false] - 椭圆是否按顺时针方向绘制
   * @param {number} [aRotation=0] - 椭圆的旋转角度（弧度），从正X轴逆时针计算
   */
  constructor(aX = 0, aY = 0, xRadius = 1, yRadius = 1, aStartAngle = 0, aEndAngle = Math.PI * 2, aClockwise = false, aRotation = 0) {
    // 调用父类构造函数
    super();

    /**
     * 用于类型检测的标志位
     * 可以通过检查此属性来确定对象是否为EllipseCurve类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isEllipseCurve = true;

    // 设置曲线类型标识符
    this.type = "EllipseCurve";

    /**
     * 椭圆的X轴中心坐标
     * 椭圆在二维平面上的水平中心位置
     *
     * @type {number}
     * @default 0
     */
    this.aX = aX;

    /**
     * 椭圆的Y轴中心坐标
     * 椭圆在二维平面上的垂直中心位置
     *
     * @type {number}
     * @default 0
     */
    this.aY = aY;

    /**
     * 椭圆在x方向的半径
     * 如果此值等于yRadius，则椭圆变为圆形
     *
     * @type {number}
     * @default 1
     */
    this.xRadius = xRadius;

    /**
     * 椭圆在y方向的半径
     * 如果此值等于xRadius，则椭圆变为圆形
     *
     * @type {number}
     * @default 1
     */
    this.yRadius = yRadius;

    /**
     * 曲线的起始角度（弧度）
     * 从正X轴开始计算，用于绘制椭圆弧
     *
     * @type {number}
     * @default 0
     */
    this.aStartAngle = aStartAngle;

    /**
     * 曲线的结束角度（弧度）
     * 从正X轴开始计算，默认为2π（完整椭圆）
     *
     * @type {number}
     * @default Math.PI*2
     */
    this.aEndAngle = aEndAngle;

    /**
     * 椭圆是否按顺时针方向绘制
     * false表示逆时针（默认），true表示顺时针
     *
     * @type {boolean}
     * @default false
     */
    this.aClockwise = aClockwise;

    /**
     * 椭圆的旋转角度（弧度）
     * 从正X轴逆时针计算，用于旋转整个椭圆
     *
     * @type {number}
     * @default 0
     */
    this.aRotation = aRotation;
  }

  /**
   * 返回椭圆曲线上指定参数位置的点
   * 使用椭圆的参数方程计算点的坐标，支持角度范围和旋转
   *
   * @param {number} t - 插值因子，表示曲线上的位置，必须在[0,1]范围内
   * @param {Vector2} [optionalTarget] - 可选的目标向量，结果将写入此向量
   * @return {Vector2} 椭圆曲线上的位置点
   */
  getPoint(t, optionalTarget = new Vector2()) {
    // 获取目标向量引用
    const point = optionalTarget;

    // 定义2π常量
    const twoPi = Math.PI * 2;
    // 计算角度差值
    let deltaAngle = this.aEndAngle - this.aStartAngle;
    // 检查起始和结束角度是否相同（在数值精度范围内）
    const samePoints = Math.abs(deltaAngle) < Number.EPSILON;

    // 确保deltaAngle在0到2π范围内
    while (deltaAngle < 0) deltaAngle += twoPi;
    while (deltaAngle > twoPi) deltaAngle -= twoPi;

    // 处理极小角度差的特殊情况
    if (deltaAngle < Number.EPSILON) {
      if (samePoints) {
        // 如果起始和结束角度相同，角度差为0
        deltaAngle = 0;
      } else {
        // 否则表示完整的一圈
        deltaAngle = twoPi;
      }
    }

    // 处理顺时针绘制的情况
    if (this.aClockwise === true && !samePoints) {
      if (deltaAngle === twoPi) {
        // 完整圆的顺时针方向
        deltaAngle = -twoPi;
      } else {
        // 部分弧的顺时针方向
        deltaAngle = deltaAngle - twoPi;
      }
    }

    // 计算当前参数t对应的角度
    const angle = this.aStartAngle + t * deltaAngle;
    // 使用椭圆参数方程计算基本坐标
    let x = this.aX + this.xRadius * Math.cos(angle);
    let y = this.aY + this.yRadius * Math.sin(angle);

    // 如果椭圆有旋转角度，应用旋转变换
    if (this.aRotation !== 0) {
      // 计算旋转角度的正弦和余弦值
      const cos = Math.cos(this.aRotation);
      const sin = Math.sin(this.aRotation);

      // 将点平移到原点（相对于椭圆中心）
      const tx = x - this.aX;
      const ty = y - this.aY;

      // 应用旋转矩阵，绕椭圆中心旋转点
      x = tx * cos - ty * sin + this.aX;
      y = tx * sin + ty * cos + this.aY;
    }

    // 设置并返回计算得到的点
    return point.set(x, y);
  }

  /**
   * 复制另一个椭圆曲线的属性到当前对象
   *
   * @param {EllipseCurve} source - 要复制的源椭圆曲线对象
   * @return {EllipseCurve} 返回当前对象，支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 复制椭圆中心坐标
    this.aX = source.aX;
    this.aY = source.aY;

    // 复制椭圆半径
    this.xRadius = source.xRadius;
    this.yRadius = source.yRadius;

    // 复制角度范围
    this.aStartAngle = source.aStartAngle;
    this.aEndAngle = source.aEndAngle;

    // 复制绘制方向
    this.aClockwise = source.aClockwise;

    // 复制旋转角度
    this.aRotation = source.aRotation;

    // 返回当前对象支持链式调用
    return this;
  }

  /**
   * 将椭圆曲线数据序列化为JSON格式
   * 用于保存或传输椭圆曲线数据
   *
   * @return {Object} 包含椭圆曲线数据的JSON对象
   */
  toJSON() {
    // 获取父类的JSON数据
    const data = super.toJSON();

    // 添加椭圆中心坐标
    data.aX = this.aX;
    data.aY = this.aY;

    // 添加椭圆半径
    data.xRadius = this.xRadius;
    data.yRadius = this.yRadius;

    // 添加角度范围
    data.aStartAngle = this.aStartAngle;
    data.aEndAngle = this.aEndAngle;

    // 添加绘制方向
    data.aClockwise = this.aClockwise;

    // 添加旋转角度
    data.aRotation = this.aRotation;

    // 返回完整的JSON数据
    return data;
  }

  /**
   * 从JSON数据恢复椭圆曲线对象
   * 用于加载或接收椭圆曲线数据
   *
   * @param {Object} json - 包含椭圆曲线数据的JSON对象
   * @return {EllipseCurve} 返回当前对象，支持链式调用
   */
  fromJSON(json) {
    // 调用父类的JSON恢复方法
    super.fromJSON(json);

    // 恢复椭圆中心坐标
    this.aX = json.aX;
    this.aY = json.aY;

    // 恢复椭圆半径
    this.xRadius = json.xRadius;
    this.yRadius = json.yRadius;

    // 恢复角度范围
    this.aStartAngle = json.aStartAngle;
    this.aEndAngle = json.aEndAngle;

    // 恢复绘制方向
    this.aClockwise = json.aClockwise;

    // 恢复旋转角度
    this.aRotation = json.aRotation;

    // 返回当前对象支持链式调用
    return this;
  }
}

// 导出EllipseCurve类供其他模块使用
export { EllipseCurve };
