/**
 * Info.js
 *
 * 渲染信息统计 - 提供GPU内存和渲染过程的统计信息
 *
 * 这个渲染器模块提供关于GPU内存和渲染过程的一系列统计信息。
 * 对调试和监控非常有用，可以帮助开发者了解渲染性能和资源使用情况。
 */

/**
 * 渲染信息统计类
 *
 * 这个渲染器模块提供关于GPU内存和渲染过程的一系列统计信息。
 * 对调试和监控非常有用。
 *
 * 主要功能：
 * - 跟踪渲染调用次数和绘制调用
 * - 统计渲染的图元数量（三角形、点、线）
 * - 监控GPU内存使用（几何体、纹理）
 * - 计算着色器调用统计
 * - 帧级别的性能指标
 */
class Info {
  /**
   * 构造新的信息统计组件
   *
   * 创建渲染信息统计实例，初始化所有统计指标和配置选项。
   */
  constructor() {
    /**
     * 是否自动重置帧相关指标
     *
     * 帧相关指标是否应该自动重置。管理自己动画循环的应用程序
     * 应该将此属性设置为`false`，然后必须每帧手动调用
     * `renderer.info.reset()`。
     *
     * @type {boolean}
     * @default true
     */
    this.autoReset = true;

    /**
     * 当前帧ID
     *
     * 当前帧的ID。这个ID由`NodeFrame`管理，用于跟踪
     * 渲染帧的进度和同步。
     *
     * @type {number}
     * @readonly
     * @default 0
     */
    this.frame = 0;

    /**
     * 总渲染调用次数
     *
     * 自应用程序启动以来的渲染调用次数。这是一个累积值，
     * 用于长期性能监控。
     *
     * @type {number}
     * @readonly
     * @default 0
     */
    this.calls = 0;

    /**
     * 渲染相关指标
     *
     * 包含所有与渲染过程相关的统计信息，用于性能分析和调试。
     *
     * @type {Object}
     * @readonly
     * @property {number} calls - 自应用程序启动以来的渲染调用次数
     * @property {number} frameCalls - 当前帧的渲染调用次数
     * @property {number} drawCalls - 当前帧的绘制调用次数
     * @property {number} triangles - 当前帧渲染的三角形图元数量
     * @property {number} points - 当前帧渲染的点图元数量
     * @property {number} lines - 当前帧渲染的线图元数量
     * @property {number} timestamp - 使用`renderer.renderAsync()`时的帧时间戳
     */
    this.render = {
      calls: 0, // 总渲染调用次数
      frameCalls: 0, // 当前帧渲染调用次数
      drawCalls: 0, // 当前帧绘制调用次数
      triangles: 0, // 当前帧三角形数量
      points: 0, // 当前帧点数量
      lines: 0, // 当前帧线段数量
      timestamp: 0, // 异步渲染时间戳
    };

    /**
     * 计算相关指标
     *
     * 包含所有与计算着色器相关的统计信息，用于GPU计算性能监控。
     *
     * @type {Object}
     * @readonly
     * @property {number} calls - 自应用程序启动以来的计算调用次数
     * @property {number} frameCalls - 当前帧的计算调用次数
     * @property {number} timestamp - 使用`renderer.computeAsync()`时的帧时间戳
     */
    this.compute = {
      calls: 0, // 总计算调用次数
      frameCalls: 0, // 当前帧计算调用次数
      timestamp: 0, // 异步计算时间戳
    };

    /**
     * 内存相关指标
     *
     * 包含GPU内存使用情况的统计信息，用于内存管理和优化。
     *
     * @type {Object}
     * @readonly
     * @property {number} geometries - 活跃几何体的数量
     * @property {number} textures - 活跃纹理的数量
     */
    this.memory = {
      geometries: 0, // 几何体数量
      textures: 0, // 纹理数量
    };
  }

  /**
   * This method should be executed per draw call and updates the corresponding metrics.
   *
   * @param {Object3D} object - The 3D object that is going to be rendered.
   * @param {number} count - The vertex or index count.
   * @param {number} instanceCount - The instance count.
   */
  update(object, count, instanceCount) {
    this.render.drawCalls++;

    if (object.isMesh || object.isSprite) {
      this.render.triangles += instanceCount * (count / 3);
    } else if (object.isPoints) {
      this.render.points += instanceCount * count;
    } else if (object.isLineSegments) {
      this.render.lines += instanceCount * (count / 2);
    } else if (object.isLine) {
      this.render.lines += instanceCount * (count - 1);
    } else {
      console.error("THREE.WebGPUInfo: Unknown object type.");
    }
  }

  /**
   * Resets frame related metrics.
   */
  reset() {
    this.render.drawCalls = 0;
    this.render.frameCalls = 0;
    this.compute.frameCalls = 0;

    this.render.triangles = 0;
    this.render.points = 0;
    this.render.lines = 0;
  }

  /**
   * Performs a complete reset of the object.
   */
  dispose() {
    this.reset();

    this.calls = 0;

    this.render.calls = 0;
    this.compute.calls = 0;

    this.render.timestamp = 0;
    this.compute.timestamp = 0;
    this.memory.geometries = 0;
    this.memory.textures = 0;
  }
}

export default Info;
