import { nodeObject } from "../tsl/TSLBase.js"; // 导入nodeObject函数
import PropertyNode from "./PropertyNode.js"; // 导入PropertyNode基类

/**
 * {@link PropertyNode} 的特殊版本，用于参数。
 *
 * @augments PropertyNode
 */
class ParameterNode extends PropertyNode {
  // 定义ParameterNode类，继承自PropertyNode

  static get type() {
    // 静态getter方法，返回节点类型

    return "ParameterNode"; // 返回节点类型字符串
  }

  /**
   * 构造一个新的参数节点。
   *
   * @param {string} nodeType - 节点的类型。
   * @param {?string} [name=null] - 着色器中参数的名称。
   */
  constructor(nodeType, name = null) {
    // 构造函数，接受节点类型和名称参数

    super(nodeType, name); // 调用父类构造函数

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isParameterNode = true; // 标识这是一个参数节点对象
  }

  getHash() {
    // 获取哈希值的方法

    return this.uuid; // 返回节点的UUID作为哈希值
  }

  generate() {
    // 生成着色器代码的方法

    return this.name; // 返回参数名称
  }
}

export default ParameterNode; // 导出ParameterNode类作为默认导出

/**
 * 用于创建参数节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {string} type - 节点的类型。
 * @param {?string} name - 着色器中参数的名称。
 * @returns {ParameterNode}
 */
export const parameter = (type, name) => nodeObject(new ParameterNode(type, name)); // 导出parameter函数，用于创建参数节点
