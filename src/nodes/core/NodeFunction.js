/**
 * 节点函数的基类。必须为每种支持的原生着色器语言实现派生模块。
 * 与其他`Node*`模块类似，此类仅在构建过程中相关，不在用户级代码中使用。
 *
 * 节点函数用于封装着色器函数的定义和代码生成逻辑。
 */
class NodeFunction {
  /**
   * 构造一个新的节点函数。
   * 初始化函数的基本属性，包括返回类型、输入参数、名称和精度限定符。
   *
   * @param {string} type - 节点类型，也是节点函数的返回类型
   * @param {Array<NodeFunctionInput>} inputs - 函数的输入参数数组
   * @param {string} [name=''] - 函数名称
   * @param {string} [precision=''] - 精度限定符（如lowp、mediump、highp）
   */
  constructor(type, inputs, name = "", precision = "") {
    /**
     * 节点类型，也是节点函数的返回类型。
     * 定义了函数执行后返回值的数据类型（如float、vec3、mat4等）。
     *
     * @type {string}
     */
    this.type = type;

    /**
     * 函数的输入参数数组。
     * 包含函数所需的所有输入参数的定义。
     *
     * @type {Array<NodeFunctionInput>}
     */
    this.inputs = inputs;

    /**
     * 函数的名称。
     * 在生成的着色器代码中用作函数标识符。
     *
     * @type {string}
     * @default ''
     */
    this.name = name;

    /**
     * 精度限定符。
     * 用于指定浮点数计算的精度级别，在移动设备上特别重要。
     *
     * @type {string}
     * @default ''
     */
    this.precision = precision;
  }

  /**
   * 返回节点函数的原生代码。
   * 抽象方法，必须在子类中实现以生成特定着色器语言的函数代码。
   *
   * @abstract
   * @param {string} name - 函数名称
   * @return {string} 着色器代码字符串
   */
  getCode(/*name = this.name*/) {
    // 抽象方法警告，提醒开发者需要在子类中实现
    console.warn("Abstract function.");
  }
}

// 标识此类为节点函数类型
NodeFunction.isNodeFunction = true;

export default NodeFunction;
