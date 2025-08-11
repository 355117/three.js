// 导入基础节点类
import Node from "../core/Node.js";
// 导入节点更新类型常量
import { NodeUpdateType } from "../core/constants.js";
// 导入TSL核心的节点对象包装功能
import { nodeObject } from "../tsl/TSLCore.js";

/**
 * 事件节点类，用于在特定更新阶段执行回调函数。
 *
 * EventNode允许在渲染管线的特定时刻执行自定义代码，
 * 例如在对象更新时或材质渲染时。这对于实现动态效果、
 * 动画或其他需要在渲染过程中执行的逻辑非常有用。
 *
 * @augments Node
 */
class EventNode extends Node {
  /**
   * 获取节点类型标识符。
   *
   * @static
   * @return {string} 返回'EventNode'类型标识符。
   */
  static get type() {
    return "EventNode";
  }

  /**
   * 创建一个事件节点。
   *
   * @param {string} eventType - 事件类型，决定回调函数的执行时机。
   * @param {Function} callback - 在更新时执行的回调函数。
   */
  constructor(eventType, callback) {
    // 事件节点不返回值，类型为void
    super("void");

    /**
     * 事件类型，决定回调函数的执行时机。
     *
     * @type {string}
     */
    this.eventType = eventType;

    /**
     * 在更新时执行的回调函数。
     *
     * 回调函数会接收一个frame参数，包含当前渲染帧的信息。
     *
     * @type {Function}
     */
    this.callback = callback;

    // 根据事件类型设置相应的更新类型
    if (eventType === EventNode.OBJECT) {
      // 对象事件：在每个对象更新时触发
      this.updateType = NodeUpdateType.OBJECT;
    } else if (eventType === EventNode.MATERIAL) {
      // 材质事件：在材质渲染时触发
      this.updateType = NodeUpdateType.RENDER;
    }
  }

  /**
   * 更新方法，在指定的更新阶段被调用。
   *
   * 该方法会执行构造函数中传入的回调函数，
   * 并将当前的渲染帧信息传递给回调函数。
   *
   * @param {Object} frame - 渲染帧对象，包含渲染器、材质等信息。
   */
  update(frame) {
    // 执行回调函数，传入渲染帧信息
    this.callback(frame);
  }
}

// 事件类型常量：对象事件
EventNode.OBJECT = "object";
// 事件类型常量：材质事件
EventNode.MATERIAL = "material";

// 导出EventNode类作为默认导出
export default EventNode;

/**
 * 辅助函数，用于创建EventNode并将其添加到堆栈中。
 *
 * 该函数简化了EventNode的创建过程，自动处理节点对象的包装
 * 和堆栈添加操作。
 *
 * @param {string} type - 事件类型。
 * @param {Function} callback - 回调函数。
 * @returns {EventNode} 创建的事件节点。
 */
const createEvent = (type, callback) => nodeObject(new EventNode(type, callback)).toStack();

/**
 * 创建一个对象更新事件，每次渲染对象（Mesh|Sprite）时触发函数。
 *
 * 该事件会绑定到声明的TSL函数`Fn()`；它必须在`Fn()`内声明，
 * 或者JS函数调用必须从一个`Fn()`继承。
 *
 * 对象更新事件在每个使用该材质的对象被渲染时都会触发，
 * 适用于需要针对每个对象执行不同逻辑的场景。
 *
 * @param {Function} callback - 回调函数，接收渲染帧信息作为参数。
 * @returns {EventNode} 对象更新事件节点。
 */
export const OnObjectUpdate = (callback) => createEvent(EventNode.OBJECT, callback);

/**
 * 创建一个材质更新事件，当使用该材质的第一个对象被渲染时触发函数。
 *
 * 该事件会绑定到声明的TSL函数`Fn()`；它必须在`Fn()`内声明，
 * 或者JS函数调用必须从一个`Fn()`继承。
 *
 * 材质更新事件在每次渲染循环中只触发一次（当第一个使用该材质的对象被渲染时），
 * 适用于需要在材质级别执行一次性初始化或更新的场景。
 *
 * @param {Function} callback - 回调函数，接收渲染帧信息作为参数。
 * @returns {EventNode} 材质更新事件节点。
 */
export const OnMaterialUpdate = (callback) => createEvent(EventNode.MATERIAL, callback);
