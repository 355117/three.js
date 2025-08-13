// 导入节点材质基类
import NodeMaterial from "./NodeMaterial.js";
// 导入属性节点，用于访问顶点属性
import { attribute } from "../../nodes/core/AttributeNode.js";
// 导入材质节点访问器，用于获取线条虚线相关的材质属性
import { materialLineDashOffset, materialLineDashSize, materialLineGapSize, materialLineScale } from "../../nodes/accessors/MaterialNode.js";
// 导入属性节点，用于定义虚线大小和间隙大小
import { dashSize, gapSize } from "../../nodes/core/PropertyNode.js";
// 导入 TSL 基础类型，用于变量声明和类型转换
import { varying, float } from "../../nodes/tsl/TSLBase.js";

// 导入线条虚线材质基类
import { LineDashedMaterial } from "../LineDashedMaterial.js";

// 创建默认值实例，使用纯函数标记进行优化
const _defaultValues = /*@__PURE__*/ new LineDashedMaterial();

/**
 * 线条虚线节点材质类 - {@link LineDashedMaterial} 的节点版本
 *
 * 这个类扩展了 NodeMaterial，为线条渲染提供虚线效果的节点材质功能。
 * 它支持自定义虚线模式、间隙大小、偏移量和缩放等属性，
 * 并且可以通过节点系统进行动态控制。
 *
 * @augments NodeMaterial
 */
class LineDashedNodeMaterial extends NodeMaterial {
  // 静态方法：返回材质类型标识符
  static get type() {
    // 返回材质类型名称，用于材质系统识别
    return "LineDashedNodeMaterial";
  }

  /**
   * 构造函数：创建新的线条虚线节点材质实例
   *
   * @param {Object} [parameters] - 可选的配置参数对象，用于初始化材质属性
   */
  constructor(parameters) {
    // 调用父类构造函数，初始化节点材质基础功能
    super();

    /**
     * 类型标识标志，用于运行时类型检测
     *
     * 这个标志可以用来快速判断一个对象是否为 LineDashedNodeMaterial 实例，
     * 避免使用 instanceof 操作符带来的性能开销
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isLineDashedNodeMaterial = true;

    // 设置材质的默认属性值
    this.setDefaultValues(_defaultValues);

    /**
     * 虚线偏移量
     *
     * 控制虚线模式沿线条方向的偏移距离，可以用来创建动画效果
     * 或调整虚线的起始位置
     *
     * @type {number}
     * @default 0
     */
    this.dashOffset = 0;

    /**
     * 偏移节点
     *
     * 虚线材质的偏移量默认从 `dashOffset` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义偏移量。
     *
     * 如果你不想覆盖偏移量而是修改现有值，
     * 请使用 {@link materialLineDashOffset}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.offsetNode = null;

    /**
     * 虚线缩放节点
     *
     * 虚线材质的缩放默认从 `scale` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义缩放。
     *
     * 如果你不想覆盖缩放而是修改现有值，
     * 请使用 {@link materialLineScale}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.dashScaleNode = null;

    /**
     * 虚线大小节点
     *
     * 虚线材质的虚线大小默认从 `dashSize` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义虚线大小。
     *
     * 如果你不想覆盖虚线大小而是修改现有值，
     * 请使用 {@link materialLineDashSize}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.dashSizeNode = null;

    /**
     * 间隙大小节点
     *
     * 虚线材质的间隙大小默认从 `gapSize` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义间隙大小。
     *
     * 如果你不想覆盖间隙大小而是修改现有值，
     * 请使用 {@link materialLineGapSize}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.gapSizeNode = null;

    // 应用用户传入的参数，覆盖默认值
    this.setValues(parameters);
  }

  /**
   * 设置虚线特定的节点变量和渲染逻辑
   *
   * 这个方法配置虚线材质的核心渲染逻辑，包括偏移量、缩放、
   * 虚线大小、间隙大小的计算，以及虚线模式的实现。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器，用于构建着色器代码
   */
  setupVariants(/* builder */) {
    // 确定偏移节点：如果设置了自定义偏移节点则使用它，否则使用材质的默认偏移
    const offsetNode = this.offsetNode ? float(this.offsetNode) : materialLineDashOffset;
    // 确定缩放节点：如果设置了自定义缩放节点则使用它，否则使用材质的默认缩放
    const dashScaleNode = this.dashScaleNode ? float(this.dashScaleNode) : materialLineScale;
    // 确定虚线大小节点：如果设置了自定义虚线大小节点则使用它，否则使用材质的默认虚线大小
    const dashSizeNode = this.dashSizeNode ? float(this.dashSizeNode) : materialLineDashSize;
    // 确定间隙大小节点：如果设置了自定义间隙大小节点则使用它，否则使用材质的默认间隙大小
    const gapSizeNode = this.gapSizeNode ? float(this.gapSizeNode) : materialLineGapSize;

    // 将计算出的虚线大小赋值给全局虚线大小属性
    dashSize.assign(dashSizeNode);
    // 将计算出的间隙大小赋值给全局间隙大小属性
    gapSize.assign(gapSizeNode);

    // 创建变化变量：线条距离乘以缩放因子，用于在片段着色器中计算虚线模式
    const vLineDistance = varying(attribute("lineDistance").mul(dashScaleNode));
    // 如果有偏移节点，则将偏移量添加到线条距离中，否则直接使用线条距离
    const vLineDistanceOffset = offsetNode ? vLineDistance.add(offsetNode) : vLineDistance;

    // 实现虚线逻辑：
    // 1. 计算当前位置在虚线周期中的位置：(虚线大小 + 间隙大小) 的模运算
    // 2. 如果结果大于虚线大小，说明当前位置在间隙中，丢弃该片段
    // 3. discard() 会丢弃当前片段，从而创建虚线效果
    vLineDistanceOffset.mod(dashSize.add(gapSize)).greaterThan(dashSize).discard();
  }
}

// 导出线条虚线节点材质类作为默认导出
export default LineDashedNodeMaterial;
