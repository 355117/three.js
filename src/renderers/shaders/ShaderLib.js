/**
 * 导入着色器代码片段库
 */
import { ShaderChunk } from "./ShaderChunk.js";
/**
 * 导入 uniform 变量合并工具
 */
import { mergeUniforms } from "./UniformsUtils.js";
/**
 * 导入二维向量类
 */
import { Vector2 } from "../../math/Vector2.js";
/**
 * 导入三维向量类
 */
import { Vector3 } from "../../math/Vector3.js";
/**
 * 导入 uniform 变量库
 */
import { UniformsLib } from "./UniformsLib.js";
/**
 * 导入颜色类
 */
import { Color } from "../../math/Color.js";
/**
 * 导入三维矩阵类
 */
import { Matrix3 } from "../../math/Matrix3.js";

/**
 * 着色器库
 *
 * 包含 Three.js 中所有内置材质的着色器定义。每个着色器定义包含：
 * - uniforms: 着色器的 uniform 变量定义
 * - vertexShader: 顶点着色器代码
 * - fragmentShader: 片段着色器代码
 *
 * 这些着色器定义被材质系统用来生成最终的 WebGL 着色器程序。
 */
const ShaderLib = {
  /**
   * 基础材质着色器 (MeshBasicMaterial)
   *
   * 最简单的材质着色器，不受光照影响，只显示材质的基本颜色和纹理。
   * 适用于不需要光照计算的场景，如 UI 元素、天空盒等。
   */
  basic: {
    uniforms: /*@__PURE__*/ mergeUniforms([
      UniformsLib.common, // 通用 uniform 变量（颜色、纹理等）
      UniformsLib.specularmap, // 镜面反射贴图
      UniformsLib.envmap, // 环境贴图
      UniformsLib.aomap, // 环境光遮蔽贴图
      UniformsLib.lightmap, // 光照贴图
      UniformsLib.fog, // 雾效
    ]),

    vertexShader: ShaderChunk.meshbasic_vert,
    fragmentShader: ShaderChunk.meshbasic_frag,
  },

  /**
   * Lambert 材质着色器 (MeshLambertMaterial)
   *
   * 基于 Lambert 光照模型的材质，提供漫反射光照计算。
   * 适用于需要基本光照效果但不需要镜面反射的场景。
   */
  lambert: {
    uniforms: /*@__PURE__*/ mergeUniforms([
      UniformsLib.common, // 通用 uniform 变量
      UniformsLib.specularmap, // 镜面反射贴图
      UniformsLib.envmap, // 环境贴图
      UniformsLib.aomap, // 环境光遮蔽贴图
      UniformsLib.lightmap, // 光照贴图
      UniformsLib.emissivemap, // 自发光贴图
      UniformsLib.bumpmap, // 凹凸贴图
      UniformsLib.normalmap, // 法线贴图
      UniformsLib.displacementmap, // 位移贴图
      UniformsLib.fog, // 雾效
      UniformsLib.lights, // 光照系统
      {
        emissive: { value: /*@__PURE__*/ new Color(0x000000) }, // 自发光颜色
      },
    ]),

    vertexShader: ShaderChunk.meshlambert_vert,
    fragmentShader: ShaderChunk.meshlambert_frag,
  },

  /**
   * Phong 材质着色器 (MeshPhongMaterial)
   *
   * 基于 Phong 光照模型的材质，提供漫反射和镜面反射光照计算。
   * 适用于需要高光效果的场景，如金属、塑料等材质。
   */
  phong: {
    uniforms: /*@__PURE__*/ mergeUniforms([
      UniformsLib.common, // 通用 uniform 变量
      UniformsLib.specularmap, // 镜面反射贴图
      UniformsLib.envmap, // 环境贴图
      UniformsLib.aomap, // 环境光遮蔽贴图
      UniformsLib.lightmap, // 光照贴图
      UniformsLib.emissivemap, // 自发光贴图
      UniformsLib.bumpmap, // 凹凸贴图
      UniformsLib.normalmap, // 法线贴图
      UniformsLib.displacementmap, // 位移贴图
      UniformsLib.fog, // 雾效
      UniformsLib.lights, // 光照系统
      {
        emissive: { value: /*@__PURE__*/ new Color(0x000000) }, // 自发光颜色
        specular: { value: /*@__PURE__*/ new Color(0x111111) }, // 镜面反射颜色
        shininess: { value: 30 }, // 光泽度
      },
    ]),

    vertexShader: ShaderChunk.meshphong_vert,
    fragmentShader: ShaderChunk.meshphong_frag,
  },

  /**
   * 标准材质着色器 (MeshStandardMaterial)
   *
   * 基于物理的渲染 (PBR) 材质，使用金属度/粗糙度工作流。
   * 提供真实感的光照计算，适用于大多数现实世界的材质。
   */
  standard: {
    uniforms: /*@__PURE__*/ mergeUniforms([
      UniformsLib.common, // 通用 uniform 变量
      UniformsLib.envmap, // 环境贴图
      UniformsLib.aomap, // 环境光遮蔽贴图
      UniformsLib.lightmap, // 光照贴图
      UniformsLib.emissivemap, // 自发光贴图
      UniformsLib.bumpmap, // 凹凸贴图
      UniformsLib.normalmap, // 法线贴图
      UniformsLib.displacementmap, // 位移贴图
      UniformsLib.roughnessmap, // 粗糙度贴图
      UniformsLib.metalnessmap, // 金属度贴图
      UniformsLib.fog, // 雾效
      UniformsLib.lights, // 光照系统
      {
        emissive: { value: /*@__PURE__*/ new Color(0x000000) }, // 自发光颜色
        roughness: { value: 1.0 }, // 粗糙度
        metalness: { value: 0.0 }, // 金属度
        envMapIntensity: { value: 1 }, // 环境贴图强度
      },
    ]),

    vertexShader: ShaderChunk.meshphysical_vert,
    fragmentShader: ShaderChunk.meshphysical_frag,
  },

  /**
   * 卡通材质着色器 (MeshToonMaterial)
   *
   * 卡通风格的材质，使用渐变贴图实现非真实感渲染效果。
   * 适用于动画、游戏等需要卡通风格的场景。
   */
  toon: {
    uniforms: /*@__PURE__*/ mergeUniforms([
      UniformsLib.common, // 通用 uniform 变量
      UniformsLib.aomap, // 环境光遮蔽贴图
      UniformsLib.lightmap, // 光照贴图
      UniformsLib.emissivemap, // 自发光贴图
      UniformsLib.bumpmap, // 凹凸贴图
      UniformsLib.normalmap, // 法线贴图
      UniformsLib.displacementmap, // 位移贴图
      UniformsLib.gradientmap, // 渐变贴图（用于卡通效果）
      UniformsLib.fog, // 雾效
      UniformsLib.lights, // 光照系统
      {
        emissive: { value: /*@__PURE__*/ new Color(0x000000) }, // 自发光颜色
      },
    ]),

    vertexShader: ShaderChunk.meshtoon_vert,
    fragmentShader: ShaderChunk.meshtoon_frag,
  },

  /**
   * MatCap 材质着色器 (MeshMatcapMaterial)
   *
   * 使用 MatCap (Material Capture) 纹理的材质，通过预烘焙的光照信息
   * 实现快速的材质渲染。适用于需要复杂光照效果但性能要求较高的场景。
   */
  matcap: {
    uniforms: /*@__PURE__*/ mergeUniforms([
      UniformsLib.common, // 通用 uniform 变量
      UniformsLib.bumpmap, // 凹凸贴图
      UniformsLib.normalmap, // 法线贴图
      UniformsLib.displacementmap, // 位移贴图
      UniformsLib.fog, // 雾效
      {
        matcap: { value: null }, // MatCap 纹理
      },
    ]),

    vertexShader: ShaderChunk.meshmatcap_vert,
    fragmentShader: ShaderChunk.meshmatcap_frag,
  },

  /**
   * 点材质着色器 (PointsMaterial)
   *
   * 用于渲染点云的材质，支持点的大小控制和纹理映射。
   * 适用于粒子系统、点云可视化等场景。
   */
  points: {
    uniforms: /*@__PURE__*/ mergeUniforms([
      UniformsLib.points, // 点相关的 uniform 变量
      UniformsLib.fog, // 雾效
    ]),

    vertexShader: ShaderChunk.points_vert,
    fragmentShader: ShaderChunk.points_frag,
  },

  /**
   * 虚线材质着色器 (LineDashedMaterial)
   *
   * 用于渲染虚线的材质，支持虚线样式的自定义。
   * 适用于需要虚线效果的线条渲染。
   */
  dashed: {
    uniforms: /*@__PURE__*/ mergeUniforms([
      UniformsLib.common, // 通用 uniform 变量
      UniformsLib.fog, // 雾效
      {
        scale: { value: 1 }, // 缩放比例
        dashSize: { value: 1 }, // 虚线段长度
        totalSize: { value: 2 }, // 虚线总长度（包括间隔）
      },
    ]),

    vertexShader: ShaderChunk.linedashed_vert,
    fragmentShader: ShaderChunk.linedashed_frag,
  },

  /**
   * 深度材质着色器 (MeshDepthMaterial)
   *
   * 用于渲染深度信息的材质，将深度值编码为颜色。
   * 适用于阴影映射、深度缓冲可视化等场景。
   */
  depth: {
    uniforms: /*@__PURE__*/ mergeUniforms([
      UniformsLib.common, // 通用 uniform 变量
      UniformsLib.displacementmap, // 位移贴图
    ]),

    vertexShader: ShaderChunk.depth_vert,
    fragmentShader: ShaderChunk.depth_frag,
  },

  /**
   * 法线材质着色器 (MeshNormalMaterial)
   *
   * 用于可视化法线信息的材质，将法线向量编码为 RGB 颜色。
   * 适用于调试法线、检查模型几何等场景。
   */
  normal: {
    uniforms: /*@__PURE__*/ mergeUniforms([
      UniformsLib.common, // 通用 uniform 变量
      UniformsLib.bumpmap, // 凹凸贴图
      UniformsLib.normalmap, // 法线贴图
      UniformsLib.displacementmap, // 位移贴图
      {
        opacity: { value: 1.0 }, // 不透明度
      },
    ]),

    vertexShader: ShaderChunk.meshnormal_vert,
    fragmentShader: ShaderChunk.meshnormal_frag,
  },

  /**
   * 精灵材质着色器 (SpriteMaterial)
   *
   * 用于渲染始终面向摄像机的精灵对象，常用于粒子效果、UI 元素等。
   * 精灵会自动旋转以始终面向摄像机。
   */
  sprite: {
    uniforms: /*@__PURE__*/ mergeUniforms([
      UniformsLib.sprite, // 精灵相关的 uniform 变量
      UniformsLib.fog, // 雾效
    ]),

    vertexShader: ShaderChunk.sprite_vert,
    fragmentShader: ShaderChunk.sprite_frag,
  },

  /**
   * 背景材质着色器 (2D 纹理背景)
   *
   * 用于渲染 2D 纹理作为场景背景，支持 UV 变换和强度控制。
   * 适用于平面背景图像的渲染。
   */
  background: {
    uniforms: {
      uvTransform: { value: /*@__PURE__*/ new Matrix3() }, // UV 变换矩阵
      t2D: { value: null }, // 2D 背景纹理
      backgroundIntensity: { value: 1 }, // 背景强度
    },

    vertexShader: ShaderChunk.background_vert,
    fragmentShader: ShaderChunk.background_frag,
  },

  /**
   * 立方体背景材质着色器 (天空盒)
   *
   * 用于渲染立方体贴图作为场景背景，支持模糊度、强度和旋转控制。
   * 适用于天空盒、环境背景等 360 度背景渲染。
   */
  backgroundCube: {
    uniforms: {
      envMap: { value: null }, // 环境贴图（立方体贴图）
      flipEnvMap: { value: -1 }, // 环境贴图翻转标志
      backgroundBlurriness: { value: 0 }, // 背景模糊度
      backgroundIntensity: { value: 1 }, // 背景强度
      backgroundRotation: { value: /*@__PURE__*/ new Matrix3() }, // 背景旋转矩阵
    },

    vertexShader: ShaderChunk.backgroundCube_vert,
    fragmentShader: ShaderChunk.backgroundCube_frag,
  },

  /**
   * 立方体材质着色器
   *
   * 用于渲染立方体贴图，支持翻转和透明度控制。
   * 适用于环境贴图预览、立方体贴图调试等场景。
   */
  cube: {
    uniforms: {
      tCube: { value: null }, // 立方体贴图
      tFlip: { value: -1 }, // 翻转标志
      opacity: { value: 1.0 }, // 不透明度
    },

    vertexShader: ShaderChunk.cube_vert,
    fragmentShader: ShaderChunk.cube_frag,
  },

  /**
   * 等距柱状投影材质着色器
   *
   * 用于渲染等距柱状投影（全景图）纹理，将 360 度全景图映射到球体。
   * 适用于全景图显示、HDRI 环境贴图转换等场景。
   */
  equirect: {
    uniforms: {
      tEquirect: { value: null }, // 等距柱状投影纹理
    },

    vertexShader: ShaderChunk.equirect_vert,
    fragmentShader: ShaderChunk.equirect_frag,
  },

  /**
   * 距离 RGBA 材质着色器
   *
   * 用于将距离信息编码到 RGBA 颜色中，主要用于阴影映射。
   * 将从参考点到片段的距离编码为 32 位浮点数存储在 RGBA 通道中。
   */
  distanceRGBA: {
    uniforms: /*@__PURE__*/ mergeUniforms([
      UniformsLib.common, // 通用 uniform 变量
      UniformsLib.displacementmap, // 位移贴图
      {
        referencePosition: { value: /*@__PURE__*/ new Vector3() }, // 参考位置（通常是光源位置）
        nearDistance: { value: 1 }, // 近距离
        farDistance: { value: 1000 }, // 远距离
      },
    ]),

    vertexShader: ShaderChunk.distanceRGBA_vert,
    fragmentShader: ShaderChunk.distanceRGBA_frag,
  },

  /**
   * 阴影材质着色器 (ShadowMaterial)
   *
   * 用于渲染阴影的材质，只显示阴影部分，其他区域透明。
   * 适用于在现有场景上叠加阴影效果。
   */
  shadow: {
    uniforms: /*@__PURE__*/ mergeUniforms([
      UniformsLib.lights, // 光照系统
      UniformsLib.fog, // 雾效
      {
        color: { value: /*@__PURE__*/ new Color(0x00000) }, // 阴影颜色
        opacity: { value: 1.0 }, // 不透明度
      },
    ]),

    vertexShader: ShaderChunk.shadow_vert,
    fragmentShader: ShaderChunk.shadow_frag,
  },
};

/**
 * 物理材质着色器 (MeshPhysicalMaterial)
 *
 * 扩展的物理基础渲染材质，在标准材质基础上增加了更多高级特性：
 * - 清漆层 (Clearcoat)：模拟表面涂层效果
 * - 彩虹色 (Iridescence)：模拟肥皂泡、油膜等彩虹效果
 * - 光泽 (Sheen)：模拟织物、天鹅绒等材质的光泽
 * - 透射 (Transmission)：模拟玻璃等透明材质
 * - 各向异性 (Anisotropy)：模拟拉丝金属等各向异性反射
 * - 色散 (Dispersion)：模拟光的色散效果
 */
ShaderLib.physical = {
  uniforms: /*@__PURE__*/ mergeUniforms([
    ShaderLib.standard.uniforms, // 继承标准材质的所有 uniform
    {
      // ========== 清漆层相关 ==========
      clearcoat: { value: 0 }, // 清漆强度
      clearcoatMap: { value: null }, // 清漆贴图
      clearcoatMapTransform: { value: /*@__PURE__*/ new Matrix3() }, // 清漆贴图变换
      clearcoatNormalMap: { value: null }, // 清漆法线贴图
      clearcoatNormalMapTransform: { value: /*@__PURE__*/ new Matrix3() }, // 清漆法线贴图变换
      clearcoatNormalScale: { value: /*@__PURE__*/ new Vector2(1, 1) }, // 清漆法线缩放
      clearcoatRoughness: { value: 0 }, // 清漆粗糙度
      clearcoatRoughnessMap: { value: null }, // 清漆粗糙度贴图
      clearcoatRoughnessMapTransform: { value: /*@__PURE__*/ new Matrix3() }, // 清漆粗糙度贴图变换

      // ========== 色散效果 ==========
      dispersion: { value: 0 }, // 色散强度

      // ========== 彩虹色效果 ==========
      iridescence: { value: 0 }, // 彩虹色强度
      iridescenceMap: { value: null }, // 彩虹色贴图
      iridescenceMapTransform: { value: /*@__PURE__*/ new Matrix3() }, // 彩虹色贴图变换
      iridescenceIOR: { value: 1.3 }, // 彩虹色折射率
      iridescenceThicknessMinimum: { value: 100 }, // 彩虹色最小厚度
      iridescenceThicknessMaximum: { value: 400 }, // 彩虹色最大厚度
      iridescenceThicknessMap: { value: null }, // 彩虹色厚度贴图
      iridescenceThicknessMapTransform: { value: /*@__PURE__*/ new Matrix3() }, // 彩虹色厚度贴图变换

      // ========== 光泽效果 ==========
      sheen: { value: 0 }, // 光泽强度
      sheenColor: { value: /*@__PURE__*/ new Color(0x000000) }, // 光泽颜色
      sheenColorMap: { value: null }, // 光泽颜色贴图
      sheenColorMapTransform: { value: /*@__PURE__*/ new Matrix3() }, // 光泽颜色贴图变换
      sheenRoughness: { value: 1 }, // 光泽粗糙度
      sheenRoughnessMap: { value: null }, // 光泽粗糙度贴图
      sheenRoughnessMapTransform: { value: /*@__PURE__*/ new Matrix3() }, // 光泽粗糙度贴图变换

      // ========== 透射效果 ==========
      transmission: { value: 0 }, // 透射强度
      transmissionMap: { value: null }, // 透射贴图
      transmissionMapTransform: { value: /*@__PURE__*/ new Matrix3() }, // 透射贴图变换
      transmissionSamplerSize: { value: /*@__PURE__*/ new Vector2() }, // 透射采样器尺寸
      transmissionSamplerMap: { value: null }, // 透射采样器贴图

      // ========== 厚度和衰减 ==========
      thickness: { value: 0 }, // 材质厚度
      thicknessMap: { value: null }, // 厚度贴图
      thicknessMapTransform: { value: /*@__PURE__*/ new Matrix3() }, // 厚度贴图变换
      attenuationDistance: { value: 0 }, // 衰减距离
      attenuationColor: { value: /*@__PURE__*/ new Color(0x000000) }, // 衰减颜色

      // ========== 镜面反射控制 ==========
      specularColor: { value: /*@__PURE__*/ new Color(1, 1, 1) }, // 镜面反射颜色
      specularColorMap: { value: null }, // 镜面反射颜色贴图
      specularColorMapTransform: { value: /*@__PURE__*/ new Matrix3() }, // 镜面反射颜色贴图变换
      specularIntensity: { value: 1 }, // 镜面反射强度
      specularIntensityMap: { value: null }, // 镜面反射强度贴图
      specularIntensityMapTransform: { value: /*@__PURE__*/ new Matrix3() }, // 镜面反射强度贴图变换

      // ========== 各向异性 ==========
      anisotropyVector: { value: /*@__PURE__*/ new Vector2() }, // 各向异性向量
      anisotropyMap: { value: null }, // 各向异性贴图
      anisotropyMapTransform: { value: /*@__PURE__*/ new Matrix3() }, // 各向异性贴图变换
    },
  ]),

  vertexShader: ShaderChunk.meshphysical_vert,
  fragmentShader: ShaderChunk.meshphysical_frag,
};

/**
 * 导出着色器库
 */
export { ShaderLib };
