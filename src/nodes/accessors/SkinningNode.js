// 导入节点基类
import Node from "../core/Node.js";
// 导入节点更新类型常量
import { NodeUpdateType } from "../core/constants.js";
// 导入节点对象包装器
import { nodeObject } from "../tsl/TSLBase.js";
// 导入属性节点函数
import { attribute } from "../core/AttributeNode.js";
// 导入引用和引用缓冲区函数
import { reference, referenceBuffer } from "./ReferenceNode.js";
// 导入加法操作符节点
import { add } from "../math/OperatorNode.js";
// 导入本地法线
import { normalLocal } from "./Normal.js";
// 导入本地位置和前一帧位置
import { positionLocal, positionPrevious } from "./Position.js";
// 导入本地切线
import { tangentLocal } from "./Tangent.js";
// 导入统一变量函数
import { uniform } from "../core/UniformNode.js";
// 导入缓冲区函数
import { buffer } from "./BufferNode.js";
// 导入从对象获取数据的工具函数
import { getDataFromObject } from "../core/NodeUtils.js";
// 导入存储缓冲区函数
import { storage } from "./StorageBufferNode.js";
// 导入实例化缓冲区属性类
import { InstancedBufferAttribute } from "../../core/InstancedBufferAttribute.js";
// 导入实例索引
import { instanceIndex } from "../core/IndexNode.js";

// 帧ID缓存，用于避免重复更新骨骼
const _frameId = new WeakMap();

/**
 * 蒙皮节点 - 实现蒙皮/骨骼动画所需的顶点变换着色器逻辑
 *
 * @augments Node
 */
class SkinningNode extends Node {
  // 返回节点类型标识符
  static get type() {
    return "SkinningNode";
  }

  /**
   * 构造一个新的蒙皮节点
   *
   * @param {SkinnedMesh} skinnedMesh - 蒙皮网格
   */
  constructor(skinnedMesh) {
    // 调用父类构造函数，返回类型为void
    super("void");

    /**
     * 蒙皮网格
     *
     * @type {SkinnedMesh}
     */
    this.skinnedMesh = skinnedMesh;

    /**
     * 重写更新类型，因为蒙皮节点按对象更新
     *
     * @type {string}
     */
    this.updateType = NodeUpdateType.OBJECT;

    // 节点属性初始化

    /**
     * 蒙皮索引属性节点
     *
     * @type {AttributeNode}
     */
    this.skinIndexNode = attribute("skinIndex", "uvec4");

    /**
     * 蒙皮权重属性节点
     *
     * @type {AttributeNode}
     */
    this.skinWeightNode = attribute("skinWeight", "vec4");

    /**
     * 绑定矩阵节点
     *
     * @type {Node<mat4>}
     */
    this.bindMatrixNode = reference("bindMatrix", "mat4");

    /**
     * 绑定矩阵逆矩阵节点
     *
     * @type {Node<mat4>}
     */
    this.bindMatrixInverseNode = reference("bindMatrixInverse", "mat4");

    /**
     * 骨骼矩阵作为统一缓冲区节点
     *
     * @type {Node}
     */
    this.boneMatricesNode = referenceBuffer("skeleton.boneMatrices", "mat4", skinnedMesh.skeleton.bones.length);

    /**
     * 当前顶点在本地空间中的位置
     *
     * @type {Node<vec3>}
     */
    this.positionNode = positionLocal;

    /**
     * 顶点在本地空间中的结果位置
     *
     * @type {Node<vec3>}
     */
    this.toPositionNode = positionLocal;

    /**
     * 前一帧的骨骼矩阵作为统一缓冲区节点
     * 计算运动向量时需要
     *
     * @type {?Node}
     * @default null
     */
    this.previousBoneMatricesNode = null;
  }

  /**
   * 通过蒙皮变换给定的顶点位置
   *
   * @param {Node} [boneMatrices=this.boneMatricesNode] - 骨骼矩阵
   * @param {Node<vec3>} [position=this.positionNode] - 本地空间中的顶点位置
   * @return {Node<vec3>} 变换后的顶点位置
   */
  getSkinnedPosition(boneMatrices = this.boneMatricesNode, position = this.positionNode) {
    // 获取蒙皮相关的节点
    const { skinIndexNode, skinWeightNode, bindMatrixNode, bindMatrixInverseNode } = this;

    // 根据蒙皮索引获取对应的骨骼矩阵
    const boneMatX = boneMatrices.element(skinIndexNode.x);
    const boneMatY = boneMatrices.element(skinIndexNode.y);
    const boneMatZ = boneMatrices.element(skinIndexNode.z);
    const boneMatW = boneMatrices.element(skinIndexNode.w);

    // 位置变换

    // 将顶点位置变换到绑定空间
    const skinVertex = bindMatrixNode.mul(position);

    // 根据权重混合四个骨骼的变换结果
    const skinned = add(
      boneMatX.mul(skinWeightNode.x).mul(skinVertex),
      boneMatY.mul(skinWeightNode.y).mul(skinVertex),
      boneMatZ.mul(skinWeightNode.z).mul(skinVertex),
      boneMatW.mul(skinWeightNode.w).mul(skinVertex)
    );

    // 变换回本地空间并返回xyz分量
    return bindMatrixInverseNode.mul(skinned).xyz;
  }

  /**
   * 通过蒙皮变换给定的顶点法线
   *
   * @param {Node} [boneMatrices=this.boneMatricesNode] - 骨骼矩阵
   * @param {Node<vec3>} [normal=normalLocal] - 本地空间中的顶点法线
   * @return {Node<vec3>} 变换后的顶点法线
   */
  getSkinnedNormal(boneMatrices = this.boneMatricesNode, normal = normalLocal) {
    // 获取蒙皮相关的节点
    const { skinIndexNode, skinWeightNode, bindMatrixNode, bindMatrixInverseNode } = this;

    // 根据蒙皮索引获取对应的骨骼矩阵
    const boneMatX = boneMatrices.element(skinIndexNode.x);
    const boneMatY = boneMatrices.element(skinIndexNode.y);
    const boneMatZ = boneMatrices.element(skinIndexNode.z);
    const boneMatW = boneMatrices.element(skinIndexNode.w);

    // 法线变换

    // 根据权重混合四个骨骼矩阵
    let skinMatrix = add(skinWeightNode.x.mul(boneMatX), skinWeightNode.y.mul(boneMatY), skinWeightNode.z.mul(boneMatZ), skinWeightNode.w.mul(boneMatW));

    // 应用绑定矩阵变换
    skinMatrix = bindMatrixInverseNode.mul(skinMatrix).mul(bindMatrixNode);

    // 变换法线方向并返回xyz分量
    return skinMatrix.transformDirection(normal).xyz;
  }

  /**
   * 计算前一帧的变换/蒙皮顶点位置
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {Node<vec3>} 前一帧的蒙皮位置
   */
  getPreviousSkinnedPosition(builder) {
    // 获取蒙皮网格对象
    const skinnedMesh = builder.object;

    // 如果前一帧骨骼矩阵节点为空，则初始化
    if (this.previousBoneMatricesNode === null) {
      // 复制当前骨骼矩阵作为前一帧的骨骼矩阵
      skinnedMesh.skeleton.previousBoneMatrices = new Float32Array(skinnedMesh.skeleton.boneMatrices);

      // 创建前一帧骨骼矩阵的引用缓冲区节点
      this.previousBoneMatricesNode = referenceBuffer("skeleton.previousBoneMatrices", "mat4", skinnedMesh.skeleton.bones.length);
    }

    // 使用前一帧的骨骼矩阵和前一帧位置计算蒙皮位置
    return this.getSkinnedPosition(this.previousBoneMatricesNode, positionPrevious);
  }

  /**
   * 如果需要前一帧的骨骼矩阵则返回 `true`
   * 在使用 {@link VelocityNode} 计算运动向量时相关
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {boolean} 是否需要前一帧的骨骼矩阵
   */
  needsPreviousBoneMatrices(builder) {
    // 获取多渲染目标
    const mrt = builder.renderer.getMRT();

    // 如果有速度渲染目标或对象明确使用速度，则需要前一帧骨骼矩阵
    return (mrt && mrt.has("velocity")) || getDataFromObject(builder.object).useVelocity === true;
  }

  /**
   * 通过将变换后的顶点数据分配给预定义的节点变量来设置蒙皮节点
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {Node<vec3>} 变换后的顶点位置
   */
  setup(builder) {
    // 如果需要前一帧的骨骼矩阵，设置前一帧位置
    if (this.needsPreviousBoneMatrices(builder)) {
      positionPrevious.assign(this.getPreviousSkinnedPosition(builder));
    }

    // 获取蒙皮后的位置
    const skinPosition = this.getSkinnedPosition();

    // 如果有目标位置节点，将蒙皮位置分配给它
    if (this.toPositionNode) this.toPositionNode.assign(skinPosition);

    // 处理法线和切线

    // 如果几何体有法线属性
    if (builder.hasGeometryAttribute("normal")) {
      // 获取蒙皮后的法线
      const skinNormal = this.getSkinnedNormal();

      // 将蒙皮法线分配给本地法线
      normalLocal.assign(skinNormal);

      // 如果几何体有切线属性，也将蒙皮法线分配给本地切线
      if (builder.hasGeometryAttribute("tangent")) {
        tangentLocal.assign(skinNormal);
      }
    }

    // 返回蒙皮后的位置
    return skinPosition;
  }

  /**
   * 生成蒙皮节点的代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {string} output - 当前输出
   * @return {string} 生成的代码片段
   */
  generate(builder, output) {
    // 如果输出不是void类型，调用父类的生成方法
    if (output !== "void") {
      return super.generate(builder, output);
    }
  }

  /**
   * 通过每帧更新一次骨架来更新蒙皮网格的状态
   *
   * @param {NodeFrame} frame - 当前节点帧
   */
  update(frame) {
    // 获取骨架：优先使用帧对象的骨架，否则使用蒙皮网格的骨架
    const skeleton = frame.object && frame.object.skeleton ? frame.object.skeleton : this.skinnedMesh.skeleton;

    // 如果当前帧已经更新过此骨架，则跳过
    if (_frameId.get(skeleton) === frame.frameId) return;

    // 记录当前帧ID，避免重复更新
    _frameId.set(skeleton, frame.frameId);

    // 如果有前一帧骨骼矩阵节点，保存当前骨骼矩阵到前一帧
    if (this.previousBoneMatricesNode !== null) skeleton.previousBoneMatrices.set(skeleton.boneMatrices);

    // 更新骨架
    skeleton.update();
  }
}

// 导出SkinningNode类作为默认导出
export default SkinningNode;

/**
 * TSL函数 - 用于创建蒙皮节点
 *
 * @tsl
 * @function
 * @param {SkinnedMesh} skinnedMesh - 蒙皮网格
 * @returns {SkinningNode}
 */
export const skinning = (skinnedMesh) => nodeObject(new SkinningNode(skinnedMesh));

/**
 * TSL函数 - 用于计算蒙皮
 *
 * @tsl
 * @function
 * @param {SkinnedMesh} skinnedMesh - 蒙皮网格
 * @param {Node<vec3>} [toPosition=null] - 目标位置
 * @returns {SkinningNode}
 */
export const computeSkinning = (skinnedMesh, toPosition = null) => {
  // 创建蒙皮节点
  const node = new SkinningNode(skinnedMesh);

  // 设置位置节点：使用存储缓冲区，启用PBO，只读，按实例索引访问
  node.positionNode = storage(new InstancedBufferAttribute(skinnedMesh.geometry.getAttribute("position").array, 3), "vec3")
    .setPBO(true)
    .toReadOnly()
    .element(instanceIndex)
    .toVar();

  // 设置蒙皮索引节点：使用存储缓冲区，启用PBO，只读，按实例索引访问
  node.skinIndexNode = storage(new InstancedBufferAttribute(new Uint32Array(skinnedMesh.geometry.getAttribute("skinIndex").array), 4), "uvec4")
    .setPBO(true)
    .toReadOnly()
    .element(instanceIndex)
    .toVar();

  // 设置蒙皮权重节点：使用存储缓冲区，启用PBO，只读，按实例索引访问
  node.skinWeightNode = storage(new InstancedBufferAttribute(skinnedMesh.geometry.getAttribute("skinWeight").array, 4), "vec4")
    .setPBO(true)
    .toReadOnly()
    .element(instanceIndex)
    .toVar();

  // 设置绑定矩阵节点
  node.bindMatrixNode = uniform(skinnedMesh.bindMatrix, "mat4");
  // 设置绑定矩阵逆矩阵节点
  node.bindMatrixInverseNode = uniform(skinnedMesh.bindMatrixInverse, "mat4");
  // 设置骨骼矩阵缓冲区节点
  node.boneMatricesNode = buffer(skinnedMesh.skeleton.boneMatrices, "mat4", skinnedMesh.skeleton.bones.length);
  // 设置目标位置节点
  node.toPositionNode = toPosition;

  // 返回包装后的节点对象
  return nodeObject(node);
};
