// 导入基础缓冲区属性类
import { BufferAttribute } from "./BufferAttribute.js";

/**
 * 实例化缓冲区属性类
 * 这是缓冲区属性的实例化版本，用于实例化渲染中的属性数据管理
 * An instanced version of a buffer attribute.
 *
 * @augments BufferAttribute
 */
class InstancedBufferAttribute extends BufferAttribute {
  /**
   * 构造一个新的实例化缓冲区属性
   * Constructs a new instanced buffer attribute.
   *
   * @param {TypedArray} array - 存储属性数据的类型化数组
   * @param {number} itemSize - 每个项目的大小（组件数量）
   * @param {boolean} [normalized=false] - 数据是否已标准化
   * @param {number} [meshPerAttribute=1] - 此缓冲区属性的值应重复的频率
   */
  constructor(array, itemSize, normalized, meshPerAttribute = 1) {
    // 调用父类构造函数，传递数组、项目大小和标准化参数
    super(array, itemSize, normalized);

    /**
     * 类型标识符，用于类型检测
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isInstancedBufferAttribute = true;

    /**
     * 定义此缓冲区属性的值应重复的频率
     * 值为1表示实例化属性的每个值用于单个实例
     * 值为2表示每个值用于两个连续实例（以此类推）
     * Defines how often a value of this buffer attribute should be repeated. A
     * value of one means that each value of the instanced attribute is used for
     * a single instance. A value of two means that each value is used for two
     * consecutive instances (and so on).
     *
     * @type {number}
     * @default 1
     */
    this.meshPerAttribute = meshPerAttribute;
  }

  /**
   * 复制另一个实例化缓冲区属性的属性到当前对象
   * @param {InstancedBufferAttribute} source - 要复制的源属性对象
   * @return {InstancedBufferAttribute} 返回当前对象的引用，支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 复制每属性网格数量
    this.meshPerAttribute = source.meshPerAttribute;

    // 返回当前对象引用，支持链式调用
    return this;
  }

  /**
   * 将缓冲区属性序列化为JSON格式
   * 用于保存或传输属性数据
   * @return {Object} 包含属性数据的JSON对象
   */
  toJSON() {
    // 调用父类的toJSON方法获取基础数据
    const data = super.toJSON();

    // 添加每属性网格数量到JSON数据中
    data.meshPerAttribute = this.meshPerAttribute;

    // 添加类型标识符到JSON数据中
    data.isInstancedBufferAttribute = true;

    // 返回完整的JSON数据对象
    return data;
  }
}

// 导出实例化缓冲区属性类
export { InstancedBufferAttribute };
