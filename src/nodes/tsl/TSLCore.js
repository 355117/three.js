/**
 * TSLCore.js - Three.js 着色语言核心实现
 *
 * 该文件是TSL的核心实现，包含了节点系统的基础架构、
 * 代理处理器、类型转换系统和函数定义机制。
 * 这是TSL语言的底层实现，为高级着色器编程提供支持。
 */

// 导入核心依赖
import Node from "../core/Node.js";
import ArrayElementNode from "../utils/ArrayElementNode.js";
import ConvertNode from "../utils/ConvertNode.js";
import JoinNode from "../utils/JoinNode.js";
import SplitNode from "../utils/SplitNode.js";
import SetNode from "../utils/SetNode.js";
import FlipNode from "../utils/FlipNode.js";
import ConstNode from "../core/ConstNode.js";
import MemberNode from "../utils/MemberNode.js";
import { getValueFromType, getValueType } from "../core/NodeUtils.js";

// 当前堆栈引用，用于管理节点执行上下文
let currentStack = null;

// 节点元素映射表，存储所有可链式调用的方法
const NodeElements = new Map();

/**
 * 添加方法链式调用
 *
 * 将一个函数注册为可以在节点上链式调用的方法。
 * 例如：node.add(), node.mul() 等。
 *
 * @param {string} name - 方法名称
 * @param {Function} nodeElement - 对应的节点函数
 */
export function addMethodChaining(name, nodeElement) {
  // 检查是否已经定义过该方法
  if (NodeElements.has(name)) {
    console.warn(`THREE.TSL: Redefinition of method chaining '${name}'.`);
    return;
  }

  // 验证节点元素是否为函数
  if (typeof nodeElement !== "function") throw new Error(`THREE.TSL: Node element ${name} is not a function`);

  // 注册方法到映射表
  NodeElements.set(name, nodeElement);
}

// Swizzle（重排）解析函数
// 将 rgba/stpq 格式转换为 xyzw 格式
const parseSwizzle = (props) => props.replace(/r|s/g, "x").replace(/g|t/g, "y").replace(/b|p/g, "z").replace(/a|q/g, "w");
// 解析并排序 swizzle 字符串
const parseSwizzleAndSort = (props) => parseSwizzle(props).split("").sort().join("");

/**
 * 着色器节点代理处理器
 *
 * 这是TSL的核心代理处理器，负责拦截和处理节点对象上的属性访问和方法调用。
 * 它实现了TSL的语法糖，如 swizzle 操作、方法链式调用等。
 */
const shaderNodeHandler = {
  /**
   * 设置节点闭包
   * @param {Function} NodeClosure - 节点闭包函数
   * @param {Array} params - 参数数组
   * @returns {*} 节点闭包的执行结果
   */
  setup(NodeClosure, params) {
    const inputs = params.shift();

    return NodeClosure(nodeObjects(inputs), ...params);
  },

  /**
   * 属性访问拦截器
   *
   * 拦截节点对象的属性访问，实现各种TSL语法特性：
   * - swizzle 操作（如 .xyz, .rgb）
   * - 方法链式调用
   * - 数组元素访问
   * - 属性设置和获取
   *
   * @param {Node} node - 目标节点
   * @param {string|symbol} prop - 访问的属性名
   * @param {Object} nodeObj - 节点对象代理
   * @returns {*} 属性值或方法函数
   */
  get(node, prop, nodeObj) {
    if (typeof prop === "string" && node[prop] === undefined) {
      // 处理赋值操作
      if (node.isStackNode !== true && prop === "assign") {
        return (...params) => {
          currentStack.assign(nodeObj, ...params);

          return nodeObj;
        };
        // 处理注册的方法链式调用
      } else if (NodeElements.has(prop)) {
        const nodeElement = NodeElements.get(prop);

        return node.isStackNode ? (...params) => nodeObj.add(nodeElement(...params)) : (...params) => nodeElement(nodeObj, ...params);
        // 处理变量意图标记
      } else if (prop === "toVarIntent") {
        return () => nodeObj;
        // 返回节点自身
      } else if (prop === "self") {
        return node;
        // 处理带 Assign 后缀的方法（如 addAssign）
      } else if (prop.endsWith("Assign") && NodeElements.has(prop.slice(0, prop.length - "Assign".length))) {
        const nodeElement = NodeElements.get(prop.slice(0, prop.length - "Assign".length));

        return node.isStackNode ? (...params) => nodeObj.assign(params[0], nodeElement(...params)) : (...params) => nodeObj.assign(nodeElement(nodeObj, ...params));
        // 处理 swizzle 操作（如 .xyz, .rgb, .stpq）
      } else if (/^[xyzwrgbastpq]{1,4}$/.test(prop) === true) {
        // 访问属性（swizzle 重排）

        prop = parseSwizzle(prop);

        return nodeObject(new SplitNode(nodeObj, prop));
        // 处理设置 swizzle 属性（如 setXYZ）
      } else if (/^set[XYZWRGBASTPQ]{1,4}$/.test(prop) === true) {
        // 设置属性（swizzle）并排序为 xyzw 序列

        prop = parseSwizzleAndSort(prop.slice(3).toLowerCase());

        return (value) => nodeObject(new SetNode(node, prop, nodeObject(value)));
        // 处理翻转 swizzle 属性（如 flipXYZ）
      } else if (/^flip[XYZWRGBASTPQ]{1,4}$/.test(prop) === true) {
        // 翻转属性（swizzle）并排序为 xyzw 序列

        prop = parseSwizzleAndSort(prop.slice(4).toLowerCase());

        return () => nodeObject(new FlipNode(nodeObject(node), prop));
        // 处理尺寸属性访问（width, height, depth）
      } else if (prop === "width" || prop === "height" || prop === "depth") {
        // 访问属性

        if (prop === "width") prop = "x";
        else if (prop === "height") prop = "y";
        else if (prop === "depth") prop = "z";

        return nodeObject(new SplitNode(node, prop));
        // 处理数字索引访问（数组元素）
      } else if (/^\d+$/.test(prop) === true) {
        // 访问数组元素

        return nodeObject(new ArrayElementNode(nodeObj, new ConstNode(Number(prop), "uint")));
        // 处理 get 方法（成员访问）
      } else if (/^get$/.test(prop) === true) {
        // 访问属性

        return (value) => nodeObject(new MemberNode(nodeObj, value));
      }
    }

    // 默认属性访问
    return Reflect.get(node, prop, nodeObj);
  },

  /**
   * 属性设置拦截器
   *
   * 拦截节点对象的属性设置操作，实现属性赋值的语法糖。
   *
   * @param {Node} node - 目标节点
   * @param {string|symbol} prop - 要设置的属性名
   * @param {*} value - 要设置的值
   * @param {Object} nodeObj - 节点对象代理
   * @returns {boolean} 是否成功设置属性
   */
  set(node, prop, value, nodeObj) {
    if (typeof prop === "string" && node[prop] === undefined) {
      // 设置属性

      // 处理 swizzle 属性、尺寸属性和数组索引的赋值
      if (/^[xyzwrgbastpq]{1,4}$/.test(prop) === true || prop === "width" || prop === "height" || prop === "depth" || /^\d+$/.test(prop) === true) {
        nodeObj[prop].assign(value);

        return true;
      }
    }

    // 默认属性设置
    return Reflect.set(node, prop, value, nodeObj);
  },
};

// 节点对象缓存映射，避免重复创建代理对象
const nodeObjectsCacheMap = new WeakMap();
// 节点构建器函数缓存映射
const nodeBuilderFunctionsCacheMap = new WeakMap();

/**
 * 着色器节点对象转换函数
 *
 * 将各种类型的值转换为适合在TSL中使用的节点对象。
 * 这是TSL类型系统的核心函数。
 *
 * @param {*} obj - 要转换的对象
 * @param {string|null} altType - 可选的替代类型
 * @returns {*} 转换后的节点对象
 */
const ShaderNodeObject = function (obj, altType = null) {
  const type = getValueType(obj);

  if (type === "node") {
    // 从缓存中获取节点对象，避免重复创建代理
    let nodeObject = nodeObjectsCacheMap.get(obj);

    if (nodeObject === undefined) {
      // 创建新的代理对象
      nodeObject = new Proxy(obj, shaderNodeHandler);

      // 缓存代理对象
      nodeObjectsCacheMap.set(obj, nodeObject);
      nodeObjectsCacheMap.set(nodeObject, nodeObject);
    }

    return nodeObject;
  } else if ((altType === null && (type === "float" || type === "boolean")) || (type && type !== "shader" && type !== "string")) {
    // 将基础类型转换为常量节点
    return nodeObject(getConstNode(obj, altType));
  } else if (type === "shader") {
    // 处理着色器函数
    return obj.isFn ? obj : Fn(obj);
  }

  return obj;
};

/**
 * 着色器节点对象批量转换函数
 *
 * 将对象中的所有属性转换为节点对象。
 *
 * @param {Object} objects - 包含多个属性的对象
 * @param {string|null} altType - 可选的替代类型
 * @returns {Object} 转换后的对象
 */
const ShaderNodeObjects = function (objects, altType = null) {
  for (const name in objects) {
    objects[name] = nodeObject(objects[name], altType);
  }

  return objects;
};

/**
 * 着色器节点数组转换函数
 *
 * 将数组中的所有元素转换为节点对象。
 *
 * @param {Array} array - 要转换的数组
 * @param {string|null} altType - 可选的替代类型
 * @returns {Array} 转换后的数组
 */
const ShaderNodeArray = function (array, altType = null) {
  const len = array.length;

  for (let i = 0; i < len; i++) {
    array[i] = nodeObject(array[i], altType);
  }

  return array;
};

/**
 * 着色器节点代理函数
 *
 * 创建一个代理函数，用于延迟创建和配置着色器节点。
 * 这是TSL中创建节点的核心机制，支持参数验证、设置应用等功能。
 *
 * @param {Function} NodeClass - 节点类构造函数
 * @param {*} scope - 作用域参数
 * @param {*} factor - 因子参数
 * @param {Object} settings - 设置对象
 * @returns {Function} 代理函数
 */
const ShaderNodeProxy = function (NodeClass, scope = null, factor = null, settings = null) {
  /**
   * 分配节点并应用设置
   * @param {Node} node - 要分配的节点
   * @returns {Node} 处理后的节点
   */
  function assignNode(node) {
    if (settings !== null) {
      // 应用设置到节点
      node = nodeObject(Object.assign(node, settings));

      // 如果设置了意图标志，转换为变量意图
      if (settings.intent === true) {
        node = node.toVarIntent();
      }
    } else {
      node = nodeObject(node);
    }

    return node;
  }

  let fn,
    name = scope, // 函数名称
    minParams, // 最小参数数量
    maxParams; // 最大参数数量

  /**
   * 验证参数数量限制
   * @param {Array} params - 参数数组
   * @returns {Array} 验证后的参数数组
   */
  function verifyParamsLimit(params) {
    let tslName;

    // 确定TSL函数名称用于错误报告
    if (name) tslName = /[a-z]/i.test(name) ? name + "()" : name;
    else tslName = NodeClass.type;

    // 检查最小参数数量
    if (minParams !== undefined && params.length < minParams) {
      console.error(`THREE.TSL: "${tslName}" parameter length is less than minimum required.`);

      // 用0填充缺失的参数
      return params.concat(new Array(minParams - params.length).fill(0));
      // 检查最大参数数量
    } else if (maxParams !== undefined && params.length > maxParams) {
      console.error(`THREE.TSL: "${tslName}" parameter length exceeds limit.`);

      // 截断多余的参数
      return params.slice(0, maxParams);
    }

    return params;
  }

  // 根据不同的参数配置创建代理函数
  if (scope === null) {
    // 无作用域的情况
    fn = (...params) => {
      return assignNode(new NodeClass(...nodeArray(verifyParamsLimit(params))));
    };
  } else if (factor !== null) {
    // 有作用域和因子的情况
    factor = nodeObject(factor);

    fn = (...params) => {
      return assignNode(new NodeClass(scope, ...nodeArray(verifyParamsLimit(params)), factor));
    };
  } else {
    // 只有作用域的情况
    fn = (...params) => {
      return assignNode(new NodeClass(scope, ...nodeArray(verifyParamsLimit(params))));
    };
  }

  /**
   * 设置参数长度限制
   * @param {...number} params - 参数长度限制
   * @returns {Function} 代理函数自身
   */
  fn.setParameterLength = (...params) => {
    if (params.length === 1) minParams = maxParams = params[0];
    else if (params.length === 2) [minParams, maxParams] = params;

    return fn;
  };

  /**
   * 设置函数名称
   * @param {string} value - 函数名称
   * @returns {Function} 代理函数自身
   */
  fn.setName = (value) => {
    name = value;

    return fn;
  };

  return fn;
};

/**
 * 着色器节点不可变创建函数
 *
 * 创建一个不可变的着色器节点实例。
 *
 * @param {Function} NodeClass - 节点类构造函数
 * @param {...*} params - 传递给构造函数的参数
 * @returns {Node} 节点对象
 */
const ShaderNodeImmutable = function (NodeClass, ...params) {
  return nodeObject(new NodeClass(...nodeArray(params)));
};

/**
 * 着色器调用节点内部类
 *
 * 表示对着色器函数的调用，管理函数的输入参数和执行逻辑。
 * 这是TSL函数调用系统的核心实现。
 */
class ShaderCallNodeInternal extends Node {
  /**
   * 构造函数
   * @param {ShaderNodeInternal} shaderNode - 着色器节点
   * @param {*} inputNodes - 输入节点
   */
  constructor(shaderNode, inputNodes) {
    super();

    this.shaderNode = shaderNode; // 关联的着色器节点
    this.inputNodes = inputNodes; // 输入参数节点

    this.isShaderCallNodeInternal = true;
  }

  /**
   * 获取节点类型
   * @param {NodeBuilder} builder - 节点构建器
   * @returns {string} 节点类型
   */
  getNodeType(builder) {
    return this.shaderNode.nodeType || this.getOutputNode(builder).getNodeType(builder);
  }

  /**
   * 获取成员类型
   * @param {NodeBuilder} builder - 节点构建器
   * @param {string} name - 成员名称
   * @returns {string} 成员类型
   */
  getMemberType(builder, name) {
    return this.getOutputNode(builder).getMemberType(builder, name);
  }

  /**
   * 调用着色器函数
   *
   * 执行着色器函数的核心逻辑，处理函数缓存、参数传递和结果生成。
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @returns {Node} 函数执行结果节点
   */
  call(builder) {
    const { shaderNode, inputNodes } = this;

    // 获取着色器节点的属性
    const properties = builder.getNodeProperties(shaderNode);

    // 获取子构建标识
    const subBuild = builder.getClosestSubBuild(shaderNode.subBuilds) || "";
    const subBuildProperty = subBuild || "default";

    // 如果已经有缓存的结果，直接返回
    if (properties[subBuildProperty]) {
      return properties[subBuildProperty];
    }

    // 保存当前的子构建函数
    const previousSubBuildFn = builder.subBuildFn;

    // 设置新的子构建函数
    builder.subBuildFn = subBuild;

    let result = null;

    // 如果着色器节点有布局定义（预编译函数）
    if (shaderNode.layout) {
      // 获取函数节点缓存映射
      let functionNodesCacheMap = nodeBuilderFunctionsCacheMap.get(builder.constructor);

      if (functionNodesCacheMap === undefined) {
        functionNodesCacheMap = new WeakMap();
        nodeBuilderFunctionsCacheMap.set(builder.constructor, functionNodesCacheMap);
      }

      // 尝试从缓存中获取函数节点
      let functionNode = functionNodesCacheMap.get(shaderNode);

      if (functionNode === undefined) {
        // 构建新的函数节点
        functionNode = nodeObject(builder.buildFunctionNode(shaderNode));
        functionNodesCacheMap.set(shaderNode, functionNode);
      }

      // 添加函数到包含列表
      builder.addInclude(functionNode);

      // 调用函数节点
      result = nodeObject(functionNode.call(inputNodes));
    } else {
      // 处理内联函数（JavaScript函数）
      let inputs = inputNodes;

      if (Array.isArray(inputs)) {
        // 如果输入是数组，需要转换为代理对象
        // 这样可以支持 TSL 函数语法：`Fn( ( { r, g, b } ) => { ... } )`
        // 并通过 `fn( 0, 1, 0 )` 或 `fn( { r: 0, g: 1, b: 0 } )` 调用

        let index = 0;

        inputs = new Proxy(inputs, {
          get: (target, property, receiver) => {
            let value;

            if (target[property] === undefined) {
              // 如果属性不存在，使用索引访问
              value = target[index++];
            } else {
              value = Reflect.get(target, property, receiver);
            }

            return value;
          },
        });
      }

      // 创建安全的节点构建器代理
      const secureNodeBuilder = new Proxy(builder, {
        get: (target, property, receiver) => {
          let value;

          if (Symbol.iterator === property) {
            // 提供迭代器支持
            value = function* () {
              yield undefined;
            };
          } else {
            value = Reflect.get(target, property, receiver);
          }

          return value;
        },
      });

      // 执行JavaScript函数
      const jsFunc = shaderNode.jsFunc;
      const outputNode = inputs !== null || jsFunc.length > 1 ? jsFunc(inputs || [], secureNodeBuilder) : jsFunc(secureNodeBuilder);

      result = nodeObject(outputNode);
    }

    // 恢复之前的子构建函数
    builder.subBuildFn = previousSubBuildFn;

    // 如果设置了once标志，缓存结果
    if (shaderNode.once) {
      properties[subBuildProperty] = result;
    }

    return result;
  }

  /**
   * 设置输出节点
   *
   * 创建一个新的堆栈并设置输出节点。
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @returns {Node} 输出节点
   */
  setupOutput(builder) {
    builder.addStack();

    builder.stack.outputNode = this.call(builder);

    return builder.removeStack();
  }

  /**
   * 获取输出节点
   *
   * 获取或创建输出节点，并设置子构建信息。
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @returns {Node} 输出节点
   */
  getOutputNode(builder) {
    const properties = builder.getNodeProperties(this);
    const subBuildOutput = builder.getSubBuildOutput(this);

    // 如果输出节点不存在，则创建它
    properties[subBuildOutput] = properties[subBuildOutput] || this.setupOutput(builder);
    properties[subBuildOutput].subBuild = builder.getClosestSubBuild(this);

    return properties[subBuildOutput];
  }

  /**
   * 构建节点
   *
   * 根据构建阶段执行不同的构建逻辑。
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @param {string} output - 输出类型
   * @returns {*} 构建结果
   */
  build(builder, output = null) {
    let result = null;

    const buildStage = builder.getBuildStage();
    const properties = builder.getNodeProperties(this);

    const subBuildOutput = builder.getSubBuildOutput(this);
    const outputNode = this.getOutputNode(builder);

    if (buildStage === "setup") {
      // 设置阶段
      const subBuildInitialized = builder.getSubBuildProperty("initialized", this);

      if (properties[subBuildInitialized] !== true) {
        properties[subBuildInitialized] = true;

        properties[subBuildOutput] = this.getOutputNode(builder);
        properties[subBuildOutput].build(builder);

        // 如果着色器节点有子构建，将它们添加到链式节点中
        // 以便在构建过程的后期构建它们
        if (this.shaderNode.subBuilds) {
          for (const node of builder.chaining) {
            const nodeData = builder.getDataFromNode(node, "any");
            nodeData.subBuilds = nodeData.subBuilds || new Set();

            for (const subBuild of this.shaderNode.subBuilds) {
              nodeData.subBuilds.add(subBuild);
            }
          }
        }
      }

      result = properties[subBuildOutput];
    } else if (buildStage === "analyze") {
      // 分析阶段
      outputNode.build(builder, output);
    } else if (buildStage === "generate") {
      // 生成阶段
      result = outputNode.build(builder, output) || "";
    }

    return result;
  }
}

/**
 * 着色器节点内部类
 *
 * 表示一个内部着色器节点，包含JavaScript函数和布局信息。
 * 这是TSL函数系统的核心实现类。
 */
class ShaderNodeInternal extends Node {
  /**
   * 构造函数
   * @param {Function} jsFunc - JavaScript函数
   * @param {string} nodeType - 节点类型
   */
  constructor(jsFunc, nodeType) {
    super(nodeType);

    this.jsFunc = jsFunc; // JavaScript函数
    this.layout = null; // 布局信息

    this.global = true; // 是否为全局函数

    this.once = false; // 是否只执行一次
  }

  /**
   * 设置布局信息
   * @param {*} layout - 布局对象
   * @returns {ShaderNodeInternal} 返回自身以支持链式调用
   */
  setLayout(layout) {
    this.layout = layout;

    return this;
  }

  /**
   * 调用着色器函数
   * @param {*} inputs - 输入参数
   * @returns {ShaderCallNodeInternal} 着色器调用节点
   */
  call(inputs = null) {
    nodeObjects(inputs);

    return nodeObject(new ShaderCallNodeInternal(this, inputs));
  }

  /**
   * 设置节点
   * @returns {ShaderCallNodeInternal} 调用结果
   */
  setup() {
    return this.call();
  }
}

// ===== 常量缓存系统 =====
// 为常用的常量值创建缓存，避免重复创建ConstNode实例

// 预定义的常用值
const bools = [false, true]; // 布尔值
const uints = [0, 1, 2, 3]; // 无符号整数
const ints = [-1, -2]; // 负整数
const floats = [0.5, 1.5, 1 / 3, 1e-6, 1e6, Math.PI, Math.PI * 2, 1 / Math.PI, 2 / Math.PI, 1 / (Math.PI * 2), Math.PI / 2]; // 浮点数

// 布尔值缓存映射
const boolsCacheMap = new Map();
for (const bool of bools) boolsCacheMap.set(bool, new ConstNode(bool));

// 无符号整数缓存映射
const uintsCacheMap = new Map();
for (const uint of uints) uintsCacheMap.set(uint, new ConstNode(uint, "uint"));

// 整数缓存映射（修复类型错误：使用解构赋值获取键值对）
const intsCacheMap = new Map([...uintsCacheMap].map(([key, node]) => [key, new ConstNode(key, "int")]));
for (const int of ints) intsCacheMap.set(int, new ConstNode(int, "int"));

// 浮点数缓存映射（修复类型错误：使用解构赋值获取键值对）
const floatsCacheMap = new Map([...intsCacheMap].map(([key, node]) => [key, new ConstNode(key)]));
for (const float of floats) floatsCacheMap.set(float, new ConstNode(float));
for (const float of floats) floatsCacheMap.set(-float, new ConstNode(-float));

// 缓存映射集合
const cacheMaps = { bool: boolsCacheMap, uint: uintsCacheMap, ints: intsCacheMap, float: floatsCacheMap };

// 合并的常量节点缓存映射
const constNodesCacheMap = new Map([...boolsCacheMap, ...floatsCacheMap]);

/**
 * 获取常量节点
 *
 * 根据值和类型获取缓存的常量节点，如果缓存中不存在则创建新的。
 *
 * @param {*} value - 常量值
 * @param {string} type - 常量类型
 * @returns {ConstNode} 常量节点
 */
const getConstNode = (value, type) => {
  if (constNodesCacheMap.has(value)) {
    // 从缓存中获取
    return constNodesCacheMap.get(value);
  } else if (value.isNode === true) {
    // 如果已经是节点，直接返回
    return value;
  } else {
    // 创建新的常量节点
    return new ConstNode(value, type);
  }
};

/**
 * 类型转换器构造函数
 *
 * 创建一个类型转换函数，用于将参数转换为指定类型的节点。
 * 支持单个参数的类型转换和多个参数的向量/矩阵构造。
 *
 * @param {string} type - 目标类型
 * @param {Map} cacheMap - 可选的缓存映射
 * @returns {Function} 类型转换函数
 */
const ConvertType = function (type, cacheMap = null) {
  return (...params) => {
    // 验证参数有效性
    for (const param of params) {
      if (param === undefined) {
        console.error(`THREE.TSL: Invalid parameter for the type "${type}".`);

        return nodeObject(new ConstNode(0, type));
      }
    }

    // 处理特殊情况：无参数或基础类型的默认值构造
    if (
      params.length === 0 ||
      (!["bool", "float", "int", "uint"].includes(type) &&
        params.every((param) => {
          const paramType = typeof param;

          return paramType !== "object" && paramType !== "function";
        }))
    ) {
      // 使用类型的默认值
      params = [getValueFromType(type, ...params)];
    }

    // 检查单参数缓存
    if (params.length === 1 && cacheMap !== null && cacheMap.has(params[0])) {
      return nodeObjectIntent(cacheMap.get(params[0]));
    }

    // 单个参数：类型转换
    if (params.length === 1) {
      const node = getConstNode(params[0], type);
      // 如果节点类型已经匹配，直接返回
      if (node.nodeType === type) return nodeObjectIntent(node);
      // 否则进行类型转换
      return nodeObjectIntent(new ConvertNode(node, type));
    }

    // 多个参数：向量/矩阵构造
    const nodes = params.map((param) => getConstNode(param));
    return nodeObjectIntent(new JoinNode(nodes, type));
  };
};

// ===== 导出函数 =====

/**
 * 获取定义的值
 *
 * 从对象中提取实际值，如果是对象则返回其value属性，否则返回原值。
 *
 * @param {*} v - 要检查的值
 * @returns {*} 提取的值
 * @todo 移除布尔转换和defined函数
 */
export const defined = (v) => (typeof v === "object" && v !== null ? v.value : v);

// ===== 工具函数 =====

/**
 * 获取常量节点类型
 *
 * 从值中推断节点类型。
 *
 * @param {*} value - 要检查的值
 * @returns {string|null} 节点类型或null
 */
export const getConstNodeType = (value) => (value !== undefined && value !== null ? value.nodeType || value.convertTo || (typeof value === "string" ? value : null) : null);

// ===== 着色器节点基础 =====

/**
 * 创建着色器节点
 *
 * 创建一个着色器节点，包装JavaScript函数为TSL节点。
 *
 * @param {Function} jsFunc - JavaScript函数
 * @param {string} nodeType - 节点类型
 * @returns {Proxy} 着色器节点代理
 */
export function ShaderNode(jsFunc, nodeType) {
  return new Proxy(new ShaderNodeInternal(jsFunc, nodeType), shaderNodeHandler);
}

// ===== 节点对象创建函数 =====

/**
 * 创建节点对象
 * 将值转换为着色器节点对象
 * @param {*} val - 要转换的值
 * @param {string|null} altType - 可选的替代类型
 * @returns {*} 着色器节点对象
 */
export const nodeObject = (val, altType = null) => /* new */ ShaderNodeObject(val, altType);

/**
 * 创建带意图的节点对象
 * 创建节点对象并标记为变量意图
 * @param {*} val - 要转换的值
 * @param {string|null} altType - 可选的替代类型
 * @returns {*} 带意图标记的着色器节点对象
 */
export const nodeObjectIntent = (val, altType = null) => /* new */ nodeObject(val, altType).toVarIntent();

/**
 * 批量创建节点对象
 * 将对象中的所有属性转换为节点对象
 * @param {*} val - 要转换的值或对象
 * @param {string|null} altType - 可选的替代类型
 * @returns {ShaderNodeObjects} 着色器节点对象集合
 */
export const nodeObjects = (val, altType = null) => new ShaderNodeObjects(val, altType);

/**
 * 创建节点数组
 * 将数组转换为着色器节点数组
 * @param {*} val - 要转换的数组
 * @param {string|null} altType - 可选的替代类型
 * @returns {ShaderNodeArray} 着色器节点数组
 */
export const nodeArray = (val, altType = null) => new ShaderNodeArray(val, altType);

/**
 * 创建节点代理
 * 创建着色器节点代理函数
 * @param {Function} NodeClass - 节点类
 * @param {*} scope - 作用域
 * @param {*} factor - 因子
 * @param {Object} settings - 设置
 * @returns {ShaderNodeProxy} 着色器节点代理
 */
export const nodeProxy = (NodeClass, scope = null, factor = null, settings = null) => new ShaderNodeProxy(NodeClass, scope, factor, settings);

/**
 * 创建不可变节点
 * 创建不可变的着色器节点实例
 * @param {Function} NodeClass - 节点类
 * @param {...*} params - 构造参数
 * @returns {ShaderNodeImmutable} 不可变着色器节点
 */
export const nodeImmutable = (NodeClass, ...params) => new ShaderNodeImmutable(NodeClass, ...params);

/**
 * 创建带意图的节点代理
 * 创建着色器节点代理函数，并设置意图标志
 * @param {Function} NodeClass - 节点类
 * @param {*} scope - 作用域
 * @param {*} factor - 因子
 * @param {Object} settings - 设置
 * @returns {ShaderNodeProxy} 带意图标记的着色器节点代理
 */
export const nodeProxyIntent = (NodeClass, scope = null, factor = null, settings = {}) => new ShaderNodeProxy(NodeClass, scope, factor, { intent: true, ...settings });

// 函数ID计数器，用于生成唯一的函数名
let fnId = 0;

/**
 * 函数节点类
 *
 * 表示一个TSL函数节点，包装JavaScript函数为可调用的着色器函数。
 * 支持布局定义、参数类型检查和函数调用。
 */
class FnNode extends Node {
  /**
   * 构造函数
   * @param {Function} jsFunc - JavaScript函数
   * @param {Object|string|null} layout - 布局定义或返回类型
   */
  constructor(jsFunc, layout = null) {
    super();

    let nodeType = null;

    // 处理布局参数
    if (layout !== null) {
      if (typeof layout === "object") {
        // 如果是对象，提取返回类型
        nodeType = layout.return;
      } else {
        if (typeof layout === "string") {
          // 如果是字符串，作为节点类型
          nodeType = layout;
        } else {
          console.error("THREE.TSL: Invalid layout type.");
        }

        // 重置布局为null，因为不是完整的布局对象
        layout = null;
      }
    }

    // 创建内部着色器节点
    this.shaderNode = new ShaderNode(jsFunc, nodeType);

    // 如果有布局定义，设置布局
    if (layout !== null) {
      this.setLayout(layout);
    }

    // 标记为函数节点
    this.isFn = true;
  }

  /**
   * 设置函数布局
   * 定义函数的参数类型和结构，生成完整的布局对象
   * @param {Object} layout - 布局定义
   * @returns {FnNode} 返回自身以支持链式调用
   */
  setLayout(layout) {
    const nodeType = this.shaderNode.nodeType;

    // 如果布局没有inputs属性，需要构建完整的布局对象
    if (typeof layout.inputs !== "object") {
      const fullLayout = {
        name: "fn" + fnId++, // 生成唯一的函数名
        type: nodeType, // 函数返回类型
        inputs: [], // 输入参数列表
      };

      // 遍历布局对象，构建输入参数
      for (const name in layout) {
        if (name === "return") continue; // 跳过return属性

        fullLayout.inputs.push({
          name: name, // 参数名
          type: layout[name], // 参数类型
        });
      }

      layout = fullLayout;
    }

    // 设置着色器节点的布局
    this.shaderNode.setLayout(layout);

    return this;
  }

  /**
   * 获取节点类型
   * @param {NodeBuilder} builder - 节点构建器
   * @returns {string} 节点类型，默认为'float'
   */
  getNodeType(builder) {
    return this.shaderNode.getNodeType(builder) || "float";
  }

  /**
   * 调用函数
   * 执行TSL函数并返回结果
   * @param {...*} params - 函数参数
   * @returns {*} 函数调用结果
   */
  call(...params) {
    let inputs;

    // 转换参数为节点对象
    nodeObjects(params);

    // 检查第一个参数是否为数组形式
    const isArrayAsParameter = params[0] && (params[0].isNode || Object.getPrototypeOf(params[0]) !== Object.prototype);

    if (isArrayAsParameter) {
      // 参数作为数组传递
      inputs = [...params];
    } else {
      // 参数作为对象传递
      inputs = params[0];
    }

    // 调用着色器节点
    const fnCall = this.shaderNode.call(inputs);

    // 如果是void类型，添加到堆栈
    if (this.shaderNode.nodeType === "void") fnCall.toStack();

    // 返回带变量意图的结果
    return fnCall.toVarIntent();
  }

  /**
   * 设置函数只执行一次
   * @param {*} subBuilds - 子构建配置
   * @returns {FnNode} 返回自身以支持链式调用
   */
  once(subBuilds = null) {
    this.shaderNode.once = true;
    this.shaderNode.subBuilds = subBuilds;

    return this;
  }

  /**
   * 生成着色器代码
   * 如果函数被声明但未调用，会显示错误信息
   * @param {NodeBuilder} builder - 节点构建器
   * @returns {string} 生成的常量代码
   */
  generate(builder) {
    const type = this.getNodeType(builder);

    console.error('THREE.TSL: "Fn()" was declared but not invoked. Try calling it like "Fn()( ...params )".');

    return builder.generateConst(type);
  }
}

/**
 * TSL 函数创建器
 *
 * 创建一个TSL函数，将JavaScript函数包装为可在着色器中调用的函数。
 * 返回一个代理对象，既可以作为函数调用，也可以访问FnNode的属性和方法。
 *
 * 使用示例：
 * ```js
 * const myFunction = Fn(([a, b]) => {
 *   return a.add(b);
 * });
 *
 * // 调用函数
 * const result = myFunction(1, 2);
 *
 * // 设置布局
 * myFunction.setLayout({ a: 'float', b: 'float', return: 'float' });
 * ```
 *
 * @param {Function} jsFunc - JavaScript函数
 * @param {Object|null} layout - 可选的布局定义
 * @returns {Proxy} 函数代理对象
 */
export function Fn(jsFunc, layout = null) {
  // 创建FnNode实例
  const instance = new FnNode(jsFunc, layout);

  // 返回代理对象，支持函数调用和属性访问
  return new Proxy(() => {}, {
    /**
     * 拦截函数调用
     * @param {Function} target - 目标函数（未使用）
     * @param {*} thisArg - this上下文（未使用）
     * @param {Array} params - 调用参数
     * @returns {*} 函数调用结果
     */
    apply(target, thisArg, params) {
      return instance.call(...params);
    },

    /**
     * 拦截属性获取
     * @param {Function} target - 目标函数（未使用）
     * @param {string|symbol} prop - 属性名
     * @param {Object} receiver - 代理对象
     * @returns {*} 属性值
     */
    get(target, prop, receiver) {
      return Reflect.get(instance, prop, receiver);
    },

    /**
     * 拦截属性设置
     * @param {Function} target - 目标函数（未使用）
     * @param {string|symbol} prop - 属性名
     * @param {*} value - 属性值
     * @param {Object} receiver - 代理对象
     * @returns {boolean} 是否设置成功
     */
    set(target, prop, value, receiver) {
      return Reflect.set(instance, prop, value, receiver);
    },
  });
}

// ===== 堆栈管理函数 =====

/**
 * 设置当前堆栈
 *
 * 设置全局的当前堆栈实例，用于管理节点的执行顺序。
 *
 * @param {StackNode} stack - 要设置的堆栈节点
 */
export const setCurrentStack = (stack) => {
  if (currentStack === stack) {
    // 如果堆栈已经是当前堆栈，不做任何操作
    // throw new Error( 'Stack already defined.' );
  }

  currentStack = stack;
};

/**
 * 获取当前堆栈
 *
 * 返回当前活动的堆栈实例。
 *
 * @returns {StackNode} 当前堆栈节点
 */
export const getCurrentStack = () => currentStack;

/**
 * 条件语句节点（if/else）
 *
 * 创建一个条件节点，支持if/else语句结构。
 *
 * 使用示例：
 * ```js
 * If( condition, function )
 * 	.ElseIf( condition, function )
 * 	.Else( function )
 * ```
 *
 * @tsl
 * @function
 * @param {...any} params - 条件节点的参数
 * @returns {StackNode} 条件节点
 */
export const If = (...params) => currentStack.If(...params);

/**
 * 选择语句节点（switch/case）
 *
 * 创建一个选择节点，支持switch/case语句结构。
 *
 * 使用示例：
 * ```js
 * Switch( value )
 * 	.Case( 1, function )
 * 	.Case( 2, 3, 4, function )
 * 	.Default( function )
 * ```
 *
 * @tsl
 * @function
 * @param {...any} params - 选择节点的参数
 * @returns {StackNode} 选择节点
 */
export const Switch = (...params) => currentStack.Switch(...params);

/**
 * 将给定节点添加到当前堆栈
 *
 * @param {Node} node - 要添加的节点
 * @returns {Node} 添加到堆栈的节点
 */
export function Stack(node) {
  if (currentStack) currentStack.add(node);

  return node;
}

// 添加堆栈方法的链式调用
addMethodChaining("toStack", Stack);

// ===== 数据类型转换器 =====
// TSL中的基础数据类型，用于类型转换和常量创建

// 颜色类型
export const color = new ConvertType("color");

// 标量类型
export const float = new ConvertType("float", cacheMaps.float); // 浮点数
export const int = new ConvertType("int", cacheMaps.ints); // 整数
export const uint = new ConvertType("uint", cacheMaps.uint); // 无符号整数
export const bool = new ConvertType("bool", cacheMaps.bool); // 布尔值

// 二维向量类型
export const vec2 = new ConvertType("vec2"); // 浮点数二维向量
export const ivec2 = new ConvertType("ivec2"); // 整数二维向量
export const uvec2 = new ConvertType("uvec2"); // 无符号整数二维向量
export const bvec2 = new ConvertType("bvec2"); // 布尔二维向量

// 三维向量类型
export const vec3 = new ConvertType("vec3"); // 浮点数三维向量
export const ivec3 = new ConvertType("ivec3"); // 整数三维向量
export const uvec3 = new ConvertType("uvec3"); // 无符号整数三维向量
export const bvec3 = new ConvertType("bvec3"); // 布尔三维向量

// 四维向量类型
export const vec4 = new ConvertType("vec4"); // 浮点数四维向量
export const ivec4 = new ConvertType("ivec4"); // 整数四维向量
export const uvec4 = new ConvertType("uvec4"); // 无符号整数四维向量
export const bvec4 = new ConvertType("bvec4"); // 布尔四维向量

// 矩阵类型
export const mat2 = new ConvertType("mat2"); // 2x2矩阵
export const mat3 = new ConvertType("mat3"); // 3x3矩阵
export const mat4 = new ConvertType("mat4"); // 4x4矩阵

// 特殊类型
export const string = (value = "") => nodeObject(new ConstNode(value, "string")); // 字符串常量
export const arrayBuffer = (value) => nodeObject(new ConstNode(value, "ArrayBuffer")); // 数组缓冲区常量

// 为所有类型转换器添加链式调用方法
addMethodChaining("toColor", color); // .toColor() - 转换为颜色
addMethodChaining("toFloat", float); // .toFloat() - 转换为浮点数
addMethodChaining("toInt", int); // .toInt() - 转换为整数
addMethodChaining("toUint", uint); // .toUint() - 转换为无符号整数
addMethodChaining("toBool", bool); // .toBool() - 转换为布尔值
addMethodChaining("toVec2", vec2); // .toVec2() - 转换为二维向量
addMethodChaining("toIVec2", ivec2); // .toIVec2() - 转换为整数二维向量
addMethodChaining("toUVec2", uvec2); // .toUVec2() - 转换为无符号整数二维向量
addMethodChaining("toBVec2", bvec2); // .toBVec2() - 转换为布尔二维向量
addMethodChaining("toVec3", vec3); // .toVec3() - 转换为三维向量
addMethodChaining("toIVec3", ivec3); // .toIVec3() - 转换为整数三维向量
addMethodChaining("toUVec3", uvec3); // .toUVec3() - 转换为无符号整数三维向量
addMethodChaining("toBVec3", bvec3); // .toBVec3() - 转换为布尔三维向量
addMethodChaining("toVec4", vec4); // .toVec4() - 转换为四维向量
addMethodChaining("toIVec4", ivec4); // .toIVec4() - 转换为整数四维向量
addMethodChaining("toUVec4", uvec4); // .toUVec4() - 转换为无符号整数四维向量
addMethodChaining("toBVec4", bvec4); // .toBVec4() - 转换为布尔四维向量
addMethodChaining("toMat2", mat2); // .toMat2() - 转换为2x2矩阵
addMethodChaining("toMat3", mat3); // .toMat3() - 转换为3x3矩阵
addMethodChaining("toMat4", mat4); // .toMat4() - 转换为4x4矩阵

// ===== 基础节点操作 =====

// 数组元素访问节点
export const element = /*@__PURE__*/ nodeProxy(ArrayElementNode).setParameterLength(2);
// 类型转换节点
export const convert = (node, types) => nodeObject(new ConvertNode(nodeObject(node), types));
// 向量分量分割节点
export const split = (node, channels) => nodeObject(new SplitNode(nodeObject(node), channels));

// 添加基础节点操作的链式调用方法
addMethodChaining("element", element); // .element() - 数组元素访问
addMethodChaining("convert", convert); // .convert() - 类型转换

// ===== 已废弃的函数 =====

/**
 * 添加节点到堆栈（已废弃）
 *
 * @tsl
 * @function
 * @deprecated 自 r176 版本起废弃。请使用 {@link Stack} 替代。
 *
 * @param {Node} node - 要添加的节点
 * @returns {Function} 堆栈函数
 */
export const append = (node) => {
  // @deprecated, r176

  console.warn("THREE.TSL: append() has been renamed to Stack().");
  return Stack(node);
};

// 添加已废弃的链式调用方法
addMethodChaining("append", (node) => {
  // @deprecated, r176

  console.warn("THREE.TSL: .append() has been renamed to .toStack().");
  return Stack(node);
});
