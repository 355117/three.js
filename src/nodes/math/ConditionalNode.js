// 导入核心节点基类
import Node from "../core/Node.js";
// 导入属性节点
import { property } from "../core/PropertyNode.js";
// 导入TSL核心功能
import { addMethodChaining, nodeProxy } from "../tsl/TSLCore.js";

/**
 * 表示逻辑 `if/else` 语句的节点。可以作为 `If()`/`Else()` 语法的替代方案。
 *
 * 对应的TSL `select()` 用法如下：
 * ```js
 * velocity = position.greaterThanEqual( limit ).select( velocity.negate(), velocity );
 * ```
 * `select()` 方法以链式调用的方式在条件上调用。`select()` 的参数节点
 * 决定整个语句的结果。
 *
 * @augments Node
 */
class ConditionalNode extends Node {
  /**
   * 获取节点类型标识符。
   *
   * @return {string} 节点类型名称
   */
  static get type() {
    return "ConditionalNode";
  }

  /**
   * 构造一个新的条件节点。
   *
   * @param {Node} condNode - 定义条件的节点
   * @param {Node} ifNode - 当条件为 `true` 时求值的节点
   * @param {?Node} [elseNode=null] - 当条件为 `false` 时求值的节点
   */
  constructor(condNode, ifNode, elseNode = null) {
    // 调用父类构造函数
    super();

    /**
     * 定义条件的节点。
     *
     * @type {Node}
     */
    this.condNode = condNode;

    /**
     * 当条件为 `true` 时求值的节点。
     *
     * @type {Node}
     */
    this.ifNode = ifNode;

    /**
     * 当条件为 `false` 时求值的节点。
     *
     * @type {?Node}
     * @default null
     */
    this.elseNode = elseNode;
  }

  /**
   * 获取节点类型。此方法被重写，因为节点类型是从if/else节点推断出来的。
   *
   * 条件节点的类型取决于其分支节点的类型。如果有else分支，
   * 则选择类型长度更大的那个作为最终类型。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {string} 节点类型
   */
  getNodeType(builder) {
    // 从构建器获取节点属性
    const { ifNode, elseNode } = builder.getNodeProperties(this);

    // 如果ifNode未定义，执行回退设置
    if (ifNode === undefined) {
      // 回退设置：强制执行setup阶段
      builder.flowBuildStage(this, "setup");

      // 递归调用以获取正确的类型
      return this.getNodeType(builder);
    }

    // 获取if分支的节点类型
    const ifType = ifNode.getNodeType(builder);

    // 如果存在else分支
    if (elseNode !== null) {
      // 获取else分支的节点类型
      const elseType = elseNode.getNodeType(builder);

      // 如果else类型的长度大于if类型的长度，使用else类型
      // 这确保了类型兼容性（例如：vec3比float有更高的优先级）
      if (builder.getTypeLength(elseType) > builder.getTypeLength(ifType)) {
        return elseType;
      }
    }

    // 默认返回if分支的类型
    return ifType;
  }

  /**
   * 设置条件节点的属性和上下文。
   *
   * 此方法负责缓存子节点、设置父节点块关系，以及根据流程类型
   * 配置节点上下文。
   *
   * @param {NodeBuilder} builder - 节点构建器
   */
  setup(builder) {
    // 缓存所有子节点以提高性能
    const condNode = this.condNode.cache();
    const ifNode = this.ifNode.cache();
    const elseNode = this.elseNode ? this.elseNode.cache() : null;

    // 设置父节点块关系

    // 获取当前节点块上下文
    const currentNodeBlock = builder.context.nodeBlock;

    // 为if节点设置父节点块
    builder.getDataFromNode(ifNode).parentNodeBlock = currentNodeBlock;
    // 如果存在else节点，也为其设置父节点块
    if (elseNode !== null) builder.getDataFromNode(elseNode).parentNodeBlock = currentNodeBlock;

    // 配置节点属性和上下文

    // 检查是否为统一流程（uniform flow）
    const isUniformFlow = builder.context.uniformFlow;

    // 获取并设置节点属性
    const properties = builder.getNodeProperties(this);
    properties.condNode = condNode;
    // 根据流程类型设置if节点：统一流程直接使用，否则创建新的节点块上下文
    properties.ifNode = isUniformFlow ? ifNode : ifNode.context({ nodeBlock: ifNode });
    // 根据流程类型设置else节点：统一流程直接使用，否则创建新的节点块上下文
    properties.elseNode = elseNode ? (isUniformFlow ? elseNode : elseNode.context({ nodeBlock: elseNode })) : null;
  }

  /**
   * 生成条件节点的着色器代码。
   *
   * 根据流程类型（统一流程或分支流程）生成不同的代码结构。
   * 统一流程使用三元运算符，分支流程使用if/else语句。
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @param {string} output - 输出类型
   * @return {string} 生成的着色器代码
   */
  generate(builder, output) {
    // 获取节点的数据类型
    const type = this.getNodeType(builder);

    // 获取节点数据
    const nodeData = builder.getDataFromNode(this);

    // 如果节点属性已经存在，直接返回
    if (nodeData.nodeProperty !== undefined) {
      return nodeData.nodeProperty;
    }

    // 获取条件节点的所有属性
    const { condNode, ifNode, elseNode } = builder.getNodeProperties(this);

    // 获取当前函数节点和输出需求
    const functionNode = builder.currentFunctionNode;
    const needsOutput = output !== "void";
    // 如果需要输出，创建属性节点；否则为空字符串
    const nodeProperty = needsOutput ? property(type).build(builder) : "";

    // 缓存节点属性
    nodeData.nodeProperty = nodeProperty;

    // 构建条件表达式的代码片段
    const nodeSnippet = condNode.build(builder, "bool");
    // 检查是否为统一流程
    const isUniformFlow = builder.context.uniformFlow;

    // 统一流程处理：使用三元运算符
    if (isUniformFlow && elseNode !== null) {
      // 构建if分支的代码片段
      const ifSnippet = ifNode.build(builder, type);
      // 构建else分支的代码片段
      const elseSnippet = elseNode.build(builder, type);

      // 使用三元运算符组合条件表达式
      const mathSnippet = builder.getTernary(nodeSnippet, ifSnippet, elseSnippet);

      // TODO: 如果节点属性已存在，返回其他内容

      // 格式化并返回最终的代码片段
      return builder.format(mathSnippet, type, output);
    }

    // 分支流程处理：使用if/else语句块

    // 添加if语句的开始部分并增加缩进
    builder.addFlowCode(`\n${builder.tab}if ( ${nodeSnippet} ) {\n\n`).addFlowTab();

    // 构建if分支的代码片段
    let ifSnippet = ifNode.build(builder, type);

    // 处理if分支的代码片段
    if (ifSnippet) {
      if (needsOutput) {
        // 如果需要输出，生成赋值语句
        ifSnippet = nodeProperty + " = " + ifSnippet + ";";
      } else {
        // 如果不需要输出，生成返回语句
        ifSnippet = "return " + ifSnippet + ";";

        // 检查是否在内联函数中使用返回语句
        if (functionNode === null) {
          console.warn("THREE.TSL: Return statement used in an inline 'Fn()'. Define a layout struct to allow return values.");

          // 将返回语句注释掉以避免错误
          ifSnippet = "// " + ifSnippet;
        }
      }
    }

    // 减少缩进并添加if分支的结束部分
    builder.removeFlowTab().addFlowCode(builder.tab + "\t" + ifSnippet + "\n\n" + builder.tab + "}");

    // 处理else分支（如果存在）
    if (elseNode !== null) {
      // 添加else语句的开始部分并增加缩进
      builder.addFlowCode(" else {\n\n").addFlowTab();

      // 构建else分支的代码片段
      let elseSnippet = elseNode.build(builder, type);

      // 处理else分支的代码片段
      if (elseSnippet) {
        if (needsOutput) {
          // 如果需要输出，生成赋值语句
          elseSnippet = nodeProperty + " = " + elseSnippet + ";";
        } else {
          // 如果不需要输出，生成返回语句
          elseSnippet = "return " + elseSnippet + ";";

          // 检查是否在内联函数中使用返回语句
          if (functionNode === null) {
            console.warn("THREE.TSL: Return statement used in an inline 'Fn()'. Define a layout struct to allow return values.");

            // 将返回语句注释掉以避免错误
            elseSnippet = "// " + elseSnippet;
          }
        }
      }

      // 减少缩进并添加else分支的结束部分
      builder.removeFlowTab().addFlowCode(builder.tab + "\t" + elseSnippet + "\n\n" + builder.tab + "}\n\n");
    } else {
      // 如果没有else分支，只添加换行
      builder.addFlowCode("\n\n");
    }

    // 格式化并返回最终的节点属性
    return builder.format(nodeProperty, type, output);
  }
}

// 导出条件节点类作为默认导出
export default ConditionalNode;

/**
 * TSL函数，用于创建条件节点。
 *
 * 这是一个代理函数，提供了更简洁的语法来创建条件节点。
 * 可以用于实现条件选择逻辑，类似于三元运算符的功能。
 *
 * @tsl
 * @function
 * @param {Node} condNode - 定义条件的节点
 * @param {Node} ifNode - 当条件为 `true` 时求值的节点
 * @param {?Node} [elseNode=null] - 当条件为 `false` 时求值的节点
 * @returns {ConditionalNode} 创建的条件节点
 */
export const select = /*@__PURE__*/ nodeProxy(ConditionalNode).setParameterLength(2, 3);

// 为select函数添加方法链支持，允许在节点上直接调用.select()方法
addMethodChaining("select", select);
