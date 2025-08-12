// 导入统一节点
import { uniform } from "../core/UniformNode.js";
// 导入渲染组
import { renderGroup } from "../core/UniformGroupNode.js";
// 导入三维向量类
import { Vector3 } from "../../math/Vector3.js";
// 导入相机视图矩阵
import { cameraViewMatrix } from "./Camera.js";
// 导入世界位置
import { positionWorld } from "./Position.js";

// 用于存储光源统一变量的弱映射
let uniformsLib;

/**
 * 获取光源的数据对象，用于缓存统一变量
 *
 * @param {Light} light - 光源对象
 * @returns {Object} 光源数据对象
 */
function getLightData(light) {
  // 如果统一变量库不存在，则创建一个新的WeakMap
  uniformsLib = uniformsLib || new WeakMap();

  // 从库中获取光源对应的统一变量
  let uniforms = uniformsLib.get(light);

  // 如果不存在，则创建一个新的空对象并存储
  if (uniforms === undefined) uniformsLib.set(light, (uniforms = {}));

  return uniforms;
}

/**
 * 用于获取给定光源的阴影矩阵统一节点的TSL函数
 *
 * @tsl
 * @function
 * @param {Light} light - 光源对象
 * @returns {UniformNode<mat4>} 阴影矩阵统一节点
 */
export function lightShadowMatrix(light) {
  // 获取光源数据
  const data = getLightData(light);

  // 返回缓存的阴影矩阵或创建新的统一节点
  return (
    data.shadowMatrix ||
    (data.shadowMatrix = uniform("mat4")
      .setGroup(renderGroup)
      .onRenderUpdate((frame) => {
        // 如果光源不投射阴影或阴影映射未启用，则更新矩阵
        if (light.castShadow !== true || frame.renderer.shadowMap.enabled === false) {
          light.shadow.updateMatrices(light);
        }

        // 返回光源的阴影矩阵
        return light.shadow.matrix;
      }))
  );
}

/**
 * 用于获取给定光源的投影UV坐标的TSL函数
 * 在聚光灯使用贴图时相关
 *
 * @tsl
 * @function
 * @param {Light} light - 光源对象
 * @param {Node<vec3>} [position=positionWorld] - 要投影的位置
 * @returns {Node<vec3>} 投影的UV坐标
 */
export function lightProjectionUV(light, position = positionWorld) {
  // 计算聚光灯坐标
  const spotLightCoord = lightShadowMatrix(light).mul(position);
  // 进行透视除法得到投影UV
  const projectionUV = spotLightCoord.xyz.div(spotLightCoord.w);

  return projectionUV;
}

/**
 * 用于获取给定光源在世界空间中位置的TSL函数
 *
 * @tsl
 * @function
 * @param {Light} light - 光源对象
 * @returns {UniformNode<vec3>} 光源在世界空间中的位置
 */
export function lightPosition(light) {
  // 获取光源数据
  const data = getLightData(light);

  // 返回缓存的位置或创建新的统一节点
  return (
    data.position ||
    (data.position = uniform(new Vector3())
      .setGroup(renderGroup)
      .onRenderUpdate((_, self) => self.value.setFromMatrixPosition(light.matrixWorld)))
  );
}

/**
 * 用于获取给定光源的目标位置在世界空间中的TSL函数
 *
 * @tsl
 * @function
 * @param {Light} light - 光源对象
 * @returns {UniformNode<vec3>} 光源目标在世界空间中的位置
 */
export function lightTargetPosition(light) {
  // 获取光源数据
  const data = getLightData(light);

  // 返回缓存的目标位置或创建新的统一节点
  return (
    data.targetPosition ||
    (data.targetPosition = uniform(new Vector3())
      .setGroup(renderGroup)
      .onRenderUpdate((_, self) => self.value.setFromMatrixPosition(light.target.matrixWorld)))
  );
}

/**
 * 用于获取给定光源在视图空间中位置的TSL函数
 *
 * @tsl
 * @function
 * @param {Light} light - 光源对象
 * @returns {UniformNode<vec3>} 光源在视图空间中的位置
 */
export function lightViewPosition(light) {
  // 获取光源数据
  const data = getLightData(light);

  // 返回缓存的视图位置或创建新的统一节点
  return (
    data.viewPosition ||
    (data.viewPosition = uniform(new Vector3())
      .setGroup(renderGroup)
      .onRenderUpdate(({ camera }, self) => {
        // 确保值存在
        self.value = self.value || new Vector3();
        // 从光源世界矩阵中设置位置
        self.value.setFromMatrixPosition(light.matrixWorld);

        // 应用相机的世界逆矩阵转换到视图空间
        self.value.applyMatrix4(camera.matrixWorldInverse);
      }))
  );
}

/**
 * 用于获取给定光源的目标方向的TSL函数
 *
 * @tsl
 * @function
 * @param {Light} light - 光源对象
 * @returns {Node<vec3>} 光源的目标方向
 */
export const lightTargetDirection = (light) => cameraViewMatrix.transformDirection(lightPosition(light).sub(lightTargetPosition(light)));
