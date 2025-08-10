/**
 * BindGroup.js
 *
 * 绑定组 - 资源绑定的集合
 *
 * 绑定组表示绑定的集合，因此也是资源的集合。绑定组被分配给
 * 管线以为其提供所需的资源（如uniform缓冲区或纹理）。
 *
 * 在现代图形API中，绑定组是组织和管理着色器资源的基本单位，
 * 它将相关的资源（纹理、缓冲区、采样器等）组织在一起，
 * 便于批量绑定和管理。
 */

// 全局ID计数器，用于生成唯一的绑定组ID
let _id = 0;

/**
 * 绑定组类
 *
 * 绑定组表示绑定的集合，因此也是资源的集合。绑定组被分配给
 * 管线以为其提供所需的资源（如uniform缓冲区或纹理）。
 *
 * 绑定组的设计遵循现代图形API（如WebGPU、Vulkan、DirectX 12）
 * 的资源绑定模型，提供高效的资源管理和绑定机制。
 *
 * @private
 */
class BindGroup {
  /**
   * 构造新的绑定组
   *
   * 创建一个新的绑定组，包含指定的绑定集合和相关配置。
   * 每个绑定组都有唯一的ID和索引，用于在渲染管线中标识和使用。
   *
   * @param {string} [name=''] - 绑定组的名称，用于调试和标识
   * @param {Array<import('./Binding.js').default>} [bindings=[]] - 绑定数组，包含实际的资源绑定
   * @param {number} [index=0] - 组索引，在着色器中对应绑定组的索引
   * @param {Array<import('./Binding.js').default>} [bindingsReference=[]] - 引用绑定数组，用于绑定管理
   */
  constructor(name = "", bindings = [], index = 0, bindingsReference = []) {
    /**
     * 绑定组的名称
     *
     * 用于调试和标识的绑定组名称。在开发过程中有助于
     * 识别不同的绑定组和调试渲染问题。
     *
     * @type {string}
     */
    this.name = name;

    /**
     * 绑定数组
     *
     * 包含此绑定组中所有绑定的数组。每个绑定代表一个
     * 资源（如纹理、缓冲区、采样器）与着色器中对应位置的连接。
     *
     * @type {Array<import('./Binding.js').default>}
     */
    this.bindings = bindings;

    /**
     * 组索引
     *
     * 绑定组在着色器中的索引。现代图形API支持多个绑定组，
     * 每个组有不同的索引，对应着色器中的不同绑定组声明。
     *
     * @type {number}
     */
    this.index = index;

    /**
     * 引用绑定数组
     *
     * 用于绑定管理的引用绑定数组。这些绑定可能用于
     * 缓存、比较或其他管理目的。
     *
     * @type {Array<import('./Binding.js').default>}
     */
    this.bindingsReference = bindingsReference;

    /**
     * 组的唯一ID
     *
     * 每个绑定组都有一个全局唯一的数字ID，用于在渲染系统中
     * 快速识别和区分不同的绑定组实例。
     *
     * @type {number}
     */
    this.id = _id++;
  }
}

// 导出绑定组类
export default BindGroup;
