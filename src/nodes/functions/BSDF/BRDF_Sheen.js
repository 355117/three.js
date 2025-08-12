// 从法线访问器导入视图空间法线
import { normalView } from "../../accessors/Normal.js";
// 从位置访问器导入视图方向
import { positionViewDirection } from "../../accessors/Position.js";
// 从属性节点导入光泽和光泽粗糙度
import { sheen, sheenRoughness } from "../../core/PropertyNode.js";
// 从TSL基础模块导入函数构造器和浮点数
import { Fn, float } from "../../tsl/TSLBase.js";

/**
 * Charlie分布函数 - 用于织物光泽效果的微表面分布
 *
 * 基于Estevez和Kulla 2017年的论文"Production Friendly Microfacet Sheen BRDF"
 * 这个分布函数专门设计用于模拟织物材质的光泽效果。
 *
 * 参考：https://github.com/google/filament/blob/master/shaders/src/brdf.fs
 *
 * @param {Object} params - 参数对象
 * @param {Node} params.roughness - 粗糙度参数
 * @param {Node} params.dotNH - 法线与半向量的点积
 * @returns {Node} Charlie分布值
 */
const D_Charlie = /*@__PURE__*/ Fn(({ roughness, dotNH }) => {
  const alpha = roughness.pow2(); // 计算alpha = roughness²

  // Estevez和Kulla 2017年论文："Production Friendly Microfacet Sheen BRDF"
  const invAlpha = float(1.0).div(alpha); // 计算1/alpha
  const cos2h = dotNH.pow2(); // 计算cos²(θh)
  const sin2h = cos2h.oneMinus().max(0.0078125); // 计算sin²(θh) = 1 - cos²(θh)，最小值为2^(-14/2)，确保在fp16中sin2h² > 0

  return float(2.0)
    .add(invAlpha)
    .mul(sin2h.pow(invAlpha.mul(0.5)))
    .div(2.0 * Math.PI); // Charlie分布公式
}).setLayout({
  name: "D_Charlie",
  type: "float",
  inputs: [
    { name: "roughness", type: "float" },
    { name: "dotNH", type: "float" },
  ],
});

/**
 * Neubelt可见性函数 - 用于织物光泽效果的几何遮蔽函数
 *
 * 基于Neubelt和Pettineo 2013年的论文"Crafting a Next-gen Material Pipeline for The Order: 1886"
 * 这个可见性函数专门为织物材质的光泽效果设计，提供了简化但有效的几何遮蔽计算。
 *
 * 参考：https://github.com/google/filament/blob/master/shaders/src/brdf.fs
 *
 * @param {Object} params - 参数对象
 * @param {Node} params.dotNV - 法线与视图方向的点积
 * @param {Node} params.dotNL - 法线与光线方向的点积
 * @returns {Node} Neubelt可见性值
 */
const V_Neubelt = /*@__PURE__*/ Fn(({ dotNV, dotNL }) => {
  // Neubelt和Pettineo 2013年论文："Crafting a Next-gen Material Pipeline for The Order: 1886"
  return float(1.0).div(float(4.0).mul(dotNL.add(dotNV).sub(dotNL.mul(dotNV)))); // Neubelt可见性公式：1 / (4 * (dotNL + dotNV - dotNL * dotNV))
}).setLayout({
  name: "V_Neubelt",
  type: "float",
  inputs: [
    { name: "dotNV", type: "float" },
    { name: "dotNL", type: "float" },
  ],
});

/**
 * 光泽双向反射分布函数（Sheen BRDF）
 *
 * 这个BRDF专门用于模拟织物材质的光泽效果，如天鹅绒、丝绸等。
 * 它结合了Charlie分布函数和Neubelt可见性函数来创建适合织物的反射模型。
 *
 * 光泽效果通常出现在织物的边缘，当光线以掠射角入射时最为明显。
 * 这种效果为织物材质增加了真实感和丰富的视觉层次。
 *
 * BRDF = sheen * D_Charlie * V_Neubelt
 *
 * @param {Object} params - 参数对象
 * @param {Node} params.lightDirection - 光线方向向量
 * @returns {Node} 光泽BRDF值
 */
const BRDF_Sheen = /*@__PURE__*/ Fn(({ lightDirection }) => {
  const halfDir = lightDirection.add(positionViewDirection).normalize(); // 计算半向量：(光线方向 + 视图方向) / |光线方向 + 视图方向|

  const dotNL = normalView.dot(lightDirection).clamp(); // 法线与光线方向的点积，限制在[0,1]
  const dotNV = normalView.dot(positionViewDirection).clamp(); // 法线与视图方向的点积，限制在[0,1]
  const dotNH = normalView.dot(halfDir).clamp(); // 法线与半向量的点积，限制在[0,1]

  const D = D_Charlie({ roughness: sheenRoughness, dotNH }); // 计算Charlie分布函数
  const V = V_Neubelt({ dotNV, dotNL }); // 计算Neubelt可见性函数

  return sheen.mul(D).mul(V); // 返回光泽BRDF = 光泽强度 * 分布函数 * 可见性函数
});

export default BRDF_Sheen; // 导出光泽BRDF函数
