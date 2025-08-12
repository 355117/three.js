// 从TSL基础模块导入函数构造器
import { Fn } from "../../tsl/TSLBase.js";

/**
 * GGX/Trowbridge-Reitz分布函数
 *
 * 这是基于物理的渲染中最常用的微表面分布函数之一。
 * GGX分布在掠射角处有较长的尾部，能够很好地模拟真实材质的反射特性。
 *
 * 基于论文："Microfacet Models for Refraction through Rough Surfaces" - 公式(33)
 * 参考：http://graphicrants.blogspot.com/2013/08/specular-brdf-reference.html
 *
 * 在Disney的重新参数化中，alpha是"粗糙度的平方"
 *
 * 公式：D(h) = α² / (π * ((cos²θh * (α² - 1) + 1)²))
 * 其中：
 * - α = alpha（粗糙度参数）
 * - θh = 半向量与法线的夹角
 * - cos θh = dotNH
 *
 * @param {Object} params - 参数对象
 * @param {Node} params.alpha - 粗糙度参数（roughness²）
 * @param {Node} params.dotNH - 法线与半向量的点积
 * @returns {Node} GGX分布值
 */
// Microfacet Models for Refraction through Rough Surfaces - equation (33)
// http://graphicrants.blogspot.com/2013/08/specular-brdf-reference.html
// alpha is "roughness squared" in Disney’s reparameterization
const D_GGX = /*@__PURE__*/ Fn(({ alpha, dotNH }) => {
  const a2 = alpha.pow2(); // 计算α² = alpha²

  const denom = dotNH.pow2().mul(a2.oneMinus()).oneMinus(); // 计算分母：cos²θh * (α² - 1) + 1，避免当alpha = 0且dotNH = 1时的数值问题

  return a2.div(denom.pow2()).mul(1 / Math.PI); // 返回GGX分布：α² / (π * denom²)
}).setLayout({
  name: "D_GGX",
  type: "float",
  inputs: [
    { name: "alpha", type: "float" },
    { name: "dotNH", type: "float" },
  ],
}); // 已验证

export default D_GGX; // 导出GGX分布函数
