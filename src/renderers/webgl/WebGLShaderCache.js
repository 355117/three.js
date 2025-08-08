/**
 * 着色器阶段 ID 计数器
 * 用于为每个着色器阶段分配唯一的标识符
 */
let _id = 0;

/**
 * WebGL 着色器缓存管理器
 *
 * 该类负责管理和缓存着色器代码，避免重复创建相同的着色器。
 * 通过引用计数机制来跟踪着色器的使用情况，当着色器不再被使用时自动清理。
 *
 * 主要功能：
 * - 缓存着色器代码，避免重复编译
 * - 跟踪材质与着色器的关联关系
 * - 通过引用计数管理着色器生命周期
 * - 提供着色器 ID 查询功能
 */
class WebGLShaderCache {
  /**
   * 构造函数
   * 初始化着色器缓存和材质缓存
   */
  constructor() {
    /**
     * 着色器缓存
     * 键：着色器代码字符串
     * 值：WebGLShaderStage 实例
     */
    this.shaderCache = new Map();

    /**
     * 材质缓存
     * 键：材质对象
     * 值：该材质使用的着色器阶段集合 (Set)
     */
    this.materialCache = new Map();
  }

  /**
   * 更新材质的着色器缓存
   * 将材质的顶点着色器和片段着色器添加到缓存中，并更新引用计数
   *
   * @param {Material} material - 要更新的材质对象
   * @returns {WebGLShaderCache} 返回自身，支持链式调用
   */
  update(material) {
    // 获取材质的着色器代码
    const vertexShader = material.vertexShader;
    const fragmentShader = material.fragmentShader;

    // 获取或创建着色器阶段对象
    const vertexShaderStage = this._getShaderStage(vertexShader);
    const fragmentShaderStage = this._getShaderStage(fragmentShader);

    // 获取该材质的着色器集合
    const materialShaders = this._getShaderCacheForMaterial(material);

    // 如果顶点着色器尚未与该材质关联，则添加并增加引用计数
    if (materialShaders.has(vertexShaderStage) === false) {
      materialShaders.add(vertexShaderStage);
      vertexShaderStage.usedTimes++;
    }

    // 如果片段着色器尚未与该材质关联，则添加并增加引用计数
    if (materialShaders.has(fragmentShaderStage) === false) {
      materialShaders.add(fragmentShaderStage);
      fragmentShaderStage.usedTimes++;
    }

    return this;
  }

  /**
   * 移除材质的着色器缓存
   * 减少相关着色器的引用计数，当引用计数为 0 时从缓存中删除着色器
   *
   * @param {Material} material - 要移除的材质对象
   * @returns {WebGLShaderCache} 返回自身，支持链式调用
   */
  remove(material) {
    // 获取该材质使用的着色器集合
    const materialShaders = this.materialCache.get(material);

    // 遍历该材质使用的所有着色器阶段
    for (const shaderStage of materialShaders) {
      // 减少着色器的引用计数
      shaderStage.usedTimes--;

      // 如果引用计数为 0，则从着色器缓存中删除
      if (shaderStage.usedTimes === 0) this.shaderCache.delete(shaderStage.code);
    }

    // 从材质缓存中删除该材质
    this.materialCache.delete(material);

    return this;
  }

  /**
   * 获取材质顶点着色器的 ID
   *
   * @param {Material} material - 材质对象
   * @returns {number} 顶点着色器的唯一 ID
   */
  getVertexShaderID(material) {
    return this._getShaderStage(material.vertexShader).id;
  }

  /**
   * 获取材质片段着色器的 ID
   *
   * @param {Material} material - 材质对象
   * @returns {number} 片段着色器的唯一 ID
   */
  getFragmentShaderID(material) {
    return this._getShaderStage(material.fragmentShader).id;
  }

  /**
   * 清理所有缓存
   * 清空着色器缓存和材质缓存，释放内存
   */
  dispose() {
    this.shaderCache.clear();
    this.materialCache.clear();
  }

  /**
   * 获取材质的着色器缓存集合
   * 如果材质尚未有缓存集合，则创建一个新的 Set
   *
   * @param {Material} material - 材质对象
   * @returns {Set} 该材质使用的着色器阶段集合
   * @private
   */
  _getShaderCacheForMaterial(material) {
    const cache = this.materialCache;
    let set = cache.get(material);

    // 如果该材质还没有着色器集合，则创建一个新的
    if (set === undefined) {
      set = new Set();
      cache.set(material, set);
    }

    return set;
  }

  /**
   * 获取着色器阶段对象
   * 如果着色器代码尚未缓存，则创建新的 WebGLShaderStage 实例
   *
   * @param {string} code - 着色器代码字符串
   * @returns {WebGLShaderStage} 着色器阶段对象
   * @private
   */
  _getShaderStage(code) {
    const cache = this.shaderCache;
    let stage = cache.get(code);

    // 如果着色器代码尚未缓存，则创建新的着色器阶段
    if (stage === undefined) {
      stage = new WebGLShaderStage(code);
      cache.set(code, stage);
    }

    return stage;
  }
}

/**
 * WebGL 着色器阶段
 *
 * 表示一个着色器阶段（顶点着色器或片段着色器），包含着色器代码、
 * 唯一 ID 和引用计数信息。
 */
class WebGLShaderStage {
  /**
   * 构造函数
   *
   * @param {string} code - 着色器代码字符串
   */
  constructor(code) {
    /**
     * 着色器阶段的唯一 ID
     * 全局递增的标识符，用于区分不同的着色器阶段
     */
    this.id = _id++;

    /**
     * 着色器代码
     * 完整的着色器源代码字符串
     */
    this.code = code;

    /**
     * 使用次数（引用计数）
     * 跟踪有多少个材质正在使用这个着色器阶段
     */
    this.usedTimes = 0;
  }
}

/**
 * 导出 WebGL 着色器缓存管理器
 */
export { WebGLShaderCache };
