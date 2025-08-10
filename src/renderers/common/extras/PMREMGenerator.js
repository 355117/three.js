/**
 * PMREMGenerator.js
 *
 * 预过滤、多级细节辐射环境贴图(PMREM)生成器
 *
 * 这个类负责从环境贴图生成PMREM，用于基于图像的照明(IBL)。
 * PMREM是一种特殊的立方体贴图格式，预先计算了不同粗糙度级别的环境光照，
 * 使得实时渲染中可以快速查询环境反射和漫反射照明。
 *
 * 主要功能：
 * 1. 从等距柱状投影纹理生成PMREM
 * 2. 从立方体贴图生成PMREM
 * 3. 从3D场景生成PMREM
 * 4. 支持HDR和LDR输入
 * 5. 生成多级模糊的环境贴图用于不同粗糙度的材质
 *
 * 技术原理：
 * - 使用重要性采样和蒙特卡洛积分
 * - 基于Trowbridge-Reitz分布函数
 * - 实现了几何遮蔽函数
 * - 支持非线性格式如RGBE
 */

// 导入节点材质系统相关模块
import NodeMaterial from "../../../materials/nodes/NodeMaterial.js"; // 节点材质基类
import { getDirection, blur } from "../../../nodes/pmrem/PMREMUtils.js"; // PMREM工具函数
import { equirectUV } from "../../../nodes/utils/EquirectUV.js"; // 等距柱状投影UV计算
import { uniform } from "../../../nodes/core/UniformNode.js"; // uniform节点
import { uniformArray } from "../../../nodes/accessors/UniformArrayNode.js"; // uniform数组节点
import { texture } from "../../../nodes/accessors/TextureNode.js"; // 纹理节点
import { cubeTexture } from "../../../nodes/accessors/CubeTextureNode.js"; // 立方体纹理节点
import { float, vec3 } from "../../../nodes/tsl/TSLBase.js"; // TSL基础类型
import { uv } from "../../../nodes/accessors/UV.js"; // UV坐标节点
import { attribute } from "../../../nodes/core/AttributeNode.js"; // 属性节点

// 导入Three.js核心模块
import { OrthographicCamera } from "../../../cameras/OrthographicCamera.js"; // 正交相机
import { Color } from "../../../math/Color.js"; // 颜色类
import { Vector3 } from "../../../math/Vector3.js"; // 三维向量
import { BufferGeometry } from "../../../core/BufferGeometry.js"; // 缓冲几何体
import { BufferAttribute } from "../../../core/BufferAttribute.js"; // 缓冲属性
import { RenderTarget } from "../../../core/RenderTarget.js"; // 渲染目标
import { Mesh } from "../../../objects/Mesh.js"; // 网格对象
import { PerspectiveCamera } from "../../../cameras/PerspectiveCamera.js"; // 透视相机
import { MeshBasicMaterial } from "../../../materials/MeshBasicMaterial.js"; // 基础网格材质
import { BoxGeometry } from "../../../geometries/BoxGeometry.js"; // 立方体几何体

// 导入常量定义
import {
  CubeReflectionMapping, // 立方体反射映射
  CubeRefractionMapping, // 立方体折射映射
  CubeUVReflectionMapping, // 立方体UV反射映射
  LinearFilter, // 线性过滤
  NoBlending, // 无混合
  RGBAFormat, // RGBA格式
  HalfFloatType, // 半精度浮点类型
  BackSide, // 背面
  LinearSRGBColorSpace, // 线性sRGB颜色空间
} from "../../../constants.js";

// ===== PMREM生成相关常量 =====

/**
 * 最小LOD级别
 *
 * 定义PMREM生成的最小细节级别。在此级别之后，会创建额外的
 * 更加模糊的"mips"，用于更高的粗糙度级别。
 */
const LOD_MIN = 4;

/**
 * 额外LOD级别的标准差值（弧度）
 *
 * 这些值用于近似Trowbridge-Reitz分布函数乘以几何遮蔽函数的效果。
 * 这些sigma值的平方必须与cube_uv_reflection_fragment.glsl.js中的
 * 方差#defines匹配，确保着色器和CPU端计算的一致性。
 *
 * 每个值对应不同粗糙度级别的模糊程度：
 * - 0.125: 轻微模糊（低粗糙度）
 * - 0.582: 重度模糊（高粗糙度）
 */
const EXTRA_LOD_SIGMA = [0.125, 0.215, 0.35, 0.446, 0.526, 0.582];

/**
 * 模糊循环的最大采样数
 *
 * 较小的sigma值会使用更少的采样并提前退出，但不会重新编译着色器。
 * 这个值平衡了质量和性能，确保即使是最高质量的模糊也不会超过
 * 合理的计算量。
 */
const MAX_SAMPLES = 20;

// ===== 共享的相机和渲染状态 =====

/**
 * 平面渲染相机
 *
 * 正交相机，用于渲染全屏四边形。视锥体从-1到1，深度从0到1，
 * 适合屏幕空间的后处理操作。
 */
const _flatCamera = /*@__PURE__*/ new OrthographicCamera(-1, 1, 1, -1, 0, 1);

/**
 * 立方体渲染相机
 *
 * 透视相机，90度视角，1:1宽高比，用于渲染立方体贴图的每个面。
 * 90度视角确保每个面正好覆盖立方体的一个面。
 */
const _cubeCamera = /*@__PURE__*/ new PerspectiveCamera(90, 1);

/**
 * 清除颜色缓存
 *
 * 用于保存和恢复渲染器的清除颜色，确保PMREM生成过程不会
 * 影响外部渲染状态。
 */
const _clearColor = /*@__PURE__*/ new Color();

// 渲染状态保存变量，用于在PMREM生成后恢复原始状态
let _oldTarget = null; // 原始渲染目标
let _oldActiveCubeFace = 0; // 原始活动立方体面
let _oldActiveMipmapLevel = 0; // 原始活动mipmap级别

// ===== 数学常量 =====

/**
 * 黄金比例 φ = (1 + √5) / 2 ≈ 1.618
 *
 * 用于生成均匀分布在球面上的方向向量，这些方向基于
 * 十二面体的顶点，提供了良好的球面采样分布。
 */
const PHI = (1 + Math.sqrt(5)) / 2;

/**
 * 黄金比例的倒数 1/φ ≈ 0.618
 *
 * 与PHI一起用于构造十二面体顶点坐标，确保方向向量
 * 在球面上的均匀分布。
 */
const INV_PHI = 1 / PHI;

/**
 * 十二面体顶点方向数组
 *
 * 十二面体的顶点（除了相对的顶点，它们代表相同的轴），
 * 用作均匀分布在球面上的轴方向。这些方向向量用于PMREM
 * 生成过程中的重要性采样，确保在球面上的均匀分布。
 *
 * 十二面体是一个正多面体，其顶点在球面上分布最为均匀，
 * 因此是球面采样的理想选择。这些方向用于：
 * - 模糊计算中的极轴方向
 * - 重要性采样的方向分布
 * - 确保PMREM质量的一致性
 */
const _axisDirections = [
  /*@__PURE__*/ new Vector3(-PHI, INV_PHI, 0), // 十二面体顶点1
  /*@__PURE__*/ new Vector3(PHI, INV_PHI, 0), // 十二面体顶点2
  /*@__PURE__*/ new Vector3(-INV_PHI, 0, PHI), // 十二面体顶点3
  /*@__PURE__*/ new Vector3(INV_PHI, 0, PHI), // 十二面体顶点4
  /*@__PURE__*/ new Vector3(0, PHI, -INV_PHI), // 十二面体顶点5
  /*@__PURE__*/ new Vector3(0, PHI, INV_PHI), // 十二面体顶点6
  /*@__PURE__*/ new Vector3(-1, 1, -1), // 十二面体顶点7
  /*@__PURE__*/ new Vector3(1, 1, -1), // 十二面体顶点8
  /*@__PURE__*/ new Vector3(-1, 1, 1), // 十二面体顶点9
  /*@__PURE__*/ new Vector3(1, 1, 1), // 十二面体顶点10
];

/**
 * 原点向量
 *
 * 用作默认的相机位置和参考点。在场景到立方体UV的转换中，
 * 相机默认放置在原点，向各个方向渲染立方体贴图的六个面。
 */
const _origin = /*@__PURE__*/ new Vector3();

/**
 * 模糊材质到uniform字典的映射
 *
 * 使用WeakMap存储模糊材质与其对应的uniform变量字典的映射关系。
 * WeakMap确保当材质被垃圾回收时，对应的uniform字典也会被清理，
 * 避免内存泄漏。
 */
const _uniformsMap = new WeakMap();

/**
 * WebGPU面索引库
 *
 * 定义立方体贴图面的索引顺序，用于WebGPU渲染后端。
 * 这个数组定义了立方体贴图六个面的渲染顺序：
 * - 3: +Z面 (前)
 * - 1: +Y面 (上)
 * - 5: -Z面 (后)
 * - 0: +X面 (右)
 * - 4: -Y面 (下)
 * - 2: -X面 (左)
 */
const _faceLib = [3, 1, 5, 0, 4, 2];

/**
 * 方向计算节点
 *
 * 基于UV坐标和面索引计算立方体贴图的方向向量。
 * 这个节点在着色器中用于将2D UV坐标转换为3D方向向量，
 * 用于立方体贴图的采样。
 */
const _direction = /*@__PURE__*/ getDirection(uv(), attribute("faceIndex")).normalize();

/**
 * 输出方向向量
 *
 * 将计算得到的方向向量转换为vec3格式，用于着色器中的
 * 立方体贴图采样和PMREM生成计算。
 */
const _outputDirection = /*@__PURE__*/ vec3(_direction.x, _direction.y, _direction.z);

/**
 * 预过滤、多级细节辐射环境贴图(PMREM)生成器
 *
 * 这个类从立方体环境纹理生成PMREM，允许基于材质粗糙度快速访问不同级别的模糊。
 * 它被打包成特殊的CubeUV格式，允许我们执行自定义插值，从而支持RGBE等非线性格式。
 *
 * 与传统的mipmap链不同，它只下降到LOD_MIN级别，然后在相同的LOD_MIN分辨率下
 * 创建额外的更加过滤的'mips'，与更高的粗糙度级别相关联。这样我们在限制采样
 * 计算的同时保持分辨率以平滑插值漫反射照明。
 *
 * 技术特点：
 * - 支持HDR和LDR输入格式
 * - 使用重要性采样和蒙特卡洛积分
 * - 基于物理的BRDF预计算
 * - 优化的CubeUV存储格式
 * - 支持实时材质粗糙度变化
 *
 * 参考论文: Fast, Accurate Image-Based Lighting:
 * {@link https://drive.google.com/file/d/15y8r_UpKlU9SvV4ILb0C3qCPecS8pvLz/view}
 */
class PMREMGenerator {
  /**
   * 构造新的PMREM生成器
   *
   * 初始化PMREM生成器的所有内部状态和资源。生成器需要一个渲染器实例
   * 来执行GPU计算和渲染操作。
   *
   * @param {Renderer} renderer - Three.js渲染器实例（WebGL或WebGPU）
   */
  constructor(renderer) {
    // 渲染器引用，用于执行所有GPU操作
    this._renderer = renderer;

    // 乒乓渲染目标，用于模糊计算的双缓冲
    this._pingPongRenderTarget = null;

    // PMREM参数
    this._lodMax = 0; // 最大LOD级别
    this._cubeSize = 0; // 立方体贴图尺寸
    this._lodPlanes = []; // LOD平面几何体数组
    this._sizeLods = []; // 各LOD级别的尺寸数组
    this._sigmas = []; // 各LOD级别的模糊参数数组
    this._lodMeshes = []; // LOD网格对象数组

    // 材质缓存
    this._blurMaterial = null; // 模糊材质
    this._cubemapMaterial = null; // 立方体贴图材质
    this._equirectMaterial = null; // 等距柱状投影材质
    this._backgroundBox = null; // 背景盒子（用于场景渲染）
  }

  /**
   * 检查渲染器是否已初始化
   *
   * 返回渲染器的初始化状态。某些操作（如着色器编译）需要渲染器
   * 完全初始化后才能执行。
   *
   * @return {boolean} 渲染器是否已初始化
   */
  get _hasInitialized() {
    return this._renderer.hasInitialized();
  }

  /**
   * 从提供的场景生成PMREM
   *
   * 如果网络带宽较低，这可能比使用图像更快。可选的sigma参数指定在PMREM生成之前
   * 应用于场景的模糊半径（弧度）。可选的近平面和远平面确保场景被完整渲染。
   *
   * 这个方法通过在指定位置放置立方体相机，向六个方向渲染场景来生成立方体贴图，
   * 然后将其转换为PMREM格式。
   *
   * @param {Scene} scene - 要捕获的场景
   * @param {number} [sigma=0] - 模糊半径（弧度）
   * @param {number} [near=0.1] - 近平面距离
   * @param {number} [far=100] - 远平面距离
   * @param {Object} [options={}] - 配置选项
   * @param {number} [options.size=256] - PMREM的纹理尺寸
   * @param {Vector3} [options.position=origin] - 渲染场景的内部立方体相机位置
   * @param {?RenderTarget} [options.renderTarget=null] - 要使用的渲染目标
   * @return {RenderTarget} 生成的PMREM渲染目标
   * @see {@link PMREMGenerator#fromSceneAsync}
   */
  fromScene(scene, sigma = 0, near = 0.1, far = 100, options = {}) {
    // 解构配置选项，设置默认值
    const { size = 256, position = _origin, renderTarget = null } = options;

    // 设置PMREM生成的尺寸参数
    this._setSize(size);

    // 检查渲染器是否已初始化
    if (this._hasInitialized === false) {
      console.warn("THREE.PMREMGenerator: .fromScene() called before the backend is initialized. Try using .fromSceneAsync() instead.");

      // 如果未初始化，分配渲染目标并使用异步方法
      const cubeUVRenderTarget = renderTarget || this._allocateTarget();
      options.renderTarget = cubeUVRenderTarget;
      this.fromSceneAsync(scene, sigma, near, far, options);
      return cubeUVRenderTarget;
    }

    // 保存当前渲染状态，以便后续恢复
    _oldTarget = this._renderer.getRenderTarget();
    _oldActiveCubeFace = this._renderer.getActiveCubeFace();
    _oldActiveMipmapLevel = this._renderer.getActiveMipmapLevel();

    // 创建或使用提供的渲染目标
    const cubeUVRenderTarget = renderTarget || this._allocateTarget();
    cubeUVRenderTarget.depthBuffer = true; // 启用深度缓冲区用于正确的深度测试

    // 初始化PMREM生成所需的资源（平面、材质等）
    this._init(cubeUVRenderTarget);

    // 将场景渲染到立方体UV格式
    this._sceneToCubeUV(scene, near, far, cubeUVRenderTarget, position);

    // 如果指定了模糊参数，应用初始模糊
    if (sigma > 0) {
      this._blur(cubeUVRenderTarget, 0, 0, sigma);
    }

    // 应用PMREM预过滤，生成不同粗糙度级别的mips
    this._applyPMREM(cubeUVRenderTarget);

    // 清理并恢复原始渲染状态
    this._cleanup(cubeUVRenderTarget);

    return cubeUVRenderTarget;
  }

  /**
   * 异步从提供的场景生成PMREM
   *
   * 如果网络带宽较低，这可能比使用图像更快。可选的sigma参数指定在PMREM生成之前
   * 应用于场景的模糊半径（弧度）。可选的近平面和远平面确保场景被完整渲染
   * （立方体相机放置在指定位置）。
   *
   * 这个异步版本会等待渲染器初始化完成，然后调用同步版本的fromScene方法。
   * 适用于渲染器尚未初始化的情况。
   *
   * @param {Scene} scene - 要捕获的场景
   * @param {number} [sigma=0] - 模糊半径（弧度）
   * @param {number} [near=0.1] - 近平面距离
   * @param {number} [far=100] - 远平面距离
   * @param {Object} [options={}] - 配置选项
   * @param {number} [options.size=256] - PMREM的纹理尺寸
   * @param {Vector3} [options.position=origin] - 渲染场景的内部立方体相机位置
   * @param {?RenderTarget} [options.renderTarget=null] - 要使用的渲染目标
   * @return {Promise<RenderTarget>} 当生成完成时解析为PMREM的Promise
   * @see {@link PMREMGenerator#fromScene}
   */
  async fromSceneAsync(scene, sigma = 0, near = 0.1, far = 100, options = {}) {
    // 如果渲染器未初始化，等待其初始化完成
    if (this._hasInitialized === false) await this._renderer.init();

    // 调用同步版本的fromScene方法
    return this.fromScene(scene, sigma, near, far, options);
  }

  /**
   * 从等距柱状投影纹理生成PMREM
   *
   * 可以处理LDR或HDR格式的等距柱状投影纹理。理想的输入图像尺寸是1k（1024 x 512），
   * 因为这与256 x 256立方体贴图输出最匹配。
   *
   * 等距柱状投影是一种常见的全景图像格式，将球面映射到矩形图像上。
   * 这个方法将其转换为立方体贴图格式，然后生成PMREM。
   *
   * @param {import('../../../textures/Texture.js').Texture} equirectangular - 要转换的等距柱状投影纹理
   * @param {?RenderTarget} [renderTarget=null] - 要使用的渲染目标
   * @return {RenderTarget} 生成的PMREM渲染目标
   * @see {@link PMREMGenerator#fromEquirectangularAsync}
   */
  fromEquirectangular(equirectangular, renderTarget = null) {
    if (this._hasInitialized === false) {
      console.warn("THREE.PMREMGenerator: .fromEquirectangular() called before the backend is initialized. Try using .fromEquirectangularAsync() instead.");

      this._setSizeFromTexture(equirectangular);

      const cubeUVRenderTarget = renderTarget || this._allocateTarget();

      this.fromEquirectangularAsync(equirectangular, cubeUVRenderTarget);

      return cubeUVRenderTarget;
    }

    return this._fromTexture(equirectangular, renderTarget);
  }

  /**
   * 异步从等距柱状投影纹理生成PMREM
   *
   * 可以处理LDR或HDR格式的等距柱状投影纹理。理想的输入图像尺寸是1k（1024 x 512），
   * 因为这与256 x 256立方体贴图输出最匹配。
   *
   * 这个异步版本会等待渲染器初始化完成，然后调用同步版本的fromEquirectangular方法。
   *
   * @param {import('../../../textures/Texture.js').Texture} equirectangular - 要转换的等距柱状投影纹理
   * @param {?RenderTarget} [renderTarget=null] - 要使用的渲染目标
   * @return {Promise<RenderTarget>} 生成的PMREM渲染目标的Promise
   * @see {@link PMREMGenerator#fromEquirectangular}
   */
  async fromEquirectangularAsync(equirectangular, renderTarget = null) {
    // 如果渲染器未初始化，等待其初始化完成
    if (this._hasInitialized === false) await this._renderer.init();

    // 调用同步版本的fromEquirectangular方法
    return this._fromTexture(equirectangular, renderTarget);
  }

  /**
   * 从立方体贴图纹理生成PMREM
   *
   * 可以处理LDR或HDR格式的立方体贴图纹理。理想的输入立方体尺寸是256 x 256，
   * 因为这与256 x 256立方体贴图输出最匹配。
   *
   * 立方体贴图已经是正确的格式，这个方法主要是应用预过滤来生成不同
   * 粗糙度级别的mips。
   *
   * @param {import('../../../textures/Texture.js').Texture} cubemap - 要转换的立方体贴图纹理
   * @param {?RenderTarget} [renderTarget=null] - 要使用的渲染目标
   * @return {RenderTarget} 生成的PMREM渲染目标
   * @see {@link PMREMGenerator#fromCubemapAsync}
   */
  fromCubemap(cubemap, renderTarget = null) {
    if (this._hasInitialized === false) {
      console.warn("THREE.PMREMGenerator: .fromCubemap() called before the backend is initialized. Try using .fromCubemapAsync() instead.");

      this._setSizeFromTexture(cubemap);

      const cubeUVRenderTarget = renderTarget || this._allocateTarget();

      this.fromCubemapAsync(cubemap, renderTarget);

      return cubeUVRenderTarget;
    }

    return this._fromTexture(cubemap, renderTarget);
  }

  /**
   * 异步从立方体贴图纹理生成PMREM
   *
   * 可以处理LDR或HDR格式的立方体贴图纹理。理想的输入立方体尺寸是256 x 256，
   * 与256 x 256立方体贴图输出匹配。
   *
   * 这个异步版本会等待渲染器初始化完成，然后调用同步版本的fromCubemap方法。
   *
   * @param {import('../../../textures/Texture.js').Texture} cubemap - 要转换的立方体贴图纹理
   * @param {?RenderTarget} [renderTarget=null] - 要使用的渲染目标
   * @return {Promise<RenderTarget>} 生成的PMREM渲染目标的Promise
   * @see {@link PMREMGenerator#fromCubemap}
   */
  async fromCubemapAsync(cubemap, renderTarget = null) {
    // 如果渲染器未初始化，等待其初始化完成
    if (this._hasInitialized === false) await this._renderer.init();

    // 调用同步版本的fromCubemap方法
    return this._fromTexture(cubemap, renderTarget);
  }

  /**
   * 预编译立方体贴图着色器
   *
   * 在纹理网络获取期间调用此方法可以获得更快的启动速度，增加并发性。
   * 预编译着色器可以避免在首次使用时的编译延迟。
   *
   * @returns {Promise} 编译完成的Promise
   */
  async compileCubemapShader() {
    if (this._cubemapMaterial === null) {
      // 创建立方体贴图材质
      this._cubemapMaterial = _getCubemapMaterial();
      // 异步编译材质的着色器
      await this._compileMaterial(this._cubemapMaterial);
    }
  }

  /**
   * 预编译等距柱状投影着色器
   *
   * 在纹理网络获取期间调用此方法可以获得更快的启动速度，增加并发性。
   * 预编译着色器可以避免在首次使用时的编译延迟。
   *
   * @returns {Promise} 编译完成的Promise
   */
  async compileEquirectangularShader() {
    if (this._equirectMaterial === null) {
      // 创建等距柱状投影材质
      this._equirectMaterial = _getEquirectMaterial();
      // 异步编译材质的着色器
      await this._compileMaterial(this._equirectMaterial);
    }
  }

  /**
   * 释放PMREM生成器的内部内存
   *
   * 注意PMREMGenerator是一个静态类，所以你不应该需要超过一个PMREMGenerator对象。
   * 如果你确实需要多个，在其中一个上调用dispose()会导致其他的也变得不可用。
   *
   * 这个方法清理所有分配的资源，包括渲染目标、材质、几何体等，
   * 在不再需要PMREM生成器时调用以避免内存泄漏。
   */
  dispose() {
    // 释放内部渲染资源（模糊材质、乒乓渲染目标、LOD平面等）
    this._dispose();

    // 释放立方体贴图材质
    if (this._cubemapMaterial !== null) this._cubemapMaterial.dispose();

    // 释放等距柱状投影材质
    if (this._equirectMaterial !== null) this._equirectMaterial.dispose();

    // 释放背景盒子的几何体和材质
    if (this._backgroundBox !== null) {
      this._backgroundBox.geometry.dispose();
      this._backgroundBox.material.dispose();
    }
  }

  // ===== 私有接口 =====

  /**
   * 从纹理设置PMREM尺寸
   *
   * 根据输入纹理的类型和尺寸自动确定PMREM的生成尺寸。
   * 不同类型的纹理有不同的尺寸计算方式。
   *
   * @param {import('../../../textures/Texture.js').Texture} texture - 输入纹理
   * @private
   */
  _setSizeFromTexture(texture) {
    if (texture.mapping === CubeReflectionMapping || texture.mapping === CubeRefractionMapping) {
      // 立方体贴图：使用立方体面的宽度
      this._setSize(texture.image.length === 0 ? 16 : texture.image[0].width || texture.image[0].image.width);
    } else {
      // 等距柱状投影：宽度除以4得到立方体面尺寸
      // 这是因为等距柱状投影的宽高比通常是2:1，而立方体展开后的宽高比是4:3
      this._setSize(texture.image.width / 4);
    }
  }

  /**
   * 设置PMREM生成的尺寸参数
   *
   * 根据给定的立方体尺寸计算最大LOD级别和实际使用的立方体尺寸。
   * 立方体尺寸会被调整为2的幂次，以便进行高效的mipmap生成。
   *
   * @param {number} cubeSize - 期望的立方体面尺寸
   * @private
   */
  _setSize(cubeSize) {
    // 计算最大LOD级别：log2(cubeSize)的向下取整
    this._lodMax = Math.floor(Math.log2(cubeSize));

    // 将立方体尺寸调整为2的幂次，确保mipmap生成的效率
    this._cubeSize = Math.pow(2, this._lodMax);
  }

  /**
   * 释放内部渲染资源
   *
   * 清理PMREM生成过程中创建的所有内部资源，包括模糊材质、
   * 乒乓渲染目标和LOD平面几何体。
   *
   * @private
   */
  _dispose() {
    // 释放模糊材质
    if (this._blurMaterial !== null) this._blurMaterial.dispose();

    // 释放乒乓渲染目标（用于模糊计算的双缓冲）
    if (this._pingPongRenderTarget !== null) this._pingPongRenderTarget.dispose();

    // 释放所有LOD级别的平面几何体
    for (let i = 0; i < this._lodPlanes.length; i++) {
      this._lodPlanes[i].dispose();
    }
  }

  /**
   * 清理并恢复渲染状态
   *
   * 在PMREM生成完成后，恢复渲染器的原始状态，包括渲染目标、
   * 活动立方体面、mipmap级别等。同时重置输出目标的状态。
   *
   * @param {RenderTarget} outputTarget - 输出渲染目标
   * @private
   */
  _cleanup(outputTarget) {
    // 恢复渲染器的原始渲染目标和状态
    this._renderer.setRenderTarget(_oldTarget, _oldActiveCubeFace, _oldActiveMipmapLevel);

    // 禁用输出目标的裁剪测试
    outputTarget.scissorTest = false;

    // 重置输出目标的视口为全尺寸
    _setViewport(outputTarget, 0, 0, outputTarget.width, outputTarget.height);
  }

  _fromTexture(texture, renderTarget) {
    this._setSizeFromTexture(texture);

    _oldTarget = this._renderer.getRenderTarget();
    _oldActiveCubeFace = this._renderer.getActiveCubeFace();
    _oldActiveMipmapLevel = this._renderer.getActiveMipmapLevel();

    const cubeUVRenderTarget = renderTarget || this._allocateTarget();
    this._init(cubeUVRenderTarget);
    this._textureToCubeUV(texture, cubeUVRenderTarget);
    this._applyPMREM(cubeUVRenderTarget);
    this._cleanup(cubeUVRenderTarget);

    return cubeUVRenderTarget;
  }

  _allocateTarget() {
    const width = 3 * Math.max(this._cubeSize, 16 * 7);
    const height = 4 * this._cubeSize;

    const cubeUVRenderTarget = _createRenderTarget(width, height);

    return cubeUVRenderTarget;
  }

  _init(renderTarget) {
    if (this._pingPongRenderTarget === null || this._pingPongRenderTarget.width !== renderTarget.width || this._pingPongRenderTarget.height !== renderTarget.height) {
      if (this._pingPongRenderTarget !== null) {
        this._dispose();
      }

      this._pingPongRenderTarget = _createRenderTarget(renderTarget.width, renderTarget.height);

      const { _lodMax } = this;
      ({ sizeLods: this._sizeLods, lodPlanes: this._lodPlanes, sigmas: this._sigmas, lodMeshes: this._lodMeshes } = _createPlanes(_lodMax));

      this._blurMaterial = _getBlurShader(_lodMax, renderTarget.width, renderTarget.height);
    }
  }

  async _compileMaterial(material) {
    const tmpMesh = new Mesh(this._lodPlanes[0], material);
    await this._renderer.compile(tmpMesh, _flatCamera);
  }

  _sceneToCubeUV(scene, near, far, cubeUVRenderTarget, position) {
    const cubeCamera = _cubeCamera;
    cubeCamera.near = near;
    cubeCamera.far = far;

    // px, py, pz, nx, ny, nz
    const upSign = [1, 1, 1, 1, -1, 1];
    const forwardSign = [1, -1, 1, -1, 1, -1];

    const renderer = this._renderer;

    const originalAutoClear = renderer.autoClear;

    renderer.getClearColor(_clearColor);

    renderer.autoClear = false;

    let backgroundBox = this._backgroundBox;

    if (backgroundBox === null) {
      const backgroundMaterial = new MeshBasicMaterial({
        name: "PMREM.Background",
        side: BackSide,
        depthWrite: false,
        depthTest: false,
      });

      backgroundBox = new Mesh(new BoxGeometry(), backgroundMaterial);
    }

    let useSolidColor = false;
    const background = scene.background;

    if (background) {
      if (background.isColor) {
        backgroundBox.material.color.copy(background);
        scene.background = null;
        useSolidColor = true;
      }
    } else {
      backgroundBox.material.color.copy(_clearColor);
      useSolidColor = true;
    }

    renderer.setRenderTarget(cubeUVRenderTarget);

    renderer.clear();

    if (useSolidColor) {
      renderer.render(backgroundBox, cubeCamera);
    }

    for (let i = 0; i < 6; i++) {
      const col = i % 3;

      if (col === 0) {
        cubeCamera.up.set(0, upSign[i], 0);
        cubeCamera.position.set(position.x, position.y, position.z);
        cubeCamera.lookAt(position.x + forwardSign[i], position.y, position.z);
      } else if (col === 1) {
        cubeCamera.up.set(0, 0, upSign[i]);
        cubeCamera.position.set(position.x, position.y, position.z);
        cubeCamera.lookAt(position.x, position.y + forwardSign[i], position.z);
      } else {
        cubeCamera.up.set(0, upSign[i], 0);
        cubeCamera.position.set(position.x, position.y, position.z);
        cubeCamera.lookAt(position.x, position.y, position.z + forwardSign[i]);
      }

      const size = this._cubeSize;

      _setViewport(cubeUVRenderTarget, col * size, i > 2 ? size : 0, size, size);

      renderer.render(scene, cubeCamera);
    }

    renderer.autoClear = originalAutoClear;
    scene.background = background;
  }

  _textureToCubeUV(texture, cubeUVRenderTarget) {
    const renderer = this._renderer;

    const isCubeTexture = texture.mapping === CubeReflectionMapping || texture.mapping === CubeRefractionMapping;

    if (isCubeTexture) {
      if (this._cubemapMaterial === null) {
        this._cubemapMaterial = _getCubemapMaterial(texture);
      }
    } else {
      if (this._equirectMaterial === null) {
        this._equirectMaterial = _getEquirectMaterial(texture);
      }
    }

    const material = isCubeTexture ? this._cubemapMaterial : this._equirectMaterial;
    material.fragmentNode.value = texture;

    const mesh = this._lodMeshes[0];
    mesh.material = material;

    const size = this._cubeSize;

    _setViewport(cubeUVRenderTarget, 0, 0, 3 * size, 2 * size);

    renderer.setRenderTarget(cubeUVRenderTarget);
    renderer.render(mesh, _flatCamera);
  }

  _applyPMREM(cubeUVRenderTarget) {
    const renderer = this._renderer;
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    const n = this._lodPlanes.length;

    for (let i = 1; i < n; i++) {
      const sigma = Math.sqrt(this._sigmas[i] * this._sigmas[i] - this._sigmas[i - 1] * this._sigmas[i - 1]);

      const poleAxis = _axisDirections[(n - i - 1) % _axisDirections.length];

      this._blur(cubeUVRenderTarget, i - 1, i, sigma, poleAxis);
    }

    renderer.autoClear = autoClear;
  }

  /**
   * This is a two-pass Gaussian blur for a cubemap. Normally this is done
   * vertically and horizontally, but this breaks down on a cube. Here we apply
   * the blur latitudinally (around the poles), and then longitudinally (towards
   * the poles) to approximate the orthogonally-separable blur. It is least
   * accurate at the poles, but still does a decent job.
   *
   * @private
   * @param {RenderTarget} cubeUVRenderTarget - The cubemap render target.
   * @param {number} lodIn - The input level-of-detail.
   * @param {number} lodOut - The output level-of-detail.
   * @param {number} sigma - The blur radius in radians.
   * @param {Vector3} [poleAxis] - The pole axis.
   */
  _blur(cubeUVRenderTarget, lodIn, lodOut, sigma, poleAxis) {
    const pingPongRenderTarget = this._pingPongRenderTarget;

    this._halfBlur(cubeUVRenderTarget, pingPongRenderTarget, lodIn, lodOut, sigma, "latitudinal", poleAxis);

    this._halfBlur(pingPongRenderTarget, cubeUVRenderTarget, lodOut, lodOut, sigma, "longitudinal", poleAxis);
  }

  _halfBlur(targetIn, targetOut, lodIn, lodOut, sigmaRadians, direction, poleAxis) {
    const renderer = this._renderer;
    const blurMaterial = this._blurMaterial;

    if (direction !== "latitudinal" && direction !== "longitudinal") {
      console.error("blur direction must be either latitudinal or longitudinal!");
    }

    // Number of standard deviations at which to cut off the discrete approximation.
    const STANDARD_DEVIATIONS = 3;

    const blurMesh = this._lodMeshes[lodOut];
    blurMesh.material = blurMaterial;

    const blurUniforms = _uniformsMap.get(blurMaterial);

    const pixels = this._sizeLods[lodIn] - 1;
    const radiansPerPixel = isFinite(sigmaRadians) ? Math.PI / (2 * pixels) : (2 * Math.PI) / (2 * MAX_SAMPLES - 1);
    const sigmaPixels = sigmaRadians / radiansPerPixel;
    const samples = isFinite(sigmaRadians) ? 1 + Math.floor(STANDARD_DEVIATIONS * sigmaPixels) : MAX_SAMPLES;

    if (samples > MAX_SAMPLES) {
      console.warn(`sigmaRadians, ${sigmaRadians}, is too large and will clip, as it requested ${samples} samples when the maximum is set to ${MAX_SAMPLES}`);
    }

    const weights = [];
    let sum = 0;

    for (let i = 0; i < MAX_SAMPLES; ++i) {
      const x = i / sigmaPixels;
      const weight = Math.exp((-x * x) / 2);
      weights.push(weight);

      if (i === 0) {
        sum += weight;
      } else if (i < samples) {
        sum += 2 * weight;
      }
    }

    for (let i = 0; i < weights.length; i++) {
      weights[i] = weights[i] / sum;
    }

    targetIn.texture.frame = (targetIn.texture.frame || 0) + 1;

    blurUniforms.envMap.value = targetIn.texture;
    blurUniforms.samples.value = samples;
    blurUniforms.weights.array = weights;
    blurUniforms.latitudinal.value = direction === "latitudinal" ? 1 : 0;

    if (poleAxis) {
      blurUniforms.poleAxis.value = poleAxis;
    }

    const { _lodMax } = this;
    blurUniforms.dTheta.value = radiansPerPixel;
    blurUniforms.mipInt.value = _lodMax - lodIn;

    const outputSize = this._sizeLods[lodOut];
    const x = 3 * outputSize * (lodOut > _lodMax - LOD_MIN ? lodOut - _lodMax + LOD_MIN : 0);
    const y = 4 * (this._cubeSize - outputSize);

    _setViewport(targetOut, x, y, 3 * outputSize, 2 * outputSize);
    renderer.setRenderTarget(targetOut);
    renderer.render(blurMesh, _flatCamera);
  }
}

function _createPlanes(lodMax) {
  const lodPlanes = [];
  const sizeLods = [];
  const sigmas = [];
  const lodMeshes = [];

  let lod = lodMax;

  const totalLods = lodMax - LOD_MIN + 1 + EXTRA_LOD_SIGMA.length;

  for (let i = 0; i < totalLods; i++) {
    const sizeLod = Math.pow(2, lod);
    sizeLods.push(sizeLod);
    let sigma = 1.0 / sizeLod;

    if (i > lodMax - LOD_MIN) {
      sigma = EXTRA_LOD_SIGMA[i - lodMax + LOD_MIN - 1];
    } else if (i === 0) {
      sigma = 0;
    }

    sigmas.push(sigma);

    const texelSize = 1.0 / (sizeLod - 2);
    const min = -texelSize;
    const max = 1 + texelSize;
    const uv1 = [min, min, max, min, max, max, min, min, max, max, min, max];

    const cubeFaces = 6;
    const vertices = 6;
    const positionSize = 3;
    const uvSize = 2;
    const faceIndexSize = 1;

    const position = new Float32Array(positionSize * vertices * cubeFaces);
    const uv = new Float32Array(uvSize * vertices * cubeFaces);
    const faceIndex = new Float32Array(faceIndexSize * vertices * cubeFaces);

    for (let face = 0; face < cubeFaces; face++) {
      const x = ((face % 3) * 2) / 3 - 1;
      const y = face > 2 ? 0 : -1;
      const coordinates = [x, y, 0, x + 2 / 3, y, 0, x + 2 / 3, y + 1, 0, x, y, 0, x + 2 / 3, y + 1, 0, x, y + 1, 0];

      const faceIdx = _faceLib[face];
      position.set(coordinates, positionSize * vertices * faceIdx);
      uv.set(uv1, uvSize * vertices * faceIdx);
      const fill = [faceIdx, faceIdx, faceIdx, faceIdx, faceIdx, faceIdx];
      faceIndex.set(fill, faceIndexSize * vertices * faceIdx);
    }

    const planes = new BufferGeometry();
    planes.setAttribute("position", new BufferAttribute(position, positionSize));
    planes.setAttribute("uv", new BufferAttribute(uv, uvSize));
    planes.setAttribute("faceIndex", new BufferAttribute(faceIndex, faceIndexSize));
    lodPlanes.push(planes);
    lodMeshes.push(new Mesh(planes, null));

    if (lod > LOD_MIN) {
      lod--;
    }
  }

  return { lodPlanes, sizeLods, sigmas, lodMeshes };
}

function _createRenderTarget(width, height) {
  const params = {
    magFilter: LinearFilter,
    minFilter: LinearFilter,
    generateMipmaps: false,
    type: HalfFloatType,
    format: RGBAFormat,
    colorSpace: LinearSRGBColorSpace,
    //depthBuffer: false
  };

  const cubeUVRenderTarget = new RenderTarget(width, height, params);
  cubeUVRenderTarget.texture.mapping = CubeUVReflectionMapping;
  cubeUVRenderTarget.texture.name = "PMREM.cubeUv";
  cubeUVRenderTarget.texture.isPMREMTexture = true;
  cubeUVRenderTarget.scissorTest = true;
  return cubeUVRenderTarget;
}

/**
 * 设置渲染目标的视口和裁剪区域
 *
 * 同时设置渲染目标的视口和裁剪区域为相同的矩形区域。
 * 这确保渲染只在指定区域内进行。
 *
 * @param {RenderTarget} target - 目标渲染目标
 * @param {number} x - 区域左上角X坐标
 * @param {number} y - 区域左上角Y坐标
 * @param {number} width - 区域宽度
 * @param {number} height - 区域高度
 */
function _setViewport(target, x, y, width, height) {
  target.viewport.set(x, y, width, height); // 设置视口
  target.scissor.set(x, y, width, height); // 设置裁剪区域
}

/**
 * 创建PMREM专用的基础材质
 *
 * 创建一个配置好的NodeMaterial，适用于PMREM生成过程。
 * 禁用深度测试和写入，使用无混合模式。
 *
 * @param {string} type - 材质类型标识符
 * @return {NodeMaterial} 配置好的节点材质
 */
function _getMaterial(type) {
  const material = new NodeMaterial();
  material.depthTest = false; // 禁用深度测试
  material.depthWrite = false; // 禁用深度写入
  material.blending = NoBlending; // 无混合模式
  material.name = `PMREM_${type}`; // 设置材质名称

  return material;
}

/**
 * 创建模糊着色器材质
 *
 * 生成用于PMREM模糊计算的着色器材质。这个着色器实现了基于重要性采样的
 * 环境贴图模糊，支持纬度和经度两种模糊模式。
 *
 * @param {number} lodMax - 最大LOD级别
 * @param {number} width - 立方体UV纹理宽度
 * @param {number} height - 立方体UV纹理高度
 * @return {NodeMaterial} 配置好的模糊材质
 */
function _getBlurShader(lodMax, width, height) {
  // 采样权重数组，用于加权平均
  const weights = uniformArray(new Array(MAX_SAMPLES).fill(0));

  // 极轴方向，用于纬度模糊
  const poleAxis = uniform(new Vector3(0, 1, 0));

  // 角度增量，控制采样分布
  const dTheta = uniform(0);

  // 最大采样数
  const n = float(MAX_SAMPLES);

  // 是否为纬度模糊（false为经度模糊）
  const latitudinal = uniform(0); // false, bool

  // 实际使用的采样数
  const samples = uniform(1); // int

  // 环境贴图纹理
  const envMap = texture(null);

  // 当前mip级别
  const mipInt = uniform(0); // int

  // 立方体UV纹理的texel尺寸
  const CUBEUV_TEXEL_WIDTH = float(1 / width);
  const CUBEUV_TEXEL_HEIGHT = float(1 / height);
  const CUBEUV_MAX_MIP = float(lodMax);

  // 组装所有uniform变量
  const materialUniforms = {
    n,
    latitudinal,
    weights,
    poleAxis,
    outputDirection: _outputDirection,
    dTheta,
    samples,
    envMap,
    mipInt,
    CUBEUV_TEXEL_WIDTH,
    CUBEUV_TEXEL_HEIGHT,
    CUBEUV_MAX_MIP,
  };

  // 创建模糊材质并设置片段着色器节点
  const material = _getMaterial("blur");
  material.fragmentNode = blur({ ...materialUniforms, latitudinal: latitudinal.equal(1) });

  // 缓存uniform映射以便后续更新
  _uniformsMap.set(material, materialUniforms);

  return material;
}

/**
 * 创建立方体贴图材质
 *
 * 生成用于从立方体贴图采样的材质。这个材质直接从立方体贴图纹理
 * 根据输出方向进行采样。
 *
 * @param {import('../../../textures/Texture.js').Texture} envTexture - 环境立方体贴图纹理
 * @return {NodeMaterial} 配置好的立方体贴图材质
 */
function _getCubemapMaterial(envTexture) {
  const material = _getMaterial("cubemap");
  // 设置片段着色器：从立方体贴图按方向采样
  material.fragmentNode = cubeTexture(envTexture, _outputDirection);

  return material;
}

/**
 * 创建等距柱状投影材质
 *
 * 生成用于从等距柱状投影纹理采样的材质。这个材质将3D方向向量
 * 转换为等距柱状投影的UV坐标进行采样。
 *
 * @param {import('../../../textures/Texture.js').Texture} envTexture - 环境等距柱状投影纹理
 * @return {NodeMaterial} 配置好的等距柱状投影材质
 */
function _getEquirectMaterial(envTexture) {
  const material = _getMaterial("equirect");
  // 设置片段着色器：将方向转换为等距柱状投影UV坐标并采样
  material.fragmentNode = texture(envTexture, equirectUV(_outputDirection), 0);

  return material;
}

// 导出PMREM生成器类
export default PMREMGenerator;
