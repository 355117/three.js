import Node from "./Node.js"; // 导入Node基类
import { select } from "../math/ConditionalNode.js"; // 导入条件选择函数
import { ShaderNode, nodeProxy, getCurrentStack, setCurrentStack, nodeObject } from "../tsl/TSLBase.js"; // 导入TSL基础函数

/**
 * Stack是需要生成基于堆栈的代码而不是连续流的节点的辅助工具。
 * 它们通常在像 `If`、`Else` 这样的情况下需要。
 *
 * @augments Node
 */
class StackNode extends Node {
  // 定义StackNode类，继承自Node

  static get type() {
    // 静态getter方法，返回节点类型

    return "StackNode"; // 返回节点类型字符串
  }

  /**
   * 构造一个新的堆栈节点。
   *
   * @param {?StackNode} [parent=null] - 父堆栈节点。
   */
  constructor(parent = null) {
    // 构造函数，接受可选的父节点参数

    super(); // 调用父类构造函数

    /**
     * 节点列表。
     *
     * @type {Array<Node>}
     */
    this.nodes = []; // 初始化节点数组

    /**
     * 输出节点。
     *
     * @type {?Node}
     * @default null
     */
    this.outputNode = null; // 初始化输出节点为null

    /**
     * 父堆栈节点。
     *
     * @type {?StackNode}
     * @default null
     */
    this.parent = parent; // 存储父节点引用

    /**
     * 当前条件节点。
     *
     * @private
     * @type {ConditionalNode}
     * @default null
     */
    this._currentCond = null; // 初始化当前条件节点为null

    /**
     * 表达式节点。仅
     * 与Switch/Case相关。
     *
     * @private
     * @type {Node}
     * @default null
     */
    this._expressionNode = null; // 初始化表达式节点为null

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isStackNode = true; // 标识这是一个堆栈节点对象
  }

  getNodeType(builder) {
    // 获取节点类型的方法

    return this.hasOutput ? this.outputNode.getNodeType(builder) : "void"; // 如果有输出则返回输出节点类型，否则返回void
  }

  getMemberType(builder, name) {
    // 获取成员类型的方法

    return this.hasOutput ? this.outputNode.getMemberType(builder, name) : "void"; // 如果有输出则返回输出节点成员类型，否则返回void
  }

  /**
   * 向此堆栈添加一个节点。
   *
   * @param {Node} node - 要添加的节点。
   * @return {StackNode} 对此堆栈节点的引用。
   */
  add(node) {
    // 添加节点的方法

    if (node.isNode !== true) {
      // 如果不是有效的节点

      console.error("THREE.TSL: Invalid node added to stack."); // 输出错误信息
      return this; // 返回当前对象
    }

    this.nodes.push(node); // 将节点添加到节点数组中

    return this; // 返回当前对象以支持链式调用
  }

  /**
   * 在TSL中表示 `if` 语句。
   *
   * @param {Node} boolNode - 表示条件。
   * @param {Function} method - 如果条件评估为 `true` 时执行的TSL代码。
   * @return {StackNode} 对此堆栈节点的引用。
   */
  If(boolNode, method) {
    // If方法，用于创建if语句

    const methodNode = new ShaderNode(method); // 创建着色器节点
    this._currentCond = select(boolNode, methodNode); // 创建条件选择节点

    return this.add(this._currentCond); // 添加条件节点并返回当前对象
  }

  /**
   * 在TSL中表示 `elseif` 语句。
   *
   * @param {Node} boolNode - 表示条件。
   * @param {Function} method - 如果条件评估为 `true` 时执行的TSL代码。
   * @return {StackNode} 对此堆栈节点的引用。
   */
  ElseIf(boolNode, method) {
    // ElseIf方法，用于创建elseif语句
    const methodNode = new ShaderNode(method); // 创建着色器节点
    const ifNode = select(boolNode, methodNode); // 创建条件选择节点

    this._currentCond.elseNode = ifNode; // 设置当前条件的else节点
    this._currentCond = ifNode; // 更新当前条件节点

    return this; // 返回当前对象以支持链式调用
  }

  /**
   * 在TSL中表示 `else` 语句。
   *
   * @param {Function} method - 在 `else` 情况下执行的TSL代码。
   * @return {StackNode} 对此堆栈节点的引用。
   */
  Else(method) {
    // Else方法，用于创建else语句
    this._currentCond.elseNode = new ShaderNode(method); // 设置当前条件的else节点

    return this; // 返回当前对象以支持链式调用
  }

  /**
   * 在TSL中表示 `switch` 语句。
   *
   * @param {any} expression - 表示表达式。
   * @param {Function} method - 如果条件评估为 `true` 时执行的TSL代码。
   * @return {StackNode} 对此堆栈节点的引用。
   */
  Switch(expression) {
    // Switch方法，用于创建switch语句
    this._expressionNode = nodeObject(expression); // 设置表达式节点

    return this; // 返回当前对象以支持链式调用
  }

  /**
   * 在TSL中表示 `case` 语句。TSL版本接受任意数量的值。
   * 最后一个参数必须是在 `true` 情况下应执行的回调方法。
   *
   * @param {...any} params - `Case()` 语句的值以及回调方法。
   * @return {StackNode} 对此堆栈节点的引用。
   */
  Case(...params) {
    // Case方法，用于创建case语句
    const caseNodes = []; // 初始化case节点数组

    // 从参数列表中提取case节点

    if (params.length >= 2) {
      // 如果参数数量至少为2
      for (let i = 0; i < params.length - 1; i++) {
        // 遍历除最后一个参数外的所有参数
        caseNodes.push(this._expressionNode.equal(nodeObject(params[i]))); // 创建相等比较节点并添加到数组
      }
    } else {
      // 如果参数数量不足
      console.error("THREE.TSL: Invalid parameter length. Case() requires at least two parameters."); // 输出错误信息
    }

    // 提取方法

    const method = params[params.length - 1]; // 获取最后一个参数作为方法
    const methodNode = new ShaderNode(method); // 创建着色器节点

    // 当使用 Case( 1, 2, 3, () => {} ) 时链接多个case

    let caseNode = caseNodes[0]; // 获取第一个case节点

    for (let i = 1; i < caseNodes.length; i++) {
      // 遍历剩余的case节点
      caseNode = caseNode.or(caseNodes[i]); // 使用or操作符链接case节点
    }

    // 构建条件

    const condNode = select(caseNode, methodNode); // 创建条件选择节点

    if (this._currentCond === null) {
      // 如果当前没有条件节点
      this._currentCond = condNode; // 设置当前条件节点

      return this.add(this._currentCond); // 添加条件节点并返回当前对象
    } else {
      // 如果已有条件节点
      this._currentCond.elseNode = condNode; // 设置当前条件的else节点
      this._currentCond = condNode; // 更新当前条件节点

      return this; // 返回当前对象
    }
  }

  /**
   * 表示Switch/Case语句的默认代码块。
   *
   * @param {Function} method - 在 `else` 情况下执行的TSL代码。
   * @return {StackNode} 对此堆栈节点的引用。
   */
  Default(method) {
    // Default方法，用于创建default语句
    this.Else(method); // 调用Else方法

    return this; // 返回当前对象以支持链式调用
  }

  setup(builder) {
    // 设置方法，用于初始化节点
    const nodeProperties = builder.getNodeProperties(this); // 获取节点属性

    let index = 0; // 初始化索引

    for (const childNode of this.getChildren()) {
      // 遍历所有子节点
      if (childNode.isVarNode && childNode.intent === true) {
        // 如果是变量节点且有意图
        const properties = builder.getNodeProperties(childNode); // 获取子节点属性

        if (properties.assign !== true) {
          // 如果没有赋值
          continue; // 跳过此节点
        }
      }

      nodeProperties["node" + index++] = childNode; // 设置节点属性
    }

    // 如果存在则返回输出节点，否则返回null

    return nodeProperties.outputNode || null; // 返回输出节点或null
  }

  get hasOutput() {
    // 检查是否有输出的getter方法
    return this.outputNode && this.outputNode.isNode; // 返回是否有有效的输出节点
  }

  build(builder, ...params) {
    // 构建方法，用于生成着色器代码
    const previousBuildStack = builder.currentStack; // 保存之前的构建堆栈
    const previousStack = getCurrentStack(); // 保存之前的当前堆栈

    setCurrentStack(this); // 设置当前堆栈为此节点

    builder.currentStack = this; // 设置构建器的当前堆栈

    const buildStage = builder.buildStage; // 获取构建阶段

    for (const node of this.nodes) {
      // 遍历所有节点
      if (node.isVarNode && node.intent === true) {
        // 如果是变量节点且有意图
        const properties = builder.getNodeProperties(node); // 获取节点属性

        if (properties.assign !== true) {
          // 如果没有赋值
          continue; // 跳过此节点
        }
      }

      if (buildStage === "setup") {
        // 如果是设置阶段
        node.build(builder); // 构建节点
      } else if (buildStage === "analyze") {
        // 如果是分析阶段
        node.build(builder, this); // 构建节点并传递当前对象
      } else if (buildStage === "generate") {
        // 如果是生成阶段
        const stages = builder.getDataFromNode(node, "any").stages; // 获取节点的阶段数据
        const parents = stages && stages[builder.shaderStage]; // 获取父节点

        if (node.isVarNode && parents && parents.length === 1 && parents[0] && parents[0].isStackNode) {
          // 如果是仅在.toVarying()中使用的变量节点
          continue; // 跳过仅在.toVarying()中使用的变量节点
        }

        node.build(builder, "void"); // 构建节点为void类型
      }
    }

    //

    let result; // 声明结果变量

    if (this.hasOutput) {
      // 如果有输出
      result = this.outputNode.build(builder, ...params); // 构建输出节点
    } else {
      // 如果没有输出
      result = super.build(builder, ...params); // 调用父类构建方法
    }

    setCurrentStack(previousStack); // 恢复之前的当前堆栈

    builder.currentStack = previousBuildStack; // 恢复之前的构建堆栈

    return result; // 返回构建结果
  }
}

export default StackNode; // 导出StackNode类作为默认导出

/**
 * 用于创建堆栈节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {?StackNode} [parent=null] - 父堆栈节点。
 * @returns {StackNode}
 */
export const stack = /*@__PURE__*/ nodeProxy(StackNode).setParameterLength(0, 1); // 导出stack函数，用于创建堆栈节点
