/**
 * UVUtils.js - UV坐标工具函数
 *
 * 该文件提供了用于UV坐标变换和特效的实用工具函数。
 * 包括旋转、球形化等常用的UV操作。
 */

// 导入TSL基础工具
import { Fn, vec2 } from "../tsl/TSLBase.js";
// 导入旋转节点
import { rotate } from "./RotateNode.js";

/**
 * 围绕中心点旋转UV坐标
 *
 * 该函数可以将UV坐标围绕指定的中心点进行旋转变换，
 * 常用于纹理动画、特效和程序化材质。
 *
 * @tsl
 * @function
 * @param {Node<vec2>} uv - UV坐标
 * @param {Node<float>} rotation - 旋转角度（弧度制）
 * @param {Node<vec2>} center - 旋转中心点，默认为(0.5, 0.5)
 * @return {Node<vec2>} 旋转后的UV坐标
 */
export const rotateUV = /*@__PURE__*/ Fn(([uv, rotation, center = vec2(0.5)]) => {
  // 将UV坐标平移到以center为原点的坐标系
  // 进行旋转后再平移回原来的坐标系
  return rotate(uv.sub(center), rotation).add(center);
});

/**
 * 对UV坐标应用球形扭曲效果
 *
 * 该函数创建一种球形扭曲效果，使纹理看起来像是被球形表面扭曲。
 * 常用于鱼眼效果、透镜扭曲和艺术化变形。
 *
 * @tsl
 * @function
 * @param {Node<vec2>} uv - UV坐标
 * @param {Node<float>} strength - 效果强度，值越大扭曲越明显
 * @param {Node<vec2>} center - 扭曲中心点，默认为(0.5, 0.5)
 * @return {Node<vec2>} 应用球形扭曲后的UV坐标
 */
export const spherizeUV = /*@__PURE__*/ Fn(([uv, strength, center = vec2(0.5)]) => {
  // 计算从中心点到当前UV点的向量
  const delta = uv.sub(center);
  // 计算距离的平方
  const delta2 = delta.dot(delta);
  // 计算距离的四次方，用于创建非线性扭曲
  const delta4 = delta2.mul(delta2);
  // 根据距离和强度计算偏移量
  const deltaOffset = delta4.mul(strength);

  // 应用球形扭曲：原UV + 径向偏移
  return uv.add(delta.mul(deltaOffset));
});
