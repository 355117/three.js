/**
 * Nodes.js
 *
 * 节点管理器 - 渲染器与节点系统的主要接口
 *
 * 这个渲染器模块管理与节点相关的对象，是渲染器和节点系统之间的主要接口。
 * 它负责：
 * 1. 节点构建器状态的缓存和管理
 * 2. 场景环境、背景、雾效的节点化表示
 * 3. 节点更新生命周期的管理
 * 4. 渲染对象的缓存键计算
 * 5. 输出节点的管理和色调映射
 *
 * 主要功能：
 * - 为渲染对象创建和缓存节点构建器状态
 * - 管理场景属性（环境、背景、雾）的节点表示
 * - 处理节点的更新生命周期
 * - 提供高效的缓存机制
 */

// 导入核心数据结构
import DataMap from "../DataMap.js"; // 数据映射基类
import ChainMap from "../ChainMap.js"; // 链式映射，用于复合键缓存
import NodeBuilderState from "./NodeBuilderState.js"; // 节点构建器状态

// 导入节点相关模块
import { cubeMapNode } from "../../../nodes/utils/CubeMapNode.js"; // 立方体贴图节点
import { NodeFrame } from "../../../nodes/Nodes.js"; // 节点帧管理器

// 导入TSL（Three.js Shading Language）节点
import {
  objectGroup, // 对象组（每个对象更新）
  renderGroup, // 渲染组（每次渲染更新）
  frameGroup, // 帧组（每帧更新）
  cubeTexture, // 立方体纹理节点
  texture, // 纹理节点
  texture3D, // 3D纹理节点
  vec3, // 三维向量节点
  fog, // 雾效节点
  rangeFogFactor, // 线性雾因子
  densityFogFactor, // 指数雾因子
  reference, // 引用节点
  pmremTexture, // PMREM纹理节点
  screenUV, // 屏幕UV坐标
} from "../../../nodes/TSL.js";

import { builtin } from "../../../nodes/accessors/BuiltinNode.js"; // 内置变量节点

// 导入常量和工具函数
import {
  CubeUVReflectionMapping, // 立方体UV反射映射
  EquirectangularReflectionMapping, // 等距柱状反射映射
  EquirectangularRefractionMapping, // 等距柱状折射映射
} from "../../../constants.js";
import { hashArray } from "../../../nodes/core/NodeUtils.js"; // 数组哈希函数

// ===== 模块级缓存变量 =====

/**
 * 输出节点映射
 *
 * 用于缓存输出目标与其对应的缓存键的映射关系。
 * 帮助检测输出配置（色调映射、颜色空间）的变化。
 */
const _outputNodeMap = new WeakMap();

/**
 * 链式键数组
 *
 * 临时数组，用于构建复合缓存键。重复使用以减少内存分配。
 */
const _chainKeys = [];

/**
 * 缓存键值数组
 *
 * 临时数组，用于收集缓存键的各个组成部分。重复使用以减少内存分配。
 */
const _cacheKeyValues = [];

/**
 * 节点管理器类
 *
 * 这个渲染器模块管理与节点相关的对象，是渲染器和节点系统之间的主要接口。
 * 它扩展了DataMap，提供了高效的数据存储和检索机制。
 *
 * @private
 * @augments DataMap
 */
class Nodes extends DataMap {
  /**
   * 构造新的节点管理组件
   *
   * 初始化节点管理器的所有核心组件，包括缓存系统、节点帧管理器等。
   * 这个管理器将作为渲染器和节点系统之间的桥梁。
   *
   * @param {import('../../Renderer.js').Renderer} renderer - 渲染器实例
   * @param {import('../Backend.js').Backend} backend - 渲染器的后端实例
   */
  constructor(renderer, backend) {
    // 调用父类DataMap的构造函数
    super();

    /**
     * 渲染器实例
     *
     * 对Three.js渲染器的引用，用于访问渲染配置、状态和方法。
     *
     * @type {import('../../Renderer.js').Renderer}
     */
    this.renderer = renderer;

    /**
     * 渲染器后端实例
     *
     * 对渲染器后端的引用，用于创建节点构建器和访问后端特定功能。
     *
     * @type {import('../Backend.js').Backend}
     */
    this.backend = backend;

    /**
     * 节点帧管理器
     *
     * 管理节点的帧级状态和更新，包括时间、渲染ID、帧ID等信息。
     * 用于协调节点的更新生命周期。
     *
     * @type {import('../../../nodes/Nodes.js').NodeFrame}
     */
    this.nodeFrame = new NodeFrame();

    /**
     * 节点构建器状态缓存
     *
     * 缓存已构建的节点构建器状态，键为缓存键，值为NodeBuilderState实例。
     * 这样可以避免重复构建相同的着色器和绑定。
     *
     * @type {Map<number,NodeBuilderState>}
     */
    this.nodeBuilderCache = new Map();

    /**
     * 调用哈希缓存
     *
     * 用于管理数据缓存键数据的链式映射。主要用于缓存场景和光照节点
     * 组合的哈希值，避免重复计算。
     *
     * @type {ChainMap}
     */
    this.callHashCache = new ChainMap();

    /**
     * 组数据缓存
     *
     * 用于管理节点uniform组数据的链式映射。缓存组节点和uniform组
     * 的版本信息，用于判断是否需要更新。
     *
     * @type {ChainMap}
     */
    this.groupsData = new ChainMap();

    /**
     * 缓存库
     *
     * 用于管理场景属性（如雾、环境）的节点对象缓存。
     * 键为属性类型字符串，值为WeakMap实例。
     *
     * @type {Object<string,WeakMap>}
     */
    this.cacheLib = {};
  }

  /**
   * 检查给定的节点uniform组是否需要更新
   *
   * 根据不同类型的uniform组采用不同的更新策略：
   * - objectGroup: 总是更新（每个对象都有独特的数据）
   * - renderGroup: 每次渲染/计算调用更新一次
   * - frameGroup: 每帧更新一次
   * - 其他组: 仅当groupNode.needsUpdate为true时更新
   *
   * 这种分层的更新策略可以最大化性能，避免不必要的GPU数据传输。
   *
   * @param {import('../../../nodes/core/NodeUniformsGroup.js').NodeUniformsGroup} nodeUniformsGroup - 节点uniform组
   * @return {boolean} 节点uniform组是否需要更新
   */
  updateGroup(nodeUniformsGroup) {
    const groupNode = nodeUniformsGroup.groupNode;
    const name = groupNode.name;

    // objectGroup总是更新
    // 因为每个对象都可能有不同的变换矩阵、材质属性等
    if (name === objectGroup.name) return true;

    // renderGroup每次渲染/计算调用更新一次
    // 包含相机矩阵、光照信息等渲染级别的数据
    if (name === renderGroup.name) {
      const uniformsGroupData = this.get(nodeUniformsGroup);
      const renderId = this.nodeFrame.renderId;

      if (uniformsGroupData.renderId !== renderId) {
        uniformsGroupData.renderId = renderId;
        return true;
      }

      return false;
    }

    // frameGroup每帧更新一次
    // 包含时间、帧计数等帧级别的数据
    if (name === frameGroup.name) {
      const uniformsGroupData = this.get(nodeUniformsGroup);
      const frameId = this.nodeFrame.frameId;

      if (uniformsGroupData.frameId !== frameId) {
        uniformsGroupData.frameId = frameId;
        return true;
      }

      return false;
    }

    // 其他组仅在groupNode.needsUpdate为true时更新
    // 这些通常是用户自定义的组，更新频率由用户控制

    // 使用复合键查找组数据
    _chainKeys[0] = groupNode;
    _chainKeys[1] = nodeUniformsGroup;

    let groupData = this.groupsData.get(_chainKeys);
    if (groupData === undefined) this.groupsData.set(_chainKeys, (groupData = {}));

    // 清空临时键数组以供下次使用
    _chainKeys.length = 0;

    // 检查版本号是否发生变化
    if (groupData.version !== groupNode.version) {
      groupData.version = groupNode.version;
      return true;
    }

    return false;
  }

  /**
   * 获取给定渲染对象的缓存键
   *
   * 返回渲染对象的初始缓存键，这个键用于在节点构建器缓存中
   * 查找对应的节点构建器状态。
   *
   * @param {import('../RenderObject.js').RenderObject} renderObject - 渲染对象
   * @return {number} 缓存键
   */
  getForRenderCacheKey(renderObject) {
    return renderObject.initialCacheKey;
  }

  /**
   * 获取给定渲染对象的节点构建器状态
   *
   * 这是节点系统的核心方法之一，负责为渲染对象创建或获取
   * 对应的节点构建器状态。该状态包含编译后的着色器代码、
   * 绑定信息、更新节点等。
   *
   * 工作流程：
   * 1. 检查渲染对象是否已有缓存的状态
   * 2. 如果没有，使用缓存键在全局缓存中查找
   * 3. 如果全局缓存中也没有，创建新的节点构建器并构建
   * 4. 缓存构建结果并返回
   *
   * @param {import('../RenderObject.js').RenderObject} renderObject - 渲染对象
   * @return {NodeBuilderState} 节点构建器状态
   */
  getForRender(renderObject) {
    // 获取渲染对象的数据存储
    const renderObjectData = this.get(renderObject);

    let nodeBuilderState = renderObjectData.nodeBuilderState;

    if (nodeBuilderState === undefined) {
      const { nodeBuilderCache } = this;

      // 获取缓存键
      const cacheKey = this.getForRenderCacheKey(renderObject);

      // 尝试从全局缓存中获取状态
      nodeBuilderState = nodeBuilderCache.get(cacheKey);

      if (nodeBuilderState === undefined) {
        // 创建新的节点构建器
        const nodeBuilder = this.backend.createNodeBuilder(renderObject.object, this.renderer);

        // 设置构建器的上下文信息
        nodeBuilder.scene = renderObject.scene;
        nodeBuilder.material = renderObject.material;
        nodeBuilder.camera = renderObject.camera;
        nodeBuilder.context.material = renderObject.material;
        nodeBuilder.lightsNode = renderObject.lightsNode;
        nodeBuilder.environmentNode = this.getEnvironmentNode(renderObject.scene);
        nodeBuilder.fogNode = this.getFogNode(renderObject.scene);
        nodeBuilder.clippingContext = renderObject.clippingContext;

        // 检查是否需要启用多视图渲染（VR/AR）
        if (this.renderer.getOutputRenderTarget() ? this.renderer.getOutputRenderTarget().multiview : false) {
          nodeBuilder.enableMultiview();
        }

        // 构建节点图并生成着色器代码
        nodeBuilder.build();

        // 创建节点构建器状态
        nodeBuilderState = this._createNodeBuilderState(nodeBuilder);

        // 缓存状态以供后续使用
        nodeBuilderCache.set(cacheKey, nodeBuilderState);
      }

      // 增加使用计数
      nodeBuilderState.usedTimes++;

      // 将状态关联到渲染对象
      renderObjectData.nodeBuilderState = nodeBuilderState;
    }

    return nodeBuilderState;
  }

  /**
   * 从内部数据映射中删除给定对象
   *
   * 重写父类的delete方法，为渲染对象提供特殊的清理逻辑。
   * 当删除渲染对象时，会减少其节点构建器状态的使用计数，
   * 并在没有其他对象使用时从缓存中删除状态。
   *
   * @param {any} object - 要删除的对象
   * @return {?Object} 被删除的数据字典
   */
  delete(object) {
    if (object.isRenderObject) {
      // 处理渲染对象的特殊清理逻辑
      const nodeBuilderState = this.get(object).nodeBuilderState;
      nodeBuilderState.usedTimes--;

      // 如果没有其他对象使用此状态，从全局缓存中删除
      if (nodeBuilderState.usedTimes === 0) {
        this.nodeBuilderCache.delete(this.getForRenderCacheKey(object));
      }
    }

    // 调用父类的delete方法完成实际删除
    return super.delete(object);
  }

  /**
   * 获取给定计算节点的节点构建器状态
   *
   * 为计算节点创建或获取对应的节点构建器状态。计算节点用于
   * GPU计算任务，如粒子系统、物理模拟等。与渲染节点不同，
   * 计算节点不需要复杂的场景上下文。
   *
   * @param {import('../../../nodes/core/Node.js').Node} computeNode - 计算节点
   * @return {NodeBuilderState} 节点构建器状态
   */
  getForCompute(computeNode) {
    // 获取计算节点的数据存储
    const computeData = this.get(computeNode);

    let nodeBuilderState = computeData.nodeBuilderState;

    if (nodeBuilderState === undefined) {
      // 为计算节点创建节点构建器
      const nodeBuilder = this.backend.createNodeBuilder(computeNode, this.renderer);

      // 构建计算着色器
      nodeBuilder.build();

      // 创建节点构建器状态
      nodeBuilderState = this._createNodeBuilderState(nodeBuilder);

      // 缓存状态
      computeData.nodeBuilderState = nodeBuilderState;
    }

    return nodeBuilderState;
  }

  /**
   * 为给定的节点构建器创建节点构建器状态
   *
   * 从节点构建器中提取所有必要的信息，创建一个包含编译结果的状态对象。
   * 这个状态对象包含了渲染所需的所有信息，可以被多个渲染对象共享。
   *
   * @private
   * @param {import('../../../nodes/core/NodeBuilder.js').NodeBuilder} nodeBuilder - 节点构建器
   * @return {NodeBuilderState} 节点构建器状态
   */
  _createNodeBuilderState(nodeBuilder) {
    return new NodeBuilderState(
      nodeBuilder.vertexShader, // 顶点着色器代码
      nodeBuilder.fragmentShader, // 片段着色器代码
      nodeBuilder.computeShader, // 计算着色器代码
      nodeBuilder.getAttributesArray(), // 属性数组
      nodeBuilder.getBindings(), // 绑定组数组
      nodeBuilder.updateNodes, // 更新节点数组
      nodeBuilder.updateBeforeNodes, // 前置更新节点数组
      nodeBuilder.updateAfterNodes, // 后置更新节点数组
      nodeBuilder.observer, // 材质观察器
      nodeBuilder.transforms // 变换数组（计算着色器用）
    );
  }

  /**
   * 获取当前配置的场景环境的环境节点
   *
   * 根据场景的环境配置返回对应的环境节点。环境节点用于
   * 基于图像的照明（IBL）和环境反射。支持多种环境类型：
   * - 立方体贴图环境
   * - 等距柱状投影环境
   * - 纯色环境
   *
   * @param {import('../../../scenes/Scene.js').Scene} scene - 场景对象
   * @return {import('../../../nodes/core/Node.js').Node} 表示当前场景环境的节点
   */
  getEnvironmentNode(scene) {
    // 更新环境配置
    this.updateEnvironment(scene);

    let environmentNode = null;

    // 优先使用场景直接指定的环境节点
    if (scene.environmentNode && scene.environmentNode.isNode) {
      environmentNode = scene.environmentNode;
    } else {
      // 否则使用从场景环境属性生成的节点
      const sceneData = this.get(scene);

      if (sceneData.environmentNode) {
        environmentNode = sceneData.environmentNode;
      }
    }

    return environmentNode;
  }

  /**
   * 获取当前配置的场景背景的背景节点
   *
   * 根据场景的背景配置返回对应的背景节点。背景节点用于
   * 渲染场景的背景，支持多种背景类型：
   * - 立方体贴图背景
   * - 等距柱状投影背景
   * - 纯色背景
   * - 渐变背景
   *
   * @param {import('../../../scenes/Scene.js').Scene} scene - 场景对象
   * @return {import('../../../nodes/core/Node.js').Node} 表示当前场景背景的节点
   */
  getBackgroundNode(scene) {
    // 更新背景配置
    this.updateBackground(scene);

    let backgroundNode = null;

    // 优先使用场景直接指定的背景节点
    if (scene.backgroundNode && scene.backgroundNode.isNode) {
      backgroundNode = scene.backgroundNode;
    } else {
      // 否则使用从场景背景属性生成的节点
      const sceneData = this.get(scene);

      if (sceneData.backgroundNode) {
        backgroundNode = sceneData.backgroundNode;
      }
    }

    return backgroundNode;
  }

  /**
   * 获取当前配置的场景雾效的雾效节点
   *
   * 返回表示当前场景雾效的节点。雾效节点用于在着色器中
   * 实现距离雾、指数雾等雾效效果。
   *
   * @param {import('../../../scenes/Scene.js').Scene} scene - 场景对象
   * @return {import('../../../nodes/core/Node.js').Node} 表示当前场景雾效的节点
   */
  getFogNode(scene) {
    // 更新雾效配置
    this.updateFog(scene);

    // 返回场景直接指定的雾效节点，或从场景数据生成的雾效节点，或null
    return scene.fogNode || this.get(scene).fogNode || null;
  }

  /**
   * 获取给定场景和光照节点的缓存键
   *
   * 这个键被`RenderObject`用作动态缓存键的一部分（每次绘制
   * 渲染对象时都必须检查的键）。该键包含了影响渲染结果的
   * 所有动态因素，如光照、环境、雾效、阴影等。
   *
   * @param {import('../../../scenes/Scene.js').Scene} scene - 场景对象
   * @param {import('../../../nodes/lighting/LightsNode.js').LightsNode} lightsNode - 光照节点
   * @return {number} 缓存键
   */
  getCacheKey(scene, lightsNode) {
    // 设置链式键的组成部分
    _chainKeys[0] = scene;
    _chainKeys[1] = lightsNode;

    // 获取当前渲染调用ID，用于检测是否需要重新计算缓存键
    const callId = this.renderer.info.calls;

    // 尝试获取已缓存的键数据
    const cacheKeyData = this.callHashCache.get(_chainKeys) || {};

    // 如果调用ID发生变化，需要重新计算缓存键
    if (cacheKeyData.callId !== callId) {
      // 获取影响渲染的各种节点
      const environmentNode = this.getEnvironmentNode(scene);
      const fogNode = this.getFogNode(scene);

      // 收集各种因素的缓存键值
      if (lightsNode) _cacheKeyValues.push(lightsNode.getCacheKey(true)); // 光照缓存键
      if (environmentNode) _cacheKeyValues.push(environmentNode.getCacheKey()); // 环境缓存键
      if (fogNode) _cacheKeyValues.push(fogNode.getCacheKey()); // 雾效缓存键

      // 添加多视图渲染标志（VR/AR）
      _cacheKeyValues.push(this.renderer.getOutputRenderTarget() && this.renderer.getOutputRenderTarget().multiview ? 1 : 0);
      // 添加阴影映射启用标志
      _cacheKeyValues.push(this.renderer.shadowMap.enabled ? 1 : 0);

      // 更新缓存数据
      cacheKeyData.callId = callId;
      cacheKeyData.cacheKey = hashArray(_cacheKeyValues); // 计算组合哈希值

      // 缓存计算结果
      this.callHashCache.set(_chainKeys, cacheKeyData);

      // 清空临时数组以供下次使用
      _cacheKeyValues.length = 0;
    }

    // 清空链式键数组以供下次使用
    _chainKeys.length = 0;

    return cacheKeyData.cacheKey;
  }

  /**
   * 指示是否应启用色调映射的布尔值
   *
   * 当渲染到屏幕时启用色调映射，当渲染到纹理时禁用。
   * 这是因为渲染到纹理通常是中间步骤，不需要最终的色调映射。
   *
   * @type {boolean}
   */
  get isToneMappingState() {
    // 如果有渲染目标（渲染到纹理），则禁用色调映射；否则启用
    return this.renderer.getRenderTarget() ? false : true;
  }

  /**
   * 更新场景背景的节点表示
   *
   * 如果配置了场景背景，此方法确保使用相应的基于节点的实现
   * 来表示背景。支持多种背景类型的处理和优化。
   *
   * @param {import('../../../scenes/Scene.js').Scene} scene - 场景对象
   */
  updateBackground(scene) {
    // 获取场景数据存储
    const sceneData = this.get(scene);
    const background = scene.background;

    if (background) {
      // 检查是否需要强制更新（背景模糊度发生变化）
      const forceUpdate = (scene.backgroundBlurriness === 0 && sceneData.backgroundBlurriness > 0) || (scene.backgroundBlurriness > 0 && sceneData.backgroundBlurriness === 0);

      // 如果背景对象或模糊度发生变化，需要更新背景节点
      if (sceneData.background !== background || forceUpdate) {
        const backgroundNode = this.getCacheNode(
          "background", // 缓存类型
          background, // 缓存键对象
          () => {
            // 处理立方体贴图或等距柱状投影背景
            if (
              background.isCubeTexture === true ||
              background.mapping === EquirectangularReflectionMapping ||
              background.mapping === EquirectangularRefractionMapping ||
              background.mapping === CubeUVReflectionMapping
            ) {
              // 如果需要模糊效果或使用CubeUV映射，使用PMREM纹理
              if (scene.backgroundBlurriness > 0 || background.mapping === CubeUVReflectionMapping) {
                return pmremTexture(background);
              } else {
                // 否则使用标准环境贴图
                let envMap;

                if (background.isCubeTexture === true) {
                  envMap = cubeTexture(background); // 立方体纹理
                } else {
                  envMap = texture(background); // 2D纹理
                }

                return cubeMapNode(envMap); // 转换为立方体贴图节点
              }
            } else if (background.isTexture === true) {
              // 处理2D纹理背景，翻转Y轴并启用矩阵更新
              return texture(background, screenUV.flipY()).setUpdateMatrix(true);
            } else if (background.isColor !== true) {
              // 不支持的背景配置
              console.error("WebGPUNodes: Unsupported background configuration.", background);
            }
          },
          forceUpdate // 是否强制更新
        );

        // 更新场景数据
        sceneData.backgroundNode = backgroundNode;
        sceneData.background = background;
        sceneData.backgroundBlurriness = scene.backgroundBlurriness;
      }
    } else if (sceneData.backgroundNode) {
      // 如果没有背景配置，清理相关数据
      delete sceneData.backgroundNode;
      delete sceneData.background;
    }
  }

  /**
   * 获取缓存的节点对象
   *
   * 此方法是用于缓存表示场景背景、雾效或环境的节点的一部分。
   * 它提供了一个通用的缓存机制，避免重复创建相同的节点对象。
   *
   * @param {string} type - 要缓存的对象类型（如"background"、"fog"、"environment"）
   * @param {Object} object - 要缓存的对象
   * @param {Function} callback - 生成给定对象的节点表示的回调函数
   * @param {boolean} [forceUpdate=false] - 是否强制更新
   * @return {import('../../../nodes/core/Node.js').Node} 节点表示
   */
  getCacheNode(type, object, callback, forceUpdate = false) {
    // 获取或创建指定类型的节点缓存
    const nodeCache = this.cacheLib[type] || (this.cacheLib[type] = new WeakMap());

    // 尝试从缓存中获取节点
    let node = nodeCache.get(object);

    // 如果节点不存在或需要强制更新，则创建新节点
    if (node === undefined || forceUpdate) {
      node = callback(); // 调用回调函数创建节点
      nodeCache.set(object, node); // 缓存新创建的节点
    }

    return node;
  }

  /**
   * 更新场景雾效的节点表示
   *
   * 如果配置了场景雾效，此方法确保使用相应的基于节点的实现
   * 来表示雾效。支持线性雾和指数雾两种类型。
   *
   * @param {import('../../../scenes/Scene.js').Scene} scene - 场景对象
   */
  updateFog(scene) {
    // 获取场景数据存储
    const sceneData = this.get(scene);
    const sceneFog = scene.fog;

    if (sceneFog) {
      // 如果雾效对象发生变化，需要更新雾效节点
      if (sceneData.fog !== sceneFog) {
        const fogNode = this.getCacheNode("fog", sceneFog, () => {
          if (sceneFog.isFogExp2) {
            // 指数雾（FogExp2）：雾的密度随距离指数增长
            const color = reference("color", "color", sceneFog).setGroup(renderGroup); // 雾的颜色
            const density = reference("density", "float", sceneFog).setGroup(renderGroup); // 雾的密度

            return fog(color, densityFogFactor(density)); // 创建指数雾节点
          } else if (sceneFog.isFog) {
            // 线性雾（Fog）：雾在近距离和远距离之间线性变化
            const color = reference("color", "color", sceneFog).setGroup(renderGroup); // 雾的颜色
            const near = reference("near", "float", sceneFog).setGroup(renderGroup); // 雾开始的距离
            const far = reference("far", "float", sceneFog).setGroup(renderGroup); // 雾结束的距离

            return fog(color, rangeFogFactor(near, far)); // 创建线性雾节点
          } else {
            // 不支持的雾效配置
            console.error("THREE.Renderer: Unsupported fog configuration.", sceneFog);
          }
        });

        // 更新场景数据
        sceneData.fogNode = fogNode;
        sceneData.fog = sceneFog;
      }
    } else {
      // 如果没有雾效配置，清理相关数据
      delete sceneData.fogNode;
      delete sceneData.fog;
    }
  }

  /**
   * 更新场景环境的节点表示
   *
   * 如果配置了场景环境，此方法确保使用相应的基于节点的实现
   * 来表示环境。环境用于基于图像的照明（IBL）和反射。
   *
   * @param {import('../../../scenes/Scene.js').Scene} scene - 场景对象
   */
  updateEnvironment(scene) {
    // 获取场景数据存储
    const sceneData = this.get(scene);
    const environment = scene.environment;

    if (environment) {
      // 如果环境对象发生变化，需要更新环境节点
      if (sceneData.environment !== environment) {
        const environmentNode = this.getCacheNode("environment", environment, () => {
          if (environment.isCubeTexture === true) {
            // 立方体纹理环境
            return cubeTexture(environment);
          } else if (environment.isTexture === true) {
            // 2D纹理环境（通常是等距柱状投影）
            return texture(environment);
          } else {
            // 不支持的环境配置
            console.error("Nodes: Unsupported environment configuration.", environment);
          }
        });

        // 更新场景数据
        sceneData.environmentNode = environmentNode;
        sceneData.environment = environment;
      }
    } else if (sceneData.environmentNode) {
      // 如果没有环境配置，清理相关数据
      delete sceneData.environmentNode;
      delete sceneData.environment;
    }
  }

  /**
   * 获取配置好的节点帧对象
   *
   * 创建并配置一个节点帧对象，用于在节点更新过程中提供上下文信息。
   * 节点帧包含了渲染器、场景、对象、相机和材质的引用。
   *
   * @param {import('../../Renderer.js').Renderer} [renderer=this.renderer] - 渲染器实例
   * @param {import('../../../scenes/Scene.js').Scene} [scene=null] - 场景对象
   * @param {import('../../../core/Object3D.js').Object3D} [object=null] - 3D对象
   * @param {import('../../../cameras/Camera.js').Camera} [camera=null] - 相机对象
   * @param {import('../../../materials/Material.js').Material} [material=null] - 材质对象
   * @return {import('../../../nodes/Nodes.js').NodeFrame} 配置好的节点帧
   */
  getNodeFrame(renderer = this.renderer, scene = null, object = null, camera = null, material = null) {
    // 获取节点帧实例
    const nodeFrame = this.nodeFrame;
    // 配置节点帧的各个属性
    nodeFrame.renderer = renderer;
    nodeFrame.scene = scene;
    nodeFrame.object = object;
    nodeFrame.camera = camera;
    nodeFrame.material = material;

    return nodeFrame;
  }

  /**
   * 为渲染对象获取配置好的节点帧
   *
   * 这是getNodeFrame的便捷方法，直接从渲染对象中提取所需的参数。
   *
   * @param {import('../RenderObject.js').RenderObject} renderObject - 渲染对象
   * @return {import('../../../nodes/Nodes.js').NodeFrame} 配置好的节点帧
   */
  getNodeFrameForRender(renderObject) {
    // 从渲染对象中提取各个组件并配置节点帧
    return this.getNodeFrame(renderObject.renderer, renderObject.scene, renderObject.object, renderObject.camera, renderObject.material);
  }

  /**
   * 获取当前输出缓存键
   *
   * 返回基于当前渲染器配置的输出缓存键，包含色调映射、
   * 颜色空间和XR状态等信息。
   *
   * @return {string} 输出缓存键
   */
  getOutputCacheKey() {
    const renderer = this.renderer;

    // 组合色调映射、颜色空间和XR状态作为缓存键
    return renderer.toneMapping + "," + renderer.currentColorSpace + "," + renderer.xr.isPresenting;
  }

  /**
   * 检查给定目标的输出配置是否发生变化
   *
   * 检查输出配置（色调映射和颜色空间）是否与缓存的配置不同。
   * 这用于确定是否需要重新生成输出节点。
   *
   * @param {import('../../../textures/Texture.js').Texture} outputTarget - 输出目标纹理
   * @return {boolean} 输出配置是否发生变化
   */
  hasOutputChange(outputTarget) {
    // 获取缓存的输出配置键
    const cacheKey = _outputNodeMap.get(outputTarget);

    // 比较缓存键与当前配置键
    return cacheKey !== this.getOutputCacheKey();
  }

  /**
   * 获取表示当前目标输出配置的节点
   *
   * 返回一个节点，该节点表示当前目标的输出配置（色调映射和颜色空间）。
   * 支持普通纹理和数组纹理（用于多视图渲染）。
   *
   * @param {import('../../../textures/Texture.js').Texture} outputTarget - 输出目标纹理
   * @return {import('../../../nodes/core/Node.js').Node} 输出节点
   */
  getOutputNode(outputTarget) {
    const renderer = this.renderer;
    const cacheKey = this.getOutputCacheKey();

    // 根据纹理类型创建不同的输出节点
    const output = outputTarget.isArrayTexture
      ? // 数组纹理（多视图渲染，如VR/AR）
        texture3D(outputTarget, vec3(screenUV, builtin("gl_ViewID_OVR"))).renderOutput(renderer.toneMapping, renderer.currentColorSpace)
      : // 普通2D纹理
        texture(outputTarget, screenUV).renderOutput(renderer.toneMapping, renderer.currentColorSpace);

    // 缓存当前配置键
    _outputNodeMap.set(outputTarget, cacheKey);

    return output;
  }

  /**
   * 触发给定渲染对象所有节点的前置更新方法
   *
   * 在渲染之前调用所有需要前置更新的节点的updateBefore()方法。
   * 这些节点通常包含需要在主渲染过程之前准备的数据。
   *
   * @param {import('../RenderObject.js').RenderObject} renderObject - 渲染对象
   */
  updateBefore(renderObject) {
    // 获取渲染对象的节点构建器状态
    const nodeBuilder = renderObject.getNodeBuilderState();

    // 遍历所有需要前置更新的节点
    for (const node of nodeBuilder.updateBeforeNodes) {
      // 为每个节点更新帧状态
      this.getNodeFrameForRender(renderObject).updateBeforeNode(node);
    }
  }

  /**
   * 触发给定渲染对象所有节点的后置更新方法
   *
   * 在渲染之后调用所有需要后置更新的节点的updateAfter()方法。
   * 这些节点通常包含需要在主渲染过程之后清理或处理的数据。
   *
   * @param {import('../RenderObject.js').RenderObject} renderObject - 渲染对象
   */
  updateAfter(renderObject) {
    // 获取渲染对象的节点构建器状态
    const nodeBuilder = renderObject.getNodeBuilderState();

    // 遍历所有需要后置更新的节点
    for (const node of nodeBuilder.updateAfterNodes) {
      // 为每个节点更新帧状态
      this.getNodeFrameForRender(renderObject).updateAfterNode(node);
    }
  }

  /**
   * 触发给定计算节点所有节点的更新方法
   *
   * 为计算着色器调用所有相关节点的update()方法。
   * 计算节点用于GPU计算任务，如粒子系统、物理模拟等。
   *
   * @param {import('../../../nodes/core/Node.js').Node} computeNode - 计算节点
   */
  updateForCompute(computeNode) {
    // 获取节点帧（不需要特定的渲染上下文）
    const nodeFrame = this.getNodeFrame();
    // 获取计算节点的构建器状态
    const nodeBuilder = this.getForCompute(computeNode);

    // 遍历所有需要更新的节点
    for (const node of nodeBuilder.updateNodes) {
      nodeFrame.updateNode(node); // 更新节点
    }
  }

  /**
   * 触发给定渲染对象所有节点的更新方法
   *
   * 为渲染过程调用所有相关节点的update()方法。
   * 这是主要的节点更新入口，在每次渲染时调用。
   *
   * @param {import('../RenderObject.js').RenderObject} renderObject - 渲染对象
   */
  updateForRender(renderObject) {
    // 获取渲染对象的节点帧
    const nodeFrame = this.getNodeFrameForRender(renderObject);
    // 获取渲染对象的节点构建器状态
    const nodeBuilder = renderObject.getNodeBuilderState();

    // 遍历所有需要更新的节点
    for (const node of nodeBuilder.updateNodes) {
      nodeFrame.updateNode(node); // 更新节点
    }
  }

  /**
   * 检查给定的渲染对象是否需要刷新
   *
   * 通过监视器检查渲染对象是否需要重新渲染。监视器会跟踪
   * 影响渲染结果的各种状态变化，如材质属性、几何体等。
   *
   * @param {import('../RenderObject.js').RenderObject} renderObject - 渲染对象
   * @return {boolean} 给定的渲染对象是否需要刷新
   */
  needsRefresh(renderObject) {
    // 获取渲染对象的节点帧
    const nodeFrame = this.getNodeFrameForRender(renderObject);
    // 获取渲染对象的监视器
    const monitor = renderObject.getMonitor();

    // 通过监视器检查是否需要刷新
    return monitor.needsRefresh(renderObject, nodeFrame);
  }

  /**
   * 释放内部资源
   *
   * 清理所有缓存和内部状态，释放内存资源。
   * 这个方法应该在不再需要节点管理器时调用。
   */
  dispose() {
    // 调用父类的dispose方法
    super.dispose();

    // 重置所有内部状态
    this.nodeFrame = new NodeFrame(); // 重新创建节点帧
    this.nodeBuilderCache = new Map(); // 清空节点构建器缓存
    this.cacheLib = {}; // 清空缓存库
  }
}

export default Nodes;
