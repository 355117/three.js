// 导入统一节点基类
import UniformNode from "../core/UniformNode.js";
// 导入TSL基础函数
import { nodeObject } from "../tsl/TSLBase.js";

/**
 * 一种特殊类型的统一节点，将类数组数据表示为统一缓冲区。
 * 访问通常通过 `element()` 进行，该方法返回 {@link ArrayElementNode} 的实例。例如：
 *
 * ```js
 * const bufferNode = buffer( array, 'mat4', count );
 * const matrixNode = bufferNode.element( index ); // 从缓冲区访问矩阵
 * ```
 * 一般来说，建议使用更易管理的 {@link UniformArrayNode}，
 * 因为它处理更多输入类型并自动处理缓冲区填充。
 *
 * @augments UniformNode
 */
class BufferNode extends UniformNode {
  // 返回节点类型标识符
  static get type() {
    return "BufferNode";
  }

  /**
   * 构造一个新的缓冲区节点
   *
   * @param {Array<number>} value - 类数组缓冲区数据
   * @param {string} bufferType - 缓冲区的数据类型
   * @param {number} [bufferCount=0] - 缓冲区元素的数量
   */
  constructor(value, bufferType, bufferCount = 0) {
    // 调用父类构造函数
    super(value, bufferType);

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isBufferNode = true;

    /**
     * 缓冲区的数据类型
     *
     * @type {string}
     */
    this.bufferType = bufferType;

    /**
     * 缓冲区元素的数量
     *
     * @type {number}
     * @default 0
     */
    this.bufferCount = bufferCount;
  }

  /**
   * 获取缓冲区元素的数据类型
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 元素类型
   */
  getElementType(builder) {
    // 返回节点类型作为元素类型
    return this.getNodeType(builder);
  }

  /**
   * 重写默认实现，返回固定值 `'buffer'`
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 输入类型
   */
  getInputType(/*builder*/) {
    return "buffer";
  }
}

// 导出BufferNode类作为默认导出
export default BufferNode;

/**
 * 用于创建缓冲区节点的TSL函数
 *
 * @tsl
 * @function
 * @param {Array} value - 类数组缓冲区数据
 * @param {string} type - 缓冲区元素的数据类型
 * @param {number} count - 缓冲区元素的数量
 * @returns {BufferNode}
 */
export const buffer = (value, type, count) => nodeObject(new BufferNode(value, type, count));
