// 导入生成 UUID 的工具函数
import { generateUUID } from "../math/MathUtils.js";
// 导入静态绘制使用常量
import { StaticDrawUsage } from "../constants.js";

/**
 * 交错缓冲区类
 *
 * "交错"（Interleaved）意味着多个属性（可能是不同类型的），
 * 例如位置（position）、法线（normal）、UV坐标（uv）、颜色（color）等，
 * 被打包到单个数组缓冲区中。
 *
 * 交错数组的优势：
 * 1. 内存局部性更好：相关属性在内存中相邻存储
 * 2. 减少 GPU 内存带宽使用：一次读取可以获取多个属性
 * 3. 减少绘制调用的开销：所有属性在同一个缓冲区中
 *
 * 例如，传统的分离存储：
 * positions: [x1, y1, z1, x2, y2, z2, x3, y3, z3, ...]
 * normals:   [nx1, ny1, nz1, nx2, ny2, nz2, nx3, ny3, nz3, ...]
 * uvs:       [u1, v1, u2, v2, u3, v3, ...]
 *
 * 交错存储：
 * interleaved: [x1, y1, z1, nx1, ny1, nz1, u1, v1, x2, y2, z2, nx2, ny2, nz2, u2, v2, ...]
 *
 * 交错数组基础介绍可参考：[Interleaved array basics]{@link https://blog.tojicode.com/2011/05/interleaved-array-basics.html}
 */
class InterleavedBuffer {
  /**
   * 构造一个新的交错缓冲区
   *
   * @param {TypedArray} array - 存储属性数据的类型化数组，具有共享缓冲区
   * @param {number} stride - 每个顶点的类型化数组元素数量（步长）
   */
  constructor(array, stride) {
    /**
     * 类型测试标志
     *
     * 此标志可用于类型测试，用于识别对象是否为交错缓冲区。
     * 在 Three.js 中，许多类都有类似的标志用于运行时类型检查。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isInterleavedBuffer = true;

    /**
     * 存储属性数据的类型化数组
     *
     * 这是一个具有共享缓冲区的类型化数组，存储所有顶点的属性数据。
     * 可以是 Float32Array、Uint16Array、Uint32Array 等类型。
     *
     * @type {TypedArray}
     */
    this.array = array;

    /**
     * 步长（每个顶点的类型化数组元素数量）
     *
     * 步长定义了每个顶点在数组中占用的元素数量。
     * 例如：如果每个顶点有位置(3个float) + 法线(3个float) + UV(2个float)，
     * 那么步长就是 8。
     *
     * @type {number}
     */
    this.stride = stride;

    /**
     * 数组中的总元素数量
     *
     * 这是一个只读属性，表示缓冲区中顶点的总数。
     * 计算方式：数组长度 / 步长 = 顶点数量
     *
     * @type {number}
     * @readonly
     */
    this.count = array !== undefined ? array.length / stride : 0;

    /**
     * 数据存储的预期使用模式，用于优化目的
     *
     * 这个属性告诉 GPU 驱动程序如何优化内存分配和访问模式：
     * - StaticDrawUsage: 数据很少改变，主要用于绘制
     * - DynamicDrawUsage: 数据经常改变，主要用于绘制
     * - StreamDrawUsage: 数据每帧都改变，主要用于绘制
     * - StaticReadUsage: 数据很少改变，主要用于读取
     * - DynamicReadUsage: 数据经常改变，主要用于读取
     * - StreamReadUsage: 数据每帧都改变，主要用于读取
     * - StaticCopyUsage: 数据很少改变，用于复制操作
     * - DynamicCopyUsage: 数据经常改变，用于复制操作
     * - StreamCopyUsage: 数据每帧都改变，用于复制操作
     *
     * 注意：缓冲区首次使用后，其使用模式无法更改。
     * 如需更改，请实例化一个新的缓冲区并在下次渲染前设置所需的使用模式。
     *
     * @type {(StaticDrawUsage|DynamicDrawUsage|StreamDrawUsage|StaticReadUsage|DynamicReadUsage|StreamReadUsage|StaticCopyUsage|DynamicCopyUsage|StreamCopyUsage)}
     * @default StaticDrawUsage
     */
    this.usage = StaticDrawUsage;

    /**
     * 更新范围数组
     *
     * 这可以用于仅更新存储向量的某些组件（例如，仅更新与颜色相关的组件）。
     * 使用 `addUpdateRange()` 函数向此数组添加范围。
     *
     * 每个范围对象包含：
     * - start: 更新开始的位置
     * - count: 要更新的组件数量
     *
     * @type {Array<Object>}
     */
    this.updateRanges = [];

    /**
     * 版本号
     *
     * 每次将 `needsUpdate` 设置为 `true` 时，此版本号都会递增。
     * GPU 渲染器使用此版本号来确定是否需要重新上传缓冲区数据。
     *
     * @type {number}
     */
    this.version = 0;

    /**
     * 交错缓冲区的唯一标识符
     *
     * 每个交错缓冲区都有一个唯一的 UUID，用于标识和序列化。
     *
     * @type {string}
     * @readonly
     */
    this.uuid = generateUUID();
  }

  /**
   * 上传回调函数
   *
   * 这是一个在渲染器将属性数组数据传输到 GPU 后执行的回调函数。
   * 可以用于在数据上传完成后执行清理操作，特别是当 CPU 端不再需要数据时。
   */
  onUploadCallback() {}

  /**
   * 需要更新标志的设置器
   *
   * 用于指示此属性已更改并应重新发送到 GPU 的标志。
   * 当您修改数组的值时，请将此设置为 `true`。
   *
   * 工作原理：
   * 1. 当设置为 true 时，版本号会自动递增
   * 2. 渲染器检查版本号变化来决定是否重新上传数据
   * 3. 这是一种优化机制，避免不必要的 GPU 数据传输
   *
   * @type {boolean}
   * @default false
   * @param {boolean} value - 是否需要更新
   */
  set needsUpdate(value) {
    // 如果设置为 true，则递增版本号
    if (value === true) this.version++;
  }

  /**
   * 设置此交错缓冲区的使用模式
   *
   * 使用模式告诉 GPU 如何优化内存分配和访问。
   * 正确设置使用模式可以显著提高渲染性能。
   *
   * @param {(StaticDrawUsage|DynamicDrawUsage|StreamDrawUsage|StaticReadUsage|DynamicReadUsage|StreamReadUsage|StaticCopyUsage|DynamicCopyUsage|StreamCopyUsage)} value - 要设置的使用模式
   * @return {InterleavedBuffer} 返回此交错缓冲区的引用，支持链式调用
   */
  setUsage(value) {
    // 设置使用模式
    this.usage = value;

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 添加要在 GPU 上更新的数据范围
   *
   * 此方法允许您指定数组中需要更新的特定范围，而不是更新整个缓冲区。
   * 这是一种优化技术，特别适用于大型缓冲区中只有小部分数据发生变化的情况。
   *
   * @param {number} start - 开始更新的位置（数组索引）
   * @param {number} count - 要更新的组件数量
   */
  addUpdateRange(start, count) {
    // 将更新范围添加到更新范围数组中
    this.updateRanges.push({ start, count });
  }

  /**
   * 清除所有更新范围
   *
   * 清空更新范围数组，这意味着下次更新时将更新整个缓冲区。
   */
  clearUpdateRanges() {
    // 将数组长度设置为 0，清空所有更新范围
    this.updateRanges.length = 0;
  }

  /**
   * 复制给定交错缓冲区的值到当前实例
   *
   * 这个方法会创建源缓冲区数组的完整副本，包括所有属性。
   * 注意：这是一个深拷贝操作，会创建新的数组实例。
   *
   * @param {InterleavedBuffer} source - 要复制的交错缓冲区
   * @return {InterleavedBuffer} 返回当前实例的引用，支持链式调用
   */
  copy(source) {
    // 创建源数组的新实例（深拷贝）
    this.array = new source.array.constructor(source.array);
    // 复制顶点数量
    this.count = source.count;
    // 复制步长
    this.stride = source.stride;
    // 复制使用模式
    this.usage = source.usage;

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 从给定的交错缓冲区复制一个向量到当前缓冲区
   *
   * 属性缓冲区中的起始位置和目标位置由给定的索引表示。
   * 这个方法用于在两个交错缓冲区之间复制单个顶点的所有属性。
   *
   * @param {number} index1 - 当前交错缓冲区中的目标索引（顶点索引）
   * @param {InterleavedBuffer} interleavedBuffer - 要复制的源交错缓冲区
   * @param {number} index2 - 源交错缓冲区中的源索引（顶点索引）
   * @return {InterleavedBuffer} 返回当前实例的引用，支持链式调用
   */
  copyAt(index1, interleavedBuffer, index2) {
    // 将顶点索引转换为数组索引（乘以步长）
    index1 *= this.stride;
    index2 *= interleavedBuffer.stride;

    // 复制一个完整顶点的所有属性（步长个元素）
    for (let i = 0, l = this.stride; i < l; i++) {
      this.array[index1 + i] = interleavedBuffer.array[index2 + i];
    }

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 在交错缓冲区中设置给定的数组数据
   *
   * 这个方法允许您将新数据写入缓冲区的指定位置。
   * 常用于更新缓冲区的部分或全部内容。
   *
   * @param {(TypedArray|Array)} value - 要设置的数组数据
   * @param {number} [offset=0] - 在当前交错缓冲区数组中的偏移量
   * @return {InterleavedBuffer} 返回当前实例的引用，支持链式调用
   */
  set(value, offset = 0) {
    // 使用类型化数组的 set 方法设置数据
    this.array.set(value, offset);

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 返回一个包含当前实例复制值的新交错缓冲区
   *
   * 这个方法创建当前交错缓冲区的克隆副本。
   * 它使用共享数组缓冲区机制来优化内存使用，避免重复的内存分配。
   *
   * @param {Object} [data] - 包含共享数组缓冲区的对象，允许保留共享结构
   * @return {InterleavedBuffer} 当前实例的克隆副本
   */
  clone(data) {
    // 如果 data 对象中没有 arrayBuffers 属性，则初始化它
    if (data.arrayBuffers === undefined) {
      data.arrayBuffers = {};
    }

    // 如果当前数组缓冲区没有 UUID，则生成一个
    if (this.array.buffer._uuid === undefined) {
      this.array.buffer._uuid = generateUUID();
    }

    // 如果共享缓冲区中还没有当前缓冲区的副本，则创建一个
    if (data.arrayBuffers[this.array.buffer._uuid] === undefined) {
      // 创建数组的副本并获取其缓冲区
      data.arrayBuffers[this.array.buffer._uuid] = this.array.slice(0).buffer;
    }

    // 使用共享的数组缓冲区创建新的类型化数组
    const array = new this.array.constructor(data.arrayBuffers[this.array.buffer._uuid]);

    // 创建新的交错缓冲区实例
    const ib = new this.constructor(array, this.stride);
    // 设置相同的使用模式
    ib.setUsage(this.usage);

    // 返回克隆的实例
    return ib;
  }

  /**
   * 设置上传回调函数
   *
   * 设置在渲染器将数组数据传输到 GPU 后执行的回调函数。
   * 可用于在上传完成后执行清理操作，特别是当 CPU 端不再需要数据时。
   *
   * 使用场景：
   * - 释放大型临时数据
   * - 记录上传完成状态
   * - 触发后续处理流程
   *
   * @param {Function} callback - `onUpload()` 回调函数
   * @return {InterleavedBuffer} 返回当前实例的引用，支持链式调用
   */
  onUpload(callback) {
    // 设置上传回调函数
    this.onUploadCallback = callback;

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 将交错缓冲区序列化为 JSON 格式
   *
   * 这个方法将交错缓冲区转换为可以保存或传输的 JSON 对象。
   * 它处理数组缓冲区的序列化，确保数据可以正确地重建。
   *
   * @param {Object} [data] - 可选的元信息对象，用于序列化过程
   * @return {Object} 表示序列化后的交错缓冲区的 JSON 对象
   */
  toJSON(data) {
    // 如果 data 对象中没有 arrayBuffers 属性，则初始化它
    if (data.arrayBuffers === undefined) {
      data.arrayBuffers = {};
    }

    // 如果需要，为数组缓冲区生成 UUID
    if (this.array.buffer._uuid === undefined) {
      this.array.buffer._uuid = generateUUID();
    }

    // 如果数组缓冲区还没有被序列化，则进行序列化
    if (data.arrayBuffers[this.array.buffer._uuid] === undefined) {
      // 将数组缓冲区转换为 Uint32Array 然后转为普通数组
      data.arrayBuffers[this.array.buffer._uuid] = Array.from(new Uint32Array(this.array.buffer));
    }

    // 返回序列化的 JSON 对象
    return {
      uuid: this.uuid, // 交错缓冲区的唯一标识符
      buffer: this.array.buffer._uuid, // 数组缓冲区的 UUID 引用
      type: this.array.constructor.name, // 类型化数组的类型名称
      stride: this.stride, // 步长
    };
  }
}

// 导出交错缓冲区类
export { InterleavedBuffer };
