// 导入动画管理模块
import Animation from "./Animation.js";
// 导入渲染对象管理模块
import RenderObjects from "./RenderObjects.js";
// 导入属性管理模块
import Attributes from "./Attributes.js";
// 导入几何体管理模块
import Geometries from "./Geometries.js";
// 导入信息统计模块
import Info from "./Info.js";
// 导入管线管理模块
import Pipelines from "./Pipelines.js";
// 导入绑定管理模块
import Bindings from "./Bindings.js";
// 导入渲染列表管理模块
import RenderLists from "./RenderLists.js";
// 导入渲染上下文管理模块
import RenderContexts from "./RenderContexts.js";
// 导入纹理管理模块
import Textures from "./Textures.js";
// 导入背景管理模块
import Background from "./Background.js";
// 导入节点管理模块
import Nodes from "./nodes/Nodes.js";
// 导入四通道颜色类
import Color4 from "./Color4.js";
// 导入裁剪上下文类
import ClippingContext from "./ClippingContext.js";
// 导入四边形网格类
import QuadMesh from "./QuadMesh.js";
// 导入渲染包管理模块
import RenderBundles from "./RenderBundles.js";
// 导入节点库模块
import NodeLibrary from "./nodes/NodeLibrary.js";
// 导入光照管理模块
import Lighting from "./Lighting.js";
// 导入XR管理器
import XRManager from "./XRManager.js";

// 导入节点材质类
import NodeMaterial from "../../materials/nodes/NodeMaterial.js";

// 导入场景类
import { Scene } from "../../scenes/Scene.js";
// 导入颜色管理模块
import { ColorManagement } from "../../math/ColorManagement.js";
// 导入视锥体类
import { Frustum } from "../../math/Frustum.js";
// 导入视锥体数组类
import { FrustumArray } from "../../math/FrustumArray.js";
// 导入4x4矩阵类
import { Matrix4 } from "../../math/Matrix4.js";
// 导入二维向量类
import { Vector2 } from "../../math/Vector2.js";
// 导入四维向量类
import { Vector4 } from "../../math/Vector4.js";
// 导入渲染目标类
import { RenderTarget } from "../../core/RenderTarget.js";
// 导入常量定义
import { DoubleSide, BackSide, FrontSide, SRGBColorSpace, NoToneMapping, LinearFilter, HalfFloatType, RGBAFormat, PCFShadowMap } from "../../constants.js";

// 导入高精度模型矩阵节点
import { highpModelNormalViewMatrix, highpModelViewMatrix } from "../../nodes/accessors/ModelNode.js";

// 创建默认场景实例
const _scene = /*@__PURE__*/ new Scene();
// 创建绘制缓冲区尺寸向量
const _drawingBufferSize = /*@__PURE__*/ new Vector2();
// 创建屏幕矩形向量
const _screen = /*@__PURE__*/ new Vector4();
// 创建视锥体实例
const _frustum = /*@__PURE__*/ new Frustum();
// 创建视锥体数组实例
const _frustumArray = /*@__PURE__*/ new FrustumArray();

// 创建投影屏幕矩阵
const _projScreenMatrix = /*@__PURE__*/ new Matrix4();
// 创建临时四维向量
const _vector4 = /*@__PURE__*/ new Vector4();

/**
 * 渲染器基类
 * 所有渲染器的基础类
 */
class Renderer {
  /**
   * 渲染器选项配置
   *
   * @typedef {Object} Renderer~Options
   * @property {boolean} [logarithmicDepthBuffer=false] - 是否启用对数深度缓冲区
   * @property {boolean} [alpha=true] - 默认帧缓冲区（代表画布的最终内容）是否应该透明或不透明
   * @property {boolean} [depth=true] - 默认帧缓冲区是否应该有深度缓冲区
   * @property {boolean} [stencil=false] - 默认帧缓冲区是否应该有模板缓冲区
   * @property {boolean} [antialias=false] - 是否启用MSAA作为默认抗锯齿
   * @property {number} [samples=0] - 当 `antialias` 为 `true` 时，默认使用4个采样。此参数可以设置为任何非0整数值来覆盖默认值
   * @property {?Function} [getFallback=null] - 此回调函数可用于提供备用后端，如果主后端无法使用
   * @property {number} [colorBufferType=HalfFloatType] - 定义颜色缓冲区的类型。默认的 `HalfFloatType` 推荐用于最佳质量。为了节省内存和带宽，可以使用 `UnsignedByteType`，但会降低渲染质量
   * @property {boolean} [multiview=false] - 如果设置为 `true`，渲染器将在WebXR渲染期间使用多视图（如果支持）
   */

  /**
   * 构造一个新的渲染器
   *
   * @param {Backend} backend - 渲染器目标后端（例如WebGPU或WebGL 2）
   * @param {Renderer~Options} [parameters] - 配置参数对象
   */
  constructor(backend, parameters = {}) {
    /**
     * 类型标识符，用于类型检测
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isRenderer = true; // 设置渲染器类型标识

    //

    // 从参数对象中解构配置选项，设置默认值
    const {
      logarithmicDepthBuffer = false, // 对数深度缓冲区，默认禁用
      alpha = true, // 透明度支持，默认启用
      depth = true, // 深度缓冲区，默认启用
      stencil = false, // 模板缓冲区，默认禁用
      antialias = false, // 抗锯齿，默认禁用
      samples = 0, // 采样数，默认0
      getFallback = null, // 备用后端回调，默认无
      colorBufferType = HalfFloatType, // 颜色缓冲区类型，默认半精度浮点
      multiview = false, // 多视图支持，默认禁用
    } = parameters;

    /**
     * 渲染器绘制到的画布元素引用
     * 此属性的值将由渲染器自动创建
     *
     * @type {HTMLCanvasElement|OffscreenCanvas}
     */
    this.domElement = backend.getDomElement(); // 从后端获取DOM元素

    /**
     * 当前后端的引用
     * 指向具体的渲染后端实现（WebGPU或WebGL）
     *
     * @type {Backend}
     */
    this.backend = backend; // 存储后端引用

    /**
     * MSAA采样数量
     * 多重采样抗锯齿的采样点数量
     *
     * @type {number}
     * @default 0
     */
    this.samples = samples || antialias === true ? 4 : 0; // 设置采样数，启用抗锯齿时默认4个采样

    /**
     * 是否在执行 `render()` 调用前自动清除当前渲染目标
     * 目标可以是画布（默认帧缓冲区）或当前绑定的渲染目标（自定义帧缓冲区）
     *
     * @type {boolean}
     * @default true
     */
    this.autoClear = true; // 默认启用自动清除

    /**
     * 当 `autoClear` 设置为 `true` 时，此属性定义渲染器是否应该清除颜色缓冲区
     *
     * @type {boolean}
     * @default true
     */
    this.autoClearColor = true; // 默认自动清除颜色缓冲区

    /**
     * 当 `autoClear` 设置为 `true` 时，此属性定义渲染器是否应该清除深度缓冲区
     *
     * @type {boolean}
     * @default true
     */
    this.autoClearDepth = true; // 默认自动清除深度缓冲区

    /**
     * 当 `autoClear` 设置为 `true` 时，此属性定义渲染器是否应该清除模板缓冲区
     *
     * @type {boolean}
     * @default true
     */
    this.autoClearStencil = true; // 默认自动清除模板缓冲区

    /**
     * 默认帧缓冲区是否应该透明或不透明
     * 控制画布背景的透明度
     *
     * @type {boolean}
     * @default true
     */
    this.alpha = alpha; // 设置透明度支持

    /**
     * 是否启用对数深度缓冲区
     * 对数深度缓冲区可以提供更好的深度精度，特别是在处理大范围深度值时
     *
     * @type {boolean}
     * @default false
     */
    this.logarithmicDepthBuffer = logarithmicDepthBuffer; // 设置对数深度缓冲区

    /**
     * 定义渲染器的输出颜色空间
     * 控制最终渲染结果的颜色空间
     *
     * @type {string}
     * @default SRGBColorSpace
     */
    this.outputColorSpace = SRGBColorSpace; // 设置输出颜色空间为sRGB

    /**
     * 定义渲染器的色调映射
     * 色调映射用于将HDR颜色映射到显示设备的颜色范围
     *
     * @type {number}
     * @default NoToneMapping
     */
    this.toneMapping = NoToneMapping; // 默认不使用色调映射

    /**
     * 定义色调映射曝光度
     * 控制场景的整体亮度
     *
     * @type {number}
     * @default 1
     */
    this.toneMappingExposure = 1.0; // 设置默认曝光度

    /**
     * 渲染器是否应该对其渲染列表进行排序
     *
     * 注意：排序用于尝试正确渲染具有一定透明度的对象。
     * 根据定义，对象排序可能不适用于所有情况。根据应用程序的需要，
     * 可能需要关闭排序并使用其他方法来处理透明度渲染，
     * 例如手动确定每个对象的渲染顺序。
     *
     * @type {boolean}
     * @default true
     */
    this.sortObjects = true; // 默认启用对象排序

    /**
     * 默认帧缓冲区是否应该有深度缓冲区
     * 深度缓冲区用于深度测试，确保正确的前后关系
     *
     * @type {boolean}
     * @default true
     */
    this.depth = depth; // 设置深度缓冲区支持

    /**
     * 默认帧缓冲区是否应该有模板缓冲区
     * 模板缓冲区用于模板测试，可以实现复杂的渲染效果
     *
     * @type {boolean}
     * @default false
     */
    this.stencil = stencil; // 设置模板缓冲区支持

    /**
     * 保存关于GPU内存和渲染过程的一系列统计信息
     * 对调试和监控很有用
     *
     * @type {Info}
     */
    this.info = new Info(); // 创建信息统计对象

    /**
     * 存储特定变换或计算的覆盖节点
     * 这些节点可用于替换渲染管线中的默认行为
     *
     * @type {Object}
     * @property {?Node} modelViewMatrix - 模型视图矩阵的覆盖节点
     * @property {?Node} modelNormalViewMatrix - 模型法线视图矩阵的覆盖节点
     */
    this.overrideNodes = {
      modelViewMatrix: null, // 模型视图矩阵覆盖节点，默认为null
      modelNormalViewMatrix: null, // 模型法线视图矩阵覆盖节点，默认为null
    };

    /**
     * 节点库定义了某些库对象（如材质、光源或色调映射函数）如何映射到节点类型
     * 这是必需的，因为虽然像 `MeshBasicMaterial` 或 `PointLight` 这样的类实例
     * 可以是场景图的一部分，但它们在内部被表示为节点以进行进一步处理
     *
     * @type {NodeLibrary}
     */
    this.library = new NodeLibrary(); // 创建节点库实例

    /**
     * 用于管理光源的类似映射的数据结构
     * 负责光源的收集、分类和管理
     *
     * @type {Lighting}
     */
    this.lighting = new Lighting(); // 创建光照管理实例

    // 内部属性

    /**
     * 此回调函数可用于提供备用后端，如果主后端无法使用
     * 当主要渲染后端初始化失败时的备选方案
     *
     * @private
     * @type {?Function}
     */
    this._getFallback = getFallback; // 存储备用后端回调函数

    /**
     * 渲染器的像素比
     * 用于处理高DPI显示器的像素密度
     *
     * @private
     * @type {number}
     * @default 1
     */
    this._pixelRatio = 1; // 默认像素比为1

    /**
     * 渲染器默认帧缓冲区的宽度（逻辑像素单位）
     * 逻辑像素是不考虑设备像素比的像素单位
     *
     * @private
     * @type {number}
     */
    this._width = this.domElement.width; // 从DOM元素获取宽度

    /**
     * 渲染器默认帧缓冲区的高度（逻辑像素单位）
     * 逻辑像素是不考虑设备像素比的像素单位
     *
     * @private
     * @type {number}
     */
    this._height = this.domElement.height; // 从DOM元素获取高度

    /**
     * 渲染器的视口（逻辑像素单位）
     * 定义渲染区域的位置和大小
     *
     * @private
     * @type {Vector4}
     */
    this._viewport = new Vector4(0, 0, this._width, this._height); // 初始化为全屏视口

    /**
     * 渲染器的裁剪矩形（逻辑像素单位）
     * 定义裁剪测试的区域
     *
     * @private
     * @type {Vector4}
     */
    this._scissor = new Vector4(0, 0, this._width, this._height); // 初始化为全屏裁剪区域

    /**
     * 是否应该启用裁剪测试
     * 裁剪测试可以限制渲染到指定的矩形区域
     *
     * @private
     * @type {boolean}
     */
    this._scissorTest = false; // 默认禁用裁剪测试

    /**
     * 用于管理着色器属性的渲染器模块引用
     * 负责顶点属性的管理和绑定
     *
     * @private
     * @type {?Attributes}
     * @default null
     */
    this._attributes = null; // 延迟初始化

    /**
     * 用于管理几何体的渲染器模块引用
     * 负责几何体数据的管理和优化
     *
     * @private
     * @type {?Geometries}
     * @default null
     */
    this._geometries = null; // 延迟初始化

    /**
     * 用于管理节点相关逻辑的渲染器模块引用
     * 负责节点系统的处理和管理
     *
     * @private
     * @type {?Nodes}
     * @default null
     */
    this._nodes = null; // 延迟初始化

    /**
     * 用于管理内部动画循环的渲染器模块引用
     * 负责动画帧的调度和管理
     *
     * @private
     * @type {?Animation}
     * @default null
     */
    this._animation = null; // 延迟初始化

    /**
     * 用于管理着色器程序绑定的渲染器模块引用
     * 负责着色器资源的绑定和管理
     *
     * @private
     * @type {?Bindings}
     * @default null
     */
    this._bindings = null; // 延迟初始化

    /**
     * 用于管理渲染对象的渲染器模块引用
     * 负责渲染对象的创建、缓存和管理
     *
     * @private
     * @type {?RenderObjects}
     * @default null
     */
    this._objects = null; // 延迟初始化

    /**
     * 用于管理渲染和计算管线的渲染器模块引用
     * 负责渲染管线的创建和管理
     *
     * @private
     * @type {?Pipelines}
     * @default null
     */
    this._pipelines = null; // 延迟初始化

    /**
     * 用于管理渲染包的渲染器模块引用
     * 负责渲染包的创建和管理，用于优化渲染性能
     *
     * @private
     * @type {?RenderBundles}
     * @default null
     */
    this._bundles = null; // 延迟初始化

    /**
     * 用于管理渲染列表的渲染器模块引用
     * 负责渲染对象的分类和排序
     *
     * @private
     * @type {?RenderLists}
     * @default null
     */
    this._renderLists = null; // 延迟初始化

    /**
     * 用于管理渲染上下文的渲染器模块引用
     * 负责渲染状态的管理和缓存
     *
     * @private
     * @type {?RenderContexts}
     * @default null
     */
    this._renderContexts = null; // 延迟初始化

    /**
     * 用于管理纹理的渲染器模块引用
     * 负责纹理的创建、更新和管理
     *
     * @private
     * @type {?Textures}
     * @default null
     */
    this._textures = null; // 延迟初始化

    /**
     * 用于背景渲染的渲染器模块引用
     * 负责场景背景的渲染处理
     *
     * @private
     * @type {?Background}
     * @default null
     */
    this._background = null; // 延迟初始化

    /**
     * 用于内部渲染通道的全屏四边形
     * 如色调映射和颜色空间输出通道
     *
     * @private
     * @type {QuadMesh}
     */
    this._quad = new QuadMesh(new NodeMaterial()); // 创建全屏四边形
    this._quad.material.name = "Renderer_output"; // 设置材质名称

    /**
     * 当前渲染上下文的引用
     * 存储当前渲染状态信息
     *
     * @private
     * @type {?Object}
     * @default null
     */
    this._currentRenderContext = null; // 初始化为null

    /**
     * 不透明渲染列表的自定义排序函数
     * 用于自定义不透明对象的渲染顺序
     *
     * @private
     * @type {?Function}
     * @default null
     */
    this._opaqueSort = null; // 默认使用内置排序

    /**
     * 透明渲染列表的自定义排序函数
     * 用于自定义透明对象的渲染顺序
     *
     * @private
     * @type {?Function}
     * @default null
     */
    this._transparentSort = null; // 默认使用内置排序

    /**
     * 帧缓冲区目标
     * 用于后处理和输出转换的中间渲染目标
     *
     * @private
     * @type {?RenderTarget}
     * @default null
     */
    this._frameBufferTarget = null; // 延迟创建

    // 根据透明度设置确定清除透明度值
    const alphaClear = this.alpha === true ? 0 : 1;

    /**
     * 清除颜色值
     * 包含RGBA四个通道的清除颜色
     *
     * @private
     * @type {Color4}
     */
    this._clearColor = new Color4(0, 0, 0, alphaClear); // 创建清除颜色，默认黑色

    /**
     * 清除深度值
     * 深度缓冲区的清除值
     *
     * @private
     * @type {number}
     * @default 1
     */
    this._clearDepth = 1; // 默认深度清除值为1（最远）

    /**
     * 清除模板值
     * 模板缓冲区的清除值
     *
     * @private
     * @type {number}
     * @default 0
     */
    this._clearStencil = 0; // 默认模板清除值为0

    /**
     * 当前渲染目标
     * 指向当前正在渲染到的目标
     *
     * @private
     * @type {?RenderTarget}
     * @default null
     */
    this._renderTarget = null; // 默认渲染到屏幕

    /**
     * 活动的立方体贴图面
     * 当渲染到立方体贴图时指定当前面
     *
     * @private
     * @type {number}
     * @default 0
     */
    this._activeCubeFace = 0; // 默认为第一个面（正X面）

    /**
     * 活动的mipmap级别
     * 指定当前渲染到的mipmap层级
     *
     * @private
     * @type {number}
     * @default 0
     */
    this._activeMipmapLevel = 0; // 默认为最高分辨率级别

    /**
     * 当前输出渲染目标
     * 用于最终输出的渲染目标
     *
     * @private
     * @type {?RenderTarget}
     * @default null
     */
    this._outputRenderTarget = null; // 默认输出到屏幕

    /**
     * 多渲染目标设置
     * 用于同时渲染到多个目标
     *
     * @private
     * @type {?MRTNode}
     * @default null
     */
    this._mrt = null; // 默认单一渲染目标

    /**
     * 定义渲染对象如何被渲染的函数
     * 允许自定义渲染对象的处理方式
     *
     * @private
     * @type {?Function}
     * @default null
     */
    this._renderObjectFunction = null; // 默认使用内置渲染函数

    /**
     * 用于跟踪当前渲染对象函数
     * 存储当前正在使用的渲染对象函数
     *
     * @private
     * @type {?Function}
     * @default null
     */
    this._currentRenderObjectFunction = null; // 运行时设置

    /**
     * 用于跟踪当前渲染包
     * 存储当前正在处理的渲染包
     *
     * @private
     * @type {?RenderBundle}
     * @default null
     */
    this._currentRenderBundle = null; // 运行时设置

    /**
     * 除了 `_renderObjectFunction()` 之外，此函数提供另一个钩子
     * 用于影响渲染对象的渲染过程。它用于内部使用，
     * 目前仅与 `compileAsync()` 相关。不使用实际绘制渲染对象的
     * `_renderObjectDirect()` 的默认逻辑，而是可能使用不同的函数，
     * 该函数不执行绘制，只执行节点和管线更新。
     *
     * @private
     * @type {?Function}
     * @default null
     */
    this._handleObjectFunction = this._renderObjectDirect; // 默认使用直接渲染函数

    /**
     * 指示设备是否已丢失
     * 在WebGL术语中，设备丢失被视为上下文丢失。
     * 当设置为 `true` 时，不再可能进行渲染。
     *
     * @private
     * @type {boolean}
     * @default false
     */
    this._isDeviceLost = false; // 默认设备正常

    /**
     * 定义设备/上下文丢失时应该发生什么的回调函数
     * 用户可以自定义设备丢失的处理逻辑
     *
     * @type {Function}
     */
    this.onDeviceLost = this._onDeviceLost; // 设置默认设备丢失处理函数

    /**
     * 定义颜色缓冲区的类型
     * 默认的 `HalfFloatType` 推荐用于最佳质量。
     * 为了节省内存和带宽，可以使用 `UnsignedByteType`，
     * 但这会降低渲染质量。
     *
     * @private
     * @type {number}
     * @default HalfFloatType
     */
    this._colorBufferType = colorBufferType; // 设置颜色缓冲区类型

    /**
     * 渲染器是否已初始化
     * 标记渲染器的初始化状态
     *
     * @private
     * @type {boolean}
     * @default false
     */
    this._initialized = false; // 默认未初始化

    /**
     * 初始化渲染器的Promise引用
     * 用于异步初始化过程的管理
     *
     * @private
     * @type {?Promise<this>}
     * @default null
     */
    this._initPromise = null; // 延迟创建

    /**
     * 在 `compileAsync()` 中使用的编译Promise数组
     * 用于管理异步编译过程
     *
     * @private
     * @type {?Array<Promise>}
     * @default null
     */
    this._compilationPromises = null; // 延迟创建

    /**
     * 渲染器是否应该渲染透明渲染对象
     * 控制透明对象的渲染开关
     *
     * @type {boolean}
     * @default true
     */
    this.transparent = true; // 默认渲染透明对象

    /**
     * 渲染器是否应该渲染不透明渲染对象
     * 控制不透明对象的渲染开关
     *
     * @type {boolean}
     * @default true
     */
    this.opaque = true; // 默认渲染不透明对象

    /**
     * 阴影贴图配置类型定义
     * @typedef {Object} ShadowMapConfig
     * @property {boolean} enabled - 是否全局启用阴影
     * @property {number} type - 阴影贴图类型
     */

    /**
     * 渲染器的阴影配置
     * 控制阴影渲染的相关设置
     *
     * @type {ShadowMapConfig}
     */
    this.shadowMap = {
      enabled: false, // 默认禁用阴影
      type: PCFShadowMap, // 默认使用PCF阴影贴图
    };

    /**
     * XR配置类型定义
     * @typedef {Object} XRConfig
     * @property {boolean} enabled - 是否全局启用XR
     */

    /**
     * 渲染器的XR管理器
     * 负责WebXR相关功能的管理
     *
     * @type {XRManager}
     */
    this.xr = new XRManager(this, multiview); // 创建XR管理器实例

    /**
     * 调试配置类型定义
     * @typedef {Object} DebugConfig
     * @property {boolean} checkShaderErrors - 是否应该检查着色器错误
     * @property {?Function} onShaderError - 当着色器错误发生时执行的回调函数。目前仅支持WebGL 2
     * @property {Function} getShaderAsync - 允许获取给定场景、相机和3D对象的原始着色器代码
     */

    /**
     * 渲染器的调试配置
     * 用于调试和开发时的配置选项
     *
     * @type {DebugConfig}
     */
    this.debug = {
      checkShaderErrors: true, // 默认检查着色器错误
      onShaderError: null, // 默认无错误回调
      getShaderAsync: async (scene, camera, object) => {
        // 异步获取着色器代码
        // 首先编译场景
        await this.compileAsync(scene, camera);

        // 获取渲染列表
        const renderList = this._renderLists.get(scene, camera);
        // 获取渲染上下文
        const renderContext = this._renderContexts.get(scene, camera, this._renderTarget);

        // 获取材质（优先使用场景覆盖材质）
        const material = scene.overrideMaterial || object.material;

        // 获取渲染对象
        const renderObject = this._objects.get(object, material, scene, camera, renderList.lightsNode, renderContext, renderContext.clippingContext);

        // 从渲染对象获取着色器代码
        const { fragmentShader, vertexShader } = renderObject.getNodeBuilderState();

        // 返回着色器代码
        return { fragmentShader, vertexShader };
      },
    };
  } // 构造函数结束

  /**
   * 初始化渲染器使其准备好使用
   * 异步初始化渲染器的所有组件和后端
   *
   * @async
   * @return {Promise<this>} 当渲染器初始化完成时解析的Promise
   */
  async init() {
    // 检查是否已经初始化
    if (this._initialized) {
      throw new Error("Renderer: Backend has already been initialized.");
    }

    // 如果初始化Promise已存在，直接返回
    if (this._initPromise !== null) {
      return this._initPromise;
    }

    // 创建初始化Promise
    this._initPromise = new Promise(async (resolve, reject) => {
      // 获取后端引用
      let backend = this.backend;

      try {
        // 尝试初始化后端
        await backend.init(this);
      } catch (error) {
        // 如果初始化失败且有备用后端
        if (this._getFallback !== null) {
          // 尝试备用后端

          try {
            // 切换到备用后端并初始化
            this.backend = backend = this._getFallback(error);
            await backend.init(this);
          } catch (error) {
            // 备用后端也失败，拒绝Promise
            reject(error);
            return;
          }
        } else {
          // 没有备用后端，直接拒绝Promise
          reject(error);
          return;
        }
      }

      // 初始化所有渲染器组件
      this._nodes = new Nodes(this, backend); // 节点管理器
      this._animation = new Animation(this._nodes, this.info); // 动画管理器
      this._attributes = new Attributes(backend); // 属性管理器
      this._background = new Background(this, this._nodes); // 背景管理器
      this._geometries = new Geometries(this._attributes, this.info); // 几何体管理器
      this._textures = new Textures(this, backend, this.info); // 纹理管理器
      this._pipelines = new Pipelines(backend, this._nodes); // 管线管理器
      this._bindings = new Bindings(backend, this._nodes, this._textures, this._attributes, this._pipelines, this.info); // 绑定管理器
      this._objects = new RenderObjects(this, this._nodes, this._geometries, this._pipelines, this._bindings, this.info); // 渲染对象管理器
      this._renderLists = new RenderLists(this.lighting); // 渲染列表管理器
      this._bundles = new RenderBundles(); // 渲染包管理器
      this._renderContexts = new RenderContexts(); // 渲染上下文管理器

      //

      // 启动动画循环
      this._animation.start();
      // 标记为已初始化
      this._initialized = true;

      // 解析Promise
      resolve(this);
    });

    // 返回初始化Promise
    return this._initPromise;
  }

  /**
   * 渲染器的坐标系统
   * 此属性的值取决于所选的后端。
   * 可能是 `THREE.WebGLCoordinateSystem` 或 `THREE.WebGPUCoordinateSystem`
   *
   * @readonly
   * @type {number}
   */
  get coordinateSystem() {
    // 返回后端的坐标系统
    return this.backend.coordinateSystem;
  }

  /**
   * 异步编译给定场景中的所有材质
   * 这有助于避免称为"着色器编译卡顿"的现象，
   * 该现象在首次使用新着色器渲染对象时发生。
   *
   * 如果要将3D对象添加到现有场景中，请使用第三个可选参数
   * 来应用目标场景。注意，在调用此方法之前，
   * 必须配置（目标）场景的光照和环境。
   *
   * @async
   * @param {Object3D} scene - 要预编译的场景或3D对象
   * @param {Camera} camera - 用于渲染场景的相机
   * @param {?Scene} targetScene - 如果第一个参数是3D对象，此参数必须表示该3D对象将要添加到的场景
   * @return {Promise<Array|undefined>} 当编译完成时解析的Promise
   */
  async compileAsync(scene, camera, targetScene = null) {
    // 如果设备丢失，直接返回
    if (this._isDeviceLost === true) return;

    // 如果未初始化，先初始化
    if (this._initialized === false) await this.init();

    // 保存渲染树状态

    // 获取节点帧
    const nodeFrame = this._nodes.nodeFrame;

    // 保存之前的状态
    const previousRenderId = nodeFrame.renderId; // 之前的渲染ID
    const previousRenderContext = this._currentRenderContext; // 之前的渲染上下文
    const previousRenderObjectFunction = this._currentRenderObjectFunction; // 之前的渲染对象函数
    const previousCompilationPromises = this._compilationPromises; // 之前的编译Promise数组

    //

    // 确定场景引用（如果是场景则使用原场景，否则使用默认场景）
    const sceneRef = scene.isScene === true ? scene : _scene;

    // 如果没有指定目标场景，使用当前场景
    if (targetScene === null) targetScene = scene;

    // 获取当前渲染目标
    const renderTarget = this._renderTarget;
    // 获取渲染上下文
    const renderContext = this._renderContexts.get(targetScene, camera, renderTarget);
    // 获取活动mipmap级别
    const activeMipmapLevel = this._activeMipmapLevel;

    // 创建编译Promise数组
    const compilationPromises = [];

    // 设置当前渲染上下文
    this._currentRenderContext = renderContext;
    // 设置当前渲染对象函数
    this._currentRenderObjectFunction = this.renderObject;

    // 设置对象处理函数为管线创建函数（用于编译而非实际渲染）
    this._handleObjectFunction = this._createObjectPipeline;

    // 设置编译Promise数组
    this._compilationPromises = compilationPromises;

    // 增加渲染ID
    nodeFrame.renderId++;

    //

    // 更新节点帧
    nodeFrame.update();

    //

    // 设置渲染上下文的深度和模板缓冲区状态
    renderContext.depth = this.depth;
    renderContext.stencil = this.stencil;

    // 如果没有裁剪上下文，创建一个
    if (!renderContext.clippingContext) renderContext.clippingContext = new ClippingContext();
    // 更新全局裁剪上下文
    renderContext.clippingContext.updateGlobal(sceneRef, camera);

    //

    // 调用场景的渲染前回调
    sceneRef.onBeforeRender(this, scene, camera, renderTarget);

    //

    // 获取渲染列表并开始构建
    const renderList = this._renderLists.get(scene, camera);
    renderList.begin();

    // 投影场景中的对象到渲染列表
    this._projectObject(scene, camera, 0, renderList, renderContext.clippingContext);

    // 包含来自目标场景的光源
    if (targetScene !== scene) {
      targetScene.traverseVisible(function (object) {
        // 如果是光源且在相机层级中可见，添加到渲染列表
        if (object.isLight && object.layers.test(camera.layers)) {
          renderList.pushLight(object);
        }
      });
    }

    // 完成渲染列表构建
    renderList.finish();

    //

    // 如果有渲染目标，更新渲染目标数据
    if (renderTarget !== null) {
      this._textures.updateRenderTarget(renderTarget, activeMipmapLevel);

      // 获取渲染目标数据
      const renderTargetData = this._textures.get(renderTarget);

      // 设置渲染上下文的纹理和深度纹理
      renderContext.textures = renderTargetData.textures;
      renderContext.depthTexture = renderTargetData.depthTexture;
    } else {
      // 如果没有渲染目标，清空纹理引用
      renderContext.textures = null;
      renderContext.depthTexture = null;
    }

    //

    // 更新背景
    this._background.update(sceneRef, renderList, renderContext);

    // 处理渲染列表

    // 获取各类渲染对象列表
    const opaqueObjects = renderList.opaque; // 不透明对象
    const transparentObjects = renderList.transparent; // 透明对象
    const transparentDoublePassObjects = renderList.transparentDoublePass; // 双面透明对象
    const lightsNode = renderList.lightsNode; // 光源节点

    // 渲染不透明对象（如果启用且有对象）
    if (this.opaque === true && opaqueObjects.length > 0) this._renderObjects(opaqueObjects, camera, sceneRef, lightsNode);
    // 渲染透明对象（如果启用且有对象）
    if (this.transparent === true && transparentObjects.length > 0) this._renderTransparents(transparentObjects, transparentDoublePassObjects, camera, sceneRef, lightsNode);

    // 恢复渲染树状态

    // 恢复之前的渲染ID
    nodeFrame.renderId = previousRenderId;

    // 恢复之前的渲染状态
    this._currentRenderContext = previousRenderContext;
    this._currentRenderObjectFunction = previousRenderObjectFunction;
    this._compilationPromises = previousCompilationPromises;

    // 恢复对象处理函数为直接渲染函数
    this._handleObjectFunction = this._renderObjectDirect;

    // 等待所有后端设置的编译/链接/管线创建Promise完成

    // 等待所有编译Promise完成
    await Promise.all(compilationPromises);
  }

  /**
   * 以异步方式渲染场景
   * 确保渲染器已初始化后再进行渲染
   *
   * @async
   * @param {Object3D} scene - 要渲染的场景或3D对象
   * @param {Camera} camera - 相机对象
   * @return {Promise} 当渲染完成时解析的Promise
   */
  async renderAsync(scene, camera) {
    // 如果未初始化，先异步初始化
    if (this._initialized === false) await this.init();

    // 执行场景渲染
    this._renderScene(scene, camera);
  }

  /**
   * 用于同步CPU操作与GPU任务
   * 当调用此方法时，CPU等待GPU完成其操作（例如计算任务）
   *
   * @async
   * @return {Promise} 当同步完成时解析的Promise
   */
  async waitForGPU() {
    // 等待后端GPU操作完成
    await this.backend.waitForGPU();
  }

  /**
   * 启用或禁用模型视图和法线视图矩阵的高精度
   * 启用时，将使用CPU 64位精度以获得更高精度，而不是GPU 32位以获得更高性能
   *
   * 注意：64位精度与 `InstancedMesh` 和 `SkinnedMesh` 不兼容
   *
   * @param {boolean} value - 是否启用或禁用高精度
   * @type {boolean}
   */
  set highPrecision(value) {
    // 如果启用高精度
    if (value === true) {
      // 设置高精度模型视图矩阵节点
      this.overrideNodes.modelViewMatrix = highpModelViewMatrix;
      // 设置高精度模型法线视图矩阵节点
      this.overrideNodes.modelNormalViewMatrix = highpModelNormalViewMatrix;
    } else if (this.highPrecision) {
      // 如果禁用高精度且当前是高精度模式，清除覆盖节点
      this.overrideNodes.modelViewMatrix = null;
      this.overrideNodes.modelNormalViewMatrix = null;
    }
  }

  /**
   * 返回是否启用了高精度
   * 检查模型视图矩阵和法线视图矩阵是否都使用高精度节点
   *
   * @return {boolean} 是否启用了高精度
   * @type {boolean}
   */
  get highPrecision() {
    // 检查两个矩阵节点是否都是高精度版本
    return this.overrideNodes.modelViewMatrix === highpModelViewMatrix && this.overrideNodes.modelNormalViewMatrix === highpModelNormalViewMatrix;
  }

  /**
   * 设置给定的MRT（多渲染目标）配置
   * 允许同时渲染到多个目标
   *
   * @param {MRTNode} mrt - 要设置的MRT节点
   * @return {Renderer} 此渲染器的引用
   */
  setMRT(mrt) {
    // 设置多渲染目标配置
    this._mrt = mrt;

    // 返回this以支持链式调用
    return this;
  }

  /**
   * 返回MRT（多渲染目标）配置
   * 获取当前的多渲染目标设置
   *
   * @return {MRTNode} MRT配置节点
   */
  getMRT() {
    // 返回当前的多渲染目标配置
    return this._mrt;
  }

  /**
   * 返回颜色缓冲区类型
   * 获取当前使用的颜色缓冲区数据类型
   *
   * @return {number} 颜色缓冲区类型常量
   */
  getColorBufferType() {
    // 返回颜色缓冲区类型
    return this._colorBufferType;
  }

  /**
   * 设备丢失回调的默认实现
   * 当渲染设备丢失时调用此方法
   *
   * @private
   * @param {Object} info - 关于上下文丢失的信息
   */
  _onDeviceLost(info) {
    let errorMessage = `THREE.WebGPURenderer: ${info.api} Device Lost:\n\nMessage: ${info.message}`;

    if (info.reason) {
      errorMessage += `\nReason: ${info.reason}`;
    }

    console.error(errorMessage);

    this._isDeviceLost = true;
  }

  /**
   * 渲染给定的渲染包
   * 渲染包是一组预先组织好的渲染对象，用于优化渲染性能
   *
   * @private
   * @param {Object} bundle - 渲染包数据
   * @param {Scene} sceneRef - 渲染包所属的场景
   * @param {LightsNode} lightsNode - 光源节点
   */
  _renderBundle(bundle, sceneRef, lightsNode) {
    // 从渲染包中解构出必要的组件
    const { bundleGroup, camera, renderList } = bundle;

    // 获取当前渲染上下文
    const renderContext = this._currentRenderContext;

    //

    // 获取渲染包对象和其后端数据
    const renderBundle = this._bundles.get(bundleGroup, camera);
    const renderBundleData = this.backend.get(renderBundle);

    // 如果渲染上下文集合未定义，初始化为空集合
    if (renderBundleData.renderContexts === undefined) renderBundleData.renderContexts = new Set();

    //

    // 检查是否需要更新（版本号不匹配）
    const needsUpdate = bundleGroup.version !== renderBundleData.version;
    // 检查渲染包是否需要更新（新的渲染上下文或版本更新）
    const renderBundleNeedsUpdate = renderBundleData.renderContexts.has(renderContext) === false || needsUpdate;

    // 将当前渲染上下文添加到集合中
    renderBundleData.renderContexts.add(renderContext);

    // 如果渲染包需要更新
    if (renderBundleNeedsUpdate) {
      // 开始构建渲染包
      this.backend.beginBundle(renderContext);

      // 如果渲染对象数组未定义或需要更新，重新初始化
      if (renderBundleData.renderObjects === undefined || needsUpdate) {
        renderBundleData.renderObjects = [];
      }

      // 设置当前渲染包
      this._currentRenderBundle = renderBundle;

      // 从渲染列表中解构出不同类型的对象
      const { transparentDoublePass: transparentDoublePassObjects, transparent: transparentObjects, opaque: opaqueObjects } = renderList;

      // 渲染不透明对象（如果启用且有对象）
      if (this.opaque === true && opaqueObjects.length > 0) this._renderObjects(opaqueObjects, camera, sceneRef, lightsNode);
      // 渲染透明对象（如果启用且有对象）
      if (this.transparent === true && transparentObjects.length > 0) this._renderTransparents(transparentObjects, transparentDoublePassObjects, camera, sceneRef, lightsNode);

      // 清除当前渲染包引用
      this._currentRenderBundle = null;

      //

      // 完成渲染包构建
      this.backend.finishBundle(renderContext, renderBundle);

      // 更新版本号
      renderBundleData.version = bundleGroup.version;
    } else {
      // 如果不需要更新，只更新需要刷新的渲染对象
      const { renderObjects } = renderBundleData;

      // 遍历所有渲染对象
      for (let i = 0, l = renderObjects.length; i < l; i++) {
        const renderObject = renderObjects[i];

        // 如果渲染对象需要刷新
        if (this._nodes.needsRefresh(renderObject)) {
          // 更新节点（渲染前）
          this._nodes.updateBefore(renderObject);

          // 更新节点和绑定以供渲染
          this._nodes.updateForRender(renderObject);
          this._bindings.updateForRender(renderObject);

          // 更新节点（渲染后）
          this._nodes.updateAfter(renderObject);
        }
      }
    }

    // 将渲染包添加到后端进行实际渲染
    this.backend.addBundle(renderContext, renderBundle);
  }

  /**
   * 使用给定的相机渲染场景或3D对象
   * 此方法只能在渲染器已初始化后调用
   *
   * 方法的目标是默认帧缓冲区（即画布）
   * 或者通过 `setRenderTarget()` 指定的渲染目标
   *
   * @param {Object3D} scene - 要渲染的场景或3D对象
   * @param {Camera} camera - 用于渲染场景的相机
   * @return {?Promise} 当场景渲染完成时解析的Promise
   * 仅在渲染器未初始化时返回
   */
  render(scene, camera) {
    // 检查渲染器是否已初始化
    if (this._initialized === false) {
      console.warn("THREE.Renderer: .render() called before the backend is initialized. Try using .renderAsync() instead.");

      // 如果未初始化，使用异步渲染方法
      return this.renderAsync(scene, camera);
    }

    // 执行场景渲染
    this._renderScene(scene, camera);
  }

  /**
   * 返回用于计算输出色调映射和颜色空间转换的内部渲染目标
   * 与 `WebGLRenderer` 不同，这是在单独的渲染通道中完成的，
   * 而不是内联完成，以获得更正确的结果
   *
   * @private
   * @return {?RenderTarget} 渲染目标。如果不需要应用输出转换，该方法返回 `null`
   */
  _getFrameBufferTarget() {
    // 获取当前的色调映射和颜色空间设置
    const { currentToneMapping, currentColorSpace } = this;

    // 检查是否需要色调映射
    const useToneMapping = currentToneMapping !== NoToneMapping;
    // 检查是否需要颜色空间转换
    const useColorSpace = currentColorSpace !== ColorManagement.workingColorSpace;

    // 如果不需要色调映射和颜色空间转换，返回null
    if (useToneMapping === false && useColorSpace === false) return null;

    // 获取绘制缓冲区尺寸和深度/模板设置
    const { width, height } = this.getDrawingBufferSize(_drawingBufferSize);
    const { depth, stencil } = this;

    // 获取或创建帧缓冲区目标
    let frameBufferTarget = this._frameBufferTarget;

    // 如果帧缓冲区目标不存在，创建一个新的
    if (frameBufferTarget === null) {
      frameBufferTarget = new RenderTarget(width, height, {
        depthBuffer: depth, // 深度缓冲区设置
        stencilBuffer: stencil, // 模板缓冲区设置
        type: this._colorBufferType, // 颜色缓冲区类型
        format: RGBAFormat, // RGBA格式
        colorSpace: ColorManagement.workingColorSpace, // 工作颜色空间
        generateMipmaps: false, // 不生成mipmap
        minFilter: LinearFilter, // 线性缩小过滤
        magFilter: LinearFilter, // 线性放大过滤
        samples: this.samples, // 采样数
      });

      // 标记为后处理渲染目标
      frameBufferTarget.isPostProcessingRenderTarget = true;

      // 缓存帧缓冲区目标
      this._frameBufferTarget = frameBufferTarget;
    }

    // 获取输出渲染目标
    const outputRenderTarget = this.getOutputRenderTarget();

    // 更新帧缓冲区目标的缓冲区设置
    frameBufferTarget.depthBuffer = depth;
    frameBufferTarget.stencilBuffer = stencil;

    // 根据输出渲染目标设置尺寸
    if (outputRenderTarget !== null) {
      frameBufferTarget.setSize(outputRenderTarget.width, outputRenderTarget.height, outputRenderTarget.depth);
    } else {
      frameBufferTarget.setSize(width, height, 1);
    }

    // 复制视口和裁剪设置
    frameBufferTarget.viewport.copy(this._viewport);
    frameBufferTarget.scissor.copy(this._scissor);
    // 应用像素比缩放
    frameBufferTarget.viewport.multiplyScalar(this._pixelRatio);
    frameBufferTarget.scissor.multiplyScalar(this._pixelRatio);
    // 设置裁剪测试
    frameBufferTarget.scissorTest = this._scissorTest;
    // 设置多视图和深度缓冲区解析选项
    frameBufferTarget.multiview = outputRenderTarget !== null ? outputRenderTarget.multiview : false;
    frameBufferTarget.resolveDepthBuffer = outputRenderTarget !== null ? outputRenderTarget.resolveDepthBuffer : true;
    frameBufferTarget._autoAllocateDepthBuffer = outputRenderTarget !== null ? outputRenderTarget._autoAllocateDepthBuffer : false;

    return frameBufferTarget;
  }

  /**
   * 使用给定的相机渲染场景或3D对象
   * 这是内部渲染方法，处理完整的渲染流程
   *
   * @private
   * @param {Object3D} scene - 要渲染的场景或3D对象
   * @param {Camera} camera - 用于渲染场景的相机
   * @param {boolean} [useFrameBufferTarget=true] - 是否使用帧缓冲区目标
   * @return {RenderContext} 当前渲染上下文
   */
  _renderScene(scene, camera, useFrameBufferTarget = true) {
    // 如果设备丢失，直接返回
    if (this._isDeviceLost === true) return;

    // 根据参数决定是否使用帧缓冲区目标
    const frameBufferTarget = useFrameBufferTarget ? this._getFrameBufferTarget() : null;

    // 保存渲染树状态

    // 获取节点帧引用
    const nodeFrame = this._nodes.nodeFrame;

    // 保存之前的状态以便后续恢复
    const previousRenderId = nodeFrame.renderId;
    const previousRenderContext = this._currentRenderContext;
    const previousRenderObjectFunction = this._currentRenderObjectFunction;

    //

    // 确定场景引用（如果是场景则使用原场景，否则使用默认场景）
    const sceneRef = scene.isScene === true ? scene : _scene;

    // 获取输出渲染目标
    const outputRenderTarget = this._renderTarget || this._outputRenderTarget;

    // 获取当前活动的立方体面和mipmap级别
    const activeCubeFace = this._activeCubeFace;
    const activeMipmapLevel = this._activeMipmapLevel;

    //

    // 确定最终的渲染目标
    let renderTarget;

    if (frameBufferTarget !== null) {
      // 如果有帧缓冲区目标，使用它作为渲染目标
      renderTarget = frameBufferTarget;

      // 设置当前渲染目标
      this.setRenderTarget(renderTarget);
    } else {
      // 否则使用输出渲染目标
      renderTarget = outputRenderTarget;
    }

    //

    // 获取或创建渲染上下文
    const renderContext = this._renderContexts.get(scene, camera, renderTarget);

    // 设置当前渲染状态
    this._currentRenderContext = renderContext;
    this._currentRenderObjectFunction = this._renderObjectFunction || this.renderObject;

    //

    // 更新渲染统计信息
    this.info.calls++;
    this.info.render.calls++;
    this.info.render.frameCalls++;

    // 设置节点帧的渲染ID
    nodeFrame.renderId = this.info.calls;

    //

    // 获取坐标系统和XR引用
    const coordinateSystem = this.coordinateSystem;
    const xr = this.xr;

    // 如果相机坐标系统与渲染器不匹配且不在XR演示模式下，更新相机坐标系统
    if (camera.coordinateSystem !== coordinateSystem && xr.isPresenting === false) {
      camera.coordinateSystem = coordinateSystem;
      camera.updateProjectionMatrix();

      // 如果是数组相机，更新所有子相机的坐标系统
      if (camera.isArrayCamera) {
        for (const subCamera of camera.cameras) {
          subCamera.coordinateSystem = coordinateSystem;
          subCamera.updateProjectionMatrix();
        }
      }
    }

    //

    // 如果场景启用了自动更新世界矩阵，更新场景的世界矩阵
    if (scene.matrixWorldAutoUpdate === true) scene.updateMatrixWorld();

    // 如果相机没有父对象且启用了自动更新世界矩阵，更新相机的世界矩阵
    if (camera.parent === null && camera.matrixWorldAutoUpdate === true) camera.updateMatrixWorld();

    // 如果XR已启用且正在演示，使用XR相机进行渲染
    if (xr.enabled === true && xr.isPresenting === true) {
      if (xr.cameraAutoUpdate === true) xr.updateCamera(camera);
      camera = xr.getCamera(); // 使用XR相机进行渲染
    }

    //

    // 设置视口、裁剪和像素比参数
    let viewport = this._viewport;
    let scissor = this._scissor;
    let pixelRatio = this._pixelRatio;

    // 如果有渲染目标，使用渲染目标的设置
    if (renderTarget !== null) {
      viewport = renderTarget.viewport;
      scissor = renderTarget.scissor;
      pixelRatio = 1; // 渲染目标使用1:1像素比
    }

    // 获取绘制缓冲区尺寸
    this.getDrawingBufferSize(_drawingBufferSize);

    // 设置屏幕矩形
    _screen.set(0, 0, _drawingBufferSize.width, _drawingBufferSize.height);

    // 获取深度范围值
    const minDepth = viewport.minDepth === undefined ? 0 : viewport.minDepth;
    const maxDepth = viewport.maxDepth === undefined ? 1 : viewport.maxDepth;

    // 设置渲染上下文的视口值
    renderContext.viewportValue.copy(viewport).multiplyScalar(pixelRatio).floor();
    renderContext.viewportValue.width >>= activeMipmapLevel; // 根据mipmap级别调整宽度
    renderContext.viewportValue.height >>= activeMipmapLevel; // 根据mipmap级别调整高度
    renderContext.viewportValue.minDepth = minDepth;
    renderContext.viewportValue.maxDepth = maxDepth;
    renderContext.viewport = renderContext.viewportValue.equals(_screen) === false;

    // 设置渲染上下文的裁剪值
    renderContext.scissorValue.copy(scissor).multiplyScalar(pixelRatio).floor();
    renderContext.scissor = this._scissorTest && renderContext.scissorValue.equals(_screen) === false;
    renderContext.scissorValue.width >>= activeMipmapLevel; // 根据mipmap级别调整宽度
    renderContext.scissorValue.height >>= activeMipmapLevel; // 根据mipmap级别调整高度

    // 初始化或更新裁剪上下文
    if (!renderContext.clippingContext) renderContext.clippingContext = new ClippingContext();
    renderContext.clippingContext.updateGlobal(sceneRef, camera);

    //

    // 调用场景的渲染前回调
    sceneRef.onBeforeRender(this, scene, camera, renderTarget);

    //

    // 设置视锥体（根据相机类型选择合适的视锥体）
    const frustum = camera.isArrayCamera ? _frustumArray : _frustum;

    // 如果不是数组相机，计算投影屏幕矩阵并设置视锥体
    if (!camera.isArrayCamera) {
      _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(_projScreenMatrix, camera.coordinateSystem, camera.reversedDepth);
    }

    // 获取渲染列表并开始构建
    const renderList = this._renderLists.get(scene, camera);
    renderList.begin();

    // 投影场景对象到渲染列表中
    this._projectObject(scene, camera, 0, renderList, renderContext.clippingContext);

    // 完成渲染列表构建
    renderList.finish();

    // 如果启用了对象排序，对渲染列表进行排序
    if (this.sortObjects === true) {
      renderList.sort(this._opaqueSort, this._transparentSort);
    }

    //

    // 设置渲染上下文的纹理和尺寸信息
    if (renderTarget !== null) {
      // 如果有渲染目标，更新渲染目标并获取其数据
      this._textures.updateRenderTarget(renderTarget, activeMipmapLevel);

      const renderTargetData = this._textures.get(renderTarget);

      // 设置渲染上下文的纹理相关属性
      renderContext.textures = renderTargetData.textures;
      renderContext.depthTexture = renderTargetData.depthTexture;
      renderContext.width = renderTargetData.width;
      renderContext.height = renderTargetData.height;
      renderContext.renderTarget = renderTarget;
      renderContext.depth = renderTarget.depthBuffer;
      renderContext.stencil = renderTarget.stencilBuffer;
    } else {
      // 如果没有渲染目标，使用默认设置
      renderContext.textures = null;
      renderContext.depthTexture = null;
      renderContext.width = this.domElement.width;
      renderContext.height = this.domElement.height;
      renderContext.depth = this.depth;
      renderContext.stencil = this.stencil;
    }

    // 根据mipmap级别调整渲染上下文尺寸
    renderContext.width >>= activeMipmapLevel;
    renderContext.height >>= activeMipmapLevel;
    renderContext.activeCubeFace = activeCubeFace;
    renderContext.activeMipmapLevel = activeMipmapLevel;
    renderContext.occlusionQueryCount = renderList.occlusionQueryCount;

    //

    // 更新背景
    this._background.update(sceneRef, renderList, renderContext);

    //

    // 设置渲染上下文的相机并开始渲染
    renderContext.camera = camera;
    this.backend.beginRender(renderContext);

    // 处理渲染列表

    // 从渲染列表中解构出各种类型的对象
    const { bundles, lightsNode, transparentDoublePass: transparentDoublePassObjects, transparent: transparentObjects, opaque: opaqueObjects } = renderList;

    // 按顺序渲染不同类型的对象
    if (bundles.length > 0) this._renderBundles(bundles, sceneRef, lightsNode); // 渲染包
    if (this.opaque === true && opaqueObjects.length > 0) this._renderObjects(opaqueObjects, camera, sceneRef, lightsNode); // 不透明对象
    if (this.transparent === true && transparentObjects.length > 0) this._renderTransparents(transparentObjects, transparentDoublePassObjects, camera, sceneRef, lightsNode); // 透明对象

    // 完成渲染通道

    this.backend.finishRender(renderContext);

    // 恢复渲染树状态

    nodeFrame.renderId = previousRenderId;

    this._currentRenderContext = previousRenderContext;
    this._currentRenderObjectFunction = previousRenderObjectFunction;

    //

    // 如果使用了帧缓冲区目标，需要进行输出处理
    if (frameBufferTarget !== null) {
      // 恢复到输出渲染目标
      this.setRenderTarget(outputRenderTarget, activeCubeFace, activeMipmapLevel);

      // 执行输出渲染（色调映射和颜色空间转换）
      this._renderOutput(renderTarget);
    }

    //

    // 调用场景的渲染后回调
    sceneRef.onAfterRender(this, scene, camera, renderTarget);

    //

    // 返回渲染上下文
    return renderContext;
  }

  /**
   * 设置XR层的尺寸
   * 用于WebXR渲染时调整渲染器尺寸
   *
   * @private
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  _setXRLayerSize(width, height) {
    this._width = width;
    this._height = height;

    this.setViewport(0, 0, width, height);
  }

  /**
   * 输出通道执行色调映射和颜色空间转换
   * 这是渲染管线的最后阶段，处理最终输出
   *
   * @private
   * @param {RenderTarget} renderTarget - 当前渲染目标
   */
  _renderOutput(renderTarget) {
    // 获取全屏四边形
    const quad = this._quad;

    // 如果输出节点发生变化，更新片段着色器节点
    if (this._nodes.hasOutputChange(renderTarget.texture)) {
      quad.material.fragmentNode = this._nodes.getOutputNode(renderTarget.texture);
      quad.material.needsUpdate = true;
    }

    // 清除操作会清除中间渲染目标纹理，但不应更新屏幕画布

    // 保存当前设置
    const currentAutoClear = this.autoClear;
    const currentXR = this.xr.enabled;

    // 临时禁用自动清除和XR
    this.autoClear = false;
    this.xr.enabled = false;

    // 渲染全屏四边形以执行输出转换
    this._renderScene(quad, quad.camera, false);

    // 恢复之前的设置
    this.autoClear = currentAutoClear;
    this.xr.enabled = currentXR;
  }

  /**
   * 返回纹理过滤的最大可用各向异性值
   * 用于获取硬件支持的最大各向异性过滤级别
   *
   * @return {number} 最大可用各向异性值
   */
  getMaxAnisotropy() {
    return this.backend.getMaxAnisotropy();
  }

  /**
   * 返回活动的立方体贴图面
   * 获取当前正在渲染的立方体贴图面索引
   *
   * @return {number} 活动的立方体贴图面索引
   */
  getActiveCubeFace() {
    return this._activeCubeFace;
  }

  /**
   * 返回活动的mipmap级别
   * 获取当前正在渲染的mipmap层级
   *
   * @return {number} 活动的mipmap级别
   */
  getActiveMipmapLevel() {
    return this._activeMipmapLevel;
  }

  /**
   * 建议应用程序始终使用此方法定义动画循环
   * 而不是手动使用 `requestAnimationFrame()` 以获得最佳兼容性
   *
   * @async
   * @param {?Function} callback - 应用程序的动画循环回调函数
   * @return {Promise} 当设置执行完成时解析的Promise
   */
  async setAnimationLoop(callback) {
    if (this._initialized === false) await this.init();

    this._animation.setAnimationLoop(callback);
  }

  /**
   * 可用于在计算着色器上下文中将存储缓冲区属性的缓冲区数据
   * 从GPU传输到CPU
   *
   * @async
   * @param {StorageBufferAttribute} attribute - 存储缓冲区属性
   * @return {Promise<ArrayBuffer>} 当数据准备就绪时解析缓冲区数据的Promise
   */
  async getArrayBufferAsync(attribute) {
    return await this.backend.getArrayBufferAsync(attribute);
  }

  /**
   * 返回渲染上下文
   * 获取底层的渲染上下文对象
   *
   * @return {GPUCanvasContext|WebGL2RenderingContext} 渲染上下文
   */
  getContext() {
    return this.backend.getContext();
  }

  /**
   * 返回像素比
   * 获取当前设置的设备像素比
   *
   * @return {number} 像素比值
   */
  getPixelRatio() {
    return this._pixelRatio;
  }

  /**
   * 返回物理像素单位的绘制缓冲区尺寸
   * 此方法考虑像素比的影响
   *
   * @param {Vector2} target - 方法将结果写入此目标对象
   * @return {Vector2} 绘制缓冲区尺寸
   */
  getDrawingBufferSize(target) {
    return target.set(this._width * this._pixelRatio, this._height * this._pixelRatio).floor();
  }

  /**
   * 返回逻辑像素单位的渲染器尺寸
   * 此方法不考虑像素比的影响
   *
   * @param {Vector2} target - 方法将结果写入此目标对象
   * @return {Vector2} 逻辑像素单位的渲染器尺寸
   */
  getSize(target) {
    return target.set(this._width, this._height);
  }

  /**
   * 设置给定的像素比并在必要时调整画布大小
   * 用于处理高DPI显示器的像素密度
   *
   * @param {number} [value=1] - 像素比值
   */
  setPixelRatio(value = 1) {
    // 如果像素比没有变化，直接返回
    if (this._pixelRatio === value) return;

    // 更新像素比
    this._pixelRatio = value;

    // 重新设置尺寸以应用新的像素比（不更新样式）
    this.setSize(this._width, this._height, false);
  }

  /**
   * 此方法允许通过一次指定宽度、高度和像素比来定义绘制缓冲区尺寸
   * 绘制缓冲区的尺寸使用以下公式计算：
   * ```js
   * size.x = width * pixelRatio;
   * size.y = height * pixelRatio;
   * ```
   *
   * @param {number} width - 逻辑像素宽度
   * @param {number} height - 逻辑像素高度
   * @param {number} pixelRatio - 像素比
   */
  setDrawingBufferSize(width, height, pixelRatio) {
    // 在XR演示期间无法调整渲染器大小
    if (this.xr && this.xr.isPresenting) return;

    // 设置逻辑尺寸
    this._width = width;
    this._height = height;

    // 设置像素比
    this._pixelRatio = pixelRatio;

    // 设置画布的物理尺寸
    this.domElement.width = Math.floor(width * pixelRatio);
    this.domElement.height = Math.floor(height * pixelRatio);

    // 设置视口
    this.setViewport(0, 0, width, height);

    // 如果已初始化，通知后端更新尺寸
    if (this._initialized) this.backend.updateSize();
  }

  /**
   * 设置渲染器的尺寸
   * 调整画布的逻辑尺寸和物理尺寸
   *
   * @param {number} width - 逻辑像素宽度
   * @param {number} height - 逻辑像素高度
   * @param {boolean} [updateStyle=true] - 是否更新画布的 `style` 属性
   */
  setSize(width, height, updateStyle = true) {
    // 在XR演示期间无法调整渲染器大小
    if (this.xr && this.xr.isPresenting) return;

    // 设置逻辑尺寸
    this._width = width;
    this._height = height;

    // 设置物理尺寸（考虑像素比）
    this.domElement.width = Math.floor(width * this._pixelRatio);
    this.domElement.height = Math.floor(height * this._pixelRatio);

    // 如果需要更新样式
    if (updateStyle === true) {
      // 设置CSS样式尺寸
      this.domElement.style.width = width + "px";
      this.domElement.style.height = height + "px";
    }

    // 设置视口为全屏
    this.setViewport(0, 0, width, height);

    // 如果已初始化，通知后端更新尺寸
    if (this._initialized) this.backend.updateSize();
  }

  /**
   * 为不透明渲染列表定义手动排序函数
   * 传递 `null` 以使用默认排序
   *
   * @param {Function} method - 排序函数
   */
  setOpaqueSort(method) {
    this._opaqueSort = method;
  }

  /**
   * 为透明渲染列表定义手动排序函数
   * 传递 `null` 以使用默认排序
   *
   * @param {Function} method - 排序函数
   */
  setTransparentSort(method) {
    this._transparentSort = method;
  }

  /**
   * 返回裁剪矩形
   * 获取当前设置的裁剪区域
   *
   * @param {Vector4} target - 方法将结果写入此目标对象
   * @return {Vector4} 裁剪矩形
   */
  getScissor(target) {
    const scissor = this._scissor;

    target.x = scissor.x;
    target.y = scissor.y;
    target.width = scissor.width;
    target.height = scissor.height;

    return target;
  }

  /**
   * 定义裁剪矩形
   * 设置渲染时的裁剪区域
   *
   * @param {number | Vector4} x - 逻辑像素单位中框左下角的水平坐标
   * 除了传递四个参数外，该方法也可以使用单个四维向量
   * @param {number} y - 逻辑像素单位中框左下角的垂直坐标
   * @param {number} width - 逻辑像素单位中裁剪框的宽度
   * @param {number} height - 逻辑像素单位中裁剪框的高度
   */
  setScissor(x, y, width, height) {
    const scissor = this._scissor;

    if (x.isVector4) {
      scissor.copy(x);
    } else {
      scissor.set(x, y, width, height);
    }
  }

  /**
   * 返回裁剪测试值
   * 获取当前裁剪测试的启用状态
   *
   * @return {boolean} 是否应该启用裁剪测试
   */
  getScissorTest() {
    return this._scissorTest;
  }

  /**
   * 定义裁剪测试
   * 启用或禁用裁剪测试功能
   *
   * @param {boolean} boolean - 是否应该启用裁剪测试
   */
  setScissorTest(boolean) {
    this._scissorTest = boolean;

    this.backend.setScissorTest(boolean);
  }

  /**
   * 返回视口定义
   * 获取当前设置的视口区域
   *
   * @param {Vector4} target - 方法将结果写入此目标对象
   * @return {Vector4} 视口定义
   */
  getViewport(target) {
    return target.copy(this._viewport);
  }

  /**
   * 定义视口
   * 设置渲染时的视口区域
   *
   * @param {number | Vector4} x - 逻辑像素单位中视口原点左下角的水平坐标
   * @param {number} y - 逻辑像素单位中视口原点左下角的垂直坐标
   * @param {number} width - 逻辑像素单位中视口的宽度
   * @param {number} height - 逻辑像素单位中视口的高度
   * @param {number} minDepth - 视口的最小深度值。仅WebGPU支持
   * @param {number} maxDepth - 视口的最大深度值。仅WebGPU支持
   */
  setViewport(x, y, width, height, minDepth = 0, maxDepth = 1) {
    const viewport = this._viewport;

    if (x.isVector4) {
      viewport.copy(x);
    } else {
      viewport.set(x, y, width, height);
    }

    viewport.minDepth = minDepth;
    viewport.maxDepth = maxDepth;
  }

  /**
   * 返回清除颜色
   * 获取当前设置的清除颜色值
   *
   * @param {Color} target - 方法将结果写入此目标对象
   * @return {Color} 清除颜色
   */
  getClearColor(target) {
    return target.copy(this._clearColor);
  }

  /**
   * 定义清除颜色和可选的清除透明度
   * 设置渲染前清除缓冲区时使用的颜色
   *
   * @param {Color} color - 清除颜色
   * @param {number} [alpha=1] - 清除透明度
   */
  setClearColor(color, alpha = 1) {
    this._clearColor.set(color);
    this._clearColor.a = alpha;
  }

  /**
   * 返回清除透明度
   * 获取当前设置的清除透明度值
   *
   * @return {number} 清除透明度
   */
  getClearAlpha() {
    return this._clearColor.a;
  }

  /**
   * 定义清除透明度
   * 设置清除颜色的透明度分量
   *
   * @param {number} alpha - 清除透明度
   */
  setClearAlpha(alpha) {
    this._clearColor.a = alpha;
  }

  /**
   * 返回清除深度值
   * 获取当前设置的深度缓冲区清除值
   *
   * @return {number} 清除深度值
   */
  getClearDepth() {
    return this._clearDepth;
  }

  /**
   * 定义清除深度值
   * 设置深度缓冲区的清除值
   *
   * @param {number} depth - 清除深度值
   */
  setClearDepth(depth) {
    this._clearDepth = depth;
  }

  /**
   * 返回清除模板值
   * 获取当前设置的模板缓冲区清除值
   *
   * @return {number} 清除模板值
   */
  getClearStencil() {
    return this._clearStencil;
  }

  /**
   * 定义清除模板值
   * 设置模板缓冲区的清除值
   *
   * @param {number} stencil - 清除模板值
   */
  setClearStencil(stencil) {
    this._clearStencil = stencil;
  }

  /**
   * 此方法对给定的3D对象执行遮挡查询
   * 如果给定的3D对象被场景中的其他3D对象完全遮挡，则返回 `true`
   *
   * @param {Object3D} object - 要测试的3D对象
   * @return {boolean} 3D对象是否被完全遮挡
   */
  isOccluded(object) {
    const renderContext = this._currentRenderContext;

    return renderContext && this.backend.isOccluded(renderContext, object);
  }

  /**
   * 执行手动清除操作
   * 此方法忽略 `autoClear` 属性
   *
   * @param {boolean} [color=true] - 是否应该清除颜色缓冲区
   * @param {boolean} [depth=true] - 是否应该清除深度缓冲区
   * @param {boolean} [stencil=true] - 是否应该清除模板缓冲区
   * @return {Promise} 当清除操作执行完成时解析的Promise
   * 仅在渲染器未初始化时返回
   */
  clear(color = true, depth = true, stencil = true) {
    // 检查渲染器是否已初始化
    if (this._initialized === false) {
      console.warn("THREE.Renderer: .clear() called before the backend is initialized. Try using .clearAsync() instead.");

      // 如果未初始化，使用异步清除方法
      return this.clearAsync(color, depth, stencil);
    }

    // 获取渲染目标（当前渲染目标或帧缓冲区目标）
    const renderTarget = this._renderTarget || this._getFrameBufferTarget();

    // 初始化渲染上下文
    let renderContext = null;

    // 如果有渲染目标
    if (renderTarget !== null) {
      // 更新渲染目标
      this._textures.updateRenderTarget(renderTarget);

      // 获取渲染目标数据
      const renderTargetData = this._textures.get(renderTarget);

      // 获取清除操作的渲染上下文
      renderContext = this._renderContexts.getForClear(renderTarget);
      // 设置渲染上下文属性
      renderContext.textures = renderTargetData.textures; // 纹理数组
      renderContext.depthTexture = renderTargetData.depthTexture; // 深度纹理
      renderContext.width = renderTargetData.width; // 宽度
      renderContext.height = renderTargetData.height; // 高度
      renderContext.renderTarget = renderTarget; // 渲染目标
      renderContext.depth = renderTarget.depthBuffer; // 深度缓冲区
      renderContext.stencil = renderTarget.stencilBuffer; // 模板缓冲区
      // #30329 - 设置清除颜色值
      renderContext.clearColorValue = this.backend.getClearColor();
      renderContext.activeCubeFace = this.getActiveCubeFace(); // 活动立方体面
      renderContext.activeMipmapLevel = this.getActiveMipmapLevel(); // 活动mipmap级别
    }

    // 执行后端清除操作
    this.backend.clear(color, depth, stencil, renderContext);

    // 如果有渲染目标且当前没有设置渲染目标，执行输出渲染
    if (renderTarget !== null && this._renderTarget === null) {
      this._renderOutput(renderTarget);
    }
  }

  /**
   * 执行颜色缓冲区的手动清除操作
   * 此方法忽略 `autoClear` 属性
   *
   * @return {Promise} 当清除操作执行完成时解析的Promise
   * 仅在渲染器未初始化时返回
   */
  clearColor() {
    return this.clear(true, false, false);
  }

  /**
   * 执行深度缓冲区的手动清除操作
   * 此方法忽略 `autoClear` 属性
   *
   * @return {Promise} 当清除操作执行完成时解析的Promise
   * 仅在渲染器未初始化时返回
   */
  clearDepth() {
    return this.clear(false, true, false);
  }

  /**
   * 执行模板缓冲区的手动清除操作
   * 此方法忽略 `autoClear` 属性
   *
   * @return {Promise} 当清除操作执行完成时解析的Promise
   * 仅在渲染器未初始化时返回
   */
  clearStencil() {
    return this.clear(false, false, true);
  }

  /**
   * {@link Renderer#clear} 的异步版本
   * 确保渲染器初始化后再执行清除操作
   *
   * @async
   * @param {boolean} [color=true] - 是否应该清除颜色缓冲区
   * @param {boolean} [depth=true] - 是否应该清除深度缓冲区
   * @param {boolean} [stencil=true] - 是否应该清除模板缓冲区
   * @return {Promise} 当清除操作执行完成时解析的Promise
   */
  async clearAsync(color = true, depth = true, stencil = true) {
    if (this._initialized === false) await this.init();

    this.clear(color, depth, stencil);
  }

  /**
   * {@link Renderer#clearColor} 的异步版本
   * 异步清除颜色缓冲区
   *
   * @async
   * @return {Promise} 当清除操作执行完成时解析的Promise
   */
  async clearColorAsync() {
    this.clearAsync(true, false, false);
  }

  /**
   * {@link Renderer#clearDepth} 的异步版本
   * 异步清除深度缓冲区
   *
   * @async
   * @return {Promise} 当清除操作执行完成时解析的Promise
   */
  async clearDepthAsync() {
    this.clearAsync(false, true, false);
  }

  /**
   * {@link Renderer#clearStencil} 的异步版本
   * 异步清除模板缓冲区
   *
   * @async
   * @return {Promise} 当清除操作执行完成时解析的Promise
   */
  async clearStencilAsync() {
    this.clearAsync(false, false, true);
  }

  /**
   * 渲染器的当前色调映射
   * 当不产生屏幕输出时，色调映射始终为 `NoToneMapping`
   *
   * @type {number}
   */
  get currentToneMapping() {
    return this.isOutputTarget ? this.toneMapping : NoToneMapping;
  }

  /**
   * 渲染器的当前颜色空间
   * 当不产生屏幕输出时，颜色空间始终为工作颜色空间
   *
   * @type {string}
   */
  get currentColorSpace() {
    return this.isOutputTarget ? this.outputColorSpace : ColorManagement.workingColorSpace;
  }

  /**
   * 如果渲染设置设为屏幕输出，则返回 `true`
   * 检查当前渲染目标是否为输出目标
   *
   * @returns {boolean} 如果当前渲染目标与输出渲染目标相同或为 `null`，则为true，否则为false
   */
  get isOutputTarget() {
    return this._renderTarget === this._outputRenderTarget || this._renderTarget === null;
  }

  /**
   * 释放渲染器的所有内部资源
   * 如果应用程序不再使用渲染器，请调用此方法
   */
  dispose() {
    // 释放信息统计模块
    this.info.dispose();
    // 释放后端资源
    this.backend.dispose();

    // 释放各个渲染器模块
    this._animation.dispose(); // 动画模块
    this._objects.dispose(); // 渲染对象模块
    this._pipelines.dispose(); // 管线模块
    this._nodes.dispose(); // 节点模块
    this._bindings.dispose(); // 绑定模块
    this._renderLists.dispose(); // 渲染列表模块
    this._renderContexts.dispose(); // 渲染上下文模块
    this._textures.dispose(); // 纹理模块

    // 如果存在帧缓冲区目标，释放它
    if (this._frameBufferTarget !== null) this._frameBufferTarget.dispose();

    // 释放所有时间戳查询池
    Object.values(this.backend.timestampQueryPool).forEach((queryPool) => {
      if (queryPool !== null) queryPool.dispose();
    });

    // 重置渲染目标和动画循环
    this.setRenderTarget(null);
    this.setAnimationLoop(null);
  }

  /**
   * 设置给定的渲染目标
   * 调用此方法意味着渲染器不再针对默认帧缓冲区（即画布），
   * 而是针对自定义帧缓冲区。使用 `null` 作为第一个参数来重置状态。
   *
   * @param {?RenderTarget} renderTarget - 要设置的渲染目标
   * @param {number} [activeCubeFace=0] - 活动的立方体贴图面
   * @param {number} [activeMipmapLevel=0] - 活动的mipmap级别
   */
  setRenderTarget(renderTarget, activeCubeFace = 0, activeMipmapLevel = 0) {
    // 设置当前渲染目标
    this._renderTarget = renderTarget;
    // 设置活动的立方体贴图面
    this._activeCubeFace = activeCubeFace;
    // 设置活动的mipmap级别
    this._activeMipmapLevel = activeMipmapLevel;
  }

  /**
   * 返回当前渲染目标
   * 获取当前正在使用的渲染目标
   *
   * @return {?RenderTarget} 渲染目标。如果没有设置渲染目标则返回 `null`
   */
  getRenderTarget() {
    // 返回当前渲染目标
    return this._renderTarget;
  }

  /**
   * 设置渲染器的输出渲染目标
   * 用于指定最终输出的目标
   *
   * @param {Object} renderTarget - 要设置为输出目标的渲染目标
   */
  setOutputRenderTarget(renderTarget) {
    // 设置输出渲染目标
    this._outputRenderTarget = renderTarget;
  }

  /**
   * 返回当前输出目标
   * 获取当前的输出渲染目标
   *
   * @return {?RenderTarget} 当前输出渲染目标。如果没有设置输出目标则返回 `null`
   */
  getOutputRenderTarget() {
    // 返回当前输出渲染目标
    return this._outputRenderTarget;
  }

  /**
   * 将渲染器重置为WebXR启动前的初始状态
   * 清理XR相关的渲染目标和状态
   *
   */
  _resetXRState() {
    this.backend.setXRTarget(null);
    this.setOutputRenderTarget(null);
    this.setRenderTarget(null);

    this._frameBufferTarget.dispose();
    this._frameBufferTarget = null;
  }

  /**
   * {@link Renderer#setRenderObjectFunction} 的回调函数类型定义
   * 自定义渲染对象函数的接口规范
   *
   * @callback renderObjectFunction
   * @param {Object3D} object - 3D对象
   * @param {Scene} scene - 3D对象所属的场景
   * @param {Camera} camera - 用于渲染对象的相机
   * @param {BufferGeometry} geometry - 对象的几何体
   * @param {Material} material - 对象的材质
   * @param {?Object} group - 仅与使用多个材质的对象相关。这表示来自相应 `BufferGeometry` 的组条目
   * @param {LightsNode} lightsNode - 当前光源节点
   * @param {ClippingContext} clippingContext - 裁剪上下文
   * @param {?string} [passId=null] - 用于标识通道的可选ID
   */

  /**
   * 设置给定的渲染对象函数
   * 调用此方法会覆盖默认实现 {@link Renderer#renderObject}
   * 定义自定义函数可以用于修改对象的渲染方式
   * 例如，可以定义"每个具有特定类型材质的对象都应该使用特殊覆盖材质执行预通道"
   * 自定义函数必须在其实现中始终调用 `renderObject()`
   *
   * 使用 `null` 作为第一个参数来重置状态
   *
   * @param {?renderObjectFunction} renderObjectFunction - 渲染对象函数
   */
  setRenderObjectFunction(renderObjectFunction) {
    this._renderObjectFunction = renderObjectFunction;
  }

  /**
   * 返回当前的渲染对象函数
   * 获取当前设置的自定义渲染函数
   *
   * @return {?Function} 当前的渲染对象函数。如果没有设置函数则返回 `null`
   */
  getRenderObjectFunction() {
    return this._renderObjectFunction;
  }

  /**
   * 执行单个或多个计算节点
   * 此方法只能在渲染器已初始化后调用
   *
   * @param {Node|Array<Node>} computeNodes - 计算节点或节点数组
   * @param {Array<number>|number} [dispatchSizeOrCount=null] - 调度的[x, y, z]值数组或单个计数数字
   * @return {Promise|undefined} 当计算完成时解析的Promise。仅在渲染器未初始化时返回
   */
  compute(computeNodes, dispatchSizeOrCount = null) {
    // 如果设备丢失，直接返回
    if (this._isDeviceLost === true) return;

    // 如果未初始化，警告并使用异步计算
    if (this._initialized === false) {
      console.warn("THREE.Renderer: .compute() called before the backend is initialized. Try using .computeAsync() instead.");

      return this.computeAsync(computeNodes);
    }

    //

    // 获取节点帧
    const nodeFrame = this._nodes.nodeFrame;

    // 保存之前的渲染ID
    const previousRenderId = nodeFrame.renderId;

    //

    // 更新统计信息
    this.info.calls++; // 总调用次数
    this.info.compute.calls++; // 计算调用次数
    this.info.compute.frameCalls++; // 帧计算调用次数

    // 设置新的渲染ID
    nodeFrame.renderId = this.info.calls;

    //

    // 获取各个组件的引用
    const backend = this.backend; // 后端
    const pipelines = this._pipelines; // 管线管理器
    const bindings = this._bindings; // 绑定管理器
    const nodes = this._nodes; // 节点管理器

    // 确保computeNodes是数组
    const computeList = Array.isArray(computeNodes) ? computeNodes : [computeNodes];

    // 验证第一个节点是否为计算节点
    if (computeList[0] === undefined || computeList[0].isComputeNode !== true) {
      throw new Error("THREE.Renderer: .compute() expects a ComputeNode.");
    }

    // 开始计算操作
    backend.beginCompute(computeNodes);

    // 遍历所有计算节点
    for (const computeNode of computeList) {
      // 初始化处理

      // 如果管线中没有此计算节点
      if (pipelines.has(computeNode) === false) {
        // 创建清理函数
        const dispose = () => {
          // 移除事件监听器
          computeNode.removeEventListener("dispose", dispose);

          // 从各个管理器中删除节点
          pipelines.delete(computeNode);
          bindings.delete(computeNode);
          nodes.delete(computeNode);
        };

        computeNode.addEventListener("dispose", dispose);

        //

        const onInitFn = computeNode.onInitFunction;

        if (onInitFn !== null) {
          onInitFn.call(computeNode, { renderer: this });
        }
      }

      // 更新计算节点和绑定
      nodes.updateForCompute(computeNode);
      bindings.updateForCompute(computeNode);

      // 获取计算绑定和管线
      const computeBindings = bindings.getForCompute(computeNode);
      const computePipeline = pipelines.getForCompute(computeNode, computeBindings);

      // 执行计算操作
      backend.compute(computeNodes, computeNode, computeBindings, computePipeline, dispatchSizeOrCount);
    }

    // 完成计算操作
    backend.finishCompute(computeNodes);

    //

    // 恢复之前的渲染ID
    nodeFrame.renderId = previousRenderId;
  }

  /**
   * 执行单个或多个计算节点的异步版本
   * 确保渲染器初始化后再执行计算
   *
   * @async
   * @param {Node|Array<Node>} computeNodes - 计算节点或节点数组
   * @param {Array<number>|number} [dispatchSizeOrCount=null] - 调度的[x, y, z]值数组或单个计数数字
   * @return {Promise} 当计算完成时解析的Promise
   */
  async computeAsync(computeNodes, dispatchSizeOrCount = null) {
    if (this._initialized === false) await this.init();

    this.compute(computeNodes, dispatchSizeOrCount);
  }

  /**
   * 检查所选后端是否支持给定功能的异步版本
   * 确保渲染器初始化后再检查功能支持
   *
   * @async
   * @param {string} name - 功能名称
   * @return {Promise<boolean>} 解析为布尔值的Promise，指示是否支持该功能
   */
  async hasFeatureAsync(name) {
    if (this._initialized === false) await this.init();

    return this.backend.hasFeature(name);
  }

  /**
   * 异步解析时间戳查询结果
   * 用于性能分析和调试
   *
   * @async
   * @param {string} [type="render"] - 时间戳类型，默认为"render"
   * @return {Promise} 解析时间戳数据的Promise
   */
  async resolveTimestampsAsync(type = "render") {
    if (this._initialized === false) await this.init();

    return this.backend.resolveTimestampsAsync(type);
  }

  /**
   * 检查所选后端是否支持给定功能
   * 如果渲染器尚未初始化，此方法始终返回 `false`
   *
   * @param {string} name - 功能名称
   * @return {boolean} 是否支持该功能
   */
  hasFeature(name) {
    if (this._initialized === false) {
      console.warn("THREE.Renderer: .hasFeature() called before the backend is initialized. Try using .hasFeatureAsync() instead.");

      return false;
    }

    return this.backend.hasFeature(name);
  }

  /**
   * 当渲染器已初始化时返回 `true`
   * 检查渲染器的初始化状态
   *
   * @return {boolean} 渲染器是否已初始化
   */
  hasInitialized() {
    return this._initialized;
  }

  /**
   * 初始化给定的纹理（异步版本）
   * 用于预加载纹理，而不是等到首次渲染时才加载
   * （这可能会由于解码和GPU上传开销而导致明显的延迟）
   *
   * @async
   * @param {Texture} texture - 要初始化的纹理
   * @return {Promise} 当纹理初始化完成时解析的Promise
   */
  async initTextureAsync(texture) {
    if (this._initialized === false) await this.init();

    this._textures.updateTexture(texture);
  }

  /**
   * 初始化给定的纹理
   * 用于预加载纹理，而不是等到首次渲染时才加载
   * （这可能会由于解码和GPU上传开销而导致明显的延迟）
   *
   * 此方法只能在渲染器已初始化后使用
   *
   * @param {Texture} texture - 要初始化的纹理
   */
  initTexture(texture) {
    if (this._initialized === false) {
      console.warn("THREE.Renderer: .initTexture() called before the backend is initialized. Try using .initTextureAsync() instead.");
    }

    this._textures.updateTexture(texture);
  }

  /**
   * 将当前绑定的帧缓冲区复制到给定的纹理中
   * 用于从渲染结果中提取纹理数据
   *
   * @param {FramebufferTexture} framebufferTexture - 目标纹理
   * @param {?Vector2|Vector4} [rectangle=null] - 定义应复制的帧缓冲区矩形部分的二维或四维向量
   */
  copyFramebufferToTexture(framebufferTexture, rectangle = null) {
    // 处理矩形参数
    if (rectangle !== null) {
      if (rectangle.isVector2) {
        // 如果是二维向量，转换为四维向量（x, y, width, height）
        rectangle = _vector4.set(rectangle.x, rectangle.y, framebufferTexture.image.width, framebufferTexture.image.height).floor();
      } else if (rectangle.isVector4) {
        // 如果是四维向量，直接复制并取整
        rectangle = _vector4.copy(rectangle).floor();
      } else {
        console.error("THREE.Renderer.copyFramebufferToTexture: Invalid rectangle.");

        return;
      }
    } else {
      // 如果没有指定矩形，使用整个纹理尺寸
      rectangle = _vector4.set(0, 0, framebufferTexture.image.width, framebufferTexture.image.height);
    }

    //

    // 获取渲染上下文和渲染目标
    let renderContext = this._currentRenderContext;
    let renderTarget;

    if (renderContext !== null) {
      // 如果有当前渲染上下文，使用其渲染目标
      renderTarget = renderContext.renderTarget;
    } else {
      // 否则获取当前渲染目标或帧缓冲区目标
      renderTarget = this._renderTarget || this._getFrameBufferTarget();

      if (renderTarget !== null) {
        // 更新渲染目标并获取其上下文
        this._textures.updateRenderTarget(renderTarget);

        renderContext = this._textures.get(renderTarget);
      }
    }

    //

    // 更新目标纹理
    this._textures.updateTexture(framebufferTexture, { renderTarget });

    // 执行帧缓冲区到纹理的复制操作
    this.backend.copyFramebufferToTexture(framebufferTexture, renderContext, rectangle);
  }

  /**
   * 将给定源纹理的数据复制到目标纹理中
   * 用于纹理间的数据传输和复制操作
   *
   * @param {Texture} srcTexture - 源纹理
   * @param {Texture} dstTexture - 目标纹理
   * @param {Box2|Box3} [srcRegion=null] - 描述源区域的边界框。可以是二维或三维的
   * @param {Vector2|Vector3} [dstPosition=null] - 表示目标区域原点的向量。可以是二维或三维的
   * @param {number} [srcLevel=0] - 要复制的源mip级别
   * @param {number} [dstLevel=0] - 要复制到的目标mip级别
   */
  copyTextureToTexture(srcTexture, dstTexture, srcRegion = null, dstPosition = null, srcLevel = 0, dstLevel = 0) {
    // 更新源纹理和目标纹理
    this._textures.updateTexture(srcTexture);
    this._textures.updateTexture(dstTexture);

    // 执行纹理到纹理的复制操作
    this.backend.copyTextureToTexture(srcTexture, dstTexture, srcRegion, dstPosition, srcLevel, dstLevel);
  }

  /**
   * 从给定的渲染目标读取像素数据
   * 用于从GPU读取渲染结果数据到CPU
   *
   * @async
   * @param {RenderTarget} renderTarget - 要读取的渲染目标
   * @param {number} x - 复制区域原点的 `x` 坐标
   * @param {number} y - 复制区域原点的 `y` 坐标
   * @param {number} width - 复制区域的宽度
   * @param {number} height - 复制区域的高度
   * @param {number} [textureIndex=0] - MRT渲染目标的纹理索引
   * @param {number} [faceIndex=0] - 活动立方体面索引
   * @return {Promise<TypedArray>} 当读取完成时解析的Promise。解析提供作为类型化数组的读取数据
   */
  async readRenderTargetPixelsAsync(renderTarget, x, y, width, height, textureIndex = 0, faceIndex = 0) {
    return this.backend.copyTextureToBuffer(renderTarget.textures[textureIndex], x, y, width, height, faceIndex);
  }

  /**
   * 分析给定3D对象的层次结构并从处理的层次结构构建渲染列表
   * 这是渲染管线中的重要步骤，负责场景遍历和对象分类
   *
   * @param {Object3D} object - 要处理的3D对象（通常是场景）
   * @param {Camera} camera - 用于渲染对象的相机
   * @param {number} groupOrder - 组顺序，派生自组的 `renderOrder`，用于在组内对3D对象进行分组
   * @param {RenderList} renderList - 当前渲染列表
   * @param {ClippingContext} clippingContext - 当前裁剪上下文
   */
  _projectObject(object, camera, groupOrder, renderList, clippingContext) {
    // 如果对象不可见，直接返回
    if (object.visible === false) return;

    // 检查对象是否在相机的可见层中
    const visible = object.layers.test(camera.layers);

    if (visible) {
      if (object.isGroup) {
        // 如果是组对象，更新组顺序
        groupOrder = object.renderOrder;

        // 如果是裁剪组且已启用，获取组的裁剪上下文
        if (object.isClippingGroup && object.enabled) clippingContext = clippingContext.getGroupContext(object);
      } else if (object.isLOD) {
        // 如果是LOD对象且自动更新，根据相机更新LOD级别
        if (object.autoUpdate === true) object.update(camera);
      } else if (object.isLight) {
        // 如果是光源，添加到渲染列表的光源列表中
        renderList.pushLight(object);
      } else if (object.isSprite) {
        // 如果是精灵对象，进行视锥体剔除检查
        const frustum = camera.isArrayCamera ? _frustumArray : _frustum;

        // 检查是否需要视锥体剔除以及是否与视锥体相交
        if (!object.frustumCulled || frustum.intersectsSprite(object, camera)) {
          // 如果启用了对象排序，计算屏幕空间位置
          if (this.sortObjects === true) {
            _vector4.setFromMatrixPosition(object.matrixWorld).applyMatrix4(_projScreenMatrix);
          }

          // 获取精灵的几何体和材质
          const { geometry, material } = object;

          // 如果材质可见，将对象添加到渲染列表
          if (material.visible) {
            renderList.push(object, geometry, material, groupOrder, _vector4.z, null, clippingContext);
          }
        }
      } else if (object.isLineLoop) {
        // LineLoop对象不受支持，输出错误信息
        console.error("THREE.Renderer: Objects of type THREE.LineLoop are not supported. Please use THREE.Line or THREE.LineSegments.");
      } else if (object.isMesh || object.isLine || object.isPoints) {
        // 如果是网格、线条或点对象，进行视锥体剔除检查
        const frustum = camera.isArrayCamera ? _frustumArray : _frustum;

        // 检查是否需要视锥体剔除以及是否与视锥体相交
        if (!object.frustumCulled || frustum.intersectsObject(object, camera)) {
          // 获取对象的几何体和材质
          const { geometry, material } = object;

          // 如果启用了对象排序，计算屏幕空间位置
          if (this.sortObjects === true) {
            // 如果几何体没有包围球，计算包围球
            if (geometry.boundingSphere === null) geometry.computeBoundingSphere();

            // 将包围球中心转换到屏幕空间
            _vector4.copy(geometry.boundingSphere.center).applyMatrix4(object.matrixWorld).applyMatrix4(_projScreenMatrix);
          }

          // 处理多材质对象
          if (Array.isArray(material)) {
            const groups = geometry.groups;

            // 遍历几何体的所有组
            for (let i = 0, l = groups.length; i < l; i++) {
              const group = groups[i];
              const groupMaterial = material[group.materialIndex];

              // 如果组材质存在且可见，添加到渲染列表
              if (groupMaterial && groupMaterial.visible) {
                renderList.push(object, geometry, groupMaterial, groupOrder, _vector4.z, group, clippingContext);
              }
            }
          } else if (material.visible) {
            // 如果是单一材质且可见，添加到渲染列表
            renderList.push(object, geometry, material, groupOrder, _vector4.z, null, clippingContext);
          }
        }
      }
    }

    // 处理渲染包组
    if (object.isBundleGroup === true && this.backend.beginBundle !== undefined) {
      // 保存基础渲染列表
      const baseRenderList = renderList;

      // 替换渲染列表为包组专用的列表
      renderList = this._renderLists.get(object, camera);

      // 开始构建渲染列表
      renderList.begin();

      // 将渲染包信息推送到基础渲染列表
      baseRenderList.pushBundle({
        bundleGroup: object,
        camera,
        renderList,
      });

      // 完成渲染列表构建
      renderList.finish();
    }

    // 递归处理子对象
    const children = object.children;

    for (let i = 0, l = children.length; i < l; i++) {
      this._projectObject(children[i], camera, groupOrder, renderList, clippingContext);
    }
  }

  /**
   * 渲染给定的渲染包数组
   * 批量处理多个渲染包的渲染操作
   *
   * @private
   * @param {Array<Object>} bundles - 包含渲染包数据的数组
   * @param {Scene} sceneRef - 渲染包所属的场景
   * @param {LightsNode} lightsNode - 当前光源节点
   */
  _renderBundles(bundles, sceneRef, lightsNode) {
    // 遍历所有渲染包并逐个渲染
    for (const bundle of bundles) {
      this._renderBundle(bundle, sceneRef, lightsNode);
    }
  }

  /**
   * 从给定的渲染列表中渲染透明对象
   * 处理透明对象的特殊渲染需求，包括双面渲染
   *
   * @private
   * @param {Array<Object>} renderList - 透明渲染列表
   * @param {Array<Object>} doublePassList - 需要双通道渲染的透明对象列表（例如因为透射效果）
   * @param {Camera} camera - 用于渲染列表的相机
   * @param {Scene} scene - 渲染列表所属的场景
   * @param {LightsNode} lightsNode - 当前光源节点
   */
  _renderTransparents(renderList, doublePassList, camera, scene, lightsNode) {
    // 如果有需要双通道渲染的对象
    if (doublePassList.length > 0) {
      // 渲染背面

      // 将所有双通道对象的材质设置为背面渲染
      for (const { material } of doublePassList) {
        material.side = BackSide;
      }

      // 渲染背面通道
      this._renderObjects(doublePassList, camera, scene, lightsNode, "backSide");

      // 渲染正面

      // 将所有双通道对象的材质设置为正面渲染
      for (const { material } of doublePassList) {
        material.side = FrontSide;
      }

      // 渲染所有透明对象（包括正面通道）
      this._renderObjects(renderList, camera, scene, lightsNode);

      // 恢复材质设置

      // 恢复所有双通道对象的材质为双面渲染
      for (const { material } of doublePassList) {
        material.side = DoubleSide;
      }
    } else {
      // 如果没有双通道对象，直接渲染透明对象
      this._renderObjects(renderList, camera, scene, lightsNode);
    }
  }

  /**
   * 从给定的渲染列表中渲染对象
   * 遍历渲染列表并调用渲染函数处理每个对象
   *
   * @private
   * @param {Array<Object>} renderList - 渲染列表
   * @param {Camera} camera - 用于渲染列表的相机
   * @param {Scene} scene - 渲染列表所属的场景
   * @param {LightsNode} lightsNode - 当前光源节点
   * @param {?string} [passId=null] - 用于标识通道的可选ID
   */
  _renderObjects(renderList, camera, scene, lightsNode, passId = null) {
    // 遍历渲染列表中的所有对象
    for (let i = 0, il = renderList.length; i < il; i++) {
      // 从渲染列表项中解构出必要的组件
      const { object, geometry, material, group, clippingContext } = renderList[i];

      // 调用当前的渲染对象函数处理该对象
      this._currentRenderObjectFunction(object, scene, camera, geometry, material, group, lightsNode, clippingContext, passId);
    }
  }

  /**
   * 此方法表示管理对象渲染生命周期的默认渲染对象函数
   * 这是渲染管线中的核心方法，处理单个对象的完整渲染流程
   *
   * @param {Object3D} object - 3D对象
   * @param {Scene} scene - 3D对象所属的场景
   * @param {Camera} camera - 用于渲染对象的相机
   * @param {BufferGeometry} geometry - 对象的几何体
   * @param {Material} material - 对象的材质
   * @param {?Object} group - 仅与使用多个材质的对象相关。这表示来自相应 `BufferGeometry` 的组条目
   * @param {LightsNode} lightsNode - 当前光源节点
   * @param {?ClippingContext} clippingContext - 裁剪上下文
   * @param {?string} [passId=null] - 用于标识通道的可选ID
   */
  renderObject(object, scene, camera, geometry, material, group, lightsNode, clippingContext = null, passId = null) {
    // 用于存储被覆盖的节点，以便后续恢复
    let overridePositionNode;
    let overrideColorNode;
    let overrideDepthNode;

    //

    // 调用对象的渲染前回调
    object.onBeforeRender(this, scene, camera, geometry, material, group);

    //

    // 处理材质覆盖逻辑
    if (material.allowOverride === true && scene.overrideMaterial !== null) {
      const overrideMaterial = scene.overrideMaterial;

      // 如果原材质有位置节点，保存覆盖材质的位置节点并应用原材质的位置节点
      if (material.positionNode && material.positionNode.isNode) {
        overridePositionNode = overrideMaterial.positionNode;
        overrideMaterial.positionNode = material.positionNode;
      }

      // 将原材质的透明度相关属性应用到覆盖材质
      overrideMaterial.alphaTest = material.alphaTest;
      overrideMaterial.alphaMap = material.alphaMap;
      overrideMaterial.transparent = material.transparent || material.transmission > 0;

      // 如果是阴影通道材质，进行特殊处理
      if (overrideMaterial.isShadowPassMaterial) {
        // 设置阴影面（如果材质有shadowSide则使用，否则使用默认side）
        overrideMaterial.side = material.shadowSide === null ? material.side : material.shadowSide;

        // 处理深度节点覆盖
        if (material.depthNode && material.depthNode.isNode) {
          overrideDepthNode = overrideMaterial.depthNode;
          overrideMaterial.depthNode = material.depthNode;
        }

        // 处理阴影投射颜色节点覆盖
        if (material.castShadowNode && material.castShadowNode.isNode) {
          overrideColorNode = overrideMaterial.colorNode;
          overrideMaterial.colorNode = material.castShadowNode;
        }

        // 处理阴影投射位置节点覆盖
        if (material.castShadowPositionNode && material.castShadowPositionNode.isNode) {
          overridePositionNode = overrideMaterial.positionNode;
          overrideMaterial.positionNode = material.castShadowPositionNode;
        }
      }

      // 使用覆盖材质替换原材质
      material = overrideMaterial;
    }

    //

    // 处理透明双面材质的特殊渲染逻辑
    if (material.transparent === true && material.side === DoubleSide && material.forceSinglePass === false) {
      // 先渲染背面
      material.side = BackSide;
      this._handleObjectFunction(object, material, scene, camera, lightsNode, group, clippingContext, "backSide"); // 创建背面通道ID

      // 再渲染正面
      material.side = FrontSide;
      this._handleObjectFunction(object, material, scene, camera, lightsNode, group, clippingContext, passId); // 使用默认通道ID

      // 恢复双面设置
      material.side = DoubleSide;
    } else {
      // 对于非透明双面材质，直接渲染
      this._handleObjectFunction(object, material, scene, camera, lightsNode, group, clippingContext, passId);
    }

    //

    // 恢复被覆盖的节点设置
    if (overridePositionNode !== undefined) {
      scene.overrideMaterial.positionNode = overridePositionNode;
    }

    if (overrideDepthNode !== undefined) {
      scene.overrideMaterial.depthNode = overrideDepthNode;
    }

    if (overrideColorNode !== undefined) {
      scene.overrideMaterial.colorNode = overrideColorNode;
    }

    //

    // 调用对象的渲染后回调
    object.onAfterRender(this, scene, camera, geometry, material, group);
  }

  /**
   * 此方法表示默认的 `_handleObjectFunction` 实现
   * 从给定数据创建渲染对象并使用所选后端执行绘制命令
   *
   * @private
   * @param {Object3D} object - 3D对象
   * @param {Material} material - 对象的材质
   * @param {Scene} scene - 3D对象所属的场景
   * @param {Camera} camera - 用于渲染对象的相机
   * @param {LightsNode} lightsNode - 当前光源节点
   * @param {?{start: number, count: number}} group - 仅与使用多个材质的对象相关。这表示来自相应 `BufferGeometry` 的组条目
   * @param {ClippingContext} clippingContext - 裁剪上下文
   * @param {string} [passId] - 用于标识通道的可选ID
   */
  _renderObjectDirect(object, material, scene, camera, lightsNode, group, clippingContext, passId) {
    // 获取或创建渲染对象
    const renderObject = this._objects.get(object, material, scene, camera, lightsNode, this._currentRenderContext, clippingContext, passId);
    // 设置绘制范围
    renderObject.drawRange = object.geometry.drawRange;
    // 设置几何体组
    renderObject.group = group;

    //

    // 检查渲染对象是否需要刷新
    const needsRefresh = this._nodes.needsRefresh(renderObject);

    if (needsRefresh) {
      // 更新节点（渲染前）
      this._nodes.updateBefore(renderObject);

      // 更新几何体以供渲染
      this._geometries.updateForRender(renderObject);

      // 更新节点和绑定以供渲染
      this._nodes.updateForRender(renderObject);
      this._bindings.updateForRender(renderObject);
    }

    // 更新渲染管线
    this._pipelines.updateForRender(renderObject);

    //

    // 如果当前有渲染包，将渲染对象添加到包中
    if (this._currentRenderBundle !== null) {
      const renderBundleData = this.backend.get(this._currentRenderBundle);

      renderBundleData.renderObjects.push(renderObject);

      renderObject.bundle = this._currentRenderBundle.bundleGroup;
    }

    // 执行实际的绘制操作
    this.backend.draw(renderObject, this.info);

    // 如果需要刷新，执行渲染后更新
    if (needsRefresh) this._nodes.updateAfter(renderObject);
  }

  /**
   * `_handleObjectFunction` 的不同实现，仅确保对象准备好进行渲染
   * 在 `compileAsync()` 中使用
   *
   * @private
   * @param {Object3D} object - 3D对象
   * @param {Material} material - 对象的材质
   * @param {Scene} scene - 3D对象所属的场景
   * @param {Camera} camera - 用于渲染对象的相机
   * @param {LightsNode} lightsNode - 当前光源节点
   * @param {?{start: number, count: number}} group - 仅与使用多个材质的对象相关。这表示来自相应 `BufferGeometry` 的组条目
   * @param {ClippingContext} clippingContext - 裁剪上下文
   * @param {string} [passId] - 用于标识通道的可选ID
   */
  _createObjectPipeline(object, material, scene, camera, lightsNode, group, clippingContext, passId) {
    // 获取渲染对象
    const renderObject = this._objects.get(object, material, scene, camera, lightsNode, this._currentRenderContext, clippingContext, passId);
    // 设置绘制范围
    renderObject.drawRange = object.geometry.drawRange;
    // 设置几何体组
    renderObject.group = group;

    //

    // 更新节点（渲染前）
    this._nodes.updateBefore(renderObject);

    // 更新几何体以供渲染
    this._geometries.updateForRender(renderObject);

    // 更新节点和绑定以供渲染
    this._nodes.updateForRender(renderObject);
    this._bindings.updateForRender(renderObject);

    // 获取渲染管线（用于编译）
    this._pipelines.getForRender(renderObject, this._compilationPromises);

    // 更新节点（渲染后）
    this._nodes.updateAfter(renderObject);
  }

  /**
   * `compileAsync()` 的别名
   * 提供更简洁的编译方法访问
   *
   * @method
   * @param {Object3D} scene - 要预编译的场景或3D对象
   * @param {Camera} camera - 用于渲染场景的相机
   * @param {Scene} targetScene - 如果第一个参数是3D对象，此参数必须表示该3D对象将要添加到的场景
   * @return {function(Object3D, Camera, ?Scene): Promise|undefined} 当编译完成时解析的Promise
   */
  get compile() {
    // 返回异步编译方法的引用
    return this.compileAsync;
  }
}

export default Renderer;
