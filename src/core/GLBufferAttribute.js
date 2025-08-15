/**
 * WebGL缓冲区属性类
 * 这是缓冲区属性的替代版本，对VBO有更多控制权
 * An alternative version of a buffer attribute with more control over the VBO.
 *
 * 渲染器不会为这种属性构造VBO。相反，它使用构造函数中传递的VBO，
 * 并且可以稍后通过 `buffer` 属性进行修改
 * The renderer does not construct a VBO for this kind of attribute. Instead, it uses
 * whatever VBO is passed in constructor and can later be altered via the `buffer` property.
 *
 * 此类最常见的用例是当某种GPGPU计算干扰或甚至产生相关VBO时
 * The most common use case for this class is when some kind of GPGPU calculation interferes
 * or even produces the VBOs in question.
 *
 * 注意：此类只能与 {@link WebGLRenderer} 一起使用
 * Notice that this class can only be used with {@link WebGLRenderer}.
 */
class GLBufferAttribute {
  /**
   * 构造一个新的GL缓冲区属性
   * Constructs a new GL buffer attribute.
   *
   * @param {WebGLBuffer} buffer - 原生WebGL缓冲区
   * @param {number} type - 原生数据类型（例如 `gl.FLOAT`）
   * @param {number} itemSize - 项目大小
   * @param {number} elementSize - 给定 `type` 参数对应的大小（以字节为单位）
   * @param {number} count - VBO中预期的顶点数量
   * @param {boolean} [normalized=false] - 数据是否已标准化
   */
  constructor(buffer, type, itemSize, elementSize, count, normalized = false) {
    /**
     * 类型标识符，用于类型检测
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isGLBufferAttribute = true;

    /**
     * 缓冲区属性的名称
     * The name of the buffer attribute.
     *
     * @type {string}
     */
    this.name = "";

    /**
     * 原生WebGL缓冲区
     * The native WebGL buffer.
     *
     * @type {WebGLBuffer}
     */
    this.buffer = buffer;

    /**
     * 原生数据类型
     * The native data type.
     *
     * @type {number}
     */
    this.type = type;

    /**
     * 项目大小，参见 {@link BufferAttribute#itemSize}
     * The item size, see {@link BufferAttribute#itemSize}.
     *
     * @type {number}
     */
    this.itemSize = itemSize;

    /**
     * 给定 `type` 参数对应的大小（以字节为单位）
     * The corresponding size (in bytes) for the given `type` parameter.
     *
     * @type {number}
     */
    this.elementSize = elementSize;

    /**
     * VBO中预期的顶点数量
     * The expected number of vertices in VBO.
     *
     * @type {number}
     */
    this.count = count;

    /**
     * 仅适用于整数数据。指示缓冲区中的底层数据如何映射到GLSL代码中的值
     * 例如，如果 `buffer` 包含 `gl.UNSIGNED_SHORT` 类型的数据，
     * 且 `normalized` 为 `true`，则缓冲区数据中的值 `0 - +65535` 将映射到
     * GLSL属性中的 `0.0f - +1.0f`。如果 `normalized` 为 `false`，
     * 则值将不经修改地转换为浮点数，即 `65535` 变为 `65535.0f`
     * Applies to integer data only. Indicates how the underlying data in the buffer maps to
     * the values in the GLSL code. For instance, if `buffer` contains data of `gl.UNSIGNED_SHORT`,
     * and `normalized` is `true`, the values `0 - +65535` in the buffer data will be mapped to
     * `0.0f - +1.0f` in the GLSL attribute. If `normalized` is `false`, the values will be converted
     * to floats unmodified, i.e. `65535` becomes `65535.0f`.
     *
     * @type {boolean}
     */
    this.normalized = normalized;

    /**
     * 版本号，每次 `needsUpdate` 设置为 `true` 时递增
     * A version number, incremented every time the `needsUpdate` is set to `true`.
     *
     * @type {number}
     */
    this.version = 0;
  }

  /**
   * 标志，指示此属性已更改并应重新发送到GPU
   * 当修改数组的值时，将此设置为 `true`
   * Flag to indicate that this attribute has changed and should be re-sent to
   * the GPU. Set this to `true` when you modify the value of the array.
   *
   * @type {number}
   * @default false
   * @param {boolean} value - 是否需要更新
   */
  set needsUpdate(value) {
    // 如果值为true，则递增版本号
    if (value === true) this.version++;
  }

  /**
   * 设置给定的原生WebGL缓冲区
   * Sets the given native WebGL buffer.
   *
   * @param {WebGLBuffer} buffer - 要设置的缓冲区
   * @return {GLBufferAttribute} 返回当前实例的引用
   */
  setBuffer(buffer) {
    // 设置缓冲区
    this.buffer = buffer;

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 设置给定的原生数据类型和元素大小
   * Sets the given native data type and element size.
   *
   * @param {number} type - 原生数据类型（例如 `gl.FLOAT`）
   * @param {number} elementSize - 给定 `type` 参数对应的大小（以字节为单位）
   * @return {GLBufferAttribute} 返回当前实例的引用
   */
  setType(type, elementSize) {
    // 设置数据类型
    this.type = type;
    // 设置元素大小
    this.elementSize = elementSize;

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 设置项目大小
   * Sets the item size.
   *
   * @param {number} itemSize - 项目大小
   * @return {GLBufferAttribute} 返回当前实例的引用
   */
  setItemSize(itemSize) {
    // 设置项目大小
    this.itemSize = itemSize;

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 设置计数（VBO中预期的顶点数量）
   * Sets the count (the expected number of vertices in VBO).
   *
   * @param {number} count - 顶点数量
   * @return {GLBufferAttribute} 返回当前实例的引用
   */
  setCount(count) {
    // 设置顶点数量
    this.count = count;

    // 返回当前实例，支持链式调用
    return this;
  }
}

// 导出GL缓冲区属性类
export { GLBufferAttribute };
