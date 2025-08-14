// 导入基础曲线类
import { Curve } from "../core/Curve.js";
// 导入二次贝塞尔插值函数
import { QuadraticBezier } from "../core/Interpolations.js";
// 导入二维向量类
import { Vector2 } from "../../math/Vector2.js";

/**
 * 表示2D二次贝塞尔曲线的类
 * 二次贝塞尔曲线由3个控制点定义：起点、控制点和终点
 * 相比三次贝塞尔曲线，二次贝塞尔曲线更简单，只有一个控制点
 *
 * ```js
 * const curve = new THREE.QuadraticBezierCurve(
 * 	new THREE.Vector2( - 10, 0 ),  // 起点
 * 	new THREE.Vector2( 20, 15 ),   // 控制点
 * 	new THREE.Vector2( 10, 0 )     // 终点
 * )
 *
 * const points = curve.getPoints( 50 );  // 获取曲线上的50个点
 * const geometry = new THREE.BufferGeometry().setFromPoints( points );
 *
 * const material = new THREE.LineBasicMaterial( { color: 0xff0000 } );
 *
 * // 创建最终的对象并添加到场景中
 * const curveObject = new THREE.Line( geometry, material );
 * ```
 *
 * @augments Curve
 */
class QuadraticBezierCurve extends Curve {
  /**
   * 构造一个新的二次贝塞尔曲线
   *
   * @param {Vector2} [v0] - 起点坐标
   * @param {Vector2} [v1] - 控制点坐标
   * @param {Vector2} [v2] - 终点坐标
   */
  constructor(v0 = new Vector2(), v1 = new Vector2(), v2 = new Vector2()) {
    // 调用父类构造函数
    super();

    /**
     * 用于类型检测的标志位
     * 可以通过检查此属性来确定对象是否为QuadraticBezierCurve类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isQuadraticBezierCurve = true;

    // 设置曲线类型标识符
    this.type = "QuadraticBezierCurve";

    /**
     * 起点坐标
     * 二次贝塞尔曲线的起始位置
     *
     * @type {Vector2}
     */
    this.v0 = v0;

    /**
     * 控制点坐标
     * 影响曲线的弯曲程度和方向，曲线会向控制点弯曲但不会经过它
     *
     * @type {Vector2}
     */
    this.v1 = v1;

    /**
     * 终点坐标
     * 二次贝塞尔曲线的结束位置
     *
     * @type {Vector2}
     */
    this.v2 = v2;
  }

  /**
   * 返回曲线上指定参数位置的点
   * 使用二次贝塞尔插值算法计算曲线上的点
   *
   * @param {number} t - 插值因子，表示曲线上的位置，必须在[0,1]范围内
   * @param {Vector2} [optionalTarget] - 可选的目标向量，结果将写入此向量
   * @return {Vector2} 曲线上的位置点
   */
  getPoint(t, optionalTarget = new Vector2()) {
    // 获取目标向量引用
    const point = optionalTarget;

    // 获取所有控制点的引用，提高性能
    const v0 = this.v0,
      v1 = this.v1,
      v2 = this.v2;

    // 使用二次贝塞尔插值分别计算x和y坐标
    point.set(
      QuadraticBezier(t, v0.x, v1.x, v2.x), // 计算x坐标
      QuadraticBezier(t, v0.y, v1.y, v2.y) // 计算y坐标
    );

    // 返回计算得到的点
    return point;
  }

  /**
   * 复制另一个二次贝塞尔曲线的属性到当前对象
   *
   * @param {QuadraticBezierCurve} source - 要复制的源曲线对象
   * @return {QuadraticBezierCurve} 返回当前对象，支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 复制所有控制点
    this.v0.copy(source.v0); // 复制起点
    this.v1.copy(source.v1); // 复制控制点
    this.v2.copy(source.v2); // 复制终点

    // 返回当前对象支持链式调用
    return this;
  }

  /**
   * 将曲线数据序列化为JSON格式
   * 用于保存或传输曲线数据
   *
   * @return {Object} 包含曲线数据的JSON对象
   */
  toJSON() {
    // 获取父类的JSON数据
    const data = super.toJSON();

    // 将所有控制点转换为数组格式
    data.v0 = this.v0.toArray(); // 起点转为数组
    data.v1 = this.v1.toArray(); // 控制点转为数组
    data.v2 = this.v2.toArray(); // 终点转为数组

    // 返回完整的JSON数据
    return data;
  }

  /**
   * 从JSON数据恢复曲线对象
   * 用于加载或接收曲线数据
   *
   * @param {Object} json - 包含曲线数据的JSON对象
   * @return {QuadraticBezierCurve} 返回当前对象，支持链式调用
   */
  fromJSON(json) {
    // 调用父类的JSON恢复方法
    super.fromJSON(json);

    // 从数组数据恢复所有控制点
    this.v0.fromArray(json.v0); // 恢复起点
    this.v1.fromArray(json.v1); // 恢复控制点
    this.v2.fromArray(json.v2); // 恢复终点

    // 返回当前对象支持链式调用
    return this;
  }
}

// 导出QuadraticBezierCurve类供其他模块使用
export { QuadraticBezierCurve };
