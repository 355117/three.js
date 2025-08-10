// 导入WebGL灯光管理器
import { WebGLLights } from "./WebGLLights.js";

/**
 * WebGL渲染状态
 * 管理单个场景的渲染状态，包括灯光、阴影、相机等信息
 * 这是Three.js渲染管线中的核心组件，负责收集和管理渲染所需的所有状态信息
 *
 * @param {WebGLExtensions} extensions - WebGL扩展管理器
 */
function WebGLRenderState(extensions) {
  // 创建WebGL灯光管理器实例，负责处理所有类型的灯光
  const lights = new WebGLLights(extensions);

  // 当前帧中的所有灯光对象数组
  const lightsArray = [];
  // 当前帧中的所有投射阴影的灯光对象数组
  const shadowsArray = [];

  /**
   * 初始化渲染状态
   * 为新的渲染帧准备状态，清空之前帧的数据
   *
   * @param {Camera} camera - 当前渲染使用的相机对象
   */
  function init(camera) {
    // 设置当前渲染使用的相机
    state.camera = camera;

    // 清空灯光数组，准备收集新帧的灯光
    lightsArray.length = 0;
    // 清空阴影数组，准备收集新帧的阴影灯光
    shadowsArray.length = 0;
  }

  /**
   * 添加灯光到渲染状态
   * 在场景遍历过程中收集所有可见的灯光对象
   *
   * @param {Light} light - 要添加的灯光对象
   */
  function pushLight(light) {
    // 将灯光添加到当前帧的灯光数组中
    lightsArray.push(light);
  }

  /**
   * 添加阴影灯光到渲染状态
   * 收集所有能够投射阴影的灯光对象，用于后续阴影渲染
   *
   * @param {Light} shadowLight - 能够投射阴影的灯光对象
   */
  function pushShadow(shadowLight) {
    // 将阴影灯光添加到当前帧的阴影数组中
    shadowsArray.push(shadowLight);
  }

  /**
   * 设置灯光系统
   * 处理收集到的所有灯光，将它们转换为GPU可用的格式
   * 这个函数通常在场景遍历完成后调用
   */
  function setupLights() {
    // 调用灯光管理器的setup方法，处理所有收集到的灯光
    lights.setup(lightsArray);
  }

  /**
   * 设置灯光的视图相关参数
   * 将灯光的位置和方向转换到相机视图空间中
   * 这是渲染管线中的重要步骤，确保灯光计算在正确的坐标系中进行
   *
   * @param {Camera} camera - 当前渲染使用的相机对象
   */
  function setupLightsView(camera) {
    // 调用灯光管理器的setupView方法，转换灯光到视图空间
    lights.setupView(lightsArray, camera);
  }

  // 渲染状态对象，包含当前帧的所有渲染相关信息
  const state = {
    lightsArray: lightsArray, // 当前帧的灯光数组引用
    shadowsArray: shadowsArray, // 当前帧的阴影灯光数组引用

    camera: null, // 当前渲染使用的相机对象

    lights: lights, // WebGL灯光管理器实例

    transmissionRenderTarget: {}, // 透射效果渲染目标缓存对象
  };

  // 返回WebGL渲染状态的公共接口
  return {
    /**
     * 初始化渲染状态的方法
     * @type {function(Camera): void}
     */
    init: init,

    /**
     * 渲染状态数据对象（只读访问）
     * @type {Object}
     */
    state: state,

    /**
     * 设置灯光系统的方法
     * @type {function(): void}
     */
    setupLights: setupLights,

    /**
     * 设置灯光视图参数的方法
     * @type {function(Camera): void}
     */
    setupLightsView: setupLightsView,

    /**
     * 添加灯光的方法
     * @type {function(Object): void}
     */
    pushLight: pushLight,

    /**
     * 添加阴影灯光的方法
     * @type {function(Object): void}
     */
    pushShadow: pushShadow,
  };
}

/**
 * WebGL渲染状态管理器
 * 管理多个场景和多层渲染调用的渲染状态
 * 使用WeakMap确保当场景被销毁时，相关的渲染状态也能被垃圾回收
 * 支持递归渲染调用（如渲染到纹理、反射、阴影贴图等）
 *
 * @param {WebGLExtensions} extensions - WebGL扩展管理器
 */
function WebGLRenderStates(extensions) {
  // 使用WeakMap存储场景到渲染状态数组的映射
  // WeakMap的优势：当场景对象被销毁时，对应的渲染状态也会自动被垃圾回收
  let renderStates = new WeakMap();

  /**
   * 获取指定场景和渲染深度的渲染状态
   * 支持多层嵌套渲染调用，每一层都有独立的渲染状态
   * 这对于复杂的渲染技术（如反射、阴影、后处理等）非常重要
   *
   * @param {Scene} scene - 要渲染的场景对象
   * @param {number} renderCallDepth - 渲染调用深度，默认为0（主渲染）
   * @returns {WebGLRenderState} 对应的渲染状态实例
   */
  function get(scene, renderCallDepth = 0) {
    // 尝试获取该场景的渲染状态数组
    const renderStateArray = renderStates.get(scene);
    let renderState;

    // 如果该场景还没有渲染状态数组，创建新的
    if (renderStateArray === undefined) {
      // 创建新的渲染状态实例
      renderState = new WebGLRenderState(extensions);
      // 为该场景创建渲染状态数组，并添加第一个状态
      renderStates.set(scene, [renderState]);
    } else {
      // 场景已有渲染状态数组，检查是否需要扩展
      if (renderCallDepth >= renderStateArray.length) {
        // 当前渲染深度超出现有数组长度，需要创建新的渲染状态
        renderState = new WebGLRenderState(extensions);
        // 将新状态添加到数组末尾
        renderStateArray.push(renderState);
      } else {
        // 使用现有的渲染状态
        renderState = renderStateArray[renderCallDepth];
      }
    }

    // 返回对应深度的渲染状态
    return renderState;
  }

  /**
   * 释放所有渲染状态
   * 清理内存，通常在渲染器销毁时调用
   * 重新创建WeakMap以确保所有引用都被清理
   */
  function dispose() {
    // 重新创建WeakMap，释放所有存储的渲染状态
    renderStates = new WeakMap();
  }

  // 返回渲染状态管理器的公共接口
  return {
    /**
     * 获取渲染状态的方法
     * @type {function(Scene, number): WebGLRenderState}
     */
    get: get,

    /**
     * 释放资源的方法
     * @type {function(): void}
     */
    dispose: dispose,
  };
}

// 导出WebGL渲染状态管理器
export { WebGLRenderStates };
