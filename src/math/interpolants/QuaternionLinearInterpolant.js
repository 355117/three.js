// 从插值器基类模块导入Interpolant类
import { Interpolant } from "../Interpolant.js";
// 从四元数模块导入Quaternion类
import { Quaternion } from "../Quaternion.js";

/**
 * 球面线性单位四元数插值器
 * Spherical linear unit quaternion interpolant.
 *
 * @augments Interpolant
 */
class QuaternionLinearInterpolant extends Interpolant {
  /**
   * 构造一个新的SLERP（球面线性插值）插值器
   * Constructs a new SLERP interpolant.
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

  // 执行四元数球面线性插值计算
  interpolate_(i1, t0, t, t1) {
    // 获取结果缓冲区引用
    const result = this.resultBuffer,
      // 获取采样值数组引用
      values = this.sampleValues,
      // 获取每个采样值的步长（向量维度）
      stride = this.valueSize,
      // 计算插值参数（0到1之间的比例）
      alpha = (t - t0) / (t1 - t0);

    // 计算当前区间右端点在采样值数组中的起始偏移量
    let offset = i1 * stride;

    // 遍历所有四元数（每个四元数占用4个浮点数）
    for (let end = offset + stride; offset !== end; offset += 4) {
      // 使用四元数的球面线性插值方法进行插值
      // 参数：结果数组，结果起始索引，源数组1，源1起始索引，源数组2，源2起始索引，插值比例
      Quaternion.slerpFlat(result, 0, values, offset - stride, values, offset, alpha);
    }

    // 返回插值结果
    return result;
  }
}

// 导出四元数线性插值器类
export { QuaternionLinearInterpolant };
