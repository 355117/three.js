/**
 * WebGL 对象管理器
 * 负责管理 WebGL 渲染器中的对象更新，包括几何体、实例化网格、骨骼动画等
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {WebGLGeometries} geometries - WebGL 几何体管理器
 * @param {WebGLAttributes} attributes - WebGL 属性管理器
 * @param {Object} info - 渲染信息统计对象
 * @returns {Object} 返回包含对象管理方法的对象
 */
function WebGLObjects(gl, geometries, attributes, info) {
  /**
   * 更新映射表，用于跟踪对象在当前帧的更新状态
   * 使用 WeakMap 确保当对象被垃圾回收时，对应的更新记录也会被自动清理
   * key: 对象引用, value: 最后更新的帧号
   */
  let updateMap = new WeakMap();

  /**
   * 更新对象及其相关资源
   * 确保每帧只更新一次，避免重复更新提高性能
   *
   * @param {Object3D} object - 要更新的 3D 对象
   * @returns {BufferGeometry} 返回对象的缓冲几何体
   */
  function update(object) {
    // 获取当前渲染帧号
    const frame = info.render.frame;

    // 获取对象的几何体并通过几何体管理器处理
    const geometry = object.geometry;
    const buffergeometry = geometries.get(object, geometry);

    // 每帧只更新一次几何体，避免重复更新
    // Update once per frame

    if (updateMap.get(buffergeometry) !== frame) {
      // 更新几何体的属性数据
      geometries.update(buffergeometry);

      // 记录本帧已更新该几何体
      updateMap.set(buffergeometry, frame);
    }

    // 处理实例化网格对象
    if (object.isInstancedMesh) {
      // 确保实例化网格有销毁事件监听器，用于清理资源
      if (object.hasEventListener("dispose", onInstancedMeshDispose) === false) {
        object.addEventListener("dispose", onInstancedMeshDispose);
      }

      // 每帧只更新一次实例化数据
      if (updateMap.get(object) !== frame) {
        // 更新实例矩阵数据到 GPU
        attributes.update(object.instanceMatrix, gl.ARRAY_BUFFER);

        // 如果有实例颜色数据，也更新到 GPU
        if (object.instanceColor !== null) {
          attributes.update(object.instanceColor, gl.ARRAY_BUFFER);
        }

        // 记录本帧已更新该实例化对象
        updateMap.set(object, frame);
      }
    }

    // 处理蒙皮网格对象（骨骼动画）
    if (object.isSkinnedMesh) {
      const skeleton = object.skeleton;

      // 每帧只更新一次骨骼数据
      if (updateMap.get(skeleton) !== frame) {
        // 更新骨骼变换矩阵
        skeleton.update();

        // 记录本帧已更新该骨骼
        updateMap.set(skeleton, frame);
      }
    }

    return buffergeometry;
  }

  /**
   * 销毁对象管理器，清理所有更新记录
   * 重置更新映射表，释放内存
   */
  function dispose() {
    updateMap = new WeakMap();
  }

  /**
   * 实例化网格销毁事件处理函数
   * 当实例化网格被销毁时，清理相关的实例化属性资源
   *
   * @param {Event} event - 销毁事件对象
   */
  function onInstancedMeshDispose(event) {
    const instancedMesh = event.target;

    // 移除销毁事件监听器，避免内存泄漏
    instancedMesh.removeEventListener("dispose", onInstancedMeshDispose);

    // 清理实例矩阵属性
    attributes.remove(instancedMesh.instanceMatrix);

    // 如果有实例颜色属性，也清理掉
    if (instancedMesh.instanceColor !== null) attributes.remove(instancedMesh.instanceColor);
  }

  // 返回对象管理器的公共接口
  return {
    update: update, // 更新对象及其相关资源
    dispose: dispose, // 销毁管理器并清理资源
  };
}

/**
 * 导出 WebGL 对象管理器
 */
export { WebGLObjects };
