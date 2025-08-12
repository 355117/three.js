// 从光照节点模块导入基础类
import LightingNode from "./LightingNode.js";
// 从核心常量模块导入节点更新类型
import { NodeUpdateType } from "../core/constants.js";
// 从统一变量节点模块导入uniform函数
import { uniform } from "../core/UniformNode.js";
// 从数学模块导入颜色类
import { Color } from "../../math/Color.js";
// 从统一变量组节点模块导入渲染组
import { renderGroup } from "../core/UniformGroupNode.js";
// 从阴影节点模块导入shadow函数
import { shadow } from "./ShadowNode.js";
// 从TSL核心模块导入节点对象函数
import { nodeObject } from "../tsl/TSLCore.js";
// 从光源访问器模块导入光源视图位置函数
import { lightViewPosition } from "../accessors/Lights.js";
// 从位置访问器模块导入视图位置
import { positionView } from "../accessors/Position.js";

/**
 * 分析光源节点基类
 *
 * 分析光源节点是所有具体光源节点（如方向光、点光源、聚光灯等）的基类。
 * 它提供了光源的通用功能和接口，包括颜色管理、阴影处理和光照计算的基础框架。
 *
 * 分析光源的特点：
 * - 具有明确的数学模型：可以用解析公式描述
 * - 实时计算：每帧更新光照参数
 * - 支持阴影：可以投射和接收阴影
 * - 颜色管理：统一的颜色和强度处理
 * - 可扩展性：为不同类型的光源提供统一接口
 *
 * 与环境光照相比，分析光源：
 * - 有明确的位置或方向
 * - 可以产生高光反射
 * - 支持阴影投射
 * - 具有衰减特性（对于点光源和聚光灯）
 *
 * @augments LightingNode
 */
class AnalyticLightNode extends LightingNode {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'AnalyticLightNode'
   */
  static get type() {
    return "AnalyticLightNode";
  }

  /**
   * 构造一个新的分析光源节点
   *
   * @param {?Light} [light=null] - 光源对象，可以是任何类型的Three.js光源
   */
  constructor(light = null) {
    // 调用父类构造函数
    super();

    /**
     * 光源对象
     *
     * 存储Three.js光源实例的引用，包含光源的所有属性：
     * - 位置/方向信息
     * - 颜色和强度
     * - 阴影设置
     * - 衰减参数等
     *
     * @type {?Light}
     * @default null
     */
    this.light = light;

    /**
     * 光源的颜色值
     *
     * 用于存储光源颜色的Color实例，会根据光源的
     * 颜色和强度进行更新。
     *
     * @type {Color}
     */
    this.color = new Color();

    /**
     * 光源的颜色节点
     *
     * 如果光源设置了colorNode，则指向光源的colorNode；
     * 否则基于 {@link AnalyticLightNode#color} 创建一个统一变量节点。
     * 这个节点在着色器中用于提供光源颜色数据。
     *
     * @type {Node}
     */
    this.colorNode = (light && light.colorNode) || uniform(this.color).setGroup(renderGroup);

    /**
     * 基础颜色节点的引用
     *
     * 用于保留 {@link AnalyticLightNode#colorNode} 原始值的引用。
     * 当使用阴影时，最终的颜色节点会被不同的节点表示，
     * 此属性保存原始的颜色节点以便后续使用。
     *
     * @type {?Node}
     * @default null
     */
    this.baseColorNode = null;

    /**
     * 光源的阴影节点
     *
     * 表示光源阴影计算的节点，负责处理阴影贴图的
     * 采样和阴影因子的计算。
     *
     * @type {?ShadowNode}
     * @default null
     */
    this.shadowNode = null;

    /**
     * 光源的阴影颜色节点
     *
     * 表示应用阴影后的光源颜色节点，是原始颜色节点
     * 与阴影因子相乘的结果。
     *
     * @type {?Node}
     * @default null
     */
    this.shadowColorNode = null;

    /**
     * 类型测试标志
     *
     * 此标志可用于运行时类型检测，判断一个节点
     * 是否为分析光源节点。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isAnalyticLightNode = true;

    /**
     * 节点更新类型
     *
     * 重写父类设置，因为分析光源节点需要每帧更新一次，
     * 以保持光源参数（如颜色、强度、位置等）的同步。
     *
     * @type {string}
     * @default 'frame'
     */
    this.updateType = NodeUpdateType.FRAME;
  }

  /**
   * 获取节点的哈希值
   *
   * 使用光源的UUID作为哈希值，确保每个光源节点
   * 都有唯一的标识符，用于缓存和优化。
   *
   * @returns {string} 光源的UUID
   */
  getHash() {
    return this.light.uuid;
  }

  /**
   * 获取光源向量
   *
   * 返回一个表示方向向量的节点，该向量从当前位置（视图空间）
   * 指向光源位置（视图空间）。这个向量用于计算光照方向。
   *
   * @param {NodeBuilder} builder - 用于设置光源的构建器对象
   * @return {Node<vec3>} 光源向量节点
   */
  getLightVector(builder) {
    // 计算从当前位置到光源位置的向量
    // lightViewPosition获取光源在视图空间的位置
    // positionView是当前片段在视图空间的位置
    return lightViewPosition(this.light).sub(builder.context.positionView || positionView);
  }

  /**
   * 设置分析光源节点的直接光照
   *
   * 抽象方法，由具体的光源节点子类实现。
   * 用于配置直接光照的参数，如光的方向、颜色、衰减等。
   *
   * @abstract
   * @param {NodeBuilder} builder - 用于设置光源的构建器对象
   * @return {Object|undefined} 直接光照数据（颜色和方向）
   */
  setupDirect(/*builder*/) {}

  /**
   * 设置分析光源节点的直接矩形区域光照
   *
   * 抽象方法，由支持矩形区域光照的光源节点子类实现。
   * 矩形区域光源提供更真实的光照效果，常用于模拟
   * 窗户、显示器、灯管等面光源。
   *
   * @abstract
   * @param {NodeBuilder} builder - 用于设置光源的构建器对象
   * @return {Object|undefined} 直接矩形区域光照数据
   */
  setupDirectRectArea(/*builder*/) {}

  /**
   * 为此光源设置阴影节点
   *
   * 此方法的存在使得具体的光源类可以设置不同类型的阴影节点。
   * 不同类型的光源可能需要不同的阴影计算方法。
   *
   * @return {ShadowNode} 创建的阴影节点
   */
  setupShadowNode() {
    // 使用shadow函数创建标准的阴影节点
    return shadow(this.light);
  }

  /**
   * 为此光源设置阴影
   *
   * 此方法仅在光源投射阴影且当前构建对象接收阴影时执行。
   * 它将阴影整合到光照计算中，修改光源的颜色节点以包含阴影效果。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   */
  setupShadow(builder) {
    // 获取渲染器引用
    const { renderer } = builder;

    // 如果渲染器未启用阴影贴图，直接返回
    if (renderer.shadowMap.enabled === false) return;

    // 获取当前的阴影颜色节点
    let shadowColorNode = this.shadowColorNode;

    // 如果阴影颜色节点尚未创建
    if (shadowColorNode === null) {
      // 检查光源是否有自定义的阴影节点
      const customShadowNode = this.light.shadow.shadowNode;

      let shadowNode;

      // 如果有自定义阴影节点，使用它
      if (customShadowNode !== undefined) {
        shadowNode = nodeObject(customShadowNode);
      } else {
        // 否则使用默认的阴影节点设置
        shadowNode = this.setupShadowNode();
      }

      // 保存阴影节点引用
      this.shadowNode = shadowNode;

      // 创建阴影颜色节点：原始颜色 × 阴影因子
      // 阴影因子通常是0-1之间的值，0表示完全阴影，1表示无阴影
      this.shadowColorNode = shadowColorNode = this.colorNode.mul(shadowNode);

      // 保存原始颜色节点的引用
      this.baseColorNode = this.colorNode;
    }

    // 将当前颜色节点设置为包含阴影的颜色节点
    // 这样后续的光照计算会自动包含阴影效果
    this.colorNode = shadowColorNode;
  }

  /**
   * 设置分析光源节点
   *
   * 与大多数其他节点不同，光照节点在 {@link Node#setup} 中不返回输出节点。
   * 光照节点的主要目的是配置当前的 {@link LightingModel} 和/或
   * 调用相应的接口方法。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   */
  setup(builder) {
    // 恢复基础颜色节点，如果之前因为阴影而被修改过
    this.colorNode = this.baseColorNode || this.colorNode;

    // 处理阴影设置
    if (this.light.castShadow) {
      // 只有当对象接收阴影时才设置阴影
      if (builder.object.receiveShadow) {
        this.setupShadow(builder);
      }
    } else if (this.shadowNode !== null) {
      // 如果光源不投射阴影但之前有阴影节点，清理阴影相关资源
      this.shadowNode.dispose();
      this.shadowNode = null;
      this.shadowColorNode = null;
    }

    // 设置直接光照数据
    const directLightData = this.setupDirect(builder);
    // 设置直接矩形区域光照数据
    const directRectAreaLightData = this.setupDirectRectArea(builder);

    // 如果有直接光照数据，将其添加到光照系统中
    if (directLightData) {
      builder.lightsNode.setupDirectLight(builder, this, directLightData);
    }

    // 如果有直接矩形区域光照数据，将其添加到光照系统中
    if (directRectAreaLightData) {
      builder.lightsNode.setupDirectRectAreaLight(builder, this, directRectAreaLightData);
    }
  }

  /**
   * 更新光源参数
   *
   * 更新方法用于每帧更新光源的统一变量。
   * 在具体的光源节点中可能会被重写，以更新特定光源的统一变量。
   *
   * @param {NodeFrame} frame - 当前节点帧的引用
   */
  update(/*frame*/) {
    // 获取光源引用
    const { light } = this;

    // 更新颜色：复制光源颜色并乘以强度
    // 这样可以将颜色和强度合并为一个颜色值传递给着色器
    this.color.copy(light.color).multiplyScalar(light.intensity);
  }
}

// 导出分析光源节点类作为默认导出
export default AnalyticLightNode;
