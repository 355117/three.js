import Node from "./Node.js"; // 导入Node基类
import { getByteBoundaryFromType, getMemoryLengthFromType } from "./NodeUtils.js"; // 导入类型工具函数

/**
 * 为结构成员生成布局。
 * 此函数接受表示结构成员的对象，并返回成员布局数组。
 * 每个成员布局包括成员的名称、类型和是否为原子类型。
 *
 * @param {Object.<string, string|Object>} members - 一个对象，其中键是成员名称，值是类型（字符串）或具有类型和原子属性的对象。
 * @returns {Array.<{name: string, type: string, atomic: boolean}>} 成员布局数组。
 */
function getMembersLayout(members) {
  // 定义获取成员布局的函数

  return Object.entries(members).map(([name, value]) => {
    // 将成员对象转换为数组并映射

    if (typeof value === "string") {
      // 如果值是字符串

      return { name, type: value, atomic: false }; // 返回包含名称、类型和非原子标志的对象
    }

    return { name, type: value.type, atomic: value.atomic || false }; // 返回包含名称、类型和原子标志的对象
  });
}

/**
 * 表示基于节点系统中的结构类型节点。
 * 此类用于定义和管理结构成员的布局和类型。
 * 它扩展了基础Node类，并提供获取结构长度、
 * 检索成员类型和为构建器生成结构类型的方法。
 *
 * @augments Node
 */
class StructTypeNode extends Node {
  // 定义StructTypeNode类，继承自Node

  static get type() {
    // 静态getter方法，返回节点类型

    return "StructTypeNode"; // 返回节点类型字符串
  }

  /**
   * 创建StructTypeNode的实例。
   *
   * @param {Object} membersLayout - 结构成员的布局。
   * @param {?string} [name=null] - 结构的可选名称。
   */
  constructor(membersLayout, name = null) {
    // 构造函数，接受成员布局和可选名称

    super("struct"); // 调用父类构造函数，类型为struct

    /**
     * 结构成员的布局
     *
     * @type {Array.<{name: string, type: string, atomic: boolean}>}
     */
    this.membersLayout = getMembersLayout(membersLayout); // 获取并存储成员布局

    /**
     * 结构的名称。
     *
     * @type {?string}
     * @default null
     */
    this.name = name; // 存储结构名称

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isStructLayoutNode = true; // 标识这是一个结构布局节点对象
  }

  /**
   * 返回结构的长度。
   * 长度通过对结构成员长度求和来计算。
   *
   * @returns {number} 结构的长度。
   */
  getLength() {
    // 获取结构长度的方法
    const GPU_CHUNK_BYTES = 8; // GPU块字节数常量
    const BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT; // 每个元素的字节数

    let offset = 0; // 全局缓冲区偏移量（以字节为单位）

    for (const member of this.membersLayout) {
      // 遍历所有成员布局
      const type = member.type; // 获取成员类型

      const itemSize = getMemoryLengthFromType(type) * BYTES_PER_ELEMENT; // 计算项目大小
      const boundary = getByteBoundaryFromType(type); // 获取字节边界

      const chunkOffset = offset % GPU_CHUNK_BYTES; // 当前块中的偏移量
      const chunkPadding = chunkOffset % boundary; // 匹配边界所需的填充
      const chunkStart = chunkOffset + chunkPadding; // 数据在当前块中的起始位置

      offset += chunkPadding; // 添加填充到偏移量

      // 检查块溢出
      if (chunkStart !== 0 && GPU_CHUNK_BYTES - chunkStart < itemSize) {
        // 如果块溢出
        // 在块末尾添加填充
        offset += GPU_CHUNK_BYTES - chunkStart; // 添加块末尾填充
      }

      offset += itemSize; // 添加项目大小到偏移量
    }

    return (Math.ceil(offset / GPU_CHUNK_BYTES) * GPU_CHUNK_BYTES) / BYTES_PER_ELEMENT; // 返回计算的长度
  }

  /**
   * 获取指定成员的类型。
   *
   * @param {NodeBuilder} builder - 节点构建器（未使用）。
   * @param {string} name - 成员名称。
   * @returns {string} 成员类型。
   */
  getMemberType(builder, name) {
    // 获取成员类型的方法
    const member = this.membersLayout.find((m) => m.name === name); // 查找指定名称的成员

    return member ? member.type : "void"; // 返回成员类型或void
  }

  /**
   * 获取节点类型。
   *
   * @param {NodeBuilder} builder - 节点构建器。
   * @returns {string} 节点类型名称。
   */
  getNodeType(builder) {
    // 获取节点类型的方法
    const structType = builder.getStructTypeFromNode(this, this.membersLayout, this.name); // 从构建器获取结构类型

    return structType.name; // 返回结构类型名称
  }

  /**
   * 设置节点。
   *
   * @param {NodeBuilder} builder - 节点构建器。
   */
  setup(builder) {
    // 设置方法
    builder.addInclude(this); // 将此节点添加到构建器的包含列表中
  }

  /**
   * 生成着色器代码。
   *
   * @param {NodeBuilder} builder - 节点构建器。
   * @returns {string} 生成的代码。
   */
  generate(builder) {
    // 生成方法
    return this.getNodeType(builder); // 返回节点类型
  }
}

export default StructTypeNode; // 导出StructTypeNode类作为默认导出
