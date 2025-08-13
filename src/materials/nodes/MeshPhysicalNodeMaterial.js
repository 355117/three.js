// 导入物理材质相关的属性节点：清漆、光泽、彩虹色、各向异性、透射、色散等
import {
  clearcoat,
  clearcoatRoughness,
  sheen,
  sheenRoughness,
  iridescence,
  iridescenceIOR,
  iridescenceThickness,
  specularColor,
  specularF90,
  diffuseColor,
  metalness,
  roughness,
  anisotropy,
  alphaT,
  anisotropyT,
  anisotropyB,
  ior,
  transmission,
  thickness,
  attenuationDistance,
  attenuationColor,
  dispersion,
} from "../../nodes/core/PropertyNode.js";
// 导入材质节点访问器，用于获取材质的各种物理属性
import {
  materialClearcoat,
  materialClearcoatRoughness,
  materialClearcoatNormal,
  materialSheen,
  materialSheenRoughness,
  materialIridescence,
  materialIridescenceIOR,
  materialIridescenceThickness,
  materialSpecularIntensity,
  materialSpecularColor,
  materialAnisotropy,
  materialIOR,
  materialTransmission,
  materialThickness,
  materialAttenuationDistance,
  materialAttenuationColor,
  materialDispersion,
} from "../../nodes/accessors/MaterialNode.js";
// 导入 TSL 基础类型和条件语句节点
import { float, vec2, vec3, If } from "../../nodes/tsl/TSLBase.js";
// 导入粗糙度计算函数
import getRoughness from "../../nodes/functions/material/getRoughness.js";
// 导入切线-双切线-法线视图矩阵，用于各向异性计算
import { TBNViewMatrix } from "../../nodes/accessors/AccessorsUtils.js";
// 导入物理光照模型
import PhysicalLightingModel from "../../nodes/functions/PhysicalLightingModel.js";
// 导入网格标准节点材质基类
import MeshStandardNodeMaterial from "./MeshStandardNodeMaterial.js";
// 导入数学节点函数：混合、平方、最小值
import { mix, pow2, min } from "../../nodes/math/MathNode.js";
// 导入子构建节点，用于构建子着色器
import { subBuild } from "../../nodes/core/SubBuildNode.js";

// 导入网格物理材质基类
import { MeshPhysicalMaterial } from "../MeshPhysicalMaterial.js";

// 创建默认值实例，使用纯函数标记进行优化
const _defaultValues = /*@__PURE__*/ new MeshPhysicalMaterial();

/**
 * 网格物理节点材质类 - {@link MeshPhysicalMaterial} 的节点版本
 *
 * 物理材质是 Three.js 中最高级的材质类型，基于物理的渲染（PBR）原理。
 * 它扩展了标准材质，添加了多种高级物理特性：
 * - Clearcoat（清漆）：模拟表面涂层效果
 * - Sheen（光泽）：模拟织物等材质的边缘光泽
 * - Iridescence（彩虹色）：模拟薄膜干涉效应
 * - Anisotropy（各向异性）：模拟拉丝金属等定向反射
 * - Transmission（透射）：模拟玻璃等透明材质
 * - Dispersion（色散）：模拟光的色散效应
 *
 * @augments MeshStandardNodeMaterial
 */
class MeshPhysicalNodeMaterial extends MeshStandardNodeMaterial {
  // 静态方法：返回材质类型标识符
  static get type() {
    // 返回材质类型名称，用于材质系统识别
    return "MeshPhysicalNodeMaterial";
  }

  /**
   * 构造函数：创建新的网格物理节点材质实例
   *
   * @param {Object} [parameters] - 可选的配置参数对象，用于初始化材质属性
   */
  constructor(parameters) {
    // 调用父类构造函数，初始化标准材质基础功能
    super();

    /**
     * 类型标识标志，用于运行时类型检测
     *
     * 这个标志可以用来快速判断一个对象是否为 MeshPhysicalNodeMaterial 实例，
     * 避免使用 instanceof 操作符带来的性能开销
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMeshPhysicalNodeMaterial = true;

    /**
     * 清漆节点
     *
     * 物理材质的清漆效果默认从 `clearcoat` 和 `clearcoatMap` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义清漆效果。
     *
     * 清漆是一种透明的表面涂层，常见于汽车漆面、木器漆等，
     * 可以在材质表面形成额外的反射层。
     *
     * 如果你不想覆盖清漆而是修改现有值，
     * 请使用 {@link materialClearcoat}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.clearcoatNode = null;

    /**
     * 清漆粗糙度节点
     *
     * 物理材质的清漆粗糙度默认从 `clearcoatRoughness` 和 `clearcoatRoughnessMap`
     * 属性推断。这个节点属性允许覆盖默认值，并使用节点来定义清漆粗糙度。
     *
     * 清漆粗糙度控制清漆层的反射模糊程度，值越小反射越清晰。
     *
     * 如果你不想覆盖清漆粗糙度而是修改现有值，
     * 请使用 {@link materialClearcoatRoughness}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.clearcoatRoughnessNode = null;

    /**
     * 清漆法线节点
     *
     * 物理材质的清漆法线默认从 `clearcoatNormalMap` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义清漆法线。
     *
     * 清漆法线贴图可以为清漆层添加细节凹凸效果，
     * 独立于基础材质的法线贴图。
     *
     * 如果你不想覆盖清漆法线而是修改现有值，
     * 请使用 {@link materialClearcoatNormal}。
     *
     * @type {?Node<vec3>}
     * @default null
     */
    this.clearcoatNormalNode = null;

    /**
     * 光泽节点
     *
     * 物理材质的光泽效果默认从 `sheen`、`sheenColor` 和 `sheenColorMap`
     * 属性推断。这个节点属性允许覆盖默认值，并使用节点来定义光泽效果。
     *
     * 光泽效果主要用于模拟织物、天鹅绒等材质在边缘处的特殊反射，
     * 产生柔和的边缘光晕效果。
     *
     * 如果你不想覆盖光泽而是修改现有值，
     * 请使用 {@link materialSheen}。
     *
     * @type {?Node<vec3>}
     * @default null
     */
    this.sheenNode = null;

    /**
     * 光泽粗糙度节点
     *
     * 物理材质的光泽粗糙度默认从 `sheenRoughness` 和 `sheenRoughnessMap`
     * 属性推断。这个节点属性允许覆盖默认值，并使用节点来定义光泽粗糙度。
     *
     * 光泽粗糙度控制光泽效果的扩散程度，影响边缘光晕的柔和度。
     *
     * 如果你不想覆盖光泽粗糙度而是修改现有值，
     * 请使用 {@link materialSheenRoughness}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.sheenRoughnessNode = null;

    /**
     * 彩虹色节点
     *
     * 物理材质的彩虹色效果默认从 `iridescence` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义彩虹色效果。
     *
     * 彩虹色效果模拟薄膜干涉现象，如肥皂泡、油膜、昆虫翅膀等
     * 在不同角度下呈现的彩色光泽效果。
     *
     * 如果你不想覆盖彩虹色而是修改现有值，
     * 请使用 {@link materialIridescence}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.iridescenceNode = null;

    /**
     * 彩虹色折射率节点
     *
     * 物理材质的彩虹色折射率默认从 `iridescenceIOR` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义彩虹色折射率。
     *
     * 彩虹色折射率控制薄膜的光学特性，影响干涉效应的强度和颜色分布。
     * 不同的折射率会产生不同的彩虹色效果。
     *
     * 如果你不想覆盖彩虹色折射率而是修改现有值，
     * 请使用 {@link materialIridescenceIOR}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.iridescenceIORNode = null;

    /**
     * 彩虹色厚度节点
     *
     * 物理材质的彩虹色厚度默认从 `iridescenceThicknessRange` 和
     * `iridescenceThicknessMap` 属性推断。这个节点属性允许覆盖默认值，
     * 并使用节点来定义彩虹色厚度。
     *
     * 彩虹色厚度控制薄膜的物理厚度，直接影响干涉条纹的间距和颜色。
     * 不同厚度会产生不同的彩虹色模式。
     *
     * 如果你不想覆盖彩虹色厚度而是修改现有值，
     * 请使用 {@link materialIridescenceThickness}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.iridescenceThicknessNode = null;

    /**
     * 镜面反射强度节点
     *
     * 物理材质的镜面反射强度默认从 `specularIntensity` 和 `specularIntensityMap`
     * 属性推断。这个节点属性允许覆盖默认值，并使用节点来定义镜面反射强度。
     *
     * 镜面反射强度控制材质表面反射光线的强度，影响高光的亮度。
     * 这是 PBR 材质中控制反射特性的重要参数。
     *
     * 如果你不想覆盖镜面反射强度而是修改现有值，
     * 请使用 {@link materialSpecularIntensity}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.specularIntensityNode = null;

    /**
     * 镜面反射颜色节点
     *
     * 物理材质的镜面反射颜色默认从 `specularColor` 和 `specularColorMap`
     * 属性推断。这个节点属性允许覆盖默认值，并使用节点来定义镜面反射颜色。
     *
     * 镜面反射颜色控制反射光线的色调，可以模拟有色金属等材质的
     * 特殊反射颜色效果。
     *
     * 如果你不想覆盖镜面反射颜色而是修改现有值，
     * 请使用 {@link materialSpecularColor}。
     *
     * @type {?Node<vec3>}
     * @default null
     */
    this.specularColorNode = null;

    /**
     * 折射率节点
     *
     * 物理材质的折射率默认从 `ior` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义折射率。
     *
     * 折射率（Index of Refraction）是材质的基本光学属性，
     * 影响菲涅尔反射和透射效果。不同材质有不同的折射率：
     * 空气≈1.0，水≈1.33，玻璃≈1.5，钻石≈2.42。
     *
     * 如果你不想覆盖折射率而是修改现有值，
     * 请使用 {@link materialIOR}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.iorNode = null;

    /**
     * 透射节点
     *
     * 物理材质的透射效果默认从 `transmission` 和 `transmissionMap`
     * 属性推断。这个节点属性允许覆盖默认值，并使用节点来定义透射效果。
     *
     * 透射效果用于模拟玻璃、水晶等透明材质，允许光线穿透材质
     * 并产生折射效果。透射值控制材质的透明程度。
     *
     * 如果你不想覆盖透射而是修改现有值，
     * 请使用 {@link materialTransmission}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.transmissionNode = null;

    /**
     * 厚度节点
     *
     * 物理材质的厚度默认从 `thickness` 和 `thicknessMap`
     * 属性推断。这个节点属性允许覆盖默认值，并使用节点来定义厚度。
     *
     * 厚度参数影响透射材质的光线传播距离，与衰减效果配合使用，
     * 可以模拟不同厚度的透明材质对光线的影响。
     *
     * 如果你不想覆盖厚度而是修改现有值，
     * 请使用 {@link materialThickness}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.thicknessNode = null;

    /**
     * 衰减距离节点
     *
     * 物理材质的衰减距离默认从 `attenuationDistance` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义衰减距离。
     *
     * 衰减距离控制光线在透明材质中传播时的衰减速度，
     * 模拟真实材质对光线的吸收效应。距离越短，衰减越快。
     *
     * 如果你不想覆盖衰减距离而是修改现有值，
     * 请使用 {@link materialAttenuationDistance}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.attenuationDistanceNode = null;

    /**
     * 衰减颜色节点
     *
     * 物理材质的衰减颜色默认从 `attenuationColor` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义衰减颜色。
     *
     * 衰减颜色控制光线在透明材质中传播时的颜色变化，
     * 可以模拟有色玻璃等材质的颜色过滤效果。
     *
     * 如果你不想覆盖衰减颜色而是修改现有值，
     * 请使用 {@link materialAttenuationColor}。
     *
     * @type {?Node<vec3>}
     * @default null
     */
    this.attenuationColorNode = null;

    /**
     * 色散节点
     *
     * 物理材质的色散效果默认从 `dispersion` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义色散效果。
     *
     * 色散效果模拟光线通过透明材质时不同波长的光发生不同程度的折射，
     * 产生彩虹色分离效果，如三棱镜分光、钻石的火彩效果等。
     *
     * 如果你不想覆盖色散而是修改现有值，
     * 请使用 {@link materialDispersion}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.dispersionNode = null;

    /**
     * 各向异性节点
     *
     * 物理材质的各向异性效果默认从 `anisotropy` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义各向异性效果。
     *
     * 各向异性效果模拟具有方向性反射特征的材质，如拉丝金属、
     * 碳纤维等，在不同方向上呈现不同的反射特性。
     *
     * 如果你不想覆盖各向异性而是修改现有值，
     * 请使用 {@link materialAnisotropy}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.anisotropyNode = null;

    // 设置材质的默认属性值
    this.setDefaultValues(_defaultValues);

    // 应用用户传入的参数，覆盖默认值
    this.setValues(parameters);
  }

  /**
   * 检查光照模型是否应该使用清漆效果
   *
   * 当清漆强度大于0或设置了清漆节点时，返回true。
   * 这个属性用于光照模型的条件编译，只有在需要时才启用清漆计算。
   *
   * @type {boolean}
   * @default true
   */
  get useClearcoat() {
    // 检查清漆强度是否大于0，或者是否设置了自定义清漆节点
    return this.clearcoat > 0 || this.clearcoatNode !== null;
  }

  /**
   * 检查光照模型是否应该使用彩虹色效果
   *
   * 当彩虹色强度大于0或设置了彩虹色节点时，返回true。
   * 这个属性用于光照模型的条件编译，只有在需要时才启用彩虹色计算。
   *
   * @type {boolean}
   * @default true
   */
  get useIridescence() {
    // 检查彩虹色强度是否大于0，或者是否设置了自定义彩虹色节点
    return this.iridescence > 0 || this.iridescenceNode !== null;
  }

  /**
   * 检查光照模型是否应该使用光泽效果
   *
   * 当光泽强度大于0或设置了光泽节点时，返回true。
   * 这个属性用于光照模型的条件编译，只有在需要时才启用光泽计算。
   *
   * @type {boolean}
   * @default true
   */
  get useSheen() {
    // 检查光泽强度是否大于0，或者是否设置了自定义光泽节点
    return this.sheen > 0 || this.sheenNode !== null;
  }

  /**
   * 检查光照模型是否应该使用各向异性效果
   *
   * 当各向异性强度大于0或设置了各向异性节点时，返回true。
   * 这个属性用于光照模型的条件编译，只有在需要时才启用各向异性计算。
   *
   * @type {boolean}
   * @default true
   */
  get useAnisotropy() {
    // 检查各向异性强度是否大于0，或者是否设置了自定义各向异性节点
    return this.anisotropy > 0 || this.anisotropyNode !== null;
  }

  /**
   * 检查光照模型是否应该使用透射效果
   *
   * 当透射强度大于0或设置了透射节点时，返回true。
   * 这个属性用于光照模型的条件编译，只有在需要时才启用透射计算。
   *
   * @type {boolean}
   * @default true
   */
  get useTransmission() {
    // 检查透射强度是否大于0，或者是否设置了自定义透射节点
    return this.transmission > 0 || this.transmissionNode !== null;
  }

  /**
   * 检查光照模型是否应该使用色散效果
   *
   * 当色散强度大于0或设置了色散节点时，返回true。
   * 这个属性用于光照模型的条件编译，只有在需要时才启用色散计算。
   *
   * @type {boolean}
   * @default true
   */
  get useDispersion() {
    // 检查色散强度是否大于0，或者是否设置了自定义色散节点
    return this.dispersion > 0 || this.dispersionNode !== null;
  }

  /**
   * 设置镜面反射相关的节点变量
   *
   * 这个方法配置物理材质的镜面反射特性，包括折射率、镜面反射颜色
   * 和菲涅尔反射系数的计算。这些参数是 PBR 材质的核心组成部分。
   */
  setupSpecular() {
    // 确定折射率节点：如果设置了自定义折射率节点则使用它，否则使用材质的默认折射率
    const iorNode = this.iorNode ? float(this.iorNode) : materialIOR;

    // 将计算出的折射率赋值给全局折射率属性
    ior.assign(iorNode);

    // 计算镜面反射颜色：使用菲涅尔公式计算基础反射率，与漫反射颜色根据金属度进行混合
    specularColor.assign(mix(min(pow2(ior.sub(1.0).div(ior.add(1.0))).mul(materialSpecularColor), vec3(1.0)).mul(materialSpecularIntensity), diffuseColor.rgb, metalness));

    // 计算 F90 菲涅尔反射系数（掠射角反射率），根据金属度在镜面反射强度和1.0之间混合
    specularF90.assign(mix(materialSpecularIntensity, 1.0, metalness));
  }

  /**
   * 设置光照模型
   *
   * 创建并配置物理光照模型，根据材质的特性启用相应的物理效果。
   * 这个方法决定了最终渲染时会使用哪些高级物理特性。
   *
   * @return {PhysicalLightingModel} 配置好的物理光照模型实例
   */
  setupLightingModel(/*builder*/) {
    // 创建物理光照模型，传入各种物理特性的启用状态
    return new PhysicalLightingModel(this.useClearcoat, this.useSheen, this.useIridescence, this.useAnisotropy, this.useTransmission, this.useDispersion);
  }

  /**
   * 设置物理材质特定的节点变量和渲染逻辑
   *
   * 这个方法是物理材质的核心配置方法，负责设置所有高级物理特性的
   * 节点变量和计算逻辑。它会根据材质的特性启用状态，有条件地
   * 配置各种物理效果。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器，用于构建着色器代码
   */
  setupVariants(builder) {
    // 调用父类方法，设置标准材质的基础变量
    super.setupVariants(builder);

    // ===== 清漆效果设置 =====
    // 清漆是一种透明的表面涂层，在材质表面形成额外的反射层

    if (this.useClearcoat) {
      // 确定清漆强度节点：如果设置了自定义清漆节点则使用它，否则使用材质的默认清漆
      const clearcoatNode = this.clearcoatNode ? float(this.clearcoatNode) : materialClearcoat;
      // 确定清漆粗糙度节点：如果设置了自定义清漆粗糙度节点则使用它，否则使用材质的默认清漆粗糙度
      const clearcoatRoughnessNode = this.clearcoatRoughnessNode ? float(this.clearcoatRoughnessNode) : materialClearcoatRoughness;

      // 将计算出的清漆强度赋值给全局清漆属性
      clearcoat.assign(clearcoatNode);
      // 将计算出的清漆粗糙度赋值给全局清漆粗糙度属性，使用粗糙度处理函数
      clearcoatRoughness.assign(getRoughness({ roughness: clearcoatRoughnessNode }));
    }

    // ===== 光泽效果设置 =====
    // 光泽效果主要用于模拟织物、天鹅绒等材质在边缘处的特殊反射

    if (this.useSheen) {
      // 确定光泽颜色节点：如果设置了自定义光泽节点则使用它，否则使用材质的默认光泽
      const sheenNode = this.sheenNode ? vec3(this.sheenNode) : materialSheen;
      // 确定光泽粗糙度节点：如果设置了自定义光泽粗糙度节点则使用它，否则使用材质的默认光泽粗糙度
      const sheenRoughnessNode = this.sheenRoughnessNode ? float(this.sheenRoughnessNode) : materialSheenRoughness;

      // 将计算出的光泽颜色赋值给全局光泽属性
      sheen.assign(sheenNode);
      // 将计算出的光泽粗糙度赋值给全局光泽粗糙度属性
      sheenRoughness.assign(sheenRoughnessNode);
    }

    // ===== 彩虹色效果设置 =====
    // 彩虹色效果模拟薄膜干涉现象，如肥皂泡、油膜等在不同角度下的彩色光泽

    if (this.useIridescence) {
      // 确定彩虹色强度节点：如果设置了自定义彩虹色节点则使用它，否则使用材质的默认彩虹色
      const iridescenceNode = this.iridescenceNode ? float(this.iridescenceNode) : materialIridescence;
      // 确定彩虹色折射率节点：如果设置了自定义彩虹色折射率节点则使用它，否则使用材质的默认彩虹色折射率
      const iridescenceIORNode = this.iridescenceIORNode ? float(this.iridescenceIORNode) : materialIridescenceIOR;
      // 确定彩虹色厚度节点：如果设置了自定义彩虹色厚度节点则使用它，否则使用材质的默认彩虹色厚度
      const iridescenceThicknessNode = this.iridescenceThicknessNode ? float(this.iridescenceThicknessNode) : materialIridescenceThickness;

      // 将计算出的彩虹色强度赋值给全局彩虹色属性
      iridescence.assign(iridescenceNode);
      // 将计算出的彩虹色折射率赋值给全局彩虹色折射率属性
      iridescenceIOR.assign(iridescenceIORNode);
      // 将计算出的彩虹色厚度赋值给全局彩虹色厚度属性
      iridescenceThickness.assign(iridescenceThicknessNode);
    }

    // ===== 各向异性效果设置 =====
    // 各向异性效果模拟具有方向性反射特征的材质，如拉丝金属、碳纤维等

    if (this.useAnisotropy) {
      // 获取各向异性向量：如果设置了自定义各向异性节点则使用它，否则使用材质的默认各向异性
      // toVar() 将节点转换为变量，允许后续修改
      const anisotropyV = (this.anisotropyNode ? vec2(this.anisotropyNode) : materialAnisotropy).toVar();

      // 计算各向异性强度（向量的长度）
      anisotropy.assign(anisotropyV.length());

      // 处理各向异性向量的归一化
      If(anisotropy.equal(0.0), () => {
        // 如果各向异性强度为0，设置默认方向向量
        anisotropyV.assign(vec2(1.0, 0.0));
      }).Else(() => {
        // 如果各向异性强度不为0，将向量归一化并限制强度范围
        anisotropyV.divAssign(vec2(anisotropy));
        anisotropy.assign(anisotropy.saturate());
      });

      // 计算切线方向的粗糙度：
      // 各向异性双切线方向的粗糙度是材质粗糙度，而切线粗糙度随各向异性增加
      alphaT.assign(anisotropy.pow2().mix(roughness.pow2(), 1.0));

      // 计算各向异性的切线和双切线向量
      // 使用 TBN 矩阵将各向异性向量转换到世界空间
      anisotropyT.assign(TBNViewMatrix[0].mul(anisotropyV.x).add(TBNViewMatrix[1].mul(anisotropyV.y)));
      anisotropyB.assign(TBNViewMatrix[1].mul(anisotropyV.x).sub(TBNViewMatrix[0].mul(anisotropyV.y)));
    }

    // ===== 透射效果设置 =====
    // 透射效果用于模拟玻璃、水晶等透明材质，允许光线穿透并产生折射

    if (this.useTransmission) {
      // 确定透射强度节点：如果设置了自定义透射节点则使用它，否则使用材质的默认透射
      const transmissionNode = this.transmissionNode ? float(this.transmissionNode) : materialTransmission;
      // 确定厚度节点：如果设置了自定义厚度节点则使用它，否则使用材质的默认厚度
      const thicknessNode = this.thicknessNode ? float(this.thicknessNode) : materialThickness;
      // 确定衰减距离节点：如果设置了自定义衰减距离节点则使用它，否则使用材质的默认衰减距离
      const attenuationDistanceNode = this.attenuationDistanceNode ? float(this.attenuationDistanceNode) : materialAttenuationDistance;
      // 确定衰减颜色节点：如果设置了自定义衰减颜色节点则使用它，否则使用材质的默认衰减颜色
      const attenuationColorNode = this.attenuationColorNode ? vec3(this.attenuationColorNode) : materialAttenuationColor;

      // 将计算出的透射强度赋值给全局透射属性
      transmission.assign(transmissionNode);
      // 将计算出的厚度赋值给全局厚度属性
      thickness.assign(thicknessNode);
      // 将计算出的衰减距离赋值给全局衰减距离属性
      attenuationDistance.assign(attenuationDistanceNode);
      // 将计算出的衰减颜色赋值给全局衰减颜色属性
      attenuationColor.assign(attenuationColorNode);

      // ===== 色散效果设置 =====
      // 色散效果模拟光线通过透明材质时不同波长的光发生不同程度的折射
      if (this.useDispersion) {
        // 确定色散强度节点：如果设置了自定义色散节点则使用它，否则使用材质的默认色散
        const dispersionNode = this.dispersionNode ? float(this.dispersionNode) : materialDispersion;

        // 将计算出的色散强度赋值给全局色散属性
        dispersion.assign(dispersionNode);
      }
    }
  }

  /**
   * 设置清漆法线节点
   *
   * 返回清漆层使用的法线节点。清漆法线独立于基础材质的法线，
   * 可以为清漆层添加独特的表面细节效果。
   *
   * @return {Node<vec3>} 清漆法线节点
   */
  setupClearcoatNormal() {
    // 如果设置了自定义清漆法线节点则使用它，否则使用材质的默认清漆法线
    return this.clearcoatNormalNode ? vec3(this.clearcoatNormalNode) : materialClearcoatNormal;
  }

  /**
   * 设置材质的构建上下文
   *
   * 这个方法配置材质的构建上下文，特别是设置清漆法线的构建函数。
   * 它确保清漆法线在正确的构建阶段被处理。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   */
  setup(builder) {
    // 设置清漆法线的构建上下文函数，使用子构建来处理清漆法线
    builder.context.setupClearcoatNormal = () => subBuild(this.setupClearcoatNormal(builder), "NORMAL", "vec3");

    // 调用父类的设置方法
    super.setup(builder);
  }

  /**
   * 复制材质属性
   *
   * 从源材质复制所有物理材质特有的节点属性到当前材质。
   * 这个方法确保所有自定义节点都被正确复制。
   *
   * @param {MeshPhysicalNodeMaterial} source - 源材质对象
   * @return {MeshPhysicalNodeMaterial} 返回当前材质对象，支持链式调用
   */
  copy(source) {
    // 复制清漆相关节点
    this.clearcoatNode = source.clearcoatNode;
    this.clearcoatRoughnessNode = source.clearcoatRoughnessNode;
    this.clearcoatNormalNode = source.clearcoatNormalNode;

    // 复制光泽相关节点
    this.sheenNode = source.sheenNode;
    this.sheenRoughnessNode = source.sheenRoughnessNode;

    // 复制彩虹色相关节点
    this.iridescenceNode = source.iridescenceNode;
    this.iridescenceIORNode = source.iridescenceIORNode;
    this.iridescenceThicknessNode = source.iridescenceThicknessNode;

    // 复制镜面反射相关节点
    this.specularIntensityNode = source.specularIntensityNode;
    this.specularColorNode = source.specularColorNode;

    // 复制透射相关节点
    this.transmissionNode = source.transmissionNode;
    this.thicknessNode = source.thicknessNode;
    this.attenuationDistanceNode = source.attenuationDistanceNode;
    this.attenuationColorNode = source.attenuationColorNode;
    this.dispersionNode = source.dispersionNode;

    // 复制各向异性节点
    this.anisotropyNode = source.anisotropyNode;

    // 调用父类的复制方法并返回当前对象
    return super.copy(source);
  }
}

// 导出网格物理节点材质类作为默认导出
export default MeshPhysicalNodeMaterial;
