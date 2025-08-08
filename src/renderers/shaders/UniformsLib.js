/**
 * Uniform 变量库
 *
 * 这个模块定义了 Three.js 中所有内置着色器使用的 uniform 变量。
 * 这些 uniform 变量按功能分组，可以被不同的材质和着色器程序复用。
 *
 * 每个 uniform 变量都有一个默认值，在着色器编译时会被传递给 GPU。
 * 这些变量控制着材质的各种属性，如颜色、纹理、光照参数等。
 */

// 导入数学类型
import { Color } from "../../math/Color.js"; // 颜色类
import { Vector2 } from "../../math/Vector2.js"; // 二维向量类
import { Matrix3 } from "../../math/Matrix3.js"; // 3x3矩阵类，用于纹理变换

/**
 * Uniform 变量库
 *
 * 包含所有共享的 WebGL 着色器 uniform 变量定义。
 * 这些变量按功能分组，每组对应特定的渲染功能或材质属性。
 */
const UniformsLib = {
  /**
   * 通用材质属性
   *
   * 包含所有材质类型都会使用的基础属性，如颜色、透明度、主贴图等。
   * 这些是最基本的材质参数，几乎所有着色器都会用到。
   */
  common: {
    // 漫反射颜色：材质的基础颜色，默认为白色
    diffuse: { value: /*@__PURE__*/ new Color(0xffffff) },

    // 不透明度：控制材质的透明程度，1.0为完全不透明，0.0为完全透明
    opacity: { value: 1.0 },

    // 主贴图：材质的主要纹理贴图，通常是漫反射贴图
    map: { value: null },
    // 主贴图变换矩阵：控制主贴图的缩放、旋转和平移
    mapTransform: { value: /*@__PURE__*/ new Matrix3() },

    // Alpha贴图：控制透明度的灰度贴图，黑色为透明，白色为不透明
    alphaMap: { value: null },
    // Alpha贴图变换矩阵：控制Alpha贴图的缩放、旋转和平移
    alphaMapTransform: { value: /*@__PURE__*/ new Matrix3() },

    // Alpha测试阈值：低于此值的像素将被丢弃，用于硬边透明效果
    alphaTest: { value: 0 },
  },

  /**
   * 镜面反射贴图
   *
   * 用于Phong光照模型的镜面反射贴图，控制表面的镜面反射强度。
   * 贴图的亮度决定了该区域的镜面反射程度。
   */
  specularmap: {
    // 镜面反射贴图：控制表面镜面反射强度的贴图
    specularMap: { value: null },
    // 镜面反射贴图变换矩阵：控制镜面反射贴图的缩放、旋转和平移
    specularMapTransform: { value: /*@__PURE__*/ new Matrix3() },
  },

  /**
   * 环境映射
   *
   * 用于实现反射和折射效果的环境贴图相关参数。
   * 支持立方体贴图和等距柱状投影贴图。
   */
  envmap: {
    // 环境贴图：用于反射和折射的环境纹理（立方体贴图或2D贴图）
    envMap: { value: null },
    // 环境贴图旋转矩阵：控制环境贴图的旋转
    envMapRotation: { value: /*@__PURE__*/ new Matrix3() },
    // 翻转环境贴图：用于调整环境贴图的方向，-1表示翻转
    flipEnvMap: { value: -1 },
    // 反射率：控制环境反射的强度 (用于basic, lambert, phong材质)
    reflectivity: { value: 1.0 },
    // 折射率：材质的折射率，用于物理材质的折射计算
    ior: { value: 1.5 },
    // 折射比率：折射强度比率 (用于basic, lambert, phong材质)
    refractionRatio: { value: 0.98 },
  },

  /**
   * 环境光遮蔽贴图 (Ambient Occlusion)
   *
   * 用于增强阴影细节和深度感的环境光遮蔽贴图。
   * AO贴图模拟了几何体凹陷处的阴影效果。
   */
  aomap: {
    // AO贴图：环境光遮蔽贴图，黑色区域表示被遮蔽的区域
    aoMap: { value: null },
    // AO强度：控制环境光遮蔽效果的强度，1.0为完全效果
    aoMapIntensity: { value: 1 },
    // AO贴图变换矩阵：控制AO贴图的缩放、旋转和平移
    aoMapTransform: { value: /*@__PURE__*/ new Matrix3() },
  },

  /**
   * 光照贴图 (Light Map)
   *
   * 预计算的全局光照贴图，用于静态光照效果。
   * 光照贴图包含了预先烘焙的光照信息。
   */
  lightmap: {
    // 光照贴图：包含预计算光照信息的贴图
    lightMap: { value: null },
    // 光照贴图强度：控制光照贴图效果的强度
    lightMapIntensity: { value: 1 },
    // 光照贴图变换矩阵：控制光照贴图的缩放、旋转和平移
    lightMapTransform: { value: /*@__PURE__*/ new Matrix3() },
  },

  /**
   * 凹凸贴图 (Bump Map)
   *
   * 使用灰度贴图来模拟表面凹凸细节的技术。
   * 通过扰动法线来创建表面细节的视觉效果。
   */
  bumpmap: {
    // 凹凸贴图：灰度贴图，用于扰动表面法线
    bumpMap: { value: null },
    // 凹凸贴图变换矩阵：控制凹凸贴图的缩放、旋转和平移
    bumpMapTransform: { value: /*@__PURE__*/ new Matrix3() },
    // 凹凸强度：控制凹凸效果的强度，值越大效果越明显
    bumpScale: { value: 1 },
  },

  /**
   * 法线贴图 (Normal Map)
   *
   * 使用RGB颜色编码的法线信息来创建高精度的表面细节。
   * 比凹凸贴图提供更精确的法线信息和更好的视觉效果。
   */
  normalmap: {
    // 法线贴图：RGB编码的法线贴图，用于高精度表面细节
    normalMap: { value: null },
    // 法线贴图变换矩阵：控制法线贴图的缩放、旋转和平移
    normalMapTransform: { value: /*@__PURE__*/ new Matrix3() },
    // 法线强度：控制法线贴图在X和Y方向的强度
    normalScale: { value: /*@__PURE__*/ new Vector2(1, 1) },
  },

  /**
   * 位移贴图 (Displacement Map)
   *
   * 通过实际移动顶点位置来创建几何细节的技术。
   * 与法线贴图不同，位移贴图会改变实际的几何形状。
   */
  displacementmap: {
    // 位移贴图：灰度贴图，用于实际移动顶点位置
    displacementMap: { value: null },
    // 位移贴图变换矩阵：控制位移贴图的缩放、旋转和平移
    displacementMapTransform: { value: /*@__PURE__*/ new Matrix3() },
    // 位移强度：控制顶点位移的幅度
    displacementScale: { value: 1 },
    // 位移偏移：位移的基础偏移值，用于调整位移的中心点
    displacementBias: { value: 0 },
  },

  /**
   * 自发光贴图 (Emissive Map)
   *
   * 用于模拟材质自身发光效果的贴图。
   * 自发光不受光照影响，总是以全亮度显示。
   */
  emissivemap: {
    // 自发光贴图：控制材质发光区域和强度的贴图
    emissiveMap: { value: null },
    // 自发光贴图变换矩阵：控制自发光贴图的缩放、旋转和平移
    emissiveMapTransform: { value: /*@__PURE__*/ new Matrix3() },
  },

  /**
   * 金属度贴图 (Metalness Map)
   *
   * 用于PBR材质的金属度贴图，定义表面的金属特性。
   * 白色区域表示金属，黑色区域表示非金属（电介质）。
   */
  metalnessmap: {
    // 金属度贴图：灰度贴图，定义表面的金属程度
    metalnessMap: { value: null },
    // 金属度贴图变换矩阵：控制金属度贴图的缩放、旋转和平移
    metalnessMapTransform: { value: /*@__PURE__*/ new Matrix3() },
  },

  /**
   * 粗糙度贴图 (Roughness Map)
   *
   * 用于PBR材质的粗糙度贴图，控制表面的微观几何粗糙程度。
   * 黑色表示光滑表面，白色表示粗糙表面。
   */
  roughnessmap: {
    // 粗糙度贴图：灰度贴图，定义表面的粗糙程度
    roughnessMap: { value: null },
    // 粗糙度贴图变换矩阵：控制粗糙度贴图的缩放、旋转和平移
    roughnessMapTransform: { value: /*@__PURE__*/ new Matrix3() },
  },

  /**
   * 渐变贴图 (Gradient Map)
   *
   * 用于卡通渲染的渐变映射贴图，实现色调分离效果。
   * 将光照强度映射到特定的颜色渐变上。
   */
  gradientmap: {
    // 渐变贴图：1D渐变贴图，用于卡通风格的色调映射
    gradientMap: { value: null },
  },

  /**
   * 雾效果 (Fog)
   *
   * 用于模拟大气雾效果的参数，支持线性雾和指数雾。
   * 雾效果可以增强场景的深度感和大气感。
   */
  fog: {
    // 雾密度：指数雾的密度参数，值越大雾越浓
    fogDensity: { value: 0.00025 },
    // 雾近距离：线性雾开始的距离
    fogNear: { value: 1 },
    // 雾远距离：线性雾完全浓密的距离
    fogFar: { value: 2000 },
    // 雾颜色：雾的颜色，通常与背景色相近
    fogColor: { value: /*@__PURE__*/ new Color(0xffffff) },
  },

  /**
   * 光照系统 (Lighting System)
   *
   * 包含所有类型光源的参数和阴影相关设置。
   * 支持环境光、方向光、点光源、聚光灯和半球光等。
   */
  lights: {
    // 环境光颜色数组：场景中所有环境光的颜色
    ambientLightColor: { value: [] },

    // 光照探针：用于基于图像的光照(IBL)的球谐函数系数
    lightProbe: { value: [] },

    // === 方向光 (Directional Light) ===
    // 方向光：模拟太阳光等平行光源
    directionalLights: {
      value: [],
      properties: {
        direction: {}, // 光照方向向量
        color: {}, // 光照颜色和强度
      },
    },

    // 方向光阴影参数
    directionalLightShadows: {
      value: [],
      properties: {
        shadowIntensity: 1, // 阴影强度，1.0为完全阴影
        shadowBias: {}, // 阴影偏移，用于减少阴影失真
        shadowNormalBias: {}, // 法线偏移，基于表面法线的阴影偏移
        shadowRadius: {}, // 阴影模糊半径，用于软阴影
        shadowMapSize: {}, // 阴影贴图尺寸
      },
    },

    // 方向光阴影贴图数组：存储方向光的阴影贴图
    directionalShadowMap: { value: [] },
    // 方向光阴影变换矩阵：从世界空间到阴影贴图空间的变换矩阵
    directionalShadowMatrix: { value: [] },

    // === 聚光灯 (Spot Light) ===
    // 聚光灯：具有位置、方向和锥形光照范围的光源
    spotLights: {
      value: [],
      properties: {
        color: {}, // 光照颜色和强度
        position: {}, // 光源位置
        direction: {}, // 光照方向
        distance: {}, // 光照距离，超过此距离光照强度为0
        coneCos: {}, // 光锥角度的余弦值，定义光锥的大小
        penumbraCos: {}, // 半影角度的余弦值，定义光锥边缘的软化
        decay: {}, // 光照衰减系数，控制距离衰减
      },
    },

    // 聚光灯阴影参数
    spotLightShadows: {
      value: [],
      properties: {
        shadowIntensity: 1, // 阴影强度
        shadowBias: {}, // 阴影偏移
        shadowNormalBias: {}, // 法线偏移
        shadowRadius: {}, // 阴影模糊半径
        shadowMapSize: {}, // 阴影贴图尺寸
      },
    },

    // 聚光灯贴图数组：用于聚光灯的投影纹理
    spotLightMap: { value: [] },
    // 聚光灯阴影贴图数组：存储聚光灯的阴影贴图
    spotShadowMap: { value: [] },
    // 聚光灯变换矩阵：从世界空间到聚光灯投影空间的变换矩阵
    spotLightMatrix: { value: [] },

    // === 点光源 (Point Light) ===
    // 点光源：从一个点向所有方向发射光线的光源
    pointLights: {
      value: [],
      properties: {
        color: {}, // 光照颜色和强度
        position: {}, // 光源位置
        decay: {}, // 光照衰减系数
        distance: {}, // 光照距离，超过此距离光照强度为0
      },
    },

    // 点光源阴影参数
    pointLightShadows: {
      value: [],
      properties: {
        shadowIntensity: 1, // 阴影强度
        shadowBias: {}, // 阴影偏移
        shadowNormalBias: {}, // 法线偏移
        shadowRadius: {}, // 阴影模糊半径
        shadowMapSize: {}, // 阴影贴图尺寸
        shadowCameraNear: {}, // 阴影相机近平面
        shadowCameraFar: {}, // 阴影相机远平面
      },
    },

    // 点光源阴影贴图数组：存储点光源的立方体阴影贴图
    pointShadowMap: { value: [] },
    // 点光源阴影变换矩阵：从世界空间到点光源阴影空间的变换矩阵
    pointShadowMatrix: { value: [] },

    // === 半球光 (Hemisphere Light) ===
    // 半球光：模拟天空光照的光源，上半球和下半球使用不同颜色
    hemisphereLights: {
      value: [],
      properties: {
        direction: {}, // 半球光的方向（通常指向上方）
        skyColor: {}, // 天空颜色（上半球颜色）
        groundColor: {}, // 地面颜色（下半球颜色）
      },
    },

    // === 矩形区域光 (Rect Area Light) ===
    // 矩形区域光：模拟面光源，如窗户、显示器等
    // TODO: RectAreaLight BRDF 数据需要从示例移动到主源码
    rectAreaLights: {
      value: [],
      properties: {
        color: {}, // 光照颜色和强度
        position: {}, // 矩形光源的位置
        width: {}, // 矩形光源的宽度
        height: {}, // 矩形光源的高度
      },
    },

    // === LTC (Linearly Transformed Cosines) 查找表 ===
    // LTC查找表1：用于矩形区域光的BRDF计算
    ltc_1: { value: null },
    // LTC查找表2：用于矩形区域光的BRDF计算
    ltc_2: { value: null },
  },

  /**
   * 点精灵材质 (Points Material)
   *
   * 用于粒子系统和点云渲染的材质参数。
   * 点精灵是始终面向摄像机的2D四边形，常用于粒子效果。
   */
  points: {
    // 漫反射颜色：点精灵的基础颜色
    diffuse: { value: /*@__PURE__*/ new Color(0xffffff) },
    // 不透明度：点精灵的透明程度
    opacity: { value: 1.0 },
    // 点大小：点精灵的像素大小
    size: { value: 1.0 },
    // 缩放系数：点大小的全局缩放因子
    scale: { value: 1.0 },
    // 点精灵贴图：应用到每个点精灵的纹理
    map: { value: null },
    // Alpha贴图：控制点精灵透明度的贴图
    alphaMap: { value: null },
    // Alpha贴图变换矩阵：控制Alpha贴图的变换
    alphaMapTransform: { value: /*@__PURE__*/ new Matrix3() },
    // Alpha测试阈值：用于硬边透明效果
    alphaTest: { value: 0 },
    // UV变换矩阵：控制纹理坐标的变换
    uvTransform: { value: /*@__PURE__*/ new Matrix3() },
  },

  /**
   * 精灵材质 (Sprite Material)
   *
   * 用于2D精灵渲染的材质参数。
   * 精灵是始终面向摄像机的2D平面，常用于UI元素和广告牌效果。
   */
  sprite: {
    // 漫反射颜色：精灵的基础颜色
    diffuse: { value: /*@__PURE__*/ new Color(0xffffff) },
    // 不透明度：精灵的透明程度
    opacity: { value: 1.0 },
    // 中心点：精灵的旋转和缩放中心点，(0.5, 0.5)为几何中心
    center: { value: /*@__PURE__*/ new Vector2(0.5, 0.5) },
    // 旋转角度：精灵绕中心点的旋转角度（弧度）
    rotation: { value: 0.0 },
    // 精灵贴图：应用到精灵的纹理
    map: { value: null },
    // 贴图变换矩阵：控制精灵贴图的缩放、旋转和平移
    mapTransform: { value: /*@__PURE__*/ new Matrix3() },
    // Alpha贴图：控制精灵透明度的贴图
    alphaMap: { value: null },
    // Alpha贴图变换矩阵：控制Alpha贴图的变换
    alphaMapTransform: { value: /*@__PURE__*/ new Matrix3() },
    // Alpha测试阈值：用于硬边透明效果
    alphaTest: { value: 0 },
  },
};

export { UniformsLib };
