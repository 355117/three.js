/**
 * NodeUniformsGroup.js
 *
 * 节点uniform组 - 基于节点的uniform组管理
 *
 * 这个模块定义了一种特殊形式的uniform组，将各个uniform表示为基于节点的uniform。
 * 它提供了更灵活的uniform管理方式，支持动态更新和组织。
 */

// 导入基础uniform组类
import UniformsGroup from "../UniformsGroup.js";

// 全局ID计数器，用于生成唯一的组ID
let _id = 0;

/**
 * 节点uniform组类
 *
 * 一种特殊形式的uniform组，将各个uniform表示为基于节点的uniform。
 * 这种设计允许更灵活的uniform管理，支持动态绑定和更新，
 * 并且可以与节点系统无缝集成。
 *
 * @private
 * @augments UniformsGroup
 */
class NodeUniformsGroup extends UniformsGroup {
  /**
   * 构造新的基于节点的uniform组
   *
   * 创建一个新的节点uniform组，用于管理一组相关的uniform变量。
   * 每个组都有唯一的ID和名称，便于识别和管理。
   *
   * @param {string} name - 组的名称，用于标识这个uniform组
   * @param {import('../../../nodes/core/UniformGroupNode.js').UniformGroupNode} groupNode - uniform组节点，管理组内的uniform
   */
  constructor(name, groupNode) {
    // 调用父类构造函数，传入组名称
    super(name);

    /**
     * 组的唯一ID
     *
     * 每个uniform组都有一个唯一的数字ID，用于在渲染系统中
     * 快速识别和区分不同的uniform组。
     *
     * @type {number}
     */
    this.id = _id++;

    /**
     * uniform组节点
     *
     * 管理这个uniform组内所有uniform变量的节点。这个节点
     * 负责组织、更新和提供组内的uniform数据。
     *
     * @type {import('../../../nodes/core/UniformGroupNode.js').UniformGroupNode}
     */
    this.groupNode = groupNode;

    /**
     * 节点uniform组类型标识
     *
     * 这个标志可用于类型测试，帮助识别这是一个基于节点的uniform组。
     * 在运行时可以通过检查这个属性来确定uniform组的类型。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isNodeUniformsGroup = true;
  }
}

// 导出节点uniform组类
export default NodeUniformsGroup;
