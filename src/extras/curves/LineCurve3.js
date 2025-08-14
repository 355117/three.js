// 导入三维向量类
import { Vector3 } from "../../math/Vector3.js";
// 导入基础曲线类
import { Curve } from "../core/Curve.js";

/**
 * 表示3D直线段的曲线类
 * 3D直线曲线是LineCurve的三维版本，由两个3D端点定义
 *
 * @augments Curve
 */
class LineCurve3 extends Curve {
  /**
   * 构造一个新的3D直线曲线
   *
   * @param {Vector3} [v1] - 起点的3D坐标
   * @param {Vector3} [v2] - 终点的3D坐标
   */
  constructor(v1 = new Vector3(), v2 = new Vector3()) {
    // 调用父类构造函数
    super();

    /**
     * 用于类型检测的标志位
     * 可以通过检查此属性来确定对象是否为LineCurve3类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isLineCurve3 = true;

    // 设置曲线类型标识符
    this.type = "LineCurve3";

    /**
     * 3D直线的起点
     * 直线段在三维空间中的开始位置
     *
     * @type {Vector3}
     */
    this.v1 = v1;

    /**
     * 3D直线的终点
     * 直线段在三维空间中的结束位置
     *
     * @type {Vector3}
     */
    this.v2 = v2;
  }

  /**
   * 返回3D直线上指定参数位置的点
   * 使用线性插值计算三维空间中直线上的点
   *
   * @param {number} t - 插值因子，表示直线上的位置，必须在[0,1]范围内
   * @param {Vector3} [optionalTarget] - 可选的目标向量，结果将写入此向量
   * @return {Vector3} 3D直线上的位置点
   */
  getPoint(t, optionalTarget = new Vector3()) {
    // 获取目标向量引用
    const point = optionalTarget;

    // 优化：如果t=1，直接返回终点
    if (t === 1) {
      point.copy(this.v2);
    } else {
      // 计算从起点到终点的3D向量
      point.copy(this.v2).sub(this.v1);
      // 按比例缩放并加上起点，实现3D线性插值
      point.multiplyScalar(t).add(this.v1);
    }

    // 返回计算得到的3D点
    return point;
  }

  /**
   * 根据弧长参数返回3D直线上的点
   * 由于直线是线性的，可以直接使用getPoint方法
   *
   * @param {number} u - 弧长参数，在[0,1]范围内
   * @param {Vector3} [optionalTarget] - 可选的目标向量
   * @return {Vector3} 3D直线上的位置点
   */
  getPointAt(u, optionalTarget) {
    // 3D直线曲线是线性的，所以可以重写默认的getPointAt方法
    return this.getPoint(u, optionalTarget);
  }

  /**
   * 返回3D直线在指定参数位置的切线向量
   * 3D直线的切线在任何位置都是相同的（3D方向向量）
   *
   * @param {number} t - 参数位置（对于直线，此参数不影响结果）
   * @param {Vector3} [optionalTarget] - 可选的目标向量
   * @return {Vector3} 归一化的3D切线向量
   */
  getTangent(t, optionalTarget = new Vector3()) {
    // 计算从起点到终点的3D方向向量并归一化
    return optionalTarget.subVectors(this.v2, this.v1).normalize();
  }

  /**
   * 根据弧长参数返回3D切线向量
   * 由于3D直线的切线恒定，可以直接使用getTangent方法
   *
   * @param {number} u - 弧长参数（对于直线，此参数不影响结果）
   * @param {Vector3} [optionalTarget] - 可选的目标向量
   * @return {Vector3} 归一化的3D切线向量
   */
  getTangentAt(u, optionalTarget) {
    // 3D直线的切线在任何位置都相同
    return this.getTangent(u, optionalTarget);
  }

  /**
   * 复制另一个3D直线曲线的属性到当前对象
   *
   * @param {LineCurve3} source - 要复制的源3D直线曲线对象
   * @return {LineCurve3} 返回当前对象，支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 复制3D起点和终点
    this.v1.copy(source.v1);
    this.v2.copy(source.v2);

    // 返回当前对象支持链式调用
    return this;
  }

  /**
   * 将3D直线曲线数据序列化为JSON格式
   * 用于保存或传输3D直线曲线数据
   *
   * @return {Object} 包含3D直线曲线数据的JSON对象
   */
  toJSON() {
    // 获取父类的JSON数据
    const data = super.toJSON();

    // 将3D起点和终点转换为数组格式[x,y,z]
    data.v1 = this.v1.toArray();
    data.v2 = this.v2.toArray();

    // 返回完整的JSON数据
    return data;
  }

  /**
   * 从JSON数据恢复3D直线曲线对象
   * 用于加载或接收3D直线曲线数据
   *
   * @param {Object} json - 包含3D直线曲线数据的JSON对象
   * @return {LineCurve3} 返回当前对象，支持链式调用
   */
  fromJSON(json) {
    // 调用父类的JSON恢复方法
    super.fromJSON(json);

    // 从数组数据恢复3D起点和终点[x,y,z]
    this.v1.fromArray(json.v1);
    this.v2.fromArray(json.v2);

    // 返回当前对象支持链式调用
    return this;
  }
}

// 导出LineCurve3类供其他模块使用
export { LineCurve3 };
