// 导入输入节点基类
import InputNode from "./InputNode.js";

// 正则表达式：匹配数值类型（float、int、uint）
const _regNum = /float|u?int/;

/**
 * Class for representing a constant value in the shader.
 * 用于在着色器中表示常量值的类。
 *
 * @augments InputNode
 */
class ConstNode extends InputNode {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "ConstNode";
  }

  /**
   * Constructs a new input node.
   * 构造一个新的输入节点。
   *
   * @param {any} value - The value of this node. Usually a JS primitive or three.js object (vector, matrix, color). 此节点的值。通常是JS原始类型或three.js对象（向量、矩阵、颜色）。
   * @param {?string} nodeType - The node type. If no explicit type is defined, the node tries to derive the type from its value. 节点类型。如果没有定义明确的类型，节点会尝试从其值推导类型。
   */
  constructor(value, nodeType = null) {
    // 调用父类构造函数
    super(value, nodeType);

    /**
     * This flag can be used for type testing.
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isConstNode = true;
  }

  /**
   * Generates the shader string of the value with the current node builder.
   * 使用当前节点构建器生成值的着色器字符串。
   *
   * @param {NodeBuilder} builder - The current node builder. 当前节点构建器。
   * @return {string} The generated value as a shader string. 生成的值作为着色器字符串。
   */
  generateConst(builder) {
    // 使用构建器生成常量，传入节点类型和值
    return builder.generateConst(this.getNodeType(builder), this.value);
  }

  // 生成着色器代码
  generate(builder, output) {
    // 获取节点类型
    const type = this.getNodeType(builder);

    // 如果节点类型和输出类型都是数值类型，直接生成常量
    if (_regNum.test(type) && _regNum.test(output)) {
      return builder.generateConst(output, this.value);
    }

    // 否则格式化常量代码
    return builder.format(this.generateConst(builder), type, output);
  }
}

// 导出ConstNode类作为默认导出
export default ConstNode;
