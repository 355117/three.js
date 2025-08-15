// 导入关键帧轨道基类
import { KeyframeTrack } from "../KeyframeTrack.js";

/**
 * 数值关键帧轨道类
 * 用于处理数值类型的关键帧动画数据
 * 支持各种数值属性的动画，如透明度、缩放、旋转角度等
 *
 * A track for numeric keyframe values.
 *
 * @augments KeyframeTrack
 */
class NumberKeyframeTrack extends KeyframeTrack {
  /**
   * 构造一个新的数值关键帧轨道
   *
   * 数值轨道是最常用的轨道类型，支持线性、离散和平滑插值
   *
   * Constructs a new number keyframe track.
   *
   * @param {string} name - 关键帧轨道的名称 The keyframe track's name.
   * @param {Array<number>} times - 关键帧时间列表 A list of keyframe times.
   * @param {Array<number>} values - 关键帧数值列表 A list of keyframe values.
   * @param {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth)} [interpolation] - 插值类型（可选） The interpolation type.
   */
  constructor(name, times, values, interpolation) {
    // 调用父类构造函数，传入名称、时间、值数组和插值类型
    super(name, times, values, interpolation);
  }
}

/**
 * 值类型名称
 * 标识此轨道处理的数据类型为数值
 *
 * The value type name.
 *
 * @type {String}
 * @default 'number'
 */
NumberKeyframeTrack.prototype.ValueTypeName = "number";
// 值缓冲区类型继承自父类（通常为Float32Array）
// ValueBufferType is inherited
// 默认插值类型继承自父类（通常为线性插值）
// DefaultInterpolation is inherited

// 导出数值关键帧轨道类
export { NumberKeyframeTrack };
