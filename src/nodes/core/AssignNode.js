// 导入临时节点基类
import TempNode from "../core/TempNode.js";
// 导入方法链和节点代理工具函数
import { addMethodChaining, nodeProxy } from "../tsl/TSLCore.js";
// 导入向量组件常量
import { vectorComponents } from "../core/constants.js";

/**
 * These node represents an assign operation. Meaning a node is assigned
 * to another node.
 * 此节点表示赋值操作。意味着一个节点被赋值给另一个节点。
 *
 * @augments TempNode
 */
class AssignNode extends TempNode {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "AssignNode";
  }

  /**
   * Constructs a new assign node.
   * 构造一个新的赋值节点。
   *
   * @param {Node} targetNode - The target node. 目标节点。
   * @param {Node} sourceNode - The source type. 源节点。
   */
  constructor(targetNode, sourceNode) {
    // 调用父类构造函数
    super();

    /**
     * The target node.
     * 目标节点。
     *
     * @type {Node}
     */
    this.targetNode = targetNode;

    /**
     * The source node.
     * 源节点。
     *
     * @type {Node}
     */
    this.sourceNode = sourceNode;

    /**
     * This flag can be used for type testing.
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isAssignNode = true;
  }

  /**
   * Whether this node is used more than once in context of other nodes. This method
   * is overwritten since it always returns `false` (assigns are unique).
   * 此节点是否在其他节点的上下文中被多次使用。此方法被重写，因为它总是返回`false`（赋值是唯一的）。
   *
   * @return {boolean} A flag that indicates if there is more than one dependency to other nodes. Always `false`. 指示是否对其他节点有多个依赖关系的标志。始终为`false`。
   */
  hasDependencies() {
    // 赋值节点没有依赖关系
    return false;
  }

  // 获取节点类型
  getNodeType(builder, output) {
    // 如果输出不是void，返回目标节点类型，否则返回void
    return output !== "void" ? this.targetNode.getNodeType(builder) : "void";
  }

  /**
   * Whether a split is required when assigning source to target. This can happen when the component length of
   * target and source data type does not match.
   * 将源赋值给目标时是否需要拆分。当目标和源数据类型的组件长度不匹配时可能发生这种情况。
   *
   * @param {NodeBuilder} builder - The current node builder. 当前节点构建器。
   * @return {boolean} Whether a split is required when assigning source to target. 将源赋值给目标时是否需要拆分。
   */
  needsSplitAssign(builder) {
    // 获取目标节点
    const { targetNode } = this;

    // 检查是否需要拆分赋值：不支持swizzleAssign且目标是拆分节点且组件数量大于1
    if (builder.isAvailable("swizzleAssign") === false && targetNode.isSplitNode && targetNode.components.length > 1) {
      // 获取目标长度
      const targetLength = builder.getTypeLength(targetNode.node.getNodeType(builder));
      // 检查是否赋值不同的向量
      const assignDifferentVector = vectorComponents.join("").slice(0, targetLength) !== targetNode.components;

      return assignDifferentVector;
    }

    // 默认不需要拆分
    return false;
  }

  // 设置节点属性
  setup(builder) {
    // 解构获取目标节点和源节点
    const { targetNode, sourceNode } = this;

    // 获取目标节点属性并设置assign标志
    const targetProperties = builder.getNodeProperties(targetNode);
    targetProperties.assign = true;

    // 获取当前节点属性并设置源节点和目标节点
    const properties = builder.getNodeProperties(this);
    properties.sourceNode = sourceNode;
    properties.targetNode = targetNode.context({ assign: true });
  }

  // 生成着色器代码
  generate(builder, output) {
    // 从节点属性中获取目标节点和源节点
    const { targetNode, sourceNode } = builder.getNodeProperties(this);

    // 检查是否需要拆分赋值
    const needsSplitAssign = this.needsSplitAssign(builder);

    // 构建目标节点代码
    const target = targetNode.build(builder);
    // 获取目标节点类型
    const targetType = targetNode.getNodeType(builder);

    // 构建源节点代码，使用目标类型
    const source = sourceNode.build(builder, targetType);
    // 获取源节点类型
    const sourceType = sourceNode.getNodeType(builder);

    // 获取节点数据
    const nodeData = builder.getDataFromNode(this);

    // 分隔符注释

    // 声明代码片段变量
    let snippet;

    // 如果节点已初始化
    if (nodeData.initialized === true) {
      // 如果输出不是void，返回目标
      if (output !== "void") {
        snippet = target;
      }
    } else if (needsSplitAssign) {
      // 需要拆分赋值的情况
      // 获取源变量
      const sourceVar = builder.getVarFromNode(this, null, targetType);
      // 获取源属性名
      const sourceProperty = builder.getPropertyName(sourceVar);

      // 添加源赋值代码行
      builder.addLineFlowCode(`${sourceProperty} = ${source}`, this);

      // 获取拆分节点
      const splitNode = targetNode.node;
      // 获取拆分目标节点
      const splitTargetNode = splitNode.node.context({ assign: true });

      // 构建目标根节点
      const targetRoot = splitTargetNode.build(builder);

      // 遍历拆分节点的组件
      for (let i = 0; i < splitNode.components.length; i++) {
        const component = splitNode.components[i];

        // 为每个组件添加赋值代码行
        builder.addLineFlowCode(`${targetRoot}.${component} = ${sourceProperty}[ ${i} ]`, this);
      }

      // 如果输出不是void，设置代码片段为目标
      if (output !== "void") {
        snippet = target;
      }
    } else {
      // 普通赋值情况
      snippet = `${target} = ${source}`;

      // 如果输出是void或源类型是void
      if (output === "void" || sourceType === "void") {
        // 添加赋值代码行
        builder.addLineFlowCode(snippet, this);

        // 如果输出不是void，设置代码片段为目标
        if (output !== "void") {
          snippet = target;
        }
      }
    }

    // 标记节点已初始化
    nodeData.initialized = true;

    // 格式化并返回代码片段
    return builder.format(snippet, targetType, output);
  }
}

// 导出AssignNode类作为默认导出
export default AssignNode;

/**
 * TSL function for creating an assign node.
 * 用于创建赋值节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {Node} targetNode - The target node. 目标节点。
 * @param {Node} sourceNode - The source type. 源节点。
 * @returns {AssignNode}
 */
// 创建赋值节点的代理函数，设置参数长度为2
export const assign = /*@__PURE__*/ nodeProxy(AssignNode).setParameterLength(2);

// 添加assign方法链
addMethodChaining("assign", assign);
