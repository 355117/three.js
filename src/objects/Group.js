// 从核心模块导入Object3D基类
import { Object3D } from "../core/Object3D.js";

/**
 * 组（Group）类，几乎与Object3D相同。它的目的是让对象组的操作在语法上更加清晰。
 *
 * Group主要用于将多个3D对象组织在一起，作为一个整体进行变换操作。
 * 当你需要同时移动、旋转或缩放多个对象时，Group非常有用。
 *
 * 使用示例：
 * ```js
 * // 创建一个组并添加两个立方体
 * // 这些立方体现在可以作为一个整体进行旋转/缩放等操作
 * const group = new THREE.Group();
 *
 * group.add( meshA ); // 添加第一个网格到组中
 * group.add( meshB ); // 添加第二个网格到组中
 *
 * scene.add( group ); // 将整个组添加到场景中
 * ```
 *
 * @augments Object3D
 */
class Group extends Object3D {
  /**
   * 构造一个新的组对象
   *
   * 组继承自Object3D，具有完整的3D变换功能，
   * 但主要用作容器来组织其他3D对象
   */
  constructor() {
    // 调用父类Object3D的构造函数
    super();

    /**
     * 用于类型检测的标志位
     *
     * 这个标志可以用来快速判断一个对象是否为Group类型，
     * 在渲染器和其他系统中用于优化处理流程
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isGroup = true;

    // 设置对象类型名称，用于调试和序列化
    this.type = "Group";
  }
}

// 导出Group类供其他模块使用
export { Group };
