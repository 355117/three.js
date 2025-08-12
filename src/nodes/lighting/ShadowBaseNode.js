// 导入核心节点基类
import Node from "../core/Node.js";
// 导入节点更新类型常量
import { NodeUpdateType } from "../core/constants.js";
// 导入TSL属性函数
import { property } from "../tsl/TSLBase.js";
// 导入世界坐标位置访问器
import { positionWorld } from "../accessors/Position.js";

/**
 * 所有阴影节点的基类。
 *
 * 阴影节点封装了与阴影相关的逻辑，并且总是与光照节点耦合。
 * 光照节点可能共享相同的阴影节点类型，或者根据其需求使用特定的阴影节点。
 *
 * @augments Node
 */
class ShadowBaseNode extends Node {
  // 返回节点类型标识符
  static get type() {
    return "ShadowBaseNode";
  }

  /**
   * 构造一个新的阴影基础节点。
   *
   * @param {Object} light - 投射阴影的光源对象
   */
  constructor(light) {
    // 调用父类构造函数
    super();

    /**
     * 投射阴影的光源对象。
     *
     * @type {Object}
     */
    this.light = light;

    /**
     * 重写默认值，因为阴影默认在每次渲染时更新。
     *
     * @type {string}
     * @default 'render'
     */
    this.updateBeforeType = NodeUpdateType.RENDER;

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isShadowBaseNode = true;
  }

  /**
   * 设置阴影位置节点，默认为预定义的TSL节点对象 `shadowPositionWorld`。
   *
   * @param {NodeBuilder} object - 必须至少包含材质引用的配置对象
   */
  setupShadowPosition({ context, material }) {
    // 在 Fn() 内部使用 assign

    // 分配阴影位置世界坐标，优先使用材质的接收阴影位置节点，
    // 其次使用上下文的阴影位置世界坐标，最后使用默认的世界位置
    shadowPositionWorld.assign(material.receivedShadowPositionNode || context.shadowPositionWorld || positionWorld);
  }
}

/**
 * TSL对象，表示阴影通道期间顶点在世界空间中的位置。
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const shadowPositionWorld = /*@__PURE__*/ property("vec3", "shadowPositionWorld");

// 导出阴影基础节点类作为默认导出
export default ShadowBaseNode;
