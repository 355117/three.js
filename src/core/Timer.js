/**
 * 这个类是{@link Clock}的替代方案，具有不同的API设计和行为。
 * 目标是避免`Clock`随时间推移而显现出的概念缺陷。
 *
 * Timer类的主要特点：
 * - `Timer`有一个`update()`方法来更新其内部状态。这使得在每个模拟步骤中
 *   多次调用`getDelta()`和`getElapsed()`而不会得到不同的值成为可能。
 * - 该类可以利用Page Visibility API来避免应用程序处于非活动状态时
 *   （例如切换标签页或浏览器隐藏）出现较大的时间增量值。
 *
 * 使用示例：
 * ```js
 * const timer = new Timer();
 * timer.connect( document ); // 使用Page Visibility API
 * ```
 */
class Timer {
  /**
   * 构造一个新的计时器
   */
  constructor() {
    this._previousTime = 0; // 上一帧的时间（毫秒）
    this._currentTime = 0; // 当前帧的时间（毫秒）
    this._startTime = performance.now(); // 计时器启动时的时间戳

    this._delta = 0; // 时间增量（毫秒）
    this._elapsed = 0; // 累计经过的时间（毫秒）

    this._timescale = 1; // 时间缩放因子，用于加速或减慢时间

    this._document = null; // 关联的文档对象，用于Page Visibility API
    this._pageVisibilityHandler = null; // 页面可见性变化的事件处理器
  }

  /**
   * 将计时器连接到给定的文档。调用此方法不是使用计时器的必需条件，
   * 但它启用了Page Visibility API的使用，以避免较大的时间增量值。
   *
   * 当页面变为不可见时（如切换标签页），计时器会暂停计时，
   * 避免在页面重新可见时产生异常大的时间跳跃。
   *
   * @param {Document} document - 要连接的文档对象
   */
  connect(document) {
    this._document = document; // 保存文档引用

    // 使用Page Visibility API来避免较大的时间增量值

    if (document.hidden !== undefined) {
      // 检查浏览器是否支持Page Visibility API

      // 绑定页面可见性变化的处理函数
      this._pageVisibilityHandler = handleVisibilityChange.bind(this);

      // 监听页面可见性变化事件
      document.addEventListener("visibilitychange", this._pageVisibilityHandler, false);
    }
  }

  /**
   * 断开计时器与DOM的连接，同时禁用Page Visibility API的使用
   */
  disconnect() {
    if (this._pageVisibilityHandler !== null) {
      // 如果存在事件处理器，则移除事件监听器

      this._document.removeEventListener("visibilitychange", this._pageVisibilityHandler);
      this._pageVisibilityHandler = null; // 清空处理器引用
    }

    this._document = null; // 清空文档引用
  }

  /**
   * 返回时间增量（以秒为单位）
   * 时间增量表示自上次更新以来经过的时间
   *
   * @return {number} 时间增量（秒）
   */
  getDelta() {
    return this._delta / 1000; // 将毫秒转换为秒
  }

  /**
   * 返回累计经过的时间（以秒为单位）
   * 这是自计时器创建以来所有时间增量的累积
   *
   * @return {number} 累计经过的时间（秒）
   */
  getElapsed() {
    return this._elapsed / 1000; // 将毫秒转换为秒
  }

  /**
   * 返回当前的时间缩放因子
   * 时间缩放因子用于加速或减慢时间的流逝
   *
   * @return {number} 时间缩放因子
   */
  getTimescale() {
    return this._timescale; // 返回当前的时间缩放因子
  }

  /**
   * 设置时间缩放因子，该因子会影响`update()`中的时间增量计算
   *
   * 时间缩放因子的作用：
   * - 1.0：正常时间流速
   * - 2.0：时间流速加倍
   * - 0.5：时间流速减半
   * - 0.0：时间暂停
   *
   * @param {number} timescale - 要设置的时间缩放因子
   * @return {Timer} 返回此计时器的引用，支持链式调用
   */
  setTimescale(timescale) {
    this._timescale = timescale; // 设置时间缩放因子

    return this; // 返回自身以支持链式调用
  }

  /**
   * 重置当前模拟步骤的时间计算
   * 这会更新当前时间，但不会重置累计时间
   *
   * @return {Timer} 返回此计时器的引用，支持链式调用
   */
  reset() {
    // 重新计算当前时间，基于启动时间的偏移
    this._currentTime = performance.now() - this._startTime;

    return this; // 返回自身以支持链式调用
  }

  /**
   * 释放所有内部资源。通常在不再需要计时器实例时调用
   * 这会断开与文档的连接并清理事件监听器
   */
  dispose() {
    this.disconnect(); // 断开连接并清理资源
  }

  /**
   * 更新计时器的内部状态。此方法应该在每个模拟步骤中调用一次，
   * 并且在对计时器执行查询之前调用（例如通过`getDelta()`）。
   *
   * 更新过程：
   * 1. 检查页面可见性状态
   * 2. 计算时间增量
   * 3. 应用时间缩放因子
   * 4. 累积总经过时间
   *
   * @param {number} timestamp - 当前时间（毫秒）。可以从`requestAnimationFrame`
   *                            回调参数中获得。如果未提供，将使用`performance.now`确定当前时间
   * @return {Timer} 返回此计时器的引用，支持链式调用
   */
  update(timestamp) {
    if (this._pageVisibilityHandler !== null && this._document.hidden === true) {
      // 如果页面不可见，将时间增量设为0，避免时间跳跃
      this._delta = 0;
    } else {
      // 页面可见时，正常计算时间增量
      this._previousTime = this._currentTime; // 保存上一帧时间
      // 计算当前时间，如果提供了timestamp则使用它，否则使用performance.now()
      this._currentTime = (timestamp !== undefined ? timestamp : performance.now()) - this._startTime;

      // 计算时间增量并应用时间缩放因子
      this._delta = (this._currentTime - this._previousTime) * this._timescale;
      // 累积总经过时间（_elapsed是所有先前增量的累积）
      this._elapsed += this._delta;
    }

    return this; // 返回自身以支持链式调用
  }
}

/**
 * 处理页面可见性变化的内部函数
 * 当页面从隐藏状态变为可见时，重置计时器以避免时间跳跃
 */
function handleVisibilityChange() {
  if (this._document.hidden === false) this.reset(); // 页面变为可见时重置计时器
}

// 导出Timer类
export { Timer };
