// 导入TSL核心函数
import { Fn } from "../tsl/TSLCore.js";
// 导入各种坐标空间下的法线节点
import { normalGeometry, normalLocal, normalView, normalWorld } from "./Normal.js";
// 导入各种坐标空间下的切线节点
import { tangentGeometry, tangentLocal, tangentView, tangentWorld } from "./Tangent.js";
// 导入视图空间副切线帧工具
import { bitangentViewFrame } from "./TangentUtils.js";
// 导入方向到面方向的转换函数
import { directionToFaceDirection } from "../display/FrontFacingNode.js";

/**
 * 返回副切线节点，如果材质不是平面着色则将其分配给varying变量
 * 副切线是垂直于切线和法线的向量，用于构建TBN矩阵
 *
 * @tsl
 * @private
 * @param {Node<vec3>} crossNormalTangent - 法线和切线向量的叉积
 * @param {string} varyingName - 要分配副切线的varying变量名称
 * @returns {Node<vec3>} 副切线节点
 */
const getBitangent = /*@__PURE__*/ Fn(([crossNormalTangent, varyingName], { subBuildFn, material }) => {
  // 计算副切线：叉积结果乘以切线的w分量（用于控制副切线方向）
  let bitangent = crossNormalTangent.mul(tangentGeometry.w).xyz;

  // 如果是法线构建阶段且材质不是平面着色，将副切线传递给片段着色器
  if (subBuildFn === "NORMAL" && material.flatShading !== true) {
    bitangent = bitangent.toVarying(varyingName);
  }

  return bitangent;
}).once(["NORMAL"]);

/**
 * TSL对象，表示当前渲染对象的几何体副切线属性
 * 几何体空间的副切线，直接来自几何体属性或通过法线和切线计算
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const bitangentGeometry = /*@__PURE__*/ getBitangent(normalGeometry.cross(tangentGeometry), "v_bitangentGeometry").normalize().toVar("bitangentGeometry");

/**
 * TSL对象，表示当前渲染对象在本地空间中的顶点副切线
 * 本地空间的副切线，用于本地坐标系下的计算
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const bitangentLocal = /*@__PURE__*/ getBitangent(normalLocal.cross(tangentLocal), "v_bitangentLocal").normalize().toVar("bitangentLocal");

/**
 * TSL对象，表示当前渲染对象在视图空间中的顶点副切线
 * 视图空间的副切线，用于视图坐标系下的光照计算
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const bitangentView = /*@__PURE__*/ Fn(({ subBuildFn, geometry, material }) => {
  let node;

  // 如果是顶点构建阶段或几何体有切线属性，通过叉积计算副切线
  if (subBuildFn === "VERTEX" || geometry.hasAttribute("tangent")) {
    node = getBitangent(normalView.cross(tangentView), "v_bitangentView").normalize();
  } else {
    // 否则使用预计算的视图空间副切线帧
    node = bitangentViewFrame;
  }

  // 如果不是平面着色，应用面方向修正
  if (material.flatShading !== true) {
    node = directionToFaceDirection(node);
  }

  return node;
}, "vec3")
  .once(["NORMAL", "VERTEX"])()
  .toVar("bitangentView");

/**
 * TSL对象，表示当前渲染对象在世界空间中的顶点副切线
 * 世界空间的副切线，用于世界坐标系下的计算
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const bitangentWorld = /*@__PURE__*/ getBitangent(normalWorld.cross(tangentWorld), "v_bitangentWorld").normalize().toVar("bitangentWorld");
