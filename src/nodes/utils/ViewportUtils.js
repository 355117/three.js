/**
 * ViewportUtils.js - 视口工具函数
 *
 * 该文件提供了用于视口相关操作的实用工具函数。
 * 主要用于处理屏幕空间效果和深度相关的计算。
 */

// 导入TSL基础工具
import { Fn } from "../tsl/TSLBase.js";
// 导入屏幕UV坐标
import { screenUV } from "../display/ScreenNode.js";
// 导入视口深度纹理
import { viewportDepthTexture } from "../display/ViewportDepthTextureNode.js";
// 导入线性深度函数
import { linearDepth } from "../display/ViewportDepthNode.js";

/**
 * 安全的视口UV坐标函数
 *
 * 这是屏幕UV函数的特殊版本，在计算最终UV坐标时包含深度比较。
 * 该函数可以减轻在折射效果中使用视口纹理节点时的视觉错误。
 * 如果没有这个函数，折射表面前方的物体可能会错误地出现在折射表面上。
 *
 * 主要用途：
 * - 折射效果的正确渲染
 * - 避免深度冲突
 * - 屏幕空间反射和折射
 *
 * @tsl
 * @function
 * @param {?Node<vec2>} uv - 可选的UV坐标。默认使用 screenUV
 * @return {Node<vec2>} 更新后的UV坐标
 */
export const viewportSafeUV = /*@__PURE__*/ Fn(([uv = null]) => {
  // 获取当前片段的线性深度
  const depth = linearDepth();

  // 获取指定UV位置的深度纹理值并转换为线性深度，然后与当前深度比较
  const depthDiff = linearDepth(viewportDepthTexture(uv)).sub(depth);

  // 如果深度差小于0（即采样点在当前片段后面），使用原始screenUV
  // 否则使用传入的uv坐标，这样可以避免折射时的深度冲突
  const finalUV = depthDiff.lessThan(0).select(screenUV, uv);

  return finalUV;
});
