/**
 * Buffer.js
 *
 * 缓冲区绑定抽象基类 - 表示缓冲区绑定类型
 *
 * 这个模块定义了缓冲区绑定的抽象基类，用于表示各种类型的
 * GPU缓冲区绑定，如uniform缓冲区、存储缓冲区等。
 */

// 导入依赖模块
import Binding from "./Binding.js"; // 绑定抽象基类
import { getFloatLength } from "./BufferUtils.js"; // 缓冲区工具函数

/**
 * 缓冲区绑定抽象基类
 *
 * 表示缓冲区绑定类型。缓冲区绑定是连接GPU缓冲区资源与
 * 着色器程序的桥梁，用于传递uniform数据、存储数据等。
 *
 * 具体的缓冲区绑定类型包括：
 * - UniformBuffer（uniform缓冲区）
 * - StorageBuffer（存储缓冲区）
 * - IndirectBuffer（间接绘制缓冲区）
 * 等等。
 *
 * @private
 * @abstract
 * @augments Binding
 */
class Buffer extends Binding {
  /**
   * 构造新的缓冲区绑定
   *
   * 创建一个新的缓冲区绑定实例，设置缓冲区名称和数据。
   * 这是抽象基类的构造函数，通常由具体的缓冲区类型调用。
   *
   * @param {string} name - 缓冲区的名称，用于标识和调试
   * @param {TypedArray} [buffer=null] - 缓冲区数据，通常是类型化数组
   */
  constructor(name, buffer = null) {
    // 调用父类构造函数
    super(name);

    /**
     * 缓冲区类型标识
     *
     * 这个标志可用于类型测试，帮助识别这是一个缓冲区绑定。
     * 在运行时可以通过检查这个属性来确定绑定类型。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isBuffer = true;

    /**
     * 每个元素的字节数
     *
     * 定义缓冲区中每个元素占用的字节数。默认使用Float32Array
     * 的字节大小（4字节），这是GPU中最常用的数据类型。
     *
     * @type {number}
     */
    this.bytesPerElement = Float32Array.BYTES_PER_ELEMENT;

    /**
     * 内部缓冲区引用
     *
     * 对实际缓冲区数据的引用，通常是类型化数组（如Float32Array）。
     * 这个数据将被上传到GPU供着色器使用。
     *
     * @private
     * @type {TypedArray}
     */
    this._buffer = buffer;
  }

  /**
   * 获取缓冲区的字节长度
   *
   * 返回缓冲区的字节长度，经过STD140布局对齐处理。
   * STD140是GPU uniform缓冲区的标准内存布局规范。
   *
   * @type {number}
   * @readonly
   */
  get byteLength() {
    // 使用工具函数获取对齐后的长度
    return getFloatLength(this._buffer.byteLength);
  }

  /**
   * 获取内部缓冲区引用
   *
   * 返回对实际缓冲区数据的引用，供外部访问缓冲区内容。
   *
   * @type {Float32Array}
   * @readonly
   */
  get buffer() {
    return this._buffer;
  }

  /**
   * 更新绑定
   *
   * 检查缓冲区是否需要更新并返回更新状态。基类实现总是
   * 返回true，具体的子类应该重写这个方法来实现实际的
   * 更新逻辑。
   *
   * @return {boolean} 缓冲区是否已更新并且必须上传到GPU
   */
  update() {
    // 基类实现总是返回true，子类应该重写此方法
    return true;
  }
}

// 导出缓冲区绑定抽象基类
export default Buffer;
