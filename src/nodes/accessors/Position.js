// 导入属性节点函数
import { attribute } from "../core/AttributeNode.js";
// 导入TSL函数
import { Fn } from "../tsl/TSLCore.js";
// 导入模型世界矩阵
import { modelWorldMatrix } from "./ModelNode.js";

/**
 * TSL对象 - 表示当前渲染对象的位置属性
 *
 * @tsl
 * @type {AttributeNode<vec3>}
 */
export const positionGeometry = /*@__PURE__*/ attribute("position", "vec3");

/**
 * TSL对象 - 表示当前渲染对象在本地空间中的顶点位置
 *
 * @tsl
 * @type {AttributeNode<vec3>}
 */
export const positionLocal = /*@__PURE__*/ positionGeometry.toVarying("positionLocal");

/**
 * TSL对象 - 表示当前渲染对象在本地空间中的前一帧顶点位置
 * 在 {@link VelocityNode} 的上下文中用于渲染运动向量
 *
 * @tsl
 * @type {AttributeNode<vec3>}
 */
export const positionPrevious = /*@__PURE__*/ positionGeometry.toVarying("positionPrevious");

/**
 * TSL对象 - 表示当前渲染对象在世界空间中的顶点位置
 *
 * @tsl
 * @type {VaryingNode<vec3>}
 */
export const positionWorld = /*@__PURE__*/ Fn((builder) => {
  // 将本地位置通过模型世界矩阵变换到世界空间，并传递给片段着色器
  return modelWorldMatrix.mul(positionLocal).xyz.toVarying(builder.getSubBuildProperty("v_positionWorld"));
}, "vec3").once(["POSITION"])();

/**
 * TSL对象 - 表示当前渲染对象的位置世界方向
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const positionWorldDirection = /*@__PURE__*/ Fn(() => {
  // 将本地位置方向变换到世界空间
  const vertexPWD = positionLocal.transformDirection(modelWorldMatrix).toVarying("v_positionWorldDirection");

  // 归一化并返回位置世界方向
  return vertexPWD.normalize().toVar("positionWorldDirection");
}, "vec3").once(["POSITION"])();

/**
 * TSL对象 - 表示当前渲染对象在视图空间中的顶点位置
 *
 * @tsl
 * @type {VaryingNode<vec3>}
 */
export const positionView = /*@__PURE__*/ Fn((builder) => {
  // 通过构建器上下文设置视图位置，并传递给片段着色器
  return builder.context.setupPositionView().toVarying("v_positionView");
}, "vec3").once(["POSITION"])();

/**
 * TSL对象 - 表示当前渲染对象的位置视图方向
 *
 * @tsl
 * @type {VaryingNode<vec3>}
 */
export const positionViewDirection = /*@__PURE__*/ positionView.negate().toVarying("v_positionViewDirection").normalize().toVar("positionViewDirection");
