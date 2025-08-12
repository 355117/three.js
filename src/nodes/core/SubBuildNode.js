import Node from "./Node.js"; // 导入Node基类
import { nodeObject } from "../tsl/TSLCore.js"; // 导入nodeObject函数

/**
 * 此节点用于在节点系统中构建子构建。
 *
 * @augments Node
 * @param {Node} node - 要在子构建中构建的节点。
 * @param {string} name - 子构建的名称。
 * @param {string|null} [nodeType=null] - 节点的类型（如果已知）。
 */
class SubBuildNode extends Node {
  // 定义SubBuildNode类，继承自Node

  static get type() {
    // 静态getter方法，返回节点类型

    return "SubBuild"; // 返回节点类型字符串
  }

  /**
   * 构造一个新的子构建节点。
   *
   * @param {Node} node - 要在子构建中构建的节点。
   * @param {string} name - 子构建的名称。
   * @param {string|null} [nodeType=null] - 节点的类型（如果已知）。
   */
  constructor(node, name, nodeType = null) {
    // 构造函数，接受节点、名称和类型参数

    super(nodeType); // 调用父类构造函数

    /**
     * 要在子构建中构建的节点。
     *
     * @type {Node}
     */
    this.node = node; // 存储要构建的节点

    /**
     * 子构建的名称。
     *
     * @type {string}
     */
    this.name = name; // 存储子构建名称

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSubBuildNode = true; // 标识这是一个子构建节点对象
  }

  getNodeType(builder) {
    // 获取节点类型的方法

    if (this.nodeType !== null) return this.nodeType; // 如果节点类型已知，直接返回

    builder.addSubBuild(this.name); // 添加子构建到构建器

    const nodeType = this.node.getNodeType(builder); // 获取子节点的类型

    builder.removeSubBuild(); // 从构建器中移除子构建

    return nodeType; // 返回节点类型
  }

  build(builder, ...params) {
    // 构建方法，用于生成着色器代码

    builder.addSubBuild(this.name); // 添加子构建到构建器

    const data = this.node.build(builder, ...params); // 构建子节点并获取数据

    builder.removeSubBuild(); // 从构建器中移除子构建

    return data; // 返回构建数据
  }
}

export default SubBuildNode; // 导出SubBuildNode类作为默认导出

/**
 * 创建一个新的子构建节点。
 *
 * @tsl
 * @function
 * @param {Node} node - 要在子构建中构建的节点。
 * @param {string} name - 子构建的名称。
 * @param {string|null} [type=null] - 节点的类型（如果已知）。
 * @returns {Node} 包装SubBuildNode实例的节点对象。
 */
export const subBuild = (node, name, type = null) => nodeObject(new SubBuildNode(nodeObject(node), name, type)); // 导出subBuild函数，用于创建子构建节点
