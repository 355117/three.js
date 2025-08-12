// 从分析光源节点模块导入基础类
import AnalyticLightNode from "./AnalyticLightNode.js";
// 从光照工具模块导入距离衰减计算函数
import { getDistanceAttenuation } from "./LightUtils.js";
// 从统一变量节点模块导入uniform函数
import { uniform } from "../core/UniformNode.js";
// 从统一变量组节点模块导入渲染组
import { renderGroup } from "../core/UniformGroupNode.js";
// 从点光源阴影节点模块导入点阴影函数
import { pointShadow } from "./PointShadowNode.js";

/**
 * 直接点光源光照计算函数
 *
 * 计算点光源的直接光照效果，包括光照方向、距离衰减和最终颜色。
 * 这是点光源光照计算的核心算法。
 *
 * @param {Object} params - 点光源参数对象
 * @param {Node} params.color - 光源颜色节点
 * @param {Node} params.lightVector - 从表面到光源的向量
 * @param {Node} params.cutoffDistance - 光源截止距离
 * @param {Node} params.decayExponent - 光源衰减指数
 * @returns {Object} 包含光照方向和颜色的对象
 */
export const directPointLight = ({ color, lightVector, cutoffDistance, decayExponent }) => {
  // 计算光照方向：将光向量归一化得到单位方向向量
  const lightDirection = lightVector.normalize();
  // 计算光照距离：光向量的长度即为距离
  const lightDistance = lightVector.length();

  // 计算距离衰减系数
  // 使用物理准确的衰减模型，考虑距离和截止距离
  const attenuation = getDistanceAttenuation({
    lightDistance,
    cutoffDistance,
    decayExponent,
  });

  // 计算最终光照颜色：原始颜色乘以衰减系数
  const lightColor = color.mul(attenuation);

  // 返回光照方向和颜色，供光照模型使用
  return { lightDirection, lightColor };
};

/**
 * 点光源节点类
 *
 * 用于将点光源表示为节点的模块。点光源是从一个点向所有方向
 * 均匀发射光线的光源，类似于现实中的灯泡。
 *
 * 点光源的特点：
 * - 全方向发光：向所有方向均匀发射光线
 * - 位置相关：有明确的三维空间位置
 * - 距离衰减：光强随距离增加而衰减
 * - 无方向性：不像聚光灯有特定的照射方向
 *
 * 物理特性：
 * - 遵循平方反比定律：光强与距离平方成反比
 * - 支持截止距离：超过一定距离后光照影响为零
 * - 可调衰减指数：控制衰减的速度和形状
 * - 能量守恒：符合物理光照原理
 *
 * 应用场景：
 * - 室内照明：模拟灯泡、蜡烛等点光源
 * - 装饰光效：霓虹灯、LED灯等效果
 * - 游戏场景：火把、魔法光球等
 * - 建筑可视化：各种人工光源
 *
 * @augments AnalyticLightNode
 */
class PointLightNode extends AnalyticLightNode {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'PointLightNode'
   */
  static get type() {
    return "PointLightNode";
  }

  /**
   * 构造一个新的点光源节点
   *
   * @param {?PointLight} [light=null] - 点光源对象，包含位置、颜色、强度等信息
   */
  constructor(light = null) {
    // 调用父类构造函数，初始化基础光源属性
    super(light);

    /**
     * 表示截止距离的统一变量节点
     *
     * 截止距离定义了光源影响的最大范围。超过此距离的物体
     * 不会受到该光源的照明影响，这有助于：
     * - 性能优化：减少不必要的光照计算
     * - 视觉控制：精确控制光照范围
     * - 避免光照污染：防止远距离的微弱光照影响
     *
     * @type {UniformNode<float>}
     */
    this.cutoffDistanceNode = uniform(0).setGroup(renderGroup);

    /**
     * 表示衰减指数的统一变量节点
     *
     * 衰减指数控制光强随距离衰减的速度：
     * - 值为2：符合物理的平方反比定律（默认值）
     * - 值为1：线性衰减，较为平缓
     * - 值大于2：更快的衰减，光照范围更集中
     * - 值为0：无衰减，光强保持恒定
     *
     * @type {UniformNode<float>}
     */
    this.decayExponentNode = uniform(2).setGroup(renderGroup);
  }

  /**
   * 重写以更新点光源特定的统一变量
   *
   * 将点光源的距离和衰减参数同步到着色器统一变量中。
   * 这些参数会影响光照的衰减计算。
   *
   * @param {NodeFrame} frame - 当前节点帧的引用
   */
  update(frame) {
    // 获取光源引用
    const { light } = this;

    // 调用父类的更新方法，更新基础属性（如颜色和强度）
    super.update(frame);

    // 更新截止距离：从光源对象获取distance属性
    this.cutoffDistanceNode.value = light.distance;
    // 更新衰减指数：从光源对象获取decay属性
    this.decayExponentNode.value = light.decay;
  }

  /**
   * 重写以设置点光源特定的阴影
   *
   * 点光源使用立方体阴影贴图来处理全方向的阴影投射。
   * 返回专门用于点光源的阴影节点。
   *
   * @return {Node} 点光源阴影节点
   */
  setupShadowNode() {
    // 创建并返回点光源阴影节点
    return pointShadow(this.light);
  }

  /**
   * 设置点光源的直接光照
   *
   * 配置点光源的直接光照参数，包括颜色、光向量、
   * 截止距离和衰减指数，用于光照计算。
   *
   * @param {NodeBuilder} builder - 节点构建器，包含光照计算的上下文
   * @returns {Object} 直接光照数据对象，包含光照方向和颜色
   */
  setupDirect(builder) {
    // 调用直接点光源函数，传入所有必要的参数
    return directPointLight({
      // 光源颜色（包含强度）
      color: this.colorNode,
      // 从表面到光源的向量
      lightVector: this.getLightVector(builder),
      // 光源的截止距离
      cutoffDistance: this.cutoffDistanceNode,
      // 光源的衰减指数
      decayExponent: this.decayExponentNode,
    });
  }
}

export default PointLightNode;
