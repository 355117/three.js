// 导入基础曲线类
import { Curve } from "../core/Curve.js";
// 导入三次贝塞尔插值函数
import { CubicBezier } from "../core/Interpolations.js";
// 导入三维向量类
import { Vector3 } from "../../math/Vector3.js";

/**
 * 表示3D三次贝塞尔曲线的类
 * 三维三次贝塞尔曲线由4个3D控制点定义：起点、两个控制点和终点
 * 与2D版本类似，但在三维空间中工作，包含x、y、z三个坐标分量
 *
 * @augments Curve
 */
class CubicBezierCurve3 extends Curve {
  /**
   * 构造一个新的3D三次贝塞尔曲线
   *
   * @param {Vector3} [v0] - 起点的3D坐标
   * @param {Vector3} [v1] - 第一个控制点的3D坐标
   * @param {Vector3} [v2] - 第二个控制点的3D坐标
   * @param {Vector3} [v3] - 终点的3D坐标
   */
  constructor(v0 = new Vector3(), v1 = new Vector3(), v2 = new Vector3(), v3 = new Vector3()) {
    // 调用父类构造函数
    super();

    /**
     * 用于类型检测的标志位
     * 可以通过检查此属性来确定对象是否为CubicBezierCurve3类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isCubicBezierCurve3 = true;

    // 设置曲线类型标识符
    this.type = "CubicBezierCurve3";

    /**
     * 起点的3D坐标
     * 贝塞尔曲线在三维空间中的起始位置
     *
     * @type {Vector3}
     */
    this.v0 = v0;

    /**
     * 第一个控制点的3D坐标
     * 影响曲线从起点出发的方向和弯曲程度
     *
     * @type {Vector3}
     */
    this.v1 = v1;

    /**
     * 第二个控制点的3D坐标
     * 影响曲线到达终点的方向和弯曲程度
     *
     * @type {Vector3}
     */
    this.v2 = v2;

    /**
     * 终点的3D坐标
     * 贝塞尔曲线在三维空间中的结束位置
     *
     * @type {Vector3}
     */
    this.v3 = v3;
  }

  /**
   * 返回曲线上指定参数位置的3D点
   * 使用三次贝塞尔插值算法分别计算x、y、z三个坐标分量
   *
   * @param {number} t - 插值因子，表示曲线上的位置，必须在[0,1]范围内
   * @param {Vector3} [optionalTarget] - 可选的目标向量，结果将写入此向量
   * @return {Vector3} 曲线上的3D位置点
   */
  getPoint(t, optionalTarget = new Vector3()) {
    // 获取目标向量引用
    const point = optionalTarget;

    // 获取所有控制点的引用，提高性能
    const v0 = this.v0,
      v1 = this.v1,
      v2 = this.v2,
      v3 = this.v3;

    // 使用三次贝塞尔插值分别计算x、y、z坐标
    point.set(
      CubicBezier(t, v0.x, v1.x, v2.x, v3.x), // 计算x坐标
      CubicBezier(t, v0.y, v1.y, v2.y, v3.y), // 计算y坐标
      CubicBezier(t, v0.z, v1.z, v2.z, v3.z) // 计算z坐标
    );

    // 返回计算得到的3D点
    return point;
  }

  /**
   * 复制另一个3D三次贝塞尔曲线的属性到当前对象
   *
   * @param {CubicBezierCurve3} source - 要复制的源曲线对象
   * @return {CubicBezierCurve3} 返回当前对象，支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 复制所有3D控制点
    this.v0.copy(source.v0); // 复制起点
    this.v1.copy(source.v1); // 复制第一个控制点
    this.v2.copy(source.v2); // 复制第二个控制点
    this.v3.copy(source.v3); // 复制终点

    // 返回当前对象支持链式调用
    return this;
  }

  /**
   * 将3D曲线数据序列化为JSON格式
   * 用于保存或传输曲线数据
   *
   * @return {Object} 包含曲线数据的JSON对象
   */
  toJSON() {
    // 获取父类的JSON数据
    const data = super.toJSON();

    // 将所有3D控制点转换为数组格式
    data.v0 = this.v0.toArray(); // 起点转为数组[x,y,z]
    data.v1 = this.v1.toArray(); // 第一个控制点转为数组[x,y,z]
    data.v2 = this.v2.toArray(); // 第二个控制点转为数组[x,y,z]
    data.v3 = this.v3.toArray(); // 终点转为数组[x,y,z]

    // 返回完整的JSON数据
    return data;
  }

  /**
   * 从JSON数据恢复3D曲线对象
   * 用于加载或接收曲线数据
   *
   * @param {Object} json - 包含曲线数据的JSON对象
   * @return {CubicBezierCurve3} 返回当前对象，支持链式调用
   */
  fromJSON(json) {
    // 调用父类的JSON恢复方法
    super.fromJSON(json);

    // 从数组数据恢复所有3D控制点
    this.v0.fromArray(json.v0); // 恢复起点[x,y,z]
    this.v1.fromArray(json.v1); // 恢复第一个控制点[x,y,z]
    this.v2.fromArray(json.v2); // 恢复第二个控制点[x,y,z]
    this.v3.fromArray(json.v3); // 恢复终点[x,y,z]

    // 返回当前对象支持链式调用
    return this;
  }
}

// 导出CubicBezierCurve3类供其他模块使用
export { CubicBezierCurve3 };
