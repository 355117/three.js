// 导入颜色类，用于处理颜色值
import { Color } from "../../math/Color.js";

/**
 * 保存渲染器状态
 * 保存给定渲染器的状态并将其存储到给定的状态对象中。
 *
 * 如果未提供状态对象，函数会创建一个。
 *
 * @function
 * @param {Renderer} renderer - 渲染器实例
 * @param {Object} [state={}] - 状态对象
 * @return {Object} 状态对象
 */
export function saveRendererState(renderer, state = {}) {
  // 保存色调映射设置
  state.toneMapping = renderer.toneMapping;
  // 保存色调映射曝光度
  state.toneMappingExposure = renderer.toneMappingExposure;
  // 保存输出颜色空间
  state.outputColorSpace = renderer.outputColorSpace;
  // 保存当前渲染目标
  state.renderTarget = renderer.getRenderTarget();
  // 保存活动的立方体贴图面
  state.activeCubeFace = renderer.getActiveCubeFace();
  // 保存活动的mipmap级别
  state.activeMipmapLevel = renderer.getActiveMipmapLevel();
  // 保存渲染对象函数
  state.renderObjectFunction = renderer.getRenderObjectFunction();
  // 保存像素比
  state.pixelRatio = renderer.getPixelRatio();
  // 保存多渲染目标设置
  state.mrt = renderer.getMRT();
  // 保存清除颜色（如果不存在则创建新的Color对象）
  state.clearColor = renderer.getClearColor(state.clearColor || new Color());
  // 保存清除透明度
  state.clearAlpha = renderer.getClearAlpha();
  // 保存自动清除设置
  state.autoClear = renderer.autoClear;
  // 保存裁剪测试设置
  state.scissorTest = renderer.getScissorTest();

  // 返回状态对象
  return state;
}

/**
 * 重置渲染器状态
 * 保存给定渲染器的状态并将其存储到给定的状态对象中。
 * 此外，函数还会将渲染器的状态重置为默认值。
 *
 * 如果未提供状态对象，函数会创建一个。
 *
 * @function
 * @param {Renderer} renderer - 渲染器实例
 * @param {Object} [state={}] - 状态对象
 * @return {Object} 状态对象
 */
export function resetRendererState(renderer, state) {
  // 首先保存当前状态
  state = saveRendererState(renderer, state);

  // 重置多渲染目标为null
  renderer.setMRT(null);
  // 重置渲染对象函数为null
  renderer.setRenderObjectFunction(null);
  // 重置清除颜色为黑色，透明度为1
  renderer.setClearColor(0x000000, 1);
  // 启用自动清除
  renderer.autoClear = true;

  // 返回保存的状态
  return state;
}

/**
 * 恢复渲染器状态
 * 从给定的状态对象恢复给定渲染器的状态。
 *
 * @function
 * @param {Renderer} renderer - 渲染器实例
 * @param {Object} state - 要恢复的状态对象
 */
export function restoreRendererState(renderer, state) {
  // 恢复色调映射设置
  renderer.toneMapping = state.toneMapping;
  // 恢复色调映射曝光度
  renderer.toneMappingExposure = state.toneMappingExposure;
  // 恢复输出颜色空间
  renderer.outputColorSpace = state.outputColorSpace;
  // 恢复渲染目标、立方体面和mipmap级别
  renderer.setRenderTarget(state.renderTarget, state.activeCubeFace, state.activeMipmapLevel);
  // 恢复渲染对象函数
  renderer.setRenderObjectFunction(state.renderObjectFunction);
  // 恢复像素比
  renderer.setPixelRatio(state.pixelRatio);
  // 恢复多渲染目标设置
  renderer.setMRT(state.mrt);
  // 恢复清除颜色和透明度
  renderer.setClearColor(state.clearColor, state.clearAlpha);
  // 恢复自动清除设置
  renderer.autoClear = state.autoClear;
  // 恢复裁剪测试设置
  renderer.setScissorTest(state.scissorTest);
}

/**
 * 保存场景状态
 * 保存给定场景的状态并将其存储到给定的状态对象中。
 *
 * 如果未提供状态对象，函数会创建一个。
 *
 * @function
 * @param {Scene} scene - 场景实例
 * @param {Object} [state={}] - 状态对象
 * @return {Object} 状态对象
 */
export function saveSceneState(scene, state = {}) {
  // 保存场景背景
  state.background = scene.background;
  // 保存场景背景节点
  state.backgroundNode = scene.backgroundNode;
  // 保存覆盖材质
  state.overrideMaterial = scene.overrideMaterial;

  // 返回状态对象
  return state;
}

/**
 * 重置场景状态
 * 保存给定场景的状态并将其存储到给定的状态对象中。
 * 此外，函数还会将场景的状态重置为默认值。
 *
 * 如果未提供状态对象，函数会创建一个。
 *
 * @function
 * @param {Scene} scene - 场景实例
 * @param {Object} [state={}] - 状态对象
 * @return {Object} 状态对象
 */
export function resetSceneState(scene, state) {
  // 首先保存当前状态
  state = saveSceneState(scene, state);

  // 重置场景背景为null
  scene.background = null;
  // 重置场景背景节点为null
  scene.backgroundNode = null;
  // 重置覆盖材质为null
  scene.overrideMaterial = null;

  // 返回保存的状态
  return state;
}

/**
 * 恢复场景状态
 * 从给定的状态对象恢复给定场景的状态。
 *
 * @function
 * @param {Scene} scene - 场景实例
 * @param {Object} state - 要恢复的状态对象
 */
export function restoreSceneState(scene, state) {
  // 恢复场景背景
  scene.background = state.background;
  // 恢复场景背景节点
  scene.backgroundNode = state.backgroundNode;
  // 恢复覆盖材质
  scene.overrideMaterial = state.overrideMaterial;
}

/**
 * 保存渲染器和场景状态
 * 保存给定渲染器和场景的状态并将其存储到给定的状态对象中。
 *
 * 如果未提供状态对象，函数会创建一个。
 *
 * @function
 * @param {Renderer} renderer - 渲染器实例
 * @param {Scene} scene - 场景实例
 * @param {Object} [state={}] - 状态对象
 * @return {Object} 状态对象
 */
export function saveRendererAndSceneState(renderer, scene, state = {}) {
  // 保存渲染器状态
  state = saveRendererState(renderer, state);
  // 保存场景状态
  state = saveSceneState(scene, state);

  // 返回合并的状态对象
  return state;
}

/**
 * 重置渲染器和场景状态
 * 保存给定渲染器和场景的状态并将其存储到给定的状态对象中。
 * 此外，函数还会将渲染器和场景的状态重置为默认值。
 *
 * 如果未提供状态对象，函数会创建一个。
 *
 * @function
 * @param {Renderer} renderer - 渲染器实例
 * @param {Scene} scene - 场景实例
 * @param {Object} [state={}] - 状态对象
 * @return {Object} 状态对象
 */
export function resetRendererAndSceneState(renderer, scene, state) {
  // 重置渲染器状态并保存
  state = resetRendererState(renderer, state);
  // 重置场景状态并保存
  state = resetSceneState(scene, state);

  // 返回合并的状态对象
  return state;
}

/**
 * 恢复渲染器和场景状态
 * 从给定的状态对象恢复给定渲染器和场景的状态。
 *
 * @function
 * @param {Renderer} renderer - 渲染器实例
 * @param {Scene} scene - 场景实例
 * @param {Object} state - 要恢复的状态对象
 */
export function restoreRendererAndSceneState(renderer, scene, state) {
  // 恢复渲染器状态
  restoreRendererState(renderer, state);
  // 恢复场景状态
  restoreSceneState(scene, state);
}
