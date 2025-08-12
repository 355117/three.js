// 导入纹理过滤相关常量
import {
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearMipmapNearestFilter,
  NearestFilter,
  NearestMipmapLinearFilter,
  NearestMipmapNearestFilter,
  FloatType,
  MirroredRepeatWrapping,
  ClampToEdgeWrapping,
  RepeatWrapping,
  NeverCompare,
  AlwaysCompare,
  LessCompare,
  LessEqualCompare,
  EqualCompare,
  GreaterEqualCompare,
  GreaterCompare,
  NotEqualCompare,
  NoColorSpace,
  LinearTransfer,
  SRGBTransfer,
} from "../../../constants.js";
// 导入颜色管理模块，用于处理颜色空间转换
import { ColorManagement } from "../../../math/ColorManagement.js";
// 导入纹理工具函数，用于计算纹理数据字节长度
import { getByteLength } from "../../../extras/TextureUtils.js";

// 全局变量：初始化标志和常量映射表
let initialized = false,
  wrappingToGL,
  filterToGL,
  compareToGL;

/**
 * WebGL 2后端纹理管理工具模块
 * 负责纹理的创建、更新、复制、销毁等核心操作
 * 支持各种纹理类型：2D、3D、立方体、数组纹理等
 *
 * @private
 */
class WebGLTextureUtils {
  /**
   * 构造一个新的纹理管理工具对象
   *
   * @param {WebGLBackend} backend - WebGL 2后端实例
   */
  constructor(backend) {
    /**
     * WebGL 2后端的引用
     * 用于访问渲染器和其他后端功能
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
    this.gl = backend.gl;

    /**
     * 扩展管理器的引用
     * 用于访问WebGL扩展相关的工具函数
     *
     * @type {WebGLExtensions}
     */
    this.extensions = backend.extensions;

    /**
     * 默认纹理管理字典
     * 键为绑定点（目标类型），值为WebGL纹理对象
     * 用于在实际纹理准备好之前提供占位符纹理
     *
     * @type {Object<GLenum,WebGLTexture>}
     */
    this.defaultTextures = {};

    // 确保常量映射表只初始化一次
    if (initialized === false) {
      this._init();

      initialized = true;
    }
  }

  /**
   * 初始化纹理工具的内部状态
   * 设置Three.js常量到WebGL常量的映射表
   *
   * @private
   */
  _init() {
    const gl = this.gl;

    // 在此处只存储WebGL常量映射

    // 纹理包装模式常量映射表
    wrappingToGL = {
      [RepeatWrapping]: gl.REPEAT, // 重复包装
      [ClampToEdgeWrapping]: gl.CLAMP_TO_EDGE, // 边缘夹紧包装
      [MirroredRepeatWrapping]: gl.MIRRORED_REPEAT, // 镜像重复包装
    };

    // 纹理过滤模式常量映射表
    filterToGL = {
      [NearestFilter]: gl.NEAREST, // 最近邻过滤
      [NearestMipmapNearestFilter]: gl.NEAREST_MIPMAP_NEAREST, // 最近邻mipmap最近邻过滤
      [NearestMipmapLinearFilter]: gl.NEAREST_MIPMAP_LINEAR, // 最近邻mipmap线性过滤

      [LinearFilter]: gl.LINEAR, // 线性过滤
      [LinearMipmapNearestFilter]: gl.LINEAR_MIPMAP_NEAREST, // 线性mipmap最近邻过滤
      [LinearMipmapLinearFilter]: gl.LINEAR_MIPMAP_LINEAR, // 线性mipmap线性过滤
    };

    // 深度比较函数常量映射表（用于阴影贴图）
    compareToGL = {
      [NeverCompare]: gl.NEVER, // 永远不通过
      [AlwaysCompare]: gl.ALWAYS, // 总是通过
      [LessCompare]: gl.LESS, // 小于时通过
      [LessEqualCompare]: gl.LEQUAL, // 小于等于时通过
      [EqualCompare]: gl.EQUAL, // 等于时通过
      [GreaterEqualCompare]: gl.GEQUAL, // 大于等于时通过
      [GreaterCompare]: gl.GREATER, // 大于时通过
      [NotEqualCompare]: gl.NOTEQUAL, // 不等于时通过
    };
  }

  /**
   * 根据给定纹理返回对应的WebGL纹理类型
   * 根据纹理的特性自动判断应该使用哪种WebGL纹理目标
   *
   * @param {Texture} texture - 纹理对象
   * @return {GLenum} WebGL纹理类型常量
   */
  getGLTextureType(texture) {
    const { gl } = this;

    let glTextureType;

    // 立方体纹理（天空盒、环境贴图等）
    if (texture.isCubeTexture === true) {
      glTextureType = gl.TEXTURE_CUBE_MAP;
    } else if (texture.isArrayTexture === true || texture.isDataArrayTexture === true || texture.isCompressedArrayTexture === true) {
      // 数组纹理（纹理图集、动画帧等）
      glTextureType = gl.TEXTURE_2D_ARRAY;
    } else if (texture.isData3DTexture === true) {
      // 3D纹理（体积渲染、噪声纹理等）
      // TODO: isCompressed3DTexture, wait for #26642

      glTextureType = gl.TEXTURE_3D;
    } else {
      // 默认2D纹理（最常用的纹理类型）
      glTextureType = gl.TEXTURE_2D;
    }

    return glTextureType;
  }

  /**
   * 根据给定参数返回WebGL内部格式
   * 内部格式决定了纹理在GPU内存中的存储方式、精度和颜色空间处理
   * 支持各种数据类型：浮点、整数、压缩格式，以及sRGB颜色空间转换
   * 自动处理不同通道数（R、RG、RGB、RGBA）和数据精度的组合
   *
   * @param {?string} internalFormatName - 指定的内部格式名称。当为`null`时，根据后续参数自动推导
   * @param {GLenum} glFormat - WebGL外部格式（如gl.RGBA、gl.RGB、gl.RED等），定义数据的通道布局
   * @param {GLenum} glType - WebGL数据类型（如gl.UNSIGNED_BYTE、gl.FLOAT、gl.HALF_FLOAT等），定义每个通道的数据精度
   * @param {string} colorSpace - 纹理的颜色空间（如'srgb'、'rec2020'等），影响颜色编码方式
   * @param {boolean} [forceLinearTransfer=false] - 是否强制使用线性传输函数，忽略颜色空间的默认传输函数
   * @return {GLenum} 最适合的WebGL内部格式常量，用于纹理存储分配
   */
  getInternalFormat(internalFormatName, glFormat, glType, colorSpace, forceLinearTransfer = false) {
    const { gl, extensions } = this;

    // 如果指定了内部格式名称，直接使用
    if (internalFormatName !== null) {
      if (gl[internalFormatName] !== undefined) return gl[internalFormatName];

      console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '" + internalFormatName + "'");
    }

    // 默认内部格式与外部格式相同
    let internalFormat = glFormat;

    // 单通道红色格式处理
    if (glFormat === gl.RED) {
      if (glType === gl.FLOAT) internalFormat = gl.R32F; // 32位浮点红色
      if (glType === gl.HALF_FLOAT) internalFormat = gl.R16F; // 16位半精度浮点红色
      if (glType === gl.UNSIGNED_BYTE) internalFormat = gl.R8; // 8位无符号整数红色
      if (glType === gl.UNSIGNED_SHORT) internalFormat = gl.R16; // 16位无符号整数红色
      if (glType === gl.UNSIGNED_INT) internalFormat = gl.R32UI; // 32位无符号整数红色
      if (glType === gl.BYTE) internalFormat = gl.R8I; // 8位有符号整数红色
      if (glType === gl.SHORT) internalFormat = gl.R16I; // 16位有符号整数红色
      if (glType === gl.INT) internalFormat = gl.R32I; // 32位有符号整数红色
    }

    // 单通道红色整数格式处理
    if (glFormat === gl.RED_INTEGER) {
      if (glType === gl.UNSIGNED_BYTE) internalFormat = gl.R8UI; // 8位无符号整数红色
      if (glType === gl.UNSIGNED_SHORT) internalFormat = gl.R16UI; // 16位无符号整数红色
      if (glType === gl.UNSIGNED_INT) internalFormat = gl.R32UI; // 32位无符号整数红色
      if (glType === gl.BYTE) internalFormat = gl.R8I; // 8位有符号整数红色
      if (glType === gl.SHORT) internalFormat = gl.R16I; // 16位有符号整数红色
      if (glType === gl.INT) internalFormat = gl.R32I; // 32位有符号整数红色
    }

    // 双通道红绿格式处理（用于法线贴图、高度图等）
    if (glFormat === gl.RG) {
      if (glType === gl.FLOAT) internalFormat = gl.RG32F; // 32位浮点双通道
      if (glType === gl.HALF_FLOAT) internalFormat = gl.RG16F; // 16位半精度浮点双通道
      if (glType === gl.UNSIGNED_BYTE) internalFormat = gl.RG8; // 8位无符号整数双通道
      if (glType === gl.UNSIGNED_SHORT) internalFormat = gl.RG16; // 16位无符号整数双通道
      if (glType === gl.UNSIGNED_INT) internalFormat = gl.RG32UI; // 32位无符号整数双通道
      if (glType === gl.BYTE) internalFormat = gl.RG8I; // 8位有符号整数双通道
      if (glType === gl.SHORT) internalFormat = gl.RG16I; // 16位有符号整数双通道
      if (glType === gl.INT) internalFormat = gl.RG32I; // 32位有符号整数双通道
    }

    // 双通道红绿整数格式处理
    if (glFormat === gl.RG_INTEGER) {
      if (glType === gl.UNSIGNED_BYTE) internalFormat = gl.RG8UI; // 8位无符号整数双通道
      if (glType === gl.UNSIGNED_SHORT) internalFormat = gl.RG16UI; // 16位无符号整数双通道
      if (glType === gl.UNSIGNED_INT) internalFormat = gl.RG32UI; // 32位无符号整数双通道
      if (glType === gl.BYTE) internalFormat = gl.RG8I; // 8位有符号整数双通道
      if (glType === gl.SHORT) internalFormat = gl.RG16I; // 16位有符号整数双通道
      if (glType === gl.INT) internalFormat = gl.RG32I; // 32位有符号整数双通道
    }

    if (glFormat === gl.RGB) {
      const transfer = forceLinearTransfer ? LinearTransfer : ColorManagement.getTransfer(colorSpace);

      if (glType === gl.FLOAT) internalFormat = gl.RGB32F;
      if (glType === gl.HALF_FLOAT) internalFormat = gl.RGB16F;
      if (glType === gl.UNSIGNED_BYTE) internalFormat = gl.RGB8;
      if (glType === gl.UNSIGNED_SHORT) internalFormat = gl.RGB16;
      if (glType === gl.UNSIGNED_INT) internalFormat = gl.RGB32UI;
      if (glType === gl.BYTE) internalFormat = gl.RGB8I;
      if (glType === gl.SHORT) internalFormat = gl.RGB16I;
      if (glType === gl.INT) internalFormat = gl.RGB32I;
      if (glType === gl.UNSIGNED_BYTE) internalFormat = transfer === SRGBTransfer ? gl.SRGB8 : gl.RGB8;
      if (glType === gl.UNSIGNED_SHORT_5_6_5) internalFormat = gl.RGB565;
      if (glType === gl.UNSIGNED_SHORT_5_5_5_1) internalFormat = gl.RGB5_A1;
      if (glType === gl.UNSIGNED_SHORT_4_4_4_4) internalFormat = gl.RGB4;
      if (glType === gl.UNSIGNED_INT_5_9_9_9_REV) internalFormat = gl.RGB9_E5;
    }

    if (glFormat === gl.RGB_INTEGER) {
      if (glType === gl.UNSIGNED_BYTE) internalFormat = gl.RGB8UI;
      if (glType === gl.UNSIGNED_SHORT) internalFormat = gl.RGB16UI;
      if (glType === gl.UNSIGNED_INT) internalFormat = gl.RGB32UI;
      if (glType === gl.BYTE) internalFormat = gl.RGB8I;
      if (glType === gl.SHORT) internalFormat = gl.RGB16I;
      if (glType === gl.INT) internalFormat = gl.RGB32I;
    }

    if (glFormat === gl.RGBA) {
      const transfer = forceLinearTransfer ? LinearTransfer : ColorManagement.getTransfer(colorSpace);

      if (glType === gl.FLOAT) internalFormat = gl.RGBA32F;
      if (glType === gl.HALF_FLOAT) internalFormat = gl.RGBA16F;
      if (glType === gl.UNSIGNED_BYTE) internalFormat = gl.RGBA8;
      if (glType === gl.UNSIGNED_SHORT) internalFormat = gl.RGBA16;
      if (glType === gl.UNSIGNED_INT) internalFormat = gl.RGBA32UI;
      if (glType === gl.BYTE) internalFormat = gl.RGBA8I;
      if (glType === gl.SHORT) internalFormat = gl.RGBA16I;
      if (glType === gl.INT) internalFormat = gl.RGBA32I;
      if (glType === gl.UNSIGNED_BYTE) internalFormat = transfer === SRGBTransfer ? gl.SRGB8_ALPHA8 : gl.RGBA8;
      if (glType === gl.UNSIGNED_SHORT_4_4_4_4) internalFormat = gl.RGBA4;
      if (glType === gl.UNSIGNED_SHORT_5_5_5_1) internalFormat = gl.RGB5_A1;
    }

    if (glFormat === gl.RGBA_INTEGER) {
      if (glType === gl.UNSIGNED_BYTE) internalFormat = gl.RGBA8UI;
      if (glType === gl.UNSIGNED_SHORT) internalFormat = gl.RGBA16UI;
      if (glType === gl.UNSIGNED_INT) internalFormat = gl.RGBA32UI;
      if (glType === gl.BYTE) internalFormat = gl.RGBA8I;
      if (glType === gl.SHORT) internalFormat = gl.RGBA16I;
      if (glType === gl.INT) internalFormat = gl.RGBA32I;
    }

    if (glFormat === gl.DEPTH_COMPONENT) {
      if (glType === gl.UNSIGNED_SHORT) internalFormat = gl.DEPTH_COMPONENT16;
      if (glType === gl.UNSIGNED_INT) internalFormat = gl.DEPTH_COMPONENT24;
      if (glType === gl.FLOAT) internalFormat = gl.DEPTH_COMPONENT32F;
    }

    if (glFormat === gl.DEPTH_STENCIL) {
      if (glType === gl.UNSIGNED_INT_24_8) internalFormat = gl.DEPTH24_STENCIL8;
    }

    if (
      internalFormat === gl.R16F ||
      internalFormat === gl.R32F ||
      internalFormat === gl.RG16F ||
      internalFormat === gl.RG32F ||
      internalFormat === gl.RGBA16F ||
      internalFormat === gl.RGBA32F
    ) {
      extensions.get("EXT_color_buffer_float");
    }

    return internalFormat;
  }

  /**
   * 为给定纹理设置纹理参数
   * 配置纹理的包装模式、过滤模式、各向异性过滤等参数
   *
   * @param {GLenum} textureType - 纹理类型（如gl.TEXTURE_2D等）
   * @param {Texture} texture - 纹理对象
   */
  setTextureParameters(textureType, texture) {
    const { gl, extensions, backend } = this;

    // 获取工作颜色空间和纹理颜色空间的色域
    const workingPrimaries = ColorManagement.getPrimaries(ColorManagement.workingColorSpace);
    const texturePrimaries = texture.colorSpace === NoColorSpace ? null : ColorManagement.getPrimaries(texture.colorSpace);
    // 确定是否需要颜色空间转换
    const unpackConversion = texture.colorSpace === NoColorSpace || workingPrimaries === texturePrimaries ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL;

    // 设置像素存储参数
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, texture.flipY); // Y轴翻转
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha); // 预乘Alpha
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, texture.unpackAlignment); // 像素对齐
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, unpackConversion); // 颜色空间转换

    // 设置纹理包装模式
    gl.texParameteri(textureType, gl.TEXTURE_WRAP_S, wrappingToGL[texture.wrapS]); // S轴（U轴）包装
    gl.texParameteri(textureType, gl.TEXTURE_WRAP_T, wrappingToGL[texture.wrapT]); // T轴（V轴）包装

    // 对于3D纹理和2D数组纹理，设置R轴包装模式
    if (textureType === gl.TEXTURE_3D || textureType === gl.TEXTURE_2D_ARRAY) {
      // WebGL 2不支持深度2D数组纹理的包装
      if (!texture.isArrayTexture) {
        gl.texParameteri(textureType, gl.TEXTURE_WRAP_R, wrappingToGL[texture.wrapR]); // R轴（W轴）包装
      }
    }

    // 设置放大过滤模式
    gl.texParameteri(textureType, gl.TEXTURE_MAG_FILTER, filterToGL[texture.magFilter]);

    // 检查纹理是否包含mipmap数据
    const hasMipmaps = texture.mipmaps !== undefined && texture.mipmaps.length > 0;

    // 遵循WebGPU后端的纹理过滤映射规则
    // 如果纹理有mipmap且使用线性过滤，自动升级为线性mipmap线性过滤
    const minFilter = texture.minFilter === LinearFilter && hasMipmaps ? LinearMipmapLinearFilter : texture.minFilter;

    // 设置缩小过滤模式
    gl.texParameteri(textureType, gl.TEXTURE_MIN_FILTER, filterToGL[minFilter]);

    // 设置深度比较功能（主要用于阴影贴图）
    if (texture.compareFunction) {
      gl.texParameteri(textureType, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); // 启用纹理比较
      gl.texParameteri(textureType, gl.TEXTURE_COMPARE_FUNC, compareToGL[texture.compareFunction]); // 设置比较函数
    }

    // 设置各向异性过滤（提高斜视角度下的纹理质量）
    if (extensions.has("EXT_texture_filter_anisotropic") === true) {
      // 最近邻过滤不支持各向异性过滤
      if (texture.magFilter === NearestFilter) return;
      // 只有使用mipmap的线性过滤才支持各向异性过滤
      if (texture.minFilter !== NearestMipmapLinearFilter && texture.minFilter !== LinearMipmapLinearFilter) return;
      // 浮点纹理需要额外的线性过滤扩展支持
      if (texture.type === FloatType && extensions.has("OES_texture_float_linear") === false) return;

      // 应用各向异性过滤设置
      if (texture.anisotropy > 1) {
        const extension = extensions.get("EXT_texture_filter_anisotropic");
        // 设置各向异性过滤级别，不超过硬件最大支持值
        gl.texParameterf(textureType, extension.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(texture.anisotropy, backend.getMaxAnisotropy()));
      }
    }
  }

  /**
   * 为给定纹理创建默认占位符纹理
   * 在实际纹理准备就绪之前，提供一个可用的占位符纹理对象
   * 避免渲染时出现未定义纹理的错误
   *
   * @param {Texture} texture - 需要创建默认纹理的纹理对象
   */
  createDefaultTexture(texture) {
    const { gl, backend, defaultTextures } = this;

    // 获取纹理对应的WebGL纹理类型
    const glTextureType = this.getGLTextureType(texture);

    // 检查是否已存在该类型的默认纹理
    let textureGPU = defaultTextures[glTextureType];

    if (textureGPU === undefined) {
      // 创建新的WebGL纹理对象
      textureGPU = gl.createTexture();

      // 绑定纹理并设置基本参数
      backend.state.bindTexture(glTextureType, textureGPU);
      gl.texParameteri(glTextureType, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // 缩小过滤：最近邻
      gl.texParameteri(glTextureType, gl.TEXTURE_MAG_FILTER, gl.NEAREST); // 放大过滤：最近邻

      // 注释：可选的1x1像素纹理数据初始化
      // gl.texImage2D( glTextureType, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data );

      // 缓存默认纹理以供后续使用
      defaultTextures[glTextureType] = textureGPU;
    }

    // 将默认纹理关联到纹理对象
    backend.set(texture, {
      textureGPU,
      glTextureType,
      isDefault: true, // 标记为默认纹理
    });
  }

  /**
   * 在GPU上为给定纹理对象创建纹理
   * 分配GPU内存并设置纹理的基本属性
   *
   * @param {Texture} texture - 纹理对象
   * @param {Object} [options={}] - 可选配置参数
   * @return {undefined}
   */
  createTexture(texture, options) {
    const { gl, backend } = this;
    const { levels, width, height, depth } = options;

    // 转换纹理格式和类型为WebGL常量
    const glFormat = backend.utils.convert(texture.format, texture.colorSpace);
    const glType = backend.utils.convert(texture.type);
    const glInternalFormat = this.getInternalFormat(texture.internalFormat, glFormat, glType, texture.colorSpace, texture.isVideoTexture);

    // 创建WebGL纹理对象
    const textureGPU = gl.createTexture();
    const glTextureType = this.getGLTextureType(texture);

    // 绑定纹理并设置参数
    backend.state.bindTexture(glTextureType, textureGPU);

    this.setTextureParameters(glTextureType, texture);

    // 根据纹理类型分配存储空间
    if (texture.isArrayTexture || texture.isDataArrayTexture || texture.isCompressedArrayTexture) {
      // 2D数组纹理存储
      gl.texStorage3D(gl.TEXTURE_2D_ARRAY, levels, glInternalFormat, width, height, depth);
    } else if (texture.isData3DTexture) {
      // 3D纹理存储
      gl.texStorage3D(gl.TEXTURE_3D, levels, glInternalFormat, width, height, depth);
    } else if (!texture.isVideoTexture) {
      // 2D纹理存储（视频纹理除外）
      gl.texStorage2D(glTextureType, levels, glInternalFormat, width, height);
    }

    // 将纹理数据关联到纹理对象
    backend.set(texture, {
      textureGPU,
      glTextureType,
      glFormat,
      glType,
      glInternalFormat,
    });
  }

  /**
   * 将缓冲区数据上传到GPU纹理内存
   * 从WebGL缓冲区对象直接复制数据到纹理，提高数据传输效率
   * 通常用于从计算着色器或其他GPU操作的结果更新纹理
   *
   * @param {WebGLBuffer} buffer - 包含纹理数据的WebGL缓冲区对象
   * @param {Texture} texture - 目标纹理对象
   */
  copyBufferToTexture(buffer, texture) {
    const { gl, backend } = this;

    // 获取纹理的WebGL相关属性
    const { textureGPU, glTextureType, glFormat, glType } = backend.get(texture);

    // 获取纹理尺寸信息
    const { width, height } = texture.source.data;

    // 绑定像素解包缓冲区作为数据源
    gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, buffer);

    // 绑定目标纹理
    backend.state.bindTexture(glTextureType, textureGPU);

    // 设置像素存储参数（禁用Y轴翻转和预乘Alpha）
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    // 从缓冲区复制数据到纹理（偏移量为0表示从缓冲区开始读取）
    gl.texSubImage2D(glTextureType, 0, 0, 0, width, height, glFormat, glType, 0);

    // 解绑缓冲区
    gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);

    // 解绑纹理
    backend.state.unbindTexture();
    // debug
    // const framebuffer = gl.createFramebuffer();
    // gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffer );
    // gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, glTextureType, textureGPU, 0 );

    // const readout = new Float32Array( width * height * 4 );

    // const altFormat = gl.getParameter( gl.IMPLEMENTATION_COLOR_READ_FORMAT );
    // const altType = gl.getParameter( gl.IMPLEMENTATION_COLOR_READ_TYPE );

    // gl.readPixels( 0, 0, width, height, altFormat, altType, readout );
    // gl.bindFramebuffer( gl.FRAMEBUFFER, null );
    // console.log( readout );
  }

  /**
   * 将更新的纹理数据上传到GPU
   * 支持多种纹理类型的数据更新：压缩纹理、立方体纹理、数组纹理、3D纹理、视频纹理等
   * 根据纹理类型和数据格式选择合适的WebGL上传方法
   *
   * @param {Texture} texture - 需要更新的纹理对象
   * @param {Object} [options={}] - 可选配置参数，包含图像数据和尺寸信息
   */
  updateTexture(texture, options) {
    const { gl } = this;
    const { width, height } = options;
    const { textureGPU, glTextureType, glFormat, glType, glInternalFormat } = this.backend.get(texture);

    // 跳过渲染目标纹理和不支持的纹理格式
    if (texture.isRenderTargetTexture || textureGPU === undefined /* 不支持的纹理格式 */) return;

    // 绑定纹理并设置参数
    this.backend.state.bindTexture(glTextureType, textureGPU);
    this.setTextureParameters(glTextureType, texture);

    // 处理压缩纹理
    if (texture.isCompressedTexture) {
      const mipmaps = texture.mipmaps;
      const image = options.image;

      // 遍历所有mipmap级别
      for (let i = 0; i < mipmaps.length; i++) {
        const mipmap = mipmaps[i];

        // 压缩数组纹理处理
        if (texture.isCompressedArrayTexture) {
          if (texture.format !== gl.RGBA) {
            if (glFormat !== null) {
              // 上传压缩的3D纹理数据
              gl.compressedTexSubImage3D(gl.TEXTURE_2D_ARRAY, i, 0, 0, 0, mipmap.width, mipmap.height, image.depth, glFormat, mipmap.data);
            } else {
              console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");
            }
          } else {
            // 上传未压缩的3D纹理数据
            gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, i, 0, 0, 0, mipmap.width, mipmap.height, image.depth, glFormat, glType, mipmap.data);
          }
        } else {
          // 普通压缩纹理处理
          if (glFormat !== null) {
            // 上传压缩的2D纹理数据
            gl.compressedTexSubImage2D(gl.TEXTURE_2D, i, 0, 0, mipmap.width, mipmap.height, glFormat, mipmap.data);
          } else {
            console.warn("Unsupported compressed texture format");
          }
        }
      }
    } else if (texture.isCubeTexture) {
      // 立方体纹理处理（天空盒、环境贴图等）
      const images = options.images;

      // 更新立方体的6个面
      for (let i = 0; i < 6; i++) {
        const image = getImage(images[i]);
        // 按照+X, -X, +Y, -Y, +Z, -Z的顺序更新各个面
        gl.texSubImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, 0, 0, width, height, glFormat, glType, image);
      }
    } else if (texture.isDataArrayTexture || texture.isArrayTexture) {
      // 数组纹理处理（纹理图集、动画帧等）
      const image = options.image;

      // 检查是否有特定层的更新
      if (texture.layerUpdates.size > 0) {
        // 计算单层纹理的字节长度
        const layerByteLength = getByteLength(image.width, image.height, texture.format, texture.type);

        // 只更新指定的层
        for (const layerIndex of texture.layerUpdates) {
          // 提取特定层的数据
          const layerData = image.data.subarray((layerIndex * layerByteLength) / image.data.BYTES_PER_ELEMENT, ((layerIndex + 1) * layerByteLength) / image.data.BYTES_PER_ELEMENT);
          // 更新指定层的纹理数据
          gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layerIndex, image.width, image.height, 1, glFormat, glType, layerData);
        }

        // 清除层更新标记
        texture.clearLayerUpdates();
      } else {
        // 更新整个数组纹理
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, image.width, image.height, image.depth, glFormat, glType, image.data);
      }
    } else if (texture.isData3DTexture) {
      // 3D纹理处理（体积渲染、噪声纹理等）
      const image = options.image;
      // 更新整个3D纹理数据
      gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, image.width, image.height, image.depth, glFormat, glType, image.data);
    } else if (texture.isVideoTexture) {
      // 视频纹理处理
      texture.update(); // 更新视频帧
      // 直接从视频元素上传纹理数据
      gl.texImage2D(glTextureType, 0, glInternalFormat, glFormat, glType, options.image);
    } else {
      // 普通2D纹理处理
      const image = getImage(options.image);
      // 更新2D纹理数据
      gl.texSubImage2D(glTextureType, 0, 0, 0, width, height, glFormat, glType, image);
    }
  }

  /**
   * 为给定纹理生成mipmap链
   * Mipmap是纹理的多级细节层次，用于提高渲染性能和质量
   *
   * @param {Texture} texture - 纹理对象
   */
  generateMipmaps(texture) {
    const { gl, backend } = this;
    const { textureGPU, glTextureType } = backend.get(texture);

    // 绑定纹理并生成mipmap
    backend.state.bindTexture(glTextureType, textureGPU);
    gl.generateMipmap(glTextureType);
  }

  /**
   * 释放给定渲染目标的渲染缓冲区资源
   * 清理帧缓冲区、深度缓冲区、模板缓冲区和MSAA相关的缓冲区
   * 防止GPU内存泄漏，确保资源得到正确释放
   *
   * @param {RenderTarget} renderTarget - 需要释放缓冲区的渲染目标对象
   */
  deallocateRenderBuffers(renderTarget) {
    const { gl, backend } = this;

    // 移除帧缓冲区引用并释放相关资源
    if (renderTarget) {
      const renderContextData = backend.get(renderTarget);

      // 清除渲染缓冲区存储设置
      renderContextData.renderBufferStorageSetup = undefined;

      // 释放所有帧缓冲区对象
      if (renderContextData.framebuffers) {
        for (const cacheKey in renderContextData.framebuffers) {
          gl.deleteFramebuffer(renderContextData.framebuffers[cacheKey]);
        }
        delete renderContextData.framebuffers;
      }

      // 释放深度渲染缓冲区
      if (renderContextData.depthRenderbuffer) {
        gl.deleteRenderbuffer(renderContextData.depthRenderbuffer);
        delete renderContextData.depthRenderbuffer;
      }

      // 释放模板渲染缓冲区
      if (renderContextData.stencilRenderbuffer) {
        gl.deleteRenderbuffer(renderContextData.stencilRenderbuffer);
        delete renderContextData.stencilRenderbuffer;
      }

      // 释放MSAA帧缓冲区
      if (renderContextData.msaaFrameBuffer) {
        gl.deleteFramebuffer(renderContextData.msaaFrameBuffer);
        delete renderContextData.msaaFrameBuffer;
      }

      // 释放MSAA渲染缓冲区数组
      if (renderContextData.msaaRenderbuffers) {
        for (let i = 0; i < renderContextData.msaaRenderbuffers.length; i++) {
          gl.deleteRenderbuffer(renderContextData.msaaRenderbuffers[i]);
        }
        delete renderContextData.msaaRenderbuffers;
      }
    }
  }

  /**
   * 销毁给定纹理对象的GPU数据
   * 释放GPU内存并清理相关的渲染缓冲区
   *
   * @param {Texture} texture - 纹理对象
   */
  destroyTexture(texture) {
    const { gl, backend } = this;
    const { textureGPU, renderTarget } = backend.get(texture);

    // 释放渲染缓冲区资源
    this.deallocateRenderBuffers(renderTarget);
    // 删除GPU纹理对象
    gl.deleteTexture(textureGPU);

    // 从后端删除纹理引用
    backend.delete(texture);
  }

  /**
   * 将源纹理的数据复制到目标纹理
   * 支持部分区域复制、不同mipmap级别间的复制，以及2D/3D纹理的复制操作
   * 可以在GPU上高效地进行纹理间的数据传输，避免CPU-GPU数据往返
   *
   * @param {Texture} srcTexture - 源纹理对象
   * @param {Texture} dstTexture - 目标纹理对象
   * @param {?(Box3|Box2)} [srcRegion=null] - 源纹理的复制区域，null表示复制整个纹理
   * @param {?(Vector2|Vector3)} [dstPosition=null] - 目标纹理的粘贴位置，null表示从原点开始
   * @param {number} [srcLevel=0] - 源纹理的mipmap级别
   * @param {number} [dstLevel=0] - 目标纹理的mipmap级别
   */
  copyTextureToTexture(srcTexture, dstTexture, srcRegion = null, dstPosition = null, srcLevel = 0, dstLevel = 0) {
    const { gl, backend } = this;
    const { state } = this.backend;

    // 获取目标纹理的WebGL相关属性
    const { textureGPU: dstTextureGPU, glTextureType, glType, glFormat } = backend.get(dstTexture);

    // 绑定目标纹理
    state.bindTexture(glTextureType, dstTextureGPU);

    // 收集复制操作所需的尺寸信息
    let width, height, depth, minX, minY, minZ;
    let dstX, dstY, dstZ;
    // 根据纹理类型获取图像数据
    const image = srcTexture.isCompressedTexture ? srcTexture.mipmaps[dstLevel] : srcTexture.image;

    // 计算复制区域的尺寸和起始位置
    if (srcRegion !== null) {
      // 使用指定的源区域
      width = srcRegion.max.x - srcRegion.min.x;
      height = srcRegion.max.y - srcRegion.min.y;
      depth = srcRegion.isBox3 ? srcRegion.max.z - srcRegion.min.z : 1;
      minX = srcRegion.min.x;
      minY = srcRegion.min.y;
      minZ = srcRegion.isBox3 ? srcRegion.min.z : 0;
    } else {
      // 复制整个纹理，考虑mipmap级别的缩放
      const levelScale = Math.pow(2, -srcLevel);
      width = Math.floor(image.width * levelScale);
      height = Math.floor(image.height * levelScale);

      // 根据纹理类型确定深度
      if (srcTexture.isDataArrayTexture || srcTexture.isArrayTexture) {
        depth = image.depth; // 数组纹理的深度不受mipmap影响
      } else if (srcTexture.isData3DTexture) {
        depth = Math.floor(image.depth * levelScale); // 3D纹理的深度受mipmap影响
      } else {
        depth = 1; // 2D纹理深度为1
      }

      minX = 0;
      minY = 0;
      minZ = 0;
    }

    // 计算目标位置
    if (dstPosition !== null) {
      dstX = dstPosition.x;
      dstY = dstPosition.y;
      dstZ = dstPosition.z;
    } else {
      dstX = 0;
      dstY = 0;
      dstZ = 0;
    }

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, dstTexture.flipY);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, dstTexture.premultiplyAlpha);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, dstTexture.unpackAlignment);

    // used for copying data from cpu
    const currentUnpackRowLen = gl.getParameter(gl.UNPACK_ROW_LENGTH);
    const currentUnpackImageHeight = gl.getParameter(gl.UNPACK_IMAGE_HEIGHT);
    const currentUnpackSkipPixels = gl.getParameter(gl.UNPACK_SKIP_PIXELS);
    const currentUnpackSkipRows = gl.getParameter(gl.UNPACK_SKIP_ROWS);
    const currentUnpackSkipImages = gl.getParameter(gl.UNPACK_SKIP_IMAGES);

    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, image.width);
    gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT, image.height);
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, minX);
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, minY);
    gl.pixelStorei(gl.UNPACK_SKIP_IMAGES, minZ);

    // set up the src texture
    const isDst3D = dstTexture.isDataArrayTexture || dstTexture.isData3DTexture || dstTexture.isArrayTexture;
    if (srcTexture.isRenderTargetTexture || srcTexture.isDepthTexture) {
      const srcTextureData = backend.get(srcTexture);
      const dstTextureData = backend.get(dstTexture);

      const srcRenderContextData = backend.get(srcTextureData.renderTarget);
      const dstRenderContextData = backend.get(dstTextureData.renderTarget);

      const srcFramebuffer = srcRenderContextData.framebuffers[srcTextureData.cacheKey];
      const dstFramebuffer = dstRenderContextData.framebuffers[dstTextureData.cacheKey];

      state.bindFramebuffer(gl.READ_FRAMEBUFFER, srcFramebuffer);
      state.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dstFramebuffer);

      let mask = gl.COLOR_BUFFER_BIT;

      if (srcTexture.isDepthTexture) mask = gl.DEPTH_BUFFER_BIT;

      gl.blitFramebuffer(minX, minY, width, height, dstX, dstY, width, height, mask, gl.NEAREST);

      state.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      state.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    } else {
      if (isDst3D) {
        // copy data into the 3d texture
        if (srcTexture.isDataTexture || srcTexture.isData3DTexture) {
          gl.texSubImage3D(glTextureType, dstLevel, dstX, dstY, dstZ, width, height, depth, glFormat, glType, image.data);
        } else if (dstTexture.isCompressedArrayTexture) {
          gl.compressedTexSubImage3D(glTextureType, dstLevel, dstX, dstY, dstZ, width, height, depth, glFormat, image.data);
        } else {
          gl.texSubImage3D(glTextureType, dstLevel, dstX, dstY, dstZ, width, height, depth, glFormat, glType, image);
        }
      } else {
        // copy data into the 2d texture
        if (srcTexture.isDataTexture) {
          gl.texSubImage2D(glTextureType, dstLevel, dstX, dstY, width, height, glFormat, glType, image.data);
        } else if (srcTexture.isCompressedTexture) {
          gl.compressedTexSubImage2D(glTextureType, dstLevel, dstX, dstY, image.width, image.height, glFormat, image.data);
        } else {
          gl.texSubImage2D(glTextureType, dstLevel, dstX, dstY, width, height, glFormat, glType, image);
        }
      }
    }

    // reset values
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, currentUnpackRowLen);
    gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT, currentUnpackImageHeight);
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, currentUnpackSkipPixels);
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, currentUnpackSkipRows);
    gl.pixelStorei(gl.UNPACK_SKIP_IMAGES, currentUnpackSkipImages);

    // Generate mipmaps only when copying level 0
    if (dstLevel === 0 && dstTexture.generateMipmaps) {
      gl.generateMipmap(glTextureType);
    }

    state.unbindTexture();
  }

  /**
   * 将当前绑定的帧缓冲区内容复制到指定纹理
   * 从当前渲染目标或屏幕缓冲区读取像素数据并写入纹理，支持高效的GPU到GPU数据传输
   * 自动处理多重采样抗锯齿(MSAA)的解析、深度/模板缓冲区复制、Y轴坐标翻转
   * 支持部分区域复制和完整帧缓冲区复制，适用于后处理效果和渲染到纹理操作
   *
   * @param {Texture} texture - 目标纹理对象，可以是颜色纹理或深度纹理
   * @param {RenderContext} renderContext - 渲染上下文，包含源渲染目标、采样设置和模板缓冲区信息
   * @param {Vector4} rectangle - 四维向量，定义复制区域 (x, y, width, height)，坐标系为帧缓冲区坐标
   */
  copyFramebufferToTexture(texture, renderContext, rectangle) {
    const { gl } = this;
    const { state } = this.backend;

    const { textureGPU } = this.backend.get(texture);

    const { x, y, z: width, w: height } = rectangle;

    const requireDrawFrameBuffer = texture.isDepthTexture === true || (renderContext.renderTarget && renderContext.renderTarget.samples > 0);

    const srcHeight = renderContext.renderTarget ? renderContext.renderTarget.height : this.backend.getDrawingBufferSize().y;

    if (requireDrawFrameBuffer) {
      const partial = x !== 0 || y !== 0;
      let mask;
      let attachment;

      if (texture.isDepthTexture === true) {
        mask = gl.DEPTH_BUFFER_BIT;
        attachment = gl.DEPTH_ATTACHMENT;

        if (renderContext.stencil) {
          mask |= gl.STENCIL_BUFFER_BIT;
        }
      } else {
        mask = gl.COLOR_BUFFER_BIT;
        attachment = gl.COLOR_ATTACHMENT0;
      }

      if (partial) {
        const renderTargetContextData = this.backend.get(renderContext.renderTarget);

        const fb = renderTargetContextData.framebuffers[renderContext.getCacheKey()];
        const msaaFrameBuffer = renderTargetContextData.msaaFrameBuffer;

        state.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb);
        state.bindFramebuffer(gl.READ_FRAMEBUFFER, msaaFrameBuffer);

        const flippedY = srcHeight - y - height;

        gl.blitFramebuffer(x, flippedY, x + width, flippedY + height, x, flippedY, x + width, flippedY + height, mask, gl.NEAREST);

        state.bindFramebuffer(gl.READ_FRAMEBUFFER, fb);

        state.bindTexture(gl.TEXTURE_2D, textureGPU);

        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, x, flippedY, width, height);

        state.unbindTexture();
      } else {
        const fb = gl.createFramebuffer();

        state.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb);

        gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, attachment, gl.TEXTURE_2D, textureGPU, 0);
        gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, mask, gl.NEAREST);

        gl.deleteFramebuffer(fb);
      }
    } else {
      state.bindTexture(gl.TEXTURE_2D, textureGPU);
      gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, x, srcHeight - height - y, width, height);

      state.unbindTexture();
    }

    if (texture.generateMipmaps) this.generateMipmaps(texture);

    this.backend._setFramebuffer(renderContext);
  }

  /**
   * 为内部深度/模板缓冲区设置存储并绑定到正确的帧缓冲区
   * 根据渲染目标的配置自动选择最适合的内部格式：深度缓冲区、深度模板缓冲区
   * 智能处理不同的存储模式：标准存储、多重采样存储、多重采样渲染到纹理扩展
   * 支持浮点深度缓冲区和24位深度+8位模板的组合格式，确保最佳的深度测试性能
   *
   * @param {WebGLRenderbuffer} renderbuffer - 要配置的WebGL渲染缓冲区对象
   * @param {RenderContext} renderContext - 渲染上下文，包含渲染目标的深度/模板配置信息
   * @param {number} samples - MSAA采样数量，0表示不使用多重采样，通常为0、2、4、8、16
   * @param {boolean} [useMultisampledRTT=false] - 是否使用WEBGL_multisampled_render_to_texture扩展进行优化
   */
  setupRenderBufferStorage(renderbuffer, renderContext, samples, useMultisampledRTT = false) {
    const { gl } = this;
    const renderTarget = renderContext.renderTarget;

    const { depthTexture, depthBuffer, stencilBuffer, width, height } = renderTarget;

    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);

    if (depthBuffer && !stencilBuffer) {
      let glInternalFormat = gl.DEPTH_COMPONENT24;

      if (useMultisampledRTT === true) {
        const multisampledRTTExt = this.extensions.get("WEBGL_multisampled_render_to_texture");

        multisampledRTTExt.renderbufferStorageMultisampleEXT(gl.RENDERBUFFER, renderTarget.samples, glInternalFormat, width, height);
      } else if (samples > 0) {
        if (depthTexture && depthTexture.isDepthTexture) {
          if (depthTexture.type === gl.FLOAT) {
            glInternalFormat = gl.DEPTH_COMPONENT32F;
          }
        }

        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, glInternalFormat, width, height);
      } else {
        gl.renderbufferStorage(gl.RENDERBUFFER, glInternalFormat, width, height);
      }

      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
    } else if (depthBuffer && stencilBuffer) {
      if (samples > 0) {
        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH24_STENCIL8, width, height);
      } else {
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, width, height);
      }

      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
    }

    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  }

  /**
   * 将纹理数据异步读取为类型化数组
   * 从GPU纹理读取指定区域的像素数据到CPU内存，使用像素包装缓冲区(PBO)实现异步传输
   * 自动处理不同纹理格式和数据类型的转换，支持立方体纹理的各个面读取
   * 使用WebGL的异步读取机制避免阻塞渲染管线，适用于纹理数据分析和后处理
   *
   * @async
   * @param {Texture} texture - 要读取的纹理对象，支持2D纹理和立方体纹理
   * @param {number} x - 读取区域的X坐标起点（像素坐标）
   * @param {number} y - 读取区域的Y坐标起点（像素坐标）
   * @param {number} width - 读取区域的宽度（像素数量）
   * @param {number} height - 读取区域的高度（像素数量）
   * @param {number} faceIndex - 立方体纹理的面索引（0=+X, 1=-X, 2=+Y, 3=-Y, 4=+Z, 5=-Z），2D纹理忽略
   * @return {Promise<TypedArray>} 返回Promise，解析为包含像素数据的类型化数组，数组类型根据纹理格式自动确定
   */
  async copyTextureToBuffer(texture, x, y, width, height, faceIndex) {
    const { backend, gl } = this;

    const { textureGPU, glFormat, glType } = this.backend.get(texture);

    const fb = gl.createFramebuffer();

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb);

    const target = texture.isCubeTexture ? gl.TEXTURE_CUBE_MAP_POSITIVE_X + faceIndex : gl.TEXTURE_2D;

    gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, target, textureGPU, 0);

    const typedArrayType = this._getTypedArrayType(glType);
    const bytesPerTexel = this._getBytesPerTexel(glType, glFormat);

    const elementCount = width * height;
    const byteLength = elementCount * bytesPerTexel;

    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buffer);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, byteLength, gl.STREAM_READ);
    gl.readPixels(x, y, width, height, glFormat, glType, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

    await backend.utils._clientWaitAsync();

    const dstBuffer = new typedArrayType(byteLength / typedArrayType.BYTES_PER_ELEMENT);

    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buffer);
    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, dstBuffer);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

    gl.deleteFramebuffer(fb);

    return dstBuffer;
  }

  /**
   * 根据WebGL数据类型返回对应的JavaScript类型化数组构造函数
   * 建立WebGL数据类型常量与JavaScript类型化数组的精确映射关系
   * 确保从GPU读取的像素数据能够存储在正确的内存布局中，避免数据类型不匹配
   * 支持各种精度的数据类型：8位、16位、32位整数和浮点数
   *
   * @private
   * @param {GLenum} glType - WebGL数据类型常量（如gl.UNSIGNED_BYTE、gl.FLOAT、gl.HALF_FLOAT等）
   * @return {TypedArray.constructor} 对应的JavaScript类型化数组构造函数（如Uint8Array、Float32Array等）
   * @throws {Error} 当遇到不支持的WebGL数据类型时抛出错误
   */
  _getTypedArrayType(glType) {
    const { gl } = this;

    if (glType === gl.UNSIGNED_BYTE) return Uint8Array;

    if (glType === gl.UNSIGNED_SHORT_4_4_4_4) return Uint16Array;
    if (glType === gl.UNSIGNED_SHORT_5_5_5_1) return Uint16Array;
    if (glType === gl.UNSIGNED_SHORT_5_6_5) return Uint16Array;
    if (glType === gl.UNSIGNED_SHORT) return Uint16Array;
    if (glType === gl.UNSIGNED_INT) return Uint32Array;

    if (glType === gl.HALF_FLOAT) return Uint16Array;
    if (glType === gl.FLOAT) return Float32Array;

    throw new Error(`Unsupported WebGL type: ${glType}`);
  }

  /**
   * 计算每个纹素(texel)占用的字节数
   * 根据WebGL数据类型和纹理格式的组合精确计算内存占用量
   * 用于纹理数据传输时分配正确大小的缓冲区，确保内存布局的正确性
   * 支持各种数据精度和通道组合：单通道、双通道、三通道、四通道
   *
   * @private
   * @param {GLenum} glType - WebGL数据类型常量（如gl.UNSIGNED_BYTE、gl.FLOAT、gl.HALF_FLOAT等）
   * @param {GLenum} glFormat - WebGL纹理格式常量（如gl.RGBA、gl.RGB、gl.RED、gl.ALPHA等）
   * @return {number} 每个纹素占用的字节数，用于内存分配计算
   */
  _getBytesPerTexel(glType, glFormat) {
    const { gl } = this;

    let bytesPerComponent = 0;

    if (glType === gl.UNSIGNED_BYTE) bytesPerComponent = 1;

    if (
      glType === gl.UNSIGNED_SHORT_4_4_4_4 ||
      glType === gl.UNSIGNED_SHORT_5_5_5_1 ||
      glType === gl.UNSIGNED_SHORT_5_6_5 ||
      glType === gl.UNSIGNED_SHORT ||
      glType === gl.HALF_FLOAT
    )
      bytesPerComponent = 2;

    if (glType === gl.UNSIGNED_INT || glType === gl.FLOAT) bytesPerComponent = 4;

    if (glFormat === gl.RGBA) return bytesPerComponent * 4;
    if (glFormat === gl.RGB) return bytesPerComponent * 3;
    if (glFormat === gl.ALPHA) return bytesPerComponent;
  }
}

/**
 * 从纹理源获取图像数据的辅助函数
 * 根据不同的纹理源类型返回相应的图像数据
 *
 * @param {Object} source - 纹理源对象
 * @return {*} 图像数据或图像对象
 */
function getImage(source) {
  // 如果是数据纹理，返回原始数据
  if (source.isDataTexture) {
    return source.image.data;
  } else if (
    // 检查各种HTML图像元素类型
    (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) ||
    (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) ||
    (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) ||
    (typeof OffscreenCanvas !== "undefined" && source instanceof OffscreenCanvas)
  ) {
    // 直接返回HTML图像元素
    return source;
  }

  // 默认返回数据属性
  return source.data;
}

export default WebGLTextureUtils;
