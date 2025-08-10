/**
 * NodeSampler.js
 *
 * 节点采样器 - 基于节点的纹理采样器绑定类型
 *
 * 这个模块定义了由节点对象管理纹理值的特殊采样器绑定类型。
 * 采样器负责定义如何从纹理中采样像素数据，包括过滤模式、包装模式等。
 */

// 导入基础采样器类
import Sampler from "../Sampler.js";

/**
 * 节点采样器类
 *
 * 一种特殊形式的采样器绑定类型，其纹理值由节点对象管理。
 * 采样器定义了纹理的采样参数，如过滤方式、包装模式、各向异性等。
 *
 * @private
 * @augments Sampler
 */
class NodeSampler extends Sampler {
  /**
   * 构造新的基于节点的采样器
   *
   * 创建一个由纹理节点管理的采样器绑定。采样器的纹理值
   * 将从纹理节点中动态获取，支持运行时纹理切换。
   *
   * @param {string} name - 采样器的名称，用于着色器中的标识
   * @param {import('../../../nodes/accessors/TextureNode.js').TextureNode} textureNode - 纹理节点，管理实际的纹理对象
   * @param {import('../../../nodes/core/UniformGroupNode.js').UniformGroupNode} groupNode - uniform组节点，用于组织绑定
   */
  constructor(name, textureNode, groupNode) {
    // 调用父类构造函数，传入纹理节点的当前值
    super(name, textureNode ? textureNode.value : null);

    /**
     * 纹理节点
     *
     * 管理实际纹理对象的节点。纹理值可以在运行时动态变化，
     * 这个节点负责提供当前的纹理实例及其采样参数。
     *
     * @type {import('../../../nodes/accessors/TextureNode.js').TextureNode}
     */
    this.textureNode = textureNode;

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
   * 更新采样器的纹理值
   *
   * 从纹理节点获取最新的纹理值并更新采样器。这确保
   * 采样器始终使用最新的纹理对象和采样参数。
   */
  update() {
    // 从纹理节点获取最新的纹理值
    this.texture = this.textureNode.value;
  }
}

// 导出节点采样器类
export default NodeSampler;
