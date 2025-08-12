import Node from "./Node.js"; // 导入Node基类
import { nodeProxy } from "../tsl/TSLBase.js"; // 导入nodeProxy函数

/**
 * 此节点可用于在着色器程序中定义多个输出。
 *
 * @augments Node
 */
class OutputStructNode extends Node {
  // 定义OutputStructNode类，继承自Node

  static get type() {
    // 静态getter方法，返回节点类型

    return "OutputStructNode"; // 返回节点类型字符串
  }

  /**
   * 构造一个新的输出结构节点。构造函数可以接受任意数量的
   * 代表成员的节点。
   *
   * @param {...Node} members - 节点的参数列表。
   */
  constructor(...members) {
    // 构造函数，接受可变数量的成员节点

    super(); // 调用父类构造函数

    /**
     * 定义输出的节点数组。
     *
     * @type {Array<Node>}
     */
    this.members = members; // 存储成员节点数组

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isOutputStructNode = true; // 标识这是一个输出结构节点对象
  }

  getNodeType(builder) {
    // 获取节点类型的方法

    const properties = builder.getNodeProperties(this); // 获取节点属性

    if (properties.membersLayout === undefined) {
      // 如果成员布局未定义

      const members = this.members; // 获取成员节点
      const membersLayout = []; // 创建成员布局数组

      for (let i = 0; i < members.length; i++) {
        // 遍历所有成员节点

        const name = "m" + i; // 生成成员名称
        const type = members[i].getNodeType(builder); // 获取成员节点类型

        membersLayout.push({ name, type, index: i }); // 添加成员布局信息
      }

      properties.membersLayout = membersLayout; // 设置成员布局
      properties.structType = builder.getOutputStructTypeFromNode(this, properties.membersLayout); // 获取结构类型
    }

    return properties.structType.name; // 返回结构类型名称
  }

  generate(builder) {
    // 生成着色器代码的方法

    const propertyName = builder.getOutputStructName(); // 获取输出结构名称
    const members = this.members; // 获取成员节点

    const structPrefix = propertyName !== "" ? propertyName + "." : ""; // 构建结构前缀

    for (let i = 0; i < members.length; i++) {
      // 遍历所有成员节点

      const snippet = members[i].build(builder); // 构建成员节点代码

      builder.addLineFlowCode(`${structPrefix}m${i} = ${snippet}`, this); // 添加赋值代码行
    }

    return propertyName; // 返回属性名称
  }
}

export default OutputStructNode; // 导出OutputStructNode类作为默认导出

/**
 * 用于创建输出结构节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {...Node} members - 节点的参数列表。
 * @returns {OutputStructNode}
 */
export const outputStruct = /*@__PURE__*/ nodeProxy(OutputStructNode); // 导出outputStruct函数，用于创建输出结构节点
