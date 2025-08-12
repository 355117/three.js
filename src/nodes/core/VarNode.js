import Node from "./Node.js"; // 导入Node基类
import { addMethodChaining, getCurrentStack, nodeProxy } from "../tsl/TSLCore.js"; // 导入TSL核心函数

/**
 * 用于将着色器变量表示为节点的类。变量从
 * 现有节点创建，如下所示：
 *
 * ```js
 * const depth = sampleDepth( uvNode ).toVar( 'depth' );
 * ```
 *
 * @augments Node
 */
class VarNode extends Node {
  // 定义VarNode类，继承自Node

  static get type() {
    // 静态getter方法，返回节点类型

    return "VarNode"; // 返回节点类型字符串
  }

  /**
   * 构造一个新的变量节点。
   *
   * @param {Node} node - 要为其创建变量的节点。
   * @param {?string} [name=null] - 着色器中变量的名称。
   * @param {boolean} [readOnly=false] - 只读标志。
   */
  constructor(node, name = null, readOnly = false) {
    // 构造函数，接受节点、名称和只读标志参数

    super(); // 调用父类构造函数

    /**
     * 要为其创建变量的节点。
     *
     * @type {Node}
     */
    this.node = node; // 存储要创建变量的节点

    /**
     * 着色器中变量的名称。如果未定义名称，
     * 节点系统会自动生成一个。
     *
     * @type {?string}
     * @default null
     */
    this.name = name; // 存储变量名称

    /**
     * `VarNode` 默认将此属性设置为 `true`。
     *
     * @type {boolean}
     * @default true
     */
    this.global = true; // 标识是否为全局变量

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isVarNode = true; // 标识这是一个变量节点对象

    /**
     * 只读标志。
     *
     * @type {boolean}
     * @default false
     */
    this.readOnly = readOnly; // 存储只读标志

    /**
     * 向节点系统添加此标志以指示此节点需要父节点。
     *
     * @type {boolean}
     * @default true
     */
    this.parents = true; // 标识是否需要父节点

    /**
     * 此标志用于指示此节点用于意图。
     *
     * @type {boolean}
     * @default false
     */
    this.intent = false; // 标识是否为意图节点
  }

  /**
   * 设置此节点的意图标志。
   *
   * 此标志用于指示此节点用于意图，
   * 不应直接构建。相反，它用于指示
   * 节点应被视为变量意图。
   *
   * 它对于在不需要创建新变量节点的情况下分配变量很有用。
   *
   * @param {boolean} value - 要为意图标志设置的值。
   * @returns {VarNode} 此节点。
   */
  setIntent(value) {
    // 设置意图标志的方法

    this.intent = value; // 设置意图标志

    return this; // 返回当前对象以支持链式调用
  }

  /**
   * 返回此节点的意图标志。
   *
   * @return {boolean} 意图标志。
   */
  getIntent() {
    // 获取意图标志的方法

    return this.intent; // 返回意图标志
  }

  getMemberType(builder, name) {
    // 获取成员类型的方法

    return this.node.getMemberType(builder, name); // 返回子节点的成员类型
  }

  getElementType(builder) {
    // 获取元素类型的方法

    return this.node.getElementType(builder); // 返回子节点的元素类型
  }

  getNodeType(builder) {
    // 获取节点类型的方法

    return this.node.getNodeType(builder); // 返回子节点的类型
  }

  getArrayCount(builder) {
    // 获取数组计数的方法

    return this.node.getArrayCount(builder); // 返回子节点的数组计数
  }

  build(...params) {
    // 构建方法

    if (this.intent === true) {
      // 如果是意图节点

      const builder = params[0]; // 获取构建器参数
      const properties = builder.getNodeProperties(this); // 获取节点属性

      if (properties.assign !== true) {
        // 如果没有赋值

        return this.node.build(...params); // 构建子节点
      }
    }

    return super.build(...params); // 调用父类构建方法
  }

  generate(builder) {
    // 生成着色器代码的方法
    const { node, name, readOnly } = this; // 解构获取节点、名称和只读标志
    const { renderer } = builder; // 获取渲染器

    const isWebGPUBackend = renderer.backend.isWebGPUBackend === true; // 检查是否为WebGPU后端

    let isDeterministic = false; // 初始化确定性标志
    let shouldTreatAsReadOnly = false; // 初始化是否应视为只读标志

    if (readOnly) {
      // 如果是只读变量
      isDeterministic = builder.isDeterministic(node); // 检查节点是否确定性

      shouldTreatAsReadOnly = isWebGPUBackend ? readOnly : isDeterministic; // 根据后端类型决定是否视为只读
    }

    const vectorType = builder.getVectorType(this.getNodeType(builder)); // 获取向量类型
    const snippet = node.build(builder, vectorType); // 构建子节点代码片段

    const nodeVar = builder.getVarFromNode(this, name, vectorType, undefined, shouldTreatAsReadOnly); // 从节点获取变量

    const propertyName = builder.getPropertyName(nodeVar); // 获取属性名称

    let declarationPrefix = propertyName; // 初始化声明前缀为属性名称

    if (shouldTreatAsReadOnly) {
      // 如果应视为只读
      if (isWebGPUBackend) {
        // 如果是WebGPU后端
        declarationPrefix = isDeterministic ? `const ${propertyName}` : `let ${propertyName}`; // 根据确定性选择const或let
      } else {
        // 如果不是WebGPU后端
        const count = node.getArrayCount(builder); // 获取数组计数

        declarationPrefix = `const ${builder.getVar(nodeVar.type, propertyName, count)}`; // 生成const声明前缀
      }
    }

    builder.addLineFlowCode(`${declarationPrefix} = ${snippet}`, this); // 添加变量赋值代码行

    return propertyName; // 返回属性名称
  }
}

export default VarNode; // 导出VarNode类作为默认导出

/**
 * 用于创建变量节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {Node} node - 要为其创建变量的节点。
 * @param {?string} name - 着色器中变量的名称。
 * @returns {VarNode}
 */
const createVar = /*@__PURE__*/ nodeProxy(VarNode); // 创建变量节点的代理函数

/**
 * 用于创建变量节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {Node} node - 要为其创建变量的节点。
 * @param {?string} name - 着色器中变量的名称。
 * @returns {VarNode}
 */
export const Var = (node, name = null) => createVar(node, name).toStack(); // 导出Var函数，用于创建变量节点并添加到堆栈

/**
 * 用于创建常量节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {Node} node - 要为其创建常量的节点。
 * @param {?string} name - 着色器中常量的名称。
 * @returns {VarNode}
 */
export const Const = (node, name = null) => createVar(node, name, true).toStack(); // 导出Const函数，用于创建只读变量节点并添加到堆栈

//
//

/**
 * 用于创建变量意图节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {Node} node - 要为其创建变量的节点。
 * @param {?string} name - 着色器中变量的名称。
 * @returns {VarNode}
 */
export const VarIntent = (node) => {
  // 导出VarIntent函数，用于创建变量意图节点
  if (getCurrentStack() === null) {
    // 如果当前堆栈为空
    return node; // 直接返回节点
  }

  return createVar(node).setIntent(true).toStack(); // 创建变量节点，设置意图标志并添加到堆栈
};

// 方法链

addMethodChaining("toVar", Var); // 添加toVar方法链
addMethodChaining("toConst", Const); // 添加toConst方法链
addMethodChaining("toVarIntent", VarIntent); // 添加toVarIntent方法链
