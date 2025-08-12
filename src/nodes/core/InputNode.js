// 导入基础节点类
import Node from "./Node.js";
// 导入节点工具函数：获取值类型、从类型获取值、数组缓冲区转Base64
import { getValueType, getValueFromType, arrayBufferToBase64 } from "./NodeUtils.js";

/**
 * 输入节点基类 - 用于表示数据输入节点
 *
 * @augments Node
 */
class InputNode extends Node {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "InputNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的输入节点
   *
   * @param {any} value - 节点的值，可以是任何JS原始类型、函数、数组缓冲区或three.js对象（向量、矩阵、颜色等）
   * @param {?string} nodeType - 节点类型。如果未定义显式类型，节点会尝试从其值推导类型
   */
  constructor(value, nodeType = null) {
    // 调用父类构造函数
    super(nodeType);

    /**
     * 类型测试标志 - 用于识别此节点为输入节点
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isInputNode = true;

    /**
     * 节点的值 - 可以是任何JS原始类型、函数、数组缓冲区或three.js对象（向量、矩阵、颜色等）
     *
     * @type {any}
     */
    this.value = value;

    /**
     * 着色器中值的精度
     *
     * @type {?('low'|'medium'|'high')}
     * @default null
     */
    this.precision = null;
  }

  /**
   * 获取节点类型 - 如果未设置显式类型，则从值推导类型
   *
   * @param {NodeBuilder} builder - 节点构建器（未使用）
   * @return {string} 节点类型
   */
  getNodeType(/*builder*/) {
    // 如果节点类型为null，则从值推导类型
    if (this.nodeType === null) {
      return getValueType(this.value);
    }

    // 返回显式设置的节点类型
    return this.nodeType;
  }

  /**
   * 获取输入类型 - 默认情况下返回节点类型
   * 派生模块可能会重写此方法，使用固定类型或分析计算类型
   *
   * 输入类型和节点类型不同的典型例子是纹理：
   * 普通RGBA纹理的输入类型是`texture`，而节点类型是`vec4`
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 输入类型
   */
  getInputType(builder) {
    // 默认返回节点类型
    return this.getNodeType(builder);
  }

  /**
   * 设置精度值 - 如果最终精度需要分析计算，派生类可以重写此方法
   *
   * @param {('low'|'medium'|'high')} precision - 着色器中输入值的精度
   * @return {InputNode} 返回此节点的引用（支持链式调用）
   */
  setPrecision(precision) {
    // 设置精度值
    this.precision = precision;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 序列化节点数据 - 将节点状态保存到数据对象中
   *
   * @param {Object} data - 用于存储序列化数据的对象
   */
  serialize(data) {
    // 调用父类的序列化方法
    super.serialize(data);

    // 保存节点值
    data.value = this.value;

    // 如果值有toArray方法，则转换为数组形式
    if (this.value && this.value.toArray) data.value = this.value.toArray();

    // 保存值类型和节点类型
    data.valueType = getValueType(this.value);
    data.nodeType = this.nodeType;

    // 如果值类型是ArrayBuffer，则转换为Base64字符串
    if (data.valueType === "ArrayBuffer") data.value = arrayBufferToBase64(data.value);

    // 保存精度设置
    data.precision = this.precision;
  }

  /**
   * 反序列化节点数据 - 从数据对象中恢复节点状态
   *
   * @param {Object} data - 包含序列化数据的对象
   */
  deserialize(data) {
    // 调用父类的反序列化方法
    super.deserialize(data);

    // 恢复节点类型
    this.nodeType = data.nodeType;
    // 恢复节点值：如果是数组则从类型创建值，否则直接使用
    this.value = Array.isArray(data.value) ? getValueFromType(data.valueType, ...data.value) : data.value;

    // 恢复精度设置
    this.precision = data.precision || null;

    // 如果值有fromArray方法，则从数组恢复
    if (this.value && this.value.fromArray) this.value = this.value.fromArray(data.value);
  }

  /**
   * 生成着色器代码 - 抽象方法，需要在派生类中实现
   *
   * @param {NodeBuilder} builder - 节点构建器（未使用）
   * @param {string} output - 输出类型（未使用）
   */
  generate(/*builder, output*/) {
    // 输出警告，提示这是抽象方法
    console.warn("Abstract function.");
  }
}

// 导出输入节点类作为默认导出
export default InputNode;
