// 从插值器基类模块导入Interpolant类
import { Interpolant } from "../Interpolant.js";

/**
 * 离散插值器，计算结果为参数位置之前的采样值
 * Interpolant that evaluates to the sample value at the position preceding
 * the parameter.
 *
 * @augments Interpolant
 */
class DiscreteInterpolant extends Interpolant {
  /**
   * 构造一个新的离散插值器
   * Constructs a new discrete interpolant.
   *
   * @param {TypedArray} parameterPositions - 参数位置数组，保存插值因子 The parameter positions hold the interpolation factors.
   * @param {TypedArray} sampleValues - 采样值数组 The sample values.
   * @param {number} sampleSize - 采样大小 The sample size
   * @param {TypedArray} [resultBuffer] - 结果缓冲区（可选） The result buffer.
   */
  constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
    // 调用父类构造函数初始化基本属性
    super(parameterPositions, sampleValues, sampleSize, resultBuffer);
  }

  // 执行离散插值计算（忽略时间参数，直接返回前一个采样值）
  interpolate_(i1 /*, t0, t, t1 */) {
    // 返回当前区间左端点前一个位置的采样值（阶跃函数特性）
    return this.copySampleValue_(i1 - 1);
  }
}

// 导出离散插值器类
export { DiscreteInterpolant };
