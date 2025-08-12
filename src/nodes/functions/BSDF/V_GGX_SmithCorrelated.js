// 从数学操作节点导入除法函数
import { div } from "../../math/OperatorNode.js";
// 从数学节点导入极小值常量
import { EPSILON } from "../../math/MathNode.js";
// 从TSL基础模块导入函数构造器
import { Fn } from "../../tsl/TSLBase.js";

/**
 * GGX Smith相关可见性函数
 *
 * 这是Smith几何遮蔽函数的相关版本，用于计算微表面模型中的几何遮蔽和阴影效应。
 * Smith相关版本考虑了光线方向和视图方向之间的相关性，提供了更准确的遮蔽计算。
 *
 * 该实现基于Frostbite引擎向基于物理的渲染3.0迁移的技术文档。
 *
 * 参考：Moving Frostbite to Physically Based Rendering 3.0 - page 12, listing 2
 * https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf
 *
 * @param {Object} params - 参数对象
 * @param {Node} params.alpha - 粗糙度参数
 * @param {Node} params.dotNL - 法线与光线方向的点积
 * @param {Node} params.dotNV - 法线与视图方向的点积
 * @returns {Node} Smith相关可见性值
 */
// 将Frostbite迁移到基于物理的渲染3.0 - 第12页，清单2
// https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf
const V_GGX_SmithCorrelated = /*@__PURE__*/ Fn(({ alpha, dotNL, dotNV }) => {
  const a2 = alpha.pow2(); // 计算α² = alpha²

  const gv = dotNL.mul(a2.add(a2.oneMinus().mul(dotNV.pow2())).sqrt()); // 计算Gv项：dotNL * sqrt(α² + (1-α²) * dotNV²)
  const gl = dotNV.mul(a2.add(a2.oneMinus().mul(dotNL.pow2())).sqrt()); // 计算Gl项：dotNV * sqrt(α² + (1-α²) * dotNL²)

  return div(0.5, gv.add(gl).max(EPSILON)); // 返回Smith相关可见性：0.5 / (Gv + Gl)，使用EPSILON避免除零
}).setLayout({
  name: "V_GGX_SmithCorrelated",
  type: "float",
  inputs: [
    { name: "alpha", type: "float" },
    { name: "dotNL", type: "float" },
    { name: "dotNV", type: "float" },
  ],
}); // 已验证

export default V_GGX_SmithCorrelated; // 导出GGX Smith相关可见性函数
