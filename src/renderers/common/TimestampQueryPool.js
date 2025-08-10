/**
 * 时间戳查询池抽象基类
 *
 * 时间戳查询池用于管理GPU时间戳查询，允许测量GPU操作的执行时间。
 * 这对于性能分析和优化非常有用，可以帮助开发者了解渲染操作的实际耗时。
 *
 * 此类是抽象基类，具体的实现由不同的渲染后端（如WebGPU）提供。
 *
 * @abstract
 */
class TimestampQueryPool {
  /**
   * 创建一个新的时间戳查询池
   *
   * @param {number} [maxQueries=256] - 此池可以容纳的最大查询数量
   */
  constructor(maxQueries = 256) {
    /**
     * 是否跟踪时间戳
     * 控制是否启用时间戳查询功能
     *
     * @type {boolean}
     * @default true
     */
    this.trackTimestamp = true;

    /**
     * 此池可以容纳的最大查询数量
     * 限制同时进行的时间戳查询数量，避免资源耗尽
     *
     * @type {number}
     * @default 256
     */
    this.maxQueries = maxQueries;

    /**
     * 到目前为止已分配的查询数量
     * 跟踪当前已使用的查询索引
     *
     * @type {number}
     * @default 0
     */
    this.currentQueryIndex = 0;

    /**
     * 跟踪不同上下文的偏移量
     * 用于管理多个渲染上下文的查询分配
     *
     * @type {Map<string, number>}
     */
    this.queryOffsets = new Map();

    /**
     * 池是否已被销毁
     * 标记资源是否已释放，防止重复操作
     *
     * @type {boolean}
     * @default false
     */
    this.isDisposed = false;

    /**
     * 最后一次查询的时间戳值
     * 存储上一次时间戳查询的结果，用于计算时间差
     *
     * @type {number}
     * @default 0
     */
    this.lastValue = 0;

    /**
     * 是否有待解析的查询
     * 标记是否有异步查询正在等待结果
     *
     * @type {boolean}
     * @default false
     */
    this.pendingResolve = false;
  }

  /**
   * 为特定的渲染上下文分配查询
   *
   * 此方法为给定的渲染上下文分配时间戳查询资源。
   * 不同的渲染上下文可能需要不同数量的查询，此方法负责管理分配。
   *
   * @abstract
   * @param {Object} renderContext - 要为其分配查询的渲染上下文
   * @returns {?number} 分配的查询索引，如果分配失败则返回null
   */
  allocateQueriesForContext(/* renderContext */) {}

  /**
   * 异步解析所有时间戳并返回数据
   *
   * 此方法收集所有待处理的时间戳查询结果，并返回处理后的数据。
   * 由于GPU查询是异步的，此方法需要等待GPU完成相关操作。
   *
   * @abstract
   * @async
   * @returns {Promise<number>|number} 解析的时间戳值
   */
  async resolveQueriesAsync() {}

  /**
   * 销毁查询池
   *
   * 释放查询池占用的所有资源，包括GPU查询对象和相关内存。
   * 调用此方法后，查询池将不再可用。
   *
   * @abstract
   */
  dispose() {}
}

// 导出时间戳查询池抽象基类
export default TimestampQueryPool;
