import Node from "./Node.js"; // 导入Node基类
import { NodeShaderStage } from "./constants.js"; // 导入节点着色器阶段常量
import { addMethodChaining, nodeProxy } from "../tsl/TSLCore.js"; // 导入TSL核心函数
import { subBuild } from "./SubBuildNode.js"; // 导入子构建函数

/**
 * 用于将着色器变量表示为节点的类。变量从
 * 现有节点创建，如下所示：
 *
 * ```js
 * const positionLocal = positionGeometry.toVarying( 'vPositionLocal' );
 * ```
 *
 * @augments Node
 */
class VaryingNode extends Node {
  // 定义VaryingNode类，继承自Node

  static get type() {
    // 静态getter方法，返回节点类型

    return "VaryingNode"; // 返回节点类型字符串
  }

  /**
   * 构造一个新的变量节点。
   *
   * @param {Node} node - 要为其创建变量的节点。
   * @param {?string} name - 着色器中变量的名称。
   */
  constructor(node, name = null) {
    // 构造函数，接受节点和可选名称参数

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
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isVaryingNode = true; // 标识这是一个变量节点对象

    /**
     * 变量数据的插值类型。
     *
     * @type {?string}
     * @default null
     */
    this.interpolationType = null; // 存储插值类型

    /**
     * 变量数据的插值采样类型。
     *
     * @type {?string}
     * @default null
     */
    this.interpolationSampling = null; // 存储插值采样类型

    /**
     * 此标志用于全局缓存。
     *
     * @type {boolean}
     * @default true
     */
    this.global = true; // 标识是否为全局变量
  }

  /**
   * 定义变量的插值类型。
   *
   * @param {string} type - 插值类型。
   * @param {?string} sampling - 插值采样类型
   * @return {VaryingNode} 对此节点的引用。
   */
  setInterpolation(type, sampling = null) {
    // 设置插值类型的方法

    this.interpolationType = type; // 设置插值类型
    this.interpolationSampling = sampling; // 设置插值采样类型

    return this; // 返回当前对象以支持链式调用
  }

  getHash(builder) {
    // 获取哈希值的方法

    return this.name || super.getHash(builder); // 返回变量名称或父类哈希值
  }

  getNodeType(builder) {
    // 获取节点类型的方法

    // VaryingNode是自动类型

    return this.node.getNodeType(builder); // 返回子节点的类型
  }

  /**
   * 此方法使用当前节点构建器执行变量节点的设置。
   *
   * @param {NodeBuilder} builder - 当前节点构建器。
   * @return {NodeVarying} 来自节点构建器的节点变量。
   */
  setupVarying(builder) {
    // 设置变量的方法

    const properties = builder.getNodeProperties(this); // 获取节点属性

    let varying = properties.varying; // 获取变量属性

    if (varying === undefined) {
      // 如果变量未定义

      const name = this.name; // 获取变量名称
      const type = this.getNodeType(builder); // 获取节点类型
      const interpolationType = this.interpolationType; // 获取插值类型
      const interpolationSampling = this.interpolationSampling; // 获取插值采样类型

      properties.varying = varying = builder.getVaryingFromNode(this, name, type, interpolationType, interpolationSampling); // 从构建器获取变量
      properties.node = subBuild(this.node, "VERTEX"); // 设置子构建节点
    }

    // 此属性可用于检查变量是否可以优化为变量
    varying.needsInterpolation || (varying.needsInterpolation = builder.shaderStage === "fragment"); // 设置是否需要插值

    return varying; // 返回变量
  }

  setup(builder) {
    // 设置方法

    this.setupVarying(builder); // 设置变量

    builder.flowNodeFromShaderStage(NodeShaderStage.VERTEX, this.node); // 从顶点着色器阶段流动节点
  }

  analyze(builder) {
    // 分析方法

    this.setupVarying(builder); // 设置变量

    builder.flowNodeFromShaderStage(NodeShaderStage.VERTEX, this.node); // 从顶点着色器阶段流动节点
  }

  generate(builder) {
    // 生成着色器代码的方法

    const propertyKey = builder.getSubBuildProperty("property", builder.currentStack); // 获取子构建属性键
    const properties = builder.getNodeProperties(this); // 获取节点属性
    const varying = this.setupVarying(builder); // 设置变量

    if (properties[propertyKey] === undefined) {
      // 如果属性键未定义

      const type = this.getNodeType(builder); // 获取节点类型
      const propertyName = builder.getPropertyName(varying, NodeShaderStage.VERTEX); // 获取属性名称

      // 强制节点在顶点阶段运行
      builder.flowNodeFromShaderStage(NodeShaderStage.VERTEX, properties.node, type, propertyName); // 从顶点着色器阶段流动节点

      properties[propertyKey] = propertyName; // 设置属性键
    }

    return builder.getPropertyName(varying); // 返回变量的属性名称
  }
}

export default VaryingNode; // 导出VaryingNode类作为默认导出

/**
 * 用于创建变量节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {Node} node - 要为其创建变量的节点。
 * @param {?string} name - 着色器中变量的名称。
 * @returns {VaryingNode}
 */
export const varying = /*@__PURE__*/ nodeProxy(VaryingNode).setParameterLength(1, 2); // 导出varying函数，用于创建变量节点

/**
 * 在顶点阶段计算节点。
 *
 * @tsl
 * @function
 * @param {Node} node - 应在顶点阶段执行的节点。
 * @returns {VaryingNode}
 */
export const vertexStage = (node) => varying(node); // 导出vertexStage函数，用于在顶点阶段计算节点

addMethodChaining("toVarying", varying); // 添加toVarying方法链
addMethodChaining("toVertexStage", vertexStage); // 添加toVertexStage方法链

// 已弃用

addMethodChaining("varying", (...params) => {
  // @deprecated, r173 // 添加已弃用的varying方法链

  console.warn("THREE.TSL: .varying() has been renamed to .toVarying()."); // 输出弃用警告
  return varying(...params); // 调用新的varying函数
});

addMethodChaining("vertexStage", (...params) => {
  // @deprecated, r173 // 添加已弃用的vertexStage方法链

  console.warn("THREE.TSL: .vertexStage() has been renamed to .toVertexStage()."); // 输出弃用警告
  return varying(...params); // 调用varying函数
});
