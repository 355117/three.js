// 从分析光源节点模块导入基础类
import AnalyticLightNode from "./AnalyticLightNode.js";

/**
 * 环境光节点类
 *
 * 用于将环境光表示为节点的模块。环境光是一种均匀照亮场景中所有物体的光源，
 * 它没有特定的方向，提供基础的全局照明。环境光通常用于模拟天空光或
 * 其他间接光照效果，为场景提供最基本的亮度。
 *
 * 环境光的特点：
 * - 无方向性：从所有方向均匀照射
 * - 无衰减：强度不随距离变化
 * - 全局影响：影响场景中的所有物体
 * - 基础照明：提供最低限度的可见性
 *
 * @augments AnalyticLightNode
 */
class AmbientLightNode extends AnalyticLightNode {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'AmbientLightNode'
   */
  static get type() {
    return "AmbientLightNode";
  }

  /**
   * 构造一个新的环境光节点
   *
   * @param {?AmbientLight} [light=null] - 环境光源对象，包含光的颜色和强度信息
   */
  constructor(light = null) {
    // 调用父类构造函数，初始化基础光源属性
    super(light);
  }

  /**
   * 设置环境光的光照计算
   *
   * 环境光通过直接将其颜色值添加到场景的辐照度(irradiance)中来工作。
   * 这是最简单的光照模型，不涉及方向计算或阴影。
   *
   * @param {Object} params - 包含上下文信息的参数对象
   * @param {Object} params.context - 光照计算的上下文对象
   */
  setup({ context }) {
    // 将环境光的颜色值累加到场景的总辐照度中
    // addAssign 执行 += 操作，将环境光贡献添加到现有的辐照度值上
    context.irradiance.addAssign(this.colorNode);
  }
}

// 导出环境光节点类作为默认导出
export default AmbientLightNode;
