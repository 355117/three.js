// 导入节点基类
import Node from "./Node.js";
// 导入方法链和节点对象工具函数
import { addMethodChaining, nodeObject } from "../tsl/TSLCore.js";

/**
 * This node can be used as a cache management component for another node.
 * Caching is in general used by default in {@link NodeBuilder} but this node
 * allows the usage of a shared parent cache during the build process.
 * 此节点可用作另一个节点的缓存管理组件。
 * 缓存通常在{@link NodeBuilder}中默认使用，但此节点允许在构建过程中使用共享的父缓存。
 *
 * @augments Node
 */
class CacheNode extends Node {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "CacheNode";
  }

  /**
   * Constructs a new cache node.
   * 构造一个新的缓存节点。
   *
   * @param {Node} node - The node that should be cached. 应该被缓存的节点。
   * @param {boolean} [parent=true] - Whether this node refers to a shared parent cache or not. 此节点是否引用共享的父缓存。
   */
  constructor(node, parent = true) {
    // 调用父类构造函数
    super();

    /**
     * The node that should be cached.
     * 应该被缓存的节点。
     *
     * @type {Node}
     */
    this.node = node;

    /**
     * Whether this node refers to a shared parent cache or not.
     * 此节点是否引用共享的父缓存。
     *
     * @type {boolean}
     * @default true
     */
    this.parent = parent;

    /**
     * This flag can be used for type testing.
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isCacheNode = true;
  }

  // 获取节点类型
  getNodeType(builder) {
    // 保存当前缓存
    const previousCache = builder.getCache();
    // 从当前节点获取缓存
    const cache = builder.getCacheFromNode(this, this.parent);

    // 设置新的缓存
    builder.setCache(cache);

    // 获取被缓存节点的类型
    const nodeType = this.node.getNodeType(builder);

    // 恢复之前的缓存
    builder.setCache(previousCache);

    // 返回节点类型
    return nodeType;
  }

  // 构建节点
  build(builder, ...params) {
    // 保存当前缓存
    const previousCache = builder.getCache();
    // 从当前节点获取缓存
    const cache = builder.getCacheFromNode(this, this.parent);

    // 设置新的缓存
    builder.setCache(cache);

    // 构建被缓存的节点
    const data = this.node.build(builder, ...params);

    // 恢复之前的缓存
    builder.setCache(previousCache);

    // 返回构建数据
    return data;
  }
}

// 导出CacheNode类作为默认导出
export default CacheNode;

/**
 * TSL function for creating a cache node.
 * 用于创建缓存节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {Node} node - The node that should be cached. 应该被缓存的节点。
 * @param {boolean} [parent] - Whether this node refers to a shared parent cache or not. 此节点是否引用共享的父缓存。
 * @returns {CacheNode}
 */
// 创建缓存节点的工厂函数
export const cache = (node, parent) => nodeObject(new CacheNode(nodeObject(node), parent));

// 添加cache方法链
addMethodChaining("cache", cache);
