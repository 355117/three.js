// 导入统一缓冲区基类和常量
import UniformBuffer from "./UniformBuffer.js";
import { GPU_CHUNK_BYTES } from "./Constants.js";

/**
 * 统一变量组类
 *
 * 此类表示统一缓冲区绑定，但提供了维护单个统一变量对象的API。
 * 它将多个统一变量组织成一个组，并管理它们在GPU内存中的布局，
 * 遵循STD140标准，确保正确的内存对齐和高效的数据传输。
 *
 * 统一变量组简化了大量统一变量的管理，提供了比单独设置每个
 * 统一变量更高效的方式。
 *
 * @private
 * @augments UniformBuffer
 */
class UniformsGroup extends UniformBuffer {
  /**
   * 构造一个新的统一变量组
   *
   * @param {string} name - 组的名称，用于在着色器中标识
   */
  constructor(name) {
    // 调用父类构造函数
    super(name);

    /**
     * 用于类型测试的标志
     * 标识此对象为统一变量组类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isUniformsGroup = true;

    /**
     * 包含原始统一变量值的数组
     * 用于缓存和比较，以检测值的变化
     *
     * @private
     * @type {?Array<number>}
     * @default null
     */
    this._values = null;

    /**
     * 统一变量对象数组
     * 此数组中统一变量的顺序必须与着色器中统一变量的顺序匹配
     *
     * @type {Array<Uniform>}
     */
    this.uniforms = [];
  }

  /**
   * 向此组添加统一变量
   * 将统一变量添加到组的末尾，并返回组的引用以支持链式调用
   *
   * @param {Uniform} uniform - 要添加的统一变量
   * @return {UniformsGroup} 此组的引用，支持链式调用
   */
  addUniform(uniform) {
    // 将统一变量添加到数组末尾
    this.uniforms.push(uniform);

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 从此组中移除统一变量
   * 查找并移除指定的统一变量，如果找到则从数组中删除
   *
   * @param {Uniform} uniform - 要移除的统一变量
   * @return {UniformsGroup} 此组的引用，支持链式调用
   */
  removeUniform(uniform) {
    // 查找统一变量在数组中的索引
    const index = this.uniforms.indexOf(uniform);

    // 如果找到统一变量（索引不为-1），则从数组中移除
    if (index !== -1) {
      // 使用splice方法从指定索引位置删除1个元素
      this.uniforms.splice(index, 1);
    }

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 包含原始统一变量值的数组
   * 懒加载模式，只在需要时从缓冲区创建数组副本
   *
   * @type {Array<number>}
   */
  get values() {
    // 如果值数组尚未创建，从缓冲区创建副本
    if (this._values === null) {
      // 使用Array.from创建Float32Array的普通数组副本，用于值比较
      this._values = Array.from(this.buffer);
    }

    // 返回值数组
    return this._values;
  }

  /**
   * 包含统一变量值的Float32数组缓冲区
   * 懒加载模式，只在需要时创建缓冲区
   *
   * @type {Float32Array}
   */
  get buffer() {
    // 获取当前缓冲区引用
    let buffer = this._buffer;

    // 如果缓冲区尚未创建，创建新的缓冲区
    if (buffer === null) {
      // 计算所需的字节长度
      const byteLength = this.byteLength;

      // 创建Float32Array缓冲区
      // 先创建ArrayBuffer，再用它创建Float32Array视图
      buffer = new Float32Array(new ArrayBuffer(byteLength));

      // 缓存缓冲区引用
      this._buffer = buffer;
    }

    // 返回缓冲区
    return buffer;
  }

  /**
   * 具有正确缓冲区对齐的缓冲区字节长度
   * 计算遵循STD140布局规范的总缓冲区大小
   *
   * @type {number}
   */
  get byteLength() {
    // 获取每个元素的字节数（通常为4字节，对应Float32）
    const bytesPerElement = this.bytesPerElement;

    // 全局缓冲区偏移量（以字节为单位）
    let offset = 0;

    // 遍历所有统一变量，计算它们的布局
    for (let i = 0, l = this.uniforms.length; i < l; i++) {
      const uniform = this.uniforms[i];

      // 获取统一变量的边界对齐要求
      const boundary = uniform.boundary;
      // 计算统一变量的字节大小
      const itemSize = uniform.itemSize * bytesPerElement;

      // 计算在当前块中的偏移量
      const chunkOffset = offset % GPU_CHUNK_BYTES;
      // 计算为满足边界对齐所需的填充
      // 使用模运算确保数据按照STD140规范的边界要求对齐
      const chunkPadding = chunkOffset % boundary;
      // 计算数据在当前块中的起始位置
      const chunkStart = chunkOffset + chunkPadding;

      // 添加填充以满足对齐要求
      offset += chunkPadding;

      // 检查块溢出：如果当前统一变量无法完全放入当前GPU块中
      // chunkStart !== 0：确保不在块的开始位置
      // GPU_CHUNK_BYTES - chunkStart < itemSize：剩余空间不足以容纳当前统一变量
      if (chunkStart !== 0 && GPU_CHUNK_BYTES - chunkStart < itemSize) {
        // 在块的末尾添加填充，将统一变量移动到下一个完整的GPU块
        offset += GPU_CHUNK_BYTES - chunkStart;
      }

      // 设置统一变量在缓冲区中的偏移量（以元素为单位）
      // 将字节偏移量转换为元素偏移量，因为类型化数组使用元素索引
      uniform.offset = offset / bytesPerElement;

      // 增加偏移量以容纳当前统一变量
      offset += itemSize;
    }

    // 返回向上舍入到GPU块大小的总字节长度
    return Math.ceil(offset / GPU_CHUNK_BYTES) * GPU_CHUNK_BYTES;
  }

  /**
   * 更新此组中的所有统一变量
   * 通过更新内部统一变量列表中的每个统一变量对象来更新此组。
   * 统一变量对象会检查其值是否实际发生了变化，因此此方法只有在
   * 存在真正的值变化时才返回 `true`。
   *
   * @return {boolean} 统一变量是否已更新且必须上传到GPU
   */
  update() {
    // 标记是否有任何统一变量被更新
    let updated = false;

    // 遍历所有统一变量并检查更新
    for (const uniform of this.uniforms) {
      if (this.updateByType(uniform) === true) {
        updated = true;
      }
    }

    // 返回是否有更新
    return updated;
  }

  /**
   * 根据统一变量类型更新给定的统一变量
   * 调用与统一变量类型匹配的更新方法
   *
   * @param {Uniform} uniform - 要更新的统一变量
   * @return {boolean} 统一变量是否已更新
   */
  updateByType(uniform) {
    // 根据统一变量类型调用相应的更新方法
    // 使用类型标志进行快速类型识别和方法分发
    if (uniform.isNumberUniform) return this.updateNumber(uniform); // 处理数字类型（float、int）
    if (uniform.isVector2Uniform) return this.updateVector2(uniform); // 处理二维向量类型（vec2）
    if (uniform.isVector3Uniform) return this.updateVector3(uniform); // 处理三维向量类型（vec3）
    if (uniform.isVector4Uniform) return this.updateVector4(uniform); // 处理四维向量类型（vec4）
    if (uniform.isColorUniform) return this.updateColor(uniform); // 处理颜色类型（作为vec3）
    if (uniform.isMatrix3Uniform) return this.updateMatrix3(uniform); // 处理3x3矩阵类型（mat3）
    if (uniform.isMatrix4Uniform) return this.updateMatrix4(uniform); // 处理4x4矩阵类型（mat4）

    // 如果遇到不支持的统一变量类型，输出错误信息
    console.error("THREE.WebGPUUniformsGroup: Unsupported uniform type.", uniform);
  }

  /**
   * 更新数字统一变量
   * 检查数字值是否发生变化，如果有变化则更新缓冲区
   *
   * @param {NumberUniform} uniform - 要更新的数字统一变量
   * @return {boolean} 统一变量是否已更新
   */
  updateNumber(uniform) {
    let updated = false;

    // 获取值数组、统一变量值、偏移量和类型
    const a = this.values;
    const v = uniform.getValue();
    const offset = uniform.offset;
    const type = uniform.getType();

    // 检查值是否发生变化
    if (a[offset] !== v) {
      // 获取对应类型的缓冲区
      const b = this._getBufferForType(type);

      // 同时更新值数组和类型化缓冲区
      b[offset] = a[offset] = v;
      updated = true;
    }

    return updated;
  }

  /**
   * 更新二维向量统一变量
   * 检查向量的x和y分量是否发生变化，如果有变化则更新缓冲区
   *
   * @param {Vector2Uniform} uniform - 要更新的二维向量统一变量
   * @return {boolean} 统一变量是否已更新
   */
  updateVector2(uniform) {
    let updated = false;

    // 获取值数组、统一变量值、偏移量和类型
    const a = this.values;
    const v = uniform.getValue();
    const offset = uniform.offset;
    const type = uniform.getType();

    // 检查x和y分量是否发生变化
    if (a[offset + 0] !== v.x || a[offset + 1] !== v.y) {
      // 获取对应类型的缓冲区
      const b = this._getBufferForType(type);

      // 同时更新值数组和类型化缓冲区的x和y分量
      b[offset + 0] = a[offset + 0] = v.x;
      b[offset + 1] = a[offset + 1] = v.y;

      updated = true;
    }

    return updated;
  }

  /**
   * 更新三维向量统一变量
   * 检查向量的x、y、z分量是否发生变化，如果有变化则更新缓冲区
   *
   * @param {Vector3Uniform} uniform - 要更新的三维向量统一变量
   * @return {boolean} 统一变量是否已更新
   */
  updateVector3(uniform) {
    // 初始化更新标志
    let updated = false;

    // 获取值数组、统一变量值、偏移量和类型
    const a = this.values;
    const v = uniform.getValue();
    const offset = uniform.offset;
    const type = uniform.getType();

    // 检查x、y、z分量是否发生变化
    if (a[offset + 0] !== v.x || a[offset + 1] !== v.y || a[offset + 2] !== v.z) {
      // 获取对应类型的缓冲区
      const b = this._getBufferForType(type);

      // 同时更新值数组和类型化缓冲区的x、y、z分量
      b[offset + 0] = a[offset + 0] = v.x;
      b[offset + 1] = a[offset + 1] = v.y;
      b[offset + 2] = a[offset + 2] = v.z;

      // 标记已更新
      updated = true;
    }

    // 返回更新状态
    return updated;
  }

  /**
   * 更新四维向量统一变量
   * 检查向量的x、y、z、w分量是否发生变化，如果有变化则更新缓冲区
   *
   * @param {Vector4Uniform} uniform - 要更新的四维向量统一变量
   * @return {boolean} 统一变量是否已更新
   */
  updateVector4(uniform) {
    // 初始化更新标志
    let updated = false;

    // 获取值数组、统一变量值、偏移量和类型
    const a = this.values;
    const v = uniform.getValue();
    const offset = uniform.offset;
    const type = uniform.getType();

    // 检查x、y、z、w分量是否发生变化（注意：原代码中offset+4应该是offset+3）
    if (a[offset + 0] !== v.x || a[offset + 1] !== v.y || a[offset + 2] !== v.z || a[offset + 3] !== v.w) {
      // 获取对应类型的缓冲区
      const b = this._getBufferForType(type);

      // 同时更新值数组和类型化缓冲区的x、y、z、w分量
      b[offset + 0] = a[offset + 0] = v.x;
      b[offset + 1] = a[offset + 1] = v.y;
      b[offset + 2] = a[offset + 2] = v.z;
      b[offset + 3] = a[offset + 3] = v.w;

      // 标记已更新
      updated = true;
    }

    // 返回更新状态
    return updated;
  }

  /**
   * 更新颜色统一变量
   * 检查颜色的r、g、b分量是否发生变化，如果有变化则更新缓冲区
   *
   * @param {ColorUniform} uniform - 要更新的颜色统一变量
   * @return {boolean} 统一变量是否已更新
   */
  updateColor(uniform) {
    // 初始化更新标志
    let updated = false;

    // 获取值数组、颜色值和偏移量
    const a = this.values;
    const c = uniform.getValue();
    const offset = uniform.offset;

    // 检查r、g、b分量是否发生变化
    if (a[offset + 0] !== c.r || a[offset + 1] !== c.g || a[offset + 2] !== c.b) {
      // 获取缓冲区（颜色使用默认的Float32Array缓冲区）
      const b = this.buffer;

      // 同时更新值数组和缓冲区的r、g、b分量
      b[offset + 0] = a[offset + 0] = c.r;
      b[offset + 1] = a[offset + 1] = c.g;
      b[offset + 2] = a[offset + 2] = c.b;

      // 标记已更新
      updated = true;
    }

    // 返回更新状态
    return updated;
  }

  /**
   * 更新3x3矩阵统一变量
   * 检查矩阵的9个元素是否发生变化，按STD140布局存储（每列4个元素，跳过第4个）
   *
   * @param {Matrix3Uniform} uniform - 要更新的3x3矩阵统一变量
   * @return {boolean} 统一变量是否已更新
   */
  updateMatrix3(uniform) {
    // 初始化更新标志
    let updated = false;

    // 获取值数组、矩阵元素数组和偏移量
    const a = this.values;
    const e = uniform.getValue().elements;
    const offset = uniform.offset;

    // 检查矩阵的9个元素是否发生变化
    // STD140布局：3x3矩阵按列存储，每列占4个位置（第4个位置跳过）
    if (
      a[offset + 0] !== e[0] || // 第1列第1行
      a[offset + 1] !== e[1] || // 第1列第2行
      a[offset + 2] !== e[2] || // 第1列第3行
      a[offset + 4] !== e[3] || // 第2列第1行（跳过offset+3）
      a[offset + 5] !== e[4] || // 第2列第2行
      a[offset + 6] !== e[5] || // 第2列第3行
      a[offset + 8] !== e[6] || // 第3列第1行（跳过offset+7）
      a[offset + 9] !== e[7] || // 第3列第2行
      a[offset + 10] !== e[8] // 第3列第3行
    ) {
      // 获取缓冲区
      const b = this.buffer;

      // 按STD140布局更新矩阵元素
      b[offset + 0] = a[offset + 0] = e[0]; // 第1列第1行
      b[offset + 1] = a[offset + 1] = e[1]; // 第1列第2行
      b[offset + 2] = a[offset + 2] = e[2]; // 第1列第3行
      b[offset + 4] = a[offset + 4] = e[3]; // 第2列第1行
      b[offset + 5] = a[offset + 5] = e[4]; // 第2列第2行
      b[offset + 6] = a[offset + 6] = e[5]; // 第2列第3行
      b[offset + 8] = a[offset + 8] = e[6]; // 第3列第1行
      b[offset + 9] = a[offset + 9] = e[7]; // 第3列第2行
      b[offset + 10] = a[offset + 10] = e[8]; // 第3列第3行

      // 标记已更新
      updated = true;
    }

    // 返回更新状态
    return updated;
  }

  /**
   * 更新4x4矩阵统一变量
   * 检查矩阵的16个元素是否发生变化，使用高效的数组比较和复制
   *
   * @param {Matrix4Uniform} uniform - 要更新的4x4矩阵统一变量
   * @return {boolean} 统一变量是否已更新
   */
  updateMatrix4(uniform) {
    // 初始化更新标志
    let updated = false;

    // 获取值数组、矩阵元素数组和偏移量
    const a = this.values;
    const e = uniform.getValue().elements;
    const offset = uniform.offset;

    // 使用数组比较函数检查矩阵是否发生变化
    if (arraysEqual(a, e, offset) === false) {
      // 获取缓冲区
      const b = this.buffer;
      // 使用高效的set方法将矩阵元素复制到缓冲区
      // TypedArray.set()比逐个赋值更高效，适合大量数据复制
      b.set(e, offset);
      // 同时更新值数组，保持数据同步
      setArray(a, e, offset);
      // 标记已更新
      updated = true;
    }

    // 返回更新状态
    return updated;
  }

  /**
   * 根据给定的数据类型返回匹配的类型化数组
   * 为不同的GLSL数据类型提供相应的JavaScript类型化数组
   *
   * @param {string} type - 数据类型（如int、uint、float等）
   * @return {TypedArray} 对应的类型化数组
   * @private
   */
  _getBufferForType(type) {
    // 整数类型：int、ivec2、ivec3、ivec4 使用 Int32Array
    if (type === "int" || type === "ivec2" || type === "ivec3" || type === "ivec4") return new Int32Array(this.buffer.buffer);
    // 无符号整数类型：uint、uvec2、uvec3、uvec4 使用 Uint32Array
    if (type === "uint" || type === "uvec2" || type === "uvec3" || type === "uvec4") return new Uint32Array(this.buffer.buffer);
    // 默认浮点类型：float、vec2、vec3、vec4、mat2、mat3、mat4 使用 Float32Array
    return this.buffer;
  }
}

/**
 * 将第二个数组的值设置到第一个数组中
 * 用于高效地将数据从源数组复制到目标数组的指定偏移位置
 *
 * @private
 * @param {TypedArray} a - 目标数组（第一个数组）
 * @param {TypedArray} b - 源数组（第二个数组）
 * @param {number} offset - 目标数组的索引偏移量
 */
function setArray(a, b, offset) {
  // 逐个复制源数组的元素到目标数组
  // 从源数组的索引0开始，复制到目标数组的offset位置
  for (let i = 0, l = b.length; i < l; i++) {
    a[offset + i] = b[i];
  }
}

/**
 * 检查给定的数组是否相等
 * 比较两个数组在指定偏移位置开始的元素是否完全相同
 *
 * @private
 * @param {TypedArray} a - 第一个数组
 * @param {TypedArray} b - 第二个数组
 * @param {number} offset - 第一个数组的索引偏移量
 * @return {boolean} 给定的数组是否相等
 */
function arraysEqual(a, b, offset) {
  // 逐个比较数组元素
  // 比较目标数组从offset开始的元素与源数组对应位置的元素
  for (let i = 0, l = b.length; i < l; i++) {
    // 如果发现不相等的元素，立即返回false（短路求值优化）
    if (a[offset + i] !== b[i]) return false;
  }

  // 所有元素都相等，返回true
  return true;
}

// 导出统一变量组类
export default UniformsGroup;
