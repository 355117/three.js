// 导入统一节点
import { uniform } from "../core/UniformNode.js";
// 导入统一组节点
import { renderGroup, sharedUniformGroup } from "../core/UniformGroupNode.js";
// 导入三维向量类
import { Vector3 } from "../../math/Vector3.js";
// 导入TSL函数
import { Fn } from "../tsl/TSLBase.js";
// 导入统一数组节点
import { uniformArray } from "./UniformArrayNode.js";
// 导入内置节点
import { builtin } from "./BuiltinNode.js";

/**
 * 表示使用ArrayCamera时相机当前 `index` 值的TSL对象
 *
 * @tsl
 * @type {UniformNode<uint>}
 */
export const cameraIndex = /*@__PURE__*/ uniform(0, "uint").setName("u_cameraIndex").setGroup(sharedUniformGroup("cameraIndex")).toVarying("v_cameraIndex");

/**
 * 表示当前渲染使用的相机 `near` 值的TSL对象
 *
 * @tsl
 * @type {UniformNode<float>}
 */
export const cameraNear = /*@__PURE__*/ uniform("float")
  .setName("cameraNear") // 设置统一变量名称
  .setGroup(renderGroup) // 设置为渲染组
  .onRenderUpdate(({ camera }) => camera.near); // 渲染时更新为相机的近平面值

/**
 * 表示当前渲染使用的相机 `far` 值的TSL对象
 *
 * @tsl
 * @type {UniformNode<float>}
 */
export const cameraFar = /*@__PURE__*/ uniform("float")
  .setName("cameraFar") // 设置统一变量名称
  .setGroup(renderGroup) // 设置为渲染组
  .onRenderUpdate(({ camera }) => camera.far); // 渲染时更新为相机的远平面值

/**
 * 表示当前渲染使用的相机投影矩阵的TSL对象
 *
 * @tsl
 * @type {UniformNode<mat4>}
 */
export const cameraProjectionMatrix = /*@__PURE__*/ Fn(({ camera }) => {
  let cameraProjectionMatrix;

  // 如果是数组相机且包含子相机
  if (camera.isArrayCamera && camera.cameras.length > 0) {
    const matrices = []; // 存储所有子相机的投影矩阵

    // 遍历所有子相机，收集投影矩阵
    for (const subCamera of camera.cameras) {
      matrices.push(subCamera.projectionMatrix);
    }

    // 创建投影矩阵数组的统一变量
    const cameraProjectionMatrices = uniformArray(matrices).setGroup(renderGroup).setName("cameraProjectionMatrices");

    // 根据相机类型选择合适的索引来获取投影矩阵
    cameraProjectionMatrix = cameraProjectionMatrices.element(camera.isMultiViewCamera ? builtin("gl_ViewID_OVR") : cameraIndex).toVar("cameraProjectionMatrix");
  } else {
    // 对于单个相机，直接创建投影矩阵统一变量
    cameraProjectionMatrix = uniform("mat4")
      .setName("cameraProjectionMatrix") // 设置统一变量名称
      .setGroup(renderGroup) // 设置为渲染组
      .onRenderUpdate(({ camera }) => camera.projectionMatrix); // 渲染时更新为相机的投影矩阵
  }

  return cameraProjectionMatrix;
}).once()(); // 使用once()确保函数只执行一次并立即调用

/**
 * 表示当前渲染使用的相机投影矩阵逆矩阵的TSL对象
 *
 * @tsl
 * @type {UniformNode<mat4>}
 */
export const cameraProjectionMatrixInverse = /*@__PURE__*/ Fn(({ camera }) => {
  let cameraProjectionMatrixInverse;

  // 如果是数组相机且包含子相机
  if (camera.isArrayCamera && camera.cameras.length > 0) {
    const matrices = []; // 存储所有子相机的投影矩阵逆矩阵

    // 遍历所有子相机，收集投影矩阵逆矩阵
    for (const subCamera of camera.cameras) {
      matrices.push(subCamera.projectionMatrixInverse);
    }

    // 创建投影矩阵逆矩阵数组的统一变量
    const cameraProjectionMatricesInverse = uniformArray(matrices).setGroup(renderGroup).setName("cameraProjectionMatricesInverse");

    // 根据相机类型选择合适的索引来获取投影矩阵逆矩阵
    cameraProjectionMatrixInverse = cameraProjectionMatricesInverse
      .element(camera.isMultiViewCamera ? builtin("gl_ViewID_OVR") : cameraIndex)
      .toVar("cameraProjectionMatrixInverse");
  } else {
    // 对于单个相机，直接创建投影矩阵逆矩阵统一变量
    cameraProjectionMatrixInverse = uniform("mat4")
      .setName("cameraProjectionMatrixInverse") // 设置统一变量名称
      .setGroup(renderGroup) // 设置为渲染组
      .onRenderUpdate(({ camera }) => camera.projectionMatrixInverse); // 渲染时更新为相机的投影矩阵逆矩阵
  }

  return cameraProjectionMatrixInverse;
}).once()(); // 使用once()确保函数只执行一次并立即调用

/**
 * 表示当前渲染使用的相机视图矩阵的TSL对象
 *
 * @tsl
 * @type {UniformNode<mat4>}
 */
export const cameraViewMatrix = /*@__PURE__*/ Fn(({ camera }) => {
  let cameraViewMatrix;

  // 如果是数组相机且包含子相机
  if (camera.isArrayCamera && camera.cameras.length > 0) {
    const matrices = []; // 存储所有子相机的世界矩阵逆矩阵（视图矩阵）

    // 遍历所有子相机，收集世界矩阵逆矩阵
    for (const subCamera of camera.cameras) {
      matrices.push(subCamera.matrixWorldInverse);
    }

    // 创建视图矩阵数组的统一变量
    const cameraViewMatrices = uniformArray(matrices).setGroup(renderGroup).setName("cameraViewMatrices");

    // 根据相机类型选择合适的索引来获取视图矩阵
    cameraViewMatrix = cameraViewMatrices.element(camera.isMultiViewCamera ? builtin("gl_ViewID_OVR") : cameraIndex).toVar("cameraViewMatrix");
  } else {
    // 对于单个相机，直接创建视图矩阵统一变量
    cameraViewMatrix = uniform("mat4")
      .setName("cameraViewMatrix") // 设置统一变量名称
      .setGroup(renderGroup) // 设置为渲染组
      .onRenderUpdate(({ camera }) => camera.matrixWorldInverse); // 渲染时更新为相机的世界矩阵逆矩阵
  }

  return cameraViewMatrix;
}).once()(); // 使用once()确保函数只执行一次并立即调用

/**
 * 表示当前渲染使用的相机世界矩阵的TSL对象
 *
 * @tsl
 * @type {UniformNode<mat4>}
 */
export const cameraWorldMatrix = /*@__PURE__*/ uniform("mat4")
  .setName("cameraWorldMatrix") // 设置统一变量名称
  .setGroup(renderGroup) // 设置为渲染组
  .onRenderUpdate(({ camera }) => camera.matrixWorld); // 渲染时更新为相机的世界矩阵

/**
 * 表示当前渲染使用的相机法线矩阵的TSL对象
 *
 * @tsl
 * @type {UniformNode<mat3>}
 */
export const cameraNormalMatrix = /*@__PURE__*/ uniform("mat3")
  .setName("cameraNormalMatrix") // 设置统一变量名称
  .setGroup(renderGroup) // 设置为渲染组
  .onRenderUpdate(({ camera }) => camera.normalMatrix); // 渲染时更新为相机的法线矩阵

/**
 * 表示当前渲染使用的相机在世界空间中位置的TSL对象
 *
 * @tsl
 * @type {UniformNode<vec3>}
 */
export const cameraPosition = /*@__PURE__*/ uniform(new Vector3())
  .setName("cameraPosition") // 设置统一变量名称
  .setGroup(renderGroup) // 设置为渲染组
  .onRenderUpdate(({ camera }, self) => self.value.setFromMatrixPosition(camera.matrixWorld)); // 渲染时从相机世界矩阵中提取位置
