// 导入基础节点类
import Node from "./Node.js";
// 导入TSL基础功能：不可变节点和变化节点
import { nodeImmutable, varying } from "../tsl/TSLBase.js";

/**
 * 索引节点类 - 表示不同类型的着色器索引
 * 以下预定义的节点对象涵盖了常见的使用场景：
 *
 * - `vertexIndex`: 网格中顶点的索引
 * - `instanceIndex`: 网格实例或计算着色器调用的索引
 * - `drawIndex`: 绘制调用的索引
 * - `invocationLocalIndex`: 工作组加载范围内计算调用的索引
 * - `invocationSubgroupIndex`: 子组范围内计算调用的索引
 * - `subgroupIndex`: 当前计算调用所属子组的索引
 *
 * @augments Node
 */
class IndexNode extends Node {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "IndexNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的索引节点
   *
   * @param {('vertex'|'instance'|'subgroup'|'invocationLocal'|'invocationSubgroup'|'draw')} scope - 索引节点的作用域
   */
  constructor(scope) {
    // 调用父类构造函数，设置节点类型为无符号整数
    super("uint");

    /**
     * 索引节点的作用域类型
     *
     * @type {string}
     */
    this.scope = scope;

    /**
     * 类型测试标志 - 用于识别此节点为索引节点
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isIndexNode = true;
  }

  /**
   * 生成着色器代码 - 根据作用域类型生成相应的索引代码
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @return {string} 生成的着色器代码
   */
  generate(builder) {
    // 获取节点类型
    const nodeType = this.getNodeType(builder);
    // 获取作用域类型
    const scope = this.scope;

    // 声明属性名变量
    let propertyName;

    // 根据不同的作用域类型获取相应的索引属性名
    if (scope === IndexNode.VERTEX) {
      // 顶点索引
      propertyName = builder.getVertexIndex();
    } else if (scope === IndexNode.INSTANCE) {
      // 实例索引
      propertyName = builder.getInstanceIndex();
    } else if (scope === IndexNode.DRAW) {
      // 绘制调用索引
      propertyName = builder.getDrawIndex();
    } else if (scope === IndexNode.INVOCATION_LOCAL) {
      // 本地调用索引
      propertyName = builder.getInvocationLocalIndex();
    } else if (scope === IndexNode.INVOCATION_SUBGROUP) {
      // 子组调用索引
      propertyName = builder.getInvocationSubgroupIndex();
    } else if (scope === IndexNode.SUBGROUP) {
      // 子组索引
      propertyName = builder.getSubgroupIndex();
    } else {
      // 未知作用域类型，抛出错误
      throw new Error("THREE.IndexNode: Unknown scope: " + scope);
    }

    // 声明输出变量
    let output;

    // 根据着色器阶段决定输出方式
    if (builder.shaderStage === "vertex" || builder.shaderStage === "compute") {
      // 在顶点或计算着色器阶段，直接使用属性名
      output = propertyName;
    } else {
      // 在其他着色器阶段，创建变化节点
      const nodeVarying = varying(this);

      // 构建变化节点的输出
      output = nodeVarying.build(builder, nodeType);
    }

    // 返回生成的输出
    return output;
  }
}

// 索引节点的作用域常量定义
IndexNode.VERTEX = "vertex"; // 顶点作用域
IndexNode.INSTANCE = "instance"; // 实例作用域
IndexNode.SUBGROUP = "subgroup"; // 子组作用域
IndexNode.INVOCATION_LOCAL = "invocationLocal"; // 本地调用作用域
IndexNode.INVOCATION_SUBGROUP = "invocationSubgroup"; // 子组调用作用域
IndexNode.DRAW = "draw"; // 绘制调用作用域

// 导出索引节点类作为默认导出
export default IndexNode;

/**
 * TSL对象：表示网格中顶点的索引
 *
 * @tsl
 * @type {IndexNode}
 */
export const vertexIndex = /*@__PURE__*/ nodeImmutable(IndexNode, IndexNode.VERTEX);

/**
 * TSL对象：表示网格实例或计算着色器调用的索引
 *
 * @tsl
 * @type {IndexNode}
 */
export const instanceIndex = /*@__PURE__*/ nodeImmutable(IndexNode, IndexNode.INSTANCE);

/**
 * TSL对象：表示当前计算调用所属子组的索引
 *
 * @tsl
 * @type {IndexNode}
 */
export const subgroupIndex = /*@__PURE__*/ nodeImmutable(IndexNode, IndexNode.SUBGROUP);

/**
 * TSL对象：表示子组范围内计算调用的索引
 *
 * @tsl
 * @type {IndexNode}
 */
export const invocationSubgroupIndex = /*@__PURE__*/ nodeImmutable(IndexNode, IndexNode.INVOCATION_SUBGROUP);

/**
 * TSL对象：表示工作组加载范围内计算调用的索引
 *
 * @tsl
 * @type {IndexNode}
 */
export const invocationLocalIndex = /*@__PURE__*/ nodeImmutable(IndexNode, IndexNode.INVOCATION_LOCAL);

/**
 * TSL对象：表示绘制调用的索引
 *
 * @tsl
 * @type {IndexNode}
 */
export const drawIndex = /*@__PURE__*/ nodeImmutable(IndexNode, IndexNode.DRAW);
