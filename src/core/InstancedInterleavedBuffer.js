// 导入交错缓冲区基类
import { InterleavedBuffer } from "./InterleavedBuffer.js";

/**
 * 实例化交错缓冲区类
 *
 * 这是交错缓冲区的实例化版本，用于实例化渲染（Instance Rendering）。
 * 实例化渲染是一种优化技术，允许使用单个绘制调用渲染同一几何体的多个副本，
 * 每个实例可以有不同的变换、颜色或其他属性。
 *
 * 交错缓冲区将多个属性（如位置、法线、UV、颜色等）打包到单个数组缓冲区中，
 * 而实例化交错缓冲区进一步支持为每个实例定义重复使用的属性数据。
 *
 * @augments InterleavedBuffer
 */
class InstancedInterleavedBuffer extends InterleavedBuffer {
  /**
   * 构造一个新的实例化交错缓冲区
   *
   * @param {TypedArray} array - 存储属性数据的类型化数组，具有共享缓冲区
   * @param {number} stride - 每个顶点的类型化数组元素数量（步长）
   * @param {number} [meshPerAttribute=1] - 定义此交错缓冲区的值应该重复多少次（每个属性的网格数量）
   */
  constructor(array, stride, meshPerAttribute = 1) {
    // 调用父类构造函数，初始化基本的交错缓冲区
    super(array, stride);

    /**
     * 类型测试标志
     *
     * 此标志可用于类型测试，用于识别对象是否为实例化交错缓冲区。
     * 在 Three.js 中，许多类都有类似的标志用于运行时类型检查。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isInstancedInterleavedBuffer = true;

    /**
     * 每个属性的网格重复次数
     *
     * 定义此缓冲区属性的值应该重复多少次。这个值决定了实例化的行为：
     * - 值为 1 表示每个实例使用不同的属性值
     * - 值为 N 表示每 N 个实例共享相同的属性值
     *
     * 例如：如果有 100 个实例，meshPerAttribute = 10，
     * 那么前 10 个实例使用第一组属性值，接下来 10 个实例使用第二组属性值，以此类推。
     *
     * 参见 {@link InstancedBufferAttribute#meshPerAttribute}
     *
     * @type {number}
     * @default 1
     */
    this.meshPerAttribute = meshPerAttribute;
  }

  /**
   * 复制另一个实例化交错缓冲区的数据到当前实例
   *
   * @param {InstancedInterleavedBuffer} source - 要复制的源实例化交错缓冲区
   * @return {InstancedInterleavedBuffer} 返回当前实例的引用，支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法，复制基本属性
    super.copy(source);

    // 复制实例化特有的属性
    this.meshPerAttribute = source.meshPerAttribute;

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 克隆当前实例化交错缓冲区
   *
   * @param {Object} data - 包含共享数组缓冲区的对象，允许保留共享结构
   * @return {InstancedInterleavedBuffer} 返回当前实例的克隆副本
   */
  clone(data) {
    // 调用父类的克隆方法，创建基本的克隆副本
    const ib = super.clone(data);

    // 复制实例化特有的属性到克隆副本
    ib.meshPerAttribute = this.meshPerAttribute;

    // 返回克隆的实例
    return ib;
  }

  /**
   * 将实例化交错缓冲区序列化为 JSON 格式
   *
   * @param {Object} data - 可选的元信息对象，用于序列化过程
   * @return {Object} 表示序列化后的实例化交错缓冲区的 JSON 对象
   */
  toJSON(data) {
    // 调用父类的序列化方法，获取基本的 JSON 对象
    const json = super.toJSON(data);

    // 添加实例化交错缓冲区特有的属性到 JSON 对象
    json.isInstancedInterleavedBuffer = true; // 标识这是一个实例化交错缓冲区
    json.meshPerAttribute = this.meshPerAttribute; // 每个属性的网格重复次数

    // 返回完整的 JSON 对象
    return json;
  }
}

// 导出实例化交错缓冲区类
export { InstancedInterleavedBuffer };
