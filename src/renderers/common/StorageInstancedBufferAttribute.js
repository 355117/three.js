// 导入实例化缓冲区属性基类
import { InstancedBufferAttribute } from "../../core/InstancedBufferAttribute.js";

/**
 * 存储实例化缓冲区属性类
 *
 * 这种特殊类型的实例化缓冲区属性专为计算着色器设计。在早期的three.js版本中，
 * 只能通过JavaScript在CPU上更新属性数据，然后将数据上传到GPU。
 * 随着新的材质系统和渲染器的引入，现在可以使用计算着色器在GPU上
 * 更高效地计算属性数据。
 *
 * 此类结合了存储缓冲区的可写特性和实例化渲染的高效性，
 * 特别适用于需要在GPU上动态计算实例数据的场景。
 *
 * 使用方法是创建此类的实例，并将其作为输入提供给 {@link StorageBufferNode}。
 *
 * 注意：此类型的缓冲区属性只能与 `WebGPURenderer` 一起使用。
 *
 * @augments InstancedBufferAttribute
 */
class StorageInstancedBufferAttribute extends InstancedBufferAttribute {
  /**
   * 构造一个新的存储实例化缓冲区属性
   *
   * @param {number|TypedArray} count - 项目数量。也可以传递类型化数组作为参数，
   * 此时后续参数将被忽略。
   * @param {number} itemSize - 每个项目的大小（组件数量）
   * @param {TypedArray.constructor} [typeClass=Float32Array] - 类型化数组构造函数
   */
  constructor(count, itemSize, typeClass = Float32Array) {
    // 如果count是类型化数组，直接使用；否则创建新的类型化数组
    const array = ArrayBuffer.isView(count) ? count : new typeClass(count * itemSize);

    // 调用父类构造函数
    super(array, itemSize);

    /**
     * 用于类型测试的标志
     * 标识此对象为存储实例化缓冲区属性类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isStorageInstancedBufferAttribute = true;
  }
}

// 导出存储实例化缓冲区属性类
export default StorageInstancedBufferAttribute;
