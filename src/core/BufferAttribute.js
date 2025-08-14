// 导入数学相关的向量类
import { Vector3 } from "../math/Vector3.js"; // 三维向量类
import { Vector2 } from "../math/Vector2.js"; // 二维向量类
// 导入数学工具函数，用于数据标准化和反标准化
import { denormalize, normalize } from "../math/MathUtils.js";
// 导入常量定义
import { StaticDrawUsage, FloatType } from "../constants.js"; // 静态绘制使用模式和浮点类型
// 导入半精度浮点数转换工具
import { fromHalfFloat, toHalfFloat } from "../extras/DataUtils.js";

// 全局临时向量对象，用于内部计算（纯函数标记，避免副作用）
const _vector = /*@__PURE__*/ new Vector3(); // 三维向量临时对象
const _vector2 = /*@__PURE__*/ new Vector2(); // 二维向量临时对象

// 全局ID计数器，用于为每个BufferAttribute实例分配唯一标识符
let _id = 0;

/**
 * 这个类存储与几何体相关的属性数据（如顶点位置、面索引、法线、颜色、UV坐标和任何自定义属性），
 * 允许更高效地将数据传递给GPU。
 *
 * BufferAttribute是Three.js中用于存储几何体属性数据的核心类。它使用类型化数组（TypedArray）
 * 来存储数据，这样可以直接传递给WebGL，避免了JavaScript数组的性能开销。
 *
 * 当处理类似向量的数据时，向量和颜色类上的`fromBufferAttribute( attribute, index )`
 * 辅助方法可能会很有用。例如 {@link Vector3#fromBufferAttribute}。
 */
class BufferAttribute {
  /**
   * 构造一个新的缓冲区属性
   *
   * @param {TypedArray} array - 保存属性数据的类型化数组
   * @param {number} itemSize - 每个项目的组件数量（例如：位置为3，UV为2）
   * @param {boolean} [normalized=false] - 数据是否已标准化
   */
  constructor(array, itemSize, normalized = false) {
    // 检查输入数组类型，必须是类型化数组而不是普通JavaScript数组
    if (Array.isArray(array)) {
      throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");
    }

    /**
     * 此标志可用于类型测试，标识这是一个BufferAttribute实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isBufferAttribute = true;

    /**
     * 缓冲区属性的唯一标识符
     * 每个BufferAttribute实例都会获得一个递增的唯一ID
     *
     * @name BufferAttribute#id
     * @type {number}
     * @readonly
     */
    Object.defineProperty(this, "id", { value: _id++ });

    /**
     * 缓冲区属性的名称，用于调试和识别
     *
     * @type {string}
     */
    this.name = "";

    /**
     * 保存属性数据的类型化数组。它应该有 `itemSize * numVertices` 个元素，
     * 其中 `numVertices` 是关联几何体中的顶点数量。
     *
     * @type {TypedArray}
     */
    this.array = array;

    /**
     * 与特定顶点关联的数组值的数量。
     * 例如，如果此属性存储3分量向量（如位置、法线或颜色），
     * 则该值应为 `3`。
     *
     * @type {number}
     */
    this.itemSize = itemSize;

    /**
     * 表示此缓冲区属性存储的项目数量。它通过将 `array` 长度除以 `itemSize` 来内部计算。
     *
     * @type {number}
     * @readonly
     */
    this.count = array !== undefined ? array.length / itemSize : 0;

    /**
     * 仅适用于整数数据。指示缓冲区中的底层数据如何映射到GLSL代码中的值。
     * 例如，如果 `array` 是 `UInt16Array` 的实例，且 `normalized` 为 `true`，
     * 则数组数据中的值 `0 - +65535` 将映射到GLSL属性中的 `0.0f - +1.0f`。
     * 如果 `normalized` 为 `false`，值将不经修改地转换为浮点数，即 `65535` 变为 `65535.0f`。
     *
     * @type {boolean}
     */
    this.normalized = normalized;

    /**
     * 定义数据存储的预期使用模式，用于优化目的。
     *
     * 使用模式告诉GPU如何优化这个缓冲区的内存管理：
     * - StaticDrawUsage: 数据很少改变，主要用于绘制
     * - DynamicDrawUsage: 数据经常改变，主要用于绘制
     *
     * 注意：缓冲区初次使用后，其使用模式无法更改。相反，
     * 应实例化一个新的缓冲区并在下次渲染前设置所需的使用模式。
     *
     * @type {number} 使用模式常量
     * @default StaticDrawUsage
     */
    this.usage = StaticDrawUsage;

    /**
     * 可用于仅更新存储向量的某些组件（例如，仅与颜色相关的组件）。
     * 使用 `addUpdateRange()` 函数向此数组添加范围。
     *
     * @type {Array<Object>}
     */
    this.updateRanges = [];

    /**
     * 配置在着色器中使用的绑定GPU类型。
     *
     * 注意：这仅对整数数组有效，对浮点数组不可配置。
     * 对于较低精度的浮点类型，请使用 `Float16BufferAttribute`。
     *
     * @type {number} GPU类型常量（FloatType或IntType）
     * @default FloatType
     */
    this.gpuType = FloatType;

    /**
     * 版本号，每次将 `needsUpdate` 设置为 `true` 时递增。
     * 用于跟踪缓冲区数据的更改状态。
     *
     * @type {number}
     */
    this.version = 0;
  }

  /**
   * 回调函数，在渲染器将属性数组数据传输到GPU后执行。
   * 可以重写此方法来执行自定义的上传后处理逻辑。
   */
  onUploadCallback() {}

  /**
   * 标志，指示此属性已更改并应重新发送到GPU。
   * 当您修改数组的值时，将此设置为 `true`。
   *
   * @type {boolean}
   * @default false
   * @param {boolean} value - 是否需要更新
   */
  set needsUpdate(value) {
    if (value === true) this.version++; // 递增版本号以标记更改
  }

  /**
   * 设置此缓冲区属性的使用模式
   * 使用模式告诉GPU如何优化这个缓冲区的内存管理
   *
   * @param {number} value - 要设置的使用模式常量
   * @return {BufferAttribute} 返回此缓冲区属性的引用，支持链式调用
   */
  setUsage(value) {
    this.usage = value; // 设置使用模式

    return this; // 返回自身以支持链式调用
  }

  /**
   * 添加数据数组中要在GPU上更新的数据范围
   * 这允许只更新缓冲区的特定部分，而不是整个缓冲区
   *
   * @param {number} start - 开始更新的位置
   * @param {number} count - 要更新的组件数量
   */
  addUpdateRange(start, count) {
    this.updateRanges.push({ start, count }); // 添加更新范围到数组
  }

  /**
   * 清除所有更新范围
   * 调用此方法后，下次更新将影响整个缓冲区
   */
  clearUpdateRanges() {
    this.updateRanges.length = 0; // 清空更新范围数组
  }

  /**
   * 将给定缓冲区属性的值复制到此实例
   * 这是一个深度复制，会创建新的数组实例
   *
   * @param {BufferAttribute} source - 要复制的源缓冲区属性
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  copy(source) {
    this.name = source.name; // 复制名称
    this.array = new source.array.constructor(source.array); // 创建新的类型化数组副本
    this.itemSize = source.itemSize; // 复制项目大小
    this.count = source.count; // 复制项目数量
    this.normalized = source.normalized; // 复制标准化标志

    this.usage = source.usage; // 复制使用模式
    this.gpuType = source.gpuType; // 复制GPU类型

    return this; // 返回自身以支持链式调用
  }

  /**
   * 从给定的缓冲区属性复制一个向量到此缓冲区属性。
   * 属性缓冲区中的起始位置和目标位置由给定的索引表示。
   *
   * @param {number} index1 - 此缓冲区属性中的目标索引
   * @param {BufferAttribute} attribute - 要复制的源缓冲区属性
   * @param {number} index2 - 给定缓冲区属性中的源索引
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  copyAt(index1, attribute, index2) {
    index1 *= this.itemSize; // 计算目标位置的实际数组索引
    index2 *= attribute.itemSize; // 计算源位置的实际数组索引

    // 复制所有组件
    for (let i = 0, l = this.itemSize; i < l; i++) {
      this.array[index1 + i] = attribute.array[index2 + i];
    }

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定的数组数据复制到此缓冲区属性中
   * 这会直接设置内部数组的值，不会创建新数组
   *
   * @param {(TypedArray|Array)} array - 要复制的数组
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  copyArray(array) {
    this.array.set(array); // 使用类型化数组的set方法复制数据

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定的3x3矩阵应用到此属性。适用于项目大小为 `2` 和 `3` 的属性。
   *
   * 对于2D向量（itemSize=2），将其视为齐次坐标进行变换
   * 对于3D向量（itemSize=3），直接应用3x3矩阵变换
   *
   * @param {Matrix3} m - 要应用的3x3矩阵
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  applyMatrix3(m) {
    if (this.itemSize === 2) {
      // 处理2D向量
      for (let i = 0, l = this.count; i < l; i++) {
        _vector2.fromBufferAttribute(this, i); // 从缓冲区属性读取2D向量
        _vector2.applyMatrix3(m); // 应用3x3矩阵变换

        this.setXY(i, _vector2.x, _vector2.y); // 将变换后的值写回缓冲区
      }
    } else if (this.itemSize === 3) {
      // 处理3D向量
      for (let i = 0, l = this.count; i < l; i++) {
        _vector.fromBufferAttribute(this, i); // 从缓冲区属性读取3D向量
        _vector.applyMatrix3(m); // 应用3x3矩阵变换

        this.setXYZ(i, _vector.x, _vector.y, _vector.z); // 将变换后的值写回缓冲区
      }
    }

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定的4x4矩阵应用到此属性。仅适用于项目大小为 `3` 的属性。
   * 通常用于变换位置向量，包括平移、旋转、缩放等变换。
   *
   * @param {Matrix4} m - 要应用的4x4矩阵
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  applyMatrix4(m) {
    // 遍历所有3D向量
    for (let i = 0, l = this.count; i < l; i++) {
      _vector.fromBufferAttribute(this, i); // 从缓冲区属性读取3D向量

      _vector.applyMatrix4(m); // 应用4x4矩阵变换

      this.setXYZ(i, _vector.x, _vector.y, _vector.z); // 将变换后的值写回缓冲区
    }

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定的3x3法线矩阵应用到此属性。仅适用于项目大小为 `3` 的属性。
   * 法线矩阵是模型矩阵的逆转置矩阵，用于正确变换法线向量。
   *
   * @param {Matrix3} m - 要应用的法线矩阵
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  applyNormalMatrix(m) {
    // 遍历所有3D法线向量
    for (let i = 0, l = this.count; i < l; i++) {
      _vector.fromBufferAttribute(this, i); // 从缓冲区属性读取3D向量

      _vector.applyNormalMatrix(m); // 应用法线矩阵变换

      this.setXYZ(i, _vector.x, _vector.y, _vector.z); // 将变换后的值写回缓冲区
    }

    return this; // 返回自身以支持链式调用
  }

  /**
   * Applies the given 4x4 matrix to the given attribute. Only works with
   * item size `3` and with direction vectors.
   *
   * @param {Matrix4} m - The matrix to apply.
   * @return {BufferAttribute} A reference to this instance.
   */
  transformDirection(m) {
    for (let i = 0, l = this.count; i < l; i++) {
      _vector.fromBufferAttribute(this, i);

      _vector.transformDirection(m);

      this.setXYZ(i, _vector.x, _vector.y, _vector.z);
    }

    return this;
  }

  /**
   * 在缓冲区属性中设置给定的数组数据
   * 这允许批量设置数据，可以指定偏移量
   *
   * @param {(TypedArray|Array)} value - 要设置的数组数据
   * @param {number} [offset=0] - 此缓冲区属性数组中的偏移量
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  set(value, offset = 0) {
    // 匹配BufferAttribute构造函数，不对数组进行标准化
    this.array.set(value, offset);

    return this; // 返回自身以支持链式调用
  }

  /**
   * 返回给定索引处向量的指定组件
   * 如果数据已标准化，会自动进行反标准化处理
   *
   * @param {number} index - 缓冲区属性中的索引
   * @param {number} component - 组件索引（0=x, 1=y, 2=z, 3=w）
   * @return {number} 返回的组件值
   */
  getComponent(index, component) {
    let value = this.array[index * this.itemSize + component]; // 计算实际数组位置并获取值

    if (this.normalized) value = denormalize(value, this.array); // 如果已标准化，进行反标准化

    return value; // 返回组件值
  }

  /**
   * 将给定值设置到给定索引处向量的指定组件
   * 如果数据需要标准化，会自动进行标准化处理
   *
   * @param {number} index - 缓冲区属性中的索引
   * @param {number} component - 组件索引（0=x, 1=y, 2=z, 3=w）
   * @param {number} value - 要设置的值
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  setComponent(index, component, value) {
    if (this.normalized) value = normalize(value, this.array); // 如果需要标准化，进行标准化处理

    this.array[index * this.itemSize + component] = value; // 计算实际数组位置并设置值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 返回给定索引处向量的x组件
   *
   * @param {number} index - 缓冲区属性中的索引
   * @return {number} x组件的值
   */
  getX(index) {
    let x = this.array[index * this.itemSize]; // 获取x组件（第0个组件）

    if (this.normalized) x = denormalize(x, this.array); // 如果已标准化，进行反标准化

    return x; // 返回x组件值
  }

  /**
   * 设置给定索引处向量的x组件
   *
   * @param {number} index - 缓冲区属性中的索引
   * @param {number} x - 要设置的x值
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  setX(index, x) {
    if (this.normalized) x = normalize(x, this.array); // 如果需要标准化，进行标准化处理

    this.array[index * this.itemSize] = x; // 设置x组件（第0个组件）

    return this; // 返回自身以支持链式调用
  }

  /**
   * 返回给定索引处向量的y组件
   *
   * @param {number} index - 缓冲区属性中的索引
   * @return {number} y组件的值
   */
  getY(index) {
    let y = this.array[index * this.itemSize + 1]; // 获取y组件（第1个组件）

    if (this.normalized) y = denormalize(y, this.array); // 如果已标准化，进行反标准化

    return y; // 返回y组件值
  }

  /**
   * 设置给定索引处向量的y组件
   *
   * @param {number} index - 缓冲区属性中的索引
   * @param {number} y - 要设置的y值
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  setY(index, y) {
    if (this.normalized) y = normalize(y, this.array); // 如果需要标准化，进行标准化处理

    this.array[index * this.itemSize + 1] = y; // 设置y组件（第1个组件）

    return this; // 返回自身以支持链式调用
  }

  /**
   * 返回给定索引处向量的z组件
   *
   * @param {number} index - 缓冲区属性中的索引
   * @return {number} z组件的值
   */
  getZ(index) {
    let z = this.array[index * this.itemSize + 2]; // 获取z组件（第2个组件）

    if (this.normalized) z = denormalize(z, this.array); // 如果已标准化，进行反标准化

    return z; // 返回z组件值
  }

  /**
   * 设置给定索引处向量的z组件
   *
   * @param {number} index - 缓冲区属性中的索引
   * @param {number} z - 要设置的z值
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  setZ(index, z) {
    if (this.normalized) z = normalize(z, this.array); // 如果需要标准化，进行标准化处理

    this.array[index * this.itemSize + 2] = z; // 设置z组件（第2个组件）

    return this; // 返回自身以支持链式调用
  }

  /**
   * 返回给定索引处向量的w组件
   * w组件通常用于齐次坐标或四元数的第四个分量
   *
   * @param {number} index - 缓冲区属性中的索引
   * @return {number} w组件的值
   */
  getW(index) {
    let w = this.array[index * this.itemSize + 3]; // 获取w组件（第3个组件）

    if (this.normalized) w = denormalize(w, this.array); // 如果已标准化，进行反标准化

    return w; // 返回w组件值
  }

  /**
   * 设置给定索引处向量的w组件
   * w组件通常用于齐次坐标或四元数的第四个分量
   *
   * @param {number} index - 缓冲区属性中的索引
   * @param {number} w - 要设置的w值
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  setW(index, w) {
    if (this.normalized) w = normalize(w, this.array); // 如果需要标准化，进行标准化处理

    this.array[index * this.itemSize + 3] = w; // 设置w组件（第3个组件）

    return this; // 返回自身以支持链式调用
  }

  /**
   * 设置给定索引处向量的x和y组件
   * 这是一个便捷方法，可以同时设置2D向量的两个组件
   *
   * @param {number} index - 缓冲区属性中的索引
   * @param {number} x - 要设置的x组件值
   * @param {number} y - 要设置的y组件值
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  setXY(index, x, y) {
    index *= this.itemSize; // 计算实际数组起始位置

    if (this.normalized) {
      // 如果需要标准化，对所有组件进行标准化处理
      x = normalize(x, this.array);
      y = normalize(y, this.array);
    }

    // 设置x和y组件
    this.array[index + 0] = x;
    this.array[index + 1] = y;

    return this; // 返回自身以支持链式调用
  }

  /**
   * 设置给定索引处向量的x、y和z组件
   * 这是一个便捷方法，可以同时设置3D向量的三个组件
   *
   * @param {number} index - 缓冲区属性中的索引
   * @param {number} x - 要设置的x组件值
   * @param {number} y - 要设置的y组件值
   * @param {number} z - 要设置的z组件值
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  setXYZ(index, x, y, z) {
    index *= this.itemSize; // 计算实际数组起始位置

    if (this.normalized) {
      // 如果需要标准化，对所有组件进行标准化处理
      x = normalize(x, this.array);
      y = normalize(y, this.array);
      z = normalize(z, this.array);
    }

    // 设置x、y和z组件
    this.array[index + 0] = x;
    this.array[index + 1] = y;
    this.array[index + 2] = z;

    return this; // 返回自身以支持链式调用
  }

  /**
   * 设置给定索引处向量的x、y、z和w组件
   * 这是一个便捷方法，可以同时设置4D向量的四个组件
   * 常用于齐次坐标、四元数或RGBA颜色值
   *
   * @param {number} index - 缓冲区属性中的索引
   * @param {number} x - 要设置的x组件值
   * @param {number} y - 要设置的y组件值
   * @param {number} z - 要设置的z组件值
   * @param {number} w - 要设置的w组件值
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  setXYZW(index, x, y, z, w) {
    index *= this.itemSize; // 计算实际数组起始位置

    if (this.normalized) {
      // 如果需要标准化，对所有组件进行标准化处理
      x = normalize(x, this.array);
      y = normalize(y, this.array);
      z = normalize(z, this.array);
      w = normalize(w, this.array);
    }

    // 设置x、y、z和w组件
    this.array[index + 0] = x;
    this.array[index + 1] = y;
    this.array[index + 2] = z;
    this.array[index + 3] = w;

    return this; // 返回自身以支持链式调用
  }

  /**
   * 设置在渲染器将属性数组数据传输到GPU后执行的回调函数。
   * 可用于在上传后执行清理操作，当CPU端不再需要属性数据时。
   *
   * 这对于释放大型数据集的内存很有用，特别是在数据上传到GPU后
   * 不再需要在JavaScript端保留副本的情况下。
   *
   * @param {Function} callback - `onUpload()` 回调函数
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  onUpload(callback) {
    this.onUploadCallback = callback; // 设置上传回调函数

    return this; // 返回自身以支持链式调用
  }

  /**
   * 返回一个包含此实例复制值的新缓冲区属性
   * 这是一个深度克隆，新实例与原实例完全独立
   *
   * @return {BufferAttribute} 此实例的克隆
   */
  clone() {
    // 使用构造函数创建新实例，然后复制所有属性
    return new this.constructor(this.array, this.itemSize).copy(this);
  }

  /**
   * 将缓冲区属性序列化为JSON格式
   * 用于保存、传输或调试缓冲区属性数据
   *
   * @return {Object} 表示序列化缓冲区属性的JSON对象
   */
  toJSON() {
    const data = {
      itemSize: this.itemSize, // 项目大小
      type: this.array.constructor.name, // 数组类型名称
      array: Array.from(this.array), // 将类型化数组转换为普通数组
      normalized: this.normalized, // 标准化标志
    };

    // 只有在非默认值时才包含这些属性
    if (this.name !== "") data.name = this.name; // 名称（如果不为空）
    if (this.usage !== StaticDrawUsage) data.usage = this.usage; // 使用模式（如果不是默认值）

    return data; // 返回序列化数据
  }
}

/**
 * 便捷类，可在使用普通 `Array` 实例创建 `Int8` 缓冲区属性时使用。
 * Int8数组存储8位有符号整数，范围为-128到127。
 *
 * @augments BufferAttribute
 */
class Int8BufferAttribute extends BufferAttribute {
  /**
   * 构造一个新的Int8缓冲区属性
   *
   * @param {(Array<number>|Int8Array)} array - 保存属性数据的数组
   * @param {number} itemSize - 每个项目的组件数量
   * @param {boolean} [normalized=false] - 数据是否已标准化
   */
  constructor(array, itemSize, normalized) {
    super(new Int8Array(array), itemSize, normalized); // 创建Int8Array并调用父类构造函数
  }
}

/**
 * 便捷类，可在使用普通 `Array` 实例创建 `UInt8` 缓冲区属性时使用。
 * UInt8数组存储8位无符号整数，范围为0到255。
 *
 * @augments BufferAttribute
 */
class Uint8BufferAttribute extends BufferAttribute {
  /**
   * 构造一个新的UInt8缓冲区属性
   *
   * @param {(Array<number>|Uint8Array)} array - 保存属性数据的数组
   * @param {number} itemSize - 每个项目的组件数量
   * @param {boolean} [normalized=false] - 数据是否已标准化
   */
  constructor(array, itemSize, normalized) {
    super(new Uint8Array(array), itemSize, normalized); // 创建Uint8Array并调用父类构造函数
  }
}

/**
 * 便捷类，可在使用普通 `Array` 实例创建 `UInt8Clamped` 缓冲区属性时使用。
 * UInt8ClampedArray存储8位无符号整数，范围为0到255，值会被限制在此范围内。
 *
 * @augments BufferAttribute
 */
class Uint8ClampedBufferAttribute extends BufferAttribute {
  /**
   * 构造一个新的UInt8Clamped缓冲区属性
   *
   * @param {(Array<number>|Uint8ClampedArray)} array - 保存属性数据的数组
   * @param {number} itemSize - 每个项目的组件数量
   * @param {boolean} [normalized=false] - 数据是否已标准化
   */
  constructor(array, itemSize, normalized) {
    super(new Uint8ClampedArray(array), itemSize, normalized); // 创建Uint8ClampedArray并调用父类构造函数
  }
}

/**
 * 便捷类，可在使用普通 `Array` 实例创建 `Int16` 缓冲区属性时使用。
 * Int16数组存储16位有符号整数，范围为-32768到32767。
 *
 * @augments BufferAttribute
 */
class Int16BufferAttribute extends BufferAttribute {
  /**
   * 构造一个新的Int16缓冲区属性
   *
   * @param {(Array<number>|Int16Array)} array - 保存属性数据的数组
   * @param {number} itemSize - 每个项目的组件数量
   * @param {boolean} [normalized=false] - 数据是否已标准化
   */
  constructor(array, itemSize, normalized) {
    super(new Int16Array(array), itemSize, normalized); // 创建Int16Array并调用父类构造函数
  }
}

/**
 * 便捷类，可在使用普通 `Array` 实例创建 `UInt16` 缓冲区属性时使用。
 * UInt16数组存储16位无符号整数，范围为0到65535。
 *
 * @augments BufferAttribute
 */
class Uint16BufferAttribute extends BufferAttribute {
  /**
   * 构造一个新的UInt16缓冲区属性
   *
   * @param {(Array<number>|Uint16Array)} array - 保存属性数据的数组
   * @param {number} itemSize - 每个项目的组件数量
   * @param {boolean} [normalized=false] - 数据是否已标准化
   */
  constructor(array, itemSize, normalized) {
    super(new Uint16Array(array), itemSize, normalized); // 创建Uint16Array并调用父类构造函数
  }
}

/**
 * 便捷类，可在使用普通 `Array` 实例创建 `Int32` 缓冲区属性时使用。
 * Int32数组存储32位有符号整数，范围为-2147483648到2147483647。
 *
 * @augments BufferAttribute
 */
class Int32BufferAttribute extends BufferAttribute {
  /**
   * 构造一个新的Int32缓冲区属性
   *
   * @param {(Array<number>|Int32Array)} array - 保存属性数据的数组
   * @param {number} itemSize - 每个项目的组件数量
   * @param {boolean} [normalized=false] - 数据是否已标准化
   */
  constructor(array, itemSize, normalized) {
    super(new Int32Array(array), itemSize, normalized); // 创建Int32Array并调用父类构造函数
  }
}

/**
 * 便捷类，可在使用普通 `Array` 实例创建 `UInt32` 缓冲区属性时使用。
 * UInt32数组存储32位无符号整数，范围为0到4294967295。
 *
 * @augments BufferAttribute
 */
class Uint32BufferAttribute extends BufferAttribute {
  /**
   * 构造一个新的UInt32缓冲区属性
   *
   * @param {(Array<number>|Uint32Array)} array - 保存属性数据的数组
   * @param {number} itemSize - 每个项目的组件数量
   * @param {boolean} [normalized=false] - 数据是否已标准化
   */
  constructor(array, itemSize, normalized) {
    super(new Uint32Array(array), itemSize, normalized); // 创建Uint32Array并调用父类构造函数
  }
}

/**
 * 便捷类，可在使用普通 `Array` 实例创建 `Float16` 缓冲区属性时使用。
 *
 * 此类通过 `Uint16Array` 自动转换为FP16格式，因为 `Float16Array`
 * 的浏览器支持仍然存在问题。Float16提供了内存效率和精度之间的平衡。
 *
 * @augments BufferAttribute
 */
class Float16BufferAttribute extends BufferAttribute {
  /**
   * 构造一个新的Float16缓冲区属性
   *
   * @param {(Array<number>|Uint16Array)} array - 保存属性数据的数组
   * @param {number} itemSize - 每个项目的组件数量
   * @param {boolean} [normalized=false] - 数据是否已标准化
   */
  constructor(array, itemSize, normalized) {
    super(new Uint16Array(array), itemSize, normalized); // 使用Uint16Array存储半精度浮点数

    this.isFloat16BufferAttribute = true; // 标识这是Float16BufferAttribute
  }

  /**
   * 返回给定索引处向量的x组件（半精度浮点数版本）
   *
   * @param {number} index - 缓冲区属性中的索引
   * @return {number} x组件的值
   */
  getX(index) {
    let x = fromHalfFloat(this.array[index * this.itemSize]); // 从半精度转换为全精度

    if (this.normalized) x = denormalize(x, this.array); // 如果已标准化，进行反标准化

    return x; // 返回x组件值
  }

  /**
   * 设置给定索引处向量的x组件（半精度浮点数版本）
   *
   * @param {number} index - 缓冲区属性中的索引
   * @param {number} x - 要设置的x值
   * @return {BufferAttribute} 返回此实例的引用，支持链式调用
   */
  setX(index, x) {
    if (this.normalized) x = normalize(x, this.array); // 如果需要标准化，进行标准化处理

    this.array[index * this.itemSize] = toHalfFloat(x); // 转换为半精度并存储

    return this; // 返回自身以支持链式调用
  }

  getY(index) {
    let y = fromHalfFloat(this.array[index * this.itemSize + 1]);

    if (this.normalized) y = denormalize(y, this.array);

    return y;
  }

  setY(index, y) {
    if (this.normalized) y = normalize(y, this.array);

    this.array[index * this.itemSize + 1] = toHalfFloat(y);

    return this;
  }

  getZ(index) {
    let z = fromHalfFloat(this.array[index * this.itemSize + 2]);

    if (this.normalized) z = denormalize(z, this.array);

    return z;
  }

  setZ(index, z) {
    if (this.normalized) z = normalize(z, this.array);

    this.array[index * this.itemSize + 2] = toHalfFloat(z);

    return this;
  }

  getW(index) {
    let w = fromHalfFloat(this.array[index * this.itemSize + 3]);

    if (this.normalized) w = denormalize(w, this.array);

    return w;
  }

  setW(index, w) {
    if (this.normalized) w = normalize(w, this.array);

    this.array[index * this.itemSize + 3] = toHalfFloat(w);

    return this;
  }

  setXY(index, x, y) {
    index *= this.itemSize;

    if (this.normalized) {
      x = normalize(x, this.array);
      y = normalize(y, this.array);
    }

    this.array[index + 0] = toHalfFloat(x);
    this.array[index + 1] = toHalfFloat(y);

    return this;
  }

  setXYZ(index, x, y, z) {
    index *= this.itemSize;

    if (this.normalized) {
      x = normalize(x, this.array);
      y = normalize(y, this.array);
      z = normalize(z, this.array);
    }

    this.array[index + 0] = toHalfFloat(x);
    this.array[index + 1] = toHalfFloat(y);
    this.array[index + 2] = toHalfFloat(z);

    return this;
  }

  setXYZW(index, x, y, z, w) {
    index *= this.itemSize;

    if (this.normalized) {
      x = normalize(x, this.array);
      y = normalize(y, this.array);
      z = normalize(z, this.array);
      w = normalize(w, this.array);
    }

    this.array[index + 0] = toHalfFloat(x);
    this.array[index + 1] = toHalfFloat(y);
    this.array[index + 2] = toHalfFloat(z);
    this.array[index + 3] = toHalfFloat(w);

    return this;
  }
}

/**
 * 便捷类，可在使用普通 `Array` 实例创建 `Float32` 缓冲区属性时使用。
 * Float32数组存储32位单精度浮点数，这是WebGL中最常用的浮点数格式。
 *
 * @augments BufferAttribute
 */
class Float32BufferAttribute extends BufferAttribute {
  /**
   * 构造一个新的Float32缓冲区属性
   *
   * @param {(Array<number>|Float32Array)} array - 保存属性数据的数组
   * @param {number} itemSize - 每个项目的组件数量
   * @param {boolean} [normalized=false] - 数据是否已标准化
   */
  constructor(array, itemSize, normalized) {
    super(new Float32Array(array), itemSize, normalized); // 创建Float32Array并调用父类构造函数
  }
}

// 导出所有BufferAttribute类和子类

export {
  Float32BufferAttribute, // 32位浮点数缓冲区属性
  Float16BufferAttribute, // 16位半精度浮点数缓冲区属性
  Uint32BufferAttribute, // 32位无符号整数缓冲区属性
  Int32BufferAttribute, // 32位有符号整数缓冲区属性
  Uint16BufferAttribute, // 16位无符号整数缓冲区属性
  Int16BufferAttribute, // 16位有符号整数缓冲区属性
  Uint8ClampedBufferAttribute, // 8位无符号限制整数缓冲区属性
  Uint8BufferAttribute, // 8位无符号整数缓冲区属性
  Int8BufferAttribute, // 8位有符号整数缓冲区属性
  BufferAttribute, // 基础缓冲区属性类
};
