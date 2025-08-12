// 从光照节点模块导入基础类
import LightingNode from "./LightingNode.js";
// 从缓存节点模块导入cache函数
import { cache } from "../core/CacheNode.js";
// 从属性节点模块导入粗糙度和清漆粗糙度
import { roughness, clearcoatRoughness } from "../core/PropertyNode.js";
// 从相机访问器模块导入相机视图矩阵
import { cameraViewMatrix } from "../accessors/Camera.js";
// 从法线访问器模块导入各种法线（视图空间、清漆法线、世界空间）
import { normalView, clearcoatNormalView, normalWorld } from "../accessors/Normal.js";
// 从位置访问器模块导入位置视图方向
import { positionViewDirection } from "../accessors/Position.js";
// 从TSL基础模块导入浮点数类型
import { float } from "../tsl/TSLBase.js";
// 从访问器工具模块导入弯曲法线视图
import { bentNormalView } from "../accessors/AccessorsUtils.js";
// 从PMREM节点模块导入PMREM纹理函数
import { pmremTexture } from "../pmrem/PMREMNode.js";
// 从材质属性访问器模块导入材质环境强度
import { materialEnvIntensity } from "../accessors/MaterialProperties.js";

// 环境节点缓存，用于避免重复创建相同的PMREM纹理
const _envNodeCache = new WeakMap();

/**
 * 环境节点类
 *
 * 表示基于图像的光照(IBL)的物理模型。环境通过等距柱状投影、
 * 立方体贴图或cubeUV(PMREM)格式的环境贴图来定义。
 * `EnvironmentNode` 专为PBR材质设计，如 {@link MeshStandardNodeMaterial}。
 *
 * IBL的物理基础：
 * - 基于真实光照：使用真实世界的光照数据
 * - 能量守恒：符合物理光照的能量守恒原理
 * - 多重散射：考虑光线的多次反射和散射
 * - 各向异性支持：支持各向异性材质的反射
 *
 * PMREM技术：
 * - 预过滤环境贴图：为不同粗糙度预计算反射
 * - Mip链生成：自动生成多级细节纹理
 * - 重要性采样：优化的采样策略提高质量
 * - GPU友好：针对实时渲染优化
 *
 * 支持的环境贴图格式：
 * - 等距柱状投影(Equirectangular)：全景图格式
 * - 立方体贴图(Cube Map)：六面体格式
 * - cubeUV(PMREM)：优化的立方体UV格式
 *
 * 与传统环境映射的优势：
 * - 更准确的物理模型
 * - 更好的材质响应
 * - 支持复杂的光照交互
 * - 更高的视觉质量
 *
 * @augments LightingNode
 */
class EnvironmentNode extends LightingNode {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'EnvironmentNode'
   */
  static get type() {
    return "EnvironmentNode";
  }

  /**
   * 构造一个新的环境节点
   *
   * @param {Node} [envNode=null] - 表示环境的节点，可以是纹理节点或材质引用节点
   */
  constructor(envNode = null) {
    // 调用父类构造函数
    super();

    /**
     * 表示环境的节点
     *
     * 存储环境贴图数据的节点，支持多种类型：
     * - TextureNode：直接的纹理节点
     * - MaterialReferenceNode：材质属性引用
     * - 其他环境数据源
     *
     * @type {?Node}
     * @default null
     */
    this.envNode = envNode;
  }

  /**
   * 设置环境节点的IBL计算
   *
   * 配置基于图像的光照计算，包括辐射度和辐照度的计算。
   * 支持各向异性材质和清漆层的处理。
   *
   * @param {NodeBuilder} builder - 节点构建器，包含材质和光照上下文信息
   */
  setup(builder) {
    // 获取材质引用
    const { material } = builder;

    // 获取环境节点的引用
    let envNode = this.envNode;

    // 处理纹理节点或材质引用节点
    if (envNode.isTextureNode || envNode.isMaterialReferenceNode) {
      // 获取实际的纹理值：直接从纹理节点或从材质属性中获取
      const value = envNode.isTextureNode ? envNode.value : material[envNode.property];

      // 检查缓存中是否已有对应的PMREM纹理
      let cacheEnvNode = _envNodeCache.get(value);

      // 如果缓存中没有，创建新的PMREM纹理并缓存
      if (cacheEnvNode === undefined) {
        // 创建PMREM纹理，用于高效的IBL计算
        cacheEnvNode = pmremTexture(value);

        // 将创建的PMREM纹理存入缓存
        _envNodeCache.set(value, cacheEnvNode);
      }

      // 使用缓存的PMREM纹理
      envNode = cacheEnvNode;
    }

    // 检查材质是否使用各向异性
    const useAnisotropy = material.useAnisotropy === true || material.anisotropy > 0;
    // 根据是否使用各向异性选择合适的法线：弯曲法线或标准法线
    const radianceNormalView = useAnisotropy ? bentNormalView : normalView;

    // 计算辐射度：使用辐射度上下文进行环境贴图采样，并乘以环境强度
    const radiance = envNode.context(createRadianceContext(roughness, radianceNormalView)).mul(materialEnvIntensity);
    // 计算辐照度：使用辐照度上下文进行环境贴图采样，乘以π和环境强度
    const irradiance = envNode.context(createIrradianceContext(normalWorld)).mul(Math.PI).mul(materialEnvIntensity);

    // 缓存辐射度和辐照度计算结果，避免重复计算
    const isolateRadiance = cache(radiance);
    const isolateIrradiance = cache(irradiance);

    // 将计算得到的辐射度添加到光照上下文中
    builder.context.radiance.addAssign(isolateRadiance);

    // 将计算得到的IBL辐照度添加到光照上下文中
    builder.context.iblIrradiance.addAssign(isolateIrradiance);

    // 处理清漆层的辐射度（如果材质支持清漆效果）
    const clearcoatRadiance = builder.context.lightingModel.clearcoatRadiance;

    if (clearcoatRadiance) {
      // 使用清漆粗糙度和清漆法线计算清漆层的辐射度
      const clearcoatRadianceContext = envNode.context(createRadianceContext(clearcoatRoughness, clearcoatNormalView)).mul(materialEnvIntensity);
      // 缓存清漆辐射度计算结果
      const isolateClearcoatRadiance = cache(clearcoatRadianceContext);

      // 将清漆辐射度添加到清漆辐射度上下文中
      clearcoatRadiance.addAssign(isolateClearcoatRadiance);
    }
  }
}

// 导出环境节点类作为默认导出
export default EnvironmentNode;

/**
 * 创建辐射度上下文
 *
 * 为环境贴图的辐射度采样创建上下文对象。辐射度用于计算镜面反射，
 * 需要根据视图方向和表面法线计算反射向量。
 *
 * @param {Node} roughnessNode - 材质粗糙度节点，用于控制反射的模糊程度
 * @param {Node} normalViewNode - 视图空间的法线节点，用于计算反射方向
 * @returns {Object} 辐射度上下文对象，包含UV计算和纹理级别方法
 */
const createRadianceContext = (roughnessNode, normalViewNode) => {
  // 缓存反射向量，避免重复计算
  let reflectVec = null;

  return {
    /**
     * 获取环境贴图采样的UV坐标
     *
     * 计算用于环境贴图采样的反射向量。对于粗糙表面，
     * 会在反射向量和法线之间进行插值以模拟粗糙度效果。
     *
     * @returns {Node} 反射向量，用作环境贴图的采样方向
     */
    getUV: () => {
      if (reflectVec === null) {
        // 计算基础反射向量：视图方向的反射
        reflectVec = positionViewDirection.negate().reflect(normalViewNode);

        // 将反射向量与法线混合，这样更准确，并防止粗糙物体从其切平面后方收集光线
        // 粗糙度越高，越接近法线方向，模拟粗糙表面的漫散射效果
        reflectVec = roughnessNode.mul(roughnessNode).mix(reflectVec, normalViewNode).normalize();

        // 将反射向量从视图空间转换到世界空间
        reflectVec = reflectVec.transformDirection(cameraViewMatrix);
      }

      return reflectVec;
    },
    /**
     * 获取纹理采样的Mip级别
     *
     * 返回用于环境贴图采样的Mip级别，直接使用粗糙度值。
     * 粗糙度越高，使用越高的Mip级别（越模糊的纹理）。
     *
     * @returns {Node} 粗糙度节点，用作纹理的Mip级别
     */
    getTextureLevel: () => {
      return roughnessNode;
    },
  };
};

/**
 * 创建辐照度上下文
 *
 * 为环境贴图的辐照度采样创建上下文对象。辐照度用于计算漫反射，
 * 直接使用世界空间的法线方向进行采样。
 *
 * @param {Node} normalWorldNode - 世界空间的法线节点，用于环境贴图采样
 * @returns {Object} 辐照度上下文对象，包含UV计算和纹理级别方法
 */
const createIrradianceContext = (normalWorldNode) => {
  return {
    /**
     * 获取环境贴图采样的UV坐标
     *
     * 对于辐照度计算，直接使用世界空间的法线作为采样方向。
     * 这样可以获得该方向上的环境光照信息。
     *
     * @returns {Node} 世界空间法线，用作环境贴图的采样方向
     */
    getUV: () => {
      return normalWorldNode;
    },
    /**
     * 获取纹理采样的Mip级别
     *
     * 对于辐照度计算，使用最高的Mip级别（最模糊的版本），
     * 因为辐照度需要对整个半球进行积分。
     *
     * @returns {Node} 固定值1.0，表示使用最高Mip级别
     */
    getTextureLevel: () => {
      return float(1.0);
    },
  };
};
