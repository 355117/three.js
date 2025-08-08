/**
 * WebGL 顶点属性管理器
 *
 * 这个类负责管理 WebGL 顶点缓冲区对象 (VBO)，是 Three.js 渲染管线中的核心组件。
 * 它将 Three.js 的 BufferAttribute 对象转换为 WebGL 可以使用的缓冲区，
 * 并提供高效的缓冲区更新机制。
 *
 * 核心功能：
 * 1. 创建和管理 WebGL 缓冲区对象 (VBO)
 * 2. 处理多种数据类型的顶点属性（Float32、Int16、Uint8 等）
 * 3. 优化缓冲区更新操作（支持部分更新和范围合并）
 * 4. 自动检测数据类型并设置正确的 WebGL 类型
 * 5. 支持交错缓冲区属性 (InterleavedBufferAttribute)
 * 6. 支持直接 WebGL 缓冲区属性 (GLBufferAttribute)
 *
 * 性能优化特性：
 * - 使用 WeakMap 确保自动垃圾回收
 * - 版本控制机制避免不必要的更新
 * - 智能范围合并减少 GPU 调用次数
 * - 支持部分缓冲区更新以提高大数据集性能
 *
 * 支持的数据类型：
 * - Float32Array (gl.FLOAT)
 * - Float16Array (gl.HALF_FLOAT) - 如果浏览器支持
 * - Uint16Array (gl.UNSIGNED_SHORT 或 gl.HALF_FLOAT)
 * - Int16Array (gl.SHORT)
 * - Uint32Array (gl.UNSIGNED_INT)
 * - Int32Array (gl.INT)
 * - Int8Array (gl.BYTE)
 * - Uint8Array/Uint8ClampedArray (gl.UNSIGNED_BYTE)
 *
 * @param {WebGL2RenderingContext} gl - WebGL 渲染上下文
 * @returns {Object} 顶点属性管理器对象
 */
function WebGLAttributes(gl) {
  /**
   * 缓冲区映射表
   *
   * 使用 WeakMap 存储 BufferAttribute 到 WebGL 缓冲区信息的映射关系。
   * WeakMap 的优势：
   * 1. 当 BufferAttribute 对象被垃圾回收时，对应的映射关系也会自动清理
   * 2. 不会阻止 BufferAttribute 对象的垃圾回收
   * 3. 提供更好的内存管理，避免内存泄漏
   *
   * 映射结构：BufferAttribute -> { buffer, type, bytesPerElement, version, size }
   */
  const buffers = new WeakMap();

  /**
   * 创建 WebGL 缓冲区
   *
   * 根据 BufferAttribute 的数据创建对应的 WebGL 缓冲区对象，
   * 并自动检测数据类型设置正确的 WebGL 数据类型。
   *
   * 这个方法处理了 Three.js 到 WebGL 的数据类型映射，
   * 确保不同的 TypedArray 类型能够正确地转换为对应的 WebGL 类型。
   *
   * @param {BufferAttribute} attribute - Three.js 的缓冲区属性对象
   * @param {number} bufferType - WebGL 缓冲区类型（gl.ARRAY_BUFFER 或 gl.ELEMENT_ARRAY_BUFFER）
   * @returns {Object} 包含缓冲区信息的对象 { buffer, type, bytesPerElement, version, size }
   */
  function createBuffer(attribute, bufferType) {
    // 获取属性数据和元信息
    const array = attribute.array; // TypedArray 数据数组
    const usage = attribute.usage; // 使用模式（gl.STATIC_DRAW, gl.DYNAMIC_DRAW, gl.STREAM_DRAW）
    const size = array.byteLength; // 数据大小（字节）

    // 创建 WebGL 缓冲区对象
    const buffer = gl.createBuffer();

    // 绑定缓冲区并上传数据到 GPU
    gl.bindBuffer(bufferType, buffer);
    gl.bufferData(bufferType, array, usage);

    // 调用上传完成回调函数，用于清理 CPU 端数据或其他后处理
    attribute.onUploadCallback();

    // 根据 TypedArray 类型确定对应的 WebGL 数据类型
    // 这个映射确保了 Three.js 的数据类型能够正确地传递给 WebGL
    let type;

    if (array instanceof Float32Array) {
      // 32位单精度浮点数 - 最常用的顶点数据类型
      type = gl.FLOAT;
    } else if (typeof Float16Array !== "undefined" && array instanceof Float16Array) {
      // 16位半精度浮点数 - 节省内存，适用于移动设备
      // 需要浏览器支持 Float16Array（较新的特性）
      type = gl.HALF_FLOAT;
    } else if (array instanceof Uint16Array) {
      if (attribute.isFloat16BufferAttribute) {
        // 特殊情况：Uint16Array 用于存储半精度浮点数
        // 这是一种向后兼容的方式，当原生 Float16Array 不可用时使用
        type = gl.HALF_FLOAT;
      } else {
        // 16位无符号整数 - 常用于索引缓冲区
        type = gl.UNSIGNED_SHORT;
      }
    } else if (array instanceof Int16Array) {
      // 16位有符号整数 - 用于压缩的顶点数据
      type = gl.SHORT;
    } else if (array instanceof Uint32Array) {
      // 32位无符号整数 - 用于大型网格的索引缓冲区
      type = gl.UNSIGNED_INT;
    } else if (array instanceof Int32Array) {
      // 32位有符号整数 - 用于整数类型的顶点属性
      type = gl.INT;
    } else if (array instanceof Int8Array) {
      // 8位有符号整数 - 用于高度压缩的数据（如法线）
      type = gl.BYTE;
    } else if (array instanceof Uint8Array) {
      // 8位无符号整数 - 用于颜色数据或压缩属性
      type = gl.UNSIGNED_BYTE;
    } else if (array instanceof Uint8ClampedArray) {
      // 8位无符号整数（值限制在0-255） - 主要用于图像数据
      type = gl.UNSIGNED_BYTE;
    } else {
      // 不支持的数据格式，抛出错误
      throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: " + array);
    }

    // 返回缓冲区信息对象，包含所有必要的元数据
    return {
      buffer: buffer, // WebGL 缓冲区对象句柄
      type: type, // WebGL 数据类型常量
      bytesPerElement: array.BYTES_PER_ELEMENT, // 每个元素的字节数（用于计算偏移量）
      version: attribute.version, // 属性版本号（用于变更检测）
      size: size, // 缓冲区总字节数（用于大小验证）
    };
  }

  /**
   * 更新 WebGL 缓冲区数据
   *
   * 高效地更新已存在的 WebGL 缓冲区数据。这个方法是性能优化的核心，
   * 支持部分更新（通过 updateRanges）和全量更新，并自动优化相邻或
   * 重叠的更新范围以减少 GPU 调用次数。
   *
   * 性能优化策略：
   * 1. 支持部分缓冲区更新，避免传输不必要的数据
   * 2. 智能合并相邻或重叠的更新范围
   * 3. 减少 gl.bufferSubData 调用次数以降低 GPU 命令开销
   * 4. 就地合并范围以减少垃圾回收压力
   *
   * @param {WebGLBuffer} buffer - 要更新的 WebGL 缓冲区对象
   * @param {BufferAttribute} attribute - 包含新数据的缓冲区属性
   * @param {number} bufferType - WebGL 缓冲区类型（gl.ARRAY_BUFFER 或 gl.ELEMENT_ARRAY_BUFFER）
   */
  function updateBuffer(buffer, attribute, bufferType) {
    const array = attribute.array; // 新的数据数组
    const updateRanges = attribute.updateRanges; // 需要更新的范围列表

    // 绑定目标缓冲区，准备进行数据传输
    gl.bindBuffer(bufferType, buffer);

    if (updateRanges.length === 0) {
      // 没有指定更新范围，执行全量更新
      // 这是最简单的情况，直接替换整个缓冲区内容
      gl.bufferSubData(bufferType, 0, array);
    } else {
      // 执行部分更新优化
      //
      // 性能优化：在应用更新范围之前，我们合并任何相邻或重叠的范围，
      // 以减少对 gl.bufferSubData 的调用次数。经验表明，这对于
      // 大量使用更新范围的应用程序带来了显著的性能改进，
      // 主要原因是减少了 GPU 命令队列的开销。
      //
      // 内存优化：为了减少帧间的垃圾回收压力，我们就地合并更新范围。
      // 这是安全的，因为此方法会在更新完成后清除所有更新范围。

      // 第一步：按起始位置排序更新范围
      // 这确保我们能够从左到右顺序处理范围，便于合并算法
      updateRanges.sort((a, b) => a.start - b.start);

      // 第二步：就地合并重叠或相邻的更新范围
      //
      // 算法说明：从左到右遍历已排序的 updateRanges 数组，
      // 将重叠或相邻的范围合并为更大的范围。这可能导致
      // 最终数组比原始数组小，从而减少 GPU 调用次数。
      //
      // mergeIndex 跟踪合并后范围的最后一个有效索引，
      // 此索引之后的数据在算法完成后会被修剪掉。
      let mergeIndex = 0;

      for (let i = 1; i < updateRanges.length; i++) {
        const previousRange = updateRanges[mergeIndex];
        const range = updateRanges[i];

        // 检查当前范围是否与前一个范围重叠或相邻
        // 加1是为了合并相邻的范围（例如：[0,5] 和 [6,10] 可以合并为 [0,10]）
        // 这是安全的，因为范围操作的是非负整数
        if (range.start <= previousRange.start + previousRange.count + 1) {
          // 合并重叠或相邻的范围
          // 新的计数 = max(原计数, 当前范围的结束位置 - 原起始位置)
          previousRange.count = Math.max(previousRange.count, range.start + range.count - previousRange.start);
        } else {
          // 范围不相邻，保留为独立范围
          ++mergeIndex;
          updateRanges[mergeIndex] = range;
        }
      }

      // 第三步：修剪数组，只保留合并后的有效范围
      updateRanges.length = mergeIndex + 1;

      // 第四步：应用所有合并后的更新范围
      for (let i = 0, l = updateRanges.length; i < l; i++) {
        const range = updateRanges[i];

        // 计算字节偏移量并更新指定范围的缓冲区数据
        // 参数：缓冲区类型，字节偏移量，源数组，元素起始索引，元素数量
        gl.bufferSubData(bufferType, range.start * array.BYTES_PER_ELEMENT, array, range.start, range.count);
      }

      // 第五步：清除更新范围，为下次更新做准备
      attribute.clearUpdateRanges();
    }

    // 调用上传完成回调函数，通知属性更新完成
    attribute.onUploadCallback();
  }

  /**
   * 获取缓冲区属性对应的WebGL缓冲区信息
   *
   * 从缓存中获取指定属性对应的WebGL缓冲区信息。
   * 如果是交错缓冲区属性，会自动获取其底层数据。
   *
   * @param {BufferAttribute|InterleavedBufferAttribute} attribute - 要查询的缓冲区属性
   * @returns {Object|undefined} 缓冲区信息对象，如果不存在则返回undefined
   */
  function get(attribute) {
    // 如果是交错缓冲区属性，获取其底层数据
    if (attribute.isInterleavedBufferAttribute) attribute = attribute.data;

    return buffers.get(attribute);
  }

  /**
   * 移除缓冲区属性及其对应的WebGL缓冲区
   *
   * 从缓存中移除指定的缓冲区属性，并删除对应的WebGL缓冲区对象，
   * 释放GPU内存。这是内存管理的重要部分。
   *
   * @param {BufferAttribute|InterleavedBufferAttribute} attribute - 要移除的缓冲区属性
   */
  function remove(attribute) {
    // 如果是交错缓冲区属性，获取其底层数据
    if (attribute.isInterleavedBufferAttribute) attribute = attribute.data;

    const data = buffers.get(attribute);

    if (data) {
      // 删除WebGL缓冲区对象，释放GPU内存
      gl.deleteBuffer(data.buffer);

      // 从缓存中移除映射关系
      buffers.delete(attribute);
    }
  }

  /**
   * 更新或创建缓冲区属性对应的WebGL缓冲区
   *
   * 这是属性管理器的核心方法，负责：
   * 1. 处理不同类型的缓冲区属性（普通、交错、GLBuffer）
   * 2. 根据版本号判断是否需要更新
   * 3. 创建新缓冲区或更新现有缓冲区
   * 4. 验证缓冲区大小的一致性
   *
   * @param {BufferAttribute|InterleavedBufferAttribute|GLBufferAttribute} attribute - 要更新的缓冲区属性
   * @param {number} bufferType - WebGL缓冲区类型（gl.ARRAY_BUFFER 或 gl.ELEMENT_ARRAY_BUFFER）
   */
  function update(attribute, bufferType) {
    // 如果是交错缓冲区属性，获取其底层数据
    if (attribute.isInterleavedBufferAttribute) attribute = attribute.data;

    // 处理GLBufferAttribute的特殊情况
    // GLBufferAttribute直接包含WebGL缓冲区对象，不需要创建
    if (attribute.isGLBufferAttribute) {
      const cached = buffers.get(attribute);

      // 检查是否需要更新缓存信息
      if (!cached || cached.version < attribute.version) {
        buffers.set(attribute, {
          buffer: attribute.buffer, // 直接使用已有的WebGL缓冲区
          type: attribute.type, // WebGL数据类型
          bytesPerElement: attribute.elementSize, // 每个元素的字节数
          version: attribute.version, // 版本号
        });
      }

      return;
    }

    // 处理普通BufferAttribute
    const data = buffers.get(attribute);

    if (data === undefined) {
      // 首次使用该属性，创建新的WebGL缓冲区
      buffers.set(attribute, createBuffer(attribute, bufferType));
    } else if (data.version < attribute.version) {
      // 属性已更新，需要更新WebGL缓冲区

      // 验证缓冲区大小是否一致
      // Three.js不支持动态调整缓冲区大小，这是WebGL的限制
      if (data.size !== attribute.array.byteLength) {
        throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");
      }

      // 更新现有缓冲区的数据
      updateBuffer(data.buffer, attribute, bufferType);

      // 更新版本号，标记为已同步
      data.version = attribute.version;
    }
  }

  // 返回WebGL属性管理器的公共接口
  return {
    /**
     * 获取缓冲区属性对应的WebGL缓冲区信息
     * @param {BufferAttribute} attribute - 缓冲区属性
     * @returns {Object|undefined} 缓冲区信息对象
     */
    get: get,

    /**
     * 移除缓冲区属性及其WebGL缓冲区
     * @param {BufferAttribute} attribute - 要移除的缓冲区属性
     */
    remove: remove,

    /**
     * 更新或创建缓冲区属性对应的WebGL缓冲区
     * @param {BufferAttribute} attribute - 要更新的缓冲区属性
     * @param {number} bufferType - WebGL缓冲区类型
     */
    update: update,
  };
}

// 导出WebGL属性管理器
export { WebGLAttributes };
