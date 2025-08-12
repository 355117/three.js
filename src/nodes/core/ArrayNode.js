// 导入临时节点基类
import TempNode from "./TempNode.js";
// 导入方法链和节点对象工具函数
import { addMethodChaining, nodeObject } from "../tsl/TSLCore.js";

/**
 * ArrayNode represents a collection of nodes, typically created using the {@link array} function.
 * ArrayNode 表示节点的集合，通常使用 {@link array} 函数创建。
 * ```js
 * const colors = array( [
 * 	vec3( 1, 0, 0 ),
 * 	vec3( 0, 1, 0 ),
 * 	vec3( 0, 0, 1 )
 * ] );
 *
 * const redColor = tintColors.element( 0 );
 *
 * @augments TempNode
 */
class ArrayNode extends TempNode {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "ArrayNode";
  }

  /**
   * Constructs a new array node.
   * 构造一个新的数组节点。
   *
   * @param {?string} nodeType - The data type of the elements. 元素的数据类型。
   * @param {number} count - Size of the array. 数组的大小。
   * @param {?Array<Node>} [values=null] - Array default values. 数组的默认值。
   */
  constructor(nodeType, count, values = null) {
    // 调用父类构造函数
    super(nodeType);

    /**
     * Array size.
     * 数组大小。
     *
     * @type {number}
     */
    this.count = count;

    /**
     * Array default values.
     * 数组默认值。
     *
     * @type {?Array<Node>}
     */
    this.values = values;

    /**
     * This flag can be used for type testing.
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isArrayNode = true;
  }

  /**
   * Returns the number of elements in the node array.
   * 返回节点数组中元素的数量。
   *
   * @param {NodeBuilder} builder - The current node builder. 当前节点构建器。
   * @return {number} The number of elements in the node array. 节点数组中元素的数量。
   */
  getArrayCount(/*builder*/) {
    // 返回数组的元素数量
    return this.count;
  }

  /**
   * Returns the node's type.
   * 返回节点的类型。
   *
   * @param {NodeBuilder} builder - The current node builder. 当前节点构建器。
   * @return {string} The type of the node. 节点的类型。
   */
  getNodeType(builder) {
    // 如果节点类型为空，则从第一个值获取类型
    if (this.nodeType === null) {
      this.nodeType = this.values[0].getNodeType(builder);
    }

    // 返回节点类型
    return this.nodeType;
  }

  /**
   * Returns the node's type.
   * 返回节点的类型。
   *
   * @param {NodeBuilder} builder - The current node builder. 当前节点构建器。
   * @return {string} The type of the node. 节点的类型。
   */
  getElementType(builder) {
    // 返回节点类型（与getNodeType相同）
    return this.getNodeType(builder);
  }

  /**
   * This method builds the output node and returns the resulting array as a shader string.
   * 此方法构建输出节点并将结果数组作为着色器字符串返回。
   *
   * @param {NodeBuilder} builder - The current node builder. 当前节点构建器。
   * @return {string} The generated shader string. 生成的着色器字符串。
   */
  generate(builder) {
    // 获取节点类型
    const type = this.getNodeType(builder);

    // 使用构建器生成数组代码
    return builder.generateArray(type, this.count, this.values);
  }
}

// 导出ArrayNode类作为默认导出
export default ArrayNode;

/**
 * TSL function for creating an array node.
 * 用于创建数组节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {string|Array<Node>} nodeTypeOrValues - A string representing the element type (e.g., 'vec3')
 * or an array containing the default values (e.g., [ vec3() ]). 表示元素类型的字符串（例如'vec3'）或包含默认值的数组（例如[ vec3() ]）。
 * @param {?number} [count] - Size of the array. 数组的大小。
 * @returns {ArrayNode}
 */
export const array = (...params) => {
  // 声明节点变量
  let node;

  // 如果只有一个参数，则参数是值数组
  if (params.length === 1) {
    const values = params[0];

    // 创建数组节点，类型为null，长度为值数组的长度
    node = new ArrayNode(null, values.length, values);
  } else {
    // 如果有两个参数，第一个是节点类型，第二个是数量
    const nodeType = params[0];
    const count = params[1];

    // 创建数组节点
    node = new ArrayNode(nodeType, count);
  }

  // 返回包装后的节点对象
  return nodeObject(node);
};

// 添加toArray方法链，将单个节点转换为指定数量的数组
addMethodChaining("toArray", (node, count) => array(Array(count).fill(node)));
