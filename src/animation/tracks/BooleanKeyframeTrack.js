// 导入离散插值常量，用于布尔值轨道的插值类型
import { InterpolateDiscrete } from "../../constants.js";
// 导入关键帧轨道基类
import { KeyframeTrack } from "../KeyframeTrack.js";

/**
 * 布尔值关键帧轨道类
 * 用于处理布尔类型的关键帧动画数据
 *
 * A track for boolean keyframe values.
 *
 * @augments KeyframeTrack
 */
class BooleanKeyframeTrack extends KeyframeTrack {
  /**
   * 构造一个新的布尔值关键帧轨道
   *
   * 此关键帧轨道类型没有插值参数，因为插值总是离散的
   * 布尔值只能在true和false之间切换，不能进行平滑过渡
   *
   * Constructs a new boolean keyframe track.
   *
   * This keyframe track type has no `interpolation` parameter because the
   * interpolation is always discrete.
   *
   * @param {string} name - 关键帧轨道的名称 The keyframe track's name.
   * @param {Array<number>} times - 关键帧时间列表 A list of keyframe times.
   * @param {Array<boolean>} values - 关键帧布尔值列表 A list of keyframe values.
   */
  constructor(name, times, values) {
    // 调用父类构造函数，传入名称、时间和值数组
    super(name, times, values);
  }
}

/**
 * 值类型名称
 * 标识此轨道处理的数据类型为布尔值
 *
 * The value type name.
 *
 * @type {String}
 * @default 'bool'
 */
BooleanKeyframeTrack.prototype.ValueTypeName = "bool";

/**
 * 此关键帧轨道的值缓冲区类型
 * 布尔值使用普通数组存储，而不是类型化数组
 * 因为布尔值不需要特定的数值精度
 *
 * The value buffer type of this keyframe track.
 *
 * @type {TypedArray|Array}
 * @default Array.constructor
 */
BooleanKeyframeTrack.prototype.ValueBufferType = Array;

/**
 * 此关键帧轨道的默认插值类型
 * 布尔值只能使用离散插值，因为true和false之间没有中间值
 *
 * The default interpolation type of this keyframe track.
 *
 * @type {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth)}
 * @default InterpolateDiscrete
 */
BooleanKeyframeTrack.prototype.DefaultInterpolation = InterpolateDiscrete;
// 线性插值方法设为undefined，因为布尔值不支持线性插值
BooleanKeyframeTrack.prototype.InterpolantFactoryMethodLinear = undefined;
// 平滑插值方法设为undefined，因为布尔值不支持平滑插值
BooleanKeyframeTrack.prototype.InterpolantFactoryMethodSmooth = undefined;

// 导出布尔值关键帧轨道类
export { BooleanKeyframeTrack };
