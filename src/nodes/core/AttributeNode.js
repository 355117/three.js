// 导入节点基类
import Node from "./Node.js";
// 导入节点对象和变量工具函数
import { nodeObject, varying } from "../tsl/TSLBase.js";

/**
 * Base class for representing shader attributes as nodes.
 * 用于将着色器属性表示为节点的基类。
 *
 * @augments Node
 */
class AttributeNode extends Node {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "AttributeNode";
  }

  /**
   * Constructs a new attribute node.
   * 构造一个新的属性节点。
   *
   * @param {string} attributeName - The name of the attribute. 属性的名称。
   * @param {?string} nodeType - The node type. 节点类型。
   */
  constructor(attributeName, nodeType = null) {
    // 调用父类构造函数
    super(nodeType);

    /**
     * `AttributeNode` sets this property to `true` by default.
     * `AttributeNode`默认将此属性设置为`true`。
     *
     * @type {boolean}
     * @default true
     */
    this.global = true;

    // 存储属性名称（私有属性）
    this._attributeName = attributeName;
  }

  // 获取节点的哈希值
  getHash(builder) {
    // 使用属性名称作为哈希值
    return this.getAttributeName(builder);
  }

  // 获取节点类型
  getNodeType(builder) {
    // 获取当前节点类型
    let nodeType = this.nodeType;

    // 如果节点类型为空，需要推断类型
    if (nodeType === null) {
      // 获取属性名称
      const attributeName = this.getAttributeName(builder);

      // 检查几何体是否有此属性
      if (builder.hasGeometryAttribute(attributeName)) {
        // 从几何体获取属性
        const attribute = builder.geometry.getAttribute(attributeName);

        // 从属性推断节点类型
        nodeType = builder.getTypeFromAttribute(attribute);
      } else {
        // 默认类型为float
        nodeType = "float";
      }
    }

    // 返回节点类型
    return nodeType;
  }

  /**
   * Sets the attribute name to the given value. The method can be
   * overwritten in derived classes if the final name must be computed
   * analytically.
   * 将属性名称设置为给定值。如果最终名称必须通过分析计算，此方法可以在派生类中被重写。
   *
   * @param {string} attributeName - The name of the attribute. 属性的名称。
   * @return {AttributeNode} A reference to this node. 对此节点的引用。
   */
  setAttributeName(attributeName) {
    // 设置属性名称
    this._attributeName = attributeName;

    // 返回当前节点以支持链式调用
    return this;
  }

  /**
   * Returns the attribute name of this node. The method can be
   * overwritten in derived classes if the final name must be computed
   * analytically.
   * 返回此节点的属性名称。如果最终名称必须通过分析计算，此方法可以在派生类中被重写。
   *
   * @param {NodeBuilder} builder - The current node builder. 当前节点构建器。
   * @return {string} The attribute name. 属性名称。
   */
  getAttributeName(/*builder*/) {
    // 返回存储的属性名称
    return this._attributeName;
  }

  // 生成着色器代码
  generate(builder) {
    // 获取属性名称
    const attributeName = this.getAttributeName(builder);
    // 获取节点类型
    const nodeType = this.getNodeType(builder);
    // 检查几何体是否有此属性
    const geometryAttribute = builder.hasGeometryAttribute(attributeName);

    // 如果几何体有此属性
    if (geometryAttribute === true) {
      // 从几何体获取属性
      const attribute = builder.geometry.getAttribute(attributeName);
      // 从属性获取类型
      const attributeType = builder.getTypeFromAttribute(attribute);

      // 获取节点属性
      const nodeAttribute = builder.getAttribute(attributeName, attributeType);

      // 如果在顶点着色器阶段
      if (builder.shaderStage === "vertex") {
        // 直接返回格式化的属性名称
        return builder.format(nodeAttribute.name, attributeType, nodeType);
      } else {
        // 在片段着色器阶段，创建varying变量
        const nodeVarying = varying(this);

        // 构建varying变量
        return nodeVarying.build(builder, nodeType);
      }
    } else {
      // 如果几何体没有此属性，输出警告
      console.warn(`AttributeNode: Vertex attribute "${attributeName}" not found on geometry.`);

      // 生成常量值
      return builder.generateConst(nodeType);
    }
  }

  // 序列化节点数据
  serialize(data) {
    // 调用父类序列化方法
    super.serialize(data);

    // 序列化全局标志和属性名称
    data.global = this.global;
    data._attributeName = this._attributeName;
  }

  // 反序列化节点数据
  deserialize(data) {
    // 调用父类反序列化方法
    super.deserialize(data);

    // 反序列化全局标志和属性名称
    this.global = data.global;
    this._attributeName = data._attributeName;
  }
}

// 导出AttributeNode类作为默认导出
export default AttributeNode;

/**
 * TSL function for creating an attribute node.
 * 用于创建属性节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {string} name - The name of the attribute. 属性的名称。
 * @param {?string} [nodeType=null] - The node type. 节点类型。
 * @returns {AttributeNode}
 */
// 创建属性节点的工厂函数
export const attribute = (name, nodeType = null) => nodeObject(new AttributeNode(name, nodeType));
