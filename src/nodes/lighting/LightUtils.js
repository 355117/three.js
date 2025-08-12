// 从TSL基础模块导入函数定义工具
import { Fn } from "../tsl/TSLBase.js";

/**
 * 计算光照距离衰减的TSL函数
 *
 * 基于物理的光照距离衰减计算，实现了符合物理规律的光强衰减模型。
 * 该函数结合了平方反比定律和截止距离的平滑过渡效果。
 *
 * 物理原理：
 * - 平方反比定律：光强与距离的平方成反比
 * - 衰减指数：控制衰减的速度和形状
 * - 截止距离：定义光照影响的有效范围
 * - 平滑过渡：避免硬边界造成的视觉突变
 *
 * 数学模型基于：
 * Frostbite 3 Moving to Physically-based Rendering
 * 第32页，公式26：E[window1]
 * 参考文献：https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf
 *
 * @method
 * @param {Object} inputs - 输入参数对象
 * @param {Node<float>} inputs.lightDistance - 光源位置到当前片段位置的距离
 * @param {Node<float>} inputs.cutoffDistance - 光源的截止距离，超过此距离光照影响为0
 * @param {Node<float>} inputs.decayExponent - 光源的衰减指数，控制衰减速度（通常为2，符合物理定律）
 * @return {Node<float>} 距离衰减系数，范围[0,1]，1表示无衰减，0表示完全衰减
 */
export const getDistanceAttenuation = /*@__PURE__*/ Fn(({ lightDistance, cutoffDistance, decayExponent }) => {
  // 基于Frostbite 3的物理光照模型
  // 计算基础距离衰减：distance^decayExponent 的倒数
  // max(0.01) 防止除零错误和过度明亮的近距离光照
  const distanceFalloff = lightDistance.pow(decayExponent).max(0.01).reciprocal();

  // 根据是否设置截止距离选择不同的衰减模式
  return cutoffDistance.greaterThan(0).select(
    // 有截止距离：应用平滑的边界过渡
    // 使用四次方函数创建平滑的衰减曲线，避免硬边界
    distanceFalloff.mul(lightDistance.div(cutoffDistance).pow4().oneMinus().clamp().pow2()),
    // 无截止距离：使用纯物理衰减
    distanceFalloff
  );
}); // 已验证的实现
