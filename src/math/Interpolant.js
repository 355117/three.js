/**
 * 参数化样本插值器的抽象基类
 * Abstract base class of interpolants over parametric samples.
 *
 * 参数域是一维的，通常是时间或沿着由数据定义的曲线的路径。
 * The parameter domain is one dimensional, typically the time or a path
 * along a curve defined by the data.
 *
 * 样本值可以具有任何维度，派生类可以对数据应用特殊的解释。
 * The sample values can have any dimensionality and derived classes may
 * apply special interpretations to the data.
 *
 * 此类在模板方法中提供区间搜索，将实际插值延迟到派生类。
 * This class provides the interval seek in a Template Method, deferring
 * the actual interpolation to derived classes.
 *
 * 时间复杂度：线性访问最多跨越两个点时为O(1)，随机访问时为O(log N)，其中N是位置数量。
 * Time complexity is O(1) for linear access crossing at most two points
 * and O(log N) for random access, where N is the number of positions.
 *
 * 参考：模板方法模式
 * References: {@link http://www.oodesign.com/template-method-pattern.html}
 *
 * @abstract
 */
class Interpolant {
  /**
   * 构造一个新的插值器
   * Constructs a new interpolant.
   *
   * @param {TypedArray} parameterPositions - 参数位置保存插值因子 The parameter positions hold the interpolation factors.
   * @param {TypedArray} sampleValues - 样本值 The sample values.
   * @param {number} sampleSize - 样本大小 The sample size
   * @param {TypedArray} [resultBuffer] - 结果缓冲区 The result buffer.
   */
  constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
    /**
     * 参数位置（通常是时间值数组）
     * The parameter positions.
     *
     * @type {TypedArray}
     */
    this.parameterPositions = parameterPositions;

    /**
     * 缓存索引，用于优化连续访问
     * A cache index.
     *
     * @private
     * @type {number}
     * @default 0
     */
    this._cachedIndex = 0;

    /**
     * 结果缓冲区，用于存储插值结果
     * The result buffer.
     *
     * @type {TypedArray}
     */
    this.resultBuffer = resultBuffer !== undefined ? resultBuffer : new sampleValues.constructor(sampleSize);

    /**
     * 样本值（关键帧数据）
     * The sample values.
     *
     * @type {TypedArray}
     */
    this.sampleValues = sampleValues;

    /**
     * 值的大小（每个样本的分量数量）
     * The value size.
     *
     * @type {number}
     */
    this.valueSize = sampleSize;

    /**
     * 插值设置对象
     * The interpolation settings.
     *
     * @type {?Object}
     * @default null
     */
    this.settings = null;

    /**
     * 默认设置对象
     * The default settings object.
     *
     * @type {Object}
     */
    this.DefaultSettings_ = {};
  }

  /**
   * 在位置t处评估插值器
   * Evaluate the interpolant at position `t`.
   *
   * @param {number} t - 插值因子 The interpolation factor.
   * @return {TypedArray} 结果缓冲区 The result buffer.
   */
  evaluate(t) {
    // 获取参数位置数组
    const pp = this.parameterPositions;
    // 从缓存索引开始搜索
    let i1 = this._cachedIndex,
      t1 = pp[i1], // 当前区间的右端点
      t0 = pp[i1 - 1]; // 当前区间的左端点

    // 验证区间的有效性
    validate_interval: {
      // 搜索包含目标时间t的区间
      seek: {
        let right;

        // 线性扫描：首先尝试线性搜索（对于连续访问效率更高）
        linear_scan: {
          //- 参见 http://jsperf.com/comparison-to-undefined/3
          //- 较慢的代码：
          //-
          //- 				if ( t >= t1 || t1 === undefined ) {

          // 向前扫描：如果t不小于t1，需要向前搜索
          forward_scan: if (!(t < t1)) {
            for (let giveUpAt = i1 + 2; ; ) {
              if (t1 === undefined) {
                // 如果t1未定义，检查是否在数组开始之前
                if (t < t0) break forward_scan;

                // 超出数组末尾
                // after end

                i1 = pp.length;
                this._cachedIndex = i1;
                return this.copySampleValue_(i1 - 1);
              }

              // 如果达到放弃点，跳出线性扫描
              if (i1 === giveUpAt) break; // this loop

              // 向前移动一步
              t0 = t1;
              t1 = pp[++i1];

              if (t < t1) {
                // 找到了目标区间
                // we have arrived at the sought interval
                break seek;
              }
            }

            // 准备在索引右侧进行二分搜索
            // prepare binary search on the right side of the index
            right = pp.length;
            break linear_scan;
          }

          //- slower code:
          //-					if ( t < t0 || t0 === undefined ) {
          if (!(t >= t0)) {
            // looping?

            const t1global = pp[1];

            if (t < t1global) {
              i1 = 2; // + 1, using the scan for the details
              t0 = t1global;
            }

            // linear reverse scan

            for (let giveUpAt = i1 - 2; ; ) {
              if (t0 === undefined) {
                // before start

                this._cachedIndex = 0;
                return this.copySampleValue_(0);
              }

              if (i1 === giveUpAt) break; // this loop

              t1 = t0;
              t0 = pp[--i1 - 1];

              if (t >= t0) {
                // we have arrived at the sought interval
                break seek;
              }
            }

            // prepare binary search on the left side of the index
            right = i1;
            i1 = 0;
            break linear_scan;
          }

          // the interval is valid

          break validate_interval;
        } // linear scan

        // binary search

        while (i1 < right) {
          const mid = (i1 + right) >>> 1;

          if (t < pp[mid]) {
            right = mid;
          } else {
            i1 = mid + 1;
          }
        }

        t1 = pp[i1];
        t0 = pp[i1 - 1];

        // check boundary cases, again

        if (t0 === undefined) {
          this._cachedIndex = 0;
          return this.copySampleValue_(0);
        }

        if (t1 === undefined) {
          i1 = pp.length;
          this._cachedIndex = i1;
          return this.copySampleValue_(i1 - 1);
        }
      } // seek

      this._cachedIndex = i1;

      this.intervalChanged_(i1, t0, t1);
    } // validate_interval

    return this.interpolate_(i1, t0, t, t1);
  }

  /**
   * 返回插值设置
   * Returns the interpolation settings.
   *
   * @return {Object} 插值设置 The interpolation settings.
   */
  getSettings_() {
    // 返回当前设置或默认设置
    return this.settings || this.DefaultSettings_;
  }

  /**
   * 将样本值复制到结果缓冲区
   * Copies a sample value to the result buffer.
   *
   * @param {number} index - 样本值缓冲区的索引 An index into the sample value buffer.
   * @return {TypedArray} 结果缓冲区 The result buffer.
   */
  copySampleValue_(index) {
    // 将样本值复制到结果缓冲区
    // copies a sample value to the result buffer

    const result = this.resultBuffer, // 结果缓冲区
      values = this.sampleValues, // 样本值数组
      stride = this.valueSize, // 每个样本的步长（分量数量）
      offset = index * stride; // 计算在样本数组中的偏移量

    // 复制指定索引处的完整样本值
    for (let i = 0; i !== stride; ++i) {
      result[i] = values[offset + i];
    }

    // 返回结果缓冲区
    return result;
  }

  /**
   * 执行插值计算（抽象方法）
   * Copies a sample value to the result buffer.
   *
   * @abstract
   * @param {number} i1 - 样本值缓冲区的索引 An index into the sample value buffer.
   * @param {number} t0 - 前一个插值因子 The previous interpolation factor.
   * @param {number} t - 当前插值因子 The current interpolation factor.
   * @param {number} t1 - 下一个插值因子 The next interpolation factor.
   * @return {TypedArray} 结果缓冲区 The result buffer.
   */
  interpolate_(/* i1, t0, t, t1 */) {
    // 抛出错误，因为这是抽象方法
    throw new Error("call to abstract method");
    // 实现类应该返回 this.resultBuffer
    // implementations shall return this.resultBuffer
  }

  /**
   * 当区间发生变化时执行的可选方法
   * Optional method that is executed when the interval has changed.
   *
   * @param {number} i1 - 样本值缓冲区的索引 An index into the sample value buffer.
   * @param {number} t0 - 前一个插值因子 The previous interpolation factor.
   * @param {number} t1 - 下一个插值因子 The next interpolation factor.
   */
  intervalChanged_(/* i1, t0, t1 */) {
    // 空实现，派生类可以重写此方法
    // empty
  }
}

// 导出Interpolant类
export { Interpolant };
