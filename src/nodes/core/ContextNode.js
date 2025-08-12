// 导入基础节点类
import Node from "./Node.js";
// 导入TSL核心功能：方法链式调用和节点代理
import { addMethodChaining, nodeProxy } from "../tsl/TSLCore.js";

/**
 * 上下文节点类 - 用作另一个节点的上下文管理组件
 * {@link NodeBuilder} 在特定上下文中执行节点构建过程，
 * 此节点允许修改上下文。典型用例是重写 `getUV()` 方法，例如：
 *
 * ```js
 * node.context( { getUV: () => customCoord } );
 * ```
 * @augments Node
 */
class ContextNode extends Node {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "ContextNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的上下文节点
   *
   * @param {Node} node - 需要修改上下文的节点
   * @param {Object} [value={}] - 修改后的上下文数据
   */
  constructor(node, value = {}) {
    // 调用父类构造函数
    super();

    /**
     * 类型测试标志 - 用于识别此节点为上下文节点
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isContextNode = true;

    /**
     * 需要修改上下文的目标节点
     *
     * @type {Node}
     */
    this.node = node;

    /**
     * 修改后的上下文数据对象
     *
     * @type {Object}
     * @default {}
     */
    this.value = value;
  }

  /**
   * 获取作用域 - 重写此方法以确保返回目标节点的作用域引用
   *
   * @return {Node} 目标节点的作用域引用
   */
  getScope() {
    // 返回目标节点的作用域
    return this.node.getScope();
  }

  /**
   * 获取节点类型 - 重写此方法以确保返回目标节点的类型
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 节点类型
   */
  getNodeType(builder) {
    // 返回目标节点的类型
    return this.node.getNodeType(builder);
  }

  /**
   * 分析阶段 - 在修改后的上下文中分析目标节点
   *
   * @param {NodeBuilder} builder - 节点构建器
   */
  analyze(builder) {
    // 保存当前上下文
    const previousContext = builder.getContext();

    // 设置新的上下文（合并当前上下文和修改值）
    builder.setContext({ ...builder.context, ...this.value });

    // 在新上下文中构建目标节点
    this.node.build(builder);

    // 恢复之前的上下文
    builder.setContext(previousContext);
  }

  /**
   * 设置阶段 - 在修改后的上下文中设置目标节点
   *
   * @param {NodeBuilder} builder - 节点构建器
   */
  setup(builder) {
    // 保存当前上下文
    const previousContext = builder.getContext();

    // 设置新的上下文（合并当前上下文和修改值）
    builder.setContext({ ...builder.context, ...this.value });

    // 在新上下文中构建目标节点
    this.node.build(builder);

    // 恢复之前的上下文
    builder.setContext(previousContext);
  }

  /**
   * 生成阶段 - 在修改后的上下文中生成目标节点的代码片段
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @param {string} output - 输出类型
   * @return {string} 生成的代码片段
   */
  generate(builder, output) {
    // 保存当前上下文
    const previousContext = builder.getContext();

    // 设置新的上下文（合并当前上下文和修改值）
    builder.setContext({ ...builder.context, ...this.value });

    // 在新上下文中构建目标节点并获取代码片段
    const snippet = this.node.build(builder, output);

    // 恢复之前的上下文
    builder.setContext(previousContext);

    // 返回生成的代码片段
    return snippet;
  }
}

// 导出上下文节点类作为默认导出
export default ContextNode;

/**
 * TSL函数：创建上下文节点
 *
 * @tsl
 * @function
 * @param {Node} node - 需要修改上下文的节点
 * @param {Object} [value={}] - 修改后的上下文数据
 * @returns {ContextNode} 上下文节点实例
 */
export const context = /*@__PURE__*/ nodeProxy(ContextNode).setParameterLength(1, 2);

/**
 * TSL函数：为给定节点定义统一流程上下文值
 * 确保节点的所有依赖项都在统一的控制流路径中执行
 *
 * @tsl
 * @function
 * @param {Node} node - 需要在统一控制流路径中执行依赖项的节点
 * @returns {ContextNode} 配置了统一流程的上下文节点
 */
export const uniformFlow = (node) => context(node, { uniformFlow: true });

/**
 * TSL函数：为给定节点的上下文值定义名称
 *
 * @tsl
 * @function
 * @param {Node} node - 需要修改上下文的节点
 * @param {string} name - 要设置的名称
 * @returns {ContextNode} 配置了名称的上下文节点
 */
export const setName = (node, name) => context(node, { nodeName: name });

/**
 * TSL函数：为给定节点定义标签上下文值（已弃用）
 *
 * @tsl
 * @function
 * @deprecated 此函数已弃用，请使用 setName() 替代
 * @param {Node} node - 需要修改上下文的节点
 * @param {string} name - 要设置的名称/标签
 * @returns {ContextNode} 配置了标签的上下文节点
 */
export function label(node, name) {
  // 输出弃用警告信息
  console.warn('THREE.TSL: "label()" has been deprecated. Use "setName()" instead.'); // @deprecated r179

  // 调用新的setName函数
  return setName(node, name);
}

// 为各个函数添加方法链式调用支持
addMethodChaining("context", context); // 添加context方法链
addMethodChaining("label", label); // 添加label方法链（已弃用）
addMethodChaining("uniformFlow", uniformFlow); // 添加uniformFlow方法链
addMethodChaining("setName", setName); // 添加setName方法链
