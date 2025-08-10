/**
 * NodeStorageBuffer.js
 *
 * 节点存储缓冲区 - 基于节点的存储缓冲区绑定类型
 *
 * 这个模块定义了由节点对象管理缓冲区值的特殊存储缓冲区绑定类型。
 * 存储缓冲区用于在GPU着色器中存储和访问大量结构化数据。
 */

// 导入基础存储缓冲区类和常量
import StorageBuffer from "../StorageBuffer.js";
import { NodeAccess } from "../../../nodes/core/constants.js";

// 全局ID计数器，用于生成唯一的存储缓冲区名称
let _id = 0;

/**
 * 节点存储缓冲区类
 *
 * 一种特殊形式的存储缓冲区绑定类型，其缓冲区值由节点对象管理。
 * 存储缓冲区允许着色器读写大量数据，常用于计算着色器和高级渲染技术。
 *
 * @private
 * @augments StorageBuffer
 */
class NodeStorageBuffer extends StorageBuffer {
  /**
   * 构造新的基于节点的存储缓冲区
   *
   * 创建一个由存储缓冲区节点管理的存储缓冲区绑定。缓冲区的实际值
   * 将从节点中动态获取，支持运行时数据更新。
   *
   * @param {import('../../../nodes/accessors/StorageBufferNode.js').StorageBufferNode} nodeUniform - 存储缓冲区节点，管理实际的缓冲区数据
   * @param {import('../../../nodes/core/UniformGroupNode.js').UniformGroupNode} groupNode - uniform组节点，用于组织绑定
   */
  constructor(nodeUniform, groupNode) {
    // 调用父类构造函数，生成唯一名称并传入节点的当前值
    super("StorageBuffer_" + _id++, nodeUniform ? nodeUniform.value : null);

    /**
     * 节点uniform
     *
     * 管理实际存储缓冲区数据的节点。这个节点负责提供
     * 缓冲区的数据内容和访问权限设置。
     *
     * @type {import('../../../nodes/accessors/StorageBufferNode.js').StorageBufferNode}
     */
    this.nodeUniform = nodeUniform;

    /**
     * 访问类型
     *
     * 指定存储缓冲区在着色器中的访问模式：
     * - READ_ONLY: 只读访问
     * - WRITE_ONLY: 只写访问
     * - READ_WRITE: 读写访问
     *
     * @type {string}
     */
    this.access = nodeUniform ? nodeUniform.access : NodeAccess.READ_WRITE;

    /**
     * uniform组节点
     *
     * 用于组织和管理uniform绑定的节点。所有相关的uniform
     * 会被分组到一起，便于批量更新和管理。
     *
     * @type {import('../../../nodes/core/UniformGroupNode.js').UniformGroupNode}
     */
    this.groupNode = groupNode;
  }

  /**
   * 获取存储缓冲区
   *
   * 返回节点uniform中管理的实际缓冲区数据。这个getter
   * 确保始终返回最新的缓冲区内容。
   *
   * @type {import('../../../core/BufferAttribute.js').BufferAttribute}
   */
  get buffer() {
    // 从节点uniform获取最新的缓冲区值
    return this.nodeUniform.value;
  }
}

// 导出节点存储缓冲区类
export default NodeStorageBuffer;
