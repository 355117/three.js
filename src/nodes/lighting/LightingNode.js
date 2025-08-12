// 从核心节点模块导入基础Node类
import Node from "../core/Node.js";

/**
 * 光照节点基类
 *
 * 所有光照相关节点的基础类，提供光照计算的通用框架和接口。
 * 光照节点是Three.js节点系统中专门处理光照计算的节点类型。
 *
 * 光照节点的核心概念：
 * - 统一接口：为所有光照类型提供一致的节点接口
 * - 模块化设计：每种光照效果都是独立的节点模块
 * - 可组合性：不同光照节点可以组合使用
 * - 着色器集成：与着色器系统无缝集成
 *
 * 光照节点的分类：
 * - 分析光源节点：点光源、方向光、聚光灯等
 * - 环境光照节点：环境光、半球光、IBL等
 * - 特殊效果节点：AO、光照贴图、辐照度等
 * - 上下文节点：光照上下文、光照模型等
 *
 * 与传统光照系统的优势：
 * - 更好的可扩展性和自定义能力
 * - 支持复杂的光照组合和效果
 * - 更高效的着色器代码生成
 * - 更灵活的光照参数控制
 *
 * @augments Node
 */
class LightingNode extends Node {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'LightingNode'
   */
  static get type() {
    return "LightingNode";
  }

  /**
   * 构造一个新的光照节点
   *
   * 初始化光照节点的基础属性，设置输出类型为vec3（三维向量），
   * 因为光照计算通常输出RGB颜色值。
   */
  constructor() {
    // 调用父类构造函数，设置输出类型为vec3（RGB颜色）
    super("vec3");

    /**
     * 光照节点类型标识符
     *
     * 此标志可用于运行时类型检测，判断一个节点
     * 是否为光照节点。在光照系统中用于节点分类和处理。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isLightingNode = true;
  }
}

// 导出光照节点基类作为默认导出
export default LightingNode;
