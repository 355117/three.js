// 导入基础节点类
import Node from "../core/Node.js";

/**
 * 成员访问节点类，用于表示对类对象节点数据结构的成员访问。
 *
 * 该类封装了对对象类型节点中特定属性的访问操作，
 * 类似于JavaScript中的点号操作符（obj.property）。
 * 在着色器代码生成时，会转换为相应的成员访问语法。
 *
 * 常见的使用场景包括：
 * - 访问向量的分量：vec3.x, vec3.y, vec3.z
 * - 访问结构体的字段：material.diffuse, light.position
 * - 访问纹理的属性：texture.rgb, texture.a
 *
 * @augments Node
 */
class MemberNode extends Node {
  /**
   * 获取节点类型标识符。
   *
   * @static
   * @return {string} 返回'MemberNode'类型标识符。
   */
  static get type() {
    return "MemberNode";
  }

  /**
   * 构造一个成员访问节点。
   *
   * @param {Node} node - 要访问成员的对象节点。
   * @param {string} property - 要访问的属性名称。
   */
  constructor(node, property) {
    super();

    /**
     * 要访问成员的对象节点。
     *
     * 该节点应该是一个具有可访问成员的数据结构，
     * 如向量、矩阵、结构体或其他复合类型。
     *
     * @type {Node}
     */
    this.node = node;

    /**
     * 要访问的属性名称。
     *
     * 属性名称是一个字符串，指定要访问的具体成员。
     * 例如：'x', 'y', 'z'（向量分量）或 'rgb', 'a'（颜色分量）。
     *
     * @type {string}
     */
    this.property = property;

    /**
     * 类型测试标志，用于识别MemberNode实例。
     *
     * 该标志可用于运行时类型检查，
     * 快速判断一个节点是否为MemberNode类型。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMemberNode = true;
  }

  /**
   * 获取节点的数据类型。
   *
   * 该方法通过调用源节点的getMemberType方法来确定
   * 被访问成员的类型。不同的属性可能具有不同的类型，
   * 例如vec3.x返回float类型，而vec3.xy返回vec2类型。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 成员的数据类型。
   */
  getNodeType(builder) {
    return this.node.getMemberType(builder, this.property);
  }

  /**
   * 生成着色器代码。
   *
   * 该方法生成成员访问的着色器代码，格式为 `object.property`。
   * 这是标准的着色器语言成员访问语法。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 生成的着色器代码片段。
   */
  generate(builder) {
    // 构建对象节点的代码片段
    const propertyName = this.node.build(builder);

    // 返回成员访问的着色器代码
    return propertyName + "." + this.property;
  }
}

// 导出MemberNode类作为默认导出
export default MemberNode;
