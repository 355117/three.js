// 从插值器基类模块导入Interpolant类
import { Interpolant } from "../Interpolant.js";

/**
 * 基础线性插值器
 * A basic linear interpolant.
 *
 * @augments Interpolant
 */
class LinearInterpolant extends Interpolant {
  /**
   * 构造一个新的线性插值器
   * Constructs a new linear interpolant.
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

  // 执行线性插值计算
  interpolate_(i1, t0, t, t1) {
    // 获取结果缓冲区引用
    const result = this.resultBuffer,
      // 获取采样值数组引用
      values = this.sampleValues,
      // 获取每个采样值的步长（向量维度）
      stride = this.valueSize,
      // 计算当前区间右端点在采样值数组中的偏移量
      offset1 = i1 * stride,
      // 计算当前区间左端点在采样值数组中的偏移量
      offset0 = offset1 - stride,
      // 计算右端点的权重（基于时间参数的线性比例）
      weight1 = (t - t0) / (t1 - t0),
      // 计算左端点的权重（权重之和为1）
      weight0 = 1 - weight1;

    // 遍历每个向量分量进行线性插值
    for (let i = 0; i !== stride; ++i) {
      // 对每个分量执行线性插值：result = v0 * w0 + v1 * w1
      result[i] = values[offset0 + i] * weight0 + values[offset1 + i] * weight1;
    }

    // 返回插值结果
    return result;
  }
}

// 导出线性插值器类
export { LinearInterpolant };
