// 导入节点材质基类
import NodeMaterial from "./NodeMaterial.js";
// 导入相机投影矩阵访问器
import { cameraProjectionMatrix } from "../../nodes/accessors/Camera.js";
// 导入材质旋转访问器
import { materialRotation } from "../../nodes/accessors/MaterialNode.js";
// 导入模型视图矩阵和模型世界矩阵访问器
import { modelViewMatrix, modelWorldMatrix } from "../../nodes/accessors/ModelNode.js";
// 导入几何位置访问器
import { positionGeometry } from "../../nodes/accessors/Position.js";
// 导入旋转工具函数
import { rotate } from "../../nodes/utils/RotateNode.js";
// 导入TSL基础类型：浮点数、二维向量、三维向量、四维向量
import { float, vec2, vec3, vec4 } from "../../nodes/tsl/TSLBase.js";

// 导入传统的精灵材质类
import { SpriteMaterial } from "../SpriteMaterial.js";
// 导入引用基础节点
import { reference } from "../../nodes/accessors/ReferenceBaseNode.js";

// 创建默认值实例，使用纯函数标记进行优化
const _defaultValues = /*@__PURE__*/ new SpriteMaterial();

/**
 * 精灵节点材质类 - {@link SpriteMaterial} 的节点版本
 * 用于渲染始终面向相机的2D精灵，常用于粒子系统和UI元素
 *
 * @augments NodeMaterial
 */
class SpriteNodeMaterial extends NodeMaterial {
  // 静态方法：返回材质类型标识符
  static get type() {
    return "SpriteNodeMaterial"; // 返回材质类型字符串
  }

  /**
   * 构造函数 - 创建新的精灵节点材质实例
   *
   * @param {Object} [parameters] - 配置参数对象，包含材质的各种属性设置
   */
  constructor(parameters) {
    // 调用父类构造函数初始化基础功能
    super();

    /**
     * 类型检测标志 - 用于运行时类型判断
     * 可以通过此属性快速判断对象是否为SpriteNodeMaterial实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSpriteNodeMaterial = true;

    // 内部大小衰减标志，默认启用
    this._useSizeAttenuation = true;

    /**
     * 位置节点 - 使用节点定义精灵位置
     * 当材质用于实例化渲染时特别有用，节点数据可以通过实例化属性节点定义：
     * ```js
     * const positionAttribute = new InstancedBufferAttribute( new Float32Array( positions ), 3 );
     * material.positionNode = instancedBufferAttribute( positionAttribute );
     * ```
     * 另一种可能是使用计算着色器计算实例化数据：
     * ```js
     * const positionBuffer = instancedArray( particleCount, 'vec3' );
     * particleMaterial.positionNode = positionBuffer.toAttribute();
     * ```
     *
     * @type {?Node<vec2>}
     * @default null
     */
    this.positionNode = null;

    /**
     * 旋转节点 - 精灵材质的旋转默认从rotation属性推断
     * 此节点属性允许覆盖默认值，用节点来定义旋转
     *
     * 如果不想覆盖旋转而是修改现有值，请使用 {@link materialRotation}
     *
     * @type {?Node<float>}
     * @default null
     */
    this.rotationNode = null;

    /**
     * 缩放节点 - 提供除了Object3D.scale之外的额外精灵缩放方式
     * 基于Object3D.scale的缩放变换会在顶点着色器中与此节点的缩放值相乘
     *
     * @type {?Node<vec2>}
     * @default null
     */
    this.scaleNode = null;

    /**
     * 透明度标志 - 在精灵中，透明属性默认启用
     * 精灵通常需要透明度来实现正确的混合效果
     *
     * @type {boolean}
     * @default true
     */
    this.transparent = true;

    // 设置材质的默认属性值
    this.setDefaultValues(_defaultValues);

    // 应用用户传入的参数，覆盖默认值
    this.setValues(parameters);
  }

  /**
   * 设置视图空间位置节点 - 实现精灵特定的顶点着色器
   * 此方法处理精灵的定位、缩放、旋转和面向相机的逻辑
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {Node<vec3>} 视图空间中的位置
   */
  setupPositionView(builder) {
    // 从构建器中获取对象和相机引用
    const { object, camera } = builder;

    // 获取大小衰减设置
    const sizeAttenuation = this.sizeAttenuation;

    // 解构获取位置、旋转和缩放节点
    const { positionNode, rotationNode, scaleNode } = this;

    // 计算模型视图位置：将位置从世界空间转换到视图空间
    const mvPosition = modelViewMatrix.mul(vec3(positionNode || 0));

    // 从模型世界矩阵中提取缩放信息（x和y轴的长度）
    let scale = vec2(modelWorldMatrix[0].xyz.length(), modelWorldMatrix[1].xyz.length());

    // 如果存在缩放节点，应用额外的缩放
    if (scaleNode !== null) {
      scale = scale.mul(vec2(scaleNode));
    }

    // 如果禁用了大小衰减
    if (sizeAttenuation === false) {
      // 对于透视相机
      if (camera.isPerspectiveCamera) {
        // 根据深度调整缩放（距离越远缩放越大，保持视觉大小不变）
        scale = scale.mul(mvPosition.z.negate());
      } else {
        // 对于正交相机，计算正交缩放因子
        const orthoScale = float(2.0).div(cameraProjectionMatrix.element(1).element(1));
        scale = scale.mul(orthoScale.mul(2));
      }
    }

    // 获取对齐位置，基于几何体的xy坐标
    let alignedPosition = positionGeometry.xy;

    // 如果对象有中心点设置且为Vector2类型
    if (object.center && object.center.isVector2 === true) {
      // 创建中心点引用
      const center = reference("center", "vec2", object);

      // 根据中心点调整对齐位置（中心点偏移）
      alignedPosition = alignedPosition.sub(center.sub(0.5));
    }

    // 应用缩放到对齐位置
    alignedPosition = alignedPosition.mul(scale);

    // 获取旋转角度：使用旋转节点或材质默认旋转
    const rotation = float(rotationNode || materialRotation);

    // 应用旋转变换到对齐位置
    const rotatedPosition = rotate(alignedPosition, rotation);

    // 返回最终位置：模型视图位置的xy加上旋转后的位置，保持原有的zw分量
    return vec4(mvPosition.xy.add(rotatedPosition), mvPosition.zw);
  }

  /**
   * 复制方法 - 从源材质复制属性到当前材质
   *
   * @param {SpriteNodeMaterial} source - 源材质对象
   * @return {SpriteNodeMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 复制位置节点
    this.positionNode = source.positionNode;
    // 复制旋转节点
    this.rotationNode = source.rotationNode;
    // 复制缩放节点
    this.scaleNode = source.scaleNode;

    // 调用父类复制方法处理其他属性
    return super.copy(source);
  }

  /**
   * 大小衰减属性 - 是否使用大小衰减
   * 控制精灵是否随距离变化大小
   *
   * @type {boolean}
   * @default true
   */
  get sizeAttenuation() {
    // 返回内部的大小衰减使用标志
    return this._useSizeAttenuation;
  }

  /**
   * 设置大小衰减属性
   *
   * @param {boolean} value - 是否启用大小衰减
   */
  set sizeAttenuation(value) {
    // 如果值发生变化
    if (this._useSizeAttenuation !== value) {
      // 更新内部标志
      this._useSizeAttenuation = value;
      // 标记材质需要更新
      this.needsUpdate = true;
    }
  }
}

// 导出精灵节点材质类作为默认导出
export default SpriteNodeMaterial;
