// 导入节点基类
import Node from "./Node.js";
// 导入方法链和节点代理工具函数
import { addMethodChaining, nodeProxy } from "../tsl/TSLCore.js";

/**
 * The class generates the code of a given node but returns another node in the output.
 * This can be used to call a method or node that does not return a value, i.e.
 * type `void` on an input where returning a value is required. Example:
 * 此类生成给定节点的代码，但在输出中返回另一个节点。
 * 这可以用于调用不返回值的方法或节点，即在需要返回值的输入上使用`void`类型。示例：
 *
 * ```js
 * material.colorNode = myColor.bypass( runVoidFn() )
 *```
 *
 * @augments Node
 */
class BypassNode extends Node {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "BypassNode";
  }

  /**
   * Constructs a new bypass node.
   * 构造一个新的旁路节点。
   *
   * @param {Node} outputNode - The output node. 输出节点。
   * @param {Node} callNode - The call node. 调用节点。
   */
  constructor(outputNode, callNode) {
    // 调用父类构造函数
    super();

    /**
     * This flag can be used for type testing.
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isBypassNode = true;

    /**
     * The output node.
     * 输出节点。
     *
     * @type {Node}
     */
    this.outputNode = outputNode;

    /**
     * The call node.
     * 调用节点。
     *
     * @type {Node}
     */
    this.callNode = callNode;
  }

  // 获取节点类型
  getNodeType(builder) {
    // 返回输出节点的类型
    return this.outputNode.getNodeType(builder);
  }

  // 生成着色器代码
  generate(builder) {
    // 构建调用节点的代码，类型为void
    const snippet = this.callNode.build(builder, "void");

    // 如果代码片段不为空，添加到流程代码中
    if (snippet !== "") {
      builder.addLineFlowCode(snippet, this);
    }

    // 返回输出节点构建的代码
    return this.outputNode.build(builder);
  }
}

// 导出BypassNode类作为默认导出
export default BypassNode;

/**
 * TSL function for creating a bypass node.
 * 用于创建旁路节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {Node} outputNode - The output node. 输出节点。
 * @param {Node} callNode - The call node. 调用节点。
 * @returns {BypassNode}
 */
// 创建旁路节点的代理函数，设置参数长度为2
export const bypass = /*@__PURE__*/ nodeProxy(BypassNode).setParameterLength(2);

// 添加bypass方法链
addMethodChaining("bypass", bypass);
