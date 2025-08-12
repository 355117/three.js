import { mix } from "../math/MathNode.js"; // 导入混合函数
import { Fn } from "../tsl/TSLCore.js"; // 导入TSL函数构造器

/**
 * 将给定的颜色值从sRGB转换为线性sRGB色彩空间。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} color - sRGB颜色。
 * @return {Node<vec3>} 线性sRGB颜色。
 */
export const sRGBTransferEOTF = /*@__PURE__*/ Fn(([color]) => {
  // 导出sRGB到线性sRGB的转换函数

  const a = color.mul(0.9478672986).add(0.0521327014).pow(2.4); // 计算伽马校正后的值
  const b = color.mul(0.0773993808); // 计算线性部分的值
  const factor = color.lessThanEqual(0.04045); // 判断是否使用线性转换的阈值

  const rgbResult = mix(a, b, factor); // 根据阈值混合两种转换结果

  return rgbResult; // 返回转换后的颜色
}).setLayout({
  // 设置函数布局信息
  name: "sRGBTransferEOTF", // 函数名称
  type: "vec3", // 返回类型
  inputs: [
    // 输入参数
    { name: "color", type: "vec3" }, // 颜色参数，类型为vec3
  ],
});

/**
 * 将给定的颜色值从线性sRGB转换为sRGB色彩空间。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} color - 线性sRGB颜色。
 * @return {Node<vec3>} sRGB颜色。
 */
export const sRGBTransferOETF = /*@__PURE__*/ Fn(([color]) => {
  // 导出线性sRGB到sRGB的转换函数

  const a = color.pow(0.41666).mul(1.055).sub(0.055); // 计算伽马校正后的值
  const b = color.mul(12.92); // 计算线性部分的值
  const factor = color.lessThanEqual(0.0031308); // 判断是否使用线性转换的阈值

  const rgbResult = mix(a, b, factor); // 根据阈值混合两种转换结果

  return rgbResult; // 返回转换后的颜色
}).setLayout({
  // 设置函数布局信息
  name: "sRGBTransferOETF", // 函数名称
  type: "vec3", // 返回类型
  inputs: [
    // 输入参数
    { name: "color", type: "vec3" }, // 颜色参数，类型为vec3
  ],
});
