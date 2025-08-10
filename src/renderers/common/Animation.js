/**
 * Animation.js
 *
 * 动画循环管理器 - 管理渲染器的内部动画循环
 *
 * 这个模块负责管理渲染器的内部动画循环，包括启动、停止、
 * 用户自定义动画回调的管理，以及与XR会话的集成。
 */

/**
 * 动画循环管理类
 *
 * 这个模块管理渲染器的内部动画循环。它负责协调帧更新、
 * 性能监控数据重置、节点系统更新以及用户自定义的动画回调。
 *
 * @private
 */
class Animation {
  /**
   * 构造新的动画循环管理组件
   *
   * 初始化动画循环管理器，设置必要的组件引用和默认状态。
   * 动画循环将协调节点系统更新和性能监控。
   *
   * @param {import('./nodes/Nodes.js').default} nodes - 用于管理节点相关逻辑的渲染器组件
   * @param {import('./Info.js').default} info - 用于管理指标和监控数据的渲染器组件
   */
  constructor(nodes, info) {
    /**
     * 节点管理组件
     *
     * 用于管理节点相关逻辑的渲染器组件。在每一帧中，
     * 这个组件负责更新节点系统的状态。
     *
     * @type {import('./nodes/Nodes.js').default}
     */
    this.nodes = nodes;

    /**
     * 信息监控组件
     *
     * 用于管理指标和监控数据的渲染器组件。负责收集
     * 和重置性能统计信息。
     *
     * @type {import('./Info.js').default}
     */
    this.info = info;

    /**
     * 动画上下文引用
     *
     * 可以调用`requestAnimationFrame()`的上下文引用（通常是`window`）。
     * 在XR环境中，这可能是XRSession对象。
     *
     * @type {?(Window|XRSession)}
     */
    this._context = typeof self !== "undefined" ? self : null;

    /**
     * 用户定义的动画循环
     *
     * 用户可以设置的自定义动画回调函数，在每一帧中被调用。
     * 这允许用户在渲染循环中执行自定义逻辑。
     *
     * @type {?Function}
     * @default null
     */
    this._animationLoop = null;

    /**
     * 动画请求ID
     *
     * 从`requestAnimationFrame()`调用返回的请求ID。
     * 可用于取消和停止动画循环。
     *
     * @type {?number}
     * @default null
     */
    this._requestId = null;
  }

  /**
   * 启动内部动画循环
   *
   * 开始执行动画循环，设置递归的帧更新机制。每一帧都会：
   * 1. 重置性能监控信息（如果启用自动重置）
   * 2. 更新节点帧状态
   * 3. 同步帧ID到信息组件
   * 4. 调用用户自定义的动画回调
   */
  start() {
    // 定义更新函数，这将在每一帧被调用
    const update = (time, xrFrame) => {
      // 请求下一帧的动画更新
      this._requestId = this._context.requestAnimationFrame(update);

      // 如果启用了自动重置，重置性能监控信息
      if (this.info.autoReset === true) this.info.reset();

      // 更新节点帧状态
      this.nodes.nodeFrame.update();

      // 同步当前帧ID到信息组件
      this.info.frame = this.nodes.nodeFrame.frameId;

      // 如果设置了用户动画循环，则调用它
      if (this._animationLoop !== null) this._animationLoop(time, xrFrame);
    };

    // 启动动画循环
    update();
  }

  /**
   * 停止内部动画循环
   *
   * 取消当前的动画帧请求，停止动画循环的执行。
   * 这会立即停止所有帧更新和用户回调的调用。
   */
  stop() {
    // 取消动画帧请求
    this._context.cancelAnimationFrame(this._requestId);

    // 清空请求ID
    this._requestId = null;
  }

  /**
   * 获取用户级动画循环
   *
   * 返回当前设置的用户自定义动画回调函数。
   *
   * @return {?Function} 动画循环回调函数
   */
  getAnimationLoop() {
    return this._animationLoop;
  }

  /**
   * 设置用户级动画循环
   *
   * 定义用户自定义的动画回调函数，该函数将在每一帧被调用。
   * 回调函数接收时间戳和XR帧信息作为参数。
   *
   * @param {?Function} callback - 动画循环回调函数
   */
  setAnimationLoop(callback) {
    this._animationLoop = callback;
  }

  /**
   * 获取动画上下文
   *
   * 返回当前的动画上下文，通常是window对象或XRSession对象。
   *
   * @return {Window|XRSession} 动画上下文
   */
  getContext() {
    return this._context;
  }

  /**
   * 设置动画上下文
   *
   * 定义执行`requestAnimationFrame()`的上下文。在普通渲染中
   * 通常是window对象，在XR渲染中是XRSession对象。
   *
   * @param {Window|XRSession} context - 要设置的上下文
   */
  setContext(context) {
    this._context = context;
  }

  /**
   * 释放所有内部资源并停止动画循环
   *
   * 清理动画管理器，停止动画循环并释放相关资源。
   * 这个方法应该在不再需要动画管理器时调用。
   */
  dispose() {
    // 停止动画循环
    this.stop();
  }
}

export default Animation;
