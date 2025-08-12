/**
 * 表示结构类型的类。
 * 用于定义着色器中的自定义结构类型。
 */
class StructType {
  // 定义StructType类

  /**
   * 构造一个新的结构类型。
   *
   * @param {string} name - 结构类型的名称。
   * @param {Array} members - 结构成员的数组。
   */
  constructor(name, members) {
    // 构造函数，接受名称和成员参数

    /**
     * 结构类型的名称。
     *
     * @type {string}
     */
    this.name = name; // 存储结构类型名称

    /**
     * 结构成员的数组。
     *
     * @type {Array}
     */
    this.members = members; // 存储结构成员

    /**
     * 标识是否为输出结构。
     *
     * @type {boolean}
     * @default false
     */
    this.output = false; // 标识是否为输出结构，默认为false
  }
}

export default StructType; // 导出StructType类作为默认导出
