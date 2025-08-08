// 导入纹理格式和数据类型常量
// 包括基础格式、压缩格式（S3TC、PVRTC、ETC、ASTC、BPTC、RGTC）和数据类型
import {
  AlphaFormat,
  RedFormat,
  RedIntegerFormat,
  RGFormat,
  RGIntegerFormat,
  RGBFormat,
  RGBAFormat,
  RGBAIntegerFormat,
  RGB_S3TC_DXT1_Format,
  RGBA_S3TC_DXT1_Format,
  RGBA_S3TC_DXT3_Format,
  RGBA_S3TC_DXT5_Format,
  RGB_PVRTC_2BPPV1_Format,
  RGBA_PVRTC_2BPPV1_Format,
  RGB_PVRTC_4BPPV1_Format,
  RGBA_PVRTC_4BPPV1_Format,
  RGB_ETC1_Format,
  RGB_ETC2_Format,
  RGBA_ETC2_EAC_Format,
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
  RGBA_BPTC_Format,
  RGB_BPTC_SIGNED_Format,
  RGB_BPTC_UNSIGNED_Format,
  RED_RGTC1_Format,
  SIGNED_RED_RGTC1_Format,
  RED_GREEN_RGTC2_Format,
  SIGNED_RED_GREEN_RGTC2_Format,
  UnsignedByteType,
  ByteType,
  UnsignedShortType,
  ShortType,
  HalfFloatType,
  UnsignedShort4444Type,
  UnsignedShort5551Type,
  UnsignedIntType,
  IntType,
  FloatType,
  UnsignedInt5999Type,
} from "../constants.js";

/**
 * 在保持纹理原始宽高比的前提下，将纹理缩放到尽可能大的尺寸，
 * 使其完全适应表面而不被裁剪或拉伸。类似于 CSS 的 `object-fit: contain`
 *
 * @param {Texture} texture - 要处理的纹理对象
 * @param {number} aspect - 目标表面的宽高比
 * @return {Texture} 更新后的纹理对象
 */
function contain(texture, aspect) {
  // 计算纹理图像的宽高比，如果图像不存在则默认为 1:1
  const imageAspect = texture.image && texture.image.width ? texture.image.width / texture.image.height : 1;

  if (imageAspect > aspect) {
    // 图像比目标表面更宽，需要在垂直方向上调整
    texture.repeat.x = 1; // 水平方向完全填充
    texture.repeat.y = imageAspect / aspect; // 垂直方向按比例缩放

    texture.offset.x = 0; // 水平方向无偏移
    texture.offset.y = (1 - texture.repeat.y) / 2; // 垂直方向居中
  } else {
    // 图像比目标表面更高，需要在水平方向上调整
    texture.repeat.x = aspect / imageAspect; // 水平方向按比例缩放
    texture.repeat.y = 1; // 垂直方向完全填充

    texture.offset.x = (1 - texture.repeat.x) / 2; // 水平方向居中
    texture.offset.y = 0; // 垂直方向无偏移
  }

  return texture;
}

/**
 * 将纹理缩放到能够完全填充表面的最小尺寸，不留空白区域。
 * 保持纹理的原始宽高比，可能会裁剪部分内容。类似于 CSS 的 `object-fit: cover`
 *
 * @param {Texture} texture - 要处理的纹理对象
 * @param {number} aspect - 目标表面的宽高比
 * @return {Texture} 更新后的纹理对象
 */
function cover(texture, aspect) {
  // 计算纹理图像的宽高比，如果图像不存在则默认为 1:1
  const imageAspect = texture.image && texture.image.width ? texture.image.width / texture.image.height : 1;

  if (imageAspect > aspect) {
    // 图像比目标表面更宽，需要裁剪水平方向的内容
    texture.repeat.x = aspect / imageAspect; // 水平方向按比例缩放（小于1，会裁剪）
    texture.repeat.y = 1; // 垂直方向完全填充

    texture.offset.x = (1 - texture.repeat.x) / 2; // 水平方向居中裁剪
    texture.offset.y = 0; // 垂直方向无偏移
  } else {
    // 图像比目标表面更高，需要裁剪垂直方向的内容
    texture.repeat.x = 1; // 水平方向完全填充
    texture.repeat.y = imageAspect / aspect; // 垂直方向按比例缩放（小于1，会裁剪）

    texture.offset.x = 0; // 水平方向无偏移
    texture.offset.y = (1 - texture.repeat.y) / 2; // 垂直方向居中裁剪
  }

  return texture;
}

/**
 * 将纹理配置为默认变换，完全填充表面。
 * 可能会拉伸纹理以匹配表面尺寸。类似于 CSS 的 `object-fit: fill`
 *
 * @param {Texture} texture - 要处理的纹理对象
 * @return {Texture} 更新后的纹理对象
 */
function fill(texture) {
  // 重置纹理的重复和偏移属性为默认值
  texture.repeat.x = 1; // 水平方向完全填充
  texture.repeat.y = 1; // 垂直方向完全填充

  texture.offset.x = 0; // 水平方向无偏移
  texture.offset.y = 0; // 垂直方向无偏移

  return texture;
}

/**
 * 计算表示纹理所需的字节数
 * 根据纹理的宽度、高度、格式和数据类型来确定内存占用
 *
 * @param {number} width - 纹理的宽度（像素）
 * @param {number} height - 纹理的高度（像素）
 * @param {number} format - 纹理的像素格式
 * @param {number} type - 纹理的数据类型
 * @return {number} 所需的字节长度
 */
function getByteLength(width, height, format, type) {
  // 获取数据类型的字节长度信息
  const typeByteLength = getTextureTypeByteLength(type);

  switch (format) {
    // 基础纹理格式
    // 参考：https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glTexImage2D.xhtml
    case AlphaFormat:
      // Alpha 格式：每像素 1 字节
      return width * height;
    case RedFormat:
      // 单通道红色格式
      return ((width * height) / typeByteLength.components) * typeByteLength.byteLength;
    case RedIntegerFormat:
      // 单通道红色整数格式
      return ((width * height) / typeByteLength.components) * typeByteLength.byteLength;
    case RGFormat:
      // 双通道红绿格式
      return ((width * height * 2) / typeByteLength.components) * typeByteLength.byteLength;
    case RGIntegerFormat:
      // 双通道红绿整数格式
      return ((width * height * 2) / typeByteLength.components) * typeByteLength.byteLength;
    case RGBFormat:
      // 三通道 RGB 格式
      return ((width * height * 3) / typeByteLength.components) * typeByteLength.byteLength;
    case RGBAFormat:
      // 四通道 RGBA 格式
      return ((width * height * 4) / typeByteLength.components) * typeByteLength.byteLength;
    case RGBAIntegerFormat:
      // 四通道 RGBA 整数格式
      return ((width * height * 4) / typeByteLength.components) * typeByteLength.byteLength;

    // S3TC 压缩纹理格式（DirectX 纹理压缩）
    // 参考：https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_s3tc_srgb/
    case RGB_S3TC_DXT1_Format:
    case RGBA_S3TC_DXT1_Format:
      // DXT1 格式：4x4 像素块，每块 8 字节
      return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 8;
    case RGBA_S3TC_DXT3_Format:
    case RGBA_S3TC_DXT5_Format:
      // DXT3/DXT5 格式：4x4 像素块，每块 16 字节
      return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 16;

    // PVRTC 压缩纹理格式（PowerVR 纹理压缩）
    // 参考：https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_pvrtc/
    case RGB_PVRTC_2BPPV1_Format:
    case RGBA_PVRTC_2BPPV1_Format:
      // PVRTC 2bpp：每像素 2 位，最小尺寸 16x8
      return (Math.max(width, 16) * Math.max(height, 8)) / 4;
    case RGB_PVRTC_4BPPV1_Format:
    case RGBA_PVRTC_4BPPV1_Format:
      // PVRTC 4bpp：每像素 4 位，最小尺寸 8x8
      return (Math.max(width, 8) * Math.max(height, 8)) / 2;

    // ETC 压缩纹理格式（Ericsson 纹理压缩）
    // 参考：https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_etc/
    case RGB_ETC1_Format:
    case RGB_ETC2_Format:
      // ETC1/ETC2 RGB：4x4 像素块，每块 8 字节
      return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 8;
    case RGBA_ETC2_EAC_Format:
      // ETC2 RGBA：4x4 像素块，每块 16 字节
      return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 16;

    // ASTC 压缩纹理格式（自适应可伸缩纹理压缩）
    // 参考：https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/
    case RGBA_ASTC_4x4_Format:
      // ASTC 4x4 块：每块 16 字节
      return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 16;
    case RGBA_ASTC_5x4_Format:
      // ASTC 5x4 块：每块 16 字节
      return Math.floor((width + 4) / 5) * Math.floor((height + 3) / 4) * 16;
    case RGBA_ASTC_5x5_Format:
      // ASTC 5x5 块：每块 16 字节
      return Math.floor((width + 4) / 5) * Math.floor((height + 4) / 5) * 16;
    case RGBA_ASTC_6x5_Format:
      // ASTC 6x5 块：每块 16 字节
      return Math.floor((width + 5) / 6) * Math.floor((height + 4) / 5) * 16;
    case RGBA_ASTC_6x6_Format:
      // ASTC 6x6 块：每块 16 字节
      return Math.floor((width + 5) / 6) * Math.floor((height + 5) / 6) * 16;
    case RGBA_ASTC_8x5_Format:
      // ASTC 8x5 块：每块 16 字节
      return Math.floor((width + 7) / 8) * Math.floor((height + 4) / 5) * 16;
    case RGBA_ASTC_8x6_Format:
      // ASTC 8x6 块：每块 16 字节
      return Math.floor((width + 7) / 8) * Math.floor((height + 5) / 6) * 16;
    case RGBA_ASTC_8x8_Format:
      // ASTC 8x8 块：每块 16 字节
      return Math.floor((width + 7) / 8) * Math.floor((height + 7) / 8) * 16;
    case RGBA_ASTC_10x5_Format:
      // ASTC 10x5 块：每块 16 字节
      return Math.floor((width + 9) / 10) * Math.floor((height + 4) / 5) * 16;
    case RGBA_ASTC_10x6_Format:
      // ASTC 10x6 块：每块 16 字节
      return Math.floor((width + 9) / 10) * Math.floor((height + 5) / 6) * 16;
    case RGBA_ASTC_10x8_Format:
      // ASTC 10x8 块：每块 16 字节
      return Math.floor((width + 9) / 10) * Math.floor((height + 7) / 8) * 16;
    case RGBA_ASTC_10x10_Format:
      // ASTC 10x10 块：每块 16 字节
      return Math.floor((width + 9) / 10) * Math.floor((height + 9) / 10) * 16;
    case RGBA_ASTC_12x10_Format:
      // ASTC 12x10 块：每块 16 字节
      return Math.floor((width + 11) / 12) * Math.floor((height + 9) / 10) * 16;
    case RGBA_ASTC_12x12_Format:
      // ASTC 12x12 块：每块 16 字节
      return Math.floor((width + 11) / 12) * Math.floor((height + 11) / 12) * 16;

    // BPTC 压缩纹理格式（BC6H/BC7 块压缩）
    // 参考：https://registry.khronos.org/webgl/extensions/EXT_texture_compression_bptc/
    case RGBA_BPTC_Format:
    case RGB_BPTC_SIGNED_Format:
    case RGB_BPTC_UNSIGNED_Format:
      // BPTC 格式：4x4 像素块，每块 16 字节
      return Math.ceil(width / 4) * Math.ceil(height / 4) * 16;

    // RGTC 压缩纹理格式（红绿纹理压缩）
    // 参考：https://registry.khronos.org/webgl/extensions/EXT_texture_compression_rgtc/
    case RED_RGTC1_Format:
    case SIGNED_RED_RGTC1_Format:
      // RGTC1 格式：4x4 像素块，每块 8 字节（单通道）
      return Math.ceil(width / 4) * Math.ceil(height / 4) * 8;
    case RED_GREEN_RGTC2_Format:
    case SIGNED_RED_GREEN_RGTC2_Format:
      // RGTC2 格式：4x4 像素块，每块 16 字节（双通道）
      return Math.ceil(width / 4) * Math.ceil(height / 4) * 16;
  }

  // 如果遇到未知的纹理格式，抛出错误
  throw new Error(`Unable to determine texture byte length for ${format} format.`);
}

/**
 * 获取纹理数据类型的字节长度和组件信息
 * @param {number} type - 纹理数据类型常量
 * @returns {Object} 包含 byteLength（每个组件的字节数）和 components（组件数量）的对象
 */
function getTextureTypeByteLength(type) {
  switch (type) {
    case UnsignedByteType:
    case ByteType:
      // 8 位整数类型：每个组件 1 字节
      return { byteLength: 1, components: 1 };
    case UnsignedShortType:
    case ShortType:
    case HalfFloatType:
      // 16 位类型：每个组件 2 字节
      return { byteLength: 2, components: 1 };
    case UnsignedShort4444Type:
    case UnsignedShort5551Type:
      // 打包的 16 位类型：2 字节包含 4 个组件
      return { byteLength: 2, components: 4 };
    case UnsignedIntType:
    case IntType:
    case FloatType:
      // 32 位类型：每个组件 4 字节
      return { byteLength: 4, components: 1 };
    case UnsignedInt5999Type:
      // 打包的 32 位类型：4 字节包含 3 个组件（RGB9_E5 格式）
      return { byteLength: 4, components: 3 };
  }

  // 如果遇到未知的数据类型，抛出错误
  throw new Error(`Unknown texture type ${type}.`);
}

/**
 * 包含纹理实用工具函数的类
 * 提供纹理变换、尺寸计算等功能
 *
 * @hideconstructor
 */
class TextureUtils {
  /**
   * 在保持纹理原始宽高比的前提下，将纹理缩放到尽可能大的尺寸，
   * 使其完全适应表面而不被裁剪或拉伸。类似于 CSS 的 `object-fit: contain`
   *
   * @param {Texture} texture - 要处理的纹理对象
   * @param {number} aspect - 目标表面的宽高比
   * @return {Texture} 更新后的纹理对象
   */
  static contain(texture, aspect) {
    return contain(texture, aspect);
  }

  /**
   * 将纹理缩放到能够完全填充表面的最小尺寸，不留空白区域。
   * 保持纹理的原始宽高比，可能会裁剪部分内容。类似于 CSS 的 `object-fit: cover`
   *
   * @param {Texture} texture - 要处理的纹理对象
   * @param {number} aspect - 目标表面的宽高比
   * @return {Texture} 更新后的纹理对象
   */
  static cover(texture, aspect) {
    return cover(texture, aspect);
  }

  /**
   * 将纹理配置为默认变换，完全填充表面。
   * 可能会拉伸纹理以匹配表面尺寸。类似于 CSS 的 `object-fit: fill`
   *
   * @param {Texture} texture - 要处理的纹理对象
   * @return {Texture} 更新后的纹理对象
   */
  static fill(texture) {
    return fill(texture);
  }

  /**
   * 计算表示纹理所需的字节数
   * 根据纹理的宽度、高度、格式和数据类型来确定内存占用
   *
   * @param {number} width - 纹理的宽度（像素）
   * @param {number} height - 纹理的高度（像素）
   * @param {number} format - 纹理的像素格式
   * @param {number} type - 纹理的数据类型
   * @return {number} 所需的字节长度
   */
  static getByteLength(width, height, format, type) {
    return getByteLength(width, height, format, type);
  }
}

// 导出纹理工具函数和类
export { contain, cover, fill, getByteLength, TextureUtils };
