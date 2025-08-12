// 导入纹理节点基类
import TextureNode from "./TextureNode.js";
// 导入节点代理函数
import { nodeProxy } from "../tsl/TSLBase.js";
// 导入节点访问常量
import { NodeAccess } from "../core/constants.js";

/**
 * 存储纹理节点 - 纹理节点的特殊版本，可用于通过计算着色器将数据写入存储纹理
 *
 * ```js
 * const storageTexture = new THREE.StorageTexture( width, height );
 *
 * const computeTexture = Fn( ( { storageTexture } ) => {
 *
 * 	const posX = instanceIndex.mod( width );
 * 	const posY = instanceIndex.div( width );
 * 	const indexUV = uvec2( posX, posY );
 *
 * 	// 生成RGB值
 *
 * 	const r = 1;
 * 	const g = 1;
 * 	const b = 1;
 *
 * 	textureStore( storageTexture, indexUV, vec4( r, g, b, 1 ) ).toWriteOnly();
 *
 * } );
 *
 * const computeNode = computeTexture( { storageTexture } ).compute( width * height );
 * renderer.computeAsync( computeNode );
 * ```
 *
 * 此节点只能与WebGPU后端一起使用。
 *
 * @augments TextureNode
 */
class StorageTextureNode extends TextureNode {
  // 返回节点类型标识符
  static get type() {
    return "StorageTextureNode";
  }

  /**
   * 构造一个新的存储纹理节点
   *
   * @param {StorageTexture} value - 存储纹理
   * @param {Node<vec2|vec3>} uvNode - UV节点
   * @param {?Node} [storeNode=null] - 应存储在纹理中的值节点
   */
  constructor(value, uvNode, storeNode = null) {
    // 调用父类构造函数
    super(value, uvNode);

    /**
     * 应存储在纹理中的值节点
     *
     * @type {?Node}
     * @default null
     */
    this.storeNode = storeNode;

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isStorageTextureNode = true;

    /**
     * 纹理节点的访问类型
     *
     * @type {string}
     * @default 'writeOnly'
     */
    this.access = NodeAccess.WRITE_ONLY;
  }

  /**
   * 重写默认实现以返回固定值 `'storageTexture'`
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 输入类型
   */
  getInputType(/*builder*/) {
    return "storageTexture";
  }

  /**
   * 设置存储纹理节点的属性
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {Object} 节点属性
   */
  setup(builder) {
    // 调用父类设置方法
    super.setup(builder);

    // 获取节点属性并设置存储节点
    const properties = builder.getNodeProperties(this);
    properties.storeNode = this.storeNode;

    return properties;
  }

  /**
   * 定义节点访问权限
   *
   * @param {string} value - 节点访问权限
   * @return {StorageTextureNode} 对此节点的引用
   */
  setAccess(value) {
    this.access = value;
    return this;
  }

  /**
   * 生成存储节点的代码片段。如果未定义 `storeNode`，则将纹理节点生成为普通纹理
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {string} output - 当前输出
   * @return {string} 生成的代码片段
   */
  generate(builder, output) {
    let snippet;

    // 如果有存储节点，生成存储代码
    if (this.storeNode !== null) {
      snippet = this.generateStore(builder);
    } else {
      // 否则生成普通纹理代码
      snippet = super.generate(builder, output);
    }

    return snippet;
  }

  /**
   * 配置读写节点访问权限的便利方法
   *
   * @return {StorageTextureNode} 对此节点的引用
   */
  toReadWrite() {
    return this.setAccess(NodeAccess.READ_WRITE);
  }

  /**
   * 配置只读节点访问权限的便利方法
   *
   * @return {StorageTextureNode} 对此节点的引用
   */
  toReadOnly() {
    return this.setAccess(NodeAccess.READ_ONLY);
  }

  /**
   * 配置只写节点访问权限的便利方法
   *
   * @return {StorageTextureNode} 对此节点的引用
   */
  toWriteOnly() {
    return this.setAccess(NodeAccess.WRITE_ONLY);
  }

  /**
   * 生成存储纹理节点的代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   */
  generateStore(builder) {
    // 获取节点属性
    const properties = builder.getNodeProperties(this);

    const { uvNode, storeNode, depthNode } = properties;

    // 生成纹理属性代码
    const textureProperty = super.generate(builder, "property");
    // 根据纹理类型生成UV代码片段
    const uvSnippet = uvNode.build(builder, this.value.is3DTexture === true ? "uvec3" : "uvec2");
    // 生成存储值代码片段
    const storeSnippet = storeNode.build(builder, "vec4");
    // 如果有深度节点，生成深度代码片段
    const depthSnippet = depthNode ? depthNode.build(builder, "int") : null;

    // 生成纹理存储代码
    const snippet = builder.generateTextureStore(builder, textureProperty, uvSnippet, depthSnippet, storeSnippet);

    // 添加代码行到流程中
    builder.addLineFlowCode(snippet, this);
  }

  /**
   * 克隆存储纹理节点
   *
   * @return {StorageTextureNode} 克隆的节点
   */
  clone() {
    // 调用父类克隆方法
    const newNode = super.clone();
    // 复制存储节点
    newNode.storeNode = this.storeNode;
    return newNode;
  }
}

// 导出StorageTextureNode类作为默认导出
export default StorageTextureNode;

/**
 * TSL函数 - 用于创建存储纹理节点
 *
 * @tsl
 * @function
 * @param {StorageTexture} value - 存储纹理
 * @param {?Node<vec2|vec3>} uvNode - UV节点
 * @param {?Node} [storeNode=null] - 应存储在纹理中的值节点
 * @returns {StorageTextureNode}
 */
export const storageTexture = /*@__PURE__*/ nodeProxy(StorageTextureNode).setParameterLength(1, 3);

/**
 * TSL函数 - 纹理存储函数
 * TODO: 解释与 `storageTexture()` 的区别
 *
 * @tsl
 * @function
 * @param {StorageTexture} value - 存储纹理
 * @param {Node<vec2|vec3>} uvNode - UV节点
 * @param {?Node} [storeNode=null] - 应存储在纹理中的值节点
 * @returns {StorageTextureNode}
 */
export const textureStore = (value, uvNode, storeNode) => {
  // 创建存储纹理节点
  const node = storageTexture(value, uvNode, storeNode);

  // 如果有存储节点，将节点添加到堆栈
  if (storeNode !== null) node.toStack();

  return node;
};
