/**
 * {@link NodeBuilder} 在节点构建过程中会创建此类的实例。
 * 它们代表构建器将要生成的最终着色器变量。
 * 为此目的，在 {@link NodeBuilder#vars} 中维护了一个节点变量字典。
 */
class NodeVar {
  /**
   * 构造一个新的节点变量。
   *
   * @param {string} name - 变量的名称。
   * @param {string} type - 变量的类型。
   * @param {boolean} [readOnly=false] - 只读标志。
   * @param {?number} [count=null] - 大小。
   */
  constructor(name, type, readOnly = false, count = null) {
    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isNodeVar = true; // 标识这是一个节点变量对象

    /**
     * 变量的名称。
     *
     * @type {string}
     */
    this.name = name; // 存储变量名称

    /**
     * 变量的类型。
     *
     * @type {string}
     */
    this.type = type; // 存储变量类型（如 float、vec3、mat4 等）

    /**
     * 只读标志。
     *
     * @type {boolean}
     */
    this.readOnly = readOnly; // 标识变量是否为只读

    /**
     * 大小。
     *
     * @type {?number}
     */
    this.count = count; // 存储变量的大小（用于数组等）
  }
}

export default NodeVar; // 导出 NodeVar 类作为默认导出
