/**
 * NodeUniformBuffer.js
 *
 * 节点uniform缓冲区 - 基于节点的uniform缓冲区绑定类型
 *
 * 这个模块定义了由节点对象管理缓冲区值的特殊uniform缓冲区绑定类型。
 * uniform缓冲区用于高效地向着色器传递大量uniform数据，比单独的uniform变量更高效。
 */

// 导入基础uniform缓冲区类
import UniformBuffer from "../UniformBuffer.js";

// 全局ID计数器，用于生成唯一的uniform缓冲区名称
let _id = 0;

/**
 * 节点uniform缓冲区类
 *
 * 一种特殊形式的uniform缓冲区绑定类型，其缓冲区值由节点对象管理。
 * uniform缓冲区允许将多个相关的uniform变量打包到一个缓冲区中，
 * 提高数据传输效率并减少API调用次数。
 *
 * @private
 * @augments UniformBuffer
 */
class NodeUniformBuffer extends UniformBuffer {
  /**
   * 构造新的基于节点的uniform缓冲区
   *
   * 创建一个由缓冲区节点管理的uniform缓冲区绑定。缓冲区的实际值
   * 将从节点中动态获取，支持运行时数据更新。
   *
   * @param {import('../../../nodes/accessors/BufferNode.js').BufferNode} nodeUniform - uniform缓冲区节点，管理实际的缓冲区数据
   * @param {import('../../../nodes/core/UniformGroupNode.js').UniformGroupNode} groupNode - uniform组节点，用于组织绑定
   */
  constructor(nodeUniform, groupNode) {
    // 调用父类构造函数，生成唯一名称并传入节点的当前值
    super("UniformBuffer_" + _id++, nodeUniform ? nodeUniform.value : null);

    /**
     * uniform缓冲区节点
     *
     * 管理实际uniform缓冲区数据的节点。这个节点负责提供
     * 缓冲区的数据内容，通常是Float32Array格式的数据。
     *
     * @type {import('../../../nodes/accessors/BufferNode.js').BufferNode}
     */
    this.nodeUniform = nodeUniform;

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
   * 获取uniform缓冲区
   *
   * 返回节点uniform中管理的实际缓冲区数据。这个getter
   * 确保始终返回最新的缓冲区内容，通常是Float32Array格式。
   *
   * @type {Float32Array}
   */
  get buffer() {
    // 从节点uniform获取最新的缓冲区值
    return this.nodeUniform.value;
  }
}

// 导出节点uniform缓冲区类
export default NodeUniformBuffer;
