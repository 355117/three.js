// 导入四元数类，用于处理旋转动画的插值计算
import { Quaternion } from "../math/Quaternion.js";

/**
 * 缓冲场景图属性混合器，支持加权累积；内部使用。
 *
 * PropertyMixer 是 Three.js 动画系统的核心组件，负责将多个动画轨道的值
 * 按权重混合，支持线性插值、球面线性插值等多种混合模式。
 *
 * Buffered scene graph property that allows weighted accumulation; used internally.
 */
class PropertyMixer {
  /**
   * 构造一个新的属性混合器。
   *
   * 根据传入的类型名称初始化相应的混合函数和缓冲区布局，
   * 支持数值、四元数、字符串和布尔类型的属性混合。
   *
   * Constructs a new property mixer.
   *
   * @param {PropertyBinding} binding - 属性绑定对象，连接动画数据和目标对象属性 The property binding.
   * @param {string} typeName - 关键帧轨道类型名称（如 'quaternion', 'string', 'bool' 等） The keyframe track type name.
   * @param {number} valueSize - 关键帧轨道值的大小（如向量3的大小为3） The keyframe track value size.
   */
  constructor(binding, typeName, valueSize) {
    /**
     * 属性绑定对象，用于连接动画数据和目标对象的属性。
     *
     * The property binding.
     *
     * @type {PropertyBinding}
     */
    this.binding = binding;

    /**
     * 关键帧轨道值的大小。
     * 例如：Vector3 的 valueSize 为 3，Color 的 valueSize 为 3，标量的 valueSize 为 1。
     *
     * The keyframe track value size.
     *
     * @type {number}
     */
    this.valueSize = valueSize;

    // 声明混合函数变量，将根据数据类型进行初始化
    let mixFunction, // 普通混合函数
      mixFunctionAdditive, // 加法混合函数
      setIdentity; // 设置加法单位元素的函数

    // 缓冲区布局说明: [ incoming | accu0 | accu1 | orig | addAccu | (optional work) ]
    // buffer layout: [ incoming | accu0 | accu1 | orig | addAccu | (optional work) ]
    //
    // 插值器可以使用 .buffer 作为它们的 .result
    // interpolators can use .buffer as their .result
    // 数据首先进入 'incoming' 区域
    // the data then goes to 'incoming'
    //
    // 'accu0' 和 'accu1' 用于帧间交替存储累积结果，通过比较来检测变化
    // 'accu0' and 'accu1' are used frame-interleaved for
    // the cumulative result and are compared to detect
    // changes
    //
    // 'orig' 存储属性的原始状态
    // 'orig' stores the original state of the property
    //
    // 'add' 用于加法累积结果
    // 'add' is used for additive cumulative results
    //
    // 'work' 是可选的，仅在四元数类型时存在，用于存储中间四元数乘法结果
    // 'work' is optional and is only present for quaternion types. It is used
    // to store intermediate quaternion multiplication results

    // 根据数据类型选择相应的混合函数和缓冲区配置
    switch (typeName) {
      case "quaternion":
        // 四元数类型：使用球面线性插值
        mixFunction = this._slerp; // 球面线性插值函数
        mixFunctionAdditive = this._slerpAdditive; // 加法球面线性插值函数
        setIdentity = this._setAdditiveIdentityQuaternion; // 设置四元数加法单位元素

        // 四元数需要额外的工作空间，因此缓冲区大小为 valueSize * 6
        this.buffer = new Float64Array(valueSize * 6);
        this._workIndex = 5; // 工作区域索引，用于四元数中间计算
        break;

      case "string":
      case "bool":
        // 字符串和布尔类型：使用选择函数（非数值类型不支持插值）
        mixFunction = this._select;

        // 对于这些类型使用常规混合函数，加法对非数值类型无意义
        // Use the regular mix function and for additive on these types,
        // additive is not relevant for non-numeric types
        mixFunctionAdditive = this._select;

        setIdentity = this._setAdditiveIdentityOther; // 设置其他类型的加法单位元素

        // 非数值类型使用普通数组
        this.buffer = new Array(valueSize * 5);
        break;

      default:
        // 默认数值类型：使用线性插值
        mixFunction = this._lerp; // 线性插值函数
        mixFunctionAdditive = this._lerpAdditive; // 加法线性插值函数
        setIdentity = this._setAdditiveIdentityNumeric; // 设置数值加法单位元素

        // 数值类型使用 Float64Array 以保证精度
        this.buffer = new Float64Array(valueSize * 5);
    }

    // 设置混合函数引用
    this._mixBufferRegion = mixFunction; // 普通混合函数引用
    this._mixBufferRegionAdditive = mixFunctionAdditive; // 加法混合函数引用
    this._setIdentity = setIdentity; // 单位元素设置函数引用
    this._origIndex = 3; // 原始值在缓冲区中的索引
    this._addIndex = 4; // 加法累积值在缓冲区中的索引

    /**
     * 累积权重，记录当前混合操作的总权重。
     * 用于计算混合比例，确保权重归一化。
     *
     * Cumulative weight for current mixing operation.
     *
     * @type {number}
     * @default 0
     */
    this.cumulativeWeight = 0;

    /**
     * 加法累积权重，记录加法混合操作的总权重。
     * 用于加法动画混合，如位移叠加等效果。
     *
     * Cumulative weight for additive mixing operation.
     *
     * @type {number}
     * @default 0
     */
    this.cumulativeWeightAdditive = 0;

    /**
     * 使用计数，记录此混合器被使用的次数。
     * 用于性能优化和资源管理。
     *
     * Usage count for this mixer.
     *
     * @type {number}
     * @default 0
     */
    this.useCount = 0;

    /**
     * 引用计数，记录有多少个动画轨道引用此混合器。
     * 用于内存管理和垃圾回收优化。
     *
     * Reference count for this mixer.
     *
     * @type {number}
     * @default 0
     */
    this.referenceCount = 0;
  }

  /**
   * 将 `incoming` 区域的数据累积到 `accu<i>` 中。
   *
   * 这是动画混合的核心方法，负责将新的动画数据按权重累积到累积缓冲区中。
   * 支持多个动画轨道的加权混合，实现平滑的动画过渡效果。
   *
   * Accumulates data in the `incoming` region into `accu<i>`.
   *
   * @param {number} accuIndex - 累积索引，指定使用哪个累积缓冲区（0或1） The accumulation index.
   * @param {number} weight - 权重值，决定新数据在混合中的影响程度 The weight.
   */
  accumulate(accuIndex, weight) {
    // 注意：当权重为0时也会愉快地累积（实际上不做任何事），
    // 调用者知道权重值，本不应该在权重为0时调用此方法
    // note: happily accumulating nothing when weight = 0, the caller knows
    // the weight and shouldn't have made the call in the first place

    const buffer = this.buffer, // 获取数据缓冲区
      stride = this.valueSize, // 获取步长（每个值的大小）
      offset = accuIndex * stride + stride; // 计算目标累积区域的偏移量

    let currentWeight = this.cumulativeWeight; // 获取当前累积权重

    if (currentWeight === 0) {
      // 如果当前累积权重为0，说明这是第一次累积
      // accuN := incoming * weight

      // 直接将incoming区域的数据复制到累积区域
      for (let i = 0; i !== stride; ++i) {
        buffer[offset + i] = buffer[i];
      }

      currentWeight = weight; // 设置当前权重为输入权重
    } else {
      // 如果已有累积数据，需要进行加权混合
      // accuN := accuN + incoming * weight

      currentWeight += weight; // 更新总权重
      const mix = weight / currentWeight; // 计算混合比例
      // 调用混合函数进行加权混合
      this._mixBufferRegion(buffer, offset, 0, mix, stride);
    }

    this.cumulativeWeight = currentWeight; // 更新累积权重
  }

  /**
   * 将 `incoming` 区域的数据累积到 `add` 区域中（加法混合）。
   *
   * 用于实现加法动画混合，如位移叠加、旋转叠加等效果。
   * 与普通混合不同，加法混合不会替换原有值，而是在原有基础上叠加。
   *
   * Accumulates data in the `incoming` region into `add`.
   *
   * @param {number} weight - 权重值，决定加法混合的强度 The weight.
   */
  accumulateAdditive(weight) {
    const buffer = this.buffer, // 获取数据缓冲区
      stride = this.valueSize, // 获取步长
      offset = stride * this._addIndex; // 计算加法累积区域的偏移量

    if (this.cumulativeWeightAdditive === 0) {
      // 如果加法累积权重为0，说明这是第一次加法累积
      // add = identity

      this._setIdentity(); // 设置加法单位元素（如数值的0，四元数的单位四元数）
    }

    // 执行加法混合：add := add + incoming * weight
    this._mixBufferRegionAdditive(buffer, offset, 0, weight, stride);
    this.cumulativeWeightAdditive += weight; // 更新加法累积权重
  }

  /**
   * 当累积缓冲区发生变化时，将 `accu<i>` 的状态应用到属性绑定。
   *
   * 这是动画系统的最终输出步骤，负责将混合后的动画数据应用到实际的3D对象属性上。
   * 包括普通混合和加法混合的最终合成，以及变化检测优化。
   *
   * Applies the state of `accu<i>` to the binding when accus differ.
   *
   * @param {number} accuIndex - 累积索引，指定使用哪个累积缓冲区 The accumulation index.
   */
  apply(accuIndex) {
    const stride = this.valueSize, // 获取步长
      buffer = this.buffer, // 获取数据缓冲区
      offset = accuIndex * stride + stride, // 计算累积区域偏移量
      weight = this.cumulativeWeight, // 获取累积权重
      weightAdditive = this.cumulativeWeightAdditive, // 获取加法累积权重
      binding = this.binding; // 获取属性绑定对象

    // 重置累积权重，为下一帧做准备
    this.cumulativeWeight = 0; // 重置普通累积权重
    this.cumulativeWeightAdditive = 0; // 重置加法累积权重

    if (weight < 1) {
      // 如果累积权重小于1，需要混合原始值以保持完整性
      // accuN := accuN + original * ( 1 - cumulativeWeight )

      const originalValueOffset = stride * this._origIndex; // 计算原始值偏移量

      // 将原始值按剩余权重混合到累积结果中
      this._mixBufferRegion(buffer, offset, originalValueOffset, 1 - weight, stride);
    }

    if (weightAdditive > 0) {
      // 如果有加法混合数据，将其应用到累积结果中
      // accuN := accuN + additive accuN

      this._mixBufferRegionAdditive(buffer, offset, this._addIndex * stride, 1, stride);
    }

    // 检测值是否发生变化，避免不必要的属性更新
    for (let i = stride, e = stride + stride; i !== e; ++i) {
      if (buffer[i] !== buffer[i + stride]) {
        // 比较当前帧和上一帧的值
        // 值已改变 -> 更新场景图
        // value has changed -> update scene graph

        binding.setValue(buffer, offset); // 将最终结果应用到目标属性
        break; // 一旦检测到变化就立即更新并退出循环
      }
    }
  }

  /**
   * 记住绑定属性的状态并将其复制到两个累积缓冲区。
   *
   * 保存当前属性的原始状态，用于动画开始前的状态备份。
   * 这个状态将用于检测变化和实现动画的回退功能。
   *
   * Remembers the state of the bound property and copy it to both accus.
   */
  saveOriginalState() {
    const binding = this.binding; // 获取属性绑定对象

    const buffer = this.buffer, // 获取数据缓冲区
      stride = this.valueSize, // 获取步长
      originalValueOffset = stride * this._origIndex; // 计算原始值存储偏移量

    // 从绑定对象获取当前属性值并存储到原始值区域
    binding.getValue(buffer, originalValueOffset);

    // 将原始值复制到两个累积缓冲区 -- 初始时用原始值检测变化
    // accu[0..1] := orig -- initially detect changes against the original
    for (let i = stride, e = originalValueOffset; i !== e; ++i) {
      buffer[i] = buffer[originalValueOffset + (i % stride)];
    }

    // 为加法混合设置单位元素
    // Add to identity for additive
    this._setIdentity();

    // 重置累积权重
    this.cumulativeWeight = 0; // 重置普通累积权重
    this.cumulativeWeightAdditive = 0; // 重置加法累积权重
  }

  /**
   * 将之前通过 {@link PropertyMixer#saveOriginalState} 保存的状态应用到绑定。
   *
   * 恢复属性到动画开始前的原始状态，用于动画重置或回退操作。
   *
   * Applies the state previously taken via {@link PropertyMixer#saveOriginalState} to the binding.
   */
  restoreOriginalState() {
    const originalValueOffset = this.valueSize * 3; // 计算原始值偏移量（固定为索引3）
    // 将原始状态值设置回绑定的属性
    this.binding.setValue(this.buffer, originalValueOffset);
  }

  // 内部方法
  // internals

  /**
   * 为数值类型设置加法单位元素。
   *
   * 数值类型的加法单位元素是0，因为任何数加0等于自身。
   * 用于初始化加法混合缓冲区。
   */
  _setAdditiveIdentityNumeric() {
    const startIndex = this._addIndex * this.valueSize; // 计算加法区域起始索引
    const endIndex = startIndex + this.valueSize; // 计算加法区域结束索引

    // 将加法区域的所有值设置为0（数值加法单位元素）
    for (let i = startIndex; i < endIndex; i++) {
      this.buffer[i] = 0;
    }
  }

  /**
   * 为四元数类型设置加法单位元素。
   *
   * 四元数的加法单位元素是单位四元数 (0, 0, 0, 1)，
   * 其中前三个分量为0，第四个分量（w）为1。
   */
  _setAdditiveIdentityQuaternion() {
    this._setAdditiveIdentityNumeric(); // 先将所有分量设置为0
    this.buffer[this._addIndex * this.valueSize + 3] = 1; // 将w分量设置为1，形成单位四元数
  }

  /**
   * 为其他类型（字符串、布尔等）设置加法单位元素。
   *
   * 对于非数值类型，加法单位元素就是原始值本身，
   * 因为这些类型不支持真正的数学加法运算。
   */
  _setAdditiveIdentityOther() {
    const startIndex = this._origIndex * this.valueSize; // 计算原始值区域起始索引
    const targetIndex = this._addIndex * this.valueSize; // 计算加法区域起始索引

    // 将原始值复制到加法区域作为单位元素
    for (let i = 0; i < this.valueSize; i++) {
      this.buffer[targetIndex + i] = this.buffer[startIndex + i];
    }
  }

  // 混合函数
  // mix functions

  /**
   * 选择函数，用于非数值类型（字符串、布尔值）的混合。
   *
   * 由于非数值类型无法进行数学插值，采用阈值选择策略：
   * 当混合参数t >= 0.5时选择源值，否则保持目标值不变。
   *
   * @param {Array|TypedArray} buffer - 数据缓冲区
   * @param {number} dstOffset - 目标偏移量
   * @param {number} srcOffset - 源偏移量
   * @param {number} t - 混合参数（0-1）
   * @param {number} stride - 步长
   */
  _select(buffer, dstOffset, srcOffset, t, stride) {
    if (t >= 0.5) {
      // 当混合参数大于等于0.5时，选择源值
      for (let i = 0; i !== stride; ++i) {
        buffer[dstOffset + i] = buffer[srcOffset + i];
      }
    }
    // 否则保持目标值不变（不需要显式操作）
  }

  /**
   * 球面线性插值函数，用于四元数的平滑旋转插值。
   *
   * 四元数表示旋转，使用球面线性插值（Slerp）可以确保
   * 旋转路径是最短的，避免万向锁问题。
   *
   * @param {Float64Array} buffer - 数据缓冲区
   * @param {number} dstOffset - 目标偏移量
   * @param {number} srcOffset - 源偏移量
   * @param {number} t - 插值参数（0-1）
   */
  _slerp(buffer, dstOffset, srcOffset, t) {
    // 调用四元数的球面线性插值方法
    Quaternion.slerpFlat(buffer, dstOffset, buffer, dstOffset, buffer, srcOffset, t);
  }

  /**
   * 加法球面线性插值函数，用于四元数的加法混合。
   *
   * 先将目标四元数与源四元数相乘得到相对旋转，
   * 然后对这个相对旋转进行球面线性插值。
   *
   * @param {Float64Array} buffer - 数据缓冲区
   * @param {number} dstOffset - 目标偏移量
   * @param {number} srcOffset - 源偏移量
   * @param {number} t - 插值参数（0-1）
   * @param {number} stride - 步长
   */
  _slerpAdditive(buffer, dstOffset, srcOffset, t, stride) {
    const workOffset = this._workIndex * stride; // 计算工作区域偏移量

    // 将结果存储在中间缓冲区偏移量中
    // Store result in intermediate buffer offset
    Quaternion.multiplyQuaternionsFlat(buffer, workOffset, buffer, dstOffset, buffer, srcOffset);

    // 对中间结果进行球面线性插值
    // Slerp to the intermediate result
    Quaternion.slerpFlat(buffer, dstOffset, buffer, dstOffset, buffer, workOffset, t);
  }

  /**
   * 线性插值函数，用于数值类型的平滑过渡。
   *
   * 实现标准的线性插值公式：result = a * (1-t) + b * t
   * 适用于位置、缩放、颜色等数值属性的混合。
   *
   * @param {Float64Array} buffer - 数据缓冲区
   * @param {number} dstOffset - 目标偏移量
   * @param {number} srcOffset - 源偏移量
   * @param {number} t - 插值参数（0-1）
   * @param {number} stride - 步长
   */
  _lerp(buffer, dstOffset, srcOffset, t, stride) {
    const s = 1 - t; // 计算目标值的权重

    // 对每个分量进行线性插值
    for (let i = 0; i !== stride; ++i) {
      const j = dstOffset + i; // 计算当前分量的索引

      // 线性插值公式：dst * (1-t) + src * t
      buffer[j] = buffer[j] * s + buffer[srcOffset + i] * t;
    }
  }

  /**
   * 加法线性插值函数，用于数值类型的加法混合。
   *
   * 将源值按权重叠加到目标值上，实现累积效果。
   * 常用于位移叠加、力的累积等场景。
   *
   * @param {Float64Array} buffer - 数据缓冲区
   * @param {number} dstOffset - 目标偏移量
   * @param {number} srcOffset - 源偏移量
   * @param {number} t - 混合权重
   * @param {number} stride - 步长
   */
  _lerpAdditive(buffer, dstOffset, srcOffset, t, stride) {
    // 对每个分量进行加法混合
    for (let i = 0; i !== stride; ++i) {
      const j = dstOffset + i; // 计算当前分量的索引

      // 加法混合公式：dst = dst + src * t
      buffer[j] = buffer[j] + buffer[srcOffset + i] * t;
    }
  }
}

// 导出PropertyMixer类，供Three.js动画系统内部使用
// Export PropertyMixer class for internal use by Three.js animation system
export { PropertyMixer };
