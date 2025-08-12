/**
 * WebGL功能特性名称映射表
 * 将WebGL扩展名称映射到对应的功能特性标识符
 * 用于统一管理和识别不同的WebGL扩展功能
 */
export const GLFeatureName = {
  // WebGL多重绘制扩展 - 允许在单次调用中绘制多个对象
  WEBGL_multi_draw: "WEBGL_multi_draw",

  // ASTC纹理压缩扩展 - 自适应可伸缩纹理压缩格式
  WEBGL_compressed_texture_astc: "texture-compression-astc",

  // ETC2纹理压缩扩展 - Ericsson纹理压缩格式第二版
  WEBGL_compressed_texture_etc: "texture-compression-etc2",

  // ETC1纹理压缩扩展 - Ericsson纹理压缩格式第一版
  WEBGL_compressed_texture_etc1: "texture-compression-etc1",

  // PVRTC纹理压缩扩展 - PowerVR纹理压缩格式
  WEBGL_compressed_texture_pvrtc: "texture-compression-pvrtc",

  // WebKit版本的PVRTC纹理压缩扩展 - 兼容WebKit浏览器
  WEBKIT_WEBGL_compressed_texture_pvrtc: "texture-compression-pvrtc",

  // S3TC纹理压缩扩展 - S3纹理压缩格式（也称为BC格式）
  WEBGL_compressed_texture_s3tc: "texture-compression-bc",

  // BPTC纹理压缩扩展 - 块压缩纹理格式
  EXT_texture_compression_bptc: "texture-compression-bptc",

  // WebGL2时间戳查询扩展 - 用于性能分析和GPU时间测量
  EXT_disjoint_timer_query_webgl2: "timestamp-query",

  // Oculus多视图扩展 - 支持VR/AR应用的多视图渲染
  OVR_multiview2: "OVR_multiview2",
};
