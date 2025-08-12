// 导入3D对象节点基类
import Object3DNode from "./Object3DNode.js";
// 导入TSL函数和不可变节点
import { Fn, nodeImmutable } from "../tsl/TSLBase.js";
// 导入统一变量节点
import { uniform } from "../core/UniformNode.js";

// 导入4x4矩阵类
import { Matrix4 } from "../../math/Matrix4.js";
// 导入相机视图矩阵
import { cameraViewMatrix } from "./Camera.js";
// 导入3x3矩阵类
import { Matrix3 } from "../../math/Matrix3.js";

/**
 * 模型节点 - `Object3DNode` 的特化版本，具有更大的模型相关度量集合
 * 与 `Object3DNode` 不同，`ModelNode` 从当前节点帧状态中提取3D对象的引用
 *
 * @augments Object3DNode
 */
class ModelNode extends Object3DNode {
  // 返回节点类型标识符
  static get type() {
    return "ModelNode";
  }

  /**
   * 构造一个新的对象模型节点
   *
   * @param {('position'|'viewPosition'|'direction'|'scale'|'worldMatrix')} scope - 根据作用域，节点表示不同类型的变换
   */
  constructor(scope) {
    // 调用父类构造函数
    super(scope);
  }

  /**
   * 从帧状态中提取模型引用，然后根据作用域更新统一变量值
   *
   * @param {NodeFrame} frame - 当前节点帧
   */
  update(frame) {
    // 从帧中获取3D对象引用
    this.object3d = frame.object;

    // 调用父类更新方法
    super.update(frame);
  }
}

// 导出ModelNode类作为默认导出
export default ModelNode;

/**
 * TSL对象 - 表示对象在世界空间中的方向
 *
 * @tsl
 * @type {ModelNode<vec3>}
 */
export const modelDirection = /*@__PURE__*/ nodeImmutable(ModelNode, ModelNode.DIRECTION);

/**
 * TSL对象 - 表示对象的世界矩阵
 *
 * @tsl
 * @type {ModelNode<mat4>}
 */
export const modelWorldMatrix = /*@__PURE__*/ nodeImmutable(ModelNode, ModelNode.WORLD_MATRIX);

/**
 * TSL对象 - 表示对象在世界空间中的位置
 *
 * @tsl
 * @type {ModelNode<vec3>}
 */
export const modelPosition = /*@__PURE__*/ nodeImmutable(ModelNode, ModelNode.POSITION);

/**
 * TSL对象 - 表示对象在世界空间中的缩放
 *
 * @tsl
 * @type {ModelNode<vec3>}
 */
export const modelScale = /*@__PURE__*/ nodeImmutable(ModelNode, ModelNode.SCALE);

/**
 * TSL对象 - 表示对象在视图/相机空间中的位置
 *
 * @tsl
 * @type {ModelNode<vec3>}
 */
export const modelViewPosition = /*@__PURE__*/ nodeImmutable(ModelNode, ModelNode.VIEW_POSITION);

/**
 * TSL对象 - 表示对象的半径
 *
 * @tsl
 * @type {ModelNode<float>}
 */
export const modelRadius = /*@__PURE__*/ nodeImmutable(ModelNode, ModelNode.RADIUS);

/**
 * TSL对象 - 表示对象的法线矩阵
 *
 * @tsl
 * @type {UniformNode<mat3>}
 */
export const modelNormalMatrix = /*@__PURE__*/ uniform(new Matrix3()).onObjectUpdate(({ object }, self) => self.value.getNormalMatrix(object.matrixWorld));

/**
 * TSL对象 - 表示对象的逆世界矩阵
 *
 * @tsl
 * @type {UniformNode<mat4>}
 */
export const modelWorldMatrixInverse = /*@__PURE__*/ uniform(new Matrix4()).onObjectUpdate(({ object }, self) => self.value.copy(object.matrixWorld).invert());

/**
 * TSL对象 - 表示对象的模型视图矩阵
 *
 * @tsl
 * @type {Node<mat4>}
 */
export const modelViewMatrix = /*@__PURE__*/ Fn((builder) => {
  // 返回渲染器覆盖的模型视图矩阵或默认的中等精度模型视图矩阵
  return builder.renderer.overrideNodes.modelViewMatrix || mediumpModelViewMatrix;
})
  .once()()
  .toVar("modelViewMatrix");

// GPU精度

/**
 * TSL对象 - 表示对象在 `mediump` 精度下的模型视图矩阵
 *
 * @tsl
 * @type {Node<mat4>}
 */
export const mediumpModelViewMatrix = /*@__PURE__*/ cameraViewMatrix.mul(modelWorldMatrix);

// CPU精度

/**
 * TSL对象 - 表示对象在 `highp` 精度下的模型视图矩阵
 * 通过在JS中而不是在着色器中计算矩阵来实现高精度
 *
 * @tsl
 * @type {Node<mat4>}
 */
export const highpModelViewMatrix = /*@__PURE__*/ Fn((builder) => {
  // 标记使用高精度模型视图矩阵
  builder.context.isHighPrecisionModelViewMatrix = true;

  // 返回一个统一变量，在对象更新时计算模型视图矩阵
  return uniform("mat4").onObjectUpdate(({ object, camera }) => {
    // 计算模型视图矩阵：相机逆矩阵 * 对象世界矩阵
    return object.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld);
  });
})
  .once()()
  .toVar("highpModelViewMatrix");

/**
 * TSL对象 - 表示对象在 `highp` 精度下的模型法线视图矩阵
 * 通过在JS中而不是在着色器中计算矩阵来实现高精度
 *
 * @tsl
 * @type {Node<mat3>}
 */
export const highpModelNormalViewMatrix = /*@__PURE__*/ Fn((builder) => {
  // 获取是否使用高精度模型视图矩阵的标志
  const isHighPrecisionModelViewMatrix = builder.context.isHighPrecisionModelViewMatrix;

  // 返回一个统一变量，在对象更新时计算法线视图矩阵
  return uniform("mat3").onObjectUpdate(({ object, camera }) => {
    // 如果还没有计算高精度模型视图矩阵，则先计算它
    if (isHighPrecisionModelViewMatrix !== true) {
      object.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld);
    }

    // 从模型视图矩阵计算法线矩阵
    return object.normalMatrix.getNormalMatrix(object.modelViewMatrix);
  });
})
  .once()()
  .toVar("highpModelNormalViewMatrix");
