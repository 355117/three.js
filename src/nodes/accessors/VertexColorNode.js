// 导入属性节点基类
import AttributeNode from "../core/AttributeNode.js";
// 导入节点对象包装器
import { nodeObject } from "../tsl/TSLBase.js";
// 导入4D向量类
import { Vector4 } from "../../math/Vector4.js";

/**
 * 顶点颜色节点 - 用于表示顶点颜色的属性节点
 *
 * @augments AttributeNode
 */
class VertexColorNode extends AttributeNode {
  // 返回节点类型标识符
  static get type() {
    return "VertexColorNode";
  }

  /**
   * 构造一个新的顶点颜色节点
   *
   * @param {number} index - 属性索引
   */
  constructor(index) {
    // 调用父类构造函数，类型为vec4
    super(null, "vec4");

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isVertexColorNode = true;

    /**
     * 属性索引，用于启用多组顶点颜色
     *
     * @type {number}
     * @default 0
     */
    this.index = index;
  }

  /**
   * 通过考虑属性索引重写默认实现
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 属性名称
   */
  getAttributeName(/*builder*/) {
    const index = this.index;

    // 返回颜色属性名称：color、color1、color2等
    return "color" + (index > 0 ? index : "");
  }

  /**
   * 生成顶点颜色节点的代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 生成的代码片段
   */
  generate(builder) {
    // 获取属性名称
    const attributeName = this.getAttributeName(builder);
    // 检查几何体是否有该属性
    const geometryAttribute = builder.hasGeometryAttribute(attributeName);

    let result;

    if (geometryAttribute === true) {
      // 如果几何体有颜色属性，使用父类生成方法
      result = super.generate(builder);
    } else {
      // 顶点颜色回退应该是白色
      result = builder.generateConst(this.nodeType, new Vector4(1, 1, 1, 1));
    }

    return result;
  }

  /**
   * 序列化顶点颜色节点数据
   *
   * @param {Object} data - 序列化数据对象
   */
  serialize(data) {
    // 调用父类序列化方法
    super.serialize(data);

    // 序列化索引
    data.index = this.index;
  }

  /**
   * 反序列化顶点颜色节点数据
   *
   * @param {Object} data - 反序列化数据对象
   */
  deserialize(data) {
    // 调用父类反序列化方法
    super.deserialize(data);

    // 反序列化索引
    this.index = data.index;
  }
}

// 导出VertexColorNode类作为默认导出
export default VertexColorNode;

/**
 * TSL函数 - 用于创建顶点颜色节点
 *
 * @tsl
 * @function
 * @param {number} [index=0] - 属性索引（0表示color，1表示color1，以此类推）
 * @returns {VertexColorNode}
 */
export const vertexColor = (index = 0) => nodeObject(new VertexColorNode(index));
