/**
 * 导入渲染相关常量
 */
import {
  BackSide,
  DoubleSide,
  CubeUVReflectionMapping,
  ObjectSpaceNormalMap,
  TangentSpaceNormalMap,
  NoToneMapping,
  NormalBlending,
  LinearSRGBColorSpace,
  SRGBTransfer,
} from "../../constants.js";
/**
 * 导入层级管理类，用于程序缓存键生成
 */
import { Layers } from "../../core/Layers.js";
/**
 * 导入 WebGL 程序类
 */
import { WebGLProgram } from "./WebGLProgram.js";
/**
 * 导入 WebGL 着色器缓存管理器
 */
import { WebGLShaderCache } from "./WebGLShaderCache.js";
/**
 * 导入着色器库，包含内置着色器
 */
import { ShaderLib } from "../shaders/ShaderLib.js";
/**
 * 导入 uniform 工具类
 */
import { UniformsUtils } from "../shaders/UniformsUtils.js";
/**
 * 导入颜色管理类
 */
import { ColorManagement } from "../../math/ColorManagement.js";

/**
 * WebGL 程序管理器
 * 负责管理 WebGL 着色器程序的创建、缓存和生命周期
 * 根据材质、几何体、光照等条件生成合适的着色器程序
 *
 * @param {WebGLRenderer} renderer - WebGL 渲染器
 * @param {WebGLCubeMaps} cubemaps - 立方体贴图管理器
 * @param {WebGLCubeUVMaps} cubeuvmaps - CubeUV 贴图管理器
 * @param {WebGLExtensions} extensions - WebGL 扩展管理器
 * @param {WebGLCapabilities} capabilities - WebGL 能力检测器
 * @param {WebGLBindingStates} bindingStates - WebGL 绑定状态管理器
 * @param {WebGLClipping} clipping - WebGL 裁剪管理器
 * @returns {Object} 返回程序管理器的公共接口
 */
function WebGLPrograms(renderer, cubemaps, cubeuvmaps, extensions, capabilities, bindingStates, clipping) {
  /**
   * 程序层级管理器，用于生成布尔参数的缓存键
   */
  const _programLayers = new Layers();
  /**
   * 自定义着色器缓存管理器
   */
  const _customShaders = new WebGLShaderCache();
  /**
   * 活跃的纹理通道集合，用于跟踪使用的 UV 通道
   */
  const _activeChannels = new Set();
  /**
   * 程序数组，存储所有已创建的 WebGL 程序
   */
  const programs = [];

  /**
   * 是否支持对数深度缓冲区
   */
  const logarithmicDepthBuffer = capabilities.logarithmicDepthBuffer;
  /**
   * 是否支持顶点纹理
   */
  const SUPPORTS_VERTEX_TEXTURES = capabilities.vertexTextures;

  /**
   * 着色器精度设置
   */
  let precision = capabilities.precision;

  /**
   * 材质类型到着色器 ID 的映射表
   * 将 Three.js 材质类型映射到对应的内置着色器标识符
   */
  const shaderIDs = {
    MeshDepthMaterial: "depth", // 深度材质
    MeshDistanceMaterial: "distanceRGBA", // 距离材质
    MeshNormalMaterial: "normal", // 法线材质
    MeshBasicMaterial: "basic", // 基础材质
    MeshLambertMaterial: "lambert", // Lambert 材质
    MeshPhongMaterial: "phong", // Phong 材质
    MeshToonMaterial: "toon", // 卡通材质
    MeshStandardMaterial: "physical", // 标准材质（PBR）
    MeshPhysicalMaterial: "physical", // 物理材质（PBR）
    MeshMatcapMaterial: "matcap", // Matcap 材质
    LineBasicMaterial: "basic", // 线条基础材质
    LineDashedMaterial: "dashed", // 虚线材质
    PointsMaterial: "points", // 点材质
    ShadowMaterial: "shadow", // 阴影材质
    SpriteMaterial: "sprite", // 精灵材质
  };

  /**
   * 获取纹理通道名称
   * 根据通道索引生成对应的 UV 属性名称，并记录活跃通道
   *
   * @param {number} value - 纹理通道索引
   * @returns {string} 返回 UV 属性名称（如 'uv', 'uv1', 'uv2' 等）
   */
  function getChannel(value) {
    // 记录该通道为活跃状态
    _activeChannels.add(value);

    // 通道 0 使用默认的 'uv' 名称
    if (value === 0) return "uv";

    // 其他通道使用 'uv' + 索引的格式
    return `uv${value}`;
  }

  /**
   * 获取着色器程序参数
   * 根据材质、光照、阴影、场景和对象的属性，生成着色器编译所需的参数
   *
   * @param {Material} material - 材质对象
   * @param {Object} lights - 光照信息
   * @param {Array} shadows - 阴影数组
   * @param {Scene} scene - 场景对象
   * @param {Object3D} object - 3D 对象
   * @returns {Object} 返回着色器参数对象
   */
  function getParameters(material, lights, shadows, scene, object) {
    // 获取场景雾效
    const fog = scene.fog;
    // 获取对象几何体
    const geometry = object.geometry;
    // 获取环境贴图（仅标准材质使用场景环境）
    const environment = material.isMeshStandardMaterial ? scene.environment : null;

    // 根据材质类型选择合适的环境贴图管理器
    const envMap = (material.isMeshStandardMaterial ? cubeuvmaps : cubemaps).get(material.envMap || environment);
    // 获取 CubeUV 环境贴图的高度（用于 mipmap 计算）
    const envMapCubeUVHeight = !!envMap && envMap.mapping === CubeUVReflectionMapping ? envMap.image.height : null;

    // 获取材质对应的着色器 ID
    const shaderID = shaderIDs[material.type];

    // 根据场景中的光照创建着色器参数的启发式方法
    // （避免超出最大光照数量限制）
    // heuristics to create shader parameters according to lights in the scene
    // (not to blow over maxLights budget)

    // 处理材质精度设置
    if (material.precision !== null) {
      precision = capabilities.getMaxPrecision(material.precision);

      // 如果请求的精度不支持，发出警告并使用支持的精度
      if (precision !== material.precision) {
        console.warn("THREE.WebGLProgram.getParameters:", material.precision, "not supported, using", precision, "instead.");
      }
    }

    // 处理变形目标（Morph Targets）

    // 获取变形属性（位置、法线或颜色中的任意一个）
    const morphAttribute = geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color;
    // 计算变形目标数量
    const morphTargetsCount = morphAttribute !== undefined ? morphAttribute.length : 0;

    // 计算变形纹理步长（每个顶点在纹理中占用的数据类型数量）
    let morphTextureStride = 0;

    if (geometry.morphAttributes.position !== undefined) morphTextureStride = 1; // 仅位置
    if (geometry.morphAttributes.normal !== undefined) morphTextureStride = 2; // 位置 + 法线
    if (geometry.morphAttributes.color !== undefined) morphTextureStride = 3; // 位置 + 法线 + 颜色

    // 处理着色器代码

    let vertexShader, fragmentShader;
    let customVertexShaderID, customFragmentShaderID;

    if (shaderID) {
      // 使用内置着色器
      const shader = ShaderLib[shaderID];

      vertexShader = shader.vertexShader;
      fragmentShader = shader.fragmentShader;
    } else {
      // 使用自定义着色器
      vertexShader = material.vertexShader;
      fragmentShader = material.fragmentShader;

      // 更新自定义着色器缓存
      _customShaders.update(material);

      // 获取自定义着色器的缓存 ID
      customVertexShaderID = _customShaders.getVertexShaderID(material);
      customFragmentShaderID = _customShaders.getFragmentShaderID(material);
    }

    // 获取当前渲染目标和深度缓冲区状态
    const currentRenderTarget = renderer.getRenderTarget();
    const reversedDepthBuffer = renderer.state.buffers.depth.getReversed();

    // 检测对象类型
    const IS_INSTANCEDMESH = object.isInstancedMesh === true; // 是否为实例化网格
    const IS_BATCHEDMESH = object.isBatchedMesh === true; // 是否为批处理网格

    // 检测材质的基础纹理贴图
    const HAS_MAP = !!material.map; // 漫反射贴图
    const HAS_MATCAP = !!material.matcap; // Matcap 贴图
    const HAS_ENVMAP = !!envMap; // 环境贴图
    const HAS_AOMAP = !!material.aoMap; // 环境遮挡贴图
    const HAS_LIGHTMAP = !!material.lightMap; // 光照贴图
    const HAS_BUMPMAP = !!material.bumpMap; // 凹凸贴图
    const HAS_NORMALMAP = !!material.normalMap; // 法线贴图
    const HAS_DISPLACEMENTMAP = !!material.displacementMap; // 位移贴图
    const HAS_EMISSIVEMAP = !!material.emissiveMap; // 自发光贴图

    // 检测 PBR 材质的金属度和粗糙度贴图
    const HAS_METALNESSMAP = !!material.metalnessMap; // 金属度贴图
    const HAS_ROUGHNESSMAP = !!material.roughnessMap; // 粗糙度贴图

    // 检测高级材质特性（基于数值阈值）
    const HAS_ANISOTROPY = material.anisotropy > 0; // 各向异性
    const HAS_CLEARCOAT = material.clearcoat > 0; // 清漆层
    const HAS_DISPERSION = material.dispersion > 0; // 色散
    const HAS_IRIDESCENCE = material.iridescence > 0; // 彩虹色
    const HAS_SHEEN = material.sheen > 0; // 光泽
    const HAS_TRANSMISSION = material.transmission > 0; // 透射

    // 检测各向异性相关贴图
    const HAS_ANISOTROPYMAP = HAS_ANISOTROPY && !!material.anisotropyMap; // 各向异性贴图

    // 检测清漆层相关贴图
    const HAS_CLEARCOATMAP = HAS_CLEARCOAT && !!material.clearcoatMap; // 清漆贴图
    const HAS_CLEARCOAT_NORMALMAP = HAS_CLEARCOAT && !!material.clearcoatNormalMap; // 清漆法线贴图
    const HAS_CLEARCOAT_ROUGHNESSMAP = HAS_CLEARCOAT && !!material.clearcoatRoughnessMap; // 清漆粗糙度贴图

    // 检测彩虹色相关贴图
    const HAS_IRIDESCENCEMAP = HAS_IRIDESCENCE && !!material.iridescenceMap; // 彩虹色贴图
    const HAS_IRIDESCENCE_THICKNESSMAP = HAS_IRIDESCENCE && !!material.iridescenceThicknessMap; // 彩虹色厚度贴图

    // 检测光泽相关贴图
    const HAS_SHEEN_COLORMAP = HAS_SHEEN && !!material.sheenColorMap; // 光泽颜色贴图
    const HAS_SHEEN_ROUGHNESSMAP = HAS_SHEEN && !!material.sheenRoughnessMap; // 光泽粗糙度贴图

    // 检测镜面反射相关贴图
    const HAS_SPECULARMAP = !!material.specularMap; // 镜面反射贴图
    const HAS_SPECULAR_COLORMAP = !!material.specularColorMap; // 镜面反射颜色贴图
    const HAS_SPECULAR_INTENSITYMAP = !!material.specularIntensityMap; // 镜面反射强度贴图

    // 检测透射相关贴图
    const HAS_TRANSMISSIONMAP = HAS_TRANSMISSION && !!material.transmissionMap; // 透射贴图
    const HAS_THICKNESSMAP = HAS_TRANSMISSION && !!material.thicknessMap; // 厚度贴图

    // 检测其他特殊贴图
    const HAS_GRADIENTMAP = !!material.gradientMap; // 渐变贴图（用于卡通着色）

    const HAS_ALPHAMAP = !!material.alphaMap; // Alpha 贴图

    // 检测 Alpha 相关特性
    const HAS_ALPHATEST = material.alphaTest > 0; // Alpha 测试
    const HAS_ALPHAHASH = !!material.alphaHash; // Alpha 哈希（抖动透明）

    // 检测材质扩展
    const HAS_EXTENSIONS = !!material.extensions;

    // 确定色调映射类型
    let toneMapping = NoToneMapping;

    if (material.toneMapped) {
      // 只有在渲染到屏幕或 XR 设备时才应用色调映射
      if (currentRenderTarget === null || currentRenderTarget.isXRRenderTarget === true) {
        toneMapping = renderer.toneMapping;
      }
    }

    // 构建着色器参数对象
    const parameters = {
      // 着色器标识信息
      shaderID: shaderID, // 着色器 ID
      shaderType: material.type, // 材质类型
      shaderName: material.name, // 材质名称

      // 着色器代码
      vertexShader: vertexShader, // 顶点着色器代码
      fragmentShader: fragmentShader, // 片段着色器代码
      defines: material.defines, // 预处理器定义

      // 自定义着色器 ID（用于缓存）
      customVertexShaderID: customVertexShaderID,
      customFragmentShaderID: customFragmentShaderID,

      // 着色器类型和版本
      isRawShaderMaterial: material.isRawShaderMaterial === true, // 是否为原始着色器材质
      glslVersion: material.glslVersion, // GLSL 版本

      // 渲染精度
      precision: precision,

      // 批处理和实例化相关
      batching: IS_BATCHEDMESH, // 是否使用批处理
      batchingColor: IS_BATCHEDMESH && object._colorsTexture !== null, // 批处理是否包含颜色
      instancing: IS_INSTANCEDMESH, // 是否使用实例化
      instancingColor: IS_INSTANCEDMESH && object.instanceColor !== null, // 实例化是否包含颜色
      instancingMorph: IS_INSTANCEDMESH && object.morphTexture !== null, // 实例化是否包含变形

      supportsVertexTextures: SUPPORTS_VERTEX_TEXTURES,
      outputColorSpace:
        currentRenderTarget === null ? renderer.outputColorSpace : currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace,
      alphaToCoverage: !!material.alphaToCoverage,

      map: HAS_MAP,
      matcap: HAS_MATCAP,
      envMap: HAS_ENVMAP,
      envMapMode: HAS_ENVMAP && envMap.mapping,
      envMapCubeUVHeight: envMapCubeUVHeight,
      aoMap: HAS_AOMAP,
      lightMap: HAS_LIGHTMAP,
      bumpMap: HAS_BUMPMAP,
      normalMap: HAS_NORMALMAP,
      displacementMap: SUPPORTS_VERTEX_TEXTURES && HAS_DISPLACEMENTMAP,
      emissiveMap: HAS_EMISSIVEMAP,

      normalMapObjectSpace: HAS_NORMALMAP && material.normalMapType === ObjectSpaceNormalMap,
      normalMapTangentSpace: HAS_NORMALMAP && material.normalMapType === TangentSpaceNormalMap,

      metalnessMap: HAS_METALNESSMAP,
      roughnessMap: HAS_ROUGHNESSMAP,

      anisotropy: HAS_ANISOTROPY,
      anisotropyMap: HAS_ANISOTROPYMAP,

      clearcoat: HAS_CLEARCOAT,
      clearcoatMap: HAS_CLEARCOATMAP,
      clearcoatNormalMap: HAS_CLEARCOAT_NORMALMAP,
      clearcoatRoughnessMap: HAS_CLEARCOAT_ROUGHNESSMAP,

      dispersion: HAS_DISPERSION,

      iridescence: HAS_IRIDESCENCE,
      iridescenceMap: HAS_IRIDESCENCEMAP,
      iridescenceThicknessMap: HAS_IRIDESCENCE_THICKNESSMAP,

      sheen: HAS_SHEEN,
      sheenColorMap: HAS_SHEEN_COLORMAP,
      sheenRoughnessMap: HAS_SHEEN_ROUGHNESSMAP,

      specularMap: HAS_SPECULARMAP,
      specularColorMap: HAS_SPECULAR_COLORMAP,
      specularIntensityMap: HAS_SPECULAR_INTENSITYMAP,

      transmission: HAS_TRANSMISSION,
      transmissionMap: HAS_TRANSMISSIONMAP,
      thicknessMap: HAS_THICKNESSMAP,

      gradientMap: HAS_GRADIENTMAP,

      opaque: material.transparent === false && material.blending === NormalBlending && material.alphaToCoverage === false,

      alphaMap: HAS_ALPHAMAP,
      alphaTest: HAS_ALPHATEST,
      alphaHash: HAS_ALPHAHASH,

      combine: material.combine,

      //

      mapUv: HAS_MAP && getChannel(material.map.channel),
      aoMapUv: HAS_AOMAP && getChannel(material.aoMap.channel),
      lightMapUv: HAS_LIGHTMAP && getChannel(material.lightMap.channel),
      bumpMapUv: HAS_BUMPMAP && getChannel(material.bumpMap.channel),
      normalMapUv: HAS_NORMALMAP && getChannel(material.normalMap.channel),
      displacementMapUv: HAS_DISPLACEMENTMAP && getChannel(material.displacementMap.channel),
      emissiveMapUv: HAS_EMISSIVEMAP && getChannel(material.emissiveMap.channel),

      metalnessMapUv: HAS_METALNESSMAP && getChannel(material.metalnessMap.channel),
      roughnessMapUv: HAS_ROUGHNESSMAP && getChannel(material.roughnessMap.channel),

      anisotropyMapUv: HAS_ANISOTROPYMAP && getChannel(material.anisotropyMap.channel),

      clearcoatMapUv: HAS_CLEARCOATMAP && getChannel(material.clearcoatMap.channel),
      clearcoatNormalMapUv: HAS_CLEARCOAT_NORMALMAP && getChannel(material.clearcoatNormalMap.channel),
      clearcoatRoughnessMapUv: HAS_CLEARCOAT_ROUGHNESSMAP && getChannel(material.clearcoatRoughnessMap.channel),

      iridescenceMapUv: HAS_IRIDESCENCEMAP && getChannel(material.iridescenceMap.channel),
      iridescenceThicknessMapUv: HAS_IRIDESCENCE_THICKNESSMAP && getChannel(material.iridescenceThicknessMap.channel),

      sheenColorMapUv: HAS_SHEEN_COLORMAP && getChannel(material.sheenColorMap.channel),
      sheenRoughnessMapUv: HAS_SHEEN_ROUGHNESSMAP && getChannel(material.sheenRoughnessMap.channel),

      specularMapUv: HAS_SPECULARMAP && getChannel(material.specularMap.channel),
      specularColorMapUv: HAS_SPECULAR_COLORMAP && getChannel(material.specularColorMap.channel),
      specularIntensityMapUv: HAS_SPECULAR_INTENSITYMAP && getChannel(material.specularIntensityMap.channel),

      transmissionMapUv: HAS_TRANSMISSIONMAP && getChannel(material.transmissionMap.channel),
      thicknessMapUv: HAS_THICKNESSMAP && getChannel(material.thicknessMap.channel),

      alphaMapUv: HAS_ALPHAMAP && getChannel(material.alphaMap.channel),

      //

      vertexTangents: !!geometry.attributes.tangent && (HAS_NORMALMAP || HAS_ANISOTROPY),
      vertexColors: material.vertexColors,
      vertexAlphas: material.vertexColors === true && !!geometry.attributes.color && geometry.attributes.color.itemSize === 4,

      pointsUvs: object.isPoints === true && !!geometry.attributes.uv && (HAS_MAP || HAS_ALPHAMAP),

      fog: !!fog,
      useFog: material.fog === true,
      fogExp2: !!fog && fog.isFogExp2,

      flatShading: material.flatShading === true && material.wireframe === false,

      sizeAttenuation: material.sizeAttenuation === true,
      logarithmicDepthBuffer: logarithmicDepthBuffer,
      reversedDepthBuffer: reversedDepthBuffer,

      skinning: object.isSkinnedMesh === true,

      morphTargets: geometry.morphAttributes.position !== undefined,
      morphNormals: geometry.morphAttributes.normal !== undefined,
      morphColors: geometry.morphAttributes.color !== undefined,
      morphTargetsCount: morphTargetsCount,
      morphTextureStride: morphTextureStride,

      numDirLights: lights.directional.length,
      numPointLights: lights.point.length,
      numSpotLights: lights.spot.length,
      numSpotLightMaps: lights.spotLightMap.length,
      numRectAreaLights: lights.rectArea.length,
      numHemiLights: lights.hemi.length,

      numDirLightShadows: lights.directionalShadowMap.length,
      numPointLightShadows: lights.pointShadowMap.length,
      numSpotLightShadows: lights.spotShadowMap.length,
      numSpotLightShadowsWithMaps: lights.numSpotLightShadowsWithMaps,

      numLightProbes: lights.numLightProbes,

      numClippingPlanes: clipping.numPlanes,
      numClipIntersection: clipping.numIntersection,

      dithering: material.dithering,

      shadowMapEnabled: renderer.shadowMap.enabled && shadows.length > 0,
      shadowMapType: renderer.shadowMap.type,

      toneMapping: toneMapping,

      decodeVideoTexture: HAS_MAP && material.map.isVideoTexture === true && ColorManagement.getTransfer(material.map.colorSpace) === SRGBTransfer,
      decodeVideoTextureEmissive: HAS_EMISSIVEMAP && material.emissiveMap.isVideoTexture === true && ColorManagement.getTransfer(material.emissiveMap.colorSpace) === SRGBTransfer,

      premultipliedAlpha: material.premultipliedAlpha,

      doubleSided: material.side === DoubleSide,
      flipSided: material.side === BackSide,

      useDepthPacking: material.depthPacking >= 0,
      depthPacking: material.depthPacking || 0,

      index0AttributeName: material.index0AttributeName,

      extensionClipCullDistance: HAS_EXTENSIONS && material.extensions.clipCullDistance === true && extensions.has("WEBGL_clip_cull_distance"),
      extensionMultiDraw: ((HAS_EXTENSIONS && material.extensions.multiDraw === true) || IS_BATCHEDMESH) && extensions.has("WEBGL_multi_draw"),

      rendererExtensionParallelShaderCompile: extensions.has("KHR_parallel_shader_compile"),

      customProgramCacheKey: material.customProgramCacheKey(),
    };

    // getChannel() 的使用决定了此着色器的活跃纹理通道
    // the usage of getChannel() determines the active texture channels for this shader

    // 根据活跃通道设置顶点 UV 参数
    parameters.vertexUv1s = _activeChannels.has(1); // 是否使用 UV1 通道
    parameters.vertexUv2s = _activeChannels.has(2); // 是否使用 UV2 通道
    parameters.vertexUv3s = _activeChannels.has(3); // 是否使用 UV3 通道

    // 清空活跃通道集合，为下次使用做准备
    _activeChannels.clear();

    return parameters;
  }

  /**
   * 生成程序缓存键
   * 根据着色器参数生成唯一的缓存键，用于程序复用
   *
   * @param {Object} parameters - 着色器参数对象
   * @returns {string} 返回缓存键字符串
   */
  function getProgramCacheKey(parameters) {
    const array = [];

    // 添加着色器标识符
    if (parameters.shaderID) {
      // 内置着色器使用 shaderID
      array.push(parameters.shaderID);
    } else {
      // 自定义着色器使用自定义 ID
      array.push(parameters.customVertexShaderID);
      array.push(parameters.customFragmentShaderID);
    }

    // 添加预处理器定义
    if (parameters.defines !== undefined) {
      for (const name in parameters.defines) {
        array.push(name);
        array.push(parameters.defines[name]);
      }
    }

    // 对于非原始着色器材质，添加额外的参数
    if (parameters.isRawShaderMaterial === false) {
      getProgramCacheKeyParameters(array, parameters); // 添加数值参数
      getProgramCacheKeyBooleans(array, parameters); // 添加布尔参数
      array.push(renderer.outputColorSpace); // 添加输出颜色空间
    }

    // 添加自定义缓存键
    array.push(parameters.customProgramCacheKey);

    // 将数组连接成字符串作为缓存键
    return array.join();
  }

  function getProgramCacheKeyParameters(array, parameters) {
    array.push(parameters.precision);
    array.push(parameters.outputColorSpace);
    array.push(parameters.envMapMode);
    array.push(parameters.envMapCubeUVHeight);
    array.push(parameters.mapUv);
    array.push(parameters.alphaMapUv);
    array.push(parameters.lightMapUv);
    array.push(parameters.aoMapUv);
    array.push(parameters.bumpMapUv);
    array.push(parameters.normalMapUv);
    array.push(parameters.displacementMapUv);
    array.push(parameters.emissiveMapUv);
    array.push(parameters.metalnessMapUv);
    array.push(parameters.roughnessMapUv);
    array.push(parameters.anisotropyMapUv);
    array.push(parameters.clearcoatMapUv);
    array.push(parameters.clearcoatNormalMapUv);
    array.push(parameters.clearcoatRoughnessMapUv);
    array.push(parameters.iridescenceMapUv);
    array.push(parameters.iridescenceThicknessMapUv);
    array.push(parameters.sheenColorMapUv);
    array.push(parameters.sheenRoughnessMapUv);
    array.push(parameters.specularMapUv);
    array.push(parameters.specularColorMapUv);
    array.push(parameters.specularIntensityMapUv);
    array.push(parameters.transmissionMapUv);
    array.push(parameters.thicknessMapUv);
    array.push(parameters.combine);
    array.push(parameters.fogExp2);
    array.push(parameters.sizeAttenuation);
    array.push(parameters.morphTargetsCount);
    array.push(parameters.morphAttributeCount);
    array.push(parameters.numDirLights);
    array.push(parameters.numPointLights);
    array.push(parameters.numSpotLights);
    array.push(parameters.numSpotLightMaps);
    array.push(parameters.numHemiLights);
    array.push(parameters.numRectAreaLights);
    array.push(parameters.numDirLightShadows);
    array.push(parameters.numPointLightShadows);
    array.push(parameters.numSpotLightShadows);
    array.push(parameters.numSpotLightShadowsWithMaps);
    array.push(parameters.numLightProbes);
    array.push(parameters.shadowMapType);
    array.push(parameters.toneMapping);
    array.push(parameters.numClippingPlanes);
    array.push(parameters.numClipIntersection);
    array.push(parameters.depthPacking);
  }

  function getProgramCacheKeyBooleans(array, parameters) {
    _programLayers.disableAll();

    if (parameters.supportsVertexTextures) _programLayers.enable(0);
    if (parameters.instancing) _programLayers.enable(1);
    if (parameters.instancingColor) _programLayers.enable(2);
    if (parameters.instancingMorph) _programLayers.enable(3);
    if (parameters.matcap) _programLayers.enable(4);
    if (parameters.envMap) _programLayers.enable(5);
    if (parameters.normalMapObjectSpace) _programLayers.enable(6);
    if (parameters.normalMapTangentSpace) _programLayers.enable(7);
    if (parameters.clearcoat) _programLayers.enable(8);
    if (parameters.iridescence) _programLayers.enable(9);
    if (parameters.alphaTest) _programLayers.enable(10);
    if (parameters.vertexColors) _programLayers.enable(11);
    if (parameters.vertexAlphas) _programLayers.enable(12);
    if (parameters.vertexUv1s) _programLayers.enable(13);
    if (parameters.vertexUv2s) _programLayers.enable(14);
    if (parameters.vertexUv3s) _programLayers.enable(15);
    if (parameters.vertexTangents) _programLayers.enable(16);
    if (parameters.anisotropy) _programLayers.enable(17);
    if (parameters.alphaHash) _programLayers.enable(18);
    if (parameters.batching) _programLayers.enable(19);
    if (parameters.dispersion) _programLayers.enable(20);
    if (parameters.batchingColor) _programLayers.enable(21);
    if (parameters.gradientMap) _programLayers.enable(22);

    array.push(_programLayers.mask);
    _programLayers.disableAll();

    if (parameters.fog) _programLayers.enable(0);
    if (parameters.useFog) _programLayers.enable(1);
    if (parameters.flatShading) _programLayers.enable(2);
    if (parameters.logarithmicDepthBuffer) _programLayers.enable(3);
    if (parameters.reversedDepthBuffer) _programLayers.enable(4);
    if (parameters.skinning) _programLayers.enable(5);
    if (parameters.morphTargets) _programLayers.enable(6);
    if (parameters.morphNormals) _programLayers.enable(7);
    if (parameters.morphColors) _programLayers.enable(8);
    if (parameters.premultipliedAlpha) _programLayers.enable(9);
    if (parameters.shadowMapEnabled) _programLayers.enable(10);
    if (parameters.doubleSided) _programLayers.enable(11);
    if (parameters.flipSided) _programLayers.enable(12);
    if (parameters.useDepthPacking) _programLayers.enable(13);
    if (parameters.dithering) _programLayers.enable(14);
    if (parameters.transmission) _programLayers.enable(15);
    if (parameters.sheen) _programLayers.enable(16);
    if (parameters.opaque) _programLayers.enable(17);
    if (parameters.pointsUvs) _programLayers.enable(18);
    if (parameters.decodeVideoTexture) _programLayers.enable(19);
    if (parameters.decodeVideoTextureEmissive) _programLayers.enable(20);
    if (parameters.alphaToCoverage) _programLayers.enable(21);

    array.push(_programLayers.mask);
  }

  /**
   * 获取材质的 uniform 变量
   * 根据材质类型返回对应的 uniform 对象
   *
   * @param {Material} material - 材质对象
   * @returns {Object} 返回 uniform 变量对象
   */
  function getUniforms(material) {
    const shaderID = shaderIDs[material.type];
    let uniforms;

    if (shaderID) {
      // 内置材质：克隆着色器库中的 uniform
      const shader = ShaderLib[shaderID];
      uniforms = UniformsUtils.clone(shader.uniforms);
    } else {
      // 自定义材质：直接使用材质的 uniform
      uniforms = material.uniforms;
    }

    return uniforms;
  }

  /**
   * 获取或创建着色器程序
   * 根据缓存键查找已存在的程序，如果不存在则创建新程序
   *
   * @param {Object} parameters - 着色器参数
   * @param {string} cacheKey - 缓存键
   * @returns {WebGLProgram} 返回 WebGL 程序对象
   */
  function acquireProgram(parameters, cacheKey) {
    let program;

    // 检查代码是否已经编译过
    // Check if code has been already compiled
    for (let p = 0, pl = programs.length; p < pl; p++) {
      const preexistingProgram = programs[p];

      if (preexistingProgram.cacheKey === cacheKey) {
        // 找到已存在的程序，增加使用计数
        program = preexistingProgram;
        ++program.usedTimes;

        break;
      }
    }

    if (program === undefined) {
      // 没有找到现有程序，创建新程序
      program = new WebGLProgram(renderer, cacheKey, parameters, bindingStates);
      programs.push(program);
    }

    return program;
  }

  /**
   * 释放着色器程序
   * 减少程序的使用计数，当计数为0时销毁程序
   *
   * @param {WebGLProgram} program - 要释放的程序
   */
  function releaseProgram(program) {
    if (--program.usedTimes === 0) {
      // 使用计数为0，从数组中移除程序
      // Remove from unordered set
      const i = programs.indexOf(program);
      programs[i] = programs[programs.length - 1]; // 用最后一个元素替换
      programs.pop(); // 移除最后一个元素

      // 释放 WebGL 资源
      // Free WebGL resources
      program.destroy();
    }
  }

  /**
   * 释放着色器缓存
   * 从自定义着色器缓存中移除指定材质
   *
   * @param {Material} material - 要移除的材质
   */
  function releaseShaderCache(material) {
    _customShaders.remove(material);
  }

  /**
   * 销毁程序管理器
   * 清理所有缓存和资源
   */
  function dispose() {
    _customShaders.dispose();
  }

  // 返回程序管理器的公共接口
  return {
    getParameters: getParameters, // 获取着色器参数
    getProgramCacheKey: getProgramCacheKey, // 生成程序缓存键
    getUniforms: getUniforms, // 获取 uniform 变量
    acquireProgram: acquireProgram, // 获取或创建程序
    releaseProgram: releaseProgram, // 释放程序
    releaseShaderCache: releaseShaderCache, // 释放着色器缓存
    // 暴露给 renderer.info 用于资源监控和错误反馈
    // Exposed for resource monitoring & error feedback via renderer.info:
    programs: programs, // 程序数组
    dispose: dispose, // 销毁管理器
  };
}

/**
 * 导出 WebGL 程序管理器
 */
export { WebGLPrograms };
