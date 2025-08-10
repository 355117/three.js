/**
 * Pipeline.js
 *
 * 管线抽象基类 - 表示渲染管线的抽象基类
 *
 * 这是表示管线的抽象类。管线是现代图形API中的核心概念，
 * 封装了GPU渲染或计算的完整状态配置。
 */

/**
 * 管线抽象基类
 *
 * 表示管线的抽象类。管线封装了GPU渲染或计算的状态配置，
 * 是现代图形API（如WebGPU、Vulkan、DirectX 12）的核心概念。
 *
 * 管线的主要作用：
 * - 封装着色器程序和状态
 * - 提供高效的状态切换
 * - 支持管线缓存和重用
 * - 减少GPU状态变化开销
 *
 * 具体的管线类型包括：
 * - RenderPipeline（渲染管线）
 * - ComputePipeline（计算管线）
 *
 * @private
 * @abstract
 */
class Pipeline {
  /**
   * 构造新的管线
   *
   * 创建一个新的管线实例，设置缓存键。这是抽象基类的
   * 构造函数，通常由具体的管线类型调用。
   *
   * @param {string} cacheKey - 管线的缓存键，用于标识和缓存管线配置
   */
  constructor(cacheKey) {
    /**
     * 管线的缓存键
     *
     * 用于标识管线配置的字符串。相同配置的管线可以共享
     * GPU资源，提高性能和减少内存使用。
     *
     * @type {string}
     */
    this.cacheKey = cacheKey;

    /**
     * 管线当前的使用次数
     *
     * 跟踪管线当前被使用的频率。用于缓存策略和性能优化，
     * 频繁使用的管线可能会被优先保留在缓存中。
     *
     * @type {number}
     * @default 0
     */
    this.usedTimes = 0;
  }
}

// 导出管线抽象基类
export default Pipeline;
