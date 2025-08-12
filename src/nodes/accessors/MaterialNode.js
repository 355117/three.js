// 导入核心节点基类
import Node from "../core/Node.js";
// 导入引用节点相关功能
import { reference } from "./ReferenceNode.js";
// 导入材质引用节点
import { materialReference } from "./MaterialReferenceNode.js";
// 导入法线视图
import { normalView } from "./Normal.js";
// 导入TSL基础类型和函数
import { nodeImmutable, float, vec2, vec3, mat2 } from "../tsl/TSLBase.js";
// 导入统一变量节点
import { uniform } from "../core/UniformNode.js";
// 导入法线贴图节点
import { normalMap } from "../display/NormalMapNode.js";
// 导入凹凸贴图节点
import { bumpMap } from "../display/BumpMapNode.js";
// 导入二维向量类
import { Vector2 } from "../../math/Vector2.js";

// 属性缓存映射，用于存储已创建的材质引用节点
const _propertyCache = new Map();

/**
 * 材质节点类 - 简化对材质属性的节点访问
 * 内部使用引用节点确保材质属性的变化能自动反映到预定义的TSL对象中
 * 例如 `materialColor`
 *
 * @augments Node
 */
class MaterialNode extends Node {
  // 返回节点类型标识符
  static get type() {
    return "MaterialNode";
  }

  /**
   * 构造一个新的材质节点
   *
   * @param {string} scope - 作用域，定义节点引用的材质属性类型
   */
  constructor(scope) {
    // 调用父类构造函数
    super();

    /**
     * 作用域，定义节点引用的材质属性
     *
     * @type {string}
     */
    this.scope = scope;
  }

  /**
   * 返回给定属性和类型的缓存引用节点
   *
   * @param {string} property - 材质属性名称
   * @param {string} type - 属性的统一变量类型
   * @return {MaterialReferenceNode} 表示属性访问的材质引用节点
   */
  getCache(property, type) {
    // 从缓存中获取节点
    let node = _propertyCache.get(property);

    // 如果缓存中不存在，则创建新的材质引用节点
    if (node === undefined) {
      node = materialReference(property, type);

      // 将新创建的节点存入缓存
      _propertyCache.set(property, node);
    }

    return node;
  }

  /**
   * 返回给定属性名称的浮点型材质引用节点
   *
   * @param {string} property - 材质属性名称
   * @return {MaterialReferenceNode<float>} 表示属性访问的材质引用节点
   */
  getFloat(property) {
    return this.getCache(property, "float");
  }

  /**
   * 返回给定属性名称的颜色型材质引用节点
   *
   * @param {string} property - 材质属性名称
   * @return {MaterialReferenceNode<color>} 表示属性访问的材质引用节点
   */
  getColor(property) {
    return this.getCache(property, "color");
  }

  /**
   * 返回给定属性名称的纹理型材质引用节点
   *
   * @param {string} property - 材质属性名称
   * @return {MaterialReferenceNode} 表示属性访问的材质引用节点
   */
  getTexture(property) {
    // 如果属性是"map"则直接使用，否则添加"Map"后缀
    return this.getCache(property === "map" ? "map" : property + "Map", "texture");
  }

  /**
   * 根据选定的作用域进行节点设置
   * 如果多个材质属性在逻辑上属于一起，可能会被组合成单个节点组合
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {Node} 表示选定作用域的节点
   */
  setup(builder) {
    // 从构建器上下文中获取材质对象
    const material = builder.context.material;
    // 获取当前节点的作用域
    const scope = this.scope;

    // 初始化节点变量
    let node = null;

    // 根据作用域类型处理不同的材质属性
    if (scope === MaterialNode.COLOR) {
      // 处理颜色属性：如果材质有颜色则获取颜色节点，否则使用默认的三维向量
      const colorNode = material.color !== undefined ? this.getColor(scope) : vec3();

      // 如果材质有贴图且是纹理类型，则将颜色与贴图相乘
      if (material.map && material.map.isTexture === true) {
        node = colorNode.mul(this.getTexture("map"));
      } else {
        // 否则直接使用颜色节点
        node = colorNode;
      }
    } else if (scope === MaterialNode.OPACITY) {
      // 处理透明度属性：获取透明度浮点节点
      const opacityNode = this.getFloat(scope);

      // 如果材质有透明度贴图且是纹理类型，则将透明度与贴图相乘
      if (material.alphaMap && material.alphaMap.isTexture === true) {
        node = opacityNode.mul(this.getTexture("alpha"));
      } else {
        // 否则直接使用透明度节点
        node = opacityNode;
      }
    } else if (scope === MaterialNode.SPECULAR_STRENGTH) {
      // 处理镜面反射强度属性
      if (material.specularMap && material.specularMap.isTexture === true) {
        // 如果有镜面反射贴图，使用贴图的红色通道
        node = this.getTexture("specular").r;
      } else {
        // 否则使用默认值1.0
        node = float(1);
      }
    } else if (scope === MaterialNode.SPECULAR_INTENSITY) {
      // 处理镜面反射强度属性：获取镜面反射强度节点
      const specularIntensityNode = this.getFloat(scope);

      // 如果材质有镜面反射强度贴图且是纹理类型，则将强度与贴图的alpha通道相乘
      if (material.specularIntensityMap && material.specularIntensityMap.isTexture === true) {
        node = specularIntensityNode.mul(this.getTexture(scope).a);
      } else {
        // 否则直接使用镜面反射强度节点
        node = specularIntensityNode;
      }
    } else if (scope === MaterialNode.SPECULAR_COLOR) {
      // 处理镜面反射颜色属性：获取镜面反射颜色节点
      const specularColorNode = this.getColor(scope);

      // 如果材质有镜面反射颜色贴图且是纹理类型，则将颜色与贴图的RGB通道相乘
      if (material.specularColorMap && material.specularColorMap.isTexture === true) {
        node = specularColorNode.mul(this.getTexture(scope).rgb);
      } else {
        // 否则直接使用镜面反射颜色节点
        node = specularColorNode;
      }
    } else if (scope === MaterialNode.ROUGHNESS) {
      // TODO: 清理相似的分支代码

      // 处理粗糙度属性：获取粗糙度节点
      const roughnessNode = this.getFloat(scope);

      // 如果材质有粗糙度贴图且是纹理类型，则将粗糙度与贴图的绿色通道相乘
      if (material.roughnessMap && material.roughnessMap.isTexture === true) {
        node = roughnessNode.mul(this.getTexture(scope).g);
      } else {
        // 否则直接使用粗糙度节点
        node = roughnessNode;
      }
    } else if (scope === MaterialNode.METALNESS) {
      // 处理金属度属性：获取金属度节点
      const metalnessNode = this.getFloat(scope);

      // 如果材质有金属度贴图且是纹理类型，则将金属度与贴图的蓝色通道相乘
      if (material.metalnessMap && material.metalnessMap.isTexture === true) {
        node = metalnessNode.mul(this.getTexture(scope).b);
      } else {
        // 否则直接使用金属度节点
        node = metalnessNode;
      }
    } else if (scope === MaterialNode.EMISSIVE) {
      // 处理自发光属性：获取自发光强度节点
      const emissiveIntensityNode = this.getFloat("emissiveIntensity");
      // 将自发光颜色与强度相乘
      const emissiveNode = this.getColor(scope).mul(emissiveIntensityNode);

      // 如果材质有自发光贴图且是纹理类型，则将自发光与贴图相乘
      if (material.emissiveMap && material.emissiveMap.isTexture === true) {
        node = emissiveNode.mul(this.getTexture(scope));
      } else {
        // 否则直接使用自发光节点
        node = emissiveNode;
      }
    } else if (scope === MaterialNode.NORMAL) {
      // 处理法线属性
      if (material.normalMap) {
        // 如果有法线贴图，创建法线贴图节点，包含法线缩放参数
        node = normalMap(this.getTexture("normal"), this.getCache("normalScale", "vec2"));
        // 设置法线贴图类型
        node.normalMapType = material.normalMapType;
      } else if (material.bumpMap) {
        // 如果有凹凸贴图，创建凹凸贴图节点，使用红色通道和凹凸缩放参数
        node = bumpMap(this.getTexture("bump").r, this.getFloat("bumpScale"));
      } else {
        // 否则使用默认的法线视图
        node = normalView;
      }
    } else if (scope === MaterialNode.CLEARCOAT) {
      // 处理清漆属性：获取清漆节点
      const clearcoatNode = this.getFloat(scope);

      // 如果材质有清漆贴图且是纹理类型，则将清漆与贴图的红色通道相乘
      if (material.clearcoatMap && material.clearcoatMap.isTexture === true) {
        node = clearcoatNode.mul(this.getTexture(scope).r);
      } else {
        // 否则直接使用清漆节点
        node = clearcoatNode;
      }
    } else if (scope === MaterialNode.CLEARCOAT_ROUGHNESS) {
      // 处理清漆粗糙度属性：获取清漆粗糙度节点
      const clearcoatRoughnessNode = this.getFloat(scope);

      // 如果材质有清漆粗糙度贴图且是纹理类型，则将粗糙度与贴图的红色通道相乘
      if (material.clearcoatRoughnessMap && material.clearcoatRoughnessMap.isTexture === true) {
        node = clearcoatRoughnessNode.mul(this.getTexture(scope).r);
      } else {
        // 否则直接使用清漆粗糙度节点
        node = clearcoatRoughnessNode;
      }
    } else if (scope === MaterialNode.CLEARCOAT_NORMAL) {
      // 处理清漆法线属性
      if (material.clearcoatNormalMap) {
        // 如果有清漆法线贴图，创建法线贴图节点，包含缩放参数
        node = normalMap(this.getTexture(scope), this.getCache(scope + "Scale", "vec2"));
      } else {
        // 否则使用默认的法线视图
        node = normalView;
      }
    } else if (scope === MaterialNode.SHEEN) {
      // 处理光泽属性：将光泽颜色与光泽值相乘
      const sheenNode = this.getColor("sheenColor").mul(this.getFloat("sheen")); // 将此乘法移至CPU

      // 如果材质有光泽颜色贴图且是纹理类型，则将光泽与贴图的RGB通道相乘
      if (material.sheenColorMap && material.sheenColorMap.isTexture === true) {
        node = sheenNode.mul(this.getTexture("sheenColor").rgb);
      } else {
        // 否则直接使用光泽节点
        node = sheenNode;
      }
    } else if (scope === MaterialNode.SHEEN_ROUGHNESS) {
      // 处理光泽粗糙度属性：获取光泽粗糙度节点
      const sheenRoughnessNode = this.getFloat(scope);

      // 如果材质有光泽粗糙度贴图且是纹理类型，则将粗糙度与贴图的alpha通道相乘
      if (material.sheenRoughnessMap && material.sheenRoughnessMap.isTexture === true) {
        node = sheenRoughnessNode.mul(this.getTexture(scope).a);
      } else {
        // 否则直接使用光泽粗糙度节点
        node = sheenRoughnessNode;
      }

      // 将光泽粗糙度限制在0.07到1.0之间
      node = node.clamp(0.07, 1.0);
    } else if (scope === MaterialNode.ANISOTROPY) {
      // 处理各向异性属性
      if (material.anisotropyMap && material.anisotropyMap.isTexture === true) {
        // 如果有各向异性贴图，获取极坐标形式的各向异性数据
        const anisotropyPolar = this.getTexture(scope);
        // 创建各向异性变换矩阵
        const anisotropyMat = mat2(materialAnisotropyVector.x, materialAnisotropyVector.y, materialAnisotropyVector.y.negate(), materialAnisotropyVector.x);

        // 应用变换矩阵到极坐标数据
        node = anisotropyMat.mul(anisotropyPolar.rg.mul(2.0).sub(vec2(1.0)).normalize().mul(anisotropyPolar.b));
      } else {
        // 否则直接使用材质各向异性向量
        node = materialAnisotropyVector;
      }
    } else if (scope === MaterialNode.IRIDESCENCE_THICKNESS) {
      // 处理彩虹色厚度属性：获取厚度范围的最大值
      const iridescenceThicknessMaximum = reference("1", "float", material.iridescenceThicknessRange);

      // 如果有彩虹色厚度贴图
      if (material.iridescenceThicknessMap) {
        // 获取厚度范围的最小值
        const iridescenceThicknessMinimum = reference("0", "float", material.iridescenceThicknessRange);

        // 在最小值和最大值之间插值，使用贴图的绿色通道作为插值因子
        node = iridescenceThicknessMaximum.sub(iridescenceThicknessMinimum).mul(this.getTexture(scope).g).add(iridescenceThicknessMinimum);
      } else {
        // 否则使用最大厚度值
        node = iridescenceThicknessMaximum;
      }
    } else if (scope === MaterialNode.TRANSMISSION) {
      // 处理透射属性：获取透射节点
      const transmissionNode = this.getFloat(scope);

      // 如果有透射贴图，将透射值与贴图的红色通道相乘
      if (material.transmissionMap) {
        node = transmissionNode.mul(this.getTexture(scope).r);
      } else {
        // 否则直接使用透射节点
        node = transmissionNode;
      }
    } else if (scope === MaterialNode.THICKNESS) {
      // 处理厚度属性：获取厚度节点
      const thicknessNode = this.getFloat(scope);

      // 如果有厚度贴图，将厚度值与贴图的绿色通道相乘
      if (material.thicknessMap) {
        node = thicknessNode.mul(this.getTexture(scope).g);
      } else {
        // 否则直接使用厚度节点
        node = thicknessNode;
      }
    } else if (scope === MaterialNode.IOR) {
      // 处理折射率属性：直接获取折射率浮点值
      node = this.getFloat(scope);
    } else if (scope === MaterialNode.LIGHT_MAP) {
      // 处理光照贴图属性：将光照贴图的RGB通道与光照强度相乘
      node = this.getTexture(scope).rgb.mul(this.getFloat("lightMapIntensity"));
    } else if (scope === MaterialNode.AO) {
      // 处理环境光遮蔽属性：计算AO效果 (aoMap.r - 1) * aoMapIntensity + 1
      node = this.getTexture(scope).r.sub(1.0).mul(this.getFloat("aoMapIntensity")).add(1.0);
    } else if (scope === MaterialNode.LINE_DASH_OFFSET) {
      // 处理线条虚线偏移属性：如果材质有虚线偏移则获取值，否则使用0
      node = material.dashOffset ? this.getFloat(scope) : float(0);
    } else {
      // 处理其他未明确定义的属性：根据输出类型获取缓存节点
      const outputType = this.getNodeType(builder);

      node = this.getCache(scope, outputType);
    }

    // 返回构建的节点
    return node;
  }
}

// 材质节点静态常量定义 - 定义各种材质属性的标识符
MaterialNode.ALPHA_TEST = "alphaTest"; // Alpha测试阈值
MaterialNode.COLOR = "color"; // 漫反射颜色
MaterialNode.OPACITY = "opacity"; // 透明度
MaterialNode.SHININESS = "shininess"; // 光泽度
MaterialNode.SPECULAR = "specular"; // 镜面反射
MaterialNode.SPECULAR_STRENGTH = "specularStrength"; // 镜面反射强度
MaterialNode.SPECULAR_INTENSITY = "specularIntensity"; // 镜面反射强度值
MaterialNode.SPECULAR_COLOR = "specularColor"; // 镜面反射颜色
MaterialNode.REFLECTIVITY = "reflectivity"; // 反射率
MaterialNode.ROUGHNESS = "roughness"; // 粗糙度
MaterialNode.METALNESS = "metalness"; // 金属度
MaterialNode.NORMAL = "normal"; // 法线
MaterialNode.CLEARCOAT = "clearcoat"; // 清漆
MaterialNode.CLEARCOAT_ROUGHNESS = "clearcoatRoughness"; // 清漆粗糙度
MaterialNode.CLEARCOAT_NORMAL = "clearcoatNormal"; // 清漆法线
MaterialNode.EMISSIVE = "emissive"; // 自发光
MaterialNode.ROTATION = "rotation"; // 旋转（精灵材质）
MaterialNode.SHEEN = "sheen"; // 光泽
MaterialNode.SHEEN_ROUGHNESS = "sheenRoughness"; // 光泽粗糙度
MaterialNode.ANISOTROPY = "anisotropy"; // 各向异性
MaterialNode.IRIDESCENCE = "iridescence"; // 彩虹色
MaterialNode.IRIDESCENCE_IOR = "iridescenceIOR"; // 彩虹色折射率
MaterialNode.IRIDESCENCE_THICKNESS = "iridescenceThickness"; // 彩虹色厚度
MaterialNode.IOR = "ior"; // 折射率
MaterialNode.TRANSMISSION = "transmission"; // 透射
MaterialNode.THICKNESS = "thickness"; // 厚度
MaterialNode.ATTENUATION_DISTANCE = "attenuationDistance"; // 衰减距离
MaterialNode.ATTENUATION_COLOR = "attenuationColor"; // 衰减颜色
MaterialNode.LINE_SCALE = "scale"; // 线条缩放
MaterialNode.LINE_DASH_SIZE = "dashSize"; // 虚线大小
MaterialNode.LINE_GAP_SIZE = "gapSize"; // 虚线间隙大小
MaterialNode.LINE_WIDTH = "linewidth"; // 线条宽度
MaterialNode.LINE_DASH_OFFSET = "dashOffset"; // 虚线偏移
MaterialNode.POINT_SIZE = "size"; // 点大小
MaterialNode.DISPERSION = "dispersion"; // 色散
MaterialNode.LIGHT_MAP = "light"; // 光照贴图
MaterialNode.AO = "ao"; // 环境光遮蔽

// 导出MaterialNode类作为默认导出
export default MaterialNode;

/**
 * TSL对象 - 表示当前材质的Alpha测试阈值
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialAlphaTest = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.ALPHA_TEST);

/**
 * TSL对象 - 表示当前材质的漫反射颜色
 * 值由 `color` * `map` 组成
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const materialColor = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.COLOR);

/**
 * TSL对象 - 表示当前材质的光泽度
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialShininess = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.SHININESS);

/**
 * TSL对象 - 表示当前材质的自发光颜色
 * 值由 `emissive` * `emissiveIntensity` * `emissiveMap` 组成
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const materialEmissive = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.EMISSIVE);

/**
 * TSL对象 - 表示当前材质的透明度
 * 值由 `opacity` * `alphaMap` 组成
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialOpacity = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.OPACITY);

/**
 * TSL对象 - 表示当前材质的镜面反射
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const materialSpecular = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.SPECULAR);

/**
 * TSL对象 - 表示当前材质的镜面反射强度
 * 值由 `specularIntensity` * `specularMap.a` 组成
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialSpecularIntensity = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.SPECULAR_INTENSITY);

/**
 * TSL对象 - 表示当前材质的镜面反射颜色
 * 值由 `specularColor` * `specularMap.rgb` 组成
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const materialSpecularColor = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.SPECULAR_COLOR);

/**
 * TSL对象 - 表示当前材质的镜面反射强度
 * 值由 `specularMap.r` 组成
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialSpecularStrength = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.SPECULAR_STRENGTH);

/**
 * TSL对象 - 表示当前材质的反射率
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialReflectivity = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.REFLECTIVITY);

/**
 * TSL对象 - 表示当前材质的粗糙度
 * 值由 `roughness` * `roughnessMap.g` 组成
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialRoughness = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.ROUGHNESS);

/**
 * TSL对象 - 表示当前材质的金属度
 * 值由 `metalness` * `metalnessMap.b` 组成
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialMetalness = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.METALNESS);

/**
 * TSL对象 - 表示当前材质的法线
 * 值可能是 `normalMap` * `normalScale`、`bumpMap` * `bumpScale` 或 `normalView`
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const materialNormal = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.NORMAL);

/**
 * TSL对象 - 表示当前材质的清漆
 * 值由 `clearcoat` * `clearcoatMap.r` 组成
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialClearcoat = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.CLEARCOAT);

/**
 * TSL对象 - 表示当前材质的清漆粗糙度
 * 值由 `clearcoatRoughness` * `clearcoatRoughnessMap.r` 组成
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialClearcoatRoughness = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.CLEARCOAT_ROUGHNESS);

/**
 * TSL对象 - 表示当前材质的清漆法线
 * 值可能是 `clearcoatNormalMap` 或 `normalView`
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const materialClearcoatNormal = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.CLEARCOAT_NORMAL);

/**
 * TSL对象 - 表示当前精灵材质的旋转角度
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialRotation = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.ROTATION);

/**
 * TSL对象 - 表示当前材质的光泽颜色
 * 值由 `sheen` * `sheenColor` * `sheenColorMap` 组成
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const materialSheen = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.SHEEN);

/**
 * TSL对象 - 表示当前材质的光泽粗糙度
 * 值由 `sheenRoughness` * `sheenRoughnessMap.a` 组成
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialSheenRoughness = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.SHEEN_ROUGHNESS);

/**
 * TSL对象 - 表示当前材质的各向异性
 *
 * @tsl
 * @type {Node<vec2>}
 */
export const materialAnisotropy = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.ANISOTROPY);

/**
 * TSL对象 - 表示当前材质的彩虹色效果
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialIridescence = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.IRIDESCENCE);

/**
 * TSL对象 - 表示当前材质的彩虹色折射率
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialIridescenceIOR = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.IRIDESCENCE_IOR);

/**
 * TSL对象 - 表示当前材质的彩虹色厚度
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialIridescenceThickness = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.IRIDESCENCE_THICKNESS);

/**
 * TSL对象 - 表示当前材质的透射
 * 值由 `transmission` * `transmissionMap.r` 组成
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialTransmission = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.TRANSMISSION);

/**
 * TSL对象 - 表示当前材质的厚度
 * 值由 `thickness` * `thicknessMap.g` 组成
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialThickness = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.THICKNESS);

/**
 * TSL对象 - 表示当前材质的折射率
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialIOR = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.IOR);

/**
 * TSL对象 - 表示当前材质的衰减距离
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialAttenuationDistance = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.ATTENUATION_DISTANCE);

/**
 * TSL对象 - 表示当前材质的衰减颜色
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const materialAttenuationColor = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.ATTENUATION_COLOR);

/**
 * TSL对象 - 表示当前虚线材质的缩放比例
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialLineScale = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.LINE_SCALE);

/**
 * TSL对象 - 表示当前虚线材质的虚线段大小
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialLineDashSize = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.LINE_DASH_SIZE);

/**
 * TSL对象 - 表示当前虚线材质的间隙大小
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialLineGapSize = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.LINE_GAP_SIZE);

/**
 * TSL对象 - 表示当前线条材质的线宽
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialLineWidth = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.LINE_WIDTH);

/**
 * TSL对象 - 表示当前线条材质的虚线偏移
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialLineDashOffset = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.LINE_DASH_OFFSET);

/**
 * TSL对象 - 表示当前点材质的点大小
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialPointSize = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.POINT_SIZE);

/**
 * TSL对象 - 表示当前材质的色散效果
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialDispersion = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.DISPERSION);

/**
 * TSL对象 - 表示当前材质的光照贴图
 * 值由 `lightMapIntensity` * `lightMap.rgb` 组成
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const materialLightMap = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.LIGHT_MAP);

/**
 * TSL对象 - 表示当前材质的环境光遮蔽贴图
 * 值由 `aoMap.r` - 1 * `aoMapIntensity` + 1 组成
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialAO = /*@__PURE__*/ nodeImmutable(MaterialNode, MaterialNode.AO);

/**
 * TSL对象 - 表示当前材质的各向异性向量
 * 这是一个特殊的统一变量，会根据材质的各向异性和旋转角度动态计算
 *
 * @tsl
 * @type {Node<vec2>}
 */
export const materialAnisotropyVector = /*@__PURE__*/ uniform(new Vector2())
  .onReference(function (frame) {
    // 引用回调：返回当前帧的材质对象
    return frame.material;
  })
  .onRenderUpdate(function ({ material }) {
    // 渲染更新回调：根据材质的各向异性值和旋转角度计算向量
    this.value.set(material.anisotropy * Math.cos(material.anisotropyRotation), material.anisotropy * Math.sin(material.anisotropyRotation));
  });
