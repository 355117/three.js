// 导入链式映射和渲染对象类
import ChainMap from "./ChainMap.js";
import RenderObject from "./RenderObject.js";

// 用于链式键的临时数组，避免重复创建数组
const _chainKeys = [];

/**
 * 渲染对象管理器
 *
 * 此模块管理渲染器的渲染对象，负责渲染对象的创建、缓存、更新和销毁。
 * 渲染对象是渲染管线中的核心概念，代表了一个可绘制的实体。
 *
 * @private
 */
class RenderObjects {
  /**
   * 构造一个新的渲染对象管理组件
   *
   * @param {Renderer} renderer - 渲染器实例
   * @param {Nodes} nodes - 用于管理节点相关逻辑的渲染器组件
   * @param {Geometries} geometries - 用于管理几何体的渲染器组件
   * @param {Pipelines} pipelines - 用于管理管线的渲染器组件
   * @param {Bindings} bindings - 用于管理绑定的渲染器组件
   * @param {Info} info - 用于管理指标和监控数据的渲染器组件
   */
  constructor(renderer, nodes, geometries, pipelines, bindings, info) {
    /**
     * 渲染器实例
     * 提供渲染相关的全局功能和配置
     *
     * @type {Renderer}
     */
    this.renderer = renderer;

    /**
     * 用于管理节点相关逻辑的渲染器组件
     * 负责处理材质节点、着色器节点等的管理和更新
     *
     * @type {Nodes}
     */
    this.nodes = nodes;

    /**
     * 用于管理几何体的渲染器组件
     * 负责处理顶点缓冲区、索引缓冲区等几何体相关数据
     *
     * @type {Geometries}
     */
    this.geometries = geometries;

    /**
     * 用于管理管线的渲染器组件
     * 负责处理渲染管线状态、着色器程序等
     *
     * @type {Pipelines}
     */
    this.pipelines = pipelines;

    /**
     * 用于管理绑定的渲染器组件
     * 负责处理GPU资源绑定，如纹理、缓冲区、采样器等
     *
     * @type {Bindings}
     */
    this.bindings = bindings;

    /**
     * 用于管理指标和监控数据的渲染器组件
     * 负责收集和报告渲染性能数据
     *
     * @type {Info}
     */
    this.info = info;

    /**
     * 管理每个通道ID的渲染上下文链式映射的字典
     * 键是通道ID，值是对应的链式映射，用于缓存渲染对象
     *
     * @type {Object<string,ChainMap>}
     */
    this.chainMaps = {};
  }

  /**
   * 为给定的对象和状态数据返回渲染对象
   * 这是获取渲染对象的主要方法，包含缓存和更新逻辑
   *
   * @param {Object3D} object - 3D对象
   * @param {Material} material - 3D对象的材质
   * @param {Scene} scene - 3D对象所属的场景
   * @param {Camera} camera - 用于渲染对象的相机
   * @param {LightsNode} lightsNode - 光源节点
   * @param {RenderContext} renderContext - 渲染上下文
   * @param {ClippingContext} clippingContext - 裁剪上下文
   * @param {string} [passId] - 用于标识通道的可选ID
   * @return {RenderObject} 渲染对象
   */
  get(object, material, scene, camera, lightsNode, renderContext, clippingContext, passId) {
    // 获取对应通道的链式映射
    const chainMap = this.getChainMap(passId);

    // 重用链式键数组，避免重复创建
    _chainKeys[0] = object;
    _chainKeys[1] = material;
    _chainKeys[2] = renderContext;
    _chainKeys[3] = lightsNode;

    // 尝试从缓存中获取渲染对象
    let renderObject = chainMap.get(_chainKeys);

    if (renderObject === undefined) {
      // 如果渲染对象不存在，创建新的渲染对象
      renderObject = this.createRenderObject(this.nodes, this.geometries, this.renderer, object, material, scene, camera, lightsNode, renderContext, clippingContext, passId);

      // 将新创建的渲染对象存储到缓存中
      chainMap.set(_chainKeys, renderObject);
    } else {
      // 如果渲染对象已存在，更新其状态

      // 更新裁剪上下文
      renderObject.updateClipping(clippingContext);

      // 检查几何体是否需要更新
      if (renderObject.needsGeometryUpdate) {
        // 设置新的几何体
        renderObject.setGeometry(object.geometry);
      }

      // 检查材质版本或渲染对象是否需要更新
      if (renderObject.version !== material.version || renderObject.needsUpdate) {
        // 检查缓存键是否发生变化
        if (renderObject.initialCacheKey !== renderObject.getCacheKey()) {
          // 如果缓存键变化，销毁旧的渲染对象并递归获取新的
          renderObject.dispose();

          renderObject = this.get(object, material, scene, camera, lightsNode, renderContext, clippingContext, passId);
        } else {
          // 如果只是版本变化，更新版本号
          renderObject.version = material.version;
        }
      }
    }

    // 清空临时键数组，为下次使用做准备
    _chainKeys.length = 0;

    // 返回渲染对象
    return renderObject;
  }

  /**
   * 为给定的通道ID返回链式映射
   * 如果映射不存在，则创建一个新的
   *
   * @param {string} [passId='default'] - 通道ID，默认为'default'
   * @return {ChainMap} 链式映射
   */
  getChainMap(passId = "default") {
    // 返回现有的链式映射，如果不存在则创建新的
    return this.chainMaps[passId] || (this.chainMaps[passId] = new ChainMap());
  }

  /**
   * 释放内部资源
   * 清空所有缓存的链式映射
   */
  dispose() {
    // 重置链式映射字典，释放所有缓存的渲染对象
    this.chainMaps = {};
  }

  /**
   * 用于创建渲染对象的工厂方法
   * 使用给定的参数列表创建新的渲染对象实例
   *
   * @param {Object} nodes - 用于管理节点相关逻辑的渲染器组件
   * @param {Object} geometries - 用于管理几何体的渲染器组件
   * @param {Object} renderer - 渲染器实例
   * @param {Object3D} object - 3D对象
   * @param {Material} material - 对象的材质
   * @param {Scene} scene - 3D对象所属的场景
   * @param {Camera} camera - 用于渲染对象的相机
   * @param {LightsNode} lightsNode - 光源节点
   * @param {RenderContext} renderContext - 渲染上下文
   * @param {ClippingContext} clippingContext - 裁剪上下文
   * @param {string} [passId] - 用于标识通道的可选ID
   * @return {RenderObject} 新创建的渲染对象
   */
  createRenderObject(nodes, geometries, renderer, object, material, scene, camera, lightsNode, renderContext, clippingContext, passId) {
    // 获取对应通道的链式映射
    const chainMap = this.getChainMap(passId);

    // 创建新的渲染对象实例
    const renderObject = new RenderObject(nodes, geometries, renderer, object, material, scene, camera, lightsNode, renderContext, clippingContext);

    // 设置渲染对象的销毁回调
    renderObject.onDispose = () => {
      // 从管线管理器中删除渲染对象
      this.pipelines.delete(renderObject);
      // 从绑定管理器中删除渲染对象
      this.bindings.delete(renderObject);
      // 从节点管理器中删除渲染对象
      this.nodes.delete(renderObject);

      // 从链式映射中删除渲染对象
      chainMap.delete(renderObject.getChainArray());
    };

    // 返回创建的渲染对象
    return renderObject;
  }
}

// 导出渲染对象管理器类
export default RenderObjects;
