/**
 * IndirectStorageBufferAttribute.js
 *
 * 间接存储缓冲区属性 - 用于间接绘制调用的特殊缓冲区属性
 *
 * 这是一种特殊类型的缓冲区属性，专门用于计算着色器。它可以用来
 * 编码间接绘制调用的绘制参数，实现GPU驱动的渲染优化。
 */

// 导入存储缓冲区属性基类
import StorageBufferAttribute from "./StorageBufferAttribute.js";

/**
 * 间接存储缓冲区属性类
 *
 * 这种特殊类型的缓冲区属性专门用于计算着色器。它可以用来编码
 * 间接绘制调用的绘制参数，实现GPU驱动的渲染。
 *
 * 间接绘制的优势：
 * - GPU可以直接决定绘制参数，无需CPU干预
 * - 支持动态LOD和视锥体剔除
 * - 减少CPU-GPU同步开销
 * - 实现更高效的批量渲染
 *
 * 注意：这种类型的缓冲区属性只能与`WebGPURenderer`和WebGPU后端一起使用。
 *
 * @augments StorageBufferAttribute
 */
class IndirectStorageBufferAttribute extends StorageBufferAttribute {
  /**
   * 构造新的间接存储缓冲区属性
   *
   * 创建用于间接绘制的存储缓冲区属性。间接绘制参数通常包括
   * 顶点数量、实例数量、起始顶点等信息。
   *
   * @param {number|Uint32Array} count - 项目数量。也可以直接传递`Uint32Array`作为参数，此时后续参数将被忽略
   * @param {number} itemSize - 项目大小（每个项目包含的元素数量）
   */
  constructor(count, itemSize) {
    // 调用父类构造函数，强制使用Uint32Array类型
    // 间接绘制参数必须是32位无符号整数
    super(count, itemSize, Uint32Array);

    /**
     * 间接存储缓冲区属性类型标识
     *
     * 这个标志可用于类型测试，帮助识别这是一个间接存储缓冲区属性。
     * 在运行时可以通过检查这个属性来确定缓冲区属性类型。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isIndirectStorageBufferAttribute = true;
  }
}

// 导出间接存储缓冲区属性类
export default IndirectStorageBufferAttribute;
