// 导入Schlick菲涅尔近似函数
import F_Schlick from "./F_Schlick.js";
// 导入GGX Smith相关可见性函数
import V_GGX_SmithCorrelated from "./V_GGX_SmithCorrelated.js";
// 导入GGX Smith相关各向异性可见性函数
import V_GGX_SmithCorrelated_Anisotropic from "./V_GGX_SmithCorrelated_Anisotropic.js";
// 导入GGX分布函数
import D_GGX from "./D_GGX.js";
// 导入GGX各向异性分布函数
import D_GGX_Anisotropic from "./D_GGX_Anisotropic.js";
// 从法线访问器导入视图空间法线
import { normalView as NormalView } from "../../accessors/Normal.js";
// 从位置访问器导入视图方向
import { positionViewDirection } from "../../accessors/Position.js";
// 从属性节点导入彩虹色、切线alpha、各向异性切线和副切线
import { iridescence, alphaT, anisotropyT, anisotropyB } from "../../core/PropertyNode.js";
// 从TSL基础模块导入函数和定义检查
import { Fn, defined } from "../../tsl/TSLBase.js";

/**
 * GGX双向反射分布函数（BRDF）
 *
 * 这是一个基于物理的渲染（PBR）中使用的BRDF实现，结合了：
 * - GGX/Trowbridge-Reitz分布函数（D项）
 * - Schlick菲涅尔近似（F项）
 * - Smith相关可见性函数（G项）
 *
 * 支持彩虹色效果和各向异性材质。
 *
 * @param {Object} params - BRDF参数
 * @param {Node} params.lightDirection - 光线方向向量
 * @param {Node} params.f0 - 垂直入射时的菲涅尔反射率
 * @param {Node} params.f90 - 掠射角时的菲涅尔反射率
 * @param {Node} params.roughness - 表面粗糙度
 * @param {Node} params.f - 彩虹色菲涅尔项（可选）
 * @param {Node} params.normalView - 视图空间法线（默认为NormalView）
 * @param {boolean} params.USE_IRIDESCENCE - 是否使用彩虹色效果
 * @param {boolean} params.USE_ANISOTROPY - 是否使用各向异性
 */
// GGX分布、Schlick菲涅尔、GGX_Smith相关可见性的组合BRDF
const BRDF_GGX = /*@__PURE__*/ Fn(({ lightDirection, f0, f90, roughness, f, normalView = NormalView, USE_IRIDESCENCE, USE_ANISOTROPY }) => {
  const alpha = roughness.pow2(); // UE4风格的粗糙度：alpha = roughness²

  const halfDir = lightDirection.add(positionViewDirection).normalize(); // 计算半向量：(光线方向 + 视图方向) / |光线方向 + 视图方向|

  const dotNL = normalView.dot(lightDirection).clamp(); // 法线与光线方向的点积，限制在[0,1]
  const dotNV = normalView.dot(positionViewDirection).clamp(); // 法线与视图方向的点积，限制在[0,1] // TODO: 移动到核心dotNV
  const dotNH = normalView.dot(halfDir).clamp(); // 法线与半向量的点积，限制在[0,1]
  const dotVH = positionViewDirection.dot(halfDir).clamp(); // 视图方向与半向量的点积，限制在[0,1]

  let F = F_Schlick({ f0, f90, dotVH }); // 计算Schlick菲涅尔近似
  let V, D; // 可见性函数和分布函数变量

  if (defined(USE_IRIDESCENCE)) {
    // 如果启用彩虹色效果
    F = iridescence.mix(F, f); // 混合标准菲涅尔和彩虹色菲涅尔
  }

  if (defined(USE_ANISOTROPY)) {
    // 如果启用各向异性
    // 计算各向异性相关的点积
    const dotTL = anisotropyT.dot(lightDirection); // 切线与光线方向的点积
    const dotTV = anisotropyT.dot(positionViewDirection); // 切线与视图方向的点积
    const dotTH = anisotropyT.dot(halfDir); // 切线与半向量的点积
    const dotBL = anisotropyB.dot(lightDirection); // 副切线与光线方向的点积
    const dotBV = anisotropyB.dot(positionViewDirection); // 副切线与视图方向的点积
    const dotBH = anisotropyB.dot(halfDir); // 副切线与半向量的点积

    V = V_GGX_SmithCorrelated_Anisotropic({ alphaT, alphaB: alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL }); // 各向异性Smith相关可见性函数
    D = D_GGX_Anisotropic({ alphaT, alphaB: alpha, dotNH, dotTH, dotBH }); // 各向异性GGX分布函数
  } else {
    // 各向同性情况
    V = V_GGX_SmithCorrelated({ alpha, dotNL, dotNV }); // 标准Smith相关可见性函数
    D = D_GGX({ alpha, dotNH }); // 标准GGX分布函数
  }

  return F.mul(V).mul(D); // 返回BRDF = F * G * D / (4 * dotNL * dotNV)，其中G项已包含在V中
}); // 已验证

export default BRDF_GGX; // 导出GGX BRDF函数
