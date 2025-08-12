// 导入临时节点基类
import TempNode from "../core/TempNode.js";
// 导入模型视图矩阵
import { modelViewMatrix } from "./ModelNode.js";
// 导入本地位置和前一帧位置
import { positionLocal, positionPrevious } from "./Position.js";
// 导入不可变节点函数
import { nodeImmutable } from "../tsl/TSLBase.js";
// 导入节点更新类型常量
import { NodeUpdateType } from "../core/constants.js";
// 导入4x4矩阵类
import { Matrix4 } from "../../math/Matrix4.js";
// 导入统一变量函数
import { uniform } from "../core/UniformNode.js";
// 导入减法操作符
import { sub } from "../math/OperatorNode.js";
// 导入相机投影矩阵
import { cameraProjectionMatrix } from "./Camera.js";
// 导入渲染组
import { renderGroup } from "../core/UniformGroupNode.js";

// 对象数据缓存，用于存储每个对象的前一帧数据
const _objectData = new WeakMap();

/**
 * 速度节点 - 用于表示运动或速度向量的节点。是高级后处理效果（如运动模糊或TRAA）的基础
 *
 * 该节点跟踪前一帧的模型、视图和投影矩阵，并使用它们计算NDC空间中的偏移量。
 * 这些偏移量表示最终的速度。
 *
 * @augments TempNode
 */
class VelocityNode extends TempNode {
  // 返回节点类型标识符
  static get type() {
    return "VelocityNode";
  }

  /**
   * 构造一个新的速度节点
   */
  constructor() {
    // 调用父类构造函数，返回类型为vec2
    super("vec2");

    /**
     * 当前投影矩阵
     *
     * @type {?Matrix4}
     * @default null
     */
    this.projectionMatrix = null;

    /**
     * 重写，因为速度节点按对象更新
     *
     * @type {string}
     * @default 'object'
     */
    this.updateType = NodeUpdateType.OBJECT;

    /**
     * 重写，因为速度节点在更新后保存数据
     *
     * @type {string}
     * @default 'object'
     */
    this.updateAfterType = NodeUpdateType.OBJECT;

    /**
     * 表示前一帧世界空间中模型矩阵的统一变量节点
     *
     * @type {UniformNode<mat4>}
     * @default null
     */
    this.previousModelWorldMatrix = uniform(new Matrix4());

    /**
     * 表示前一帧投影矩阵的统一变量节点
     *
     * @type {UniformNode<mat4>}
     * @default null
     */
    this.previousProjectionMatrix = uniform(new Matrix4()).setGroup(renderGroup);

    /**
     * 表示前一帧视图矩阵的统一变量节点
     *
     * @type {UniformNode<mat4>}
     * @default null
     */
    this.previousCameraViewMatrix = uniform(new Matrix4());
  }

  /**
   * 设置给定的投影矩阵
   *
   * @param {Matrix4} projectionMatrix - 要设置的投影矩阵
   */
  setProjectionMatrix(projectionMatrix) {
    this.projectionMatrix = projectionMatrix;
  }

  /**
   * 更新速度相关的统一变量
   *
   * @param {NodeFrame} frame - 对当前节点帧的引用
   */
  update({ frameId, camera, object }) {
    // 获取对象的前一帧模型矩阵
    const previousModelMatrix = getPreviousMatrix(object);

    // 更新前一帧模型世界矩阵统一变量
    this.previousModelWorldMatrix.value.copy(previousModelMatrix);

    // 处理相机数据

    const cameraData = getData(camera);

    // 如果相机数据的帧ID与当前帧ID不同，更新相机矩阵
    if (cameraData.frameId !== frameId) {
      cameraData.frameId = frameId;

      // 如果是第一次初始化
      if (cameraData.previousProjectionMatrix === undefined) {
        // 创建矩阵存储对象
        cameraData.previousProjectionMatrix = new Matrix4();
        cameraData.previousCameraViewMatrix = new Matrix4();

        cameraData.currentProjectionMatrix = new Matrix4();
        cameraData.currentCameraViewMatrix = new Matrix4();

        // 初始化前一帧矩阵
        cameraData.previousProjectionMatrix.copy(this.projectionMatrix || camera.projectionMatrix);
        cameraData.previousCameraViewMatrix.copy(camera.matrixWorldInverse);
      } else {
        // 将当前矩阵复制到前一帧矩阵
        cameraData.previousProjectionMatrix.copy(cameraData.currentProjectionMatrix);
        cameraData.previousCameraViewMatrix.copy(cameraData.currentCameraViewMatrix);
      }

      // 更新当前矩阵
      cameraData.currentProjectionMatrix.copy(this.projectionMatrix || camera.projectionMatrix);
      cameraData.currentCameraViewMatrix.copy(camera.matrixWorldInverse);

      // 更新统一变量
      this.previousProjectionMatrix.value.copy(cameraData.previousProjectionMatrix);
      this.previousCameraViewMatrix.value.copy(cameraData.previousCameraViewMatrix);
    }
  }

  /**
   * 重写以更新速度相关的统一变量
   *
   * @param {NodeFrame} frame - 对当前节点帧的引用
   */
  updateAfter({ object }) {
    // 将当前世界矩阵复制到前一帧矩阵存储中
    getPreviousMatrix(object).copy(object.matrixWorld);
  }

  /**
   * 基于前一帧和当前顶点数据实现速度计算
   *
   * @param {NodeBuilder} builder - 对当前节点构建器的引用
   * @return {Node<vec2>} 运动向量
   */
  setup(/*builder*/) {
    // 选择投影矩阵：如果设置了自定义投影矩阵则使用，否则使用相机投影矩阵
    const projectionMatrix = this.projectionMatrix === null ? cameraProjectionMatrix : uniform(this.projectionMatrix);

    // 计算前一帧的模型视图矩阵
    const previousModelViewMatrix = this.previousCameraViewMatrix.mul(this.previousModelWorldMatrix);

    // 计算当前帧和前一帧的裁剪空间位置
    const clipPositionCurrent = projectionMatrix.mul(modelViewMatrix).mul(positionLocal);
    const clipPositionPrevious = this.previousProjectionMatrix.mul(previousModelViewMatrix).mul(positionPrevious);

    // 转换到NDC空间（归一化设备坐标）
    const ndcPositionCurrent = clipPositionCurrent.xy.div(clipPositionCurrent.w);
    const ndcPositionPrevious = clipPositionPrevious.xy.div(clipPositionPrevious.w);

    // 计算速度向量（当前位置 - 前一帧位置）
    const velocity = sub(ndcPositionCurrent, ndcPositionPrevious);

    return velocity;
  }
}

/**
 * 获取对象的数据缓存
 *
 * @param {Object} object - 要获取数据的对象
 * @return {Object} 对象的数据缓存
 */
function getData(object) {
  // 从WeakMap中获取对象数据
  let objectData = _objectData.get(object);

  // 如果数据不存在，创建新的数据对象
  if (objectData === undefined) {
    objectData = {};
    _objectData.set(object, objectData);
  }

  return objectData;
}

/**
 * 获取对象的前一帧矩阵
 *
 * @param {Object} object - 要获取前一帧矩阵的对象
 * @param {number} [index=0] - 矩阵索引（支持多个矩阵）
 * @return {Matrix4} 前一帧矩阵
 */
function getPreviousMatrix(object, index = 0) {
  // 获取对象数据缓存
  const objectData = getData(object);

  // 获取指定索引的矩阵
  let matrix = objectData[index];

  // 如果矩阵不存在，创建新矩阵并初始化为当前世界矩阵
  if (matrix === undefined) {
    objectData[index] = matrix = new Matrix4();
    objectData[index].copy(object.matrixWorld);
  }

  return matrix;
}

// 导出VelocityNode类作为默认导出
export default VelocityNode;

/**
 * TSL对象 - 表示渲染通道的速度
 *
 * @tsl
 * @type {VelocityNode}
 */
export const velocity = /*@__PURE__*/ nodeImmutable(VelocityNode);
