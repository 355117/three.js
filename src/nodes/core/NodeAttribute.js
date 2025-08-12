/**
 * {@link NodeBuilder} 在节点构建过程中会创建此类的实例。
 * 它们代表构建器将要生成的最终着色器属性。
 * 为此目的，在 {@link NodeBuilder#attributes} 和 {@link NodeBuilder#bufferAttributes} 中
 * 维护了节点属性数组。
 *
 * NodeAttribute类用于封装着色器属性信息，包括属性名称、类型和关联的节点引用。
 * 这些属性在着色器编译时会被转换为实际的着色器变量声明。
 */
class NodeAttribute {
  /**
   * 构造一个新的节点属性。
   *
   * 此构造函数初始化一个NodeAttribute实例，用于存储着色器属性的相关信息。
   * 每个NodeAttribute实例都包含属性名称、类型和可选的节点引用。
   *
   * @param {string} name - 属性的名称，用于在着色器中标识该属性
   * @param {string} type - 属性的类型，如'float'、'vec3'、'mat4'等着色器数据类型
   * @param {?Node} node - 可选的节点引用，指向生成此属性的节点
   */
  constructor(name, type, node = null) {
    /**
     * 此标志可用于类型检测。
     * 标识该对象是一个NodeAttribute实例，便于运行时类型检查。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isNodeAttribute = true;

    /**
     * 属性的名称。
     * 在生成的着色器代码中，这将成为实际的变量名。
     *
     * @type {string}
     */
    this.name = name;

    /**
     * 属性的类型。
     * 指定着色器变量的数据类型，如'float'、'vec2'、'vec3'、'vec4'、'mat3'、'mat4'等。
     *
     * @type {string}
     */
    this.type = type;

    /**
     * 可选的节点引用。
     * 指向生成此属性的节点，用于建立属性与节点之间的关联关系。
     *
     * @type {?Node}
     * @default null
     */
    this.node = node;
  }
}

export default NodeAttribute;
