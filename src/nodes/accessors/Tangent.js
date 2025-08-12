// 导入属性节点函数
import { attribute } from "../core/AttributeNode.js";
// 导入相机视图矩阵
import { cameraViewMatrix } from "./Camera.js";
// 导入模型视图矩阵
import { modelViewMatrix } from "./ModelNode.js";
// 导入TSL函数和向量构造器
import { Fn, vec4 } from "../tsl/TSLBase.js";
// 导入切线视图框架
import { tangentViewFrame } from "./TangentUtils.js";
// 导入方向到面方向转换函数
import { directionToFaceDirection } from "../display/FrontFacingNode.js";

/**
 * TSL对象 - 表示当前渲染对象的切线属性
 *
 * @tsl
 * @type {Node<vec4>}
 */
export const tangentGeometry = /*@__PURE__*/ Fn((builder) => {
  // 如果几何体没有切线属性，计算切线
  if (builder.geometry.hasAttribute("tangent") === false) {
    builder.geometry.computeTangents();
  }

  // 返回切线属性节点
  return attribute("tangent", "vec4");
})();

/**
 * TSL对象 - 表示当前渲染对象在本地空间中的顶点切线
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const tangentLocal = /*@__PURE__*/ tangentGeometry.xyz.toVar("tangentLocal");

/**
 * TSL对象 - 表示当前渲染对象在视图空间中的顶点切线
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const tangentView = /*@__PURE__*/ Fn(({ subBuildFn, geometry, material }) => {
  let node;

  // 如果是顶点着色器或几何体有切线属性
  if (subBuildFn === "VERTEX" || geometry.hasAttribute("tangent")) {
    // 使用模型视图矩阵变换本地切线到视图空间
    node = modelViewMatrix.mul(vec4(tangentLocal, 0)).xyz.toVarying("v_tangentView").normalize();
  } else {
    // 否则使用切线视图框架
    node = tangentViewFrame;
  }

  // 如果不是平面着色，应用面方向转换
  if (material.flatShading !== true) {
    node = directionToFaceDirection(node);
  }

  return node;
}, "vec3")
  .once(["NORMAL", "VERTEX"])()
  .toVar("tangentView");

/**
 * TSL对象 - 表示当前渲染对象在世界空间中的顶点切线
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const tangentWorld = /*@__PURE__*/ tangentView.transformDirection(cameraViewMatrix).toVarying("v_tangentWorld").normalize().toVar("tangentWorld");
