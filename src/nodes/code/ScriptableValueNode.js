// 导入节点基类
import Node from "../core/Node.js";
// 导入数组缓冲区和Base64转换工具函数
import { arrayBufferToBase64, base64ToArrayBuffer } from "../core/NodeUtils.js";
// 导入节点代理和浮点数函数
import { nodeProxy, float } from "../tsl/TSLBase.js";

// 导入事件分发器
import { EventDispatcher } from "../../core/EventDispatcher.js";

/**
 * 可脚本化值节点 - `ScriptableNode` 使用此类来管理脚本输入和输出
 *
 * @augments Node
 */
class ScriptableValueNode extends Node {
  // 返回节点类型标识符
  static get type() {
    return "ScriptableValueNode";
  }

  /**
   * 构造一个新的可脚本化节点
   *
   * @param {any} [value=null] - 值
   */
  constructor(value = null) {
    // 调用父类构造函数
    super();

    /**
     * 对值的引用
     *
     * @private
     * @default null
     */
    this._value = value;

    /**
     * 根据 `_value` 的类型，此属性可能缓存解析的数据
     *
     * @private
     * @default null
     */
    this._cache = null;

    /**
     * 如果此节点表示输入，此属性表示输入类型
     *
     * @type {?string}
     * @default null
     */
    this.inputType = null;

    /**
     * 如果此节点表示输出，此属性表示输出类型
     *
     * @type {?string}
     * @default null
     */
    this.outputType = null;

    /**
     * 用于管理事件的事件分发器
     *
     * @type {EventDispatcher}
     */
    this.events = new EventDispatcher();

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isScriptableValueNode = true;
  }

  /**
   * 此节点是否表示输出
   *
   * @type {boolean}
   * @readonly
   * @default true
   */
  get isScriptableOutputNode() {
    return this.outputType !== null;
  }

  /**
   * 设置节点的值
   *
   * @param {any} val - 要设置的值
   */
  set value(val) {
    // 如果值没有改变，直接返回
    if (this._value === val) return;

    // 如果有缓存且输入类型是URL且值是ArrayBuffer，释放对象URL
    if (this._cache && this.inputType === "URL" && this.value.value instanceof ArrayBuffer) {
      URL.revokeObjectURL(this._cache);

      this._cache = null;
    }

    // 设置新值
    this._value = val;

    // 分发change事件
    this.events.dispatchEvent({ type: "change" });

    // 刷新节点
    this.refresh();
  }

  /**
   * 获取节点的值
   *
   * @type {any}
   */
  get value() {
    return this._value;
  }

  /**
   * 分发 `refresh` 事件
   */
  refresh() {
    this.events.dispatchEvent({ type: "refresh" });
  }

  /**
   * `value` 属性通常表示一个节点或甚至是数组缓冲区形式的二进制数据
   * 在这种情况下，此方法尝试返回复杂类型背后的实际值
   *
   * @return {any} 值
   */
  getValue() {
    const value = this.value;

    // 如果值存在且缓存为空且输入类型是URL且值是ArrayBuffer，创建对象URL
    if (value && this._cache === null && this.inputType === "URL" && value.value instanceof ArrayBuffer) {
      this._cache = URL.createObjectURL(new Blob([value.value]));
    } else if (
      value &&
      value.value !== null &&
      value.value !== undefined &&
      // 检查各种支持的输入类型
      (((this.inputType === "URL" || this.inputType === "String") && typeof value.value === "string") ||
        (this.inputType === "Number" && typeof value.value === "number") ||
        (this.inputType === "Vector2" && value.value.isVector2) ||
        (this.inputType === "Vector3" && value.value.isVector3) ||
        (this.inputType === "Vector4" && value.value.isVector4) ||
        (this.inputType === "Color" && value.value.isColor) ||
        (this.inputType === "Matrix3" && value.value.isMatrix3) ||
        (this.inputType === "Matrix4" && value.value.isMatrix4))
    ) {
      // 如果类型匹配，返回实际值
      return value.value;
    }

    // 返回缓存或原始值
    return this._cache || value;
  }

  /**
   * 重写，因为节点类型从值推断
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 节点类型
   */
  getNodeType(builder) {
    // 如果值是节点，返回其节点类型，否则返回float
    return this.value && this.value.isNode ? this.value.getNodeType(builder) : "float";
  }

  /**
   * 设置节点
   *
   * @return {Node} 设置后的节点
   */
  setup() {
    // 如果值是节点，返回该节点，否则返回float节点
    return this.value && this.value.isNode ? this.value : float();
  }

  /**
   * 序列化节点数据
   *
   * @param {Object} data - 序列化数据对象
   */
  serialize(data) {
    // 调用父类序列化方法
    super.serialize(data);

    // 序列化值
    if (this.value !== null) {
      if (this.inputType === "ArrayBuffer") {
        // 如果是ArrayBuffer类型，转换为Base64
        data.value = arrayBufferToBase64(this.value);
      } else {
        // 否则序列化为JSON并获取UUID
        data.value = this.value ? this.value.toJSON(data.meta).uuid : null;
      }
    } else {
      data.value = null;
    }

    // 序列化输入和输出类型
    data.inputType = this.inputType;
    data.outputType = this.outputType;
  }

  /**
   * 反序列化节点数据
   *
   * @param {Object} data - 反序列化数据对象
   */
  deserialize(data) {
    // 调用父类反序列化方法
    super.deserialize(data);

    let value = null;

    // 反序列化值
    if (data.value !== null) {
      if (data.inputType === "ArrayBuffer") {
        // 如果是ArrayBuffer类型，从Base64转换
        value = base64ToArrayBuffer(data.value);
      } else if (data.inputType === "Texture") {
        // 如果是纹理类型，从元数据纹理中获取
        value = data.meta.textures[data.value];
      } else {
        // 否则从元数据节点中获取
        value = data.meta.nodes[data.value] || null;
      }
    }

    // 设置值
    this.value = value;

    // 反序列化输入和输出类型
    this.inputType = data.inputType;
    this.outputType = data.outputType;
  }
}

// 导出ScriptableValueNode类作为默认导出
export default ScriptableValueNode;

/**
 * TSL函数 - 用于创建可脚本化值节点
 *
 * @tsl
 * @function
 * @param {any} [value] - The value.
 * @returns {ScriptableValueNode}
 */
export const scriptableValue = /*@__PURE__*/ nodeProxy(ScriptableValueNode).setParameterLength(1);
