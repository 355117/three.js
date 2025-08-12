// 导入节点基类
import Node from "../core/Node.js";
// 导入TSL基础函数
import { nodeProxy } from "../tsl/TSLBase.js";

/**
 * 该节点允许为内置着色器变量设置值。
 * 这对于硬件加速顶点裁剪等功能是必需的。
 *
 * @augments Node
 */
class BuiltinNode extends Node {
  /**
   * 构造一个新的内置节点
   *
   * @param {string} name - 内置着色器变量的名称
   */
  constructor(name) {
    // 调用父类构造函数，默认类型为float
    super("float");

    /**
     * 内置着色器变量的名称
     *
     * @type {string}
     */
    this.name = name;

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isBuiltinNode = true;
  }

  /**
   * 生成内置节点的代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 生成的代码片段
   */
  generate(/* builder */) {
    // 直接返回内置变量名称
    return this.name;
  }
}

// 导出BuiltinNode类作为默认导出
export default BuiltinNode;

/**
 * 用于创建内置节点的TSL函数
 *
 * @tsl
 * @function
 * @param {string} name - 内置着色器变量的名称
 * @returns {BuiltinNode}
 */
export const builtin = nodeProxy(BuiltinNode).setParameterLength(1);
