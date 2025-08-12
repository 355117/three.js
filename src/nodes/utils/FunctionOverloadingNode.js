// 导入基础节点类
import Node from "../core/Node.js";
// 导入TSL核心的节点代理功能
import { nodeProxy } from "../tsl/TSLCore.js";

/**
 * 函数重载节点类。
 *
 * 该类允许定义同一函数的多个重载版本。根据函数调用的参数，
 * 节点会选择最佳匹配的重载版本。这在着色器编程中非常有用，
 * 因为不同的参数类型组合可能需要不同的实现逻辑。
 *
 * 例如，一个数学函数可能有以下重载：
 * - mix(float, float, float) - 混合两个浮点数
 * - mix(vec3, vec3, float) - 混合两个三维向量
 * - mix(vec3, vec3, vec3) - 使用向量权重混合
 *
 * @augments Node
 */
class FunctionOverloadingNode extends Node {
  /**
   * 获取节点类型标识符。
   *
   * @static
   * @return {string} 返回'FunctionOverloadingNode'类型标识符。
   */
  static get type() {
    return "FunctionOverloadingNode";
  }

  /**
   * 构造一个新的函数重载节点。
   *
   * @param {Array<Function>} functionNodes - `Fn`函数定义的数组，包含所有重载版本。
   * @param {...Node} parametersNodes - 参数节点列表，用于匹配最佳重载版本。
   */
  constructor(functionNodes = [], ...parametersNodes) {
    super();

    /**
     * `Fn`函数定义的数组。
     *
     * 包含该函数的所有重载版本，每个版本都是一个TSL函数定义。
     * 系统会根据调用参数的类型来选择最匹配的版本。
     *
     * @type {Array<Function>}
     */
    this.functionNodes = functionNodes;

    /**
     * 参数节点列表。
     *
     * 这些参数将用于匹配最佳的重载函数版本。
     * 匹配过程会比较参数类型与各个重载版本的参数类型。
     *
     * @type {Array<Node>}
     */
    this.parametersNodes = parametersNodes;

    /**
     * 选中的重载函数调用。
     *
     * 在setup阶段确定最佳匹配后，该属性会存储
     * 对应的函数调用节点，避免重复计算。
     *
     * @private
     * @type {?ShaderCallNodeInternal}
     */
    this._candidateFnCall = null;

    /**
     * 该节点被标记为全局节点。
     *
     * 全局节点在着色器中只会被定义一次，
     * 避免重复的函数定义。
     *
     * @type {boolean}
     * @default true
     */
    this.global = true;
  }

  /**
   * 获取节点的数据类型。
   *
   * 该方法被重写，因为节点类型是从函数的返回类型推断出来的。
   * 所有重载版本应该具有相同的返回类型，因此使用第一个函数的返回类型。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 节点的数据类型。
   */
  getNodeType() {
    return this.functionNodes[0].shaderNode.layout.type;
  }

  /**
   * 设置节点并选择最佳匹配的重载函数。
   *
   * 该方法实现了重载函数的选择算法：
   * 1. 遍历所有重载版本
   * 2. 检查参数数量是否匹配
   * 3. 计算类型匹配得分
   * 4. 选择得分最高的重载版本
   * 5. 创建并缓存函数调用节点
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {ShaderCallNodeInternal} 选中的函数调用节点。
   */
  setup(builder) {
    const params = this.parametersNodes;

    let candidateFnCall = this._candidateFnCall;

    // 如果还没有选择候选函数，进行选择过程
    if (candidateFnCall === null) {
      let candidateFn = null;
      let candidateScore = -1;

      // 遍历所有重载函数版本
      for (const functionNode of this.functionNodes) {
        const shaderNode = functionNode.shaderNode;
        const layout = shaderNode.layout;

        // 确保函数节点有有效的布局
        if (layout === null) {
          throw new Error("FunctionOverloadingNode: FunctionNode must be a layout.");
        }

        const inputs = layout.inputs;

        // 检查参数数量是否匹配
        if (params.length === inputs.length) {
          let score = 0;

          // 计算类型匹配得分
          for (let i = 0; i < params.length; i++) {
            const param = params[i];
            const input = inputs[i];

            // 如果参数类型完全匹配，得分+1
            if (param.getNodeType(builder) === input.type) {
              score++;
            } else {
              // 如果有任何类型不匹配，得分归零
              score = 0;
            }
          }

          // 选择得分最高的重载版本
          if (score > candidateScore) {
            candidateFn = functionNode;
            candidateScore = score;
          }
        }
      }

      // 创建并缓存选中的函数调用
      this._candidateFnCall = candidateFnCall = candidateFn(...params);
    }

    return candidateFnCall;
  }
}

// 导出FunctionOverloadingNode类作为默认导出
export default FunctionOverloadingNode;

// 创建函数重载节点的基础代理函数
const overloadingBaseFn = /*@__PURE__*/ nodeProxy(FunctionOverloadingNode);

/**
 * TSL函数，用于创建函数重载节点。
 *
 * 该函数提供了一个便捷的方式来定义具有多个重载版本的函数。
 * 它返回一个高阶函数，该函数接受参数并创建相应的重载节点。
 *
 * 使用示例：
 * ```js
 * const myMixFn = overloadingFn([
 *   Fn(([a, b, t]) => { // float版本
 *     return a.mul(1 - t).add(b.mul(t));
 *   }),
 *   Fn(([a, b, t]) => { // vec3版本
 *     return a.mul(1 - t).add(b.mul(t));
 *   })
 * ]);
 *
 * // 调用时会根据参数类型自动选择合适的重载版本
 * const result = myMixFn(colorA, colorB, mixFactor);
 * ```
 *
 * @tsl
 * @function
 * @param {Array<Function>} functionNodes - `Fn`函数定义的数组，包含所有重载版本。
 * @returns {Function} 返回一个函数，该函数接受参数并创建FunctionOverloadingNode实例。
 */
export const overloadingFn =
  (functionNodes) =>
  (...params) =>
    overloadingBaseFn(functionNodes, ...params);
