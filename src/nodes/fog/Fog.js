// 从位置访问器模块导入视图空间位置
import { positionView } from "../accessors/Position.js";
// 从数学节点模块导入平滑步进函数
import { smoothstep } from "../math/MathNode.js";
// 从TSL基础模块导入函数、输出和四维向量构造函数
import { Fn, output, vec4 } from "../tsl/TSLBase.js";

/**
 * 返回一个表示当前片段在视图空间中`z`坐标的节点。
 * 这是默认深度值的不同表示形式。
 *
 * 此值可以作为计算的一部分，定义雾密度如何随着
 * 距离相机的远近而增加。
 *
 * @param {NodeBuilder} builder - 当前节点构建器
 * @return {Node} viewZ节点
 */
function getViewZNode(builder) {
  let viewZ; // 视图Z坐标变量

  const getViewZ = builder.context.getViewZ; // 从构建器上下文获取getViewZ函数

  if (getViewZ !== undefined) {
    // 如果getViewZ函数已定义

    viewZ = getViewZ(this); // 调用getViewZ函数获取视图Z坐标
  }

  return (viewZ || positionView.z).negate(); // 返回负的viewZ值或位置视图的z坐标
}

/**
 * 构造一个新的范围雾因子节点。
 *
 * 此函数创建一个基于距离的雾效果，在近平面和远平面之间
 * 使用平滑插值来计算雾的强度。
 *
 * @tsl
 * @function
 * @param {Node} near - 定义近平面值，雾开始出现的距离
 * @param {Node} far - 定义远平面值，雾完全浓密的距离
 */
export const rangeFogFactor = Fn(([near, far], builder) => {
  const viewZ = getViewZNode(builder); // 获取当前片段的视图Z坐标

  return smoothstep(near, far, viewZ); // 在近远平面之间进行平滑插值
});

/**
 * 表示指数平方雾。这种类型的雾在相机附近提供清晰的视野，
 * 在远离相机的地方雾密度以超过指数的速度增加。
 *
 * 这种雾模型模拟了现实世界中雾的物理特性，
 * 其中雾密度随距离呈指数增长。
 *
 * @tsl
 * @function
 * @param {Node} density - 定义雾的密度参数
 */
export const densityFogFactor = Fn(([density], builder) => {
  const viewZ = getViewZNode(builder); // 获取当前片段的视图Z坐标

  return density.mul(density, viewZ, viewZ).negate().exp().oneMinus(); // 计算指数平方雾因子：1 - exp(-(density * viewZ)^2)
});

/**
 * 此函数可用于为场景配置雾效果。
 * 此类型的节点被分配给`Scene.fogNode`。
 *
 * 该函数将雾颜色与场景颜色进行混合，根据雾因子
 * 来确定最终的渲染颜色。
 *
 * @tsl
 * @function
 * @param {Node} color - 定义雾的颜色
 * @param {Node} factor - 定义雾在场景中的混合因子
 */
export const fog = Fn(([color, factor]) => {
  return vec4(factor.toFloat().mix(output.rgb, color.toVec3()), output.a); // 使用雾因子混合输出颜色和雾颜色，保持alpha通道
});

// 已弃用的函数

/**
 * 范围雾函数（已弃用）
 *
 * @tsl
 * @function
 * @deprecated 自r171版本起已弃用。请使用 `fog( color, rangeFogFactor( near, far ) )` 代替。
 *
 * @param {Node} color - 雾的颜色
 * @param {Node} near - 近平面距离
 * @param {Node} far - 远平面距离
 * @returns {Function} 雾效果函数
 */
export function rangeFog(color, near, far) {
  // @deprecated, r171 - 已弃用，版本r171

  console.warn('THREE.TSL: "rangeFog( color, near, far )" is deprecated. Use "fog( color, rangeFogFactor( near, far ) )" instead.'); // 输出弃用警告
  return fog(color, rangeFogFactor(near, far)); // 返回新的雾效果实现
}

/**
 * 密度雾函数（已弃用）
 *
 * @tsl
 * @function
 * @deprecated 自r171版本起已弃用。请使用 `fog( color, densityFogFactor( density ) )` 代替。
 *
 * @param {Node} color - 雾的颜色
 * @param {Node} density - 雾的密度
 * @returns {Function} 雾效果函数
 */
export function densityFog(color, density) {
  // @deprecated, r171 - 已弃用，版本r171

  console.warn('THREE.TSL: "densityFog( color, density )" is deprecated. Use "fog( color, densityFogFactor( density ) )" instead.'); // 输出弃用警告
  return fog(color, densityFogFactor(density)); // 返回新的密度雾效果实现
}
