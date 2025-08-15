/**
 * 时钟类，用于跟踪时间
 * Class for keeping track of time.
 */
class Clock {
  /**
   * 构造一个新的时钟对象
   * Constructs a new clock.
   *
   * @param {boolean} [autoStart=true] - 是否在第一次调用 `getDelta()` 时自动启动时钟
   * Whether to automatically start the clock when `getDelta()` is called for the first time.
   */
  constructor(autoStart = true) {
    /**
     * 如果设置为 `true`，时钟会在第一次调用 `getDelta()` 时自动启动
     * If set to `true`, the clock starts automatically when `getDelta()` is called
     * for the first time.
     *
     * @type {boolean}
     * @default true
     */
    this.autoStart = autoStart;

    /**
     * 保存时钟 `start()` 方法最后一次被调用的时间
     * Holds the time at which the clock's `start()` method was last called.
     *
     * @type {number}
     * @default 0
     */
    this.startTime = 0;

    /**
     * 保存时钟的 `start()`、`getElapsedTime()` 或 `getDelta()` 方法最后一次被调用的时间
     * Holds the time at which the clock's `start()`, `getElapsedTime()` or
     * `getDelta()` methods were last called.
     *
     * @type {number}
     * @default 0
     */
    this.oldTime = 0;

    /**
     * 跟踪时钟运行的总时间
     * Keeps track of the total time that the clock has been running.
     *
     * @type {number}
     * @default 0
     */
    this.elapsedTime = 0;

    /**
     * 时钟是否正在运行
     * Whether the clock is running or not.
     *
     * @type {boolean}
     * @default false
     */
    this.running = false;
  }

  /**
   * 启动时钟
   * 当 `autoStart` 设置为 `true` 时，该方法会被类自动调用
   * Starts the clock. When `autoStart` is set to `true`, the method is automatically
   * called by the class.
   */
  start() {
    // 获取当前高精度时间戳作为启动时间
    this.startTime = performance.now();

    // 将旧时间设置为启动时间
    this.oldTime = this.startTime;
    // 重置已过去的时间为0
    this.elapsedTime = 0;
    // 设置运行状态为true
    this.running = true;
  }

  /**
   * 停止时钟
   * Stops the clock.
   */
  stop() {
    // 获取最终的已过去时间
    this.getElapsedTime();
    // 设置运行状态为false
    this.running = false;
    // 禁用自动启动
    this.autoStart = false;
  }

  /**
   * 返回已过去的时间（以秒为单位）
   * Returns the elapsed time in seconds.
   *
   * @return {number} 已过去的时间
   */
  getElapsedTime() {
    // 调用getDelta()来更新已过去的时间
    this.getDelta();
    // 返回总的已过去时间
    return this.elapsedTime;
  }

  /**
   * 返回增量时间（以秒为单位）
   * Returns the delta time in seconds.
   *
   * @return {number} 增量时间
   */
  getDelta() {
    // 初始化时间差为0
    let diff = 0;

    // 如果启用了自动启动且时钟未运行
    if (this.autoStart && !this.running) {
      // 启动时钟
      this.start();
      // 返回0，因为这是第一次调用
      return 0;
    }

    // 如果时钟正在运行
    if (this.running) {
      // 获取当前时间
      const newTime = performance.now();

      // 计算时间差（转换为秒）
      diff = (newTime - this.oldTime) / 1000;
      // 更新旧时间为当前时间
      this.oldTime = newTime;

      // 累加到总的已过去时间
      this.elapsedTime += diff;
    }

    // 返回时间差
    return diff;
  }
}

// 导出时钟类
export { Clock };
