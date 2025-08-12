// 从核心节点模块导入基础Node类
import Node from "../core/Node.js";
// 从TSL基础模块导入节点对象函数
import { nodeObject } from "../tsl/TSLBase.js";

/**
 * `ComputeBuiltinNode` 表示计算作用域的内置值，用于暴露
 * 当前运行调度的信息和/或运行设备的信息
 *
 * 计算内置节点提供对GPU计算环境的访问，包括：
 * - 工作组信息（workgroup ID, local ID, global ID等）
 * - 调度信息（num workgroups等）
 * - 设备特定信息（subgroup size等）
 *
 * 这些内置值对于编写高效的计算着色器至关重要，
 * 它们提供了线程索引、工作组维度等关键信息。
 *
 * 此节点只能与WebGPU后端一起使用
 *
 * @augments Node
 */
class ComputeBuiltinNode extends Node {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'ComputeBuiltinNode'
   */
  static get type() {
    return "ComputeBuiltinNode";
  }

  /**
   * 构造一个新的计算内置节点
   *
   * @param {string} builtinName - 内置值的名称（如'globalId', 'localId'等）
   * @param {string} nodeType - 节点的数据类型（如'uvec3', 'uint'等）
   */
  constructor(builtinName, nodeType) {
    // 调用父类构造函数，传入节点类型
    super(nodeType);

    /**
     * 内置值的名称
     *
     * 存储WebGPU计算着色器中的内置变量名称，
     * 如'globalId', 'localId', 'workgroupId'等
     *
     * @private
     * @type {string}
     */
    this._builtinName = builtinName;
  }

  /**
   * 重写此方法，因为哈希值是从内置名称派生的
   *
   * 使用内置名称作为哈希值，确保相同内置值的节点
   * 能够被正确识别和缓存
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {string} 哈希值
   */
  getHash(builder) {
    // 返回内置名称作为哈希值
    return this.getBuiltinName(builder);
  }

  /**
   * 重写此方法，因为节点类型直接从`nodeType`派生
   *
   * 计算内置节点的类型在构造时就已确定，
   * 不需要根据构建器上下文进行推断
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {string} 节点类型
   */
  getNodeType(/*builder*/) {
    // 直接返回构造时设置的节点类型
    return this.nodeType;
  }

  /**
   * 设置内置名称
   *
   * @param {string} builtinName - 要设置的内置名称
   * @return {ComputeBuiltinNode} 返回此节点的引用（支持链式调用）
   */
  setBuiltinName(builtinName) {
    // 更新内置名称
    this._builtinName = builtinName;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 返回内置名称
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {string} 内置名称
   */
  getBuiltinName(/*builder*/) {
    // 返回存储的内置名称
    return this._builtinName;
  }

  /**
   * 检查当前节点构建器是否支持此内置值
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {boolean} 构建器是否支持此内置值
   */
  hasBuiltin(builder) {
    // 委托给构建器检查内置值支持情况
    return builder.hasBuiltin(this._builtinName);
  }

  /**
   * 生成计算内置节点的着色器代码
   *
   * 根据着色器阶段生成相应的代码：
   * - 计算着色器：生成实际的内置值访问代码
   * - 其他着色器：输出警告并生成常量值
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @param {string} output - 输出格式
   * @return {string} 生成的着色器代码
   */
  generate(builder, output) {
    // 获取内置名称和节点类型
    const builtinName = this.getBuiltinName(builder);
    const nodeType = this.getNodeType(builder);

    // 检查是否在计算着色器阶段
    if (builder.shaderStage === "compute") {
      // 在计算着色器中，格式化并返回内置值访问代码
      return builder.format(builtinName, nodeType, output);
    } else {
      // 在非计算着色器阶段，输出警告信息
      console.warn(`ComputeBuiltinNode: Compute built-in value ${builtinName} can not be accessed in the ${builder.shaderStage} stage`);
      // 生成一个常量值作为占位符
      return builder.generateConst(nodeType);
    }
  }

  /**
   * 序列化节点数据
   *
   * 将节点的状态保存到数据对象中，用于后续的反序列化
   *
   * @param {Object} data - 要保存数据的对象
   */
  serialize(data) {
    // 调用父类的序列化方法
    super.serialize(data);

    // 保存全局标志和内置名称
    data.global = this.global;
    data._builtinName = this._builtinName;
  }

  /**
   * 反序列化节点数据
   *
   * 从数据对象中恢复节点的状态
   *
   * @param {Object} data - 包含节点数据的对象
   */
  deserialize(data) {
    // 调用父类的反序列化方法
    super.deserialize(data);

    // 恢复全局标志和内置名称
    this.global = data.global;
    this._builtinName = data._builtinName;
  }
}

// 导出ComputeBuiltinNode类作为默认导出
export default ComputeBuiltinNode;

/**
 * TSL函数，用于创建计算内置节点
 *
 * 这是一个工厂函数，用于创建访问WebGPU计算着色器内置值的节点
 *
 * @tsl
 * @function
 * @param {string} name - 内置值的名称
 * @param {string} nodeType - 节点的数据类型
 * @returns {ComputeBuiltinNode} 返回新创建的计算内置节点
 */
const computeBuiltin = (name, nodeType) => nodeObject(new ComputeBuiltinNode(name, nodeType));

/**
 * 表示计算着色器调度的工作组数量
 *
 * numWorkgroups是一个3D向量，表示在每个维度上调度的工作组数量。
 * 它等于调度大小除以工作组大小（向上取整）。
 *
 * 使用示例：
 * ```js
 * // 运行512个调用/线程，工作组大小为128
 * const computeFn = Fn(() => {
 *
 *     // numWorkgroups.x = 4 (512 / 128 = 4)
 *     storageBuffer.element(0).assign(numWorkgroups.x)
 *
 * })().compute(512, [128]);
 *
 * // 运行512个调用/线程，使用默认工作组大小64
 * const computeFn = Fn(() => {
 *
 *     // numWorkgroups.x = 8 (512 / 64 = 8)
 *     storageBuffer.element(0).assign(numWorkgroups.x)
 *
 * })().compute(512);
 * ```
 *
 * @tsl
 * @type {ComputeBuiltinNode<uvec3>}
 */
export const numWorkgroups = /*@__PURE__*/ computeBuiltin("numWorkgroups", "uvec3");

/**
 * 表示当前计算调用所属工作组的3维索引
 *
 * workgroupId提供了当前工作组在整个调度网格中的位置。
 * 每个工作组都有一个唯一的3D索引，从(0,0,0)开始。
 *
 * 使用示例：
 * ```js
 * // 执行12个计算线程，工作组大小为3
 * const computeFn = Fn( () => {
 *
 * 	If( workgroupId.x.mod( 2 ).equal( 0 ), () => {
 *
 * 		storageBuffer.element( instanceIndex ).assign( instanceIndex );
 *
 * 	} ).Else( () => {
 *
 * 		storageBuffer.element( instanceIndex ).assign( 0 );
 *
 * 	} );
 *
 * } )().compute( 12, [ 3 ] );
 *
 * // workgroupId.x =  [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3];
 * // Buffer Output =  [0, 1, 2, 0, 0, 0, 6, 7, 8, 0, 0, 0];
 * ```
 *
 * @tsl
 * @type {ComputeBuiltinNode<uvec3>}
 */
export const workgroupId = /*@__PURE__*/ computeBuiltin("workgroupId", "uvec3");

/**
 * 当前调用在3D全局网格中位置的非线性化3维表示
 *
 * globalId = workgroupId * workgroupSize + localId
 * 它提供了当前线程在整个计算调度中的全局位置
 *
 * @tsl
 * @type {ComputeBuiltinNode<uvec3>}
 */
export const globalId = /*@__PURE__*/ computeBuiltin("globalId", "uvec3");

/**
 * 当前调用在3D工作组网格中位置的非线性化3维表示
 *
 * localId提供了当前线程在其工作组内的本地位置，
 * 范围从(0,0,0)到(workgroupSize-1)
 *
 * @tsl
 * @type {ComputeBuiltinNode<uvec3>}
 */
export const localId = /*@__PURE__*/ computeBuiltin("localId", "uvec3");

/**
 * 设备相关的变量，暴露当前调用的子组大小
 *
 * 子组（subgroup）是GPU硬件级别的执行单元，
 * 通常包含32或64个线程，具体取决于GPU架构。
 * 子组内的线程可以进行高效的数据交换和同步操作。
 *
 * @tsl
 * @type {ComputeBuiltinNode<uint>}
 */
export const subgroupSize = /*@__PURE__*/ computeBuiltin("subgroupSize", "uint");
