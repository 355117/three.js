// 导入关键帧轨道基类
import { KeyframeTrack } from "../KeyframeTrack.js";
// 导入四元数线性插值器，用于四元数的专用插值计算
import { QuaternionLinearInterpolant } from "../../math/interpolants/QuaternionLinearInterpolant.js";

/**
 * 四元数关键帧轨道类
 * 用于处理四元数类型的关键帧动画数据
 * 主要用于3D旋转动画，提供平滑的旋转插值
 *
 * A track for Quaternion keyframe values.
 *
 * @augments KeyframeTrack
 */
class QuaternionKeyframeTrack extends KeyframeTrack {
  /**
   * 构造一个新的四元数关键帧轨道
   *
   * 四元数轨道专门用于旋转动画，避免万向锁问题
   *
   * Constructs a new Quaternion keyframe track.
   *
   * @param {string} name - 关键帧轨道的名称 The keyframe track's name.
   * @param {Array<number>} times - 关键帧时间列表 A list of keyframe times.
   * @param {Array<number>} values - 关键帧四元数值列表（x,y,z,w格式） A list of keyframe values.
   * @param {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth)} [interpolation] - 插值类型（可选） The interpolation type.
   */
  constructor(name, times, values, interpolation) {
    // 调用父类构造函数，传入名称、时间、值数组和插值类型
    super(name, times, values, interpolation);
  }

  /**
   * 重写线性插值工厂方法，返回基于四元数的插值器
   *
   * 四元数需要特殊的插值算法（球面线性插值SLERP）来确保旋转的平滑性
   *
   * Overwritten so the method returns Quaternion based interpolant.
   *
   * @static
   * @param {TypedArray} [result] - 结果缓冲区 The result buffer.
   * @return {QuaternionLinearInterpolant} 新的四元数插值器 The new interpolant.
   */
  InterpolantFactoryMethodLinear(result) {
    // 创建并返回四元数线性插值器实例
    return new QuaternionLinearInterpolant(this.times, this.values, this.getValueSize(), result);
  }
}

/**
 * 值类型名称
 * 标识此轨道处理的数据类型为四元数
 *
 * The value type name.
 *
 * @type {String}
 * @default 'quaternion'
 */
QuaternionKeyframeTrack.prototype.ValueTypeName = "quaternion";
// 值缓冲区类型继承自父类（通常为Float32Array）
// ValueBufferType is inherited
// 默认插值类型继承自父类（通常为线性插值）
// DefaultInterpolation is inherited;
// 平滑插值方法设为undefined，四元数通常使用线性插值（SLERP）
QuaternionKeyframeTrack.prototype.InterpolantFactoryMethodSmooth = undefined;

// 导出四元数关键帧轨道类
export { QuaternionKeyframeTrack };
