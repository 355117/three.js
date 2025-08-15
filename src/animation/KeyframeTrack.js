// 从常量模块导入插值类型常量
import {
  InterpolateLinear, // 线性插值常量
  InterpolateSmooth, // 平滑插值常量
  InterpolateDiscrete, // 离散插值常量
} from "../constants.js";
// 导入三种插值器类
import { CubicInterpolant } from "../math/interpolants/CubicInterpolant.js"; // 三次插值器
import { LinearInterpolant } from "../math/interpolants/LinearInterpolant.js"; // 线性插值器
import { DiscreteInterpolant } from "../math/interpolants/DiscreteInterpolant.js"; // 离散插值器
import * as AnimationUtils from "./AnimationUtils.js"; // 动画工具函数模块

/**
 * 表示一个定时的关键帧序列，由时间列表和相关值组成，
 * 用于对对象的特定属性进行动画处理。
 *
 * Represents s a timed sequence of keyframes, which are composed of lists of
 * times and related values, and which are used to animate a specific property
 * of an object.
 */
class KeyframeTrack {
  /**
   * 构造一个新的关键帧轨道。
   *
   * Constructs a new keyframe track.
   *
   * @param {string} name - 关键帧轨道的名称 The keyframe track's name.
   * @param {Array<number>} times - 关键帧时间列表 A list of keyframe times.
   * @param {Array<number|string|boolean>} values - 关键帧值列表 A list of keyframe values.
   * @param {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth)} [interpolation] - 插值类型 The interpolation type.
   */
  constructor(name, times, values, interpolation) {
    // 检查轨道名称是否已定义，如果未定义则抛出错误
    if (name === undefined) throw new Error("THREE.KeyframeTrack: track name is undefined");
    // 检查时间数组是否已定义且不为空，如果为空则抛出错误
    if (times === undefined || times.length === 0) throw new Error("THREE.KeyframeTrack: no keyframes in track named " + name);

    /**
     * 轨道的名称可以引用变形目标、骨骼或动画对象中的其他值。
     * 有关可解析用于属性绑定的字符串形式，请参见 {@link PropertyBinding#parseTrackName}。
     *
     * The track's name can refer to morph targets or bones or
     * possibly other values within an animated object. See {@link PropertyBinding#parseTrackName}
     * for the forms of strings that can be parsed for property binding.
     *
     * @type {string}
     */
    this.name = name;

    /**
     * 关键帧时间数组。
     *
     * The keyframe times.
     *
     * @type {Float32Array}
     */
    this.times = AnimationUtils.convertArray(times, this.TimeBufferType);

    /**
     * 关键帧值数组。
     *
     * The keyframe values.
     *
     * @type {Float32Array}
     */
    this.values = AnimationUtils.convertArray(values, this.ValueBufferType);

    // 设置插值方式，如果未指定则使用默认插值方式
    this.setInterpolation(interpolation || this.DefaultInterpolation);
  }

  /**
   * 将关键帧轨道转换为JSON格式。
   *
   * Converts the keyframe track to JSON.
   *
   * @static
   * @param {KeyframeTrack} track - 要序列化的关键帧轨道 The keyframe track to serialize.
   * @return {Object} 序列化后的JSON格式关键帧轨道 The serialized keyframe track as JSON.
   */
  static toJSON(track) {
    // 获取轨道的构造函数类型
    const trackType = track.constructor;

    let json;

    // 派生类可以定义静态toJSON方法
    // derived classes can define a static toJSON method
    if (trackType.toJSON !== this.toJSON) {
      // 如果派生类有自己的toJSON方法，则使用派生类的方法
      json = trackType.toJSON(track);
    } else {
      // 默认情况下，我们假设数据可以按原样序列化
      // by default, we assume the data can be serialized as-is
      json = {
        name: track.name, // 轨道名称
        times: AnimationUtils.convertArray(track.times, Array), // 时间数组转换为普通数组
        values: AnimationUtils.convertArray(track.values, Array), // 值数组转换为普通数组
      };

      // 获取当前插值类型
      const interpolation = track.getInterpolation();

      // 如果插值类型不是默认类型，则添加到JSON中
      if (interpolation !== track.DefaultInterpolation) {
        json.interpolation = interpolation;
      }
    }

    // 添加值类型名称（必需）
    json.type = track.ValueTypeName; // mandatory

    return json;
  }

  /**
   * 创建新的离散插值器的工厂方法。
   *
   * Factory method for creating a new discrete interpolant.
   *
   * @static
   * @param {TypedArray} [result] - 结果缓冲区 The result buffer.
   * @return {DiscreteInterpolant} 新的插值器 The new interpolant.
   */
  InterpolantFactoryMethodDiscrete(result) {
    // 创建并返回离散插值器实例
    return new DiscreteInterpolant(this.times, this.values, this.getValueSize(), result);
  }

  /**
   * 创建新的线性插值器的工厂方法。
   *
   * Factory method for creating a new linear interpolant.
   *
   * @static
   * @param {TypedArray} [result] - 结果缓冲区 The result buffer.
   * @return {LinearInterpolant} 新的插值器 The new interpolant.
   */
  InterpolantFactoryMethodLinear(result) {
    // 创建并返回线性插值器实例
    return new LinearInterpolant(this.times, this.values, this.getValueSize(), result);
  }

  /**
   * 创建新的平滑插值器的工厂方法。
   *
   * Factory method for creating a new smooth interpolant.
   *
   * @static
   * @param {TypedArray} [result] - 结果缓冲区 The result buffer.
   * @return {CubicInterpolant} 新的插值器 The new interpolant.
   */
  InterpolantFactoryMethodSmooth(result) {
    // 创建并返回三次插值器实例
    return new CubicInterpolant(this.times, this.values, this.getValueSize(), result);
  }

  /**
   * 为此关键帧轨道定义插值因子方法。
   *
   * Defines the interpolation factor method for this keyframe track.
   *
   * @param {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth)} interpolation - 插值类型 The interpolation type.
   * @return {KeyframeTrack} 此关键帧轨道的引用 A reference to this keyframe track.
   */
  setInterpolation(interpolation) {
    let factoryMethod;

    // 根据插值类型选择相应的工厂方法
    switch (interpolation) {
      case InterpolateDiscrete:
        // 离散插值
        factoryMethod = this.InterpolantFactoryMethodDiscrete;

        break;

      case InterpolateLinear:
        // 线性插值
        factoryMethod = this.InterpolantFactoryMethodLinear;

        break;

      case InterpolateSmooth:
        // 平滑插值
        factoryMethod = this.InterpolantFactoryMethodSmooth;

        break;
    }

    // 如果没有找到对应的工厂方法
    if (factoryMethod === undefined) {
      // 构造错误消息
      const message = "unsupported interpolation for " + this.ValueTypeName + " keyframe track named " + this.name;

      // 如果没有创建插值器的方法
      if (this.createInterpolant === undefined) {
        // 回退到默认值，除非默认值本身有问题
        // fall back to default, unless the default itself is messed up
        if (interpolation !== this.DefaultInterpolation) {
          // 递归调用设置默认插值方式
          this.setInterpolation(this.DefaultInterpolation);
        } else {
          // 在这种情况下是致命错误
          throw new Error(message); // fatal, in this case
        }
      }

      // 输出警告信息
      console.warn("THREE.KeyframeTrack:", message);
      return this;
    }

    // 设置创建插值器的方法
    this.createInterpolant = factoryMethod;

    return this;
  }

  /**
   * 返回当前的插值类型。
   *
   * Returns the current interpolation type.
   *
   * @return {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth)} 插值类型 The interpolation type.
   */
  getInterpolation() {
    // 根据当前的插值器工厂方法返回对应的插值类型
    switch (this.createInterpolant) {
      case this.InterpolantFactoryMethodDiscrete:
        // 离散插值
        return InterpolateDiscrete;

      case this.InterpolantFactoryMethodLinear:
        // 线性插值
        return InterpolateLinear;

      case this.InterpolantFactoryMethodSmooth:
        // 平滑插值
        return InterpolateSmooth;
    }
  }

  /**
   * 返回值的大小。
   *
   * Returns the value size.
   *
   * @return {number} 值的大小 The value size.
   */
  getValueSize() {
    // 通过值数组长度除以时间数组长度来计算每个关键帧的值数量
    return this.values.length / this.times.length;
  }

  /**
   * 在时间上向前或向后移动所有关键帧。
   *
   * Moves all keyframes either forward or backward in time.
   *
   * @param {number} timeOffset - 移动时间值的偏移量 The offset to move the time values.
   * @return {KeyframeTrack} 此关键帧轨道的引用 A reference to this keyframe track.
   */
  shift(timeOffset) {
    // 只有当偏移量不为0时才进行移动
    if (timeOffset !== 0.0) {
      const times = this.times;

      // 遍历所有时间值并添加偏移量
      for (let i = 0, n = times.length; i !== n; ++i) {
        times[i] += timeOffset;
      }
    }

    return this;
  }

  /**
   * 按因子缩放所有关键帧时间（对帧-秒转换很有用）。
   *
   * Scale all keyframe times by a factor (useful for frame - seconds conversions).
   *
   * @param {number} timeScale - 时间缩放因子 The time scale.
   * @return {KeyframeTrack} 此关键帧轨道的引用 A reference to this keyframe track.
   */
  scale(timeScale) {
    // 只有当缩放因子不为1时才进行缩放
    if (timeScale !== 1.0) {
      const times = this.times;

      // 遍历所有时间值并乘以缩放因子
      for (let i = 0, n = times.length; i !== n; ++i) {
        times[i] *= timeScale;
      }
    }

    return this;
  }

  /**
   * 移除动画前后的关键帧，而不改变定义时间范围内的任何值。
   *
   * Removes keyframes before and after animation without changing any values within the defined time range.
   *
   * 注意：该方法不会将关键帧移动到轨道时间的开始位置，因为对于插值关键帧，
   * 这会改变它们的值。
   *
   * Note: The method does not shift around keys to the start of the track time, because for interpolated
   * keys this will change their values
   *
   * @param {number} startTime - 开始时间 The start time.
   * @param {number} endTime - 结束时间 The end time.
   * @return {KeyframeTrack} 此关键帧轨道的引用 A reference to this keyframe track.
   */
  trim(startTime, endTime) {
    // 获取时间数组和关键帧数量
    const times = this.times,
      nKeys = times.length;

    // 初始化起始和结束索引
    let from = 0,
      to = nKeys - 1;

    // 找到第一个大于等于开始时间的关键帧索引
    while (from !== nKeys && times[from] < startTime) {
      ++from;
    }

    // 找到最后一个小于等于结束时间的关键帧索引
    while (to !== -1 && times[to] > endTime) {
      --to;
    }

    // 将包含边界转换为排除边界
    ++to; // inclusive -> exclusive bound

    // 如果需要裁剪（起始或结束位置发生了变化）
    if (from !== 0 || to !== nKeys) {
      // 禁止空轨道，所以至少保留一个关键帧
      // empty tracks are forbidden, so keep at least one keyframe
      if (from >= to) {
        // 确保至少有一个关键帧
        to = Math.max(to, 1);
        from = to - 1;
      }

      // 获取每个关键帧的值数量（步长）
      const stride = this.getValueSize();
      // 裁剪时间数组
      this.times = times.slice(from, to);
      // 裁剪值数组（需要考虑步长）
      this.values = this.values.slice(from * stride, to * stride);
    }

    return this;
  }

  /**
   * 对关键帧轨道执行最小验证。如果值有效则返回 `true`。
   *
   * Performs minimal validation on the keyframe track. Returns `true` if the values
   * are valid.
   *
   * @return {boolean} 关键帧是否有效 Whether the keyframes are valid or not.
   */
  validate() {
    // 初始化验证结果为有效
    let valid = true;

    // 验证值大小是否为整数
    const valueSize = this.getValueSize();
    if (valueSize - Math.floor(valueSize) !== 0) {
      // 值大小不是整数，输出错误
      console.error("THREE.KeyframeTrack: Invalid value size in track.", this);
      valid = false;
    }

    // 获取时间数组、值数组和关键帧数量
    const times = this.times,
      values = this.values,
      nKeys = times.length;

    // 检查轨道是否为空
    if (nKeys === 0) {
      console.error("THREE.KeyframeTrack: Track is empty.", this);
      valid = false;
    }

    // 用于检查时间顺序的前一个时间值
    let prevTime = null;

    // 验证时间数组中的每个时间值
    for (let i = 0; i !== nKeys; i++) {
      const currTime = times[i];

      // 检查时间是否为有效数字
      if (typeof currTime === "number" && isNaN(currTime)) {
        console.error("THREE.KeyframeTrack: Time is not a valid number.", this, i, currTime);
        valid = false;
        break;
      }

      // 检查时间是否按顺序排列
      if (prevTime !== null && prevTime > currTime) {
        console.error("THREE.KeyframeTrack: Out of order keys.", this, i, currTime, prevTime);
        valid = false;
        break;
      }

      // 更新前一个时间值
      prevTime = currTime;
    }

    // 验证值数组（如果存在）
    if (values !== undefined) {
      // 如果是类型化数组，验证每个值
      if (AnimationUtils.isTypedArray(values)) {
        for (let i = 0, n = values.length; i !== n; ++i) {
          const value = values[i];

          // 检查值是否为有效数字
          if (isNaN(value)) {
            console.error("THREE.KeyframeTrack: Value is not a valid number.", this, i, value);
            valid = false;
            break;
          }
        }
      }
    }

    return valid;
  }

  /**
   * 通过移除等效的连续关键帧来优化此关键帧轨道（这在变形目标序列中很常见）。
   *
   * Optimizes this keyframe track by removing equivalent sequential keys (which are
   * common in morph target sequences).
   *
   * @return {KeyframeTrack} 此关键帧轨道的引用 A reference to this keyframe track.
   */
  optimize() {
    // 优化示例：(0,0,0,0,1,1,1,0,0,0,0,0,0,0) --> (0,0,1,1,0,0)
    // (0,0,0,0,1,1,1,0,0,0,0,0,0,0) --> (0,0,1,1,0,0)

    // 时间或值可能与其他轨道共享，所以覆盖是不安全的，需要复制
    // times or values may be shared with other tracks, so overwriting is unsafe
    const times = this.times.slice(), // 复制时间数组
      values = this.values.slice(), // 复制值数组
      stride = this.getValueSize(), // 获取每个关键帧的值数量
      smoothInterpolation = this.getInterpolation() === InterpolateSmooth, // 是否为平滑插值
      lastIndex = times.length - 1; // 最后一个关键帧的索引

    // 写入索引，从1开始（保留第一个关键帧）
    let writeIndex = 1;

    // 遍历中间的关键帧（跳过第一个和最后一个）
    for (let i = 1; i < lastIndex; ++i) {
      // 标记是否保留当前关键帧
      let keep = false;

      const time = times[i]; // 当前时间
      const timeNext = times[i + 1]; // 下一个时间

      // 移除在同一时间安排的相邻关键帧
      // remove adjacent keyframes scheduled at the same time

      if (time !== timeNext && (i !== 1 || time !== times[0])) {
        if (!smoothInterpolation) {
          // 对于非平滑插值，移除与邻居相同的不必要关键帧
          // remove unnecessary keyframes same as their neighbors

          const offset = i * stride, // 当前关键帧在值数组中的偏移
            offsetP = offset - stride, // 前一个关键帧的偏移
            offsetN = offset + stride; // 下一个关键帧的偏移

          // 检查当前关键帧的每个值分量
          for (let j = 0; j !== stride; ++j) {
            const value = values[offset + j];

            // 如果当前值与前一个或下一个值不同，则保留此关键帧
            if (value !== values[offsetP + j] || value !== values[offsetN + j]) {
              keep = true;
              break;
            }
          }
        } else {
          // 对于平滑插值，保留所有关键帧
          keep = true;
        }
      }

      // 就地压缩
      // in-place compaction

      if (keep) {
        // 如果当前读取位置与写入位置不同，则移动数据
        if (i !== writeIndex) {
          // 复制时间值
          times[writeIndex] = times[i];

          // 计算读取和写入偏移
          const readOffset = i * stride,
            writeOffset = writeIndex * stride;

          // 复制所有值分量
          for (let j = 0; j !== stride; ++j) {
            values[writeOffset + j] = values[readOffset + j];
          }
        }

        // 增加写入索引
        ++writeIndex;
      }
    }

    // 刷新最后一个关键帧（压缩是向前查看的）
    // flush last keyframe (compaction looks ahead)

    if (lastIndex > 0) {
      // 复制最后一个关键帧的时间
      times[writeIndex] = times[lastIndex];

      // 复制最后一个关键帧的所有值分量
      for (let readOffset = lastIndex * stride, writeOffset = writeIndex * stride, j = 0; j !== stride; ++j) {
        values[writeOffset + j] = values[readOffset + j];
      }

      // 增加写入索引
      ++writeIndex;
    }

    // 如果写入索引与原始长度不同，说明进行了优化
    if (writeIndex !== times.length) {
      // 截取优化后的数组
      this.times = times.slice(0, writeIndex);
      this.values = values.slice(0, writeIndex * stride);
    } else {
      // 没有优化，直接使用复制的数组
      this.times = times;
      this.values = values;
    }

    return this;
  }

  /**
   * 返回一个从此实例复制值的新关键帧轨道。
   *
   * Returns a new keyframe track with copied values from this instance.
   *
   * @return {KeyframeTrack} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 复制时间数组
    const times = this.times.slice();
    // 复制值数组
    const values = this.values.slice();

    // 获取构造函数类型
    const TypedKeyframeTrack = this.constructor;
    // 创建新的轨道实例
    const track = new TypedKeyframeTrack(this.name, times, values);

    // 插值器参数不会保存到构造函数中，所以直接复制工厂方法。
    // Interpolant argument to constructor is not saved, so copy the factory method directly.
    track.createInterpolant = this.createInterpolant;

    return track;
  }
}

/**
 * 值类型名称。
 *
 * The value type name.
 *
 * @type {String}
 * @default ''
 */
KeyframeTrack.prototype.ValueTypeName = "";

/**
 * 此关键帧轨道的时间缓冲区类型。
 *
 * The time buffer type of this keyframe track.
 *
 * @type {TypedArray|Array}
 * @default Float32Array.constructor
 */
KeyframeTrack.prototype.TimeBufferType = Float32Array;

/**
 * 此关键帧轨道的值缓冲区类型。
 *
 * The value buffer type of this keyframe track.
 *
 * @type {TypedArray|Array}
 * @default Float32Array.constructor
 */
KeyframeTrack.prototype.ValueBufferType = Float32Array;

/**
 * 此关键帧轨道的默认插值类型。
 *
 * The default interpolation type of this keyframe track.
 *
 * @type {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth)}
 * @default InterpolateLinear
 */
KeyframeTrack.prototype.DefaultInterpolation = InterpolateLinear;

// 导出KeyframeTrack类
export { KeyframeTrack };
