// 导入警告工具函数，用于显示扩展不支持的警告
import { warnOnce } from "../../utils.js";

/**
 * WebGL扩展管理器
 *
 * 这个类负责管理WebGL扩展的获取、缓存和兼容性处理。
 * WebGL扩展提供了额外的功能，如压缩纹理、各向异性过滤、深度纹理等。
 * 不同浏览器对扩展的支持程度不同，需要进行兼容性检查。
 *
 * @param {WebGL2RenderingContext} gl - WebGL渲染上下文
 * @returns {Object} 扩展管理器对象，包含has、init、get方法
 */
function WebGLExtensions(gl) {
  // 扩展缓存对象，避免重复获取同一个扩展
  const extensions = {};

  /**
   * 获取指定的WebGL扩展
   *
   * 这个内部函数负责实际获取扩展，并处理浏览器兼容性问题。
   * 某些扩展在不同浏览器中有不同的前缀（MOZ_、WEBKIT_等）。
   *
   * @param {string} name - 扩展名称
   * @returns {Object|null} 扩展对象，如果不支持则返回null
   */
  function getExtension(name) {
    // 如果扩展已经被获取过，直接返回缓存的结果
    if (extensions[name] !== undefined) {
      return extensions[name];
    }

    let extension;

    // 处理需要特殊兼容性处理的扩展
    switch (name) {
      // 深度纹理扩展 - 允许将深度缓冲区作为纹理使用
      case "WEBGL_depth_texture":
        extension = gl.getExtension("WEBGL_depth_texture") || gl.getExtension("MOZ_WEBGL_depth_texture") || gl.getExtension("WEBKIT_WEBGL_depth_texture");
        break;

      // 各向异性过滤扩展 - 提供更好的纹理过滤质量
      case "EXT_texture_filter_anisotropic":
        extension =
          gl.getExtension("EXT_texture_filter_anisotropic") || gl.getExtension("MOZ_EXT_texture_filter_anisotropic") || gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
        break;

      // S3TC压缩纹理扩展 - 支持DXT压缩格式
      case "WEBGL_compressed_texture_s3tc":
        extension =
          gl.getExtension("WEBGL_compressed_texture_s3tc") || gl.getExtension("MOZ_WEBGL_compressed_texture_s3tc") || gl.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");
        break;

      // PVRTC压缩纹理扩展 - 支持PowerVR压缩格式（主要用于iOS）
      case "WEBGL_compressed_texture_pvrtc":
        extension = gl.getExtension("WEBGL_compressed_texture_pvrtc") || gl.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");
        break;

      // 其他扩展直接获取，不需要特殊处理
      default:
        extension = gl.getExtension(name);
    }

    // 缓存扩展结果（包括null值），避免重复查询
    extensions[name] = extension;

    return extension;
  }

  // 返回扩展管理器的公共接口
  return {
    /**
     * 检查指定扩展是否可用
     *
     * @param {string} name - 扩展名称
     * @returns {boolean} 如果扩展可用返回true，否则返回false
     */
    has: function (name) {
      return getExtension(name) !== null;
    },

    /**
     * 初始化常用扩展
     *
     * 这个方法在WebGL渲染器初始化时调用，预先获取一些常用的扩展。
     * 这样可以在后续使用时避免重复查询，提高性能。
     */
    init: function () {
      // 浮点颜色缓冲区扩展 - 允许使用浮点格式的颜色缓冲区
      getExtension("EXT_color_buffer_float");
      // 裁剪和剔除距离扩展 - 提供可编程的裁剪平面
      getExtension("WEBGL_clip_cull_distance");
      // 浮点纹理线性过滤扩展 - 允许对浮点纹理进行线性过滤
      getExtension("OES_texture_float_linear");
      // 半精度浮点颜色缓冲区扩展 - 允许使用16位浮点格式
      getExtension("EXT_color_buffer_half_float");
      // 多重采样渲染到纹理扩展 - 提供更高效的多重采样
      getExtension("WEBGL_multisampled_render_to_texture");
      // 共享指数渲染扩展 - 支持RGB9_E5格式
      getExtension("WEBGL_render_shared_exponent");
    },

    /**
     * 获取指定扩展
     *
     * 这是主要的扩展获取方法，如果扩展不可用会显示警告。
     *
     * @param {string} name - 扩展名称
     * @returns {Object|null} 扩展对象，如果不支持则返回null
     */
    get: function (name) {
      const extension = getExtension(name);

      // 如果扩展不可用，显示警告信息
      if (extension === null) {
        warnOnce("THREE.WebGLRenderer: " + name + " extension not supported.");
      }

      return extension;
    },
  };
}

/**
 * 导出WebGL扩展管理器
 *
 * 这个管理器是WebGL渲染器的重要组成部分，负责：
 * 1. 扩展的获取和缓存
 * 2. 浏览器兼容性处理
 * 3. 扩展可用性检查
 * 4. 常用扩展的预加载
 *
 * 通过统一的接口管理所有WebGL扩展，简化了渲染器其他部分的扩展使用。
 */
export { WebGLExtensions };
