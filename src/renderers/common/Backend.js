/**
 * Backend.js
 *
 * 渲染后端抽象基类 - 定义3D渲染后端接口
 *
 * 这个抽象基类定义了封装所有后端相关逻辑的接口。
 * 每个后端（WebGPU、WebGL 2等）的派生类必须实现这个接口。
 */

// 模块级变量，用于临时计算
let _vector2 = null;
let _color4 = null;

// 导入依赖模块
import Color4 from "./Color4.js"; // 4分量颜色类
import { Vector2 } from "../../math/Vector2.js"; // 2D向量类
import { createCanvasElement, warnOnce } from "../../utils.js"; // 工具函数
import { REVISION } from "../../constants.js"; // Three.js版本信息

/**
 * 渲染后端抽象基类
 *
 * 大部分渲染相关的逻辑都在{@link Renderer}模块和相关管理组件中实现。
 * 但有时需要执行特定于当前3D后端（WebGPU或WebGL 2）的命令。
 * 这个抽象基类定义了封装所有后端相关逻辑的接口。
 * 每个后端的派生类必须实现这个接口。
 *
 * @abstract
 * @private
 */
class Backend {
  /**
   * 构造新的后端实例
   *
   * 初始化后端的基础设施，包括参数配置、数据存储、
   * 时间戳查询池等核心组件。
   *
   * @param {Object} parameters - 包含后端参数的对象
   */
  constructor(parameters = {}) {
    /**
     * 后端参数
     *
     * 存储后端的配置参数，如调试选项、性能设置等。
     * 这些参数控制后端的行为和特性。
     *
     * @type {Object}
     */
    this.parameters = Object.assign({}, parameters);

    /**
     * 后端特定数据存储
     *
     * 这个WeakMap保存对象（如纹理、属性或渲染目标）的
     * 后端特定数据。使用WeakMap确保对象被垃圾回收时
     * 相关数据也会被自动清理。
     *
     * @type {WeakMap}
     */
    this.data = new WeakMap();

    /**
     * 渲染器引用
     *
     * 对渲染器实例的引用，用于访问渲染器的状态和配置。
     * 在后端初始化时设置。
     *
     * @type {?import('../Renderer.js').default}
     * @default null
     */
    this.renderer = null;

    /**
     * 画布元素引用
     *
     * 对渲染器绘制目标画布元素的引用。可以是普通的
     * HTMLCanvasElement或用于Web Worker的OffscreenCanvas。
     *
     * @type {?(HTMLCanvasElement|OffscreenCanvas)}
     * @default null
     */
    this.domElement = null;

    /**
     * 时间戳查询池引用
     *
     * 用于性能分析的时间戳查询池，分别用于渲染和计算操作。
     * 允许测量GPU操作的执行时间。
     *
     * @type {{render: ?TimestampQueryPool, compute: ?TimestampQueryPool}}
     */
    this.timestampQueryPool = {
      render: null,
      compute: null,
    };

    /**
     * 时间戳跟踪标志
     *
     * 是否使用时间戳查询API跟踪时间戳。启用后可以
     * 测量GPU操作的性能，但可能有额外开销。
     *
     * @type {boolean}
     * @default false
     */
    this.trackTimestamp = parameters.trackTimestamp === true;
  }

  /**
   * 初始化后端使其准备就绪
   *
   * 具体的后端应该在这个方法中实现它们的渲染上下文创建
   * 和相关操作。这是后端生命周期的第一步。
   *
   * @async
   * @param {import('../Renderer.js').default} renderer - 渲染器实例
   * @return {Promise} 当后端初始化完成时解析的Promise
   */
  async init(renderer) {
    // 保存渲染器引用
    this.renderer = renderer;
  }

  /**
   * 后端的坐标系统
   *
   * 返回后端使用的坐标系统标识符。不同的后端可能使用
   * 不同的坐标系统（如左手坐标系或右手坐标系）。
   *
   * @abstract
   * @type {number}
   * @readonly
   */
  get coordinateSystem() {}

  // ===== 渲染上下文管理 =====

  /**
   * 开始渲染调用
   *
   * 这个方法在渲染调用开始时执行，后端可以使用它来
   * 为即将到来的绘制调用准备状态。
   *
   * @abstract
   * @param {import('./RenderContext.js').default} renderContext - 渲染上下文
   */
  beginRender(/*renderContext*/) {}

  /**
   * 结束渲染调用
   *
   * 这个方法在渲染调用结束时执行，后端可以使用它来
   * 在绘制调用后完成收尾工作。
   *
   * @abstract
   * @param {import('./RenderContext.js').default} renderContext - 渲染上下文
   */
  finishRender(/*renderContext*/) {}

  /**
   * 开始计算调用
   *
   * 这个方法在计算调用开始时执行，后端可以使用它来
   * 为即将到来的计算任务准备状态。
   *
   * @abstract
   * @param {import('../../nodes/core/Node.js').Node|Array<import('../../nodes/core/Node.js').Node>} computeGroup - 计算节点或节点数组
   */
  beginCompute(/*computeGroup*/) {}

  /**
   * 结束计算调用
   *
   * 这个方法在计算调用结束时执行，后端可以使用它来
   * 在计算任务后完成收尾工作。
   *
   * @abstract
   * @param {import('../../nodes/core/Node.js').Node|Array<import('../../nodes/core/Node.js').Node>} computeGroup - 计算节点或节点数组
   */
  finishCompute(/*computeGroup*/) {}

  // ===== 渲染对象管理 =====

  /**
   * 为给定的渲染对象执行绘制命令
   *
   * 这是渲染管线的核心方法，负责将渲染对象绘制到当前的
   * 渲染目标上。包括设置渲染状态、绑定资源、执行绘制调用等。
   *
   * @abstract
   * @param {import('./RenderObject.js').default} renderObject - 要绘制的渲染对象
   * @param {import('./Info.js').default} info - 包含GPU内存和渲染过程统计信息的对象
   */
  draw(/*renderObject, info*/) {}

  // ===== 计算节点管理 =====

  /**
   * 为给定的计算节点执行计算命令
   *
   * 执行GPU计算任务，如粒子系统更新、物理模拟、后处理效果等。
   * 计算着色器在GPU上并行执行，提供高性能的通用计算能力。
   *
   * @abstract
   * @param {import('../../nodes/core/Node.js').Node|Array<import('../../nodes/core/Node.js').Node>} computeGroup - 计算调用的计算节点组，可以是单个计算节点
   * @param {import('../../nodes/core/Node.js').Node} computeNode - 计算节点
   * @param {Array<import('./BindGroup.js').default>} bindings - 绑定组数组
   * @param {import('./ComputePipeline.js').default} computePipeline - 计算管线
   */
  compute(/*computeGroup, computeNode, computeBindings, computePipeline*/) {}

  // ===== 着色器程序管理 =====

  /**
   * 从给定的可编程阶段创建着色器程序
   *
   * 编译和链接着色器代码，创建可在GPU上执行的着色器程序。
   * 这包括顶点着色器、片段着色器和计算着色器的编译。
   *
   * @abstract
   * @param {import('./ProgrammableStage.js').default} program - 可编程阶段对象
   */
  createProgram(/*program*/) {}

  /**
   * 销毁给定可编程阶段的着色器程序
   *
   * 释放着色器程序占用的GPU资源，包括编译后的着色器代码
   * 和相关的GPU对象。
   *
   * @abstract
   * @param {import('./ProgrammableStage.js').default} program - 可编程阶段对象
   */
  destroyProgram(/*program*/) {}

  // ===== 资源绑定管理 =====

  /**
   * 从给定的绑定组定义创建绑定
   *
   * 创建GPU资源绑定，将纹理、缓冲区、采样器等资源
   * 绑定到着色器的特定位置，供着色器访问。
   *
   * @abstract
   * @param {import('./BindGroup.js').default} bindGroup - 绑定组对象
   * @param {Array<import('./BindGroup.js').default>} bindings - 绑定组数组
   * @param {number} cacheIndex - 缓存索引
   * @param {number} version - 版本号
   */
  createBindings(/*bindGroup, bindings, cacheIndex, version*/) {}

  /**
   * 更新给定的绑定组定义
   *
   * 更新已存在的资源绑定，当绑定的资源内容发生变化时
   * 需要调用此方法来同步更新。
   *
   * @abstract
   * @param {import('./BindGroup.js').default} bindGroup - 绑定组对象
   * @param {Array<import('./BindGroup.js').default>} bindings - 绑定组数组
   * @param {number} cacheIndex - 缓存索引
   * @param {number} version - 版本号
   */
  updateBindings(/*bindGroup, bindings, cacheIndex, version*/) {}

  /**
   * 更新缓冲区绑定
   *
   * 更新单个缓冲区绑定的内容，通常用于更新uniform缓冲区
   * 或存储缓冲区的数据。
   *
   * @abstract
   * @param {import('./Buffer.js').default} binding - 要更新的缓冲区绑定
   */
  updateBinding(/*binding*/) {}

  // ===== 渲染管线管理 =====

  /**
   * 为给定的渲染对象创建渲染管线
   *
   * 渲染管线定义了渲染过程的完整状态，包括着色器程序、
   * 顶点输入布局、混合状态、深度测试等所有渲染状态。
   *
   * @abstract
   * @param {import('./RenderObject.js').default} renderObject - 渲染对象
   * @param {Array<Promise>} promises - 用于`compileAsync()`的编译Promise数组
   */
  createRenderPipeline(/*renderObject, promises*/) {}

  /**
   * 为给定的计算节点创建计算管线
   *
   * 计算管线定义了计算着色器的执行状态，包括计算着色器程序
   * 和相关的资源绑定布局。
   *
   * @abstract
   * @param {import('./ComputePipeline.js').default} computePipeline - 计算管线对象
   * @param {Array<import('./BindGroup.js').default>} bindings - 绑定组数组
   */
  createComputePipeline(/*computePipeline, bindings*/) {}

  // ===== 缓存键管理 =====

  /**
   * 检查渲染管线是否需要更新
   *
   * 当渲染对象的状态发生变化时，可能需要重新创建或更新
   * 渲染管线。此方法用于检测这种变化。
   *
   * @abstract
   * @param {import('./RenderObject.js').default} renderObject - 渲染对象
   * @return {boolean} 渲染管线是否需要更新
   */
  needsRenderUpdate(/*renderObject*/) {}

  /**
   * 返回用于标识渲染管线的缓存键
   *
   * 缓存键用于唯一标识渲染管线的配置，相同配置的渲染对象
   * 可以共享同一个渲染管线，提高性能。
   *
   * @abstract
   * @param {import('./RenderObject.js').default} renderObject - 渲染对象
   * @return {string} 缓存键
   */
  getRenderCacheKey(/*renderObject*/) {}

  // ===== 节点构建器管理 =====

  /**
   * 为给定的渲染对象返回节点构建器
   *
   * 节点构建器负责将节点图转换为着色器代码，是节点系统
   * 与GPU着色器之间的桥梁。
   *
   * @abstract
   * @param {import('./RenderObject.js').default} renderObject - 渲染对象
   * @param {import('../Renderer.js').default} renderer - 渲染器
   * @return {import('../../nodes/core/NodeBuilder.js').NodeBuilder} 节点构建器
   */
  createNodeBuilder(/*renderObject, renderer*/) {}

  // ===== 纹理管理 =====

  /**
   * 为给定纹理创建GPU采样器
   *
   * 采样器定义了纹理的采样方式，包括过滤模式、包装模式、
   * 各向异性过滤等参数。
   *
   * @abstract
   * @param {import('../../textures/Texture.js').Texture} texture - 要创建采样器的纹理
   */
  createSampler(/*texture*/) {}

  /**
   * 销毁给定纹理的GPU采样器
   *
   * 释放采样器占用的GPU资源，当纹理不再需要时调用。
   *
   * @abstract
   * @param {import('../../textures/Texture.js').Texture} texture - 要销毁采样器的纹理
   */
  destroySampler(/*texture*/) {}

  /**
   * 为给定纹理创建默认纹理
   *
   * 创建一个可以用作占位符的默认纹理，直到实际纹理
   * 准备好使用为止。避免渲染错误和闪烁。
   *
   * @abstract
   * @param {import('../../textures/Texture.js').Texture} texture - 要创建默认纹理的纹理对象
   */
  createDefaultTexture(/*texture*/) {}

  /**
   * 在GPU上为给定纹理对象定义纹理
   *
   * 在GPU上创建纹理资源，分配显存并设置纹理格式、
   * 尺寸等属性。
   *
   * @abstract
   * @param {import('../../textures/Texture.js').Texture} texture - 纹理对象
   * @param {Object} [options={}] - 可选配置参数
   */
  createTexture(/*texture, options={}*/) {}

  /**
   * 将更新的纹理数据上传到GPU
   *
   * 当纹理的图像数据发生变化时，将新数据上传到GPU显存中。
   * 这是一个相对昂贵的操作，应该尽量减少调用频率。
   *
   * @abstract
   * @param {import('../../textures/Texture.js').Texture} texture - 纹理对象
   * @param {Object} [options={}] - 可选配置参数
   */
  updateTexture(/*texture, options = {}*/) {}

  /**
   * 为给定纹理生成mipmap
   *
   * Mipmap是纹理的多级细节层次，用于在不同距离下
   * 提供适当的纹理细节，提高渲染质量和性能。
   *
   * @abstract
   * @param {import('../../textures/Texture.js').Texture} texture - 纹理对象
   */
  generateMipmaps(/*texture*/) {}

  /**
   * 销毁给定纹理对象的GPU数据
   *
   * 释放纹理占用的GPU显存和相关资源，当纹理不再需要时调用。
   *
   * @abstract
   * @param {import('../../textures/Texture.js').Texture} texture - 纹理对象
   */
  destroyTexture(/*texture*/) {}

  /**
   * 将纹理数据作为类型化数组返回
   *
   * 从GPU纹理中读取数据到CPU内存，返回包含像素数据的类型化数组。
   * 这是一个异步操作，因为需要等待GPU完成渲染并传输数据。
   *
   * @abstract
   * @async
   * @param {import('../../textures/Texture.js').Texture} texture - 要复制的纹理
   * @param {number} x - 复制原点的x坐标
   * @param {number} y - 复制原点的y坐标
   * @param {number} width - 复制的宽度
   * @param {number} height - 复制的高度
   * @param {number} faceIndex - 面索引（用于立方体纹理）
   * @return {Promise<TypedArray>} 当复制操作完成时解析为类型化数组的Promise
   */
  async copyTextureToBuffer(/*texture, x, y, width, height, faceIndex*/) {}

  /**
   * 将源纹理的数据复制到目标纹理
   *
   * 在GPU上直接进行纹理到纹理的复制，比通过CPU中转更高效。
   * 常用于后处理效果、纹理生成等场景。
   *
   * @abstract
   * @param {import('../../textures/Texture.js').Texture} srcTexture - 源纹理
   * @param {import('../../textures/Texture.js').Texture} dstTexture - 目标纹理
   * @param {?(import('../../math/Box3.js').Box3|import('../../math/Box2.js').Box2)} [srcRegion=null] - 源纹理的复制区域
   * @param {?(import('../../math/Vector2.js').Vector2|import('../../math/Vector3.js').Vector3)} [dstPosition=null] - 目标位置
   * @param {number} [srcLevel=0] - 源mip级别
   * @param {number} [dstLevel=0] - 目标mip级别
   */
  copyTextureToTexture(/*srcTexture, dstTexture, srcRegion = null, dstPosition = null, srcLevel = 0, dstLevel = 0*/) {}

  /**
   * 将当前绑定的帧缓冲区复制到给定纹理
   *
   * 将当前渲染目标的内容复制到纹理中，常用于实现
   * 屏幕截图、后处理效果等功能。
   *
   * @abstract
   * @param {import('../../textures/Texture.js').Texture} texture - 目标纹理
   * @param {import('./RenderContext.js').default} renderContext - 渲染上下文
   * @param {import('../../math/Vector4.js').Vector4} rectangle - 定义复制原点和尺寸的四维向量
   */
  copyFramebufferToTexture(/*texture, renderContext, rectangle*/) {}

  // ===== 属性管理 =====

  /**
   * 创建着色器属性的GPU缓冲区
   *
   * 为顶点属性创建GPU缓冲区，包括位置、法线、UV坐标等
   * 顶点数据。这些数据将被顶点着色器使用。
   *
   * @abstract
   * @param {import('../../core/BufferAttribute.js').BufferAttribute} attribute - 缓冲区属性
   */
  createAttribute(/*attribute*/) {}

  /**
   * 创建索引着色器属性的GPU缓冲区
   *
   * 为索引数据创建GPU缓冲区，索引定义了顶点的连接关系，
   * 用于构成三角形面片。
   *
   * @abstract
   * @param {import('../../core/BufferAttribute.js').BufferAttribute} attribute - 索引缓冲区属性
   */
  createIndexAttribute(/*attribute*/) {}

  /**
   * 创建存储属性的GPU缓冲区
   *
   * 为存储缓冲区创建GPU缓冲区，存储缓冲区可以被着色器
   * 读写，常用于计算着色器和高级渲染技术。
   *
   * @abstract
   * @param {import('../../core/BufferAttribute.js').BufferAttribute} attribute - 缓冲区属性
   */
  createStorageAttribute(/*attribute*/) {}

  /**
   * 更新着色器属性的GPU缓冲区
   *
   * 当属性数据发生变化时，将新数据上传到GPU缓冲区。
   * 这是一个相对昂贵的操作，应该尽量减少调用频率。
   *
   * @abstract
   * @param {import('../../core/BufferAttribute.js').BufferAttribute} attribute - 要更新的缓冲区属性
   */
  updateAttribute(/*attribute*/) {}

  /**
   * 销毁着色器属性的GPU缓冲区
   *
   * 释放属性占用的GPU显存和相关资源，当属性不再需要时调用。
   *
   * @abstract
   * @param {import('../../core/BufferAttribute.js').BufferAttribute} attribute - 要销毁的缓冲区属性
   */
  destroyAttribute(/*attribute*/) {}

  // ===== 画布和视口管理 =====

  /**
   * 返回后端的渲染上下文
   *
   * 获取底层图形API的渲染上下文，如WebGL上下文或WebGPU设备。
   * 这是与GPU通信的基础接口。
   *
   * @abstract
   * @return {Object} 渲染上下文对象
   */
  getContext() {}

  /**
   * 更新渲染器尺寸
   *
   * 当渲染器尺寸发生变化时，后端可以使用这个方法来执行
   * 必要的逻辑，如重新配置渲染目标、更新投影矩阵等。
   *
   * @abstract
   */
  updateSize() {}

  /**
   * 使用给定渲染上下文的值更新视口
   *
   * 设置GPU的视口区域，定义渲染输出的屏幕区域。
   * 视口变换将标准化设备坐标转换为屏幕坐标。
   *
   * @abstract
   * @param {import('./RenderContext.js').default} renderContext - 渲染上下文
   */
  updateViewport(/*renderContext*/) {}

  // ===== 工具方法 =====

  /**
   * 检查给定的3D对象是否被其他3D对象完全遮挡
   *
   * 使用遮挡查询API来检测对象是否被完全遮挡，这可以用于
   * 遮挡剔除优化，避免渲染不可见的对象。
   *
   * @abstract
   * @param {import('./RenderContext.js').default} renderContext - 渲染上下文
   * @param {import('../../core/Object3D.js').Object3D} object - 要测试的3D对象
   * @return {boolean} 3D对象是否被完全遮挡
   */
  isOccluded(/*renderContext, object*/) {}

  /**
   * 解析给定渲染上下文和类型的时间戳
   *
   * 获取GPU操作的执行时间，用于性能分析和优化。
   * 时间戳查询可以测量渲染和计算操作的实际GPU执行时间。
   *
   * @async
   * @param {string} [type='render'] - 时间戳类型（'render'或'compute'）
   * @return {Promise<number>} 解析为时间戳的Promise
   */
  async resolveTimestampsAsync(type = "render") {
    // 检查是否启用了时间戳跟踪
    if (!this.trackTimestamp) {
      warnOnce("WebGPURenderer: Timestamp tracking is disabled.");
      return;
    }

    // 获取对应类型的查询池
    const queryPool = this.timestampQueryPool[type];
    if (!queryPool) {
      warnOnce(`WebGPURenderer: No timestamp query pool for type '${type}' found.`);
      return;
    }

    // 异步解析查询结果
    const duration = await queryPool.resolveQueriesAsync();

    // 将结果存储到渲染器信息中
    this.renderer.info[type].timestamp = duration;

    return duration;
  }

  /**
   * 同步CPU操作与GPU任务
   *
   * 当调用此方法时，CPU等待GPU完成其操作（如计算任务）。
   * 这用于确保GPU操作完成后再进行后续的CPU操作。
   *
   * @async
   * @abstract
   * @return {Promise} 当同步完成时解析的Promise
   */
  async waitForGPU() {}

  /**
   * 执行回读操作
   *
   * 将存储缓冲区属性的数据从GPU移动到CPU。这是一个异步操作，
   * 因为需要等待GPU完成计算并传输数据。
   *
   * @async
   * @param {import('../../core/StorageBufferAttribute.js').StorageBufferAttribute} attribute - 存储缓冲区属性
   * @return {Promise<ArrayBuffer>} 当数据准备好时解析为缓冲区数据的Promise
   */
  async getArrayBufferAsync(/* attribute */) {}

  /**
   * 异步检查后端是否支持给定特性
   *
   * 检查GPU和驱动程序是否支持特定的渲染特性，如特定的
   * 纹理格式、着色器功能等。异步版本用于需要查询GPU的情况。
   *
   * @async
   * @abstract
   * @param {string} name - 特性名称
   * @return {Promise<boolean>} 解析为布尔值的Promise，指示是否支持该特性
   */
  async hasFeatureAsync(/*name*/) {}

  /**
   * 检查后端是否支持给定特性
   *
   * 同步版本的特性检查，用于可以立即确定的特性支持情况。
   *
   * @abstract
   * @param {string} name - 特性名称
   * @return {boolean} 是否支持该特性
   */
  hasFeature(/*name*/) {}

  /**
   * 返回最大各向异性纹理过滤值
   *
   * 各向异性过滤可以改善倾斜表面上纹理的清晰度，
   * 这个方法返回GPU支持的最大各向异性级别。
   *
   * @abstract
   * @return {number} 最大各向异性纹理过滤值
   */
  getMaxAnisotropy() {}

  /**
   * 返回绘制缓冲区尺寸
   *
   * 获取实际的绘制缓冲区尺寸，可能与画布尺寸不同，
   * 特别是在高DPI显示器上。
   *
   * @return {import('../../math/Vector2.js').Vector2} 绘制缓冲区尺寸
   */
  getDrawingBufferSize() {
    // 重用Vector2实例以减少内存分配
    _vector2 = _vector2 || new Vector2();

    // 从渲染器获取绘制缓冲区尺寸
    return this.renderer.getDrawingBufferSize(_vector2);
  }

  /**
   * 定义裁剪测试
   *
   * 启用或禁用裁剪测试，裁剪测试只渲染指定矩形区域内的像素，
   * 区域外的像素会被丢弃。
   *
   * @abstract
   * @param {boolean} boolean - 是否启用裁剪测试
   */
  setScissorTest(/*boolean*/) {}

  /**
   * 将清除颜色和alpha值返回到单个颜色对象中
   *
   * 获取当前设置的清除颜色，这是在清除帧缓冲区时使用的颜色。
   *
   * @return {import('./Color4.js').default} 清除颜色
   */
  getClearColor() {
    const renderer = this.renderer;

    // 重用Color4实例以减少内存分配
    _color4 = _color4 || new Color4();

    // 从渲染器获取清除颜色
    renderer.getClearColor(_color4);

    // 确保颜色格式正确
    _color4.getRGB(_color4);

    return _color4;
  }

  /**
   * 返回DOM元素
   *
   * 获取渲染器使用的DOM元素。如果不存在DOM元素，
   * 后端会创建一个新的画布元素。
   *
   * @return {HTMLCanvasElement} DOM元素
   */
  getDomElement() {
    let domElement = this.domElement;

    // 如果还没有DOM元素，创建一个
    if (domElement === null) {
      // 使用参数中提供的画布或创建新的画布元素
      domElement = this.parameters.canvas !== undefined ? this.parameters.canvas : createCanvasElement();

      // OffscreenCanvas没有setAttribute方法，参见 #22811
      if ("setAttribute" in domElement) domElement.setAttribute("data-engine", `three.js r${REVISION} webgpu`);

      // 保存DOM元素引用
      this.domElement = domElement;
    }

    return domElement;
  }

  // ===== 数据管理方法 =====

  /**
   * 为给定对象设置字典到内部数据结构中
   *
   * 将对象与其后端特定数据关联起来，使用WeakMap确保
   * 对象被垃圾回收时数据也会被清理。
   *
   * @param {Object} object - 对象
   * @param {Object} value - 要设置的字典
   */
  set(object, value) {
    this.data.set(object, value);
  }

  /**
   * 返回给定对象的字典
   *
   * 获取对象关联的后端特定数据。如果对象还没有关联数据，
   * 会创建一个空的字典对象。
   *
   * @param {Object} object - 对象
   * @return {Object} 对象的字典
   */
  get(object) {
    let map = this.data.get(object);

    // 如果对象还没有关联数据，创建一个空字典
    if (map === undefined) {
      map = {};
      this.data.set(object, map);
    }

    return map;
  }

  /**
   * 检查给定对象是否有已定义的数据字典
   *
   * 检查对象是否已经在后端数据结构中有关联的数据。
   *
   * @param {Object} object - 对象
   * @return {boolean} 给定对象是否已定义字典
   */
  has(object) {
    return this.data.has(object);
  }

  /**
   * 从内部数据结构中删除对象
   *
   * 移除对象及其关联的所有后端特定数据，释放相关资源。
   *
   * @param {Object} object - 要删除的对象
   */
  delete(object) {
    this.data.delete(object);
  }

  /**
   * 释放内部资源
   *
   * 清理后端占用的所有资源，包括GPU资源、内存等。
   * 这个方法应该在后端不再需要时调用。
   *
   * @abstract
   */
  dispose() {}
}

export default Backend;
