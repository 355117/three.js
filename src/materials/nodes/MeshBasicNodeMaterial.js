// 导入节点材质基类
import NodeMaterial from "./NodeMaterial.js";
// 导入材质光照贴图访问器
import { materialLightMap } from "../../nodes/accessors/MaterialNode.js";
// 导入基础环境节点，用于环境光照处理
import BasicEnvironmentNode from "../../nodes/lighting/BasicEnvironmentNode.js";
// 导入基础光照贴图节点
import BasicLightMapNode from "../../nodes/lighting/BasicLightMapNode.js";
// 导入基础光照模型
import BasicLightingModel from "../../nodes/functions/BasicLightingModel.js";
// 导入几何体法线访问器
import { normalViewGeometry } from "../../nodes/accessors/Normal.js";
// 导入漫反射颜色属性节点
import { diffuseColor } from "../../nodes/core/PropertyNode.js";
// 导入方向到面方向转换函数
import { directionToFaceDirection } from "../../nodes/display/FrontFacingNode.js";

// 导入网格基础材质基类
import { MeshBasicMaterial } from "../MeshBasicMaterial.js";

// 创建默认值实例，使用纯函数标记进行优化
const _defaultValues = /*@__PURE__*/ new MeshBasicMaterial();

/**
 * 网格基础节点材质类 - {@link MeshBasicMaterial} 的节点版本
 *
 * 基础材质是最简单的材质类型，不受光照影响，只显示物体的基本颜色和纹理。
 * 这个类扩展了 NodeMaterial，为网格对象提供基于节点系统的基础材质功能。
 * 虽然基础材质本质上是无光照的，但为了计算片段着色器的输出光线，
 * 仍然使用了光照模型。
 *
 * @augments NodeMaterial
 */
class MeshBasicNodeMaterial extends NodeMaterial {
  // 静态方法：返回材质类型标识符
  static get type() {
    // 返回材质类型名称，用于材质系统识别
    return "MeshBasicNodeMaterial";
  }

  /**
   * 构造函数：创建新的网格基础节点材质实例
   *
   * @param {Object} [parameters] - 可选的配置参数对象，用于初始化材质属性
   */
  constructor(parameters) {
    // 调用父类构造函数，初始化节点材质基础功能
    super();

    /**
     * 类型标识标志，用于运行时类型检测
     *
     * 这个标志可以用来快速判断一个对象是否为 MeshBasicNodeMaterial 实例，
     * 避免使用 instanceof 操作符带来的性能开销
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMeshBasicNodeMaterial = true;

    /**
     * 光照响应标志
     *
     * 虽然基础材质按定义是无光照的，但我们将此属性设置为 true，
     * 因为我们使用光照模型来计算片段着色器的输出光线。
     * 这样可以确保材质系统正确处理光照计算流程。
     *
     * @type {boolean}
     * @default true
     */
    this.lights = true;

    // 设置材质的默认属性值
    this.setDefaultValues(_defaultValues);

    // 应用用户传入的参数，覆盖默认值
    this.setValues(parameters);
  }

  /**
   * 设置法线节点
   *
   * 基础材质不受法线贴图和凹凸贴图影响，所以我们默认返回
   * {@link normalViewGeometry}。这确保了基础材质始终使用
   * 几何体的原始法线，而不是经过贴图修改的法线。
   *
   * @return {Node<vec3>} 法线节点
   */
  setupNormal() {
    // 将几何体法线转换为面方向，参见 issue #28839
    return directionToFaceDirection(normalViewGeometry); // 参见 #28839
  }

  /**
   * 设置环境光照节点
   *
   * 这个方法被重写是因为基础材质类型使用 {@link BasicEnvironmentNode}
   * 来实现默认的环境映射功能。基础环境节点提供了简化的环境光照计算。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器，用于构建着色器代码
   * @return {?BasicEnvironmentNode<vec3>} 环境节点，如果没有环境设置则返回 null
   */
  setupEnvironment(builder) {
    // 调用父类方法获取基础环境节点
    const envNode = super.setupEnvironment(builder);

    // 如果存在环境节点，则包装为 BasicEnvironmentNode，否则返回 null
    return envNode ? new BasicEnvironmentNode(envNode) : null;
  }

  /**
   * 设置光照贴图节点
   *
   * 这个方法必须被重写，因为基础材质的光照贴图需要使用特殊的缩放因子进行评估。
   * 基础材质的光照贴图处理方式与其他材质类型不同。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器，用于构建着色器代码
   * @return {?BasicLightMapNode<vec3>} 光照贴图节点，如果没有光照贴图则返回 null
   */
  setupLightMap(builder) {
    // 初始化节点为 null
    let node = null;

    // 检查材质是否设置了光照贴图
    if (builder.material.lightMap) {
      // 如果有光照贴图，创建基础光照贴图节点
      node = new BasicLightMapNode(materialLightMap);
    }

    // 返回光照贴图节点或 null
    return node;
  }

  /**
   * 设置输出光线节点
   *
   * 材质重写此方法是因为虽然 `lights` 设置为 `true`，
   * 但我们仍然希望返回漫反射颜色作为输出光线。
   * 这是基础材质的特殊行为：不进行复杂的光照计算，
   * 直接输出材质的基本颜色。
   *
   * @return {Node<vec3>} 输出光线节点
   */
  setupOutgoingLight() {
    // 直接返回漫反射颜色的 RGB 分量作为输出光线
    return diffuseColor.rgb;
  }

  /**
   * 设置光照模型
   *
   * 配置材质使用的光照计算模型。基础材质使用最简单的
   * BasicLightingModel，它提供基本的光照计算功能。
   *
   * @return {BasicLightingModel} 基础光照模型实例
   */
  setupLightingModel() {
    // 创建并返回基础光照模型
    return new BasicLightingModel();
  }
}

// 导出网格基础节点材质类作为默认导出
export default MeshBasicNodeMaterial;
