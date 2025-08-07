/**
 * WebGL顶点属性管理器
 *
 * 这个类负责管理WebGL顶点缓冲区对象(VBO)，包括创建、更新和删除顶点属性缓冲区。
 * 它将Three.js的BufferAttribute对象转换为WebGL可以使用的缓冲区，
 * 并提供高效的缓冲区更新机制。
 *
 * 主要功能：
 * 1. 创建和管理WebGL缓冲区对象
 * 2. 处理不同数据类型的顶点属性
 * 3. 优化缓冲区更新操作
 * 4. 自动检测数据类型并设置正确的WebGL类型
 *
 * @param {WebGL2RenderingContext} gl - WebGL渲染上下文
 * @returns {Object} 顶点属性管理器对象
 */
function WebGLAttributes(gl) {
  // 使用WeakMap存储属性与缓冲区的映射关系，确保自动垃圾回收
  const buffers = new WeakMap();

  /**
   * 创建WebGL缓冲区
   *
   * 根据BufferAttribute的数据创建对应的WebGL缓冲区对象，
   * 并自动检测数据类型设置正确的WebGL数据类型。
   *
   * @param {BufferAttribute} attribute - Three.js的缓冲区属性对象
   * @param {number} bufferType - WebGL缓冲区类型（如gl.ARRAY_BUFFER或gl.ELEMENT_ARRAY_BUFFER）
   * @returns {Object} 包含缓冲区信息的对象
   */
  function createBuffer(attribute, bufferType) {
    // 获取属性数据
    const array = attribute.array; // 数据数组
    const usage = attribute.usage; // 使用模式（如gl.STATIC_DRAW）
    const size = array.byteLength; // 数据大小（字节）

    // 创建WebGL缓冲区对象
    const buffer = gl.createBuffer();

    // 绑定缓冲区并上传数据
    gl.bindBuffer(bufferType, buffer);
    gl.bufferData(bufferType, array, usage);

    // 调用上传回调函数
    attribute.onUploadCallback();

    // 根据数组类型确定WebGL数据类型
    let type;

    if (array instanceof Float32Array) {
      // 32位浮点数
      type = gl.FLOAT;
    } else if (typeof Float16Array !== "undefined" && array instanceof Float16Array) {
      // 16位半精度浮点数（如果支持）
      type = gl.HALF_FLOAT;
    } else if (array instanceof Uint16Array) {
      if (attribute.isFloat16BufferAttribute) {
        // 16位无符号整数作为半精度浮点数使用
        type = gl.HALF_FLOAT;
      } else {
        // 16位无符号整数
        type = gl.UNSIGNED_SHORT;
      }
    } else if (array instanceof Int16Array) {
      // 16位有符号整数
      type = gl.SHORT;
    } else if (array instanceof Uint32Array) {
      // 32位无符号整数
      type = gl.UNSIGNED_INT;
    } else if (array instanceof Int32Array) {
      // 32位有符号整数
      type = gl.INT;
    } else if (array instanceof Int8Array) {
      // 8位有符号整数
      type = gl.BYTE;
    } else if (array instanceof Uint8Array) {
      // 8位无符号整数
      type = gl.UNSIGNED_BYTE;
    } else if (array instanceof Uint8ClampedArray) {
      // 8位无符号整数（限制范围）
      type = gl.UNSIGNED_BYTE;
    } else {
      // 不支持的数据格式
      throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: " + array);
    }

    // 返回缓冲区信息对象
    return {
      buffer: buffer, // WebGL缓冲区对象
      type: type, // WebGL数据类型
      bytesPerElement: array.BYTES_PER_ELEMENT, // 每个元素的字节数
      version: attribute.version, // 属性版本号
      size: size, // 总字节数
    };
  }

  /**
   * 更新WebGL缓冲区数据
   *
   * 高效地更新已存在的WebGL缓冲区数据。支持部分更新（通过updateRanges）
   * 和全量更新，并自动优化相邻或重叠的更新范围以提高性能。
   *
   * @param {WebGLBuffer} buffer - 要更新的WebGL缓冲区对象
   * @param {BufferAttribute} attribute - 包含新数据的缓冲区属性
   * @param {number} bufferType - WebGL缓冲区类型
   */
  function updateBuffer(buffer, attribute, bufferType) {
    const array = attribute.array; // 新的数据数组
    const updateRanges = attribute.updateRanges; // 需要更新的范围列表

    // 绑定目标缓冲区
    gl.bindBuffer(bufferType, buffer);

    if (updateRanges.length === 0) {
      // 没有指定更新范围，更新整个缓冲区
      gl.bufferSubData(bufferType, 0, array);
    } else {
      // 使用部分更新优化性能
      //
      // 在应用更新范围之前，我们合并任何相邻或重叠的范围，
      // 以减少对gl.bufferSubData的调用次数。经验表明，这对于
      // 大量使用更新范围的应用程序带来了性能改进，
      // 可能是由于减少了GPU命令开销。
      //
      // 注意：为了减少帧间的垃圾回收，我们就地合并更新范围。
      // 这是安全的，因为此方法会在更新后清除更新范围。

      // 按起始位置排序更新范围
      updateRanges.sort((a, b) => a.start - b.start);

      // 就地合并更新范围，从左到右遍历现有的updateRanges数组，
      // 合并范围。这可能导致最终数组比原始数组小。
      // 此索引跟踪表示合并范围的最后一个索引，
      // 此索引之后的任何数据在合并算法完成后都可以被修剪。
      let mergeIndex = 0;

      for (let i = 1; i < updateRanges.length; i++) {
        const previousRange = updateRanges[mergeIndex];
        const range = updateRanges[i];

        // 这里加1是为了合并相邻的范围。这是安全的，
        // 因为范围操作的是正整数。
        if (range.start <= previousRange.start + previousRange.count + 1) {
          // 合并重叠或相邻的范围
          previousRange.count = Math.max(previousRange.count, range.start + range.count - previousRange.start);
        } else {
          // 范围不相邻，保留为独立范围
          ++mergeIndex;
          updateRanges[mergeIndex] = range;
        }
      }

      // 修剪数组，只包含合并后的范围
      updateRanges.length = mergeIndex + 1;

      // 应用所有合并后的更新范围
      for (let i = 0, l = updateRanges.length; i < l; i++) {
        const range = updateRanges[i];

        // 更新指定范围的缓冲区数据
        gl.bufferSubData(bufferType, range.start * array.BYTES_PER_ELEMENT, array, range.start, range.count);
      }

      // 清除更新范围，为下次更新做准备
      attribute.clearUpdateRanges();
    }

    // 调用上传完成回调
    attribute.onUploadCallback();
  }

  //

  function get(attribute) {
    if (attribute.isInterleavedBufferAttribute) attribute = attribute.data;

    return buffers.get(attribute);
  }

  function remove(attribute) {
    if (attribute.isInterleavedBufferAttribute) attribute = attribute.data;

    const data = buffers.get(attribute);

    if (data) {
      gl.deleteBuffer(data.buffer);

      buffers.delete(attribute);
    }
  }

  function update(attribute, bufferType) {
    if (attribute.isInterleavedBufferAttribute) attribute = attribute.data;

    if (attribute.isGLBufferAttribute) {
      const cached = buffers.get(attribute);

      if (!cached || cached.version < attribute.version) {
        buffers.set(attribute, {
          buffer: attribute.buffer,
          type: attribute.type,
          bytesPerElement: attribute.elementSize,
          version: attribute.version,
        });
      }

      return;
    }

    const data = buffers.get(attribute);

    if (data === undefined) {
      buffers.set(attribute, createBuffer(attribute, bufferType));
    } else if (data.version < attribute.version) {
      if (data.size !== attribute.array.byteLength) {
        throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");
      }

      updateBuffer(data.buffer, attribute, bufferType);

      data.version = attribute.version;
    }
  }

  return {
    get: get,
    remove: remove,
    update: update,
  };
}

export { WebGLAttributes };
