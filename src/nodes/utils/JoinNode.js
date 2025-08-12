// 导入临时节点基类
import TempNode from "../core/TempNode.js";

/**
 * 连接节点类。
 *
 * 该模块是TSL核心的一部分，通常不在应用层代码中直接使用。
 * 它表示着色器生成过程中的连接操作。例如，它可以将两个单独的
 * 浮点数组合/连接成一个`vec2`类型。
 *
 * 连接操作在着色器编程中非常常见，用于构建向量类型，
 * 例如将RGB颜色值和alpha值连接成RGBA向量，
 * 或将XY坐标和ZW坐标连接成四维向量。
 *
 * @augments TempNode
 */
class JoinNode extends TempNode {
  /**
   * 获取节点类型标识符。
   *
   * @static
   * @return {string} 返回'JoinNode'类型标识符。
   */
  static get type() {
    return "JoinNode";
  }

  /**
   * 构造一个新的连接节点。
   *
   * @param {Array<Node>} nodes - 需要连接的节点数组。
   * @param {?string} [nodeType=null] - 节点类型，如果为null则自动推断。
   */
  constructor(nodes = [], nodeType = null) {
    super(nodeType);

    /**
     * 需要连接的节点数组。
     *
     * 这些节点的值将按顺序连接成一个新的向量类型。
     * 例如，[float1, float2, float3]可以连接成vec3类型。
     *
     * @type {Array<Node>}
     */
    this.nodes = nodes;
  }

  /**
   * 获取节点的数据类型。
   *
   * 该方法被重写，因为如果没有显式定义，
   * 节点类型必须从连接数据的长度推断出来。
   *
   * 推断规则：
   * - 如果显式指定了nodeType，则使用该类型的向量版本
   * - 否则，根据所有输入节点的总分量数确定输出类型
   *   (1个分量=float, 2个=vec2, 3个=vec3, 4个=vec4)
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 节点的数据类型。
   */
  getNodeType(builder) {
    // 如果显式指定了节点类型，使用向量版本
    if (this.nodeType !== null) {
      return builder.getVectorType(this.nodeType);
    }

    // 否则根据所有输入节点的总分量数推断类型
    return builder.getTypeFromLength(this.nodes.reduce((count, cur) => count + builder.getTypeLength(cur.getNodeType(builder)), 0));
  }

  /**
   * 生成着色器代码。
   *
   * 该方法生成连接操作的着色器代码，将多个输入节点的值
   * 连接成一个向量类型。处理过程包括：
   * 1. 检查输入长度是否超出目标类型的最大长度
   * 2. 处理类型转换，确保所有分量类型一致
   * 3. 构造向量构造函数调用
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @param {string} output - 输出类型提示。
   * @return {string} 生成的着色器代码片段。
   */
  generate(builder, output) {
    // 获取目标类型和最大长度
    const type = this.getNodeType(builder);
    const maxLength = builder.getTypeLength(type);

    const nodes = this.nodes;

    // 获取目标类型的基础分量类型（如vec3的float）
    const primitiveType = builder.getComponentType(type);

    const snippetValues = [];

    let length = 0;

    // 遍历所有输入节点
    for (const input of nodes) {
      // 检查是否已达到最大长度
      if (length >= maxLength) {
        console.error(`THREE.TSL: Length of parameters exceeds maximum length of function '${type}()' type.`);
        break;
      }

      let inputType = input.getNodeType(builder);
      let inputTypeLength = builder.getTypeLength(inputType);
      let inputSnippet;

      // 检查当前输入是否会超出最大长度
      if (length + inputTypeLength > maxLength) {
        console.error(`THREE.TSL: Length of '${type}()' data exceeds maximum length of output type.`);

        // 截断输入长度以适应剩余空间
        inputTypeLength = maxLength - length;
        inputType = builder.getTypeFromLength(inputTypeLength);
      }

      // 更新总长度并构建输入代码片段
      length += inputTypeLength;
      inputSnippet = input.build(builder, inputType);

      // 获取输入的基础分量类型
      const inputPrimitiveType = builder.getComponentType(inputType);

      // 如果输入类型与目标类型不匹配，进行类型转换
      if (inputPrimitiveType !== primitiveType) {
        inputSnippet = builder.format(inputSnippet, inputPrimitiveType, primitiveType);
      }

      // 添加到代码片段数组
      snippetValues.push(inputSnippet);
    }

    // 构造向量构造函数调用，例如：vec3(x, y, z)
    const snippet = `${builder.getType(type)}( ${snippetValues.join(", ")} )`;

    // 格式化最终输出
    return builder.format(snippet, type, output);
  }
}

// 导出JoinNode类作为默认导出
export default JoinNode;
