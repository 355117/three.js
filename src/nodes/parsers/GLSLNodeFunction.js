// 从核心模块导入节点函数基类
import NodeFunction from "../core/NodeFunction.js";
// 从核心模块导入节点函数输入类
import NodeFunctionInput from "../core/NodeFunctionInput.js";

// 函数声明的正则表达式：匹配精度限定符、返回类型、函数名和参数列表
const declarationRegexp = /^\s*(highp|mediump|lowp)?\s*([a-z_0-9]+)\s*([a-z_0-9]+)?\s*\(([\s\S]*?)\)/i;
// 属性匹配的正则表达式：匹配标识符
const propertiesRegexp = /[a-z_0-9]+/gi;

// pragma main指令字符串
const pragmaMain = "#pragma main";

// 解析GLSL源代码的函数
const parse = (source) => {
  source = source.trim(); // 去除首尾空白字符

  // 查找pragma main指令的位置
  const pragmaMainIndex = source.indexOf(pragmaMain);

  // 提取主要代码部分：如果找到pragma main，则从其后开始；否则使用整个源代码
  const mainCode = pragmaMainIndex !== -1 ? source.slice(pragmaMainIndex + pragmaMain.length) : source;

  // 使用正则表达式匹配函数声明
  const declaration = mainCode.match(declarationRegexp);

  // 如果匹配成功且有5个捕获组
  if (declaration !== null && declaration.length === 5) {
    // 词法分析器

    const inputsCode = declaration[4]; // 参数列表代码
    const propsMatches = []; // 属性匹配结果数组

    let nameMatch = null; // 当前匹配结果

    // 使用正则表达式提取所有标识符
    while ((nameMatch = propertiesRegexp.exec(inputsCode)) !== null) {
      propsMatches.push(nameMatch); // 将匹配结果添加到数组
    }

    // 语法分析器

    const inputs = []; // 输入参数数组

    let i = 0; // 当前处理的匹配索引

    // 遍历所有匹配的标识符
    while (i < propsMatches.length) {
      // 检查是否为const限定符
      const isConst = propsMatches[i][0] === "const";

      if (isConst === true) {
        i++; // 跳过const关键字
      }

      // 获取参数限定符（in、out、inout）
      let qualifier = propsMatches[i][0];

      if (qualifier === "in" || qualifier === "out" || qualifier === "inout") {
        i++; // 跳过限定符
      } else {
        qualifier = ""; // 没有限定符
      }

      // 获取参数类型
      const type = propsMatches[i++][0];

      // 尝试解析数组大小
      let count = Number.parseInt(propsMatches[i][0]);

      if (Number.isNaN(count) === false) i++; // 如果是数字，跳过
      else count = null; // 否则设为null

      // 获取参数名称
      const name = propsMatches[i++][0];

      // 创建并添加函数输入对象
      inputs.push(new NodeFunctionInput(type, name, count, qualifier, isConst));
    }

    //

    // 提取函数体代码
    const blockCode = mainCode.substring(declaration[0].length);

    // 提取函数名（如果存在）
    const name = declaration[3] !== undefined ? declaration[3] : "";
    // 提取返回类型
    const type = declaration[2];

    // 提取精度限定符（如果存在）
    const precision = declaration[1] !== undefined ? declaration[1] : "";

    // 提取头部代码（pragma main之前的代码）
    const headerCode = pragmaMainIndex !== -1 ? source.slice(0, pragmaMainIndex) : "";

    // 返回解析结果对象
    return {
      type,
      inputs,
      name,
      precision,
      inputsCode,
      blockCode,
      headerCode,
    };
  } else {
    // 如果解析失败，抛出错误
    throw new Error("FunctionNode: Function is not a GLSL code.");
  }
};

/**
 * 这个类代表一个GLSL节点函数。
 *
 * @augments NodeFunction
 */
class GLSLNodeFunction extends NodeFunction {
  /**
   * 构造一个新的GLSL节点函数。
   *
   * @param {string} source - GLSL源代码。
   */
  constructor(source) {
    // 解析GLSL源代码，提取各个组成部分
    const { type, inputs, name, precision, inputsCode, blockCode, headerCode } = parse(source);

    // 调用父类构造函数
    super(type, inputs, name, precision);

    // 保存输入参数代码
    this.inputsCode = inputsCode;
    // 保存函数体代码
    this.blockCode = blockCode;
    // 保存头部代码
    this.headerCode = headerCode;
  }

  /**
   * 这个方法返回节点函数的GLSL代码。
   *
   * @param {string} [name=this.name] - 函数名称。
   * @return {string} 着色器代码。
   */
  getCode(name = this.name) {
    let code; // 生成的代码

    const blockCode = this.blockCode; // 函数体代码

    // 如果有函数体代码
    if (blockCode !== "") {
      // 解构获取必要的属性
      const { type, inputsCode, headerCode, precision } = this;

      // 构建函数声明代码
      let declarationCode = `${type} ${name} ( ${inputsCode.trim()} )`;

      // 如果有精度限定符，添加到声明前面
      if (precision !== "") {
        declarationCode = `${precision} ${declarationCode}`;
      }

      // 组合完整的代码：头部 + 声明 + 函数体
      code = headerCode + declarationCode + blockCode;
    } else {
      // 接口函数（没有实现）

      code = "";
    }

    return code; // 返回生成的代码
  }
}

export default GLSLNodeFunction; // 导出GLSLNodeFunction类
