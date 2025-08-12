// 从光照节点模块导入基础类
import LightingNode from "./LightingNode.js";

/**
 * 辐照度节点类
 *
 * 一个通用类，可用于向场景贡献辐照度(Irradiance)的节点。
 * 辐照度是指单位面积上接收到的光通量，是光照计算中的重要概念。
 *
 * 辐照度的物理意义：
 * - 表示表面接收光能的强度
 * - 单位为瓦特每平方米 (W/m²)
 * - 在渲染中通常表示为RGB颜色值
 * - 影响表面的亮度和颜色
 *
 * 辐照度的来源：
 * - 直接光照：来自光源的直接照射
 * - 间接光照：来自环境和反射的光线
 * - 光照贴图：预计算的光照信息
 * - 环境光：全局的基础照明
 *
 * 应用场景：
 * - 光照贴图节点可以作为此模块的输入
 * - 环境光照的累积计算
 * - 全局光照的实现
 * - 在 {@link NodeMaterial} 中使用
 *
 * @augments LightingNode
 */
class IrradianceNode extends LightingNode {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'IrradianceNode'
   */
  static get type() {
    return "IrradianceNode";
  }

  /**
   * 构造一个新的辐照度节点
   *
   * @param {Node<vec3>} node - 贡献辐照度的节点，通常是RGB颜色值
   */
  constructor(node) {
    // 调用父类构造函数
    super();

    /**
     * 贡献辐照度的节点
     *
     * 存储提供辐照度数据的节点，可以是：
     * - 光照贴图节点
     * - 环境光节点
     * - 计算得出的光照值
     * - 其他光照效果的输出
     *
     * @type {Node<vec3>}
     */
    this.node = node;
  }

  /**
   * 设置辐照度的计算
   *
   * 将此节点的辐照度值添加到光照上下文的总辐照度中。
   * 这是一个累积过程，多个辐照度节点的贡献会被叠加。
   *
   * @param {NodeBuilder} builder - 节点构建器，包含光照计算的上下文
   */
  setup(builder) {
    // 将此节点的辐照度值累加到上下文的总辐照度中
    // addAssign 执行 += 操作，实现多个光照源的累积效果
    builder.context.irradiance.addAssign(this.node);
  }
}

// 导出辐照度节点类作为默认导出
export default IrradianceNode;
