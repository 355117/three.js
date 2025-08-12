// 导入代码节点基类
import CodeNode from "./CodeNode.js";
// 导入节点对象包装器
import { nodeObject } from "../tsl/TSLBase.js";

/**
 * 函数节点 - 表示原生着色器函数的类。可用于使用原生着色器代码实现节点材质的某些方面
 * 有两个预定义的TSL函数便于使用：
 *
 * - `wgslFn`: 创建WGSL函数节点
 * - `glslFn`: 创建GLSL函数节点
 *
 * 包含一个include的基本示例如下：
 *
 * ```js
 * const desaturateWGSLFn = wgslFn( `
 *	fn desaturate( color:vec3<f32> ) -> vec3<f32> {
 *		let lum = vec3<f32>( 0.299, 0.587, 0.114 );
 *		return vec3<f32>( dot( lum, color ) );
 *	}`
 *);
 * const someWGSLFn = wgslFn( `
 *	fn someFn( color:vec3<f32> ) -> vec3<f32> {
 * 		return desaturate( color );
 * 	}
 * `, [ desaturateWGSLFn ] );
 * material.colorNode = someWGSLFn( { color: texture( map ) } );
 *```
 * @augments CodeNode
 */
class FunctionNode extends CodeNode {
  // 返回节点类型标识符
  static get type() {
    return "FunctionNode";
  }

  /**
   * 构造一个新的函数节点
   *
   * @param {string} [code=''] - 原生代码
   * @param {Array<Node>} [includes=[]] - 包含的节点数组
   * @param {('js'|'wgsl'|'glsl')} [language=''] - 使用的语言
   */
  constructor(code = "", includes = [], language = "") {
    // 调用父类构造函数
    super(code, includes, language);
  }

  /**
   * 获取节点类型
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 节点类型
   */
  getNodeType(builder) {
    // 返回节点函数的类型
    return this.getNodeFunction(builder).type;
  }

  /**
   * 返回此函数节点的输入
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {Array<Object>} 输入数组
   */
  getInputs(builder) {
    // 返回节点函数的输入
    return this.getNodeFunction(builder).inputs;
  }

  /**
   * 返回此函数节点的节点函数
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {Object} 节点函数对象
   */
  getNodeFunction(builder) {
    // 获取节点数据
    const nodeData = builder.getDataFromNode(this);

    let nodeFunction = nodeData.nodeFunction;

    // 如果节点函数未定义，解析代码创建函数
    if (nodeFunction === undefined) {
      nodeFunction = builder.parser.parseFunction(this.code);

      // 缓存解析结果
      nodeData.nodeFunction = nodeFunction;
    }

    return nodeFunction;
  }

  /**
   * 生成函数节点的代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {string} output - 当前输出
   * @return {string} 生成的代码片段
   */
  generate(builder, output) {
    // 调用父类生成方法
    super.generate(builder);

    // 获取节点函数
    const nodeFunction = this.getNodeFunction(builder);

    // 获取函数名称和类型
    const name = nodeFunction.name;
    const type = nodeFunction.type;

    // 从节点获取代码对象
    const nodeCode = builder.getCodeFromNode(this, type);

    // 如果有自定义名称，使用自定义属性名称
    if (name !== "") {
      nodeCode.name = name;
    }

    // 获取属性名称
    const propertyName = builder.getPropertyName(nodeCode);

    // 获取函数代码
    const code = this.getNodeFunction(builder).getCode(propertyName);

    // 设置代码（添加换行符）
    nodeCode.code = code + "\n";

    // 根据输出类型返回相应结果
    if (output === "property") {
      return propertyName;
    } else {
      return builder.format(`${propertyName}()`, type, output);
    }
  }
}

// 导出FunctionNode类作为默认导出
export default FunctionNode;

/**
 * 原生函数创建器 - 用于创建原生着色器函数的内部函数
 *
 * @param {string} code - 着色器代码
 * @param {Array<Node>} [includes=[]] - 包含的节点数组
 * @param {string} [language=""] - 着色器语言
 * @return {Function} 可调用的函数节点
 */
const nativeFn = (code, includes = [], language = "") => {
  // 处理includes数组中的函数节点
  for (let i = 0; i < includes.length; i++) {
    const include = includes[i];

    // TSL函数：glslFn, wgslFn

    // 如果include是函数，提取其functionNode
    if (typeof include === "function") {
      includes[i] = include.functionNode;
    }
  }

  // 创建函数节点
  const functionNode = nodeObject(new FunctionNode(code, includes, language));

  // 创建可调用的函数包装器
  const fn = (...params) => functionNode.call(...params);
  fn.functionNode = functionNode;

  return fn;
};

/**
 * TSL函数 - 用于创建GLSL函数节点
 *
 * @tsl
 * @function
 * @param {string} code - GLSL代码
 * @param {Array<Node>} includes - 包含的节点数组
 * @returns {Function} 可调用的GLSL函数节点
 */
export const glslFn = (code, includes) => nativeFn(code, includes, "glsl");

/**
 * TSL函数 - 用于创建WGSL函数节点
 *
 * @tsl
 * @function
 * @param {string} code - WGSL代码
 * @param {Array<Node>} includes - 包含的节点数组
 * @returns {Function} 可调用的WGSL函数节点
 */
export const wgslFn = (code, includes) => nativeFn(code, includes, "wgsl");
