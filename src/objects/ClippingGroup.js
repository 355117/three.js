// 从当前目录导入Group基类
import { Group } from "./Group.js";

/**
 * 裁剪组（ClippingGroup）类
 *
 * 在早期的three.js版本中，裁剪是在渲染器或材质级别全局定义的。
 * 这个特殊版本的Group允许将裁剪状态编码到场景图中。
 * 这意味着如果你创建这个组的实例，所有后代3D对象都会受到相应裁剪平面的影响。
 *
 * 注意：ClippingGroup只能与WebGPURenderer一起使用。
 *
 * @augments Group
 */
class ClippingGroup extends Group {
  /**
   * 构造一个新的裁剪组
   *
   * 裁剪组继承自Group，但添加了裁剪功能，
   * 可以对组内的所有对象应用裁剪平面
   */
  constructor() {
    // 调用父类Group的构造函数
    super();

    /**
     * 用于类型检测的标志位
     *
     * 这个标志可以用来快速判断一个对象是否为ClippingGroup类型，
     * 在渲染器中用于识别需要特殊裁剪处理的组
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isClippingGroup = true;

    /**
     * 裁剪平面数组
     *
     * 包含用于裁剪的平面对象，每个平面定义了一个裁剪边界。
     * 对象的哪些部分会被渲染取决于这些平面的配置。
     *
     * @type {Array<Plane>}
     */
    this.clippingPlanes = [];

    /**
     * 是否启用裁剪功能
     *
     * 控制裁剪功能的开关，当设置为false时，
     * 即使定义了裁剪平面也不会进行裁剪
     *
     * @type {boolean}
     * @default true
     */
    this.enabled = true;

    /**
     * 是否使用裁剪平面的交集进行裁剪，而不是并集
     *
     * 当为true时，只有同时在所有裁剪平面内部的部分才会被渲染（交集）
     * 当为false时，在任何一个裁剪平面内部的部分都会被渲染（并集）
     *
     * @type {boolean}
     * @default false
     */
    this.clipIntersection = false;

    /**
     * 是否对阴影进行裁剪
     *
     * 控制阴影是否也受到裁剪平面的影响。
     * 当为true时，阴影也会被裁剪平面裁剪
     *
     * @type {boolean}
     * @default false
     */
    this.clipShadows = false;
  }
}

// 导出ClippingGroup类供其他模块使用
export { ClippingGroup };
