/**
 * 导入缓冲区属性类型，用于创建索引缓冲区
 */
import { Uint16BufferAttribute, Uint32BufferAttribute } from "../../core/BufferAttribute.js";
/**
 * 导入工具函数，用于判断数组是否需要使用 32 位索引
 */
import { arrayNeedsUint32 } from "../../utils.js";

/**
 * WebGL 几何体管理器
 * 负责管理 WebGL 渲染器中的几何体资源，包括几何体的注册、更新、线框属性生成等
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {WebGLAttributes} attributes - WebGL 属性管理器
 * @param {Object} info - 渲染信息统计对象
 * @param {WebGLBindingStates} bindingStates - WebGL 绑定状态管理器
 * @returns {Object} 返回包含几何体管理方法的对象
 */
function WebGLGeometries(gl, attributes, info, bindingStates) {
  /**
   * 存储已注册几何体的映射表
   * key: geometry.id, value: true (表示已注册)
   */
  const geometries = {};

  /**
   * 存储几何体对应的线框属性的弱映射表
   * 使用 WeakMap 确保当几何体被垃圾回收时，对应的线框属性也会被自动清理
   */
  const wireframeAttributes = new WeakMap();

  /**
   * 几何体销毁事件处理函数
   * 当几何体被销毁时，清理所有相关的 WebGL 资源和引用
   *
   * @param {Event} event - 销毁事件对象
   */
  function onGeometryDispose(event) {
    const geometry = event.target;

    // 如果几何体有索引缓冲区，从属性管理器中移除
    if (geometry.index !== null) {
      attributes.remove(geometry.index);
    }

    // 遍历并移除几何体的所有顶点属性
    for (const name in geometry.attributes) {
      attributes.remove(geometry.attributes[name]);
    }

    // 移除销毁事件监听器，避免内存泄漏
    geometry.removeEventListener("dispose", onGeometryDispose);

    // 从几何体注册表中删除该几何体
    delete geometries[geometry.id];

    // 获取并清理线框属性
    const attribute = wireframeAttributes.get(geometry);

    if (attribute) {
      attributes.remove(attribute);
      wireframeAttributes.delete(geometry);
    }

    // 释放绑定状态管理器中与该几何体相关的状态
    bindingStates.releaseStatesOfGeometry(geometry);

    // 如果是实例化缓冲几何体，清理最大实例数量缓存
    if (geometry.isInstancedBufferGeometry === true) {
      delete geometry._maxInstanceCount;
    }

    // 更新内存统计信息，减少几何体计数
    info.memory.geometries--;
  }

  /**
   * 获取并注册几何体
   * 如果几何体已经注册过，直接返回；否则注册几何体并添加销毁监听器
   *
   * @param {Object} object - 使用该几何体的对象（参数未使用，保留用于兼容性）
   * @param {BufferGeometry} geometry - 要注册的几何体
   * @returns {BufferGeometry} 返回传入的几何体
   */
  function get(object, geometry) {
    // 如果几何体已经注册，直接返回
    if (geometries[geometry.id] === true) return geometry;

    // 为几何体添加销毁事件监听器
    geometry.addEventListener("dispose", onGeometryDispose);

    // 将几何体标记为已注册
    geometries[geometry.id] = true;

    // 更新内存统计信息，增加几何体计数
    info.memory.geometries++;

    return geometry;
  }

  /**
   * 更新几何体的所有顶点属性
   * 将几何体的属性数据上传到 GPU 缓冲区
   *
   * @param {BufferGeometry} geometry - 要更新的几何体
   */
  function update(geometry) {
    const geometryAttributes = geometry.attributes;

    // 索引缓冲区现在在 VAO 中更新，参见 WebGLBindingStates
    // Updating index buffer in VAO now. See WebGLBindingStates.

    // 遍历几何体的所有属性，更新到 GPU 缓冲区
    for (const name in geometryAttributes) {
      attributes.update(geometryAttributes[name], gl.ARRAY_BUFFER);
    }
  }

  /**
   * 更新几何体的线框属性
   * 根据几何体的索引或位置属性生成线框渲染所需的索引数据
   *
   * @param {BufferGeometry} geometry - 要更新线框属性的几何体
   */
  function updateWireframeAttribute(geometry) {
    const indices = [];

    const geometryIndex = geometry.index;
    const geometryPosition = geometry.attributes.position;
    let version = 0;

    // 如果几何体有索引缓冲区，基于索引生成线框
    if (geometryIndex !== null) {
      const array = geometryIndex.array;
      version = geometryIndex.version;

      // 遍历每个三角形（每3个索引为一组）
      for (let i = 0, l = array.length; i < l; i += 3) {
        const a = array[i + 0];
        const b = array[i + 1];
        const c = array[i + 2];

        // 为每个三角形的三条边添加线段索引：a-b, b-c, c-a
        indices.push(a, b, b, c, c, a);
      }
    } else if (geometryPosition !== undefined) {
      // 如果没有索引缓冲区但有位置属性，基于顶点位置生成线框
      const array = geometryPosition.array;
      version = geometryPosition.version;

      // 遍历每个三角形（每3个顶点为一组）
      for (let i = 0, l = array.length / 3 - 1; i < l; i += 3) {
        const a = i + 0;
        const b = i + 1;
        const c = i + 2;

        // 为每个三角形的三条边添加线段索引：a-b, b-c, c-a
        indices.push(a, b, b, c, c, a);
      }
    } else {
      // 既没有索引也没有位置属性，无法生成线框
      return;
    }

    // 根据索引数组大小选择合适的缓冲区属性类型
    // 如果索引值超过 65535，使用 32 位索引，否则使用 16 位索引
    const attribute = new (arrayNeedsUint32(indices) ? Uint32BufferAttribute : Uint16BufferAttribute)(indices, 1);
    attribute.version = version;

    // 索引缓冲区现在在 VAO 中更新，参见 WebGLBindingStates
    // Updating index buffer in VAO now. See WebGLBindingStates

    // 移除之前的线框属性（如果存在）
    const previousAttribute = wireframeAttributes.get(geometry);

    if (previousAttribute) attributes.remove(previousAttribute);

    // 将新的线框属性与几何体关联
    wireframeAttributes.set(geometry, attribute);
  }

  /**
   * 获取几何体的线框属性
   * 如果线框属性不存在或已过期，会自动更新
   *
   * @param {BufferGeometry} geometry - 要获取线框属性的几何体
   * @returns {BufferAttribute} 返回线框渲染所需的索引属性
   */
  function getWireframeAttribute(geometry) {
    const currentAttribute = wireframeAttributes.get(geometry);

    if (currentAttribute) {
      const geometryIndex = geometry.index;

      if (geometryIndex !== null) {
        // 如果属性已过期（版本号小于几何体索引的版本号），创建新的线框属性
        // if the attribute is obsolete, create a new one

        if (currentAttribute.version < geometryIndex.version) {
          updateWireframeAttribute(geometry);
        }
      }
    } else {
      // 如果线框属性不存在，创建新的线框属性
      updateWireframeAttribute(geometry);
    }

    return wireframeAttributes.get(geometry);
  }

  // 返回几何体管理器的公共接口
  return {
    get: get, // 获取并注册几何体
    update: update, // 更新几何体属性

    getWireframeAttribute: getWireframeAttribute, // 获取线框属性
  };
}

/**
 * 导出 WebGL 几何体管理器
 */
export { WebGLGeometries };
