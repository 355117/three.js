// 从数学操作节点导入除法函数
import { div } from "../../math/OperatorNode.js";
// 从TSL基础模块导入函数构造器和三维向量
import { Fn, vec3 } from "../../tsl/TSLBase.js";

/**
 * GGX Smith相关各向异性可见性函数
 *
 * 这是Smith几何遮蔽函数的各向异性相关版本，用于计算具有方向性的材质
 * 在微表面模型中的几何遮蔽和阴影效应。
 *
 * 各向异性材质在不同方向上具有不同的粗糙度特性，如拉丝金属表面。
 * 该函数考虑了切线和副切线方向的不同粗糙度参数。
 *
 * 参考：https://google.github.io/filament/Filament.md.html#materialsystem/anisotropicmodel/anisotropicspecularbrdf
 *
 * @param {Object} params - 参数对象
 * @param {Node} params.alphaT - 切线方向的粗糙度参数
 * @param {Node} params.alphaB - 副切线方向的粗糙度参数
 * @param {Node} params.dotTV - 切线与视图方向的点积
 * @param {Node} params.dotBV - 副切线与视图方向的点积
 * @param {Node} params.dotTL - 切线与光线方向的点积
 * @param {Node} params.dotBL - 副切线与光线方向的点积
 * @param {Node} params.dotNV - 法线与视图方向的点积
 * @param {Node} params.dotNL - 法线与光线方向的点积
 * @returns {Node} Smith相关各向异性可见性值
 */
// https://google.github.io/filament/Filament.md.html#materialsystem/anisotropicmodel/anisotropicspecularbrdf

const V_GGX_SmithCorrelated_Anisotropic = /*@__PURE__*/ Fn(({ alphaT, alphaB, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL }) => {
  const gv = dotNL.mul(vec3(alphaT.mul(dotTV), alphaB.mul(dotBV), dotNV).length()); // 计算Gv项：dotNL * ||(αT*dotTV, αB*dotBV, dotNV)||
  const gl = dotNV.mul(vec3(alphaT.mul(dotTL), alphaB.mul(dotBL), dotNL).length()); // 计算Gl项：dotNV * ||(αT*dotTL, αB*dotBL, dotNL)||
  const v = div(0.5, gv.add(gl)); // 计算可见性：0.5 / (Gv + Gl)

  return v.saturate(); // 返回饱和后的可见性值，限制在[0,1]范围内
}).setLayout({
  name: "V_GGX_SmithCorrelated_Anisotropic",
  type: "float",
  inputs: [
    { name: "alphaT", type: "float", qualifier: "in" },
    { name: "alphaB", type: "float", qualifier: "in" },
    { name: "dotTV", type: "float", qualifier: "in" },
    { name: "dotBV", type: "float", qualifier: "in" },
    { name: "dotTL", type: "float", qualifier: "in" },
    { name: "dotBL", type: "float", qualifier: "in" },
    { name: "dotNV", type: "float", qualifier: "in" },
    { name: "dotNL", type: "float", qualifier: "in" },
  ],
});

export default V_GGX_SmithCorrelated_Anisotropic; // 导出GGX Smith相关各向异性可见性函数
