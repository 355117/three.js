import Node from "./Node.js"; // 导入Node基类
import { nodeImmutable, nodeObject } from "../tsl/TSLCore.js"; // 导入TSL核心函数

/**
 * 此类表示着色器属性。它可以用于
 * 显式定义属性并为其分配值。
 *
 * ```js
 * const threshold = property( 'float', 'threshold' ).assign( THRESHOLD );
 *```
 * `PropertyNode` 被引擎用于为TSL代码预定义常见的材质属性。
 *
 * @augments Node
 */
class PropertyNode extends Node {
  // 定义PropertyNode类，继承自Node

  static get type() {
    // 静态getter方法，返回节点类型

    return "PropertyNode"; // 返回节点类型字符串
  }

  /**
   * 构造一个新的属性节点。
   *
   * @param {string} nodeType - 节点的类型。
   * @param {?string} [name=null] - 着色器中属性的名称。
   * @param {boolean} [varying=false] - 此属性是否为变量。
   */
  constructor(nodeType, name = null, varying = false) {
    // 构造函数，接受节点类型、名称和变量标志

    super(nodeType); // 调用父类构造函数

    /**
     * 着色器中属性的名称。如果未定义名称，
     * 节点系统会自动生成一个。
     *
     * @type {?string}
     * @default null
     */
    this.name = name; // 存储属性名称

    /**
     * 此属性是否为变量。
     *
     * @type {boolean}
     * @default false
     */
    this.varying = varying; // 存储变量标志

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isPropertyNode = true; // 标识这是一个属性节点对象

    /**
     * 此标志用于全局缓存。
     *
     * @type {boolean}
     * @default true
     */
    this.global = true; // 标识是否为全局属性
  }

  getHash(builder) {
    // 获取哈希值的方法

    return this.name || super.getHash(builder); // 返回属性名称或父类哈希值
  }

  generate(builder) {
    // 生成着色器代码的方法

    let nodeVar; // 声明节点变量

    if (this.varying === true) {
      // 如果是变量属性

      nodeVar = builder.getVaryingFromNode(this, this.name); // 获取变量节点
      nodeVar.needsInterpolation = true; // 设置需要插值
    } else {
      // 如果是普通属性

      nodeVar = builder.getVarFromNode(this, this.name); // 获取变量节点
    }

    return builder.getPropertyName(nodeVar); // 返回属性名称
  }
}

export default PropertyNode; // 导出PropertyNode类作为默认导出

/**
 * 用于创建属性节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {string} type - 节点的类型。
 * @param {?string} [name=null] - 着色器中属性的名称。
 * @returns {PropertyNode}
 */
export const property = (type, name) => nodeObject(new PropertyNode(type, name)); // 导出property函数，用于创建属性节点

/**
 * 用于创建变量属性节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {string} type - 节点的类型。
 * @param {?string} [name=null] - 着色器中变量的名称。
 * @returns {PropertyNode}
 */
export const varyingProperty = (type, name) => nodeObject(new PropertyNode(type, name, true)); // 导出varyingProperty函数，用于创建变量属性节点

/**
 * 表示着色器变量 `DiffuseColor` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<vec4>}
 */
export const diffuseColor = /*@__PURE__*/ nodeImmutable(PropertyNode, "vec4", "DiffuseColor"); // 导出漫反射颜色属性

/**
 * 表示着色器变量 `EmissiveColor` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<vec3>}
 */
export const emissive = /*@__PURE__*/ nodeImmutable(PropertyNode, "vec3", "EmissiveColor"); // 导出自发光颜色属性

/**
 * 表示着色器变量 `Roughness` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const roughness = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "Roughness"); // 导出粗糙度属性

/**
 * 表示着色器变量 `Metalness` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const metalness = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "Metalness"); // 导出金属度属性

/**
 * 表示着色器变量 `Clearcoat` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const clearcoat = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "Clearcoat"); // 导出清漆属性

/**
 * 表示着色器变量 `ClearcoatRoughness` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const clearcoatRoughness = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "ClearcoatRoughness"); // 导出清漆粗糙度属性

/**
 * 表示着色器变量 `Sheen` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<vec3>}
 */
export const sheen = /*@__PURE__*/ nodeImmutable(PropertyNode, "vec3", "Sheen"); // 导出光泽属性

/**
 * 表示着色器变量 `SheenRoughness` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const sheenRoughness = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "SheenRoughness"); // 导出光泽粗糙度属性

/**
 * 表示着色器变量 `Iridescence` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const iridescence = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "Iridescence"); // 导出彩虹色属性

/**
 * 表示着色器变量 `IridescenceIOR` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const iridescenceIOR = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "IridescenceIOR"); // 导出彩虹色折射率属性

/**
 * 表示着色器变量 `IridescenceThickness` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const iridescenceThickness = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "IridescenceThickness"); // 导出彩虹色厚度属性

/**
 * 表示着色器变量 `AlphaT` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const alphaT = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "AlphaT"); // 导出AlphaT属性

/**
 * 表示着色器变量 `Anisotropy` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const anisotropy = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "Anisotropy"); // 导出各向异性属性

/**
 * 表示着色器变量 `AnisotropyT` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<vec3>}
 */
export const anisotropyT = /*@__PURE__*/ nodeImmutable(PropertyNode, "vec3", "AnisotropyT"); // 导出各向异性T向量属性

/**
 * 表示着色器变量 `AnisotropyB` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<vec3>}
 */
export const anisotropyB = /*@__PURE__*/ nodeImmutable(PropertyNode, "vec3", "AnisotropyB"); // 导出各向异性B向量属性

/**
 * 表示着色器变量 `SpecularColor` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<color>}
 */
export const specularColor = /*@__PURE__*/ nodeImmutable(PropertyNode, "color", "SpecularColor"); // 导出镜面反射颜色属性

/**
 * 表示着色器变量 `SpecularF90` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const specularF90 = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "SpecularF90"); // 导出镜面反射F90属性

/**
 * 表示着色器变量 `Shininess` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const shininess = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "Shininess"); // 导出光泽度属性

/**
 * 表示着色器变量 `Output` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<vec4>}
 */
export const output = /*@__PURE__*/ nodeImmutable(PropertyNode, "vec4", "Output"); // 导出输出属性

/**
 * 表示着色器变量 `dashSize` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const dashSize = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "dashSize"); // 导出虚线大小属性

/**
 * 表示着色器变量 `gapSize` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const gapSize = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "gapSize"); // 导出间隙大小属性

/**
 * 表示着色器变量 `pointWidth` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const pointWidth = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "pointWidth"); // 导出点宽度属性

/**
 * 表示着色器变量 `IOR` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const ior = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "IOR"); // 导出折射率属性

/**
 * 表示着色器变量 `Transmission` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const transmission = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "Transmission"); // 导出透射属性

/**
 * 表示着色器变量 `Thickness` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const thickness = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "Thickness"); // 导出厚度属性

/**
 * 表示着色器变量 `AttenuationDistance` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const attenuationDistance = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "AttenuationDistance"); // 导出衰减距离属性

/**
 * 表示着色器变量 `AttenuationColor` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<color>}
 */
export const attenuationColor = /*@__PURE__*/ nodeImmutable(PropertyNode, "color", "AttenuationColor"); // 导出衰减颜色属性

/**
 * 表示着色器变量 `Dispersion` 的TSL对象。
 *
 * @tsl
 * @type {PropertyNode<float>}
 */
export const dispersion = /*@__PURE__*/ nodeImmutable(PropertyNode, "float", "Dispersion"); // 导出色散属性
