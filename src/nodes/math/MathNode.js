// 从核心模块导入临时节点基类
import TempNode from "../core/TempNode.js";
// 从操作符节点模块导入基本数学运算函数
import { sub, mul, div, mod, equal } from "./OperatorNode.js";
// 从TSL核心模块导入方法链接、节点对象等工具函数
import { addMethodChaining, nodeObject, nodeProxyIntent, float, vec2, vec3, vec4, Fn } from "../tsl/TSLCore.js";
// 从常量模块导入坐标系统常量
import { WebGLCoordinateSystem, WebGPUCoordinateSystem } from "../../constants.js";

/**
 * 这个节点代表着色器中可用的各种数学方法。
 * 它们被分为三个类别：
 *
 * - 单输入方法，如 `sin`、`cos` 或 `normalize`。
 * - 双输入方法，如 `dot`、`cross` 或 `pow`。
 * - 三输入方法，如 `mix`、`clamp` 或 `smoothstep`。
 *
 * @augments TempNode
 */
class MathNode extends TempNode {
  // 获取节点类型的静态方法
  static get type() {
    return "MathNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的数学节点。
   *
   * @param {string} method - 方法名称。
   * @param {Node} aNode - 第一个输入。
   * @param {?Node} [bNode=null] - 第二个输入。
   * @param {?Node} [cNode=null] - 第三个输入。
   */
  constructor(method, aNode, bNode = null, cNode = null) {
    super(); // 调用父类构造函数

    // 允许 max() 和 min() 函数接受任意数量的参数。

    if ((method === MathNode.MAX || method === MathNode.MIN) && arguments.length > 3) {
      // 创建初始操作节点，包含前两个参数
      let finalOp = new MathNode(method, aNode, bNode);

      // 遍历剩余参数，逐个与前面的结果进行运算
      for (let i = 2; i < arguments.length - 1; i++) {
        finalOp = new MathNode(method, finalOp, arguments[i]);
      }

      // 重新设置参数：finalOp作为第一个参数，最后一个参数作为第二个参数
      aNode = finalOp;
      bNode = arguments[arguments.length - 1];
      cNode = null; // 第三个参数设为null
    }

    /**
     * 方法名称。
     *
     * @type {string}
     */
    this.method = method;

    /**
     * 第一个输入。
     *
     * @type {Node}
     */
    this.aNode = aNode;

    /**
     * 第二个输入。
     *
     * @type {?Node}
     * @default null
     */
    this.bNode = bNode;

    /**
     * 第三个输入。
     *
     * @type {?Node}
     * @default null
     */
    this.cNode = cNode;

    /**
     * 这个标志可以用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMathNode = true;
  }

  /**
   * 输入类型从输入节点的节点类型推断得出。
   *
   * @param {NodeBuilder} builder - 当前节点构建器。
   * @return {string} 输入类型。
   */
  getInputType(builder) {
    // 获取第一个输入节点的类型
    const aType = this.aNode.getNodeType(builder);
    // 获取第二个输入节点的类型（如果存在）
    const bType = this.bNode ? this.bNode.getNodeType(builder) : null;
    // 获取第三个输入节点的类型（如果存在）
    const cType = this.cNode ? this.cNode.getNodeType(builder) : null;

    // 计算各个类型的长度，矩阵类型长度为0
    const aLen = builder.isMatrix(aType) ? 0 : builder.getTypeLength(aType);
    const bLen = builder.isMatrix(bType) ? 0 : builder.getTypeLength(bType);
    const cLen = builder.isMatrix(cType) ? 0 : builder.getTypeLength(cType);

    // 返回长度最大的类型
    if (aLen > bLen && aLen > cLen) {
      return aType;
    } else if (bLen > cLen) {
      return bType;
    } else if (cLen > aLen) {
      return cType;
    }

    // 默认返回第一个输入的类型
    return aType;
  }

  /**
   * 选定的方法以及输入类型决定了此节点的节点类型。
   *
   * @param {NodeBuilder} builder - 当前节点构建器。
   * @return {string} 节点类型。
   */
  getNodeType(builder) {
    const method = this.method; // 获取方法名

    // 长度、距离、点积运算返回浮点数
    if (method === MathNode.LENGTH || method === MathNode.DISTANCE || method === MathNode.DOT) {
      return "float";
      // 叉积运算返回三维向量
    } else if (method === MathNode.CROSS) {
      return "vec3";
      // 全部、任意运算返回布尔值
    } else if (method === MathNode.ALL || method === MathNode.ANY) {
      return "bool";
      // 相等比较运算返回布尔类型的向量
    } else if (method === MathNode.EQUALS) {
      return builder.changeComponentType(this.aNode.getNodeType(builder), "bool");
    } else {
      // 其他情况返回输入类型
      return this.getInputType(builder);
    }
  }

  // 设置节点的方法
  setup(builder) {
    // 解构获取输入节点和方法名
    const { aNode, bNode, method } = this;

    let outputNode = null; // 输出节点初始化为null

    // 一减运算：1 - x
    if (method === MathNode.ONE_MINUS) {
      outputNode = sub(1.0, aNode);
      // 倒数运算：1 / x
    } else if (method === MathNode.RECIPROCAL) {
      outputNode = div(1.0, aNode);
      // 差值运算：|a - b|
    } else if (method === MathNode.DIFFERENCE) {
      outputNode = abs(sub(aNode, bNode));
      // 方向变换运算
    } else if (method === MathNode.TRANSFORM_DIRECTION) {
      // dir 可以是方向向量或法向量
      // 假设矩阵的左上角3x3部分是正交的

      let tA = aNode; // 临时变量A
      let tB = bNode; // 临时变量B

      // 如果第一个输入是矩阵
      if (builder.isMatrix(tA.getNodeType(builder))) {
        // 将第二个输入转换为四维向量（w分量为0）
        tB = vec4(vec3(tB), 0.0);
      } else {
        // 将第一个输入转换为四维向量（w分量为0）
        tA = vec4(vec3(tA), 0.0);
      }

      // 执行矩阵乘法并取xyz分量
      const mulNode = mul(tA, tB).xyz;

      // 对结果进行归一化
      outputNode = normalize(mulNode);
    }

    // 如果有输出节点，返回它
    if (outputNode !== null) {
      return outputNode;
    } else {
      // 否则调用父类的setup方法
      return super.setup(builder);
    }
  }

  // 生成着色器代码的方法
  generate(builder, output) {
    // 获取节点属性
    const properties = builder.getNodeProperties(this);

    // 如果已有输出节点，调用父类的generate方法
    if (properties.outputNode) {
      return super.generate(builder, output);
    }

    let method = this.method; // 获取方法名

    // 获取节点类型和输入类型
    const type = this.getNodeType(builder);
    const inputType = this.getInputType(builder);

    // 获取输入节点
    const a = this.aNode;
    const b = this.bNode;
    const c = this.cNode;

    // 获取坐标系统
    const coordinateSystem = builder.renderer.coordinateSystem;

    // 处理取负运算
    if (method === MathNode.NEGATE) {
      return builder.format("( - " + a.build(builder, inputType) + " )", type, output);
    } else {
      const params = []; // 参数数组

      // 叉积运算的特殊处理
      if (method === MathNode.CROSS) {
        params.push(a.build(builder, type), b.build(builder, type));
        // WebGL坐标系统下step函数的特殊处理
      } else if (coordinateSystem === WebGLCoordinateSystem && method === MathNode.STEP) {
        params.push(a.build(builder, builder.getTypeLength(a.getNodeType(builder)) === 1 ? "float" : inputType), b.build(builder, inputType));
        // WebGL坐标系统下min/max函数的特殊处理
      } else if (coordinateSystem === WebGLCoordinateSystem && (method === MathNode.MIN || method === MathNode.MAX)) {
        params.push(a.build(builder, inputType), b.build(builder, builder.getTypeLength(b.getNodeType(builder)) === 1 ? "float" : inputType));
        // 折射函数的特殊处理
      } else if (method === MathNode.REFRACT) {
        params.push(a.build(builder, inputType), b.build(builder, inputType), c.build(builder, "float"));
        // 混合函数的特殊处理
      } else if (method === MathNode.MIX) {
        params.push(a.build(builder, inputType), b.build(builder, inputType), c.build(builder, builder.getTypeLength(c.getNodeType(builder)) === 1 ? "float" : inputType));
      } else {
        // WebGPU坐标系统下atan函数转换为atan2
        if (coordinateSystem === WebGPUCoordinateSystem && method === MathNode.ATAN && b !== null) {
          method = "atan2";
        }

        // 检查着色器阶段是否支持偏导数函数
        if (builder.shaderStage !== "fragment" && (method === MathNode.DFDX || method === MathNode.DFDY)) {
          console.warn(`THREE.TSL: '${method}' is not supported in the ${builder.shaderStage} stage.`);

          method = "/*" + method + "*/"; // 注释掉不支持的方法
        }

        // 添加参数
        params.push(a.build(builder, inputType));
        if (b !== null) params.push(b.build(builder, inputType)); // 如果第二个参数存在，添加它
        if (c !== null) params.push(c.build(builder, inputType)); // 如果第三个参数存在，添加它
      }

      // 格式化并返回最终的着色器代码
      return builder.format(`${builder.getMethod(method, type)}( ${params.join(", ")} )`, type, output);
    }
  }

  // 序列化方法
  serialize(data) {
    super.serialize(data); // 调用父类序列化方法

    data.method = this.method; // 保存方法名
  }

  // 反序列化方法
  deserialize(data) {
    super.deserialize(data); // 调用父类反序列化方法

    this.method = data.method; // 恢复方法名
  }
}

// 单输入参数的数学函数常量

MathNode.ALL = "all"; // 全部函数：检查所有分量是否为真
MathNode.ANY = "any"; // 任意函数：检查任意分量是否为真

MathNode.RADIANS = "radians"; // 角度转弧度
MathNode.DEGREES = "degrees"; // 弧度转角度
MathNode.EXP = "exp"; // 自然指数函数
MathNode.EXP2 = "exp2"; // 2的指数函数
MathNode.LOG = "log"; // 自然对数函数
MathNode.LOG2 = "log2"; // 以2为底的对数函数
MathNode.SQRT = "sqrt"; // 平方根函数
MathNode.INVERSE_SQRT = "inversesqrt"; // 平方根倒数函数
MathNode.FLOOR = "floor"; // 向下取整函数
MathNode.CEIL = "ceil"; // 向上取整函数
MathNode.NORMALIZE = "normalize"; // 向量归一化函数
MathNode.FRACT = "fract"; // 小数部分函数
MathNode.SIN = "sin"; // 正弦函数
MathNode.COS = "cos"; // 余弦函数
MathNode.TAN = "tan"; // 正切函数
MathNode.ASIN = "asin"; // 反正弦函数
MathNode.ACOS = "acos"; // 反余弦函数
MathNode.ATAN = "atan"; // 反正切函数
MathNode.ABS = "abs"; // 绝对值函数
MathNode.SIGN = "sign"; // 符号函数
MathNode.LENGTH = "length"; // 向量长度函数
MathNode.NEGATE = "negate"; // 取负函数
MathNode.ONE_MINUS = "oneMinus"; // 一减函数
MathNode.DFDX = "dFdx"; // X方向偏导数函数
MathNode.DFDY = "dFdy"; // Y方向偏导数函数
MathNode.ROUND = "round"; // 四舍五入函数
MathNode.RECIPROCAL = "reciprocal"; // 倒数函数
MathNode.TRUNC = "trunc"; // 截断函数
MathNode.FWIDTH = "fwidth"; // 偏导数宽度函数
MathNode.TRANSPOSE = "transpose"; // 矩阵转置函数
MathNode.DETERMINANT = "determinant"; // 矩阵行列式函数
MathNode.INVERSE = "inverse"; // 矩阵逆函数

// 双输入参数的数学函数常量

MathNode.BITCAST = "bitcast"; // 位转换函数
MathNode.EQUALS = "equals"; // 相等比较函数
MathNode.MIN = "min"; // 最小值函数
MathNode.MAX = "max"; // 最大值函数
MathNode.STEP = "step"; // 阶跃函数
MathNode.REFLECT = "reflect"; // 反射函数
MathNode.DISTANCE = "distance"; // 距离函数
MathNode.DIFFERENCE = "difference"; // 差值函数
MathNode.DOT = "dot"; // 点积函数
MathNode.CROSS = "cross"; // 叉积函数
MathNode.POW = "pow"; // 幂函数
MathNode.TRANSFORM_DIRECTION = "transformDirection"; // 方向变换函数

// 三输入参数的数学函数常量

MathNode.MIX = "mix"; // 混合函数
MathNode.CLAMP = "clamp"; // 钳制函数
MathNode.REFRACT = "refract"; // 折射函数
MathNode.SMOOTHSTEP = "smoothstep"; // 平滑阶跃函数
MathNode.FACEFORWARD = "faceforward"; // 面向前方函数

export default MathNode; // 导出MathNode类

// 单输入参数的数学函数导出

/**
 * 用于处理浮点精度误差的小值。
 *
 * @tsl
 * @type {Node<float>}
 */
export const EPSILON = /*@__PURE__*/ float(1e-6);

/**
 * 表示无穷大。
 *
 * @tsl
 * @type {Node<float>}
 */
export const INFINITY = /*@__PURE__*/ float(1e6);

/**
 * 表示圆周率PI。
 *
 * @tsl
 * @type {Node<float>}
 */
export const PI = /*@__PURE__*/ float(Math.PI);

/**
 * 表示2倍圆周率PI。
 *
 * @tsl
 * @type {Node<float>}
 */
export const PI2 = /*@__PURE__*/ float(Math.PI * 2);

/**
 * 如果 `x` 的所有分量都为 `true`，则返回 `true`。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node<bool>}
 */
export const all = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.ALL).setParameterLength(1);

/**
 * 如果 `x` 的任意分量为 `true`，则返回 `true`。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node<bool>}
 */
export const any = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.ANY).setParameterLength(1);

/**
 * 将角度转换为弧度。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 角度输入。
 * @returns {Node}
 */
export const radians = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.RADIANS).setParameterLength(1);

/**
 * 将弧度转换为角度。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 弧度输入。
 * @returns {Node}
 */
export const degrees = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.DEGREES).setParameterLength(1);

/**
 * 返回参数的自然指数。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const exp = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.EXP).setParameterLength(1);

/**
 * 返回2的参数次幂。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const exp2 = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.EXP2).setParameterLength(1);

/**
 * 返回参数的自然对数。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const log = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.LOG).setParameterLength(1);

/**
 * 返回参数的以2为底的对数。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const log2 = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.LOG2).setParameterLength(1);

/**
 * 返回参数的平方根。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const sqrt = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.SQRT).setParameterLength(1);

/**
 * 返回参数平方根的倒数。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const inverseSqrt = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.INVERSE_SQRT).setParameterLength(1);

/**
 * 找到小于或等于参数的最近整数。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const floor = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.FLOOR).setParameterLength(1);

/**
 * 找到大于或等于参数的最近整数。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const ceil = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.CEIL).setParameterLength(1);

/**
 * 计算与原向量相同方向的单位向量。
 *
 * @tsl
 * @function
 * @param {Node} x - 输入向量。
 * @returns {Node}
 */
export const normalize = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.NORMALIZE).setParameterLength(1);

/**
 * 计算参数的小数部分。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const fract = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.FRACT).setParameterLength(1);

/**
 * 返回参数的正弦值。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const sin = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.SIN).setParameterLength(1);

/**
 * 返回参数的余弦值。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const cos = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.COS).setParameterLength(1);

/**
 * 返回参数的正切值。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const tan = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.TAN).setParameterLength(1);

/**
 * 返回参数的反正弦值。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const asin = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.ASIN).setParameterLength(1);

/**
 * 返回参数的反余弦值。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const acos = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.ACOS).setParameterLength(1);

/**
 * 返回参数的反正切值。
 * 如果提供两个参数，结果是 `atan2(y/x)`。
 *
 * @tsl
 * @function
 * @param {Node | number} y - y参数。
 * @param {?(Node | number)} x - x参数。
 * @returns {Node}
 */
export const atan = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.ATAN).setParameterLength(1, 2);

/**
 * 返回参数的绝对值。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const abs = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.ABS).setParameterLength(1);

/**
 * 提取参数的符号。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const sign = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.SIGN).setParameterLength(1);

/**
 * 计算向量的长度。
 *
 * @tsl
 * @function
 * @param {Node} x - 参数。
 * @returns {Node<float>}
 */
export const length = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.LENGTH).setParameterLength(1);

/**
 * 对参数取负值 (-x)。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const negate = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.NEGATE).setParameterLength(1);

/**
 * 返回 `1` 减去参数的值。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const oneMinus = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.ONE_MINUS).setParameterLength(1);

/**
 * 返回参数相对于x的偏导数。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const dFdx = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.DFDX).setParameterLength(1);

/**
 * 返回参数相对于y的偏导数。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const dFdy = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.DFDY).setParameterLength(1);

/**
 * 将参数四舍五入到最近的整数。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const round = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.ROUND).setParameterLength(1);

/**
 * 返回参数的倒数 `(1/x)`。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const reciprocal = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.RECIPROCAL).setParameterLength(1);

/**
 * 截断参数，移除小数部分。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const trunc = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.TRUNC).setParameterLength(1);

/**
 * 返回x和y方向绝对偏导数的和。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @returns {Node}
 */
export const fwidth = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.FWIDTH).setParameterLength(1);

/**
 * 返回矩阵的转置。
 *
 * @tsl
 * @function
 * @param {Node<mat2|mat3|mat4>} x - 参数。
 * @returns {Node}
 */
export const transpose = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.TRANSPOSE).setParameterLength(1);

/**
 * 返回矩阵的行列式。
 *
 * @tsl
 * @function
 * @param {Node<mat2|mat3|mat4>} x - 参数。
 * @returns {Node<float>}
 */
export const determinant = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.DETERMINANT).setParameterLength(1);

/**
 * 返回矩阵的逆矩阵。
 *
 * @tsl
 * @function
 * @param {Node<mat2|mat3|mat4>} x - 参数。
 * @returns {Node<mat2|mat3|mat4>}
 */
export const inverse = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.INVERSE).setParameterLength(1);

// 双输入参数的数学函数导出

/**
 * 将一种类型的值的位表示重新解释为另一种类型的值。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 参数。
 * @param {string} y - 新类型。
 * @returns {Node}
 */
export const bitcast = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.BITCAST).setParameterLength(2);

/**
 * 如果 `x` 等于 `y`，则返回 `true`。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 第一个参数。
 * @param {Node | number} y - 第二个参数。
 * @deprecated since r175. Use {@link equal} instead.
 * @returns {Node<bool>}
 */
export const equals = (x, y) => {
  // @deprecated, r172

  console.warn('THREE.TSL: "equals" is deprecated. Use "equal" inside a vector instead, like: "bvec*( equal( ... ) )"');
  return equal(x, y);
};

/**
 * 返回给定值中的最小值。
 *
 * @tsl
 * @function
 * @param {...(Node | number)} values - 要比较的值。
 * @returns {Node}
 */
export const min = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.MIN).setParameterLength(2, Infinity);

/**
 * 返回给定值中的最大值。
 *
 * @tsl
 * @function
 * @param {...(Node | number)} values - 要比较的值。
 * @returns {Node}
 */
export const max = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.MAX).setParameterLength(2, Infinity);

/**
 * 通过比较两个值生成阶跃函数。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 边界参数。
 * @param {Node | number} y - 输入参数。
 * @returns {Node}
 */
export const step = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.STEP).setParameterLength(2);

/**
 * 计算入射向量的反射方向。
 *
 * @tsl
 * @function
 * @param {Node<vec2|vec3|vec4>} I - 入射向量。
 * @param {Node<vec2|vec3|vec4>} N - 法向量。
 * @returns {Node<vec2|vec3|vec4>}
 */
export const reflect = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.REFLECT).setParameterLength(2);

/**
 * 计算两点之间的距离。
 *
 * @tsl
 * @function
 * @param {Node<vec2|vec3|vec4>} x - 第一个点。
 * @param {Node<vec2|vec3|vec4>} y - 第二个点。
 * @returns {Node<float>}
 */
export const distance = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.DISTANCE).setParameterLength(2);

/**
 * 计算两个值之间的绝对差值。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 第一个参数。
 * @param {Node | number} y - 第二个参数。
 * @returns {Node}
 */
export const difference = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.DIFFERENCE).setParameterLength(2);

/**
 * 计算两个向量的点积。
 *
 * @tsl
 * @function
 * @param {Node<vec2|vec3|vec4>} x - 第一个向量。
 * @param {Node<vec2|vec3|vec4>} y - 第二个向量。
 * @returns {Node<float>}
 */
export const dot = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.DOT).setParameterLength(2);

/**
 * 计算两个向量的叉积。
 *
 * @tsl
 * @function
 * @param {Node<vec2|vec3>} x - 第一个向量。
 * @param {Node<vec2|vec3>} y - 第二个向量。
 * @returns {Node<float|vec3>}
 */
export const cross = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.CROSS).setParameterLength(2);

/**
 * 返回第一个参数的第二个参数次幂。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 第一个参数。
 * @param {Node | number} y - 第二个参数。
 * @returns {Node}
 */
export const pow = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.POW).setParameterLength(2);

/**
 * 返回参数的平方。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 第一个参数。
 * @returns {Node}
 */
export const pow2 = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.POW, 2).setParameterLength(1);

/**
 * 返回参数的立方。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 第一个参数。
 * @returns {Node}
 */
export const pow3 = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.POW, 3).setParameterLength(1);

/**
 * 返回参数的四次方。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 第一个参数。
 * @returns {Node}
 */
export const pow4 = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.POW, 4).setParameterLength(1);

/**
 * 通过矩阵变换向量的方向，然后对结果进行归一化。
 *
 * @tsl
 * @function
 * @param {Node<vec2|vec3|vec4>} direction - 方向向量。
 * @param {Node<mat2|mat3|mat4>} matrix - 变换矩阵。
 * @returns {Node}
 */
export const transformDirection = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.TRANSFORM_DIRECTION).setParameterLength(2);

/**
 * 返回数字的立方根。
 *
 * @tsl
 * @function
 * @param {Node | number} a - 第一个参数。
 * @returns {Node}
 */
export const cbrt = (a) => mul(sign(a), pow(abs(a), 1.0 / 3.0));

/**
 * 计算向量的长度平方。
 *
 * @tsl
 * @function
 * @param {Node<vec2|vec3|vec4>} a - 向量。
 * @returns {Node<float>}
 */
export const lengthSq = (a) => dot(a, a);

// 三输入参数的数学函数导出

/**
 * 在两个值之间进行线性插值。
 *
 * @tsl
 * @function
 * @param {Node | number} a - 第一个参数。
 * @param {Node | number} b - 第二个参数。
 * @param {Node | number} t - 插值值。
 * @returns {Node}
 */
export const mix = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.MIX).setParameterLength(3);

/**
 * 将值约束在两个边界值之间。
 *
 * @tsl
 * @function
 * @param {Node | number} value - 要约束的值。
 * @param {Node | number} [low=0] - 下边界。
 * @param {Node | number} [high=1] - 上边界。
 * @returns {Node}
 */
export const clamp = (value, low = 0, high = 1) => nodeObject(new MathNode(MathNode.CLAMP, nodeObject(value), nodeObject(low), nodeObject(high)));

/**
 * 将值约束在 `0` 和 `1` 之间。
 *
 * @tsl
 * @function
 * @param {Node | number} value - 要约束的值。
 * @returns {Node}
 */
export const saturate = (value) => clamp(value);

/**
 * 计算入射向量的折射方向。
 *
 * @tsl
 * @function
 * @param {Node<vec2|vec3|vec4>} I - 入射向量。
 * @param {Node<vec2|vec3|vec4>} N - 法向量。
 * @param {Node<float>} eta - 折射率比值。
 * @returns {Node<vec2|vec3|vec4>}
 */
export const refract = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.REFRACT).setParameterLength(3);

/**
 * 在两个值之间执行埃尔米特插值。
 *
 * @tsl
 * @function
 * @param {Node | number} low - 埃尔米特函数下边缘的值。
 * @param {Node | number} high - 埃尔米特函数上边缘的值。
 * @param {Node | number} x - 插值的源值。
 * @returns {Node}
 */
export const smoothstep = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.SMOOTHSTEP).setParameterLength(3);

/**
 * 返回指向与另一个向量相同方向的向量。
 *
 * @tsl
 * @function
 * @param {Node<vec2|vec3|vec4>} N - 要定向的向量。
 * @param {Node<vec2|vec3|vec4>} I - 入射向量。
 * @param {Node<vec2|vec3|vec4>} Nref - 参考向量。
 * @returns {Node<vec2|vec3|vec4>}
 */
export const faceForward = /*@__PURE__*/ nodeProxyIntent(MathNode, MathNode.FACEFORWARD).setParameterLength(3);

/**
 * 为给定的uv返回随机值。
 *
 * @tsl
 * @function
 * @param {Node<vec2>} uv - uv节点。
 * @returns {Node<float>}
 */
export const rand = /*@__PURE__*/ Fn(([uv]) => {
  const a = 12.9898, // 随机种子常量a
    b = 78.233, // 随机种子常量b
    c = 43758.5453; // 随机种子常量c
  const dt = dot(uv.xy, vec2(a, b)), // 计算点积
    sn = mod(dt, PI); // 对PI取模

  return fract(sin(sn).mul(c)); // 返回正弦值乘以常量c的小数部分
});

/**
 * `mix()` 的别名，参数顺序不同。
 *
 * @tsl
 * @function
 * @param {Node | number} t - 插值值。
 * @param {Node | number} e1 - 第一个参数。
 * @param {Node | number} e2 - 第二个参数。
 * @returns {Node}
 */
export const mixElement = (t, e1, e2) => mix(e1, e2, t);

/**
 * `smoothstep()` 的别名，参数顺序不同。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 插值的源值。
 * @param {Node | number} low - 埃尔米特函数下边缘的值。
 * @param {Node | number} high - 埃尔米特函数上边缘的值。
 * @returns {Node}
 */
export const smoothstepElement = (x, low, high) => smoothstep(low, high, x);

/**
 * `step()` 的别名，参数顺序不同。
 *
 * @tsl
 * @function
 * @param {Node | number} x - 插值的源值。
 * @param {Node | number} edge - 边缘值。
 * @returns {Node}
 */
export const stepElement = (x, edge) => step(edge, x);

/**
 * 返回其参数商的反正切值。
 *
 * @tsl
 * @function
 * @deprecated since r172. Use {@link atan} instead.
 *
 * @param {Node | number} y - y参数。
 * @param {Node | number} x - x参数。
 * @returns {Node}
 */
export const atan2 = (y, x) => {
  // @deprecated, r172

  console.warn('THREE.TSL: "atan2" is overloaded. Use "atan" instead.');
  return atan(y, x);
};

// GLSL别名函数

export const faceforward = faceForward; // faceForward的GLSL别名
export const inversesqrt = inverseSqrt; // inverseSqrt的GLSL别名

// 方法链接

// 添加单参数函数的方法链接
addMethodChaining("all", all); // 全部函数
addMethodChaining("any", any); // 任意函数
addMethodChaining("equals", equals); // 相等函数（已弃用）

addMethodChaining("radians", radians); // 角度转弧度
addMethodChaining("degrees", degrees); // 弧度转角度
addMethodChaining("exp", exp); // 自然指数
addMethodChaining("exp2", exp2); // 2的指数
addMethodChaining("log", log); // 自然对数
addMethodChaining("log2", log2); // 以2为底的对数
addMethodChaining("sqrt", sqrt); // 平方根
addMethodChaining("inverseSqrt", inverseSqrt); // 平方根倒数
addMethodChaining("floor", floor); // 向下取整
addMethodChaining("ceil", ceil); // 向上取整
addMethodChaining("normalize", normalize); // 归一化
addMethodChaining("fract", fract); // 小数部分
addMethodChaining("sin", sin); // 正弦
addMethodChaining("cos", cos); // 余弦
addMethodChaining("tan", tan); // 正切
addMethodChaining("asin", asin); // 反正弦
addMethodChaining("acos", acos); // 反余弦
addMethodChaining("atan", atan); // 反正切
addMethodChaining("abs", abs); // 绝对值
addMethodChaining("sign", sign); // 符号
addMethodChaining("length", length); // 长度
addMethodChaining("lengthSq", lengthSq); // 长度平方
addMethodChaining("negate", negate); // 取负
addMethodChaining("oneMinus", oneMinus); // 一减
addMethodChaining("dFdx", dFdx); // X方向偏导数
addMethodChaining("dFdy", dFdy); // Y方向偏导数
addMethodChaining("round", round); // 四舍五入
addMethodChaining("reciprocal", reciprocal); // 倒数
addMethodChaining("trunc", trunc); // 截断
addMethodChaining("fwidth", fwidth); // 偏导数宽度
addMethodChaining("atan2", atan2); // 反正切2（已弃用）

// 添加双参数函数的方法链接
addMethodChaining("min", min); // 最小值
addMethodChaining("max", max); // 最大值
addMethodChaining("step", stepElement); // 阶跃函数
addMethodChaining("reflect", reflect); // 反射
addMethodChaining("distance", distance); // 距离
addMethodChaining("dot", dot); // 点积
addMethodChaining("cross", cross); // 叉积
addMethodChaining("pow", pow); // 幂函数
addMethodChaining("pow2", pow2); // 平方
addMethodChaining("pow3", pow3); // 立方
addMethodChaining("pow4", pow4); // 四次方
addMethodChaining("transformDirection", transformDirection); // 方向变换

// 添加三参数函数的方法链接
addMethodChaining("mix", mixElement); // 混合
addMethodChaining("clamp", clamp); // 钳制
addMethodChaining("refract", refract); // 折射
addMethodChaining("smoothstep", smoothstepElement); // 平滑阶跃
addMethodChaining("faceForward", faceForward); // 面向前方

// 添加其他函数的方法链接
addMethodChaining("difference", difference); // 差值
addMethodChaining("saturate", saturate); // 饱和
addMethodChaining("cbrt", cbrt); // 立方根
addMethodChaining("transpose", transpose); // 矩阵转置
addMethodChaining("determinant", determinant); // 矩阵行列式
addMethodChaining("inverse", inverse); // 矩阵逆
addMethodChaining("rand", rand); // 随机数
