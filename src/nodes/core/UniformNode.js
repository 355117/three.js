import InputNode from "./InputNode.js"; // 导入InputNode基类
import { objectGroup } from "./UniformGroupNode.js"; // 导入对象组常量
import { nodeObject, getConstNodeType } from "../tsl/TSLCore.js"; // 导入TSL核心函数
import { getValueFromType } from "./NodeUtils.js"; // 导入节点工具函数

/**
 * 用于表示统一变量的类。
 *
 * @augments InputNode
 */
class UniformNode extends InputNode {
  // 定义UniformNode类，继承自InputNode

  static get type() {
    // 静态getter方法，返回节点类型

    return "UniformNode"; // 返回节点类型字符串
  }

  /**
   * 构造一个新的统一变量节点。
   *
   * @param {any} value - 此节点的值。通常是JS原始类型或three.js对象（向量、矩阵、颜色、纹理）。
   * @param {?string} nodeType - 节点类型。如果未定义显式类型，节点会尝试从其值推导类型。
   */
  constructor(value, nodeType = null) {
    // 构造函数，接受值和可选节点类型参数

    super(value, nodeType); // 调用父类构造函数

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isUniformNode = true; // 标识这是一个统一变量节点对象

    /**
     * 统一变量的名称或标签。
     *
     * @type {string}
     * @default ''
     */
    this.name = ""; // 初始化统一变量名称为空字符串

    /**
     * 此统一变量的统一组。默认情况下，统一变量
     * 按对象管理，但它们可能属于共享组，
     * 该组每帧或每次渲染调用更新。
     *
     * @type {UniformGroupNode}
     */
    this.groupNode = objectGroup; // 设置默认统一组为对象组
  }

  /**
   * 设置 {@link UniformNode#name} 属性。
   *
   * @param {string} name - 统一变量的名称。
   * @return {UniformNode} 对此节点的引用。
   */
  setName(name) {
    // 设置名称的方法

    this.name = name; // 设置统一变量名称

    return this; // 返回当前对象以支持链式调用
  }

  /**
   * 设置 {@link UniformNode#name} 属性。
   *
   * @deprecated
   * @param {string} name - 统一变量的名称。
   * @return {UniformNode} 对此节点的引用。
   */
  label(name) {
    // 已弃用的标签方法

    console.warn('THREE.TSL: "label()" has been deprecated. Use "setName()" instead.'); // @deprecated r179 // 输出弃用警告

    return this.setName(name); // 调用新的setName方法
  }

  /**
   * 设置 {@link UniformNode#groupNode} 属性。
   *
   * @param {UniformGroupNode} group - 统一组。
   * @return {UniformNode} 对此节点的引用。
   */
  setGroup(group) {
    // 设置组的方法

    this.groupNode = group; // 设置统一组节点

    return this; // 返回当前对象以支持链式调用
  }

  /**
   * 返回 {@link UniformNode#groupNode}。
   *
   * @return {UniformGroupNode} 统一组。
   */
  getGroup() {
    // 获取组的方法

    return this.groupNode; // 返回统一组节点
  }

  /**
   * 默认情况下，此方法返回 {@link Node#getHash} 的结果，但派生
   * 类可能会用不同的实现覆盖此方法。
   *
   * @param {NodeBuilder} builder - 当前节点构建器。
   * @return {string} 统一变量哈希值。
   */
  getUniformHash(builder) {
    // 获取统一变量哈希值的方法

    return this.getHash(builder); // 返回节点哈希值
  }

  /**
   * 设置更新回调函数。
   *
   * @param {Function} callback - 更新回调函数。
   * @param {string} updateType - 更新类型。
   * @return {UniformNode} 对此节点的引用。
   */
  onUpdate(callback, updateType) {
    // 设置更新回调的方法

    const self = this.getSelf(); // 获取自身引用

    callback = callback.bind(self); // 绑定回调函数的this上下文

    return super.onUpdate((frame) => {
      // 调用父类的onUpdate方法

      const value = callback(frame, self); // 执行回调函数获取新值

      if (value !== undefined) {
        // 如果返回值不为undefined

        this.value = value; // 更新节点值
      }
    }, updateType); // 传递更新类型
  }

  getInputType(builder) {
    // 获取输入类型的方法

    let type = super.getInputType(builder); // 调用父类方法获取类型

    if (type === "bool") {
      // 如果类型是布尔值

      type = "uint"; // 转换为无符号整数类型
    }

    return type; // 返回类型
  }

  generate(builder, output) {
    // 生成着色器代码的方法

    const type = this.getNodeType(builder); // 获取节点类型

    const hash = this.getUniformHash(builder); // 获取统一变量哈希值

    let sharedNode = builder.getNodeFromHash(hash); // 从哈希获取共享节点

    if (sharedNode === undefined) {
      // 如果共享节点不存在

      builder.setHashNode(this, hash); // 设置哈希节点

      sharedNode = this; // 使用当前节点作为共享节点
    }

    const sharedNodeType = sharedNode.getInputType(builder); // 获取共享节点的输入类型

    const nodeUniform = builder.getUniformFromNode(sharedNode, sharedNodeType, builder.shaderStage, this.name || builder.context.nodeName); // 从节点获取统一变量
    const uniformName = builder.getPropertyName(nodeUniform); // 获取统一变量名称

    if (builder.context.nodeName !== undefined) delete builder.context.nodeName; // 删除上下文中的节点名称

    //

    let snippet = uniformName; // 初始化代码片段为统一变量名称

    if (type === "bool") {
      // 如果类型是布尔值

      // 缓存到变量

      const nodeData = builder.getDataFromNode(this); // 获取节点数据

      let propertyName = nodeData.propertyName; // 获取属性名称

      if (propertyName === undefined) {
        // 如果属性名称未定义

        const nodeVar = builder.getVarFromNode(this, null, "bool"); // 获取布尔类型的节点变量
        propertyName = builder.getPropertyName(nodeVar); // 获取属性名称

        nodeData.propertyName = propertyName; // 存储属性名称

        snippet = builder.format(uniformName, sharedNodeType, type); // 格式化代码片段

        builder.addLineFlowCode(`${propertyName} = ${snippet}`, this); // 添加赋值代码行
      }

      snippet = propertyName; // 使用属性名称作为代码片段
    }

    return builder.format(snippet, type, output); // 格式化并返回最终代码片段
  }
}

export default UniformNode; // 导出UniformNode类作为默认导出

/**
 * 用于创建统一变量节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {any|string} value - 此统一变量的值或类型。通常是JS原始类型或three.js对象（向量、矩阵、颜色、纹理）。
 * @param {string} [type] - 节点类型。如果未定义显式类型，节点会尝试从其值推导类型。
 * @returns {UniformNode}
 */
export const uniform = (value, type) => {
  // 导出uniform函数，用于创建统一变量节点

  const nodeType = getConstNodeType(type || value); // 获取常量节点类型

  if (nodeType === value) {
    // 如果节点类型等于值

    // 如果值是类型但没有值

    value = getValueFromType(nodeType); // 从类型获取默认值
  }

  // @TODO: 将来从.traverse()获取ConstNode
  value = value && value.isNode === true ? (value.node && value.node.value) || value.value : value; // 提取节点值

  return nodeObject(new UniformNode(value, nodeType)); // 返回包装的统一变量节点对象
};
