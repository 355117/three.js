// 导入节点材质基类
import NodeMaterial from "./NodeMaterial.js";
// 导入材质属性节点：漫反射颜色、金属度、粗糙度、镜面反射颜色、镜面反射F90
import { diffuseColor, metalness, roughness, specularColor, specularF90 } from "../../nodes/core/PropertyNode.js";
// 导入数学节点：混合函数
import { mix } from "../../nodes/math/MathNode.js";
// 导入材质访问器：粗糙度和金属度
import { materialRoughness, materialMetalness } from "../../nodes/accessors/MaterialNode.js";
// 导入粗糙度计算函数
import getRoughness from "../../nodes/functions/material/getRoughness.js";
// 导入物理光照模型
import PhysicalLightingModel from "../../nodes/functions/PhysicalLightingModel.js";
// 导入环境节点，用于PBR环境映射
import EnvironmentNode from "../../nodes/lighting/EnvironmentNode.js";
// 导入TSL基础类型：浮点数、三维向量、四维向量
import { float, vec3, vec4 } from "../../nodes/tsl/TSLBase.js";

// 导入传统的网格标准材质类
import { MeshStandardMaterial } from "../MeshStandardMaterial.js";

// 创建默认值实例，使用纯函数标记进行优化
const _defaultValues = /*@__PURE__*/ new MeshStandardMaterial();

/**
 * 网格标准节点材质类 - {@link MeshStandardMaterial} 的节点版本
 * 实现基于物理的渲染(PBR)标准材质，支持金属度/粗糙度工作流
 *
 * @augments NodeMaterial
 */
class MeshStandardNodeMaterial extends NodeMaterial {
  // 静态方法：返回材质类型标识符
  static get type() {
    return "MeshStandardNodeMaterial"; // 返回材质类型字符串
  }

  /**
   * 构造函数 - 创建新的网格标准节点材质实例
   *
   * @param {Object} [parameters] - 配置参数对象，包含材质的各种属性设置
   */
  constructor(parameters) {
    // 调用父类构造函数初始化基础功能
    super();

    /**
     * 类型检测标志 - 用于运行时类型判断
     * 可以通过此属性快速判断对象是否为MeshStandardNodeMaterial实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMeshStandardNodeMaterial = true;

    /**
     * 光照响应标志 - 设置为true因为标准材质需要响应光照
     * 标准材质依赖光源来计算PBR光照效果
     *
     * @type {boolean}
     * @default true
     */
    this.lights = true;

    /**
     * 自发光颜色节点 - 标准材质的自发光颜色默认从emissive、emissiveIntensity和emissiveMap属性推断
     * 此节点属性允许覆盖默认值，用节点来定义自发光颜色
     *
     * 如果不想覆盖自发光颜色而是修改现有值，请使用 {@link materialEmissive}
     *
     * @type {?Node<vec3>}
     * @default null
     */
    this.emissiveNode = null;

    /**
     * 金属度节点 - 标准材质的金属度默认从metalness和metalnessMap属性推断
     * 此节点属性允许覆盖默认值，用节点来定义金属度
     *
     * 如果不想覆盖金属度而是修改现有值，请使用 {@link materialMetalness}
     *
     * @type {?Node<float>}
     * @default null
     */
    this.metalnessNode = null;

    /**
     * 粗糙度节点 - 标准材质的粗糙度默认从roughness和roughnessMap属性推断
     * 此节点属性允许覆盖默认值，用节点来定义粗糙度
     *
     * 如果不想覆盖粗糙度而是修改现有值，请使用 {@link materialRoughness}
     *
     * @type {?Node<float>}
     * @default null
     */
    this.roughnessNode = null;

    // 设置材质的默认属性值
    this.setDefaultValues(_defaultValues);

    // 应用用户传入的参数，覆盖默认值
    this.setValues(parameters);
  }

  /**
   * 设置环境映射 - 重写父类实现
   * 此类型的材质使用 {@link EnvironmentNode} 来实现基于PBR的环境映射(PMREM)
   * 此外，该方法还会考虑 `Scene.environment` 设置
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {?EnvironmentNode<vec3>} 环境节点，如果没有环境则返回null
   */
  setupEnvironment(builder) {
    // 调用父类方法获取基础环境节点
    let envNode = super.setupEnvironment(builder);

    // 如果父类没有返回环境节点，但构建器中有环境节点，则使用构建器的环境节点
    if (envNode === null && builder.environmentNode) {
      envNode = builder.environmentNode;
    }

    // 如果存在环境节点，则包装为EnvironmentNode，否则返回null
    return envNode ? new EnvironmentNode(envNode) : null;
  }

  /**
   * 设置光照模型 - 配置物理光照计算
   *
   * @return {PhysicalLightingModel} 返回物理光照模型实例
   */
  setupLightingModel(/*builder*/) {
    // 创建并返回新的物理光照模型实例
    return new PhysicalLightingModel();
  }

  /**
   * 设置镜面反射相关的节点变量 - 配置PBR镜面反射属性
   */
  setupSpecular() {
    // 计算镜面反射颜色：在电介质基础反射率(0.04)和漫反射颜色之间根据金属度进行混合
    const specularColorNode = mix(vec3(0.04), diffuseColor.rgb, metalness);

    // 将计算得到的镜面反射颜色赋值给全局镜面反射颜色属性
    specularColor.assign(specularColorNode);
    // 设置镜面反射F90值为1.0（菲涅尔反射在90度时的值）
    specularF90.assign(1.0);
  }

  /**
   * 设置标准材质特定的节点变量 - 配置金属度、粗糙度和颜色属性
   *
   * @param {NodeBuilder} builder - 当前的节点构建器（未使用）
   */
  setupVariants() {
    // 金属度设置

    // 获取金属度节点：使用自定义节点或材质默认值
    const metalnessNode = this.metalnessNode ? float(this.metalnessNode) : materialMetalness;

    // 将金属度赋值给全局金属度属性
    metalness.assign(metalnessNode);

    // 粗糙度设置

    // 获取粗糙度节点：使用自定义节点或材质默认值
    let roughnessNode = this.roughnessNode ? float(this.roughnessNode) : materialRoughness;
    // 应用粗糙度处理函数，确保粗糙度值在合理范围内
    roughnessNode = getRoughness({ roughness: roughnessNode });

    // 将处理后的粗糙度赋值给全局粗糙度属性
    roughness.assign(roughnessNode);

    // 镜面反射颜色设置

    // 调用镜面反射设置方法
    this.setupSpecular();

    // 漫反射颜色设置

    // 根据金属度调整漫反射颜色：金属材质的漫反射颜色应该为0，非金属保持原色
    diffuseColor.assign(vec4(diffuseColor.rgb.mul(metalnessNode.oneMinus()), diffuseColor.a));
  }

  /**
   * 复制方法 - 从源材质复制属性到当前材质
   *
   * @param {MeshStandardNodeMaterial} source - 源材质对象
   * @return {MeshStandardNodeMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 复制自发光节点
    this.emissiveNode = source.emissiveNode;

    // 复制金属度节点
    this.metalnessNode = source.metalnessNode;
    // 复制粗糙度节点
    this.roughnessNode = source.roughnessNode;

    // 调用父类复制方法处理其他属性
    return super.copy(source);
  }
}

// 导出网格标准节点材质类作为默认导出
export default MeshStandardNodeMaterial;
