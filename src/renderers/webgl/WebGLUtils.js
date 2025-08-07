// 导入Three.js的纹理格式常量和数据类型常量
// 包括各种压缩纹理格式（ASTC、ETC、PVRTC、S3TC、BPTC、RGTC）和基础格式
import {
  RGBA_ASTC_4x4_Format,
  RGBA_ASTC_5x4_Format,
  RGBA_ASTC_5x5_Format,
  RGBA_ASTC_6x5_Format,
  RGBA_ASTC_6x6_Format,
  RGBA_ASTC_8x5_Format,
  RGBA_ASTC_8x6_Format,
  RGBA_ASTC_8x8_Format,
  RGBA_ASTC_10x5_Format,
  RGBA_ASTC_10x6_Format,
  RGBA_ASTC_10x8_Format,
  RGBA_ASTC_10x10_Format,
  RGBA_ASTC_12x10_Format,
  RGBA_ASTC_12x12_Format,
  RGB_ETC1_Format,
  RGB_ETC2_Format,
  RGBA_ETC2_EAC_Format,
  RGBA_PVRTC_2BPPV1_Format,
  RGBA_PVRTC_4BPPV1_Format,
  RGB_PVRTC_2BPPV1_Format,
  RGB_PVRTC_4BPPV1_Format,
  RGBA_S3TC_DXT5_Format,
  RGBA_S3TC_DXT3_Format,
  RGBA_S3TC_DXT1_Format,
  RGB_S3TC_DXT1_Format,
  DepthFormat,
  DepthStencilFormat,
  RedFormat,
  RGBAFormat,
  AlphaFormat,
  RedIntegerFormat,
  RGFormat,
  RGIntegerFormat,
  RGBAIntegerFormat,
  HalfFloatType,
  FloatType,
  UnsignedIntType,
  IntType,
  UnsignedShortType,
  ShortType,
  ByteType,
  UnsignedInt248Type,
  UnsignedShort5551Type,
  UnsignedShort4444Type,
  UnsignedByteType,
  RGBA_BPTC_Format,
  RGB_BPTC_SIGNED_Format,
  RGB_BPTC_UNSIGNED_Format,
  RED_RGTC1_Format,
  SIGNED_RED_RGTC1_Format,
  RED_GREEN_RGTC2_Format,
  SIGNED_RED_GREEN_RGTC2_Format,
  NoColorSpace,
  SRGBTransfer,
  UnsignedInt5999Type,
  RGBFormat,
} from "../../constants.js";
// 导入颜色管理模块，用于处理颜色空间转换
import { ColorManagement } from "../../math/ColorManagement.js";

/**
 * WebGL工具类
 *
 * 这个工具类主要负责将Three.js的内部格式常量转换为对应的WebGL常量。
 * 它是WebGL渲染器的基础工具，处理各种数据类型、纹理格式和压缩格式的转换。
 *
 * @param {WebGL2RenderingContext} gl - WebGL渲染上下文
 * @param {WebGLExtensions} extensions - WebGL扩展管理器
 * @returns {Object} 包含convert方法的工具对象
 */
function WebGLUtils(gl, extensions) {
  /**
   * 格式转换函数
   *
   * 将Three.js的内部格式常量转换为对应的WebGL常量。
   * 支持数据类型、纹理格式、压缩纹理格式等的转换。
   *
   * @param {number} p - Three.js格式常量
   * @param {string} colorSpace - 颜色空间，默认为NoColorSpace
   * @returns {number|null} 对应的WebGL常量，如果不支持则返回null
   */
  function convert(p, colorSpace = NoColorSpace) {
    let extension; // 用于存储WebGL扩展对象

    // 获取颜色空间的传输函数（线性或sRGB）
    const transfer = ColorManagement.getTransfer(colorSpace);

    // ===== 数据类型转换 =====
    // 处理各种数据类型的转换，这些类型用于顶点属性和纹理数据

    // 无符号字节类型 (0-255)
    if (p === UnsignedByteType) return gl.UNSIGNED_BYTE;
    // 无符号短整型4444格式 (RGBA各4位)
    if (p === UnsignedShort4444Type) return gl.UNSIGNED_SHORT_4_4_4_4;
    // 无符号短整型5551格式 (RGB各5位，A1位)
    if (p === UnsignedShort5551Type) return gl.UNSIGNED_SHORT_5_5_5_1;
    // 无符号整型5999格式 (RGB共享指数格式)
    if (p === UnsignedInt5999Type) return gl.UNSIGNED_INT_5_9_9_9_REV;

    // 有符号字节类型 (-128到127)
    if (p === ByteType) return gl.BYTE;
    // 有符号短整型 (-32768到32767)
    if (p === ShortType) return gl.SHORT;
    // 无符号短整型 (0-65535)
    if (p === UnsignedShortType) return gl.UNSIGNED_SHORT;
    // 有符号整型
    if (p === IntType) return gl.INT;
    // 无符号整型
    if (p === UnsignedIntType) return gl.UNSIGNED_INT;
    // 32位浮点数
    if (p === FloatType) return gl.FLOAT;
    // 16位半精度浮点数
    if (p === HalfFloatType) return gl.HALF_FLOAT;

    // ===== 基础纹理格式转换 =====
    // 处理WebGL 1.0支持的基础纹理格式

    // Alpha通道格式（只有透明度信息）
    if (p === AlphaFormat) return gl.ALPHA;
    // RGB格式（红绿蓝三通道）
    if (p === RGBFormat) return gl.RGB;
    // RGBA格式（红绿蓝透明度四通道）
    if (p === RGBAFormat) return gl.RGBA;
    // 深度格式（用于深度缓冲）
    if (p === DepthFormat) return gl.DEPTH_COMPONENT;
    // 深度模板格式（深度+模板缓冲）
    if (p === DepthStencilFormat) return gl.DEPTH_STENCIL;

    // ===== WebGL2专用格式 =====
    // 这些格式只在WebGL 2.0中可用

    // 单通道红色格式
    if (p === RedFormat) return gl.RED;
    // 单通道红色整数格式
    if (p === RedIntegerFormat) return gl.RED_INTEGER;
    // 双通道红绿格式
    if (p === RGFormat) return gl.RG;
    // 双通道红绿整数格式
    if (p === RGIntegerFormat) return gl.RG_INTEGER;
    // 四通道RGBA整数格式
    if (p === RGBAIntegerFormat) return gl.RGBA_INTEGER;

    // ===== S3TC压缩纹理格式 =====
    // S3TC (S3 Texture Compression) 是一种块压缩格式，主要用于桌面GPU
    // DXT1: 4:1压缩比，适用于不透明纹理或1位alpha
    // DXT3: 8:1压缩比，适用于尖锐alpha过渡
    // DXT5: 8:1压缩比，适用于平滑alpha过渡

    if (p === RGB_S3TC_DXT1_Format || p === RGBA_S3TC_DXT1_Format || p === RGBA_S3TC_DXT3_Format || p === RGBA_S3TC_DXT5_Format) {
      // 检查是否需要sRGB颜色空间
      if (transfer === SRGBTransfer) {
        // 获取sRGB版本的S3TC扩展
        extension = extensions.get("WEBGL_compressed_texture_s3tc_srgb");

        if (extension !== null) {
          // sRGB版本的S3TC格式
          if (p === RGB_S3TC_DXT1_Format) return extension.COMPRESSED_SRGB_S3TC_DXT1_EXT;
          if (p === RGBA_S3TC_DXT1_Format) return extension.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;
          if (p === RGBA_S3TC_DXT3_Format) return extension.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;
          if (p === RGBA_S3TC_DXT5_Format) return extension.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT;
        } else {
          // 不支持sRGB版本的S3TC扩展
          return null;
        }
      } else {
        // 获取标准的S3TC扩展
        extension = extensions.get("WEBGL_compressed_texture_s3tc");

        if (extension !== null) {
          // 线性颜色空间的S3TC格式
          if (p === RGB_S3TC_DXT1_Format) return extension.COMPRESSED_RGB_S3TC_DXT1_EXT;
          if (p === RGBA_S3TC_DXT1_Format) return extension.COMPRESSED_RGBA_S3TC_DXT1_EXT;
          if (p === RGBA_S3TC_DXT3_Format) return extension.COMPRESSED_RGBA_S3TC_DXT3_EXT;
          if (p === RGBA_S3TC_DXT5_Format) return extension.COMPRESSED_RGBA_S3TC_DXT5_EXT;
        } else {
          // 不支持S3TC扩展
          return null;
        }
      }
    }

    // ===== PVRTC压缩纹理格式 =====
    // PVRTC (PowerVR Texture Compression) 是PowerVR GPU专用的压缩格式
    // 主要用于移动设备（iOS设备），提供4BPP和2BPP两种压缩率

    if (p === RGB_PVRTC_4BPPV1_Format || p === RGB_PVRTC_2BPPV1_Format || p === RGBA_PVRTC_4BPPV1_Format || p === RGBA_PVRTC_2BPPV1_Format) {
      // 获取PVRTC扩展
      extension = extensions.get("WEBGL_compressed_texture_pvrtc");

      if (extension !== null) {
        // 4BPP (每像素4位) RGB格式
        if (p === RGB_PVRTC_4BPPV1_Format) return extension.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
        // 2BPP (每像素2位) RGB格式，更高压缩率
        if (p === RGB_PVRTC_2BPPV1_Format) return extension.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
        // 4BPP RGBA格式，支持透明度
        if (p === RGBA_PVRTC_4BPPV1_Format) return extension.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
        // 2BPP RGBA格式，支持透明度且高压缩率
        if (p === RGBA_PVRTC_2BPPV1_Format) return extension.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;
      } else {
        // 不支持PVRTC扩展
        return null;
      }
    }

    // ===== ETC压缩纹理格式 =====
    // ETC (Ericsson Texture Compression) 是移动设备广泛支持的压缩格式
    // ETC1: 只支持RGB，不支持透明度
    // ETC2: 支持RGB和RGBA，向后兼容ETC1

    if (p === RGB_ETC1_Format || p === RGB_ETC2_Format || p === RGBA_ETC2_EAC_Format) {
      // 获取ETC扩展
      extension = extensions.get("WEBGL_compressed_texture_etc");

      if (extension !== null) {
        // ETC1和ETC2的RGB格式处理
        if (p === RGB_ETC1_Format || p === RGB_ETC2_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ETC2 : extension.COMPRESSED_RGB8_ETC2;
        // ETC2的RGBA格式，使用EAC (ETC2 Alpha Compression) 处理alpha通道
        if (p === RGBA_ETC2_EAC_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC : extension.COMPRESSED_RGBA8_ETC2_EAC;
      } else {
        // 不支持ETC扩展
        return null;
      }
    }

    // ===== ASTC压缩纹理格式 =====
    // ASTC (Adaptive Scalable Texture Compression) 是最新的压缩格式
    // 支持多种块大小，提供灵活的压缩率和质量平衡
    // 块大小越小质量越好但压缩率越低，块大小越大压缩率越高但质量越低

    if (
      p === RGBA_ASTC_4x4_Format || // 4x4块，最高质量
      p === RGBA_ASTC_5x4_Format || // 5x4块
      p === RGBA_ASTC_5x5_Format || // 5x5块
      p === RGBA_ASTC_6x5_Format || // 6x5块
      p === RGBA_ASTC_6x6_Format || // 6x6块
      p === RGBA_ASTC_8x5_Format || // 8x5块
      p === RGBA_ASTC_8x6_Format || // 8x6块
      p === RGBA_ASTC_8x8_Format || // 8x8块，平衡质量和压缩率
      p === RGBA_ASTC_10x5_Format || // 10x5块
      p === RGBA_ASTC_10x6_Format || // 10x6块
      p === RGBA_ASTC_10x8_Format || // 10x8块
      p === RGBA_ASTC_10x10_Format || // 10x10块
      p === RGBA_ASTC_12x10_Format || // 12x10块
      p === RGBA_ASTC_12x12_Format // 12x12块，最高压缩率
    ) {
      // 获取ASTC扩展
      extension = extensions.get("WEBGL_compressed_texture_astc");

      if (extension !== null) {
        // 根据颜色空间选择对应的ASTC格式
        // 每种块大小都有线性和sRGB两个版本
        if (p === RGBA_ASTC_4x4_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR : extension.COMPRESSED_RGBA_ASTC_4x4_KHR;
        if (p === RGBA_ASTC_5x4_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR : extension.COMPRESSED_RGBA_ASTC_5x4_KHR;
        if (p === RGBA_ASTC_5x5_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR : extension.COMPRESSED_RGBA_ASTC_5x5_KHR;
        if (p === RGBA_ASTC_6x5_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR : extension.COMPRESSED_RGBA_ASTC_6x5_KHR;
        if (p === RGBA_ASTC_6x6_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR : extension.COMPRESSED_RGBA_ASTC_6x6_KHR;
        if (p === RGBA_ASTC_8x5_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR : extension.COMPRESSED_RGBA_ASTC_8x5_KHR;
        if (p === RGBA_ASTC_8x6_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR : extension.COMPRESSED_RGBA_ASTC_8x6_KHR;
        if (p === RGBA_ASTC_8x8_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR : extension.COMPRESSED_RGBA_ASTC_8x8_KHR;
        if (p === RGBA_ASTC_10x5_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR : extension.COMPRESSED_RGBA_ASTC_10x5_KHR;
        if (p === RGBA_ASTC_10x6_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR : extension.COMPRESSED_RGBA_ASTC_10x6_KHR;
        if (p === RGBA_ASTC_10x8_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR : extension.COMPRESSED_RGBA_ASTC_10x8_KHR;
        if (p === RGBA_ASTC_10x10_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR : extension.COMPRESSED_RGBA_ASTC_10x10_KHR;
        if (p === RGBA_ASTC_12x10_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR : extension.COMPRESSED_RGBA_ASTC_12x10_KHR;
        if (p === RGBA_ASTC_12x12_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR : extension.COMPRESSED_RGBA_ASTC_12x12_KHR;
      } else {
        // 不支持ASTC扩展
        return null;
      }
    }

    // ===== BPTC压缩纹理格式 =====
    // BPTC (Block-based Texture Compression) 是DirectX 11引入的高质量压缩格式
    // 支持HDR纹理和高质量的RGBA压缩

    if (p === RGBA_BPTC_Format || p === RGB_BPTC_SIGNED_Format || p === RGB_BPTC_UNSIGNED_Format) {
      // 获取BPTC扩展
      extension = extensions.get("EXT_texture_compression_bptc");

      if (extension !== null) {
        // RGBA BPTC格式，支持sRGB和线性颜色空间
        if (p === RGBA_BPTC_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT : extension.COMPRESSED_RGBA_BPTC_UNORM_EXT;
        // RGB BPTC有符号浮点格式，用于HDR纹理
        if (p === RGB_BPTC_SIGNED_Format) return extension.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;
        // RGB BPTC无符号浮点格式，用于HDR纹理
        if (p === RGB_BPTC_UNSIGNED_Format) return extension.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT;
      } else {
        // 不支持BPTC扩展
        return null;
      }
    }

    // ===== RGTC压缩纹理格式 =====
    // RGTC (Red-Green Texture Compression) 专门用于法线贴图和单/双通道纹理
    // 提供更好的法线贴图压缩质量

    if (p === RED_RGTC1_Format || p === SIGNED_RED_RGTC1_Format || p === RED_GREEN_RGTC2_Format || p === SIGNED_RED_GREEN_RGTC2_Format) {
      // 获取RGTC扩展
      extension = extensions.get("EXT_texture_compression_rgtc");

      if (extension !== null) {
        // 单通道红色压缩格式
        if (p === RED_RGTC1_Format) return extension.COMPRESSED_RED_RGTC1_EXT;
        // 单通道红色有符号压缩格式
        if (p === SIGNED_RED_RGTC1_Format) return extension.COMPRESSED_SIGNED_RED_RGTC1_EXT;
        // 双通道红绿压缩格式，常用于法线贴图
        if (p === RED_GREEN_RGTC2_Format) return extension.COMPRESSED_RED_GREEN_RGTC2_EXT;
        // 双通道红绿有符号压缩格式，用于有符号法线贴图
        if (p === SIGNED_RED_GREEN_RGTC2_Format) return extension.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT;
      } else {
        // 不支持RGTC扩展
        return null;
      }
    }

    // ===== 特殊格式处理 =====

    // 24位深度 + 8位模板的打包格式
    if (p === UnsignedInt248Type) return gl.UNSIGNED_INT_24_8;

    // ===== 后备处理 =====
    // 如果上述所有格式都不匹配，尝试直接从WebGL上下文获取常量
    // 这是为了支持用户自定义的WebGL常量字符串（主要用于打包RGB格式的后备方案）

    return gl[p] !== undefined ? gl[p] : null;
  }

  // 返回包含convert方法的工具对象
  return { convert: convert };
}

/**
 * 导出WebGLUtils工具类
 *
 * 这个工具类是WebGL渲染器的基础组件，负责格式转换工作。
 * 它确保Three.js的内部格式能够正确映射到WebGL的原生格式，
 * 同时处理各种压缩纹理格式的兼容性检查。
 */
export { WebGLUtils };
