// 导入引用基础节点
import ReferenceBaseNode from "./ReferenceBaseNode.js";
// 导入节点对象包装器
import { nodeObject } from "../tsl/TSLCore.js";
// 导入渲染组
import { renderGroup } from "../core/UniformGroupNode.js";

/**
 * 渲染器引用节点 - 一种特殊的引用节点类型，用于将渲染器属性与节点值链接
 * ```js
 * const exposureNode = rendererReference( 'toneMappingExposure', 'float', renderer );
 * ```
 * 当改变 `renderer.toneMappingExposure` 时，`exposureNode` 的节点值将自动更新
 *
 * @augments ReferenceBaseNode
 */
class RendererReferenceNode extends ReferenceBaseNode {
  // 返回节点类型标识符
  static get type() {
    return "RendererReferenceNode";
  }

  /**
   * 构造一个新的渲染器引用节点
   *
   * @param {string} property - 节点引用的属性名称
   * @param {string} inputType - 用于表示属性值的统一变量类型
   * @param {?Renderer} [renderer=null] - 属性所属的渲染器。当未设置渲染器时，
   * 节点引用当前状态的渲染器
   */
  constructor(property, inputType, renderer = null) {
    // 调用父类构造函数
    super(property, inputType, renderer);

    /**
     * 属性所属的渲染器。当未设置渲染器时，
     * 节点引用当前状态的渲染器
     *
     * @type {?Renderer}
     * @default null
     */
    this.renderer = renderer;

    // 设置为渲染组
    this.setGroup(renderGroup);
  }

  /**
   * 根据给定状态更新引用。仅当 {@link RendererReferenceNode#renderer} 未设置时才评估状态
   *
   * @param {(NodeFrame|NodeBuilder)} state - 当前状态
   * @return {Object} 更新后的引用
   */
  updateReference(state) {
    // 如果设置了渲染器则使用设置的渲染器，否则使用状态中的渲染器
    this.reference = this.renderer !== null ? this.renderer : state.renderer;

    return this.reference;
  }
}

// 导出RendererReferenceNode类作为默认导出
export default RendererReferenceNode;

/**
 * TSL函数 - 用于创建渲染器引用节点
 *
 * @tsl
 * @function
 * @param {string} name - 节点引用的属性名称
 * @param {string} type - 用于表示属性值的统一变量类型
 * @param {?Renderer} [renderer=null] - 属性所属的渲染器。当未设置渲染器时，
 * 节点引用当前状态的渲染器
 * @returns {RendererReferenceNode}
 */
export const rendererReference = (name, type, renderer = null) => nodeObject(new RendererReferenceNode(name, type, renderer));
