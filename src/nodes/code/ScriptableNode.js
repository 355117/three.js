// 导入节点基类
import Node from "../core/Node.js";
// 导入可脚本化值节点
import { scriptableValue } from "./ScriptableValueNode.js";
// 导入TSL基础函数
import { nodeProxy, float } from "../tsl/TSLBase.js";
// 导入哈希工具函数
import { hashArray, hashString } from "../core/NodeUtils.js";

/**
 * 资源管理器 - 用于管理可脚本化节点资源的类Map数据结构
 *
 * @augments Map
 */
class Resources extends Map {
  /**
   * 获取资源，如果不存在则通过回调创建
   *
   * @param {string} key - 资源键
   * @param {Function|null} [callback=null] - 创建资源的回调函数
   * @param {...any} params - 传递给回调的参数
   * @return {any} 资源值
   */
  get(key, callback = null, ...params) {
    // 如果资源已存在，直接返回
    if (this.has(key)) return super.get(key);

    // 如果提供了回调函数，创建新资源
    if (callback !== null) {
      const value = callback(...params);
      this.set(key, value);
      return value;
    }
  }
}

/**
 * 参数管理器 - 用于管理脚本参数的类
 */
class Parameters {
  /**
   * 构造参数管理器
   *
   * @param {ScriptableNode} scriptableNode - 可脚本化节点
   */
  constructor(scriptableNode) {
    this.scriptableNode = scriptableNode;
  }

  /**
   * 获取参数对象
   *
   * @type {Object}
   */
  get parameters() {
    return this.scriptableNode.parameters;
  }

  /**
   * 获取布局对象
   *
   * @type {Object}
   */
  get layout() {
    return this.scriptableNode.getLayout();
  }

  /**
   * 获取指定ID的输入布局
   *
   * @param {string} id - 输入ID
   * @return {Object} 输入布局对象
   */
  getInputLayout(id) {
    return this.scriptableNode.getInputLayout(id);
  }

  /**
   * 获取指定名称的参数值
   *
   * @param {string} name - 参数名称
   * @return {any} 参数值
   */
  get(name) {
    const param = this.parameters[name];
    const value = param ? param.getValue() : null;

    return value;
  }
}

/**
 * 可脚本化节点资源 - 定义可脚本化节点的资源（例如命名空间）
 *
 * @type {Resources}
 */
export const ScriptableNodeResources = new Resources();

/**
 * 可脚本化节点 - 此类型的节点允许使用自定义脚本实现节点。脚本部分表示为用JavaScript编写的 `CodeNode` 实例。
 * 脚本本身必须遵循特定的结构：
 *
 * - main(): 默认执行一次，每次设置 `node.needsUpdate` 时也会执行
 * - layout: 布局对象定义脚本的接口（输入和输出）
 *
 * ```js
 * ScriptableNodeResources.set( 'TSL', TSL );
 *
 * const scriptableNode = scriptable( js( `
 * 	layout = {
 * 		outputType: 'node',
 * 		elements: [
 * 			{ name: 'source', inputType: 'node' },
 * 		]
 * 	};
 *
 * 	const { mul, oscSine } = TSL;
 *
 * 	function main() {
 * 		const source = parameters.get( 'source' ) || float();
 * 		return mul( source, oscSine() ) );
 * 	}
 *
 * ` ) );
 *
 * scriptableNode.setParameter( 'source', color( 1, 0, 0 ) );
 *
 * const material = new THREE.MeshBasicNodeMaterial();
 * material.colorNode = scriptableNode;
 * ```
 *
 * @augments Node
 */
class ScriptableNode extends Node {
  static get type() {
    return "ScriptableNode";
  }

  /**
   * 构造一个新的可脚本化节点
   *
   * @param {?Object} [codeNode=null] - 代码节点
   * @param {Object} [parameters={}] - 参数定义
   */
  constructor(codeNode = null, parameters = {}) {
    // 调用父类构造函数
    super();

    /**
     * 代码节点
     *
     * @type {?Object}
     * @default null
     */
    this.codeNode = codeNode;

    /**
     * 参数定义
     *
     * @type {Object}
     * @default {}
     */
    this.parameters = parameters;

    // 初始化内部属性
    this._local = new Resources(); // 本地资源
    this._output = scriptableValue(null); // 默认输出
    this._outputs = {}; // 输出集合
    this._source = this.source; // 源代码缓存
    this._method = null; // 编译后的方法
    this._object = null; // 脚本对象
    this._value = null; // 输出值
    this._needsOutputUpdate = true; // 是否需要更新输出

    // 绑定刷新事件处理器
    this.onRefresh = this.onRefresh.bind(this);

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isScriptableNode = true;
  }

  /**
   * 可脚本化节点的源代码
   *
   * @type {string}
   */
  get source() {
    return this.codeNode ? this.codeNode.code : "";
  }

  /**
   * 设置本地脚本变量的引用
   *
   * @param {string} name - 变量名称
   * @param {Object} value - 要设置的引用
   * @return {Resources} 资源映射
   */
  setLocal(name, value) {
    return this._local.set(name, value);
  }

  /**
   * 获取本地脚本变量的值
   *
   * @param {string} name - 变量名称
   * @return {Object} 值
   */
  getLocal(name) {
    return this._local.get(name);
  }

  /**
   * `refresh` 事件的事件监听器
   */
  onRefresh() {
    this._refresh();
  }

  /**
   * 从布局中返回具有给定id/名称的输入
   *
   * @param {string} id - 输入的id/名称
   * @return {Object} 元素条目
   */
  getInputLayout(id) {
    for (const element of this.getLayout()) {
      if (element.inputType && (element.id === id || element.name === id)) {
        return element;
      }
    }
  }

  /**
   * 从布局中返回具有给定id/名称的输出
   *
   * @param {string} id - 输出的id/名称
   * @return {Object} 元素条目
   */
  getOutputLayout(id) {
    for (const element of this.getLayout()) {
      if (element.outputType && (element.id === id || element.name === id)) {
        return element;
      }
    }
  }

  /**
   * 为给定名称和值定义脚本输出
   *
   * @param {string} name - 输出的名称
   * @param {Node} value - 节点值
   * @return {ScriptableNode} 对此节点的引用
   */
  setOutput(name, value) {
    const outputs = this._outputs;

    if (outputs[name] === undefined) {
      // 如果输出不存在，创建新的可脚本化值
      outputs[name] = scriptableValue(value);
    } else {
      // 如果输出已存在，更新其值
      outputs[name].value = value;
    }

    return this;
  }

  /**
   * 返回给定名称的脚本输出
   *
   * @param {string} name - 输出的名称
   * @return {Object} 节点值
   */
  getOutput(name) {
    return this._outputs[name];
  }

  /**
   * 返回给定名称的参数
   *
   * @param {string} name - 参数的名称
   * @return {Object} 节点值
   */
  getParameter(name) {
    return this.parameters[name];
  }

  /**
   * 为给定参数名称设置值
   *
   * @param {string} name - 参数名称
   * @param {any} value - 参数值
   * @return {ScriptableNode} 对此节点的引用
   */
  setParameter(name, value) {
    const parameters = this.parameters;

    if (value && value.isScriptableNode) {
      // 如果值是可脚本化节点
      this.deleteParameter(name);

      parameters[name] = value;
      parameters[name].getDefaultOutput().events.addEventListener("refresh", this.onRefresh);
    } else if (value && value.isScriptableValueNode) {
      // 如果值是可脚本化值节点
      this.deleteParameter(name);

      parameters[name] = value;
      parameters[name].events.addEventListener("refresh", this.onRefresh);
    } else if (parameters[name] === undefined) {
      // 如果参数不存在，创建新的可脚本化值
      parameters[name] = scriptableValue(value);
      parameters[name].events.addEventListener("refresh", this.onRefresh);
    } else {
      // 如果参数已存在，更新其值
      parameters[name].value = value;
    }

    return this;
  }

  /**
   * 返回此节点的值，即默认输出的值
   *
   * @return {Node} 值
   */
  getValue() {
    return this.getDefaultOutput().getValue();
  }

  /**
   * 从脚本中删除参数
   *
   * @param {string} name - 要移除的参数
   * @return {ScriptableNode} 对此节点的引用
   */
  deleteParameter(name) {
    let valueNode = this.parameters[name];

    if (valueNode) {
      // 如果是可脚本化节点，获取其默认输出
      if (valueNode.isScriptableNode) valueNode = valueNode.getDefaultOutput();

      // 移除刷新事件监听器
      valueNode.events.removeEventListener("refresh", this.onRefresh);
    }

    return this;
  }

  /**
   * 从脚本中删除所有参数
   *
   * @return {ScriptableNode} 对此节点的引用
   */
  clearParameters() {
    // 删除所有参数
    for (const name of Object.keys(this.parameters)) {
      this.deleteParameter(name);
    }

    // 标记需要更新
    this.needsUpdate = true;

    return this;
  }

  /**
   * 从脚本中调用函数
   *
   * @param {string} name - 函数名称
   * @param {...any} params - 参数列表
   * @return {any} 函数调用的结果
   */
  call(name, ...params) {
    const object = this.getObject();
    const method = object[name];

    if (typeof method === "function") {
      return method(...params);
    }
  }

  /**
   * 异步调用脚本中的函数
   *
   * @param {string} name - 函数名称
   * @param {...any} params - 参数列表
   * @return {Promise<any>} 函数调用的结果
   */
  async callAsync(name, ...params) {
    const object = this.getObject();
    const method = object[name];

    if (typeof method === "function") {
      // 检查是否为异步函数
      return method.constructor.name === "AsyncFunction" ? await method(...params) : method(...params);
    }
  }

  /**
   * 重写，因为节点类型从脚本的输出推断
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 节点类型
   */
  getNodeType(builder) {
    return this.getDefaultOutputNode().getNodeType(builder);
  }

  /**
   * 刷新脚本节点
   *
   * @param {?string} [output=null] - 可选的输出
   */
  refresh(output = null) {
    if (output !== null) {
      // 刷新指定的输出
      this.getOutput(output).refresh();
    } else {
      // 刷新整个节点
      this._refresh();
    }
  }

  /**
   * 返回脚本的对象表示形式
   *
   * @return {Object} 结果对象
   */
  getObject() {
    // 如果需要更新，先释放资源
    if (this.needsUpdate) this.dispose();
    // 如果对象已存在，直接返回
    if (this._object !== null) return this._object;

    // 准备脚本执行环境

    // 创建刷新函数
    const refresh = () => this.refresh();
    // 创建设置输出函数
    const setOutput = (id, value) => this.setOutput(id, value);

    // 创建参数管理器
    const parameters = new Parameters(this);

    // 获取全局资源
    const THREE = ScriptableNodeResources.get("THREE");
    const TSL = ScriptableNodeResources.get("TSL");

    // 获取编译后的方法并准备参数
    const method = this.getMethod();
    const params = [parameters, this._local, ScriptableNodeResources, refresh, setOutput, THREE, TSL];

    // 执行脚本方法创建对象
    this._object = method(...params);

    // 处理布局配置
    const layout = this._object.layout;

    if (layout) {
      // 如果禁用缓存，清空本地资源
      if (layout.cache === false) {
        this._local.clear();
      }

      // 设置默认输出类型
      this._output.outputType = layout.outputType || null;

      // 处理布局元素
      if (Array.isArray(layout.elements)) {
        for (const element of layout.elements) {
          const id = element.id || element.name;

          // 处理输入类型
          if (element.inputType) {
            // 如果参数不存在，创建默认参数
            if (this.getParameter(id) === undefined) this.setParameter(id, null);

            // 设置参数的输入类型
            this.getParameter(id).inputType = element.inputType;
          }

          // 处理输出类型
          if (element.outputType) {
            // 如果输出不存在，创建默认输出
            if (this.getOutput(id) === undefined) this.setOutput(id, null);

            // 设置输出的输出类型
            this.getOutput(id).outputType = element.outputType;
          }
        }
      }
    }

    return this._object;
  }

  /**
   * 反序列化节点数据
   *
   * @param {Object} data - 反序列化数据对象
   */
  deserialize(data) {
    // 调用父类反序列化方法
    super.deserialize(data);

    // 为所有参数重新绑定刷新事件监听器
    for (const name in this.parameters) {
      let valueNode = this.parameters[name];

      // 如果是可脚本化节点，获取其默认输出
      if (valueNode.isScriptableNode) valueNode = valueNode.getDefaultOutput();

      // 添加刷新事件监听器
      valueNode.events.addEventListener("refresh", this.onRefresh);
    }
  }

  /**
   * 返回脚本的布局
   *
   * @return {Object} 脚本的布局
   */
  getLayout() {
    return this.getObject().layout;
  }

  /**
   * 返回脚本的默认节点输出
   *
   * @return {Node} 默认节点输出
   */
  getDefaultOutputNode() {
    const output = this.getDefaultOutput().value;

    // 如果输出是节点，返回该节点
    if (output && output.isNode) {
      return output;
    }

    // 否则返回默认的float节点
    return float();
  }

  /**
   * 返回脚本的默认输出
   *
   * @return {Object} 默认输出
   */
  getDefaultOutput() {
    return this._exec()._output;
  }

  /**
   * 从节点脚本创建并返回函数
   *
   * @return {Function} 表示节点代码的函数
   */
  getMethod() {
    // 如果需要更新，先释放资源
    if (this.needsUpdate) this.dispose();
    // 如果方法已存在，直接返回
    if (this._method !== null) return this._method;

    // 构建函数代码

    // 定义函数参数列表（注入到脚本中的变量）
    const parametersProps = ["parameters", "local", "global", "refresh", "setOutput", "THREE", "TSL"];
    // 定义脚本接口属性（脚本可以定义的属性）
    const interfaceProps = ["layout", "init", "main", "dispose"];

    // 构建属性声明字符串
    const properties = interfaceProps.join(", ");
    // 构建变量声明代码
    const declarations = "var " + properties + "; var output = {};\n";
    // 构建返回语句代码
    const returns = "\nreturn { ...output, " + properties + " };";

    // 组合完整的函数代码：声明 + 用户代码 + 返回
    const code = declarations + this.codeNode.code + returns;

    // 创建并缓存函数

    // 使用Function构造函数创建动态函数
    this._method = new Function(...parametersProps, code);

    return this._method;
  }

  /**
   * 释放所有内部资源
   */
  dispose() {
    // 如果方法为空，说明已经释放过了
    if (this._method === null) return;

    // 如果脚本对象有dispose方法，调用它进行清理
    if (this._object && typeof this._object.dispose === "function") {
      this._object.dispose();
    }

    // 清空所有缓存的内部状态
    this._method = null; // 清空编译后的方法
    this._object = null; // 清空脚本对象
    this._source = null; // 清空源代码缓存
    this._value = null; // 清空输出值
    this._needsOutputUpdate = true; // 标记需要更新输出
    this._output.value = null; // 清空默认输出值
    this._outputs = {}; // 清空所有输出
  }

  /**
   * 设置节点，返回默认输出节点
   *
   * @return {Node} 默认输出节点
   */
  setup() {
    return this.getDefaultOutputNode();
  }

  /**
   * 获取缓存键，用于节点缓存系统
   *
   * @param {boolean} force - 是否强制重新计算
   * @return {string} 缓存键
   */
  getCacheKey(force) {
    // 构建缓存键的值数组
    const values = [hashString(this.source), this.getDefaultOutputNode().getCacheKey(force)];

    // 添加所有参数的缓存键
    for (const param in this.parameters) {
      values.push(this.parameters[param].getCacheKey(force));
    }

    // 返回组合后的哈希值
    return hashArray(values);
  }

  /**
   * 设置是否需要更新
   *
   * @param {boolean} value - 是否需要更新
   */
  set needsUpdate(value) {
    // 如果设置为需要更新，释放所有资源
    if (value === true) this.dispose();
  }

  /**
   * 获取是否需要更新
   *
   * @return {boolean} 是否需要更新
   */
  get needsUpdate() {
    // 比较当前源代码与缓存的源代码是否不同
    return this.source !== this._source;
  }

  /**
   * 执行脚本的 `main` 函数
   *
   * @private
   * @return {ScriptableNode} 对此节点的引用
   */
  _exec() {
    // 如果没有代码节点，直接返回
    if (this.codeNode === null) return this;

    // 如果需要更新输出
    if (this._needsOutputUpdate === true) {
      // 调用main函数获取值
      this._value = this.call("main");

      this._needsOutputUpdate = false;
    }

    // 设置输出值
    this._output.value = this._value;

    return this;
  }

  /**
   * 执行刷新操作
   *
   * @private
   */
  _refresh() {
    // 标记需要更新
    this.needsUpdate = true;

    // 执行脚本
    this._exec();

    // 刷新输出
    this._output.refresh();
  }
}

// 导出ScriptableNode类作为默认导出
export default ScriptableNode;

/**
 * TSL函数 - 用于创建可脚本化节点
 *
 * @tsl
 * @function
 * @param {Object} [codeNode] - 代码节点
 * @param {?Object} [parameters={}] - 参数定义
 * @returns {ScriptableNode}
 */
export const scriptable = /*@__PURE__*/ nodeProxy(ScriptableNode).setParameterLength(1, 2);
