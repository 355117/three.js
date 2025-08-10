/**
 * WebGLBackend.js
 *
 * WebGL后端实现 - Three.js渲染器的WebGL 2.0后端
 *
 * 这个文件实现了基于WebGL 2.0的渲染后端，负责：
 * 1. WebGL上下文管理和初始化
 * 2. 渲染状态管理和缓存
 * 3. 着色器程序编译和管理
 * 4. 纹理、缓冲区、VAO等资源管理
 * 5. 渲染命令的执行和优化
 * 6. WebGL扩展和能力检测
 */

// 导入GLSL节点构建器 - 负责将节点材质转换为GLSL代码
import GLSLNodeBuilder from "./nodes/GLSLNodeBuilder.js";
// 导入通用后端基类
import Backend from "../common/Backend.js";
// 导入渲染上下文缓存键生成工具
import { getCacheKey } from "../common/RenderContext.js";

// 导入WebGL工具模块
import WebGLAttributeUtils from "./utils/WebGLAttributeUtils.js"; // 顶点属性工具
import WebGLState from "./utils/WebGLState.js"; // WebGL状态管理
import WebGLUtils from "./utils/WebGLUtils.js"; // 通用WebGL工具
import WebGLTextureUtils from "./utils/WebGLTextureUtils.js"; // 纹理工具
import WebGLExtensions from "./utils/WebGLExtensions.js"; // 扩展管理
import WebGLCapabilities from "./utils/WebGLCapabilities.js"; // 能力检测
import { GLFeatureName } from "./utils/WebGLConstants.js"; // WebGL常量定义
import { WebGLBufferRenderer } from "./WebGLBufferRenderer.js"; // 缓冲区渲染器

// 导入Three.js核心工具
import { warnOnce } from "../../utils.js"; // 警告工具
import { WebGLCoordinateSystem } from "../../constants.js"; // 坐标系常量
import WebGLTimestampQueryPool from "./utils/WebGLTimestampQueryPool.js"; // 时间戳查询池

/**
 * WebGL 2.0后端实现
 *
 * 这是Three.js渲染器的WebGL 2.0后端实现，提供了完整的WebGL渲染管线支持。
 * 相比WebGL 1.0，WebGL 2.0提供了更多现代图形功能：
 *
 * 主要特性：
 * - 基于OpenGL ES 3.0的现代渲染管线
 * - 支持多重渲染目标(MRT)
 * - 支持变换反馈(Transform Feedback)
 * - 支持统一缓冲对象(UBO)
 * - 支持3D纹理和纹理数组
 * - 支持实例化渲染
 * - 支持遮挡查询和时间戳查询
 * - 更强大的着色器功能(GLSL ES 3.00)
 *
 * @private
 * @augments Backend
 */
class WebGLBackend extends Backend {
  /**
   * WebGL后端配置选项
   *
   * @typedef {Object} WebGLBackend~Options
   * @property {boolean} [logarithmicDepthBuffer=false] - 是否启用对数深度缓冲区，用于处理大范围深度值
   * @property {boolean} [alpha=true] - 默认帧缓冲区（画布最终内容）是否应该透明
   * @property {boolean} [depth=true] - 默认帧缓冲区是否应该有深度缓冲区
   * @property {boolean} [stencil=false] - 默认帧缓冲区是否应该有模板缓冲区
   * @property {boolean} [antialias=false] - 是否启用MSAA作为默认抗锯齿
   * @property {number} [samples=0] - 当antialias为true时，默认使用4个采样。设置为其他值可覆盖默认设置
   * @property {boolean} [forceWebGL=false] - 如果设置为true，无论是否支持WebGPU都强制使用WebGL 2后端
   * @property {WebGL2RenderingContext} [context=undefined] - 预先创建的WebGL 2渲染上下文
   */

  /**
   * 构造一个新的WebGL后端实例
   *
   * 初始化WebGL后端的所有核心组件和工具模块，包括状态管理、
   * 扩展检测、能力查询、纹理工具等。
   *
   * @param {WebGLBackend~Options} [parameters] - 配置参数
   */
  constructor(parameters = {}) {
    // 调用父类Backend的构造函数，传递配置参数
    super(parameters);

    /**
     * WebGL后端类型标识符
     *
     * 用于运行时类型检测，标识这是一个WebGL后端实例。
     * 在多后端环境中用于区分不同的渲染后端类型。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isWebGLBackend = true; // 设置类型标识为true

    /**
     * 顶点属性工具模块引用
     *
     * 管理WebGL顶点属性相关的操作，包括：
     * - 顶点属性绑定和配置
     * - 顶点数组对象(VAO)管理
     * - 属性指针设置和优化
     *
     * @type {?WebGLAttributeUtils}
     * @default null
     */
    this.attributeUtils = null; // 初始化为null，将在init()方法中创建实例

    /**
     * WebGL扩展管理模块引用
     *
     * 负责WebGL扩展的检测、启用和管理，包括：
     * - 扩展可用性检测
     * - 扩展功能启用
     * - 扩展相关常量和方法访问
     *
     * @type {?WebGLExtensions}
     * @default null
     */
    this.extensions = null; // 初始化为null，将在init()方法中创建实例

    /**
     * WebGL能力检测模块引用
     *
     * 检测和报告WebGL实现的各种能力和限制，包括：
     * - 最大纹理尺寸和数量
     * - 着色器限制
     * - 渲染目标支持
     * - 精度支持等
     *
     * @type {?WebGLCapabilities}
     * @default null
     */
    this.capabilities = null; // 初始化为null，将在init()方法中创建实例

    /**
     * 纹理工具模块引用
     *
     * 处理WebGL纹理相关的所有操作，包括：
     * - 纹理创建和配置
     * - 纹理格式转换
     * - 纹理上传和更新
     * - 纹理状态管理
     *
     * @type {?WebGLTextureUtils}
     * @default null
     */
    this.textureUtils = null; // 初始化为null，将在init()方法中创建实例

    /**
     * 缓冲区渲染器模块引用
     *
     * 负责WebGL缓冲区渲染相关的操作，包括：
     * - 顶点缓冲区管理
     * - 索引缓冲区管理
     * - 绘制调用执行
     * - 实例化渲染支持
     *
     * @type {?WebGLBufferRenderer}
     * @default null
     */
    this.bufferRenderer = null; // 初始化为null，将在init()方法中创建实例

    /**
     * WebGL 2.0渲染上下文引用
     *
     * 核心的WebGL 2.0渲染上下文，所有WebGL API调用都通过这个对象进行。
     * 提供了完整的WebGL 2.0功能访问。
     *
     * @type {?WebGL2RenderingContext}
     * @default null
     */
    this.gl = null; // 初始化为null，将在init()方法中设置为实际的WebGL上下文

    /**
     * WebGL状态管理模块引用
     *
     * 管理WebGL渲染状态的设置和缓存，包括：
     * - 混合状态
     * - 深度测试状态
     * - 模板测试状态
     * - 面剔除状态
     * - 视口设置等
     *
     * @type {?WebGLState}
     * @default null
     */
    this.state = null; // 初始化为null，将在init()方法中创建实例

    /**
     * 通用WebGL工具模块引用
     *
     * 提供各种WebGL相关的通用工具函数，包括：
     * - 类型转换
     * - 常量映射
     * - 错误检查
     * - 性能优化工具
     *
     * @type {?WebGLUtils}
     * @default null
     */
    this.utils = null; // 初始化为null，将在init()方法中创建实例

    /**
     * 顶点数组对象(VAO)缓存
     *
     * 缓存已创建的VAO对象，避免重复创建相同配置的VAO。
     * 键为几何体和材质的组合哈希，值为对应的WebGL VAO对象。
     *
     * @type {Object<string,WebGLVertexArrayObject>}
     */
    this.vaoCache = {}; // 初始化为空对象，用于存储VAO缓存

    /**
     * 变换反馈对象缓存
     *
     * 缓存变换反馈对象，用于顶点着色器输出捕获。
     * 主要用于计算着色器模拟和粒子系统等高级渲染技术。
     *
     * @type {Object<string,WebGLTransformFeedback>}
     */
    this.transformFeedbackCache = {}; // 初始化为空对象，用于存储变换反馈缓存

    /**
     * 光栅化丢弃控制标志
     *
     * 控制是否启用gl.RASTERIZER_DISCARD状态。
     * 当启用时，顶点着色器的输出不会进入光栅化阶段，
     * 主要用于计算着色器或变换反馈操作。
     *
     * @type {boolean}
     * @default false
     */
    this.discard = false; // 初始化为false，表示默认不丢弃光栅化

    /**
     * 时间戳查询扩展引用
     *
     * EXT_disjoint_timer_query_webgl2扩展的引用，用于GPU时间测量。
     * 如果设备不支持该扩展则为null。主要用于性能分析和优化。
     *
     * @type {?EXTDisjointTimerQueryWebGL2}
     * @default null
     */
    this.disjoint = null; // 初始化为null，将在init()方法中检测并设置

    /**
     * 并行着色器编译扩展引用
     *
     * KHR_parallel_shader_compile扩展的引用，允许着色器在后台异步编译。
     * 如果设备不支持该扩展则为null。可以显著提高着色器编译性能。
     *
     * @type {?KHRParallelShaderCompile}
     * @default null
     */
    this.parallel = null; // 初始化为null，将在init()方法中检测并设置

    /**
     * 当前渲染上下文引用
     *
     * 保存当前正在使用的渲染上下文，包含渲染状态、目标、
     * 材质等信息。用于渲染状态管理和优化。
     *
     * @private
     * @type {RenderContext}
     * @default null
     */
    this._currentContext = null; // 初始化为null，在渲染过程中动态设置

    /**
     * 已知绑定集合
     *
     * 使用WeakSet存储已知的绑定组合，用于避免重复设置相同的绑定。
     * WeakSet确保不会阻止绑定对象的垃圾回收。
     *
     * @private
     * @type {WeakSet<Array<BindGroup>>}
     */
    this._knownBindings = new WeakSet(); // 创建WeakSet实例用于绑定缓存

    /**
     * 帧缓冲区失效支持标志
     *
     * 检测设备是否支持帧缓冲区失效操作。某些设备（如Oculus浏览器）
     * 支持这个优化，可以提高渲染性能。
     *
     * @private
     * @type {boolean}
     */
    // 检测是否为Oculus浏览器，如果是则支持帧缓冲区失效
    this._supportsInvalidateFramebuffer = typeof navigator === "undefined" ? false : /OculusBrowser/g.test(navigator.userAgent);

    /**
     * WebXR目标帧缓冲区
     *
     * 当使用WebXR设备API进行渲染时的目标帧缓冲区。
     * 用于VR/AR渲染的特殊帧缓冲区管理。
     *
     * @private
     * @type {WebGLFramebuffer}
     * @default null
     */
    this._xrFramebuffer = null; // 初始化为null，在XR渲染时设置
  }

  /**
   * 初始化WebGL后端，使其准备好供使用
   *
   * 这个方法执行WebGL后端的完整初始化过程，包括：
   * 1. 创建或获取WebGL 2.0上下文
   * 2. 设置上下文丢失处理
   * 3. 初始化所有工具模块
   * 4. 检测和启用WebGL扩展
   * 5. 设置默认状态
   *
   * @param {Renderer} renderer - Three.js渲染器实例
   */
  init(renderer) {
    // 调用父类Backend的初始化方法，设置基础配置
    super.init(renderer);

    // 获取构造函数传入的参数对象
    const parameters = this.parameters;

    // 配置WebGL上下文创建属性
    const contextAttributes = {
      antialias: renderer.samples > 0, // 根据渲染器的采样数决定是否启用多重采样抗锯齿
      alpha: true, // 始终启用alpha通道，用于透明度和混合操作
      depth: renderer.depth, // 根据渲染器设置决定是否创建深度缓冲区
      stencil: renderer.stencil, // 根据渲染器设置决定是否创建模板缓冲区
    };

    // 获取或创建WebGL 2.0渲染上下文
    // 如果参数中提供了现有上下文则使用它，否则从canvas元素创建新的上下文
    const glContext = parameters.context !== undefined ? parameters.context : renderer.domElement.getContext("webgl2", contextAttributes);

    /**
     * WebGL上下文丢失事件处理器
     *
     * 当WebGL上下文丢失时（如GPU重置、驱动崩溃等），
     * 这个处理器会通知渲染器并提供错误信息。
     */
    function onContextLost(event) {
      event.preventDefault(); // 阻止浏览器的默认上下文丢失处理行为

      // 构建包含详细信息的上下文丢失信息对象
      const contextLossInfo = {
        api: "WebGL", // 标识使用的图形API类型
        message: event.statusMessage || "Unknown reason", // 获取错误消息或使用默认消息
        reason: null, // 丢失原因（WebGL事件中通常为null）
        originalEvent: event, // 保存原始事件对象以供进一步分析
      };

      // 通知Three.js渲染器发生了设备丢失事件
      renderer.onDeviceLost(contextLossInfo);
    }

    // 保存事件处理器函数引用，以便在dispose()方法中移除监听器
    this._onContextLost = onContextLost;

    // 在canvas元素上注册WebGL上下文丢失事件监听器
    renderer.domElement.addEventListener("webglcontextlost", onContextLost, false);

    // 将获取到的WebGL上下文保存到实例属性中
    this.gl = glContext;

    // 初始化所有WebGL工具模块，传入当前后端实例作为参数
    this.extensions = new WebGLExtensions(this); // 创建扩展管理器实例
    this.capabilities = new WebGLCapabilities(this); // 创建能力检测器实例
    this.attributeUtils = new WebGLAttributeUtils(this); // 创建顶点属性工具实例
    this.textureUtils = new WebGLTextureUtils(this); // 创建纹理工具实例
    this.bufferRenderer = new WebGLBufferRenderer(this); // 创建缓冲区渲染器实例

    this.state = new WebGLState(this); // 创建WebGL状态管理器实例
    this.utils = new WebGLUtils(this); // 创建通用工具实例

    // 尝试启用常用的WebGL扩展，如果设备支持则启用，不支持则忽略
    this.extensions.get("EXT_color_buffer_float"); // 启用浮点数颜色缓冲区支持
    this.extensions.get("WEBGL_clip_cull_distance"); // 启用剪裁距离功能
    this.extensions.get("OES_texture_float_linear"); // 启用浮点纹理的线性过滤
    this.extensions.get("EXT_color_buffer_half_float"); // 启用半精度浮点颜色缓冲区
    this.extensions.get("WEBGL_multisampled_render_to_texture"); // 启用多采样渲染到纹理
    this.extensions.get("WEBGL_render_shared_exponent"); // 启用共享指数渲染格式
    this.extensions.get("WEBGL_multi_draw"); // 启用多重绘制调用
    this.extensions.get("OVR_multiview2"); // 启用多视图渲染（VR/AR）

    // 获取特殊扩展的引用并保存到实例属性中
    this.disjoint = this.extensions.get("EXT_disjoint_timer_query_webgl2"); // 获取时间戳查询扩展
    this.parallel = this.extensions.get("KHR_parallel_shader_compile"); // 获取并行着色器编译扩展
  }

  /**
   * 后端使用的坐标系统
   *
   * WebGL使用右手坐标系，其中：
   * - X轴向右为正
   * - Y轴向上为正
   * - Z轴向外（朝向观察者）为正
   * 这与OpenGL保持一致。
   *
   * @type {number}
   * @readonly
   */
  get coordinateSystem() {
    return WebGLCoordinateSystem;
  }

  /**
   * 执行缓冲区数据回读操作
   *
   * 将存储缓冲区属性的数据从GPU传输到CPU。这是一个异步操作，
   * 因为GPU到CPU的数据传输需要时间，特别是对于大型缓冲区。
   * 主要用于计算着色器结果的读取和调试。
   *
   * @async
   * @param {StorageBufferAttribute} attribute - 存储缓冲区属性
   * @return {Promise<ArrayBuffer>} 当数据准备好时解析为缓冲区数据的Promise
   */
  async getArrayBufferAsync(attribute) {
    return await this.attributeUtils.getArrayBufferAsync(attribute);
  }

  /**
   * 同步CPU和GPU操作
   *
   * 用于同步CPU操作与GPU任务。调用此方法时，CPU会等待GPU完成
   * 其操作（例如计算任务）。这对于确保GPU计算完成后再进行
   * 后续操作非常重要。
   *
   * @async
   * @return {Promise} 同步完成时解析的Promise
   */
  async waitForGPU() {
    await this.utils._clientWaitAsync();
  }

  /**
   * 确保后端与XR兼容
   *
   * 检查并配置WebGL上下文以支持WebXR。如果当前上下文不兼容XR，
   * 会尝试使其兼容。这是使用WebXR功能的前提条件。
   *
   * @async
   * @return {Promise} 当渲染器XR兼容时解析的Promise
   */
  async makeXRCompatible() {
    const attributes = this.gl.getContextAttributes();

    // 如果上下文还不兼容XR，则使其兼容
    if (attributes.xrCompatible !== true) {
      await this.gl.makeXRCompatible();
    }
  }

  /**
   * 设置XR渲染目标
   *
   * 指定用于XR渲染的帧缓冲区。XR渲染通常需要特殊的帧缓冲区
   * 配置以支持立体渲染和特定的纹理格式。
   *
   * @param {WebGLFramebuffer} xrFramebuffer - XR帧缓冲区
   */
  setXRTarget(xrFramebuffer) {
    this._xrFramebuffer = xrFramebuffer;
  }

  /**
   * 使用外部纹理配置XR渲染目标
   *
   * 当使用WebXR Layers API时，需要将外部提供的纹理（通常由XR运行时创建）
   * 关联到Three.js的渲染目标。这允许直接渲染到XR设备的显示缓冲区。
   *
   * @param {XRRenderTarget} renderTarget - XR渲染目标
   * @param {WebGLTexture} colorTexture - 原生颜色纹理
   * @param {?WebGLTexture} [depthTexture=null] - 原生深度纹理（可选）
   */
  setXRRenderTargetTextures(renderTarget, colorTexture, depthTexture = null) {
    const gl = this.gl;

    // 设置颜色纹理，使用RGBA8格式（参见#24698了解为什么使用RGBA8而不是SRGB8_ALPHA8）
    this.set(renderTarget.texture, { textureGPU: colorTexture, glInternalFormat: gl.RGBA8 });

    if (depthTexture !== null) {
      // 根据是否需要模板缓冲区选择深度纹理格式
      const glInternalFormat = renderTarget.stencilBuffer ? gl.DEPTH24_STENCIL8 : gl.DEPTH_COMPONENT24;

      this.set(renderTarget.depthTexture, { textureGPU: depthTexture, glInternalFormat: glInternalFormat });

      // 多采样渲染到纹理扩展在有中途刷新和外部深度纹理时无法正常工作
      if (this.extensions.has("WEBGL_multisampled_render_to_texture") === true && renderTarget._autoAllocateDepthBuffer === true && renderTarget.multiview === false) {
        console.warn("THREE.WebGLBackend: Render-to-texture extension was disabled because an external texture was provided");
      }

      // 禁用自动深度缓冲区分配，因为使用外部纹理
      renderTarget._autoAllocateDepthBuffer = false;
    }
  }

  /**
   * 为给定渲染上下文初始化时间戳查询
   *
   * 时间戳查询用于测量GPU操作的执行时间，对性能分析和优化很有用。
   * 需要EXT_disjoint_timer_query_webgl2扩展支持。
   *
   * @param {RenderContext} renderContext - 渲染上下文
   */
  initTimestampQuery(renderContext) {
    // 检查前提条件：是否支持时间戳查询扩展和是否启用时间跟踪
    if (!this.disjoint || !this.trackTimestamp) return; // 如果不支持或未启用，直接返回

    // 根据渲染上下文类型确定使用哪个查询池
    const type = renderContext.isComputeNode ? "compute" : "render"; // 计算节点使用compute池，渲染节点使用render池

    // 如果对应类型的查询池不存在，则创建新的查询池
    if (!this.timestampQueryPool[type]) {
      // TODO: 可变的最大查询数？目前固定为2048个查询对象
      this.timestampQueryPool[type] = new WebGLTimestampQueryPool(this.gl, type, 2048);
    }

    // 获取对应类型的时间戳查询池
    const timestampQueryPool = this.timestampQueryPool[type];

    // 为当前渲染上下文分配查询对象，返回基础偏移量
    const baseOffset = timestampQueryPool.allocateQueriesForContext(renderContext);

    // 如果成功分配了查询对象，开始时间戳查询
    if (baseOffset !== null) {
      // 开始时间戳查询：记录GPU操作的开始时间
      timestampQueryPool.beginQuery(renderContext);
    }
  }

  // ===== 时间戳工具方法 =====

  /**
   * 准备时间戳缓冲区
   *
   * 结束当前渲染上下文的时间戳查询。时间戳查询用于测量GPU操作的执行时间，
   * 对性能分析和优化非常有用。这个方法在渲染完成后调用。
   *
   * @param {RenderContext} renderContext - 渲染上下文
   */
  prepareTimestampBuffer(renderContext) {
    // 检查是否支持时间戳查询和是否启用时间跟踪
    if (!this.disjoint || !this.trackTimestamp) return;

    // 根据上下文类型获取对应的时间戳查询池
    const type = renderContext.isComputeNode ? "compute" : "render";
    const timestampQueryPool = this.timestampQueryPool[type];

    // 结束时间戳查询
    timestampQueryPool.endQuery(renderContext);
  }

  /**
   * 返回后端的渲染上下文
   *
   * 提供对底层WebGL 2.0渲染上下文的直接访问。
   * 这允许高级用户直接调用WebGL API。
   *
   * @return {WebGL2RenderingContext} WebGL 2.0渲染上下文
   */
  getContext() {
    return this.gl;
  }

  /**
   * 开始渲染调用
   *
   * 在渲染调用开始时执行，为即将到来的渲染调用准备WebGL状态。
   * 这个方法负责：
   * 1. 设置视口和裁剪区域
   * 2. 初始化时间戳查询
   * 3. 设置帧缓冲区
   * 4. 清除缓冲区
   * 5. 准备遮挡查询
   *
   * @param {RenderContext} renderContext - 渲染上下文，包含渲染配置信息
   */
  beginRender(renderContext) {
    // 获取WebGL状态管理器的引用，用于设置各种渲染状态
    const { state } = this;
    // 获取与当前渲染上下文关联的数据对象，用于存储渲染相关信息
    const renderContextData = this.get(renderContext);

    // 设置视口：定义渲染输出的屏幕区域
    if (renderContext.viewport) {
      // 如果渲染上下文指定了自定义视口，则使用它
      this.updateViewport(renderContext);
    } else {
      // 如果没有指定视口，则使用整个绘制缓冲区作为视口
      const { width, height } = this.getDrawingBufferSize(); // 获取画布的实际绘制尺寸
      state.viewport(0, 0, width, height); // 设置视口从(0,0)开始，覆盖整个画布
    }

    // 设置裁剪区域：只渲染指定矩形区域内的像素
    if (renderContext.scissor) {
      // 从渲染上下文获取裁剪矩形的参数
      const { x, y, width, height } = renderContext.scissorValue;
      // 注意：WebGL的Y坐标系原点在左下角，Three.js的Y坐标系原点在左上角，需要转换
      state.scissor(x, renderContext.height - height - y, width, height);
    }

    // 初始化时间戳查询，用于测量GPU渲染操作的执行时间
    this.initTimestampQuery(renderContext);

    // 保存当前渲染上下文的引用，以便在finishRender中恢复
    renderContextData.previousContext = this._currentContext;
    // 设置新的当前渲染上下文
    this._currentContext = renderContext;

    // 设置目标帧缓冲区，确定渲染输出的目标
    this._setFramebuffer(renderContext);

    // 清除指定的缓冲区内容，为新的渲染做准备
    // 参数：颜色清除标志、深度清除标志、模板清除标志、渲染上下文、是否设置帧缓冲区
    this.clear(renderContext.clearColor, renderContext.clearDepth, renderContext.clearStencil, renderContext, false);

    // 准备遮挡查询：获取需要进行遮挡测试的对象数量
    const occlusionQueryCount = renderContext.occlusionQueryCount;

    // 如果需要进行遮挡查询测试
    if (occlusionQueryCount > 0) {
      // 保存当前的查询对象数组引用，防止在异步查询结果读取过程中被其他渲染通道修改
      // 这是必要的，因为遮挡查询结果的读取是异步的，可能跨越多个渲染帧
      renderContextData.currentOcclusionQueries = renderContextData.occlusionQueries;
      renderContextData.currentOcclusionQueryObjects = renderContextData.occlusionQueryObjects;

      // 重置遮挡查询状态，为新的渲染通道做准备
      renderContextData.lastOcclusionObject = null; // 清除上一个遮挡查询对象的引用
      renderContextData.occlusionQueries = new Array(occlusionQueryCount); // 创建新的查询对象数组
      renderContextData.occlusionQueryObjects = new Array(occlusionQueryCount); // 创建新的查询目标对象数组
      renderContextData.occlusionQueryIndex = 0; // 重置查询索引计数器
    }
  }

  /**
   * 完成渲染调用
   *
   * 在渲染调用结束时执行，完成绘制调用后的收尾工作。
   * 这个方法负责：
   * 1. 重置顶点状态
   * 2. 完成遮挡查询
   * 3. 生成mipmap
   * 4. 处理多采样解析
   * 5. 恢复之前的渲染上下文
   *
   * @param {RenderContext} renderContext - 渲染上下文
   */
  finishRender(renderContext) {
    const { gl, state } = this;
    const renderContextData = this.get(renderContext);
    const previousContext = renderContextData.previousContext;

    // 重置顶点状态，清理VAO绑定等
    state.resetVertexState();

    // 处理遮挡查询
    const occlusionQueryCount = renderContext.occlusionQueryCount;

    if (occlusionQueryCount > 0) {
      // 如果还有未结束的查询，结束它
      if (occlusionQueryCount > renderContextData.occlusionQueryIndex) {
        gl.endQuery(gl.ANY_SAMPLES_PASSED);
      }

      // 异步解析遮挡查询结果
      this.resolveOccludedAsync(renderContext);
    }

    // 处理纹理mipmap生成
    const textures = renderContext.textures;

    if (textures !== null) {
      for (let i = 0; i < textures.length; i++) {
        const texture = textures[i];

        // 如果纹理需要生成mipmap，则生成
        if (texture.generateMipmaps) {
          this.generateMipmaps(texture);
        }
      }
    }

    // 恢复之前的渲染上下文
    this._currentContext = previousContext;
    const renderTarget = renderContext.renderTarget;

    // 处理多采样渲染目标的解析
    if (renderContext.textures !== null && renderTarget) {
      const renderTargetContextData = this.get(renderTarget);

      // 如果使用多采样但不使用多采样扩展，需要手动解析
      if (renderTarget.samples > 0 && this._useMultisampledExtension(renderTarget) === false) {
        const fb = renderTargetContextData.framebuffers[renderContext.getCacheKey()];

        // 确定需要解析的缓冲区类型
        let mask = gl.COLOR_BUFFER_BIT; // 总是解析颜色缓冲区

        if (renderTarget.resolveDepthBuffer) {
          if (renderTarget.depthBuffer) mask |= gl.DEPTH_BUFFER_BIT;
          if (renderTarget.stencilBuffer && renderTarget.resolveStencilBuffer) mask |= gl.STENCIL_BUFFER_BIT;
        }

        const msaaFrameBuffer = renderTargetContextData.msaaFrameBuffer;
        const msaaRenderbuffers = renderTargetContextData.msaaRenderbuffers;

        const textures = renderContext.textures;
        const isMRT = textures.length > 1;

        state.bindFramebuffer(gl.READ_FRAMEBUFFER, msaaFrameBuffer);
        state.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb);

        if (isMRT) {
          // blitFramebuffer() can only copy/resolve the first color attachment of a framebuffer. When using MRT,
          // the engine temporarily removes all attachments and then configures each attachment for the resolve.

          for (let i = 0; i < textures.length; i++) {
            gl.framebufferRenderbuffer(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.RENDERBUFFER, null);
            gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, null, 0);
          }
        }

        for (let i = 0; i < textures.length; i++) {
          if (isMRT) {
            // configure attachment for resolve

            const { textureGPU } = this.get(textures[i]);

            gl.framebufferRenderbuffer(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msaaRenderbuffers[i]);
            gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textureGPU, 0);
          }

          if (renderContext.scissor) {
            const { x, y, width, height } = renderContext.scissorValue;

            const viewY = renderContext.height - height - y;

            gl.blitFramebuffer(x, viewY, x + width, viewY + height, x, viewY, x + width, viewY + height, mask, gl.NEAREST);
          } else {
            gl.blitFramebuffer(0, 0, renderContext.width, renderContext.height, 0, 0, renderContext.width, renderContext.height, mask, gl.NEAREST);
          }
        }

        if (isMRT) {
          // restore attachments

          for (let i = 0; i < textures.length; i++) {
            const { textureGPU } = this.get(textures[i]);

            gl.framebufferRenderbuffer(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.RENDERBUFFER, msaaRenderbuffers[i]);
            gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, textureGPU, 0);
          }
        }

        if (this._supportsInvalidateFramebuffer === true) {
          gl.invalidateFramebuffer(gl.READ_FRAMEBUFFER, renderTargetContextData.invalidationArray);
        }
      } else if (renderTarget.resolveDepthBuffer === false && renderTargetContextData.framebuffers) {
        const fb = renderTargetContextData.framebuffers[renderContext.getCacheKey()];
        state.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb);
        gl.invalidateFramebuffer(gl.DRAW_FRAMEBUFFER, renderTargetContextData.depthInvalidationArray);
      }
    }

    if (previousContext !== null) {
      this._setFramebuffer(previousContext);

      if (previousContext.viewport) {
        this.updateViewport(previousContext);
      } else {
        const { width, height } = this.getDrawingBufferSize();
        state.viewport(0, 0, width, height);
      }
    }

    this.prepareTimestampBuffer(renderContext);
  }

  /**
   * 异步处理遮挡查询结果并将其写入渲染上下文数据
   *
   * 遮挡查询是一种GPU加速的可见性测试技术，用于确定对象是否被其他几何体遮挡。
   * 这个方法异步处理查询结果，避免阻塞渲染管线。查询结果用于优化渲染性能，
   * 跳过被完全遮挡的对象的渲染。
   *
   * @async
   * @param {RenderContext} renderContext - 包含遮挡查询信息的渲染上下文
   */
  resolveOccludedAsync(renderContext) {
    const renderContextData = this.get(renderContext);

    // 处理遮挡查询结果
    const { currentOcclusionQueries, currentOcclusionQueryObjects } = renderContextData;

    if (currentOcclusionQueries && currentOcclusionQueryObjects) {
      const occluded = new WeakSet();
      const { gl } = this;

      renderContextData.currentOcclusionQueryObjects = null;
      renderContextData.currentOcclusionQueries = null;

      const check = () => {
        let completed = 0;

        // check all queries and requeue as appropriate
        for (let i = 0; i < currentOcclusionQueries.length; i++) {
          const query = currentOcclusionQueries[i];

          if (query === null) continue;

          if (gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
            if (gl.getQueryParameter(query, gl.QUERY_RESULT) === 0) occluded.add(currentOcclusionQueryObjects[i]);

            currentOcclusionQueries[i] = null;
            gl.deleteQuery(query);

            completed++;
          }
        }

        if (completed < currentOcclusionQueries.length) {
          requestAnimationFrame(check);
        } else {
          renderContextData.occluded = occluded;
        }
      };

      check();
    }
  }

  /**
   * 检查给定的3D对象是否被场景中其他3D对象完全遮挡
   *
   * 遮挡查询是一种GPU加速的可见性测试技术，用于确定对象是否被其他几何体遮挡。
   * 这对于性能优化很有用，可以跳过被遮挡对象的渲染。
   *
   * @param {RenderContext} renderContext - 渲染上下文
   * @param {Object3D} object - 要测试的3D对象
   * @return {boolean} 3D对象是否被完全遮挡
   */
  isOccluded(renderContext, object) {
    const renderContextData = this.get(renderContext);

    // 检查对象是否在遮挡集合中
    return renderContextData.occluded && renderContextData.occluded.has(object);
  }

  /**
   * 使用给定渲染上下文的值更新视口
   *
   * 设置WebGL视口，定义渲染输出的屏幕区域。注意WebGL的Y坐标系
   * 与Three.js相反，需要进行坐标转换。
   *
   * @param {RenderContext} renderContext - 包含视口信息的渲染上下文
   */
  updateViewport(renderContext) {
    const { state } = this;
    const { x, y, width, height } = renderContext.viewportValue;

    // 转换Y坐标系：WebGL的Y轴向上，Three.js的Y轴向下
    state.viewport(x, renderContext.height - height - y, width, height);
  }

  /**
   * 定义裁剪测试
   *
   * 裁剪测试允许只渲染屏幕特定矩形区域内的像素，
   * 区域外的像素会被丢弃。这对于UI渲染和局部更新很有用。
   *
   * @param {boolean} boolean - 是否启用裁剪测试
   */
  setScissorTest(boolean) {
    const state = this.state;

    state.setScissorTest(boolean);
  }

  /**
   * 返回清除颜色和alpha值组合的颜色对象
   *
   * 获取用于清除颜色缓冲区的颜色值。由于画布总是以alpha: true创建，
   * WebGL必须对清除颜色进行预乘alpha处理，以确保正确的混合效果。
   *
   * @return {Color4} 预乘alpha处理后的清除颜色
   */
  getClearColor() {
    const clearColor = super.getClearColor();

    // 由于画布总是以alpha: true创建，WebGL必须对清除颜色进行预乘alpha处理
    clearColor.r *= clearColor.a;
    clearColor.g *= clearColor.a;
    clearColor.b *= clearColor.a;

    return clearColor;
  }

  /**
   * 执行清除操作
   *
   * 清除指定的缓冲区（颜色、深度、模板）。支持两种清除模式：
   * 1. 默认帧缓冲区清除：使用gl.clear()一次性清除所有缓冲区
   * 2. 多重渲染目标清除：使用gl.clearBuffer*()分别清除各个缓冲区
   *
   * 这个方法处理了WebGL的预乘alpha和多重渲染目标的特殊情况。
   *
   * @param {boolean} color - 是否清除颜色缓冲区
   * @param {boolean} depth - 是否清除深度缓冲区
   * @param {boolean} stencil - 是否清除模板缓冲区
   * @param {?Object} [descriptor=null] - 当前设置的渲染目标的渲染上下文
   * @param {boolean} [setFrameBuffer=true] - 是否设置帧缓冲区
   */
  clear(color, depth, stencil, descriptor = null, setFrameBuffer = true) {
    const { gl, renderer } = this;

    // 如果没有提供描述符，创建默认描述符
    if (descriptor === null) {
      const clearColor = this.getClearColor();

      descriptor = {
        textures: null, // null表示清除默认帧缓冲区
        clearColorValue: clearColor,
      };
    }

    // 构建清除掩码：使用位运算组合需要清除的缓冲区类型
    let clear = 0; // 初始化清除掩码为0

    if (color) clear |= gl.COLOR_BUFFER_BIT; // 如果需要清除颜色，添加颜色缓冲区位标志
    if (depth) clear |= gl.DEPTH_BUFFER_BIT; // 如果需要清除深度，添加深度缓冲区位标志
    if (stencil) clear |= gl.STENCIL_BUFFER_BIT; // 如果需要清除模板，添加模板缓冲区位标志

    // 只有当至少需要清除一种缓冲区时才执行清除操作
    if (clear !== 0) {
      // 确定要使用的清除颜色值
      let clearColor;

      if (descriptor.clearColorValue) {
        // 如果描述符中指定了清除颜色，则使用它
        clearColor = descriptor.clearColorValue;
      } else {
        // 否则使用渲染器的默认清除颜色（包含预乘alpha处理）
        clearColor = this.getClearColor();
      }

      // 从渲染器获取深度和模板的清除值
      const clearDepth = renderer.getClearDepth(); // 获取深度清除值（通常为1.0）
      const clearStencil = renderer.getClearStencil(); // 获取模板清除值（通常为0）

      // 确保深度写入掩码启用，否则无法清除深度缓冲区
      if (depth) this.state.setDepthMask(true);

      if (descriptor.textures === null) {
        // 默认帧缓冲区清除：渲染到屏幕时使用传统的gl.clear()方法
        gl.clearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a); // 设置清除颜色
        gl.clear(clear); // 执行清除操作，使用之前构建的清除掩码
      } else {
        // 多重渲染目标清除：渲染到纹理时使用gl.clearBuffer*()方法分别清除各个附件
        if (setFrameBuffer) this._setFramebuffer(descriptor); // 如果需要，设置目标帧缓冲区

        if (color) {
          // 逐个清除每个颜色附件（支持多重渲染目标）
          for (let i = 0; i < descriptor.textures.length; i++) {
            if (i === 0) {
              // 第一个颜色附件使用指定的清除颜色
              gl.clearBufferfv(gl.COLOR, i, [clearColor.r, clearColor.g, clearColor.b, clearColor.a]);
            } else {
              // 其他颜色附件使用默认颜色（黑色，完全不透明）
              gl.clearBufferfv(gl.COLOR, i, [0, 0, 0, 1]);
            }
          }
        }

        // 清除深度和模板缓冲区
        if (depth && stencil) {
          // 同时清除深度和模板
          gl.clearBufferfi(gl.DEPTH_STENCIL, 0, clearDepth, clearStencil);
        } else if (depth) {
          // 只清除深度
          gl.clearBufferfv(gl.DEPTH, 0, [clearDepth]);
        } else if (stencil) {
          // 只清除模板
          gl.clearBufferiv(gl.STENCIL, 0, [clearStencil]);
        }
      }
    }
  }

  /**
   * 在计算调用开始时执行，为即将到来的计算任务准备状态
   *
   * 由于WebGL没有真正的计算着色器，这个方法准备使用变换反馈来模拟计算。
   * 主要工作包括：
   * 1. 解绑帧缓冲区（计算不需要渲染到屏幕）
   * 2. 初始化时间戳查询（用于性能测量）
   *
   * @param {Node|Array<Node>} computeGroup - 计算节点或计算节点数组
   */
  beginCompute(computeGroup) {
    const { state, gl } = this;

    // 解绑帧缓冲区，因为计算操作不需要渲染到屏幕
    state.bindFramebuffer(gl.FRAMEBUFFER, null);

    // 初始化时间戳查询以测量计算性能
    this.initTimestampQuery(computeGroup);
  }

  /**
   * 为给定的计算节点执行计算命令
   *
   * 在WebGL中，由于没有真正的计算着色器支持，这个方法使用变换反馈(Transform Feedback)
   * 来模拟计算着色器的功能。通过在顶点着色器中执行计算并将结果输出到缓冲区来实现。
   *
   * 工作流程：
   * 1. 启用光栅化丢弃以跳过片段处理
   * 2. 设置顶点数组对象(VAO)
   * 3. 绑定着色器程序和uniform
   * 4. 配置变换反馈
   * 5. 执行绘制调用（实际是计算调用）
   * 6. 切换双缓冲区
   *
   * @param {Node|Array<Node>} computeGroup - 计算调用的计算节点组，可以是单个计算节点（参数未使用但保留）
   * @param {Node} computeNode - 计算节点，包含计算逻辑
   * @param {Array<BindGroup>} bindings - 绑定组数组，包含uniform和纹理绑定
   * @param {ComputePipeline} pipeline - 计算管线，包含着色器程序和缓冲区配置
   * @param {number|null} [count=null] - 计算调用次数，如果为null则由计算节点确定
   */
  compute(computeGroup, computeNode, bindings, pipeline, count = null) {
    // 获取WebGL状态管理器和渲染上下文的引用
    const { state, gl } = this;

    // 启用光栅化丢弃：跳过片段着色器处理，只执行顶点着色器和变换反馈
    if (this.discard === false) {
      // 这里需要处理render.compute()的异步行为，确保光栅化丢弃状态正确设置
      gl.enable(gl.RASTERIZER_DISCARD); // 启用光栅化丢弃，顶点着色器输出不会进入光栅化阶段
      this.discard = true; // 更新内部状态标志
    }

    // 从计算管线中获取相关的GPU资源
    const { programGPU, transformBuffers, attributes } = this.get(pipeline);

    // 设置或获取顶点数组对象(VAO)：VAO封装了顶点属性的配置
    const vaoKey = this._getVaoKey(attributes); // 根据属性生成唯一的缓存键
    const vaoGPU = this.vaoCache[vaoKey]; // 尝试从缓存中获取VAO

    if (vaoGPU === undefined) {
      // 如果VAO不存在于缓存中，创建新的VAO并缓存
      this.vaoCache[vaoKey] = this._createVao(attributes);
    } else {
      // 如果VAO已存在于缓存中，直接使用它
      state.setVertexState(vaoGPU);
    }

    // 绑定计算着色器程序（实际上是顶点着色器程序）
    state.useProgram(programGPU);

    // 绑定uniform变量：设置着色器中的uniform缓冲区和纹理采样器
    this._bindUniforms(bindings);

    // 设置变换反馈：配置顶点着色器输出的捕获
    const transformFeedbackGPU = this._getTransformFeedback(transformBuffers); // 获取或创建变换反馈对象

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedbackGPU); // 绑定变换反馈对象
    gl.beginTransformFeedback(gl.POINTS); // 开始变换反馈，使用POINTS图元类型

    // 确定计算调用的次数（即要处理的数据元素数量）
    count = count !== null ? count : computeNode.count; // 使用传入的count或计算节点的默认count

    // 验证count参数的类型
    if (Array.isArray(count)) {
      warnOnce("WebGLBackend.compute(): The count parameter must be a single number, not an array.");
      count = count[0]; // 如果是数组，取第一个元素
    }

    // 执行"绘制"调用（实际上是计算调用）
    // 在WebGL中，计算是通过绘制调用来模拟的，顶点着色器执行计算逻辑
    if (attributes[0].isStorageInstancedBufferAttribute) {
      // 实例化计算：每个实例处理一个数据元素
      gl.drawArraysInstanced(gl.POINTS, 0, 1, count);
    } else {
      // 普通计算：每个顶点处理一个数据元素
      gl.drawArrays(gl.POINTS, 0, count);
    }

    // 结束变换反馈：停止捕获顶点着色器的输出
    gl.endTransformFeedback(); // 结束变换反馈操作
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null); // 解绑变换反馈对象

    // 切换活动缓冲区（双缓冲机制）：实现乒乓缓冲区模式
    for (let i = 0; i < transformBuffers.length; i++) {
      const dualAttributeData = transformBuffers[i]; // 获取双缓冲区属性数据

      // 如果有PBO（像素缓冲对象），将变换缓冲区数据复制到纹理
      // 这用于将计算结果传递给后续的渲染或计算阶段
      if (dualAttributeData.pbo && this.has(dualAttributeData.pbo)) {
        this.textureUtils.copyBufferToTexture(dualAttributeData.transformBuffer, dualAttributeData.pbo);
      }

      // 切换前后缓冲区：将输出缓冲区变为下次计算的输入缓冲区
      dualAttributeData.switchBuffers();
    }
  }

  /**
   * 在计算调用结束时执行，完成计算任务后的收尾工作
   *
   * 主要负责恢复渲染状态和处理时间戳查询，确保后续的渲染操作
   * 能够正常进行。
   *
   * @param {Node|Array<Node>} computeGroup - 计算节点或计算节点数组
   */
  finishCompute(computeGroup) {
    // 获取WebGL渲染上下文的引用
    const gl = this.gl;

    // 重置光栅化丢弃状态标志
    this.discard = false;

    // 禁用光栅化丢弃，恢复正常渲染模式，允许片段着色器执行
    gl.disable(gl.RASTERIZER_DISCARD);

    // 准备时间戳缓冲区，用于性能测量和分析
    this.prepareTimestampBuffer(computeGroup);

    // 如果存在当前渲染上下文，恢复其帧缓冲区设置
    if (this._currentContext) {
      this._setFramebuffer(this._currentContext);
    }
  }

  /**
   * Internal to determine if the current render target is a render target array with depth 2D array texture.
   *
   * @param {RenderContext} renderContext - The render context.
   * @return {boolean} Whether the render target is a render target array with depth 2D array texture.
   *
   * @private
   */
  _isRenderCameraDepthArray(renderContext) {
    return renderContext.depthTexture && renderContext.depthTexture.isArrayTexture && renderContext.camera.isArrayCamera;
  }

  /**
   * 为给定的渲染对象执行绘制命令
   *
   * 这是WebGL后端的核心绘制方法，负责执行实际的GPU绘制操作。
   * 该方法处理：
   * 1. 着色器程序绑定
   * 2. 顶点属性设置
   * 3. uniform绑定
   * 4. 绘制调用执行
   * 5. 实例化渲染
   * 6. 多重绘制
   * 7. 硬件剪裁平面
   * 8. 遮挡查询
   *
   * @param {RenderObject} renderObject - 要绘制的渲染对象，包含几何体、材质、变换等信息
   * @param {Info} info - 保存GPU内存和渲染过程统计信息的对象（参数未使用但保留）
   */
  draw(renderObject /*, info*/) {
    const { object, pipeline, material, context, hardwareClippingPlanes } = renderObject;
    const { programGPU } = this.get(pipeline);

    const { gl, state } = this;

    const contextData = this.get(context);

    const drawParams = renderObject.getDrawParameters();

    if (drawParams === null) return;

    //

    this._bindUniforms(renderObject.getBindings());

    const frontFaceCW = object.isMesh && object.matrixWorld.determinant() < 0;

    state.setMaterial(material, frontFaceCW, hardwareClippingPlanes);

    state.useProgram(programGPU);

    // vertex state

    const attributes = renderObject.getAttributes();
    const attributesData = this.get(attributes);

    let vaoGPU = attributesData.vaoGPU;

    if (vaoGPU === undefined) {
      const vaoKey = this._getVaoKey(attributes);

      vaoGPU = this.vaoCache[vaoKey];

      if (vaoGPU === undefined) {
        vaoGPU = this._createVao(attributes);

        this.vaoCache[vaoKey] = vaoGPU;
        attributesData.vaoGPU = vaoGPU;
      }
    }

    // 获取索引缓冲区：用于索引绘制，可以减少重复顶点数据
    const index = renderObject.getIndex();
    const indexGPU = index !== null ? this.get(index).bufferGPU : null; // 如果有索引则获取GPU缓冲区，否则为null

    // 设置顶点状态：绑定VAO和索引缓冲区
    state.setVertexState(vaoGPU, indexGPU);

    // 处理遮挡查询：检测对象是否被其他几何体遮挡
    const lastObject = contextData.lastOcclusionObject; // 获取上一个进行遮挡查询的对象

    // 如果当前对象与上一个对象不同，需要处理遮挡查询状态切换
    if (lastObject !== object && lastObject !== undefined) {
      // 如果上一个对象启用了遮挡测试，结束其查询
      if (lastObject !== null && lastObject.occlusionTest === true) {
        gl.endQuery(gl.ANY_SAMPLES_PASSED); // 结束遮挡查询
        contextData.occlusionQueryIndex++; // 递增查询索引
      }

      // 如果当前对象启用了遮挡测试，开始新的查询
      if (object.occlusionTest === true) {
        const query = gl.createQuery(); // 创建新的查询对象
        gl.beginQuery(gl.ANY_SAMPLES_PASSED, query); // 开始遮挡查询

        // 保存查询对象和目标对象的引用
        contextData.occlusionQueries[contextData.occlusionQueryIndex] = query;
        contextData.occlusionQueryObjects[contextData.occlusionQueryIndex] = object;
      }

      // 更新最后一个遮挡查询对象的引用
      contextData.lastOcclusionObject = object;
    }

    // 设置渲染模式：根据对象类型确定WebGL绘制模式
    const renderer = this.bufferRenderer; // 获取缓冲区渲染器

    // 根据对象类型设置相应的WebGL图元类型
    if (object.isPoints) renderer.mode = gl.POINTS; // 点渲染
    else if (object.isLineSegments) renderer.mode = gl.LINES; // 线段渲染
    else if (object.isLine) renderer.mode = gl.LINE_STRIP; // 连续线渲染
    else if (object.isLineLoop) renderer.mode = gl.LINE_LOOP; // 闭合线渲染
    else {
      // 对于其他几何体（通常是三角形网格）
      if (material.wireframe === true) {
        // 线框模式：设置线宽并使用线段渲染
        state.setLineWidth(material.wireframeLinewidth * this.renderer.getPixelRatio());
        renderer.mode = gl.LINES;
      } else {
        // 实体模式：使用三角形渲染
        renderer.mode = gl.TRIANGLES;
      }
    }

    // 设置绘制参数：从绘制参数对象中提取关键信息
    const { vertexCount, instanceCount } = drawParams; // 顶点数量和实例数量
    let { firstVertex } = drawParams; // 起始顶点索引

    // 设置渲染器的目标对象
    renderer.object = object;

    // 配置索引绘制参数
    if (index !== null) {
      // 如果使用索引绘制，需要将顶点偏移转换为字节偏移
      firstVertex *= index.array.BYTES_PER_ELEMENT; // 转换为字节偏移量

      const indexData = this.get(index); // 获取索引数据

      renderer.index = index.count; // 设置索引数量
      renderer.type = indexData.type; // 设置索引数据类型（如gl.UNSIGNED_SHORT）
    } else {
      // 如果不使用索引绘制，索引设为0
      renderer.index = 0;
    }

    // 定义绘制函数：根据对象类型选择合适的绘制方法
    const draw = () => {
      if (object.isBatchedMesh) {
        // 批量网格渲染：一次绘制多个几何体实例
        if (object._multiDrawInstances !== null) {
          // @deprecated, r174 - 已弃用的多重绘制实例方法
          warnOnce("THREE.WebGLBackend: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection.");
          renderer.renderMultiDrawInstances(object._multiDrawStarts, object._multiDrawCounts, object._multiDrawCount, object._multiDrawInstances);
        } else if (!this.hasFeature("WEBGL_multi_draw")) {
          // 检查是否支持多重绘制扩展
          warnOnce("THREE.WebGLRenderer: WEBGL_multi_draw not supported.");
        } else {
          // 使用多重绘制扩展进行批量渲染
          renderer.renderMultiDraw(object._multiDrawStarts, object._multiDrawCounts, object._multiDrawCount);
        }
      } else if (instanceCount > 1) {
        // 实例化渲染：绘制多个相同几何体的实例
        renderer.renderInstances(firstVertex, vertexCount, instanceCount);
      } else {
        // 普通渲染：绘制单个几何体
        renderer.render(firstVertex, vertexCount);
      }
    };

    if (renderObject.camera.isArrayCamera === true && renderObject.camera.cameras.length > 0 && renderObject.camera.isMultiViewCamera === false) {
      const cameraData = this.get(renderObject.camera);
      const cameras = renderObject.camera.cameras;
      const cameraIndex = renderObject.getBindingGroup("cameraIndex").bindings[0];

      if (cameraData.indexesGPU === undefined || cameraData.indexesGPU.length !== cameras.length) {
        const data = new Uint32Array([0, 0, 0, 0]);
        const indexesGPU = [];

        for (let i = 0, len = cameras.length; i < len; i++) {
          const bufferGPU = gl.createBuffer();

          data[0] = i;

          gl.bindBuffer(gl.UNIFORM_BUFFER, bufferGPU);
          gl.bufferData(gl.UNIFORM_BUFFER, data, gl.STATIC_DRAW);

          indexesGPU.push(bufferGPU);
        }

        cameraData.indexesGPU = indexesGPU; // TODO: Create a global library for this
      }

      const cameraIndexData = this.get(cameraIndex);
      const pixelRatio = this.renderer.getPixelRatio();

      const renderTarget = this._currentContext.renderTarget;
      const isRenderCameraDepthArray = this._isRenderCameraDepthArray(this._currentContext);
      const prevActiveCubeFace = this._currentContext.activeCubeFace;

      if (isRenderCameraDepthArray) {
        // Clear the depth texture
        const textureData = this.get(renderTarget.depthTexture);

        if (textureData.clearedRenderId !== this.renderer._nodes.nodeFrame.renderId) {
          textureData.clearedRenderId = this.renderer._nodes.nodeFrame.renderId;

          const { stencilBuffer } = renderTarget;

          for (let i = 0, len = cameras.length; i < len; i++) {
            this.renderer._activeCubeFace = i;
            this._currentContext.activeCubeFace = i;

            this._setFramebuffer(this._currentContext);
            this.clear(false, true, stencilBuffer, this._currentContext, false);
          }

          this.renderer._activeCubeFace = prevActiveCubeFace;
          this._currentContext.activeCubeFace = prevActiveCubeFace;
        }
      }

      for (let i = 0, len = cameras.length; i < len; i++) {
        const subCamera = cameras[i];

        if (object.layers.test(subCamera.layers)) {
          if (isRenderCameraDepthArray) {
            // Update the active layer
            this.renderer._activeCubeFace = i;
            this._currentContext.activeCubeFace = i;

            this._setFramebuffer(this._currentContext);
          }

          const vp = subCamera.viewport;

          if (vp !== undefined) {
            const x = vp.x * pixelRatio;
            const y = vp.y * pixelRatio;
            const width = vp.width * pixelRatio;
            const height = vp.height * pixelRatio;

            state.viewport(Math.floor(x), Math.floor(renderObject.context.height - height - y), Math.floor(width), Math.floor(height));
          }

          state.bindBufferBase(gl.UNIFORM_BUFFER, cameraIndexData.index, cameraData.indexesGPU[i]);

          draw();
        }

        this._currentContext.activeCubeFace = prevActiveCubeFace;
        this.renderer._activeCubeFace = prevActiveCubeFace;
      }
    } else {
      draw();
    }
  }

  /**
   * 检查渲染管线是否需要更新
   *
   * 在WebGL后端中，渲染管线一旦创建就不需要更新，因为WebGL的状态管理
   * 是即时的，不像某些现代图形API需要预先构建管线状态对象。
   *
   * @param {RenderObject} renderObject - 渲染对象（参数未使用）
   * @return {boolean} 渲染管线是否需要更新，WebGL中总是返回false
   */
  needsRenderUpdate(/*renderObject*/) {
    return false;
  }

  /**
   * 获取渲染缓存键
   *
   * 在WebGL后端中不需要计算缓存键，因为WebGL的即时状态管理模式
   * 不需要预先构建和缓存管线状态对象。
   *
   * @param {RenderObject} renderObject - 渲染对象（参数未使用）
   * @return {string} 缓存键，WebGL中总是返回空字符串
   */
  getRenderCacheKey(/*renderObject*/) {
    return "";
  }

  // ===== 纹理相关方法 =====

  /**
   * 为给定纹理创建默认纹理
   *
   * 创建一个可以用作占位符的默认纹理，直到实际纹理准备好使用。
   * 这避免了在纹理加载过程中出现渲染错误或闪烁。
   *
   * @param {Texture} texture - 要为其创建默认纹理的纹理对象
   */
  createDefaultTexture(texture) {
    this.textureUtils.createDefaultTexture(texture);
  }

  /**
   * 在GPU上为给定纹理对象定义纹理
   *
   * 创建WebGL纹理对象并配置其参数，包括格式、类型、过滤模式等。
   * 这是纹理生命周期的第一步。
   *
   * @param {Texture} texture - 纹理对象
   * @param {Object} [options={}] - 可选配置参数
   */
  createTexture(texture, options) {
    this.textureUtils.createTexture(texture, options);
  }

  /**
   * 将更新的纹理数据上传到GPU
   *
   * 当纹理数据发生变化时，将新数据上传到GPU。这包括图像数据更新、
   * 纹理参数变更等情况。
   *
   * @param {Texture} texture - 要更新的纹理
   * @param {Object} [options={}] - 可选配置参数
   */
  updateTexture(texture, options) {
    this.textureUtils.updateTexture(texture, options);
  }

  /**
   * 为给定纹理生成mipmap
   *
   * Mipmap是纹理的多级细节表示，用于在不同距离下提供适当的纹理细节，
   * 减少锯齿和提高渲染性能。
   *
   * @param {Texture} texture - 要生成mipmap的纹理
   */
  generateMipmaps(texture) {
    this.textureUtils.generateMipmaps(texture);
  }

  /**
   * 销毁给定纹理对象的GPU数据
   *
   * 释放纹理在GPU上占用的内存资源。当纹理不再需要时应该调用此方法
   * 以避免内存泄漏。
   *
   * @param {Texture} texture - 要销毁的纹理
   */
  destroyTexture(texture) {
    this.textureUtils.destroyTexture(texture);
  }

  /**
   * 将纹理数据作为类型化数组返回
   *
   * 从GPU读取纹理数据到CPU内存中。这是一个异步操作，因为GPU到CPU的
   * 数据传输需要时间。主要用于纹理数据的回读和分析。
   *
   * @async
   * @param {Texture} texture - 要复制的纹理
   * @param {number} x - 复制起点的x坐标
   * @param {number} y - 复制起点的y坐标
   * @param {number} width - 复制区域的宽度
   * @param {number} height - 复制区域的高度
   * @param {number} faceIndex - 面索引（用于立方体纹理）
   * @return {Promise<TypedArray>} 当复制操作完成时解析为类型化数组的Promise
   */
  async copyTextureToBuffer(texture, x, y, width, height, faceIndex) {
    return this.textureUtils.copyTextureToBuffer(texture, x, y, width, height, faceIndex);
  }

  /**
   * 创建采样器（WebGL 2中无操作）
   *
   * WebGL 2没有独立的采样器对象概念，采样参数直接设置在纹理对象上。
   * 这个方法为了保持接口一致性而存在，但实际上不执行任何操作。
   *
   * @param {Texture} texture - 要为其创建采样器的纹理（参数未使用）
   */
  createSampler(/*texture*/) {
    // WebGL 2中采样器参数直接设置在纹理上，无需独立的采样器对象
  }

  /**
   * 销毁采样器（WebGL 2中无操作）
   *
   * 与createSampler对应，WebGL 2中没有独立的采样器对象需要销毁。
   *
   * @param {Texture} texture - 要为其销毁采样器的纹理（参数未使用）
   */
  destroySampler(/*texture*/) {}

  // ===== 节点构建器相关方法 =====

  /**
   * 为给定的渲染对象创建节点构建器
   *
   * 节点构建器负责将Three.js的节点材质系统转换为GLSL着色器代码。
   * GLSLNodeBuilder是专门为WebGL后端设计的构建器。
   *
   * @param {RenderObject} object - 渲染对象，包含几何体和材质信息
   * @param {Renderer} renderer - 渲染器实例
   * @return {GLSLNodeBuilder} GLSL节点构建器实例
   */
  createNodeBuilder(object, renderer) {
    return new GLSLNodeBuilder(object, renderer);
  }

  // ===== 着色器程序相关方法 =====

  /**
   * 从给定的可编程阶段创建着色器程序
   *
   * 编译单个着色器（顶点或片段着色器）并将其存储在后端缓存中。
   * 这是着色器程序创建过程的第一步。
   *
   * @param {ProgrammableStage} program - 可编程阶段，包含着色器代码和类型信息
   */
  createProgram(program) {
    const gl = this.gl;
    const { stage, code } = program;

    // 根据着色器阶段类型创建对应的WebGL着色器对象
    const shader = stage === "fragment" ? gl.createShader(gl.FRAGMENT_SHADER) : gl.createShader(gl.VERTEX_SHADER);

    // 设置着色器源代码并启动编译过程
    gl.shaderSource(shader, code); // 将GLSL源代码关联到着色器对象
    gl.compileShader(shader); // 编译着色器（可能是异步的，取决于驱动实现）

    // 将编译后的着色器对象存储在后端缓存中
    this.set(program, {
      shaderGPU: shader, // 保存WebGL着色器对象的引用
    });
  }

  /**
   * 销毁给定可编程阶段的着色器程序
   *
   * 从后端缓存中删除着色器程序数据。实际的WebGL资源清理
   * 会在垃圾回收时自动进行。
   *
   * @param {ProgrammableStage} program - 要销毁的可编程阶段
   */
  destroyProgram(program) {
    this.delete(program);
  }

  /**
   * 为给定的渲染对象创建渲染管线
   *
   * 渲染管线包含完整的着色器程序（顶点着色器+片段着色器）以及相关的状态配置。
   * 这个方法执行以下步骤：
   * 1. 创建WebGL程序对象
   * 2. 附加顶点和片段着色器
   * 3. 链接程序
   * 4. 处理异步编译（如果支持）
   * 5. 完成编译过程
   *
   * @param {RenderObject} renderObject - 渲染对象，包含管线配置信息
   * @param {Array<Promise>} promises - 编译Promise数组，用于compileAsync()中的异步编译
   */
  createRenderPipeline(renderObject, promises) {
    // 获取WebGL渲染上下文的引用
    const gl = this.gl;
    // 获取渲染对象的管线配置
    const pipeline = renderObject.pipeline;

    // 从管线配置中提取着色器程序
    const { fragmentProgram, vertexProgram } = pipeline;

    // 创建WebGL程序对象：用于链接顶点着色器和片段着色器
    const programGPU = gl.createProgram();

    // 获取已编译的着色器对象
    const fragmentShader = this.get(fragmentProgram).shaderGPU; // 片段着色器
    const vertexShader = this.get(vertexProgram).shaderGPU; // 顶点着色器

    // 附加着色器到程序并链接
    gl.attachShader(programGPU, fragmentShader);
    gl.attachShader(programGPU, vertexShader);
    gl.linkProgram(programGPU);

    // 存储程序数据
    this.set(pipeline, {
      programGPU, // WebGL程序对象
      fragmentShader, // 片段着色器引用
      vertexShader, // 顶点着色器引用
    });

    // 处理异步编译（如果支持并行着色器编译扩展）
    if (promises !== null && this.parallel) {
      const p = new Promise((resolve /*, reject*/) => {
        const parallel = this.parallel;

        // 检查编译状态的递归函数
        const checkStatus = () => {
          // 检查程序是否编译完成
          if (gl.getProgramParameter(programGPU, parallel.COMPLETION_STATUS_KHR)) {
            this._completeCompile(renderObject, pipeline);
            resolve();
          } else {
            // 如果未完成，在下一帧继续检查
            requestAnimationFrame(checkStatus);
          }
        };

        checkStatus();
      });

      // 将Promise添加到数组中
      promises.push(p);
      return;
    }

    // 同步编译：立即完成编译过程
    this._completeCompile(renderObject, pipeline);
  }

  /**
   * Formats the source code of error messages.
   *
   * @private
   * @param {string} string - The code.
   * @param {number} errorLine - The error line.
   * @return {string} The formatted code.
   */
  _handleSource(string, errorLine) {
    const lines = string.split("\n");
    const lines2 = [];

    const from = Math.max(errorLine - 6, 0);
    const to = Math.min(errorLine + 6, lines.length);

    for (let i = from; i < to; i++) {
      const line = i + 1;
      lines2.push(`${line === errorLine ? ">" : " "} ${line}: ${lines[i]}`);
    }

    return lines2.join("\n");
  }

  /**
   * 从信息日志中获取着色器编译错误
   *
   * 检查着色器的编译状态并返回格式化的错误信息。如果着色器编译失败，
   * 会返回详细的错误日志；如果编译成功但有警告，也会返回相应信息。
   * 错误信息包括行号和具体的错误描述。
   *
   * @private
   * @param {WebGL2RenderingContext} gl - WebGL渲染上下文
   * @param {WebGLShader} shader - WebGL着色器对象
   * @param {string} type - 着色器类型（"vertex"或"fragment"）
   * @return {string} 格式化的着色器错误信息
   */
  _getShaderErrors(gl, shader, type) {
    const status = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    const shaderInfoLog = gl.getShaderInfoLog(shader) || "";
    const errors = shaderInfoLog.trim();

    if (status && errors === "") return "";

    const errorMatches = /ERROR: 0:(\d+)/.exec(errors);
    if (errorMatches) {
      const errorLine = parseInt(errorMatches[1]);
      return type.toUpperCase() + "\n\n" + errors + "\n\n" + this._handleSource(gl.getShaderSource(shader), errorLine);
    } else {
      return errors;
    }
  }

  /**
   * 记录着色器编译错误
   *
   * 当着色器程序编译或链接失败时，这个方法会收集并输出详细的错误信息。
   * 支持自定义错误处理函数，如果没有提供则使用默认的错误报告。
   * 这对于调试着色器代码问题非常有用。
   *
   * @private
   * @param {WebGLProgram} programGPU - WebGL程序对象
   * @param {WebGLShader} glFragmentShader - 片段着色器的原生WebGL着色器对象
   * @param {WebGLShader} glVertexShader - 顶点着色器的原生WebGL着色器对象
   */
  _logProgramError(programGPU, glFragmentShader, glVertexShader) {
    if (this.renderer.debug.checkShaderErrors) {
      const gl = this.gl;

      const programInfoLog = gl.getProgramInfoLog(programGPU) || "";
      const programLog = programInfoLog.trim();

      if (gl.getProgramParameter(programGPU, gl.LINK_STATUS) === false) {
        if (typeof this.renderer.debug.onShaderError === "function") {
          this.renderer.debug.onShaderError(gl, programGPU, glVertexShader, glFragmentShader);
        } else {
          // default error reporting

          const vertexErrors = this._getShaderErrors(gl, glVertexShader, "vertex");
          const fragmentErrors = this._getShaderErrors(gl, glFragmentShader, "fragment");

          console.error(
            "THREE.WebGLProgram: Shader Error " +
              gl.getError() +
              " - " +
              "VALIDATE_STATUS " +
              gl.getProgramParameter(programGPU, gl.VALIDATE_STATUS) +
              "\n\n" +
              "Program Info Log: " +
              programLog +
              "\n" +
              vertexErrors +
              "\n" +
              fragmentErrors
          );
        }
      } else if (programLog !== "") {
        console.warn("THREE.WebGLProgram: Program Info Log:", programLog);
      }
    }
  }

  /**
   * 完成给定渲染对象的着色器程序设置
   *
   * 在着色器程序链接完成后执行的最终编译步骤。这个方法：
   * 1. 检查程序链接状态
   * 2. 记录任何编译错误
   * 3. 激活着色器程序
   * 4. 设置uniform和纹理绑定
   * 5. 缓存编译结果
   *
   * @private
   * @param {RenderObject} renderObject - 渲染对象，包含绑定信息
   * @param {RenderPipeline} pipeline - 要完成编译的渲染管线
   */
  _completeCompile(renderObject, pipeline) {
    const { state, gl } = this;
    const pipelineData = this.get(pipeline);
    const { programGPU, fragmentShader, vertexShader } = pipelineData;

    // 检查程序链接状态
    if (gl.getProgramParameter(programGPU, gl.LINK_STATUS) === false) {
      this._logProgramError(programGPU, fragmentShader, vertexShader);
    }

    // 激活着色器程序
    state.useProgram(programGPU);

    // 设置绑定
    const bindings = renderObject.getBindings();
    this._setupBindings(bindings, programGPU);

    // 缓存编译结果
    this.set(pipeline, {
      programGPU,
    });
  }

  /**
   * 为给定的计算节点创建计算管线
   *
   * 在WebGL中，由于没有真正的计算着色器，这个方法创建一个使用变换反馈的
   * 特殊渲染管线来模拟计算着色器功能。主要步骤包括：
   * 1. 创建一个空的片段着色器（因为不需要片段处理）
   * 2. 设置变换反馈varying变量
   * 3. 配置输入和输出缓冲区
   * 4. 链接程序并设置绑定
   *
   * @param {ComputePipeline} computePipeline - 计算管线配置
   * @param {Array<BindGroup>} bindings - 绑定组数组
   */
  createComputePipeline(computePipeline, bindings) {
    const { state, gl } = this;

    // 创建空的片段着色器程序（计算不需要片段处理）
    const fragmentProgram = {
      stage: "fragment",
      code: "#version 300 es\nprecision highp float;\nvoid main() {}",
    };

    this.createProgram(fragmentProgram);

    const { computeProgram } = computePipeline;

    // 创建WebGL程序对象
    const programGPU = gl.createProgram();

    // 获取着色器
    const fragmentShader = this.get(fragmentProgram).shaderGPU;
    const vertexShader = this.get(computeProgram).shaderGPU;

    // 处理变换反馈配置
    const transforms = computeProgram.transforms;

    const transformVaryingNames = []; // varying变量名数组
    const transformAttributeNodes = []; // 变换属性节点数组

    // 收集变换反馈的varying变量名和属性节点
    for (let i = 0; i < transforms.length; i++) {
      const transform = transforms[i];

      transformVaryingNames.push(transform.varyingName);
      transformAttributeNodes.push(transform.attributeNode);
    }

    // 附加着色器到程序
    gl.attachShader(programGPU, fragmentShader);
    gl.attachShader(programGPU, vertexShader);

    // 设置变换反馈varying变量（使用分离属性模式）
    gl.transformFeedbackVaryings(programGPU, transformVaryingNames, gl.SEPARATE_ATTRIBS);

    // 链接程序
    gl.linkProgram(programGPU);

    // 检查链接状态
    if (gl.getProgramParameter(programGPU, gl.LINK_STATUS) === false) {
      this._logProgramError(programGPU, fragmentShader, vertexShader);
    }

    // 使用程序
    state.useProgram(programGPU);

    // 设置绑定
    this._setupBindings(bindings, programGPU);

    // 处理输入属性
    const attributeNodes = computeProgram.attributes;
    const attributes = [];
    const transformBuffers = [];

    // 创建输入属性缓冲区
    for (let i = 0; i < attributeNodes.length; i++) {
      const attribute = attributeNodes[i].node.attribute;

      attributes.push(attribute);

      // 如果属性缓冲区不存在则创建
      if (!this.has(attribute)) this.attributeUtils.createAttribute(attribute, gl.ARRAY_BUFFER);
    }

    // 创建变换输出缓冲区
    for (let i = 0; i < transformAttributeNodes.length; i++) {
      const attribute = transformAttributeNodes[i].attribute;

      // 如果属性缓冲区不存在则创建
      if (!this.has(attribute)) this.attributeUtils.createAttribute(attribute, gl.ARRAY_BUFFER);

      const attributeData = this.get(attribute);
      transformBuffers.push(attributeData);
    }

    // 存储计算管线数据
    this.set(computePipeline, {
      programGPU,
      transformBuffers,
      attributes,
    });
  }

  /**
   * Creates bindings from the given bind group definition.
   *
   * @param {BindGroup} bindGroup - The bind group.
   * @param {Array<BindGroup>} bindings - Array of bind groups.
   * @param {number} cacheIndex - The cache index.
   * @param {number} version - The version.
   */
  createBindings(bindGroup, bindings /*, cacheIndex, version*/) {
    if (this._knownBindings.has(bindings) === false) {
      this._knownBindings.add(bindings);

      let uniformBuffers = 0;
      let textures = 0;

      for (const bindGroup of bindings) {
        this.set(bindGroup, {
          textures: textures,
          uniformBuffers: uniformBuffers,
        });

        for (const binding of bindGroup.bindings) {
          if (binding.isUniformBuffer) uniformBuffers++;
          if (binding.isSampledTexture) textures++;
        }
      }
    }

    this.updateBindings(bindGroup, bindings);
  }

  /**
   * 更新给定的绑定组定义
   *
   * 为绑定组中的每个绑定创建或更新GPU资源。这包括：
   * - uniform缓冲区：创建WebGL缓冲区并上传数据
   * - 纹理绑定：关联纹理GPU对象和类型信息
   *
   * 每个绑定都会分配一个索引，用于在着色器中访问对应的资源。
   *
   * @param {BindGroup} bindGroup - 要更新的绑定组
   * @param {Array<BindGroup>} bindings - 绑定组数组（参数未使用但保留）
   * @param {number} cacheIndex - 缓存索引（参数未使用但保留）
   * @param {number} version - 版本号（参数未使用但保留）
   */
  updateBindings(bindGroup /*, bindings, cacheIndex, version*/) {
    const { gl } = this;

    const bindGroupData = this.get(bindGroup);

    // 初始化索引计数器
    let i = bindGroupData.uniformBuffers; // uniform缓冲区索引
    let t = bindGroupData.textures; // 纹理索引

    // 处理绑定组中的每个绑定
    for (const binding of bindGroup.bindings) {
      if (binding.isUniformsGroup || binding.isUniformBuffer) {
        // 处理uniform缓冲区绑定
        const data = binding.buffer;
        const bufferGPU = gl.createBuffer();

        // 创建并上传uniform缓冲区数据
        gl.bindBuffer(gl.UNIFORM_BUFFER, bufferGPU);
        gl.bufferData(gl.UNIFORM_BUFFER, data, gl.DYNAMIC_DRAW);

        // 存储绑定数据
        this.set(binding, {
          index: i++, // 分配并递增uniform缓冲区索引
          bufferGPU, // WebGL缓冲区对象
        });
      } else if (binding.isSampledTexture) {
        // 处理纹理绑定
        const { textureGPU, glTextureType } = this.get(binding.texture);

        // 存储纹理绑定数据
        this.set(binding, {
          index: t++, // 分配并递增纹理索引
          textureGPU, // WebGL纹理对象
          glTextureType, // WebGL纹理类型
        });
      }
    }
  }

  /**
   * 更新缓冲区绑定
   *
   * 更新单个缓冲区绑定的数据。当uniform数据发生变化时，
   * 需要将新数据上传到GPU缓冲区。
   *
   * @param {Buffer} binding - 要更新的缓冲区绑定
   */
  updateBinding(binding) {
    const gl = this.gl;

    if (binding.isUniformsGroup || binding.isUniformBuffer) {
      const bindingData = this.get(binding);
      const bufferGPU = bindingData.bufferGPU;
      const data = binding.buffer;

      // 绑定缓冲区并上传新数据
      gl.bindBuffer(gl.UNIFORM_BUFFER, bufferGPU);
      gl.bufferData(gl.UNIFORM_BUFFER, data, gl.DYNAMIC_DRAW);
    }
  }

  // ===== 顶点属性相关方法 =====

  /**
   * 创建索引着色器属性的GPU缓冲区
   *
   * 索引属性用于存储几何体的索引数据，指定顶点的连接顺序。
   * 使用索引可以减少重复顶点数据，提高内存效率。
   *
   * @param {BufferAttribute} attribute - 索引缓冲区属性
   */
  createIndexAttribute(attribute) {
    const gl = this.gl;

    // 创建元素数组缓冲区（索引缓冲区）
    this.attributeUtils.createAttribute(attribute, gl.ELEMENT_ARRAY_BUFFER);
  }

  /**
   * 创建着色器属性的GPU缓冲区
   *
   * 为顶点属性（如位置、法线、UV坐标等）创建WebGL缓冲区。
   * 这些属性会作为输入传递给顶点着色器。
   *
   * @param {BufferAttribute} attribute - 缓冲区属性
   */
  createAttribute(attribute) {
    // 如果属性已存在则跳过
    if (this.has(attribute)) return;

    const gl = this.gl;

    // 创建数组缓冲区（顶点属性缓冲区）
    this.attributeUtils.createAttribute(attribute, gl.ARRAY_BUFFER);
  }

  /**
   * 创建存储属性的GPU缓冲区
   *
   * 存储属性用于计算着色器或高级渲染技术中的数据存储。
   * 在WebGL中，这些通常通过纹理或变换反馈来实现。
   *
   * @param {BufferAttribute} attribute - 缓冲区属性
   */
  createStorageAttribute(attribute) {
    // 如果属性已存在则跳过
    if (this.has(attribute)) return;

    const gl = this.gl;

    // 创建数组缓冲区（存储属性缓冲区）
    this.attributeUtils.createAttribute(attribute, gl.ARRAY_BUFFER);
  }

  /**
   * Updates the GPU buffer of a shader attribute.
   *
   * @param {BufferAttribute} attribute - The buffer attribute to update.
   */
  updateAttribute(attribute) {
    this.attributeUtils.updateAttribute(attribute);
  }

  /**
   * 销毁着色器属性的GPU缓冲区
   *
   * 释放属性在GPU上占用的缓冲区内存。当属性不再需要时应该调用此方法
   * 以避免内存泄漏。
   *
   * @param {BufferAttribute} attribute - 要销毁的缓冲区属性
   */
  destroyAttribute(attribute) {
    this.attributeUtils.destroyAttribute(attribute);
  }

  /**
   * 检查后端是否支持给定的功能
   *
   * 通过检查相关的WebGL扩展来确定是否支持特定功能。
   * 功能名称会映射到对应的WebGL扩展名称进行检查。
   *
   * @param {string} name - 功能名称
   * @return {boolean} 是否支持该功能
   */
  hasFeature(name) {
    // 查找匹配的扩展键名
    const keysMatching = Object.keys(GLFeatureName).filter((key) => GLFeatureName[key] === name);

    const extensions = this.extensions;

    // 检查是否有任何匹配的扩展可用
    for (let i = 0; i < keysMatching.length; i++) {
      if (extensions.has(keysMatching[i])) return true;
    }

    return false;
  }

  /**
   * 返回最大各向异性纹理过滤值
   *
   * 各向异性过滤可以改善倾斜表面上纹理的清晰度，
   * 特别是在远距离观察时。返回值表示支持的最大过滤级别。
   *
   * @return {number} 最大各向异性纹理过滤值
   */
  getMaxAnisotropy() {
    return this.capabilities.getMaxAnisotropy();
  }

  /**
   * 将源纹理的数据复制到目标纹理
   *
   * 执行纹理到纹理的复制操作，支持指定源区域、目标位置和mip级别。
   * 这对于纹理更新、后处理效果和数据传输很有用。
   *
   * @param {Texture} srcTexture - 源纹理
   * @param {Texture} dstTexture - 目标纹理
   * @param {?(Box3|Box2)} [srcRegion=null] - 要复制的源纹理区域
   * @param {?(Vector2|Vector3)} [dstPosition=null] - 复制的目标位置
   * @param {number} [srcLevel=0] - 要复制的源mip级别
   * @param {number} [dstLevel=0] - 要复制到的目标mip级别
   */
  copyTextureToTexture(srcTexture, dstTexture, srcRegion = null, dstPosition = null, srcLevel = 0, dstLevel = 0) {
    this.textureUtils.copyTextureToTexture(srcTexture, dstTexture, srcRegion, dstPosition, srcLevel, dstLevel);
  }

  /**
   * 将当前绑定的帧缓冲区复制到给定纹理
   *
   * 从当前活动的帧缓冲区读取像素数据并复制到纹理中。
   * 这常用于屏幕截图、后处理效果和渲染到纹理操作。
   *
   * @param {Texture} texture - 目标纹理
   * @param {RenderContext} renderContext - 渲染上下文
   * @param {Vector4} rectangle - 定义复制原点和尺寸的四维向量
   */
  copyFramebufferToTexture(texture, renderContext, rectangle) {
    this.textureUtils.copyFramebufferToTexture(texture, renderContext, rectangle);
  }

  /**
   * 从给定的渲染上下文配置活动帧缓冲区
   *
   * 这是WebGL后端中最复杂的方法之一，负责设置渲染目标的帧缓冲区配置。
   * 它处理多种类型的渲染目标：
   * - 立方体渲染目标（用于环境映射）
   * - 3D渲染目标和纹理数组
   * - XR渲染目标（用于VR/AR）
   * - 多采样渲染目标（用于抗锯齿）
   * - 多视图渲染（用于立体渲染）
   *
   * @private
   * @param {RenderContext} descriptor - 包含渲染目标信息的渲染上下文
   */
  _setFramebuffer(descriptor) {
    const { gl, state } = this;

    let currentFrameBuffer = null;

    if (descriptor.textures !== null) {
      // 获取渲染目标和相关数据
      const renderTarget = descriptor.renderTarget;
      const renderTargetContextData = this.get(renderTarget);
      const { samples, depthBuffer, stencilBuffer } = renderTarget;

      // 检测渲染目标类型
      const isCube = renderTarget.isWebGLCubeRenderTarget === true; // 立方体渲染目标
      const isRenderTarget3D = renderTarget.isRenderTarget3D === true; // 3D渲染目标
      const isRenderTargetArray = renderTarget.depth > 1; // 纹理数组渲染目标
      const isXRRenderTarget = renderTarget.isXRRenderTarget === true; // XR渲染目标
      const _hasExternalTextures = isXRRenderTarget === true && renderTarget._hasExternalTextures === true; // 外部纹理

      // 获取多采样和深度渲染缓冲区
      let msaaFb = renderTargetContextData.msaaFrameBuffer;
      let depthRenderbuffer = renderTargetContextData.depthRenderbuffer;

      // 获取相关扩展
      const multisampledRTTExt = this.extensions.get("WEBGL_multisampled_render_to_texture");
      const multiviewExt = this.extensions.get("OVR_multiview2");
      const useMultisampledRTT = this._useMultisampledExtension(renderTarget);
      const cacheKey = getCacheKey(descriptor);

      let fb; // 帧缓冲区对象

      // 根据渲染目标类型选择或创建帧缓冲区
      if (isCube) {
        // 立方体渲染目标：为每个面创建单独的帧缓冲区
        renderTargetContextData.cubeFramebuffers || (renderTargetContextData.cubeFramebuffers = {});
        fb = renderTargetContextData.cubeFramebuffers[cacheKey];
      } else if (isXRRenderTarget && _hasExternalTextures === false) {
        // XR渲染目标：使用预设的XR帧缓冲区
        fb = this._xrFramebuffer;
      } else {
        // 普通渲染目标：使用标准帧缓冲区缓存
        renderTargetContextData.framebuffers || (renderTargetContextData.framebuffers = {});
        fb = renderTargetContextData.framebuffers[cacheKey];
      }

      // 如果帧缓冲区不存在，创建新的
      if (fb === undefined) {
        fb = gl.createFramebuffer();
        state.bindFramebuffer(gl.FRAMEBUFFER, fb);

        const textures = descriptor.textures;
        const depthInvalidationArray = [];

        if (isCube) {
          renderTargetContextData.cubeFramebuffers[cacheKey] = fb;

          const { textureGPU } = this.get(textures[0]);

          const cubeFace = this.renderer._activeCubeFace;

          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + cubeFace, textureGPU, 0);
        } else {
          renderTargetContextData.framebuffers[cacheKey] = fb;

          for (let i = 0; i < textures.length; i++) {
            const texture = textures[i];
            const textureData = this.get(texture);
            textureData.renderTarget = descriptor.renderTarget;
            textureData.cacheKey = cacheKey; // required for copyTextureToTexture()

            const attachment = gl.COLOR_ATTACHMENT0 + i;

            if (renderTarget.multiview) {
              multiviewExt.framebufferTextureMultisampleMultiviewOVR(gl.FRAMEBUFFER, attachment, textureData.textureGPU, 0, samples, 0, 2);
            } else if (isRenderTarget3D || isRenderTargetArray) {
              const layer = this.renderer._activeCubeFace;

              gl.framebufferTextureLayer(gl.FRAMEBUFFER, attachment, textureData.textureGPU, 0, layer);
            } else {
              if (useMultisampledRTT) {
                multisampledRTTExt.framebufferTexture2DMultisampleEXT(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, textureData.textureGPU, 0, samples);
              } else {
                gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, textureData.textureGPU, 0);
              }
            }
          }
        }

        const depthStyle = stencilBuffer ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT;

        if (renderTarget._autoAllocateDepthBuffer === true) {
          const renderbuffer = gl.createRenderbuffer();
          this.textureUtils.setupRenderBufferStorage(renderbuffer, descriptor, 0, useMultisampledRTT);
          renderTargetContextData.xrDepthRenderbuffer = renderbuffer;
          depthInvalidationArray.push(stencilBuffer ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT);

          gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
          gl.framebufferRenderbuffer(gl.FRAMEBUFFER, depthStyle, gl.RENDERBUFFER, renderbuffer);
        } else {
          if (descriptor.depthTexture !== null) {
            depthInvalidationArray.push(stencilBuffer ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT);

            const textureData = this.get(descriptor.depthTexture);
            textureData.renderTarget = descriptor.renderTarget;
            textureData.cacheKey = cacheKey; // required for copyTextureToTexture()

            if (renderTarget.multiview) {
              multiviewExt.framebufferTextureMultisampleMultiviewOVR(gl.FRAMEBUFFER, depthStyle, textureData.textureGPU, 0, samples, 0, 2);
            } else if (_hasExternalTextures && useMultisampledRTT) {
              multisampledRTTExt.framebufferTexture2DMultisampleEXT(gl.FRAMEBUFFER, depthStyle, gl.TEXTURE_2D, textureData.textureGPU, 0, samples);
            } else {
              if (descriptor.depthTexture.isArrayTexture) {
                const layer = this.renderer._activeCubeFace;

                gl.framebufferTextureLayer(gl.FRAMEBUFFER, depthStyle, textureData.textureGPU, 0, layer);
              } else {
                gl.framebufferTexture2D(gl.FRAMEBUFFER, depthStyle, gl.TEXTURE_2D, textureData.textureGPU, 0);
              }
            }
          }
        }

        renderTargetContextData.depthInvalidationArray = depthInvalidationArray;
      } else {
        const isRenderCameraDepthArray = this._isRenderCameraDepthArray(descriptor);

        if (isRenderCameraDepthArray) {
          state.bindFramebuffer(gl.FRAMEBUFFER, fb);

          const layer = this.renderer._activeCubeFace;

          const depthData = this.get(descriptor.depthTexture);
          const depthStyle = stencilBuffer ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT;
          gl.framebufferTextureLayer(gl.FRAMEBUFFER, depthStyle, depthData.textureGPU, 0, layer);
        }

        // rebind external XR textures

        if ((isXRRenderTarget || useMultisampledRTT || renderTarget.multiview) && renderTarget._isOpaqueFramebuffer !== true) {
          state.bindFramebuffer(gl.FRAMEBUFFER, fb);

          // rebind color

          const textureData = this.get(descriptor.textures[0]);

          if (renderTarget.multiview) {
            multiviewExt.framebufferTextureMultisampleMultiviewOVR(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, textureData.textureGPU, 0, samples, 0, 2);
          } else if (useMultisampledRTT) {
            multisampledRTTExt.framebufferTexture2DMultisampleEXT(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textureData.textureGPU, 0, samples);
          } else {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textureData.textureGPU, 0);
          }

          // rebind depth

          const depthStyle = stencilBuffer ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT;

          if (renderTarget._autoAllocateDepthBuffer === true) {
            const renderbuffer = renderTargetContextData.xrDepthRenderbuffer;
            gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, depthStyle, gl.RENDERBUFFER, renderbuffer);
          } else {
            const textureData = this.get(descriptor.depthTexture);

            if (renderTarget.multiview) {
              multiviewExt.framebufferTextureMultisampleMultiviewOVR(gl.FRAMEBUFFER, depthStyle, textureData.textureGPU, 0, samples, 0, 2);
            } else if (useMultisampledRTT) {
              multisampledRTTExt.framebufferTexture2DMultisampleEXT(gl.FRAMEBUFFER, depthStyle, gl.TEXTURE_2D, textureData.textureGPU, 0, samples);
            } else {
              gl.framebufferTexture2D(gl.FRAMEBUFFER, depthStyle, gl.TEXTURE_2D, textureData.textureGPU, 0);
            }
          }
        }
      }

      if (samples > 0 && useMultisampledRTT === false && !renderTarget.multiview) {
        if (msaaFb === undefined) {
          const invalidationArray = [];

          msaaFb = gl.createFramebuffer();

          state.bindFramebuffer(gl.FRAMEBUFFER, msaaFb);

          const msaaRenderbuffers = [];

          const textures = descriptor.textures;

          for (let i = 0; i < textures.length; i++) {
            msaaRenderbuffers[i] = gl.createRenderbuffer();

            gl.bindRenderbuffer(gl.RENDERBUFFER, msaaRenderbuffers[i]);

            invalidationArray.push(gl.COLOR_ATTACHMENT0 + i);

            const texture = descriptor.textures[i];
            const textureData = this.get(texture);

            gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, textureData.glInternalFormat, descriptor.width, descriptor.height);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.RENDERBUFFER, msaaRenderbuffers[i]);
          }

          gl.bindRenderbuffer(gl.RENDERBUFFER, null);

          renderTargetContextData.msaaFrameBuffer = msaaFb;
          renderTargetContextData.msaaRenderbuffers = msaaRenderbuffers;

          if (depthBuffer && depthRenderbuffer === undefined) {
            depthRenderbuffer = gl.createRenderbuffer();
            this.textureUtils.setupRenderBufferStorage(depthRenderbuffer, descriptor, samples);

            renderTargetContextData.depthRenderbuffer = depthRenderbuffer;

            const depthStyle = stencilBuffer ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT;
            invalidationArray.push(depthStyle);
          }

          renderTargetContextData.invalidationArray = invalidationArray;
        }

        currentFrameBuffer = renderTargetContextData.msaaFrameBuffer;
      } else {
        currentFrameBuffer = fb;
      }

      state.drawBuffers(descriptor, fb);
    }

    state.bindFramebuffer(gl.FRAMEBUFFER, currentFrameBuffer);
  }

  /**
   * 为给定的索引和属性计算VAO键
   *
   * 生成一个唯一的字符串键，用于标识特定的顶点属性配置组合。
   * 这个键用于VAO缓存，避免为相同的属性配置重复创建VAO对象。
   * 键由所有属性的ID组合而成。
   *
   * @private
   * @param {Array<BufferAttribute>} attributes - 缓冲区属性数组
   * @return {string} VAO缓存键
   */
  _getVaoKey(attributes) {
    let key = "";

    // 遍历所有属性，将其ID组合成键
    for (let i = 0; i < attributes.length; i++) {
      const attributeData = this.get(attributes[i]);
      key += ":" + attributeData.id;
    }

    return key;
  }

  /**
   * 从索引和属性创建顶点数组对象(VAO)
   *
   * VAO封装了顶点属性的配置状态，包括：
   * - 顶点属性指针设置
   * - 缓冲区绑定
   * - 属性启用状态
   * - 实例化配置
   *
   * 使用VAO可以快速切换不同的顶点配置，提高渲染性能。
   *
   * @private
   * @param {Array<BufferAttribute>} attributes - 缓冲区属性数组
   * @return {WebGLVertexArrayObject} VAO对象
   */
  _createVao(attributes) {
    // 获取WebGL渲染上下文的引用
    const { gl } = this;

    // 创建新的顶点数组对象(VAO)
    const vaoGPU = gl.createVertexArray(); // 创建VAO对象
    gl.bindVertexArray(vaoGPU); // 绑定VAO，后续的顶点属性配置将被记录在这个VAO中

    // 遍历并配置每个顶点属性
    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i]; // 获取当前属性对象
      const attributeData = this.get(attribute); // 获取属性的GPU数据

      // 绑定属性缓冲区并启用顶点属性数组
      gl.bindBuffer(gl.ARRAY_BUFFER, attributeData.bufferGPU); // 绑定属性的GPU缓冲区
      gl.enableVertexAttribArray(i); // 启用指定索引的顶点属性数组

      // 计算步长和偏移量：用于正确读取缓冲区中的数据
      let stride, offset;

      if (attribute.isInterleavedBufferAttribute === true) {
        // 交错缓冲区：多个属性交错存储在同一缓冲区中（如位置、法线、UV交错）
        stride = attribute.data.stride * attributeData.bytesPerElement; // 计算步长（到下一个顶点数据的字节距离）
        offset = attribute.offset * attributeData.bytesPerElement; // 计算偏移量（当前属性在顶点数据中的字节偏移）
      } else {
        // 独立缓冲区：每个属性有自己的缓冲区，数据连续存储
        stride = 0; // 步长为0表示数据紧密排列
        offset = 0; // 偏移量为0表示从缓冲区开始读取
      }

      // 设置顶点属性指针：告诉GPU如何解释缓冲区中的数据
      if (attributeData.isInteger) {
        // 整数属性：使用vertexAttribIPointer（不进行归一化）
        gl.vertexAttribIPointer(i, attribute.itemSize, attributeData.type, stride, offset);
      } else {
        // 浮点属性：使用vertexAttribPointer（可选择归一化）
        gl.vertexAttribPointer(i, attribute.itemSize, attributeData.type, attribute.normalized, stride, offset);
      }

      // 配置实例化渲染：设置属性的实例化除数
      if (attribute.isInstancedBufferAttribute && !attribute.isInterleavedBufferAttribute) {
        // 独立实例化属性：每meshPerAttribute个实例使用一次属性值
        gl.vertexAttribDivisor(i, attribute.meshPerAttribute);
      } else if (attribute.isInterleavedBufferAttribute && attribute.data.isInstancedInterleavedBuffer) {
        // 交错实例化属性：交错缓冲区中的实例化属性
        gl.vertexAttribDivisor(i, attribute.data.meshPerAttribute);
      }
    }

    // 解绑数组缓冲区（VAO会记住所有的绑定状态，包括缓冲区绑定）
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // 返回创建的VAO对象
    return vaoGPU;
  }

  /**
   * 从给定的变换缓冲区创建变换反馈对象
   *
   * 变换反馈(Transform Feedback)允许捕获顶点着色器的输出到缓冲区中，
   * 而不是传递给光栅化阶段。这在WebGL中用于模拟计算着色器功能。
   *
   * 该方法使用缓存机制避免重复创建相同配置的变换反馈对象。
   *
   * @private
   * @param {Array<DualAttributeData>} transformBuffers - 变换缓冲区数组
   * @return {WebGLTransformFeedback} 变换反馈对象
   */
  _getTransformFeedback(transformBuffers) {
    // 生成缓存键
    let key = "";
    for (let i = 0; i < transformBuffers.length; i++) {
      key += ":" + transformBuffers[i].id;
    }

    // 检查缓存
    let transformFeedbackGPU = this.transformFeedbackCache[key];
    if (transformFeedbackGPU !== undefined) {
      return transformFeedbackGPU;
    }

    const { gl } = this;

    // 创建新的变换反馈对象
    transformFeedbackGPU = gl.createTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedbackGPU);

    // 绑定变换缓冲区到变换反馈
    for (let i = 0; i < transformBuffers.length; i++) {
      const attributeData = transformBuffers[i];
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, i, attributeData.transformBuffer);
    }

    // 解绑变换反馈
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

    // 缓存结果
    this.transformFeedbackCache[key] = transformFeedbackGPU;

    return transformFeedbackGPU;
  }

  /**
   * 设置给定的绑定
   *
   * 为着色器程序设置uniform块和纹理采样器的绑定点。这个方法在程序链接后调用，
   * 用于建立着色器中的uniform名称与绑定索引之间的关联。
   *
   * @private
   * @param {Array<BindGroup>} bindings - 绑定组数组
   * @param {WebGLProgram} programGPU - WebGL程序对象
   */
  _setupBindings(bindings, programGPU) {
    const gl = this.gl;

    for (const bindGroup of bindings) {
      for (const binding of bindGroup.bindings) {
        const bindingData = this.get(binding);
        const index = bindingData.index;

        if (binding.isUniformsGroup || binding.isUniformBuffer) {
          // 设置uniform块绑定
          const location = gl.getUniformBlockIndex(programGPU, binding.name);
          gl.uniformBlockBinding(programGPU, location, index);
        } else if (binding.isSampledTexture) {
          // 设置纹理采样器绑定
          const location = gl.getUniformLocation(programGPU, binding.name);
          gl.uniform1i(location, index);
        }
      }
    }
  }

  /**
   * 绑定给定的uniform
   *
   * 在渲染时将实际的缓冲区和纹理绑定到对应的绑定点。
   * 这个方法在每次绘制调用前执行，确保着色器能够访问正确的数据。
   *
   * @private
   * @param {Array<BindGroup>} bindings - 绑定组数组
   */
  _bindUniforms(bindings) {
    // 获取WebGL上下文和状态管理器的引用
    const { gl, state } = this;

    // 遍历所有绑定组
    for (const bindGroup of bindings) {
      // 遍历绑定组中的每个绑定
      for (const binding of bindGroup.bindings) {
        const bindingData = this.get(binding); // 获取绑定的GPU数据
        const index = bindingData.index; // 获取绑定点索引

        if (binding.isUniformsGroup || binding.isUniformBuffer) {
          // 绑定uniform缓冲区到指定的绑定点
          // TODO: 使用bindBufferRange来组合多个uniform缓冲区，实现更精细的内存管理
          state.bindBufferBase(gl.UNIFORM_BUFFER, index, bindingData.bufferGPU);
        } else if (binding.isSampledTexture) {
          // 绑定纹理到指定的纹理单元
          // 纹理单元索引 = gl.TEXTURE0 + index
          state.bindTexture(bindingData.glTextureType, bindingData.textureGPU, gl.TEXTURE0 + index);
        }
      }
    }
  }

  /**
   * 判断是否应该使用多采样渲染到纹理扩展
   *
   * 当启用MSAA时，决定是否使用WEBGL_multisampled_render_to_texture扩展。
   * 这个扩展允许直接渲染到多采样纹理，避免了额外的解析步骤，提高性能。
   *
   * 使用条件：
   * 1. 多视图渲染时总是使用
   * 2. 采样数大于0且扩展可用且允许自动分配深度缓冲区
   *
   * @private
   * @param {RenderTarget} renderTarget - 应该进行多采样的渲染目标
   * @return {boolean} 是否使用WEBGL_multisampled_render_to_texture扩展进行MSAA
   */
  _useMultisampledExtension(renderTarget) {
    // 多视图渲染时总是使用扩展
    if (renderTarget.multiview === true) {
      return true;
    }

    // 检查所有使用条件
    return renderTarget.samples > 0 && this.extensions.has("WEBGL_multisampled_render_to_texture") === true && renderTarget._autoAllocateDepthBuffer !== false;
  }

  /**
   * 释放内部资源
   *
   * 清理WebGL后端使用的所有资源，包括：
   * 1. 强制丢失WebGL上下文（如果支持）
   * 2. 移除事件监听器
   *
   * 这个方法应该在不再需要渲染器时调用，以确保正确的资源清理。
   */
  dispose() {
    // 尝试获取WEBGL_lose_context扩展，用于强制释放WebGL上下文
    const extension = this.extensions.get("WEBGL_lose_context");
    if (extension) extension.loseContext(); // 如果扩展可用，强制丢失上下文以释放GPU资源

    // 移除WebGL上下文丢失事件监听器，防止内存泄漏
    this.renderer.domElement.removeEventListener("webglcontextlost", this._onContextLost);
  }
}

export default WebGLBackend;
