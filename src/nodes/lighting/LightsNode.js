// 导入核心节点基类
import Node from "../core/Node.js";
// 导入TSL基础函数和类型
import { nodeObject, property, vec3 } from "../tsl/TSLBase.js";
// 导入哈希数组工具函数
import { hashArray } from "../core/NodeUtils.js";

/**
 * 对光源数组按ID进行排序。
 *
 * @param {Array<Light>} lights - 光源数组
 * @return {Array<Light>} 排序后的光源数组
 */
const sortLights = (lights) => {
  return lights.sort((a, b) => a.id - b.id);
};

/**
 * 根据ID在光源节点数组中查找对应的光源节点。
 *
 * @param {number} id - 光源ID
 * @param {Array<LightingNode>} lightNodes - 光源节点数组
 * @return {LightingNode|null} 找到的光源节点或null
 */
const getLightNodeById = (id, lightNodes) => {
  for (const lightNode of lightNodes) {
    if (lightNode.isAnalyticLightNode && lightNode.light.id === id) {
      return lightNode;
    }
  }

  return null;
};

// 用于存储光源节点引用的弱映射，避免内存泄漏
const _lightsNodeRef = /*@__PURE__*/ new WeakMap();
// 用于计算哈希值的临时数组
const _hashData = [];

/**
 * 此节点表示场景的光照，并管理当前构建3D对象的光照模型生命周期。
 * 它负责在给定的光照上下文中计算总的出射光。
 *
 * @augments Node
 */
class LightsNode extends Node {
  // 返回节点类型标识符
  static get type() {
    return "LightsNode";
  }

  /**
   * 构造一个新的光源节点。
   */
  constructor() {
    // 调用父类构造函数，指定输出类型为vec3
    super("vec3");

    /**
     * 表示总漫反射光的节点。
     *
     * @type {Node<vec3>}
     */
    this.totalDiffuseNode = property("vec3", "totalDiffuse");

    /**
     * 表示总镜面反射光的节点。
     *
     * @type {Node<vec3>}
     */
    this.totalSpecularNode = property("vec3", "totalSpecular");

    /**
     * 表示出射光的节点。
     *
     * @type {Node<vec3>}
     */
    this.outgoingLightNode = property("vec3", "outgoingLight");

    /**
     * 表示场景中光源的数组。
     *
     * @private
     * @type {Array<Object>}
     */
    this._lights = [];

    /**
     * 对于场景中的每个光源，此节点将创建一个
     * 对应的光源节点。
     *
     * @private
     * @type {?Array<Object>}
     * @default null
     */
    this._lightNodes = null;

    /**
     * 用于标识当前光源节点设置的哈希值。
     *
     * @private
     * @type {?string}
     * @default null
     */
    this._lightNodesHash = null;

    /**
     * `LightsNode` 默认将此属性设置为 `true`。
     *
     * @type {boolean}
     * @default true
     */
    this.global = true;
  }

  /**
   * 通过将光源数据包含到缓存键中来重写默认的 {@link Node#customCacheKey} 实现。
   *
   * @return {number} 自定义缓存键
   */
  customCacheKey() {
    // 获取光源数组
    const lights = this._lights;

    // 遍历所有光源，收集哈希数据
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];

      // 添加光源ID到哈希数据
      _hashData.push(light.id);
      // 添加阴影投射状态到哈希数据
      _hashData.push(light.castShadow ? 1 : 0);

      // 对于聚光灯，添加额外的哈希数据
      if (light.isSpotLight === true) {
        const hashMap = light.map !== null ? light.map.id : -1;
        const hashColorNode = light.colorNode ? light.colorNode.getCacheKey() : -1;

        _hashData.push(hashMap, hashColorNode);
      }
    }

    // 计算哈希值
    const cacheKey = hashArray(_hashData);

    // 清空哈希数据数组以供下次使用
    _hashData.length = 0;

    return cacheKey;
  }

  /**
   * 计算用于标识当前光源节点设置的哈希值。
   *
   * @param {NodeBuilder} builder - 当前节点构建器的引用
   * @return {string} 计算得出的哈希值
   */
  getHash(builder) {
    // 如果哈希值尚未计算，则计算它
    if (this._lightNodesHash === null) {
      // 如果光源节点尚未设置，先设置它们
      if (this._lightNodes === null) this.setupLightsNode(builder);

      // 收集所有光源节点的哈希值
      const hash = [];

      for (const lightNode of this._lightNodes) {
        hash.push(lightNode.getSelf().getHash());
      }

      // 生成最终的哈希字符串
      this._lightNodesHash = "lights-" + hash.join(",");
    }

    return this._lightNodesHash;
  }

  /**
   * 分析节点并构建其依赖项。
   *
   * @param {NodeBuilder} builder - 节点构建器
   */
  analyze(builder) {
    // 获取节点属性
    const properties = builder.getNodeProperties(this);

    // 构建所有节点
    for (const node of properties.nodes) {
      node.build(builder);
    }

    // 构建输出节点
    properties.outputNode.build(builder);
  }

  /**
   * 为每个场景光源创建光照节点。这使得在节点系统中进一步
   * 处理光源成为可能。
   *
   * @param {NodeBuilder} builder - 当前节点构建器的引用
   */
  setupLightsNode(builder) {
    // 初始化光源节点数组
    const lightNodes = [];

    // 获取之前的光源节点（用于重用）
    const previousLightNodes = this._lightNodes;

    // 对光源进行排序以确保一致性
    const lights = sortLights(this._lights);
    // 获取节点库
    const nodeLibrary = builder.renderer.library;

    // 遍历所有光源
    for (const light of lights) {
      // 如果光源本身就是节点，直接添加
      if (light.isNode) {
        lightNodes.push(nodeObject(light));
      } else {
        // 对于普通光源，创建对应的光源节点
        let lightNode = null;

        // 尝试重用之前的光源节点
        if (previousLightNodes !== null) {
          lightNode = getLightNodeById(light.id, previousLightNodes); // 重用现有的光源节点
        }

        // 如果没有找到可重用的节点，创建新的
        if (lightNode === null) {
          // 为给定光源找到对应的节点类型

          const lightNodeClass = nodeLibrary.getLightNodeClass(light.constructor);

          if (lightNodeClass === null) {
            console.warn(`LightsNode.setupNodeLights: Light node not found for ${light.constructor.name}`);
            continue;
          }

          let lightNode = null;

          // 检查是否已经为此光源创建了节点
          if (!_lightsNodeRef.has(light)) {
            lightNode = nodeObject(new lightNodeClass(light));
            _lightsNodeRef.set(light, lightNode);
          } else {
            lightNode = _lightsNodeRef.get(light);
          }

          lightNodes.push(lightNode);
        }
      }
    }

    // 设置光源节点数组
    this._lightNodes = lightNodes;
  }

  /**
   * 在光照模型中设置直接光照。
   *
   * @param {Object} builder - 包含上下文和堆栈的构建器对象
   * @param {Object} lightNode - 光源节点
   * @param {Object} lightData - 包含颜色和方向属性的光源对象
   */
  setupDirectLight(builder, lightNode, lightData) {
    // 从构建器上下文中获取光照模型和反射光
    const { lightingModel, reflectedLight } = builder.context;

    // 调用光照模型的直接光照方法
    lightingModel.direct(
      {
        ...lightData,
        lightNode,
        reflectedLight,
      },
      builder
    );
  }

  /**
   * 设置直接矩形区域光照。
   *
   * @param {Object} builder - 构建器对象
   * @param {Object} lightNode - 光源节点
   * @param {Object} lightData - 光源数据
   */
  setupDirectRectAreaLight(builder, lightNode, lightData) {
    // 从构建器上下文中获取光照模型和反射光
    const { lightingModel, reflectedLight } = builder.context;

    // 调用光照模型的直接矩形区域光照方法
    lightingModel.directRectArea(
      {
        ...lightData,
        lightNode,
        reflectedLight,
      },
      builder
    );
  }

  /**
   * 通过构建所有相应的光源节点来设置内部光源。
   *
   * @param {NodeBuilder} builder - 当前节点构建器的引用
   * @param {Array<Object>} lightNodes - 光源节点数组
   */
  setupLights(builder, lightNodes) {
    // 构建所有光源节点
    for (const lightNode of lightNodes) {
      lightNode.build(builder);
    }
  }

  /**
   * 获取光源节点数组。
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @return {Array<Object>} 光源节点数组
   */
  getLightNodes(builder) {
    // 如果光源节点尚未设置，先设置它们
    if (this._lightNodes === null) this.setupLightsNode(builder);

    return this._lightNodes;
  }

  /**
   * 该实现确保场景中的每个光源都有对应的光源节点。
   * 通过构建光源节点和评估光照模型来计算出射光。
   *
   * @param {NodeBuilder} builder - 当前节点构建器的引用
   * @return {Node<vec3>} 表示出射光的节点
   */
  setup(builder) {
    // 保存当前的光源节点
    const currentLightsNode = builder.lightsNode;

    // 设置当前节点为构建器的光源节点
    builder.lightsNode = this;

    // 获取出射光节点
    let outgoingLightNode = this.outgoingLightNode;

    // 获取构建器上下文和光照模型
    const context = builder.context;
    const lightingModel = context.lightingModel;

    // 获取节点属性
    const properties = builder.getNodeProperties(this);

    // 如果存在光照模型，进行光照计算
    if (lightingModel) {
      // 获取总漫反射和总镜面反射节点
      const { totalDiffuseNode, totalSpecularNode } = this;

      // 设置上下文的出射光
      context.outgoingLight = outgoingLightNode;

      // 添加新的堆栈
      const stack = builder.addStack();

      // 设置属性节点
      properties.nodes = stack.nodes;

      // 启动光照模型
      lightingModel.start(builder);

      // 获取背景和背景透明度
      const { backdrop, backdropAlpha } = context;
      // 获取反射光的各个分量
      const { directDiffuse, directSpecular, indirectDiffuse, indirectSpecular } = context.reflectedLight;

      // 计算总漫反射光（直接漫反射 + 间接漫反射）
      let totalDiffuse = directDiffuse.add(indirectDiffuse);

      // 如果有背景，处理背景混合
      if (backdrop !== null) {
        if (backdropAlpha !== null) {
          // 使用背景透明度混合总漫反射和背景
          totalDiffuse = vec3(backdropAlpha.mix(totalDiffuse, backdrop));
        } else {
          // 直接使用背景
          totalDiffuse = vec3(backdrop);
        }

        // 设置材质为透明
        context.material.transparent = true;
      }

      // 分配总漫反射光
      totalDiffuseNode.assign(totalDiffuse);
      // 分配总镜面反射光（直接镜面反射 + 间接镜面反射）
      totalSpecularNode.assign(directSpecular.add(indirectSpecular));

      // 计算最终的出射光（总漫反射 + 总镜面反射）
      outgoingLightNode.assign(totalDiffuseNode.add(totalSpecularNode));

      // 完成光照模型计算
      lightingModel.finish(builder);

      // 移除堆栈并绕过节点
      outgoingLightNode = outgoingLightNode.bypass(builder.removeStack());
    } else {
      // 如果没有光照模型，设置空的节点数组
      properties.nodes = [];
    }

    // 恢复之前的光源节点
    builder.lightsNode = currentLightsNode;

    return outgoingLightNode;
  }

  /**
   * 使用光源数组配置此节点。
   *
   * @param {Array<Object>} lights - 光源数组
   * @return {LightsNode} 此节点的引用
   */
  setLights(lights) {
    // 设置光源数组
    this._lights = lights;

    // 重置光源节点和哈希值，强制重新计算
    this._lightNodes = null;
    this._lightNodesHash = null;

    return this;
  }

  /**
   * 返回场景光源的数组。
   *
   * @return {Array<Object>} 场景的光源数组
   */
  getLights() {
    return this._lights;
  }

  /**
   * 场景是否有光源。
   *
   * @type {boolean}
   */
  get hasLights() {
    return this._lights.length > 0;
  }
}

// 导出光源节点类作为默认导出
export default LightsNode;

/**
 * TSL函数，用于创建 `LightsNode` 实例并使用给定的光源数组进行配置。
 *
 * @tsl
 * @function
 * @param {Array<Object>} lights - 光源数组
 * @return {LightsNode} 创建的光源节点
 */
export const lights = (lights = []) => nodeObject(new LightsNode()).setLights(lights);
