// 导入基础几何体类
import { BufferGeometry } from "./BufferGeometry.js";

/**
 * 实例化缓冲区几何体类
 * 这是几何体的实例化版本，用于高效渲染大量相同几何体的实例
 * An instanced version of a geometry.
 */
class InstancedBufferGeometry extends BufferGeometry {
  /**
   * 构造一个新的实例化缓冲区几何体
   * Constructs a new instanced buffer geometry.
   */
  constructor() {
    // 调用父类构造函数
    super();

    /**
     * 类型标识符，用于类型检测
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isInstancedBufferGeometry = true;

    // 设置几何体类型名称
    this.type = "InstancedBufferGeometry";

    /**
     * 实例数量
     * 定义要渲染的实例数量，默认为无限大
     * The instance count.
     *
     * @type {number}
     * @default Infinity
     */
    this.instanceCount = Infinity;
  }

  /**
   * 复制另一个实例化缓冲区几何体的属性到当前对象
   * @param {InstancedBufferGeometry} source - 要复制的源几何体对象
   * @return {InstancedBufferGeometry} 返回当前对象的引用，支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 复制实例数量属性
    this.instanceCount = source.instanceCount;

    // 返回当前对象引用，支持链式调用
    return this;
  }

  /**
   * 将几何体序列化为JSON格式
   * 用于保存或传输几何体数据
   * @return {Object} 包含几何体数据的JSON对象
   */
  toJSON() {
    // 调用父类的toJSON方法获取基础数据
    const data = super.toJSON();

    // 添加实例数量到JSON数据中
    data.instanceCount = this.instanceCount;

    // 添加类型标识符到JSON数据中
    data.isInstancedBufferGeometry = true;

    // 返回完整的JSON数据对象
    return data;
  }
}

// 导出实例化缓冲区几何体类
export { InstancedBufferGeometry };
