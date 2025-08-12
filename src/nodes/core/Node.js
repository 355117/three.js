// 导入节点更新类型常量
import { NodeUpdateType } from "./constants.js";
// 导入节点工具函数：获取子节点、获取缓存键、哈希函数
import { getNodeChildren, getCacheKey, hash } from "./NodeUtils.js";

// 导入事件分发器基类
import { EventDispatcher } from "../../core/EventDispatcher.js";
// 导入数学工具类
import { MathUtils } from "../../math/MathUtils.js";

// 父构建阶段映射表：定义构建阶段的依赖关系
// analyze阶段需要先完成setup阶段，generate阶段需要先完成analyze阶段
const _parentBuildStage = {
  analyze: "setup", // 分析阶段依赖于设置阶段
  generate: "analyze", // 生成阶段依赖于分析阶段
};

// 全局节点ID计数器，用于为每个节点分配唯一ID
let _nodeId = 0;

/**
 * 所有节点的基类。
 * Node类是Three.js节点系统的核心，提供了节点的基本功能和生命周期管理。
 * 节点系统用于构建着色器代码，每个节点代表着色器中的一个操作或值。
 *
 * @augments EventDispatcher
 */
class Node extends EventDispatcher {
  // 静态方法：返回节点类型名称
  static get type() {
    return "Node"; // 返回基础节点类型标识
  }

  /**
   * 构造一个新的节点实例。
   * 初始化节点的基本属性，包括类型、更新类型、UUID等。
   *
   * @param {?string} nodeType - 节点类型，表示节点的结果类型（如'float'或'vec3'）
   */
  constructor(nodeType = null) {
    // 调用父类EventDispatcher的构造函数
    super();

    /**
     * 节点类型。表示节点的结果类型（例如 `float` 或 `vec3`）。
     * 这个属性定义了节点在着色器中产生的数据类型。
     *
     * @type {?string}
     * @default null
     */
    this.nodeType = nodeType;

    /**
     * 节点 {@link Node#update} 方法的更新类型。
     * 可能的值在 {@link NodeUpdateType} 中列出，控制update方法的调用频率。
     *
     * @type {string}
     * @default 'none'
     */
    this.updateType = NodeUpdateType.NONE;

    /**
     * 节点 {@link Node#updateBefore} 方法的更新类型。
     * 可能的值在 {@link NodeUpdateType} 中列出，控制updateBefore方法的调用频率。
     *
     * @type {string}
     * @default 'none'
     */
    this.updateBeforeType = NodeUpdateType.NONE;

    /**
     * 节点 {@link Node#updateAfter} 方法的更新类型。
     * 可能的值在 {@link NodeUpdateType} 中列出，控制updateAfter方法的调用频率。
     *
     * @type {string}
     * @default 'none'
     */
    this.updateAfterType = NodeUpdateType.NONE;

    /**
     * 节点的唯一标识符（UUID）。
     * 每个节点实例都有一个唯一的UUID，用于标识和区分不同的节点。
     *
     * @type {string}
     * @readonly
     */
    this.uuid = MathUtils.generateUUID();

    /**
     * 节点的版本号。当 {@link Node#needsUpdate} 设置为 `true` 时，版本号会自动递增。
     * 版本号用于跟踪节点的变化，确保缓存的有效性。
     *
     * @type {number}
     * @readonly
     * @default 0
     */
    this.version = 0;

    /**
     * 标识此节点是否为全局节点。此属性与内部节点缓存系统相关。
     * 所有应该只声明一次的节点都应该将此标志设置为 `true`
     * （典型例子是 {@link AttributeNode}）。
     *
     * @type {boolean}
     * @default false
     */
    this.global = false;

    /**
     * 在构建过程中为此节点创建父节点列表。
     * 当设置为true时，会跟踪哪些节点使用了当前节点。
     *
     * @type {boolean}
     * @default false
     */
    this.parents = false;

    /**
     * 此标志可用于类型测试，标识对象是否为Node实例。
     * 这是一个便于识别Node对象的标识符。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isNode = true;

    // 私有属性

    /**
     * 此节点的缓存键。
     * 用于节点缓存系统，提高性能。
     *
     * @private
     * @type {?number}
     * @default null
     */
    this._cacheKey = null;

    /**
     * 缓存键的版本号。
     * 用于跟踪缓存键的有效性，确保缓存数据的一致性。
     *
     * @private
     * @type {number}
     * @default 0
     */
    this._cacheKeyVersion = 0;

    // 为节点定义只读的id属性，使用全局计数器分配唯一ID
    Object.defineProperty(this, "id", { value: _nodeId++ });
  }

  /**
   * 当节点需要重新生成时，将此属性设置为 `true`。
   * 设置为true时会自动递增版本号，触发节点的重新构建。
   *
   * @type {boolean}
   * @default false
   * @param {boolean} value - 是否需要更新
   */
  set needsUpdate(value) {
    if (value === true) {
      this.version++; // 递增版本号，标记节点已更新
    }
  }

  /**
   * 类的类型名称。通常是构造函数的名称。
   * 这个getter返回节点的具体类型，用于识别节点种类。
   *
   * @type {string}
   * @readonly
   */
  get type() {
    return this.constructor.type; // 返回构造函数的type属性
  }

  /**
   * 定义 {@link Node#update} 方法的便捷方法。
   * 允许用户设置自定义的更新回调函数和更新类型。
   *
   * @param {Function} callback - 更新方法回调函数
   * @param {string} updateType - 更新类型（如FRAME、RENDER等）
   * @return {Node} 返回当前节点的引用，支持链式调用
   */
  onUpdate(callback, updateType) {
    this.updateType = updateType; // 设置更新类型
    this.update = callback.bind(this.getSelf()); // 绑定回调函数到节点实例

    return this; // 返回this支持链式调用
  }

  /**
   * 定义 {@link Node#update} 方法的便捷方法。类似于 {@link Node#onUpdate}，
   * 但此方法自动将更新类型设置为 `FRAME`（每帧更新）。
   *
   * @param {Function} callback - 更新方法回调函数
   * @return {Node} 返回当前节点的引用，支持链式调用
   */
  onFrameUpdate(callback) {
    return this.onUpdate(callback, NodeUpdateType.FRAME); // 设置为每帧更新
  }

  /**
   * 定义 {@link Node#update} 方法的便捷方法。类似于 {@link Node#onUpdate}，
   * 但此方法自动将更新类型设置为 `RENDER`（每次渲染更新）。
   *
   * @param {Function} callback - 更新方法回调函数
   * @return {Node} 返回当前节点的引用，支持链式调用
   */
  onRenderUpdate(callback) {
    return this.onUpdate(callback, NodeUpdateType.RENDER); // 设置为每次渲染更新
  }

  /**
   * 定义 {@link Node#update} 方法的便捷方法。类似于 {@link Node#onUpdate}，
   * 但此方法自动将更新类型设置为 `OBJECT`（每个对象更新）。
   *
   * @param {Function} callback - 更新方法回调函数
   * @return {Node} 返回当前节点的引用，支持链式调用
   */
  onObjectUpdate(callback) {
    return this.onUpdate(callback, NodeUpdateType.OBJECT); // 设置为每个对象更新
  }

  /**
   * 定义 {@link Node#updateReference} 方法的便捷方法。
   * 用于设置引用更新的回调函数。
   *
   * @param {Function} callback - 引用更新方法回调函数
   * @return {Node} 返回当前节点的引用，支持链式调用
   */
  onReference(callback) {
    this.updateReference = callback.bind(this.getSelf()); // 绑定引用更新回调

    return this; // 返回this支持链式调用
  }

  /**
   * 获取实际的节点实例引用。
   * 由于 `this` 引用可能指向代理对象，此方法可用于获取实际节点实例的引用。
   *
   * @return {Node} 节点的实际引用
   */
  getSelf() {
    // 返回实际的节点对象，而不是代理对象

    return this.self || this; // 如果存在self属性则返回，否则返回this
  }

  /**
   * 动态更新节点引用的方法。
   * 节点可能引用其他对象（如材质），此方法允许基于给定状态动态更新这些引用
   * （例如当前节点帧或构建器）。
   *
   * @param {any} state - 状态对象，可以在不同上下文中调用，因此state可以是任何对象类型
   * @return {any} 更新后的引用
   */
  updateReference(/*state*/) {
    return this; // 默认返回自身，子类可以重写此方法
  }

  /**
   * 判断此节点是否为全局节点。
   * 默认情况下，此方法返回 {@link Node#global} 标志的值。
   * 如果需要分析方式来确定当前着色器阶段的全局缓存，可以在派生类中重写此方法。
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {boolean} 此节点是否为全局节点
   */
  isGlobal(/*builder*/) {
    return this.global; // 返回global标志的值
  }

  /**
   * 生成器函数，用于迭代子节点。
   * 提供了一种便捷的方式来遍历当前节点的所有子节点。
   *
   * @generator
   * @yields {Node} 子节点
   */
  *getChildren() {
    // 使用工具函数获取子节点并逐个yield
    for (const { childNode } of getNodeChildren(this)) {
      yield childNode;
    }
  }

  /**
   * 销毁节点并分发 `dispose` 事件。
   * 调用此方法会分发 `dispose` 事件，可用于注册事件监听器来执行清理任务。
   */
  dispose() {
    this.dispatchEvent({ type: "dispose" }); // 分发销毁事件
  }

  /**
   * {@link Node#traverse} 方法的回调函数类型定义。
   *
   * @callback traverseCallback
   * @param {Node} node - 当前遍历到的节点
   */

  /**
   * 遍历节点层次结构。
   * 可用于遍历节点的整个层次结构，对每个节点执行指定的回调函数。
   *
   * @param {traverseCallback} callback - 对每个节点执行的回调函数
   */
  traverse(callback) {
    callback(this); // 首先对当前节点执行回调

    // 递归遍历所有子节点
    for (const childNode of this.getChildren()) {
      childNode.traverse(callback);
    }
  }

  /**
   * 返回此节点的缓存键。
   * 缓存键用于节点缓存系统，提高构建性能。
   *
   * @param {boolean} [force=false] - 设置为 `true` 时，强制重新计算缓存键
   * @return {number} 节点的缓存键
   */
  getCacheKey(force = false) {
    // 检查是否需要强制更新或版本不匹配
    force = force || this.version !== this._cacheKeyVersion;

    // 如果需要强制更新或缓存键为空，则重新计算
    if (force === true || this._cacheKey === null) {
      this._cacheKey = hash(getCacheKey(this, force), this.customCacheKey());
      this._cacheKeyVersion = this.version; // 更新缓存键版本
    }

    return this._cacheKey; // 返回缓存键
  }

  /**
   * 为此节点生成自定义缓存键。
   * 子类可以重写此方法来提供特定的缓存键逻辑。
   *
   * @return {number} 节点的自定义缓存键
   */
  customCacheKey() {
    return 0; // 默认返回0，子类可以重写
  }

  /**
   * 返回此节点的作用域引用。
   * 默认情况下返回 `this`，用于确定节点的作用域范围。
   *
   * @return {Node} 此节点的引用
   */
  getScope() {
    return this; // 默认返回自身
  }

  /**
   * 返回用于标识节点的哈希值。
   * 默认情况下是 {@link Node#uuid}，但派生节点类可能需要根据其实现重写此方法。
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 哈希值
   */
  getHash(/*builder*/) {
    return this.uuid; // 默认返回UUID作为哈希值
  }

  /**
   * 返回 {@link Node#update} 方法的更新类型。
   * 用于确定update方法的调用频率和时机。
   *
   * @return {NodeUpdateType} 更新类型
   */
  getUpdateType() {
    return this.updateType; // 返回update方法的更新类型
  }

  /**
   * 返回 {@link Node#updateBefore} 方法的更新类型。
   * 用于确定updateBefore方法的调用频率和时机。
   *
   * @return {NodeUpdateType} 更新类型
   */
  getUpdateBeforeType() {
    return this.updateBeforeType; // 返回updateBefore方法的更新类型
  }

  /**
   * 返回 {@link Node#updateAfter} 方法的更新类型。
   * 用于确定updateAfter方法的调用频率和时机。
   *
   * @return {NodeUpdateType} 更新类型
   */
  getUpdateAfterType() {
    return this.updateAfterType; // 返回updateAfter方法的更新类型
  }

  /**
   * 获取节点元素类型。
   * 某些类型由多个元素组成，例如 `vec3` 由三个 `float` 值组成。
   * 此方法返回这些元素的类型。
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 节点元素的类型
   */
  getElementType(builder) {
    const type = this.getNodeType(builder); // 获取节点类型
    const elementType = builder.getElementType(type); // 通过构建器获取元素类型

    return elementType; // 返回元素类型
  }

  /**
   * 返回给定名称的节点成员类型。
   * 用于获取节点特定成员的数据类型。
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {string} name - 成员的名称
   * @return {string} 节点成员的类型
   */
  getMemberType(/*builder, name*/) {
    return "void"; // 默认返回void类型，子类可以重写
  }

  /**
   * 返回节点的类型。
   * 如果存在输出节点，则返回输出节点的类型，否则返回节点自身的类型。
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 节点的类型
   */
  getNodeType(builder) {
    const nodeProperties = builder.getNodeProperties(this); // 获取节点属性

    // 如果存在输出节点，返回输出节点的类型
    if (nodeProperties.outputNode) {
      return nodeProperties.outputNode.getNodeType(builder);
    }

    return this.nodeType; // 否则返回节点自身的类型
  }

  /**
   * 获取共享节点实例。
   * 此方法在节点构建过程中使用，确保相同的节点不会被多次构建，而是只构建一次。
   * 例如，如果用户多次使用 `attribute( 'uv' )`，构建过程会确保只处理第一个节点。
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {Node} 如果可能，返回共享节点；否则返回 `this`
   */
  getShared(builder) {
    const hash = this.getHash(builder); // 获取节点哈希值
    const nodeFromHash = builder.getNodeFromHash(hash); // 从构建器中获取已存在的节点

    return nodeFromHash || this; // 返回共享节点或当前节点
  }

  /**
   * 返回节点数组中的元素数量。
   * 用于数组类型节点，返回数组的长度。
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {?number} 节点数组中的元素数量，如果不是数组则返回null
   */
  getArrayCount(/*builder*/) {
    return null; // 默认返回null，数组类型的节点会重写此方法
  }

  /**
   * 表示设置阶段，这是构建过程的第一步，参见 {@link Node#build} 方法。
   * 此方法通常在派生模块中被重写，用于准备作为节点输出/结果的节点。
   * 如果准备了输出节点，则必须在派生模块的setup函数的 `return` 语句中返回它。
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {?Node} 输出节点，如果没有则返回null
   */
  setup(builder) {
    const nodeProperties = builder.getNodeProperties(this); // 获取节点属性

    let index = 0; // 子节点索引计数器

    // 遍历所有子节点并将其添加到节点属性中
    for (const childNode of this.getChildren()) {
      nodeProperties["node" + index++] = childNode; // 以"node0", "node1"等形式存储子节点
    }

    // 返回输出节点（如果存在）或null

    return nodeProperties.outputNode || null; // 返回输出节点或null
  }

  /**
   * 表示分析阶段，这是构建过程的第二步，参见 {@link Node#build} 方法。
   * 此阶段分析节点层次结构并确保后代节点被构建。
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {?Node} output - 目标输出节点
   */
  analyze(builder, output = null) {
    const usageCount = builder.increaseUsage(this); // 增加节点使用计数

    // 如果节点需要跟踪父节点
    if (this.parents === true) {
      const nodeData = builder.getDataFromNode(this, "any"); // 获取节点数据
      nodeData.stages = nodeData.stages || {}; // 初始化stages对象
      nodeData.stages[builder.shaderStage] = nodeData.stages[builder.shaderStage] || []; // 初始化当前着色器阶段数组
      nodeData.stages[builder.shaderStage].push(output); // 添加输出节点到当前阶段
    }

    // 如果这是第一次使用此节点
    if (usageCount === 1) {
      // 处理节点流子节点

      const nodeProperties = builder.getNodeProperties(this); // 获取节点属性

      // 遍历所有属性值，构建子节点
      for (const childNode of Object.values(nodeProperties)) {
        if (childNode && childNode.isNode === true) {
          childNode.build(builder, this); // 构建子节点
        }
      }
    }
  }

  /**
   * 表示生成阶段，这是构建过程的第三步，参见 {@link Node#build} 方法。
   * 此阶段构建输出节点并返回生成的着色器字符串。
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {?string} output - 可用于定义输出类型
   * @return {?string} 生成的着色器字符串
   */
  generate(builder, output) {
    const { outputNode } = builder.getNodeProperties(this); // 获取输出节点

    // 如果存在输出节点且是Node实例，则构建它
    if (outputNode && outputNode.isNode === true) {
      return outputNode.build(builder, output); // 构建输出节点并返回结果
    }
  }

  /**
   * 可以实现此方法来在节点用于渲染对象之前更新节点的内部状态。
   * {@link Node#updateBeforeType} 属性定义了更新执行的频率。
   *
   * @abstract
   * @param {NodeFrame} frame - 当前节点帧的引用
   * @return {?boolean} 可选的布尔值，指示实现是否实际执行了更新（例如由于缓存）
   */
  updateBefore(/*frame*/) {
    console.warn("Abstract function."); // 抽象函数警告
  }

  /**
   * 可以实现此方法来在节点用于渲染对象之后更新节点的内部状态。
   * {@link Node#updateAfterType} 属性定义了更新执行的频率。
   *
   * @abstract
   * @param {NodeFrame} frame - 当前节点帧的引用
   * @return {?boolean} 可选的布尔值，指示实现是否实际执行了更新（例如由于缓存）
   */
  updateAfter(/*frame*/) {
    console.warn("Abstract function."); // 抽象函数警告
  }

  /**
   * 可以实现此方法来在节点用于渲染对象时更新节点的内部状态。
   * {@link Node#updateType} 属性定义了更新执行的频率。
   *
   * @abstract
   * @param {NodeFrame} frame - 当前节点帧的引用
   * @return {?boolean} 可选的布尔值，指示实现是否实际执行了更新（例如由于缓存）
   */
  update(/*frame*/) {
    console.warn("Abstract function."); // 抽象函数警告
  }

  /**
   * 执行节点的构建。行为和返回值取决于当前的构建阶段：
   * - **setup**: 为构建过程准备节点及其子节点。此过程也可以创建新节点。返回节点本身或变体。
   * - **analyze**: 分析节点层次结构以在代码生成阶段进行优化。返回 `null`。
   * - **generate**: 为节点生成着色器代码。返回生成的着色器字符串。
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {string|Node|null} [output=null] - 可用于定义输出类型
   * @return {Node|string|null} 构建过程的结果，取决于构建阶段
   */
  build(builder, output = null) {
    // 获取共享节点引用，避免重复构建相同节点
    const refNode = this.getShared(builder);

    // 如果当前节点不是共享节点，则构建共享节点
    if (this !== refNode) {
      return refNode.build(builder, output);
    }

    // 节点构建阶段管理

    // 获取节点数据并初始化构建阶段跟踪
    const nodeData = builder.getDataFromNode(this);
    nodeData.buildStages = nodeData.buildStages || {}; // 初始化构建阶段对象
    nodeData.buildStages[builder.buildStage] = true; // 标记当前阶段已执行

    // 检查是否需要先执行父构建阶段
    const parentBuildStage = _parentBuildStage[builder.buildStage];

    if (parentBuildStage && nodeData.buildStages[parentBuildStage] !== true) {
      // 强制执行父构建阶段（setup或analyze）

      const previousBuildStage = builder.getBuildStage(); // 保存当前构建阶段

      builder.setBuildStage(parentBuildStage); // 设置为父构建阶段

      this.build(builder); // 递归构建父阶段

      builder.setBuildStage(previousBuildStage); // 恢复原构建阶段
    }

    // 构建过程管理

    builder.addNode(this); // 将节点添加到构建器
    builder.addChain(this); // 将节点添加到构建链

    /* 构建阶段预期结果：
			- "setup"		-> Node（节点）
			- "analyze"		-> null（空值）
			- "generate"	-> String（字符串）
		*/
    let result = null; // 初始化结果变量

    const buildStage = builder.getBuildStage(); // 获取当前构建阶段

    // 设置阶段：准备节点和子节点
    if (buildStage === "setup") {
      this.updateReference(builder); // 更新节点引用

      const properties = builder.getNodeProperties(this); // 获取节点属性

      // 如果节点尚未初始化
      if (properties.initialized !== true) {
        //const stackNodesBeforeSetup = builder.stack.nodes.length;

        properties.initialized = true; // 标记为已初始化
        // 执行setup方法并设置输出节点
        properties.outputNode = this.setup(builder) || properties.outputNode || null;

        /*if ( isNodeOutput && builder.stack.nodes.length !== stackNodesBeforeSetup ) {

					// !! no outputNode !!
					//outputNode = builder.stack;

				}*/

        // 遍历所有属性值，构建子节点
        for (const childNode of Object.values(properties)) {
          if (childNode && childNode.isNode === true) {
            // 如果子节点需要跟踪父节点
            if (childNode.parents === true) {
              const childProperties = builder.getNodeProperties(childNode);
              childProperties.parents = childProperties.parents || []; // 初始化父节点数组
              childProperties.parents.push(this); // 添加当前节点为父节点
            }

            childNode.build(builder); // 构建子节点
          }
        }
      }

      result = properties.outputNode; // 设置结果为输出节点
      // 分析阶段：分析节点层次结构
    } else if (buildStage === "analyze") {
      this.analyze(builder, output); // 执行分析方法
      // 生成阶段：生成着色器代码
    } else if (buildStage === "generate") {
      // 检查generate方法是否只接受一个参数（builder）
      const isGenerateOnce = this.generate.length === 1;

      // 如果是单次生成模式（缓存优化）
      if (isGenerateOnce) {
        const type = this.getNodeType(builder); // 获取节点类型
        const nodeData = builder.getDataFromNode(this); // 获取节点数据

        result = nodeData.snippet; // 尝试获取缓存的代码片段

        // 如果没有缓存的代码片段
        if (result === undefined) {
          // 检查是否已经在生成过程中（防止递归）
          if (nodeData.generated === undefined) {
            nodeData.generated = true; // 标记为正在生成

            result = this.generate(builder) || ""; // 生成代码

            nodeData.snippet = result; // 缓存生成的代码片段
          } else {
            // 检测到递归调用
            console.warn("THREE.Node: Recursion detected.", this);

            result = "/* Recursion detected. */"; // 返回递归警告注释
          }
          // 如果存在流程代码且有节点块上下文
        } else if (nodeData.flowCodes !== undefined && builder.context.nodeBlock !== undefined) {
          builder.addFlowCodeHierarchy(this, builder.context.nodeBlock); // 添加流程代码层次
        }

        result = builder.format(result, type, output); // 格式化结果
      } else {
        // 直接生成模式（不缓存）
        result = this.generate(builder, output) || "";
      }

      // 验证生成的代码是否有效
      if (result === "" && output !== null && output !== "void" && output !== "OutputType") {
        // 如果没有生成代码片段，返回默认值

        console.error(`THREE.TSL: Invalid generated code, expected a "${output}".`);

        result = builder.generateConst(output); // 生成默认常量
      }
    }

    builder.removeChain(this); // 从构建链中移除节点
    builder.addSequentialNode(this); // 添加到顺序节点列表

    return result; // 返回构建结果
  }

  /**
   * 返回子节点作为JSON对象。
   * 获取当前节点的所有子节点，用于序列化过程。
   *
   * @return {Array<Object>} 序列化子对象的可迭代列表（JSON格式）
   */
  getSerializeChildren() {
    return getNodeChildren(this); // 使用工具函数获取子节点
  }

  /**
   * 将节点序列化为JSON。
   * 将节点及其子节点的关系序列化到JSON对象中。
   *
   * @param {Object} json - 输出的JSON对象
   */
  serialize(json) {
    const nodeChildren = this.getSerializeChildren(); // 获取子节点

    const inputNodes = {}; // 输入节点映射对象

    // 遍历所有子节点并序列化它们的引用
    for (const { property, index, childNode } of nodeChildren) {
      // 如果子节点有索引（数组或对象成员）
      if (index !== undefined) {
        // 初始化属性容器（数组或对象）
        if (inputNodes[property] === undefined) {
          inputNodes[property] = Number.isInteger(index) ? [] : {}; // 根据索引类型创建数组或对象
        }

        // 存储子节点的UUID引用
        inputNodes[property][index] = childNode.toJSON(json.meta).uuid;
      } else {
        // 直接属性引用
        inputNodes[property] = childNode.toJSON(json.meta).uuid;
      }
    }

    // 如果有输入节点，则添加到JSON中
    if (Object.keys(inputNodes).length > 0) {
      json.inputNodes = inputNodes;
    }
  }

  /**
   * 从给定的JSON反序列化节点。
   * 根据JSON数据重建节点的子节点引用关系。
   *
   * @param {Object} json - JSON对象
   */
  deserialize(json) {
    // 如果JSON中包含输入节点信息
    if (json.inputNodes !== undefined) {
      const nodes = json.meta.nodes; // 获取节点映射表

      // 遍历所有输入节点属性
      for (const property in json.inputNodes) {
        // 如果属性值是数组
        if (Array.isArray(json.inputNodes[property])) {
          const inputArray = []; // 创建输入数组

          // 遍历数组中的每个UUID并恢复节点引用
          for (const uuid of json.inputNodes[property]) {
            inputArray.push(nodes[uuid]); // 根据UUID获取节点并添加到数组
          }

          this[property] = inputArray; // 设置属性为恢复的数组
          // 如果属性值是对象
        } else if (typeof json.inputNodes[property] === "object") {
          const inputObject = {}; // 创建输入对象

          // 遍历对象的每个子属性
          for (const subProperty in json.inputNodes[property]) {
            const uuid = json.inputNodes[property][subProperty]; // 获取子属性的UUID

            inputObject[subProperty] = nodes[uuid]; // 根据UUID恢复节点引用
          }

          this[property] = inputObject; // 设置属性为恢复的对象
        } else {
          // 直接属性引用
          const uuid = json.inputNodes[property]; // 获取属性的UUID

          this[property] = nodes[uuid]; // 根据UUID恢复节点引用
        }
      }
    }
  }

  /**
   * 将节点序列化为three.js JSON对象/场景格式。
   * 创建符合three.js标准的JSON表示，包含节点的所有必要信息。
   *
   * @param {?Object} meta - 可选的JSON对象，已包含来自其他场景对象的序列化数据
   * @return {Object} 序列化的节点
   */
  toJSON(meta) {
    const { uuid, type } = this; // 获取节点的UUID和类型
    const isRoot = meta === undefined || typeof meta === "string"; // 判断是否为根节点

    // 如果是根节点，初始化meta对象
    if (isRoot) {
      meta = {
        textures: {}, // 纹理缓存
        images: {}, // 图像缓存
        nodes: {}, // 节点缓存
      };
    }

    // 序列化过程

    let data = meta.nodes[uuid]; // 尝试从缓存中获取节点数据

    // 如果节点数据不存在，创建新的数据对象
    if (data === undefined) {
      data = {
        uuid, // 节点UUID
        type, // 节点类型
        meta, // 元数据引用
        metadata: {
          version: 4.7, // Three.js版本
          type: "Node", // 对象类型
          generator: "Node.toJSON", // 生成器标识
        },
      };

      // 如果不是根节点，将数据添加到缓存中
      if (isRoot !== true) meta.nodes[data.uuid] = data;

      this.serialize(data); // 序列化节点内容

      delete data.meta; // 删除临时的meta引用
    }

    // TODO: 从Object3D.toJSON复制的代码

    // 从缓存中提取数据的辅助函数
    function extractFromCache(cache) {
      const values = []; // 结果数组

      // 遍历缓存中的所有项目
      for (const key in cache) {
        const data = cache[key];
        delete data.metadata; // 删除元数据
        values.push(data); // 添加到结果数组
      }

      return values; // 返回提取的值
    }

    // 如果是根节点，提取所有缓存的资源
    if (isRoot) {
      const textures = extractFromCache(meta.textures); // 提取纹理
      const images = extractFromCache(meta.images); // 提取图像
      const nodes = extractFromCache(meta.nodes); // 提取节点

      // 只有在存在资源时才添加到数据中
      if (textures.length > 0) data.textures = textures;
      if (images.length > 0) data.images = images;
      if (nodes.length > 0) data.nodes = nodes;
    }

    return data; // 返回序列化的数据
  }
}

// 导出Node类作为默认导出
export default Node;
