// 从TSL基础模块导入函数构造器、二维向量和四维向量
import { Fn, vec2, vec4 } from "../../tsl/TSLBase.js";

/**
 * DFG查找表的解析近似
 *
 * 这是间接镜面反射光照中使用的分割求和近似的一半。
 * DFG代表分布函数(D)、菲涅尔项(F)和几何函数(G)的预积分结果。
 *
 * 该近似避免了运行时查找预计算的LUT纹理，提供了更高的性能。
 * 特别适用于移动设备等资源受限的平台。
 *
 * 基于"Physically Based Shading on Mobile"中的environmentBRDF实现
 * 参考：https://www.unrealengine.com/blog/physically-based-shading-on-mobile
 *
 * @param {Object} params - 参数对象
 * @param {Node} params.roughness - 表面粗糙度
 * @param {Node} params.dotNV - 法线与视图方向的点积
 * @returns {Node} DFG近似值（二维向量）
 */
// DFG LUT的解析近似，间接镜面反射光照中分割求和近似的一半
// 来自"Physically Based Shading on Mobile"中的'environmentBRDF'
// https://www.unrealengine.com/blog/physically-based-shading-on-mobile
const DFGApprox = /*@__PURE__*/ Fn(({ roughness, dotNV }) => {
  const c0 = vec4(-1, -0.0275, -0.572, 0.022); // 第一组拟合系数

  const c1 = vec4(1, 0.0425, 1.04, -0.04); // 第二组拟合系数

  const r = roughness.mul(c0).add(c1); // 计算粗糙度相关的中间值：roughness * c0 + c1

  const a004 = r.x.mul(r.x).min(dotNV.mul(-9.28).exp2()).mul(r.x).add(r.y); // 计算复杂的拟合项

  const fab = vec2(-1.04, 1.04).mul(a004).add(r.zw); // 计算最终的DFG近似值

  return fab; // 返回二维DFG近似结果
}).setLayout({
  name: "DFGApprox",
  type: "vec2",
  inputs: [
    { name: "roughness", type: "float" },
    { name: "dotNV", type: "vec3" },
  ],
});

export default DFGApprox; // 导出DFG近似函数
