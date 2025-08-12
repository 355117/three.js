// 从工具模块导入数组元素节点类
import ArrayElementNode from "../utils/ArrayElementNode.js";
// 从TSL核心模块导入节点对象函数
import { nodeObject } from "../tsl/TSLCore.js";
// 从核心模块导入基础Node类
import Node from "../core/Node.js";

/**
 * 表示'workgroup'作用域缓冲区的一个元素
 *
 * 工作组信息元素节点用于访问工作组作用域缓冲区中的特定元素。
 * 它继承自ArrayElementNode，提供了对工作组共享内存的索引访问能力。
 *
 * @augments ArrayElementNode
 */
class WorkgroupInfoElementNode extends ArrayElementNode {
  /**
   * 构造一个新的工作组信息元素节点
   *
   * @param {Node} workgroupInfoNode - 工作组信息节点（父缓冲区）
   * @param {Node} indexNode - 定义元素访问的索引节点
   */
  constructor(workgroupInfoNode, indexNode) {
    // 调用父类构造函数，传入缓冲区节点和索引节点
    super(workgroupInfoNode, indexNode);

    /**
     * 此标志可用于类型测试
     *
     * 用于在运行时识别此节点是否为工作组信息元素节点
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isWorkgroupInfoElementNode = true;
  }

  /**
   * 生成工作组信息元素节点的着色器代码
   *
   * 该方法处理元素访问的代码生成，根据上下文决定是否需要格式化输出
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @param {string} output - 输出格式
   * @return {string} 生成的着色器代码片段
   */
  generate(builder, output) {
    // 初始化代码片段变量
    let snippet;

    // 检查是否在赋值上下文中
    const isAssignContext = builder.context.assign;
    // 调用父类的generate方法获取基础代码片段
    snippet = super.generate(builder);

    // 如果不在赋值上下文中，需要格式化输出
    if (isAssignContext !== true) {
      // 获取节点类型
      const type = this.getNodeType(builder);

      // 根据类型和输出要求格式化代码片段
      snippet = builder.format(snippet, type, output);
    }

    // TODO: 可能在索引访问时激活裁剪距离索引，而不是从裁剪上下文中激活

    // 返回生成的代码片段
    return snippet;
  }
}

/**
 * 允许用户在计算着色器上下文中创建'workgroup'作用域缓冲区的节点
 *
 * 通常，工作组作用域缓冲区用于保存从全局存储作用域传输到
 * 本地工作组作用域的数据。对于工作组内的调用，访问'workgroup'
 * 作用域缓冲区的数据速度可以显著快于对全局可访问存储缓冲区
 * 的类似访问操作。
 *
 * 工作组共享内存的特点：
 * - 仅在工作组内可见和共享
 * - 访问速度比全局内存更快
 * - 生命周期与工作组执行周期一致
 * - 适用于需要频繁访问的临时数据
 *
 * 此节点只能与WebGPU后端一起使用
 *
 * @augments Node
 */
class WorkgroupInfoNode extends Node {
  /**
   * 构造一个新的作用域缓冲区
   *
   * @param {string} scope - 缓冲区的作用域类型（通常为'Workgroup'）
   * @param {string} bufferType - 'workgroup'作用域缓冲区元素的数据类型
   * @param {number} [bufferCount=0] - 缓冲区中元素的数量
   */
  constructor(scope, bufferType, bufferCount = 0) {
    // 调用父类构造函数，传入缓冲区类型
    super(bufferType);

    /**
     * 缓冲区类型
     *
     * 定义缓冲区中每个元素的数据类型，如'float', 'vec3', 'mat4'等
     *
     * @type {string}
     */
    this.bufferType = bufferType;

    /**
     * 缓冲区元素数量
     *
     * 指定缓冲区可以容纳的元素个数，0表示动态大小
     *
     * @type {number}
     * @default 0
     */
    this.bufferCount = bufferCount;

    /**
     * 此标志可用于类型测试
     *
     * 用于在运行时识别此节点是否为工作组信息节点
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isWorkgroupInfoNode = true;

    /**
     * 数组缓冲区的数据类型
     *
     * 与bufferType相同，表示缓冲区元素的基础数据类型
     *
     * @type {string}
     */
    this.elementType = bufferType;

    /**
     * 缓冲区的作用域
     *
     * 定义缓冲区的可见性和生命周期范围，通常为'Workgroup'
     *
     * @type {string}
     */
    this.scope = scope;

    /**
     * 工作组作用域缓冲区的名称
     *
     * 用于在着色器中标识此缓冲区，如果为空则自动生成
     *
     * @type {string}
     * @default ''
     */
    this.name = "";
  }

  /**
   * 设置此节点的名称
   *
   * @param {string} name - 要设置的名称
   * @return {WorkgroupInfoNode} 返回此节点的引用（支持链式调用）
   */
  setName(name) {
    // 设置缓冲区名称
    this.name = name;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 设置此节点的名称/标签
   *
   * @deprecated 已弃用，请使用setName()方法代替
   * @param {string} name - 要设置的名称
   * @return {WorkgroupInfoNode} 返回此节点的引用（支持链式调用）
   */
  label(name) {
    // 输出弃用警告
    console.warn('THREE.TSL: "label()" has been deprecated. Use "setName()" instead.'); // @deprecated r179

    // 调用新的setName方法
    return this.setName(name);
  }

  /**
   * 设置此节点的作用域
   *
   * @param {string} scope - 要设置的作用域
   * @return {WorkgroupInfoNode} 返回此节点的引用（支持链式调用）
   */
  setScope(scope) {
    // 设置缓冲区作用域
    this.scope = scope;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 获取数组缓冲区的数据类型
   *
   * @return {string} 元素类型
   */
  getElementType() {
    // 返回缓冲区元素的数据类型
    return this.elementType;
  }

  /**
   * 重写默认实现，因为输入类型是从作用域推断出来的
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {string} 输入类型
   */
  getInputType(/*builder*/) {
    // 根据作用域生成输入类型名称（如'WorkgroupArray'）
    return `${this.scope}Array`;
  }

  /**
   * 此方法可用于通过索引节点访问元素
   *
   * @param {IndexNode} indexNode - 索引节点，用于指定要访问的元素位置
   * @return {WorkgroupInfoElementNode} 返回对元素的引用
   */
  element(indexNode) {
    // 创建并返回工作组信息元素节点
    return nodeObject(new WorkgroupInfoElementNode(this, indexNode));
  }

  /**
   * 生成工作组信息节点的着色器代码
   *
   * 该方法负责生成用于创建工作组作用域数组的着色器代码
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @return {string} 生成的着色器代码
   */
  generate(builder) {
    // 确定缓冲区名称：使用自定义名称或生成默认名称
    const name = this.name !== "" ? this.name : `${this.scope}Array_${this.id}`;

    // 调用构建器方法生成作用域数组代码
    return builder.getScopedArray(name, this.scope.toLowerCase(), this.bufferType, this.bufferCount);
  }
}

// 导出WorkgroupInfoNode类作为默认导出
export default WorkgroupInfoNode;

/**
 * TSL函数，用于创建工作组信息节点
 *
 * 创建一个新的'workgroup'作用域数组缓冲区。
 * 这是一个便捷的工厂函数，用于在计算着色器中创建工作组共享内存。
 *
 * 使用示例：
 * ```js
 * // 创建一个包含64个float元素的工作组数组
 * const sharedFloats = workgroupArray('float', 64);
 *
 * // 创建一个包含32个vec3元素的工作组数组
 * const sharedVectors = workgroupArray('vec3', 32);
 *
 * // 在计算着色器中使用
 * const computeFn = Fn(() => {
 *     const localIndex = localId.x;
 *     sharedFloats.element(localIndex).assign(someValue);
 *     workgroupBarrier();
 *     const sharedValue = sharedFloats.element(localIndex);
 * });
 * ```
 *
 * @tsl
 * @function
 * @param {string} type - 'workgroup'作用域缓冲区元素的数据类型
 * @param {number} [count=0] - 缓冲区中元素的数量
 * @returns {WorkgroupInfoNode} 返回新创建的工作组信息节点
 */
export const workgroupArray = (type, count) => nodeObject(new WorkgroupInfoNode("Workgroup", type, count));
