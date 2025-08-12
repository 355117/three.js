// 导入缓冲区节点基类
import BufferNode from "./BufferNode.js";
// 导入缓冲区属性节点函数
import { bufferAttribute } from "./BufferAttributeNode.js";
// 导入节点对象包装器和变量节点函数
import { nodeObject, varying } from "../tsl/TSLBase.js";
// 导入存储数组元素节点函数
import { storageElement } from "../utils/StorageArrayElementNode.js";
// 导入节点访问常量
import { NodeAccess } from "../core/constants.js";
// 导入从长度获取类型的工具函数
import { getTypeFromLength } from "../core/NodeUtils.js";

/**
 * 存储缓冲区节点 - 在计算着色器上下文中使用，允许为数据定义存储缓冲区
 * 典型的工作流程是使用便利函数 `attributeArray()` 或 `instancedArray()` 创建此节点的实例，
 * 设置一个写入缓冲区的计算着色器，然后将存储缓冲区转换为属性节点进行渲染。
 *
 * ```js
 * const positionBuffer = instancedArray( particleCount, 'vec3' ); // 存储缓冲区节点
 *
 * const computeInit = Fn( () => { // 计算着色器
 *
 * 	const position = positionBuffer.element( instanceIndex );
 *
 * 	// 计算位置数据
 *
 * 	position.x = 1;
 * 	position.y = 1;
 * 	position.z = 1;
 *
 * } )().compute( particleCount );
 *
 * const particleMaterial = new THREE.SpriteNodeMaterial();
 * particleMaterial.positionNode = positionBuffer.toAttribute();
 *
 * renderer.computeAsync( computeInit );
 *
 * ```
 *
 * @augments BufferNode
 */
class StorageBufferNode extends BufferNode {
  // 返回节点类型标识符
  static get type() {
    return "StorageBufferNode";
  }

  /**
   * 构造一个新的存储缓冲区节点
   *
   * @param {StorageBufferAttribute|StorageInstancedBufferAttribute|BufferAttribute} value - 缓冲区数据
   * @param {?(string|Struct)} [bufferType=null] - 缓冲区类型（例如 `'vec3'`）
   * @param {number} [bufferCount=0] - 缓冲区计数
   */
  constructor(value, bufferType = null, bufferCount = 0) {
    let nodeType,
      structTypeNode = null;

    // 根据缓冲区类型确定节点类型
    if (bufferType && bufferType.isStruct) {
      // 如果是结构体类型
      nodeType = "struct";
      structTypeNode = bufferType.layout;

      // 如果是存储缓冲区属性，获取其计数
      if (value.isStorageBufferAttribute || value.isStorageInstancedBufferAttribute) {
        bufferCount = value.count;
      }
    } else if (bufferType === null && (value.isStorageBufferAttribute || value.isStorageInstancedBufferAttribute)) {
      // 如果缓冲区类型为空且值是存储缓冲区属性，从项目大小推断类型
      nodeType = getTypeFromLength(value.itemSize);
      bufferCount = value.count;
    } else {
      // 其他情况直接使用提供的缓冲区类型
      nodeType = bufferType;
    }

    // 调用父类构造函数
    super(value, nodeType, bufferCount);

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isStorageBufferNode = true;

    /**
     * 缓冲区结构体类型
     *
     * @type {?StructTypeNode}
     * @default null
     */
    this.structTypeNode = structTypeNode;

    /**
     * 纹理节点的访问类型
     *
     * @type {string}
     * @default 'readWrite'
     */
    this.access = NodeAccess.READ_WRITE;

    /**
     * 节点是否为原子操作
     *
     * @type {boolean}
     * @default false
     */
    this.isAtomic = false;

    /**
     * 节点是否表示PBO（像素缓冲区对象）
     * 仅与WebGL相关
     *
     * @type {boolean}
     * @default false
     */
    this.isPBO = false;

    /**
     * 对内部缓冲区属性节点的引用
     *
     * @type {?BufferAttributeNode}
     * @default null
     */
    this._attribute = null;

    /**
     * 对内部变量节点的引用
     *
     * @type {?VaryingNode}
     * @default null
     */
    this._varying = null;

    /**
     * `StorageBufferNode` 默认将此属性设置为 `true`
     *
     * @type {boolean}
     * @default true
     */
    this.global = true;

    // 如果值不是存储缓冲区属性，则标记为存储缓冲区属性
    if (value.isStorageBufferAttribute !== true && value.isStorageInstancedBufferAttribute !== true) {
      // TODO: 改进此处，可能向BufferAttribute添加新属性以在渲染器中将其标识为存储缓冲区只读属性

      if (value.isInstancedBufferAttribute) value.isStorageInstancedBufferAttribute = true;
      else value.isStorageBufferAttribute = true;
    }
  }

  /**
   * 重写此方法，因为缓冲区数据可能被共享，因此哈希也应该被共享
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 哈希值
   */
  getHash(builder) {
    // 如果缓冲区计数为0，使用共享缓存
    if (this.bufferCount === 0) {
      let bufferData = builder.globalCache.getData(this.value);

      // 如果缓存中没有数据，创建新的缓冲区数据
      if (bufferData === undefined) {
        bufferData = {
          node: this,
        };

        builder.globalCache.setData(this.value, bufferData);
      }

      // 返回缓存节点的UUID
      return bufferData.node.uuid;
    }

    // 否则返回当前节点的UUID
    return this.uuid;
  }

  /**
   * 重写默认实现以返回固定值 `'indirectStorageBuffer'` 或 `'storageBuffer'`
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 输入类型
   */
  getInputType(/*builder*/) {
    // 根据是否为间接存储缓冲区属性返回相应类型
    return this.value.isIndirectStorageBufferAttribute ? "indirectStorageBuffer" : "storageBuffer";
  }

  /**
   * 启用使用给定索引节点的元素访问
   *
   * @param {IndexNode} indexNode - 索引节点
   * @return {StorageArrayElementNode} 表示元素访问的节点
   */
  element(indexNode) {
    return storageElement(this, indexNode);
  }

  /**
   * 定义此节点是否为PBO。仅与WebGL相关
   *
   * @param {boolean} value - 要设置的值
   * @return {StorageBufferNode} 对此节点的引用
   */
  setPBO(value) {
    this.isPBO = value;

    return this;
  }

  /**
   * 返回 `isPBO` 值
   *
   * @return {boolean} 节点是否表示PBO
   */
  getPBO() {
    return this.isPBO;
  }

  /**
   * 定义节点访问权限
   *
   * @param {string} value - 节点访问权限
   * @return {StorageBufferNode} 对此节点的引用
   */
  setAccess(value) {
    this.access = value;

    return this;
  }

  /**
   * 配置只读节点访问权限的便利方法
   *
   * @return {StorageBufferNode} 对此节点的引用
   */
  toReadOnly() {
    return this.setAccess(NodeAccess.READ_ONLY);
  }

  /**
   * 定义节点是否为原子操作
   *
   * @param {boolean} value - 原子标志
   * @return {StorageBufferNode} 对此节点的引用
   */
  setAtomic(value) {
    this.isAtomic = value;

    return this;
  }

  /**
   * 使此节点成为原子操作的便利方法
   *
   * @return {StorageBufferNode} 对此节点的引用
   */
  toAtomic() {
    return this.setAtomic(true);
  }

  /**
   * 返回此存储缓冲区节点的属性数据
   *
   * @return {{attribute: BufferAttributeNode, varying: VaryingNode}} 属性数据
   */
  getAttributeData() {
    // 如果属性为空，创建缓冲区属性和变量节点
    if (this._attribute === null) {
      this._attribute = bufferAttribute(this.value);
      this._varying = varying(this._attribute);
    }

    return {
      attribute: this._attribute,
      varying: this._varying,
    };
  }

  /**
   * 重写此方法，因为节点类型来自存储缓冲区的可用性和属性数据
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 节点类型
   */
  getNodeType(builder) {
    // 如果有结构体类型节点，返回其节点类型
    if (this.structTypeNode !== null) {
      return this.structTypeNode.getNodeType(builder);
    }

    // 如果支持存储缓冲区，使用父类的节点类型
    if (builder.isAvailable("storageBuffer") || builder.isAvailable("indirectStorageBuffer")) {
      return super.getNodeType(builder);
    }

    // 否则使用属性数据的节点类型
    const { attribute } = this.getAttributeData();

    return attribute.getNodeType(builder);
  }

  /**
   * 返回结构体成员的类型
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {string} name - 成员的名称
   * @return {string} 成员的类型
   */
  getMemberType(builder, name) {
    // 如果有结构体类型节点，返回其成员类型
    if (this.structTypeNode !== null) {
      return this.structTypeNode.getMemberType(builder, name);
    }

    // 否则返回void类型
    return "void";
  }

  /**
   * 生成存储缓冲区节点的代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 生成的代码片段
   */
  generate(builder) {
    // 如果有结构体类型节点，先构建它
    if (this.structTypeNode !== null) this.structTypeNode.build(builder);

    // 如果支持存储缓冲区，使用父类的生成方法
    if (builder.isAvailable("storageBuffer") || builder.isAvailable("indirectStorageBuffer")) {
      return super.generate(builder);
    }

    // 否则使用属性和变量节点
    const { attribute, varying } = this.getAttributeData();

    // 构建变量节点输出
    const output = varying.build(builder);

    // 注册变换
    builder.registerTransform(output, attribute);

    return output;
  }
}

// 导出StorageBufferNode类作为默认导出
export default StorageBufferNode;

/**
 * TSL函数 - 用于创建存储缓冲区节点
 *
 * @tsl
 * @function
 * @param {StorageBufferAttribute|StorageInstancedBufferAttribute|BufferAttribute} value - 缓冲区数据
 * @param {?(string|Struct)} [type=null] - 缓冲区类型（例如 `'vec3'`）
 * @param {number} [count=0] - 缓冲区计数
 * @returns {StorageBufferNode}
 */
export const storage = (value, type = null, count = 0) => nodeObject(new StorageBufferNode(value, type, count));

/**
 * TSL函数 - 已弃用的存储对象创建函数
 *
 * @tsl
 * @function
 * @deprecated 自r171起弃用。请使用 `storage().setPBO( true )` 代替
 *
 * @param {StorageBufferAttribute|StorageInstancedBufferAttribute|BufferAttribute} value - 缓冲区数据
 * @param {?string} type - 缓冲区类型（例如 `'vec3'`）
 * @param {number} count - 缓冲区计数
 * @returns {StorageBufferNode}
 */
export const storageObject = (value, type, count) => {
  // @deprecated, r171

  console.warn('THREE.TSL: "storageObject()" is deprecated. Use "storage().setPBO( true )" instead.');

  return storage(value, type, count).setPBO(true);
};
