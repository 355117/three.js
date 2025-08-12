import Node from "./Node.js"; // 导入Node基类

/**
 * 此节点可用于将 {@link UniformNode} 的单个实例分组
 * 并将它们作为统一缓冲区进行管理。
 *
 * 在大多数情况下，在定义 {@link UniformNode#groupNode} 属性时
 * 将使用预定义的节点 `objectGroup`、`renderGroup` 和 `frameGroup`。
 *
 * - `objectGroup`: 每个对象的统一缓冲区。
 * - `renderGroup`: 共享统一缓冲区，每次渲染调用更新一次。
 * - `frameGroup`: 共享统一缓冲区，每帧更新一次。
 *
 * @augments Node
 */
class UniformGroupNode extends Node {
  // 定义UniformGroupNode类，继承自Node

  static get type() {
    // 静态getter方法，返回节点类型

    return "UniformGroupNode"; // 返回节点类型字符串
  }

  /**
   * 构造一个新的统一组节点。
   *
   * @param {string} name - 统一组节点的名称。
   * @param {boolean} [shared=false] - 此统一组节点是否共享。
   * @param {number} [order=1] - 影响内部排序。
   */
  constructor(name, shared = false, order = 1) {
    // 构造函数，接受名称、共享标志和顺序参数

    super("string"); // 调用父类构造函数，类型为string

    /**
     * 统一组节点的名称。
     *
     * @type {string}
     */
    this.name = name; // 存储统一组名称

    /**
     * 此统一组节点是否共享。
     *
     * @type {boolean}
     * @default false
     */
    this.shared = shared; // 存储共享标志

    /**
     * 影响内部排序。
     * TODO: 添加何时应更改此属性的详细信息。
     *
     * @type {number}
     * @default 1
     */
    this.order = order; // 存储排序顺序

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isUniformGroup = true; // 标识这是一个统一组对象
  }

  /**
   * 序列化节点数据。
   *
   * @param {Object} data - 要序列化的数据对象。
   */
  serialize(data) {
    // 序列化方法

    super.serialize(data); // 调用父类序列化方法

    data.name = this.name; // 序列化名称
    data.version = this.version; // 序列化版本
    data.shared = this.shared; // 序列化共享标志
  }

  /**
   * 反序列化节点数据。
   *
   * @param {Object} data - 要反序列化的数据对象。
   */
  deserialize(data) {
    // 反序列化方法

    super.deserialize(data); // 调用父类反序列化方法

    this.name = data.name; // 反序列化名称
    this.version = data.version; // 反序列化版本
    this.shared = data.shared; // 反序列化共享标志
  }
}

export default UniformGroupNode; // 导出UniformGroupNode类作为默认导出

/**
 * 用于创建具有给定名称的统一组节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {string} name - 统一组节点的名称。
 * @returns {UniformGroupNode}
 */
export const uniformGroup = (name) => new UniformGroupNode(name); // 导出uniformGroup函数，用于创建统一组节点

/**
 * 用于创建具有给定名称和顺序的共享统一组节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {string} name - 统一组节点的名称。
 * @param {number} [order=0] - 影响内部排序。
 * @returns {UniformGroupNode}
 */
export const sharedUniformGroup = (name, order = 0) => new UniformGroupNode(name, true, order); // 导出sharedUniformGroup函数，用于创建共享统一组节点

/**
 * 表示每帧更新一次的共享统一组节点的TSL对象。
 *
 * @tsl
 * @type {UniformGroupNode}
 */
export const frameGroup = /*@__PURE__*/ sharedUniformGroup("frame"); // 导出frameGroup常量，表示帧级共享统一组

/**
 * 表示每次渲染更新一次的共享统一组节点的TSL对象。
 *
 * @tsl
 * @type {UniformGroupNode}
 */
export const renderGroup = /*@__PURE__*/ sharedUniformGroup("render"); // 导出renderGroup常量，表示渲染级共享统一组

/**
 * 表示每个对象更新一次的统一组节点的TSL对象。
 *
 * @tsl
 * @type {UniformGroupNode}
 */
export const objectGroup = /*@__PURE__*/ uniformGroup("object"); // 导出objectGroup常量，表示对象级统一组
