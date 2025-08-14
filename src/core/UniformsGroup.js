// 导入事件分发器基类
import { EventDispatcher } from "./EventDispatcher.js";
// 导入静态绘制使用常量
import { StaticDrawUsage } from "../constants.js";

// 全局ID计数器，用于为每个UniformsGroup实例分配唯一ID
let _id = 0;

/**
 * 用于在单个组中管理多个uniform变量的类。渲染器会将此类定义作为单个UBO（统一缓冲对象）处理。
 *
 * UniformsGroup允许将多个uniform变量组织在一起，提高GPU渲染效率。
 * 通过使用UBO，可以减少uniform变量的设置开销，特别是在处理大量uniform时。
 *
 * 由于此类只能在{@link ShaderMaterial}的上下文中使用，因此仅在
 * {@link WebGLRenderer}中受支持。
 *
 * @augments EventDispatcher
 */
class UniformsGroup extends EventDispatcher {
  /**
   * 构造一个新的uniform组
   */
  constructor() {
    super(); // 调用父类EventDispatcher的构造函数

    /**
     * 此标志可用于类型测试，标识这是一个UniformsGroup实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isUniformsGroup = true;

    /**
     * UniformsGroup的唯一标识符
     * 每个实例都会获得一个递增的唯一ID
     *
     * @name UniformsGroup#id
     * @type {number}
     * @readonly
     */
    Object.defineProperty(this, "id", { value: _id++ });

    /**
     * uniform组的名称，用于调试和识别
     *
     * @type {string}
     */
    this.name = "";

    /**
     * 缓冲区使用模式，决定了GPU如何优化这个uniform组的内存使用
     *
     * 可选值包括：
     * - StaticDrawUsage: 数据很少改变，主要用于绘制
     * - DynamicDrawUsage: 数据经常改变，主要用于绘制
     * - StreamDrawUsage: 数据每次使用都会改变，主要用于绘制
     *
     * @type {(StaticDrawUsage|DynamicDrawUsage|StreamDrawUsage|StaticReadUsage|DynamicReadUsage|StreamReadUsage|StaticCopyUsage|DynamicCopyUsage|StreamCopyUsage)}
     * @default StaticDrawUsage
     */
    this.usage = StaticDrawUsage;

    /**
     * 存储uniform变量的数组
     * 包含了这个组中所有的uniform变量实例
     *
     * @type {Array<Uniform>}
     */
    this.uniforms = [];
  }

  /**
   * 将给定的uniform变量添加到此uniform组中
   *
   * @param {Uniform} uniform - 要添加的uniform变量
   * @return {UniformsGroup} 返回此uniform组的引用，支持链式调用
   */
  add(uniform) {
    this.uniforms.push(uniform); // 将uniform添加到数组末尾

    return this; // 返回自身以支持链式调用
  }

  /**
   * 从此uniform组中移除给定的uniform变量
   *
   * @param {Uniform} uniform - 要移除的uniform变量
   * @return {UniformsGroup} 返回此uniform组的引用，支持链式调用
   */
  remove(uniform) {
    const index = this.uniforms.indexOf(uniform); // 查找uniform在数组中的索引

    if (index !== -1) this.uniforms.splice(index, 1); // 如果找到，则从数组中移除

    return this; // 返回自身以支持链式调用
  }

  /**
   * 设置此uniform组的名称
   * 名称主要用于调试和识别目的
   *
   * @param {string} name - 要设置的名称
   * @return {UniformsGroup} 返回此uniform组的引用，支持链式调用
   */
  setName(name) {
    this.name = name; // 设置名称

    return this; // 返回自身以支持链式调用
  }

  /**
   * 设置此uniform组的使用模式
   * 使用模式告诉GPU如何优化这个uniform组的内存管理
   *
   * @param {number} value - 要设置的使用模式常量
   * @return {UniformsGroup} 返回此uniform组的引用，支持链式调用
   */
  setUsage(value) {
    this.usage = value; // 设置使用模式

    return this; // 返回自身以支持链式调用
  }

  /**
   * 释放此实例分配的GPU相关资源。当应用程序中不再使用此实例时，
   * 应调用此方法以避免内存泄漏。
   *
   * 此方法会触发'dispose'事件，通知渲染器清理相关的GPU资源。
   *
   * @fires UniformsGroup#dispose
   */
  dispose() {
    this.dispatchEvent({ type: "dispose" }); // 分发dispose事件
  }

  /**
   * 将给定uniform组的值复制到此实例
   * 这会完全替换当前实例的所有属性和uniform变量
   *
   * @param {UniformsGroup} source - 要复制的源uniform组
   * @return {UniformsGroup} 返回此uniform组的引用，支持链式调用
   */
  copy(source) {
    this.name = source.name; // 复制名称
    this.usage = source.usage; // 复制使用模式

    const uniformsSource = source.uniforms; // 获取源uniform数组

    this.uniforms.length = 0; // 清空当前uniform数组

    // 遍历源uniform数组并复制每个uniform
    for (let i = 0, l = uniformsSource.length; i < l; i++) {
      // 处理可能的数组或单个uniform情况
      const uniforms = Array.isArray(uniformsSource[i]) ? uniformsSource[i] : [uniformsSource[i]];

      // 克隆每个uniform并添加到当前数组
      for (let j = 0; j < uniforms.length; j++) {
        this.uniforms.push(uniforms[j].clone()); // 克隆uniform以避免引用共享
      }
    }

    return this; // 返回自身以支持链式调用
  }

  /**
   * 返回一个包含此实例复制值的新uniform组
   * 这是一个深度克隆，新实例与原实例完全独立
   *
   * @return {UniformsGroup} 此实例的克隆
   */
  clone() {
    return new this.constructor().copy(this); // 创建新实例并复制当前实例的值
  }
}

// 导出UniformsGroup类
export { UniformsGroup };
