/**
 * 事件分发器模块
 * 此模块允许在自定义JavaScript对象上分发事件对象
 * This modules allows to dispatch event objects on custom JavaScript objects.
 *
 * 主要仓库: [eventdispatcher.js]{@link https://github.com/mrdoob/eventdispatcher.js/}
 * Main repository: [eventdispatcher.js]{@link https://github.com/mrdoob/eventdispatcher.js/}
 *
 * 代码示例:
 * Code Example:
 * ```js
 * class Car extends EventDispatcher {
 * 	start() {
 *		this.dispatchEvent( { type: 'start', message: 'vroom vroom!' } );
 *	}
 *};
 *
 * // 在自定义对象上使用事件
 * // Using events with the custom object
 * const car = new Car();
 * car.addEventListener( 'start', function ( event ) {
 * 	alert( event.message );
 * } );
 *
 * car.start();
 * ```
 */
class EventDispatcher {
  /**
   * 为指定的事件类型添加事件监听器
   * Adds the given event listener to the given event type.
   *
   * @param {string} type - 要监听的事件类型
   * @param {Function} listener - 事件触发时调用的函数
   */
  addEventListener(type, listener) {
    // 如果监听器对象未定义，则初始化为空对象
    if (this._listeners === undefined) this._listeners = {};

    // 获取监听器对象的引用
    const listeners = this._listeners;

    // 如果指定类型的监听器数组未定义，则初始化为空数组
    if (listeners[type] === undefined) {
      listeners[type] = [];
    }

    // 如果监听器不在数组中，则添加到数组
    if (listeners[type].indexOf(listener) === -1) {
      listeners[type].push(listener);
    }
  }

  /**
   * 检查指定的事件监听器是否已添加到指定的事件类型
   * Returns `true` if the given event listener has been added to the given event type.
   *
   * @param {string} type - 事件类型
   * @param {Function} listener - 要检查的监听器
   * @return {boolean} 指定的事件监听器是否已添加到指定的事件类型
   */
  hasEventListener(type, listener) {
    // 获取监听器对象的引用
    const listeners = this._listeners;

    // 如果监听器对象未定义，返回false
    if (listeners === undefined) return false;

    // 检查指定类型的监听器数组是否存在且包含指定的监听器
    return listeners[type] !== undefined && listeners[type].indexOf(listener) !== -1;
  }

  /**
   * 从指定的事件类型中移除指定的事件监听器
   * Removes the given event listener from the given event type.
   *
   * @param {string} type - 事件类型
   * @param {Function} listener - 要移除的监听器
   */
  removeEventListener(type, listener) {
    // 获取监听器对象的引用
    const listeners = this._listeners;

    // 如果监听器对象未定义，直接返回
    if (listeners === undefined) return;

    // 获取指定类型的监听器数组
    const listenerArray = listeners[type];

    // 如果监听器数组存在
    if (listenerArray !== undefined) {
      // 查找监听器在数组中的索引
      const index = listenerArray.indexOf(listener);

      // 如果找到了监听器，则从数组中移除
      if (index !== -1) {
        listenerArray.splice(index, 1);
      }
    }
  }

  /**
   * 分发事件对象
   * Dispatches an event object.
   *
   * @param {Object} event - 要触发的事件对象
   */
  dispatchEvent(event) {
    // 获取监听器对象的引用
    const listeners = this._listeners;

    // 如果监听器对象未定义，直接返回
    if (listeners === undefined) return;

    // 获取指定事件类型的监听器数组
    const listenerArray = listeners[event.type];

    // 如果监听器数组存在
    if (listenerArray !== undefined) {
      // 设置事件的目标对象为当前对象
      event.target = this;

      // 创建数组副本，以防在迭代过程中监听器被移除
      // Make a copy, in case listeners are removed while iterating.
      const array = listenerArray.slice(0);

      // 遍历监听器数组，调用每个监听器函数
      for (let i = 0, l = array.length; i < l; i++) {
        array[i].call(this, event);
      }

      // 清除事件的目标对象
      event.target = null;
    }
  }
}

// 导出事件分发器类
export { EventDispatcher };
