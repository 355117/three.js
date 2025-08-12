import NodeVar from "./NodeVar.js"; // 导入NodeVar基类

/**
 * {@link NodeBuilder} 在节点构建过程中会创建此类的实例。
 * 它们代表构建器将要生成的最终着色器变量（varyings）。
 * 为此目的，在 {@link NodeBuilder#varyings} 中维护了一个节点变量数组。
 *
 * @augments NodeVar
 */
class NodeVarying extends NodeVar {
  // 定义NodeVarying类，继承自NodeVar

  /**
   * 构造一个新的节点变量。
   *
   * @param {string} name - 变量的名称。
   * @param {string} type - 变量的类型。
   * @param {?string} interpolationType - 变量的插值类型。
   * @param {?string} interpolationSampling - 变量的插值采样类型。
   */
  constructor(name, type, interpolationType = null, interpolationSampling = null) {
    // 构造函数，接受名称、类型和插值参数

    super(name, type); // 调用父类构造函数

    /**
     * 此变量是否需要插值。此属性可用于
     * 检查变量是否可以优化为变量。
     *
     * @type {boolean}
     * @default false
     */
    this.needsInterpolation = false; // 标识是否需要插值，默认为false

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isNodeVarying = true; // 标识这是一个节点变量对象

    /**
     * 变量数据的插值类型。
     *
     * @type {?string}
     * @default null
     */
    this.interpolationType = interpolationType; // 存储插值类型

    /**
     * 变量数据的插值采样类型。
     *
     * @type {?string}
     * @default null
     */
    this.interpolationSampling = interpolationSampling; // 存储插值采样类型
  }
}

export default NodeVarying; // 导出NodeVarying类作为默认导出
