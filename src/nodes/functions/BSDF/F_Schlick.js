// 从TSL基础模块导入函数构造器
import { Fn } from "../../tsl/TSLBase.js";

/**
 * Schlick菲涅尔近似函数
 *
 * 菲涅尔效应描述了光线在不同介质界面上的反射和折射行为。
 * 当观察角度接近掠射角时，反射率会显著增加。
 *
 * Schlick近似是一个高效的菲涅尔反射率计算方法，由Christophe Schlick
 * 在1994年提出。该实现使用了Epic Games在SIGGRAPH 2013上展示的优化版本。
 *
 * 原始近似：F = f0 + (f90 - f0) * (1 - cosθ)^5
 * 优化版本：使用指数函数的快速近似来替代幂运算
 *
 * @param {Object} params - 参数对象
 * @param {Node} params.f0 - 垂直入射时的菲涅尔反射率（基础反射率）
 * @param {Node} params.f90 - 掠射角时的菲涅尔反射率（通常为1.0）
 * @param {Node} params.dotVH - 视图方向与半向量的点积（cosθ）
 * @returns {Node} Schlick菲涅尔近似值
 */
const F_Schlick = /*@__PURE__*/ Fn(({ f0, f90, dotVH }) => {
  // Christophe Schlick 1994年的原始近似
  // float fresnel = pow( 1.0 - dotVH, 5.0 );

  // 优化版本（Epic在SIGGRAPH 2013上展示）
  // https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf
  const fresnel = dotVH.mul(-5.55473).sub(6.98316).mul(dotVH).exp2(); // 使用exp2快速近似(1-cosθ)^5

  return f0.mul(fresnel.oneMinus()).add(f90.mul(fresnel)); // 返回：f0 * (1 - fresnel) + f90 * fresnel
}); // 已验证

export default F_Schlick; // 导出Schlick菲涅尔近似函数
