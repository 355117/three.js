/**
 * SpriteUtils.js - 精灵工具函数
 *
 * 该文件提供了用于精灵和广告牌效果的实用工具函数。
 * 主要用于实现始终面向相机的平面网格效果。
 */

// 导入模型世界矩阵访问器
import { modelWorldMatrix } from "../accessors/ModelNode.js";
// 导入相机视图矩阵和投影矩阵访问器
import { cameraViewMatrix, cameraProjectionMatrix } from "../accessors/Camera.js";
// 导入本地位置访问器
import { positionLocal } from "../accessors/Position.js";
// 导入TSL基础工具
import { Fn, defined } from "../tsl/TSLBase.js";

/**
 * 广告牌效果函数
 *
 * 用于实现平面网格的广告牌行为，使其始终面向相机。
 * 这种效果常用于粒子系统、精灵、UI元素等需要始终面向观察者的对象。
 *
 * 使用示例：
 * ```js
 * material.vertexNode = billboarding();
 * ```
 *
 * @tsl
 * @function
 * @param {Object} config - 配置对象
 * @param {?Node<vec3>} [config.position=null] - 可用于定义世界空间中的顶点位置
 * @param {boolean} [config.horizontal=true] - 是否水平跟随相机旋转
 * @param {boolean} [config.vertical=false] - 是否垂直跟随相机旋转
 * @return {Node<vec3>} 更新后的裁剪空间中的顶点位置
 */
export const billboarding = /*@__PURE__*/ Fn(({ position = null, horizontal = true, vertical = false }) => {
  let worldMatrix;

  // 如果提供了自定义位置，则修改世界矩阵的平移部分
  if (position !== null) {
    worldMatrix = modelWorldMatrix.toVar();
    worldMatrix[3][0] = position.x; // 设置X轴平移
    worldMatrix[3][1] = position.y; // 设置Y轴平移
    worldMatrix[3][2] = position.z; // 设置Z轴平移
  } else {
    // 使用原始的模型世界矩阵
    worldMatrix = modelWorldMatrix;
  }

  // 计算模型视图矩阵
  const modelViewMatrix = cameraViewMatrix.mul(worldMatrix);

  // 如果启用水平广告牌效果
  if (defined(horizontal)) {
    // 重置X轴向量，保持原始缩放但消除旋转
    modelViewMatrix[0][0] = modelWorldMatrix[0].length(); // 保持X轴缩放
    modelViewMatrix[0][1] = 0; // 清除Y分量
    modelViewMatrix[0][2] = 0; // 清除Z分量
  }

  // 如果启用垂直广告牌效果
  if (defined(vertical)) {
    // 重置Y轴向量，保持原始缩放但消除旋转
    modelViewMatrix[1][0] = 0; // 清除X分量
    modelViewMatrix[1][1] = modelWorldMatrix[1].length(); // 保持Y轴缩放
    modelViewMatrix[1][2] = 0; // 清除Z分量
  }

  // 设置Z轴向量，使其指向相机
  modelViewMatrix[2][0] = 0; // X分量为0
  modelViewMatrix[2][1] = 0; // Y分量为0
  modelViewMatrix[2][2] = 1; // Z分量为1，指向相机

  // 返回最终的裁剪空间位置
  return cameraProjectionMatrix.mul(modelViewMatrix).mul(positionLocal);
});
