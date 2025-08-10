// 从核心模块导入Object3D基类
import { Object3D } from "../core/Object3D.js";

/**
 * 骨骼类，是骨架（Skeleton）的一部分。骨架被蒙皮网格（SkinnedMesh）使用。
 *
 * 骨骼用于创建分层的变换结构，通常用于角色动画和蒙皮变形。
 * 每个骨骼都可以有子骨骼，形成骨骼层次结构。
 *
 * 使用示例：
 * ```js
 * const root = new THREE.Bone(); // 创建根骨骼
 * const child = new THREE.Bone(); // 创建子骨骼
 *
 * root.add( child ); // 将子骨骼添加到根骨骼
 * child.position.y = 5; // 设置子骨骼的位置
 * ```
 *
 * @augments Object3D
 */
class Bone extends Object3D {
  /**
   * 构造一个新的骨骼对象
   *
   * 骨骼继承自Object3D，具有位置、旋转、缩放等基本变换属性
   */
  constructor() {
    // 调用父类Object3D的构造函数
    super();

    /**
     * 用于类型检测的标志位
     *
     * 这个标志可以用来快速判断一个对象是否为Bone类型，
     * 避免使用instanceof操作符的性能开销
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isBone = true;

    // 设置对象类型名称，用于调试和序列化
    this.type = "Bone";
  }
}

// 导出Bone类供其他模块使用
export { Bone };
