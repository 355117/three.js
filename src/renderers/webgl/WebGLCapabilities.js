// 导入纹理格式和数据类型常量
import { FloatType, HalfFloatType, RGBAFormat, UnsignedByteType } from "../../constants.js";

/**
 * WebGL能力检测器
 *
 * 这个类负责检测和报告WebGL上下文的各种能力和限制。
 * 它查询GPU和驱动程序的具体限制，如最大纹理尺寸、支持的精度等，
 * 为渲染器提供硬件能力信息，以便做出适当的渲染决策。
 *
 * @param {WebGL2RenderingContext} gl - WebGL渲染上下文
 * @param {WebGLExtensions} extensions - WebGL扩展管理器
 * @param {Object} parameters - 渲染器参数
 * @param {WebGLUtils} utils - WebGL工具类
 * @returns {Object} 包含各种WebGL能力信息的对象
 */
function WebGLCapabilities(gl, extensions, parameters, utils) {
  // 最大各向异性过滤级别的缓存变量
  let maxAnisotropy;

  /**
   * 获取最大各向异性过滤级别
   *
   * 各向异性过滤可以显著改善倾斜表面纹理的视觉质量，
   * 特别是在查看远距离的地面纹理时效果明显。
   *
   * @returns {number} 最大各向异性过滤级别，如果不支持则返回0
   */
  function getMaxAnisotropy() {
    // 如果已经查询过，直接返回缓存的值
    if (maxAnisotropy !== undefined) return maxAnisotropy;

    // 检查是否支持各向异性过滤扩展
    if (extensions.has("EXT_texture_filter_anisotropic") === true) {
      const extension = extensions.get("EXT_texture_filter_anisotropic");

      // 查询最大支持的各向异性过滤级别
      maxAnisotropy = gl.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    } else {
      // 不支持各向异性过滤
      maxAnisotropy = 0;
    }

    return maxAnisotropy;
  }

  /**
   * 检查纹理格式是否可读
   *
   * 某些纹理格式可能不支持readPixels操作，
   * 这个函数检查指定格式是否可以被读取。
   *
   * @param {number} textureFormat - 纹理格式常量
   * @returns {boolean} 如果格式可读返回true，否则返回false
   */
  function textureFormatReadable(textureFormat) {
    // 检查格式是否为RGBA或者是否匹配实现支持的颜色读取格式
    if (textureFormat !== RGBAFormat && utils.convert(textureFormat) !== gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT)) {
      return false;
    }

    return true;
  }

  /**
   * 检查纹理数据类型是否可读
   *
   * 某些数据类型可能不支持readPixels操作，
   * 这个函数检查指定数据类型是否可以被读取。
   *
   * @param {number} textureType - 纹理数据类型常量
   * @returns {boolean} 如果类型可读返回true，否则返回false
   */
  function textureTypeReadable(textureType) {
    // 检查半精度浮点是否通过扩展支持
    const halfFloatSupportedByExt = textureType === HalfFloatType && (extensions.has("EXT_color_buffer_half_float") || extensions.has("EXT_color_buffer_float"));

    // 检查数据类型是否可读
    // 支持无符号字节、浮点数，以及通过扩展支持的半精度浮点
    if (
      textureType !== UnsignedByteType &&
      utils.convert(textureType) !== gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE) && // Edge and Chrome Mac < 52 (#9513)
      textureType !== FloatType &&
      !halfFloatSupportedByExt
    ) {
      return false;
    }

    return true;
  }

  /**
   * 获取最大支持的着色器精度
   *
   * 不同的GPU对着色器浮点精度的支持程度不同。
   * 这个函数检查请求的精度是否被支持，如果不支持则降级到较低精度。
   *
   * @param {string} precision - 请求的精度级别 ('highp', 'mediump', 'lowp')
   * @returns {string} 实际支持的最高精度级别
   */
  function getMaxPrecision(precision) {
    // 检查是否支持高精度浮点
    if (precision === "highp") {
      // 同时检查顶点着色器和片段着色器的高精度支持
      if (gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT).precision > 0 && gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0) {
        return "highp";
      }

      // 如果不支持高精度，降级到中等精度
      precision = "mediump";
    }

    // 检查是否支持中等精度浮点
    if (precision === "mediump") {
      // 同时检查顶点着色器和片段着色器的中等精度支持
      if (gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT).precision > 0 && gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT).precision > 0) {
        return "mediump";
      }
    }

    // 如果都不支持，返回低精度（所有设备都必须支持）
    return "lowp";
  }

  // ===== 精度设置和验证 =====

  // 获取用户请求的精度，默认为高精度
  let precision = parameters.precision !== undefined ? parameters.precision : "highp";
  // 检查实际支持的最高精度
  const maxPrecision = getMaxPrecision(precision);

  // 如果请求的精度不被支持，显示警告并使用支持的精度
  if (maxPrecision !== precision) {
    console.warn("THREE.WebGLRenderer:", precision, "not supported, using", maxPrecision, "instead.");
    precision = maxPrecision;
  }

  // ===== 深度缓冲区设置 =====

  // 对数深度缓冲区 - 提供更好的深度精度分布
  const logarithmicDepthBuffer = parameters.logarithmicDepthBuffer === true;
  // 反向深度缓冲区 - 需要EXT_clip_control扩展支持
  const reversedDepthBuffer = parameters.reversedDepthBuffer === true && extensions.has("EXT_clip_control");

  // ===== 纹理相关限制查询 =====

  // 片段着色器中可同时使用的纹理单元数量
  const maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
  // 顶点着色器中可同时使用的纹理单元数量
  const maxVertexTextures = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
  // 2D纹理的最大尺寸（宽度和高度）
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  // 立方体贴图每个面的最大尺寸
  const maxCubemapSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);

  // ===== 着色器相关限制查询 =====

  // 顶点着色器中可使用的最大顶点属性数量
  const maxAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
  // 顶点着色器中可使用的最大uniform向量数量
  const maxVertexUniforms = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
  // 顶点着色器和片段着色器之间可传递的最大varying向量数量
  const maxVaryings = gl.getParameter(gl.MAX_VARYING_VECTORS);
  // 片段着色器中可使用的最大uniform向量数量
  const maxFragmentUniforms = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);

  // ===== 特性支持检查 =====

  // 检查是否支持顶点纹理（在顶点着色器中采样纹理）
  const vertexTextures = maxVertexTextures > 0;

  // ===== 多重采样支持 =====

  // 最大支持的多重采样样本数
  const maxSamples = gl.getParameter(gl.MAX_SAMPLES);

  // ===== 返回能力对象 =====
  // 这个对象包含了所有检测到的WebGL能力和限制信息
  return {
    // WebGL版本标识（保持向后兼容性）
    isWebGL2: true, // keeping this for backwards compatibility

    // ===== 功能查询方法 =====
    getMaxAnisotropy: getMaxAnisotropy, // 获取最大各向异性过滤级别
    getMaxPrecision: getMaxPrecision, // 获取最大着色器精度

    // ===== 纹理读取能力检查 =====
    textureFormatReadable: textureFormatReadable, // 检查纹理格式是否可读
    textureTypeReadable: textureTypeReadable, // 检查纹理类型是否可读

    // ===== 精度和深度缓冲区设置 =====
    precision: precision, // 实际使用的着色器精度
    logarithmicDepthBuffer: logarithmicDepthBuffer, // 是否启用对数深度缓冲区
    reversedDepthBuffer: reversedDepthBuffer, // 是否启用反向深度缓冲区

    // ===== 纹理相关限制 =====
    maxTextures: maxTextures, // 片段着色器最大纹理单元数
    maxVertexTextures: maxVertexTextures, // 顶点着色器最大纹理单元数
    maxTextureSize: maxTextureSize, // 最大2D纹理尺寸
    maxCubemapSize: maxCubemapSize, // 最大立方体贴图尺寸

    // ===== 着色器相关限制 =====
    maxAttributes: maxAttributes, // 最大顶点属性数
    maxVertexUniforms: maxVertexUniforms, // 顶点着色器最大uniform数
    maxVaryings: maxVaryings, // 最大varying变量数
    maxFragmentUniforms: maxFragmentUniforms, // 片段着色器最大uniform数

    // ===== 特性支持 =====
    vertexTextures: vertexTextures, // 是否支持顶点纹理

    // ===== 多重采样支持 =====
    maxSamples: maxSamples, // 最大多重采样样本数
  };
}

/**
 * 导出WebGL能力检测器
 *
 * 这个能力检测器是WebGL渲染器的重要组成部分，它提供：
 * 1. 硬件能力和限制的详细信息
 * 2. 着色器精度的自动检测和降级
 * 3. 纹理格式和类型的兼容性检查
 * 4. 各种WebGL特性的支持状态
 *
 * 渲染器使用这些信息来：
 * - 选择合适的渲染路径
 * - 避免超出硬件限制
 * - 提供最佳的渲染质量
 * - 确保跨设备兼容性
 */
export { WebGLCapabilities };
