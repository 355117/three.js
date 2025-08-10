/**
 * WebGL Uniform缓冲区对象(UBO)管理器
 * 负责管理WebGL 2.0中的Uniform Buffer Objects，提供高效的uniform数据传输
 * UBO允许将多个uniform变量打包到一个缓冲区中，减少WebGL调用次数，提高性能
 *
 * @param {WebGLRenderingContext} gl - WebGL渲染上下文
 * @param {Object} info - 渲染信息对象，包含帧计数等
 * @param {Object} capabilities - WebGL能力对象
 * @param {Object} state - WebGL状态管理器
 */
function WebGLUniformsGroups(gl, info, capabilities, state) {
  // 存储所有UBO缓冲区的映射表，键为uniformsGroup.id
  let buffers = {};
  // 记录每个uniform组的最后更新帧，避免重复更新
  let updateList = {};
  // 已分配的绑定点索引数组，用于管理UBO绑定点
  let allocatedBindingPoints = [];

  // 获取GPU支持的最大uniform缓冲区绑定点数量
  // 绑定点是全局的，而块索引是每个着色器程序特有的
  const maxBindingPoints = gl.getParameter(gl.MAX_UNIFORM_BUFFER_BINDINGS);

  /**
   * 绑定uniform组到指定的着色器程序
   * 建立uniform组与着色器程序中uniform块的连接
   *
   * @param {Object} uniformsGroup - uniform组对象
   * @param {Object} program - 着色器程序对象
   */
  function bind(uniformsGroup, program) {
    // 获取WebGL着色器程序
    const webglProgram = program.program;
    // 通过状态管理器建立uniform块绑定
    state.uniformBlockBinding(uniformsGroup, webglProgram);
  }

  /**
   * 更新uniform组的数据
   * 如果是首次使用，会创建UBO缓冲区；否则只更新数据
   *
   * @param {Object} uniformsGroup - uniform组对象
   * @param {Object} program - 着色器程序对象
   */
  function update(uniformsGroup, program) {
    // 尝试获取已存在的缓冲区
    let buffer = buffers[uniformsGroup.id];

    // 如果缓冲区不存在，进行初始化
    if (buffer === undefined) {
      // 准备uniform组，计算内存布局
      prepareUniformsGroup(uniformsGroup);

      // 创建WebGL缓冲区
      buffer = createBuffer(uniformsGroup);
      // 缓存缓冲区引用
      buffers[uniformsGroup.id] = buffer;

      // 监听uniform组的销毁事件，用于清理资源
      uniformsGroup.addEventListener("dispose", onUniformsGroupsDispose);
    }

    // 确保更新此程序的绑定点/块索引映射

    // 获取WebGL着色器程序
    const webglProgram = program.program;
    // 更新UBO映射关系
    state.updateUBOMapping(uniformsGroup, webglProgram);

    // 每帧只更新一次UBO

    // 获取当前渲染帧号
    const frame = info.render.frame;

    // 检查是否需要更新（避免同一帧重复更新）
    if (updateList[uniformsGroup.id] !== frame) {
      // 更新缓冲区数据
      updateBufferData(uniformsGroup);

      // 记录更新帧号
      updateList[uniformsGroup.id] = frame;
    }
  }

  /**
   * 创建UBO缓冲区
   * UBO的设置独立于特定的着色器程序，是全局性的
   *
   * @param {Object} uniformsGroup - uniform组对象
   * @returns {WebGLBuffer} 创建的WebGL缓冲区
   */
  function createBuffer(uniformsGroup) {
    // UBO的设置独立于特定的着色器程序，是全局性的

    // 分配一个绑定点索引
    const bindingPointIndex = allocateBindingPointIndex();
    // 将绑定点索引存储到uniform组对象中
    uniformsGroup.__bindingPointIndex = bindingPointIndex;

    // 创建WebGL缓冲区对象
    const buffer = gl.createBuffer();
    // 获取uniform组的总大小（字节数）
    const size = uniformsGroup.__size;
    // 获取缓冲区使用模式（如gl.STATIC_DRAW, gl.DYNAMIC_DRAW等）
    const usage = uniformsGroup.usage;

    // 绑定缓冲区为uniform缓冲区类型
    gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
    // 分配缓冲区内存空间
    gl.bufferData(gl.UNIFORM_BUFFER, size, usage);
    // 解绑缓冲区
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    // 将缓冲区绑定到指定的绑定点
    gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPointIndex, buffer);

    // 返回创建的缓冲区
    return buffer;
  }

  /**
   * 分配绑定点索引
   * 在可用的绑定点中找到第一个未使用的索引
   *
   * @returns {number} 分配的绑定点索引
   */
  function allocateBindingPointIndex() {
    // 遍历所有可能的绑定点
    for (let i = 0; i < maxBindingPoints; i++) {
      // 检查当前索引是否未被使用
      if (allocatedBindingPoints.indexOf(i) === -1) {
        // 标记该索引为已使用
        allocatedBindingPoints.push(i);
        // 返回分配的索引
        return i;
      }
    }

    // 如果所有绑定点都已使用，输出错误信息
    console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.");

    // 返回默认索引0（可能会导致冲突）
    return 0;
  }

  /**
   * 更新缓冲区数据
   * 将uniform组中发生变化的数据更新到GPU缓冲区
   * 只更新实际发生变化的uniform，提高性能
   *
   * @param {Object} uniformsGroup - uniform组对象
   */
  function updateBufferData(uniformsGroup) {
    // 获取对应的WebGL缓冲区
    const buffer = buffers[uniformsGroup.id];
    // 获取uniform数组
    const uniforms = uniformsGroup.uniforms;
    // 获取缓存对象，用于检测变化
    const cache = uniformsGroup.__cache;

    // 绑定uniform缓冲区
    gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);

    // 遍历所有uniform
    for (let i = 0, il = uniforms.length; i < il; i++) {
      // 处理uniform数组或单个uniform
      const uniformArray = Array.isArray(uniforms[i]) ? uniforms[i] : [uniforms[i]];

      // 遍历uniform数组中的每个元素
      for (let j = 0, jl = uniformArray.length; j < jl; j++) {
        const uniform = uniformArray[j];

        // 检查uniform是否发生变化
        if (hasUniformChanged(uniform, i, j, cache) === true) {
          // 获取uniform在缓冲区中的偏移位置
          const offset = uniform.__offset;

          // 处理uniform值（可能是数组）
          const values = Array.isArray(uniform.value) ? uniform.value : [uniform.value];

          // 数组内偏移量
          let arrayOffset = 0;

          // 遍历所有值
          for (let k = 0; k < values.length; k++) {
            const value = values[k];

            // 获取值的大小信息
            const info = getUniformSize(value);

            // TODO: 添加整数和结构体支持
            if (typeof value === "number" || typeof value === "boolean") {
              // 处理标量值（数字或布尔值）
              uniform.__data[0] = value;
              gl.bufferSubData(gl.UNIFORM_BUFFER, offset + arrayOffset, uniform.__data);
            } else if (value.isMatrix3) {
              // 手动将3x3矩阵转换为3x4矩阵（STD140布局要求）

              // 第一列
              uniform.__data[0] = value.elements[0];
              uniform.__data[1] = value.elements[1];
              uniform.__data[2] = value.elements[2];
              uniform.__data[3] = 0; // 填充字节
              // 第二列
              uniform.__data[4] = value.elements[3];
              uniform.__data[5] = value.elements[4];
              uniform.__data[6] = value.elements[5];
              uniform.__data[7] = 0; // 填充字节
              // 第三列
              uniform.__data[8] = value.elements[6];
              uniform.__data[9] = value.elements[7];
              uniform.__data[10] = value.elements[8];
              uniform.__data[11] = 0; // 填充字节
            } else {
              // 处理向量、矩阵等复杂类型
              value.toArray(uniform.__data, arrayOffset);

              // 更新数组偏移量
              arrayOffset += info.storage / Float32Array.BYTES_PER_ELEMENT;
            }
          }

          // 将数据写入GPU缓冲区
          gl.bufferSubData(gl.UNIFORM_BUFFER, offset, uniform.__data);
        }
      }
    }

    // 解绑uniform缓冲区
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  }

  /**
   * 检查uniform是否发生变化
   * 通过与缓存值比较来判断是否需要更新GPU缓冲区
   * 这是性能优化的关键，避免不必要的GPU数据传输
   *
   * @param {Object} uniform - uniform对象
   * @param {number} index - uniform在数组中的索引
   * @param {number} indexArray - uniform在子数组中的索引
   * @param {Object} cache - 缓存对象
   * @returns {boolean} 是否发生变化
   */
  function hasUniformChanged(uniform, index, indexArray, cache) {
    // 获取uniform的当前值
    const value = uniform.value;
    // 生成唯一的缓存键
    const indexString = index + "_" + indexArray;

    // 检查缓存中是否存在该uniform的记录
    if (cache[indexString] === undefined) {
      // 缓存条目不存在，这是第一次检查

      if (typeof value === "number" || typeof value === "boolean") {
        // 对于基本类型，直接存储值
        cache[indexString] = value;
      } else {
        // 对于复杂类型（向量、矩阵等），存储克隆副本
        cache[indexString] = value.clone();
      }

      // 第一次检查总是返回true，需要更新
      return true;
    } else {
      // 缓存条目存在，获取缓存的对象
      const cachedObject = cache[indexString];

      // 将当前值与缓存条目进行比较

      if (typeof value === "number" || typeof value === "boolean") {
        // 基本类型直接比较值
        if (cachedObject !== value) {
          // 值发生变化，更新缓存
          cache[indexString] = value;
          return true;
        }
      } else {
        // 复杂类型使用equals方法比较
        if (cachedObject.equals(value) === false) {
          // 值发生变化，更新缓存对象
          cachedObject.copy(value);
          return true;
        }
      }
    }

    // 值未发生变化
    return false;
  }

  /**
   * 准备uniform组
   * 根据STD140布局规则计算总缓冲区大小和每个uniform的偏移位置
   * STD140是WebGL 2中唯一支持的布局标准
   *
   * @param {Object} uniformsGroup - uniform组对象
   * @returns {Object} 返回this对象
   */
  function prepareUniformsGroup(uniformsGroup) {
    // 根据STD140布局确定总缓冲区大小
    // 提示：STD140是WebGL 2中唯一支持的布局

    // 获取uniform数组
    const uniforms = uniformsGroup.uniforms;

    let offset = 0; // 全局缓冲区偏移量（字节）
    const chunkSize = 16; // 块大小（字节），STD140的基本对齐单位

    // 遍历所有uniform
    for (let i = 0, l = uniforms.length; i < l; i++) {
      // 处理uniform数组或单个uniform
      const uniformArray = Array.isArray(uniforms[i]) ? uniforms[i] : [uniforms[i]];

      // 遍历uniform数组中的每个元素
      for (let j = 0, jl = uniformArray.length; j < jl; j++) {
        const uniform = uniformArray[j];

        // 处理uniform值（可能是数组）
        const values = Array.isArray(uniform.value) ? uniform.value : [uniform.value];

        // 遍历所有值
        for (let k = 0, kl = values.length; k < kl; k++) {
          const value = values[k];

          // 获取值的大小和对齐信息
          const info = getUniformSize(value);

          // 计算当前块内的偏移量
          const chunkOffset = offset % chunkSize;
          // 计算为满足边界对齐所需的填充
          const chunkPadding = chunkOffset % info.boundary;
          // 计算数据在当前块中的起始位置
          const chunkStart = chunkOffset + chunkPadding;

          // 添加填充
          offset += chunkPadding;

          // 检查块溢出
          if (chunkStart !== 0 && chunkSize - chunkStart < info.storage) {
            // 添加填充并调整偏移量，移动到下一个块
            offset += chunkSize - chunkStart;
          }

          // 以下两个属性将用于部分缓冲区更新
          // 为uniform分配数据数组
          uniform.__data = new Float32Array(info.storage / Float32Array.BYTES_PER_ELEMENT);
          // 记录uniform在缓冲区中的偏移位置
          uniform.__offset = offset;

          // 更新全局偏移量
          offset += info.storage;
        }
      }
    }

    // 确保正确的最终填充

    // 计算最后的块偏移
    const chunkOffset = offset % chunkSize;

    // 如果不是块对齐的，添加填充到下一个块边界
    if (chunkOffset > 0) offset += chunkSize - chunkOffset;

    // 设置uniform组的总大小和缓存对象

    // 存储计算出的总大小
    uniformsGroup.__size = offset;
    // 初始化缓存对象
    uniformsGroup.__cache = {};

    // 返回this对象（链式调用）
    return this;
  }

  /**
   * 获取uniform值的大小信息
   * 根据STD140布局标准确定不同类型值的边界对齐和存储大小
   *
   * @param {*} value - uniform值
   * @returns {Object} 包含boundary和storage信息的对象
   */
  function getUniformSize(value) {
    // 初始化大小信息对象
    const info = {
      boundary: 0, // 边界对齐（字节）
      storage: 0, // 存储大小（字节）
    };

    // 根据STD140标准确定大小

    if (typeof value === "number" || typeof value === "boolean") {
      // float/int/bool 类型

      info.boundary = 4; // 4字节对齐
      info.storage = 4; // 占用4字节
    } else if (value.isVector2) {
      // vec2 类型

      info.boundary = 8; // 8字节对齐
      info.storage = 8; // 占用8字节
    } else if (value.isVector3 || value.isColor) {
      // vec3 类型

      info.boundary = 16; // 16字节对齐
      info.storage = 12; // 恶心的规则：vec3必须从16字节边界开始，但只消耗12字节
    } else if (value.isVector4) {
      // vec4 类型

      info.boundary = 16; // 16字节对齐
      info.storage = 16; // 占用16字节
    } else if (value.isMatrix3) {
      // mat3 类型（在STD140中，3x3矩阵表示为3x4）

      info.boundary = 48; // 48字节对齐
      info.storage = 48; // 占用48字节
    } else if (value.isMatrix4) {
      // mat4 类型

      info.boundary = 64; // 64字节对齐
      info.storage = 64; // 占用64字节
    } else if (value.isTexture) {
      // 纹理采样器不能作为uniform组的一部分
      console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group.");
    } else {
      // 不支持的uniform值类型
      console.warn("THREE.WebGLRenderer: Unsupported uniform value type.", value);
    }

    // 返回大小信息
    return info;
  }

  /**
   * uniform组销毁事件处理函数
   * 当uniform组被销毁时，清理相关的GPU资源和内存引用
   *
   * @param {Event} event - 销毁事件对象
   */
  function onUniformsGroupsDispose(event) {
    // 获取被销毁的uniform组
    const uniformsGroup = event.target;

    // 移除事件监听器，避免内存泄漏
    uniformsGroup.removeEventListener("dispose", onUniformsGroupsDispose);

    // 释放绑定点索引
    const index = allocatedBindingPoints.indexOf(uniformsGroup.__bindingPointIndex);
    allocatedBindingPoints.splice(index, 1);

    // 删除GPU缓冲区
    gl.deleteBuffer(buffers[uniformsGroup.id]);

    // 清理内存引用
    delete buffers[uniformsGroup.id];
    delete updateList[uniformsGroup.id];
  }

  /**
   * 销毁所有uniform组资源
   * 清理所有GPU缓冲区和内存引用，通常在渲染器销毁时调用
   */
  function dispose() {
    // 删除所有GPU缓冲区
    for (const id in buffers) {
      gl.deleteBuffer(buffers[id]);
    }

    // 重置所有管理数据
    allocatedBindingPoints = []; // 清空绑定点分配记录
    buffers = {}; // 清空缓冲区映射
    updateList = {}; // 清空更新记录
  }

  // 返回WebGL Uniform组管理器的公共接口
  return {
    /**
     * 绑定uniform组到着色器程序
     * @type {function(Object, Object): void}
     */
    bind: bind,

    /**
     * 更新uniform组数据
     * @type {function(Object, Object): void}
     */
    update: update,

    /**
     * 销毁所有资源
     * @type {function(): void}
     */
    dispose: dispose,
  };
}

// 导出WebGL Uniform组管理器
export { WebGLUniformsGroups };
