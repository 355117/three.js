/**
 * ChainMap.js
 *
 * 链式映射数据结构 - 支持分层键的高性能映射
 *
 * 这是渲染器的数据结构，允许使用链式、分层键定义值。
 * 键应该是对象，因为模块内部使用WeakMap以获得性能优势。
 *
 * 链式映射特别适用于需要多级键查找的场景，如缓存系统、
 * 资源管理等，同时利用WeakMap的弱引用特性避免内存泄漏。
 */

/**
 * 链式映射类
 *
 * 渲染器的数据结构，允许使用链式、分层键定义值。
 * 键应该是对象，因为模块内部使用WeakMap以获得性能优势。
 *
 * 主要特点：
 * - 支持多级键的层次结构
 * - 使用WeakMap确保性能和内存安全
 * - 自动垃圾回收，避免内存泄漏
 * - 适用于复杂的缓存和资源管理场景
 *
 * @private
 */
class ChainMap {
  /**
   * 构造新的链式映射
   *
   * 创建一个新的链式映射实例，初始化根WeakMap。
   * WeakMap的使用确保了当键对象被垃圾回收时，
   * 相关的映射条目也会被自动清理。
   */
  constructor() {
    /**
     * 根WeakMap
     *
     * 链式映射的根节点，所有的键值对都从这里开始。
     * 使用WeakMap确保键对象的弱引用特性。
     *
     * @type {WeakMap}
     */
    this.weakMap = new WeakMap();
  }

  /**
   * 获取给定键数组对应的值
   *
   * 通过键数组进行链式查找，返回最终的值。如果在查找
   * 过程中任何一级键不存在，则返回undefined。
   *
   * @param {Array<Object>} keys - 键列表，按层次顺序排列
   * @return {any} 对应的值，如果未找到则返回`undefined`
   */
  get(keys) {
    // 从根WeakMap开始
    let map = this.weakMap;

    // 遍历除最后一个键之外的所有键
    for (let i = 0; i < keys.length - 1; i++) {
      // 获取下一级的WeakMap
      map = map.get(keys[i]);

      // 如果任何一级不存在，返回undefined
      if (map === undefined) return undefined;
    }

    // 返回最后一级键对应的值
    return map.get(keys[keys.length - 1]);
  }

  /**
   * 为给定的键设置值
   *
   * 通过键数组进行链式设置，如果中间层级不存在，
   * 会自动创建新的WeakMap。
   *
   * @param {Array<Object>} keys - 键列表，按层次顺序排列
   * @param {any} value - 要设置的值
   * @return {ChainMap} 返回此链式映射的引用，支持链式调用
   */
  set(keys, value) {
    // 从根WeakMap开始
    let map = this.weakMap;

    // 遍历除最后一个键之外的所有键
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      // 如果当前键不存在，创建新的WeakMap
      if (map.has(key) === false) map.set(key, new WeakMap());

      // 移动到下一级WeakMap
      map = map.get(key);
    }

    // 在最后一级设置值
    map.set(keys[keys.length - 1], value);

    // 返回this以支持链式调用
    return this;
  }

  /**
   * 删除给定键对应的值
   *
   * 通过键数组进行链式查找并删除最终的值。如果在查找
   * 过程中任何一级键不存在，则返回false。
   *
   * @param {Array<Object>} keys - 键列表，按层次顺序排列
   * @return {boolean} 如果值被成功删除返回`true`，如果值未找到返回`false`
   */
  delete(keys) {
    // 从根WeakMap开始
    let map = this.weakMap;

    // 遍历除最后一个键之外的所有键
    for (let i = 0; i < keys.length - 1; i++) {
      // 获取下一级的WeakMap
      map = map.get(keys[i]);

      // 如果任何一级不存在，返回false
      if (map === undefined) return false;
    }

    // 删除最后一级键对应的值
    return map.delete(keys[keys.length - 1]);
  }
}

// 导出链式映射类
export default ChainMap;
