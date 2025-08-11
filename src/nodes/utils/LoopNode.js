// 导入基础节点类
import Node from "../core/Node.js";
// 导入表达式节点功能
import { expression } from "../code/ExpressionNode.js";
// 导入TSL基础功能：节点对象、节点数组和函数定义
import { nodeObject, nodeArray, Fn } from "../tsl/TSLBase.js";

/**
 * 循环节点类，提供了在TSL中实现循环的多种方式。
 *
 * 该模块支持多种循环模式，从简单的计数循环到复杂的条件循环。
 *
 * **基本形式：**
 * ```js
 * Loop( count, ( { i } ) => {
 *   // 循环体代码
 * } );
 * ```
 *
 * **指定起始和结束范围、数据类型和循环条件：**
 * ```js
 * Loop( { start: int( 0 ), end: int( 10 ), type: 'int', condition: '<' }, ( { i } ) => {
 *   // 循环体代码
 * } );
 * ```
 *
 * **嵌套循环的紧凑形式：**
 * ```js
 * Loop( 10, 5, ( { i, j } ) => {
 *   // i从0到9，j从0到4的嵌套循环
 * } );
 * ```
 *
 * **反向循环：**
 * ```js
 * Loop( { start: 10 }, () => {
 *   // 从10向下计数到0
 * } );
 * ```
 *
 * **条件循环（类似while语法）：**
 * ```js
 * const value = float( 0 ).toVar();
 *
 * Loop( value.lessThan( 10 ), () => {
 *   value.addAssign( 1 );
 * } );
 * ```
 *
 * 该模块还提供了`Break()`和`Continue()`TSL表达式用于循环控制。
 *
 * @augments Node
 */
class LoopNode extends Node {
  /**
   * 获取节点类型标识符。
   *
   * @static
   * @return {string} 返回'LoopNode'类型标识符。
   */
  static get type() {
    return "LoopNode";
  }

  /**
   * 构造一个新的循环节点。
   *
   * @param {Array<any>} params - 根据循环类型，数组包含循环的不同参数化值。
   */
  constructor(params = []) {
    super();

    /**
     * 循环参数数组。
     *
     * 该数组包含定义循环行为的所有参数，包括：
     * - 循环计数或条件
     * - 循环配置对象（起始值、结束值、类型等）
     * - 循环体函数（总是最后一个参数）
     *
     * @type {Array<any>}
     */
    this.params = params;
  }

  /**
   * 根据索引返回循环变量名。
   *
   * 变量名模式为：`0` = `i`, `1` = `j`, `2` = `k` 等等。
   * 这遵循了传统的循环变量命名约定。
   *
   * @param {number} index - 索引值。
   * @return {string} 循环变量名。
   */
  getVarName(index) {
    return String.fromCharCode("i".charCodeAt(0) + index);
  }

  /**
   * 返回关于此节点的属性。
   *
   * 该方法解析循环参数并构建循环所需的各种属性，包括：
   * - 输入变量（循环计数器）
   * - 堆栈节点（用于作用域管理）
   * - 返回节点（循环体的执行结果）
   * - 更新节点（可选的更新逻辑）
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {Object} 节点属性对象。
   */
  getProperties(builder) {
    const properties = builder.getNodeProperties(this);

    // 如果属性已经计算过，直接返回
    if (properties.stackNode !== undefined) return properties;

    // 构建输入变量映射
    const inputs = {};

    // 遍历参数（除了最后一个循环体函数）
    for (let i = 0, l = this.params.length - 1; i < l; i++) {
      const param = this.params[i];

      // 确定变量名：使用参数指定的名称或默认的i、j、k等
      const name = (param.isNode !== true && param.name) || this.getVarName(i);
      // 确定变量类型：使用参数指定的类型或默认的int
      const type = (param.isNode !== true && param.type) || "int";

      // 创建表达式节点作为循环变量
      inputs[name] = expression(name, type);
    }

    // 添加新的堆栈作用域 // TODO: 应该缓存它
    const stack = builder.addStack();

    // 执行循环体函数，获取返回节点
    properties.returnsNode = this.params[this.params.length - 1](inputs, builder);
    properties.stackNode = stack;

    const baseParam = this.params[0];

    // 如果基础参数有更新函数，创建更新节点
    if (baseParam.isNode !== true && typeof baseParam.update === "function") {
      properties.updateNode = Fn(this.params[0].update)(inputs);
    }

    // 移除堆栈作用域
    builder.removeStack();

    return properties;
  }

  /**
   * 获取节点的数据类型。
   *
   * 该方法被重写，因为节点类型是基于循环配置推断的。
   * 如果循环体有返回值，则使用返回值的类型；否则为void类型。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 节点的数据类型。
   */
  getNodeType(builder) {
    const { returnsNode } = this.getProperties(builder);

    return returnsNode ? returnsNode.getNodeType(builder) : "void";
  }

  /**
   * 设置节点。
   *
   * 该方法初始化循环节点的属性，为代码生成做准备。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   */
  setup(builder) {
    // 设置属性
    this.getProperties(builder);
  }

  /**
   * 生成着色器代码。
   *
   * 该方法是循环节点的核心，负责生成各种类型的循环着色器代码。
   * 支持for循环、while循环、嵌套循环等多种形式。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 生成的着色器代码片段。
   */
  generate(builder) {
    const properties = this.getProperties(builder);

    const params = this.params;
    const stackNode = properties.stackNode;

    // 遍历所有循环参数（除了最后一个循环体函数）
    for (let i = 0, l = params.length - 1; i < l; i++) {
      const param = params[i];

      // 初始化循环配置变量
      let isWhile = false,
        start = null,
        end = null,
        name = null,
        type = null,
        condition = null,
        update = null;

      // 处理节点类型的参数
      if (param.isNode) {
        if (param.getNodeType(builder) === "bool") {
          // 布尔节点：生成while循环
          isWhile = true;
          type = "bool";
          end = param.build(builder, type);
        } else {
          // 数值节点：生成for循环，从0到指定值
          type = "int";
          name = this.getVarName(i);
          start = "0";
          end = param.build(builder, type);
          condition = "<";
        }
      } else {
        // 处理配置对象类型的参数
        type = param.type || "int";
        name = param.name || this.getVarName(i);
        start = param.start;
        end = param.end;
        condition = param.condition;
        update = param.update;

        // 处理起始值：数字转换为常量，节点构建为代码
        if (typeof start === "number") start = builder.generateConst(type, start);
        else if (start && start.isNode) start = start.build(builder, type);

        // 处理结束值：数字转换为常量，节点构建为代码
        if (typeof end === "number") end = builder.generateConst(type, end);
        else if (end && end.isNode) end = end.build(builder, type);

        // 处理反向循环：只指定起始值时，从起始值-1倒数到0
        if (start !== undefined && end === undefined) {
          start = start + " - 1";
          end = "0";
          condition = ">=";
        } else if (end !== undefined && start === undefined) {
          // 只指定结束值时，从0开始
          start = "0";
          condition = "<";
        }

        // 自动推断循环条件
        if (condition === undefined) {
          if (Number(start) > Number(end)) {
            condition = ">="; // 反向循环
          } else {
            condition = "<"; // 正向循环
          }
        }
      }

      let loopSnippet;

      // 根据循环类型生成相应的循环语句
      if (isWhile) {
        // 生成while循环
        loopSnippet = `while ( ${end} )`;
      } else {
        // 生成for循环
        const internalParam = { start, end, condition };

        const startSnippet = internalParam.start;
        const endSnippet = internalParam.end;

        let updateSnippet;

        // 根据条件确定增量操作符（正向用+=，反向用-=）
        const deltaOperator = () => (condition.includes("<") ? "+=" : "-=");

        // 处理更新表达式
        if (update !== undefined && update !== null) {
          switch (typeof update) {
            case "function":
              // 函数类型：执行更新函数并获取代码
              const flow = builder.flowStagesNode(properties.updateNode, "void");
              const snippet = flow.code.replace(/\t|;/g, "");

              updateSnippet = snippet;

              break;

            case "number":
              // 数字类型：生成增量操作
              updateSnippet = name + " " + deltaOperator() + " " + builder.generateConst(type, update);

              break;

            case "string":
              // 字符串类型：直接使用字符串作为更新表达式
              updateSnippet = name + " " + update;

              break;

            default:
              // 节点类型或其他类型
              if (update.isNode) {
                updateSnippet = name + " " + deltaOperator() + " " + update.build(builder);
              } else {
                console.error("THREE.TSL: 'Loop( { update: ... } )' is not a function, string or number.");

                updateSnippet = "break /* invalid update */";
              }
          }
        } else {
          // 默认更新方式
          if (type === "int" || type === "uint") {
            // 整数类型使用++或--
            update = condition.includes("<") ? "++" : "--";
          } else {
            // 浮点类型使用+=1.或-=1.
            update = deltaOperator() + " 1.";
          }

          updateSnippet = name + " " + update;
        }

        // 构建for循环的三个部分
        const declarationSnippet = builder.getVar(type, name) + " = " + startSnippet; // 声明和初始化
        const conditionalSnippet = name + " " + condition + " " + endSnippet; // 条件判断

        // 生成完整的for循环语句
        loopSnippet = `for ( ${declarationSnippet}; ${conditionalSnippet}; ${updateSnippet} )`;
      }

      // 添加循环开始的代码和缩进
      builder.addFlowCode((i === 0 ? "\n" : "") + builder.tab + loopSnippet + " {\n\n").addFlowTab();
    }

    // 构建循环体的代码
    const stackSnippet = stackNode.build(builder, "void");

    // 构建返回值的代码（如果有的话）
    const returnsSnippet = properties.returnsNode ? properties.returnsNode.build(builder) : "";

    // 添加循环体代码
    builder.removeFlowTab().addFlowCode("\n" + builder.tab + stackSnippet);

    // 关闭所有循环的大括号
    for (let i = 0, l = this.params.length - 1; i < l; i++) {
      builder.addFlowCode((i === 0 ? "" : builder.tab) + "}\n\n").removeFlowTab();
    }

    // 恢复缩进
    builder.addFlowTab();

    return returnsSnippet;
  }
}

// 导出LoopNode类作为默认导出
export default LoopNode;

/**
 * TSL函数，用于创建循环节点。
 *
 * 该函数提供了一个便捷的方式来创建各种类型的循环。
 * 支持多种参数形式，从简单的计数循环到复杂的条件循环和嵌套循环。
 *
 * 参数会被自动解析并转换为适当的循环配置。
 *
 * @tsl
 * @function
 * @param {...any} params - 参数列表，可以是数字、配置对象、节点或函数。
 * @returns {LoopNode} 循环节点实例。
 */
export const Loop = (...params) => nodeObject(new LoopNode(nodeArray(params, "int"))).toStack();

/**
 * TSL函数，用于创建`Continue()`表达式。
 *
 * 该函数生成continue语句，用于跳过当前循环迭代的剩余部分，
 * 直接进入下一次迭代。只能在循环内部使用。
 *
 * @tsl
 * @function
 * @returns {Node} continue表达式节点。
 */
export const Continue = () => expression("continue").toStack();

/**
 * TSL函数，用于创建`Break()`表达式。
 *
 * 该函数生成break语句，用于立即退出当前循环。
 * 只能在循环内部使用。
 *
 * @tsl
 * @function
 * @returns {Node} break表达式节点。
 */
export const Break = () => expression("break").toStack();
