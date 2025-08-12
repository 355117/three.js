// 从光照节点模块导入基础类
import LightingNode from "./LightingNode.js";

/**
 * 环境光遮蔽节点类
 *
 * 一个通用类，可用于向场景贡献环境光遮蔽(Ambient Occlusion, AO)的节点。
 * 环境光遮蔽是一种着色技术，用于计算表面点接收环境光的程度。
 *
 * 环境光遮蔽的作用：
 * - 增强深度感：使凹陷区域显得更暗
 * - 提高真实感：模拟间接光照的遮挡效果
 * - 增强细节：突出表面的几何细节
 * - 改善视觉质量：使渲染结果更加逼真
 *
 * 例如，环境光遮蔽贴图节点可以作为此模块的输入。
 * 在 {@link NodeMaterial} 中使用。
 *
 * @augments LightingNode
 */
class AONode extends LightingNode {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'AONode'
   */
  static get type() {
    return "AONode";
  }

  /**
   * 构造一个新的环境光遮蔽节点
   *
   * @param {?Node<float>} [aoNode=null] - 环境光遮蔽节点，提供AO值（通常是0-1范围的浮点数）
   */
  constructor(aoNode = null) {
    // 调用父类构造函数
    super();

    /**
     * 环境光遮蔽节点
     *
     * 存储提供环境光遮蔽值的节点。AO值通常来自：
     * - 预计算的AO贴图
     * - 实时计算的屏幕空间AO (SSAO)
     * - 体积光遮蔽 (VXAO)
     * - 其他AO算法的输出
     *
     * @type {?Node<float>}
     * @default null
     */
    this.aoNode = aoNode;
  }

  /**
   * 设置环境光遮蔽的计算
   *
   * 将AO值应用到光照计算的环境光遮蔽上下文中。
   * 通过乘法操作将AO值与现有的环境光遮蔽值结合。
   *
   * @param {NodeBuilder} builder - 节点构建器，包含光照计算的上下文
   */
  setup(builder) {
    // 将AO节点的值乘以当前的环境光遮蔽值
    // mulAssign 执行 *= 操作，将AO效果应用到环境光遮蔽计算中
    // 较低的AO值会使环境光变暗，模拟遮蔽效果
    builder.context.ambientOcclusion.mulAssign(this.aoNode);
  }
}

// 导出环境光遮蔽节点类作为默认导出
export default AONode;
