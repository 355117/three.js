// 从核心节点模块导入基础Node类
import Node from "../core/Node.js";
// 从TSL核心模块导入节点代理函数
import { nodeProxy } from "../tsl/TSLCore.js";

/**
 * 表示GPU控制屏障，用于在给定作用域内同步计算操作
 *
 * 屏障节点是GPU计算中的同步原语，确保在屏障点之前的所有操作
 * 都完成后，才能继续执行屏障点之后的操作。这对于并行计算中
 * 的数据一致性和正确性至关重要。
 *
 * 此节点只能与WebGPU后端一起使用
 *
 * @augments Node
 */
class BarrierNode extends Node {
  /**
   * 构造一个新的屏障节点
   *
   * @param {string} scope - 作用域定义了节点的行为类型
   *                        可选值：'workgroup', 'storage', 'texture'
   */
  constructor(scope) {
    // 调用父类构造函数
    super();

    // 存储屏障的作用域类型
    this.scope = scope;
  }

  /**
   * 生成屏障节点的着色器代码
   *
   * 根据不同的渲染后端生成相应的屏障代码：
   * - WebGL后端：生成注释形式的屏障标记
   * - WebGPU后端：生成实际的屏障函数调用
   *
   * @param {NodeBuilder} builder - 节点构建器，包含渲染上下文信息
   */
  generate(builder) {
    // 解构获取作用域类型
    const { scope } = this;
    // 解构获取渲染器实例
    const { renderer } = builder;

    // 检查是否为WebGL后端
    if (renderer.backend.isWebGLBackend === true) {
      // WebGL不支持真正的屏障，只添加注释标记
      builder.addFlowCode(`\t// ${scope}Barrier \n`);
    } else {
      // WebGPU后端，添加实际的屏障函数调用
      builder.addLineFlowCode(`${scope}Barrier()`, this);
    }
  }
}

// 导出BarrierNode类作为默认导出
export default BarrierNode;

/**
 * TSL函数，用于创建屏障节点
 *
 * 这是一个工厂函数，通过nodeProxy包装BarrierNode类，
 * 提供更便捷的节点创建方式
 *
 * @tsl
 * @function
 * @param {string} scope - 作用域定义了节点的行为类型
 * @returns {BarrierNode} 返回新创建的屏障节点实例
 */
const barrier = nodeProxy(BarrierNode);

/**
 * TSL函数，用于创建工作组屏障
 *
 * 工作组屏障确保工作组内的所有计算着色器调用都必须等待
 * 工作组内每个调用完成后，才能越过屏障继续执行。
 * 这对于工作组内的数据共享和同步非常重要。
 *
 * @tsl
 * @function
 * @returns {BarrierNode} 返回配置为工作组作用域的屏障节点
 */
export const workgroupBarrier = () => barrier("workgroup").toStack();

/**
 * TSL函数，用于创建存储屏障
 *
 * 存储屏障确保所有调用都必须等待对'storage'地址空间中
 * 变量的每次访问完成后，才能通过屏障继续执行。
 * 这确保了全局存储缓冲区的数据一致性。
 *
 * @tsl
 * @function
 * @returns {BarrierNode} 返回配置为存储作用域的屏障节点
 */
export const storageBarrier = () => barrier("storage").toStack();

/**
 * TSL函数，用于创建纹理屏障
 *
 * 纹理屏障确保所有调用都必须等待对'texture'地址空间中
 * 变量的每次访问完成后，才能通过屏障继续执行。
 * 这确保了纹理读写操作的正确顺序。
 *
 * @tsl
 * @function
 * @returns {BarrierNode} 返回配置为纹理作用域的屏障节点
 */
export const textureBarrier = () => barrier("texture").toStack();
