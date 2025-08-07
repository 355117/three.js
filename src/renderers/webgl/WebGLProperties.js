/**
 * WebGL属性管理器
 *
 * 这个类为Three.js对象提供了一个属性存储系统，用于存储与WebGL渲染相关的元数据。
 * 使用WeakMap确保当对象被垃圾回收时，相关的属性也会被自动清理，避免内存泄漏。
 *
 * 主要用途：
 * 1. 存储几何体的WebGL缓冲区信息
 * 2. 缓存材质的着色器程序
 * 3. 保存纹理的WebGL纹理对象
 * 4. 记录对象的渲染状态和优化信息
 *
 * @returns {Object} 属性管理器对象
 */
function WebGLProperties() {
  // 使用WeakMap存储对象属性，确保自动垃圾回收
  let properties = new WeakMap();

  /**
   * 检查对象是否有关联的属性
   *
   * @param {Object} object - 要检查的Three.js对象
   * @returns {boolean} 如果对象有关联属性返回true，否则返回false
   */
  function has(object) {
    return properties.has(object);
  }

  /**
   * 获取对象的属性映射
   *
   * 如果对象还没有属性映射，会自动创建一个空的映射对象。
   * 这个映射对象用于存储与该对象相关的所有WebGL属性。
   *
   * @param {Object} object - Three.js对象（如Geometry、Material、Texture等）
   * @returns {Object} 该对象的属性映射对象
   */
  function get(object) {
    let map = properties.get(object);

    // 如果对象还没有属性映射，创建一个新的
    if (map === undefined) {
      map = {};
      properties.set(object, map);
    }

    return map;
  }

  /**
   * 移除对象的所有属性
   *
   * 当对象不再需要时调用，清理相关的WebGL资源引用。
   * 通常在对象dispose时调用。
   *
   * @param {Object} object - 要移除属性的Three.js对象
   */
  function remove(object) {
    properties.delete(object);
  }

  /**
   * 更新对象的特定属性
   *
   * 这是一个便捷方法，用于设置对象属性映射中的特定键值对。
   *
   * @param {Object} object - Three.js对象
   * @param {string} key - 属性键名
   * @param {*} value - 属性值
   */
  function update(object, key, value) {
    properties.get(object)[key] = value;
  }

  /**
   * 清理所有属性
   *
   * 重新创建WeakMap，清除所有存储的属性。
   * 通常在渲染器dispose时调用，确保完全清理内存。
   */
  function dispose() {
    properties = new WeakMap();
  }

  // 返回属性管理器的公共接口
  return {
    has: has, // 检查对象是否有属性
    get: get, // 获取对象的属性映射
    remove: remove, // 移除对象的属性
    update: update, // 更新对象的特定属性
    dispose: dispose, // 清理所有属性
  };
}

/**
 * 导出WebGL属性管理器
 *
 * 这个属性管理器是WebGL渲染器的重要组成部分，它提供：
 * 1. 对象与WebGL资源的关联存储
 * 2. 自动内存管理（通过WeakMap）
 * 3. 高效的属性查找和更新
 * 4. 统一的资源清理接口
 *
 * 使用示例：
 * - 存储几何体的VAO和VBO
 * - 缓存材质编译的着色器程序
 * - 保存纹理的WebGL纹理对象和状态
 * - 记录对象的渲染统计信息
 */
export { WebGLProperties };
