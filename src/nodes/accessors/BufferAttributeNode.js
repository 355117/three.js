// 导入输入节点基类
import InputNode from "../core/InputNode.js";
// 导入TSL核心函数和方法链
import { nodeObject, addMethodChaining } from "../tsl/TSLCore.js";
// 导入变量节点
import { varying } from "../core/VaryingNode.js";

// 导入交错缓冲区属性类
import { InterleavedBufferAttribute } from "../../core/InterleavedBufferAttribute.js";
// 导入交错缓冲区类
import { InterleavedBuffer } from "../../core/InterleavedBuffer.js";
// 导入缓冲区使用模式常量
import { StaticDrawUsage, DynamicDrawUsage } from "../../constants.js";

/**
 * 缓冲区属性节点，允许在节点级别定义属性数据
 * 在早期的Three.js版本中，只能在几何体级别定义属性数据。
 * 使用BufferAttributeNode，也可以在节点级别进行定义。
 *
 * 使用示例：
 * ```js
 * const geometry = new THREE.PlaneGeometry();
 * const positionAttribute = geometry.getAttribute( 'position' );
 *
 * const colors = [];
 * for ( let i = 0; i < position.count; i ++ ) {
 * 	colors.push( 1, 0, 0 );
 * }
 *
 * material.colorNode = bufferAttribute( new THREE.Float32BufferAttribute( colors, 3 ) );
 * ```
 * 这种新方法在通过计算着色器生成几何体数据时特别有用。
 * 下面的代码将存储缓冲区转换为属性节点：
 * ```js
 * material.positionNode = positionBuffer.toAttribute();
 * ```
 * @augments InputNode
 */
class BufferAttributeNode extends InputNode {
  static get type() {
    return "BufferAttributeNode";
  }

  /**
   * 构造一个新的缓冲区属性节点
   *
   * @param {BufferAttribute|InterleavedBuffer|TypedArray} value - 属性数据
   * @param {?string} [bufferType=null] - 缓冲区类型（例如 `'vec3'`）
   * @param {number} [bufferStride=0] - 缓冲区步长
   * @param {number} [bufferOffset=0] - 缓冲区偏移量
   */
  constructor(value, bufferType = null, bufferStride = 0, bufferOffset = 0) {
    // 调用父类构造函数
    super(value, bufferType);

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isBufferNode = true;

    /**
     * 缓冲区类型（例如 `'vec3'`）
     *
     * @type {?string}
     * @default null
     */
    this.bufferType = bufferType;

    /**
     * 缓冲区步长
     *
     * @type {number}
     * @default 0
     */
    this.bufferStride = bufferStride;

    /**
     * 缓冲区偏移量
     *
     * @type {number}
     * @default 0
     */
    this.bufferOffset = bufferOffset;

    /**
     * 使用属性。如果计划每帧更新属性数据，
     * 请通过 `.setUsage()` 将其设置为 `THREE.DynamicDrawUsage`
     *
     * @type {number}
     * @default StaticDrawUsage
     */
    this.usage = StaticDrawUsage;

    /**
     * 属性是否为实例化属性
     *
     * @type {boolean}
     * @default false
     */
    this.instanced = false;

    /**
     * 对缓冲区属性的引用
     *
     * @type {?BufferAttribute}
     * @default null
     */
    this.attribute = null;

    /**
     * `BufferAttributeNode` 默认将此属性设置为 `true`
     *
     * @type {boolean}
     * @default true
     */
    this.global = true;

    // 如果传入的值是BufferAttribute实例，则直接使用
    if (value && value.isBufferAttribute === true) {
      this.attribute = value; // 设置属性引用
      this.usage = value.usage; // 继承使用模式
      this.instanced = value.isInstancedBufferAttribute; // 继承实例化状态
    }
  }

  /**
   * 重写此方法，因为属性数据可能被共享，
   * 因此哈希值也应该被共享
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 哈希值
   */
  getHash(builder) {
    // 如果没有步长和偏移量，则使用共享缓存
    if (this.bufferStride === 0 && this.bufferOffset === 0) {
      // 从全局缓存中获取缓冲区数据
      let bufferData = builder.globalCache.getData(this.value);

      // 如果缓存中没有数据，则创建新的缓冲区数据
      if (bufferData === undefined) {
        bufferData = {
          node: this, // 存储当前节点引用
        };

        // 将缓冲区数据存储到全局缓存中
        builder.globalCache.setData(this.value, bufferData);
      }

      // 返回缓冲区数据节点的UUID
      return bufferData.node.uuid;
    }

    // 如果有步长或偏移量，则返回当前节点的UUID
    return this.uuid;
  }

  /**
   * 重写此方法，因为节点类型是从缓冲区属性推断出来的
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 节点类型
   */
  getNodeType(builder) {
    // 如果缓冲区类型为空，则从属性中获取类型
    if (this.bufferType === null) {
      this.bufferType = builder.getTypeFromAttribute(this.attribute);
    }

    // 返回缓冲区类型
    return this.bufferType;
  }

  /**
   * 根据传递给节点的值，`setup()` 的行为会有所不同。
   * 如果没有传递 `BufferAttribute` 实例，该方法会创建一个内部属性并相应地配置它。
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   */
  setup(builder) {
    // 如果已经有属性，则直接返回
    if (this.attribute !== null) return;

    // 获取节点类型
    const type = this.getNodeType(builder);
    // 获取数组数据
    const array = this.value;
    // 获取项目大小
    const itemSize = builder.getTypeLength(type);
    // 计算步长（如果没有指定则使用项目大小）
    const stride = this.bufferStride || itemSize;
    // 获取偏移量
    const offset = this.bufferOffset;

    // 创建交错缓冲区（如果数组不是交错缓冲区）
    const buffer = array.isInterleavedBuffer === true ? array : new InterleavedBuffer(array, stride);
    // 创建交错缓冲区属性
    const bufferAttribute = new InterleavedBufferAttribute(buffer, itemSize, offset);

    // 设置缓冲区使用模式
    buffer.setUsage(this.usage);

    // 设置属性引用
    this.attribute = bufferAttribute;
    // 设置实例化属性标志 @TODO: 添加可能的 InstancedInterleavedBufferAttribute
    this.attribute.isInstancedBufferAttribute = this.instanced;
  }

  /**
   * 生成缓冲区属性节点的代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 生成的代码片段
   */
  generate(builder) {
    // 获取节点类型
    const nodeType = this.getNodeType(builder);

    // 从节点获取缓冲区属性
    const nodeAttribute = builder.getBufferAttributeFromNode(this, nodeType);
    // 获取属性名称
    const propertyName = builder.getPropertyName(nodeAttribute);

    let output = null;

    // 如果是顶点着色器或计算着色器阶段
    if (builder.shaderStage === "vertex" || builder.shaderStage === "compute") {
      // 设置节点名称
      this.name = propertyName;
      // 直接输出属性名称
      output = propertyName;
    } else {
      // 对于其他着色器阶段，创建变量节点
      const nodeVarying = varying(this);
      // 构建变量节点输出
      output = nodeVarying.build(builder, nodeType);
    }

    return output;
  }

  /**
   * 重写默认实现，返回固定值 `'bufferAttribute'`
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 输入类型
   */
  getInputType(/*builder*/) {
    return "bufferAttribute";
  }

  /**
   * 将 `usage` 属性设置为给定值
   *
   * @param {number} value - 要设置的使用模式
   * @return {BufferAttributeNode} 对此节点的引用
   */
  setUsage(value) {
    // 设置使用模式
    this.usage = value;

    // 如果属性存在且是BufferAttribute实例，则同时设置属性的使用模式
    if (this.attribute && this.attribute.isBufferAttribute === true) {
      this.attribute.usage = value;
    }

    // 返回当前节点以支持链式调用
    return this;
  }

  /**
   * 将 `instanced` 属性设置为给定值
   *
   * @param {boolean} value - 要设置的实例化状态
   * @return {BufferAttributeNode} 对此节点的引用
   */
  setInstanced(value) {
    // 设置实例化状态
    this.instanced = value;

    // 返回当前节点以支持链式调用
    return this;
  }
}

export default BufferAttributeNode;

/**
 * 用于创建缓冲区属性节点的TSL函数
 *
 * @tsl
 * @function
 * @param {BufferAttribute|InterleavedBuffer|TypedArray} array - 属性数据
 * @param {?string} [type=null] - 缓冲区类型（例如 `'vec3'`）
 * @param {number} [stride=0] - 缓冲区步长
 * @param {number} [offset=0] - 缓冲区偏移量
 * @returns {BufferAttributeNode}
 */
export const bufferAttribute = (array, type = null, stride = 0, offset = 0) => nodeObject(new BufferAttributeNode(array, type, stride, offset));

/**
 * 用于创建具有动态绘制使用模式的缓冲区属性节点的TSL函数
 * 如果属性数据每帧都会更新，请使用此函数
 *
 * @tsl
 * @function
 * @param {BufferAttribute|InterleavedBuffer|TypedArray} array - 属性数据
 * @param {?string} [type=null] - 缓冲区类型（例如 `'vec3'`）
 * @param {number} [stride=0] - 缓冲区步长
 * @param {number} [offset=0] - 缓冲区偏移量
 * @returns {BufferAttributeNode}
 */
export const dynamicBufferAttribute = (array, type = null, stride = 0, offset = 0) => bufferAttribute(array, type, stride, offset).setUsage(DynamicDrawUsage);

/**
 * 用于创建启用实例化的缓冲区属性节点的TSL函数
 *
 * @tsl
 * @function
 * @param {BufferAttribute|InterleavedBuffer|TypedArray} array - 属性数据
 * @param {?string} [type=null] - 缓冲区类型（例如 `'vec3'`）
 * @param {number} [stride=0] - 缓冲区步长
 * @param {number} [offset=0] - 缓冲区偏移量
 * @returns {BufferAttributeNode}
 */
export const instancedBufferAttribute = (array, type = null, stride = 0, offset = 0) => bufferAttribute(array, type, stride, offset).setInstanced(true);

/**
 * 用于创建具有动态绘制使用模式和启用实例化的缓冲区属性节点的TSL函数
 *
 * @tsl
 * @function
 * @param {BufferAttribute|InterleavedBuffer|TypedArray} array - 属性数据
 * @param {?string} [type=null] - 缓冲区类型（例如 `'vec3'`）
 * @param {number} [stride=0] - 缓冲区步长
 * @param {number} [offset=0] - 缓冲区偏移量
 * @returns {BufferAttributeNode}
 */
export const instancedDynamicBufferAttribute = (array, type = null, stride = 0, offset = 0) => dynamicBufferAttribute(array, type, stride, offset).setInstanced(true);

// 添加方法链，将缓冲区节点转换为属性节点
addMethodChaining("toAttribute", (bufferNode) => bufferAttribute(bufferNode.value));
