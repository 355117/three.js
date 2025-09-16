// ===== 导入模块部分 =====
// 从常量文件导入各种WebGL相关的常量和枚举值
import {
  REVISION, // Three.js版本号
  BackSide, // 背面渲染常量
  FrontSide, // 正面渲染常量
  DoubleSide, // 双面渲染常量
  HalfFloatType, // 半精度浮点数类型
  UnsignedByteType, // 无符号字节类型
  NoToneMapping, // 无色调映射
  LinearMipmapLinearFilter, // 线性mipmap线性过滤
  SRGBColorSpace, // sRGB颜色空间
  LinearSRGBColorSpace, // 线性sRGB颜色空间
  RGBAIntegerFormat, // RGBA整数格式
  RGIntegerFormat, // RG整数格式
  RedIntegerFormat, // 红色通道整数格式
  UnsignedIntType, // 无符号整数类型
  UnsignedShortType, // 无符号短整数类型
  UnsignedInt248Type, // 无符号24-8位整数类型
  UnsignedShort4444Type, // 无符号4444短整数类型
  UnsignedShort5551Type, // 无符号5551短整数类型
  WebGLCoordinateSystem, // WebGL坐标系统
} from "../constants.js";

// 导入数学相关的类
import { Color } from "../math/Color.js"; // 颜色类，用于处理RGB颜色
import { Frustum } from "../math/Frustum.js"; // 视锥体类，用于视锥体裁剪
import { Matrix4 } from "../math/Matrix4.js"; // 4x4矩阵类，用于变换计算
import { Vector3 } from "../math/Vector3.js"; // 3D向量类
import { Vector4 } from "../math/Vector4.js"; // 4D向量类

// 导入WebGL相关的管理器和工具类
import { WebGLAnimation } from "./webgl/WebGLAnimation.js"; // 动画循环管理器
import { WebGLAttributes } from "./webgl/WebGLAttributes.js"; // 顶点属性管理器
import { WebGLBackground } from "./webgl/WebGLBackground.js"; // 背景渲染管理器
import { WebGLBindingStates } from "./webgl/WebGLBindingStates.js"; // 绑定状态管理器
import { WebGLBufferRenderer } from "./webgl/WebGLBufferRenderer.js"; // 缓冲区渲染器
import { WebGLCapabilities } from "./webgl/WebGLCapabilities.js"; // WebGL能力检测器
import { WebGLClipping } from "./webgl/WebGLClipping.js"; // 裁剪平面管理器
import { WebGLCubeMaps } from "./webgl/WebGLCubeMaps.js"; // 立方体贴图管理器
import { WebGLCubeUVMaps } from "./webgl/WebGLCubeUVMaps.js"; // 立方体UV贴图管理器
import { WebGLExtensions } from "./webgl/WebGLExtensions.js"; // WebGL扩展管理器
import { WebGLGeometries } from "./webgl/WebGLGeometries.js"; // 几何体管理器
import { WebGLIndexedBufferRenderer } from "./webgl/WebGLIndexedBufferRenderer.js"; // 索引缓冲区渲染器
import { WebGLInfo } from "./webgl/WebGLInfo.js"; // WebGL信息统计器
import { WebGLMorphtargets } from "./webgl/WebGLMorphtargets.js"; // 变形目标管理器
import { WebGLObjects } from "./webgl/WebGLObjects.js"; // 对象管理器
import { WebGLPrograms } from "./webgl/WebGLPrograms.js"; // 着色器程序管理器
import { WebGLProperties } from "./webgl/WebGLProperties.js"; // 属性管理器
import { WebGLRenderLists } from "./webgl/WebGLRenderLists.js"; // 渲染列表管理器
import { WebGLRenderStates } from "./webgl/WebGLRenderStates.js"; // 渲染状态管理器
import { WebGLRenderTarget } from "./WebGLRenderTarget.js"; // 渲染目标类
import { WebGLShadowMap } from "./webgl/WebGLShadowMap.js"; // 阴影贴图管理器
import { WebGLState } from "./webgl/WebGLState.js"; // WebGL状态管理器
import { WebGLTextures } from "./webgl/WebGLTextures.js"; // 纹理管理器
import { WebGLUniforms } from "./webgl/WebGLUniforms.js"; // Uniform变量管理器
import { WebGLUtils } from "./webgl/WebGLUtils.js"; // WebGL工具类
import { WebXRManager } from "./webxr/WebXRManager.js"; // WebXR管理器
import { WebGLMaterials } from "./webgl/WebGLMaterials.js"; // 材质管理器
import { WebGLUniformsGroups } from "./webgl/WebGLUniformsGroups.js"; // Uniform组管理器
import { createCanvasElement, probeAsync, warnOnce } from "../utils.js"; // 工具函数
import { ColorManagement } from "../math/ColorManagement.js"; // 颜色管理器

/**
 * WebGL渲染器类 - Three.js的核心渲染器
 *
 * 这个渲染器使用WebGL 2来显示3D场景。
 * 从r163版本开始，不再支持WebGL 1。
 */
class WebGLRenderer {
  /**
   * 构造一个新的WebGL渲染器
   *
   * @param {WebGLRenderer~Options} [parameters] - 配置参数对象
   */
  constructor(parameters = {}) {
    // ===== 解构赋值获取配置参数 =====
    const {
      canvas = createCanvasElement(), // Canvas元素，如果未提供则自动创建
      context = null, // 现有的WebGL上下文，通常为null让渲染器自己创建
      depth = true, // 是否启用深度缓冲区
      stencil = false, // 是否启用模板缓冲区
      alpha = false, // 是否启用alpha通道（透明度）
      antialias = false, // 是否启用抗锯齿
      premultipliedAlpha = true, // 是否使用预乘alpha
      preserveDrawingBuffer = false, // 是否保留绘图缓冲区（用于截图等）
      powerPreference = "default", // GPU功耗偏好："default", "high-performance", "low-power"
      failIfMajorPerformanceCaveat = false, // 如果存在重大性能问题是否失败
      reversedDepthBuffer = false, // 是否使用反向深度缓冲区
    } = parameters;

    /**
     * 类型标识符，用于类型检测
     * 可以通过 object.isWebGLRenderer 来判断对象是否为WebGL渲染器
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isWebGLRenderer = true;

    // ===== 内部变量声明 =====
    let _alpha; // 内部alpha设置

    // 如果提供了现有的WebGL上下文
    if (context !== null) {
      // WebGLRenderingContext 是浏览器内置的全局接口，代表 WebGL 1.0
      // Three.js 从 r163 开始只支持 WebGL 2.0，不再支持 WebGL 1.0
      // 这段代码通过 instanceof 检查来阻止使用 WebGL 1.0 上下文
      // typeof 检查确保在不支持 WebGL 的环境中不会出错
      // 检查是否为WebGL 1上下文，如果是则抛出错误
      if (typeof WebGLRenderingContext !== "undefined" && context instanceof WebGLRenderingContext) {
        throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");
      }

      // 从现有上下文获取alpha设置
      _alpha = context.getContextAttributes().alpha;
    } else {
      // 使用参数中的alpha设置
      _alpha = alpha;
    }

    // ===== 清除颜色缓冲区数组 =====
    const uintClearColor = new Uint32Array(4); // 无符号整数清除颜色数组（用于整数纹理）
    const intClearColor = new Int32Array(4); // 有符号整数清除颜色数组（用于整数纹理）

    // ===== 渲染状态管理变量 =====
    let currentRenderList = null; // 当前渲染列表
    let currentRenderState = null; // 当前渲染状态

    // render()方法可能在另一个render()触发的回调中被调用
    // 我们跟踪这种情况，以便嵌套的render调用能够与父render调用的列表和状态隔离
    const renderListStack = []; // 渲染列表堆栈，用于嵌套渲染
    const renderStateStack = []; // 渲染状态堆栈，用于嵌套渲染

    // ===== 公共属性 =====

    /**
     * Canvas DOM元素 - 渲染器绘制输出的画布
     *
     * 这个canvas会被渲染器在构造函数中自动创建（如果没有提供的话）
     * 你只需要将它添加到页面中即可：
     * ```js
     * document.body.appendChild( renderer.domElement );
     * ```
     *
     * @type {DOMElement}
     */
    this.domElement = canvas;

    /**
     * 调试配置对象 - 包含调试相关的设置
     *
     * - `checkShaderErrors`: 如果为`true`，定义是否在编译和链接过程中检查材质着色器程序的错误。
     *   在生产环境中禁用此检查可能有助于性能提升。强烈建议在开发过程中保持启用这些检查。
     *   如果着色器无法编译和链接，它将无法工作，相关材质也不会渲染。
     * - `onShaderError(gl, program, glVertexShader, glFragmentShader)`: 用于自定义错误报告的回调函数。
     *   回调接收WebGL上下文、WebGLProgram实例以及代表顶点和片段着色器的两个WebGLShader实例。
     *   分配自定义函数会禁用默认错误报告。
     *
     * @type {Object}
     */
    this.debug = {
      /**
       * 启用着色器程序编译时的错误检查和报告
       * @type {boolean}
       */
      checkShaderErrors: true,
      /**
       * 自定义错误报告的回调函数
       * @type {?Function}
       */
      onShaderError: null,
    };

    // ===== 清除相关设置 =====

    /**
     * 自动清除标志 - 渲染器是否应该在渲染帧之前自动清除其输出
     *
     * @type {boolean}
     * @default true
     */
    this.autoClear = true;

    /**
     * 自动清除颜色缓冲区 - 如果 {@link WebGLRenderer#autoClear} 设置为 `true`，
     * 渲染器是否应该清除颜色缓冲区
     *
     * @type {boolean}
     * @default true
     */
    this.autoClearColor = true;

    /**
     * 自动清除深度缓冲区 - 如果 {@link WebGLRenderer#autoClear} 设置为 `true`，
     * 渲染器是否应该清除深度缓冲区
     *
     * @type {boolean}
     * @default true
     */
    this.autoClearDepth = true;

    /**
     * 自动清除模板缓冲区 - 如果 {@link WebGLRenderer#autoClear} 设置为 `true`，
     * 渲染器是否应该清除模板缓冲区
     *
     * @type {boolean}
     * @default true
     */
    this.autoClearStencil = true;

    // ===== 场景图相关设置 =====

    /**
     * 对象排序标志 - 渲染器是否应该对对象进行排序
     *
     * 注意：排序用于尝试正确渲染具有一定透明度的对象。根据定义，对象排序可能不会在所有
     * 情况下都有效。根据应用程序的需要，可能需要关闭排序并使用其他方法来处理透明度渲染，
     * 例如手动确定每个对象的渲染顺序。
     *
     * @type {boolean}
     * @default true
     */
    this.sortObjects = true;

    // ===== 用户定义的裁剪设置 =====

    /**
     * 裁剪平面数组 - 在世界空间中指定的用户定义裁剪平面，这些平面全局应用
     * 空间中与平面的点积为负的点将被裁剪掉
     *
     * @type {Array<Plane>}
     */
    this.clippingPlanes = [];

    /**
     * 局部裁剪启用标志 - 渲染器是否尊重对象级别的裁剪平面
     *
     * @type {boolean}
     * @default false
     */
    this.localClippingEnabled = false;

    // ===== 色调映射设置 =====

    /**
     * 色调映射技术 - 渲染器使用的色调映射技术
     * 用于将HDR颜色映射到LDR显示设备上
     *
     * @type {(NoToneMapping|LinearToneMapping|ReinhardToneMapping|CineonToneMapping|ACESFilmicToneMapping|CustomToneMapping|AgXToneMapping|NeutralToneMapping)}
     * @default NoToneMapping
     */
    this.toneMapping = NoToneMapping;

    /**
     * 色调映射曝光级别 - 控制场景的整体亮度
     *
     * @type {number}
     * @default 1
     */
    this.toneMappingExposure = 1.0;

    // ===== 透射相关设置 =====

    /**
     * 透射渲染目标的归一化分辨率比例 - 以视口尺寸的百分比为单位测量
     * 降低此值可以在使用 {@link MeshPhysicalMaterial#transmission} 时显著提高性能
     *
     * @type {number}
     * @default 1
     */
    this.transmissionResolutionScale = 1.0;

    // ===== 内部属性 =====

    const _this = this; // 保存this引用，用于回调函数中

    let _isContextLost = false; // WebGL上下文丢失标志

    // ===== 内部状态缓存 =====

    this._outputColorSpace = SRGBColorSpace; // 输出颜色空间

    let _currentActiveCubeFace = 0; // 当前活动的立方体贴图面索引
    let _currentActiveMipmapLevel = 0; // 当前活动的mipmap级别
    let _currentRenderTarget = null; // 当前渲染目标
    let _currentMaterialId = -1; // 当前材质ID

    let _currentCamera = null; // 当前相机

    const _currentViewport = new Vector4(); // 当前视口（x, y, width, height）
    const _currentScissor = new Vector4(); // 当前裁剪区域（x, y, width, height）
    let _currentScissorTest = null; // 当前裁剪测试状态

    const _currentClearColor = new Color(0x000000); // 当前清除颜色（黑色）
    let _currentClearAlpha = 0; // 当前清除alpha值

    // ===== 画布尺寸相关变量 =====

    let _width = canvas.width; // 画布宽度
    let _height = canvas.height; // 画布高度

    let _pixelRatio = 1; // 像素比率（用于高DPI显示）
    let _opaqueSort = null; // 不透明对象排序函数
    let _transparentSort = null; // 透明对象排序函数

    const _viewport = new Vector4(0, 0, _width, _height); // 视口区域（x, y, width, height）
    const _scissor = new Vector4(0, 0, _width, _height); // 裁剪区域（x, y, width, height）
    let _scissorTest = false; // 裁剪测试是否启用

    // ===== 视锥体相关 =====

    const _frustum = new Frustum(); // 视锥体对象，用于视锥体裁剪

    // ===== 裁剪相关 =====

    let _clippingEnabled = false; // 全局裁剪是否启用
    let _localClippingEnabled = false; // 局部裁剪是否启用

    // ===== 相机矩阵缓存 =====

    const _projScreenMatrix = new Matrix4(); // 投影屏幕矩阵（投影矩阵 × 视图矩阵）

    const _vector3 = new Vector3(); // 临时3D向量，用于计算

    const _vector4 = new Vector4(); // 临时4D向量，用于计算

    // 空场景对象，用作默认场景
    const _emptyScene = {
      background: null, // 背景
      fog: null, // 雾效
      environment: null, // 环境贴图
      overrideMaterial: null, // 覆盖材质
      isScene: true, // 场景标识
    };

    let _renderBackground = false; // 是否渲染背景

    /**
     * 获取目标像素比率
     * 如果当前没有渲染目标，返回设置的像素比率；否则返回1
     * @returns {number} 目标像素比率
     */
    function getTargetPixelRatio() {
      return _currentRenderTarget === null ? _pixelRatio : 1;
    }

    // ===== WebGL上下文初始化 =====

    let _gl = context; // WebGL渲染上下文

    /**
     * 获取WebGL上下文
     * @param {string} contextName - 上下文名称
     * @param {Object} contextAttributes - 上下文属性
     * @returns {WebGLRenderingContext} WebGL上下文
     */
    function getContext(contextName, contextAttributes) {
      return canvas.getContext(contextName, contextAttributes);
    }

    // 尝试创建WebGL上下文
    try {
      // WebGL上下文属性配置
      const contextAttributes = {
        alpha: true, // 强制启用alpha通道（内部需要）
        depth, // 深度缓冲区
        stencil, // 模板缓冲区
        antialias, // 抗锯齿
        premultipliedAlpha, // 预乘alpha
        preserveDrawingBuffer, // 保留绘图缓冲区
        powerPreference, // 功耗偏好
        failIfMajorPerformanceCaveat, // 性能警告时是否失败
      };

      // OffscreenCanvas没有setAttribute方法，参见 #22811
      if ("setAttribute" in canvas) canvas.setAttribute("data-engine", `three.js r${REVISION}`);

      // 事件监听器必须在WebGL上下文创建之前注册，参见 #12753
      canvas.addEventListener("webglcontextlost", onContextLost, false); // 上下文丢失事件
      canvas.addEventListener("webglcontextrestored", onContextRestore, false); // 上下文恢复事件
      canvas.addEventListener("webglcontextcreationerror", onContextCreationError, false); // 上下文创建错误事件

      // 如果没有提供现有的WebGL上下文，则创建新的
      if (_gl === null) {
        const contextName = "webgl2"; // 使用WebGL 2

        _gl = getContext(contextName, contextAttributes);

        if (_gl === null) {
          if (getContext(contextName)) {
            throw new Error("Error creating WebGL context with your selected attributes.");
          } else {
            throw new Error("Error creating WebGL context.");
          }
        }
      }
    } catch (error) {
      console.error("THREE.WebGLRenderer: " + error.message);
      throw error;
    }

    // ===== WebGL管理器变量声明 =====
    let extensions, capabilities, state, info; // 核心管理器
    let properties, textures, cubemaps, cubeuvmaps, attributes, geometries, objects; // 资源管理器
    let programCache, materials, renderLists, renderStates, clipping, shadowMap; // 渲染管理器

    let background, morphtargets, bufferRenderer, indexedBufferRenderer; // 渲染器组件

    let utils, bindingStates, uniformsGroups; // 工具和状态管理器

    /**
     * 初始化WebGL上下文和所有相关的管理器
     * 这个函数创建并配置所有WebGL渲染所需的组件
     */
    function initGLContext() {
      // ===== 初始化扩展管理器 =====
      extensions = new WebGLExtensions(_gl); // 创建扩展管理器
      extensions.init(); // 初始化扩展

      // ===== 初始化工具类 =====
      utils = new WebGLUtils(_gl, extensions); // 创建WebGL工具类

      // ===== 初始化能力检测器 =====
      capabilities = new WebGLCapabilities(_gl, extensions, parameters, utils); // 检测WebGL能力

      // ===== 初始化状态管理器 =====
      state = new WebGLState(_gl, extensions); // 创建WebGL状态管理器

      // 如果支持反向深度缓冲区且用户启用了，则设置反向深度
      if (capabilities.reversedDepthBuffer && reversedDepthBuffer) {
        state.buffers.depth.setReversed(true);
      }

      // ===== 初始化信息和属性管理器 =====
      info = new WebGLInfo(_gl); // 创建WebGL信息统计器
      properties = new WebGLProperties(); // 创建属性管理器

      // ===== 初始化纹理相关管理器 =====
      textures = new WebGLTextures(_gl, extensions, state, properties, capabilities, utils, info); // 纹理管理器
      cubemaps = new WebGLCubeMaps(_this); // 立方体贴图管理器
      cubeuvmaps = new WebGLCubeUVMaps(_this); // 立方体UV贴图管理器

      // ===== 初始化几何体相关管理器 =====
      attributes = new WebGLAttributes(_gl); // 顶点属性管理器
      bindingStates = new WebGLBindingStates(_gl, attributes); // 绑定状态管理器
      geometries = new WebGLGeometries(_gl, attributes, info, bindingStates); // 几何体管理器
      objects = new WebGLObjects(_gl, geometries, attributes, info); // 对象管理器

      // ===== 初始化变形目标管理器 =====
      morphtargets = new WebGLMorphtargets(_gl, capabilities, textures); // 变形目标管理器

      // ===== 初始化裁剪管理器 =====
      clipping = new WebGLClipping(properties); // 裁剪平面管理器

      // ===== 初始化着色器程序管理器 =====
      programCache = new WebGLPrograms(_this, cubemaps, cubeuvmaps, extensions, capabilities, bindingStates, clipping);

      // ===== 初始化材质管理器 =====
      materials = new WebGLMaterials(_this, properties); // 材质管理器

      // ===== 初始化渲染列表和状态管理器 =====
      renderLists = new WebGLRenderLists(); // 渲染列表管理器
      renderStates = new WebGLRenderStates(extensions); // 渲染状态管理器

      // ===== 初始化背景渲染器 =====
      background = new WebGLBackground(_this, cubemaps, cubeuvmaps, state, objects, _alpha, premultipliedAlpha);

      // ===== 初始化阴影贴图管理器 =====
      shadowMap = new WebGLShadowMap(_this, objects, capabilities); // 阴影贴图管理器

      // ===== 初始化Uniform组管理器 =====
      uniformsGroups = new WebGLUniformsGroups(_gl, info, capabilities, state); // Uniform组管理器

      // ===== 初始化缓冲区渲染器 =====
      bufferRenderer = new WebGLBufferRenderer(_gl, extensions, info); // 普通缓冲区渲染器
      indexedBufferRenderer = new WebGLIndexedBufferRenderer(_gl, extensions, info); // 索引缓冲区渲染器

      // 将程序缓存关联到信息统计器
      info.programs = programCache.programs;

      // ===== 将管理器暴露为渲染器的公共属性 =====

      /**
       * 当前渲染上下文的能力详情
       * 包含WebGL版本、扩展支持、最大纹理尺寸等信息
       *
       * @name WebGLRenderer#capabilities
       * @type {WebGLRenderer~Capabilities}
       */
      _this.capabilities = capabilities;

      /**
       * WebGL扩展管理器
       * 提供检索和测试WebGL扩展的方法
       *
       * - `get(extensionName:string)`: 检查WebGL扩展是否支持并返回扩展对象（如果可用）
       * - `has(extensionName:string)`: 如果扩展受支持则返回 `true`
       *
       * @name WebGLRenderer#extensions
       * @type {Object}
       */
      _this.extensions = extensions;

      /**
       * 属性管理器
       * 用于跟踪其他对象（如原生WebGL对象）的属性
       *
       * @name WebGLRenderer#properties
       * @type {Object}
       */
      _this.properties = properties;

      /**
       * 渲染列表管理器
       * 管理渲染器的渲染列表，用于组织和排序要渲染的对象
       *
       * @name WebGLRenderer#renderLists
       * @type {Object}
       */
      _this.renderLists = renderLists;

      /**
       * 阴影管理接口
       * 用于管理阴影贴图的生成和渲染
       *
       * @name WebGLRenderer#shadowMap
       * @type {WebGLRenderer~ShadowMap}
       */
      _this.shadowMap = shadowMap;

      /**
       * WebGL状态管理接口
       * 用于管理WebGL的各种状态（混合、深度测试、面剔除等）
       *
       * @name WebGLRenderer#state
       * @type {Object}
       */
      _this.state = state;

      /**
       * Holds a series of statistical information about the GPU memory
       * and the rendering process. Useful for debugging and monitoring.
       *
       * By default these data are reset at each render call but when having
       * multiple render passes per frame (e.g. when using post processing) it can
       * be preferred to reset with a custom pattern. First, set `autoReset` to
       * `false`.
       * ```js
       * renderer.info.autoReset = false;
       * ```
       * Call `reset()` whenever you have finished to render a single frame.
       * ```js
       * renderer.info.reset();
       * ```
       *
       * @name WebGLRenderer#info
       * @type {WebGLRenderer~Info}
       */
      _this.info = info;
    }

    initGLContext();

    // xr

    const xr = new WebXRManager(_this, _gl);

    /**
     * A reference to the XR manager.
     *
     * @type {WebXRManager}
     */
    this.xr = xr;

    /**
     * 获取渲染上下文
     * 返回当前使用的WebGL渲染上下文
     *
     * @return {WebGL2RenderingContext} WebGL渲染上下文
     */
    this.getContext = function () {
      return _gl;
    };

    /**
     * 获取渲染上下文属性
     * 返回WebGL上下文的配置属性
     *
     * @return {WebGLContextAttributes} WebGL上下文属性
     */
    this.getContextAttributes = function () {
      return _gl.getContextAttributes();
    };

    /**
     * 强制WebGL上下文丢失
     * 模拟WebGL上下文的丢失。这需要 `WEBGL_lose_context` 扩展的支持。
     * 主要用于测试上下文丢失和恢复的处理逻辑。
     */
    this.forceContextLoss = function () {
      const extension = extensions.get("WEBGL_lose_context");
      if (extension) extension.loseContext();
    };

    /**
     * 强制WebGL上下文恢复
     * 模拟WebGL上下文的恢复。这需要 `WEBGL_lose_context` 扩展的支持。
     * 通常与 forceContextLoss 配合使用进行测试。
     */
    this.forceContextRestore = function () {
      const extension = extensions.get("WEBGL_lose_context");
      if (extension) extension.restoreContext();
    };

    /**
     * 获取像素比率
     * 返回当前设置的设备像素比率
     *
     * @return {number} 像素比率
     */
    this.getPixelRatio = function () {
      return _pixelRatio;
    };

    /**
     * 设置像素比率
     * 设置给定的像素比率并在必要时调整canvas大小
     * 像素比率用于支持高DPI显示设备
     *
     * @param {number} value - 像素比率值
     */
    this.setPixelRatio = function (value) {
      if (value === undefined) return; // 如果值未定义，直接返回

      _pixelRatio = value; // 设置新的像素比率

      this.setSize(_width, _height, false); // 重新设置尺寸以应用新的像素比率
    };

    /**
     * 获取渲染器尺寸
     * 返回渲染器的逻辑像素尺寸。此方法不考虑像素比率。
     *
     * @param {Vector2} target - 方法将结果写入此目标对象
     * @return {Vector2} 渲染器的逻辑像素尺寸
     */
    this.getSize = function (target) {
      return target.set(_width, _height);
    };

    /**
     * 设置渲染器尺寸
     * 将输出canvas调整为指定的宽度和高度（考虑设备像素比率），
     * 并设置视口以适应该尺寸，从(0,0)开始。
     * 将 `updateStyle` 设置为false可以防止对输出canvas的样式进行任何更改。
     *
     * @param {number} width - 逻辑像素宽度
     * @param {number} height - 逻辑像素高度
     * @param {boolean} [updateStyle=true] - 是否更新canvas的style属性
     */
    this.setSize = function (width, height, updateStyle = true) {
      // 如果正在进行VR呈现，不允许改变尺寸
      if (xr.isPresenting) {
        console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");
        return;
      }

      // 更新内部尺寸变量
      _width = width;
      _height = height;

      // 设置canvas的实际像素尺寸（考虑像素比率）
      canvas.width = Math.floor(width * _pixelRatio);
      canvas.height = Math.floor(height * _pixelRatio);

      // 如果需要更新样式，设置canvas的CSS尺寸
      if (updateStyle === true) {
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
      }

      // 设置视口以匹配新的尺寸
      this.setViewport(0, 0, width, height);
    };

    /**
     * Returns the drawing buffer size in physical pixels. This method honors the pixel ratio.
     *
     * @param {Vector2} target - The method writes the result in this target object.
     * @return {Vector2} The drawing buffer size.
     */
    this.getDrawingBufferSize = function (target) {
      return target.set(_width * _pixelRatio, _height * _pixelRatio).floor();
    };

    /**
     * This method allows to define the drawing buffer size by specifying
     * width, height and pixel ratio all at once. The size of the drawing
     * buffer is computed with this formula:
     * ```js
     * size.x = width * pixelRatio;
     * size.y = height * pixelRatio;
     * ```
     *
     * @param {number} width - The width in logical pixels.
     * @param {number} height - The height in logical pixels.
     * @param {number} pixelRatio - The pixel ratio.
     */
    this.setDrawingBufferSize = function (width, height, pixelRatio) {
      _width = width;
      _height = height;

      _pixelRatio = pixelRatio;

      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);

      this.setViewport(0, 0, width, height);
    };

    /**
     * 获取当前视口定义
     * 返回当前实际使用的视口设置（考虑像素比率）
     *
     * @param {Vector2} target - 方法将结果写入此目标对象
     * @return {Vector2} 当前视口定义
     */
    this.getCurrentViewport = function (target) {
      return target.copy(_currentViewport);
    };

    /**
     * 获取视口定义
     * 返回设置的逻辑视口定义（不考虑像素比率）
     *
     * @param {Vector4} target - 方法将结果写入此目标对象
     * @return {Vector4} 视口定义
     */
    this.getViewport = function (target) {
      return target.copy(_viewport);
    };

    /**
     * 设置视口
     * 设置从 `(x, y)` 到 `(x + width, y + height)` 的渲染视口
     *
     * @param {number | Vector4} x - 视口原点左下角的水平坐标（逻辑像素单位）
     * 或者是指定视口所有参数的四分量向量
     * @param {number} y - 视口原点左下角的垂直坐标（逻辑像素单位）
     * @param {number} width - 视口宽度（逻辑像素单位）
     * @param {number} height - 视口高度（逻辑像素单位）
     */
    this.setViewport = function (x, y, width, height) {
      if (x.isVector4) {
        // 如果第一个参数是Vector4，使用其分量
        _viewport.set(x.x, x.y, x.z, x.w);
      } else {
        // 否则使用单独的参数
        _viewport.set(x, y, width, height);
      }

      // 应用像素比率并设置到WebGL状态
      state.viewport(_currentViewport.copy(_viewport).multiplyScalar(_pixelRatio).round());
    };

    /**
     * 获取裁剪区域
     * 返回当前设置的裁剪区域
     *
     * @param {Vector4} target - 方法将结果写入此目标对象
     * @return {Vector4} 裁剪区域
     */
    this.getScissor = function (target) {
      return target.copy(_scissor);
    };

    /**
     * 设置裁剪区域
     * 设置从 `(x, y)` 到 `(x + width, y + height)` 的裁剪区域
     *
     * @param {number | Vector4} x - 裁剪区域原点左下角的水平坐标（逻辑像素单位）
     * 或者是指定裁剪区域所有参数的四分量向量
     * @param {number} y - 裁剪区域原点左下角的垂直坐标（逻辑像素单位）
     * @param {number} width - 裁剪区域宽度（逻辑像素单位）
     * @param {number} height - 裁剪区域高度（逻辑像素单位）
     */
    this.setScissor = function (x, y, width, height) {
      if (x.isVector4) {
        // 如果第一个参数是Vector4，使用其分量
        _scissor.set(x.x, x.y, x.z, x.w);
      } else {
        // 否则使用单独的参数
        _scissor.set(x, y, width, height);
      }

      // 应用像素比率并设置到WebGL状态
      state.scissor(_currentScissor.copy(_scissor).multiplyScalar(_pixelRatio).round());
    };

    /**
     * 获取裁剪测试状态
     * 返回裁剪测试是否启用
     *
     * @return {boolean} 裁剪测试是否启用
     */
    this.getScissorTest = function () {
      return _scissorTest;
    };

    /**
     * 启用或禁用裁剪测试
     * 当启用时，只有定义的裁剪区域内的像素会受到后续渲染操作的影响
     *
     * @param {boolean} boolean - 是否启用裁剪测试
     */
    this.setScissorTest = function (boolean) {
      state.setScissorTest((_scissorTest = boolean));
    };

    /**
     * 设置不透明对象排序函数
     * 为渲染列表设置自定义的不透明对象排序函数。传入 `null` 使用默认的 `painterSortStable` 函数
     *
     * @param {?Function} method - 不透明对象排序函数
     */
    this.setOpaqueSort = function (method) {
      _opaqueSort = method;
    };

    /**
     * 设置透明对象排序函数
     * 为渲染列表设置自定义的透明对象排序函数。传入 `null` 使用默认的 `reversePainterSortStable` 函数
     *
     * @param {?Function} method - 透明对象排序函数
     */
    this.setTransparentSort = function (method) {
      _transparentSort = method;
    };

    // ===== 清除相关方法 =====

    /**
     * 获取清除颜色
     * 返回当前设置的清除颜色
     *
     * @param {Color} target - 方法将结果写入此目标对象
     * @return {Color} 清除颜色
     */
    this.getClearColor = function (target) {
      return target.copy(background.getClearColor());
    };

    /**
     * 设置清除颜色和alpha
     * 设置用于清除操作的颜色和alpha值
     *
     * @param {Color} color - 清除颜色
     * @param {number} [alpha=1] - 清除alpha值
     */
    this.setClearColor = function () {
      background.setClearColor(...arguments);
    };

    /**
     * 获取清除alpha值
     * 返回当前的清除alpha值，范围在 [0,1] 之间
     *
     * @return {number} 清除alpha值
     */
    this.getClearAlpha = function () {
      return background.getClearAlpha();
    };

    /**
     * 设置清除alpha值
     * 设置用于清除操作的alpha值
     *
     * @param {number} alpha - 清除alpha值
     */
    this.setClearAlpha = function () {
      background.setClearAlpha(...arguments);
    };

    /**
     * 清除缓冲区
     * 告诉渲染器清除其颜色、深度或模板绘图缓冲区。
     * 此方法将缓冲区初始化为当前的清除颜色值。
     *
     * @param {boolean} [color=true] - 是否清除颜色缓冲区
     * @param {boolean} [depth=true] - 是否清除深度缓冲区
     * @param {boolean} [stencil=true] - 是否清除模板缓冲区
     */
    this.clear = function (color = true, depth = true, stencil = true) {
      let bits = 0; // 清除位标志

      if (color) {
        // 检查是否尝试清除整数目标
        let isIntegerFormat = false;
        if (_currentRenderTarget !== null) {
          const targetFormat = _currentRenderTarget.texture.format;
          // 检查是否为整数格式
          isIntegerFormat = targetFormat === RGBAIntegerFormat || targetFormat === RGIntegerFormat || targetFormat === RedIntegerFormat;
        }

        // 如果是整数目标，使用适当的清除函数来清除有符号或无符号整数目标
        if (isIntegerFormat) {
          const targetType = _currentRenderTarget.texture.type;
          // 检查是否为无符号类型
          const isUnsignedType =
            targetType === UnsignedByteType ||
            targetType === UnsignedIntType ||
            targetType === UnsignedShortType ||
            targetType === UnsignedInt248Type ||
            targetType === UnsignedShort4444Type ||
            targetType === UnsignedShort5551Type;

          // 获取清除颜色和alpha值
          const clearColor = background.getClearColor();
          const a = background.getClearAlpha();
          const r = clearColor.r;
          const g = clearColor.g;
          const b = clearColor.b;

          if (isUnsignedType) {
            // 无符号整数清除
            uintClearColor[0] = r;
            uintClearColor[1] = g;
            uintClearColor[2] = b;
            uintClearColor[3] = a;
            _gl.clearBufferuiv(_gl.COLOR, 0, uintClearColor);
          } else {
            // 有符号整数清除
            intClearColor[0] = r;
            intClearColor[1] = g;
            intClearColor[2] = b;
            intClearColor[3] = a;
            _gl.clearBufferiv(_gl.COLOR, 0, intClearColor);
          }
        } else {
          // 普通颜色缓冲区清除
          bits |= _gl.COLOR_BUFFER_BIT;
        }
      }

      if (depth) {
        // 添加深度缓冲区清除标志
        bits |= _gl.DEPTH_BUFFER_BIT;
      }

      if (stencil) {
        // 添加模板缓冲区清除标志
        bits |= _gl.STENCIL_BUFFER_BIT;
        // 设置模板掩码为全1，确保所有位都被清除
        this.state.buffers.stencil.setMask(0xffffffff);
      }

      // 执行清除操作
      _gl.clear(bits);
    };

    /**
     * 清除颜色缓冲区
     * 等同于调用 `renderer.clear( true, false, false )`
     */
    this.clearColor = function () {
      this.clear(true, false, false);
    };

    /**
     * 清除深度缓冲区
     * 等同于调用 `renderer.clear( false, true, false )`
     */
    this.clearDepth = function () {
      this.clear(false, true, false);
    };

    /**
     * 清除模板缓冲区
     * 等同于调用 `renderer.clear( false, false, true )`
     */
    this.clearStencil = function () {
      this.clear(false, false, true);
    };

    /**
     * 释放资源
     * 释放此实例分配的GPU相关资源。当此实例在应用程序中不再使用时调用此方法。
     * 这对于防止内存泄漏非常重要。
     */
    this.dispose = function () {
      // 移除canvas事件监听器
      canvas.removeEventListener("webglcontextlost", onContextLost, false);
      canvas.removeEventListener("webglcontextrestored", onContextRestore, false);
      canvas.removeEventListener("webglcontextcreationerror", onContextCreationError, false);

      // 释放各个管理器的资源
      background.dispose(); // 释放背景渲染器资源
      renderLists.dispose(); // 释放渲染列表资源
      renderStates.dispose(); // 释放渲染状态资源
      properties.dispose(); // 释放属性管理器资源
      cubemaps.dispose(); // 释放立方体贴图资源
      cubeuvmaps.dispose(); // 释放立方体UV贴图资源
      objects.dispose(); // 释放对象管理器资源
      bindingStates.dispose(); // 释放绑定状态资源
      uniformsGroups.dispose(); // 释放Uniform组资源
      programCache.dispose(); // 释放程序缓存资源

      // 释放XR相关资源
      xr.dispose();

      // 移除XR事件监听器
      xr.removeEventListener("sessionstart", onXRSessionStart);
      xr.removeEventListener("sessionend", onXRSessionEnd);

      // 停止动画循环
      animation.stop();
    };

    // ===== 事件处理函数 =====

    /**
     * WebGL上下文丢失事件处理函数
     * 当WebGL上下文丢失时被调用（例如GPU重置、驱动程序崩溃等）
     * @param {Event} event - 上下文丢失事件
     */
    function onContextLost(event) {
      event.preventDefault(); // 阻止默认行为

      console.log("THREE.WebGLRenderer: Context Lost.");

      _isContextLost = true; // 设置上下文丢失标志
    }

    /**
     * WebGL上下文恢复事件处理函数
     * 当WebGL上下文恢复时被调用
     * @param {Event} event - 上下文恢复事件（未使用）
     */
    function onContextRestore(/* event */) {
      console.log("THREE.WebGLRenderer: Context Restored.");

      _isContextLost = false; // 清除上下文丢失标志

      // 保存当前设置
      const infoAutoReset = info.autoReset;
      const shadowMapEnabled = shadowMap.enabled;
      const shadowMapAutoUpdate = shadowMap.autoUpdate;
      const shadowMapNeedsUpdate = shadowMap.needsUpdate;
      const shadowMapType = shadowMap.type;

      // 重新初始化WebGL上下文
      initGLContext();

      // 恢复之前的设置
      info.autoReset = infoAutoReset;
      shadowMap.enabled = shadowMapEnabled;
      shadowMap.autoUpdate = shadowMapAutoUpdate;
      shadowMap.needsUpdate = shadowMapNeedsUpdate;
      shadowMap.type = shadowMapType;
    }

    /**
     * WebGL上下文创建错误事件处理函数
     * 当WebGL上下文创建失败时被调用
     * @param {Event} event - 上下文创建错误事件
     */
    function onContextCreationError(event) {
      console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ", event.statusMessage);
    }

    /**
     * 材质释放事件处理函数
     * 当材质被释放时被调用，用于清理相关资源
     * @param {Event} event - 材质释放事件
     */
    function onMaterialDispose(event) {
      const material = event.target; // 获取被释放的材质

      // 移除事件监听器，避免内存泄漏
      material.removeEventListener("dispose", onMaterialDispose);

      // 释放材质相关资源
      deallocateMaterial(material);
    }

    // ===== 缓冲区释放相关函数 =====

    /**
     * 释放材质资源
     * 释放与材质相关的所有GPU资源
     * @param {Material} material - 要释放的材质
     */
    function deallocateMaterial(material) {
      // 释放材质的程序引用
      releaseMaterialProgramReferences(material);

      // 从属性管理器中移除材质
      properties.remove(material);
    }

    /**
     * 释放材质的程序引用
     * 释放材质使用的着色器程序
     * @param {Material} material - 要释放程序引用的材质
     */
    function releaseMaterialProgramReferences(material) {
      const programs = properties.get(material).programs;

      if (programs !== undefined) {
        // 遍历并释放所有程序
        programs.forEach(function (program) {
          programCache.releaseProgram(program);
        });

        // 如果是着色器材质，还需要释放着色器缓存
        if (material.isShaderMaterial) {
          programCache.releaseShaderCache(material);
        }
      }
    }

    // ===== 缓冲区渲染 =====

    /**
     * 直接渲染缓冲区
     * 这是一个底层渲染方法，直接渲染几何体的缓冲区数据
     *
     * @param {Camera} camera - 相机对象
     * @param {Scene} scene - 场景对象（可以为null）
     * @param {BufferGeometry} geometry - 几何体
     * @param {Material} material - 材质
     * @param {Object3D} object - 3D对象
     * @param {Object} group - 几何体组（可选）
     */
    this.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
      // 如果场景为null，使用空场景（renderBufferDirect的第二个参数以前是雾效，可能为null）
      if (scene === null) scene = _emptyScene;

      // 检查是否为顺时针正面（通过矩阵行列式判断是否有镜像变换）
      const frontFaceCW = object.isMesh && object.matrixWorld.determinant() < 0;

      // 设置着色器程序
      const program = setProgram(camera, scene, geometry, material, object);

      // 设置材质状态
      state.setMaterial(material, frontFaceCW);

      // ===== 处理索引和线框 =====

      let index = geometry.index; // 几何体索引
      let rangeFactor = 1; // 范围因子

      // 如果材质启用了线框模式
      if (material.wireframe === true) {
        // 获取线框索引属性
        index = geometries.getWireframeAttribute(geometry);

        if (index === undefined) return; // 如果无法获取线框索引，直接返回

        rangeFactor = 2; // 线框模式下范围因子为2
      }

      // ===== 计算绘制范围 =====

      const drawRange = geometry.drawRange; // 几何体绘制范围
      const position = geometry.attributes.position; // 位置属性

      // 计算绘制起始和结束位置
      let drawStart = drawRange.start * rangeFactor;
      let drawEnd = (drawRange.start + drawRange.count) * rangeFactor;

      // 如果指定了组，限制绘制范围到组的范围内
      if (group !== null) {
        drawStart = Math.max(drawStart, group.start * rangeFactor);
        drawEnd = Math.min(drawEnd, (group.start + group.count) * rangeFactor);
      }

      // 根据索引或位置属性限制绘制范围
      if (index !== null) {
        drawStart = Math.max(drawStart, 0);
        drawEnd = Math.min(drawEnd, index.count);
      } else if (position !== undefined && position !== null) {
        drawStart = Math.max(drawStart, 0);
        drawEnd = Math.min(drawEnd, position.count);
      }

      // 计算绘制数量
      const drawCount = drawEnd - drawStart;

      // 如果绘制数量无效，直接返回
      if (drawCount < 0 || drawCount === Infinity) return;

      // ===== 设置绑定状态 =====

      // 设置对象、材质、程序、几何体和索引的绑定状态
      bindingStates.setup(object, material, program, geometry, index);

      let attribute; // 属性对象
      let renderer = bufferRenderer; // 默认使用缓冲区渲染器

      // 如果有索引，使用索引缓冲区渲染器
      if (index !== null) {
        attribute = attributes.get(index); // 获取索引属性
        renderer = indexedBufferRenderer; // 切换到索引渲染器
        renderer.setIndex(attribute); // 设置索引
      }

      // ===== 根据对象类型设置渲染模式 =====

      if (object.isMesh) {
        // 网格对象
        if (material.wireframe === true) {
          // 线框模式
          state.setLineWidth(material.wireframeLinewidth * getTargetPixelRatio());
          renderer.setMode(_gl.LINES); // 设置为线条模式
        } else {
          // 普通模式
          renderer.setMode(_gl.TRIANGLES); // 设置为三角形模式
        }
      } else if (object.isLine) {
        // 线条对象
        let lineWidth = material.linewidth;

        if (lineWidth === undefined) lineWidth = 1; // 如果未使用Line*Material，默认线宽为1

        state.setLineWidth(lineWidth * getTargetPixelRatio());

        if (object.isLineSegments) {
          renderer.setMode(_gl.LINES); // 线段模式
        } else if (object.isLineLoop) {
          renderer.setMode(_gl.LINE_LOOP); // 线环模式
        } else {
          renderer.setMode(_gl.LINE_STRIP); // 线条模式
        }
      } else if (object.isPoints) {
        // 点对象
        renderer.setMode(_gl.POINTS); // 设置为点模式
      } else if (object.isSprite) {
        // 精灵对象
        renderer.setMode(_gl.TRIANGLES); // 精灵使用三角形模式
      }

      // ===== 执行实际渲染 =====

      if (object.isBatchedMesh) {
        // 批量网格对象
        if (object._multiDrawInstances !== null) {
          // @deprecated, r174 - 已弃用的多绘制实例方法
          warnOnce("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection.");
          renderer.renderMultiDrawInstances(object._multiDrawStarts, object._multiDrawCounts, object._multiDrawCount, object._multiDrawInstances);
        } else {
          // 检查是否支持WEBGL_multi_draw扩展
          if (!extensions.get("WEBGL_multi_draw")) {
            // 如果不支持扩展，使用循环方式进行多次绘制
            const starts = object._multiDrawStarts; // 绘制起始位置数组
            const counts = object._multiDrawCounts; // 绘制数量数组
            const drawCount = object._multiDrawCount; // 绘制调用次数
            const bytesPerElement = index ? attributes.get(index).bytesPerElement : 1; // 每个元素的字节数
            const uniforms = properties.get(material).currentProgram.getUniforms(); // 获取uniform变量

            // 循环进行多次绘制调用
            for (let i = 0; i < drawCount; i++) {
              uniforms.setValue(_gl, "_gl_DrawID", i); // 设置绘制ID
              renderer.render(starts[i] / bytesPerElement, counts[i]); // 执行绘制
            }
          } else {
            // 如果支持扩展，使用原生多绘制方法
            renderer.renderMultiDraw(object._multiDrawStarts, object._multiDrawCounts, object._multiDrawCount);
          }
        }
      } else if (object.isInstancedMesh) {
        // 实例化网格对象
        renderer.renderInstances(drawStart, drawCount, object.count);
      } else if (geometry.isInstancedBufferGeometry) {
        // 实例化缓冲区几何体
        const maxInstanceCount = geometry._maxInstanceCount !== undefined ? geometry._maxInstanceCount : Infinity;
        const instanceCount = Math.min(geometry.instanceCount, maxInstanceCount);

        renderer.renderInstances(drawStart, drawCount, instanceCount);
      } else {
        // 普通渲染
        renderer.render(drawStart, drawCount);
      }
    };

    // ===== 编译相关函数 =====

    /**
     * 准备材质
     * 为材质准备着色器程序，处理双面透明材质的特殊情况
     *
     * @param {Material} material - 要准备的材质
     * @param {Scene} scene - 场景对象
     * @param {Object3D} object - 3D对象
     */
    function prepareMaterial(material, scene, object) {
      // 如果是透明的双面材质且未强制单次渲染
      if (material.transparent === true && material.side === DoubleSide && material.forceSinglePass === false) {
        // 先编译背面着色器
        material.side = BackSide; // 设置为背面
        material.needsUpdate = true; // 标记需要更新
        getProgram(material, scene, object); // 获取/编译程序

        // 再编译正面着色器
        material.side = FrontSide; // 设置为正面
        material.needsUpdate = true; // 标记需要更新
        getProgram(material, scene, object); // 获取/编译程序

        // 恢复双面设置
        material.side = DoubleSide; // 恢复为双面
      } else {
        // 普通材质直接编译
        getProgram(material, scene, object);
      }
    }

    /**
     * 编译场景中的所有材质
     * 使用相机编译场景中的所有材质。这对于在首次渲染之前预编译着色器很有用。
     * 如果要将3D对象添加到现有场景中，请使用第三个可选参数来应用目标场景。
     *
     * 注意：在调用此方法之前，必须配置（目标）场景的光照和环境。
     *
     * @param {Object3D} scene - 要预编译的场景或其他类型的3D对象
     * @param {Camera} camera - 相机
     * @param {?Scene} [targetScene=null] - 目标场景
     * @return {Set<Material>} 预编译的材质集合
     */
    this.compile = function (scene, camera, targetScene = null) {
      // 如果没有指定目标场景，使用传入的场景作为目标场景
      if (targetScene === null) targetScene = scene;

      // 获取目标场景的渲染状态
      currentRenderState = renderStates.get(targetScene);
      currentRenderState.init(camera); // 用相机初始化渲染状态

      renderStateStack.push(currentRenderState); // 将渲染状态推入堆栈

      // 从目标场景和将要添加到场景的新对象中收集光源

      // 遍历目标场景中的可见对象
      targetScene.traverseVisible(function (object) {
        // 如果是光源且在相机的图层中可见
        if (object.isLight && object.layers.test(camera.layers)) {
          currentRenderState.pushLight(object); // 添加光源到渲染状态

          // 如果光源投射阴影
          if (object.castShadow) {
            currentRenderState.pushShadow(object); // 添加阴影光源到渲染状态
          }
        }
      });

      // 如果场景与目标场景不同，也遍历场景中的光源
      if (scene !== targetScene) {
        scene.traverseVisible(function (object) {
          if (object.isLight && object.layers.test(camera.layers)) {
            currentRenderState.pushLight(object);

            if (object.castShadow) {
              currentRenderState.pushShadow(object);
            }
          }
        });
      }

      // 设置光照
      currentRenderState.setupLights();

      // 只初始化新场景中的材质，而不是目标场景中的材质

      const materials = new Set(); // 存储材质的集合

      // 遍历场景中的所有对象
      scene.traverse(function (object) {
        // 只处理可渲染的对象类型
        if (!(object.isMesh || object.isPoints || object.isLine || object.isSprite)) {
          return;
        }

        const material = object.material; // 获取对象的材质

        if (material) {
          if (Array.isArray(material)) {
            // 如果材质是数组（多材质对象）
            for (let i = 0; i < material.length; i++) {
              const material2 = material[i];

              prepareMaterial(material2, targetScene, object); // 准备材质
              materials.add(material2); // 添加到材质集合
            }
          } else {
            // 单个材质
            prepareMaterial(material, targetScene, object); // 准备材质
            materials.add(material); // 添加到材质集合
          }
        }
      });

      // 从堆栈中弹出渲染状态
      currentRenderState = renderStateStack.pop();

      return materials; // 返回预编译的材质集合
    };

    // ===== 异步编译 =====

    /**
     * 异步版本的 {@link WebGLRenderer#compile}
     *
     * 此方法利用 `KHR_parallel_shader_compile` WebGL扩展。因此，
     * 建议尽可能使用此版本的 `compile()`。
     *
     * @async
     * @param {Object3D} scene - 要预编译的场景或其他类型的3D对象
     * @param {Camera} camera - 相机
     * @param {?Scene} [targetScene=null] - 目标场景
     * @return {Promise} 一个Promise，当给定场景可以渲染而不会因着色器编译而产生不必要的停顿时解析
     */
    this.compileAsync = function (scene, camera, targetScene = null) {
      // 首先调用同步编译方法
      const materials = this.compile(scene, camera, targetScene);

      // 等待新对象中的所有材质表明它们已准备好使用，然后再解析Promise

      return new Promise((resolve) => {
        /**
         * 检查材质是否准备就绪的函数
         */
        function checkMaterialsReady() {
          // 遍历所有材质
          materials.forEach(function (material) {
            const materialProperties = properties.get(material);
            const program = materialProperties.currentProgram;

            // 如果程序已准备就绪
            if (program.isReady()) {
              // 从列表中移除已准备好使用的程序
              materials.delete(material);
            }
          });

          // 一旦编译材质列表为空，调用回调

          if (materials.size === 0) {
            resolve(scene); // 解析Promise
            return;
          }

          // 如果某些材质仍未准备好，等待一段时间后再次检查

          setTimeout(checkMaterialsReady, 10);
        }

        // 如果支持并行着色器编译扩展
        if (extensions.get("KHR_parallel_shader_compile") !== null) {
          // 如果我们可以在不阻塞的情况下检查材质的编译状态，则立即执行

          checkMaterialsReady();
        } else {
          // 否则，首先等待一段时间，让我们刚刚初始化的材质有机会完成

          setTimeout(checkMaterialsReady, 10);
        }
      });
    };

    // ===== 动画循环 =====

    let onAnimationFrameCallback = null; // 动画帧回调函数

    /**
     * 动画帧处理函数
     * @param {number} time - 时间戳
     */
    function onAnimationFrame(time) {
      if (onAnimationFrameCallback) onAnimationFrameCallback(time);
    }

    /**
     * XR会话开始事件处理函数
     * 当XR会话开始时停止常规动画循环
     */
    function onXRSessionStart() {
      animation.stop();
    }

    /**
     * XR会话结束事件处理函数
     * 当XR会话结束时重新启动常规动画循环
     */
    function onXRSessionEnd() {
      animation.start();
    }

    // 创建动画管理器
    const animation = new WebGLAnimation();
    animation.setAnimationLoop(onAnimationFrame); // 设置动画循环回调

    // 如果在Web Worker环境中，设置上下文
    if (typeof self !== "undefined") animation.setContext(self);

    /**
     * 设置动画循环回调函数
     * @param {Function} callback - 动画回调函数，传入null停止动画
     */
    this.setAnimationLoop = function (callback) {
      onAnimationFrameCallback = callback; // 设置回调函数
      xr.setAnimationLoop(callback); // 同时设置XR动画循环

      // 根据回调是否为null来启动或停止动画
      callback === null ? animation.stop() : animation.start();
    };

    // 添加XR事件监听器
    xr.addEventListener("sessionstart", onXRSessionStart);
    xr.addEventListener("sessionend", onXRSessionEnd);

    // ===== 渲染相关方法 =====

    /**
     * 渲染方法 - 使用给定的相机渲染给定的场景（或其他类型的3D对象）
     *
     * 渲染会输出到之前通过调用 {@link WebGLRenderer#setRenderTarget} 指定的渲染目标，
     * 或者像往常一样输出到canvas。
     *
     * 默认情况下，渲染缓冲区在渲染前会被清除，但你可以通过将 `autoClear` 属性设置为 `false` 来阻止这种行为。
     * 如果你只想阻止某些缓冲区被清除，可以将 `autoClearColor`、`autoClearDepth` 或 `autoClearStencil` 设置为 `false`。
     * 要强制清除，请使用 {@link WebGLRenderer#clear}。
     *
     * @param {Object3D} scene - 要渲染的场景
     * @param {Camera} camera - 相机
     */
    this.render = function (scene, camera) {
      // ===== 参数验证 =====
      // 检查相机参数是否有效
      if (camera !== undefined && camera.isCamera !== true) {
        console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");
        return;
      }

      // 如果WebGL上下文丢失，直接返回
      if (_isContextLost === true) return;

      // ===== 更新场景图 =====
      // 如果场景启用了自动更新世界矩阵，则更新场景的世界矩阵
      if (scene.matrixWorldAutoUpdate === true) scene.updateMatrixWorld();

      // ===== 更新相机矩阵和视锥体 =====
      // 如果相机没有父对象且启用了自动更新世界矩阵，则更新相机的世界矩阵
      if (camera.parent === null && camera.matrixWorldAutoUpdate === true) camera.updateMatrixWorld();

      // ===== WebXR处理 =====
      // 如果启用了XR且正在呈现XR内容
      if (xr.enabled === true && xr.isPresenting === true) {
        // 如果启用了相机自动更新，则更新XR相机
        if (xr.cameraAutoUpdate === true) xr.updateCamera(camera);

        camera = xr.getCamera(); // 使用XR相机进行渲染
      }

      // ===== 场景渲染前回调 =====
      // 如果是场景对象，调用渲染前回调
      if (scene.isScene === true) scene.onBeforeRender(_this, scene, camera, _currentRenderTarget);

      // ===== 初始化渲染状态 =====
      // 获取或创建当前场景的渲染状态
      currentRenderState = renderStates.get(scene, renderStateStack.length);
      currentRenderState.init(camera); // 用相机初始化渲染状态

      renderStateStack.push(currentRenderState); // 将渲染状态推入堆栈

      // ===== 计算投影屏幕矩阵和视锥体 =====
      // 计算投影屏幕矩阵（投影矩阵 × 视图矩阵的逆矩阵）
      _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      // 从投影矩阵设置视锥体，用于视锥体裁剪
      _frustum.setFromProjectionMatrix(_projScreenMatrix, WebGLCoordinateSystem, camera.reversedDepth);

      // ===== 初始化裁剪 =====
      _localClippingEnabled = this.localClippingEnabled; // 获取局部裁剪设置
      _clippingEnabled = clipping.init(this.clippingPlanes, _localClippingEnabled); // 初始化裁剪平面

      // ===== 初始化渲染列表 =====
      // 获取或创建当前场景的渲染列表
      currentRenderList = renderLists.get(scene, renderListStack.length);
      currentRenderList.init(); // 初始化渲染列表

      renderListStack.push(currentRenderList); // 将渲染列表推入堆栈

      // ===== XR深度感知处理 =====
      if (xr.enabled === true && xr.isPresenting === true) {
        // 获取XR深度感知网格
        const depthSensingMesh = _this.xr.getDepthSensingMesh();

        if (depthSensingMesh !== null) {
          // 将深度感知网格投影到渲染列表中，使用负无穷大的组顺序确保最先渲染
          projectObject(depthSensingMesh, camera, -Infinity, _this.sortObjects);
        }
      }

      // ===== 投影场景对象 =====
      // 将场景中的所有对象投影到渲染列表中
      projectObject(scene, camera, 0, _this.sortObjects);

      // 完成渲染列表的构建
      currentRenderList.finish();

      // ===== 对象排序 =====
      // 如果启用了对象排序，对渲染列表进行排序
      if (_this.sortObjects === true) {
        currentRenderList.sort(_opaqueSort, _transparentSort);
      }

      // ===== 背景渲染处理 =====
      // 确定是否需要渲染背景
      _renderBackground = xr.enabled === false || xr.isPresenting === false || xr.hasDepthSensing() === false;
      if (_renderBackground) {
        // 将背景添加到渲染列表中
        background.addToRenderList(currentRenderList, scene);
      }

      // ===== 渲染统计和阴影处理 =====

      // 增加帧计数器
      this.info.render.frame++;

      // 如果启用了裁剪，开始阴影渲染
      if (_clippingEnabled === true) clipping.beginShadows();

      // 获取阴影数组
      const shadowsArray = currentRenderState.state.shadowsArray;

      // 渲染阴影贴图
      shadowMap.render(shadowsArray, scene, camera);

      // 如果启用了裁剪，结束阴影渲染
      if (_clippingEnabled === true) clipping.endShadows();

      // ===== 渲染信息重置 =====

      // 如果启用了自动重置，重置渲染信息
      if (this.info.autoReset === true) this.info.reset();

      // ===== 渲染场景 =====

      // 获取不透明和透射对象列表
      const opaqueObjects = currentRenderList.opaque;
      const transmissiveObjects = currentRenderList.transmissive;

      // 设置光照
      currentRenderState.setupLights();

      // 处理数组相机（多视口渲染）
      if (camera.isArrayCamera) {
        const cameras = camera.cameras;

        // 如果有透射对象，为每个相机渲染透射通道
        if (transmissiveObjects.length > 0) {
          for (let i = 0, l = cameras.length; i < l; i++) {
            const camera2 = cameras[i];

            renderTransmissionPass(opaqueObjects, transmissiveObjects, scene, camera2);
          }
        }

        // 如果需要渲染背景
        if (_renderBackground) background.render(scene);

        // 为每个相机渲染场景
        for (let i = 0, l = cameras.length; i < l; i++) {
          const camera2 = cameras[i];

          renderScene(currentRenderList, scene, camera2, camera2.viewport);
        }
      } else {
        // 单相机渲染
        // 如果有透射对象，渲染透射通道
        if (transmissiveObjects.length > 0) renderTransmissionPass(opaqueObjects, transmissiveObjects, scene, camera);

        // 如果需要渲染背景
        if (_renderBackground) background.render(scene);

        // 渲染场景
        renderScene(currentRenderList, scene, camera);
      }

      // ===== 后处理 =====

      // 如果有当前渲染目标且mipmap级别为0
      if (_currentRenderTarget !== null && _currentActiveMipmapLevel === 0) {
        // 如果需要，将多重采样渲染缓冲区解析为单采样纹理
        textures.updateMultisampleRenderTarget(_currentRenderTarget);

        // 如果使用任何类型的mipmap过滤，生成mipmap
        textures.updateRenderTargetMipmap(_currentRenderTarget);
      }

      // ===== 渲染后回调和清理 =====

      // 如果是场景对象，调用渲染后回调
      if (scene.isScene === true) scene.onAfterRender(_this, scene, camera);

      // _gl.finish(); // 可选的WebGL完成调用（已注释）

      // 重置绑定状态
      bindingStates.resetDefaultState();
      _currentMaterialId = -1; // 重置当前材质ID
      _currentCamera = null; // 重置当前相机

      // ===== 堆栈管理 =====

      // 从渲染状态堆栈中弹出
      renderStateStack.pop();

      if (renderStateStack.length > 0) {
        // 如果堆栈中还有渲染状态，恢复上一个状态
        currentRenderState = renderStateStack[renderStateStack.length - 1];

        // 如果启用了裁剪，设置全局裁剪状态
        if (_clippingEnabled === true) clipping.setGlobalState(_this.clippingPlanes, currentRenderState.state.camera);
      } else {
        // 如果堆栈为空，清空当前渲染状态
        currentRenderState = null;
      }

      // 从渲染列表堆栈中弹出
      renderListStack.pop();

      if (renderListStack.length > 0) {
        // 如果堆栈中还有渲染列表，恢复上一个列表
        currentRenderList = renderListStack[renderListStack.length - 1];
      } else {
        // 如果堆栈为空，清空当前渲染列表
        currentRenderList = null;
      }
    };

    /**
     * 投影对象到渲染列表
     * 递归遍历场景图，将可见对象添加到渲染列表中
     *
     * @param {Object3D} object - 要投影的3D对象
     * @param {Camera} camera - 相机
     * @param {number} groupOrder - 组渲染顺序
     * @param {boolean} sortObjects - 是否对对象进行排序
     */
    function projectObject(object, camera, groupOrder, sortObjects) {
      // 如果对象不可见，直接返回
      if (object.visible === false) return;

      // 检查对象是否在相机的图层中可见
      const visible = object.layers.test(camera.layers);

      if (visible) {
        if (object.isGroup) {
          // 如果是组对象，更新组的渲染顺序
          groupOrder = object.renderOrder;
        } else if (object.isLOD) {
          // 如果是LOD（细节层次）对象，且启用了自动更新，则更新LOD
          if (object.autoUpdate === true) object.update(camera);
        } else if (object.isLight) {
          // 如果是光源，添加到渲染状态的光源列表
          currentRenderState.pushLight(object);

          // 如果光源投射阴影，添加到阴影列表
          if (object.castShadow) {
            currentRenderState.pushShadow(object);
          }
        } else if (object.isSprite) {
          // 如果是精灵对象
          // 检查是否需要视锥体裁剪，或者精灵是否与视锥体相交
          if (!object.frustumCulled || _frustum.intersectsSprite(object)) {
            // 如果需要排序，计算精灵在屏幕空间的位置
            if (sortObjects) {
              _vector4.setFromMatrixPosition(object.matrixWorld).applyMatrix4(_projScreenMatrix);
            }

            // 更新几何体
            const geometry = objects.update(object);
            const material = object.material;

            // 如果材质可见，添加到渲染列表
            if (material.visible) {
              currentRenderList.push(object, geometry, material, groupOrder, _vector4.z, null);
            }
          }
        } else if (object.isMesh || object.isLine || object.isPoints) {
          // 如果是网格、线条或点对象
          // 检查是否需要视锥体裁剪，或者对象是否与视锥体相交
          if (!object.frustumCulled || _frustum.intersectsObject(object)) {
            // 更新几何体
            const geometry = objects.update(object);
            const material = object.material;

            // 如果需要排序，计算对象的深度值
            if (sortObjects) {
              if (object.boundingSphere !== undefined) {
                // 如果对象有包围球，使用对象的包围球
                if (object.boundingSphere === null) object.computeBoundingSphere();
                _vector4.copy(object.boundingSphere.center);
              } else {
                // 否则使用几何体的包围球
                if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
                _vector4.copy(geometry.boundingSphere.center);
              }

              // 将包围球中心转换到屏幕空间
              _vector4.applyMatrix4(object.matrixWorld).applyMatrix4(_projScreenMatrix);
            }

            if (Array.isArray(material)) {
              // 如果材质是数组（多材质对象）
              const groups = geometry.groups;

              // 遍历几何体的每个组
              for (let i = 0, l = groups.length; i < l; i++) {
                const group = groups[i];
                const groupMaterial = material[group.materialIndex];

                // 如果组材质存在且可见，添加到渲染列表
                if (groupMaterial && groupMaterial.visible) {
                  currentRenderList.push(object, geometry, groupMaterial, groupOrder, _vector4.z, group);
                }
              }
            } else if (material.visible) {
              // 如果是单个材质且可见，添加到渲染列表
              currentRenderList.push(object, geometry, material, groupOrder, _vector4.z, null);
            }
          }
        }
      }

      // 递归处理子对象
      const children = object.children;

      for (let i = 0, l = children.length; i < l; i++) {
        projectObject(children[i], camera, groupOrder, sortObjects);
      }
    }

    /**
     * 渲染场景
     * 按照正确的顺序渲染不透明、透射和透明对象
     *
     * @param {RenderList} currentRenderList - 当前渲染列表
     * @param {Scene} scene - 场景对象
     * @param {Camera} camera - 相机
     * @param {Vector4} viewport - 视口（可选）
     */
    function renderScene(currentRenderList, scene, camera, viewport) {
      // 获取不同类型的对象列表
      const opaqueObjects = currentRenderList.opaque; // 不透明对象
      const transmissiveObjects = currentRenderList.transmissive; // 透射对象
      const transparentObjects = currentRenderList.transparent; // 透明对象

      // 为当前相机设置光照视图
      currentRenderState.setupLightsView(camera);

      // 如果启用了裁剪，设置全局裁剪状态
      if (_clippingEnabled === true) clipping.setGlobalState(_this.clippingPlanes, camera);

      // 如果指定了视口，设置视口
      if (viewport) state.viewport(_currentViewport.copy(viewport));

      // 按顺序渲染不同类型的对象
      if (opaqueObjects.length > 0) renderObjects(opaqueObjects, scene, camera); // 先渲染不透明对象
      if (transmissiveObjects.length > 0) renderObjects(transmissiveObjects, scene, camera); // 再渲染透射对象
      if (transparentObjects.length > 0) renderObjects(transparentObjects, scene, camera); // 最后渲染透明对象

      // 确保深度缓冲区写入已启用，以便在下次渲染时可以清除

      state.buffers.depth.setTest(true); // 启用深度测试
      state.buffers.depth.setMask(true); // 启用深度写入
      state.buffers.color.setMask(true); // 启用颜色写入

      state.setPolygonOffset(false); // 禁用多边形偏移
    }

    /**
     * 渲染透射通道
     * 为透射材质渲染不透明对象到专用的渲染目标中，用于透射效果
     *
     * @param {Array} opaqueObjects - 不透明对象列表
     * @param {Array} transmissiveObjects - 透射对象列表
     * @param {Scene} scene - 场景对象
     * @param {Camera} camera - 相机对象
     */
    function renderTransmissionPass(opaqueObjects, transmissiveObjects, scene, camera) {
      // 获取场景的覆盖材质
      const overrideMaterial = scene.isScene === true ? scene.overrideMaterial : null;

      // 如果有覆盖材质，跳过透射渲染
      if (overrideMaterial !== null) {
        return;
      }

      // ===== 确保透射渲染目标已配置 =====
      if (currentRenderState.state.transmissionRenderTarget[camera.id] === undefined) {
        // 创建透射渲染目标
        currentRenderState.state.transmissionRenderTarget[camera.id] = new WebGLRenderTarget(1, 1, {
          generateMipmaps: true, // 生成mipmap
          // 根据扩展支持选择纹理类型：半精度浮点数或无符号字节
          type: extensions.has("EXT_color_buffer_half_float") || extensions.has("EXT_color_buffer_float") ? HalfFloatType : UnsignedByteType,
          minFilter: LinearMipmapLinearFilter, // 线性mipmap过滤
          samples: 4, // 4倍多重采样
          stencilBuffer: stencil, // 模板缓冲区设置
          resolveDepthBuffer: false, // 不解析深度缓冲区
          resolveStencilBuffer: false, // 不解析模板缓冲区
          colorSpace: ColorManagement.workingColorSpace, // 使用工作颜色空间
        });

        // ===== 调试代码（已注释） =====
        // 用于调试透射渲染目标的代码
        /*
				const geometry = new PlaneGeometry();
				const material = new MeshBasicMaterial( { map: _transmissionRenderTarget.texture } );

				const mesh = new Mesh( geometry, material );
				scene.add( mesh );
				*/
      }

      // 获取透射渲染目标
      const transmissionRenderTarget = currentRenderState.state.transmissionRenderTarget[camera.id];

      // 获取活动视口并设置透射渲染目标尺寸
      const activeViewport = camera.viewport || _currentViewport;
      transmissionRenderTarget.setSize(activeViewport.z * _this.transmissionResolutionScale, activeViewport.w * _this.transmissionResolutionScale);

      // ===== 保存当前渲染状态 =====

      const currentRenderTarget = _this.getRenderTarget(); // 当前渲染目标
      const currentActiveCubeFace = _this.getActiveCubeFace(); // 当前活动立方体面
      const currentActiveMipmapLevel = _this.getActiveMipmapLevel(); // 当前活动mipmap级别

      // 设置透射渲染目标
      _this.setRenderTarget(transmissionRenderTarget);

      // ===== 设置清除颜色 =====
      _this.getClearColor(_currentClearColor); // 获取当前清除颜色
      _currentClearAlpha = _this.getClearAlpha(); // 获取当前清除alpha
      if (_currentClearAlpha < 1) _this.setClearColor(0xffffff, 0.5); // 如果alpha小于1，设置为半透明白色

      // 清除渲染目标
      _this.clear();

      // 如果需要渲染背景，渲染背景
      if (_renderBackground) background.render(scene);

      // ===== 关闭可能影响不透明对象片段颜色的功能 =====
      // 否则它们会在不透明对象通道和透射对象通道中被应用两次
      const currentToneMapping = _this.toneMapping; // 保存当前色调映射
      _this.toneMapping = NoToneMapping; // 禁用色调映射

      // ===== 处理相机视口 =====
      // 从相机中移除视口以避免嵌套渲染调用将视口重置为它（例如Reflector）
      // 透射渲染通道要求视口与transmissionRenderTarget匹配
      const currentCameraViewport = camera.viewport;
      if (camera.viewport !== undefined) camera.viewport = undefined;

      // 为相机设置光照视图
      currentRenderState.setupLightsView(camera);

      // 如果启用了裁剪，设置全局裁剪状态
      if (_clippingEnabled === true) clipping.setGlobalState(_this.clippingPlanes, camera);

      // 渲染不透明对象到透射目标
      renderObjects(opaqueObjects, scene, camera);

      // 更新多重采样渲染目标和mipmap
      textures.updateMultisampleRenderTarget(transmissionRenderTarget);
      textures.updateRenderTargetMipmap(transmissionRenderTarget);

      if (extensions.has("WEBGL_multisampled_render_to_texture") === false) {
        // see #28131

        let renderTargetNeedsUpdate = false;

        for (let i = 0, l = transmissiveObjects.length; i < l; i++) {
          const renderItem = transmissiveObjects[i];

          const object = renderItem.object;
          const geometry = renderItem.geometry;
          const material = renderItem.material;
          const group = renderItem.group;

          if (material.side === DoubleSide && object.layers.test(camera.layers)) {
            const currentSide = material.side;

            material.side = BackSide;
            material.needsUpdate = true;

            renderObject(object, scene, camera, geometry, material, group);

            material.side = currentSide;
            material.needsUpdate = true;

            renderTargetNeedsUpdate = true;
          }
        }

        if (renderTargetNeedsUpdate === true) {
          textures.updateMultisampleRenderTarget(transmissionRenderTarget);
          textures.updateRenderTargetMipmap(transmissionRenderTarget);
        }
      }

      _this.setRenderTarget(currentRenderTarget, currentActiveCubeFace, currentActiveMipmapLevel);

      _this.setClearColor(_currentClearColor, _currentClearAlpha);

      if (currentCameraViewport !== undefined) camera.viewport = currentCameraViewport;

      _this.toneMapping = currentToneMapping;
    }

    /**
     * 渲染对象列表
     * 遍历渲染列表中的所有对象并逐个渲染
     *
     * @param {Array} renderList - 要渲染的对象列表
     * @param {Scene} scene - 场景对象
     * @param {Camera} camera - 相机对象
     */
    function renderObjects(renderList, scene, camera) {
      // 获取场景的覆盖材质（如果存在）
      const overrideMaterial = scene.isScene === true ? scene.overrideMaterial : null;

      // 遍历渲染列表中的所有对象
      for (let i = 0, l = renderList.length; i < l; i++) {
        const renderItem = renderList[i];

        // 从渲染项中提取对象信息
        const object = renderItem.object; // 3D对象
        const geometry = renderItem.geometry; // 几何体
        const group = renderItem.group; // 几何体组（可选）
        let material = renderItem.material; // 材质

        // 如果材质允许覆盖且存在覆盖材质，使用覆盖材质
        if (material.allowOverride === true && overrideMaterial !== null) {
          material = overrideMaterial;
        }

        // 只渲染在相机图层中可见的对象
        if (object.layers.test(camera.layers)) {
          renderObject(object, scene, camera, geometry, material, group);
        }
      }
    }

    /**
     * 渲染单个对象
     * 处理单个3D对象的渲染，包括矩阵计算、材质处理和双面渲染
     *
     * @param {Object3D} object - 要渲染的3D对象
     * @param {Scene} scene - 场景对象
     * @param {Camera} camera - 相机对象
     * @param {BufferGeometry} geometry - 几何体
     * @param {Material} material - 材质
     * @param {Object} group - 几何体组（可选）
     */
    function renderObject(object, scene, camera, geometry, material, group) {
      // 调用对象的渲染前回调
      object.onBeforeRender(_this, scene, camera, geometry, material, group);

      // ===== 计算变换矩阵 =====
      // 计算模型视图矩阵（视图矩阵的逆 × 对象的世界矩阵）
      object.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld);
      // 从模型视图矩阵计算法线矩阵
      object.normalMatrix.getNormalMatrix(object.modelViewMatrix);

      // 调用材质的渲染前回调
      material.onBeforeRender(_this, scene, camera, geometry, object, group);

      // ===== 处理透明双面材质的特殊渲染 =====
      if (material.transparent === true && material.side === DoubleSide && material.forceSinglePass === false) {
        // 透明双面材质需要分两次渲染以正确处理透明度

        // 第一次：渲染背面
        material.side = BackSide;
        material.needsUpdate = true;
        _this.renderBufferDirect(camera, scene, geometry, material, object, group);

        // 第二次：渲染正面
        material.side = FrontSide;
        material.needsUpdate = true;
        _this.renderBufferDirect(camera, scene, geometry, material, object, group);

        // 恢复双面设置
        material.side = DoubleSide;
      } else {
        // 普通渲染：单次渲染调用
        _this.renderBufferDirect(camera, scene, geometry, material, object, group);
      }

      // 调用对象的渲染后回调
      object.onAfterRender(_this, scene, camera, geometry, material, group);
    }

    /**
     * 获取着色器程序
     * 为给定的材质、场景和对象获取或创建合适的着色器程序
     *
     * @param {Material} material - 材质对象
     * @param {Scene} scene - 场景对象
     * @param {Object3D} object - 3D对象
     * @returns {WebGLProgram} 着色器程序
     */
    function getProgram(material, scene, object) {
      // 如果不是场景对象，使用空场景（scene可能是Mesh、Line、Points等）
      if (scene.isScene !== true) scene = _emptyScene;

      // 获取材质属性
      const materialProperties = properties.get(material);

      // 获取当前渲染状态的光照和阴影信息
      const lights = currentRenderState.state.lights;
      const shadowsArray = currentRenderState.state.shadowsArray;

      // 获取光照状态版本号
      const lightsStateVersion = lights.state.version;

      // 获取程序参数和缓存键
      const parameters = programCache.getParameters(material, lights.state, shadowsArray, scene, object);
      const programCacheKey = programCache.getProgramCacheKey(parameters);

      // 获取材质的程序映射
      let programs = materialProperties.programs;

      // ===== 始终更新环境和雾效 =====
      // 改变这些会触发getProgram调用，但程序可能不会改变

      // 设置环境贴图（只有标准材质使用场景环境）
      materialProperties.environment = material.isMeshStandardMaterial ? scene.environment : null;
      // 设置雾效
      materialProperties.fog = scene.fog;
      // 设置环境贴图（根据材质类型选择立方体贴图管理器）
      materialProperties.envMap = (material.isMeshStandardMaterial ? cubeuvmaps : cubemaps).get(material.envMap || materialProperties.environment);
      // 设置环境贴图旋转
      materialProperties.envMapRotation = materialProperties.environment !== null && material.envMap === null ? scene.environmentRotation : material.envMapRotation;

      if (programs === undefined) {
        // new material

        material.addEventListener("dispose", onMaterialDispose);

        programs = new Map();
        materialProperties.programs = programs;
      }

      let program = programs.get(programCacheKey);

      if (program !== undefined) {
        // early out if program and light state is identical

        if (materialProperties.currentProgram === program && materialProperties.lightsStateVersion === lightsStateVersion) {
          updateCommonMaterialProperties(material, parameters);

          return program;
        }
      } else {
        parameters.uniforms = programCache.getUniforms(material);

        material.onBeforeCompile(parameters, _this);

        program = programCache.acquireProgram(parameters, programCacheKey);
        programs.set(programCacheKey, program);

        materialProperties.uniforms = parameters.uniforms;
      }

      const uniforms = materialProperties.uniforms;

      if ((!material.isShaderMaterial && !material.isRawShaderMaterial) || material.clipping === true) {
        uniforms.clippingPlanes = clipping.uniform;
      }

      updateCommonMaterialProperties(material, parameters);

      // store the light setup it was created for

      materialProperties.needsLights = materialNeedsLights(material);
      materialProperties.lightsStateVersion = lightsStateVersion;

      if (materialProperties.needsLights) {
        // wire up the material to this renderer's lighting state

        uniforms.ambientLightColor.value = lights.state.ambient;
        uniforms.lightProbe.value = lights.state.probe;
        uniforms.directionalLights.value = lights.state.directional;
        uniforms.directionalLightShadows.value = lights.state.directionalShadow;
        uniforms.spotLights.value = lights.state.spot;
        uniforms.spotLightShadows.value = lights.state.spotShadow;
        uniforms.rectAreaLights.value = lights.state.rectArea;
        uniforms.ltc_1.value = lights.state.rectAreaLTC1;
        uniforms.ltc_2.value = lights.state.rectAreaLTC2;
        uniforms.pointLights.value = lights.state.point;
        uniforms.pointLightShadows.value = lights.state.pointShadow;
        uniforms.hemisphereLights.value = lights.state.hemi;

        uniforms.directionalShadowMap.value = lights.state.directionalShadowMap;
        uniforms.directionalShadowMatrix.value = lights.state.directionalShadowMatrix;
        uniforms.spotShadowMap.value = lights.state.spotShadowMap;
        uniforms.spotLightMatrix.value = lights.state.spotLightMatrix;
        uniforms.spotLightMap.value = lights.state.spotLightMap;
        uniforms.pointShadowMap.value = lights.state.pointShadowMap;
        uniforms.pointShadowMatrix.value = lights.state.pointShadowMatrix;
        // TODO (abelnation): add area lights shadow info to uniforms
      }

      materialProperties.currentProgram = program;
      materialProperties.uniformsList = null;

      return program;
    }

    /**
     * 获取uniform变量列表
     * 为材质属性获取或创建uniform变量列表，用于高效的uniform更新
     *
     * @param {Object} materialProperties - 材质属性对象
     * @returns {Array} uniform变量列表
     */
    function getUniformList(materialProperties) {
      // 如果uniform列表尚未创建，创建它
      if (materialProperties.uniformsList === null) {
        // 从当前程序获取uniform变量
        const progUniforms = materialProperties.currentProgram.getUniforms();
        // 创建带值的uniform序列，用于高效更新
        materialProperties.uniformsList = WebGLUniforms.seqWithValue(progUniforms.seq, materialProperties.uniforms);
      }

      // 返回缓存的uniform列表
      return materialProperties.uniformsList;
    }

    /**
     * 更新通用材质属性
     * 从着色器参数更新材质属性，用于缓存和优化
     *
     * @param {Material} material - 材质对象
     * @param {Object} parameters - 着色器参数对象
     */
    function updateCommonMaterialProperties(material, parameters) {
      // 获取材质属性对象
      const materialProperties = properties.get(material);

      // ===== 更新各种材质属性 =====
      materialProperties.outputColorSpace = parameters.outputColorSpace; // 输出颜色空间
      materialProperties.batching = parameters.batching; // 批处理
      materialProperties.batchingColor = parameters.batchingColor; // 批处理颜色
      materialProperties.instancing = parameters.instancing; // 实例化
      materialProperties.instancingColor = parameters.instancingColor; // 实例化颜色
      materialProperties.instancingMorph = parameters.instancingMorph; // 实例化变形
      materialProperties.skinning = parameters.skinning; // 骨骼动画
      materialProperties.morphTargets = parameters.morphTargets; // 变形目标
      materialProperties.morphNormals = parameters.morphNormals; // 变形法线
      materialProperties.morphColors = parameters.morphColors; // 变形颜色
      materialProperties.morphTargetsCount = parameters.morphTargetsCount; // 变形目标数量
      materialProperties.numClippingPlanes = parameters.numClippingPlanes; // 裁剪平面数量
      materialProperties.numIntersection = parameters.numClipIntersection; // 裁剪交集数量
      materialProperties.vertexAlphas = parameters.vertexAlphas; // 顶点alpha
      materialProperties.vertexTangents = parameters.vertexTangents; // 顶点切线
      materialProperties.toneMapping = parameters.toneMapping; // 色调映射
    }

    /**
     * 设置着色器程序
     * 为给定的材质、几何体和对象设置合适的着色器程序
     *
     * @param {Camera} camera - 相机
     * @param {Scene} scene - 场景
     * @param {BufferGeometry} geometry - 几何体
     * @param {Material} material - 材质
     * @param {Object3D} object - 3D对象
     * @returns {WebGLProgram} 着色器程序
     */
    function setProgram(camera, scene, geometry, material, object) {
      // 如果不是场景对象，使用空场景（scene可能是Mesh、Line、Points等）
      if (scene.isScene !== true) scene = _emptyScene;

      // 重置纹理单元
      textures.resetTextureUnits();

      // ===== 收集渲染参数 =====
      const fog = scene.fog; // 场景雾效
      const environment = material.isMeshStandardMaterial ? scene.environment : null; // 环境贴图
      // 确定颜色空间
      const colorSpace =
        _currentRenderTarget === null ? _this.outputColorSpace : _currentRenderTarget.isXRRenderTarget === true ? _currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace;
      // 获取环境贴图
      const envMap = (material.isMeshStandardMaterial ? cubeuvmaps : cubemaps).get(material.envMap || environment);
      // 检查是否使用顶点alpha（需要4分量颜色属性）
      const vertexAlphas = material.vertexColors === true && !!geometry.attributes.color && geometry.attributes.color.itemSize === 4;
      // 检查是否使用顶点切线（法线贴图或各向异性需要）
      const vertexTangents = !!geometry.attributes.tangent && (!!material.normalMap || material.anisotropy > 0);
      // 检查变形目标
      const morphTargets = !!geometry.morphAttributes.position; // 位置变形
      const morphNormals = !!geometry.morphAttributes.normal; // 法线变形
      const morphColors = !!geometry.morphAttributes.color; // 颜色变形

      // ===== 色调映射设置 =====
      let toneMapping = NoToneMapping;

      if (material.toneMapped) {
        // 只有在渲染到屏幕或XR渲染目标时才应用色调映射
        if (_currentRenderTarget === null || _currentRenderTarget.isXRRenderTarget === true) {
          toneMapping = _this.toneMapping;
        }
      }

      // 计算变形目标数量
      const morphAttribute = geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color;
      const morphTargetsCount = morphAttribute !== undefined ? morphAttribute.length : 0;

      // 获取材质属性和光照状态
      const materialProperties = properties.get(material);
      const lights = currentRenderState.state.lights;

      // ===== 裁剪处理 =====
      if (_clippingEnabled === true) {
        if (_localClippingEnabled === true || camera !== _currentCamera) {
          const useCache = camera === _currentCamera && material.id === _currentMaterialId;

          // 我们可能希望使用某个ClippingGroup对象而不是材质来调用此函数，
          // 一旦这变得可行（#8465, #8379）
          clipping.setState(material, camera, useCache);
        }
      }

      // ===== 检查是否需要更换着色器程序 =====

      let needsProgramChange = false; // 是否需要更换程序的标志

      // 如果材质版本与缓存版本相同，检查各种状态是否发生变化
      if (material.version === materialProperties.__version) {
        // 检查光照状态是否变化
        if (materialProperties.needsLights && materialProperties.lightsStateVersion !== lights.state.version) {
          needsProgramChange = true;
        }
        // 检查输出颜色空间是否变化
        else if (materialProperties.outputColorSpace !== colorSpace) {
          needsProgramChange = true;
        }
        // 检查批量网格状态变化
        else if (object.isBatchedMesh && materialProperties.batching === false) {
          needsProgramChange = true;
        } else if (!object.isBatchedMesh && materialProperties.batching === true) {
          needsProgramChange = true;
        }
        // 检查批量网格颜色纹理状态变化
        else if (object.isBatchedMesh && materialProperties.batchingColor === true && object.colorTexture === null) {
          needsProgramChange = true;
        } else if (object.isBatchedMesh && materialProperties.batchingColor === false && object.colorTexture !== null) {
          needsProgramChange = true;
        }
        // 检查实例化网格状态变化
        else if (object.isInstancedMesh && materialProperties.instancing === false) {
          needsProgramChange = true;
        } else if (!object.isInstancedMesh && materialProperties.instancing === true) {
          needsProgramChange = true;
        }
        // 检查骨骼网格状态变化
        else if (object.isSkinnedMesh && materialProperties.skinning === false) {
          needsProgramChange = true;
        } else if (!object.isSkinnedMesh && materialProperties.skinning === true) {
          needsProgramChange = true;
        }
        // 检查实例化颜色状态变化
        else if (object.isInstancedMesh && materialProperties.instancingColor === true && object.instanceColor === null) {
          needsProgramChange = true;
        } else if (object.isInstancedMesh && materialProperties.instancingColor === false && object.instanceColor !== null) {
          needsProgramChange = true;
        }
        // 检查实例化变形状态变化
        else if (object.isInstancedMesh && materialProperties.instancingMorph === true && object.morphTexture === null) {
          needsProgramChange = true;
        } else if (object.isInstancedMesh && materialProperties.instancingMorph === false && object.morphTexture !== null) {
          needsProgramChange = true;
        }
        // 检查环境贴图变化
        else if (materialProperties.envMap !== envMap) {
          needsProgramChange = true;
        }
        // 检查雾效变化
        else if (material.fog === true && materialProperties.fog !== fog) {
          needsProgramChange = true;
        }
        // 检查裁剪平面数量变化
        else if (
          materialProperties.numClippingPlanes !== undefined &&
          (materialProperties.numClippingPlanes !== clipping.numPlanes || materialProperties.numIntersection !== clipping.numIntersection)
        ) {
          needsProgramChange = true;
        }
        // 检查顶点alpha状态变化
        else if (materialProperties.vertexAlphas !== vertexAlphas) {
          needsProgramChange = true;
        }
        // 检查顶点切线状态变化
        else if (materialProperties.vertexTangents !== vertexTangents) {
          needsProgramChange = true;
        }
        // 检查变形目标状态变化
        else if (materialProperties.morphTargets !== morphTargets) {
          needsProgramChange = true;
        } else if (materialProperties.morphNormals !== morphNormals) {
          needsProgramChange = true;
        } else if (materialProperties.morphColors !== morphColors) {
          needsProgramChange = true;
        }
        // 检查色调映射变化
        else if (materialProperties.toneMapping !== toneMapping) {
          needsProgramChange = true;
        }
        // 检查变形目标数量变化
        else if (materialProperties.morphTargetsCount !== morphTargetsCount) {
          needsProgramChange = true;
        }
      } else {
        // 如果材质版本不同，必须更换程序
        needsProgramChange = true;
        materialProperties.__version = material.version; // 更新版本号
      }

      // ===== 获取或创建着色器程序 =====

      let program = materialProperties.currentProgram; // 获取当前程序

      // 如果需要更换程序，获取新程序
      if (needsProgramChange === true) {
        program = getProgram(material, scene, object);
      }

      // ===== 刷新标志 =====
      let refreshProgram = false; // 是否需要刷新程序
      let refreshMaterial = false; // 是否需要刷新材质
      let refreshLights = false; // 是否需要刷新光照

      // 获取程序和材质的uniform变量
      const p_uniforms = program.getUniforms(), // 程序uniform变量
        m_uniforms = materialProperties.uniforms; // 材质uniform变量

      // 如果使用了新程序，需要刷新所有内容
      if (state.useProgram(program.program)) {
        refreshProgram = true;
        refreshMaterial = true;
        refreshLights = true;
      }

      // 如果材质ID发生变化，需要刷新材质
      if (material.id !== _currentMaterialId) {
        _currentMaterialId = material.id;
        refreshMaterial = true;
      }

      // ===== 设置相机相关的uniform变量 =====
      if (refreshProgram || _currentCamera !== camera) {
        // 通用相机uniform变量

        // 处理反向深度缓冲区
        const reversedDepthBuffer = state.buffers.depth.getReversed();

        if (reversedDepthBuffer && camera.reversedDepth !== true) {
          camera._reversedDepth = true; // 标记相机使用反向深度
          camera.updateProjectionMatrix(); // 更新投影矩阵
        }

        // 设置投影矩阵uniform
        p_uniforms.setValue(_gl, "projectionMatrix", camera.projectionMatrix);

        // 设置视图矩阵uniform
        p_uniforms.setValue(_gl, "viewMatrix", camera.matrixWorldInverse);

        // 设置相机位置uniform（如果着色器需要）
        const uCamPos = p_uniforms.map.cameraPosition;

        if (uCamPos !== undefined) {
          uCamPos.setValue(_gl, _vector3.setFromMatrixPosition(camera.matrixWorld));
        }

        // 如果启用了对数深度缓冲区，设置相关参数
        if (capabilities.logarithmicDepthBuffer) {
          p_uniforms.setValue(_gl, "logDepthBufFC", 2.0 / (Math.log(camera.far + 1.0) / Math.LN2));
        }

        // 考虑将isOrthographic移动到UniformLib和WebGLMaterials，参见 https://github.com/mrdoob/three.js/pull/26467#issuecomment-1645185067

        // 为支持的材质类型设置正交相机标志
        if (
          material.isMeshPhongMaterial ||
          material.isMeshToonMaterial ||
          material.isMeshLambertMaterial ||
          material.isMeshBasicMaterial ||
          material.isMeshStandardMaterial ||
          material.isShaderMaterial
        ) {
          p_uniforms.setValue(_gl, "isOrthographic", camera.isOrthographicCamera === true);
        }

        // 如果相机发生变化
        if (_currentCamera !== camera) {
          _currentCamera = camera;

          // 光照uniform变量依赖于相机，因此强制更新
          // 现在更新，以防此材质支持光照 - 或稍后，当下一个支持光照的材质被激活时：

          refreshMaterial = true; // 材质变化时设置为true
          refreshLights = true; // 保持设置直到更新完成
        }
      }

      // ===== 骨骼动画和变形目标uniform设置 =====
      // 即使材质没有改变，也必须设置骨骼动画和变形目标的uniform变量
      // 骨骼和变形纹理的纹理单元自动设置必须在其他纹理之前进行
      // 否则用于骨骼动画和变形的纹理可能会占用为其他材质纹理保留的纹理单元

      // 处理骨骼网格
      if (object.isSkinnedMesh) {
        // 设置绑定矩阵相关uniform（如果着色器需要）
        p_uniforms.setOptional(_gl, object, "bindMatrix");
        p_uniforms.setOptional(_gl, object, "bindMatrixInverse");

        const skeleton = object.skeleton; // 获取骨骼

        if (skeleton) {
          // 如果骨骼纹理不存在，计算骨骼纹理
          if (skeleton.boneTexture === null) skeleton.computeBoneTexture();

          // 设置骨骼纹理uniform
          p_uniforms.setValue(_gl, "boneTexture", skeleton.boneTexture, textures);
        }
      }

      // 处理批量网格
      if (object.isBatchedMesh) {
        // 设置批量处理纹理uniform（如果着色器需要）
        p_uniforms.setOptional(_gl, object, "batchingTexture");
        p_uniforms.setValue(_gl, "batchingTexture", object._matricesTexture, textures);

        // 设置批量处理ID纹理uniform
        p_uniforms.setOptional(_gl, object, "batchingIdTexture");
        p_uniforms.setValue(_gl, "batchingIdTexture", object._indirectTexture, textures);

        // 设置批量处理颜色纹理uniform（如果存在）
        p_uniforms.setOptional(_gl, object, "batchingColorTexture");
        if (object._colorsTexture !== null) {
          p_uniforms.setValue(_gl, "batchingColorTexture", object._colorsTexture, textures);
        }
      }

      // 处理变形目标
      const morphAttributes = geometry.morphAttributes;

      // 如果几何体有变形属性，更新变形目标
      if (morphAttributes.position !== undefined || morphAttributes.normal !== undefined || morphAttributes.color !== undefined) {
        morphtargets.update(object, geometry, program);
      }

      // 处理阴影接收设置
      if (refreshMaterial || materialProperties.receiveShadow !== object.receiveShadow) {
        materialProperties.receiveShadow = object.receiveShadow; // 更新缓存值
        p_uniforms.setValue(_gl, "receiveShadow", object.receiveShadow); // 设置uniform
      }

      // ===== 特殊材质处理 =====
      // 参见 https://github.com/mrdoob/three.js/pull/24467#issuecomment-1209031512

      // 处理Gouraud材质的环境贴图
      if (material.isMeshGouraudMaterial && material.envMap !== null) {
        m_uniforms.envMap.value = envMap;

        // 设置环境贴图翻转标志（立方体纹理且非渲染目标时需要翻转）
        m_uniforms.flipEnvMap.value = envMap.isCubeTexture && envMap.isRenderTargetTexture === false ? -1 : 1;
      }

      // 处理标准材质的环境强度
      if (material.isMeshStandardMaterial && material.envMap === null && scene.environment !== null) {
        m_uniforms.envMapIntensity.value = scene.environmentIntensity;
      }

      // ===== 刷新材质uniform变量 =====
      if (refreshMaterial) {
        // 设置色调映射曝光度
        p_uniforms.setValue(_gl, "toneMappingExposure", _this.toneMappingExposure);

        // 如果材质需要光照信息
        if (materialProperties.needsLights) {
          // 当前材质需要光照信息

          // 注意：所有光照uniform变量总是正确设置的
          // 它们只是引用渲染器的状态作为它们的值
          //
          // 使用当前材质的.needsUpdate标志在需要时设置GL状态

          markUniformsLightsNeedsUpdate(m_uniforms, refreshLights);
        }

        // 刷新多个材质共同的uniform变量

        // 如果有雾效且材质启用雾效，刷新雾效uniform
        if (fog && material.fog === true) {
          materials.refreshFogUniforms(m_uniforms, fog);
        }

        // 刷新材质uniform变量
        materials.refreshMaterialUniforms(m_uniforms, material, _pixelRatio, _height, currentRenderState.state.transmissionRenderTarget[camera.id]);

        // 上传uniform变量到GPU
        WebGLUniforms.upload(_gl, getUniformList(materialProperties), m_uniforms, textures);
      }

      // 处理着色器材质的uniform更新
      if (material.isShaderMaterial && material.uniformsNeedUpdate === true) {
        WebGLUniforms.upload(_gl, getUniformList(materialProperties), m_uniforms, textures);
        material.uniformsNeedUpdate = false; // 重置更新标志
      }

      // 处理精灵材质的中心点
      if (material.isSpriteMaterial) {
        p_uniforms.setValue(_gl, "center", object.center);
      }

      // ===== 设置通用矩阵uniform变量 =====

      p_uniforms.setValue(_gl, "modelViewMatrix", object.modelViewMatrix); // 模型视图矩阵
      p_uniforms.setValue(_gl, "normalMatrix", object.normalMatrix); // 法线矩阵
      p_uniforms.setValue(_gl, "modelMatrix", object.matrixWorld); // 模型矩阵

      // ===== 处理Uniform缓冲区对象（UBOs） =====

      if (material.isShaderMaterial || material.isRawShaderMaterial) {
        const groups = material.uniformsGroups; // 获取uniform组

        // 遍历所有uniform组
        for (let i = 0, l = groups.length; i < l; i++) {
          const group = groups[i];

          uniformsGroups.update(group, program); // 更新uniform组
          uniformsGroups.bind(group, program); // 绑定uniform组
        }
      }

      return program; // 返回着色器程序
    }

    // 如果uniform变量被标记为干净，它们不需要加载到GPU。

    /**
     * 标记光照uniform变量需要更新
     * 设置所有光照相关uniform变量的needsUpdate标志
     *
     * @param {Object} uniforms - uniform变量对象
     * @param {boolean} value - 是否需要更新的标志值
     */
    function markUniformsLightsNeedsUpdate(uniforms, value) {
      uniforms.ambientLightColor.needsUpdate = value; // 环境光颜色
      uniforms.lightProbe.needsUpdate = value; // 光探针

      uniforms.directionalLights.needsUpdate = value; // 方向光
      uniforms.directionalLightShadows.needsUpdate = value; // 方向光阴影
      uniforms.pointLights.needsUpdate = value; // 点光源
      uniforms.pointLightShadows.needsUpdate = value; // 点光源阴影
      uniforms.spotLights.needsUpdate = value; // 聚光灯
      uniforms.spotLightShadows.needsUpdate = value; // 聚光灯阴影
      uniforms.rectAreaLights.needsUpdate = value; // 矩形区域光
      uniforms.hemisphereLights.needsUpdate = value; // 半球光
    }

    /**
     * 检查材质是否需要光照
     * 判断给定材质是否需要光照计算
     *
     * @param {Material} material - 要检查的材质
     * @returns {boolean} 如果材质需要光照则返回true
     */
    function materialNeedsLights(material) {
      return (
        material.isMeshLambertMaterial || // Lambert材质
        material.isMeshToonMaterial || // 卡通材质
        material.isMeshPhongMaterial || // Phong材质
        material.isMeshStandardMaterial || // 标准材质
        material.isShadowMaterial || // 阴影材质
        (material.isShaderMaterial && material.lights === true) // 启用光照的着色器材质
      );
    }

    /**
     * 获取当前活动的立方体贴图面
     * 返回当前正在渲染的立方体贴图面索引
     *
     * @return {number} 活动的立方体贴图面索引
     */
    this.getActiveCubeFace = function () {
      return _currentActiveCubeFace;
    };

    /**
     * 获取当前活动的mipmap级别
     * 返回当前正在渲染的mipmap级别
     *
     * @return {number} 活动的mipmap级别
     */
    this.getActiveMipmapLevel = function () {
      return _currentActiveMipmapLevel;
    };

    /**
     * 获取当前活动的渲染目标
     * 返回当前设置的渲染目标
     *
     * @return {?WebGLRenderTarget} 活动的渲染目标。如果当前没有设置渲染目标则返回 `null`
     */
    this.getRenderTarget = function () {
      return _currentRenderTarget;
    };

    /**
     * 绑定外部纹理到渲染目标。
     *
     * 用于将平台/外部创建的底层 GPU 纹理（颜色、深度）与 three.js 的
     * `WebGLRenderTarget` 建立关联，以便作为渲染输出目标使用。
     *
     * 注意：当提供了外部深度缓冲纹理时，为避免与 `multisample_render_to_texture`
     * 扩展的兼容性问题（如在一帧中多次 flush 时），会禁用该扩展路径。
     *
     * @param {WebGLRenderTarget} renderTarget - 要配置的渲染目标。
     * @param {WebGLTexture} colorTexture - 外部颜色纹理句柄（GL 纹理对象）。
     * @param {?WebGLTexture} depthTexture - 外部深度（或深度/模板）纹理句柄。
     */
    this.setRenderTargetTextures = function (renderTarget, colorTexture, depthTexture) {
      const renderTargetProperties = properties.get(renderTarget); // 获取渲染目标的内部属性

      renderTargetProperties.__autoAllocateDepthBuffer = renderTarget.resolveDepthBuffer === false; // 根据 resolveDepthBuffer 决定是否自动分配深度缓冲
      if (renderTargetProperties.__autoAllocateDepthBuffer === false) {
        // The multisample_render_to_texture extension doesn't work properly if there
        // are midframe flushes and an external depth buffer. Disable use of the extension.
        renderTargetProperties.__useRenderToTexture = false; // 存在外部深度缓冲时禁用 render-to-texture 扩展路径
      }

      properties.get(renderTarget.texture).__webglTexture = colorTexture; // 将外部颜色纹理句柄绑定到 renderTarget 的内部记录
      properties.get(renderTarget.depthTexture).__webglTexture = renderTargetProperties.__autoAllocateDepthBuffer ? undefined : depthTexture; // 如未自动分配深度则使用外部深度纹理

      renderTargetProperties.__hasExternalTextures = true; // 标记该渲染目标正在使用外部提供的纹理
    };

    /**
     * 绑定外部帧缓冲到渲染目标。
     *
     * 允许为 `WebGLRenderTarget` 指定一个平台/外部提供的默认帧缓冲（如某些
     * 集成场景或平台交换链提供的 FBO）。若传入 `undefined`，则标记该渲染目标
     * 使用“默认帧缓冲”路径（即由当前上下文的默认 FBO/画布驱动）。
     *
     * 该配置会影响后续 `setRenderTarget` 的绑定逻辑：当检测到使用默认帧缓冲
     * 路径时，需要确保在切换时正确地将绑定恢复到 `null`，以使用上下文默认 FBO。
     *
     * @param {WebGLRenderTarget} renderTarget - 要配置的渲染目标。
     * @param {?WebGLFramebuffer} defaultFramebuffer - 外部提供的帧缓冲对象；
     *                                                  传入 `undefined` 表示使用默认 FBO。
     */
    this.setRenderTargetFramebuffer = function (renderTarget, defaultFramebuffer) {
      const renderTargetProperties = properties.get(renderTarget); // 获取渲染目标的内部属性
      renderTargetProperties.__webglFramebuffer = defaultFramebuffer; // 记录外部/默认帧缓冲对象（可能为 undefined）
      renderTargetProperties.__useDefaultFramebuffer = defaultFramebuffer === undefined; // 标记是否走默认帧缓冲路径
    };

    const _scratchFrameBuffer = _gl.createFramebuffer();

    /**
     * 设置当前活动的渲染目标。
     *
     * - 当 `renderTarget` 为 `null` 时，切换为画布（默认帧缓冲）作为渲染目标。
     * - 当为立方体渲染目标时，`activeCubeFace` 指定当前渲染的立方体面。
     * - 当为 3D/数组纹理渲染目标时，`activeCubeFace` 充当要渲染的图层（z 层）索引。
     * - 可以通过 `activeMipmapLevel` 指定渲染的 mip 级别；非 0 级时会使用内部
     *   临时帧缓冲，以避免因深度缓冲尺寸不一致而导致的绑定错误。
     *
     * 该方法会：
     * - 根据渲染目标类型选择/创建并绑定正确的 FBO（多重采样、立方体、数组/3D 等）。
     * - 在必要时重新绑定外部颜色/深度纹理（如交换链更新时）。
     * - 将视口、裁剪矩形和裁剪测试状态同步为渲染目标自带的设置（或回退到渲染器设置）。
     * - 对于渲染到特定 mip 级别的情况，绑定对应的纹理附件。
     *
     * @param {?WebGLRenderTarget} renderTarget - 要设置的渲染目标；`null` 表示画布。
     * @param {number} [activeCubeFace=0] - 立方体贴图的活动面索引；对 3D/数组纹理为层索引。
     * @param {number} [activeMipmapLevel=0] - 活动的 mipmap 级别。
     */
    this.setRenderTarget = function (renderTarget, activeCubeFace = 0, activeMipmapLevel = 0) {
      _currentRenderTarget = renderTarget; // 记录当前渲染目标
      _currentActiveCubeFace = activeCubeFace; // 记录活动的立方体面/图层索引
      _currentActiveMipmapLevel = activeMipmapLevel; // 记录活动的 mipmap 级别

      let useDefaultFramebuffer = true; // 是否走默认帧缓冲路径（由状态机处理附件）
      let framebuffer = null; // 将要绑定的帧缓冲对象
      let isCube = false; // 是否为立方体渲染目标
      let isRenderTarget3D = false; // 是否为 3D/数组渲染目标

      if (renderTarget) { // 当指定了渲染目标
        const renderTargetProperties = properties.get(renderTarget); // 获取渲染目标内部属性

        if (renderTargetProperties.__useDefaultFramebuffer !== undefined) { // 如标记为使用默认帧缓冲
          // We need to make sure to rebind the framebuffer.
          state.bindFramebuffer(_gl.FRAMEBUFFER, null); // 绑定默认 FBO（null）以确保状态一致
          useDefaultFramebuffer = false; // 仍需调用 drawBuffers 来配置颜色附件
        } else if (renderTargetProperties.__webglFramebuffer === undefined) { // 尚未创建 FBO
          textures.setupRenderTarget(renderTarget); // 初始化并创建渲染目标所需的 FBO/附件
        } else if (renderTargetProperties.__hasExternalTextures) { // 使用外部纹理的渲染目标
          // Color and depth texture must be rebound in order for the swapchain to update.
          textures.rebindTextures(renderTarget, properties.get(renderTarget.texture).__webglTexture, properties.get(renderTarget.depthTexture).__webglTexture); // 重新绑定外部颜色/深度纹理
        } else if (renderTarget.depthBuffer) { // 存在深度缓冲/纹理时的检查与同步
          // check if the depth texture is already bound to the frame buffer and that it's been initialized
          const depthTexture = renderTarget.depthTexture; // 当前深度纹理引用
          if (renderTargetProperties.__boundDepthTexture !== depthTexture) { // 若已绑定的深度纹理不一致
            // check if the depth texture is compatible
            if (depthTexture !== null && properties.has(depthTexture) && (renderTarget.width !== depthTexture.image.width || renderTarget.height !== depthTexture.image.height)) {
              throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size."); // 尺寸不匹配则抛错
            }

            // Swap the depth buffer to the currently attached one
            textures.setupDepthRenderbuffer(renderTarget); // 切换/重新配置深度渲染缓冲/纹理绑定
          }
        }

        const texture = renderTarget.texture; // 渲染目标的主纹理

        if (texture.isData3DTexture || texture.isDataArrayTexture || texture.isCompressedArrayTexture) { // 若为 3D/数组纹理类型
          isRenderTarget3D = true; // 后续采用按图层绑定的路径
        }

        const __webglFramebuffer = properties.get(renderTarget).__webglFramebuffer; // 取得对应的 FBO（可能是数组）

        if (renderTarget.isWebGLCubeRenderTarget) { // 立方体渲染目标
          if (Array.isArray(__webglFramebuffer[activeCubeFace])) { // 不同 mip 级别以数组形式存储
            framebuffer = __webglFramebuffer[activeCubeFace][activeMipmapLevel]; // 取指定面的指定 mip 级别 FBO
          } else {
            framebuffer = __webglFramebuffer[activeCubeFace]; // 取指定面的 FBO
          }

          isCube = true; // 标记为立方体渲染
        } else if (renderTarget.samples > 0 && textures.useMultisampledRTT(renderTarget) === false) { // 多重采样但不走 RTT 扩展
          framebuffer = properties.get(renderTarget).__webglMultisampledFramebuffer; // 使用多重采样 FBO
        } else {
          if (Array.isArray(__webglFramebuffer)) { // 普通 2D 渲染目标，可能有多个 mip 级别的 FBO
            framebuffer = __webglFramebuffer[activeMipmapLevel]; // 选取对应 mip 级别的 FBO
          } else {
            framebuffer = __webglFramebuffer; // 单一 FBO 情况
          }
        }

        _currentViewport.copy(renderTarget.viewport); // 同步视口为渲染目标自带设置
        _currentScissor.copy(renderTarget.scissor); // 同步裁剪矩形
        _currentScissorTest = renderTarget.scissorTest; // 同步裁剪测试开关
      } else { // 未传入渲染目标，回退画布
        _currentViewport.copy(_viewport).multiplyScalar(_pixelRatio).floor(); // 使用渲染器全局视口（按像素比缩放并取整）
        _currentScissor.copy(_scissor).multiplyScalar(_pixelRatio).floor(); // 使用渲染器全局裁剪矩形
        _currentScissorTest = _scissorTest; // 使用渲染器全局裁剪测试开关
      }

      // Use a scratch frame buffer if rendering to a mip level to avoid depth buffers
      // being bound that are different sizes.
      if (activeMipmapLevel !== 0) { // 渲染到非 0 级 mip 时
        framebuffer = _scratchFrameBuffer; // 使用临时 FBO，避免深度附件尺寸不一致
      }

      const framebufferBound = state.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer); // 绑定/切换到目标 FBO

      if (framebufferBound && useDefaultFramebuffer) { // 如果发生了绑定并且走默认 FBO 路径
        state.drawBuffers(renderTarget, framebuffer); // 设置颜色写入附件（支持 MRT）
      }

      state.viewport(_currentViewport); // 应用视口状态
      state.scissor(_currentScissor); // 应用裁剪矩形
      state.setScissorTest(_currentScissorTest); // 应用裁剪测试状态

      if (isCube) { // 立方体渲染目标需绑定具体面的颜色附件
        const textureProperties = properties.get(renderTarget.texture); // 获取主纹理属性
        _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_CUBE_MAP_POSITIVE_X + activeCubeFace, textureProperties.__webglTexture, activeMipmapLevel); // 绑定立方体指定面与 mip 级别
      } else if (isRenderTarget3D) { // 3D/数组纹理按图层绑定
        const layer = activeCubeFace; // 使用 activeCubeFace 作为层索引

        for (let i = 0; i < renderTarget.textures.length; i++) { // 逐个颜色附件绑定对应层
          const textureProperties = properties.get(renderTarget.textures[i]); // 获取每个附件的纹理属性

          _gl.framebufferTextureLayer(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, textureProperties.__webglTexture, activeMipmapLevel, layer); // 绑定图层附件
        }
      } else if (renderTarget !== null && activeMipmapLevel !== 0) { // 普通 2D 渲染目标渲染到特定 mip 级别
        // Only bind the frame buffer if we are using a scratch frame buffer to render to a mipmap.
        // If we rebind the texture when using a multi sample buffer then an error about inconsistent samples will be thrown.
        const textureProperties = properties.get(renderTarget.texture); // 获取主纹理属性
        _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, textureProperties.__webglTexture, activeMipmapLevel); // 绑定对应 mip 级别的颜色附件
      }

      _currentMaterialId = -1; // 重置当前材质 ID，确保下次 uniform 绑定正确
    };

    /**
     * 从渲染目标读取像素数据
     * 将给定渲染目标的像素数据读取到给定的缓冲区中
     *
     * @param {WebGLRenderTarget} renderTarget - 要读取的渲染目标
     * @param {number} x - 复制区域原点的x坐标
     * @param {number} y - 复制区域原点的y坐标
     * @param {number} width - 复制区域的宽度
     * @param {number} height - 复制区域的高度
     * @param {TypedArray} buffer - 结果缓冲区
     * @param {number} [activeCubeFaceIndex] - 活动的立方体贴图面索引
     * @param {number} [textureIndex=0] - MRT渲染目标的纹理索引
     */
    this.readRenderTargetPixels = function (renderTarget, x, y, width, height, buffer, activeCubeFaceIndex, textureIndex = 0) { // 同步读取渲染目标像素
      // 验证渲染目标是否有效
      if (!(renderTarget && renderTarget.isWebGLRenderTarget)) { // 校验：必须为 WebGLRenderTarget
        console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget."); // 打印错误信息
        return; // 直接返回
      }

      // 获取帧缓冲区
      let framebuffer = properties.get(renderTarget).__webglFramebuffer; // 取该渲染目标的 FBO

      // 如果是立方体渲染目标且指定了面索引，获取对应面的帧缓冲区
      if (renderTarget.isWebGLCubeRenderTarget && activeCubeFaceIndex !== undefined) { // 立方体目标并指定了面索引
        framebuffer = framebuffer[activeCubeFaceIndex]; // 选择对应面的 FBO
      }

      if (framebuffer) { // 仅在存在可用 FBO 时读取
        // 绑定帧缓冲区
        state.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer); // 绑定读取源 FBO

        try { // try/finally 确保后续能恢复绑定
          // 获取纹理信息
          const texture = renderTarget.textures[textureIndex]; // 选择要读取的颜色附件
          const textureFormat = texture.format; // 纹理格式
          const textureType = texture.type; // 纹理类型

          // 检查纹理格式是否可读
          if (!capabilities.textureFormatReadable(textureFormat)) {
            console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");
            return;
          }

          // 检查纹理类型是否可读
          if (!capabilities.textureTypeReadable(textureType)) {
            console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");
            return;
          }

          // 以下if语句确保有效的读取请求（没有越界像素，参见 #8604）

          if (x >= 0 && x <= renderTarget.width - width && y >= 0 && y <= renderTarget.height - height) { // 读取区域在有效范围内
            // 当使用MRT时，为后续读取命令选择正确的颜色缓冲区

            if (renderTarget.textures.length > 1) _gl.readBuffer(_gl.COLOR_ATTACHMENT0 + textureIndex); // MRT：选择读取的颜色附件

            // 读取像素数据
            _gl.readPixels(x, y, width, height, utils.convert(textureFormat), utils.convert(textureType), buffer); // 读取像素到 CPU 缓冲
          }
        } finally { // 无论是否成功都恢复 FBO 绑定
          // 如果需要，恢复当前渲染目标的帧缓冲区

          const framebuffer = _currentRenderTarget !== null ? properties.get(_currentRenderTarget).__webglFramebuffer : null; // 取当前活动 FBO（或 null）
          state.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer); // 恢复 FBO 绑定
        }
      }
    };

    /**
     * 异步读取渲染目标像素数据
     *
     * 这是 {@link WebGLRenderer#readRenderTargetPixels} 的异步、非阻塞版本。
     * 建议尽可能使用此版本的 `readRenderTargetPixels()` 方法。
     *
     * @async
     * @param {WebGLRenderTarget} renderTarget - 要读取的渲染目标
     * @param {number} x - 复制区域原点的 x 坐标
     * @param {number} y - 复制区域原点的 y 坐标
     * @param {number} width - 复制区域的宽度
     * @param {number} height - 复制区域的高度
     * @param {TypedArray} buffer - 结果缓冲区
     * @param {number} [activeCubeFaceIndex] - 活动立方体面索引
     * @param {number} [textureIndex=0] - MRT 渲染目标的纹理索引
     * @return {Promise<TypedArray>} 当读取完成时解析的 Promise，解析值为包含读取数据的类型化数组
     */
    this.readRenderTargetPixelsAsync = async function (renderTarget, x, y, width, height, buffer, activeCubeFaceIndex, textureIndex = 0) { // 异步读取渲染目标像素
      if (!(renderTarget && renderTarget.isWebGLRenderTarget)) { // 校验：必须是 WebGLRenderTarget
        throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget."); // 参数错误
      }

      let framebuffer = properties.get(renderTarget).__webglFramebuffer; // 获取目标 FBO
      if (renderTarget.isWebGLCubeRenderTarget && activeCubeFaceIndex !== undefined) { // 立方体目标指定面
        framebuffer = framebuffer[activeCubeFaceIndex]; // 选择对应面 FBO
      }

      if (framebuffer) {
        // 以下 if 语句确保有效的读取请求（无越界像素，参见 #8604）
        if (x >= 0 && x <= renderTarget.width - width && y >= 0 && y <= renderTarget.height - height) {
          // 设置活动帧缓冲区为我们要读取的缓冲区
          state.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer); // 绑定待读 FBO

          const texture = renderTarget.textures[textureIndex]; // 目标颜色附件纹理
          const textureFormat = texture.format;
          const textureType = texture.type;

          if (!capabilities.textureFormatReadable(textureFormat)) {
            throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");
          }

          if (!capabilities.textureTypeReadable(textureType)) {
            throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");
          }

          const glBuffer = _gl.createBuffer(); // 创建 PBO
          _gl.bindBuffer(_gl.PIXEL_PACK_BUFFER, glBuffer); // 绑定像素打包缓冲
          _gl.bufferData(_gl.PIXEL_PACK_BUFFER, buffer.byteLength, _gl.STREAM_READ); // 分配读取容量

          // 使用 MRT 时，为后续读取命令选择正确的颜色缓冲区

          if (renderTarget.textures.length > 1) _gl.readBuffer(_gl.COLOR_ATTACHMENT0 + textureIndex); // MRT：选择颜色附件

          _gl.readPixels(x, y, width, height, utils.convert(textureFormat), utils.convert(textureType), 0); // 读取到 PBO 偏移 0

          // 在等待之前将帧缓冲区重置为当前设置的缓冲区
          const currFramebuffer = _currentRenderTarget !== null ? properties.get(_currentRenderTarget).__webglFramebuffer : null; // 当前活动 FBO
          state.bindFramebuffer(_gl.FRAMEBUFFER, currFramebuffer); // 恢复原 FBO

          // 每 8 毫秒检查一次命令是否完成
          const sync = _gl.fenceSync(_gl.SYNC_GPU_COMMANDS_COMPLETE, 0); // 插入同步对象

          _gl.flush(); // 刷新命令

          await probeAsync(_gl, sync, 4); // 轮询同步对象

          // 读取数据并删除缓冲区
          _gl.bindBuffer(_gl.PIXEL_PACK_BUFFER, glBuffer); // 重新绑定 PBO
          _gl.getBufferSubData(_gl.PIXEL_PACK_BUFFER, 0, buffer); // 从 PBO 取回数据
          _gl.deleteBuffer(glBuffer); // 删除 PBO
          _gl.deleteSync(sync); // 删除同步对象

          return buffer; // 返回读取结果
        } else {
          throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range."); // 越界错误
        }
      }
    };

    /**
     * 从帧缓冲区复制像素到纹理
     * 将当前绑定的帧缓冲区中的像素复制到给定的纹理中
     *
     * @param {FramebufferTexture} texture - 目标纹理
     * @param {?Vector2} [position=null] - 复制操作的起始位置
     * @param {number} [level=0] - mip级别，默认值表示基础mip
     */
    this.copyFramebufferToTexture = function (texture, position = null, level = 0) { // 从当前 FBO 复制像素到纹理
      // 计算当前mip级别的缩放比例
      const levelScale = Math.pow(2, -level); // 该 mip 级别的缩放因子
      // 根据缩放比例计算实际的宽度和高度
      const width = Math.floor(texture.image.width * levelScale); // 复制区域宽度（按 mip 缩放）
      const height = Math.floor(texture.image.height * levelScale); // 复制区域高度（按 mip 缩放）

      // 确定复制的起始位置
      const x = position !== null ? position.x : 0; // 源起点 x
      const y = position !== null ? position.y : 0; // 源起点 y

      // 设置目标纹理
      textures.setTexture2D(texture, 0); // 绑定目标 2D 纹理

      // 从帧缓冲区复制像素数据到纹理
      _gl.copyTexSubImage2D(_gl.TEXTURE_2D, level, 0, 0, x, y, width, height); // 执行拷贝到纹理 (0,0)

      // 解绑纹理
      state.unbindTexture(); // 解绑活跃纹理
    };

    // 创建用于纹理复制的帧缓冲区
    const _srcFramebuffer = _gl.createFramebuffer(); // 源帧缓冲区
    const _dstFramebuffer = _gl.createFramebuffer(); // 目标帧缓冲区

    /**
     * 纹理到纹理复制
     * 将给定源纹理的数据复制到目标纹理中
     *
     * 当使用渲染目标纹理作为 `srcTexture` 和 `dstTexture` 时，必须确保两个渲染目标都已初始化
     * {@link WebGLRenderer#initRenderTarget}
     *
     * @param {Texture} srcTexture - 源纹理
     * @param {Texture} dstTexture - 目标纹理
     * @param {?(Box2|Box3)} [srcRegion=null] - 描述源区域的边界框，可以是二维或三维的
     * @param {?(Vector2|Vector3)} [dstPosition=null] - 表示目标区域原点的向量，可以是二维或三维的
     * @param {number} [srcLevel=0] - 要复制的源mipmap级别
     * @param {?number} [dstLevel=null] - 目标mipmap级别
     */
    this.copyTextureToTexture = function (srcTexture, dstTexture, srcRegion = null, dstPosition = null, srcLevel = 0, dstLevel = null) { // 纹理到纹理复制
      // 支持之前只有单个目标mipmap级别的函数签名
      if (dstLevel === null) { // 兼容旧签名：未提供 dstLevel
        if (srcLevel !== 0) { // 旧用法：将 srcLevel 作为 dstLevel 使用
          // @deprecated, r171 - 已弃用的用法
          warnOnce("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."); // 提示签名变化
          dstLevel = srcLevel; // 将源级别作为目标级别
          srcLevel = 0; // 源级别重置为 0
        } else {
          dstLevel = 0; // 默认目标级别为 0
      }
      }

      // ===== 收集复制所需的尺寸信息 =====
      let width, height, depth, minX, minY, minZ; // 源区域的尺寸和起始位置
      let dstX, dstY, dstZ; // 目标位置

      // 获取源纹理的图像数据（压缩纹理使用mipmap，普通纹理使用image）
      const image = srcTexture.isCompressedTexture ? srcTexture.mipmaps[dstLevel] : srcTexture.image;

      if (srcRegion !== null) {
        // 如果指定了源区域，计算区域的尺寸和位置
        width = srcRegion.max.x - srcRegion.min.x;
        height = srcRegion.max.y - srcRegion.min.y;
        depth = srcRegion.isBox3 ? srcRegion.max.z - srcRegion.min.z : 1; // 3D区域有深度，2D区域深度为1
        minX = srcRegion.min.x;
        minY = srcRegion.min.y;
        minZ = srcRegion.isBox3 ? srcRegion.min.z : 0;
      } else {
        // 如果没有指定源区域，使用整个纹理
        const levelScale = Math.pow(2, -srcLevel); // 计算mipmap级别的缩放比例
        width = Math.floor(image.width * levelScale);
        height = Math.floor(image.height * levelScale);

        // 根据纹理类型确定深度
        if (srcTexture.isDataArrayTexture) {
          depth = image.depth; // 数组纹理使用原始深度
        } else if (srcTexture.isData3DTexture) {
          depth = Math.floor(image.depth * levelScale); // 3D纹理深度也要缩放
        } else {
          depth = 1; // 2D纹理深度为1
        }

        minX = 0;
        minY = 0;
        minZ = 0;
      }

      // 确定目标位置
      if (dstPosition !== null) {
        dstX = dstPosition.x;
        dstY = dstPosition.y;
        dstZ = dstPosition.z;
      } else {
        dstX = 0;
        dstY = 0;
        dstZ = 0;
      }

      // ===== 设置目标纹理 =====
      const glFormat = utils.convert(dstTexture.format); // 转换纹理格式为WebGL格式
      const glType = utils.convert(dstTexture.type); // 转换纹理类型为WebGL类型
      let glTarget; // WebGL纹理目标

      // 根据目标纹理类型设置相应的纹理目标
      if (dstTexture.isData3DTexture) {
        textures.setTexture3D(dstTexture, 0); // 设置3D纹理
        glTarget = _gl.TEXTURE_3D;
      } else if (dstTexture.isDataArrayTexture || dstTexture.isCompressedArrayTexture) {
        textures.setTexture2DArray(dstTexture, 0); // 设置2D数组纹理
        glTarget = _gl.TEXTURE_2D_ARRAY;
      } else {
        textures.setTexture2D(dstTexture, 0); // 设置2D纹理
        glTarget = _gl.TEXTURE_2D;
      }

      // 设置像素存储参数
      _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, dstTexture.flipY); // Y轴翻转
      _gl.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, dstTexture.premultiplyAlpha); // 预乘alpha
      _gl.pixelStorei(_gl.UNPACK_ALIGNMENT, dstTexture.unpackAlignment); // 对齐方式

      // ===== 保存当前的像素存储参数（用于从CPU复制数据） =====
      const currentUnpackRowLen = _gl.getParameter(_gl.UNPACK_ROW_LENGTH); // 当前行长度
      const currentUnpackImageHeight = _gl.getParameter(_gl.UNPACK_IMAGE_HEIGHT); // 当前图像高度
      const currentUnpackSkipPixels = _gl.getParameter(_gl.UNPACK_SKIP_PIXELS); // 当前跳过像素数
      const currentUnpackSkipRows = _gl.getParameter(_gl.UNPACK_SKIP_ROWS); // 当前跳过行数
      const currentUnpackSkipImages = _gl.getParameter(_gl.UNPACK_SKIP_IMAGES); // 当前跳过图像数

      // 设置新的像素存储参数
      _gl.pixelStorei(_gl.UNPACK_ROW_LENGTH, image.width); // 设置行长度
      _gl.pixelStorei(_gl.UNPACK_IMAGE_HEIGHT, image.height); // 设置图像高度
      _gl.pixelStorei(_gl.UNPACK_SKIP_PIXELS, minX); // 设置跳过的像素数
      _gl.pixelStorei(_gl.UNPACK_SKIP_ROWS, minY); // 设置跳过的行数
      _gl.pixelStorei(_gl.UNPACK_SKIP_IMAGES, minZ); // 设置跳过的图像数

      // ===== 设置源纹理 =====
      const isSrc3D = srcTexture.isDataArrayTexture || srcTexture.isData3DTexture; // 源纹理是否为3D
      const isDst3D = dstTexture.isDataArrayTexture || dstTexture.isData3DTexture; // 目标纹理是否为3D

      if (srcTexture.isDepthTexture) {
        // ===== 处理深度纹理复制 =====
        const srcTextureProperties = properties.get(srcTexture);
        const dstTextureProperties = properties.get(dstTexture);
        const srcRenderTargetProperties = properties.get(srcTextureProperties.__renderTarget);
        const dstRenderTargetProperties = properties.get(dstTextureProperties.__renderTarget);

        // 绑定读取和绘制帧缓冲区
        state.bindFramebuffer(_gl.READ_FRAMEBUFFER, srcRenderTargetProperties.__webglFramebuffer);
        state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, dstRenderTargetProperties.__webglFramebuffer);

        // 逐层复制深度数据
        for (let i = 0; i < depth; i++) {
          // 如果源或目标是3D目标，则需要绑定层
          if (isSrc3D) {
            _gl.framebufferTextureLayer(_gl.READ_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, properties.get(srcTexture).__webglTexture, srcLevel, minZ + i);
            _gl.framebufferTextureLayer(_gl.DRAW_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, properties.get(dstTexture).__webglTexture, dstLevel, dstZ + i);
          }

          // 使用blitFramebuffer复制深度缓冲区
          _gl.blitFramebuffer(minX, minY, width, height, dstX, dstY, width, height, _gl.DEPTH_BUFFER_BIT, _gl.NEAREST);
        }

        // 解绑帧缓冲区
        state.bindFramebuffer(_gl.READ_FRAMEBUFFER, null);
        state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, null);
      } else if (srcLevel !== 0 || srcTexture.isRenderTargetTexture || properties.has(srcTexture)) {
        // ===== 处理渲染目标纹理或非零mip级别的复制 =====
        // 获取相应的帧缓冲区
        const srcTextureProperties = properties.get(srcTexture);
        const dstTextureProperties = properties.get(dstTexture);

        // 绑定帧缓冲区目标
        state.bindFramebuffer(_gl.READ_FRAMEBUFFER, _srcFramebuffer);
        state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, _dstFramebuffer);

        // 逐层复制数据
        for (let i = 0; i < depth; i++) {
          // 为帧缓冲区分配正确的层和mip映射
          if (isSrc3D) {
            // 3D源纹理：绑定特定层
            _gl.framebufferTextureLayer(_gl.READ_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, srcTextureProperties.__webglTexture, srcLevel, minZ + i);
          } else {
            // 2D源纹理：绑定整个纹理
            _gl.framebufferTexture2D(_gl.READ_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, srcTextureProperties.__webglTexture, srcLevel);
          }

          if (isDst3D) {
            // 3D目标纹理：绑定特定层
            _gl.framebufferTextureLayer(_gl.DRAW_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, dstTextureProperties.__webglTexture, dstLevel, dstZ + i);
          } else {
            // 2D目标纹理：绑定整个纹理
            _gl.framebufferTexture2D(_gl.DRAW_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, dstTextureProperties.__webglTexture, dstLevel);
          }

          // 使用能够实现复制的最快函数复制数据
          if (srcLevel !== 0) {
            // 非零mip级别使用blitFramebuffer
            _gl.blitFramebuffer(minX, minY, width, height, dstX, dstY, width, height, _gl.COLOR_BUFFER_BIT, _gl.NEAREST);
          } else if (isDst3D) {
            // 3D目标使用copyTexSubImage3D
            _gl.copyTexSubImage3D(glTarget, dstLevel, dstX, dstY, dstZ + i, minX, minY, width, height);
          } else {
            // 2D目标使用copyTexSubImage2D
            _gl.copyTexSubImage2D(glTarget, dstLevel, dstX, dstY, minX, minY, width, height);
          }
        }

        // 解绑读取和绘制缓冲区
        state.bindFramebuffer(_gl.READ_FRAMEBUFFER, null);
        state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, null);
      } else {
        // ===== 处理普通纹理复制（直接从CPU数据） =====
        if (isDst3D) {
          // 复制数据到3D纹理
          if (srcTexture.isDataTexture || srcTexture.isData3DTexture) {
            // 数据纹理：使用原始数据
            _gl.texSubImage3D(glTarget, dstLevel, dstX, dstY, dstZ, width, height, depth, glFormat, glType, image.data);
          } else if (dstTexture.isCompressedArrayTexture) {
            // 压缩数组纹理：使用压缩数据
            _gl.compressedTexSubImage3D(glTarget, dstLevel, dstX, dstY, dstZ, width, height, depth, glFormat, image.data);
          } else {
            // 普通3D纹理：使用图像对象
            _gl.texSubImage3D(glTarget, dstLevel, dstX, dstY, dstZ, width, height, depth, glFormat, glType, image);
          }
        } else {
          // 复制数据到2D纹理
          if (srcTexture.isDataTexture) {
            // 数据纹理：使用原始数据
            _gl.texSubImage2D(_gl.TEXTURE_2D, dstLevel, dstX, dstY, width, height, glFormat, glType, image.data);
          } else if (srcTexture.isCompressedTexture) {
            // 压缩纹理：使用压缩数据
            _gl.compressedTexSubImage2D(_gl.TEXTURE_2D, dstLevel, dstX, dstY, image.width, image.height, glFormat, image.data);
          } else {
            // 普通2D纹理：使用图像对象
            _gl.texSubImage2D(_gl.TEXTURE_2D, dstLevel, dstX, dstY, width, height, glFormat, glType, image);
          }
        }
      }

      // ===== 重置像素存储参数 =====
      _gl.pixelStorei(_gl.UNPACK_ROW_LENGTH, currentUnpackRowLen); // 恢复行长度
      _gl.pixelStorei(_gl.UNPACK_IMAGE_HEIGHT, currentUnpackImageHeight); // 恢复图像高度
      _gl.pixelStorei(_gl.UNPACK_SKIP_PIXELS, currentUnpackSkipPixels); // 恢复跳过像素数
      _gl.pixelStorei(_gl.UNPACK_SKIP_ROWS, currentUnpackSkipRows); // 恢复跳过行数
      _gl.pixelStorei(_gl.UNPACK_SKIP_IMAGES, currentUnpackSkipImages); // 恢复跳过图像数

      // 只有在复制级别0时才生成mipmap
      if (dstLevel === 0 && dstTexture.generateMipmaps) {
        _gl.generateMipmap(glTarget);
      }

      // 解绑纹理
      state.unbindTexture();
    };

    /**
     * 初始化渲染目标内存
     * 初始化给定的WebGLRenderTarget内存。用于初始化渲染目标，以便在渲染之前
     * 可以使用 {@link WebGLRenderer#copyTextureToTexture} 将数据复制到其中。
     *
     * @param {WebGLRenderTarget} target - 要初始化的渲染目标
     */
    this.initRenderTarget = function (target) {
      // 如果渲染目标还没有WebGL帧缓冲区，则设置它
      if (properties.get(target).__webglFramebuffer === undefined) {
        textures.setupRenderTarget(target);
      }
    };

    /**
     * 初始化纹理
     * 初始化给定的纹理。用于预加载纹理而不是等到首次渲染
     * （首次渲染可能会因解码和GPU上传开销而导致明显的延迟）。
     *
     * @param {Texture} texture - 要初始化的纹理
     */
    this.initTexture = function (texture) {
      // 根据纹理类型选择相应的设置方法
      if (texture.isCubeTexture) {
        // 立方体纹理
        textures.setTextureCube(texture, 0);
      } else if (texture.isData3DTexture) {
        // 3D数据纹理
        textures.setTexture3D(texture, 0);
      } else if (texture.isDataArrayTexture || texture.isCompressedArrayTexture) {
        // 2D数组纹理或压缩数组纹理
        textures.setTexture2DArray(texture, 0);
      } else {
        // 普通2D纹理
        textures.setTexture2D(texture, 0);
      }

      // 解绑纹理
      state.unbindTexture();
    };

    /**
     * 重置WebGL状态
     * 可用于重置内部WebGL状态。此方法主要适用于在多个WebGL库之间
     * 共享单个WebGL上下文的应用程序。
     */
    this.resetState = function () {
      // 重置渲染器内部状态变量
      _currentActiveCubeFace = 0; // 重置当前活动立方体面
      _currentActiveMipmapLevel = 0; // 重置当前活动mipmap级别
      _currentRenderTarget = null; // 重置当前渲染目标

      // 重置各个管理器的状态
      state.reset(); // 重置WebGL状态管理器
      bindingStates.reset(); // 重置绑定状态管理器
    };

    // ===== Three.js开发者工具集成 =====
    // 如果存在Three.js开发者工具，通知它观察这个渲染器实例
    if (typeof __THREE_DEVTOOLS__ !== "undefined") {
      __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
    }
  }

  /**
   * 坐标系统定义
   * 定义渲染器的坐标系统。
   *
   * 在 `WebGLRenderer` 中，值始终为 `WebGLCoordinateSystem`。
   *
   * @type {WebGLCoordinateSystem|WebGPUCoordinateSystem}
   * @default WebGLCoordinateSystem
   * @readonly
   */
  get coordinateSystem() {
    return WebGLCoordinateSystem;
  }

  /**
   * 输出颜色空间定义
   * 定义渲染器的输出颜色空间。
   *
   * @type {SRGBColorSpace|LinearSRGBColorSpace}
   * @default SRGBColorSpace
   */
  get outputColorSpace() {
    return this._outputColorSpace;
  }

  /**
   * 设置输出颜色空间
   * @param {string} colorSpace - 要设置的颜色空间
   */
  set outputColorSpace(colorSpace) {
    this._outputColorSpace = colorSpace;

    // 获取WebGL上下文并设置相应的颜色空间
    const gl = this.getContext();
    gl.drawingBufferColorSpace = ColorManagement._getDrawingBufferColorSpace(colorSpace);
    gl.unpackColorSpace = ColorManagement._getUnpackColorSpace();
  }
}

// JSDoc

/**
 * WebGLRenderer 选项配置
 *
 * @typedef {Object} WebGLRenderer~Options
 * @property {DOMElement} [canvas=null] - 渲染器绘制输出的 canvas 元素。如果未传入，渲染器将创建一个新的 canvas 元素。
 * @property {WebGL2RenderingContext} [context=null] - 可用于将现有渲染上下文附加到此渲染器。
 * @property {('highp'|'mediump'|'lowp')} [precision='highp'] - 默认着色器精度。如果设备支持，使用 `highp`。
 * @property {boolean} [alpha=false] - 控制默认清除 alpha 值。设置为 `true` 时，值为 `0`，否则为 `1`。
 * @property {boolean} [premultipliedAlpha=true] 渲染器是否假设颜色具有预乘 alpha。
 * @property {boolean} [antialias=false] 是否使用默认的 MSAA 抗锯齿。
 * @property {boolean} [stencil=false] 绘制缓冲区是否具有至少 8 位的模板缓冲区。
 * @property {boolean} [preserveDrawingBuffer=false] 是否保留缓冲区直到手动清除或覆盖。
 * @property {('default'|'low-power'|'high-performance')} [powerPreference='default'] 向用户代理提供提示，指示适合此 WebGL 上下文的 GPU 配置。
 * @property {boolean} [failIfMajorPerformanceCaveat=false] 检测到低性能时渲染器创建是否失败。
 * @property {boolean} [depth=true] 绘制缓冲区是否具有至少 16 位的深度缓冲区。
 * @property {boolean} [logarithmicDepthBuffer=false] 是否使用对数深度缓冲区。在单个场景中处理巨大比例差异时可能需要使用此选项。
 * 注意，此设置在可用时使用 `gl_FragDepth`，这会禁用早期片段测试优化并可能导致性能下降。
 * @property {boolean} [reversedDepthBuffer=false] 是否使用反向深度缓冲区。需要 `EXT_clip_control` 扩展。
 * 这是比对数深度缓冲区更快更准确的版本。
 **/

/**
 * WebGLRenderer 功能特性
 *
 * @typedef {Object} WebGLRenderer~Capabilities
 * @property {Function} getMaxAnisotropy - 返回最大可用各向异性值。
 * @property {Function} getMaxPrecision - 返回顶点和片段着色器的最大可用精度。
 * @property {boolean} logarithmicDepthBuffer - 如果构造函数中 `logarithmicDepthBuffer` 设置为 `true`，则为 `true`。
 * @property {number} maxAttributes - 顶点着色器可以使用的着色器属性数量。
 * @property {number} maxCubemapSize - 着色器可以使用的立方体贴图纹理的最大高度 * 宽度。
 * @property {number} maxFragmentUniforms - 片段着色器可以使用的 uniform 数量。
 * @property {number} maxSamples - 多重采样抗锯齿 (MSAA) 上下文中的最大采样数。
 * @property {number} maxTextures - 着色器可以使用的最大纹理数量。
 * @property {number} maxTextureSize - 着色器使用的纹理的最大高度 * 宽度。
 * @property {number} maxVaryings - 着色器可以使用的 varying 向量数量。
 * @property {number} maxVertexTextures - 顶点着色器中可以使用的纹理数量。
 * @property {number} maxVertexUniforms - 顶点着色器中可以使用的最大 uniform 数量。
 * @property {string} precision - 渲染器当前使用的着色器精度。
 * @property {boolean} reversedDepthBuffer - 如果构造函数中 `reversedDepthBuffer` 设置为 `true`
 * 且渲染上下文支持 `EXT_clip_control`，则为 `true`。
 * @property {boolean} vertexTextures - 如果可以使用顶点纹理，则为 `true`。
 **/

/**
 * WebGLRenderer 信息内存
 *
 * @typedef {Object} WebGLRenderer~InfoMemory
 * @property {number} geometries - 活动几何体的数量。
 * @property {number} textures - 活动纹理的数量。
 **/

/**
 * WebGLRenderer 信息渲染
 *
 * @typedef {Object} WebGLRenderer~InfoRender
 * @property {number} frame - 帧 ID。
 * @property {number} calls - 每帧的绘制调用次数。
 * @property {number} triangles - 每帧渲染的三角形图元数量。
 * @property {number} points - 每帧渲染的点图元数量。
 * @property {number} lines - 每帧渲染的线图元数量。
 **/

/**
 * WebGLRenderer 信息
 *
 * @typedef {Object} WebGLRenderer~Info
 * @property {boolean} [autoReset=true] - 渲染器是否自动重置信息。
 * @property {WebGLRenderer~InfoMemory} memory - 关于已分配对象的信息。
 * @property {WebGLRenderer~InfoRender} render - 关于已渲染对象的信息。
 * @property {?Array<WebGLProgram>} programs - 用于渲染的 `WebGLProgram` 数组。
 * @property {Function} reset - 为下一帧重置信息对象。
 **/

/**
 * WebGLRenderer 阴影贴图
 *
 * @typedef {Object} WebGLRenderer~ShadowMap
 * @property {boolean} [enabled=false] - 如果设置为 `true`，在场景中使用阴影贴图。
 * @property {boolean} [autoUpdate=true] - 启用场景中阴影的自动更新。
 * 如果不需要动态光照/阴影，可以将此设置为 `false`。
 * @property {boolean} [needsUpdate=false] - 当设置为 `true` 时，场景中的阴影贴图
 * 将在下次 `render` 调用中更新。
 * @property {(BasicShadowMap|PCFShadowMap|PCFSoftShadowMap|VSMShadowMap)} [type=PCFShadowMap] - 定义阴影贴图类型。
 **/

export { WebGLRenderer };
