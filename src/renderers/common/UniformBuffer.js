// 导入缓冲区基类
import Buffer from "./Buffer.js";

/**
 * 统一缓冲区类
 *
 * 表示统一缓冲区绑定类型。统一缓冲区是GPU内存中的一块区域，
 * 用于存储着色器程序中的统一变量数据。与单独设置每个统一变量相比，
 * 统一缓冲区提供了更高效的数据传输方式，特别是当有大量统一变量时。
 *
 * 统一缓冲区遵循STD140内存布局规范，确保数据在GPU内存中的正确对齐。
 *
 * @private
 * @augments Buffer
 */
class UniformBuffer extends Buffer {
  /**
   * 构造一个新的统一缓冲区
   *
   * @param {string} name - 缓冲区的名称，用于在着色器中标识
   * @param {TypedArray} [buffer=null] - 缓冲区数据，通常是Float32Array或其他类型化数组
   */
  constructor(name, buffer = null) {
    // 调用父类构造函数
    super(name, buffer);

    /**
     * 用于类型测试的标志
     * 标识此对象为统一缓冲区类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isUniformBuffer = true;
  }
}

// 导出统一缓冲区类
export default UniformBuffer;
