/**
 * 画家算法稳定排序函数（从前到后）
 * 用于不透明物体的排序，按照以下优先级排序：
 * 1. 组顺序 (groupOrder) - 最高优先级
 * 2. 渲染顺序 (renderOrder) - 用户自定义渲染顺序
 * 3. 材质ID (material.id) - 相同材质的物体聚集在一起，减少状态切换
 * 4. Z深度 (z) - 从前到后排序，有利于早期Z测试优化
 * 5. 物体ID (id) - 确保排序的稳定性
 *
 * @param {Object} a - 渲染项A
 * @param {Object} b - 渲染项B
 * @returns {number} 排序比较结果
 */
function painterSortStable(a, b) {
  // 首先按组顺序排序（最高优先级）
  if (a.groupOrder !== b.groupOrder) {
    return a.groupOrder - b.groupOrder;
  } else if (a.renderOrder !== b.renderOrder) {
    // 按用户定义的渲染顺序排序

    return a.renderOrder - b.renderOrder;
  } else if (a.material.id !== b.material.id) {
    // 按材质ID排序，相同材质的物体聚集在一起，减少GPU状态切换

    return a.material.id - b.material.id;
  } else if (a.z !== b.z) {
    // 按Z深度从前到后排序，有利于早期Z测试优化

    return a.z - b.z;
  } else {
    // 最后按物体ID排序，确保排序结果的稳定性

    return a.id - b.id;
  }
}

/**
 * 反向画家算法稳定排序函数（从后到前）
 * 用于透明物体的排序，透明物体需要从后到前渲染以正确混合
 * 排序优先级与painterSortStable相同，但Z深度排序相反
 *
 * @param {Object} a - 渲染项A
 * @param {Object} b - 渲染项B
 * @returns {number} 排序比较结果
 */
function reversePainterSortStable(a, b) {
  // 首先按组顺序排序（最高优先级）
  if (a.groupOrder !== b.groupOrder) {
    return a.groupOrder - b.groupOrder;
  } else if (a.renderOrder !== b.renderOrder) {
    // 按用户定义的渲染顺序排序

    return a.renderOrder - b.renderOrder;
  } else if (a.z !== b.z) {
    // 按Z深度从后到前排序（注意这里是b.z - a.z，与正向排序相反）
    // 透明物体必须从后到前渲染以正确处理Alpha混合

    return b.z - a.z;
  } else {
    // 最后按物体ID排序，确保排序结果的稳定性

    return a.id - b.id;
  }
}

/**
 * WebGL渲染列表
 * 管理单个场景的渲染项，将物体按照渲染类型分类并排序
 * 这是Three.js渲染管线中的核心组件，负责优化渲染顺序以提高性能
 */
function WebGLRenderList() {
  // 渲染项池，重用对象以减少垃圾回收
  const renderItems = [];
  // 当前渲染项索引，指向下一个可用的渲染项位置
  let renderItemsIndex = 0;

  // 不透明物体渲染列表（从前到后渲染，利用Z-buffer优化）
  const opaque = [];
  // 透射物体渲染列表（具有transmission属性的材质）
  const transmissive = [];
  // 透明物体渲染列表（从后到前渲染，正确处理Alpha混合）
  const transparent = [];

  /**
   * 初始化渲染列表
   * 重置所有计数器和列表，为新的渲染帧做准备
   */
  function init() {
    // 重置渲染项索引到开始位置
    renderItemsIndex = 0;

    // 清空所有渲染列表（但保留数组对象以避免重新分配内存）
    opaque.length = 0; // 清空不透明物体列表
    transmissive.length = 0; // 清空透射物体列表
    transparent.length = 0; // 清空透明物体列表
  }

  /**
   * 获取下一个可用的渲染项
   * 使用对象池模式重用渲染项对象，避免频繁的内存分配和垃圾回收
   *
   * @param {Object3D} object - 要渲染的3D对象
   * @param {BufferGeometry} geometry - 几何体
   * @param {Material} material - 材质
   * @param {number} groupOrder - 组渲染顺序
   * @param {number} z - Z深度值（相机空间）
   * @param {Group} group - 几何体组（用于多材质对象）
   * @returns {Object} 渲染项对象
   */
  function getNextRenderItem(object, geometry, material, groupOrder, z, group) {
    // 尝试从对象池中获取现有的渲染项
    let renderItem = renderItems[renderItemsIndex];

    // 如果对象池中没有可用的渲染项，创建新的
    if (renderItem === undefined) {
      renderItem = {
        id: object.id, // 对象唯一标识符
        object: object, // 3D对象引用
        geometry: geometry, // 几何体引用
        material: material, // 材质引用
        groupOrder: groupOrder, // 组渲染顺序（最高优先级）
        renderOrder: object.renderOrder, // 对象自定义渲染顺序
        z: z, // Z深度值（用于深度排序）
        group: group, // 几何体组引用
      };

      // 将新创建的渲染项添加到对象池中
      renderItems[renderItemsIndex] = renderItem;
    } else {
      // 重用现有的渲染项对象，更新其属性
      renderItem.id = object.id; // 更新对象ID
      renderItem.object = object; // 更新对象引用
      renderItem.geometry = geometry; // 更新几何体引用
      renderItem.material = material; // 更新材质引用
      renderItem.groupOrder = groupOrder; // 更新组顺序
      renderItem.renderOrder = object.renderOrder; // 更新渲染顺序
      renderItem.z = z; // 更新Z深度
      renderItem.group = group; // 更新组引用
    }

    // 移动到下一个渲染项位置
    renderItemsIndex++;

    // 返回配置好的渲染项
    return renderItem;
  }

  /**
   * 将渲染项添加到相应列表的末尾
   * 根据材质属性自动分类到不同的渲染列表中
   *
   * @param {Object3D} object - 要渲染的3D对象
   * @param {BufferGeometry} geometry - 几何体
   * @param {Material} material - 材质
   * @param {number} groupOrder - 组渲染顺序
   * @param {number} z - Z深度值
   * @param {Group} group - 几何体组
   */
  function push(object, geometry, material, groupOrder, z, group) {
    // 获取或创建渲染项
    const renderItem = getNextRenderItem(object, geometry, material, groupOrder, z, group);

    // 根据材质属性分类到不同的渲染列表
    if (material.transmission > 0.0) {
      // 透射材质（如玻璃、水等）需要特殊处理
      transmissive.push(renderItem);
    } else if (material.transparent === true) {
      // 透明材质需要从后到前渲染以正确混合
      transparent.push(renderItem);
    } else {
      // 不透明材质从前到后渲染，利用Z-buffer优化
      opaque.push(renderItem);
    }
  }

  /**
   * 将渲染项添加到相应列表的开头
   * 用于需要优先渲染的物体（如背景、天空盒等）
   *
   * @param {Object3D} object - 要渲染的3D对象
   * @param {BufferGeometry} geometry - 几何体
   * @param {Material} material - 材质
   * @param {number} groupOrder - 组渲染顺序
   * @param {number} z - Z深度值
   * @param {Group} group - 几何体组
   */
  function unshift(object, geometry, material, groupOrder, z, group) {
    // 获取或创建渲染项
    const renderItem = getNextRenderItem(object, geometry, material, groupOrder, z, group);

    // 根据材质属性分类到不同的渲染列表的开头
    if (material.transmission > 0.0) {
      // 透射材质添加到列表开头
      transmissive.unshift(renderItem);
    } else if (material.transparent === true) {
      // 透明材质添加到列表开头
      transparent.unshift(renderItem);
    } else {
      // 不透明材质添加到列表开头
      opaque.unshift(renderItem);
    }
  }

  /**
   * 对所有渲染列表进行排序
   * 使用不同的排序算法优化不同类型物体的渲染顺序
   *
   * @param {Function} customOpaqueSort - 自定义不透明物体排序函数
   * @param {Function} customTransparentSort - 自定义透明物体排序函数
   */
  function sort(customOpaqueSort, customTransparentSort) {
    // 对不透明物体排序（从前到后，利用早期Z测试优化）
    if (opaque.length > 1) opaque.sort(customOpaqueSort || painterSortStable);
    // 对透射物体排序（从后到前，正确处理透射效果）
    if (transmissive.length > 1) transmissive.sort(customTransparentSort || reversePainterSortStable);
    // 对透明物体排序（从后到前，正确处理Alpha混合）
    if (transparent.length > 1) transparent.sort(customTransparentSort || reversePainterSortStable);
  }

  /**
   * 完成渲染列表处理
   * 清理未使用的渲染项引用，防止内存泄漏
   * 这是对象池管理的重要部分，确保不再使用的对象能被垃圾回收
   */
  function finish() {
    // 清理渲染项池中未使用项的引用，防止内存泄漏

    // 遍历从当前索引到数组末尾的所有未使用渲染项
    for (let i = renderItemsIndex, il = renderItems.length; i < il; i++) {
      const renderItem = renderItems[i];

      // 如果遇到已经清理过的项（id为null），提前退出循环
      if (renderItem.id === null) break;

      // 清理所有对象引用，允许垃圾回收器回收这些对象
      renderItem.id = null; // 清理对象ID引用
      renderItem.object = null; // 清理3D对象引用
      renderItem.geometry = null; // 清理几何体引用
      renderItem.material = null; // 清理材质引用
      renderItem.group = null; // 清理组引用
    }
  }

  // 返回WebGL渲染列表的公共接口
  return {
    // 渲染列表数组（只读访问）
    opaque: opaque, // 不透明物体列表
    transmissive: transmissive, // 透射物体列表
    transparent: transparent, // 透明物体列表

    // 管理方法
    init: init, // 初始化列表
    push: push, // 添加到列表末尾
    unshift: unshift, // 添加到列表开头
    finish: finish, // 完成处理并清理

    // 排序方法
    sort: sort, // 对所有列表进行排序
  };
}

/**
 * WebGL渲染列表管理器
 * 管理多个场景和多层渲染调用的渲染列表
 * 使用WeakMap确保当场景被销毁时，相关的渲染列表也能被垃圾回收
 * 支持递归渲染调用（如渲染到纹理、反射、阴影等）
 */
function WebGLRenderLists() {
  // 使用WeakMap存储场景到渲染列表数组的映射
  // WeakMap的优势：当场景对象被销毁时，对应的渲染列表也会自动被垃圾回收
  let lists = new WeakMap();

  /**
   * 获取指定场景和渲染深度的渲染列表
   * 支持多层嵌套渲染调用，每一层都有独立的渲染列表
   *
   * @param {Scene} scene - 要渲染的场景对象
   * @param {number} renderCallDepth - 渲染调用深度（0为主渲染，1+为嵌套渲染）
   * @returns {WebGLRenderList} 对应的渲染列表实例
   */
  function get(scene, renderCallDepth) {
    // 尝试获取该场景的渲染列表数组
    const listArray = lists.get(scene);
    let list;

    // 如果该场景还没有渲染列表数组，创建新的
    if (listArray === undefined) {
      // 创建新的渲染列表实例
      list = new WebGLRenderList();
      // 为该场景创建渲染列表数组，并添加第一个列表
      lists.set(scene, [list]);
    } else {
      // 场景已有渲染列表数组，检查是否需要扩展
      if (renderCallDepth >= listArray.length) {
        // 当前渲染深度超出现有数组长度，需要创建新的渲染列表
        list = new WebGLRenderList();
        // 将新列表添加到数组末尾
        listArray.push(list);
      } else {
        // 使用现有的渲染列表
        list = listArray[renderCallDepth];
      }
    }

    // 返回对应深度的渲染列表
    return list;
  }

  /**
   * 释放所有渲染列表
   * 清理内存，通常在渲染器销毁时调用
   */
  function dispose() {
    // 重新创建WeakMap，释放所有存储的渲染列表
    lists = new WeakMap();
  }

  // 返回渲染列表管理器的公共接口
  return {
    /**
     * 获取渲染列表的方法
     * @type {function(Scene, number): WebGLRenderList}
     */
    get: get,

    /**
     * 释放资源的方法
     * @type {function(): void}
     */
    dispose: dispose,
  };
}

// 导出渲染列表相关的类和函数
export { WebGLRenderLists, WebGLRenderList };
