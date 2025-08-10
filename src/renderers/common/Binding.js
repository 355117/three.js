/**
 * Binding.js
 *
 * 绑定抽象基类 - 资源与着色器的连接
 *
 * 绑定表示资源（如纹理、采样器或uniform缓冲区）与着色器阶段中
 * 资源定义之间的连接。这个模块是所有具体绑定类型的抽象基类。
 *
 * 绑定是现代图形API中的核心概念，它定义了着色器如何访问GPU资源。
 * 每个绑定都有名称、可见性（在哪些着色器阶段可访问）等属性。
 */

/**
 * 绑定抽象基类
 *
 * 绑定表示资源（如纹理、采样器或uniform缓冲区）与着色器阶段中
 * 资源定义之间的连接。这个模块是所有具体绑定类型的抽象基类。
 *
 * 具体的绑定类型包括：
 * - 纹理绑定（TextureBinding）
 * - 采样器绑定（SamplerBinding）
 * - 缓冲区绑定（BufferBinding）
 * - 存储缓冲区绑定（StorageBufferBinding）
 * 等等。
 *
 * @abstract
 * @private
 */
class Binding {
  /**
   * 构造新的绑定
   *
   * 创建一个新的绑定实例，设置基本属性如名称和可见性。
   * 这是抽象基类的构造函数，通常由具体的绑定类型调用。
   *
   * @param {string} [name=''] - 绑定的名称，用于标识和调试
   */
  constructor(name = "") {
    /**
     * 绑定的名称
     *
     * 用于标识绑定的名称，通常对应着色器中的变量名。
     * 这个名称在调试和错误报告中很有用。
     *
     * @type {string}
     */
    this.name = name;

    /**
     * 着色器阶段可见性位掩码
     *
     * 定义绑定的资源在哪些着色器阶段中可访问的位掩码。
     * 可以是以下值的组合：
     * - VERTEX: 顶点着色器阶段
     * - FRAGMENT: 片段着色器阶段
     * - COMPUTE: 计算着色器阶段
     *
     * @type {number}
     */
    this.visibility = 0;
  }

  /**
   * 设置绑定资源在给定着色器阶段的可见性
   *
   * 使用位运算将指定的着色器阶段添加到可见性位掩码中。
   * 这允许资源在多个着色器阶段中被访问。
   *
   * @param {number} visibility - 着色器阶段标志（位掩码）
   */
  setVisibility(visibility) {
    // 使用位或运算添加可见性标志
    this.visibility |= visibility;
  }

  /**
   * 克隆绑定
   *
   * 创建当前绑定的副本，包含所有属性。这对于创建
   * 相似但略有不同的绑定很有用。
   *
   * @return {Binding} 克隆的绑定实例
   */
  clone() {
    // 使用Object.assign复制所有属性到新实例
    return Object.assign(new this.constructor(), this);
  }
}

// 导出绑定抽象基类
export default Binding;
