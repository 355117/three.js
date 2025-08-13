// 导入精灵节点材质基类
import SpriteNodeMaterial from "./SpriteNodeMaterial.js";
// 导入视口屏幕节点
import { viewport } from "../../nodes/display/ScreenNode.js";
// 导入位置访问器：几何位置、本地位置、视图位置
import { positionGeometry, positionLocal, positionView } from "../../nodes/accessors/Position.js";
// 导入模型视图矩阵访问器
import { modelViewMatrix } from "../../nodes/accessors/ModelNode.js";
// 导入材质点大小访问器
import { materialPointSize } from "../../nodes/accessors/MaterialNode.js";
// 导入旋转工具函数
import { rotate } from "../../nodes/utils/RotateNode.js";
// 导入TSL基础类型：浮点数、二维向量、三维向量、四维向量
import { float, vec2, vec3, vec4 } from "../../nodes/tsl/TSLBase.js";

// 导入传统的点云材质类
import { PointsMaterial } from "../PointsMaterial.js";

// 创建默认值实例，使用纯函数标记进行优化
const _defaultValues = /*@__PURE__*/ new PointsMaterial();

/**
 * 点云节点材质类 - {@link PointsMaterial} 的节点版本
 * 用于渲染点云数据，支持可变点大小和高级着色效果
 *
 * @augments SpriteNodeMaterial
 */
class PointsNodeMaterial extends SpriteNodeMaterial {
  // 静态方法：返回材质类型标识符
  static get type() {
    return "PointsNodeMaterial"; // 返回材质类型字符串
  }

  /**
   * 构造函数 - 创建新的点云节点材质实例
   *
   * @param {Object} [parameters] - 配置参数对象，包含材质的各种属性设置
   */
  constructor(parameters) {
    // 调用父类构造函数初始化精灵材质基础功能
    super();

    /**
     * 大小节点 - 提供设置点大小的额外方式
     *
     * 注意：WebGPU只支持1像素大小的点图元。因此，当材质与{@link Points}和WebGPU
     * 后端一起使用时，此节点无效。如果应用程序想要渲染大于1像素的点，
     * 应该将材质与{@link Sprite}和实例化一起使用。
     *
     * @type {?Node<vec2>}
     * @default null
     */
    this.sizeNode = null;

    /**
     * 类型检测标志 - 用于运行时类型判断
     * 可以通过此属性快速判断对象是否为PointsNodeMaterial实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isPointsNodeMaterial = true;

    // 设置材质的默认属性值
    this.setDefaultValues(_defaultValues);

    // 应用用户传入的参数，覆盖默认值
    this.setValues(parameters);
  }

  /**
   * 设置视图空间位置 - 计算点在视图空间中的位置
   *
   * @return {Node<vec3>} 视图空间中的位置向量
   */
  setupPositionView() {
    // 获取位置节点
    const { positionNode } = this;

    // 将位置从本地空间转换到视图空间，返回xyz分量
    return modelViewMatrix.mul(vec3(positionNode || positionLocal)).xyz;
  }

  /**
   * 设置顶点着色器 - 实现点云特定的顶点变换逻辑
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {Node<vec4>} 变换后的顶点位置
   */
  setupVertex(builder) {
    // 调用父类方法获取基础的模型-视图-投影变换结果
    const mvp = super.setupVertex(builder);

    // 如果材质不是节点材质，跳过进一步处理

    if (builder.material.isNodeMaterial !== true) {
      return mvp; // 直接返回基础变换结果
    }

    // NDC空间处理

    // 解构获取旋转、缩放和大小节点
    const { rotationNode, scaleNode, sizeNode } = this;

    // 创建对齐位置变量，基于几何体的xy坐标
    const alignedPosition = positionGeometry.xy.toVar();
    // 计算屏幕宽高比
    const aspect = viewport.z.div(viewport.w);

    // 旋转处理

    // 如果存在旋转节点且为有效节点
    if (rotationNode && rotationNode.isNode) {
      // 获取旋转角度
      const rotation = float(rotationNode);

      // 应用旋转变换到对齐位置
      alignedPosition.assign(rotate(alignedPosition, rotation));
    }

    // 点大小处理

    // 确定点大小：使用自定义大小节点或材质默认点大小
    let pointSize = sizeNode !== null ? vec2(sizeNode) : materialPointSize;

    // 如果启用了大小衰减
    if (this.sizeAttenuation === true) {
      // 根据视图深度调整点大小（距离越远点越小）
      pointSize = pointSize.mul(pointSize.div(positionView.z.negate()));
    }

    // 缩放处理

    // 如果存在缩放节点且为有效节点
    if (scaleNode && scaleNode.isNode) {
      // 应用缩放到点大小
      pointSize = pointSize.mul(vec2(scaleNode));
    }

    // 将对齐位置乘以点大小的2倍
    alignedPosition.mulAssign(pointSize.mul(2));

    // 将位置归一化到视口坐标
    alignedPosition.assign(alignedPosition.div(viewport.z));
    // 应用宽高比校正到y坐标
    alignedPosition.y.assign(alignedPosition.y.mul(aspect));

    // 转换回裁剪空间
    alignedPosition.assign(alignedPosition.mul(mvp.w));

    // 将偏移添加到裁剪位置：clipPos.xy += offset;
    mvp.addAssign(vec4(alignedPosition, 0, 0));

    // 返回最终的变换结果
    return mvp;
  }

  /**
   * Alpha到覆盖率属性 - 是否应该使用alpha到覆盖率
   * 用于改善透明点云的渲染质量，减少锯齿效果
   *
   * @type {boolean}
   * @default true
   */
  get alphaToCoverage() {
    // 返回内部的alpha到覆盖率使用标志
    return this._useAlphaToCoverage;
  }

  /**
   * 设置alpha到覆盖率属性
   *
   * @param {boolean} value - 是否启用alpha到覆盖率
   */
  set alphaToCoverage(value) {
    // 如果值发生变化
    if (this._useAlphaToCoverage !== value) {
      // 更新内部标志
      this._useAlphaToCoverage = value;
      // 标记材质需要更新
      this.needsUpdate = true;
    }
  }
}

// 导出点云节点材质类作为默认导出
export default PointsNodeMaterial;
