// 导入整数类型常量
import { IntType } from "../../constants.js";

/**
 * WebGL 绑定状态管理器
 *
 * 管理 WebGL 顶点数组对象 (VAO) 的绑定状态，优化顶点属性的设置和切换。
 * VAO 可以缓存顶点属性的配置，避免重复设置相同的顶点属性状态，
 * 从而提高渲染性能。
 *
 * 主要功能：
 * - 管理顶点数组对象的创建、绑定和销毁
 * - 缓存顶点属性配置，避免重复设置
 * - 支持实例化渲染的属性除数设置
 * - 处理交错缓冲区属性
 * - 提供向后兼容性支持
 *
 * @param {WebGL2RenderingContext} gl - WebGL 渲染上下文
 * @param {WebGLAttributes} attributes - WebGL 属性管理器
 * @returns {Object} 绑定状态管理器的公共接口
 */
function WebGLBindingStates(gl, attributes) {
  // 获取 WebGL 支持的最大顶点属性数量
  const maxVertexAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);

  // 绑定状态缓存，按几何体ID -> 程序ID -> 线框模式组织
  const bindingStates = {};

  // 默认绑定状态，用于不支持 VAO 的情况
  const defaultState = createBindingState(null);
  // 当前激活的绑定状态
  let currentState = defaultState;
  // 强制更新标志，用于重置后的首次渲染
  let forceUpdate = false;

  /**
   * 设置渲染对象的顶点属性绑定状态
   *
   * 这是绑定状态管理器的核心方法，负责：
   * 1. 获取或创建适当的绑定状态
   * 2. 切换到正确的 VAO
   * 3. 检查是否需要更新缓冲区
   * 4. 设置顶点属性和索引缓冲区
   *
   * @param {Object3D} object - 要渲染的3D对象
   * @param {Material} material - 材质对象
   * @param {WebGLProgram} program - 着色器程序
   * @param {BufferGeometry} geometry - 几何体对象
   * @param {BufferAttribute} index - 索引缓冲区属性（可选）
   */
  function setup(object, material, program, geometry, index) {
    let updateBuffers = false;

    // 获取当前几何体、程序和材质组合对应的绑定状态
    const state = getBindingState(geometry, program, material);

    // 如果绑定状态发生变化，切换到新的 VAO
    if (currentState !== state) {
      currentState = state;
      bindVertexArrayObject(currentState.object);
    }

    // 检查是否需要更新缓冲区
    updateBuffers = needsUpdate(object, geometry, program, index);

    // 如果需要更新，保存当前状态到缓存
    if (updateBuffers) saveCache(object, geometry, program, index);

    // 更新索引缓冲区
    if (index !== null) {
      attributes.update(index, gl.ELEMENT_ARRAY_BUFFER);
    }

    // 如果需要更新缓冲区或强制更新，设置顶点属性
    if (updateBuffers || forceUpdate) {
      forceUpdate = false;

      // 设置所有顶点属性
      setupVertexAttributes(object, material, program, geometry);

      // 绑定索引缓冲区
      if (index !== null) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, attributes.get(index).buffer);
      }
    }
  }

  /**
   * 创建顶点数组对象 (VAO)
   *
   * VAO 可以存储顶点属性的配置状态，包括：
   * - 顶点属性指针
   * - 启用/禁用状态
   * - 属性除数（用于实例化渲染）
   *
   * @returns {WebGLVertexArrayObject} 新创建的 VAO
   */
  function createVertexArrayObject() {
    return gl.createVertexArray();
  }

  /**
   * 绑定顶点数组对象
   *
   * 绑定 VAO 会恢复之前存储的所有顶点属性配置，
   * 这比逐个设置顶点属性要高效得多。
   *
   * @param {WebGLVertexArrayObject} vao - 要绑定的 VAO
   */
  function bindVertexArrayObject(vao) {
    return gl.bindVertexArray(vao);
  }

  /**
   * 删除顶点数组对象
   *
   * 释放 VAO 占用的 GPU 资源。
   *
   * @param {WebGLVertexArrayObject} vao - 要删除的 VAO
   */
  function deleteVertexArrayObject(vao) {
    return gl.deleteVertexArray(vao);
  }

  /**
   * 获取绑定状态
   *
   * 根据几何体、着色器程序和材质的组合获取对应的绑定状态。
   * 使用三级缓存结构：几何体ID -> 程序ID -> 线框模式。
   * 这样可以为不同的渲染组合缓存独立的 VAO 状态。
   *
   * @param {BufferGeometry} geometry - 几何体对象
   * @param {WebGLProgram} program - 着色器程序
   * @param {Material} material - 材质对象
   * @returns {Object} 对应的绑定状态对象
   */
  function getBindingState(geometry, program, material) {
    // 线框模式需要单独的绑定状态
    const wireframe = material.wireframe === true;

    // 第一级：按几何体ID查找
    let programMap = bindingStates[geometry.id];

    if (programMap === undefined) {
      programMap = {};
      bindingStates[geometry.id] = programMap;
    }

    // 第二级：按程序ID查找
    let stateMap = programMap[program.id];

    if (stateMap === undefined) {
      stateMap = {};
      programMap[program.id] = stateMap;
    }

    // 第三级：按线框模式查找
    let state = stateMap[wireframe];

    if (state === undefined) {
      // 创建新的绑定状态和对应的 VAO
      state = createBindingState(createVertexArrayObject());
      stateMap[wireframe] = state;
    }

    return state;
  }

  /**
   * 创建绑定状态对象
   *
   * 绑定状态对象包含了渲染所需的所有顶点属性配置信息。
   * 这些信息用于跟踪和优化顶点属性的设置。
   *
   * @param {WebGLVertexArrayObject|null} vao - 顶点数组对象，null 表示不支持 VAO
   * @returns {Object} 绑定状态对象
   */
  function createBindingState(vao) {
    // 初始化属性数组，长度为 WebGL 支持的最大顶点属性数量
    const newAttributes = []; // 新的属性状态
    const enabledAttributes = []; // 已启用的属性状态
    const attributeDivisors = []; // 属性除数（用于实例化渲染）

    // 初始化所有属性为禁用状态
    for (let i = 0; i < maxVertexAttributes; i++) {
      newAttributes[i] = 0;
      enabledAttributes[i] = 0;
      attributeDivisors[i] = 0;
    }

    return {
      // 向后兼容性字段，用于不支持 VAO 的浏览器
      geometry: null,
      program: null,
      wireframe: false,

      // 属性状态数组
      newAttributes: newAttributes, // 当前帧的属性状态
      enabledAttributes: enabledAttributes, // 已启用的属性状态
      attributeDivisors: attributeDivisors, // 实例化属性除数
      object: vao, // VAO 对象
      attributes: {}, // 属性缓存
      index: null, // 索引缓冲区
      attributesNum: 0, // 属性数量
    };
  }

  /**
   * 检查是否需要更新顶点属性
   *
   * 比较当前的几何体属性与缓存的属性，判断是否需要重新设置顶点属性。
   * 这是性能优化的关键，避免不必要的 WebGL 状态变更。
   *
   * @param {Object3D} object - 3D对象
   * @param {BufferGeometry} geometry - 几何体
   * @param {WebGLProgram} program - 着色器程序
   * @param {BufferAttribute} index - 索引缓冲区
   * @returns {boolean} 如果需要更新返回 true，否则返回 false
   */
  function needsUpdate(object, geometry, program, index) {
    const cachedAttributes = currentState.attributes;
    const geometryAttributes = geometry.attributes;

    let attributesNum = 0;

    // 获取着色器程序中定义的所有属性
    const programAttributes = program.getAttributes();

    // 遍历程序中的每个属性
    for (const name in programAttributes) {
      const programAttribute = programAttributes[name];

      // 只检查有效的属性位置
      if (programAttribute.location >= 0) {
        const cachedAttribute = cachedAttributes[name];
        let geometryAttribute = geometryAttributes[name];

        // 处理实例化属性的特殊情况
        if (geometryAttribute === undefined) {
          if (name === "instanceMatrix" && object.instanceMatrix) geometryAttribute = object.instanceMatrix;
          if (name === "instanceColor" && object.instanceColor) geometryAttribute = object.instanceColor;
        }

        // 如果缓存中没有该属性，需要更新
        if (cachedAttribute === undefined) return true;

        // 如果属性对象发生变化，需要更新
        if (cachedAttribute.attribute !== geometryAttribute) return true;

        // 如果属性数据发生变化，需要更新
        if (geometryAttribute && cachedAttribute.data !== geometryAttribute.data) return true;

        attributesNum++;
      }
    }

    // 如果属性数量发生变化，需要更新
    if (currentState.attributesNum !== attributesNum) return true;

    // 如果索引缓冲区发生变化，需要更新
    if (currentState.index !== index) return true;

    return false;
  }

  /**
   * 保存当前属性状态到缓存
   *
   * 将当前的几何体属性和索引缓冲区信息保存到绑定状态的缓存中，
   * 用于后续的变更检测和性能优化。
   *
   * @param {Object3D} object - 3D对象
   * @param {BufferGeometry} geometry - 几何体
   * @param {WebGLProgram} program - 着色器程序
   * @param {BufferAttribute} index - 索引缓冲区
   */
  function saveCache(object, geometry, program, index) {
    const cache = {};
    const attributes = geometry.attributes;
    let attributesNum = 0;

    // 获取着色器程序中定义的所有属性
    const programAttributes = program.getAttributes();

    // 遍历程序中的每个属性
    for (const name in programAttributes) {
      const programAttribute = programAttributes[name];

      // 只缓存有效的属性位置
      if (programAttribute.location >= 0) {
        let attribute = attributes[name];

        // 处理实例化属性的特殊情况
        if (attribute === undefined) {
          if (name === "instanceMatrix" && object.instanceMatrix) attribute = object.instanceMatrix;
          if (name === "instanceColor" && object.instanceColor) attribute = object.instanceColor;
        }

        // 创建属性缓存数据
        const data = {};
        data.attribute = attribute;

        // 如果属性有数据，也缓存数据引用
        if (attribute && attribute.data) {
          data.data = attribute.data;
        }

        cache[name] = data;
        attributesNum++;
      }
    }

    // 更新当前状态的缓存
    currentState.attributes = cache;
    currentState.attributesNum = attributesNum;
    currentState.index = index;
  }

  /**
   * 初始化属性状态数组
   *
   * 将所有新属性状态重置为0，为新一轮的属性设置做准备。
   * 这通常在开始设置顶点属性之前调用。
   */
  function initAttributes() {
    const newAttributes = currentState.newAttributes;

    // 重置所有新属性状态为0（未使用）
    for (let i = 0, il = newAttributes.length; i < il; i++) {
      newAttributes[i] = 0;
    }
  }

  /**
   * 启用顶点属性
   *
   * 启用指定的顶点属性，不设置实例化除数（除数为0）。
   *
   * @param {number} attribute - 顶点属性索引
   */
  function enableAttribute(attribute) {
    enableAttributeAndDivisor(attribute, 0);
  }

  /**
   * 启用顶点属性并设置实例化除数
   *
   * 启用指定的顶点属性，并设置实例化渲染的除数。
   * 除数决定了每多少个实例更新一次该属性的值。
   *
   * @param {number} attribute - 顶点属性索引
   * @param {number} meshPerAttribute - 实例化除数，0表示每个顶点更新，1表示每个实例更新
   */
  function enableAttributeAndDivisor(attribute, meshPerAttribute) {
    const newAttributes = currentState.newAttributes;
    const enabledAttributes = currentState.enabledAttributes;
    const attributeDivisors = currentState.attributeDivisors;

    // 标记该属性为新使用的属性
    newAttributes[attribute] = 1;

    // 如果属性尚未启用，启用它
    if (enabledAttributes[attribute] === 0) {
      gl.enableVertexAttribArray(attribute);
      enabledAttributes[attribute] = 1;
    }

    // 如果实例化除数发生变化，更新它
    if (attributeDivisors[attribute] !== meshPerAttribute) {
      gl.vertexAttribDivisor(attribute, meshPerAttribute);
      attributeDivisors[attribute] = meshPerAttribute;
    }
  }

  /**
   * 禁用未使用的顶点属性
   *
   * 比较新属性状态和已启用属性状态，禁用那些不再使用的属性。
   * 这是性能优化的重要步骤，避免不必要的属性处理。
   */
  function disableUnusedAttributes() {
    const newAttributes = currentState.newAttributes;
    const enabledAttributes = currentState.enabledAttributes;

    // 遍历所有属性，禁用不再使用的属性
    for (let i = 0, il = enabledAttributes.length; i < il; i++) {
      if (enabledAttributes[i] !== newAttributes[i]) {
        gl.disableVertexAttribArray(i);
        enabledAttributes[i] = 0;
      }
    }
  }

  /**
   * 设置顶点属性指针
   *
   * 根据属性类型选择合适的 WebGL 方法设置顶点属性指针。
   * 整数类型使用 vertexAttribIPointer，浮点类型使用 vertexAttribPointer。
   *
   * @param {number} index - 属性索引
   * @param {number} size - 每个属性的组件数量（1-4）
   * @param {number} type - 数据类型（如 gl.FLOAT, gl.INT 等）
   * @param {boolean} normalized - 是否归一化
   * @param {number} stride - 步长（字节）
   * @param {number} offset - 偏移量（字节）
   * @param {boolean} integer - 是否为整数类型
   */
  function vertexAttribPointer(index, size, type, normalized, stride, offset, integer) {
    if (integer === true) {
      // 整数类型属性指针
      gl.vertexAttribIPointer(index, size, type, stride, offset);
    } else {
      // 浮点类型属性指针
      gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
    }
  }

  /**
   * 设置顶点属性
   *
   * 这是绑定状态管理器的核心方法，负责设置所有顶点属性。
   * 处理常规属性、实例化属性、交错缓冲区属性和默认属性值。
   *
   * @param {Object3D} object - 3D对象
   * @param {Material} material - 材质
   * @param {WebGLProgram} program - 着色器程序
   * @param {BufferGeometry} geometry - 几何体
   */
  function setupVertexAttributes(object, material, program, geometry) {
    // 初始化属性状态数组
    initAttributes();

    const geometryAttributes = geometry.attributes;
    const programAttributes = program.getAttributes();
    const materialDefaultAttributeValues = material.defaultAttributeValues;

    // 遍历着色器程序中定义的所有属性
    for (const name in programAttributes) {
      const programAttribute = programAttributes[name];

      // 只处理有效的属性位置
      if (programAttribute.location >= 0) {
        let geometryAttribute = geometryAttributes[name];

        // 处理实例化属性的特殊情况
        if (geometryAttribute === undefined) {
          if (name === "instanceMatrix" && object.instanceMatrix) geometryAttribute = object.instanceMatrix;
          if (name === "instanceColor" && object.instanceColor) geometryAttribute = object.instanceColor;
        }

        if (geometryAttribute !== undefined) {
          // 获取属性的基本信息
          const normalized = geometryAttribute.normalized;
          const size = geometryAttribute.itemSize;

          // 从属性管理器获取 WebGL 缓冲区信息
          const attribute = attributes.get(geometryAttribute);

          // TODO: 在上下文恢复时属性可能不可用
          if (attribute === undefined) continue;

          const buffer = attribute.buffer;
          const type = attribute.type;
          const bytesPerElement = attribute.bytesPerElement;

          // 检查是否为整数类型属性
          const integer = type === gl.INT || type === gl.UNSIGNED_INT || geometryAttribute.gpuType === IntType;

          // 处理交错缓冲区属性
          if (geometryAttribute.isInterleavedBufferAttribute) {
            const data = geometryAttribute.data;
            const stride = data.stride;
            const offset = geometryAttribute.offset;

            // 检查是否为实例化交错缓冲区
            if (data.isInstancedInterleavedBuffer) {
              // 为每个属性位置启用实例化除数
              for (let i = 0; i < programAttribute.locationSize; i++) {
                enableAttributeAndDivisor(programAttribute.location + i, data.meshPerAttribute);
              }

              // 设置几何体的最大实例数量
              if (object.isInstancedMesh !== true && geometry._maxInstanceCount === undefined) {
                geometry._maxInstanceCount = data.meshPerAttribute * data.count;
              }
            } else {
              // 普通交错缓冲区，启用所有属性位置
              for (let i = 0; i < programAttribute.locationSize; i++) {
                enableAttribute(programAttribute.location + i);
              }
            }

            // 绑定缓冲区
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

            // 为每个属性位置设置指针
            for (let i = 0; i < programAttribute.locationSize; i++) {
              vertexAttribPointer(
                programAttribute.location + i,
                size / programAttribute.locationSize,
                type,
                normalized,
                stride * bytesPerElement,
                (offset + (size / programAttribute.locationSize) * i) * bytesPerElement,
                integer
              );
            }
          } else {
            // 处理普通缓冲区属性
            if (geometryAttribute.isInstancedBufferAttribute) {
              // 实例化缓冲区属性
              for (let i = 0; i < programAttribute.locationSize; i++) {
                enableAttributeAndDivisor(programAttribute.location + i, geometryAttribute.meshPerAttribute);
              }

              // 设置几何体的最大实例数量
              if (object.isInstancedMesh !== true && geometry._maxInstanceCount === undefined) {
                geometry._maxInstanceCount = geometryAttribute.meshPerAttribute * geometryAttribute.count;
              }
            } else {
              // 普通缓冲区属性
              for (let i = 0; i < programAttribute.locationSize; i++) {
                enableAttribute(programAttribute.location + i);
              }
            }

            // 绑定缓冲区
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

            // 为每个属性位置设置指针
            for (let i = 0; i < programAttribute.locationSize; i++) {
              vertexAttribPointer(
                programAttribute.location + i,
                size / programAttribute.locationSize,
                type,
                normalized,
                size * bytesPerElement,
                (size / programAttribute.locationSize) * i * bytesPerElement,
                integer
              );
            }
          }
        } else if (materialDefaultAttributeValues !== undefined) {
          // 处理材质默认属性值
          const value = materialDefaultAttributeValues[name];

          if (value !== undefined) {
            // 根据值的长度选择合适的 WebGL 方法
            switch (value.length) {
              case 2:
                // 2D 向量属性
                gl.vertexAttrib2fv(programAttribute.location, value);
                break;

              case 3:
                // 3D 向量属性
                gl.vertexAttrib3fv(programAttribute.location, value);
                break;

              case 4:
                // 4D 向量属性（如颜色 RGBA）
                gl.vertexAttrib4fv(programAttribute.location, value);
                break;

              default:
                // 标量属性
                gl.vertexAttrib1fv(programAttribute.location, value);
            }
          }
        }
      }
    }

    // 禁用未使用的属性，完成属性设置
    disableUnusedAttributes();
  }

  /**
   * 销毁绑定状态管理器
   *
   * 清理所有缓存的绑定状态和对应的 VAO，释放 GPU 资源。
   * 通常在渲染器销毁时调用。
   */
  function dispose() {
    // 重置到默认状态
    reset();

    // 遍历所有缓存的绑定状态
    for (const geometryId in bindingStates) {
      const programMap = bindingStates[geometryId];

      for (const programId in programMap) {
        const stateMap = programMap[programId];

        for (const wireframe in stateMap) {
          // 删除 VAO 对象
          deleteVertexArrayObject(stateMap[wireframe].object);
          delete stateMap[wireframe];
        }

        delete programMap[programId];
      }

      delete bindingStates[geometryId];
    }
  }

  /**
   * 释放特定几何体的绑定状态
   *
   * 当几何体被销毁时调用，清理与该几何体相关的所有绑定状态。
   * 这是内存管理的重要部分，防止内存泄漏。
   *
   * @param {BufferGeometry} geometry - 要释放状态的几何体
   */
  function releaseStatesOfGeometry(geometry) {
    // 检查该几何体是否有缓存的状态
    if (bindingStates[geometry.id] === undefined) return;

    const programMap = bindingStates[geometry.id];

    // 遍历该几何体的所有程序状态
    for (const programId in programMap) {
      const stateMap = programMap[programId];

      for (const wireframe in stateMap) {
        // 删除 VAO 对象
        deleteVertexArrayObject(stateMap[wireframe].object);
        delete stateMap[wireframe];
      }

      delete programMap[programId];
    }

    // 删除整个几何体的状态映射
    delete bindingStates[geometry.id];
  }

  /**
   * 释放特定着色器程序的绑定状态
   *
   * 当着色器程序被销毁时调用，清理与该程序相关的所有绑定状态。
   * 遍历所有几何体，删除使用该程序的绑定状态。
   *
   * @param {WebGLProgram} program - 要释放状态的着色器程序
   */
  function releaseStatesOfProgram(program) {
    // 遍历所有几何体的绑定状态
    for (const geometryId in bindingStates) {
      const programMap = bindingStates[geometryId];

      // 检查该几何体是否使用了指定的程序
      if (programMap[program.id] === undefined) continue;

      const stateMap = programMap[program.id];

      // 删除该程序的所有绑定状态
      for (const wireframe in stateMap) {
        deleteVertexArrayObject(stateMap[wireframe].object);
        delete stateMap[wireframe];
      }

      delete programMap[program.id];
    }
  }

  /**
   * 重置绑定状态管理器
   *
   * 重置到默认状态，强制下次渲染时更新所有属性。
   * 通常在 WebGL 上下文丢失后恢复时调用。
   */
  function reset() {
    resetDefaultState();
    forceUpdate = true;

    // 如果当前状态已经是默认状态，无需切换
    if (currentState === defaultState) return;

    // 切换到默认状态
    currentState = defaultState;
    bindVertexArrayObject(currentState.object);
  }

  /**
   * 重置默认状态
   *
   * 清除默认状态中的几何体、程序和线框模式信息。
   * 用于向后兼容性支持。
   */
  function resetDefaultState() {
    defaultState.geometry = null;
    defaultState.program = null;
    defaultState.wireframe = false;
  }

  // 返回绑定状态管理器的公共接口
  return {
    // 核心方法
    setup: setup, // 设置渲染对象的绑定状态
    reset: reset, // 重置管理器状态
    resetDefaultState: resetDefaultState, // 重置默认状态（向后兼容）
    dispose: dispose, // 销毁管理器
    releaseStatesOfGeometry: releaseStatesOfGeometry, // 释放几何体状态
    releaseStatesOfProgram: releaseStatesOfProgram, // 释放程序状态

    // 属性管理方法
    initAttributes: initAttributes, // 初始化属性状态
    enableAttribute: enableAttribute, // 启用顶点属性
    disableUnusedAttributes: disableUnusedAttributes, // 禁用未使用属性
  };
}

// 导出 WebGL 绑定状态管理器
export { WebGLBindingStates };
