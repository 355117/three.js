// 导入基础节点类
import Node from "../core/Node.js";

/**
 * 用于表示类数组节点数据结构上元素访问的基类。
 *
 * 该类封装了对数组类型节点中特定元素的访问操作，
 * 通过索引节点来指定要访问的元素位置。
 * 在着色器代码生成时，会转换为相应的数组索引访问语法。
 *
 * @augments Node
 */
class ArrayElementNode extends Node {
  // @TODO: 如果从TempNode扩展会破坏webgpu_compute

  /**
   * 获取节点类型标识符。
   *
   * @static
   * @return {string} 返回'ArrayElementNode'类型标识符。
   */
  static get type() {
    return "ArrayElementNode";
  }

  /**
   * 构造一个数组元素节点。
   *
   * @param {Node} node - 类数组节点，表示要访问的数组。
   * @param {Node} indexNode - 索引节点，定义元素访问的索引位置。
   */
  constructor(node, indexNode) {
    super();

    /**
     * 类数组节点，表示要访问的数组。
     *
     * 这个节点应该是一个可以通过索引访问元素的数据结构，
     * 如向量、矩阵或数组等。
     *
     * @type {Node}
     */
    this.node = node;

    /**
     * 索引节点，定义元素访问的索引位置。
     *
     * 该节点的值将用作数组访问的索引，
     * 可以是常量、变量或表达式。
     *
     * @type {Node}
     */
    this.indexNode = indexNode;

    /**
     * 类型测试标志，用于识别ArrayElementNode实例。
     *
     * 该标志可用于运行时类型检查，
     * 快速判断一个节点是否为ArrayElementNode类型。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isArrayElementNode = true;
  }

  /**
   * 获取节点的数据类型。
   *
   * 该方法被重写，因为节点类型是从类数组节点推断出来的。
   * 数组元素的类型通常与数组本身的元素类型相同。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 节点的数据类型。
   */
  getNodeType(builder) {
    return this.node.getElementType(builder);
  }

  /**
   * 生成着色器代码。
   *
   * 该方法将数组元素访问转换为着色器语言中的数组索引语法，
   * 格式为 `array[index]`。会处理索引类型的转换，
   * 确保索引是合适的整数类型。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 生成的着色器代码片段。
   */
  generate(builder) {
    // 获取索引节点的类型
    const indexType = this.indexNode.getNodeType(builder);

    // 构建数组节点的代码片段
    const nodeSnippet = this.node.build(builder);
    // 构建索引节点的代码片段，确保索引类型正确
    const indexSnippet = this.indexNode.build(builder, !builder.isVector(indexType) && builder.isInteger(indexType) ? indexType : "uint");

    // 返回数组索引访问的着色器代码
    return `${nodeSnippet}[ ${indexSnippet} ]`;
  }
}

// 导出ArrayElementNode类作为默认导出
export default ArrayElementNode;
