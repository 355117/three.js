/**
 * RemapNode.js - 数值重映射节点
 *
 * 该文件实现了将节点值从一个范围重映射到另一个范围的功能。
 * 常用于数值范围转换和归一化操作。
 */

// 导入核心节点类
import Node from "../core/Node.js";
// 导入TSL核心工具
import { float, addMethodChaining, nodeProxy } from "../tsl/TSLCore.js";

/**
 * 重映射节点类
 *
 * 该节点允许将节点值从一个范围重映射到另一个范围。
 * 例如，将范围 [0.3, 0.5] 中的值 0.4 重映射到归一化范围 [0, 1]，
 * RemapNode 会将原始值 0.4 转换为 0.5。
 *
 * @augments Node
 */
class RemapNode extends Node {
  /**
   * 获取节点类型名称
   * @returns {string} 返回 'RemapNode'
   */
  static get type() {
    return "RemapNode";
  }

  /**
   * 构造一个新的重映射节点
   *
   * @param {Node} node - 要重映射的节点
   * @param {Node} inLowNode - 源范围的下界
   * @param {Node} inHighNode - 源范围的上界
   * @param {Node} [outLowNode=float(0)] - 目标范围的下界
   * @param {Node} [outHighNode=float(1)] - 目标范围的上界
   */
  constructor(node, inLowNode, inHighNode, outLowNode = float(0), outHighNode = float(1)) {
    super();

    /**
     * 要重映射的节点
     *
     * @type {Node}
     */
    this.node = node;

    /**
     * 源范围的下界
     *
     * @type {Node}
     */
    this.inLowNode = inLowNode;

    /**
     * 源范围的上界
     *
     * @type {Node}
     */
    this.inHighNode = inHighNode;

    /**
     * 目标范围的下界
     *
     * @type {Node}
     * @default float(0)
     */
    this.outLowNode = outLowNode;

    /**
     * 目标范围的上界
     *
     * @type {Node}
     * @default float(1)
     */
    this.outHighNode = outHighNode;

    /**
     * 是否在重映射到目标范围之前对节点值进行钳制
     *
     * @type {boolean}
     * @default true
     */
    this.doClamp = true;
  }

  /**
   * 设置节点的重映射逻辑
   * 实现线性插值重映射算法
   *
   * @returns {Node} 重映射后的节点值
   */
  setup() {
    const { node, inLowNode, inHighNode, outLowNode, outHighNode, doClamp } = this;

    // 计算归一化参数 t = (value - inLow) / (inHigh - inLow)
    let t = node.sub(inLowNode).div(inHighNode.sub(inLowNode));

    // 如果启用钳制，将 t 限制在 [0, 1] 范围内
    if (doClamp === true) t = t.clamp();

    // 应用线性插值：outLow + t * (outHigh - outLow)
    return t.mul(outHighNode.sub(outLowNode)).add(outLowNode);
  }
}

// 导出默认类
export default RemapNode;

/**
 * TSL 函数：创建重映射节点（不启用钳制）
 *
 * @tsl
 * @function
 * @param {Node} node - 要重映射的节点
 * @param {Node} inLowNode - 源范围的下界
 * @param {Node} inHighNode - 源范围的上界
 * @param {?Node} [outLowNode=float(0)] - 目标范围的下界
 * @param {?Node} [outHighNode=float(1)] - 目标范围的上界
 * @returns {RemapNode} 创建的重映射节点实例
 */
export const remap = /*@__PURE__*/ nodeProxy(RemapNode, null, null, { doClamp: false }).setParameterLength(3, 5);

/**
 * TSL 函数：创建重映射节点（启用钳制）
 *
 * @tsl
 * @function
 * @param {Node} node - 要重映射的节点
 * @param {Node} inLowNode - 源范围的下界
 * @param {Node} inHighNode - 源范围的上界
 * @param {?Node} [outLowNode=float(0)] - 目标范围的下界
 * @param {?Node} [outHighNode=float(1)] - 目标范围的上界
 * @returns {RemapNode} 创建的重映射节点实例
 */
export const remapClamp = /*@__PURE__*/ nodeProxy(RemapNode).setParameterLength(3, 5);

// 添加方法链式调用支持
addMethodChaining("remap", remap);
addMethodChaining("remapClamp", remapClamp);
