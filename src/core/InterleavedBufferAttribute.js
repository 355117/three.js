// 导入三维向量类，用于处理3D空间中的向量运算
import { Vector3 } from "../math/Vector3.js";
// 导入缓冲区属性基类，InterleavedBufferAttribute是其替代实现
import { BufferAttribute } from "./BufferAttribute.js";
// 导入数学工具函数：denormalize用于反规范化数据，normalize用于规范化数据
import { denormalize, normalize } from "../math/MathUtils.js";

// 创建一个私有的Vector3实例，用于临时计算，/*@__PURE__*/标记表示这是纯函数调用，可以被优化
const _vector = /*@__PURE__*/ new Vector3();

/**
 * 交错缓冲区属性类 - 一种使用交错数据的缓冲区属性的替代版本。
 * 交错属性共享一个公共的交错数据存储（{@link InterleavedBuffer}），
 * 并通过不同的偏移量引用缓冲区中的数据。
 *
 * An alternative version of a buffer attribute with interleaved data. Interleaved
 * attributes share a common interleaved data storage ({@link InterleavedBuffer}) and refer with
 * different offsets into the buffer.
 */
class InterleavedBufferAttribute {
  /**
   * 构造一个新的交错缓冲区属性实例
   * Constructs a new interleaved buffer attribute.
   *
   * @param {InterleavedBuffer} interleavedBuffer - 保存交错数据的缓冲区 The buffer holding the interleaved data.
   * @param {number} itemSize - 每个数据项的大小（组件数量） The item size.
   * @param {number} offset - 属性在缓冲区中的偏移量 The attribute offset into the buffer.
   * @param {boolean} [normalized=false] - 数据是否已规范化 Whether the data are normalized or not.
   */
  constructor(interleavedBuffer, itemSize, offset, normalized = false) {
    /**
     * 类型标识符，用于类型检测
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isInterleavedBufferAttribute = true;

    /**
     * 缓冲区属性的名称
     * The name of the buffer attribute.
     *
     * @type {string}
     */
    this.name = "";

    /**
     * 保存交错数据的缓冲区引用
     * The buffer holding the interleaved data.
     *
     * @type {InterleavedBuffer}
     */
    this.data = interleavedBuffer;

    /**
     * 每个数据项的大小（组件数量），参见 {@link BufferAttribute#itemSize}
     * The item size, see {@link BufferAttribute#itemSize}.
     *
     * @type {number}
     */
    this.itemSize = itemSize;

    /**
     * 属性在缓冲区中的偏移量
     * The attribute offset into the buffer.
     *
     * @type {number}
     */
    this.offset = offset;

    /**
     * 数据是否已规范化，参见 {@link BufferAttribute#normalized}
     * Whether the data are normalized or not, see {@link BufferAttribute#normalized}
     *
     * @type {boolean}
     */
    this.normalized = normalized;
  }

  /**
   * 此缓冲区属性的数据项数量
   * The item count of this buffer attribute.
   *
   * @type {number}
   * @readonly
   */
  get count() {
    // 返回交错缓冲区中的数据项数量
    return this.data.count;
  }

  /**
   * 保存交错缓冲区属性数据的数组
   * The array holding the interleaved buffer attribute data.
   *
   * @type {TypedArray}
   */
  get array() {
    // 返回交错缓冲区的底层数据数组
    return this.data.array;
  }

  /**
   * 标识此属性已更改并应重新发送到GPU的标志。
   * 当修改数组值时，将此设置为 `true`。
   * Flag to indicate that this attribute has changed and should be re-sent to
   * the GPU. Set this to `true` when you modify the value of the array.
   *
   * @type {boolean}
   * @default false
   * @param {boolean} value - 是否需要更新的布尔值
   */
  set needsUpdate(value) {
    // 将更新标志传递给底层的交错缓冲区
    this.data.needsUpdate = value;
  }

  /**
   * 将给定的4x4矩阵应用到此属性。仅适用于项大小为 `3` 的属性。
   * Applies the given 4x4 matrix to the given attribute. Only works with
   * item size `3`.
   *
   * @param {Matrix4} m - 要应用的矩阵 The matrix to apply.
   * @return {InterleavedBufferAttribute} 返回此实例的引用 A reference to this instance.
   */
  applyMatrix4(m) {
    // 遍历所有数据项
    for (let i = 0, l = this.data.count; i < l; i++) {
      // 从缓冲区属性中读取向量到临时向量
      _vector.fromBufferAttribute(this, i);

      // 对向量应用4x4矩阵变换
      _vector.applyMatrix4(m);

      // 将变换后的向量写回缓冲区
      this.setXYZ(i, _vector.x, _vector.y, _vector.z);
    }

    // 返回此实例以支持链式调用
    return this;
  }

  /**
   * 将给定的3x3法线矩阵应用到此属性。仅适用于项大小为 `3` 的属性。
   * Applies the given 3x3 normal matrix to the given attribute. Only works with
   * item size `3`.
   *
   * @param {Matrix3} m - 要应用的法线矩阵 The normal matrix to apply.
   * @return {InterleavedBufferAttribute} 返回此实例的引用 A reference to this instance.
   */
  applyNormalMatrix(m) {
    // 遍历所有数据项
    for (let i = 0, l = this.count; i < l; i++) {
      // 从缓冲区属性中读取向量到临时向量
      _vector.fromBufferAttribute(this, i);

      // 对向量应用法线矩阵变换（用于变换法向量）
      _vector.applyNormalMatrix(m);

      // 将变换后的向量写回缓冲区
      this.setXYZ(i, _vector.x, _vector.y, _vector.z);
    }

    // 返回此实例以支持链式调用
    return this;
  }

  /**
   * 将给定的4x4矩阵应用到此属性。仅适用于项大小为 `3` 的方向向量。
   * Applies the given 4x4 matrix to the given attribute. Only works with
   * item size `3` and with direction vectors.
   *
   * @param {Matrix4} m - 要应用的矩阵 The matrix to apply.
   * @return {InterleavedBufferAttribute} 返回此实例的引用 A reference to this instance.
   */
  transformDirection(m) {
    // 遍历所有数据项
    for (let i = 0, l = this.count; i < l; i++) {
      // 从缓冲区属性中读取向量到临时向量
      _vector.fromBufferAttribute(this, i);

      // 对方向向量应用矩阵变换（忽略平移部分）
      _vector.transformDirection(m);

      // 将变换后的向量写回缓冲区
      this.setXYZ(i, _vector.x, _vector.y, _vector.z);
    }

    // 返回此实例以支持链式调用
    return this;
  }

  /**
   * 返回指定索引处向量的指定组件值
   * Returns the given component of the vector at the given index.
   *
   * @param {number} index - 缓冲区属性中的索引 The index into the buffer attribute.
   * @param {number} component - 组件索引（0=x, 1=y, 2=z, 3=w） The component index.
   * @return {number} 返回的组件值 The returned value.
   */
  getComponent(index, component) {
    // 计算在交错数组中的实际位置：索引*步长+偏移量+组件偏移
    let value = this.array[index * this.data.stride + this.offset + component];

    // 如果数据已规范化，则进行反规范化处理
    if (this.normalized) value = denormalize(value, this.array);

    return value;
  }

  /**
   * 设置指定索引处向量的指定组件值
   * Sets the given value to the given component of the vector at the given index.
   *
   * @param {number} index - 缓冲区属性中的索引 The index into the buffer attribute.
   * @param {number} component - 组件索引（0=x, 1=y, 2=z, 3=w） The component index.
   * @param {number} value - 要设置的值 The value to set.
   * @return {InterleavedBufferAttribute} 返回此实例的引用 A reference to this instance.
   */
  setComponent(index, component, value) {
    // 如果数据需要规范化，则先进行规范化处理
    if (this.normalized) value = normalize(value, this.array);

    // 计算在交错数组中的实际位置并设置值
    this.data.array[index * this.data.stride + this.offset + component] = value;

    // 返回此实例以支持链式调用
    return this;
  }

  /**
   * 设置指定索引处向量的x分量
   * Sets the x component of the vector at the given index.
   *
   * @param {number} index - 缓冲区属性中的索引 The index into the buffer attribute.
   * @param {number} x - 要设置的x值 The value to set.
   * @return {InterleavedBufferAttribute} 返回此实例的引用 A reference to this instance.
   */
  setX(index, x) {
    // 如果数据需要规范化，则先进行规范化处理
    if (this.normalized) x = normalize(x, this.array);

    // 设置x分量（偏移量+0）
    this.data.array[index * this.data.stride + this.offset] = x;

    // 返回此实例以支持链式调用
    return this;
  }

  /**
   * 设置指定索引处向量的y分量
   * Sets the y component of the vector at the given index.
   *
   * @param {number} index - 缓冲区属性中的索引 The index into the buffer attribute.
   * @param {number} y - 要设置的y值 The value to set.
   * @return {InterleavedBufferAttribute} 返回此实例的引用 A reference to this instance.
   */
  setY(index, y) {
    // 如果数据需要规范化，则先进行规范化处理
    if (this.normalized) y = normalize(y, this.array);

    // 设置y分量（偏移量+1）
    this.data.array[index * this.data.stride + this.offset + 1] = y;

    // 返回此实例以支持链式调用
    return this;
  }

  /**
   * 设置指定索引处向量的z分量
   * Sets the z component of the vector at the given index.
   *
   * @param {number} index - 缓冲区属性中的索引 The index into the buffer attribute.
   * @param {number} z - 要设置的z值 The value to set.
   * @return {InterleavedBufferAttribute} 返回此实例的引用 A reference to this instance.
   */
  setZ(index, z) {
    // 如果数据需要规范化，则先进行规范化处理
    if (this.normalized) z = normalize(z, this.array);

    // 设置z分量（偏移量+2）
    this.data.array[index * this.data.stride + this.offset + 2] = z;

    // 返回此实例以支持链式调用
    return this;
  }

  /**
   * 设置指定索引处向量的w分量
   * Sets the w component of the vector at the given index.
   *
   * @param {number} index - 缓冲区属性中的索引 The index into the buffer attribute.
   * @param {number} w - 要设置的w值 The value to set.
   * @return {InterleavedBufferAttribute} 返回此实例的引用 A reference to this instance.
   */
  setW(index, w) {
    // 如果数据需要规范化，则先进行规范化处理
    if (this.normalized) w = normalize(w, this.array);

    // 设置w分量（偏移量+3）
    this.data.array[index * this.data.stride + this.offset + 3] = w;

    // 返回此实例以支持链式调用
    return this;
  }

  /**
   * 返回指定索引处向量的x分量
   * Returns the x component of the vector at the given index.
   *
   * @param {number} index - 缓冲区属性中的索引 The index into the buffer attribute.
   * @return {number} x分量值 The x component.
   */
  getX(index) {
    // 获取x分量（偏移量+0）
    let x = this.data.array[index * this.data.stride + this.offset];

    // 如果数据已规范化，则进行反规范化处理
    if (this.normalized) x = denormalize(x, this.array);

    return x;
  }

  /**
   * 返回指定索引处向量的y分量
   * Returns the y component of the vector at the given index.
   *
   * @param {number} index - 缓冲区属性中的索引 The index into the buffer attribute.
   * @return {number} y分量值 The y component.
   */
  getY(index) {
    // 获取y分量（偏移量+1）
    let y = this.data.array[index * this.data.stride + this.offset + 1];

    // 如果数据已规范化，则进行反规范化处理
    if (this.normalized) y = denormalize(y, this.array);

    return y;
  }

  /**
   * 返回指定索引处向量的z分量
   * Returns the z component of the vector at the given index.
   *
   * @param {number} index - 缓冲区属性中的索引 The index into the buffer attribute.
   * @return {number} z分量值 The z component.
   */
  getZ(index) {
    // 获取z分量（偏移量+2）
    let z = this.data.array[index * this.data.stride + this.offset + 2];

    // 如果数据已规范化，则进行反规范化处理
    if (this.normalized) z = denormalize(z, this.array);

    return z;
  }

  /**
   * 返回指定索引处向量的w分量
   * Returns the w component of the vector at the given index.
   *
   * @param {number} index - 缓冲区属性中的索引 The index into the buffer attribute.
   * @return {number} w分量值 The w component.
   */
  getW(index) {
    // 获取w分量（偏移量+3）
    let w = this.data.array[index * this.data.stride + this.offset + 3];

    // 如果数据已规范化，则进行反规范化处理
    if (this.normalized) w = denormalize(w, this.array);

    return w;
  }

  /**
   * 设置指定索引处向量的x和y分量
   * Sets the x and y component of the vector at the given index.
   *
   * @param {number} index - 缓冲区属性中的索引 The index into the buffer attribute.
   * @param {number} x - 要设置的x分量值 The value for the x component to set.
   * @param {number} y - 要设置的y分量值 The value for the y component to set.
   * @return {InterleavedBufferAttribute} 返回此实例的引用 A reference to this instance.
   */
  setXY(index, x, y) {
    // 计算在交错数组中的起始位置
    index = index * this.data.stride + this.offset;

    // 如果数据需要规范化，则对x和y进行规范化处理
    if (this.normalized) {
      x = normalize(x, this.array);
      y = normalize(y, this.array);
    }

    // 设置x和y分量
    this.data.array[index + 0] = x;
    this.data.array[index + 1] = y;

    // 返回此实例以支持链式调用
    return this;
  }

  /**
   * 设置指定索引处向量的x、y和z分量
   * Sets the x, y and z component of the vector at the given index.
   *
   * @param {number} index - 缓冲区属性中的索引 The index into the buffer attribute.
   * @param {number} x - 要设置的x分量值 The value for the x component to set.
   * @param {number} y - 要设置的y分量值 The value for the y component to set.
   * @param {number} z - 要设置的z分量值 The value for the z component to set.
   * @return {InterleavedBufferAttribute} 返回此实例的引用 A reference to this instance.
   */
  setXYZ(index, x, y, z) {
    // 计算在交错数组中的起始位置
    index = index * this.data.stride + this.offset;

    // 如果数据需要规范化，则对x、y、z进行规范化处理
    if (this.normalized) {
      x = normalize(x, this.array);
      y = normalize(y, this.array);
      z = normalize(z, this.array);
    }

    // 设置x、y、z分量
    this.data.array[index + 0] = x;
    this.data.array[index + 1] = y;
    this.data.array[index + 2] = z;

    // 返回此实例以支持链式调用
    return this;
  }

  /**
   * 设置指定索引处向量的x、y、z和w分量
   * Sets the x, y, z and w component of the vector at the given index.
   *
   * @param {number} index - 缓冲区属性中的索引 The index into the buffer attribute.
   * @param {number} x - 要设置的x分量值 The value for the x component to set.
   * @param {number} y - 要设置的y分量值 The value for the y component to set.
   * @param {number} z - 要设置的z分量值 The value for the z component to set.
   * @param {number} w - 要设置的w分量值 The value for the w component to set.
   * @return {InterleavedBufferAttribute} 返回此实例的引用 A reference to this instance.
   */
  setXYZW(index, x, y, z, w) {
    // 计算在交错数组中的起始位置
    index = index * this.data.stride + this.offset;

    // 如果数据需要规范化，则对x、y、z、w进行规范化处理
    if (this.normalized) {
      x = normalize(x, this.array);
      y = normalize(y, this.array);
      z = normalize(z, this.array);
      w = normalize(w, this.array);
    }

    // 设置x、y、z、w分量
    this.data.array[index + 0] = x;
    this.data.array[index + 1] = y;
    this.data.array[index + 2] = z;
    this.data.array[index + 3] = w;

    // 返回此实例以支持链式调用
    return this;
  }

  /**
   * 返回一个包含此实例复制值的新缓冲区属性
   * Returns a new buffer attribute with copied values from this instance.
   *
   * 如果未提供参数，克隆交错缓冲区属性将会解除数据的交错结构
   * If no parameter is provided, cloning an interleaved buffer attribute will de-interleave buffer data.
   *
   * @param {Object} [data] - 包含交错缓冲区的对象，允许保留交错属性 An object with interleaved buffers that allows to retain the interleaved property.
   * @return {BufferAttribute|InterleavedBufferAttribute} 此实例的克隆 A clone of this instance.
   */
  clone(data) {
    // 如果未提供data参数，则创建一个解除交错的BufferAttribute
    if (data === undefined) {
      // 输出警告信息，说明克隆操作将解除数据的交错结构
      console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");

      // 创建一个新数组来存储解除交错的数据
      const array = [];

      // 遍历所有数据项
      for (let i = 0; i < this.count; i++) {
        // 计算当前项在交错数组中的起始位置
        const index = i * this.data.stride + this.offset;

        // 复制当前项的所有组件
        for (let j = 0; j < this.itemSize; j++) {
          array.push(this.data.array[index + j]);
        }
      }

      // 返回一个新的非交错BufferAttribute
      return new BufferAttribute(new this.array.constructor(array), this.itemSize, this.normalized);
    } else {
      // 如果提供了data参数，则保持交错结构进行克隆

      // 确保data对象有interleavedBuffers属性
      if (data.interleavedBuffers === undefined) {
        data.interleavedBuffers = {};
      }

      // 如果当前缓冲区还未被克隆，则克隆它
      if (data.interleavedBuffers[this.data.uuid] === undefined) {
        data.interleavedBuffers[this.data.uuid] = this.data.clone(data);
      }

      // 返回一个新的InterleavedBufferAttribute，使用克隆的缓冲区
      return new InterleavedBufferAttribute(data.interleavedBuffers[this.data.uuid], this.itemSize, this.offset, this.normalized);
    }
  }

  /**
   * 将缓冲区属性序列化为JSON格式
   * Serializes the buffer attribute into JSON.
   *
   * 如果未提供参数，序列化交错缓冲区属性将会解除数据的交错结构
   * If no parameter is provided, cloning an interleaved buffer attribute will de-interleave buffer data.
   *
   * @param {Object} [data] - 包含序列化元信息的可选值 An optional value holding meta information about the serialization.
   * @return {Object} 表示序列化缓冲区属性的JSON对象 A JSON object representing the serialized buffer attribute.
   */
  toJSON(data) {
    // 如果未提供data参数，则创建解除交错的JSON表示
    if (data === undefined) {
      // 输出警告信息，说明序列化操作将解除数据的交错结构
      console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");

      // 创建一个新数组来存储解除交错的数据
      const array = [];

      // 遍历所有数据项
      for (let i = 0; i < this.count; i++) {
        // 计算当前项在交错数组中的起始位置
        const index = i * this.data.stride + this.offset;

        // 复制当前项的所有组件
        for (let j = 0; j < this.itemSize; j++) {
          array.push(this.data.array[index + j]);
        }
      }

      // 解除交错数据并将其保存为普通缓冲区属性
      // de-interleave data and save it as an ordinary buffer attribute for now

      return {
        itemSize: this.itemSize,
        type: this.array.constructor.name,
        array: array,
        normalized: this.normalized,
      };
    } else {
      // 保存为真正的交错属性
      // save as true interleaved attribute

      // 确保data对象有interleavedBuffers属性
      if (data.interleavedBuffers === undefined) {
        data.interleavedBuffers = {};
      }

      // 如果当前缓冲区还未被序列化，则序列化它
      if (data.interleavedBuffers[this.data.uuid] === undefined) {
        data.interleavedBuffers[this.data.uuid] = this.data.toJSON(data);
      }

      // 返回交错缓冲区属性的JSON表示
      return {
        isInterleavedBufferAttribute: true,
        itemSize: this.itemSize,
        data: this.data.uuid,
        offset: this.offset,
        normalized: this.normalized,
      };
    }
  }
}

// 导出InterleavedBufferAttribute类，使其可以被其他模块导入和使用
export { InterleavedBufferAttribute };
