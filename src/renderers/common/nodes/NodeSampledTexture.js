/**
 * NodeSampledTexture.js
 *
 * 节点采样纹理 - 基于节点的纹理采样绑定类型
 *
 * 这个模块定义了由节点对象管理纹理值的特殊采样纹理绑定类型。
 * 包含普通2D纹理、立方体纹理和3D纹理的节点版本。
 */

// 导入基础采样纹理类
import { SampledTexture } from "../SampledTexture.js";

/**
 * 节点采样纹理类
 *
 * 一种特殊形式的采样纹理绑定类型，其纹理值由节点对象管理。
 * 这允许纹理在着色器编译时动态绑定，提供更灵活的纹理管理。
 *
 * @private
 * @augments SampledTexture
 */
class NodeSampledTexture extends SampledTexture {
  /**
   * 构造新的基于节点的采样纹理
   *
   * 创建一个由纹理节点管理的采样纹理绑定。纹理的实际值
   * 将从纹理节点中动态获取，支持运行时纹理切换。
   *
   * @param {string} name - 纹理的名称，用于着色器中的标识
   * @param {import('../../../nodes/accessors/TextureNode.js').TextureNode} textureNode - 纹理节点，管理实际的纹理对象
   * @param {import('../../../nodes/core/UniformGroupNode.js').UniformGroupNode} groupNode - uniform组节点，用于组织绑定
   * @param {?string} [access=null] - 访问类型，如只读、只写或读写
   */
  constructor(name, textureNode, groupNode, access = null) {
    // 调用父类构造函数，传入纹理节点的当前值
    super(name, textureNode ? textureNode.value : null);

    /**
     * 纹理节点
     *
     * 管理实际纹理对象的节点。纹理值可以在运行时动态变化，
     * 这个节点负责提供当前的纹理实例。
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

    /**
     * 访问类型
     *
     * 指定纹理在着色器中的访问模式，如只读、只写或读写。
     * 这影响GPU如何优化纹理的使用。
     *
     * @type {?string}
     * @default null
     */
    this.access = access;
  }

  /**
   * 更新绑定
   *
   * 检查纹理节点的值是否发生变化，如果变化则更新绑定的纹理。
   * 这确保着色器始终使用最新的纹理对象。
   *
   * @return {boolean} 纹理是否已更新并且必须上传到GPU
   */
  update() {
    // 获取纹理节点的引用
    const { textureNode } = this;

    // 检查纹理是否发生变化
    if (this.texture !== textureNode.value) {
      // 更新纹理引用
      this.texture = textureNode.value;

      // 返回true表示需要重新上传到GPU
      return true;
    }

    // 如果纹理没有变化，调用父类的更新方法
    return super.update();
  }
}

/**
 * 节点采样立方体纹理类
 *
 * 一种特殊形式的采样立方体纹理绑定类型，其纹理值由节点对象管理。
 * 立方体纹理通常用于环境映射、天空盒和反射效果。
 *
 * @private
 * @augments NodeSampledTexture
 */
class NodeSampledCubeTexture extends NodeSampledTexture {
  /**
   * 构造新的基于节点的采样立方体纹理
   *
   * 创建一个专门用于立方体纹理的节点采样纹理。立方体纹理
   * 由6个面组成，常用于环境映射和反射计算。
   *
   * @param {string} name - 纹理的名称，用于着色器中的标识
   * @param {import('../../../nodes/accessors/TextureNode.js').TextureNode} textureNode - 纹理节点，管理立方体纹理对象
   * @param {import('../../../nodes/core/UniformGroupNode.js').UniformGroupNode} groupNode - uniform组节点，用于组织绑定
   * @param {?string} [access=null] - 访问类型，如只读、只写或读写
   */
  constructor(name, textureNode, groupNode, access = null) {
    // 调用父类构造函数
    super(name, textureNode, groupNode, access);

    /**
     * 立方体纹理类型标识
     *
     * 这个标志可用于类型测试，帮助识别这是一个立方体纹理绑定。
     * 在运行时可以通过检查这个属性来确定纹理类型。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSampledCubeTexture = true;
  }
}

/**
 * 节点采样3D纹理类
 *
 * 一种特殊形式的采样3D纹理绑定类型，其纹理值由节点对象管理。
 * 3D纹理用于体积渲染、噪声生成和复杂的着色效果。
 *
 * @private
 * @augments NodeSampledTexture
 */
class NodeSampledTexture3D extends NodeSampledTexture {
  /**
   * 构造新的基于节点的采样3D纹理
   *
   * 创建一个专门用于3D纹理的节点采样纹理。3D纹理具有
   * 宽度、高度和深度三个维度，用于体积数据的存储和采样。
   *
   * @param {string} name - 纹理的名称，用于着色器中的标识
   * @param {import('../../../nodes/accessors/TextureNode.js').TextureNode} textureNode - 纹理节点，管理3D纹理对象
   * @param {import('../../../nodes/core/UniformGroupNode.js').UniformGroupNode} groupNode - uniform组节点，用于组织绑定
   * @param {?string} [access=null] - 访问类型，如只读、只写或读写
   */
  constructor(name, textureNode, groupNode, access = null) {
    // 调用父类构造函数
    super(name, textureNode, groupNode, access);

    /**
     * 3D纹理类型标识
     *
     * 这个标志可用于类型测试，帮助识别这是一个3D纹理绑定。
     * 在运行时可以通过检查这个属性来确定纹理类型。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSampledTexture3D = true;
  }
}

// 导出所有节点采样纹理类
export { NodeSampledTexture, NodeSampledCubeTexture, NodeSampledTexture3D };
