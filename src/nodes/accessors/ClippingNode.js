// 导入节点基类
import Node from "../core/Node.js";
// 导入TSL基础函数
import { nodeObject, Fn, bool, float } from "../tsl/TSLBase.js";
// 导入视图位置
import { positionView } from "./Position.js";
// 导入漫反射颜色属性
import { diffuseColor } from "../core/PropertyNode.js";
// 导入循环节点
import { Loop } from "../utils/LoopNode.js";
// 导入平滑步进函数
import { smoothstep } from "../math/MathNode.js";
// 导入统一数组节点
import { uniformArray } from "./UniformArrayNode.js";
// 导入内置节点
import { builtin } from "./BuiltinNode.js";

/**
 * 此节点在 {@link NodeMaterial} 中用于设置裁剪，
 * 可以进行硬件加速（如果支持）并可选择使用alpha覆盖来抗锯齿裁剪边缘。
 *
 * @augments Node
 */
class ClippingNode extends Node {
  // 返回节点类型标识符
  static get type() {
    return "ClippingNode";
  }

  /**
   * 构造一个新的裁剪节点
   *
   * @param {('default'|'hardware'|'alphaToCoverage')} [scope='default'] - 节点的作用域。与其他节点类似，
   * 选择的作用域影响节点的行为和生成的代码类型。
   */
  constructor(scope = ClippingNode.DEFAULT) {
    // 调用父类构造函数
    super();

    /**
     * 节点的作用域。与其他节点类似，选择的作用域影响
     * 节点的行为和生成的代码类型。
     *
     * @type {('default'|'hardware'|'alphaToCoverage')}
     */
    this.scope = scope;
  }

  /**
   * 根据选择的作用域设置节点
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {Node} 结果节点
   */
  setup(builder) {
    // 调用父类setup方法
    super.setup(builder);

    // 获取裁剪上下文
    const clippingContext = builder.clippingContext;
    // 解构获取交集平面和并集平面
    const { intersectionPlanes, unionPlanes } = clippingContext;

    // 获取硬件裁剪设置
    this.hardwareClipping = builder.material.hardwareClipping;

    // 根据作用域选择不同的设置方法
    if (this.scope === ClippingNode.ALPHA_TO_COVERAGE) {
      // Alpha覆盖模式
      return this.setupAlphaToCoverage(intersectionPlanes, unionPlanes);
    } else if (this.scope === ClippingNode.HARDWARE) {
      // 硬件裁剪模式
      return this.setupHardwareClipping(unionPlanes, builder);
    } else {
      // 默认裁剪模式
      return this.setupDefault(intersectionPlanes, unionPlanes);
    }
  }

  /**
   * 设置Alpha覆盖模式
   *
   * @param {Array<Vector4>} intersectionPlanes - 交集平面数组
   * @param {Array<Vector4>} unionPlanes - 并集平面数组
   * @return {Node} 结果节点
   */
  setupAlphaToCoverage(intersectionPlanes, unionPlanes) {
    return Fn(() => {
      // 定义到平面的距离变量
      const distanceToPlane = float().toVar("distanceToPlane");
      // 定义距离梯度变量
      const distanceGradient = float().toVar("distanceToGradient");

      // 定义裁剪不透明度，初始值为1
      const clipOpacity = float(1).toVar("clipOpacity");

      // 获取并集平面数量
      const numUnionPlanes = unionPlanes.length;

      // 如果没有硬件裁剪且有并集平面
      if (this.hardwareClipping === false && numUnionPlanes > 0) {
        // 创建裁剪平面统一数组
        const clippingPlanes = uniformArray(unionPlanes);

        // 循环处理每个并集平面
        Loop(numUnionPlanes, ({ i }) => {
          // 获取当前平面
          const plane = clippingPlanes.element(i);

          // 计算到平面的距离：-(position · normal) + d
          distanceToPlane.assign(positionView.dot(plane.xyz).negate().add(plane.w));
          // 计算距离梯度：fwidth(distance) / 2.0
          distanceGradient.assign(distanceToPlane.fwidth().div(2.0));

          // 使用平滑步进函数更新裁剪不透明度
          clipOpacity.mulAssign(smoothstep(distanceGradient.negate(), distanceGradient, distanceToPlane));
        });
      }

      // 获取交集平面数量
      const numIntersectionPlanes = intersectionPlanes.length;

      // 如果有交集平面
      if (numIntersectionPlanes > 0) {
        // 创建交集裁剪平面统一数组
        const clippingPlanes = uniformArray(intersectionPlanes);
        // 定义交集裁剪不透明度，初始值为1
        const intersectionClipOpacity = float(1).toVar("intersectionClipOpacity");

        // 循环处理每个交集平面
        Loop(numIntersectionPlanes, ({ i }) => {
          // 获取当前平面
          const plane = clippingPlanes.element(i);

          // 计算到平面的距离
          distanceToPlane.assign(positionView.dot(plane.xyz).negate().add(plane.w));
          // 计算距离梯度
          distanceGradient.assign(distanceToPlane.fwidth().div(2.0));

          // 使用平滑步进函数的反值更新交集裁剪不透明度
          intersectionClipOpacity.mulAssign(smoothstep(distanceGradient.negate(), distanceGradient, distanceToPlane).oneMinus());
        });

        // 将交集裁剪不透明度的反值应用到总裁剪不透明度
        clipOpacity.mulAssign(intersectionClipOpacity.oneMinus());
      }

      // 将裁剪不透明度应用到漫反射颜色的alpha通道
      diffuseColor.a.mulAssign(clipOpacity);

      // 如果alpha为0，则丢弃片段
      diffuseColor.a.equal(0.0).discard();
    })();
  }

  /**
   * 设置默认裁剪模式
   *
   * @param {Array<Vector4>} intersectionPlanes - 交集平面数组
   * @param {Array<Vector4>} unionPlanes - 并集平面数组
   * @return {Node} 结果节点
   */
  setupDefault(intersectionPlanes, unionPlanes) {
    return Fn(() => {
      // 获取并集平面数量
      const numUnionPlanes = unionPlanes.length;

      // 如果没有硬件裁剪且有并集平面
      if (this.hardwareClipping === false && numUnionPlanes > 0) {
        // 创建裁剪平面统一数组
        const clippingPlanes = uniformArray(unionPlanes);

        // 循环处理每个并集平面
        Loop(numUnionPlanes, ({ i }) => {
          // 获取当前平面
          const plane = clippingPlanes.element(i);
          // 如果位置在平面正面，则丢弃片段
          positionView.dot(plane.xyz).greaterThan(plane.w).discard();
        });
      }

      // 获取交集平面数量
      const numIntersectionPlanes = intersectionPlanes.length;

      // 如果有交集平面
      if (numIntersectionPlanes > 0) {
        // 创建交集裁剪平面统一数组
        const clippingPlanes = uniformArray(intersectionPlanes);
        // 定义裁剪标志，初始值为true
        const clipped = bool(true).toVar("clipped");

        // 循环处理每个交集平面
        Loop(numIntersectionPlanes, ({ i }) => {
          // 获取当前平面
          const plane = clippingPlanes.element(i);
          // 更新裁剪标志：如果位置在平面正面且之前已被裁剪，则继续裁剪
          clipped.assign(positionView.dot(plane.xyz).greaterThan(plane.w).and(clipped));
        });

        // 如果被裁剪，则丢弃片段
        clipped.discard();
      }
    })();
  }

  /**
   * 设置硬件裁剪模式
   *
   * @param {Array<Vector4>} unionPlanes - 并集平面数组
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {Node} 结果节点
   */
  setupHardwareClipping(unionPlanes, builder) {
    // 获取并集平面数量
    const numUnionPlanes = unionPlanes.length;

    // 启用硬件裁剪
    builder.enableHardwareClipping(numUnionPlanes);

    return Fn(() => {
      // 创建裁剪平面统一数组
      const clippingPlanes = uniformArray(unionPlanes);
      // 获取硬件裁剪距离内置变量
      const hw_clip_distances = builtin(builder.getClipDistance());

      // 循环处理每个并集平面
      Loop(numUnionPlanes, ({ i }) => {
        // 获取当前平面
        const plane = clippingPlanes.element(i);

        // 计算到平面的距离：-(position · normal - d)
        const distance = positionView.dot(plane.xyz).sub(plane.w).negate();
        // 将距离赋值给硬件裁剪距离数组
        hw_clip_distances.element(i).assign(distance);
      });
    })();
  }
}

// 定义裁剪节点的作用域常量
ClippingNode.ALPHA_TO_COVERAGE = "alphaToCoverage"; // Alpha覆盖模式
ClippingNode.DEFAULT = "default"; // 默认模式
ClippingNode.HARDWARE = "hardware"; // 硬件裁剪模式

// 导出ClippingNode类作为默认导出
export default ClippingNode;

/**
 * 用于设置默认裁剪逻辑的TSL函数
 *
 * @tsl
 * @function
 * @returns {ClippingNode}
 */
export const clipping = () => nodeObject(new ClippingNode());

/**
 * 用于设置Alpha覆盖模式的TSL函数
 *
 * @tsl
 * @function
 * @returns {ClippingNode}
 */
export const clippingAlpha = () => nodeObject(new ClippingNode(ClippingNode.ALPHA_TO_COVERAGE));

/**
 * 用于设置基于硬件的裁剪的TSL函数
 *
 * @tsl
 * @function
 * @returns {ClippingNode}
 */
export const hardwareClipping = () => nodeObject(new ClippingNode(ClippingNode.HARDWARE));
