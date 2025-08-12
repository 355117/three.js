// 从常量模块导入WebGL坐标系统
import { WebGLCoordinateSystem } from "../../constants.js";
// 从核心模块导入临时节点基类
import TempNode from "../core/TempNode.js";
// 从TSL核心模块导入方法链接、函数构造器、整数类型和节点代理意图
import { addMethodChaining, Fn, int, nodeProxyIntent } from "../tsl/TSLCore.js";

// 向量操作符映射表：将操作符符号映射到对应的方法名
const _vectorOperators = {
  "==": "equal", // 等于操作符
  "!=": "notEqual", // 不等于操作符
  "<": "lessThan", // 小于操作符
  ">": "greaterThan", // 大于操作符
  "<=": "lessThanEqual", // 小于等于操作符
  ">=": "greaterThanEqual", // 大于等于操作符
  "%": "mod", // 取模操作符
};

/**
 * 这个节点代表基本的数学和逻辑运算，如加法、
 * 减法或比较运算（例如 `equal()`）。
 *
 * @augments TempNode
 */
class OperatorNode extends TempNode {
  // 获取节点类型的静态方法
  static get type() {
    return "OperatorNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的操作符节点。
   *
   * @param {string} op - 操作符。
   * @param {Node} aNode - 第一个输入。
   * @param {Node} bNode - 第二个输入。
   * @param {...Node} params - 额外的输入参数。
   */
  constructor(op, aNode, bNode, ...params) {
    super(); // 调用父类构造函数

    // 如果有额外参数，处理多参数操作
    if (params.length > 0) {
      // 创建初始操作节点
      let finalOp = new OperatorNode(op, aNode, bNode);

      // 遍历额外参数，逐个与前面的结果进行运算
      for (let i = 0; i < params.length - 1; i++) {
        finalOp = new OperatorNode(op, finalOp, params[i]);
      }

      // 重新设置参数
      aNode = finalOp;
      bNode = params[params.length - 1];
    }

    /**
     * 操作符。
     *
     * @type {string}
     */
    this.op = op;

    /**
     * 第一个输入。
     *
     * @type {Node}
     */
    this.aNode = aNode;

    /**
     * 第二个输入。
     *
     * @type {Node}
     */
    this.bNode = bNode;

    /**
     * 这个标志可以用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isOperatorNode = true;
  }

  /**
   * 返回操作符方法名。
   *
   * @param {NodeBuilder} builder - 当前节点构建器。
   * @param {string} output - 输出类型。
   * @returns {string} 操作符方法名。
   */
  getOperatorMethod(builder, output) {
    return builder.getMethod(_vectorOperators[this.op], output);
  }

  /**
   * 这个方法被重写，因为节点类型是从操作符
   * 和输入节点类型推断出来的。
   *
   * @param {NodeBuilder} builder - 当前节点构建器。
   * @return {string} 节点类型。
   */
  getNodeType(builder) {
    const op = this.op; // 获取操作符

    const aNode = this.aNode; // 第一个输入节点
    const bNode = this.bNode; // 第二个输入节点

    const typeA = aNode.getNodeType(builder); // 获取第一个输入的类型
    const typeB = bNode ? bNode.getNodeType(builder) : null; // 获取第二个输入的类型（如果存在）

    // 如果任一输入类型为void，返回void
    if (typeA === "void" || typeB === "void") {
      return "void";
      // 取模操作返回第一个操作数的类型
    } else if (op === "%") {
      return typeA;
      // 位运算操作返回整数类型
    } else if (op === "~" || op === "&" || op === "|" || op === "^" || op === ">>" || op === "<<") {
      return builder.getIntegerType(typeA);
      // 逻辑运算返回布尔类型
    } else if (op === "!" || op === "&&" || op === "||" || op === "^^") {
      return "bool";
      // 比较运算返回布尔类型或布尔向量类型
    } else if (op === "==" || op === "!=" || op === "<" || op === ">" || op === "<=" || op === ">=") {
      const typeLength = Math.max(builder.getTypeLength(typeA), builder.getTypeLength(typeB));

      return typeLength > 1 ? `bvec${typeLength}` : "bool";
    } else {
      // 处理矩阵运算

      if (builder.isMatrix(typeA)) {
        if (typeB === "float") {
          return typeA; // 矩阵 * 标量 = 矩阵
        } else if (builder.isVector(typeB)) {
          return builder.getVectorFromMatrix(typeA); // 矩阵 * 向量
        } else if (builder.isMatrix(typeB)) {
          return typeA; // 矩阵 * 矩阵
        }
      } else if (builder.isMatrix(typeB)) {
        if (typeA === "float") {
          return typeB; // 标量 * 矩阵 = 矩阵
        } else if (builder.isVector(typeA)) {
          return builder.getVectorFromMatrix(typeB); // 向量 * 矩阵
        }
      }

      // 处理非矩阵情况

      if (builder.getTypeLength(typeB) > builder.getTypeLength(typeA)) {
        // 任意类型 x 任意类型：使用长度更大的向量类型

        return typeB;
      }

      return typeA;
    }
  }

  // 生成着色器代码的方法
  generate(builder, output) {
    const op = this.op; // 获取操作符

    const { aNode, bNode } = this; // 解构获取输入节点

    const type = this.getNodeType(builder); // 获取节点类型

    let typeA = null; // 第一个输入的类型
    let typeB = null; // 第二个输入的类型

    // 如果类型不是void，确定输入类型
    if (type !== "void") {
      typeA = aNode.getNodeType(builder); // 获取第一个输入的类型
      typeB = bNode ? bNode.getNodeType(builder) : null; // 获取第二个输入的类型

      // 比较操作符的类型处理
      if (op === "<" || op === ">" || op === "<=" || op === ">=" || op === "==" || op === "!=") {
        if (builder.isVector(typeA)) {
          typeB = typeA; // 如果第一个是向量，第二个也使用相同类型
        } else if (builder.isVector(typeB)) {
          typeA = typeB; // 如果第二个是向量，第一个也使用相同类型
        } else if (typeA !== typeB) {
          typeA = typeB = "float"; // 如果类型不同，都使用float
        }
        // 位移操作符的类型处理
      } else if (op === ">>" || op === "<<") {
        typeA = type;
        typeB = builder.changeComponentType(typeB, "uint"); // 第二个操作数转换为uint
        // 取模操作符的类型处理
      } else if (op === "%") {
        typeA = type;
        typeB = builder.isInteger(typeA) && builder.isInteger(typeB) ? typeB : typeA;
        // 第一个操作数是矩阵的情况
      } else if (builder.isMatrix(typeA)) {
        if (typeB === "float") {
          // 保持矩阵类型，确保第二个操作数为float

          typeB = "float";
        } else if (builder.isVector(typeB)) {
          // 矩阵 x 向量
          typeB = builder.getVectorFromMatrix(typeA);
        } else if (builder.isMatrix(typeB)) {
          // 矩阵 x 矩阵 - 保持两种类型
        } else {
          typeA = typeB = type;
        }
        // 第二个操作数是矩阵的情况
      } else if (builder.isMatrix(typeB)) {
        if (typeA === "float") {
          // 保持矩阵类型，确保第一个操作数为float

          typeA = "float";
        } else if (builder.isVector(typeA)) {
          // 向量 x 矩阵

          typeA = builder.getVectorFromMatrix(typeB);
        } else {
          typeA = typeB = type;
        }
      } else {
        // 任意类型 x 任意类型

        typeA = typeB = type;
      }
    } else {
      typeA = typeB = type; // 如果类型是void，两个输入都使用void
    }

    const a = aNode.build(builder, typeA);
    const b = bNode ? bNode.build(builder, typeB) : null;

    const fnOpSnippet = builder.getFunctionOperator(op);

    if (output !== "void") {
      const isGLSL = builder.renderer.coordinateSystem === WebGLCoordinateSystem;

      if (op === "==" || op === "!=" || op === "<" || op === ">" || op === "<=" || op === ">=") {
        if (isGLSL) {
          if (builder.isVector(typeA)) {
            return builder.format(`${this.getOperatorMethod(builder, output)}( ${a}, ${b} )`, type, output);
          } else {
            return builder.format(`( ${a} ${op} ${b} )`, type, output);
          }
        } else {
          // WGSL

          return builder.format(`( ${a} ${op} ${b} )`, type, output);
        }
      } else if (op === "%") {
        if (builder.isInteger(typeB)) {
          return builder.format(`( ${a} % ${b} )`, type, output);
        } else {
          return builder.format(`${this.getOperatorMethod(builder, type)}( ${a}, ${b} )`, type, output);
        }
      } else if (op === "!" || op === "~") {
        return builder.format(`(${op}${a})`, typeA, output);
      } else if (fnOpSnippet) {
        return builder.format(`${fnOpSnippet}( ${a}, ${b} )`, type, output);
      } else {
        // Handle matrix operations

        if (builder.isMatrix(typeA) && typeB === "float") {
          return builder.format(`( ${b} ${op} ${a} )`, type, output);
        } else if (typeA === "float" && builder.isMatrix(typeB)) {
          return builder.format(`${a} ${op} ${b}`, type, output);
        } else {
          let snippet = `( ${a} ${op} ${b} )`;

          if (!isGLSL && type === "bool" && builder.isVector(typeA) && builder.isVector(typeB)) {
            snippet = `all${snippet}`;
          }

          return builder.format(snippet, type, output);
        }
      }
    } else if (typeA !== "void") {
      // 如果有函数操作符片段，使用函数调用格式
      if (fnOpSnippet) {
        return builder.format(`${fnOpSnippet}( ${a}, ${b} )`, type, output);
      } else {
        // 处理矩阵运算的特殊情况
        if (builder.isMatrix(typeA) && typeB === "float") {
          return builder.format(`${b} ${op} ${a}`, type, output);
        } else {
          return builder.format(`${a} ${op} ${b}`, type, output);
        }
      }
    }
  }

  // 序列化方法
  serialize(data) {
    super.serialize(data); // 调用父类序列化方法

    data.op = this.op; // 保存操作符
  }

  // 反序列化方法
  deserialize(data) {
    super.deserialize(data); // 调用父类反序列化方法

    this.op = data.op; // 恢复操作符
  }
}

export default OperatorNode; // 导出OperatorNode类

/**
 * 返回两个或多个值的加法运算结果。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @param {...Node} params - 额外的输入参数。
 * @returns {OperatorNode}
 */
export const add = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "+").setParameterLength(2, Infinity).setName("add");

/**
 * 返回两个或多个值的减法运算结果。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @param {...Node} params - 额外的输入参数。
 * @returns {OperatorNode}
 */
export const sub = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "-").setParameterLength(2, Infinity).setName("sub");

/**
 * 返回两个或多个值的乘法运算结果。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @param {...Node} params - 额外的输入参数。
 * @returns {OperatorNode}
 */
export const mul = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "*").setParameterLength(2, Infinity).setName("mul");

/**
 * 返回两个或多个值的除法运算结果。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @param {...Node} params - 额外的输入参数。
 * @returns {OperatorNode}
 */
export const div = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "/").setParameterLength(2, Infinity).setName("div");

/**
 * 计算第一个节点除以第二个节点的余数。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @returns {OperatorNode}
 */
export const mod = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "%").setParameterLength(2).setName("mod");

/**
 * 检查两个节点是否相等。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @returns {OperatorNode}
 */
export const equal = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "==").setParameterLength(2).setName("equal");

/**
 * 检查两个节点是否不相等。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @returns {OperatorNode}
 */
export const notEqual = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "!=").setParameterLength(2).setName("notEqual");

/**
 * 检查第一个节点是否小于第二个节点。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @returns {OperatorNode}
 */
export const lessThan = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "<").setParameterLength(2).setName("lessThan");

/**
 * 检查第一个节点是否大于第二个节点。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @returns {OperatorNode}
 */
export const greaterThan = /*@__PURE__*/ nodeProxyIntent(OperatorNode, ">").setParameterLength(2).setName("greaterThan");

/**
 * 检查第一个节点是否小于或等于第二个节点。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @returns {OperatorNode}
 */
export const lessThanEqual = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "<=").setParameterLength(2).setName("lessThanEqual");

/**
 * 检查第一个节点是否大于或等于第二个节点。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @returns {OperatorNode}
 */
export const greaterThanEqual = /*@__PURE__*/ nodeProxyIntent(OperatorNode, ">=").setParameterLength(2).setName("greaterThanEqual");

/**
 * 对多个节点执行逻辑与运算。
 *
 * @tsl
 * @function
 * @param {...Node} nodes - 要使用AND组合的输入节点。
 * @returns {OperatorNode}
 */
export const and = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "&&").setParameterLength(2, Infinity).setName("and");

/**
 * 对多个节点执行逻辑或运算。
 *
 * @tsl
 * @function
 * @param {...Node} nodes - 要使用OR组合的输入节点。
 * @returns {OperatorNode}
 */
export const or = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "||").setParameterLength(2, Infinity).setName("or");

/**
 * 对节点执行逻辑非运算。
 *
 * @tsl
 * @function
 * @param {Node} value - 值。
 * @returns {OperatorNode}
 */
export const not = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "!").setParameterLength(1).setName("not");

/**
 * 对两个节点执行逻辑异或运算。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @returns {OperatorNode}
 */
export const xor = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "^^").setParameterLength(2).setName("xor");

/**
 * 对两个节点执行按位与运算。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @returns {OperatorNode}
 */
export const bitAnd = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "&").setParameterLength(2).setName("bitAnd");

/**
 * 对节点执行按位非运算。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @returns {OperatorNode}
 */
export const bitNot = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "~").setParameterLength(2).setName("bitNot");

/**
 * 对两个节点执行按位或运算。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @returns {OperatorNode}
 */
export const bitOr = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "|").setParameterLength(2).setName("bitOr");

/**
 * 对两个节点执行按位异或运算。
 *
 * @tsl
 * @function
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @returns {OperatorNode}
 */
export const bitXor = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "^").setParameterLength(2).setName("bitXor");

/**
 * 将节点向左移位。
 *
 * @tsl
 * @function
 * @param {Node} a - 要移位的节点。
 * @param {Node} b - 移位的值。
 * @returns {OperatorNode}
 */
export const shiftLeft = /*@__PURE__*/ nodeProxyIntent(OperatorNode, "<<").setParameterLength(2).setName("shiftLeft");

/**
 * 将节点向右移位。
 *
 * @tsl
 * @function
 * @param {Node} a - 要移位的节点。
 * @param {Node} b - 移位的值。
 * @returns {OperatorNode}
 */
export const shiftRight = /*@__PURE__*/ nodeProxyIntent(OperatorNode, ">>").setParameterLength(2).setName("shiftRight");

/**
 * 将节点递增1。
 *
 * @tsl
 * @function
 * @param {Node} a - 要递增的节点。
 * @returns {OperatorNode}
 */
export const incrementBefore = Fn(([a]) => {
  a.addAssign(1); // 将a增加1
  return a; // 返回递增后的值
});

/**
 * 将节点递减1。
 *
 * @tsl
 * @function
 * @param {Node} a - 要递减的节点。
 * @returns {OperatorNode}
 */
export const decrementBefore = Fn(([a]) => {
  a.subAssign(1); // 将a减少1
  return a; // 返回递减后的值
});

/**
 * 将节点递增1并返回之前的值。
 *
 * @tsl
 * @function
 * @param {Node} a - 要递增的节点。
 * @returns {OperatorNode}
 */
export const increment = /*@__PURE__*/ Fn(([a]) => {
  const temp = int(a).toConst(); // 保存当前值
  a.addAssign(1); // 将a增加1
  return temp; // 返回之前的值
});

/**
 * 将节点递减1并返回之前的值。
 *
 * @tsl
 * @function
 * @param {Node} a - 要递减的节点。
 * @returns {OperatorNode}
 */
export const decrement = /*@__PURE__*/ Fn(([a]) => {
  const temp = int(a).toConst(); // 保存当前值
  a.subAssign(1); // 将a减少1
  return temp; // 返回之前的值
});

// 添加基本数学运算的方法链接
addMethodChaining("add", add); // 加法
addMethodChaining("sub", sub); // 减法
addMethodChaining("mul", mul); // 乘法
addMethodChaining("div", div); // 除法
addMethodChaining("mod", mod); // 取模

// 添加比较运算的方法链接
addMethodChaining("equal", equal); // 等于
addMethodChaining("notEqual", notEqual); // 不等于
addMethodChaining("lessThan", lessThan); // 小于
addMethodChaining("greaterThan", greaterThan); // 大于
addMethodChaining("lessThanEqual", lessThanEqual); // 小于等于
addMethodChaining("greaterThanEqual", greaterThanEqual); // 大于等于

// 添加逻辑运算的方法链接
addMethodChaining("and", and); // 逻辑与
addMethodChaining("or", or); // 逻辑或
addMethodChaining("not", not); // 逻辑非
addMethodChaining("xor", xor); // 逻辑异或

// 添加位运算的方法链接
addMethodChaining("bitAnd", bitAnd); // 按位与
addMethodChaining("bitNot", bitNot); // 按位非
addMethodChaining("bitOr", bitOr); // 按位或
addMethodChaining("bitXor", bitXor); // 按位异或
addMethodChaining("shiftLeft", shiftLeft); // 左移
addMethodChaining("shiftRight", shiftRight); // 右移

// 添加递增递减运算的方法链接
addMethodChaining("incrementBefore", incrementBefore); // 前置递增
addMethodChaining("decrementBefore", decrementBefore); // 前置递减
addMethodChaining("increment", increment); // 后置递增
addMethodChaining("decrement", decrement); // 后置递减

/**
 * 整数取模运算（已弃用）。
 *
 * @tsl
 * @function
 * @deprecated since r175. Use {@link mod} instead.
 *
 * @param {Node} a - 第一个输入。
 * @param {Node} b - 第二个输入。
 * @returns {OperatorNode}
 */
export const modInt = (a, b) => {
  // @deprecated, r175

  console.warn('THREE.TSL: "modInt()" is deprecated. Use "mod( int( ... ) )" instead.');
  return mod(int(a), int(b)); // 返回整数取模结果
};

addMethodChaining("modInt", modInt); // 添加已弃用的modInt方法链接
