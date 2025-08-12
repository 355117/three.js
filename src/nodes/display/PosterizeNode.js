// 从核心临时节点模块导入TempNode基类
import TempNode from "../core/TempNode.js";
// 从TSL基础模块导入nodeProxy函数，用于创建节点代理
import { nodeProxy } from "../tsl/TSLBase.js";

/**
 * 表示色调分离效果的节点，该效果减少图像中的颜色数量，
 * 产生更加块状和风格化的外观。
 *
 * @augments TempNode
 */
class PosterizeNode extends TempNode {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "PosterizeNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的色调分离节点。
   *
   * @param {Node} sourceNode - 输入的颜色节点
   * @param {Node} stepsNode - 控制色调分离效果强度的节点。数值越低，块状效果越明显
   */
  constructor(sourceNode, stepsNode) {
    super(); // 调用父类TempNode的构造函数

    /**
     * 输入的颜色节点。
     *
     * @type {Node}
     */
    this.sourceNode = sourceNode; // 存储源颜色节点

    /**
     * 控制色调分离效果强度的节点。数值越低，块状效果越明显。
     *
     * @type {Node}
     */
    this.stepsNode = stepsNode; // 存储步数控制节点
  }

  // 设置节点的着色器逻辑
  setup() {
    // 解构获取源节点和步数节点
    const { sourceNode, stepsNode } = this;

    // 实现色调分离算法：
    // 1. 将源颜色乘以步数 (sourceNode.mul(stepsNode))
    // 2. 向下取整 (.floor())
    // 3. 除以步数 (.div(stepsNode))
    // 这样可以将连续的颜色值量化为离散的级别
    return sourceNode.mul(stepsNode).floor().div(stepsNode);
  }
}

// 导出PosterizeNode类作为默认导出
export default PosterizeNode;

/**
 * TSL函数，用于创建色调分离节点。
 *
 * @tsl
 * @function
 * @param {Node} sourceNode - 输入的颜色节点
 * @param {Node} stepsNode - 控制色调分离效果强度的节点。数值越低，块状效果越明显
 * @returns {PosterizeNode} 返回配置好的色调分离节点
 */
export const posterize = /*@__PURE__*/ nodeProxy(PosterizeNode).setParameterLength(2); // 创建具有2个参数的节点代理
