// 导入链式映射和渲染列表类
import ChainMap from "./ChainMap.js";
import RenderList from "./RenderList.js";

// 用于链式键的临时数组，避免重复创建数组
const _chainKeys = [];

/**
 * 渲染列表管理器
 *
 * 此渲染器模块管理渲染列表，这些列表对于每个场景和相机组合都是唯一的。
 * 它负责创建、缓存和管理不同场景-相机组合的渲染列表。
 *
 * @private
 */
class RenderLists {
  /**
   * 构造渲染列表管理组件
   *
   * @param {Object} lighting - 光照管理组件
   */
  constructor(lighting) {
    /**
     * 光照管理组件
     * 用于为每个渲染列表提供光照节点
     *
     * @type {Object}
     */
    this.lighting = lighting;

    /**
     * 内部链式映射，用于保存渲染列表
     * 使用场景和相机作为复合键来存储对应的渲染列表
     *
     * @type {ChainMap}
     */
    this.lists = new ChainMap();
  }

  /**
   * 为给定的场景和相机返回渲染列表
   * 如果不存在对应的渲染列表，则创建一个新的
   *
   * @param {Object} scene - 场景对象
   * @param {Object} camera - 相机对象
   * @return {RenderList} 渲染列表
   */
  get(scene, camera) {
    // 获取内部链式映射的引用
    const lists = this.lists;

    // 设置复合键：场景和相机
    _chainKeys[0] = scene;
    _chainKeys[1] = camera;

    // 尝试获取现有的渲染列表
    let list = lists.get(_chainKeys);

    // 如果渲染列表不存在，创建新的渲染列表
    if (list === undefined) {
      list = new RenderList(this.lighting, scene, camera);
      // 将新创建的渲染列表存储在映射中
      lists.set(_chainKeys, list);
    }

    // 清空临时键数组，为下次使用做准备
    _chainKeys.length = 0;

    return list;
  }

  /**
   * 释放所有内部资源
   * 清空所有缓存的渲染列表
   */
  dispose() {
    // 重新创建链式映射，释放所有现有的渲染列表
    this.lists = new ChainMap();
  }
}

// 导出渲染列表管理器类
export default RenderLists;
