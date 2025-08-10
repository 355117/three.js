// ===== 导入模块 =====
// 相机相关模块
import { ArrayCamera } from "../../cameras/ArrayCamera.js"; // 数组相机，用于管理多个相机（如左右眼相机）
import { PerspectiveCamera } from "../../cameras/PerspectiveCamera.js"; // 透视相机，用于创建左右眼相机

// 核心模块
import { EventDispatcher } from "../../core/EventDispatcher.js"; // 事件分发器，XRManager继承此类以支持事件处理

// 数学工具模块
import { Quaternion } from "../../math/Quaternion.js"; // 四元数，用于表示旋转
import { RAD2DEG } from "../../math/MathUtils.js"; // 弧度转角度的常量
import { Vector2 } from "../../math/Vector2.js"; // 二维向量，用于表示尺寸等
import { Vector3 } from "../../math/Vector3.js"; // 三维向量，用于表示位置等
import { Vector4 } from "../../math/Vector4.js"; // 四维向量，用于表示视口等

// WebXR控制器模块
import { WebXRController } from "../webxr/WebXRController.js"; // WebXR控制器，处理XR输入设备

// 渲染常量
import {
  AddEquation,
  BackSide,
  CustomBlending,
  DepthFormat,
  DepthStencilFormat,
  FrontSide,
  RGBAFormat,
  UnsignedByteType,
  UnsignedInt248Type,
  UnsignedIntType,
  ZeroFactor,
} from "../../constants.js";

// 纹理和渲染目标模块
import { DepthTexture } from "../../textures/DepthTexture.js"; // 深度纹理，用于深度缓冲
import { XRRenderTarget } from "./XRRenderTarget.js"; // XR专用渲染目标

// 几何体模块
import { CylinderGeometry } from "../../geometries/CylinderGeometry.js"; // 圆柱几何体，用于创建圆柱形XR层
import { PlaneGeometry } from "../../geometries/PlaneGeometry.js"; // 平面几何体，用于创建平面XR层

// 材质和网格模块
import QuadMesh from "./QuadMesh.js"; // 四边形网格，用于渲染
import NodeMaterial from "../../materials/nodes/NodeMaterial.js"; // 节点材质系统
import { MeshBasicMaterial } from "../../materials/MeshBasicMaterial.js"; // 基础网格材质
import { Mesh } from "../../objects/Mesh.js"; // 网格对象

// ===== 全局常量 =====
// 用于计算立体相机投影的临时向量，标记为纯函数以便优化
const _cameraLPos = /*@__PURE__*/ new Vector3(); // 左眼相机位置的临时存储
const _cameraRPos = /*@__PURE__*/ new Vector3(); // 右眼相机位置的临时存储

/**
 * XR管理器类 - 基于WebXR Device API构建，用于管理XR会话
 *
 * XRManager是Three.js中处理WebXR功能的核心类，负责：
 * - 管理XR会话的生命周期（启动、运行、结束）
 * - 处理XR相机和视图的更新
 * - 管理XR控制器和输入源
 * - 处理XR层（Layers）的创建和渲染
 * - 协调WebGL/WebGPU渲染器与WebXR API的交互
 *
 * 注意：XR功能目前仅支持WebGL 2后端，WebGPU后端暂不支持
 *
 * @augments EventDispatcher - 继承事件分发器，支持XR相关事件的监听和分发
 */
class XRManager extends EventDispatcher {
  /**
   * 构造一个新的XR管理器实例
   *
   * @param {WebGLRenderer|WebGPURenderer} renderer - 渲染器实例，用于执行实际的渲染操作
   * @param {boolean} [multiview=false] - 是否启用多视图渲染（如果设备支持）
   *                                      多视图可以提高VR渲染性能，通过单次渲染调用同时渲染左右眼视图
   */
  constructor(renderer, multiview = false) {
    // 调用父类EventDispatcher的构造函数，初始化事件系统
    super();

    // ===== 公共属性 =====

    /**
     * 全局XR渲染开关
     *
     * 当设置为true时，启用XR渲染功能；设置为false时，禁用XR功能
     * 这是一个全局开关，影响整个XR系统的运行状态
     *
     * @type {boolean}
     * @default false
     */
    this.enabled = false;

    /**
     * XR设备当前是否正在呈现内容
     *
     * 指示XR会话是否处于活跃状态，即用户是否正在体验XR内容
     * 只读属性，由XR系统内部管理，外部不应直接修改
     *
     * @type {boolean}
     * @default false
     * @readonly
     */
    this.isPresenting = false;

    /**
     * XR相机是否应该自动更新
     *
     * 当设置为true时，XR相机会在每帧自动更新其变换矩阵和投影矩阵
     * 设置为false时，需要手动调用updateCamera方法来更新相机
     *
     * @type {boolean}
     * @default true
     */
    this.cameraAutoUpdate = true;

    // ===== 私有属性 =====

    /**
     * 渲染器实例的引用
     *
     * 存储传入的渲染器实例，用于执行实际的渲染操作
     * XRManager通过这个引用来控制渲染器的行为，如设置渲染目标、像素比等
     *
     * @private
     * @type {WebGLRenderer|WebGPURenderer}
     */
    this._renderer = renderer;

    // ===== 相机系统初始化 =====

    /**
     * 左眼相机实例
     *
     * 在立体渲染中，左眼相机负责渲染左眼视图
     * 其变换矩阵和投影矩阵会根据XR设备提供的数据进行更新
     *
     * @private
     * @type {PerspectiveCamera}
     */
    this._cameraL = new PerspectiveCamera();
    this._cameraL.viewport = new Vector4(); // 设置左眼相机的视口区域

    /**
     * 右眼相机实例
     *
     * 在立体渲染中，右眼相机负责渲染右眼视图
     * 其变换矩阵和投影矩阵会根据XR设备提供的数据进行更新
     *
     * @private
     * @type {PerspectiveCamera}
     */
    this._cameraR = new PerspectiveCamera();
    this._cameraR.viewport = new Vector4(); // 设置右眼相机的视口区域

    /**
     * 用于渲染XR视图的相机列表
     *
     * 包含所有需要渲染的相机实例，通常包括左眼和右眼相机
     * 在某些情况下（如AR或单眼显示），可能只包含一个相机
     *
     * @private
     * @type {Array<PerspectiveCamera>}
     */
    this._cameras = [this._cameraL, this._cameraR];

    /**
     * 主XR相机（数组相机）
     *
     * ArrayCamera是一个特殊的相机类型，可以管理多个子相机
     * 在XR渲染中，它统一管理左右眼相机，提供统一的接口
     * 用于视锥体剔除和其他需要统一相机视图的操作
     *
     * @private
     * @type {ArrayCamera}
     */
    this._cameraXR = new ArrayCamera();

    /**
     * 当前XR相机的近裁剪面距离
     *
     * 缓存当前的近裁剪面值，用于检测是否需要更新渲染状态
     * 当近裁剪面发生变化时，需要通知XR会话更新渲染参数
     *
     * @private
     * @type {?number}
     * @default null
     */
    this._currentDepthNear = null;

    /**
     * 当前XR相机的远裁剪面距离
     *
     * 缓存当前的远裁剪面值，用于检测是否需要更新渲染状态
     * 当远裁剪面发生变化时，需要通知XR会话更新渲染参数
     *
     * @private
     * @type {?number}
     * @default null
     */
    this._currentDepthFar = null;

    // ===== 控制器系统初始化 =====

    /**
     * 应用程序请求的WebXR控制器列表
     *
     * 存储所有已创建的WebXR控制器实例
     * 每个控制器对应一个潜在的XR输入设备（如手柄、手部追踪等）
     *
     * @private
     * @type {Array<WebXRController>}
     */
    this._controllers = [];

    /**
     * XR输入源列表
     *
     * 存储与控制器对应的XR输入源对象
     * 每个输入源属于一个WebXRController实例
     * 数组索引与_controllers数组保持对应关系
     *
     * @private
     * @type {Array<XRInputSource|null>}
     */
    this._controllerInputSources = [];

    // ===== 渲染目标和层系统初始化 =====

    /**
     * XR渲染目标
     *
     * 在活跃的XR会话期间，代表渲染的目标缓冲区
     * 这是XR内容最终渲染到的地方，通常是XR设备的显示缓冲区
     * 在会话开始时创建，会话结束时销毁
     *
     * @private
     * @type {?XRRenderTarget}
     * @default null
     */
    this._xrRenderTarget = null;

    /**
     * 非投影层数组
     *
     * 存储所有非投影类型的XR层，如四边形层和圆柱形层
     * 这些层可以在XR空间中显示独立的内容，如UI面板、视频等
     * 每个层都有自己的渲染目标和变换信息
     *
     * @private
     * @type {Array<Object>}
     * @default []
     */
    this._layers = [];

    /**
     * 设备是否支持所有层类型
     *
     * 指示当前XR设备是否支持WebXR Layers API的所有功能
     * 如果支持，可以使用原生XR层进行更高效的渲染
     * 如果不支持，则回退到传统的渲染方式
     *
     * @private
     * @type {boolean}
     * @default false
     */
    this._supportsLayers = false;

    /**
     * 设备是否支持WebGL对象绑定
     *
     * 检查是否支持XRWebGLBinding API，这是使用WebXR Layers的前提
     * 通过检查XRWebGLBinding构造函数是否存在来判断
     *
     * @private
     * @type {boolean}
     * @readonly
     */
    this._supportsGlBinding = typeof XRWebGLBinding !== "undefined";

    /**
     * 帧缓冲目标缓存
     *
     * 用于缓存层渲染时的帧缓冲目标，避免重复创建
     * 使用WeakMap来存储，确保内存能够正确回收
     *
     * @private
     * @type {?WeakMap}
     * @default null
     */
    this._frameBufferTargets = null;

    /**
     * 创建原生WebXR层的辅助函数
     *
     * 绑定了当前实例的createXRLayer函数，用于创建原生XR层
     * 这个函数会根据层的类型（quad或cylinder）创建相应的XR层对象
     *
     * @private
     * @type {Function}
     */
    this._createXRLayer = createXRLayer.bind(this);

    // ===== WebGL上下文和动画系统初始化 =====

    /**
     * 当前WebGL渲染上下文
     *
     * 存储渲染器的WebGL上下文引用，用于XR相关的WebGL操作
     * 在XR会话开始时从渲染器获取并缓存
     *
     * @private
     * @type {?WebGL2RenderingContext}
     * @default null
     */
    this._gl = null;

    /**
     * 当前动画上下文
     *
     * 保存XR会话开始前的动画上下文（通常是window对象）
     * 用于在XR会话结束后恢复原始的动画循环上下文
     *
     * @private
     * @type {?Window}
     * @default null
     */
    this._currentAnimationContext = null;

    /**
     * 当前动画循环函数
     *
     * 保存XR会话开始前的动画循环函数
     * 在XR会话期间，会被替换为XR专用的动画循环
     * 会话结束后会恢复到这个原始的动画循环
     *
     * @private
     * @type {?Function}
     * @default null
     */
    this._currentAnimationLoop = null;

    /**
     * 当前像素比
     *
     * 保存XR会话开始前的渲染器像素比设置
     * XR会话期间像素比通常设置为1，会话结束后恢复原值
     *
     * @private
     * @type {?number}
     * @default null
     */
    this._currentPixelRatio = null;

    /**
     * 当前渲染器画布尺寸
     *
     * 以逻辑像素为单位保存XR会话开始前的画布尺寸
     * 用于在XR会话结束后恢复原始的画布尺寸设置
     *
     * @private
     * @type {Vector2}
     */
    this._currentSize = new Vector2();

    // ===== 事件处理器初始化 =====

    /**
     * XR会话内事件的默认处理器
     *
     * 绑定了当前实例的事件处理函数，用于处理XR会话中的各种事件
     * 如select、selectstart、selectend、squeeze等控制器事件
     *
     * @private
     * @type {Function}
     */
    this._onSessionEvent = onSessionEvent.bind(this);

    /**
     * XR会话结束事件的处理器
     *
     * 绑定了当前实例的会话结束处理函数
     * 负责清理XR会话相关的资源和状态，恢复原始渲染设置
     *
     * @private
     * @type {Function}
     */
    this._onSessionEnd = onSessionEnd.bind(this);

    /**
     * 输入源变化事件的处理器
     *
     * 绑定了当前实例的输入源变化处理函数
     * 处理XR输入设备的连接和断开事件（如控制器的插拔）
     *
     * @private
     * @type {Function}
     */
    this._onInputSourcesChange = onInputSourcesChange.bind(this);

    /**
     * XR专用动画循环函数
     *
     * 绑定了当前实例的XR动画帧处理函数
     * 在XR会话期间替代应用程序的默认动画循环
     * 负责更新XR相机、控制器状态，并调用用户的渲染回调
     *
     * @private
     * @type {Function}
     */
    this._onAnimationFrame = onAnimationFrame.bind(this);

    // ===== XR空间和坐标系统初始化 =====

    /**
     * 当前XR参考空间
     *
     * XR参考空间定义了XR内容的坐标系统
     * 在XR会话开始时根据参考空间类型创建
     * 用于将XR设备的姿态数据转换到应用程序的坐标系
     *
     * @private
     * @type {?XRReferenceSpace}
     * @default null
     */
    this._referenceSpace = null;

    /**
     * 当前XR参考空间类型
     *
     * 定义XR坐标系的类型，常见类型包括：
     * - 'local-floor': 以用户脚下的地面为原点
     * - 'local': 以用户头部初始位置为原点
     * - 'bounded-floor': 有边界的地面空间
     * - 'unbounded': 无边界空间
     *
     * @private
     * @type {XRReferenceSpaceType}
     * @default 'local-floor'
     */
    this._referenceSpaceType = "local-floor";

    /**
     * 应用程序定义的自定义参考空间
     *
     * 允许应用程序提供自定义的参考空间
     * 如果设置了自定义参考空间，将优先使用它而不是默认的参考空间
     *
     * @private
     * @type {?XRReferenceSpace}
     * @default null
     */
    this._customReferenceSpace = null;

    // ===== 渲染质量和性能设置初始化 =====

    /**
     * 帧缓冲缩放因子
     *
     * 控制XR渲染的分辨率，值越大分辨率越高，但性能开销也越大
     * 1.0表示原生分辨率，0.5表示一半分辨率，2.0表示双倍分辨率
     *
     * @private
     * @type {number}
     * @default 1
     */
    this._framebufferScaleFactor = 1;

    /**
     * 注视点渲染因子
     *
     * 控制注视点渲染的强度，用于优化VR渲染性能
     * 0表示无注视点渲染（全分辨率），1表示最大注视点渲染（边缘低分辨率）
     * 注视点渲染可以显著提高性能，因为人眼对边缘区域的分辨率不敏感
     *
     * @private
     * @type {number}
     * @default 1.0
     */
    this._foveation = 1.0;

    // ===== XR会话和层对象初始化 =====

    /**
     * 当前XR会话的引用
     *
     * 存储活跃的XR会话对象，是与WebXR API交互的核心接口
     * 通过会话对象可以获取XR设备状态、请求动画帧、管理输入等
     *
     * @private
     * @type {?XRSession}
     * @default null
     */
    this._session = null;

    /**
     * 当前XR基础层的引用
     *
     * XRWebGLLayer是传统的XR渲染层，用于不支持Layers API的设备
     * 提供基本的立体渲染功能，是XR渲染的后备方案
     *
     * @private
     * @type {?XRWebGLLayer}
     * @default null
     */
    this._glBaseLayer = null;

    /**
     * 当前XR绑定对象的引用
     *
     * XRWebGLBinding用于将WebGL对象与XR层进行绑定
     * 是使用WebXR Layers API的核心接口，提供创建和管理XR层的功能
     *
     * @private
     * @type {?XRWebGLBinding}
     * @default null
     */
    this._glBinding = null;

    /**
     * 当前XR投影层的引用
     *
     * XRProjectionLayer是新的XR渲染层，提供更高效的渲染性能
     * 支持多视图渲染、注视点渲染等高级功能
     * 是WebXR Layers API的主要渲染目标
     *
     * @private
     * @type {?XRProjectionLayer}
     * @default null
     */
    this._glProjLayer = null;

    /**
     * 当前XR帧的引用
     *
     * XRFrame包含当前帧的所有XR状态信息
     * 包括设备姿态、输入状态、检测到的平面等
     * 在动画循环中每帧更新
     *
     * @private
     * @type {?XRFrame}
     * @default null
     */
    this._xrFrame = null;

    // ===== 功能特性检测和配置 =====

    /**
     * 是否使用WebXR Layers API
     *
     * 通过检测设备是否支持WebGL绑定和投影层创建来确定
     * 如果支持，将使用更高效的Layers API进行渲染
     * 如果不支持，将回退到传统的XRWebGLLayer
     *
     * @private
     * @type {boolean}
     * @readonly
     */
    this._useLayers = this._supportsGlBinding && "createProjectionLayer" in XRWebGLBinding.prototype; // eslint-disable-line compat/compat

    /**
     * 应用程序是否请求使用多视图渲染
     *
     * 存储构造函数传入的multiview参数
     * 表示应用程序希望启用多视图渲染（如果设备支持）
     * 多视图渲染可以显著提高VR渲染性能
     *
     * @private
     * @type {boolean}
     * @default false
     * @readonly
     */
    this._useMultiviewIfPossible = multiview;

    /**
     * 多视图渲染是否实际启用
     *
     * 只有当应用程序请求多视图且设备支持OVR_multiview2扩展时才为true
     * 这是实际控制多视图渲染的标志，在会话开始时根据设备能力确定
     *
     * @private
     * @type {boolean}
     * @readonly
     */
    this._useMultiview = false;
  }

  // ===== 控制器访问方法 =====

  /**
   * 获取XR控制器的目标射线空间
   *
   * 返回一个THREE.Group实例，表示XR控制器在目标射线空间中的变换
   * 目标射线空间通常用于指向操作，如激光指针、射线投射等
   *
   * 目标射线空间的特点：
   * - 原点位于控制器的指向位置
   * - Z轴负方向为指向方向
   * - 适用于实现指向交互、UI选择等功能
   *
   * @param {number} index - XR控制器的索引（通常0为左手，1为右手）
   * @return {Group} 表示控制器目标射线空间变换的Group对象
   */
  getController(index) {
    const controller = this._getController(index);

    return controller.getTargetRaySpace();
  }

  /**
   * 获取XR控制器的握持空间
   *
   * 返回一个THREE.Group实例，表示XR控制器在握持空间中的变换
   * 握持空间表示用户实际握持控制器的位置和方向
   *
   * 握持空间的特点：
   * - 原点位于控制器的握持中心
   * - 方向与控制器的物理方向一致
   * - 适用于显示控制器模型、实现握持交互等
   *
   * @param {number} index - XR控制器的索引（通常0为左手，1为右手）
   * @return {Group} 表示控制器握持空间变换的Group对象
   */
  getControllerGrip(index) {
    const controller = this._getController(index);

    return controller.getGripSpace();
  }

  /**
   * 获取XR控制器的手部空间
   *
   * 返回一个THREE.Group实例，表示XR控制器在手部空间中的变换
   * 手部空间用于手部追踪，表示用户手部的位置和姿态
   *
   * 手部空间的特点：
   * - 原点位于手腕位置
   * - 方向表示手部的自然姿态
   * - 适用于手部追踪、手势识别等功能
   * - 需要设备支持手部追踪功能
   *
   * @param {number} index - XR控制器的索引（通常0为左手，1为右手）
   * @return {Group} 表示控制器手部空间变换的Group对象
   */
  getHand(index) {
    const controller = this._getController(index);

    return controller.getHandSpace();
  }

  // ===== 注视点渲染（Foveation）管理方法 =====

  /**
   * 获取当前的注视点渲染值
   *
   * 注视点渲染是一种性能优化技术，利用人眼对边缘区域分辨率不敏感的特点
   * 在视野中心保持高分辨率，边缘区域使用较低分辨率，从而提高渲染性能
   *
   * @return {number|undefined} 注视点渲染值（0-1范围）
   *                           - 0: 无注视点渲染（全分辨率）
   *                           - 1: 最大注视点渲染（边缘最低分辨率）
   *                           - undefined: 如果没有基础层或投影层则返回undefined
   */
  getFoveation() {
    // 检查是否有可用的渲染层
    if (this._glProjLayer === null && this._glBaseLayer === null) {
      return undefined;
    }

    return this._foveation;
  }

  /**
   * 设置注视点渲染值
   *
   * 调整注视点渲染的强度，影响边缘区域的渲染分辨率
   * 较高的值可以显著提高性能，但可能影响视觉质量
   *
   * 注意：
   * - 不是所有设备都支持注视点渲染
   * - 效果的明显程度取决于具体的XR设备和驱动
   *
   * @param {number} foveation - 注视点渲染值，范围[0,1]
   *                            - 0: 禁用注视点渲染（全分辨率）
   *                            - 1: 最大注视点渲染（边缘区域最低分辨率）
   */
  setFoveation(foveation) {
    // 更新内部存储的注视点渲染值
    this._foveation = foveation;

    // 如果使用投影层，设置其注视点渲染值
    if (this._glProjLayer !== null) {
      this._glProjLayer.fixedFoveation = foveation;
    }

    // 如果使用基础层且支持注视点渲染，设置其注视点渲染值
    if (this._glBaseLayer !== null && this._glBaseLayer.fixedFoveation !== undefined) {
      this._glBaseLayer.fixedFoveation = foveation;
    }
  }

  // ===== 帧缓冲缩放管理方法 =====

  /**
   * 获取当前的帧缓冲缩放因子
   *
   * 帧缓冲缩放因子控制XR渲染的分辨率
   * 是平衡视觉质量和性能的重要参数
   *
   * @return {number} 帧缓冲缩放因子
   *                  - 1.0: 原生分辨率
   *                  - 0.5: 一半分辨率（更好的性能）
   *                  - 2.0: 双倍分辨率（更好的质量）
   */
  getFramebufferScaleFactor() {
    return this._framebufferScaleFactor;
  }

  /**
   * 设置帧缓冲缩放因子
   *
   * 调整XR渲染的分辨率，影响视觉质量和性能
   * 较低的值可以提高性能但降低视觉质量，较高的值则相反
   *
   * 重要限制：
   * - 此方法不能在XR会话期间使用
   * - 必须在会话开始前设置
   * - 会话期间尝试修改会输出警告信息
   *
   * @param {number} factor - 帧缓冲缩放因子
   *                         - 建议范围：0.1 - 2.0
   *                         - 1.0为原生分辨率
   */
  setFramebufferScaleFactor(factor) {
    this._framebufferScaleFactor = factor;

    // 检查是否在XR会话期间尝试修改
    if (this.isPresenting === true) {
      console.warn("THREE.XRManager: Cannot change framebuffer scale while presenting.");
    }
  }

  // ===== 参考空间管理方法 =====

  /**
   * 获取当前的参考空间类型
   *
   * 参考空间定义了XR内容的坐标系统和追踪行为
   * 不同的参考空间类型适用于不同的XR应用场景
   *
   * @return {XRReferenceSpaceType} 参考空间类型
   *                               - 'local-floor': 以地面为基准的本地空间
   *                               - 'local': 以头部初始位置为基准的本地空间
   *                               - 'bounded-floor': 有边界的地面空间
   *                               - 'unbounded': 无边界空间
   */
  getReferenceSpaceType() {
    return this._referenceSpaceType;
  }

  /**
   * 设置参考空间类型
   *
   * 更改XR内容的坐标系统类型
   * 不同的参考空间类型提供不同的追踪行为和坐标原点
   *
   * 重要限制：
   * - 此方法不能在XR会话期间使用
   * - 必须在会话开始前设置
   * - 会话期间尝试修改会输出警告信息
   *
   * @param {XRReferenceSpaceType} type - 参考空间类型
   *                                     - 'local-floor': 适用于站立式VR体验
   *                                     - 'local': 适用于坐着的VR体验
   *                                     - 'bounded-floor': 适用于房间规模的VR
   *                                     - 'unbounded': 适用于大范围移动的AR/VR
   */
  setReferenceSpaceType(type) {
    this._referenceSpaceType = type;

    // 检查是否在XR会话期间尝试修改
    if (this.isPresenting === true) {
      console.warn("THREE.XRManager: Cannot change reference space type while presenting.");
    }
  }

  /**
   * 获取当前的XR参考空间对象
   *
   * 返回实际使用的参考空间对象，优先返回自定义参考空间
   * 参考空间对象用于坐标变换和姿态查询
   *
   * @return {XRReferenceSpace} XR参考空间对象
   *                           - 如果设置了自定义参考空间，返回自定义空间
   *                           - 否则返回默认的参考空间
   */
  getReferenceSpace() {
    return this._customReferenceSpace || this._referenceSpace;
  }

  /**
   * 设置自定义XR参考空间
   *
   * 允许应用程序提供自定义的参考空间对象
   * 自定义参考空间会覆盖默认的参考空间设置
   *
   * 使用场景：
   * - 需要特殊的坐标变换
   * - 实现自定义的追踪行为
   * - 与其他XR系统集成
   *
   * @param {XRReferenceSpace} space - 自定义的XR参考空间对象
   */
  setReferenceSpace(space) {
    this._customReferenceSpace = space;
  }

  // ===== 相机和会话状态访问方法 =====

  /**
   * 获取XR相机对象
   *
   * 返回用于XR渲染的主相机对象（ArrayCamera）
   * 这个相机管理所有的XR视图（通常是左右眼相机）
   *
   * @return {ArrayCamera} XR相机对象
   *                      - 包含所有XR视图的相机
   *                      - 用于视锥体剔除和渲染
   */
  getCamera() {
    return this._cameraXR;
  }

  /**
   * 获取当前XR会话的环境混合模式
   *
   * 环境混合模式决定了虚拟内容如何与现实环境混合
   * 这个属性由XR设备和会话类型决定
   *
   * @return {'opaque'|'additive'|'alpha-blend'|undefined} 环境混合模式
   *         - 'opaque': 不透明模式（VR），完全遮挡现实环境
   *         - 'additive': 加法混合模式（某些AR设备），虚拟内容叠加到现实环境
   *         - 'alpha-blend': Alpha混合模式（AR），支持透明度混合
   *         - undefined: 在XR会话外使用时返回undefined
   */
  getEnvironmentBlendMode() {
    if (this._session !== null) {
      return this._session.environmentBlendMode;
    }
  }

  /**
   * 获取当前的XR帧对象
   *
   * XR帧包含当前帧的所有XR状态信息
   * 包括设备姿态、输入状态、检测到的特征等
   *
   * @return {?XRFrame} XR帧对象
   *                   - 在XR会话中返回当前帧对象
   *                   - 在XR会话外返回null
   */
  getFrame() {
    return this._xrFrame;
  }

  /**
   * 检查引擎是否使用多视图渲染
   *
   * 多视图渲染是一种性能优化技术，允许在单次渲染调用中
   * 同时渲染多个视图（如左右眼视图）
   *
   * 多视图渲染的优势：
   * - 减少渲染调用次数
   * - 降低CPU开销
   * - 提高整体渲染性能
   * - 特别适用于VR应用
   *
   * @return {boolean} 是否启用了多视图渲染
   *                  - true: 使用多视图渲染目标
   *                  - false: 使用传统的单视图渲染
   */
  useMultiview() {
    return this._useMultiview;
  }

  // ===== XR层创建方法 =====

  /**
   * 创建四边形XR层
   *
   * 此方法用于在XR应用中创建一个四边形层，可以呈现独立渲染的场景
   * 四边形层常用于显示UI界面、视频内容、或其他2D内容
   *
   * 四边形层的特点：
   * - 在XR空间中表现为一个平面
   * - 有自己独立的渲染目标
   * - 可以在XR空间中自由定位和旋转
   * - 支持透明度和混合模式
   *
   * 使用场景：
   * - 虚拟屏幕或显示器
   * - UI面板和菜单
   * - 视频播放界面
   * - 信息展示板
   *
   * @param {number} width - 层平面在世界坐标中的宽度（米）
   * @param {number} height - 层平面在世界坐标中的高度（米）
   * @param {Vector3} translation - 层平面在世界坐标中的位置
   * @param {Quaternion} quaternion - 层平面的方向（四元数表示）
   * @param {number} pixelwidth - 层渲染目标的像素宽度
   * @param {number} pixelheight - 层渲染目标的像素高度
   * @param {Function} rendercall - 渲染回调函数，用于渲染层的内容
   *                               类似于默认动画循环中的代码，可以更新/变换层场景中的3D对象
   * @param {Object} [attributes={}] - 配置层渲染目标的属性
   *                                  - stencil: 是否启用模板缓冲
   * @return {Mesh} 表示四边形XR层的网格对象，应该添加到XR场景中
   */
  createQuadLayer(width, height, translation, quaternion, pixelwidth, pixelheight, rendercall, attributes = {}) {
    // 创建平面几何体，定义层的物理尺寸
    const geometry = new PlaneGeometry(width, height);

    // 创建XR专用渲染目标，用于渲染层的内容
    const renderTarget = new XRRenderTarget(pixelwidth, pixelheight, {
      format: RGBAFormat, // 使用RGBA颜色格式
      type: UnsignedByteType, // 使用无符号字节类型
      // 创建深度纹理，支持深度测试和模板测试
      depthTexture: new DepthTexture(
        pixelwidth,
        pixelheight,
        attributes.stencil ? UnsignedInt248Type : UnsignedIntType, // 根据是否需要模板缓冲选择类型
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        attributes.stencil ? DepthStencilFormat : DepthFormat // 根据是否需要模板缓冲选择格式
      ),
      stencilBuffer: attributes.stencil, // 是否启用模板缓冲
      resolveDepthBuffer: false, // 不解析深度缓冲（性能优化）
      resolveStencilBuffer: false, // 不解析模板缓冲（性能优化）
    });

    // 启用自动深度缓冲分配
    renderTarget._autoAllocateDepthBuffer = true;

    // 创建基础材质，用于显示渲染目标的内容
    const material = new MeshBasicMaterial({ color: 0xffffff, side: FrontSide });
    material.map = renderTarget.texture; // 将渲染目标的纹理作为材质贴图
    material.map.offset.y = 1; // 调整纹理Y轴偏移
    material.map.repeat.y = -1; // 翻转纹理Y轴（WebGL坐标系转换）

    // 创建表示层的网格对象
    const plane = new Mesh(geometry, material);
    plane.position.copy(translation); // 设置层的位置
    plane.quaternion.copy(quaternion); // 设置层的旋转

    // 创建层对象，包含所有必要的信息
    const layer = {
      type: "quad", // 层类型：四边形
      width: width, // 世界坐标中的宽度
      height: height, // 世界坐标中的高度
      translation: translation, // 位置信息
      quaternion: quaternion, // 旋转信息
      pixelwidth: pixelwidth, // 像素宽度
      pixelheight: pixelheight, // 像素高度
      plane: plane, // 网格对象
      material: material, // 原始材质
      rendercall: rendercall, // 渲染回调函数
      renderTarget: renderTarget, // 渲染目标
    };

    // 将层添加到层列表中
    this._layers.push(layer);

    // 如果当前有活跃的XR会话，设置原生XR层
    if (this._session !== null) {
      // 创建新的材质用于"打洞"效果，让原生XR层显示
      layer.plane.material = new MeshBasicMaterial({ color: 0xffffff, side: FrontSide });
      layer.plane.material.blending = CustomBlending; // 使用自定义混合模式
      layer.plane.material.blendEquation = AddEquation; // 加法混合方程
      layer.plane.material.blendSrc = ZeroFactor; // 源因子为0
      layer.plane.material.blendDst = ZeroFactor; // 目标因子为0（完全透明）

      // 创建原生XR层
      layer.xrlayer = this._createXRLayer(layer);

      // 将XR层添加到会话的渲染状态中
      const xrlayers = this._session.renderState.layers;
      xrlayers.unshift(layer.xrlayer); // 添加到层列表开头
      this._session.updateRenderState({ layers: xrlayers });
    } else {
      // 如果没有XR会话，标记为非XR渲染目标
      renderTarget.isXRRenderTarget = false;
    }

    // 返回表示层的网格对象
    return plane;
  }

  /**
   * 创建圆柱形XR层
   *
   * 此方法用于在XR应用中创建一个圆柱形层，可以呈现独立渲染的场景
   * 圆柱形层特别适合显示全景内容或环绕式界面
   *
   * 圆柱形层的特点：
   * - 在XR空间中表现为圆柱面的一部分
   * - 提供沉浸式的环绕体验
   * - 适合显示全景视频或360度内容
   * - 可以调整圆柱的半径和角度范围
   *
   * 使用场景：
   * - 全景视频播放
   * - 360度照片查看
   * - 环绕式UI界面
   * - 虚拟影院屏幕
   *
   * @param {number} radius - 圆柱的半径（世界坐标单位）
   * @param {number} centralAngle - 圆柱的中心角（弧度），定义圆柱覆盖的角度范围
   * @param {number} aspectratio - 宽高比，影响圆柱的高度计算
   * @param {Vector3} translation - 层在世界坐标中的位置
   * @param {Quaternion} quaternion - 层的方向（四元数表示）
   * @param {number} pixelwidth - 层渲染目标的像素宽度
   * @param {number} pixelheight - 层渲染目标的像素高度
   * @param {Function} rendercall - 渲染回调函数，用于渲染层的内容
   *                               类似于默认动画循环中的代码，可以更新/变换层场景中的3D对象
   * @param {Object} [attributes={}] - 配置层渲染目标的属性
   *                                  - stencil: 是否启用模板缓冲
   * @return {Mesh} 表示圆柱形XR层的网格对象，应该添加到XR场景中
   */
  createCylinderLayer(radius, centralAngle, aspectratio, translation, quaternion, pixelwidth, pixelheight, rendercall, attributes = {}) {
    // 创建圆柱几何体，定义层的物理形状
    // 参数：上半径、下半径、高度、径向分段、高度分段、开放端面、起始角、扫描角
    const geometry = new CylinderGeometry(
      radius, // 上半径
      radius, // 下半径（与上半径相同，形成直圆柱）
      (radius * centralAngle) / aspectratio, // 高度（根据半径、角度和宽高比计算）
      64, // 径向分段数（影响圆柱的平滑度）
      64, // 高度分段数
      true, // 开放端面（不封闭顶部和底部）
      Math.PI - centralAngle / 2, // 起始角（从中心角的一半开始）
      centralAngle // 扫描角（覆盖的角度范围）
    );

    // 创建XR专用渲染目标，用于渲染层的内容
    const renderTarget = new XRRenderTarget(pixelwidth, pixelheight, {
      format: RGBAFormat, // 使用RGBA颜色格式
      type: UnsignedByteType, // 使用无符号字节类型
      // 创建深度纹理，支持深度测试和模板测试
      depthTexture: new DepthTexture(
        pixelwidth,
        pixelheight,
        attributes.stencil ? UnsignedInt248Type : UnsignedIntType, // 根据是否需要模板缓冲选择类型
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        attributes.stencil ? DepthStencilFormat : DepthFormat // 根据是否需要模板缓冲选择格式
      ),
      stencilBuffer: attributes.stencil, // 是否启用模板缓冲
      resolveDepthBuffer: false, // 不解析深度缓冲（性能优化）
      resolveStencilBuffer: false, // 不解析模板缓冲（性能优化）
    });

    // 启用自动深度缓冲分配
    renderTarget._autoAllocateDepthBuffer = true;

    // 创建基础材质，用于显示渲染目标的内容
    // 注意：使用BackSide是因为我们在圆柱内部观看
    const material = new MeshBasicMaterial({ color: 0xffffff, side: BackSide });
    material.map = renderTarget.texture; // 将渲染目标的纹理作为材质贴图
    material.map.offset.y = 1; // 调整纹理Y轴偏移
    material.map.repeat.y = -1; // 翻转纹理Y轴（WebGL坐标系转换）

    // 创建表示层的网格对象
    const plane = new Mesh(geometry, material);
    plane.position.copy(translation); // 设置层的位置
    plane.quaternion.copy(quaternion); // 设置层的旋转

    // 创建层对象，包含所有必要的信息
    const layer = {
      type: "cylinder", // 层类型：圆柱形
      radius: radius, // 圆柱半径
      centralAngle: centralAngle, // 中心角
      aspectratio: aspectratio, // 宽高比
      translation: translation, // 位置信息
      quaternion: quaternion, // 旋转信息
      pixelwidth: pixelwidth, // 像素宽度
      pixelheight: pixelheight, // 像素高度
      plane: plane, // 网格对象
      material: material, // 原始材质
      rendercall: rendercall, // 渲染回调函数
      renderTarget: renderTarget, // 渲染目标
    };

    // 将层添加到层列表中
    this._layers.push(layer);

    // 如果当前有活跃的XR会话，设置原生XR层
    if (this._session !== null) {
      // 创建新的材质用于"打洞"效果，让原生XR层显示
      layer.plane.material = new MeshBasicMaterial({ color: 0xffffff, side: BackSide });
      layer.plane.material.blending = CustomBlending; // 使用自定义混合模式
      layer.plane.material.blendEquation = AddEquation; // 加法混合方程
      layer.plane.material.blendSrc = ZeroFactor; // 源因子为0
      layer.plane.material.blendDst = ZeroFactor; // 目标因子为0（完全透明）

      // 创建原生XR层
      layer.xrlayer = this._createXRLayer(layer);

      // 将XR层添加到会话的渲染状态中
      const xrlayers = this._session.renderState.layers;
      xrlayers.unshift(layer.xrlayer); // 添加到层列表开头
      this._session.updateRenderState({ layers: xrlayers });
    } else {
      // 如果没有XR会话，标记为非XR渲染目标
      renderTarget.isXRRenderTarget = false;
    }

    // 返回表示层的网格对象
    return plane;
  }

  /**
   * 渲染之前添加到场景中的XR层
   *
   * 此方法负责渲染所有已创建的XR层（四边形层和圆柱形层）
   * 通常在动画循环中调用，在渲染主场景之前执行
   *
   * 渲染流程：
   * 1. 保存当前渲染器状态
   * 2. 遍历所有层并渲染其内容
   * 3. 根据是否支持原生XR层选择不同的渲染路径
   * 4. 恢复渲染器状态
   *
   * 使用方法：
   * ```javascript
   * function animate() {
   *   xrManager.renderLayers();  // 渲染XR层
   *   renderer.render(scene, camera);  // 渲染主场景
   * }
   * ```
   */
  renderLayers() {
    // 创建临时对象用于获取世界变换
    const translationObject = new Vector3();
    const quaternionObject = new Quaternion();
    const renderer = this._renderer;

    // 保存当前渲染器状态，以便后续恢复
    const wasPresenting = this.isPresenting; // 保存当前呈现状态
    const rendererOutputTarget = renderer.getOutputRenderTarget(); // 保存输出渲染目标
    const rendererFramebufferTarget = renderer._frameBufferTarget; // 保存帧缓冲目标
    this.isPresenting = false; // 临时禁用呈现状态

    const rendererSize = new Vector2();
    renderer.getSize(rendererSize); // 获取渲染器尺寸
    const rendererQuad = renderer._quad; // 保存四边形网格

    // 遍历所有XR层并渲染
    for (const layer of this._layers) {
      // 设置层的XR状态
      layer.renderTarget.isXRRenderTarget = this._session !== null;
      layer.renderTarget._hasExternalTextures = layer.renderTarget.isXRRenderTarget;

      // 如果支持原生XR层且当前在XR会话中，使用原生渲染路径
      if (layer.renderTarget.isXRRenderTarget && this._supportsLayers) {
        // 更新XR层的变换，使其与Three.js对象同步
        layer.xrlayer.transform = new XRRigidTransform(
          layer.plane.getWorldPosition(translationObject), // 获取世界位置
          layer.plane.getWorldQuaternion(quaternionObject) // 获取世界旋转
        );

        // 从XR层获取子图像，用于渲染
        const glSubImage = this._glBinding.getSubImage(layer.xrlayer, this._xrFrame);
        renderer.backend.setXRRenderTargetTextures(
          layer.renderTarget,
          glSubImage.colorTexture, // 设置颜色纹理
          undefined // 深度纹理由XR系统管理
        );

        // 配置渲染器以渲染到XR层
        renderer._setXRLayerSize(layer.renderTarget.width, layer.renderTarget.height);
        renderer.setOutputRenderTarget(layer.renderTarget);
        renderer.setRenderTarget(null);
        renderer._frameBufferTarget = null;

        // 管理帧缓冲目标缓存，避免重复创建
        this._frameBufferTargets || (this._frameBufferTargets = new WeakMap());
        const { frameBufferTarget, quad } = this._frameBufferTargets.get(layer.renderTarget) || { frameBufferTarget: null, quad: null };

        if (!frameBufferTarget) {
          // 首次渲染此层，创建新的帧缓冲目标
          renderer._quad = new QuadMesh(new NodeMaterial());
          this._frameBufferTargets.set(layer.renderTarget, {
            frameBufferTarget: renderer._getFrameBufferTarget(),
            quad: renderer._quad,
          });
        } else {
          // 复用已缓存的帧缓冲目标
          renderer._frameBufferTarget = frameBufferTarget;
          renderer._quad = quad;
        }

        // 执行层的渲染回调
        layer.rendercall();

        // 清理帧缓冲目标
        renderer._frameBufferTarget = null;
      } else {
        // 使用传统渲染路径（非原生XR层或不支持原生层）
        renderer.setRenderTarget(layer.renderTarget);
        layer.rendercall(); // 执行层的渲染回调
      }
    }

    // 恢复渲染器状态
    renderer.setRenderTarget(null); // 清除渲染目标
    renderer.setOutputRenderTarget(rendererOutputTarget); // 恢复输出渲染目标
    renderer._frameBufferTarget = rendererFramebufferTarget; // 恢复帧缓冲目标
    renderer._setXRLayerSize(rendererSize.x, rendererSize.y); // 恢复渲染器尺寸
    renderer._quad = rendererQuad; // 恢复四边形网格
    this.isPresenting = wasPresenting; // 恢复呈现状态
  }

  // ===== XR会话管理方法 =====

  /**
   * 获取当前的XR会话
   *
   * 返回当前活跃的XR会话对象，如果没有活跃会话则返回null
   * XR会话是与WebXR API交互的核心接口
   *
   * @return {?XRSession} XR会话对象
   *                     - 在XR会话中返回会话对象
   *                     - 在XR会话外返回null
   */
  getSession() {
    return this._session;
  }

  /**
   * 设置XR会话并启动XR渲染
   *
   * 在通过`*Button`模块请求XR会话后，使用此方法将会话注入到渲染器中
   * 此方法会触发实际XR渲染的开始，包括：
   * - 配置渲染器以支持XR
   * - 设置事件监听器
   * - 创建XR渲染目标和层
   * - 启动XR动画循环
   *
   * 重要步骤：
   * 1. 验证后端兼容性（目前仅支持WebGL）
   * 2. 注册XR事件监听器
   * 3. 使后端与XR兼容
   * 4. 保存当前渲染器状态
   * 5. 创建XR渲染层和目标
   * 6. 启动XR动画循环
   *
   * @async
   * @param {XRSession} session - 要设置的XR会话对象
   * @return {Promise} 当会话设置完成时解析的Promise
   * @throws {Error} 如果使用WebGPU后端则抛出错误
   */
  async setSession(session) {
    const renderer = this._renderer;
    const backend = renderer.backend;

    // 获取WebGL上下文和属性
    this._gl = renderer.getContext();
    const gl = this._gl;
    const attributes = gl.getContextAttributes();

    // 设置会话引用
    this._session = session;

    if (session !== null) {
      // 检查后端兼容性 - XR目前仅支持WebGL后端
      if (backend.isWebGPUBackend === true)
        throw new Error('THREE.XRManager: XR is currently not supported with a WebGPU backend. Use WebGL by passing "{ forceWebGL: true }" to the constructor of the renderer.');

      // 注册XR会话事件监听器
      // 控制器选择事件
      session.addEventListener("select", this._onSessionEvent); // 选择动作（如扳机按下）
      session.addEventListener("selectstart", this._onSessionEvent); // 选择开始
      session.addEventListener("selectend", this._onSessionEvent); // 选择结束

      // 控制器挤压事件
      session.addEventListener("squeeze", this._onSessionEvent); // 挤压动作（如握拳）
      session.addEventListener("squeezestart", this._onSessionEvent); // 挤压开始
      session.addEventListener("squeezeend", this._onSessionEvent); // 挤压结束

      // 会话管理事件
      session.addEventListener("end", this._onSessionEnd); // 会话结束
      session.addEventListener("inputsourceschange", this._onInputSourcesChange); // 输入源变化

      // 使渲染器后端与XR兼容
      await backend.makeXRCompatible();

      // 保存当前渲染器状态，以便会话结束后恢复
      this._currentPixelRatio = renderer.getPixelRatio(); // 保存像素比
      renderer.getSize(this._currentSize); // 保存画布尺寸

      // 保存并停止当前动画循环
      this._currentAnimationContext = renderer._animation.getContext();
      this._currentAnimationLoop = renderer._animation.getAnimationLoop();
      renderer._animation.stop(); // 停止当前动画循环

      // ===== 创建WebGL绑定对象 =====

      // 如果设备支持WebGL绑定，创建XRWebGLBinding实例
      if (this._supportsGlBinding) {
        const glBinding = new XRWebGLBinding(session, gl);
        this._glBinding = glBinding;
      }

      // ===== 配置XR渲染层 =====

      // 根据设备能力选择渲染路径
      if (this._useLayers === true) {
        // 使用XRProjectionLayer的默认路径（推荐路径，性能更好）

        // 配置深度缓冲格式
        let depthFormat = null;
        let depthType = null;
        let glDepthFormat = null;

        if (renderer.depth) {
          // 根据是否启用模板缓冲选择深度格式
          glDepthFormat = renderer.stencil ? gl.DEPTH24_STENCIL8 : gl.DEPTH_COMPONENT24;
          depthFormat = renderer.stencil ? DepthStencilFormat : DepthFormat;
          depthType = renderer.stencil ? UnsignedInt248Type : UnsignedIntType;
        }

        // 配置投影层初始化参数
        const projectionlayerInit = {
          colorFormat: gl.RGBA8, // 颜色格式：RGBA8
          depthFormat: glDepthFormat, // 深度格式
          scaleFactor: this._framebufferScaleFactor, // 帧缓冲缩放因子
          clearOnAccess: false, // 访问时不清除（性能优化）
        };

        // 检查是否启用多视图渲染
        if (this._useMultiviewIfPossible && renderer.hasFeature("OVR_multiview2")) {
          projectionlayerInit.textureType = "texture-array"; // 设置纹理类型为数组
          this._useMultiview = true; // 启用多视图标志
        }

        // 创建投影层
        const glProjLayer = this._glBinding.createProjectionLayer(projectionlayerInit);
        const layersArray = [glProjLayer];

        // 保存投影层引用
        this._glProjLayer = glProjLayer;

        // 配置渲染器以适应XR渲染
        renderer.setPixelRatio(1); // 设置像素比为1
        renderer._setXRLayerSize(glProjLayer.textureWidth, glProjLayer.textureHeight); // 设置XR层尺寸

        // 创建深度纹理
        const depth = this._useMultiview ? 2 : 1; // 多视图时深度为2（左右眼），否则为1
        const depthTexture = new DepthTexture(
          glProjLayer.textureWidth, // 纹理宽度
          glProjLayer.textureHeight, // 纹理高度
          depthType, // 深度类型
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          depthFormat, // 深度格式
          depth // 深度层数
        );

        // 创建XR渲染目标
        this._xrRenderTarget = new XRRenderTarget(glProjLayer.textureWidth, glProjLayer.textureHeight, {
          format: RGBAFormat, // 颜色格式
          type: UnsignedByteType, // 数据类型
          colorSpace: renderer.outputColorSpace, // 颜色空间
          depthTexture: depthTexture, // 深度纹理
          stencilBuffer: renderer.stencil, // 模板缓冲
          samples: attributes.antialias ? 4 : 0, // 抗锯齿采样数
          resolveDepthBuffer: glProjLayer.ignoreDepthValues === false, // 是否解析深度缓冲
          resolveStencilBuffer: glProjLayer.ignoreDepthValues === false, // 是否解析模板缓冲
          depth: this._useMultiview ? 2 : 1, // 深度层数
          multiview: this._useMultiview, // 多视图标志
        });

        // 标记为具有外部纹理的渲染目标
        this._xrRenderTarget._hasExternalTextures = true;
        // 设置渲染目标深度
        this._xrRenderTarget.depth = this._useMultiview ? 2 : 1;

        // 检查会话是否支持层功能
        this._supportsLayers = session.enabledFeatures.includes("layers");

        // 请求参考空间
        this._referenceSpace = await session.requestReferenceSpace(this.getReferenceSpaceType());

        // 如果支持层功能，将现有层切换到原生XR层
        if (this._supportsLayers) {
          // 将现有层切换到原生模式
          for (const layer of this._layers) {
            // 修改材质以"打洞"显示XR层
            // 根据层类型选择合适的面向（圆柱形层使用背面，其他使用正面）
            layer.plane.material = new MeshBasicMaterial({
              color: 0xffffff,
              side: layer.type === "cylinder" ? BackSide : FrontSide,
            });
            layer.plane.material.blending = CustomBlending; // 自定义混合
            layer.plane.material.blendEquation = AddEquation; // 加法混合方程
            layer.plane.material.blendSrc = ZeroFactor; // 源因子为0
            layer.plane.material.blendDst = ZeroFactor; // 目标因子为0（完全透明）

            // 创建原生XR层
            layer.xrlayer = this._createXRLayer(layer);

            // 将XR层添加到层数组开头
            layersArray.unshift(layer.xrlayer);
          }
        }

        // 更新会话的渲染状态，设置层数组
        session.updateRenderState({ layers: layersArray });
      } else {
        // ===== 回退到XRWebGLLayer（传统路径） =====

        // 配置基础层初始化参数
        const layerInit = {
          antialias: renderer.samples > 0, // 抗锯齿（基于渲染器采样数）
          alpha: true, // 启用Alpha通道
          depth: renderer.depth, // 深度缓冲（基于渲染器设置）
          stencil: renderer.stencil, // 模板缓冲（基于渲染器设置）
          framebufferScaleFactor: this.getFramebufferScaleFactor(), // 帧缓冲缩放因子
        };

        // 创建传统的XRWebGLLayer
        const glBaseLayer = new XRWebGLLayer(session, gl, layerInit);
        this._glBaseLayer = glBaseLayer;

        // 更新会话的渲染状态，设置基础层
        session.updateRenderState({ baseLayer: glBaseLayer });

        // 配置渲染器以适应XR渲染
        renderer.setPixelRatio(1); // 设置像素比为1
        renderer._setXRLayerSize(glBaseLayer.framebufferWidth, glBaseLayer.framebufferHeight); // 设置XR层尺寸

        // 创建XR渲染目标（传统路径）
        this._xrRenderTarget = new XRRenderTarget(glBaseLayer.framebufferWidth, glBaseLayer.framebufferHeight, {
          format: RGBAFormat, // 颜色格式
          type: UnsignedByteType, // 数据类型
          colorSpace: renderer.outputColorSpace, // 颜色空间
          stencilBuffer: renderer.stencil, // 模板缓冲
          resolveDepthBuffer: glBaseLayer.ignoreDepthValues === false, // 是否解析深度缓冲
          resolveStencilBuffer: glBaseLayer.ignoreDepthValues === false, // 是否解析模板缓冲
        });

        // 标记为不透明帧缓冲
        this._xrRenderTarget._isOpaqueFramebuffer = true;

        // 请求参考空间
        this._referenceSpace = await session.requestReferenceSpace(this.getReferenceSpaceType());
      }

      // ===== 完成会话设置 =====

      // 应用注视点渲染设置
      this.setFoveation(this.getFoveation());

      // 启动XR动画循环
      renderer._animation.setAnimationLoop(this._onAnimationFrame); // 设置XR专用动画循环
      renderer._animation.setContext(session); // 设置动画上下文为XR会话
      renderer._animation.start(); // 启动动画循环

      // 标记为正在呈现状态
      this.isPresenting = true;

      // 分发会话开始事件
      this.dispatchEvent({ type: "sessionstart" });
    }
  }

  // ===== 相机更新方法 =====

  /**
   * 更新XR相机系统
   *
   * 此方法由渲染器每帧调用，基于给定的用户相机更新XR相机及其子相机
   * 用户相机是在应用程序级别创建的"用户"相机，用于非XR渲染
   *
   * 更新过程包括：
   * 1. 同步近远裁剪面
   * 2. 更新渲染状态（如有必要）
   * 3. 配置相机层掩码
   * 4. 更新相机变换矩阵
   * 5. 计算统一投影矩阵
   * 6. 更新用户相机
   *
   * @param {PerspectiveCamera} camera - 用户相机，用作XR相机更新的参考
   */
  updateCamera(camera) {
    const session = this._session;

    // 如果没有活跃的XR会话，直接返回
    if (session === null) return;

    // 获取用户相机的近远裁剪面
    const depthNear = camera.near;
    const depthFar = camera.far;

    // 获取XR相机引用
    const cameraXR = this._cameraXR;
    const cameraL = this._cameraL;
    const cameraR = this._cameraR;

    // 同步所有XR相机的近远裁剪面
    cameraXR.near = cameraR.near = cameraL.near = depthNear;
    cameraXR.far = cameraR.far = cameraL.far = depthFar;

    // 设置多视图相机标志
    cameraXR.isMultiViewCamera = this._useMultiview;

    // 检查深度值是否发生变化，如有变化则更新渲染状态
    if (this._currentDepthNear !== cameraXR.near || this._currentDepthFar !== cameraXR.far) {
      // 注意：新的渲染状态要到下一帧才会生效。参见 #18320

      session.updateRenderState({
        depthNear: cameraXR.near, // 更新近裁剪面
        depthFar: cameraXR.far, // 更新远裁剪面
      });

      // 缓存当前深度值
      this._currentDepthNear = cameraXR.near;
      this._currentDepthFar = cameraXR.far;
    }

    // 配置相机层掩码，继承用户相机的层设置并启用眼部层
    // 位掩码说明：1 = 左眼层，2 = 右眼层，4 = 通用层
    cameraXR.layers.mask = camera.layers.mask | 0b110; // 启用左右眼层（位1和位2）
    cameraL.layers.mask = cameraXR.layers.mask & 0b011; // 左眼相机：通用层+左眼层（位0和位1）
    cameraR.layers.mask = cameraXR.layers.mask & 0b101; // 右眼相机：通用层+右眼层（位0和位2）

    // 获取用户相机的父对象和XR相机数组
    const parent = camera.parent;
    const cameras = cameraXR.cameras;

    // 更新主XR相机的世界矩阵
    updateCamera(cameraXR, parent);

    // 更新所有子相机的世界矩阵
    for (let i = 0; i < cameras.length; i++) {
      updateCamera(cameras[i], parent);
    }

    // 更新投影矩阵以实现正确的视锥体剔除

    if (cameras.length === 2) {
      // 双相机设置（VR）：计算左右眼相机的联合投影矩阵
      setProjectionFromUnion(cameraXR, cameraL, cameraR);
    } else {
      // 单相机设置（AR）：直接复制左眼相机的投影矩阵
      cameraXR.projectionMatrix.copy(cameraL.projectionMatrix);
    }

    // 更新用户相机及其子对象，使其与XR相机同步
    updateUserCamera(camera, cameraXR, parent);
  }

  /**
   * 获取指定索引的WebXR控制器
   *
   * 这是一个私有方法，用于获取或创建WebXR控制器实例
   * 如果指定索引的控制器不存在，会自动创建一个新的控制器
   *
   * 控制器管理策略：
   * - 延迟创建：只有在需要时才创建控制器
   * - 索引映射：使用数组索引来管理多个控制器
   * - 自动初始化：确保返回的控制器总是可用的
   *
   * @private
   * @param {number} index - 控制器索引（通常0为左手，1为右手）
   * @return {WebXRController} WebXR控制器实例
   */
  _getController(index) {
    // 尝试获取已存在的控制器
    let controller = this._controllers[index];

    // 如果控制器不存在，创建新的控制器实例
    if (controller === undefined) {
      controller = new WebXRController();
      this._controllers[index] = controller;
    }

    return controller;
  }
}

// ===== 辅助函数 =====

/**
 * 从左右眼相机的联合视锥体设置投影矩阵
 *
 * 此函数用于计算能够包含左右眼相机视锥体的统一投影矩阵
 * 主要用于视锥体剔除，确保所有可见对象都能被正确渲染
 *
 * 算法假设：
 * - 两个相机平行且共享X轴
 * - 相机的投影矩阵和世界矩阵已经设置
 * - 两个相机的近远平面相同
 *
 * 技术参考：https://computergraphics.stackexchange.com/a/4765
 *
 * @param {ArrayCamera} camera - 要更新的主相机（ArrayCamera）
 * @param {PerspectiveCamera} cameraL - 左眼相机
 * @param {PerspectiveCamera} cameraR - 右眼相机
 */
function setProjectionFromUnion(camera, cameraL, cameraR) {
  // 获取左右眼相机的世界位置
  _cameraLPos.setFromMatrixPosition(cameraL.matrixWorld);
  _cameraRPos.setFromMatrixPosition(cameraR.matrixWorld);

  // 计算瞳距（IPD - Interpupillary Distance）
  const ipd = _cameraLPos.distanceTo(_cameraRPos);

  // 获取左右眼相机的投影矩阵元素
  const projL = cameraL.projectionMatrix.elements;
  const projR = cameraR.projectionMatrix.elements;

  // VR系统通常具有相同的远近平面，以及相同的上下视锥体范围
  // 使用左眼相机的值来计算这些参数
  const near = projL[14] / (projL[10] - 1); // 近平面距离
  const far = projL[14] / (projL[10] + 1); // 远平面距离
  const topFov = (projL[9] + 1) / projL[5]; // 上方视场角
  const bottomFov = (projL[9] - 1) / projL[5]; // 下方视场角

  // 计算左右视场角
  const leftFov = (projL[8] - 1) / projL[0]; // 左眼相机的左视场角
  const rightFov = (projR[8] + 1) / projR[0]; // 右眼相机的右视场角
  const left = near * leftFov; // 左边界
  const right = near * rightFov; // 右边界

  // 计算新相机相对于左眼相机的位置偏移
  // xOffset应该大约是瞳距的一半
  const zOffset = ipd / (-leftFov + rightFov); // Z轴偏移
  const xOffset = zOffset * -leftFov; // X轴偏移

  // 应用位置偏移到主相机
  // TODO: 寻找更好的偏移应用方法
  cameraL.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
  camera.translateX(xOffset); // 应用X轴偏移
  camera.translateZ(zOffset); // 应用Z轴偏移
  camera.matrixWorld.compose(camera.position, camera.quaternion, camera.scale);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

  // 检查投影是否使用无限远平面
  if (projL[10] === -1.0) {
    // 使用左眼的投影矩阵
    // 相机偏移足以包含两只眼睛的视体积（假设对称投影）
    camera.projectionMatrix.copy(cameraL.projectionMatrix);
    camera.projectionMatrixInverse.copy(cameraL.projectionMatrixInverse);
  } else {
    // 计算相机视锥体的联合值并缩放这些值
    // 使近平面在世界空间中的位置不变，但现在相对于新的联合相机
    const near2 = near + zOffset; // 调整后的近平面
    const far2 = far + zOffset; // 调整后的远平面
    const left2 = left - xOffset; // 调整后的左边界
    const right2 = right + (ipd - xOffset); // 调整后的右边界
    const top2 = ((topFov * far) / far2) * near2; // 调整后的上边界
    const bottom2 = ((bottomFov * far) / far2) * near2; // 调整后的下边界

    // 创建新的透视投影矩阵
    camera.projectionMatrix.makePerspective(left2, right2, top2, bottom2, near2, far2);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
}

/**
 * 基于父3D对象更新给定相机的世界矩阵
 *
 * 此函数用于更新相机的世界变换矩阵，考虑其父对象的变换
 * 这是Three.js中标准的矩阵更新流程
 *
 * @inner
 * @param {Camera} camera - 要更新的相机
 * @param {Object3D} parent - 父3D对象
 */
function updateCamera(camera, parent) {
  if (parent === null) {
    // 如果没有父对象，直接复制本地矩阵到世界矩阵
    camera.matrixWorld.copy(camera.matrix);
  } else {
    // 如果有父对象，将父对象的世界矩阵与本地矩阵相乘
    camera.matrixWorld.multiplyMatrices(parent.matrixWorld, camera.matrix);
  }

  // 计算世界矩阵的逆矩阵
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
}

/**
 * 使用XR相机和父对象的变换更新给定的用户相机
 *
 * 此函数将XR相机的变换同步到用户相机，确保用户相机
 * 反映XR设备的实际位置和方向
 *
 * @inner
 * @param {Camera} camera - 要更新的用户相机
 * @param {ArrayCamera} cameraXR - XR相机
 * @param {Object3D} parent - 父3D对象
 */
function updateUserCamera(camera, cameraXR, parent) {
  if (parent === null) {
    // 如果没有父对象，直接复制XR相机的世界矩阵
    camera.matrix.copy(cameraXR.matrixWorld);
  } else {
    // 如果有父对象，计算相对于父对象的变换
    camera.matrix.copy(parent.matrixWorld);
    camera.matrix.invert(); // 获取父对象的逆矩阵
    camera.matrix.multiply(cameraXR.matrixWorld); // 乘以XR相机的世界矩阵
  }

  // 从矩阵中提取位置、旋转和缩放
  camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
  camera.updateMatrixWorld(true);

  // 复制XR相机的投影矩阵
  camera.projectionMatrix.copy(cameraXR.projectionMatrix);
  camera.projectionMatrixInverse.copy(cameraXR.projectionMatrixInverse);

  // 如果是透视相机，更新视场角
  if (camera.isPerspectiveCamera) {
    camera.fov = RAD2DEG * 2 * Math.atan(1 / camera.projectionMatrix.elements[5]);
    camera.zoom = 1;
  }
}

function onSessionEvent(event) {
  const controllerIndex = this._controllerInputSources.indexOf(event.inputSource);

  if (controllerIndex === -1) {
    return;
  }

  const controller = this._controllers[controllerIndex];

  if (controller !== undefined) {
    const referenceSpace = this.getReferenceSpace();

    controller.update(event.inputSource, event.frame, referenceSpace);
    controller.dispatchEvent({ type: event.type, data: event.inputSource });
  }
}

/**
 * XR会话结束事件处理函数
 *
 * 当XR会话结束时调用此函数，负责清理所有XR相关的资源和状态
 * 包括移除事件监听器、断开控制器、恢复渲染状态等
 *
 * 清理步骤：
 * 1. 移除所有事件监听器
 * 2. 断开所有控制器连接
 * 3. 重置深度值缓存
 * 4. 恢复渲染器状态
 * 5. 清理XR对象引用
 * 6. 将层切换回模拟模式
 * 7. 恢复原始动画循环
 */
function onSessionEnd() {
  const session = this._session;
  const renderer = this._renderer;

  // 移除所有XR会话事件监听器
  session.removeEventListener("select", this._onSessionEvent); // 移除选择事件
  session.removeEventListener("selectstart", this._onSessionEvent); // 移除选择开始事件
  session.removeEventListener("selectend", this._onSessionEvent); // 移除选择结束事件
  session.removeEventListener("squeeze", this._onSessionEvent); // 移除挤压事件
  session.removeEventListener("squeezestart", this._onSessionEvent); // 移除挤压开始事件
  session.removeEventListener("squeezeend", this._onSessionEvent); // 移除挤压结束事件
  session.removeEventListener("end", this._onSessionEnd); // 移除会话结束事件
  session.removeEventListener("inputsourceschange", this._onInputSourcesChange); // 移除输入源变化事件

  // 断开所有控制器连接
  for (let i = 0; i < this._controllers.length; i++) {
    const inputSource = this._controllerInputSources[i];

    if (inputSource === null) continue;

    // 清除输入源引用
    this._controllerInputSources[i] = null;

    // 断开控制器连接
    this._controllers[i].disconnect(inputSource);
  }

  // 重置深度值缓存
  this._currentDepthNear = null;
  this._currentDepthFar = null;

  // 恢复帧缓冲/渲染状态
  renderer._resetXRState();

  // 清理XR对象引用
  this._session = null;
  this._xrRenderTarget = null;

  // 将层切换回模拟模式
  if (this._supportsLayers === true) {
    for (const layer of this._layers) {
      // 重新创建层渲染目标以重置状态
      layer.renderTarget = new XRRenderTarget(layer.pixelwidth, layer.pixelheight, {
        format: RGBAFormat,
        type: UnsignedByteType,
        depthTexture: new DepthTexture(
          layer.pixelwidth,
          layer.pixelheight,
          layer.stencilBuffer ? UnsignedInt248Type : UnsignedIntType,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          layer.stencilBuffer ? DepthStencilFormat : DepthFormat
        ),
        stencilBuffer: layer.stencilBuffer,
        resolveDepthBuffer: false,
        resolveStencilBuffer: false,
      });

      // 标记为非XR渲染目标
      layer.renderTarget.isXRRenderTarget = false;

      // 恢复原始材质和纹理映射
      layer.plane.material = layer.material;
      layer.material.map = layer.renderTarget.texture;
      layer.material.map.offset.y = 1; // 设置纹理Y轴偏移
      layer.material.map.repeat.y = -1; // 翻转纹理Y轴
      delete layer.xrlayer; // 删除原生XR层引用
    }
  }

  // ===== 恢复渲染器和动画状态 =====

  // 重置呈现状态标志
  this.isPresenting = false;
  this._useMultiview = false;

  // 恢复原始动画循环
  renderer._animation.stop(); // 停止当前XR动画循环
  renderer._animation.setAnimationLoop(this._currentAnimationLoop); // 恢复原始动画循环函数
  renderer._animation.setContext(this._currentAnimationContext); // 恢复原始动画上下文
  renderer._animation.start(); // 启动原始动画循环

  // 恢复原始渲染器设置
  renderer.setPixelRatio(this._currentPixelRatio); // 恢复像素比
  renderer.setSize(this._currentSize.width, this._currentSize.height, false); // 恢复画布尺寸

  // 分发会话结束事件
  this.dispatchEvent({ type: "sessionend" });
}

/**
 * 输入源变化事件处理函数
 *
 * 当XR输入设备连接或断开时调用此函数
 * 负责管理控制器与输入源之间的映射关系
 *
 * 处理流程：
 * 1. 处理断开的输入源（移除映射，断开控制器）
 * 2. 处理新连接的输入源（分配控制器，建立连接）
 *
 * 输入源类型包括：
 * - 手柄控制器
 * - 手部追踪
 * - 其他XR输入设备
 *
 * @param {XRInputSourceChangeEvent} event - 输入源变化事件
 */
function onInputSourcesChange(event) {
  const controllers = this._controllers;
  const controllerInputSources = this._controllerInputSources;

  // ===== 处理断开的输入源 =====

  for (let i = 0; i < event.removed.length; i++) {
    const inputSource = event.removed[i];
    const index = controllerInputSources.indexOf(inputSource);

    if (index >= 0) {
      // 清除输入源映射
      controllerInputSources[index] = null;
      // 断开控制器连接
      controllers[index].disconnect(inputSource);
    }
  }

  // ===== 处理新连接的输入源 =====

  for (let i = 0; i < event.added.length; i++) {
    const inputSource = event.added[i];

    // 检查输入源是否已经有对应的控制器
    let controllerIndex = controllerInputSources.indexOf(inputSource);

    if (controllerIndex === -1) {
      // 为输入源分配一个当前没有输入源的控制器

      for (let i = 0; i < controllers.length; i++) {
        if (i >= controllerInputSources.length) {
          // 扩展输入源数组
          controllerInputSources.push(inputSource);
          controllerIndex = i;
          break;
        } else if (controllerInputSources[i] === null) {
          // 使用空闲的控制器槽位
          controllerInputSources[i] = inputSource;
          controllerIndex = i;
          break;
        }
      }

      // 如果所有控制器都已被占用，忽略新的输入源
      if (controllerIndex === -1) break;
    }

    // 获取对应的控制器并建立连接
    const controller = controllers[controllerIndex];

    if (controller) {
      controller.connect(inputSource);
    }
  }
}

/**
 * 创建原生WebXR层的方法
 *
 * 此函数根据层的类型创建相应的原生XR层对象
 * 原生XR层由XR运行时直接管理，提供更好的性能和集成度
 *
 * 支持的层类型：
 * - quad: 四边形层，用于平面内容显示
 * - cylinder: 圆柱形层，用于环绕式内容显示
 *
 * 原生层的优势：
 * - 更高的渲染性能
 * - 更好的延迟特性
 * - 原生的空间稳定性
 * - 减少CPU/GPU之间的数据传输
 *
 * @param {Object} layer - 层配置对象
 * @return {XRQuadLayer|XRCylinderLayer} 创建的原生XR层对象
 */
function createXRLayer(layer) {
  if (layer.type === "quad") {
    // 创建四边形XR层
    return this._glBinding.createQuadLayer({
      transform: new XRRigidTransform(layer.translation, layer.quaternion), // 层的空间变换
      width: layer.width / 2, // 宽度（除以2是因为XR API的单位差异）
      height: layer.height / 2, // 高度（除以2是因为XR API的单位差异）
      space: this._referenceSpace, // 参考空间
      viewPixelWidth: layer.pixelwidth, // 视图像素宽度
      viewPixelHeight: layer.pixelheight, // 视图像素高度
      clearOnAccess: false, // 访问时不清除（性能优化）
    });
  } else {
    // 创建圆柱形XR层
    return this._glBinding.createCylinderLayer({
      transform: new XRRigidTransform(layer.translation, layer.quaternion), // 层的空间变换
      radius: layer.radius, // 圆柱半径
      centralAngle: layer.centralAngle, // 中心角
      aspectRatio: layer.aspectRatio, // 宽高比
      space: this._referenceSpace, // 参考空间
      viewPixelWidth: layer.pixelwidth, // 视图像素宽度
      viewPixelHeight: layer.pixelheight, // 视图像素高度
      clearOnAccess: false, // 访问时不清除（性能优化）
    });
  }
}

// ===== XR动画循环 =====

/**
 * XR动画帧处理函数
 *
 * 这是XR渲染的核心动画循环函数，在每个XR帧中被调用
 * 负责更新XR相机、处理姿态数据、管理视图和控制器状态
 *
 * 主要职责：
 * 1. 获取当前帧的姿态数据
 * 2. 更新XR相机和视图
 * 3. 设置渲染目标和视口
 * 4. 更新控制器状态
 * 5. 调用用户的渲染回调
 *
 * @param {number} time - 当前时间戳（毫秒）
 * @param {XRFrame} frame - XR帧对象，包含当前帧的所有状态信息
 */
function onAnimationFrame(time, frame) {
  // 如果没有有效的XR帧，直接返回
  if (frame === undefined) return;

  // 获取必要的对象引用
  const cameraXR = this._cameraXR;
  const renderer = this._renderer;
  const backend = renderer.backend;

  const glBaseLayer = this._glBaseLayer;

  // 获取参考空间和观察者姿态
  const referenceSpace = this.getReferenceSpace();
  const pose = frame.getViewerPose(referenceSpace);

  // 缓存当前XR帧，供其他方法使用
  this._xrFrame = frame;

  // 如果成功获取到姿态数据
  if (pose !== null) {
    const views = pose.views; // 获取所有视图（通常是左右眼视图）

    // 如果使用传统的基础层，设置渲染目标
    if (this._glBaseLayer !== null) {
      backend.setXRTarget(glBaseLayer.framebuffer);
    }

    let cameraXRNeedsUpdate = false;

    // 检查是否需要重建cameraXR的相机列表
    // 当视图数量发生变化时（如从单眼切换到双眼）
    if (views.length !== cameraXR.cameras.length) {
      cameraXR.cameras.length = 0; // 清空现有相机列表
      cameraXRNeedsUpdate = true; // 标记需要更新
    }

    // 遍历所有视图并更新对应的相机
    for (let i = 0; i < views.length; i++) {
      const view = views[i];

      let viewport;

      // 根据使用的渲染路径获取视口信息
      if (this._useLayers === true) {
        // 使用投影层路径：从WebXR Layers API获取子图像
        const glSubImage = this._glBinding.getViewSubImage(this._glProjLayer, view);
        viewport = glSubImage.viewport;

        // 对于并排投影，我们只为两只眼睛生成一个纹理
        if (i === 0) {
          backend.setXRRenderTargetTextures(
            this._xrRenderTarget,
            glSubImage.colorTexture, // 颜色纹理
            // 深度模板纹理（根据设置和多视图状态决定是否使用）
            this._glProjLayer.ignoreDepthValues && !this._useMultiview ? undefined : glSubImage.depthStencilTexture
          );
        }
      } else {
        // 使用传统基础层路径：从XRWebGLLayer获取视口
        viewport = glBaseLayer.getViewport(view);
      }

      // 获取或创建对应的相机
      let camera = this._cameras[i];

      if (camera === undefined) {
        // 创建新的透视相机
        camera = new PerspectiveCamera();
        camera.layers.enable(i); // 启用对应的渲染层
        camera.viewport = new Vector4(); // 初始化视口
        this._cameras[i] = camera; // 缓存相机
      }

      // 从XR视图数据更新相机变换
      camera.matrix.fromArray(view.transform.matrix); // 设置变换矩阵
      camera.matrix.decompose(camera.position, camera.quaternion, camera.scale); // 分解为位置、旋转、缩放
      camera.projectionMatrix.fromArray(view.projectionMatrix); // 设置投影矩阵
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert(); // 计算投影矩阵的逆
      camera.viewport.set(viewport.x, viewport.y, viewport.width, viewport.height); // 设置视口

      // 使用第一个视图（通常是左眼）的变换作为主XR相机的变换
      if (i === 0) {
        cameraXR.matrix.copy(camera.matrix);
        cameraXR.matrix.decompose(cameraXR.position, cameraXR.quaternion, cameraXR.scale);
      }

      // 如果需要更新相机列表，添加当前相机
      if (cameraXRNeedsUpdate === true) {
        cameraXR.cameras.push(camera);
      }
    }

    // 设置XR渲染目标为输出目标
    renderer.setOutputRenderTarget(this._xrRenderTarget);
  }

  // ===== 更新控制器状态 =====

  // 遍历所有控制器并更新其状态
  for (let i = 0; i < this._controllers.length; i++) {
    const inputSource = this._controllerInputSources[i];
    const controller = this._controllers[i];

    // 如果控制器有对应的输入源，更新其状态
    if (inputSource !== null && controller !== undefined) {
      controller.update(inputSource, frame, referenceSpace);
    }
  }

  // ===== 调用用户动画循环 =====

  // 如果有用户定义的动画循环，调用它
  if (this._currentAnimationLoop) this._currentAnimationLoop(time, frame);

  // ===== 处理检测到的平面 =====

  // 如果检测到平面（AR功能），分发平面检测事件
  if (frame.detectedPlanes) {
    this.dispatchEvent({ type: "planesdetected", data: frame });
  }

  // 清除XR帧引用，准备下一帧
  this._xrFrame = null;
}

// ===== 模块导出 =====

/**
 * 导出XRManager类作为默认导出
 *
 * XRManager是Three.js中处理WebXR功能的核心类
 * 提供了完整的XR会话管理、相机控制、层渲染等功能
 */
export default XRManager;
