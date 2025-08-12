// 导入引用节点基类
import ReferenceNode from "./ReferenceNode.js";
// 导入TSL节点对象包装器
import { nodeObject } from "../tsl/TSLBase.js";

/**
 * 材质引用节点 - 一种特殊的引用节点类型，用于将材质属性与节点值链接
 * ```js
 * const opacityNode = materialReference( 'opacity', 'float', material );
 * ```
 * 当改变 `material.opacity` 时，`opacityNode` 的节点值将自动更新
 *
 * @augments ReferenceNode
 */
class MaterialReferenceNode extends ReferenceNode {
  // 返回节点类型标识符
  static get type() {
    return "MaterialReferenceNode";
  }

  /**
   * 构造一个新的材质引用节点
   *
   * @param {string} property - 节点引用的属性名称
   * @param {string} inputType - 用于表示属性值的统一变量类型
   * @param {?Material} [material=null] - 属性所属的材质。当未设置材质时，
   * 节点引用当前渲染对象的材质
   */
  constructor(property, inputType, material = null) {
    // 调用父类构造函数
    super(property, inputType, material);

    /**
     * 属性所属的材质。当未设置材质时，
     * 节点引用当前渲染对象的材质
     *
     * @type {?Material}
     * @default null
     */
    this.material = material;

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMaterialReferenceNode = true;
  }

  /**
   * 根据给定状态更新引用。仅当 {@link MaterialReferenceNode#material} 未设置时才评估状态
   *
   * @param {(NodeFrame|NodeBuilder)} state - 当前状态
   * @return {Object} 更新后的引用
   */
  updateReference(state) {
    // 如果设置了材质则使用设置的材质，否则使用状态中的材质
    this.reference = this.material !== null ? this.material : state.material;

    return this.reference;
  }
}

// 导出MaterialReferenceNode类作为默认导出
export default MaterialReferenceNode;

/**
 * TSL函数 - 用于创建材质引用节点
 *
 * @tsl
 * @function
 * @param {string} name - 节点引用的属性名称
 * @param {string} type - 用于表示属性值的统一变量类型
 * @param {?Material} [material=null] - 属性所属的材质
 * 当未设置材质时，节点引用当前渲染对象的材质
 * @returns {MaterialReferenceNode}
 */
export const materialReference = (name, type, material = null) => nodeObject(new MaterialReferenceNode(name, type, material));
