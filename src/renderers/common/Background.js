/**
 * Background.js
 *
 * 背景管理器 - 管理场景背景渲染
 *
 * 这个渲染器模块负责管理场景背景的渲染，支持多种背景类型：
 * - 纯色背景
 * - 基于节点的背景（纹理、天空盒等）
 * - 清除颜色配置
 * - XR环境混合模式处理
 */

// 导入依赖模块
import DataMap from "./DataMap.js"; // 数据映射基类
import Color4 from "./Color4.js"; // 4分量颜色类
import { vec4, context, normalWorldGeometry, backgroundBlurriness, backgroundIntensity, backgroundRotation, modelViewProjection } from "../../nodes/TSL.js"; // 节点着色器语言
import NodeMaterial from "../../materials/nodes/NodeMaterial.js"; // 节点材质

import { Mesh } from "../../objects/Mesh.js"; // 网格对象
import { SphereGeometry } from "../../geometries/SphereGeometry.js"; // 球体几何
import { BackSide } from "../../constants.js"; // 背面渲染常量

// 模块级清除颜色缓存，避免重复创建对象
const _clearColor = /*@__PURE__*/ new Color4();

/**
 * 背景管理类
 *
 * 这个渲染器模块管理场景背景的渲染。根据`Scene.background`
 * 或`Scene.backgroundNode`的配置，它可能配置简单的清除操作，
 * 或添加网格到渲染列表以将背景渲染为纹理平面或天空盒。
 *
 * @private
 * @augments DataMap
 */
class Background extends DataMap {
  /**
   * 构造新的背景管理组件
   *
   * 初始化背景管理器，设置渲染器和节点管理器的引用。
   * 背景管理器将协调不同类型背景的渲染处理。
   *
   * @param {import('../Renderer.js').default} renderer - 渲染器实例
   * @param {import('./nodes/Nodes.js').default} nodes - 用于管理节点相关逻辑的渲染器组件
   */
  constructor(renderer, nodes) {
    // 调用父类构造函数
    super();

    /**
     * 渲染器实例
     *
     * 对渲染器的引用，用于访问渲染器的配置和状态，
     * 如清除颜色、自动清除设置等。
     *
     * @type {import('../Renderer.js').default}
     */
    this.renderer = renderer;

    /**
     * 节点管理组件
     *
     * 用于管理节点相关逻辑的渲染器组件，负责处理
     * 基于节点的背景配置和节点图的解析。
     *
     * @type {import('./nodes/Nodes.js').default}
     */
    this.nodes = nodes;
  }

  /**
   * 更新给定场景的背景
   *
   * 根据`Scene.background`或`Scene.backgroundNode`的配置方式，
   * 此方法可能配置简单的清除操作，或添加网格到渲染列表以将
   * 背景渲染为纹理平面或天空盒。
   *
   * @param {import('../../scenes/Scene.js').Scene} scene - 场景对象
   * @param {import('./RenderList.js').default} renderList - 当前渲染列表
   * @param {import('./RenderContext.js').default} renderContext - 当前渲染上下文
   */
  update(scene, renderList, renderContext) {
    const renderer = this.renderer;
    // 获取背景节点或场景背景配置
    const background = this.nodes.getBackgroundNode(scene) || scene.background;

    let forceClear = false;

    if (background === null) {
      // 没有背景设置，使用渲染器的清除颜色配置

      renderer._clearColor.getRGB(_clearColor);
      _clearColor.a = renderer._clearColor.a;
    } else if (background.isColor === true) {
      // 背景是不透明颜色

      background.getRGB(_clearColor);
      _clearColor.a = 1;

      forceClear = true;
    } else if (background.isNode === true) {
      // 背景是基于节点的（纹理、天空盒等）
      const sceneData = this.get(scene);
      const backgroundNode = background;

      // 使用渲染器的清除颜色作为基础
      _clearColor.copy(renderer._clearColor);

      let backgroundMesh = sceneData.backgroundMesh;

      if (backgroundMesh === undefined) {
        // 创建背景网格节点，应用强度和模糊效果
        const backgroundMeshNode = context(vec4(backgroundNode).mul(backgroundIntensity), {
          // @TODO: 使用节点上下文添加Texture2D支持
          getUV: () => backgroundRotation.mul(normalWorldGeometry), // UV坐标计算，支持背景旋转
          getTextureLevel: () => backgroundBlurriness, // 纹理级别，用于模糊效果
        });

        // 设置视图投影矩阵，将Z设置为W以确保背景在最远处
        let viewProj = modelViewProjection;
        viewProj = viewProj.setZ(viewProj.w);

        // 创建背景材质
        const nodeMaterial = new NodeMaterial();
        nodeMaterial.name = "Background.material";
        nodeMaterial.side = BackSide; // 渲染背面，因为相机在球体内部
        nodeMaterial.depthTest = false; // 禁用深度测试，背景总是在最后渲染
        nodeMaterial.depthWrite = false; // 禁用深度写入
        nodeMaterial.allowOverride = false; // 不允许材质覆盖
        nodeMaterial.fog = false; // 背景不受雾效影响
        nodeMaterial.lights = false; // 背景不受光照影响
        nodeMaterial.vertexNode = viewProj; // 顶点着色器节点
        nodeMaterial.colorNode = backgroundMeshNode; // 颜色着色器节点

        // 缓存背景网格节点和网格对象
        sceneData.backgroundMeshNode = backgroundMeshNode;
        sceneData.backgroundMesh = backgroundMesh = new Mesh(new SphereGeometry(1, 32, 32), nodeMaterial);
        backgroundMesh.frustumCulled = false; // 禁用视锥体剔除
        backgroundMesh.name = "Background.mesh";

        // 设置渲染前回调，确保背景网格始终跟随相机位置
        backgroundMesh.onBeforeRender = function (renderer, scene, camera) {
          this.matrixWorld.copyPosition(camera.matrixWorld);
        };

        // 背景资源清理函数
        function onBackgroundDispose() {
          background.removeEventListener("dispose", onBackgroundDispose);

          // 清理材质和几何体资源
          backgroundMesh.material.dispose();
          backgroundMesh.geometry.dispose();
        }

        // 监听背景对象的dispose事件
        background.addEventListener("dispose", onBackgroundDispose);
      }

      // 检查背景节点是否发生变化
      const backgroundCacheKey = backgroundNode.getCacheKey();

      if (sceneData.backgroundCacheKey !== backgroundCacheKey) {
        // 背景节点发生变化，更新背景网格节点
        sceneData.backgroundMeshNode.node = vec4(backgroundNode).mul(backgroundIntensity);
        sceneData.backgroundMeshNode.needsUpdate = true;

        // 标记材质需要更新
        backgroundMesh.material.needsUpdate = true;

        // 更新缓存键
        sceneData.backgroundCacheKey = backgroundCacheKey;
      }

      // 将背景网格添加到渲染列表的最前面（最先渲染）
      renderList.unshift(backgroundMesh, backgroundMesh.geometry, backgroundMesh.material, 0, 0, null, null);
    } else {
      // 不支持的背景配置
      console.error("THREE.Renderer: Unsupported background configuration.", background);
    }

    // === XR环境混合模式处理 ===

    const environmentBlendMode = renderer.xr.getEnvironmentBlendMode();

    if (environmentBlendMode === "additive") {
      // 加法混合模式：使用黑色背景
      _clearColor.set(0, 0, 0, 1);
    } else if (environmentBlendMode === "alpha-blend") {
      // Alpha混合模式：使用透明背景
      _clearColor.set(0, 0, 0, 0);
    }

    // === 设置渲染上下文的清除参数 ===

    if (renderer.autoClear === true || forceClear === true) {
      // 需要清除缓冲区
      const clearColorValue = renderContext.clearColorValue;

      // 设置清除颜色值
      clearColorValue.r = _clearColor.r;
      clearColorValue.g = _clearColor.g;
      clearColorValue.b = _clearColor.b;
      clearColorValue.a = _clearColor.a;

      // 预乘alpha（用于WebGL后端或启用alpha的情况）
      if (renderer.backend.isWebGLBackend === true || renderer.alpha === true) {
        clearColorValue.r *= clearColorValue.a;
        clearColorValue.g *= clearColorValue.a;
        clearColorValue.b *= clearColorValue.a;
      }

      // 设置深度和模板清除值
      renderContext.depthClearValue = renderer._clearDepth;
      renderContext.stencilClearValue = renderer._clearStencil;

      // 设置清除标志
      renderContext.clearColor = renderer.autoClearColor === true;
      renderContext.clearDepth = renderer.autoClearDepth === true;
      renderContext.clearStencil = renderer.autoClearStencil === true;
    } else {
      // 不需要清除缓冲区
      renderContext.clearColor = false;
      renderContext.clearDepth = false;
      renderContext.clearStencil = false;
    }
  }
}

export default Background;
