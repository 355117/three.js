/**
 * {@link NodeBuilder}在节点构建过程中会创建此类的实例。
 * 它们表示构建器将要生成的最终着色器uniform变量。
 * 为此目的，在{@link NodeBuilder#uniforms}中维护了一个节点uniform的字典。
 *
 * NodeUniform是节点系统与着色器uniform变量之间的桥梁，
 * 负责管理uniform的名称、类型和值的传递。
 */
class NodeUniform {
  /**
   * 构造一个新的节点uniform。
   * 初始化uniform的基本属性，包括名称、类型和关联的节点引用。
   *
   * @param {string} name - uniform的名称
   * @param {string} type - uniform的类型（如float、vec3、mat4等）
   * @param {UniformNode} node - 关联的uniform节点引用
   */
  constructor(name, type, node) {
    /**
     * 类型标识标志，用于类型检测。
     * 可以通过此标志快速判断对象是否为NodeUniform实例。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isNodeUniform = true;

    /**
     * uniform的名称。
     * 在生成的着色器代码中用作uniform变量的标识符。
     *
     * @type {string}
     */
    this.name = name;

    /**
     * uniform的类型。
     * 定义了uniform变量的数据类型，如基础类型或复合类型。
     *
     * @type {string}
     */
    this.type = type;

    /**
     * 关联的节点引用。
     * 指向实际的uniform节点对象，用于获取值和其他属性。
     *
     * @type {UniformNode}
     */
    this.node = node.getSelf();
  }

  /**
   * uniform节点的值。
   * 获取或设置uniform变量的实际数据值。
   *
   * @type {any}
   */
  get value() {
    // 从关联的节点获取值
    return this.node.value;
  }

  set value(val) {
    // 设置关联节点的值
    this.node.value = val;
  }

  /**
   * uniform节点的ID。
   * 用于唯一标识uniform节点的数字标识符。
   *
   * @type {number}
   */
  get id() {
    // 从关联的节点获取ID
    return this.node.id;
  }

  /**
   * uniform节点的组。
   * 返回uniform所属的组节点，用于uniform的分组管理。
   *
   * @type {UniformGroupNode}
   */
  get groupNode() {
    // 从关联的节点获取组节点
    return this.node.groupNode;
  }
}

export default NodeUniform;
