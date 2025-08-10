// 导入缓冲区基类
import Buffer from "./Buffer.js";

/**
 * 存储缓冲区类
 *
 * 表示存储缓冲区绑定类型。存储缓冲区是GPU着色器中可读写的缓冲区，
 * 与只读的统一缓冲区不同，存储缓冲区允许着色器修改其内容。
 * 常用于计算着色器中的数据处理和结果存储。
 *
 * @private
 * @augments Buffer
 */
class StorageBuffer extends Buffer {
  /**
   * 构造一个新的存储缓冲区
   *
   * 注意：注释中提到"uniform buffer"可能是复制粘贴错误，
   * 实际上这是存储缓冲区的构造函数
   *
   * @param {string} name - 缓冲区的名称，用于在着色器中标识
   * @param {BufferAttribute} attribute - 缓冲区属性，包含实际的数据数组
   */
  constructor(name, attribute) {
    // 调用父类构造函数，传入名称和数据数组
    super(name, attribute ? attribute.array : null);

    /**
     * 缓冲区属性对象
     * 包含缓冲区的数据数组和相关元数据
     *
     * @type {BufferAttribute}
     */
    this.attribute = attribute;

    /**
     * 用于类型测试的标志
     * 标识此对象为存储缓冲区类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isStorageBuffer = true;
  }
}

// 导出存储缓冲区类
export default StorageBuffer;
