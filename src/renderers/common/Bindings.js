/**
 * Bindings.js
 *
 * 绑定管理器 - 管理渲染器的资源绑定
 *
 * 这个渲染器模块负责管理渲染器的绑定，包括纹理绑定、缓冲区绑定、
 * 采样器绑定等。它协调各种资源的绑定创建、更新和管理，确保
 * 着色器能够正确访问所需的GPU资源。
 */

// 导入依赖模块
import DataMap from "./DataMap.js"; // 数据映射基类
import { AttributeType } from "./Constants.js"; // 属性类型常量

/**
 * 绑定管理类
 *
 * 这个渲染器模块管理渲染器的绑定。绑定是连接GPU资源（如纹理、
 * 缓冲区、采样器）与着色器程序的桥梁。绑定管理器负责：
 * - 创建和初始化绑定组
 * - 更新绑定状态和资源
 * - 协调各种资源管理器
 * - 优化绑定缓存和版本控制
 *
 * @private
 * @augments DataMap
 */
class Bindings extends DataMap {
  /**
   * 构造新的绑定管理组件
   *
   * 初始化绑定管理器，设置各个资源管理器的引用。绑定管理器
   * 将协调后端、节点、纹理、属性、管线等组件的工作。
   *
   * @param {import('./Backend.js').default} backend - 渲染器的后端实现
   * @param {import('./nodes/Nodes.js').default} nodes - 用于管理节点相关逻辑的渲染器组件
   * @param {import('./Textures.js').default} textures - 用于管理纹理的渲染器组件
   * @param {import('./Attributes.js').default} attributes - 用于管理属性的渲染器组件
   * @param {import('./Pipelines.js').default} pipelines - 用于管理管线的渲染器组件
   * @param {import('./Info.js').default} info - 用于管理指标和监控数据的渲染器组件
   */
  constructor(backend, nodes, textures, attributes, pipelines, info) {
    // 调用父类构造函数
    super();

    /**
     * 渲染器后端
     *
     * 对渲染器后端的引用，用于执行特定于后端的绑定操作，
     * 如创建绑定组、更新绑定等。
     *
     * @type {import('./Backend.js').default}
     */
    this.backend = backend;

    /**
     * 纹理管理组件
     *
     * 用于管理纹理的渲染器组件，负责纹理的创建、更新、
     * 生成mipmap等操作。
     *
     * @type {import('./Textures.js').default}
     */
    this.textures = textures;

    /**
     * 管线管理组件
     *
     * 用于管理渲染和计算管线的渲染器组件，负责管线的
     * 创建、缓存和状态管理。
     *
     * @type {import('./Pipelines.js').default}
     */
    this.pipelines = pipelines;

    /**
     * 属性管理组件
     *
     * 用于管理几何体属性的渲染器组件，负责顶点属性、
     * 索引属性、存储属性等的管理。
     *
     * @type {import('./Attributes.js').default}
     */
    this.attributes = attributes;

    /**
     * 节点管理组件
     *
     * 用于管理节点相关逻辑的渲染器组件，负责节点图的
     * 解析、uniform组的管理等。
     *
     * @type {import('./nodes/Nodes.js').default}
     */
    this.nodes = nodes;

    /**
     * 信息监控组件
     *
     * 用于管理指标和监控数据的渲染器组件，负责收集
     * 和统计渲染性能数据。
     *
     * @type {import('./Info.js').default}
     */
    this.info = info;

    // 将绑定管理器分配给管线管理器，建立双向关联
    this.pipelines.bindings = this;
  }

  /**
   * 获取给定渲染对象的绑定组
   *
   * 为渲染对象获取或创建所需的绑定组。如果绑定组尚未创建，
   * 会初始化绑定组并通过后端创建GPU资源。
   *
   * @param {import('./RenderObject.js').default} renderObject - 渲染对象
   * @return {Array<import('./BindGroup.js').default>} 绑定组数组
   */
  getForRender(renderObject) {
    // 从渲染对象获取绑定组
    const bindings = renderObject.getBindings();

    // 遍历所有绑定组，确保它们已经初始化
    for (const bindGroup of bindings) {
      const groupData = this.get(bindGroup);

      if (groupData.bindGroup === undefined) {
        // 每个对象定义一个绑定数组（UBO、纹理、采样器等）

        // 初始化绑定组
        this._init(bindGroup);

        // 通过后端创建绑定组
        this.backend.createBindings(bindGroup, bindings, 0);

        // 标记绑定组已创建
        groupData.bindGroup = bindGroup;
      }
    }

    return bindings;
  }

  /**
   * 获取给定计算节点的绑定组
   *
   * 为计算节点获取或创建所需的绑定组。计算节点通常需要
   * 存储缓冲区、纹理等资源来执行计算任务。
   *
   * @param {import('../../nodes/core/Node.js').Node} computeNode - 计算节点
   * @return {Array<import('./BindGroup.js').default>} 绑定组数组
   */
  getForCompute(computeNode) {
    // 从节点管理器获取计算节点的绑定组
    const bindings = this.nodes.getForCompute(computeNode).bindings;

    // 遍历所有绑定组，确保它们已经初始化
    for (const bindGroup of bindings) {
      const groupData = this.get(bindGroup);

      if (groupData.bindGroup === undefined) {
        // 初始化绑定组
        this._init(bindGroup);

        // 通过后端创建绑定组
        this.backend.createBindings(bindGroup, bindings, 0);

        // 标记绑定组已创建
        groupData.bindGroup = bindGroup;
      }
    }

    return bindings;
  }

  /**
   * 更新给定计算节点的绑定
   *
   * 更新计算节点相关的所有绑定，确保计算着色器能够
   * 访问到最新的资源数据。
   *
   * @param {import('../../nodes/core/Node.js').Node} computeNode - 计算节点
   */
  updateForCompute(computeNode) {
    // 获取计算节点的绑定组并更新
    this._updateBindings(this.getForCompute(computeNode));
  }

  /**
   * 更新给定渲染对象的绑定
   *
   * 更新渲染对象相关的所有绑定，确保着色器能够
   * 访问到最新的资源数据。
   *
   * @param {import('./RenderObject.js').default} renderObject - 渲染对象
   */
  updateForRender(renderObject) {
    // 获取渲染对象的绑定组并更新
    this._updateBindings(this.getForRender(renderObject));
  }

  /**
   * 更新给定的绑定数组
   *
   * 遍历所有绑定组，检查并更新需要更新的绑定。
   * 这是绑定更新的核心方法。
   *
   * @param {Array<import('./BindGroup.js').default>} bindings - 绑定组数组
   */
  _updateBindings(bindings) {
    // 遍历所有绑定组进行更新
    for (const bindGroup of bindings) {
      this._update(bindGroup, bindings);
    }
  }

  /**
   * 初始化给定的绑定组
   *
   * 遍历绑定组中的所有绑定，根据绑定类型执行相应的初始化操作。
   * 这包括纹理的更新和存储缓冲区属性的设置。
   *
   * @param {import('./BindGroup.js').default} bindGroup - 要初始化的绑定组
   */
  _init(bindGroup) {
    // 遍历绑定组中的所有绑定
    for (const binding of bindGroup.bindings) {
      if (binding.isSampledTexture) {
        // 如果是采样纹理绑定，更新纹理
        this.textures.updateTexture(binding.texture);
      } else if (binding.isStorageBuffer) {
        // 如果是存储缓冲区绑定，更新属性
        const attribute = binding.attribute;
        // 根据属性类型确定是间接存储还是普通存储
        const attributeType = attribute.isIndirectStorageBufferAttribute ? AttributeType.INDIRECT : AttributeType.STORAGE;

        // 更新属性
        this.attributes.update(attribute, attributeType);
      }
    }
  }

  /**
   * 更新给定的绑定组
   *
   * 这是绑定更新的核心方法，负责检查和更新绑定组中的所有绑定。
   * 它处理不同类型的绑定（uniform缓冲区、纹理、采样器等），
   * 并决定是否需要重新创建绑定组。
   *
   * @param {import('./BindGroup.js').default} bindGroup - 要更新的绑定组
   * @param {Array<import('./BindGroup.js').default>} bindings - 绑定组数组
   */
  _update(bindGroup, bindings) {
    const { backend } = this;

    // 绑定更新状态标志
    let needsBindingsUpdate = false; // 是否需要更新绑定组
    let cacheBindings = true; // 是否可以缓存绑定
    let cacheIndex = 0; // 缓存索引
    let version = 0; // 版本号

    // 遍历所有绑定，检查是否需要缓冲区更新或新的绑定组

    for (const binding of bindGroup.bindings) {
      if (binding.isNodeUniformsGroup) {
        // 处理节点uniform组绑定
        const updated = this.nodes.updateGroup(binding);

        // 每个uniform组都是一个uniform缓冲区。如果不需要更新，
        // 我们继续处理下一个绑定。否则下一个if块将更新该组。

        if (updated === false) continue;
      }

      if (binding.isStorageBuffer) {
        // 处理存储缓冲区绑定
        const attribute = binding.attribute;
        // 根据属性类型确定是间接存储还是普通存储
        const attributeType = attribute.isIndirectStorageBufferAttribute ? AttributeType.INDIRECT : AttributeType.STORAGE;

        // 更新存储缓冲区属性
        this.attributes.update(attribute, attributeType);
      }

      if (binding.isUniformBuffer) {
        // 处理uniform缓冲区绑定
        const updated = binding.update();

        if (updated) {
          // 如果uniform缓冲区已更新，通知后端更新绑定
          backend.updateBinding(binding);
        }
      } else if (binding.isSampledTexture) {
        // 处理采样纹理绑定
        const updated = binding.update();

        // 在更新后获取纹理数据，以同步来自节点的纹理引用
        const texture = binding.texture;
        const texturesTextureData = this.textures.get(texture);

        if (updated) {
          // 版本更新：更新纹理数据或创建新的纹理数据
          this.textures.updateTexture(texture);

          // 生成更新：如果创建了新纹理，则更新绑定
          if (binding.generation !== texturesTextureData.generation) {
            binding.generation = texturesTextureData.generation;

            // 标记需要更新绑定组
            needsBindingsUpdate = true;
          }
        }

        // 获取后端纹理数据
        const textureData = backend.get(texture);

        // 检查是否可以缓存绑定
        if (textureData.externalTexture !== undefined || texturesTextureData.isDefaultTexture) {
          // 外部纹理或默认纹理不能缓存
          cacheBindings = false;
        } else {
          // 计算缓存索引和版本
          cacheIndex = cacheIndex * 10 + texture.id;
          version += texture.version;
        }

        // 处理存储纹理的特殊情况
        if (texture.isStorageTexture === true) {
          const textureData = this.get(texture);

          if (binding.store === true) {
            // 如果绑定用于存储，标记需要生成mipmap
            textureData.needsMipmap = true;
          } else if (this.textures.needsMipmaps(texture) && textureData.needsMipmap === true) {
            // 如果需要mipmap且标记为需要生成，则生成mipmap
            this.backend.generateMipmaps(texture);

            // 重置mipmap需求标志
            textureData.needsMipmap = false;
          }
        }
      } else if (binding.isSampler) {
        // 处理采样器绑定
        binding.update();
      }
    }

    // 如果需要更新绑定，通知后端更新绑定组
    if (needsBindingsUpdate === true) {
      this.backend.updateBindings(bindGroup, bindings, cacheBindings ? cacheIndex : 0, version);
    }
  }
}

// 导出绑定管理类
export default Bindings;
