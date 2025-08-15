// 导入透视相机类
import { PerspectiveCamera } from "./PerspectiveCamera.js";

/**
 * 数组相机类，用于高效渲染具有预定义相机集合的场景。
 * 这对于渲染VR场景来说是一个重要的性能优化方面。
 *
 * ArrayCamera实例总是包含一个子相机数组。必须为每个子相机定义
 * `viewport`属性，该属性决定了使用此相机渲染的视口部分。
 *
 * 使用场景：
 * - VR渲染：为左右眼分别设置不同的相机
 * - 多视口渲染：在同一场景中使用多个视角
 * - 性能优化：避免多次场景遍历
 *
 * @augments PerspectiveCamera
 */
class ArrayCamera extends PerspectiveCamera {
  /**
   * 构造一个新的数组相机
   *
   * @param {Array<PerspectiveCamera>} [array=[]] - 透视子相机数组
   */
  constructor(array = []) {
    // 调用父类PerspectiveCamera的构造函数
    super();

    /**
     * 此标志可用于类型测试，标识这是一个数组相机实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isArrayCamera = true;

    /**
     * 标识此相机是否用于多视图渲染
     * 多视图渲染是一种GPU优化技术，可以在单次渲染调用中渲染多个视图
     *
     * @type {boolean}
     * @readonly
     * @default false
     */
    this.isMultiViewCamera = false;

    /**
     * 透视子相机数组
     * 每个子相机负责渲染场景的特定部分或从特定视角渲染
     *
     * @type {Array<PerspectiveCamera>}
     */
    this.cameras = array;
  }
}

// 导出ArrayCamera类
export { ArrayCamera };
