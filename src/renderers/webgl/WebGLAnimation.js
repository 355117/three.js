/**
 * WebGLAnimation - WebGL动画循环管理器
 *
 * 这个模块负责管理WebGL渲染器的动画循环，提供启动、停止和配置动画循环的功能。
 * 它封装了浏览器的requestAnimationFrame API，确保动画以最佳的帧率运行。
 *
 * @returns {Object} 返回包含动画控制方法的对象
 */
function WebGLAnimation() {
  // 动画上下文，通常是WebGL渲染上下文或XR会话
  let context = null;

  // 标记当前是否正在执行动画循环
  let isAnimating = false;

  // 用户定义的动画循环回调函数
  let animationLoop = null;

  // 当前动画帧的请求ID，用于取消动画
  let requestId = null;

  /**
   * 动画帧回调函数
   *
   * 这个函数在每一帧被调用，执行用户定义的动画逻辑，
   * 然后请求下一帧的动画。
   *
   * @param {number} time - 当前时间戳（毫秒）
   * @param {XRFrame} frame - XR帧对象（在WebXR环境中使用）
   */
  function onAnimationFrame(time, frame) {
    // 执行用户定义的动画循环回调
    animationLoop(time, frame);

    // 请求下一帧动画
    requestId = context.requestAnimationFrame(onAnimationFrame);
  }

  return {
    /**
     * 启动动画循环
     *
     * 开始执行动画循环。如果动画已经在运行或者没有设置动画循环回调，
     * 则不执行任何操作。
     */
    start: function () {
      // 如果动画已经在运行，直接返回
      if (isAnimating === true) return;

      // 如果没有设置动画循环回调，直接返回
      if (animationLoop === null) return;

      // 请求第一帧动画
      requestId = context.requestAnimationFrame(onAnimationFrame);

      // 标记动画状态为运行中
      isAnimating = true;
    },

    /**
     * 停止动画循环
     *
     * 取消当前的动画帧请求，停止动画循环的执行。
     */
    stop: function () {
      // 取消动画帧请求
      context.cancelAnimationFrame(requestId);

      // 标记动画状态为停止
      isAnimating = false;
    },

    /**
     * 设置动画循环回调函数
     *
     * @param {Function} callback - 动画循环回调函数
     *                             接收参数: (time: number, frame?: XRFrame)
     *                             time: 当前时间戳
     *                             frame: XR帧对象（可选，仅在WebXR环境中提供）
     */
    setAnimationLoop: function (callback) {
      animationLoop = callback;
    },

    /**
     * 设置动画上下文
     *
     * 设置用于请求和取消动画帧的上下文对象。
     * 这通常是WebGL渲染上下文或XR会话对象。
     *
     * @param {Object} value - 动画上下文对象
     *                        必须包含 requestAnimationFrame 和 cancelAnimationFrame 方法
     */
    setContext: function (value) {
      context = value;
    },
  };
}

export { WebGLAnimation };
