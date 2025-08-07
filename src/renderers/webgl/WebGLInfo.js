/**
 * WebGL信息统计器
 *
 * 这个类负责收集和统计WebGL渲染过程中的各种信息，
 * 包括内存使用情况和渲染统计数据。这些信息对于性能分析和调试非常有用。
 *
 * 主要功能：
 * 1. 统计内存中的几何体和纹理数量
 * 2. 记录渲染调用次数和图元数量
 * 3. 提供性能分析数据
 *
 * @param {WebGL2RenderingContext} gl - WebGL渲染上下文
 * @returns {Object} 信息统计器对象
 */
function WebGLInfo(gl) {
  /**
   * 内存使用统计
   *
   * 记录当前在GPU内存中的资源数量
   */
  const memory = {
    geometries: 0, // 几何体数量
    textures: 0, // 纹理数量
  };

  /**
   * 渲染统计信息
   *
   * 记录每帧的渲染调用和图元数量
   */
  const render = {
    frame: 0, // 当前帧数
    calls: 0, // 绘制调用次数（draw calls）
    triangles: 0, // 渲染的三角形数量
    points: 0, // 渲染的点数量
    lines: 0, // 渲染的线段数量
  };

  /**
   * 更新渲染统计信息
   *
   * 在每次WebGL绘制调用时调用，用于统计渲染的图元数量。
   * 根据不同的绘制模式计算实际的图元数量。
   *
   * @param {number} count - 顶点或索引数量
   * @param {number} mode - WebGL绘制模式（如gl.TRIANGLES, gl.LINES等）
   * @param {number} instanceCount - 实例化渲染的实例数量
   */
  function update(count, mode, instanceCount) {
    // 增加绘制调用计数
    render.calls++;

    // 根据绘制模式计算图元数量
    switch (mode) {
      case gl.TRIANGLES:
        // 三角形模式：每3个顶点组成一个三角形
        render.triangles += instanceCount * (count / 3);
        break;

      case gl.LINES:
        // 线段模式：每2个顶点组成一条线段
        render.lines += instanceCount * (count / 2);
        break;

      case gl.LINE_STRIP:
        // 线条模式：连续的线段，n个顶点组成(n-1)条线段
        render.lines += instanceCount * (count - 1);
        break;

      case gl.LINE_LOOP:
        // 闭合线条模式：n个顶点组成n条线段（最后一个顶点连回第一个）
        render.lines += instanceCount * count;
        break;

      case gl.POINTS:
        // 点模式：每个顶点渲染为一个点
        render.points += instanceCount * count;
        break;

      default:
        // 未知的绘制模式
        console.error("THREE.WebGLInfo: Unknown draw mode:", mode);
        break;
    }
  }

  /**
   * 重置渲染统计信息
   *
   * 通常在每帧开始时调用，清零所有渲染统计计数器。
   * 这样可以获得每帧的准确统计数据。
   */
  function reset() {
    render.calls = 0;
    render.triangles = 0;
    render.points = 0;
    render.lines = 0;
  }

  // 返回信息统计器的公共接口
  return {
    memory: memory, // 内存使用统计
    render: render, // 渲染统计信息
    programs: null, // 着色器程序统计（由外部设置）
    autoReset: true, // 是否自动重置统计信息
    reset: reset, // 重置统计信息的方法
    update: update, // 更新统计信息的方法
  };
}

/**
 * 导出WebGL信息统计器
 *
 * 这个统计器是WebGL渲染器的重要调试和性能分析工具，它提供：
 * 1. 实时的渲染性能数据
 * 2. 内存使用情况监控
 * 3. 绘制调用优化的依据
 * 4. 渲染复杂度的量化指标
 *
 * 使用示例：
 * - 监控每帧的draw call数量
 * - 统计渲染的三角形数量
 * - 跟踪GPU内存中的资源数量
 * - 分析渲染性能瓶颈
 */
export { WebGLInfo };
