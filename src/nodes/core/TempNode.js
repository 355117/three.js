import Node from "./Node.js"; // 导入Node基类

/**
 * 此模块使用缓存管理来创建临时变量，
 * 如果节点被多次使用，以防止重复计算。
 *
 * 该类作为许多其他节点类型的基类。
 *
 * @augments Node
 */
class TempNode extends Node {
  // 定义TempNode类，继承自Node

  static get type() {
    // 静态getter方法，返回节点类型

    return "TempNode"; // 返回节点类型字符串
  }

  /**
   * 构造一个临时节点。
   *
   * @param {?string} nodeType - 节点类型。
   */
  constructor(nodeType = null) {
    // 构造函数，接受可选的节点类型参数

    super(nodeType); // 调用父类构造函数

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isTempNode = true; // 标识这是一个临时节点对象
  }

  /**
   * 检查此节点是否在其他节点的上下文中被多次使用。
   *
   * @param {NodeBuilder} builder - 节点构建器。
   * @return {boolean} 指示是否有多个对其他节点的依赖关系的标志。
   */
  hasDependencies(builder) {
    // 检查是否有依赖关系的方法

    return builder.getDataFromNode(this).usageCount > 1; // 返回使用次数是否大于1
  }

  build(builder, output) {
    // 构建方法，用于生成着色器代码

    const buildStage = builder.getBuildStage(); // 获取构建阶段

    if (buildStage === "generate") {
      // 如果是生成阶段

      const type = builder.getVectorType(this.getNodeType(builder, output)); // 获取向量类型
      const nodeData = builder.getDataFromNode(this); // 获取节点数据

      if (nodeData.propertyName !== undefined) {
        // 如果属性名已定义

        return builder.format(nodeData.propertyName, type, output); // 格式化并返回属性名
      } else if (type !== "void" && output !== "void" && this.hasDependencies(builder)) {
        // 如果类型不为void且有依赖关系

        const snippet = super.build(builder, type); // 调用父类构建方法获取代码片段

        const nodeVar = builder.getVarFromNode(this, null, type); // 获取节点变量
        const propertyName = builder.getPropertyName(nodeVar); // 获取属性名

        builder.addLineFlowCode(`${propertyName} = ${snippet}`, this); // 添加赋值代码行

        nodeData.snippet = snippet; // 存储代码片段
        nodeData.propertyName = propertyName; // 存储属性名

        return builder.format(nodeData.propertyName, type, output); // 格式化并返回属性名
      }
    }

    return super.build(builder, output); // 调用父类构建方法
  }
}

export default TempNode; // 导出TempNode类作为默认导出
