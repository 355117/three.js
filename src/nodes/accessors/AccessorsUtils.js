// 导入视图空间法线节点
import { normalView } from "./Normal.js";
// 导入视图空间切线节点
import { tangentView } from "./Tangent.js";
// 导入视图空间副切线节点
import { bitangentView } from "./Bitangent.js";
// 导入TSL核心函数和数据类型
import { Fn, mat3 } from "../tsl/TSLBase.js";
// 导入数学混合函数
import { mix } from "../math/MathNode.js";
// 导入各向异性相关属性节点
import { anisotropy, anisotropyB, roughness } from "../core/PropertyNode.js";
// 导入视图空间位置方向节点
import { positionViewDirection } from "./Position.js";

/**
 * TSL对象，表示视图空间中的TBN（切线、副切线、法线）矩阵
 * TBN矩阵用于将切线空间的向量转换到视图空间，常用于法线贴图和各向异性材质
 *
 * @tsl
 * @type {Node<mat3>}
 */
export const TBNViewMatrix = /*@__PURE__*/ mat3(tangentView, bitangentView, normalView).toVar("TBNViewMatrix");

/**
 * TSL对象，表示视差映射的方向向量
 * 将视图空间的位置方向转换到切线空间，用于视差映射效果
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const parallaxDirection = /*@__PURE__*/ positionViewDirection.mul(TBNViewMatrix); /*.normalize()*/

/**
 * TSL函数，用于计算视差映射的UV坐标
 * 通过深度信息偏移UV坐标来模拟表面凹凸效果
 *
 * @tsl
 * @function
 * @param {Node<vec2>} uv - 原始UV坐标节点
 * @param {Node<vec2>} scale - 视差缩放因子节点，控制视差效果强度
 * @returns {Node<vec2>} 应用视差偏移后的UV坐标
 */
export const parallaxUV = (uv, scale) => uv.sub(parallaxDirection.mul(scale));

/**
 * TSL函数，用于计算弯曲法线（各向异性材质的法线）
 * 弯曲法线考虑了材质的各向异性特性和粗糙度，用于更真实的光照计算
 * 参考：https://google.github.io/filament/Filament.md.html#lighting/imagebasedlights/anisotropy
 *
 * @tsl
 * @function
 * @returns {Node<vec3>} 弯曲法线
 */
export const bentNormalView = /*@__PURE__*/ Fn(() => {
  // 参考Filament渲染引擎的各向异性光照实现

  // 计算与各向异性方向垂直的向量
  let bentNormal = anisotropyB.cross(positionViewDirection);
  // 再次叉积得到弯曲法线方向并标准化
  bentNormal = bentNormal.cross(anisotropyB).normalize();
  // 根据各向异性强度和粗糙度混合弯曲法线和原始法线
  bentNormal = mix(bentNormal, normalView, anisotropy.mul(roughness.oneMinus()).oneMinus().pow2().pow2()).normalize();

  return bentNormal;
}).once()();
