// 导入关键帧轨道基类
import { KeyframeTrack } from "../KeyframeTrack.js";

/**
 * 颜色关键帧轨道类
 * 用于处理颜色类型的关键帧动画数据
 * 支持RGB、RGBA等颜色格式的动画插值
 *
 * A track for color keyframe values.
 *
 * @augments KeyframeTrack
 */
class ColorKeyframeTrack extends KeyframeTrack {
  /**
   * 构造一个新的颜色关键帧轨道
   *
   * 颜色轨道支持多种插值类型，可以实现平滑的颜色过渡效果
   *
   * Constructs a new color keyframe track.
   *
   * @param {string} name - 关键帧轨道的名称 The keyframe track's name.
   * @param {Array<number>} times - 关键帧时间列表 A list of keyframe times.
   * @param {Array<number>} values - 关键帧颜色值列表（通常为RGB或RGBA数值数组） A list of keyframe values.
   * @param {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth)} [interpolation] - 插值类型（可选） The interpolation type.
   */
  constructor(name, times, values, interpolation) {
    // 调用父类构造函数，传入名称、时间、值数组和插值类型
    super(name, times, values, interpolation);
  }
}

/**
 * 值类型名称
 * 标识此轨道处理的数据类型为颜色
 *
 * The value type name.
 *
 * @type {String}
 * @default 'color'
 */
ColorKeyframeTrack.prototype.ValueTypeName = "color";
// 值缓冲区类型继承自父类（通常为Float32Array）
// ValueBufferType is inherited
// 默认插值类型继承自父类（通常为线性插值）
// DefaultInterpolation is inherited

// 导出颜色关键帧轨道类
export { ColorKeyframeTrack };
