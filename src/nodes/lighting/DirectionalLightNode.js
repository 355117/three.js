// 从分析光源节点模块导入基础类
import AnalyticLightNode from "./AnalyticLightNode.js";
// 从光源访问器模块导入光源目标方向函数
import { lightTargetDirection } from "../accessors/Lights.js";

/**
 * 方向光节点类
 *
 * 用于将方向光表示为节点的模块。方向光模拟来自无限远处的平行光线，
 * 如太阳光。方向光具有方向但没有位置，光线在整个场景中保持平行。
 *
 * 方向光的特点：
 * - 平行光线：所有光线都是平行的
 * - 无位置：光源位于无限远处
 * - 有方向：光线有明确的传播方向
 * - 无衰减：光强不随距离变化
 * - 均匀照明：在整个场景中提供一致的照明
 *
 * 方向光的应用场景：
 * - 模拟太阳光
 * - 室外场景的主要光源
 * - 需要强烈方向性阴影的场景
 * - 大范围均匀照明
 *
 * @augments AnalyticLightNode
 */
class DirectionalLightNode extends AnalyticLightNode {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'DirectionalLightNode'
   */
  static get type() {
    return "DirectionalLightNode";
  }

  /**
   * 构造一个新的方向光节点
   *
   * @param {?DirectionalLight} [light=null] - 方向光源对象，包含光的方向、颜色和强度信息
   */
  constructor(light = null) {
    // 调用父类构造函数，初始化基础光源属性
    super(light);
  }

  /**
   * 设置方向光的直接光照
   *
   * 配置方向光的直接光照参数，包括光的颜色和方向。
   * 方向光的方向是从光源指向目标的向量。
   *
   * @returns {Object} 直接光照数据对象
   * @returns {Node} returns.lightDirection - 光线方向向量节点
   * @returns {Node} returns.lightColor - 光线颜色节点
   */
  setupDirect() {
    // 获取光源的颜色节点，包含颜色和强度信息
    const lightColor = this.colorNode;

    // 获取光源的方向向量，从光源位置指向目标位置
    // 对于方向光，这个方向在整个场景中是一致的
    const lightDirection = lightTargetDirection(this.light);

    // 返回直接光照所需的数据：方向和颜色
    // 这些数据将被光照模型用于计算最终的光照效果
    return { lightDirection, lightColor };
  }
}

// 导出方向光节点类作为默认导出
export default DirectionalLightNode;
