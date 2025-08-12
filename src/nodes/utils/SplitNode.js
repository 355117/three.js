/**
 * SplitNode.js - 向量分量访问节点
 *
 * 该文件实现了向量分量访问操作的节点。这是TSL核心的一部分，
 * 通常不在应用层代码中直接使用。
 */

// 导入核心节点类
import Node from "../core/Node.js";
// 导入向量分量常量
import { vectorComponents } from "../core/constants.js";

// 将向量分量数组连接成字符串，用于优化比较
const _stringVectorComponents = vectorComponents.join("");

/**
 * 分量访问节点类
 *
 * 该模块是TSL核心的一部分，通常不在应用层代码中使用。
 * SplitNode 表示属性访问操作，用于实现节点对象上的
 * .xyzw、.rgba 和 .stpq 等分量访问。
 *
 * 使用示例：
 * ```js
 * const redValue = color.r;
 * ```
 *
 * @augments Node
 */
class SplitNode extends Node {
  /**
   * 获取节点类型名称
   * @returns {string} 返回 'SplitNode'
   */
  static get type() {
    return "SplitNode";
  }

  /**
   * 构造一个新的分量访问节点
   *
   * @param {Node} node - 要访问的节点
   * @param {string} [components='x'] - 要访问的分量（如'x', 'xy', 'rgb'等）
   */
  constructor(node, components = "x") {
    super();

    /**
     * 要访问的节点
     *
     * @type {Node}
     */
    this.node = node;

    /**
     * 要访问的分量
     *
     * @type {string}
     */
    this.components = components;

    /**
     * 用于类型测试的标志
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSplitNode = true;
  }

  /**
   * 返回基于请求分量计算的向量长度
   *
   * @return {number} 向量长度
   */
  getVectorLength() {
    let vectorLength = this.components.length;

    // 遍历每个分量字符，找到最大的向量长度
    for (const c of this.components) {
      vectorLength = Math.max(vectorComponents.indexOf(c) + 1, vectorLength);
    }

    return vectorLength;
  }

  /**
   * 返回节点类型的分量类型
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 分量类型
   */
  getComponentType(builder) {
    return builder.getComponentType(this.node.getNodeType(builder));
  }

  /**
   * 重写此方法，因为节点类型是从请求的分量推断出来的
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 节点类型
   */
  getNodeType(builder) {
    return builder.getTypeFromLength(this.components.length, this.getComponentType(builder));
  }

  /**
   * 生成着色器代码
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @param {string} output - 输出类型
   * @returns {string} 生成的着色器代码片段
   */
  generate(builder, output) {
    const node = this.node;
    const nodeTypeLength = builder.getTypeLength(node.getNodeType(builder));

    let snippet = null;

    if (nodeTypeLength > 1) {
      // 处理向量类型
      let type = null;

      const componentsLength = this.getVectorLength();

      if (componentsLength >= nodeTypeLength) {
        // 需要扩展输入节点
        type = builder.getTypeFromLength(this.getVectorLength(), this.getComponentType(builder));
      }

      // 构建节点代码片段
      const nodeSnippet = node.build(builder, type);

      if (this.components.length === nodeTypeLength && this.components === _stringVectorComponents.slice(0, this.components.length)) {
        // 不必要的重排（swizzle），直接使用原始值
        snippet = builder.format(nodeSnippet, type, output);
      } else {
        // 应用分量访问（如 .xyz, .rgb 等）
        snippet = builder.format(`${nodeSnippet}.${this.components}`, this.getNodeType(builder), output);
      }
    } else {
      // 如果节点返回标量（float/integer），忽略分量访问
      snippet = node.build(builder, output);
    }

    return snippet;
  }

  /**
   * 序列化节点数据
   *
   * @param {Object} data - 序列化数据对象
   */
  serialize(data) {
    super.serialize(data);

    // 保存分量信息
    data.components = this.components;
  }

  /**
   * 反序列化节点数据
   *
   * @param {Object} data - 序列化数据对象
   */
  deserialize(data) {
    super.deserialize(data);

    // 恢复分量信息
    this.components = data.components;
  }
}

// 导出默认类
export default SplitNode;
