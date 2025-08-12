import Node from "./Node.js"; // 导入Node基类
import StructTypeNode from "./StructTypeNode.js"; // 导入StructTypeNode类
import { nodeObject } from "../tsl/TSLCore.js"; // 导入nodeObject函数

/**
 * StructNode允许创建具有多个成员的自定义结构。
 * 这也可以用于在属性和统一数据中定义结构。
 *
 * ```js
 * // 定义一个自定义结构
 * const BoundingBox = struct( { min: 'vec3', max: 'vec3' } );
 *
 * // 创建结构的新实例
 * const bb = BoundingBox( vec3( 0 ), vec3( 1 ) ); // 样式 1
 * const bb = BoundingBox( { min: vec3( 0 ), max: vec3( 1 ) } ); // 样式 2
 *
 * // 访问结构成员
 * const min = bb.get( 'min' );
 *
 * // 为成员分配新值
 * min.assign( vec3() );
 * ```
 * @augments Node
 */
class StructNode extends Node {
  // 定义StructNode类，继承自Node

  static get type() {
    // 静态getter方法，返回节点类型

    return "StructNode"; // 返回节点类型字符串
  }

  /**
   * 构造一个新的结构节点。
   *
   * @param {StructTypeNode} structLayoutNode - 结构布局节点。
   * @param {Object} values - 结构的值。
   */
  constructor(structLayoutNode, values) {
    // 构造函数，接受结构布局节点和值

    super("vec3"); // 调用父类构造函数，默认类型为vec3

    /**
     * 结构布局节点。
     *
     * @type {StructTypeNode}
     */
    this.structLayoutNode = structLayoutNode; // 存储结构布局节点

    /**
     * 结构的值。
     *
     * @type {Object}
     */
    this.values = values; // 存储结构值

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isStructNode = true; // 标识这是一个结构节点对象
  }

  getNodeType(builder) {
    // 获取节点类型的方法

    return this.structLayoutNode.getNodeType(builder); // 返回结构布局节点的类型
  }

  getMemberType(builder, name) {
    // 获取成员类型的方法

    return this.structLayoutNode.getMemberType(builder, name); // 返回结构布局节点中指定成员的类型
  }

  generate(builder) {
    // 生成着色器代码的方法

    const nodeVar = builder.getVarFromNode(this); // 获取节点变量
    const structType = nodeVar.type; // 获取结构类型
    const propertyName = builder.getPropertyName(nodeVar); // 获取属性名

    builder.addLineFlowCode(`${propertyName} = ${builder.generateStruct(structType, this.structLayoutNode.membersLayout, this.values)}`, this); // 添加结构生成代码行

    return nodeVar.name; // 返回变量名
  }
}

export default StructNode; // 导出StructNode类作为默认导出

/**
 * 用于创建结构节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {Object} membersLayout - 结构成员的布局。
 * @param {?string} [name=null] - 结构的名称。
 * @returns {Function} 结构函数。
 */
export const struct = (membersLayout, name = null) => {
  // 导出struct函数，用于创建结构

  const structLayout = new StructTypeNode(membersLayout, name); // 创建结构类型节点

  const struct = (...params) => {
    // 定义结构构造函数

    let values = null; // 初始化值为null

    if (params.length > 0) {
      // 如果有参数

      if (params[0].isNode) {
        // 如果第一个参数是节点

        values = {}; // 创建空对象

        const names = Object.keys(membersLayout); // 获取成员名称数组

        for (let i = 0; i < params.length; i++) {
          // 遍历参数

          values[names[i]] = params[i]; // 将参数分配给对应的成员名称
        }
      } else {
        // 如果第一个参数不是节点

        values = params[0]; // 直接使用第一个参数作为值
      }
    }

    return nodeObject(new StructNode(structLayout, values)); // 返回包装的结构节点对象
  };

  struct.layout = structLayout; // 设置结构的布局属性
  struct.isStruct = true; // 标识这是一个结构函数

  return struct; // 返回结构函数
};
