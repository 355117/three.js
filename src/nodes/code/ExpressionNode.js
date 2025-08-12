// 导入节点基类
import Node from "../core/Node.js";
// 导入节点代理函数
import { nodeProxy } from "../tsl/TSLCore.js";

/**
 * 表达式节点 - 此类可用于在着色器代码中实现基本表达式
 * 基本示例包括 `return`、`continue` 或 `discard` 语句
 *
 * @augments Node
 */
class ExpressionNode extends Node {
  // 返回节点类型标识符
  static get type() {
    return "ExpressionNode";
  }

  /**
   * 构造一个新的表达式节点
   *
   * @param {string} [snippet=''] - 原生代码片段
   * @param {string} [nodeType='void'] - 节点类型
   */
  constructor(snippet = "", nodeType = "void") {
    // 调用父类构造函数
    super(nodeType);

    /**
     * 原生代码片段
     *
     * @type {string}
     * @default ''
     */
    this.snippet = snippet;
  }

  /**
   * 生成表达式节点的代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {string} output - 当前输出
   * @return {string|undefined} 生成的代码片段
   */
  generate(builder, output) {
    // 获取节点类型和代码片段
    const type = this.getNodeType(builder);
    const snippet = this.snippet;

    if (type === "void") {
      // 如果是void类型，添加到流程代码中
      builder.addLineFlowCode(snippet, this);
    } else {
      // 否则格式化并返回代码片段
      return builder.format(snippet, type, output);
    }
  }
}

// 导出ExpressionNode类作为默认导出
export default ExpressionNode;

/**
 * TSL函数 - 用于创建表达式节点
 *
 * @tsl
 * @function
 * @param {string} [snippet] - 原生代码片段
 * @param {?string} [nodeType='void'] - 节点类型
 * @returns {ExpressionNode}
 */
export const expression = /*@__PURE__*/ nodeProxy(ExpressionNode).setParameterLength(1, 2);
