// 导入属性节点
import { attribute } from "../core/AttributeNode.js";
// 导入相机视图矩阵
import { cameraViewMatrix } from "./Camera.js";
// 导入模型法线矩阵和世界矩阵
import { modelNormalMatrix, modelWorldMatrix } from "./ModelNode.js";
// 导入TSL基础类型和函数
import { mat3, vec3, Fn } from "../tsl/TSLBase.js";
// 导入视图空间位置
import { positionView } from "./Position.js";
// 导入面向方向转换函数
import { directionToFaceDirection } from "../display/FrontFacingNode.js";

/**
 * TSL对象 - 表示当前渲染对象在本地空间中的法线属性
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const normalGeometry = /*@__PURE__*/ attribute("normal", "vec3");

/**
 * TSL对象 - 表示当前渲染对象在本地空间中的顶点法线
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const normalLocal = /*@__PURE__*/ Fn((builder) => {
  // 检查几何体是否有法线属性
  if (builder.geometry.hasAttribute("normal") === false) {
    // 如果没有法线属性，发出警告并返回默认向上法线
    console.warn('THREE.TSL: Vertex attribute "normal" not found on geometry.');

    return vec3(0, 1, 0);
  }

  // 返回几何体法线属性
  return normalGeometry;
}, "vec3")
  .once()()
  .toVar("normalLocal");

/**
 * TSL对象 - 表示当前渲染对象在视图空间中的平面顶点法线
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const normalFlat = /*@__PURE__*/ positionView.dFdx().cross(positionView.dFdy()).normalize().toVar("normalFlat");

/**
 * TSL对象 - 表示当前渲染对象在视图空间中的顶点法线
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const normalViewGeometry = /*@__PURE__*/ Fn((builder) => {
  let node;

  // 如果材质使用平面着色
  if (builder.material.flatShading === true) {
    // 使用平面法线
    node = normalFlat;
  } else {
    // 将本地法线变换到视图空间，并传递给片段着色器
    node = transformNormalToView(normalLocal).toVarying("v_normalViewGeometry").normalize();
  }

  return node;
}, "vec3")
  .once()()
  .toVar("normalViewGeometry");

/**
 * TSL对象 - 表示当前渲染对象在世界空间中的顶点法线
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const normalWorldGeometry = /*@__PURE__*/ Fn((builder) => {
  // 将视图空间法线变换到世界空间
  let normal = normalViewGeometry.transformDirection(cameraViewMatrix);

  // 如果不是平面着色，将法线传递给片段着色器
  if (builder.material.flatShading !== true) {
    normal = normal.toVarying("v_normalWorldGeometry");
  }

  // 归一化并返回世界空间法线
  return normal.normalize().toVar("normalWorldGeometry");
}, "vec3").once()();

/**
 * TSL对象 - 表示当前渲染对象在视图空间中的顶点法线
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const normalView = /*@__PURE__*/ Fn(({ subBuildFn, material, context }) => {
  let node;

  // 如果是法线或顶点构建阶段
  if (subBuildFn === "NORMAL" || subBuildFn === "VERTEX") {
    // 使用几何体视图法线
    node = normalViewGeometry;

    // 如果不是平面着色，转换为面向方向
    if (material.flatShading !== true) {
      node = directionToFaceDirection(node);
    }
  } else {
    // 使用getUV上下文避免节点覆盖getUV时的副作用（例如EnvironmentNode）

    node = context.setupNormal().context({ getUV: null });
  }

  return node;
}, "vec3")
  .once(["NORMAL", "VERTEX"])()
  .toVar("normalView");

/**
 * TSL对象 - 表示当前渲染对象在世界空间中的顶点法线
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const normalWorld = /*@__PURE__*/ normalView.transformDirection(cameraViewMatrix).toVar("normalWorld");

/**
 * TSL对象 - 表示当前渲染对象在视图空间中的清漆顶点法线
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const clearcoatNormalView = /*@__PURE__*/ Fn(({ subBuildFn, context }) => {
  let node;

  // 如果是法线或顶点构建阶段
  if (subBuildFn === "NORMAL" || subBuildFn === "VERTEX") {
    // 使用普通视图法线
    node = normalView;
  } else {
    // 使用getUV上下文避免节点覆盖getUV时的副作用（例如EnvironmentNode）

    node = context.setupClearcoatNormal().context({ getUV: null });
  }

  return node;
}, "vec3")
  .once(["NORMAL", "VERTEX"])()
  .toVar("clearcoatNormalView");

/**
 * 使用给定矩阵变换法线
 *
 * @tsl
 * @function
 * @param {Node<vec3>} normal - 法线向量
 * @param {Node<mat3>} [matrix=modelWorldMatrix] - 变换矩阵
 * @return {Node<vec3>} 变换后的法线
 */
export const transformNormal = /*@__PURE__*/ Fn(([normal, matrix = modelWorldMatrix]) => {
  // 将矩阵转换为3x3矩阵
  const m = mat3(matrix);

  // 计算变换后的法线：法线除以矩阵各列的长度平方
  const transformedNormal = normal.div(vec3(m[0].dot(m[0]), m[1].dot(m[1]), m[2].dot(m[2])));

  // 应用矩阵变换并返回xyz分量
  return m.mul(transformedNormal).xyz;
});

/**
 * 将给定法线从本地空间变换到视图空间
 *
 * @tsl
 * @function
 * @param {Node<vec3>} normal - 法线向量
 * @param {NodeBuilder} builder - 当前节点构建器
 * @return {Node<vec3>} 变换后的法线
 */
export const transformNormalToView = /*@__PURE__*/ Fn(([normal], builder) => {
  // 获取渲染器覆盖的模型法线视图矩阵
  const modelNormalViewMatrix = builder.renderer.overrideNodes.modelNormalViewMatrix;

  // 如果有覆盖矩阵，使用它来变换法线
  if (modelNormalViewMatrix !== null) {
    return modelNormalViewMatrix.transformDirection(normal);
  }

  // 否则使用标准变换流程

  // 首先用模型法线矩阵变换法线
  const transformedNormal = modelNormalMatrix.mul(normal);

  // 然后用相机视图矩阵变换方向
  return cameraViewMatrix.transformDirection(transformedNormal);
});

// 已弃用的导出

/**
 * TSL对象 - 表示当前渲染对象在视图空间中的变换顶点法线
 *
 * @tsl
 * @type {Node<vec3>}
 * @deprecated 自r178起弃用。请使用 `normalView` 代替。
 */
export const transformedNormalView = Fn(() => {
  // @deprecated, r177

  console.warn('THREE.TSL: "transformedNormalView" is deprecated. Use "normalView" instead.');
  return normalView;
}).once(["NORMAL", "VERTEX"])();

/**
 * TSL对象 - 表示当前渲染对象在世界空间中的变换顶点法线
 *
 * @tsl
 * @type {Node<vec3>}
 * @deprecated 自r178起弃用。请使用 `normalWorld` 代替。
 */
export const transformedNormalWorld = Fn(() => {
  // @deprecated, r177

  console.warn('THREE.TSL: "transformedNormalWorld" is deprecated. Use "normalWorld" instead.');
  return normalWorld;
}).once(["NORMAL", "VERTEX"])();

/**
 * TSL对象 - 表示当前渲染对象在视图空间中的变换清漆顶点法线
 *
 * @tsl
 * @type {Node<vec3>}
 * @deprecated 自r178起弃用。请使用 `clearcoatNormalView` 代替。
 */
export const transformedClearcoatNormalView = Fn(() => {
  // @deprecated, r177

  console.warn('THREE.TSL: "transformedClearcoatNormalView" is deprecated. Use "clearcoatNormalView" instead.');
  return clearcoatNormalView;
}).once(["NORMAL", "VERTEX"])();
