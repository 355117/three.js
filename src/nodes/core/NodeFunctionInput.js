/**
 * 描述{@link NodeFunction}的输入参数。
 * 用于定义节点函数的输入参数的类型、名称、数量和限定符等属性。
 */
class NodeFunctionInput {
  /**
   * 构造一个新的节点函数输入参数。
   * 初始化输入参数的所有属性，包括类型、名称、数组长度和GLSL限定符。
   *
   * @param {string} type - 输入参数的类型（如float、vec3、mat4等）
   * @param {string} name - 输入参数的名称
   * @param {?number} [count=null] - 如果输入是数组，count表示数组长度
   * @param {('in'|'out'|'inout')} [qualifier=''] - 参数限定符（仅对GLSL相关）
   * @param {boolean} [isConst=false] - 输入是否使用const限定符（仅对GLSL相关）
   */
  constructor(type, name, count = null, qualifier = "", isConst = false) {
    /**
     * 输入参数的类型。
     * 定义了参数的数据类型，如基础类型（float、int）或复合类型（vec3、mat4）。
     *
     * @type {string}
     */
    this.type = type;

    /**
     * 输入参数的名称。
     * 在生成的着色器函数中用作参数标识符。
     *
     * @type {string}
     */
    this.name = name;

    /**
     * 数组长度。
     * 如果输入参数是数组类型，此值表示数组的长度；否则为null。
     *
     * @type {?number}
     * @default null
     */
    this.count = count;

    /**
     * 参数限定符（仅对GLSL相关）。
     * 指定参数的传递方式：
     * - 'in': 输入参数（默认）
     * - 'out': 输出参数
     * - 'inout': 输入输出参数
     *
     * @type {('in'|'out'|'inout')}
     * @default ''
     */
    this.qualifier = qualifier;

    /**
     * 是否使用const限定符（仅对GLSL相关）。
     * 当为true时，表示该参数在函数内部不可修改。
     *
     * @type {boolean}
     * @default false
     */
    this.isConst = isConst;
  }
}

// 标识此类为节点函数输入类型
NodeFunctionInput.isNodeFunctionInput = true;

export default NodeFunctionInput;
