// 导入基础节点类
import Node from "../core/Node.js";

/**
 * 类型转换节点类。
 *
 * 该模块是TSL核心的一部分，通常不在应用层代码中直接使用。
 * 它表示着色器生成过程中的类型转换操作，
 * 即将一个节点的数据类型转换为目标数据类型。
 *
 * 这在着色器编程中非常重要，因为不同的操作可能需要特定的数据类型，
 * 而ConvertNode提供了自动类型转换的机制。
 *
 * @augments Node
 */
class ConvertNode extends Node {
  /**
   * 获取节点类型标识符。
   *
   * @static
   * @return {string} 返回'ConvertNode'类型标识符。
   */
  static get type() {
    return "ConvertNode";
  }

  /**
   * 构造一个新的类型转换节点。
   *
   * @param {Node} node - 需要转换类型的节点。
   * @param {string} convertTo - 目标节点类型。可以通过`|`符号分隔定义多个类型选项。
   */
  constructor(node, convertTo) {
    super();

    /**
     * 需要转换类型的源节点。
     *
     * 该节点的输出将被转换为指定的目标类型。
     *
     * @type {Node}
     */
    this.node = node;

    /**
     * 目标节点类型字符串。
     *
     * 可以通过`|`符号分隔定义多个类型选项，
     * 系统会根据上下文选择最合适的类型。
     * 例如："float|vec2|vec3" 表示可以转换为这三种类型中的任意一种。
     *
     * @type {string}
     */
    this.convertTo = convertTo;
  }

  /**
   * 获取节点的数据类型。
   *
   * 该方法被重写，因为实现会尝试从 {@link ConvertNode#convertTo} 属性中
   * 推断出最佳匹配的类型。算法会优先选择与源节点类型长度相同的目标类型，
   * 以确保类型转换的合理性。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 推断出的最佳目标类型。
   */
  getNodeType(builder) {
    // 获取源节点的类型
    const requestType = this.node.getNodeType(builder);

    let convertTo = null;

    // 遍历所有可能的目标类型选项
    for (const overloadingType of this.convertTo.split("|")) {
      // 如果还没有选择类型，或者当前类型的长度与源类型长度匹配，则选择该类型
      if (convertTo === null || builder.getTypeLength(requestType) === builder.getTypeLength(overloadingType)) {
        convertTo = overloadingType;
      }
    }

    return convertTo;
  }

  /**
   * 序列化节点数据。
   *
   * 将节点的状态保存到数据对象中，包括目标转换类型。
   *
   * @param {Object} data - 用于存储序列化数据的对象。
   */
  serialize(data) {
    super.serialize(data);

    // 保存目标转换类型
    data.convertTo = this.convertTo;
  }

  /**
   * 反序列化节点数据。
   *
   * 从数据对象中恢复节点的状态，包括目标转换类型。
   *
   * @param {Object} data - 包含序列化数据的对象。
   */
  deserialize(data) {
    super.deserialize(data);

    // 恢复目标转换类型
    this.convertTo = data.convertTo;
  }

  /**
   * 生成着色器代码。
   *
   * 该方法构建源节点的代码，并将其格式化为目标类型。
   * 实际的类型转换由构建器的format方法处理。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @param {string} output - 输出类型提示。
   * @return {string} 生成的着色器代码片段。
   */
  generate(builder, output) {
    const node = this.node;
    const type = this.getNodeType(builder);

    // 构建源节点的代码片段，指定目标类型
    const snippet = node.build(builder, type);

    // 使用构建器格式化代码片段，确保类型正确
    return builder.format(snippet, type, output);
  }
}

// 导出ConvertNode类作为默认导出
export default ConvertNode;
