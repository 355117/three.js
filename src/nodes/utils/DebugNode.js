// 导入临时节点基类
import TempNode from "../core/TempNode.js";
// 导入TSL核心功能：方法链添加和节点对象包装
import { addMethodChaining, nodeObject } from "../tsl/TSLCore.js";

/**
 * 调试节点类，用于在着色器编译过程中输出调试信息。
 *
 * 该节点可以包装任何其他节点，并在着色器代码生成时
 * 输出详细的调试信息，包括生成的代码片段和构建流程。
 * 这对于理解和调试复杂的着色器节点树非常有用。
 *
 * @augments TempNode
 */
class DebugNode extends TempNode {
  /**
   * 获取节点类型标识符。
   *
   * @static
   * @return {string} 返回'DebugNode'类型标识符。
   */
  static get type() {
    return "DebugNode";
  }

  /**
   * 构造一个调试节点。
   *
   * @param {Node} node - 要调试的节点。
   * @param {?Function} callback - 可选的回调函数，用于处理调试输出。如果为null，则使用console.log输出。
   */
  constructor(node, callback = null) {
    super();

    /**
     * 要调试的节点。
     *
     * @type {Node}
     */
    this.node = node;

    /**
     * 调试输出的回调函数。
     *
     * 如果提供了回调函数，调试信息将传递给该函数处理；
     * 否则将使用console.log直接输出到控制台。
     *
     * @type {?Function}
     */
    this.callback = callback;
  }

  /**
   * 获取节点的数据类型。
   *
   * 调试节点的类型与被包装节点的类型相同。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 节点的数据类型。
   */
  getNodeType(builder) {
    return this.node.getNodeType(builder);
  }

  /**
   * 设置节点。
   *
   * 在设置阶段构建被包装的节点。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 构建的节点代码。
   */
  setup(builder) {
    return this.node.build(builder);
  }

  /**
   * 分析节点。
   *
   * 在分析阶段构建被包装的节点。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 构建的节点代码。
   */
  analyze(builder) {
    return this.node.build(builder);
  }

  /**
   * 生成着色器代码并输出调试信息。
   *
   * 该方法不仅生成被包装节点的着色器代码，
   * 还会创建详细的调试输出，包括：
   * - 着色器阶段信息
   * - 当前的代码流
   * - 生成的代码片段
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 生成的着色器代码片段。
   */
  generate(builder) {
    const callback = this.callback;
    const snippet = this.node.build(builder);

    // 创建调试信息的标题，包含着色器阶段信息
    const title = "--- TSL debug - " + builder.shaderStage + " shader ---";
    const border = "-".repeat(title.length);

    // 构建完整的调试输出
    let code = "";
    code += "// #" + title + "#\n";
    // 添加当前代码流，移除制表符缩进以便阅读
    code += builder.flow.code.replace(/^\t/gm, "") + "\n";
    // 添加当前节点生成的代码片段
    code += "/* ... */ " + snippet + " /* ... */\n";
    code += "// #" + border + "#\n";

    // 根据是否有回调函数决定输出方式
    if (callback !== null) {
      // 使用自定义回调函数处理调试输出
      callback(builder, code);
    } else {
      // 默认输出到控制台
      console.log(code);
    }

    // 返回原始的代码片段
    return snippet;
  }
}

// 导出DebugNode类作为默认导出
export default DebugNode;

/**
 * TSL函数，用于创建调试节点。
 *
 * 该函数提供了一个便捷的方式来包装任何节点并添加调试功能。
 * 调试节点会在着色器编译过程中输出详细的调试信息，
 * 帮助开发者理解节点的构建过程和生成的代码。
 *
 * @tsl
 * @function
 * @param {Node} node - 要调试的节点。
 * @param {?Function} [callback=null] - 可选的回调函数，用于处理调试输出。
 * @returns {DebugNode} 包装后的调试节点。
 */
export const debug = (node, callback = null) => nodeObject(new DebugNode(nodeObject(node), callback)).toStack();

// 将debug函数添加到方法链中，使其可以作为节点的方法调用
addMethodChaining("debug", debug);
