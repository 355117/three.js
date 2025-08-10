/**
 * Lighting.js
 *
 * 光照管理器 - 管理场景和相机组合的光照节点
 *
 * 这个渲染器模块管理每个场景和相机组合唯一的光照节点。
 * 光照节点本身稍后在渲染列表中配置场景中的实际光源。
 */

// 导入光照节点和链式映射
import { LightsNode } from "../../nodes/Nodes.js"; // 光照节点类
import ChainMap from "./ChainMap.js"; // 链式映射基类

// 默认光照节点，用于后处理等不需要光照的场景
const _defaultLights = /*@__PURE__*/ new LightsNode();
// 链式键数组，用于临时存储场景和相机的组合键
const _chainKeys = [];

/**
 * 光照管理器类
 *
 * 这个渲染器模块管理每个场景和相机组合唯一的光照节点。
 * 光照节点本身稍后在渲染列表中配置场景中的实际光源。
 *
 * 主要功能：
 * - 为每个场景-相机组合创建唯一的光照节点
 * - 缓存和重用光照节点以提高性能
 * - 处理后处理场景的特殊情况
 * - 管理光照节点的生命周期
 *
 * @private
 * @augments ChainMap
 */
class Lighting extends ChainMap {
  /**
   * 构造光照管理组件
   *
   * 创建光照管理器实例，继承链式映射的功能来管理
   * 场景-相机组合与光照节点的映射关系。
   */
  constructor() {
    // 调用父类构造函数
    super();
  }

  /**
   * 为给定的光源数组创建新的光照节点
   *
   * 创建一个新的光照节点实例，并设置指定的光源数组。
   * 这个方法是光照节点创建的工厂方法。
   *
   * @param {Array<import('../../lights/Light.js').Light>} lights - 光源数组（注释中的"render object"应该是"lights"）
   * @return {import('../../nodes/lighting/LightsNode.js').LightsNode} 光照节点
   */
  createNode(lights = []) {
    // 创建新的光照节点并设置光源
    return new LightsNode().setLights(lights);
  }

  /**
   * 为给定的场景和相机返回光照节点
   *
   * 根据场景和相机的组合获取或创建对应的光照节点。
   * 使用缓存机制避免重复创建相同配置的光照节点。
   *
   * @param {import('../../scenes/Scene.js').Scene} scene - 场景对象
   * @param {import('../../cameras/Camera.js').Camera} camera - 相机对象
   * @return {import('../../nodes/lighting/LightsNode.js').LightsNode} 光照节点
   */
  getNode(scene, camera) {
    // 忽略后处理场景
    // 后处理场景（如全屏四边形）不需要复杂的光照计算
    if (scene.isQuadMesh) return _defaultLights;

    // 构建链式键：场景 + 相机
    _chainKeys[0] = scene;
    _chainKeys[1] = camera;

    // 尝试从缓存中获取光照节点
    let node = this.get(_chainKeys);

    // 如果节点不存在，创建新的节点并缓存
    if (node === undefined) {
      node = this.createNode();
      this.set(_chainKeys, node);
    }

    // 清空临时键数组，准备下次使用
    _chainKeys.length = 0;

    return node;
  }
}

// 导出光照管理器类
export default Lighting;
