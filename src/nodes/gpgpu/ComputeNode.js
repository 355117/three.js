// 从核心节点模块导入基础Node类
import Node from "../core/Node.js";
// 从核心常量模块导入节点更新类型
import { NodeUpdateType } from "../core/constants.js";
// 从TSL核心模块导入方法链和节点对象函数
import { addMethodChaining, nodeObject } from "../tsl/TSLCore.js";

/**
 * 计算节点类，用于封装和执行GPU计算着色器
 *
 * ComputeNode是Three.js中用于GPU通用计算的核心节点。
 * 它封装了计算着色器的执行逻辑，包括：
 * - 工作组大小配置
 * - 调度参数管理
 * - 计算着色器的生命周期管理
 * - 与渲染管线的集成
 *
 * 计算节点支持各种GPU计算任务，如：
 * - 粒子系统模拟
 * - 物理计算
 * - 图像处理
 * - 数据并行处理
 *
 * @augments Node
 */
class ComputeNode extends Node {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'ComputeNode'
   */
  static get type() {
    return "ComputeNode";
  }

  /**
   * 构造一个新的计算节点
   *
   * @param {Node} computeNode - 包含计算逻辑的节点
   * @param {Array<number>} workgroupSize - 工作组大小，定义每个工作组的线程数量
   */
  constructor(computeNode, workgroupSize) {
    // 调用父类构造函数，计算节点不返回值，类型为'void'
    super("void");

    /**
     * 此标志可用于类型测试
     *
     * 用于在运行时识别此节点是否为计算节点
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isComputeNode = true;

    /**
     * 包含计算逻辑的节点
     *
     * 这个节点定义了实际的计算着色器代码，
     * 通常是一个函数节点或代码块节点
     *
     * @type {Node}
     */
    this.computeNode = computeNode;

    /**
     * 工作组大小配置
     *
     * 定义每个工作组在X、Y、Z维度上的线程数量。
     * 工作组是GPU并行执行的基本单元，合理的大小配置
     * 对性能有重要影响。常见值：[64], [8,8], [4,4,4]
     *
     * @type {Array<number>}
     * @default [ 64 ]
     */
    this.workgroupSize = workgroupSize;

    /**
     * 计算调度的总线程数量
     *
     * 指定要执行的总线程数，GPU会根据工作组大小
     * 自动计算需要调度的工作组数量
     *
     * @type {number}
     */
    this.count = null;

    /**
     * 计算节点的版本号
     *
     * 用于跟踪节点的变化，当计算逻辑或参数发生
     * 变化时可以递增版本号来触发重新编译
     *
     * @type {number}
     */
    this.version = 1;

    /**
     * 计算节点的名称或标签
     *
     * 用于调试和识别，在开发工具中显示
     *
     * @type {string}
     * @default ''
     */
    this.name = "";

    /**
     * 更新前类型设置为NodeUpdateType.OBJECT
     *
     * 因为updateBefore方法默认每个对象执行一次，
     * 这确保了计算着色器在适当的时机被调度执行
     *
     * @type {string}
     * @default 'object'
     */
    this.updateBeforeType = NodeUpdateType.OBJECT;

    /**
     * 初始化回调函数
     *
     * 在计算节点首次执行前调用的函数，
     * 可用于设置初始状态或执行一次性初始化操作
     *
     * @type {?Function}
     */
    this.onInitFunction = null;
  }

  /**
   * 设置计算调度的线程数量
   *
   * @param {number} count - 要执行的总线程数
   * @return {ComputeNode} 返回此节点的引用（支持链式调用）
   */
  setCount(count) {
    // 设置线程数量
    this.count = count;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 获取计算调度的线程数量
   *
   * @return {number} 当前设置的线程数量
   */
  getCount() {
    // 返回当前的线程数量
    return this.count;
  }

  /**
   * 执行此节点的`dispose`事件
   *
   * 清理计算节点相关的GPU资源，包括着色器程序、
   * 缓冲区等，防止内存泄漏
   */
  dispose() {
    // 分发dispose事件，通知监听器进行清理
    this.dispatchEvent({ type: "dispose" });
  }

  /**
   * 设置计算节点的名称属性
   *
   * @param {string} name - 计算节点的名称
   * @return {ComputeNode} 返回此节点的引用（支持链式调用）
   */
  setName(name) {
    // 设置节点名称
    this.name = name;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 设置计算节点的名称属性
   *
   * @deprecated 已弃用，请使用setName()方法代替
   * @param {string} name - 计算节点的名称
   * @return {ComputeNode} 返回此节点的引用（支持链式调用）
   */
  label(name) {
    // 输出弃用警告
    console.warn('THREE.TSL: "label()" has been deprecated. Use "setName()" instead.'); // @deprecated r179

    // 调用新的setName方法
    return this.setName(name);
  }

  /**
   * 设置初始化回调函数
   *
   * 该回调函数会在计算节点首次执行前被调用，
   * 可用于执行一次性的初始化操作
   *
   * @param {Function} callback - 初始化回调函数
   * @return {ComputeNode} 返回此节点的引用（支持链式调用）
   */
  onInit(callback) {
    // 设置初始化回调函数
    this.onInitFunction = callback;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 执行此节点的计算操作
   *
   * 该方法在渲染循环的更新阶段被调用，负责触发GPU计算着色器的执行。
   * 它通过渲染器的compute方法来调度计算着色器的运行。
   *
   * @param {Object} frame - 包含渲染器等信息的帧对象
   * @param {WebGLRenderer|WebGPURenderer} frame.renderer - 渲染器实例，用于执行计算
   */
  updateBefore({ renderer }) {
    // 通过渲染器执行此计算节点
    renderer.compute(this);
  }

  /**
   * 设置计算节点的构建过程
   *
   * 该方法在节点构建阶段被调用，负责构建计算节点的内部逻辑。
   * 它会构建计算节点并处理输出节点的设置。
   *
   * @param {NodeBuilder} builder - 节点构建器，用于构建着色器代码
   * @returns {Object|undefined} 构建结果对象
   */
  setup(builder) {
    // 构建计算节点，获取构建结果
    const result = this.computeNode.build(builder);

    // 如果有构建结果
    if (result) {
      // 获取此节点的属性对象
      const properties = builder.getNodeProperties(this);
      // 保存输出计算节点的引用
      properties.outputComputeNode = result.outputNode;

      // 清空结果的输出节点，避免重复处理
      result.outputNode = null;
    }

    // 返回构建结果
    return result;
  }

  /**
   * 生成着色器代码
   *
   * 根据当前的着色器阶段生成相应的代码。在计算着色器阶段，
   * 生成计算逻辑代码；在其他着色器阶段，处理输出节点的代码生成。
   *
   * @param {NodeBuilder} builder - 节点构建器，用于生成着色器代码
   * @param {string} output - 期望的输出类型
   * @returns {string|undefined} 生成的着色器代码片段
   */
  generate(builder, output) {
    // 获取当前的着色器阶段
    const { shaderStage } = builder;

    // 如果是计算着色器阶段
    if (shaderStage === "compute") {
      // 构建计算节点，生成void类型的代码片段
      const snippet = this.computeNode.build(builder, "void");

      // 如果生成的代码片段不为空
      if (snippet !== "") {
        // 将代码片段添加到着色器的流程代码中
        builder.addLineFlowCode(snippet, this);
      }
    } else {
      // 在非计算着色器阶段，处理输出节点
      // 获取此节点的属性对象
      const properties = builder.getNodeProperties(this);
      // 获取输出计算节点
      const outputComputeNode = properties.outputComputeNode;

      // 如果存在输出计算节点
      if (outputComputeNode) {
        // 构建输出计算节点并返回结果
        return outputComputeNode.build(builder, output);
      }
    }
  }
}

export default ComputeNode;

/**
 * TSL函数：创建计算内核节点
 *
 * 创建一个计算内核节点，用于定义GPU计算着色器的执行逻辑。
 * 计算内核是GPU并行计算的基本单元，定义了工作组的大小和计算逻辑。
 *
 * @tsl
 * @function
 * @param {Node} node - 包含计算逻辑的节点，定义着色器的具体计算操作
 * @param {Array<number>} [workgroupSize=[64]] - 工作组大小数组，定义X、Y、Z维度的线程数
 * @returns {ComputeNode} 返回配置好的计算节点实例
 */
export const computeKernel = (node, workgroupSize = [64]) => {
  // 验证工作组大小数组的长度，必须是1-3个元素
  if (workgroupSize.length === 0 || workgroupSize.length > 3) {
    console.error("THREE.TSL: compute() workgroupSize must have 1, 2, or 3 elements");
  }

  // 验证工作组大小数组中每个元素的有效性
  for (let i = 0; i < workgroupSize.length; i++) {
    const val = workgroupSize[i];

    // 每个元素必须是正整数
    if (typeof val !== "number" || val <= 0 || !Number.isInteger(val)) {
      console.error(`THREE.TSL: compute() workgroupSize element at index [ ${i} ] must be a positive integer`);
    }
  }

  // 隐式填充到[x, y, z]格式，用1填充缺失的维度
  // 这与WGSL处理@workgroup_size时的行为一致
  while (workgroupSize.length < 3) workgroupSize.push(1);

  // 创建并返回计算节点对象
  return nodeObject(new ComputeNode(nodeObject(node), workgroupSize));
};

/**
 * TSL函数：创建带线程数的计算节点
 *
 * 创建一个完整配置的计算节点，包括计算逻辑、线程数量和工作组大小。
 * 这是创建GPU计算任务的便捷方法。
 *
 * @tsl
 * @function
 * @param {Node} node - 包含计算逻辑的节点，定义着色器的具体计算操作
 * @param {number} count - 要执行的总线程数量
 * @param {Array<number>} [workgroupSize=[64]] - 工作组大小数组，定义X、Y、Z维度的线程数
 * @returns {ComputeNode} 返回配置好的计算节点实例
 */
export const compute = (node, count, workgroupSize) =>
  // 创建计算内核并设置线程数量
  computeKernel(node, workgroupSize).setCount(count);

// 为compute和computeKernel函数添加方法链支持
addMethodChaining("compute", compute);
addMethodChaining("computeKernel", computeKernel);
