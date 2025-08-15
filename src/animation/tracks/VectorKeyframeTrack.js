// 导入关键帧轨道基类
import { KeyframeTrack } from "../KeyframeTrack.js";

/**
 * 向量关键帧轨道类
 * 用于处理向量类型的关键帧动画数据
 * 支持2D、3D、4D向量的动画，如位置、缩放、方向等
 *
 * A track for vector keyframe values.
 *
 * @augments KeyframeTrack
 */
class VectorKeyframeTrack extends KeyframeTrack {
  /**
   * 构造一个新的向量关键帧轨道
   *
   * 向量轨道支持多种插值类型，可以实现平滑的向量过渡
   * 常用于位置、缩放、方向等多维数据的动画
   *
   * Constructs a new vector keyframe track.
   *
   * @param {string} name - 关键帧轨道的名称 The keyframe track's name.
   * @param {Array<number>} times - 关键帧时间列表 A list of keyframe times.
   * @param {Array<number>} values - 关键帧向量值列表（按分量展开的数值数组） A list of keyframe values.
   * @param {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth)} [interpolation] - 插值类型（可选） The interpolation type.
   */
  constructor(name, times, values, interpolation) {
    // 调用父类构造函数，传入名称、时间、值数组和插值类型
    super(name, times, values, interpolation);
  }
}

/**
 * 值类型名称
 * 标识此轨道处理的数据类型为向量
 *
 * The value type name.
 *
 * @type {String}
 * @default 'vector'
 */
VectorKeyframeTrack.prototype.ValueTypeName = "vector";
// 值缓冲区类型继承自父类（通常为Float32Array）
// ValueBufferType is inherited
// 默认插值类型继承自父类（通常为线性插值）
// DefaultInterpolation is inherited

// 导出向量关键帧轨道类
export { VectorKeyframeTrack };
