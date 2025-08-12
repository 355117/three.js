// 全局ID计数器，用于为每个NodeCache实例分配唯一的ID
let _id = 0;

/**
 * 此工具类在 {@link NodeBuilder} 中用作节点数据的内部缓存数据结构。
 *
 * NodeCache类实现了一个层次化的缓存系统，支持父子缓存关系。
 * 它使用WeakMap来存储节点数据，确保当节点被垃圾回收时，相关的缓存数据也会被自动清理。
 * 这种设计避免了内存泄漏，同时提供了高效的数据查找机制。
 */
class NodeCache {
  /**
   * 构造一个新的节点缓存。
   *
   * 此构造函数初始化一个NodeCache实例，可以选择性地指定一个父缓存。
   * 当指定父缓存时，形成层次化的缓存结构，子缓存可以从父缓存中查找数据。
   *
   * @param {?NodeCache} parent - 父缓存的引用，用于建立缓存层次结构
   */
  constructor(parent = null) {
    /**
     * 缓存的唯一标识符。
     * 每个NodeCache实例都有一个唯一的ID，用于调试和跟踪。
     *
     * @type {number}
     * @readonly
     */
    this.id = _id++;

    /**
     * 用于管理节点数据的弱映射。
     * 使用WeakMap确保当节点对象被垃圾回收时，相关的缓存数据也会被自动清理。
     * 键是Node对象，值是与该节点关联的任意数据对象。
     *
     * @type {WeakMap<Node, Object>}
     */
    this.nodesData = new WeakMap();

    /**
     * 父节点缓存的引用。
     * 用于建立缓存层次结构，当前缓存中找不到数据时可以向父缓存查找。
     *
     * @type {?NodeCache}
     * @default null
     */
    this.parent = parent;
  }

  /**
   * 返回给定节点的数据。
   *
   * 此方法首先在当前缓存中查找节点数据，如果找不到且存在父缓存，
   * 则递归地在父缓存中查找。这实现了缓存的层次化查找机制。
   *
   * @param {Node} node - 要查找数据的节点
   * @return {?Object} 节点的数据，如果未找到则返回undefined
   */
  getData(node) {
    // 首先在当前缓存的WeakMap中查找节点数据
    let data = this.nodesData.get(node);

    // 如果当前缓存中没有找到数据，且存在父缓存
    if (data === undefined && this.parent !== null) {
      // 递归地在父缓存中查找数据
      data = this.parent.getData(node);
    }

    // 返回找到的数据，如果都没找到则返回undefined
    return data;
  }

  /**
   * 为给定节点设置数据。
   *
   * 此方法将节点数据存储在当前缓存的WeakMap中。
   * 数据只会存储在当前缓存中，不会影响父缓存或子缓存。
   *
   * @param {Node} node - 要设置数据的节点
   * @param {Object} data - 要缓存的数据对象
   */
  setData(node, data) {
    // 将节点和数据的映射关系存储在WeakMap中
    this.nodesData.set(node, data);
  }
}

export default NodeCache;
