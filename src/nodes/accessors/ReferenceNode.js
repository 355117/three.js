// 导入节点基类
import Node from "../core/Node.js";
// 导入节点更新类型常量
import { NodeUpdateType } from "../core/constants.js";
// 导入统一变量函数
import { uniform } from "../core/UniformNode.js";
// 导入纹理节点函数
import { texture } from "./TextureNode.js";
// 导入立方体纹理节点函数
import { cubeTexture } from "./CubeTextureNode.js";
// 导入缓冲区节点函数
import { buffer } from "./BufferNode.js";
// 导入节点对象包装器
import { nodeObject } from "../tsl/TSLBase.js";
// 导入统一数组节点函数
import { uniformArray } from "./UniformArrayNode.js";
// 导入数组元素节点
import ArrayElementNode from "../utils/ArrayElementNode.js";

// TODO: 避免重复代码，只使用 ReferenceBaseNode 或 ReferenceNode

/**
 * 引用元素节点 - 仅在引用的属性是类数组时相关
 * 在这种情况下，`ReferenceElementNode` 允许通过索引引用数据结构内的特定元素
 *
 * @augments ArrayElementNode
 */
class ReferenceElementNode extends ArrayElementNode {
  // 返回节点类型标识符
  static get type() {
    return "ReferenceElementNode";
  }

  /**
   * 构造一个新的引用元素节点
   *
   * @param {?ReferenceNode} referenceNode - 引用节点
   * @param {Node} indexNode - 定义元素访问的索引节点
   */
  constructor(referenceNode, indexNode) {
    // 调用父类构造函数
    super(referenceNode, indexNode);

    /**
     * 类似于 {@link ReferenceNode#reference}，一个额外的属性引用当前节点
     *
     * @type {?ReferenceNode}
     * @default null
     */
    this.referenceNode = referenceNode;

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isReferenceElementNode = true;
  }

  /**
   * 重写此方法，因为节点类型从引用节点的统一变量类型推断
   *
   * @return {string} 节点类型
   */
  getNodeType() {
    return this.referenceNode.uniformType;
  }

  // 生成着色器代码
  generate(builder) {
    // 调用父类生成方法
    const snippet = super.generate(builder);
    // 获取数组类型和元素类型
    const arrayType = this.referenceNode.getNodeType();
    const elementType = this.getNodeType();

    // 格式化并返回代码片段
    return builder.format(snippet, arrayType, elementType);
  }
}

/**
 * 引用节点 - 建立对另一个对象属性引用的节点类型
 * 通过这种方式，节点的值自动链接到引用对象的值
 * 引用节点内部将链接的值表示为统一变量
 *
 * @augments Node
 */
class ReferenceNode extends Node {
  // 返回节点类型标识符
  static get type() {
    return "ReferenceNode";
  }

  /**
   * 构造一个新的引用节点
   *
   * @param {string} property - 节点引用的属性名称
   * @param {string} uniformType - 用于表示属性值的统一变量类型
   * @param {?Object} [object=null] - 属性所属的对象
   * @param {?number} [count=null] - 当链接的属性是类数组时，此参数定义其长度
   */
  constructor(property, uniformType, object = null, count = null) {
    // 调用父类构造函数
    super();

    /**
     * 节点引用的属性名称
     *
     * @type {string}
     */
    this.property = property;

    /**
     * 用于表示属性值的统一变量类型
     *
     * @type {string}
     */
    this.uniformType = uniformType;

    /**
     * 属性所属的对象
     *
     * @type {?Object}
     * @default null
     */
    this.object = object;

    /**
     * 当链接的属性是数组时，此参数定义其长度
     *
     * @type {?number}
     * @default null
     */
    this.count = count;

    /**
     * 属性名称可能包含点，因此可以引用嵌套属性
     * 名称的层次结构存储在此数组中
     *
     * @type {Array<string>}
     */
    this.properties = property.split(".");

    /**
     * 指向当前引用的对象。此属性与 {@link ReferenceNode#object} 并存
     * 因为最终引用可能会从调用代码中更新
     *
     * @type {?Object}
     * @default null
     */
    this.reference = object;

    /**
     * 保存引用节点值的统一变量节点
     *
     * @type {UniformNode}
     * @default null
     */
    this.node = null;

    /**
     * 内部统一变量的统一变量组
     *
     * @type {UniformGroupNode}
     * @default null
     */
    this.group = null;

    /**
     * 内部统一变量节点的可选标签
     *
     * @type {?string}
     * @default null
     */
    this.name = null;

    /**
     * 重写更新类型，因为引用节点按对象更新
     *
     * @type {string}
     * @default 'object'
     */
    this.updateType = NodeUpdateType.OBJECT;
  }

  /**
   * 当引用的属性是类数组时，可以使用此方法通过索引节点访问元素
   *
   * @param {IndexNode} indexNode - 索引节点
   * @return {ReferenceElementNode} 对元素的引用
   */
  element(indexNode) {
    return nodeObject(new ReferenceElementNode(this, nodeObject(indexNode)));
  }

  /**
   * 为此引用节点设置统一变量组
   *
   * @param {UniformGroupNode} group - 要设置的统一变量组
   * @return {ReferenceNode} 对此节点的引用
   */
  setGroup(group) {
    this.group = group;

    return this;
  }

  /**
   * 为内部统一变量设置名称
   *
   * @param {string} name - 要设置的标签
   * @return {ReferenceNode} 对此节点的引用
   */
  setName(name) {
    this.name = name;

    return this;
  }

  /**
   * 为内部统一变量设置标签
   *
   * @deprecated
   * @param {string} name - 要设置的标签
   * @return {ReferenceNode} 对此节点的引用
   */
  label(name) {
    console.warn('THREE.TSL: "label()" has been deprecated. Use "setName()" instead.'); // @deprecated r179

    return this.setName(name);
  }

  /**
   * 设置节点类型，自动定义内部统一变量类型
   *
   * @param {string} uniformType - 要设置的类型
   */
  setNodeType(uniformType) {
    let node = null;

    // 根据不同情况创建相应的节点类型
    if (this.count !== null) {
      // 如果有计数，创建缓冲区节点
      node = buffer(null, uniformType, this.count);
    } else if (Array.isArray(this.getValueFromReference())) {
      // 如果引用值是数组，创建统一数组节点
      node = uniformArray(null, uniformType);
    } else if (uniformType === "texture") {
      // 如果是纹理类型，创建纹理节点
      node = texture(null);
    } else if (uniformType === "cubeTexture") {
      // 如果是立方体纹理类型，创建立方体纹理节点
      node = cubeTexture(null);
    } else {
      // 其他情况创建普通统一变量节点
      node = uniform(null, uniformType);
    }

    // 如果有统一变量组，设置给节点
    if (this.group !== null) {
      node.setGroup(this.group);
    }

    // 如果有名称，设置给节点
    if (this.name !== null) node.setName(this.name);

    // 保存节点引用
    this.node = node.getSelf();
  }

  /**
   * 重写此方法，因为节点类型从引用节点的类型推断
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 节点类型
   */
  getNodeType(builder) {
    // 如果节点为空，先更新引用和值
    if (this.node === null) {
      this.updateReference(builder);
      this.updateValue();
    }

    // 返回内部节点的类型
    return this.node.getNodeType(builder);
  }

  /**
   * 从给定的引用对象返回属性值
   *
   * @param {Object} [object=this.reference] - 要从中检索属性值的对象
   * @return {any} 属性值
   */
  getValueFromReference(object = this.reference) {
    // 获取属性层次结构
    const { properties } = this;

    // 获取第一级属性值
    let value = object[properties[0]];

    // 遍历嵌套属性
    for (let i = 1; i < properties.length; i++) {
      value = value[properties[i]];
    }

    return value;
  }

  /**
   * 允许根据给定状态更新引用。仅当 {@link ReferenceNode#object} 未设置时才评估状态
   *
   * @param {(NodeFrame|NodeBuilder)} state - 当前状态
   * @return {Object} 更新后的引用
   */
  updateReference(state) {
    // 如果设置了对象则使用设置的对象，否则使用状态中的对象
    this.reference = this.object !== null ? this.object : state.object;

    return this.reference;
  }

  /**
   * 引用节点的输出是内部统一变量节点
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {UniformNode} 输出节点
   */
  setup(/* builder */) {
    // 更新值并返回内部节点
    this.updateValue();

    return this.node;
  }

  /**
   * 重写以更新内部统一变量值
   *
   * @param {NodeFrame} frame - 对当前节点帧的引用
   */
  update(/*frame*/) {
    // 更新统一变量值
    this.updateValue();
  }

  /**
   * 从引用的对象属性检索值并使用它来更新内部统一变量
   */
  updateValue() {
    // 如果节点为空，先设置节点类型
    if (this.node === null) this.setNodeType(this.uniformType);

    // 从引用获取值
    const value = this.getValueFromReference();

    // 根据值类型设置统一变量
    if (Array.isArray(value)) {
      // 如果是数组，设置array属性
      this.node.array = value;
    } else {
      // 否则设置value属性
      this.node.value = value;
    }
  }
}

// 导出ReferenceNode类作为默认导出
export default ReferenceNode;

/**
 * TSL函数 - 用于创建引用节点
 *
 * @tsl
 * @function
 * @param {string} name - 节点引用的属性名称
 * @param {string} type - 用于表示属性值的统一变量类型
 * @param {?Object} [object] - 属性所属的对象
 * @returns {ReferenceNode}
 */
export const reference = (name, type, object) => nodeObject(new ReferenceNode(name, type, object));

/**
 * TSL函数 - 用于创建引用节点。如果需要引用应表示为统一缓冲区的类数组属性，请使用此函数
 *
 * @tsl
 * @function
 * @param {string} name - 节点引用的属性名称
 * @param {string} type - 用于表示属性值的统一变量类型
 * @param {number} count - 类数组对象内的值数量
 * @param {Object} object - 属性所属的类数组对象
 * @returns {ReferenceNode}
 */
export const referenceBuffer = (name, type, count, object) => nodeObject(new ReferenceNode(name, type, object, count));
