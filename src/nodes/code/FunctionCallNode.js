// 导入临时节点基类
import TempNode from "../core/TempNode.js";
// 导入TSL核心函数
import { addMethodChaining, nodeArray, nodeObject, nodeObjects, float } from "../tsl/TSLCore.js";

/**
 * 函数调用节点 - 表示对 {@link FunctionNode} 的调用。开发者通常不会直接接触此模块，
 * 因为他们使用预定义的TSL语法 `wgslFn` 和 `glslFn` 来封装此逻辑
 *
 * @augments TempNode
 */
class FunctionCallNode extends TempNode {
  // 返回节点类型标识符
  static get type() {
    return "FunctionCallNode";
  }

  /**
   * 构造一个新的函数调用节点
   *
   * @param {?FunctionNode} functionNode - 函数节点
   * @param {Object<string, Node>} [parameters={}] - 函数调用的参数
   */
  constructor(functionNode = null, parameters = {}) {
    // 调用父类构造函数
    super();

    /**
     * 函数节点
     *
     * @type {?FunctionNode}
     * @default null
     */
    this.functionNode = functionNode;

    /**
     * 函数调用的参数
     *
     * @type {Object<string, Node>}
     * @default {}
     */
    this.parameters = parameters;
  }

  /**
   * 设置函数调用节点的参数
   *
   * @param {Object<string, Node>} parameters - 要设置的参数
   * @return {FunctionCallNode} 对此节点的引用
   */
  setParameters(parameters) {
    this.parameters = parameters;

    return this;
  }

  /**
   * 返回函数调用节点的参数
   *
   * @return {Object<string, Node>} 此节点的参数
   */
  getParameters() {
    return this.parameters;
  }

  /**
   * 获取节点类型
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 节点类型
   */
  getNodeType(builder) {
    // 返回函数节点的类型
    return this.functionNode.getNodeType(builder);
  }

  /**
   * 生成函数调用节点的代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 生成的代码片段
   */
  generate(builder) {
    const params = [];

    const functionNode = this.functionNode;

    // 获取函数输入和参数
    const inputs = functionNode.getInputs(builder);
    const parameters = this.parameters;

    /**
     * 生成输入参数的内部函数
     *
     * @param {Node} node - 节点
     * @param {Object} inputNode - 输入节点
     * @return {string} 生成的输入代码
     */
    const generateInput = (node, inputNode) => {
      const type = inputNode.type;
      const pointer = type === "pointer";

      let output;

      // 如果是指针类型，添加&符号
      if (pointer) output = "&" + node.build(builder);
      else output = node.build(builder, type);

      return output;
    };

    // 处理参数：数组形式或对象形式
    if (Array.isArray(parameters)) {
      // 数组形式的参数处理
      if (parameters.length > inputs.length) {
        console.error("THREE.TSL: The number of provided parameters exceeds the expected number of inputs in 'Fn()'.");

        parameters.length = inputs.length;
      } else if (parameters.length < inputs.length) {
        console.error("THREE.TSL: The number of provided parameters is less than the expected number of inputs in 'Fn()'.");

        // 用默认值填充缺失的参数
        while (parameters.length < inputs.length) {
          parameters.push(float(0));
        }
      }

      // 生成所有参数
      for (let i = 0; i < parameters.length; i++) {
        params.push(generateInput(parameters[i], inputs[i]));
      }
    } else {
      // 对象形式的参数处理
      for (const inputNode of inputs) {
        const node = parameters[inputNode.name];

        if (node !== undefined) {
          params.push(generateInput(node, inputNode));
        } else {
          console.error(`THREE.TSL: Input '${inputNode.name}' not found in \'Fn()\'.`);

          // 使用默认值
          params.push(generateInput(float(0), inputNode));
        }
      }
    }

    // 获取函数名称并生成调用代码
    const functionName = functionNode.build(builder, "property");

    return `${functionName}( ${params.join(", ")} )`;
  }
}

// 导出FunctionCallNode类作为默认导出
export default FunctionCallNode;

/**
 * TSL函数 - 用于调用函数节点
 *
 * @tsl
 * @function
 * @param {Function|Node} func - 要调用的函数或函数节点
 * @param {...any} params - 函数参数
 * @returns {FunctionCallNode} 函数调用节点
 */
export const call = (func, ...params) => {
  // 处理参数：如果有多个参数或第一个参数是节点，使用nodeArray，否则使用nodeObjects
  params = params.length > 1 || (params[0] && params[0].isNode === true) ? nodeArray(params) : nodeObjects(params[0]);

  return nodeObject(new FunctionCallNode(nodeObject(func), params));
};

// 添加方法链式调用支持
addMethodChaining("call", call);
