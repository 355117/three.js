// 导入渲染相关的常量
// 包括立方体映射类型、过滤器、色调映射、混合模式、纹理格式等
import {
  CubeReflectionMapping, // 立方体反射映射
  CubeRefractionMapping, // 立方体折射映射
  CubeUVReflectionMapping, // 立方体UV反射映射
  LinearFilter, // 线性过滤器
  NoToneMapping, // 无色调映射
  NoBlending, // 无混合模式
  RGBAFormat, // RGBA格式
  HalfFloatType, // 半精度浮点类型
  BackSide, // 背面渲染
  LinearSRGBColorSpace, // 线性sRGB颜色空间
} from "../constants.js";

// 导入核心几何和渲染组件
import { BufferAttribute } from "../core/BufferAttribute.js"; // 缓冲区属性
import { BufferGeometry } from "../core/BufferGeometry.js"; // 缓冲区几何体
import { Mesh } from "../objects/Mesh.js"; // 网格对象
import { OrthographicCamera } from "../cameras/OrthographicCamera.js"; // 正交相机
import { PerspectiveCamera } from "../cameras/PerspectiveCamera.js"; // 透视相机
import { ShaderMaterial } from "../materials/ShaderMaterial.js"; // 着色器材质
import { Vector3 } from "../math/Vector3.js"; // 三维向量
import { Color } from "../math/Color.js"; // 颜色对象
import { WebGLRenderTarget } from "../renderers/WebGLRenderTarget.js"; // WebGL渲染目标
import { MeshBasicMaterial } from "../materials/MeshBasicMaterial.js"; // 基础网格材质
import { BoxGeometry } from "../geometries/BoxGeometry.js"; // 立方体几何体

// 最小细节层级（LOD）常量，用于控制mipmap的最小级别
const LOD_MIN = 4;

// 与额外mip级别相关的标准偏差（弧度）数组
// 这些值被选择来近似Trowbridge-Reitz分布函数乘以几何阴影函数
// 这些sigma值的平方必须与cube_uv_reflection_fragment.glsl.js中的方差定义匹配
const EXTRA_LOD_SIGMA = [0.125, 0.215, 0.35, 0.446, 0.526, 0.582];

// 模糊循环的最大长度。较小的sigma值将使用更少的采样并提前退出，
// 但不会重新编译着色器
const MAX_SAMPLES = 20;

// 用于渲染的平面正交相机（纯函数标记，避免副作用）
const _flatCamera = /*@__PURE__*/ new OrthographicCamera();
// 清除颜色对象（纯函数标记）
const _clearColor = /*@__PURE__*/ new Color();
// 保存旧的渲染目标状态
let _oldTarget = null; // 旧的渲染目标
let _oldActiveCubeFace = 0; // 旧的活动立方体面索引
let _oldActiveMipmapLevel = 0; // 旧的活动mipmap级别
let _oldXrEnabled = false; // 旧的XR启用状态

// 黄金比例常量（φ = (1 + √5) / 2）
const PHI = (1 + Math.sqrt(5)) / 2;
// 黄金比例的倒数（1/φ）
const INV_PHI = 1 / PHI;

// 十二面体的顶点（除了相对的顶点，它们代表相同的轴）
// 用作在球面上均匀分布的轴方向
const _axisDirections = [
  /*@__PURE__*/ new Vector3(-PHI, INV_PHI, 0), // 轴方向1：(-φ, 1/φ, 0)
  /*@__PURE__*/ new Vector3(PHI, INV_PHI, 0), // 轴方向2：(φ, 1/φ, 0)
  /*@__PURE__*/ new Vector3(-INV_PHI, 0, PHI), // 轴方向3：(-1/φ, 0, φ)
  /*@__PURE__*/ new Vector3(INV_PHI, 0, PHI), // 轴方向4：(1/φ, 0, φ)
  /*@__PURE__*/ new Vector3(0, PHI, -INV_PHI), // 轴方向5：(0, φ, -1/φ)
  /*@__PURE__*/ new Vector3(0, PHI, INV_PHI), // 轴方向6：(0, φ, 1/φ)
  /*@__PURE__*/ new Vector3(-1, 1, -1), // 轴方向7：(-1, 1, -1)
  /*@__PURE__*/ new Vector3(1, 1, -1), // 轴方向8：(1, 1, -1)
  /*@__PURE__*/ new Vector3(-1, 1, 1), // 轴方向9：(-1, 1, 1)
  /*@__PURE__*/ new Vector3(1, 1, 1), // 轴方向10：(1, 1, 1)
];

// 原点向量，用作默认位置参考
const _origin = /*@__PURE__*/ new Vector3();

/**
 * 这个类从立方体贴图环境纹理生成预过滤的、多级细节的辐射环境贴图（PMREM）。
 * 这允许根据材质粗糙度快速访问不同级别的模糊效果。它被打包成特殊的CubeUV格式，
 * 允许我们执行自定义插值，从而支持RGBE等非线性格式。与传统的mipmap链不同，
 * 它只下降到LOD_MIN级别（如上所述），然后在相同的LOD_MIN分辨率下创建额外的
 * 更加过滤的'mips'，与更高的粗糙度级别相关联。通过这种方式，我们在限制采样
 * 计算的同时保持分辨率以平滑插值漫反射照明。
 *
 * 参考论文：Fast, Accurate Image-Based Lighting:
 * {@link https://drive.google.com/file/d/15y8r_UpKlU9SvV4ILb0C3qCPecS8pvLz/view}
 */
class PMREMGenerator {
  /**
   * 构造一个新的PMREM生成器。
   *
   * @param {WebGLRenderer} renderer - WebGL渲染器实例。
   */
  constructor(renderer) {
    this._renderer = renderer; // 存储渲染器引用
    this._pingPongRenderTarget = null; // 乒乓渲染目标，用于模糊处理

    this._lodMax = 0; // 最大LOD级别
    this._cubeSize = 0; // 立方体贴图尺寸
    this._lodPlanes = []; // LOD平面几何体数组
    this._sizeLods = []; // 各LOD级别的尺寸数组
    this._sigmas = []; // 各LOD级别的sigma值数组

    this._blurMaterial = null; // 模糊着色器材质
    this._cubemapMaterial = null; // 立方体贴图着色器材质
    this._equirectMaterial = null; // 等距柱状投影着色器材质

    this._compileMaterial(this._blurMaterial); // 预编译模糊材质
  }

  /**
   * 从提供的场景生成PMREM，在网络带宽较低时这比使用图像更快。
   * 可选的sigma参数指定在PMREM生成之前应用于场景的模糊半径（弧度）。
   * 可选的近平面和远平面确保场景被完整渲染。
   *
   * @param {Scene} scene - 要捕获的场景。
   * @param {number} [sigma=0] - 模糊半径（弧度）。
   * @param {number} [near=0.1] - 近平面距离。
   * @param {number} [far=100] - 远平面距离。
   * @param {Object} [options={}] - 配置选项。
   * @param {number} [options.size=256] - PMREM的纹理尺寸。
   * @param {Vector3} [options.renderTarget=origin] - 渲染场景的内部立方体相机位置。
   * @return {WebGLRenderTarget} 生成的PMREM渲染目标。
   */
  fromScene(scene, sigma = 0, near = 0.1, far = 100, options = {}) {
    const { size = 256, position = _origin } = options; // 解构配置选项，设置默认值

    // 保存当前渲染器状态
    _oldTarget = this._renderer.getRenderTarget(); // 保存当前渲染目标
    _oldActiveCubeFace = this._renderer.getActiveCubeFace(); // 保存当前活动立方体面
    _oldActiveMipmapLevel = this._renderer.getActiveMipmapLevel(); // 保存当前mipmap级别
    _oldXrEnabled = this._renderer.xr.enabled; // 保存XR启用状态

    this._renderer.xr.enabled = false; // 禁用XR以避免干扰

    this._setSize(size); // 设置立方体贴图尺寸

    const cubeUVRenderTarget = this._allocateTargets(); // 分配渲染目标
    cubeUVRenderTarget.depthBuffer = true; // 启用深度缓冲

    this._sceneToCubeUV(scene, near, far, cubeUVRenderTarget, position); // 将场景渲染到立方体UV

    if (sigma > 0) {
      this._blur(cubeUVRenderTarget, 0, 0, sigma); // 如果指定了模糊半径，应用模糊
    }

    this._applyPMREM(cubeUVRenderTarget); // 应用PMREM处理
    this._cleanup(cubeUVRenderTarget); // 清理并恢复状态

    return cubeUVRenderTarget; // 返回生成的PMREM
  }

  /**
   * 从等距柱状投影纹理生成PMREM，可以是LDR或HDR格式。
   * 理想的输入图像尺寸是1k（1024 x 512），因为这与256 x 256立方体贴图输出最匹配。
   *
   * @param {Texture} equirectangular - 要转换的等距柱状投影纹理。
   * @param {?WebGLRenderTarget} [renderTarget=null] - 要使用的渲染目标。
   * @return {WebGLRenderTarget} 生成的PMREM渲染目标。
   */
  fromEquirectangular(equirectangular, renderTarget = null) {
    return this._fromTexture(equirectangular, renderTarget); // 调用内部纹理转换方法
  }

  /**
   * 从立方体贴图纹理生成PMREM，可以是LDR或HDR格式。
   * 理想的输入立方体尺寸是256 x 256，因为这与256 x 256立方体贴图输出最匹配。
   *
   * @param {Texture} cubemap - 要转换的立方体贴图纹理。
   * @param {?WebGLRenderTarget} [renderTarget=null] - 要使用的渲染目标。
   * @return {WebGLRenderTarget} 生成的PMREM渲染目标。
   */
  fromCubemap(cubemap, renderTarget = null) {
    return this._fromTexture(cubemap, renderTarget); // 调用内部纹理转换方法
  }

  /**
   * 预编译立方体贴图着色器。在纹理网络获取期间调用此方法可以获得更快的启动速度，
   * 提高并发性。
   */
  compileCubemapShader() {
    if (this._cubemapMaterial === null) {
      // 如果立方体贴图材质尚未创建
      this._cubemapMaterial = _getCubemapMaterial(); // 创建立方体贴图材质
      this._compileMaterial(this._cubemapMaterial); // 编译材质
    }
  }

  /**
   * 预编译等距柱状投影着色器。在纹理网络获取期间调用此方法可以获得更快的启动速度，
   * 提高并发性。
   */
  compileEquirectangularShader() {
    if (this._equirectMaterial === null) {
      // 如果等距柱状投影材质尚未创建
      this._equirectMaterial = _getEquirectMaterial(); // 创建等距柱状投影材质
      this._compileMaterial(this._equirectMaterial); // 编译材质
    }
  }

  /**
   * 释放PMREMGenerator的内部内存。注意PMREMGenerator是一个静态类，
   * 所以你不应该需要超过一个PMREMGenerator对象。如果你这样做了，
   * 在其中一个上调用dispose()将导致其他任何对象也变得不可用。
   */
  dispose() {
    this._dispose(); // 调用内部释放方法

    if (this._cubemapMaterial !== null) this._cubemapMaterial.dispose(); // 释放立方体贴图材质
    if (this._equirectMaterial !== null) this._equirectMaterial.dispose(); // 释放等距柱状投影材质
  }

  // 私有接口方法

  /**
   * 设置立方体贴图的尺寸，计算最大LOD级别
   * @param {number} cubeSize - 立方体贴图的尺寸
   */
  _setSize(cubeSize) {
    this._lodMax = Math.floor(Math.log2(cubeSize)); // 计算最大LOD级别（以2为底的对数）
    this._cubeSize = Math.pow(2, this._lodMax); // 设置实际立方体尺寸为2的幂
  }

  /**
   * 释放内部资源，包括材质和渲染目标
   */
  _dispose() {
    if (this._blurMaterial !== null) this._blurMaterial.dispose(); // 释放模糊材质

    if (this._pingPongRenderTarget !== null) this._pingPongRenderTarget.dispose(); // 释放乒乓渲染目标

    for (let i = 0; i < this._lodPlanes.length; i++) {
      // 遍历所有LOD平面
      this._lodPlanes[i].dispose(); // 释放每个LOD平面几何体
    }
  }

  /**
   * 清理渲染状态，恢复之前保存的渲染器设置
   * @param {WebGLRenderTarget} outputTarget - 输出渲染目标
   */
  _cleanup(outputTarget) {
    this._renderer.setRenderTarget(_oldTarget, _oldActiveCubeFace, _oldActiveMipmapLevel); // 恢复渲染目标设置
    this._renderer.xr.enabled = _oldXrEnabled; // 恢复XR启用状态

    outputTarget.scissorTest = false; // 禁用剪裁测试
    _setViewport(outputTarget, 0, 0, outputTarget.width, outputTarget.height); // 设置完整视口
  }

  /**
   * 从纹理生成PMREM的内部方法
   * @param {Texture} texture - 源纹理（立方体贴图或等距柱状投影）
   * @param {WebGLRenderTarget} renderTarget - 可选的渲染目标
   * @returns {WebGLRenderTarget} 生成的PMREM渲染目标
   */
  _fromTexture(texture, renderTarget) {
    if (texture.mapping === CubeReflectionMapping || texture.mapping === CubeRefractionMapping) {
      // 立方体贴图：根据图像数组确定尺寸
      this._setSize(texture.image.length === 0 ? 16 : texture.image[0].width || texture.image[0].image.width);
    } else {
      // 等距柱状投影：宽度除以4作为立方体尺寸

      this._setSize(texture.image.width / 4);
    }

    // 保存当前渲染器状态
    _oldTarget = this._renderer.getRenderTarget(); // 保存当前渲染目标
    _oldActiveCubeFace = this._renderer.getActiveCubeFace(); // 保存当前活动立方体面
    _oldActiveMipmapLevel = this._renderer.getActiveMipmapLevel(); // 保存当前mipmap级别
    _oldXrEnabled = this._renderer.xr.enabled; // 保存XR启用状态

    this._renderer.xr.enabled = false; // 禁用XR

    const cubeUVRenderTarget = renderTarget || this._allocateTargets(); // 使用提供的目标或分配新目标
    this._textureToCubeUV(texture, cubeUVRenderTarget); // 将纹理转换为立方体UV格式
    this._applyPMREM(cubeUVRenderTarget); // 应用PMREM处理
    this._cleanup(cubeUVRenderTarget); // 清理并恢复状态

    return cubeUVRenderTarget; // 返回生成的PMREM
  }

  /**
   * 分配渲染目标，包括主要的CubeUV渲染目标和乒乓渲染目标
   * @returns {WebGLRenderTarget} 分配的CubeUV渲染目标
   */
  _allocateTargets() {
    // 计算渲染目标的宽度：3倍的立方体尺寸或最小值112（16*7）
    const width = 3 * Math.max(this._cubeSize, 16 * 7);
    // 计算渲染目标的高度：4倍的立方体尺寸
    const height = 4 * this._cubeSize;

    // 渲染目标参数配置
    const params = {
      magFilter: LinearFilter, // 放大过滤器：线性过滤
      minFilter: LinearFilter, // 缩小过滤器：线性过滤
      generateMipmaps: false, // 不生成mipmap（我们手动管理）
      type: HalfFloatType, // 使用半精度浮点类型以支持HDR
      format: RGBAFormat, // RGBA格式
      colorSpace: LinearSRGBColorSpace, // 线性sRGB颜色空间
      depthBuffer: false, // 不需要深度缓冲
    };

    // 创建主要的CubeUV渲染目标
    const cubeUVRenderTarget = _createRenderTarget(width, height, params);

    // 检查是否需要重新创建乒乓渲染目标（用于模糊处理）
    if (this._pingPongRenderTarget === null || this._pingPongRenderTarget.width !== width || this._pingPongRenderTarget.height !== height) {
      // 如果已存在乒乓渲染目标，先释放资源
      if (this._pingPongRenderTarget !== null) {
        this._dispose();
      }

      // 创建新的乒乓渲染目标
      this._pingPongRenderTarget = _createRenderTarget(width, height, params);

      // 获取最大LOD级别
      const { _lodMax } = this;
      // 创建LOD平面、尺寸数组和sigma值数组
      ({ sizeLods: this._sizeLods, lodPlanes: this._lodPlanes, sigmas: this._sigmas } = _createPlanes(_lodMax));

      // 创建模糊着色器材质
      this._blurMaterial = _getBlurShader(_lodMax, width, height);
    }

    return cubeUVRenderTarget;
  }

  /**
   * 预编译材质以提高渲染性能
   * @param {ShaderMaterial} material - 要编译的着色器材质
   */
  _compileMaterial(material) {
    // 创建临时网格对象用于编译材质
    const tmpMesh = new Mesh(this._lodPlanes[0], material);
    // 使用渲染器编译材质，提前准备GPU程序
    this._renderer.compile(tmpMesh, _flatCamera);
  }

  /**
   * 将3D场景渲染到立方体UV格式的渲染目标
   * @param {Scene} scene - 要渲染的场景
   * @param {number} near - 近平面距离
   * @param {number} far - 远平面距离
   * @param {WebGLRenderTarget} cubeUVRenderTarget - 目标渲染目标
   * @param {Vector3} position - 立方体相机的位置
   */
  _sceneToCubeUV(scene, near, far, cubeUVRenderTarget, position) {
    const fov = 90; // 视野角度：90度（立方体面的标准视角）
    const aspect = 1; // 宽高比：1:1（正方形）
    // 创建透视相机用于渲染立方体的每个面
    const cubeCamera = new PerspectiveCamera(fov, aspect, near, far);
    // 立方体6个面的上方向符号数组
    const upSign = [1, -1, 1, 1, 1, 1];
    // 立方体6个面的前方向符号数组
    const forwardSign = [1, 1, 1, -1, -1, -1];
    const renderer = this._renderer;

    // 保存渲染器的原始设置
    const originalAutoClear = renderer.autoClear; // 保存自动清除设置
    const toneMapping = renderer.toneMapping; // 保存色调映射设置
    renderer.getClearColor(_clearColor); // 获取当前清除颜色

    // 临时修改渲染器设置以适应PMREM生成
    renderer.toneMapping = NoToneMapping; // 禁用色调映射
    renderer.autoClear = false; // 禁用自动清除

    // 处理反向深度缓冲的特殊情况
    // 参考：https://github.com/mrdoob/three.js/issues/31413#issuecomment-3095966812
    const reversedDepthBuffer = renderer.state.buffers.depth.getReversed();

    if (reversedDepthBuffer) {
      // 如果使用反向深度缓冲，需要先清除深度
      renderer.setRenderTarget(cubeUVRenderTarget);
      renderer.clearDepth(); // 清除深度缓冲
      renderer.setRenderTarget(null);
    }

    // 创建背景材质，用于渲染场景背景
    const backgroundMaterial = new MeshBasicMaterial({
      name: "PMREM.Background", // 材质名称
      side: BackSide, // 渲染背面（从内部看）
      depthWrite: false, // 不写入深度
      depthTest: false, // 不进行深度测试
    });

    // 创建背景立方体网格
    const backgroundBox = new Mesh(new BoxGeometry(), backgroundMaterial);

    let useSolidColor = false; // 是否使用纯色背景
    const background = scene.background; // 获取场景背景

    // 处理场景背景设置
    if (background) {
      if (background.isColor) {
        // 如果背景是颜色对象，复制颜色到背景材质
        backgroundMaterial.color.copy(background);
        scene.background = null; // 临时移除场景背景
        useSolidColor = true; // 标记使用纯色
      }
    } else {
      // 如果没有背景，使用清除颜色
      backgroundMaterial.color.copy(_clearColor);
      useSolidColor = true; // 标记使用纯色
    }

    // 渲染立方体的6个面
    for (let i = 0; i < 6; i++) {
      const col = i % 3; // 计算列位置（0, 1, 2）

      // 根据面的索引设置相机方向
      if (col === 0) {
        // X轴面（正X和负X）
        cubeCamera.up.set(0, upSign[i], 0); // 设置上方向
        cubeCamera.position.set(position.x, position.y, position.z); // 设置相机位置
        cubeCamera.lookAt(position.x + forwardSign[i], position.y, position.z); // 设置观察方向
      } else if (col === 1) {
        // Y轴面（正Y和负Y）
        cubeCamera.up.set(0, 0, upSign[i]); // 设置上方向
        cubeCamera.position.set(position.x, position.y, position.z); // 设置相机位置
        cubeCamera.lookAt(position.x, position.y + forwardSign[i], position.z); // 设置观察方向
      } else {
        // Z轴面（正Z和负Z）
        cubeCamera.up.set(0, upSign[i], 0); // 设置上方向
        cubeCamera.position.set(position.x, position.y, position.z); // 设置相机位置
        cubeCamera.lookAt(position.x, position.y, position.z + forwardSign[i]); // 设置观察方向
      }

      const size = this._cubeSize; // 获取立方体尺寸

      // 设置当前面的视口区域
      _setViewport(cubeUVRenderTarget, col * size, i > 2 ? size : 0, size, size);

      // 设置渲染目标
      renderer.setRenderTarget(cubeUVRenderTarget);

      // 如果使用纯色背景，先渲染背景
      if (useSolidColor) {
        renderer.render(backgroundBox, cubeCamera);
      }

      // 渲染场景到当前立方体面
      renderer.render(scene, cubeCamera);
    }

    // 清理背景资源
    backgroundBox.geometry.dispose(); // 释放背景几何体
    backgroundBox.material.dispose(); // 释放背景材质

    // 恢复渲染器的原始设置
    renderer.toneMapping = toneMapping; // 恢复色调映射
    renderer.autoClear = originalAutoClear; // 恢复自动清除设置
    scene.background = background; // 恢复场景背景
  }

  /**
   * 将纹理（立方体贴图或等距柱状投影）转换为立方体UV格式
   * @param {Texture} texture - 源纹理
   * @param {WebGLRenderTarget} cubeUVRenderTarget - 目标渲染目标
   */
  _textureToCubeUV(texture, cubeUVRenderTarget) {
    const renderer = this._renderer;

    // 检查是否为立方体纹理
    const isCubeTexture = texture.mapping === CubeReflectionMapping || texture.mapping === CubeRefractionMapping;

    if (isCubeTexture) {
      // 处理立方体贴图纹理
      if (this._cubemapMaterial === null) {
        // 如果立方体贴图材质不存在，创建它
        this._cubemapMaterial = _getCubemapMaterial();
      }

      // 设置环境贴图翻转参数：渲染目标纹理不需要翻转，普通纹理需要翻转
      this._cubemapMaterial.uniforms.flipEnvMap.value = texture.isRenderTargetTexture === false ? -1 : 1;
    } else {
      // 处理等距柱状投影纹理
      if (this._equirectMaterial === null) {
        // 如果等距柱状投影材质不存在，创建它
        this._equirectMaterial = _getEquirectMaterial();
      }
    }

    // 根据纹理类型选择合适的材质
    const material = isCubeTexture ? this._cubemapMaterial : this._equirectMaterial;
    // 创建用于渲染的网格，使用第一个LOD平面
    const mesh = new Mesh(this._lodPlanes[0], material);

    // 获取材质的uniform变量
    const uniforms = material.uniforms;

    // 设置环境贴图纹理
    uniforms["envMap"].value = texture;

    const size = this._cubeSize; // 获取立方体尺寸

    // 设置视口为完整的立方体UV布局区域
    _setViewport(cubeUVRenderTarget, 0, 0, 3 * size, 2 * size);

    // 渲染纹理到立方体UV格式
    renderer.setRenderTarget(cubeUVRenderTarget);
    renderer.render(mesh, _flatCamera);
  }

  /**
   * 应用PMREM处理，为不同的粗糙度级别生成预过滤的环境贴图
   * @param {WebGLRenderTarget} cubeUVRenderTarget - 立方体UV渲染目标
   */
  _applyPMREM(cubeUVRenderTarget) {
    const renderer = this._renderer;
    const autoClear = renderer.autoClear; // 保存自动清除设置
    renderer.autoClear = false; // 禁用自动清除
    const n = this._lodPlanes.length; // 获取LOD级别数量

    // 为每个LOD级别应用模糊处理
    for (let i = 1; i < n; i++) {
      // 计算当前级别的sigma值（标准差）
      // 使用差分方法计算增量sigma，避免重复模糊
      const sigma = Math.sqrt(this._sigmas[i] * this._sigmas[i] - this._sigmas[i - 1] * this._sigmas[i - 1]);

      // 选择极轴方向，用于球面高斯模糊
      const poleAxis = _axisDirections[(n - i - 1) % _axisDirections.length];

      // 对当前LOD级别应用模糊处理
      this._blur(cubeUVRenderTarget, i - 1, i, sigma, poleAxis);
    }

    renderer.autoClear = autoClear; // 恢复自动清除设置
  }

  /**
   * 对立方体贴图执行两遍高斯模糊。通常这是垂直和水平进行的，但在立方体上会出现问题。
   * 这里我们先应用纬度模糊（围绕极点），然后应用经度模糊（朝向极点）来近似正交可分离模糊。
   * 在极点处精度最低，但仍能产生不错的效果。
   *
   * @private
   * @param {WebGLRenderTarget} cubeUVRenderTarget - 立方体UV渲染目标
   * @param {number} lodIn - 输入LOD级别
   * @param {number} lodOut - 输出LOD级别
   * @param {number} sigma - 模糊标准差
   * @param {Vector3} [poleAxis] - 极轴方向
   */
  _blur(cubeUVRenderTarget, lodIn, lodOut, sigma, poleAxis) {
    const pingPongRenderTarget = this._pingPongRenderTarget; // 获取乒乓渲染目标

    // 第一遍：纬度模糊（水平方向）
    this._halfBlur(cubeUVRenderTarget, pingPongRenderTarget, lodIn, lodOut, sigma, "latitudinal", poleAxis);

    // 第二遍：经度模糊（垂直方向）
    this._halfBlur(pingPongRenderTarget, cubeUVRenderTarget, lodOut, lodOut, sigma, "longitudinal", poleAxis);
  }

  /**
   * 执行单方向的模糊处理（纬度或经度）
   * @param {WebGLRenderTarget} targetIn - 输入渲染目标
   * @param {WebGLRenderTarget} targetOut - 输出渲染目标
   * @param {number} lodIn - 输入LOD级别
   * @param {number} lodOut - 输出LOD级别
   * @param {number} sigmaRadians - 模糊标准差（弧度）
   * @param {string} direction - 模糊方向："latitudinal"（纬度）或"longitudinal"（经度）
   * @param {Vector3} poleAxis - 极轴方向
   */
  _halfBlur(targetIn, targetOut, lodIn, lodOut, sigmaRadians, direction, poleAxis) {
    const renderer = this._renderer;
    const blurMaterial = this._blurMaterial; // 获取模糊材质

    // 验证模糊方向参数
    if (direction !== "latitudinal" && direction !== "longitudinal") {
      console.error("blur direction must be either latitudinal or longitudinal!");
    }

    // 截断离散近似的标准差数量
    const STANDARD_DEVIATIONS = 3;

    // 创建用于模糊的网格对象
    const blurMesh = new Mesh(this._lodPlanes[lodOut], blurMaterial);
    const blurUniforms = blurMaterial.uniforms; // 获取材质的uniform变量

    // 计算采样参数
    const pixels = this._sizeLods[lodIn] - 1; // 输入LOD的像素数量
    // 计算每像素对应的弧度数
    const radiansPerPixel = isFinite(sigmaRadians) ? Math.PI / (2 * pixels) : (2 * Math.PI) / (2 * MAX_SAMPLES - 1);
    const sigmaPixels = sigmaRadians / radiansPerPixel; // 将sigma转换为像素单位
    // 计算所需的采样数量
    const samples = isFinite(sigmaRadians) ? 1 + Math.floor(STANDARD_DEVIATIONS * sigmaPixels) : MAX_SAMPLES;

    // 检查采样数量是否超过最大限制
    if (samples > MAX_SAMPLES) {
      console.warn(`sigmaRadians, ${sigmaRadians}, is too large and will clip, as it requested ${samples} samples when the maximum is set to ${MAX_SAMPLES}`);
    }

    // 计算高斯模糊权重
    const weights = []; // 权重数组
    let sum = 0; // 权重总和，用于归一化

    // 生成高斯权重
    for (let i = 0; i < MAX_SAMPLES; ++i) {
      const x = i / sigmaPixels; // 标准化距离
      const weight = Math.exp((-x * x) / 2); // 高斯函数：e^(-x²/2)
      weights.push(weight);

      // 累加权重总和
      if (i === 0) {
        sum += weight; // 中心权重只计算一次
      } else if (i < samples) {
        sum += 2 * weight; // 对称权重计算两次
      }
    }

    // 归一化权重，确保总和为1
    for (let i = 0; i < weights.length; i++) {
      weights[i] = weights[i] / sum;
    }

    // 设置模糊着色器的uniform变量
    blurUniforms["envMap"].value = targetIn.texture; // 输入环境贴图
    blurUniforms["samples"].value = samples; // 采样数量
    blurUniforms["weights"].value = weights; // 高斯权重数组
    blurUniforms["latitudinal"].value = direction === "latitudinal"; // 是否为纬度模糊

    // 如果提供了极轴，设置极轴方向
    if (poleAxis) {
      blurUniforms["poleAxis"].value = poleAxis;
    }

    // 设置其他着色器参数
    const { _lodMax } = this;
    blurUniforms["dTheta"].value = radiansPerPixel; // 角度步长
    blurUniforms["mipInt"].value = _lodMax - lodIn; // mipmap级别差

    // 计算输出区域的位置和尺寸
    const outputSize = this._sizeLods[lodOut]; // 输出LOD的尺寸
    // 计算X坐标：考虑额外LOD级别的偏移
    const x = 3 * outputSize * (lodOut > _lodMax - LOD_MIN ? lodOut - _lodMax + LOD_MIN : 0);
    // 计算Y坐标：从底部开始布局
    const y = 4 * (this._cubeSize - outputSize);

    // 设置视口并渲染模糊结果
    _setViewport(targetOut, x, y, 3 * outputSize, 2 * outputSize);
    renderer.setRenderTarget(targetOut); // 设置输出渲染目标
    renderer.render(blurMesh, _flatCamera); // 渲染模糊网格
  }
}

/**
 * 创建用于不同LOD级别的平面几何体和相关参数
 * @param {number} lodMax - 最大LOD级别
 * @returns {Object} 包含lodPlanes、sizeLods和sigmas的对象
 */
function _createPlanes(lodMax) {
  const lodPlanes = []; // LOD平面几何体数组
  const sizeLods = []; // 各LOD级别的尺寸数组
  const sigmas = []; // 各LOD级别的sigma值数组

  let lod = lodMax; // 当前LOD级别

  // 计算总的LOD级别数：标准级别 + 额外级别
  const totalLods = lodMax - LOD_MIN + 1 + EXTRA_LOD_SIGMA.length;

  // 为每个LOD级别创建平面几何体
  for (let i = 0; i < totalLods; i++) {
    const sizeLod = Math.pow(2, lod); // 当前LOD的尺寸（2的幂）
    sizeLods.push(sizeLod);
    let sigma = 1.0 / sizeLod; // 默认sigma值

    // 为额外的LOD级别使用预定义的sigma值
    if (i > lodMax - LOD_MIN) {
      sigma = EXTRA_LOD_SIGMA[i - lodMax + LOD_MIN - 1];
    } else if (i === 0) {
      sigma = 0; // 第一级别不需要模糊
    }

    sigmas.push(sigma);

    // 计算纹理坐标参数
    const texelSize = 1.0 / (sizeLod - 2); // 纹素大小
    const min = -texelSize; // 最小UV坐标（稍微超出边界以避免边缘问题）
    const max = 1 + texelSize; // 最大UV坐标
    // 定义四边形的UV坐标（两个三角形）
    const uv1 = [min, min, max, min, max, max, min, min, max, max, min, max];

    // 几何体参数
    const cubeFaces = 6; // 立方体面数
    const vertices = 6; // 每个面的顶点数（两个三角形）
    const positionSize = 3; // 位置属性的组件数（x, y, z）
    const uvSize = 2; // UV属性的组件数（u, v）
    const faceIndexSize = 1; // 面索引属性的组件数

    // 创建属性数组
    const position = new Float32Array(positionSize * vertices * cubeFaces); // 位置数组
    const uv = new Float32Array(uvSize * vertices * cubeFaces); // UV坐标数组
    const faceIndex = new Float32Array(faceIndexSize * vertices * cubeFaces); // 面索引数组

    // 为每个立方体面生成几何数据
    for (let face = 0; face < cubeFaces; face++) {
      // 计算当前面在CubeUV布局中的位置
      const x = ((face % 3) * 2) / 3 - 1; // X坐标：-1, -1/3, 1/3
      const y = face > 2 ? 0 : -1; // Y坐标：前3个面在下方(-1)，后3个面在上方(0)
      // 定义四边形的6个顶点坐标（两个三角形）
      const coordinates = [x, y, 0, x + 2 / 3, y, 0, x + 2 / 3, y + 1, 0, x, y, 0, x + 2 / 3, y + 1, 0, x, y + 1, 0];
      // 设置位置数据
      position.set(coordinates, positionSize * vertices * face);
      // 设置UV坐标数据
      uv.set(uv1, uvSize * vertices * face);
      // 设置面索引数据（所有顶点都属于同一个面）
      const fill = [face, face, face, face, face, face];
      faceIndex.set(fill, faceIndexSize * vertices * face);
    }

    // 创建缓冲几何体并设置属性
    const planes = new BufferGeometry();
    planes.setAttribute("position", new BufferAttribute(position, positionSize)); // 位置属性
    planes.setAttribute("uv", new BufferAttribute(uv, uvSize)); // UV属性
    planes.setAttribute("faceIndex", new BufferAttribute(faceIndex, faceIndexSize)); // 面索引属性
    lodPlanes.push(planes); // 添加到LOD平面数组

    // 递减LOD级别（但不低于最小值）
    if (lod > LOD_MIN) {
      lod--;
    }
  }

  return { lodPlanes, sizeLods, sigmas }; // 返回创建的数据
}

/**
 * 创建用于PMREM的WebGL渲染目标
 * @param {number} width - 渲染目标宽度
 * @param {number} height - 渲染目标高度
 * @param {Object} params - 渲染目标参数
 * @returns {WebGLRenderTarget} 配置好的渲染目标
 */
function _createRenderTarget(width, height, params) {
  const cubeUVRenderTarget = new WebGLRenderTarget(width, height, params);
  cubeUVRenderTarget.texture.mapping = CubeUVReflectionMapping; // 设置为CubeUV反射映射
  cubeUVRenderTarget.texture.name = "PMREM.cubeUv"; // 设置纹理名称
  cubeUVRenderTarget.scissorTest = true; // 启用剪裁测试
  return cubeUVRenderTarget;
}

/**
 * 设置渲染目标的视口和剪裁区域
 * @param {WebGLRenderTarget} target - 目标渲染目标
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 * @param {number} width - 宽度
 * @param {number} height - 高度
 */
function _setViewport(target, x, y, width, height) {
  target.viewport.set(x, y, width, height); // 设置视口
  target.scissor.set(x, y, width, height); // 设置剪裁区域
}

/**
 * 创建球面高斯模糊着色器材质
 * @param {number} lodMax - 最大LOD级别
 * @param {number} width - 渲染目标宽度
 * @param {number} height - 渲染目标高度
 * @returns {ShaderMaterial} 模糊着色器材质
 */
function _getBlurShader(lodMax, width, height) {
  const weights = new Float32Array(MAX_SAMPLES); // 高斯权重数组
  const poleAxis = new Vector3(0, 1, 0); // 默认极轴方向（Y轴）
  const shaderMaterial = new ShaderMaterial({
    name: "SphericalGaussianBlur", // 着色器名称

    // 着色器预处理器定义
    defines: {
      n: MAX_SAMPLES, // 最大采样数
      CUBEUV_TEXEL_WIDTH: 1.0 / width, // 纹素宽度
      CUBEUV_TEXEL_HEIGHT: 1.0 / height, // 纹素高度
      CUBEUV_MAX_MIP: `${lodMax}.0`, // 最大mipmap级别
    },

    // 着色器uniform变量
    uniforms: {
      envMap: { value: null }, // 环境贴图
      samples: { value: 1 }, // 采样数量
      weights: { value: weights }, // 高斯权重
      latitudinal: { value: false }, // 是否为纬度模糊
      dTheta: { value: 0 }, // 角度步长
      mipInt: { value: 0 }, // mipmap级别
      poleAxis: { value: poleAxis }, // 极轴方向
    },

    vertexShader: _getCommonVertexShader(), // 顶点着色器

    fragmentShader: /* glsl */ `

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,

    blending: NoBlending, // 无混合模式
    depthTest: false, // 禁用深度测试
    depthWrite: false, // 禁用深度写入
  });

  return shaderMaterial;
}

/**
 * 创建等距柱状投影到立方体UV的着色器材质
 * @returns {ShaderMaterial} 等距柱状投影着色器材质
 */
function _getEquirectMaterial() {
  return new ShaderMaterial({
    name: "EquirectangularToCubeUV", // 着色器名称

    // 着色器uniform变量
    uniforms: {
      envMap: { value: null }, // 等距柱状投影环境贴图
    },

    vertexShader: _getCommonVertexShader(), // 通用顶点着色器

    fragmentShader: /* glsl */ `

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,

    blending: NoBlending, // 无混合模式
    depthTest: false, // 禁用深度测试
    depthWrite: false, // 禁用深度写入
  });
}

/**
 * 创建立方体贴图到立方体UV的着色器材质
 * @returns {ShaderMaterial} 立方体贴图着色器材质
 */
function _getCubemapMaterial() {
  return new ShaderMaterial({
    name: "CubemapToCubeUV", // 着色器名称

    // 着色器uniform变量
    uniforms: {
      envMap: { value: null }, // 立方体贴图环境贴图
      flipEnvMap: { value: -1 }, // 环境贴图翻转标志
    },

    vertexShader: _getCommonVertexShader(), // 通用顶点着色器

    fragmentShader: /* glsl */ `

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,

    blending: NoBlending, // 无混合模式
    depthTest: false, // 禁用深度测试
    depthWrite: false, // 禁用深度写入
  });
}

/**
 * 获取通用的顶点着色器代码
 * @returns {string} 顶点着色器GLSL代码
 */
function _getCommonVertexShader() {
  return /* glsl */ `

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// 右手坐标系；PMREM面索引约定
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`;
}

export { PMREMGenerator };
