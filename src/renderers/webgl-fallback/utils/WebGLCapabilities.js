/**
 * WebGL 2后端设备能力管理工具模块
 * 用于检测和管理设备的WebGL功能特性和限制
 *
 * @private
 */
class WebGLCapabilities {
  /**
   * 构造一个新的设备能力管理工具对象
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
     * 缓存的最大各向异性过滤值
     * 用于避免重复查询GPU能力，提高性能
     *
     * @type {?number}
     * @default null
     */
    this.maxAnisotropy = null;
  }

  /**
   * 获取设备支持的最大各向异性纹理过滤值
   * 该值取决于设备硬件能力，通过`EXT_texture_filter_anisotropic`扩展获取
   * 各向异性过滤可以提高纹理在倾斜角度下的清晰度
   *
   * @return {number} 最大各向异性纹理过滤值
   */
  getMaxAnisotropy() {
    // 如果已经缓存了值，直接返回，避免重复查询
    if (this.maxAnisotropy !== null) return this.maxAnisotropy;

    // 获取WebGL渲染上下文
    const gl = this.backend.gl;
    // 获取扩展管理器
    const extensions = this.backend.extensions;

    // 检查是否支持各向异性过滤扩展
    if (extensions.has("EXT_texture_filter_anisotropic") === true) {
      // 获取各向异性过滤扩展对象
      const extension = extensions.get("EXT_texture_filter_anisotropic");

      // 查询设备支持的最大各向异性过滤值
      this.maxAnisotropy = gl.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    } else {
      // 如果不支持扩展，设置为0
      this.maxAnisotropy = 0;
    }

    // 返回最大各向异性过滤值
    return this.maxAnisotropy;
  }
}

export default WebGLCapabilities;
