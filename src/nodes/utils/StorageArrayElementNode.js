/**
 * StorageArrayElementNode.js - 存储缓冲区数组元素节点
 *
 * 该文件实现了对存储缓冲区节点实例的元素访问功能。
 * 主要用于GPU计算着色器中的数据访问。
 */

// 导入TSL基础工具
import { nodeProxy } from "../tsl/TSLBase.js";
// 导入数组元素节点基类
import ArrayElementNode from "./ArrayElementNode.js";

/**
 * 存储缓冲区数组元素节点类
 *
 * 该类为存储缓冲区节点实例提供元素访问功能。
 * 在大多数情况下，通过 StorageBufferNode 的 element 方法间接使用。
 *
 * 使用示例：
 * ```js
 * const position = positionStorage.element( instanceIndex );
 * ```
 *
 * @augments ArrayElementNode
 */
class StorageArrayElementNode extends ArrayElementNode {
  /**
   * 获取节点类型名称
   * @returns {string} 返回 'StorageArrayElementNode'
   */
  static get type() {
    return "StorageArrayElementNode";
  }

  /**
   * 构造存储缓冲区元素节点
   *
   * @param {StorageBufferNode} storageBufferNode - 存储缓冲区节点
   * @param {Node} indexNode - 定义元素访问的索引节点
   */
  constructor(storageBufferNode, indexNode) {
    super(storageBufferNode, indexNode);

    /**
     * 用于类型测试的标志
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isStorageArrayElementNode = true;
  }

  /**
   * 设置存储缓冲区节点
   *
   * @param {Node} value - 存储缓冲区节点值
   * @type {StorageBufferNode}
   */
  set storageBufferNode(value) {
    this.node = value;
  }

  /**
   * 获取存储缓冲区节点
   *
   * @returns {StorageBufferNode} 存储缓冲区节点
   */
  get storageBufferNode() {
    return this.node;
  }

  /**
   * 获取结构体成员类型
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @param {string} name - 成员名称
   * @returns {string} 成员类型
   */
  getMemberType(builder, name) {
    const structTypeNode = this.storageBufferNode.structTypeNode;

    if (structTypeNode) {
      return structTypeNode.getMemberType(builder, name);
    }

    return "void";
  }

  /**
   * 设置节点构建逻辑
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @returns {*} 父类setup方法的返回值
   */
  setup(builder) {
    // 如果不支持存储缓冲区，检查是否为PBO
    if (builder.isAvailable("storageBuffer") === false) {
      if (this.node.isPBO === true) {
        builder.setupPBO(this.node);
      }
    }

    return super.setup(builder);
  }

  /**
   * 生成着色器代码
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @param {string} output - 输出类型
   * @returns {string} 生成的着色器代码片段
   */
  generate(builder, output) {
    let snippet;

    // 检查是否在赋值上下文中
    const isAssignContext = builder.context.assign;

    // 根据存储缓冲区支持情况生成不同的代码
    if (builder.isAvailable("storageBuffer") === false) {
      // 如果不支持存储缓冲区，使用PBO或直接构建节点
      if (this.node.isPBO === true && isAssignContext !== true && (this.node.value.isInstancedBufferAttribute || builder.shaderStage !== "compute")) {
        // 生成PBO访问代码
        snippet = builder.generatePBO(this);
      } else {
        // 直接构建节点
        snippet = this.node.build(builder);
      }
    } else {
      // 支持存储缓冲区，使用父类方法
      snippet = super.generate(builder);
    }

    // 如果不在赋值上下文中，格式化输出
    if (isAssignContext !== true) {
      const type = this.getNodeType(builder);
      snippet = builder.format(snippet, type, output);
    }

    return snippet;
  }
}

// 导出默认类
export default StorageArrayElementNode;

/**
 * TSL 函数：创建存储元素节点
 *
 * @tsl
 * @function
 * @param {StorageBufferNode} storageBufferNode - 存储缓冲区节点
 * @param {Node} indexNode - 定义元素访问的索引节点
 * @returns {StorageArrayElementNode} 创建的存储数组元素节点实例
 */
export const storageElement = /*@__PURE__*/ nodeProxy(StorageArrayElementNode).setParameterLength(2);
