// 导入各种纹理格式常量：ASTC、ETC、PVRTC、S3TC、BPTC、RGTC等压缩格式
// 以及深度格式、颜色格式、数据类型等WebGL相关常量
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
  RGBFormat,
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
  UnsignedInt5999Type,
  UnsignedShort5551Type,
  UnsignedShort4444Type,
  UnsignedByteType,
  RGBA_BPTC_Format,
  RED_RGTC1_Format,
  SIGNED_RED_RGTC1_Format,
  RED_GREEN_RGTC2_Format,
  SIGNED_RED_GREEN_RGTC2_Format,
  SRGBTransfer,
  NoColorSpace,
} from "../../../constants.js";
// 导入颜色管理模块，用于处理颜色空间转换
import { ColorManagement } from "../../../math/ColorManagement.js";

/**
 * WebGL 2 后端工具模块，提供常用的辅助功能
 * 主要用于Three.js常量与WebGL常量之间的转换
 *
 * @private
 */
class WebGLUtils {
  /**
   * 构造一个新的工具对象
   *
   * @param {WebGLBackend} backend - WebGL 2 后端实例
   */
  constructor(backend) {
    /**
     * WebGL 2 后端的引用
     * 用于访问后端的各种功能和状态
     *
     * @type {WebGLBackend}
     */
    this.backend = backend;

    /**
     * WebGL渲染上下文的引用
     * 用于直接调用WebGL API
     *
     * @type {WebGL2RenderingContext}
     */
    this.gl = this.backend.gl;

    /**
     * 后端扩展模块的引用
     * 包含与WebGL扩展相关的工具函数
     *
     * @type {WebGLExtensions}
     */
    this.extensions = backend.extensions;
  }

  /**
   * 将给定的Three.js常量转换为WebGL常量
   * 该方法目前支持纹理格式和数据类型的转换
   *
   * @param {number} p - Three.js常量值
   * @param {string} [colorSpace=NoColorSpace] - 颜色空间类型
   * @return {?number} 对应的WebGL常量，如果无法转换则返回null
   */
  convert(p, colorSpace = NoColorSpace) {
    // 获取WebGL上下文和扩展管理器的引用
    const { gl, extensions } = this;

    // 用于存储WebGL扩展对象
    let extension;

    // 获取颜色空间的传输函数类型（线性或sRGB）
    const transfer = ColorManagement.getTransfer(colorSpace);

    // 处理基础数据类型转换
    if (p === UnsignedByteType) return gl.UNSIGNED_BYTE; // 无符号字节类型
    if (p === UnsignedShort4444Type) return gl.UNSIGNED_SHORT_4_4_4_4; // 4-4-4-4格式的无符号短整型
    if (p === UnsignedShort5551Type) return gl.UNSIGNED_SHORT_5_5_5_1; // 5-5-5-1格式的无符号短整型
    if (p === UnsignedInt5999Type) return gl.UNSIGNED_INT_5_9_9_9_REV; // 5-9-9-9反向格式的无符号整型

    // 处理有符号数据类型
    if (p === ByteType) return gl.BYTE; // 有符号字节类型
    if (p === ShortType) return gl.SHORT; // 有符号短整型
    if (p === UnsignedShortType) return gl.UNSIGNED_SHORT; // 无符号短整型
    if (p === IntType) return gl.INT; // 有符号整型
    if (p === UnsignedIntType) return gl.UNSIGNED_INT; // 无符号整型
    if (p === FloatType) return gl.FLOAT; // 浮点类型

    // 处理半精度浮点类型
    if (p === HalfFloatType) {
      return gl.HALF_FLOAT; // 半精度浮点类型
    }

    // 处理基础颜色格式
    if (p === AlphaFormat) return gl.ALPHA; // Alpha通道格式
    if (p === RGBFormat) return gl.RGB; // RGB格式
    if (p === RGBAFormat) return gl.RGBA; // RGBA格式
    if (p === DepthFormat) return gl.DEPTH_COMPONENT; // 深度格式
    if (p === DepthStencilFormat) return gl.DEPTH_STENCIL; // 深度模板格式

    // WebGL2专用格式

    if (p === RedFormat) return gl.RED; // 单红色通道格式
    if (p === RedIntegerFormat) return gl.RED_INTEGER; // 红色通道整数格式
    if (p === RGFormat) return gl.RG; // 红绿双通道格式
    if (p === RGIntegerFormat) return gl.RG_INTEGER; // 红绿双通道整数格式
    if (p === RGBAIntegerFormat) return gl.RGBA_INTEGER; // RGBA整数格式

    // S3TC纹理压缩格式处理（DirectX纹理压缩）

    if (p === RGB_S3TC_DXT1_Format || p === RGBA_S3TC_DXT1_Format || p === RGBA_S3TC_DXT3_Format || p === RGBA_S3TC_DXT5_Format) {
      // 检查是否使用sRGB颜色空间
      if (transfer === SRGBTransfer) {
        // 获取sRGB版本的S3TC扩展
        extension = extensions.get("WEBGL_compressed_texture_s3tc_srgb");

        if (extension !== null) {
          // 返回对应的sRGB S3TC压缩格式常量
          if (p === RGB_S3TC_DXT1_Format) return extension.COMPRESSED_SRGB_S3TC_DXT1_EXT; // sRGB DXT1格式
          if (p === RGBA_S3TC_DXT1_Format) return extension.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT; // sRGB DXT1带Alpha格式
          if (p === RGBA_S3TC_DXT3_Format) return extension.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT; // sRGB DXT3格式
          if (p === RGBA_S3TC_DXT5_Format) return extension.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT; // sRGB DXT5格式
        } else {
          // sRGB S3TC扩展不可用
          return null;
        }
      } else {
        // 使用线性颜色空间的S3TC扩展
        extension = extensions.get("WEBGL_compressed_texture_s3tc");

        if (extension !== null) {
          // 返回对应的线性S3TC压缩格式常量
          if (p === RGB_S3TC_DXT1_Format) return extension.COMPRESSED_RGB_S3TC_DXT1_EXT; // 线性RGB DXT1格式
          if (p === RGBA_S3TC_DXT1_Format) return extension.COMPRESSED_RGBA_S3TC_DXT1_EXT; // 线性RGBA DXT1格式
          if (p === RGBA_S3TC_DXT3_Format) return extension.COMPRESSED_RGBA_S3TC_DXT3_EXT; // 线性RGBA DXT3格式
          if (p === RGBA_S3TC_DXT5_Format) return extension.COMPRESSED_RGBA_S3TC_DXT5_EXT; // 线性RGBA DXT5格式
        } else {
          // 线性S3TC扩展不可用
          return null;
        }
      }
    }

    // PVRTC纹理压缩格式处理（PowerVR纹理压缩）

    if (p === RGB_PVRTC_4BPPV1_Format || p === RGB_PVRTC_2BPPV1_Format || p === RGBA_PVRTC_4BPPV1_Format || p === RGBA_PVRTC_2BPPV1_Format) {
      // 获取PVRTC纹理压缩扩展
      extension = extensions.get("WEBGL_compressed_texture_pvrtc");

      if (extension !== null) {
        // 返回对应的PVRTC压缩格式常量
        if (p === RGB_PVRTC_4BPPV1_Format) return extension.COMPRESSED_RGB_PVRTC_4BPPV1_IMG; // RGB 4位每像素PVRTC格式
        if (p === RGB_PVRTC_2BPPV1_Format) return extension.COMPRESSED_RGB_PVRTC_2BPPV1_IMG; // RGB 2位每像素PVRTC格式
        if (p === RGBA_PVRTC_4BPPV1_Format) return extension.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG; // RGBA 4位每像素PVRTC格式
        if (p === RGBA_PVRTC_2BPPV1_Format) return extension.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG; // RGBA 2位每像素PVRTC格式
      } else {
        // PVRTC扩展不可用
        return null;
      }
    }

    // ETC纹理压缩格式处理（Ericsson纹理压缩）

    if (p === RGB_ETC1_Format || p === RGB_ETC2_Format || p === RGBA_ETC2_EAC_Format) {
      // 获取ETC纹理压缩扩展
      extension = extensions.get("WEBGL_compressed_texture_etc");

      if (extension !== null) {
        // 根据颜色空间返回对应的ETC压缩格式常量
        if (p === RGB_ETC1_Format || p === RGB_ETC2_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ETC2 : extension.COMPRESSED_RGB8_ETC2; // ETC1/ETC2 RGB格式
        if (p === RGBA_ETC2_EAC_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC : extension.COMPRESSED_RGBA8_ETC2_EAC; // ETC2 RGBA格式
      } else {
        // ETC扩展不可用
        return null;
      }
    }

    // ASTC纹理压缩格式处理（自适应可伸缩纹理压缩）

    if (
      p === RGBA_ASTC_4x4_Format ||
      p === RGBA_ASTC_5x4_Format ||
      p === RGBA_ASTC_5x5_Format ||
      p === RGBA_ASTC_6x5_Format ||
      p === RGBA_ASTC_6x6_Format ||
      p === RGBA_ASTC_8x5_Format ||
      p === RGBA_ASTC_8x6_Format ||
      p === RGBA_ASTC_8x8_Format ||
      p === RGBA_ASTC_10x5_Format ||
      p === RGBA_ASTC_10x6_Format ||
      p === RGBA_ASTC_10x8_Format ||
      p === RGBA_ASTC_10x10_Format ||
      p === RGBA_ASTC_12x10_Format ||
      p === RGBA_ASTC_12x12_Format
    ) {
      // 获取ASTC纹理压缩扩展
      extension = extensions.get("WEBGL_compressed_texture_astc");

      if (extension !== null) {
        // 根据颜色空间返回对应的ASTC压缩格式常量，数字表示块大小
        if (p === RGBA_ASTC_4x4_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR : extension.COMPRESSED_RGBA_ASTC_4x4_KHR; // 4x4块大小
        if (p === RGBA_ASTC_5x4_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR : extension.COMPRESSED_RGBA_ASTC_5x4_KHR; // 5x4块大小
        if (p === RGBA_ASTC_5x5_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR : extension.COMPRESSED_RGBA_ASTC_5x5_KHR; // 5x5块大小
        if (p === RGBA_ASTC_6x5_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR : extension.COMPRESSED_RGBA_ASTC_6x5_KHR; // 6x5块大小
        if (p === RGBA_ASTC_6x6_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR : extension.COMPRESSED_RGBA_ASTC_6x6_KHR; // 6x6块大小
        if (p === RGBA_ASTC_8x5_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR : extension.COMPRESSED_RGBA_ASTC_8x5_KHR; // 8x5块大小
        if (p === RGBA_ASTC_8x6_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR : extension.COMPRESSED_RGBA_ASTC_8x6_KHR; // 8x6块大小
        if (p === RGBA_ASTC_8x8_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR : extension.COMPRESSED_RGBA_ASTC_8x8_KHR; // 8x8块大小
        if (p === RGBA_ASTC_10x5_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR : extension.COMPRESSED_RGBA_ASTC_10x5_KHR; // 10x5块大小
        if (p === RGBA_ASTC_10x6_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR : extension.COMPRESSED_RGBA_ASTC_10x6_KHR; // 10x6块大小
        if (p === RGBA_ASTC_10x8_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR : extension.COMPRESSED_RGBA_ASTC_10x8_KHR; // 10x8块大小
        if (p === RGBA_ASTC_10x10_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR : extension.COMPRESSED_RGBA_ASTC_10x10_KHR; // 10x10块大小
        if (p === RGBA_ASTC_12x10_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR : extension.COMPRESSED_RGBA_ASTC_12x10_KHR; // 12x10块大小
        if (p === RGBA_ASTC_12x12_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR : extension.COMPRESSED_RGBA_ASTC_12x12_KHR; // 12x12块大小
      } else {
        // ASTC扩展不可用
        return null;
      }
    }

    // BPTC纹理压缩格式处理（块压缩纹理压缩）

    if (p === RGBA_BPTC_Format) {
      // 获取BPTC纹理压缩扩展
      extension = extensions.get("EXT_texture_compression_bptc");

      if (extension !== null) {
        // 根据颜色空间返回对应的BPTC压缩格式常量
        if (p === RGBA_BPTC_Format) return transfer === SRGBTransfer ? extension.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT : extension.COMPRESSED_RGBA_BPTC_UNORM_EXT; // BPTC RGBA格式
      } else {
        // BPTC扩展不可用
        return null;
      }
    }

    // RGTC纹理压缩格式处理（红绿纹理压缩）

    if (p === RED_RGTC1_Format || p === SIGNED_RED_RGTC1_Format || p === RED_GREEN_RGTC2_Format || p === SIGNED_RED_GREEN_RGTC2_Format) {
      // 获取RGTC纹理压缩扩展
      extension = extensions.get("EXT_texture_compression_rgtc");

      if (extension !== null) {
        // 返回对应的RGTC压缩格式常量
        if (p === RED_RGTC1_Format) return extension.COMPRESSED_RED_RGTC1_EXT; // 单红色通道RGTC1格式
        if (p === SIGNED_RED_RGTC1_Format) return extension.COMPRESSED_SIGNED_RED_RGTC1_EXT; // 有符号单红色通道RGTC1格式
        if (p === RED_GREEN_RGTC2_Format) return extension.COMPRESSED_RED_GREEN_RGTC2_EXT; // 红绿双通道RGTC2格式
        if (p === SIGNED_RED_GREEN_RGTC2_Format) return extension.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT; // 有符号红绿双通道RGTC2格式
      } else {
        // RGTC扩展不可用
        return null;
      }
    }

    // 处理特殊的深度模板格式

    if (p === UnsignedInt248Type) {
      // 返回24位深度8位模板的无符号整型格式
      return gl.UNSIGNED_INT_24_8;
    }

    // 如果无法解析参数p，假设用户定义了一个WebGL常量作为字符串（用于打包RGB格式的回退/解决方案）

    return gl[p] !== undefined ? gl[p] : null;
  }

  /**
   * 此方法用于通过等待正在进行的GPU命令完成来同步CPU与GPU
   * 确保所有GPU操作都已完成后再继续执行
   *
   * @private
   * @return {Promise} 当所有正在进行的GPU命令完成时解析的Promise
   */
  _clientWaitAsync() {
    // 获取WebGL上下文引用
    const { gl } = this;

    // 创建一个同步对象，用于等待GPU命令完成
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);

    // 强制执行所有挂起的WebGL命令
    gl.flush();

    // 返回一个Promise，在GPU命令完成时解析
    return new Promise((resolve, reject) => {
      // 定义测试函数，检查同步状态
      function test() {
        // 检查同步对象的状态，非阻塞方式
        const res = gl.clientWaitSync(sync, gl.SYNC_FLUSH_COMMANDS_BIT, 0);

        // 如果等待失败
        if (res === gl.WAIT_FAILED) {
          // 删除同步对象并拒绝Promise
          gl.deleteSync(sync);

          reject();
          return;
        }

        // 如果超时（GPU命令尚未完成）
        if (res === gl.TIMEOUT_EXPIRED) {
          // 在下一个动画帧再次检查
          requestAnimationFrame(test);
          return;
        }

        // GPU命令已完成，删除同步对象并解析Promise
        gl.deleteSync(sync);

        resolve();
      }

      // 开始检查同步状态
      test();
    });
  }
}

export default WebGLUtils;
