// 从TSL基础模块导入函数构造器、浮点数和三维向量
import { Fn, float, vec3 } from "../../tsl/TSLBase.js";

const RECIPROCAL_PI = /*@__PURE__*/ float(1 / Math.PI); // π的倒数常量

/**
 * GGX各向异性分布函数
 *
 * 这是GGX分布函数的各向异性版本，用于模拟具有方向性反射特性的材质，
 * 如拉丝金属、木材纹理等。各向异性材质在不同方向上具有不同的粗糙度。
 *
 * 该实现基于Filament渲染引擎的各向异性BRDF模型。
 *
 * 参考：https://google.github.io/filament/Filament.md.html#materialsystem/anisotropicmodel/anisotropicspecularbrdf
 *
 * @param {Object} params - 参数对象
 * @param {Node} params.alphaT - 切线方向的粗糙度参数
 * @param {Node} params.alphaB - 副切线方向的粗糙度参数
 * @param {Node} params.dotNH - 法线与半向量的点积
 * @param {Node} params.dotTH - 切线与半向量的点积
 * @param {Node} params.dotBH - 副切线与半向量的点积
 * @returns {Node} GGX各向异性分布值
 */
// https://google.github.io/filament/Filament.md.html#materialsystem/anisotropicmodel/anisotropicspecularbrdf

const D_GGX_Anisotropic = /*@__PURE__*/ Fn(({ alphaT, alphaB, dotNH, dotTH, dotBH }) => {
  const a2 = alphaT.mul(alphaB); // 计算αT * αB
  const v = vec3(alphaB.mul(dotTH), alphaT.mul(dotBH), a2.mul(dotNH)); // 构建向量v = (αB * dotTH, αT * dotBH, a2 * dotNH)
  const v2 = v.dot(v); // 计算v的长度平方：v·v
  const w2 = a2.div(v2); // 计算权重：w² = a2 / v²

  return RECIPROCAL_PI.mul(a2.mul(w2.pow2())); // 返回各向异性GGX分布：(1/π) * a2 * w⁴
}).setLayout({
  name: "D_GGX_Anisotropic",
  type: "float",
  inputs: [
    { name: "alphaT", type: "float", qualifier: "in" },
    { name: "alphaB", type: "float", qualifier: "in" },
    { name: "dotNH", type: "float", qualifier: "in" },
    { name: "dotTH", type: "float", qualifier: "in" },
    { name: "dotBH", type: "float", qualifier: "in" },
  ],
});

export default D_GGX_Anisotropic; // 导出GGX各向异性分布函数
