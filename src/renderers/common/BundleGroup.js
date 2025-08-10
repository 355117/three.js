/**
 * BundleGroup.js
 *
 * 渲染束组 - WebGPU渲染束API的专用组
 *
 * 这是一个专门的组，使应用程序能够访问WebGPU的渲染束API。
 * 该组及其所有后代节点被视为一个渲染束，并由渲染器作为
 * 一个整体进行处理，从而提供显著的性能优势。
 */

// 导入基础组类
import { Group } from "../../objects/Group.js";

/**
 * 渲染束组类
 *
 * 一个专门的组，使应用程序能够访问WebGPU的渲染束API。
 * 该组及其所有后代节点被视为一个渲染束，并由渲染器作为
 * 一个整体进行处理。
 *
 * 渲染束是WebGPU的一个重要特性，它允许将多个绘制调用
 * 预先记录到一个束中，然后在渲染时一次性执行，从而
 * 显著提高渲染性能。
 *
 * 注意：此模块仅在使用WebGPU后端的`WebGPURenderer`中
 * 完全支持。使用WebGL后端时，该组在技术上可以渲染，
 * 但不会有任何性能改进。
 *
 * @augments Group
 */
class BundleGroup extends Group {
  /**
   * 构造新的渲染束组
   *
   * 创建一个新的渲染束组实例，设置默认属性和标志。
   * 渲染束组默认是静态的，以获得最佳性能。
   */
  constructor() {
    // 调用父类构造函数
    super();

    /**
     * 渲染束组类型标识
     *
     * 这个标志可用于类型测试，帮助识别这是一个渲染束组。
     * 在运行时可以通过检查这个属性来确定对象类型。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isBundleGroup = true;

    /**
     * 对象类型名称
     *
     * 这个属性仅在序列化/反序列化期间用于检测类型。
     * 它应该始终与类名匹配，用于对象的正确重建。
     *
     * @type {string}
     * @readonly
     * @default 'BundleGroup'
     */
    this.type = "BundleGroup";

    /**
     * 渲染束是否为静态
     *
     * 当设置为`true`时，假定结构是静态的且不会改变。
     * 例如，不会向组中添加新对象。静态渲染束可以获得
     * 更好的性能优化。
     *
     * 如果需要更改，仍然可以通过将`needsUpdate`标志
     * 设置为`true`来强制更新。
     *
     * @type {boolean}
     * @default true
     */
    this.static = true;

    /**
     * 渲染束组的版本号
     *
     * 用于跟踪渲染束组的变化。每当渲染束需要更新时，
     * 版本号会递增，帮助渲染器识别变化。
     *
     * @type {number}
     * @readonly
     * @default 0
     */
    this.version = 0;
  }

  /**
   * 设置渲染束组更新标志
   *
   * 当渲染束组发生变化时，将此属性设置为`true`。
   * 这会增加版本号，通知渲染器重新构建渲染束。
   *
   * @type {boolean}
   * @default false
   * @param {boolean} value - 是否需要更新
   */
  set needsUpdate(value) {
    // 如果设置为true，增加版本号
    if (value === true) this.version++;
  }
}

// 导出渲染束组类
export default BundleGroup;
