// 导入引用节点基类
import ReferenceNode from "./ReferenceNode.js";
// 导入节点对象包装器
import { nodeObject } from "../tsl/TSLBase.js";

/**
 * 用户数据节点 - 一种特殊的引用节点类型，允许将 `userData` 字段中的值链接到节点对象
 * ```js
 * sprite.userData.rotation = 1; // 为每个精灵存储单独的旋转值
 *
 * const material = new THREE.SpriteNodeMaterial();
 * material.rotationNode = userData( 'rotation', 'float' );
 * ```
 * 由于 `UserDataNode` 继承自 {@link ReferenceNode}，当 `rotation` 用户数据字段改变时，
 * 节点值将自动更新。
 *
 * @augments ReferenceNode
 */
class UserDataNode extends ReferenceNode {
  // 返回节点类型标识符
  static get type() {
    return "UserDataNode";
  }

  /**
   * 构造一个新的用户数据节点
   *
   * @param {string} property - 节点应引用的属性名称
   * @param {string} inputType - 引用的节点数据类型
   * @param {?Object} [userData=null] - 对 `userData` 对象的引用。如果未提供，将评估使用节点材质的3D对象的 `userData` 属性
   */
  constructor(property, inputType, userData = null) {
    // 调用父类构造函数
    super(property, inputType, userData);

    /**
     * 对 `userData` 对象的引用。如果未提供，将评估使用节点材质的3D对象的 `userData` 属性
     *
     * @type {?Object}
     * @default null
     */
    this.userData = userData;
  }

  /**
   * 重写以确保 {@link ReferenceNode#reference} 指向正确的 `userData` 字段
   *
   * @param {(NodeFrame|NodeBuilder)} state - 要评估的当前状态
   * @return {Object} 对 `userData` 字段的引用
   */
  updateReference(state) {
    // 如果设置了userData则使用设置的，否则使用状态对象的userData
    this.reference = this.userData !== null ? this.userData : state.object.userData;

    return this.reference;
  }
}

// 导出UserDataNode类作为默认导出
export default UserDataNode;

/**
 * TSL函数 - 用于创建用户数据节点
 *
 * @tsl
 * @function
 * @param {string} name - 节点应引用的属性名称
 * @param {string} inputType - 引用的节点数据类型
 * @param {?Object} userData - 对 `userData` 对象的引用。如果未提供，将评估使用节点材质的3D对象的 `userData` 属性
 * @returns {UserDataNode}
 */
export const userData = (name, inputType, userData) => nodeObject(new UserDataNode(name, inputType, userData));
