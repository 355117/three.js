// 导入节点基类
import Node from "../core/Node.js";
// 导入节点代理函数
import { nodeProxy } from "../tsl/TSLBase.js";

/**
 * 代码节点 - 表示原生代码段的类。是像 {@link FunctionNode} 这样的模块的基类，
 * 允许使用原生着色器语言实现函数
 *
 * @augments Node
 */
class CodeNode extends Node {
  // 返回节点类型标识符
  static get type() {
    return "CodeNode";
  }

  /**
   * 构造一个新的代码节点
   *
   * @param {string} [code=''] - 原生代码
   * @param {Array<Node>} [includes=[]] - 包含的节点数组
   * @param {('js'|'wgsl'|'glsl')} [language=''] - 使用的语言
   */
  constructor(code = "", includes = [], language = "") {
    // 调用父类构造函数，类型为'code'
    super("code");

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isCodeNode = true;

    /**
     * 此标志用于全局缓存
     *
     * @type {boolean}
     * @default true
     */
    this.global = true;

    /**
     * 原生代码
     *
     * @type {string}
     * @default ''
     */
    this.code = code;

    /**
     * 包含的节点数组
     *
     * @type {Array<Node>}
     * @default []
     */
    this.includes = includes;

    /**
     * 使用的语言
     *
     * @type {('js'|'wgsl'|'glsl')}
     * @default ''
     */
    this.language = language;
  }

  /**
   * 设置此代码节点的包含项
   *
   * @param {Array<Node>} includes - 要设置的包含项
   * @return {CodeNode} 对此节点的引用
   */
  setIncludes(includes) {
    this.includes = includes;

    return this;
  }

  /**
   * 返回此代码节点的包含项
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {Array<Node>} 包含项
   */
  getIncludes(/*builder*/) {
    return this.includes;
  }

  /**
   * 生成代码节点的代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 生成的代码片段
   */
  generate(builder) {
    // 获取包含项并构建它们
    const includes = this.getIncludes(builder);

    for (const include of includes) {
      include.build(builder);
    }

    // 获取节点代码对象并设置代码
    const nodeCode = builder.getCodeFromNode(this, this.getNodeType(builder));
    nodeCode.code = this.code;

    return nodeCode.code;
  }

  /**
   * 序列化代码节点数据
   *
   * @param {Object} data - 序列化数据对象
   */
  serialize(data) {
    // 调用父类序列化方法
    super.serialize(data);

    // 序列化代码和语言
    data.code = this.code;
    data.language = this.language;
  }

  /**
   * 反序列化代码节点数据
   *
   * @param {Object} data - 反序列化数据对象
   */
  deserialize(data) {
    // 调用父类反序列化方法
    super.deserialize(data);

    // 反序列化代码和语言
    this.code = data.code;
    this.language = data.language;
  }
}

// 导出CodeNode类作为默认导出
export default CodeNode;

/**
 * TSL函数 - 用于创建代码节点
 *
 * @tsl
 * @function
 * @param {string} [code] - 原生代码
 * @param {?Array<Node>} [includes=[]] - 包含的节点数组
 * @param {?('js'|'wgsl'|'glsl')} [language=''] - 使用的语言
 * @returns {CodeNode}
 */
export const code = /*@__PURE__*/ nodeProxy(CodeNode).setParameterLength(1, 3);

/**
 * TSL函数 - 用于创建JS代码节点
 *
 * @tsl
 * @function
 * @param {string} src - 原生代码
 * @param {Array<Node>} includes - 包含的节点数组
 * @returns {CodeNode}
 */
export const js = (src, includes) => code(src, includes, "js");

/**
 * TSL函数 - 用于创建WGSL代码节点
 *
 * @tsl
 * @function
 * @param {string} src - 原生代码
 * @param {Array<Node>} includes - 包含的节点数组
 * @returns {CodeNode}
 */
export const wgsl = (src, includes) => code(src, includes, "wgsl");

/**
 * TSL函数 - 用于创建GLSL代码节点
 *
 * @tsl
 * @function
 * @param {string} src - 原生代码
 * @param {Array<Node>} includes - 包含的节点数组
 * @returns {CodeNode}
 */
export const glsl = (src, includes) => code(src, includes, "glsl");
