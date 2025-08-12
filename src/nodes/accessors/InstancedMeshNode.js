// 导入实例节点基类
import InstanceNode from "./InstanceNode.js";
// 导入TSL基础函数
import { nodeProxy } from "../tsl/TSLBase.js";

/**
 * 这是 `InstanceNode` 的特殊版本，需要使用 {@link InstancedMesh}。
 * 它允许更简单地设置实例节点。
 *
 * @augments InstanceNode
 */
class InstancedMeshNode extends InstanceNode {
  // 返回节点类型标识符
  static get type() {
    return "InstancedMeshNode";
  }

  /**
   * 构造一个新的实例化网格节点
   *
   * @param {InstancedMesh} instancedMesh - 实例化网格对象
   */
  constructor(instancedMesh) {
    // 从实例化网格中提取必要的属性
    const { count, instanceMatrix, instanceColor } = instancedMesh;

    // 调用父类构造函数，传入实例数量、变换矩阵和颜色
    super(count, instanceMatrix, instanceColor);

    /**
     * 对实例化网格的引用
     *
     * @type {InstancedMesh}
     */
    this.instancedMesh = instancedMesh;
  }
}

// 导出InstancedMeshNode类作为默认导出
export default InstancedMeshNode;

/**
 * 用于创建实例化网格节点的TSL函数
 *
 * @tsl
 * @function
 * @param {InstancedMesh} instancedMesh - 实例化网格对象
 * @returns {InstancedMeshNode}
 */
export const instancedMesh = /*@__PURE__*/ nodeProxy(InstancedMeshNode).setParameterLength(1);
