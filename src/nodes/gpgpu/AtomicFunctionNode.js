// 从核心节点模块导入基础Node类
import Node from "../core/Node.js";
// 从代码表达式模块导入expression函数
import { expression } from "../code/ExpressionNode.js";
// 从TSL核心模块导入节点代理函数
import { nodeProxy } from "../tsl/TSLCore.js";

/**
 * 原子函数节点类
 *
 * `AtomicFunctionNode`表示可以在着色器中对原子变量类型进行操作的任何函数。
 * 在原子函数中，对原子变量的任何修改都将作为不可分割的步骤发生，
 * 相对于其他修改具有明确定义的顺序。因此，即使多个原子函数同时修改
 * 原子变量，原子操作也不会相互干扰。
 *
 * 原子操作的特点：
 * - 操作的原子性：要么完全执行，要么完全不执行
 * - 操作的顺序性：多个原子操作有明确的执行顺序
 * - 线程安全性：多线程环境下不会产生竞态条件
 *
 * 此节点只能与WebGPU后端一起使用。
 *
 * @augments Node
 */
class AtomicFunctionNode extends Node {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'AtomicFunctionNode'
   */
  static get type() {
    return "AtomicFunctionNode";
  }

  /**
   * 构造一个新的原子函数节点
   *
   * @param {string} method - 要构造的原子函数的签名/方法名
   * @param {Node} pointerNode - 原子变量或原子缓冲区的元素节点
   * @param {Node} valueNode - 修改原子变量的值节点
   */
  constructor(method, pointerNode, valueNode) {
    // 调用父类构造函数，原子函数返回无符号整数类型
    super("uint");

    /**
     * 要构造的原子函数的签名
     *
     * 定义了具体的原子操作类型，如：
     * - atomicLoad: 原子加载
     * - atomicStore: 原子存储
     * - atomicAdd: 原子加法
     * - atomicSub: 原子减法等
     *
     * @type {string}
     */
    this.method = method;

    /**
     * 原子变量或原子缓冲区的元素
     *
     * 指向要进行原子操作的目标变量或缓冲区元素。
     * 这个节点必须指向一个有效的原子类型变量。
     *
     * @type {Node}
     */
    this.pointerNode = pointerNode;

    /**
     * 修改原子变量的值
     *
     * 用于修改原子变量的新值。对于某些操作（如atomicLoad），
     * 此值可能为null，因为加载操作不需要输入值。
     *
     * @type {Node}
     */
    this.valueNode = valueNode;

    /**
     * 为此节点创建父节点列表，用于检测节点是否需要返回值
     *
     * 当设置为true时，表示此节点可能有父节点依赖其返回值。
     * 这影响代码生成时是否需要生成返回语句。
     *
     * @type {boolean}
     * @default true
     */
    this.parents = true;
  }

  /**
   * 重写默认实现以返回指针节点的类型
   *
   * 获取输入类型，这通常与指针节点的类型相同。
   * 原子操作的输入类型由目标原子变量的类型决定。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {string} 输入类型字符串
   */
  getInputType(builder) {
    // 返回指针节点的节点类型
    return this.pointerNode.getNodeType(builder);
  }

  /**
   * 重写节点类型获取方法，因为节点类型是从输入类型推断的
   *
   * 对于原子函数节点，其节点类型与输入类型相同。
   * 这确保了类型的一致性和正确的代码生成。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {string} 节点类型字符串
   */
  getNodeType(builder) {
    // 直接返回输入类型作为节点类型
    return this.getInputType(builder);
  }

  /**
   * 生成着色器代码
   *
   * 根据原子函数的类型和参数生成相应的着色器代码。
   * 该方法处理原子操作的代码生成，包括参数构建和方法调用。
   *
   * @param {NodeBuilder} builder - 节点构建器，用于生成着色器代码
   * @returns {string|undefined} 生成的着色器代码片段或undefined
   */
  generate(builder) {
    // 获取此节点的属性对象
    const properties = builder.getNodeProperties(this);
    // 获取父节点列表
    const parents = properties.parents;

    // 获取原子函数的方法名
    const method = this.method;

    // 获取节点类型和输入类型
    const type = this.getNodeType(builder);
    const inputType = this.getInputType(builder);

    // 获取指针节点和值节点的引用
    const a = this.pointerNode;
    const b = this.valueNode;

    // 构建参数列表
    const params = [];

    // 添加指针参数，使用引用符号&
    params.push(`&${a.build(builder, inputType)}`);

    // 如果存在值节点，添加值参数
    if (b !== null) {
      params.push(b.build(builder, inputType));
    }

    // 构建方法调用代码片段
    const methodSnippet = `${builder.getMethod(method, type)}( ${params.join(", ")} )`;
    // 检查是否为void类型（不需要返回值）
    const isVoid = parents ? parents.length === 1 && parents[0].isStackNode === true : false;

    // 如果是void类型，直接添加到流程代码中
    if (isVoid) {
      builder.addLineFlowCode(methodSnippet, this);
    } else {
      // 如果需要返回值，创建常量表达式节点
      if (properties.constNode === undefined) {
        properties.constNode = expression(methodSnippet, type).toConst();
      }

      // 构建并返回常量节点的代码
      return properties.constNode.build(builder);
    }
  }
}

// 原子函数类型常量定义
// 这些常量定义了所有支持的原子操作类型

/**
 * 原子加载操作常量
 * 用于从原子变量中读取值
 */
AtomicFunctionNode.ATOMIC_LOAD = "atomicLoad";

/**
 * 原子存储操作常量
 * 用于向原子变量中写入值
 */
AtomicFunctionNode.ATOMIC_STORE = "atomicStore";

/**
 * 原子加法操作常量
 * 用于对原子变量执行加法运算
 */
AtomicFunctionNode.ATOMIC_ADD = "atomicAdd";

/**
 * 原子减法操作常量
 * 用于对原子变量执行减法运算
 */
AtomicFunctionNode.ATOMIC_SUB = "atomicSub";

/**
 * 原子最大值操作常量
 * 用于将原子变量设置为当前值和参数值中的较大者
 */
AtomicFunctionNode.ATOMIC_MAX = "atomicMax";

/**
 * 原子最小值操作常量
 * 用于将原子变量设置为当前值和参数值中的较小者
 */
AtomicFunctionNode.ATOMIC_MIN = "atomicMin";

/**
 * 原子按位与操作常量
 * 用于对原子变量执行按位与运算
 */
AtomicFunctionNode.ATOMIC_AND = "atomicAnd";

/**
 * 原子按位或操作常量
 * 用于对原子变量执行按位或运算
 */
AtomicFunctionNode.ATOMIC_OR = "atomicOr";

/**
 * 原子按位异或操作常量
 * 用于对原子变量执行按位异或运算
 */
AtomicFunctionNode.ATOMIC_XOR = "atomicXor";

// 导出原子函数节点类作为默认导出
export default AtomicFunctionNode;

/**
 * TSL函数：创建原子函数节点
 *
 * 这是一个内部使用的节点代理函数，用于创建原子函数节点实例。
 * 通过nodeProxy包装，提供了更便捷的节点创建方式。
 *
 * @tsl
 * @function
 * @param {string} method - 要构造的原子函数的签名
 * @param {Node} pointerNode - 原子变量或原子缓冲区的元素
 * @param {Node} valueNode - 修改原子变量的值
 * @returns {AtomicFunctionNode} 原子函数节点实例
 */
const atomicNode = nodeProxy(AtomicFunctionNode);

/**
 * TSL函数：将原子函数调用追加到计算着色器的程序流中
 *
 * 创建一个原子函数节点并将其转换为堆栈节点，
 * 使其能够被添加到着色器的执行流程中。
 *
 * @tsl
 * @function
 * @param {string} method - 要构造的原子函数的签名
 * @param {Node} pointerNode - 原子变量或原子缓冲区的元素
 * @param {Node} valueNode - 修改原子变量的值
 * @returns {AtomicFunctionNode} 配置为堆栈节点的原子函数节点
 */
export const atomicFunc = (method, pointerNode, valueNode) => {
  // 创建原子节点并转换为堆栈节点，使其能够被添加到着色器执行流程中
  return atomicNode(method, pointerNode, valueNode).toStack();
};

/**
 * 加载存储在原子变量中的值
 *
 * 执行原子加载操作，从指定的原子变量中读取当前值。
 * 这是一个线程安全的读取操作。
 *
 * @tsl
 * @function
 * @param {Node} pointerNode - 原子变量或原子缓冲区的元素
 * @returns {AtomicFunctionNode} 原子加载函数节点
 */
export const atomicLoad = (pointerNode) => atomicFunc(AtomicFunctionNode.ATOMIC_LOAD, pointerNode, null);

/**
 * 在原子变量中存储一个值
 *
 * 执行原子存储操作，将指定的值写入原子变量。
 * 这是一个线程安全的写入操作。
 *
 * @tsl
 * @function
 * @param {Node} pointerNode - 原子变量或原子缓冲区的元素
 * @param {Node} valueNode - 要存储的值
 * @returns {AtomicFunctionNode} 原子存储函数节点
 */
export const atomicStore = (pointerNode, valueNode) => atomicFunc(AtomicFunctionNode.ATOMIC_STORE, pointerNode, valueNode);

/**
 * 递增存储在原子变量中的值
 *
 * 执行原子加法操作，将指定的值加到原子变量的当前值上。
 * 这是一个线程安全的加法操作，返回操作前的原始值。
 *
 * @tsl
 * @function
 * @param {Node} pointerNode - 原子变量或原子缓冲区的元素
 * @param {Node} valueNode - 要加到原子变量上的值
 * @returns {AtomicFunctionNode} 原子加法函数节点
 */
export const atomicAdd = (pointerNode, valueNode) => atomicFunc(AtomicFunctionNode.ATOMIC_ADD, pointerNode, valueNode);

/**
 * 递减存储在原子变量中的值
 *
 * 执行原子减法操作，从原子变量的当前值中减去指定的值。
 * 这是一个线程安全的减法操作，返回操作前的原始值。
 *
 * @tsl
 * @function
 * @param {Node} pointerNode - 原子变量或原子缓冲区的元素
 * @param {Node} valueNode - 要从原子变量中减去的值
 * @returns {AtomicFunctionNode} 原子减法函数节点
 */
export const atomicSub = (pointerNode, valueNode) => atomicFunc(AtomicFunctionNode.ATOMIC_SUB, pointerNode, valueNode);

/**
 * 在原子变量中存储其当前值与参数之间的最大值
 *
 * 执行原子最大值操作，比较原子变量的当前值和指定值，
 * 将较大的值存储到原子变量中。返回操作前的原始值。
 *
 * @tsl
 * @function
 * @param {Node} pointerNode - 原子变量或原子缓冲区的元素
 * @param {Node} valueNode - 用于比较的值
 * @returns {AtomicFunctionNode} 原子最大值函数节点
 */
export const atomicMax = (pointerNode, valueNode) => atomicFunc(AtomicFunctionNode.ATOMIC_MAX, pointerNode, valueNode);

/**
 * 在原子变量中存储其当前值与参数之间的最小值
 *
 * 执行原子最小值操作，比较原子变量的当前值和指定值，
 * 将较小的值存储到原子变量中。返回操作前的原始值。
 *
 * @tsl
 * @function
 * @param {Node} pointerNode - 原子变量或原子缓冲区的元素
 * @param {Node} valueNode - 用于比较的值
 * @returns {AtomicFunctionNode} 原子最小值函数节点
 */
export const atomicMin = (pointerNode, valueNode) => atomicFunc(AtomicFunctionNode.ATOMIC_MIN, pointerNode, valueNode);

/**
 * 在原子变量中存储其值与参数的按位与结果
 *
 * 执行原子按位与操作，将原子变量的当前值与指定值进行按位与运算，
 * 并将结果存储到原子变量中。返回操作前的原始值。
 *
 * @tsl
 * @function
 * @param {Node} pointerNode - 原子变量或原子缓冲区的元素
 * @param {Node} valueNode - 用于按位与运算的值
 * @returns {AtomicFunctionNode} 原子按位与函数节点
 */
export const atomicAnd = (pointerNode, valueNode) => atomicFunc(AtomicFunctionNode.ATOMIC_AND, pointerNode, valueNode);

/**
 * 在原子变量中存储其值与参数的按位或结果
 *
 * 执行原子按位或操作，将原子变量的当前值与指定值进行按位或运算，
 * 并将结果存储到原子变量中。返回操作前的原始值。
 *
 * @tsl
 * @function
 * @param {Node} pointerNode - 原子变量或原子缓冲区的元素
 * @param {Node} valueNode - 用于按位或运算的值
 * @returns {AtomicFunctionNode} 原子按位或函数节点
 */
export const atomicOr = (pointerNode, valueNode) => atomicFunc(AtomicFunctionNode.ATOMIC_OR, pointerNode, valueNode);

/**
 * 在原子变量中存储其值与参数的按位异或结果
 *
 * 执行原子按位异或操作，将原子变量的当前值与指定值进行按位异或运算，
 * 并将结果存储到原子变量中。返回操作前的原始值。
 *
 * @tsl
 * @function
 * @param {Node} pointerNode - 原子变量或原子缓冲区的元素
 * @param {Node} valueNode - 用于按位异或运算的值
 * @returns {AtomicFunctionNode} 原子按位异或函数节点
 */
export const atomicXor = (pointerNode, valueNode) => atomicFunc(AtomicFunctionNode.ATOMIC_XOR, pointerNode, valueNode);
