// 从上下文节点模块导入基础类
import ContextNode from "../core/ContextNode.js";
// 从TSL基础模块导入节点代理、浮点数和三维向量类型
import { nodeProxy, float, vec3 } from "../tsl/TSLBase.js";

/**
 * 光照上下文节点类
 *
 * `LightingContextNode` 表示 {@link ContextNode} 模块的扩展，
 * 通过添加光照特定的上下文数据来增强功能。它表示 {@link LightsNode} 的运行时上下文。
 *
 * 光照上下文的核心功能：
 * - 数据管理：统一管理光照计算所需的各种数据
 * - 状态维护：维护光照计算过程中的状态信息
 * - 模型集成：与不同的光照模型进行集成
 * - 背景处理：支持背景和背景透明度的处理
 *
 * 上下文包含的主要数据：
 * - 辐射度(radiance)：表面发出的光照强度
 * - 辐照度(irradiance)：表面接收的光照强度
 * - IBL辐照度：基于图像的光照辐照度
 * - 环境光遮蔽：AO效果的强度
 * - 反射光分量：直接和间接的漫反射、镜面反射
 * - 背景信息：背景颜色和透明度
 *
 * 与传统光照系统的优势：
 * - 更好的数据组织和管理
 * - 支持复杂的光照管线
 * - 便于扩展和自定义
 * - 更高效的计算和传递
 *
 * @augments ContextNode
 */
class LightingContextNode extends ContextNode {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'LightingContextNode'
   */
  static get type() {
    return "LightingContextNode";
  }

  /**
   * 构造一个新的光照上下文节点
   *
   * @param {LightsNode} lightsNode - 光源节点，管理场景中的所有光源
   * @param {?LightingModel} [lightingModel=null] - 当前的光照模型，定义光照计算算法
   * @param {?Node<vec3>} [backdropNode=null] - 背景节点，提供背景颜色
   * @param {?Node<float>} [backdropAlphaNode=null] - 背景透明度节点，控制背景的透明度
   */
  constructor(lightsNode, lightingModel = null, backdropNode = null, backdropAlphaNode = null) {
    // 调用父类构造函数，传入光源节点作为上下文的核心
    super(lightsNode);

    /**
     * 当前的光照模型
     *
     * 定义光照计算的具体算法，可以是：
     * - Lambert模型：简单的漫反射模型
     * - Phong模型：包含镜面反射的经典模型
     * - PBR模型：基于物理的渲染模型
     * - 自定义模型：用户定义的光照算法
     *
     * @type {?LightingModel}
     * @default null
     */
    this.lightingModel = lightingModel;

    /**
     * 背景节点
     *
     * 提供场景的背景颜色信息，用于：
     * - 环境反射的计算
     * - 透明物体的背景混合
     * - 全局光照的环境贡献
     *
     * @type {?Node<vec3>}
     * @default null
     */
    this.backdropNode = backdropNode;

    /**
     * 背景透明度节点
     *
     * 控制背景的透明度，用于：
     * - 背景与前景的混合
     * - 透明效果的实现
     * - 合成操作的控制
     *
     * @type {?Node<float>}
     * @default null
     */
    this.backdropAlphaNode = backdropAlphaNode;

    // 内部缓存的上下文值，用于性能优化
    this._value = null;
  }

  /**
   * 返回光照上下文对象
   *
   * 创建并返回包含所有光照计算所需数据的上下文对象。
   * 这个对象包含了光照管线中的各种变量和状态。
   *
   * @return {{
   * radiance: Node<vec3>,
   * irradiance: Node<vec3>,
   * iblIrradiance: Node<vec3>,
   * ambientOcclusion: Node<float>,
   * reflectedLight: {directDiffuse: Node<vec3>, directSpecular: Node<vec3>, indirectDiffuse: Node<vec3>, indirectSpecular: Node<vec3>},
   * backdrop: Node<vec3>,
   * backdropAlpha: Node<float>
   * }} 光照上下文对象，包含所有光照计算的变量
   */
  getContext() {
    // 获取背景相关的节点引用
    const { backdropNode, backdropAlphaNode } = this;

    // 创建反射光的各个分量变量
    // 直接漫反射：来自光源的直接漫反射光照
    const directDiffuse = vec3().toVar("directDiffuse"),
      // 直接镜面反射：来自光源的直接镜面反射光照
      directSpecular = vec3().toVar("directSpecular"),
      // 间接漫反射：来自环境的间接漫反射光照
      indirectDiffuse = vec3().toVar("indirectDiffuse"),
      // 间接镜面反射：来自环境的间接镜面反射光照
      indirectSpecular = vec3().toVar("indirectSpecular");

    // 组织反射光对象，包含所有反射光分量
    const reflectedLight = {
      directDiffuse,
      directSpecular,
      indirectDiffuse,
      indirectSpecular,
    };

    // 创建完整的光照上下文对象
    const context = {
      // 辐射度：表面发出的光照强度
      radiance: vec3().toVar("radiance"),
      // 辐照度：表面接收的总光照强度
      irradiance: vec3().toVar("irradiance"),
      // IBL辐照度：基于图像的光照辐照度
      iblIrradiance: vec3().toVar("iblIrradiance"),
      // 环境光遮蔽：初始值为1（无遮蔽）
      ambientOcclusion: float(1).toVar("ambientOcclusion"),
      // 反射光分量对象
      reflectedLight,
      // 背景颜色节点
      backdrop: backdropNode,
      // 背景透明度节点
      backdropAlpha: backdropAlphaNode,
    };

    // 返回构建好的上下文对象
    return context;
  }

  /**
   * 设置光照上下文节点
   *
   * 初始化光照上下文，设置光照模型，并调用父类的设置方法。
   * 这个方法在节点构建过程中被调用。
   *
   * @param {NodeBuilder} builder - 节点构建器，包含构建上下文信息
   * @returns {*} 父类setup方法的返回值
   */
  setup(builder) {
    // 获取或创建上下文值，使用缓存机制提高性能
    this.value = this._value || (this._value = this.getContext());

    // 设置光照模型：优先使用节点自身的模型，否则使用构建器上下文中的模型
    this.value.lightingModel = this.lightingModel || builder.context.lightingModel;

    // 调用父类的设置方法，完成上下文的初始化
    return super.setup(builder);
  }
}

// 导出光照上下文节点类作为默认导出
export default LightingContextNode;

// 导出光照上下文节点的代理函数，用于便捷创建节点实例
export const lightingContext = /*@__PURE__*/ nodeProxy(LightingContextNode);
