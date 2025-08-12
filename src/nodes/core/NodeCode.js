/**
 * {@link NodeBuilder} 在节点构建过程中会创建此类的实例。
 * 它们代表用户定义的原生着色器代码片段，这些代码片段将被构建器注入。
 * 为此目的，在 {@link NodeBuilder#codes} 中维护了一个节点代码字典。
 *
 * NodeCode类用于封装着色器代码片段，包含代码的名称、类型和实际的着色器代码内容。
 * 这些代码片段在着色器编译时会被注入到最终的着色器程序中。
 */
class NodeCode {
  /**
   * 构造一个新的代码节点。
   *
   * 此构造函数初始化一个NodeCode实例，用于存储着色器代码片段的相关信息。
   * 每个NodeCode实例都包含名称、类型和实际的着色器代码内容。
   *
   * @param {string} name - 代码的名称，用于标识这个代码片段
   * @param {string} type - 节点类型，指定代码片段的用途或分类
   * @param {string} [code=''] - 原生着色器代码内容，默认为空字符串
   */
  constructor(name, type, code = "") {
    /**
     * 代码的名称。
     * 用于标识和引用这个特定的代码片段。
     *
     * @type {string}
     */
    this.name = name;

    /**
     * 节点类型。
     * 指定此代码片段的类型或用途，帮助构建器正确处理代码。
     *
     * @type {string}
     */
    this.type = type;

    /**
     * 原生着色器代码。
     * 包含实际的着色器代码内容，这些代码将被注入到最终的着色器程序中。
     *
     * @type {string}
     * @default ''
     */
    this.code = code;

    // 定义一个不可枚举、不可配置、不可写的属性，用于类型检查
    // 这个属性标识该对象是一个NodeCode实例
    Object.defineProperty(this, "isNodeCode", { value: true });
  }
}

export default NodeCode;
