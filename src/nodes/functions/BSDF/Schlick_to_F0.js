// 从TSL基础模块导入函数构造器和三维向量
import { Fn, vec3 } from "../../tsl/TSLBase.js";

/**
 * Schlick到F0转换函数
 *
 * 这个函数用于从Schlick菲涅尔近似的结果反推出F0值（垂直入射时的菲涅尔反射率）。
 * 在某些情况下，我们可能需要从观察到的反射率推导出材质的基础反射率。
 *
 * 该函数执行Schlick近似的逆运算：
 * 给定观察角度的菲涅尔值f和掠射角值f90，计算F0
 *
 * @param {Object} params - 参数对象
 * @param {Node} params.f - 观察到的菲涅尔反射率
 * @param {Node} params.f90 - 掠射角时的菲涅尔反射率
 * @param {Node} params.dotVH - 视图方向与半向量的点积
 * @returns {Node} 计算得出的F0值
 */
const Schlick_to_F0 = /*@__PURE__*/ Fn(({ f, f90, dotVH }) => {
  const x = dotVH.oneMinus().saturate(); // 计算(1 - cosθ)，限制在[0,1]
  const x2 = x.mul(x); // 计算x²
  const x5 = x.mul(x2, x2).clamp(0, 0.9999); // 计算x⁵，限制最大值避免除零

  return f.sub(vec3(f90).mul(x5)).div(x5.oneMinus()); // 返回F0：(f - f90 * x⁵) / (1 - x⁵)
}).setLayout({
  name: "Schlick_to_F0",
  type: "vec3",
  inputs: [
    { name: "f", type: "vec3" },
    { name: "f90", type: "float" },
    { name: "dotVH", type: "float" },
  ],
});

export default Schlick_to_F0; // 导出Schlick到F0转换函数
