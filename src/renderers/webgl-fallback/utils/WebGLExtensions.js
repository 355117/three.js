/**
 * WebGL 2后端扩展管理工具模块
 * 负责管理和获取WebGL扩展，提供统一的扩展访问接口
 *
 * @private
 */
class WebGLExtensions {
  /**
   * 构造一个新的扩展管理工具对象
   *
   * @param {WebGLBackend} backend - WebGL 2后端实例
   */
  constructor(backend) {
    /**
     * WebGL 2后端的引用
     * 用于访问渲染上下文和其他后端功能
     *
     * @type {WebGLBackend}
     */
    this.backend = backend;

    /**
     * WebGL渲染上下文的引用
     * 直接引用以便快速访问WebGL API
     *
     * @type {WebGL2RenderingContext}
     */
    this.gl = this.backend.gl;

    /**
     * 设备支持的所有WebGL扩展列表
     * 在构造时一次性获取，避免重复查询
     *
     * @type {Array<string>}
     */
    this.availableExtensions = this.gl.getSupportedExtensions();

    /**
     * 已请求的WebGL扩展对象缓存字典
     * 键为扩展名称，值为对应的扩展对象
     * 用于缓存已获取的扩展，提高性能
     *
     * @type {Object<string,Object>}
     */
    this.extensions = {};
  }

  /**
   * 根据扩展名称获取对应的扩展对象
   * 如果扩展尚未被请求，则从WebGL上下文中获取并缓存
   *
   * @param {string} name - 扩展名称
   * @return {Object} 扩展对象，如果不支持则返回null
   */
  get(name) {
    // 从缓存中查找扩展对象
    let extension = this.extensions[name];

    // 如果扩展尚未被请求过
    if (extension === undefined) {
      // 从WebGL上下文中获取扩展
      extension = this.gl.getExtension(name);

      // 将扩展对象缓存起来（可能为null）
      this.extensions[name] = extension;
    }

    // 返回扩展对象
    return extension;
  }

  /**
   * 检查指定的扩展是否可用
   * 通过查询设备支持的扩展列表来判断
   *
   * @param {string} name - 扩展名称
   * @return {boolean} 如果扩展可用返回true，否则返回false
   */
  has(name) {
    // 在可用扩展列表中查找指定的扩展名称
    return this.availableExtensions.includes(name);
  }
}

export default WebGLExtensions;
