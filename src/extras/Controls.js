// 导入事件分发器基类
import { EventDispatcher } from "../core/EventDispatcher.js";

/**
 * 控制器的抽象基类
 * 控制器抽象基类，用于管理3D对象的交互控制
 *
 * @abstract
 * @augments EventDispatcher
 */
class Controls extends EventDispatcher {
  /**
   * 构造一个新的控制器实例
   * 创建控制器实例，用于管理指定的3D对象
   *
   * @param {Object3D} object - 被控制器管理的3D对象
   * @param {?HTMLDOMElement} domElement - 用于事件监听的HTML元素
   */
  constructor(object, domElement = null) {
    super(); // 调用父类EventDispatcher的构造函数

    /**
     * 被控制器管理的3D对象
     * 控制器操作的目标对象，通常是相机或其他3D对象
     *
     * @type {Object3D}
     */
    this.object = object;

    /**
     * 用于事件监听的HTML元素
     * 接收用户输入事件的DOM元素，如鼠标、键盘、触摸事件
     *
     * @type {?HTMLDOMElement}
     * @default null
     */
    this.domElement = domElement;

    /**
     * 控制器是否响应用户输入
     * 控制控制器是否处理用户交互事件的开关
     *
     * @type {boolean}
     * @default true
     */
    this.enabled = true;

    /**
     * 控制器的内部状态
     * 用于跟踪控制器当前的操作状态，如拖拽、旋转等
     *
     * @type {number}
     * @default -1
     */
    this.state = -1;

    /**
     * 定义控制器键盘输入的对象
     * 存储键盘按键与控制动作的映射关系
     *
     * @type {Object}
     */
    this.keys = {};

    /**
     * 定义鼠标按钮对应动作类型的对象
     * 根据具体的控制器实现，支持不同的鼠标按钮和动作类型
     * 定义左键、中键、右键分别对应的操作类型
     *
     * @type {{LEFT: ?number, MIDDLE: ?number, RIGHT: ?number}}
     */
    this.mouseButtons = { LEFT: null, MIDDLE: null, RIGHT: null };

    /**
     * 定义触摸交互对应动作类型的对象
     * 根据具体的控制器实现，支持不同的触摸交互和动作类型
     * 定义单指和双指触摸分别对应的操作类型
     *
     * @type {{ONE: ?number, TWO: ?number}}
     */
    this.touches = { ONE: null, TWO: null };
  }

  /**
   * 将控制器连接到DOM
   * 连接控制器到指定的DOM元素，这个方法有"副作用"，因为它会向DOM添加事件监听器
   *
   * @param {HTMLDOMElement} element - 要连接的DOM元素
   */
  connect(element) {
    // 检查是否提供了DOM元素参数
    if (element === undefined) {
      // 输出警告信息，提示connect()方法现在需要一个元素参数
      console.warn("THREE.Controls: connect() now requires an element."); // @deprecated, the warning can be removed with r185
      return; // 如果没有提供元素，直接返回
    }

    // 如果当前已经连接了DOM元素，先断开连接
    if (this.domElement !== null) this.disconnect();

    // 设置新的DOM元素
    this.domElement = element;
  }

  /**
   * 断开控制器与DOM的连接
   * 移除所有事件监听器，断开与DOM元素的连接
   */
  disconnect() {
    // 子类应该重写此方法来移除具体的事件监听器
  }

  /**
   * 销毁控制器
   * 如果不再使用控制器，调用此方法释放所有内部资源并移除所有事件监听器
   */
  dispose() {
    // 子类应该重写此方法来清理资源
  }

  /**
   * 更新控制器状态
   * 如果控制器需要在每个仿真步骤中更新其内部状态，应该实现此方法
   *
   * @param {number} [delta] - 时间增量（秒）
   */
  update(/* delta */) {
    // 子类应该重写此方法来实现具体的更新逻辑
  }
}

// 导出Controls类
export { Controls };
