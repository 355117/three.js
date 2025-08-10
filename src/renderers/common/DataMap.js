/**
 * DataMap.js
 *
 * 数据映射 - 渲染器的数据结构
 *
 * 渲染器的数据结构，用于在字典中管理对象的数据。
 * 这是一个基础的数据管理类，为渲染器的各个组件提供
 * 统一的对象数据存储和访问接口。
 */

/**
 * 数据映射类
 *
 * 渲染器的数据结构，用于在字典中管理对象的数据。
 * 使用WeakMap作为内部存储，确保内存安全和自动垃圾回收。
 *
 * 主要用途：
 * - 为渲染器对象关联额外的数据
 * - 提供统一的数据访问接口
 * - 确保内存安全的数据管理
 * - 支持对象的生命周期管理
 *
 * @private
 */
class DataMap {
  /**
   * 构造新的数据映射
   *
   * 创建一个新的数据映射实例，初始化内部的WeakMap数据结构。
   */
  constructor() {
    /**
     * 内部数据存储
     *
     * `DataMap`内部使用WeakMap来管理其数据。WeakMap的弱引用
     * 特性确保当对象被垃圾回收时，相关的数据也会被自动清理。
     *
     * @type {WeakMap}
     */
    this.data = new WeakMap();
  }

  /**
   * 获取给定对象的字典
   *
   * 返回与对象关联的数据字典。如果对象还没有关联字典，
   * 会自动创建一个空的字典对象。
   *
   * @param {Object} object - 要获取字典的对象
   * @return {Object} 对象的数据字典
   */
  get(object) {
    // 尝试获取对象的关联字典
    let map = this.data.get(object);

    // 如果字典不存在，创建新的空字典对象
    if (map === undefined) {
      map = {};
      this.data.set(object, map);
    }

    return map;
  }

  /**
   * 删除给定对象的字典
   *
   * 从数据映射中删除对象及其关联的字典。如果对象存在关联字典，
   * 返回被删除的字典；否则返回null。
   *
   * @param {Object} object - 要删除字典的对象
   * @return {?Object} 被删除的字典，如果不存在则返回null
   */
  delete(object) {
    let map = null;

    // 检查对象是否有关联字典
    if (this.data.has(object)) {
      // 获取字典并从映射中删除
      map = this.data.get(object);

      this.data.delete(object);
    }

    return map;
  }

  /**
   * 检查给定对象是否有已定义的字典
   *
   * 检查对象是否在数据映射中有关联的字典。
   *
   * @param {Object} object - 要测试的对象
   * @return {boolean} 是否定义了字典
   */
  has(object) {
    // 直接使用WeakMap的has方法检查
    return this.data.has(object);
  }

  /**
   * 释放内部资源
   *
   * 清理数据映射，释放所有关联的字典。创建新的WeakMap
   * 实例来替换旧的，确保所有数据都被清理。
   */
  dispose() {
    // 创建新的WeakMap实例，释放所有旧数据
    this.data = new WeakMap();
  }
}

// 导出数据映射类
export default DataMap;
