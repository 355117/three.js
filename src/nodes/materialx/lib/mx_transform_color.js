// Three.js 转译器
// MaterialX标准库中的颜色变换函数
// https://github.com/AcademySoftwareFoundation/MaterialX/blob/main/libraries/stdlib/genglsl/lib/mx_transform_color.glsl

// 导入TSL基础类型和函数
import { bvec3, vec3, Fn } from "../../tsl/TSLBase.js";
// 导入比较运算符
import { greaterThan } from "../../math/OperatorNode.js";
// 导入数学函数
import { max, pow, mix } from "../../math/MathNode.js";

/**
 * 将sRGB纹理颜色转换为线性Rec709颜色空间。
 *
 * sRGB是一种标准的RGB颜色空间，使用伽马校正。
 * 此函数执行逆伽马校正，将sRGB值转换为线性RGB值。
 *
 * @param {vec3} color_immutable - 输入的sRGB颜色值（范围0-1）
 * @return {vec3} 转换后的线性Rec709颜色值
 */
export const mx_srgb_texture_to_lin_rec709 = /*@__PURE__*/ Fn(([color_immutable]) => {
  // 将输入颜色转换为可变变量
  const color = vec3(color_immutable).toVar();
  // 检查每个颜色分量是否大于0.04045（sRGB转换的阈值）
  const isAbove = bvec3(greaterThan(color, vec3(0.04045))).toVar();
  // 线性段：对于小值使用简单的线性除法
  const linSeg = vec3(color.div(12.92)).toVar();
  // 幂函数段：对于大值使用幂函数进行伽马校正
  const powSeg = vec3(pow(max(color.add(vec3(0.055)), vec3(0.0)).div(1.055), vec3(2.4))).toVar();

  // 根据阈值选择使用线性段还是幂函数段
  return mix(linSeg, powSeg, isAbove);
}).setLayout({
  name: "mx_srgb_texture_to_lin_rec709", // 函数名称
  type: "vec3", // 返回类型
  inputs: [
    { name: "color", type: "vec3" }, // 输入参数：sRGB颜色
  ],
});
