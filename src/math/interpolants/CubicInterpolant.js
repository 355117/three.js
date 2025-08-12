// 从常量模块导入三种边界处理方式：零曲率结束、环绕结束、零斜率结束
import { ZeroCurvatureEnding, WrapAroundEnding, ZeroSlopeEnding } from "../../constants.js";
// 从插值器基类模块导入Interpolant类
import { Interpolant } from "../Interpolant.js";

/**
 * 快速简单的三次样条插值器
 * Fast and simple cubic spline interpolant.
 *
 * 它基于埃尔米特构造方法，将每个采样位置的一阶导数设置为
 * 相邻位置之间在其参数区间上的线性斜率
 * It was derived from a Hermitian construction setting the first derivative
 * at each sample position to the linear slope between neighboring positions
 * over their parameter interval.
 *
 * @augments Interpolant
 */
class CubicInterpolant extends Interpolant {
  /**
   * 构造一个新的三次插值器
   * Constructs a new cubic interpolant.
   *
   * @param {TypedArray} parameterPositions - 参数位置数组，保存插值因子 The parameter positions hold the interpolation factors.
   * @param {TypedArray} sampleValues - 采样值数组 The sample values.
   * @param {number} sampleSize - 采样大小 The sample size
   * @param {TypedArray} [resultBuffer] - 结果缓冲区（可选） The result buffer.
   */
  constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
    // 调用父类构造函数初始化基本属性
    super(parameterPositions, sampleValues, sampleSize, resultBuffer);

    // 初始化前一个权重值为负零（用于标识未设置状态）
    this._weightPrev = -0;
    // 初始化前一个偏移量为负零
    this._offsetPrev = -0;
    // 初始化下一个权重值为负零
    this._weightNext = -0;
    // 初始化下一个偏移量为负零
    this._offsetNext = -0;

    // 设置默认配置：开始和结束都使用零曲率边界条件（自然样条）
    this.DefaultSettings_ = {
      endingStart: ZeroCurvatureEnding,
      endingEnd: ZeroCurvatureEnding,
    };
  }

  // 当插值区间发生变化时调用此方法，重新计算权重和偏移量
  intervalChanged_(i1, t0, t1) {
    // 获取参数位置数组的引用
    const pp = this.parameterPositions;
    // 计算前一个采样点的索引（当前区间左端点的前两个位置）
    let iPrev = i1 - 2,
      // 计算下一个采样点的索引（当前区间右端点的后一个位置）
      iNext = i1 + 1,
      // 获取前一个采样点的时间参数
      tPrev = pp[iPrev],
      // 获取下一个采样点的时间参数
      tNext = pp[iNext];

    // 如果前一个时间参数未定义（超出数组边界），需要根据边界条件处理
    if (tPrev === undefined) {
      // 根据起始边界设置选择处理方式
      switch (this.getSettings_().endingStart) {
        case ZeroSlopeEnding:
          // 零斜率边界：f'(t0) = 0，一阶导数为零
          iPrev = i1;
          tPrev = 2 * t0 - t1;

          break;

        case WrapAroundEnding:
          // 环绕边界：使用曲线的另一端
          iPrev = pp.length - 2;
          tPrev = t0 + pp[iPrev] - pp[iPrev + 1];

          break;

        default: // ZeroCurvatureEnding
          // 零曲率边界：f''(t0) = 0，即自然样条边界条件
          iPrev = i1;
          tPrev = t1;
      }
    }

    // 如果下一个时间参数未定义（超出数组边界），需要根据边界条件处理
    if (tNext === undefined) {
      // 根据结束边界设置选择处理方式
      switch (this.getSettings_().endingEnd) {
        case ZeroSlopeEnding:
          // 零斜率边界：f'(tN) = 0，一阶导数为零
          iNext = i1;
          tNext = 2 * t1 - t0;

          break;

        case WrapAroundEnding:
          // 环绕边界：使用曲线的另一端
          iNext = 1;
          tNext = t1 + pp[1] - pp[0];

          break;

        default: // ZeroCurvatureEnding
          // 零曲率边界：f''(tN) = 0，即自然样条边界条件
          iNext = i1 - 1;
          tNext = t0;
      }
    }

    // 计算当前区间的一半时间长度
    const halfDt = (t1 - t0) * 0.5,
      // 获取每个采样值的步长（向量维度）
      stride = this.valueSize;

    // 计算前一个控制点的权重（基于时间间隔比例）
    this._weightPrev = halfDt / (t0 - tPrev);
    // 计算下一个控制点的权重（基于时间间隔比例）
    this._weightNext = halfDt / (tNext - t1);
    // 计算前一个控制点在采样值数组中的偏移量
    this._offsetPrev = iPrev * stride;
    // 计算下一个控制点在采样值数组中的偏移量
    this._offsetNext = iNext * stride;
  }

  // 执行三次样条插值计算
  interpolate_(i1, t0, t, t1) {
    // 获取结果缓冲区引用
    const result = this.resultBuffer,
      // 获取采样值数组引用
      values = this.sampleValues,
      // 获取每个采样值的步长（向量维度）
      stride = this.valueSize,
      // 计算当前区间右端点在采样值数组中的偏移量
      o1 = i1 * stride,
      // 计算当前区间左端点在采样值数组中的偏移量
      o0 = o1 - stride,
      // 获取前一个控制点的偏移量
      oP = this._offsetPrev,
      // 获取下一个控制点的偏移量
      oN = this._offsetNext,
      // 获取前一个控制点的权重
      wP = this._weightPrev,
      // 获取下一个控制点的权重
      wN = this._weightNext,
      // 计算归一化的插值参数 p ∈ [0,1]
      p = (t - t0) / (t1 - t0),
      // 计算 p 的平方
      pp = p * p,
      // 计算 p 的立方
      ppp = pp * p;

    // 计算三次埃尔米特基函数的系数

    // 前一个控制点的基函数系数
    const sP = -wP * ppp + 2 * wP * pp - wP * p;
    // 左端点的基函数系数
    const s0 = (1 + wP) * ppp + (-1.5 - 2 * wP) * pp + (-0.5 + wP) * p + 1;
    // 右端点的基函数系数
    const s1 = (-1 - wN) * ppp + (1.5 + wN) * pp + 0.5 * p;
    // 下一个控制点的基函数系数
    const sN = wN * ppp - wN * pp;

    // 线性组合四个控制点的数据

    // 遍历每个向量分量
    for (let i = 0; i !== stride; ++i) {
      // 使用四个基函数系数对对应的采样值进行加权求和
      result[i] = sP * values[oP + i] + s0 * values[o0 + i] + s1 * values[o1 + i] + sN * values[oN + i];
    }

    // 返回插值结果
    return result;
  }
}

// 导出三次插值器类
export { CubicInterpolant };
