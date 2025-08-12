// 导入节点对象包装器
import { nodeObject } from "../tsl/TSLBase.js";
// 导入节点更新类型常量
import { NodeUpdateType } from "../core/constants.js";
// 导入获取值类型的工具函数
import { getValueType } from "../core/NodeUtils.js";
// 导入数组元素节点基类
import ArrayElementNode from "../utils/ArrayElementNode.js";
// 导入缓冲区节点基类
import BufferNode from "./BufferNode.js";

/**
 * 统一数组元素节点 - 表示对统一数组节点的元素访问
 *
 * @augments ArrayElementNode
 */
class UniformArrayElementNode extends ArrayElementNode {
  // 返回节点类型标识符
  static get type() {
    return "UniformArrayElementNode";
  }

  /**
   * 构造一个新的缓冲区节点
   *
   * @param {UniformArrayNode} uniformArrayNode - 要访问的统一数组节点
   * @param {IndexNode} indexNode - 定义数组中被访问元素位置的索引数据
   */
  constructor(uniformArrayNode, indexNode) {
    // 调用父类构造函数
    super(uniformArrayNode, indexNode);

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isArrayBufferElementNode = true;
  }

  /**
   * 生成统一数组元素节点的代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 生成的代码片段
   */
  generate(builder) {
    // 调用父类生成方法
    const snippet = super.generate(builder);
    // 获取节点类型和填充类型
    const type = this.getNodeType();
    const paddedType = this.node.getPaddedType();

    // 格式化代码片段
    return builder.format(snippet, paddedType, type);
  }
}

/**
 * 统一数组节点 - 类似于 {@link BufferNode}，此模块将类数组数据表示为统一缓冲区
 * 与 {@link BufferNode} 不同，它可以处理数组中更常见的数据类型（例如 `three.js` 原语）
 * 并自动管理缓冲区填充。在使用统一缓冲区时应该是首选
 * ```js
 * const tintColors = uniformArray( [
 * 	new Color( 1, 0, 0 ),
 * 	new Color( 0, 1, 0 ),
 * 	new Color( 0, 0, 1 )
 * ], 'color' );
 *
 * const redColor = tintColors.element( 0 );
 *
 * @augments BufferNode
 */
class UniformArrayNode extends BufferNode {
  // 返回节点类型标识符
  static get type() {
    return "UniformArrayNode";
  }

  /**
   * 构造一个新的统一数组节点
   *
   * @param {Array<any>} value - 保存缓冲区数据的数组
   * @param {?string} [elementType=null] - 缓冲区元素的数据类型
   */
  constructor(value, elementType = null) {
    // 调用父类构造函数
    super(null);

    /**
     * 保存缓冲区数据的数组。与 {@link BufferNode} 不同，数组可以
     * 保存数字原语以及three.js对象，如向量、矩阵或颜色
     *
     * @type {Array<any>}
     */
    this.array = value;

    /**
     * 数组元素的数据类型
     *
     * @type {string}
     */
    this.elementType = elementType === null ? getValueType(value[0]) : elementType;

    /**
     * 填充类型。统一缓冲区必须符合特定的缓冲区布局，
     * 因此计算单独的类型以确保正确的缓冲区大小
     *
     * @type {string}
     */
    this.paddedType = this.getPaddedType();

    /**
     * 重写，因为统一数组节点按渲染更新
     *
     * @type {string}
     * @default 'render'
     */
    this.updateType = NodeUpdateType.RENDER;

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isArrayBufferNode = true;
  }

  /**
   * 重写此方法，因为节点类型从 {@link UniformArrayNode#paddedType} 推断
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 节点类型
   */
  getNodeType(/*builder*/) {
    return this.paddedType;
  }

  /**
   * 数组元素的数据类型
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 元素类型
   */
  getElementType() {
    return this.elementType;
  }

  /**
   * 根据元素类型返回填充类型
   *
   * @return {string} 填充类型
   */
  getPaddedType() {
    const elementType = this.elementType;

    // 默认填充类型为vec4
    let paddedType = "vec4";

    // 根据元素类型确定填充类型
    if (elementType === "mat2") {
      paddedType = "mat2";
    } else if (/mat/.test(elementType) === true) {
      // 其他矩阵类型使用mat4填充
      paddedType = "mat4";
    } else if (elementType.charAt(0) === "i") {
      // 整数类型使用ivec4填充
      paddedType = "ivec4";
    } else if (elementType.charAt(0) === "u") {
      // 无符号整数类型使用uvec4填充
      paddedType = "uvec4";
    }

    return paddedType;
  }

  /**
   * 更新确保正确地将数组中（复杂）对象的数据传输到内部正确填充的值缓冲区
   *
   * @param {NodeFrame} frame - 对当前节点帧的引用
   */
  update(/*frame*/) {
    // 获取数组和值缓冲区
    const { array, value } = this;

    const elementType = this.elementType;

    // 处理基本数值类型（float、int、uint）
    if (elementType === "float" || elementType === "int" || elementType === "uint") {
      for (let i = 0; i < array.length; i++) {
        const index = i * 4;

        // 将标量值存储在4元素块的第一个位置
        value[index] = array[i];
      }
    } else if (elementType === "color") {
      // 处理颜色类型
      for (let i = 0; i < array.length; i++) {
        const index = i * 4;
        const vector = array[i];

        // 存储RGB分量
        value[index] = vector.r;
        value[index + 1] = vector.g;
        value[index + 2] = vector.b || 0;
        //value[ index + 3 ] = vector.a || 0; // Alpha分量（注释掉）
      }
    } else if (elementType === "mat2") {
      // 处理2x2矩阵
      for (let i = 0; i < array.length; i++) {
        const index = i * 4;
        const matrix = array[i];

        // 存储2x2矩阵的4个元素
        value[index] = matrix.elements[0];
        value[index + 1] = matrix.elements[1];
        value[index + 2] = matrix.elements[2];
        value[index + 3] = matrix.elements[3];
      }
    } else if (elementType === "mat3") {
      // 处理3x3矩阵（填充为4x4布局）
      for (let i = 0; i < array.length; i++) {
        const index = i * 16;
        const matrix = array[i];

        // 第一列
        value[index] = matrix.elements[0];
        value[index + 1] = matrix.elements[1];
        value[index + 2] = matrix.elements[2];

        // 第二列
        value[index + 4] = matrix.elements[3];
        value[index + 5] = matrix.elements[4];
        value[index + 6] = matrix.elements[5];

        // 第三列
        value[index + 8] = matrix.elements[6];
        value[index + 9] = matrix.elements[7];
        value[index + 10] = matrix.elements[8];

        // 第四列的最后一个元素设为1（齐次坐标）
        value[index + 15] = 1;
      }
    } else if (elementType === "mat4") {
      // 处理4x4矩阵
      for (let i = 0; i < array.length; i++) {
        const index = i * 16;
        const matrix = array[i];

        // 直接复制所有16个矩阵元素
        for (let i = 0; i < matrix.elements.length; i++) {
          value[index + i] = matrix.elements[i];
        }
      }
    } else {
      // 处理向量类型（vec2、vec3、vec4等）
      for (let i = 0; i < array.length; i++) {
        const index = i * 4;
        const vector = array[i];

        // 存储向量分量，缺失的分量用0填充
        value[index] = vector.x;
        value[index + 1] = vector.y;
        value[index + 2] = vector.z || 0;
        value[index + 3] = vector.w || 0;
      }
    }
  }

  /**
   * 基于数组数据实现值缓冲区创建
   *
   * @param {NodeBuilder} builder - 对当前节点构建器的引用
   * @return {null}
   */
  setup(builder) {
    // 获取数组长度和元素类型
    const length = this.array.length;
    const elementType = this.elementType;

    // 默认使用Float32Array
    let arrayType = Float32Array;

    // 获取填充类型和填充元素长度
    const paddedType = this.paddedType;
    const paddedElementLength = builder.getTypeLength(paddedType);

    // 根据元素类型选择合适的数组类型
    if (elementType.charAt(0) === "i") arrayType = Int32Array; // 整数类型
    if (elementType.charAt(0) === "u") arrayType = Uint32Array; // 无符号整数类型

    // 创建值缓冲区
    this.value = new arrayType(length * paddedElementLength);
    this.bufferCount = length;
    this.bufferType = paddedType;

    // 调用父类设置方法
    return super.setup(builder);
  }

  /**
   * 重写默认的 `element()` 方法以提供基于 {@link UniformArrayNode} 的元素访问
   *
   * @param {IndexNode} indexNode - 索引节点
   * @return {UniformArrayElementNode}
   */
  element(indexNode) {
    return nodeObject(new UniformArrayElementNode(this, nodeObject(indexNode)));
  }
}

// 导出UniformArrayNode类作为默认导出
export default UniformArrayNode;

/**
 * TSL函数 - 用于创建统一数组节点
 *
 * @tsl
 * @function
 * @param {Array<any>} values - 类数组数据
 * @param {?string} [nodeType] - 数组元素的数据类型
 * @returns {UniformArrayNode}
 */
export const uniformArray = (values, nodeType) => nodeObject(new UniformArrayNode(values, nodeType));
