// 导入离散插值常量，用于字符串轨道的插值类型
import { InterpolateDiscrete } from "../../constants.js";
// 导入关键帧轨道基类
import { KeyframeTrack } from "../KeyframeTrack.js";

/**
 * 字符串关键帧轨道类
 * 用于处理字符串类型的关键帧动画数据
 * 常用于文本内容切换、材质名称变更等场景
 *
 * A track for string keyframe values.
 *
 * @augments KeyframeTrack
 */
class StringKeyframeTrack extends KeyframeTrack {
  /**
   * 构造一个新的字符串关键帧轨道
   *
   * 此关键帧轨道类型没有插值参数，因为插值总是离散的
   * 字符串之间无法进行平滑过渡，只能在指定时间点切换
   *
   * Constructs a new string keyframe track.
   *
   * This keyframe track type has no `interpolation` parameter because the
   * interpolation is always discrete.
   *
   * @param {string} name - 关键帧轨道的名称 The keyframe track's name.
   * @param {Array<number>} times - 关键帧时间列表 A list of keyframe times.
   * @param {Array<string>} values - 关键帧字符串值列表 A list of keyframe values.
   */
  constructor(name, times, values) {
    // 调用父类构造函数，传入名称、时间和值数组
    super(name, times, values);
  }
}

/**
 * 值类型名称
 * 标识此轨道处理的数据类型为字符串
 *
 * The value type name.
 *
 * @type {String}
 * @default 'string'
 */
StringKeyframeTrack.prototype.ValueTypeName = "string";

/**
 * 此关键帧轨道的值缓冲区类型
 * 字符串使用普通数组存储，而不是类型化数组
 * 因为字符串是引用类型，无法使用类型化数组
 *
 * The value buffer type of this keyframe track.
 *
 * @type {TypedArray|Array}
 * @default Array.constructor
 */
StringKeyframeTrack.prototype.ValueBufferType = Array;

/**
 * 此关键帧轨道的默认插值类型
 * 字符串只能使用离散插值，因为字符串之间没有中间值
 *
 * The default interpolation type of this keyframe track.
 *
 * @type {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth)}
 * @default InterpolateDiscrete
 */
StringKeyframeTrack.prototype.DefaultInterpolation = InterpolateDiscrete;
// 线性插值方法设为undefined，因为字符串不支持线性插值
StringKeyframeTrack.prototype.InterpolantFactoryMethodLinear = undefined;
// 平滑插值方法设为undefined，因为字符串不支持平滑插值
StringKeyframeTrack.prototype.InterpolantFactoryMethodSmooth = undefined;

// 导出字符串关键帧轨道类
export { StringKeyframeTrack };
