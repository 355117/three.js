// 导入节点基类
import Node from "../core/Node.js";
// 导入节点代理函数
import { nodeProxy } from "../tsl/TSLBase.js";

/**
 * 纹理尺寸节点 - 表示纹理尺寸的节点。纹理尺寸通过内置着色器函数
 * 如 `textureDimensions()` 或 `textureSize()` 在着色器中检索
 *
 * @augments Node
 */
class TextureSizeNode extends Node {
  // 返回节点类型标识符
  static get type() {
    return "TextureSizeNode";
  }

  /**
   * 构造一个新的纹理尺寸节点
   *
   * @param {TextureNode} textureNode - 应检索尺寸的纹理节点
   * @param {?Node<int>} [levelNode=null] - 定义请求的mip级别的级别节点
   */
  constructor(textureNode, levelNode = null) {
    // 调用父类构造函数，返回类型为uvec2
    super("uvec2");

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isTextureSizeNode = true;

    /**
     * 应检索尺寸的纹理节点
     *
     * @type {TextureNode}
     */
    this.textureNode = textureNode;

    /**
     * 定义请求的mip级别的级别节点
     *
     * @type {Node<int>}
     * @default null
     */
    this.levelNode = levelNode;
  }

  /**
   * 生成纹理尺寸节点的代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {string} output - 当前输出
   * @return {string} 生成的代码片段
   */
  generate(builder, output) {
    // 构建纹理属性代码
    const textureProperty = this.textureNode.build(builder, "property");
    // 构建级别代码，如果没有级别节点则使用'0'
    const level = this.levelNode === null ? "0" : this.levelNode.build(builder, "int");

    // 格式化并返回纹理尺寸函数调用
    return builder.format(`${builder.getMethod("textureDimensions")}( ${textureProperty}, ${level} )`, this.getNodeType(builder), output);
  }
}

// 导出TextureSizeNode类作为默认导出
export default TextureSizeNode;

/**
 * TSL函数 - 用于创建纹理尺寸节点
 *
 * @tsl
 * @function
 * @param {TextureNode} textureNode - 应检索尺寸的纹理节点
 * @param {?Node<int>} [levelNode=null] - 定义请求的mip级别的级别节点
 * @returns {TextureSizeNode}
 */
export const textureSize = /*@__PURE__*/ nodeProxy(TextureSizeNode).setParameterLength(1, 2);
