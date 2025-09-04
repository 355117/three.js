/**
 * WebGL纹理管理器
 *
 * 这个文件实现了Three.js中WebGL纹理的完整管理系统，包括：
 * - 纹理的创建、上传、绑定和销毁
 * - 纹理缓存和共享机制
 * - 不同类型纹理的支持（2D、3D、立方体、数组纹理等）
 * - 渲染目标和帧缓冲区管理
 * - 纹理参数设置和优化
 * - 内存管理和资源清理
 *
 * 主要功能：
 * 1. 纹理单元分配和管理
 * 2. 纹理格式转换和兼容性处理
 * 3. Mipmap生成和管理
 * 4. 压缩纹理支持
 * 5. 视频纹理更新
 * 6. 深度纹理和阴影映射支持
 * 7. 多重采样渲染目标支持
 *
 * @author Three.js Contributors
 * @since r1
 */

// 导入必要的常量、工具函数和类
import {
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearMipmapNearestFilter,
  NearestFilter,
  NearestMipmapLinearFilter,
  NearestMipmapNearestFilter,
  RGBAFormat,
  DepthFormat,
  DepthStencilFormat,
  UnsignedIntType,
  FloatType,
  MirroredRepeatWrapping,
  ClampToEdgeWrapping,
  RepeatWrapping,
  UnsignedByteType,
  NoColorSpace,
  LinearSRGBColorSpace,
  NeverCompare,
  AlwaysCompare,
  LessCompare,
  LessEqualCompare,
  EqualCompare,
  GreaterEqualCompare,
  GreaterCompare,
  NotEqualCompare,
  SRGBTransfer,
  LinearTransfer,
  UnsignedShortType,
  UnsignedInt248Type,
} from "../../constants.js";
import { createElementNS } from "../../utils.js";
import { ColorManagement } from "../../math/ColorManagement.js";
import { Vector2 } from "../../math/Vector2.js";
import { getByteLength } from "../../extras/TextureUtils.js";

/**
 * WebGL纹理管理器
 * 负责处理WebGL纹理的创建、上传、绑定和销毁
 *
 * @param {WebGLRenderingContext} _gl - WebGL渲染上下文
 * @param {WebGLExtensions} extensions - WebGL扩展管理器
 * @param {WebGLState} state - WebGL状态管理器
 * @param {WebGLProperties} properties - WebGL属性管理器
 * @param {WebGLCapabilities} capabilities - WebGL能力检测器
 * @param {WebGLUtils} utils - WebGL工具函数
 * @param {Object} info - 渲染信息统计
 */
function WebGLTextures(_gl, extensions, state, properties, capabilities, utils, info) {
  // ========================================
  // 扩展和兼容性检测
  // ========================================

  // 获取多重采样渲染到纹理扩展（如果可用）
  // 这个扩展允许直接渲染到多重采样纹理，避免了额外的解析步骤
  const multisampledRTTExt = extensions.has("WEBGL_multisampled_render_to_texture") ? extensions.get("WEBGL_multisampled_render_to_texture") : null;

  // 检测是否支持帧缓冲区失效（主要用于Oculus浏览器优化）
  // navigator可能在某些环境（如Node.js）中不存在，需要先检查
  // Oculus浏览器支持invalidateFramebuffer，可以提高渲染性能
  const supportsInvalidateFramebuffer = typeof navigator === "undefined" ? false : /OculusBrowser/g.test(navigator.userAgent);

  // ========================================
  // 内部缓存和工具对象
  // ========================================

  // 用于存储图像尺寸的临时向量，避免重复创建Vector2对象
  const _imageDimensions = new Vector2();

  // 存储视频纹理的弱映射，用于跟踪视频纹理的状态
  // 键：VideoTexture对象，值：上次更新的帧号
  // 使用WeakMap确保纹理被垃圾回收时不会造成内存泄漏
  const _videoTextures = new WeakMap();

  // 用于图像缩放的画布缓存，避免重复创建画布对象
  // 只有在需要调整图像大小时才会被创建和使用
  let _canvas;

  // 将WebGL纹理对象映射到Source实例的弱映射
  // 这样可以实现纹理共享，多个纹理对象可以共享同一个WebGL纹理
  // 键：Source对象，值：包含WebGL纹理和引用计数的对象
  const _sources = new WeakMap(); // maps WebglTexture objects to instances of Source

  // ========================================
  // OffscreenCanvas 兼容性检测
  // ========================================

  // Cordova iOS (截至5.0版本) 仍然使用UIWebView，它提供OffscreenCanvas，
  // 也支持OffscreenCanvas.getContext("webgl")，但不支持OffscreenCanvas.getContext("2d")！
  // 某些实现可能只部分实现OffscreenCanvas（例如缺少2d上下文）。

  // 标记是否可以使用OffscreenCanvas进行2D操作
  // 这个标志将决定在需要画布时使用哪种实现
  let useOffscreenCanvas = false;

  try {
    // 检测OffscreenCanvas是否可用且支持2D上下文
    // 首先检查OffscreenCanvas构造函数是否存在
    // 然后尝试创建一个1x1的OffscreenCanvas并获取2D上下文
    useOffscreenCanvas =
      typeof OffscreenCanvas !== "undefined" &&
      // eslint-disable-next-line compat/compat
      new OffscreenCanvas(1, 1).getContext("2d") !== null;
  } catch (err) {
    // 忽略任何错误（如构造函数不存在、getContext失败等）
    // 保持useOffscreenCanvas为false，回退到传统的HTMLCanvasElement
  }

  /**
   * 创建画布元素
   * 优先使用OffscreenCanvas（特别是在Web Workers中需要）
   *
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   * @returns {HTMLCanvasElement|OffscreenCanvas} 画布元素
   */
  function createCanvas(width, height) {
    // 根据OffscreenCanvas的可用性选择合适的画布实现
    // OffscreenCanvas的优势：
    // 1. 可以在Web Workers中使用
    // 2. 不会触发主线程的重排和重绘
    // 3. 更好的性能表现

    return useOffscreenCanvas
      ? // 如果支持OffscreenCanvas，创建指定尺寸的离屏画布
        // eslint-disable-next-line compat/compat
        new OffscreenCanvas(width, height)
      : // 否则回退到传统的HTML Canvas元素
        // createElementNS确保在不同环境下正确创建canvas元素
        createElementNS("canvas");
  }

  /**
   * 调整图像大小以适应GPU纹理尺寸限制
   *
   * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap|VideoFrame|Object} image - 要调整大小的图像
   * @param {boolean} needsNewCanvas - 是否需要创建新的画布（立方体纹理需要）
   * @param {number} maxSize - 最大允许的纹理尺寸
   * @returns {HTMLCanvasElement|OffscreenCanvas|Object} 调整大小后的图像或原图像
   */
  function resizeImage(image, needsNewCanvas, maxSize) {
    // 初始化缩放比例为1（不缩放）
    let scale = 1;

    // 获取图像的实际尺寸（处理不同类型的图像对象）
    const dimensions = getDimensions(image);

    // 检查图像是否超过GPU支持的最大纹理尺寸
    if (dimensions.width > maxSize || dimensions.height > maxSize) {
      // 计算缩放比例，使最大边不超过maxSize，同时保持宽高比
      // Math.max确保我们基于较大的边进行缩放
      scale = maxSize / Math.max(dimensions.width, dimensions.height);
    }

    // 只有在需要缩放时（scale < 1）才执行调整大小操作
    if (scale < 1) {
      // 检查图像类型是否支持调整大小操作
      // 需要逐一检查每种类型，因为在某些环境中这些构造函数可能不存在
      if (
        (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement) ||
        (typeof HTMLCanvasElement !== "undefined" && image instanceof HTMLCanvasElement) ||
        (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) ||
        (typeof VideoFrame !== "undefined" && image instanceof VideoFrame)
      ) {
        // 计算缩放后的新尺寸，使用Math.floor确保是整数像素
        const width = Math.floor(scale * dimensions.width);
        const height = Math.floor(scale * dimensions.height);

        // 懒加载画布缓存：只有在第一次需要时才创建
        if (_canvas === undefined) _canvas = createCanvas(width, height);

        // 立方体纹理的6个面需要并行处理，不能重用同一个画布
        // 普通纹理可以重用缓存的画布以提高性能
        const canvas = needsNewCanvas ? createCanvas(width, height) : _canvas;

        // 设置画布的实际像素尺寸
        canvas.width = width;
        canvas.height = height;

        // 获取画布的2D渲染上下文，用于绘制操作
        const context = canvas.getContext("2d");
        // 将原图像绘制到画布上，自动进行缩放
        // 参数：源图像, 目标x, 目标y, 目标宽度, 目标高度
        context.drawImage(image, 0, 0, width, height);

        // 向开发者发出警告，告知纹理尺寸已被调整
        // 这有助于开发者了解性能影响和潜在的质量损失
        console.warn("THREE.WebGLRenderer: Texture has been resized from (" + dimensions.width + "x" + dimensions.height + ") to (" + width + "x" + height + ").");

        // 返回包含缩放后图像的画布
        return canvas;
      } else {
        // 处理不支持调整大小的图像类型（如DataTexture）
        // 检查是否为包含原始数据的对象（如DataTexture）
        if ("data" in image) {
          // 发出警告，但不能进行调整大小操作
          console.warn("THREE.WebGLRenderer: Image in DataTexture is too big (" + dimensions.width + "x" + dimensions.height + ").");
        }

        // 返回原始图像，即使它可能超过尺寸限制
        return image;
      }
    }

    // 如果图像尺寸在允许范围内，直接返回原图像
    return image;
  }

  /**
   * 检查纹理是否需要生成mipmap
   *
   * @param {Texture} texture - 要检查的纹理
   * @returns {boolean} 是否需要生成mipmap
   */
  function textureNeedsGenerateMipmaps(texture) {
    return texture.generateMipmaps;
  }

  /**
   * 为指定的纹理目标生成mipmap
   *
   * @param {number} target - WebGL纹理目标（如TEXTURE_2D, TEXTURE_CUBE_MAP等）
   */
  function generateMipmap(target) {
    _gl.generateMipmap(target);
  }

  /**
   * 根据纹理类型获取对应的WebGL纹理目标
   *
   * @param {Texture} texture - 纹理对象
   * @returns {number} WebGL纹理目标常量
   */
  function getTargetType(texture) {
    if (texture.isWebGLCubeRenderTarget) return _gl.TEXTURE_CUBE_MAP;
    if (texture.isWebGL3DRenderTarget) return _gl.TEXTURE_3D;
    if (texture.isWebGLArrayRenderTarget || texture.isCompressedArrayTexture) return _gl.TEXTURE_2D_ARRAY;
    return _gl.TEXTURE_2D;
  }

  /**
   * 获取WebGL内部格式
   * 根据给定的格式、类型和颜色空间确定最适合的WebGL内部格式
   *
   * @param {string|null} internalFormatName - 指定的内部格式名称
   * @param {number} glFormat - WebGL格式常量
   * @param {number} glType - WebGL类型常量
   * @param {string} colorSpace - 颜色空间
   * @param {boolean} forceLinearTransfer - 是否强制使用线性传输
   * @returns {number} WebGL内部格式常量
   */
  function getInternalFormat(internalFormatName, glFormat, glType, colorSpace, forceLinearTransfer = false) {
    // 如果指定了内部格式名称，尝试使用它
    // 这里处理用户显式指定的WebGL内部格式常量名称，如：'RGBA8'、'RGB32F'、'SRGB8_ALPHA8'等
    if (internalFormatName !== null) {
      // 检查WebGL上下文是否支持该内部格式常量
      // 示例：当internalFormatName = 'RGBA8'时，检查_gl.RGBA8是否存在
      //       当internalFormatName = 'RGB32F'时，检查_gl.RGB32F是否存在
      //       当internalFormatName = 'SRGB8_ALPHA8'时，检查_gl.SRGB8_ALPHA8是否存在
      if (_gl[internalFormatName] !== undefined) return _gl[internalFormatName];

      // 如果指定的内部格式在当前WebGL上下文中不存在，发出警告
      // 示例警告信息：
      // "THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format 'RGBA32UI'"
      // "THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format 'RGB9_E5'"
      // 这通常发生在：
      // 1. 使用了WebGL 1.0不支持的格式（如整数格式）
      // 2. 使用了需要特定扩展的格式但扩展未启用
      // 3. 拼写错误的格式名称
      console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '" + internalFormatName + "'");
    }

    // 默认使用传入的格式作为内部格式
    let internalFormat = glFormat;

    // 处理单通道红色格式
    if (glFormat === _gl.RED) {
      if (glType === _gl.FLOAT) internalFormat = _gl.R32F;
      if (glType === _gl.HALF_FLOAT) internalFormat = _gl.R16F;
      if (glType === _gl.UNSIGNED_BYTE) internalFormat = _gl.R8;
    }

    // 处理单通道红色整数格式
    if (glFormat === _gl.RED_INTEGER) {
      if (glType === _gl.UNSIGNED_BYTE) internalFormat = _gl.R8UI;
      if (glType === _gl.UNSIGNED_SHORT) internalFormat = _gl.R16UI;
      if (glType === _gl.UNSIGNED_INT) internalFormat = _gl.R32UI;
      if (glType === _gl.BYTE) internalFormat = _gl.R8I;
      if (glType === _gl.SHORT) internalFormat = _gl.R16I;
      if (glType === _gl.INT) internalFormat = _gl.R32I;
    }

    // 处理双通道RG格式
    if (glFormat === _gl.RG) {
      if (glType === _gl.FLOAT) internalFormat = _gl.RG32F;
      if (glType === _gl.HALF_FLOAT) internalFormat = _gl.RG16F;
      if (glType === _gl.UNSIGNED_BYTE) internalFormat = _gl.RG8;
    }

    // 处理双通道RG整数格式
    if (glFormat === _gl.RG_INTEGER) {
      if (glType === _gl.UNSIGNED_BYTE) internalFormat = _gl.RG8UI;
      if (glType === _gl.UNSIGNED_SHORT) internalFormat = _gl.RG16UI;
      if (glType === _gl.UNSIGNED_INT) internalFormat = _gl.RG32UI;
      if (glType === _gl.BYTE) internalFormat = _gl.RG8I;
      if (glType === _gl.SHORT) internalFormat = _gl.RG16I;
      if (glType === _gl.INT) internalFormat = _gl.RG32I;
    }

    // 处理三通道RGB整数格式
    if (glFormat === _gl.RGB_INTEGER) {
      if (glType === _gl.UNSIGNED_BYTE) internalFormat = _gl.RGB8UI;
      if (glType === _gl.UNSIGNED_SHORT) internalFormat = _gl.RGB16UI;
      if (glType === _gl.UNSIGNED_INT) internalFormat = _gl.RGB32UI;
      if (glType === _gl.BYTE) internalFormat = _gl.RGB8I;
      if (glType === _gl.SHORT) internalFormat = _gl.RGB16I;
      if (glType === _gl.INT) internalFormat = _gl.RGB32I;
    }

    // 处理四通道RGBA整数格式
    if (glFormat === _gl.RGBA_INTEGER) {
      if (glType === _gl.UNSIGNED_BYTE) internalFormat = _gl.RGBA8UI;
      if (glType === _gl.UNSIGNED_SHORT) internalFormat = _gl.RGBA16UI;
      if (glType === _gl.UNSIGNED_INT) internalFormat = _gl.RGBA32UI;
      if (glType === _gl.BYTE) internalFormat = _gl.RGBA8I;
      if (glType === _gl.SHORT) internalFormat = _gl.RGBA16I;
      if (glType === _gl.INT) internalFormat = _gl.RGBA32I;
    }

    // 处理特殊的RGB格式
    if (glFormat === _gl.RGB) {
      // RGB9_E5是一种特殊的HDR格式，使用共享指数
      if (glType === _gl.UNSIGNED_INT_5_9_9_9_REV) internalFormat = _gl.RGB9_E5;
    }

    // 处理RGBA格式，需要考虑颜色空间和传输函数
    if (glFormat === _gl.RGBA) {
      // 确定传输函数：强制线性或根据颜色空间自动确定
      const transfer = forceLinearTransfer ? LinearTransfer : ColorManagement.getTransfer(colorSpace);

      if (glType === _gl.FLOAT) internalFormat = _gl.RGBA32F;
      if (glType === _gl.HALF_FLOAT) internalFormat = _gl.RGBA16F;
      // 根据传输函数选择sRGB或线性格式
      if (glType === _gl.UNSIGNED_BYTE) internalFormat = transfer === SRGBTransfer ? _gl.SRGB8_ALPHA8 : _gl.RGBA8;
      if (glType === _gl.UNSIGNED_SHORT_4_4_4_4) internalFormat = _gl.RGBA4;
      if (glType === _gl.UNSIGNED_SHORT_5_5_5_1) internalFormat = _gl.RGB5_A1;
    }

    // 如果使用浮点格式，确保启用相应的扩展
    if (
      internalFormat === _gl.R16F ||
      internalFormat === _gl.R32F ||
      internalFormat === _gl.RG16F ||
      internalFormat === _gl.RG32F ||
      internalFormat === _gl.RGBA16F ||
      internalFormat === _gl.RGBA32F
    ) {
      extensions.get("EXT_color_buffer_float");
    }

    return internalFormat;
  }

  /**
   * 获取深度纹理的内部格式
   * 根据是否使用模板缓冲区和深度类型确定合适的内部格式
   *
   * @param {boolean} useStencil - 是否使用模板缓冲区
   * @param {number|null} depthType - 深度类型常量
   * @returns {number} WebGL深度格式常量
   */
  function getInternalDepthFormat(useStencil, depthType) {
    let glInternalFormat;

    if (useStencil) {
      // 需要深度+模板缓冲区的情况
      if (depthType === null || depthType === UnsignedIntType || depthType === UnsignedInt248Type) {
        glInternalFormat = _gl.DEPTH24_STENCIL8;
      } else if (depthType === FloatType) {
        glInternalFormat = _gl.DEPTH32F_STENCIL8;
      } else if (depthType === UnsignedShortType) {
        // 16位深度不支持模板，降级到24位
        glInternalFormat = _gl.DEPTH24_STENCIL8;
        console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.");
      }
    } else {
      // 只需要深度缓冲区的情况
      if (depthType === null || depthType === UnsignedIntType || depthType === UnsignedInt248Type) {
        glInternalFormat = _gl.DEPTH_COMPONENT24;
      } else if (depthType === FloatType) {
        glInternalFormat = _gl.DEPTH_COMPONENT32F;
      } else if (depthType === UnsignedShortType) {
        glInternalFormat = _gl.DEPTH_COMPONENT16;
      }
    }

    return glInternalFormat;
  }

  /**
   * 计算纹理的mipmap级别数量
   * 根据纹理类型和设置确定需要多少个mipmap级别
   *
   * @param {Texture} texture - 纹理对象
   * @param {Object} image - 图像数据
   * @returns {number} mipmap级别数量
   */
  function getMipLevels(texture, image) {
    // 如果需要生成mipmap或者是帧缓冲纹理且使用了mipmap过滤
    if (textureNeedsGenerateMipmaps(texture) === true || (texture.isFramebufferTexture && texture.minFilter !== NearestFilter && texture.minFilter !== LinearFilter)) {
      // 根据图像的最大尺寸计算mipmap级别数
      // 使用对数公式：log₂(max_size) + 1 来计算完整的mipmap链级别数
      // 示例数据：
      // - 对于512×512纹理：Math.log2(Math.max(512, 512)) + 1 = Math.log2(512) + 1 = 9 + 1 = 10级
      // - 对于1024×512纹理：Math.log2(Math.max(1024, 512)) + 1 = Math.log2(1024) + 1 = 10 + 1 = 11级
      // - 对于256×256纹理：Math.log2(Math.max(256, 256)) + 1 = Math.log2(256) + 1 = 8 + 1 = 9级
      // - 对于64×32纹理：Math.log2(Math.max(64, 32)) + 1 = Math.log2(64) + 1 = 6 + 1 = 7级
      // - 对于2048×1024纹理：Math.log2(Math.max(2048, 1024)) + 1 = Math.log2(2048) + 1 = 11 + 1 = 12级
      //
      // Mipmap级别分解（以512×512为例）：
      // Level 0: 512×512 (原始尺寸)
      // Level 1: 256×256
      // Level 2: 128×128
      // Level 3: 64×64
      // Level 4: 32×32
      // Level 5: 16×16
      // Level 6: 8×8
      // Level 7: 4×4
      // Level 8: 2×2
      // Level 9: 1×1 (最小级别)
      // 总计：10个级别
      return Math.log2(Math.max(image.width, image.height)) + 1;
    } else if (texture.mipmaps !== undefined && texture.mipmaps.length > 0) {
      // 用户自定义的mipmaps
      return texture.mipmaps.length;
    } else if (texture.isCompressedTexture && Array.isArray(texture.image)) {
      // 压缩纹理的mipmap数量
      return image.mipmaps.length;
    } else {
      // 没有mipmaps的纹理（只有基础级别）
      return 1;
    }
  }

  // ========================================
  // 事件处理函数
  // ========================================

  /**
   * 纹理销毁事件处理函数
   * 当纹理被销毁时清理相关的WebGL资源
   *
   * @param {Event} event - 销毁事件
   */
  function onTextureDispose(event) {
    const texture = event.target;

    // 移除事件监听器，避免内存泄漏
    texture.removeEventListener("dispose", onTextureDispose);

    // 释放纹理相关的WebGL资源
    deallocateTexture(texture);

    // 如果是视频纹理，从视频纹理映射中移除
    if (texture.isVideoTexture) {
      _videoTextures.delete(texture);
    }
  }

  /**
   * 渲染目标销毁事件处理函数
   * 当渲染目标被销毁时清理相关的WebGL资源
   *
   * @param {Event} event - 销毁事件
   */
  function onRenderTargetDispose(event) {
    const renderTarget = event.target;

    // 移除事件监听器，避免内存泄漏
    renderTarget.removeEventListener("dispose", onRenderTargetDispose);

    // 释放渲染目标相关的WebGL资源
    deallocateRenderTarget(renderTarget);
  }

  // ========================================
  // 资源释放函数
  // ========================================

  /**
   * 释放纹理资源
   * 管理纹理的引用计数，当不再被使用时释放WebGL纹理对象
   *
   * @param {Texture} texture - 要释放的纹理
   */
  function deallocateTexture(texture) {
    const textureProperties = properties.get(texture);

    // 如果纹理还没有初始化，直接返回
    if (textureProperties.__webglInit === undefined) return;

    // 检查是否需要移除WebGLTexture对象
    const source = texture.source;
    const webglTextures = _sources.get(source);

    if (webglTextures) {
      const webglTexture = webglTextures[textureProperties.__cacheKey];
      // 减少引用计数
      webglTexture.usedTimes--;

      // 如果WebGLTexture对象不再被使用，删除它
      if (webglTexture.usedTimes === 0) {
        deleteTexture(texture);
      }

      // 如果没有WebGLTexture使用这个source，移除弱映射条目
      if (Object.keys(webglTextures).length === 0) {
        _sources.delete(source);
      }
    }

    // 从属性管理器中移除纹理
    properties.remove(texture);
  }

  /**
   * 删除WebGL纹理对象
   * 实际删除WebGL纹理并更新统计信息
   *
   * @param {Texture} texture - 要删除的纹理
   */
  function deleteTexture(texture) {
    const textureProperties = properties.get(texture);
    // 删除WebGL纹理对象
    _gl.deleteTexture(textureProperties.__webglTexture);

    // 从source映射中移除对应的缓存条目
    const source = texture.source;
    const webglTextures = _sources.get(source);
    delete webglTextures[textureProperties.__cacheKey];

    // 更新纹理计数统计
    info.memory.textures--;
  }

  /**
   * 释放渲染目标资源
   * 清理渲染目标相关的所有WebGL资源，包括帧缓冲区、渲染缓冲区和纹理
   *
   * @param {WebGLRenderTarget} renderTarget - 要释放的渲染目标
   */
  function deallocateRenderTarget(renderTarget) {
    const renderTargetProperties = properties.get(renderTarget);

    // 释放深度纹理（如果存在）
    if (renderTarget.depthTexture) {
      renderTarget.depthTexture.dispose();
      properties.remove(renderTarget.depthTexture);
    }

    // 处理立方体渲染目标
    if (renderTarget.isWebGLCubeRenderTarget) {
      // 立方体有6个面，每个面都需要清理
      for (let i = 0; i < 6; i++) {
        // 删除帧缓冲区（可能是数组形式的多级mipmap）
        if (Array.isArray(renderTargetProperties.__webglFramebuffer[i])) {
          for (let level = 0; level < renderTargetProperties.__webglFramebuffer[i].length; level++) _gl.deleteFramebuffer(renderTargetProperties.__webglFramebuffer[i][level]);
        } else {
          _gl.deleteFramebuffer(renderTargetProperties.__webglFramebuffer[i]);
        }

        // 删除深度缓冲区
        if (renderTargetProperties.__webglDepthbuffer) _gl.deleteRenderbuffer(renderTargetProperties.__webglDepthbuffer[i]);
      }
    } else {
      // 处理普通2D渲染目标

      // 删除帧缓冲区（可能是数组形式的多级mipmap）
      if (Array.isArray(renderTargetProperties.__webglFramebuffer)) {
        for (let level = 0; level < renderTargetProperties.__webglFramebuffer.length; level++) _gl.deleteFramebuffer(renderTargetProperties.__webglFramebuffer[level]);
      } else {
        _gl.deleteFramebuffer(renderTargetProperties.__webglFramebuffer);
      }

      // 删除各种渲染缓冲区
      if (renderTargetProperties.__webglDepthbuffer) _gl.deleteRenderbuffer(renderTargetProperties.__webglDepthbuffer);
      if (renderTargetProperties.__webglMultisampledFramebuffer) _gl.deleteFramebuffer(renderTargetProperties.__webglMultisampledFramebuffer);

      // 删除颜色渲染缓冲区（多渲染目标情况）
      if (renderTargetProperties.__webglColorRenderbuffer) {
        for (let i = 0; i < renderTargetProperties.__webglColorRenderbuffer.length; i++) {
          if (renderTargetProperties.__webglColorRenderbuffer[i]) _gl.deleteRenderbuffer(renderTargetProperties.__webglColorRenderbuffer[i]);
        }
      }

      // 删除深度渲染缓冲区
      if (renderTargetProperties.__webglDepthRenderbuffer) _gl.deleteRenderbuffer(renderTargetProperties.__webglDepthRenderbuffer);
    }

    // 清理所有附加的纹理
    const textures = renderTarget.textures;
    for (let i = 0, il = textures.length; i < il; i++) {
      const attachmentProperties = properties.get(textures[i]);

      if (attachmentProperties.__webglTexture) {
        _gl.deleteTexture(attachmentProperties.__webglTexture);
        info.memory.textures--; // 更新纹理计数统计
      }

      properties.remove(textures[i]);
    }

    // 从属性管理器中移除渲染目标
    properties.remove(renderTarget);
  }

  // ========================================
  // 纹理单元管理
  // ========================================

  // 当前使用的纹理单元计数器
  let textureUnits = 0;

  /**
   * 重置纹理单元计数器
   * 通常在渲染帧开始时调用，为新的渲染周期做准备
   */
  function resetTextureUnits() {
    // 将纹理单元计数器重置为0，从第一个纹理单元开始分配
    textureUnits = 0;
  }

  /**
   * 分配一个纹理单元
   * 返回下一个可用的纹理单元索引，并递增计数器
   *
   * @returns {number} 纹理单元索引
   */
  function allocateTextureUnit() {
    // 获取当前的纹理单元索引（在递增之前）
    const textureUnit = textureUnits;

    // 检查是否超过GPU支持的最大纹理单元数
    // 这是一个重要的限制，超过会导致WebGL错误
    if (textureUnit >= capabilities.maxTextures) {
      console.warn("THREE.WebGLTextures: Trying to use " + textureUnit + " texture units while this GPU supports only " + capabilities.maxTextures);
    }

    // 递增纹理单元计数器，为下次分配做准备
    textureUnits += 1;

    // 返回分配的纹理单元索引
    return textureUnit;
  }

  /**
   * 生成纹理缓存键
   * 基于纹理的所有相关属性生成唯一的缓存键，用于纹理共享
   *
   * @param {Texture} texture - 纹理对象
   * @returns {string} 纹理缓存键
   */
  function getTextureCacheKey(texture) {
    // 创建数组来收集所有影响纹理WebGL状态的属性
    const array = [];

    // 收集所有影响纹理状态的属性，顺序很重要
    // 这些属性的任何变化都会导致不同的WebGL纹理配置

    array.push(texture.wrapS); // S轴（U轴）包装模式：REPEAT, CLAMP_TO_EDGE, MIRRORED_REPEAT
    array.push(texture.wrapT); // T轴（V轴）包装模式：控制纹理边界处理
    array.push(texture.wrapR || 0); // R轴包装模式（仅3D纹理使用），默认为0
    array.push(texture.magFilter); // 放大过滤器：NEAREST或LINEAR
    array.push(texture.minFilter); // 缩小过滤器：包含mipmap选项
    array.push(texture.anisotropy); // 各向异性过滤级别：提高倾斜角度的纹理质量
    array.push(texture.internalFormat); // WebGL内部存储格式：如RGBA8, RGB565等
    array.push(texture.format); // 像素数据格式：RGBA, RGB, ALPHA等
    array.push(texture.type); // 数据类型：UNSIGNED_BYTE, FLOAT等
    array.push(texture.generateMipmaps); // 是否自动生成mipmap链
    array.push(texture.premultiplyAlpha); // 是否预乘alpha通道
    array.push(texture.flipY); // 是否在上传时翻转Y轴
    array.push(texture.unpackAlignment); // 像素行对齐方式：1, 2, 4, 8字节
    array.push(texture.colorSpace); // 颜色空间：sRGB, Linear等

    // 将所有属性值连接成字符串作为唯一的缓存键
    // 使用默认的逗号分隔符，确保不同属性组合产生不同的键
    return array.join();
  }

  // ========================================
  // 纹理绑定函数
  // ========================================

  /**
   * 设置2D纹理
   * 绑定2D纹理到指定的纹理单元，如果需要则上传纹理数据
   *
   * @param {Texture} texture - 要设置的纹理
   * @param {number} slot - 纹理单元槽位
   */
  function setTexture2D(texture, slot) {
    const textureProperties = properties.get(texture);

    // 如果是视频纹理，更新视频帧
    if (texture.isVideoTexture) updateVideoTexture(texture);

    // 检查是否需要上传新的纹理数据
    if (texture.isRenderTargetTexture === false && texture.isExternalTexture !== true && texture.version > 0 && textureProperties.__version !== texture.version) {
      const image = texture.image;

      if (image === null) {
        console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");
      } else if (image.complete === false) {
        console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");
      } else {
        // 上传纹理数据到GPU
        uploadTexture(textureProperties, texture, slot);
        return;
      }
    } else if (texture.isExternalTexture) {
      // 外部纹理直接使用源纹理
      textureProperties.__webglTexture = texture.sourceTexture ? texture.sourceTexture : null;
    }

    // 绑定纹理到指定的纹理单元
    state.bindTexture(_gl.TEXTURE_2D, textureProperties.__webglTexture, _gl.TEXTURE0 + slot);
  }

  /**
   * 设置2D纹理数组
   * 绑定2D纹理数组到指定的纹理单元
   *
   * @param {Texture} texture - 要设置的纹理数组
   * @param {number} slot - 纹理单元槽位
   */
  function setTexture2DArray(texture, slot) {
    const textureProperties = properties.get(texture);

    // 检查是否需要上传新的纹理数据
    if (texture.isRenderTargetTexture === false && texture.version > 0 && textureProperties.__version !== texture.version) {
      uploadTexture(textureProperties, texture, slot);
      return;
    }

    state.bindTexture(_gl.TEXTURE_2D_ARRAY, textureProperties.__webglTexture, _gl.TEXTURE0 + slot);
  }

  /**
   * 设置3D纹理
   * 绑定3D纹理到指定的纹理单元
   *
   * @param {Texture} texture - 要设置的3D纹理
   * @param {number} slot - 纹理单元槽位
   */
  function setTexture3D(texture, slot) {
    const textureProperties = properties.get(texture);

    // 检查是否需要上传新的纹理数据
    if (texture.isRenderTargetTexture === false && texture.version > 0 && textureProperties.__version !== texture.version) {
      uploadTexture(textureProperties, texture, slot);
      return;
    }

    state.bindTexture(_gl.TEXTURE_3D, textureProperties.__webglTexture, _gl.TEXTURE0 + slot);
  }

  /**
   * 设置立方体纹理
   * 绑定立方体纹理到指定的纹理单元
   *
   * @param {CubeTexture} texture - 要设置的立方体纹理
   * @param {number} slot - 纹理单元槽位
   */
  function setTextureCube(texture, slot) {
    const textureProperties = properties.get(texture);

    // 检查是否需要上传新的纹理数据
    if (texture.version > 0 && textureProperties.__version !== texture.version) {
      uploadCubeTexture(textureProperties, texture, slot);
      return;
    }

    state.bindTexture(_gl.TEXTURE_CUBE_MAP, textureProperties.__webglTexture, _gl.TEXTURE0 + slot);
  }

  // ========================================
  // 常量映射对象
  // ========================================

  // Three.js包装模式到WebGL常量的映射
  const wrappingToGL = {
    [RepeatWrapping]: _gl.REPEAT, // 重复包装
    [ClampToEdgeWrapping]: _gl.CLAMP_TO_EDGE, // 边缘夹紧
    [MirroredRepeatWrapping]: _gl.MIRRORED_REPEAT, // 镜像重复
  };

  // Three.js过滤模式到WebGL常量的映射
  const filterToGL = {
    [NearestFilter]: _gl.NEAREST, // 最近邻过滤
    [NearestMipmapNearestFilter]: _gl.NEAREST_MIPMAP_NEAREST, // 最近邻mipmap最近邻
    [NearestMipmapLinearFilter]: _gl.NEAREST_MIPMAP_LINEAR, // 最近邻mipmap线性

    [LinearFilter]: _gl.LINEAR, // 线性过滤
    [LinearMipmapNearestFilter]: _gl.LINEAR_MIPMAP_NEAREST, // 线性mipmap最近邻
    [LinearMipmapLinearFilter]: _gl.LINEAR_MIPMAP_LINEAR, // 线性mipmap线性
  };

  // Three.js比较函数到WebGL常量的映射（用于深度纹理比较）
  const compareToGL = {
    [NeverCompare]: _gl.NEVER, // 从不通过
    [AlwaysCompare]: _gl.ALWAYS, // 总是通过
    [LessCompare]: _gl.LESS, // 小于
    [LessEqualCompare]: _gl.LEQUAL, // 小于等于
    [EqualCompare]: _gl.EQUAL, // 等于
    [GreaterEqualCompare]: _gl.GEQUAL, // 大于等于
    [GreaterCompare]: _gl.GREATER, // 大于
    [NotEqualCompare]: _gl.NOTEQUAL, // 不等于
  };

  /**
   * 设置纹理参数
   * 配置WebGL纹理的各种参数，包括包装模式、过滤器和各向异性过滤
   *
   * @param {number} textureType - WebGL纹理类型常量
   * @param {Texture} texture - 纹理对象
   */
  function setTextureParameters(textureType, texture) {
    // ========================================
    // 浮点纹理线性过滤兼容性检查
    // ========================================

    // 检查浮点纹理是否尝试使用线性过滤，但设备不支持相应扩展
    if (
      texture.type === FloatType && // 纹理数据类型为浮点
      extensions.has("OES_texture_float_linear") === false && // 设备不支持浮点线性过滤扩展
      (texture.magFilter === LinearFilter || // 放大过滤器使用线性插值
        texture.magFilter === LinearMipmapNearestFilter || // 放大过滤器使用线性mipmap最近邻
        texture.magFilter === NearestMipmapLinearFilter || // 放大过滤器使用最近邻mipmap线性
        texture.magFilter === LinearMipmapLinearFilter || // 放大过滤器使用线性mipmap线性
        texture.minFilter === LinearFilter || // 缩小过滤器使用线性插值
        texture.minFilter === LinearMipmapNearestFilter || // 缩小过滤器使用线性mipmap最近邻
        texture.minFilter === NearestMipmapLinearFilter || // 缩小过滤器使用最近邻mipmap线性
        texture.minFilter === LinearMipmapLinearFilter) // 缩小过滤器使用线性mipmap线性
    ) {
      // 发出警告，告知开发者浮点纹理无法使用线性过滤
      console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.");
    }

    // ========================================
    // 纹理包装模式设置
    // ========================================

    // 设置S轴（U轴，水平方向）的包装模式
    _gl.texParameteri(textureType, _gl.TEXTURE_WRAP_S, wrappingToGL[texture.wrapS]);
    // 设置T轴（V轴，垂直方向）的包装模式
    _gl.texParameteri(textureType, _gl.TEXTURE_WRAP_T, wrappingToGL[texture.wrapT]);

    // 3D纹理和2D纹理数组还需要设置R轴（深度方向）的包装模式
    if (textureType === _gl.TEXTURE_3D || textureType === _gl.TEXTURE_2D_ARRAY) {
      _gl.texParameteri(textureType, _gl.TEXTURE_WRAP_R, wrappingToGL[texture.wrapR]);
    }

    // ========================================
    // 纹理过滤器设置
    // ========================================

    // 设置放大过滤器：当纹理被放大时使用的插值方法
    _gl.texParameteri(textureType, _gl.TEXTURE_MAG_FILTER, filterToGL[texture.magFilter]);
    // 设置缩小过滤器：当纹理被缩小时使用的插值方法（可能包含mipmap）
    _gl.texParameteri(textureType, _gl.TEXTURE_MIN_FILTER, filterToGL[texture.minFilter]);

    // ========================================
    // 深度纹理比较模式设置（用于阴影映射）
    // ========================================

    // 如果纹理定义了比较函数，启用深度比较模式
    if (texture.compareFunction) {
      // 启用纹理比较模式，将纹理值与参考值进行比较
      _gl.texParameteri(textureType, _gl.TEXTURE_COMPARE_MODE, _gl.COMPARE_REF_TO_TEXTURE);
      // 设置具体的比较函数（LESS, LEQUAL, GREATER等）
      _gl.texParameteri(textureType, _gl.TEXTURE_COMPARE_FUNC, compareToGL[texture.compareFunction]);
    }

    // ========================================
    // 各向异性过滤设置
    // ========================================

    // 检查设备是否支持各向异性过滤扩展
    if (extensions.has("EXT_texture_filter_anisotropic") === true) {
      // 各向异性过滤只在特定条件下有效，需要进行多项检查

      // 如果放大过滤器是最近邻，各向异性过滤无效，直接返回
      if (texture.magFilter === NearestFilter) return;
      // 缩小过滤器必须使用线性mipmap模式，各向异性过滤才有意义
      if (texture.minFilter !== NearestMipmapLinearFilter && texture.minFilter !== LinearMipmapLinearFilter) return;
      // 浮点纹理需要线性过滤扩展支持，否则各向异性过滤无效
      if (texture.type === FloatType && extensions.has("OES_texture_float_linear") === false) return;

      // 检查是否需要设置各向异性过滤级别
      if (texture.anisotropy > 1 || properties.get(texture).__currentAnisotropy) {
        // 获取各向异性过滤扩展对象
        const extension = extensions.get("EXT_texture_filter_anisotropic");
        // 设置各向异性过滤级别，取纹理要求值和硬件支持最大值的较小者
        _gl.texParameterf(textureType, extension.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(texture.anisotropy, capabilities.getMaxAnisotropy()));
        // 缓存当前设置的各向异性级别，避免重复设置
        properties.get(texture).__currentAnisotropy = texture.anisotropy;
      }
    }
  }

  /**
   * 初始化纹理
   * 管理纹理的WebGL对象创建和缓存，实现纹理共享机制
   *
   * @param {Object} textureProperties - 纹理属性对象
   * @param {Texture} texture - 要初始化的纹理
   * @returns {boolean} 是否需要强制上传纹理数据
   */
  function initTexture(textureProperties, texture) {
    let forceUpload = false;

    // 如果纹理还未初始化，进行初始化设置
    if (textureProperties.__webglInit === undefined) {
      textureProperties.__webglInit = true;
      // 添加销毁事件监听器，确保资源正确清理
      texture.addEventListener("dispose", onTextureDispose);
    }

    // 创建Source到WebGLTextures的映射（如果需要）
    // 这个映射用于实现纹理共享，多个纹理对象可以共享同一个WebGL纹理
    const source = texture.source;
    let webglTextures = _sources.get(source);

    if (webglTextures === undefined) {
      webglTextures = {};
      _sources.set(source, webglTextures);
    }

    // 检查是否已经存在具有相同参数的WebGLTexture对象
    const textureCacheKey = getTextureCacheKey(texture);

    if (textureCacheKey !== textureProperties.__cacheKey) {
      // 如果不存在，创建新的WebGLTexture实例
      if (webglTextures[textureCacheKey] === undefined) {
        // 创建新的缓存条目
        webglTextures[textureCacheKey] = {
          texture: _gl.createTexture(), // 创建WebGL纹理对象
          usedTimes: 0, // 引用计数
        };

        info.memory.textures++; // 更新纹理统计

        // 当创建新的WebGLTexture实例时，需要强制上传纹理数据
        // 即使图像内容相同也需要上传
        forceUpload = true;
      }

      // 增加引用计数
      webglTextures[textureCacheKey].usedTimes++;

      // 每次纹理缓存键改变时，需要检查是否可以删除旧的WebGLTexture实例
      // 以避免内存泄漏
      const webglTexture = webglTextures[textureProperties.__cacheKey];

      if (webglTexture !== undefined) {
        webglTextures[textureProperties.__cacheKey].usedTimes--;

        // 如果引用计数为0，删除WebGL纹理对象
        if (webglTexture.usedTimes === 0) {
          deleteTexture(texture);
        }
      }

      // 存储缓存键和WebGLTexture对象的引用
      textureProperties.__cacheKey = textureCacheKey;
      textureProperties.__webglTexture = webglTextures[textureCacheKey].texture;
    }

    return forceUpload;
  }

  /**
   * 计算像素索引对应的行号
   * 用于纹理更新范围的行计算
   *
   * @param {number} index - 像素索引
   * @param {number} rowLength - 行长度（像素数）
   * @param {number} componentStride - 组件步长（每像素的组件数）
   * @returns {number} 行号
   */
  function getRow(index, rowLength, componentStride) {
    return Math.floor(Math.floor(index / componentStride) / rowLength);
  }

  /**
   * 更新纹理数据
   * 支持部分更新和范围合并优化，提高更新性能
   *
   * @param {Texture} texture - 要更新的纹理
   * @param {Object} image - 图像数据对象
   * @param {number} glFormat - WebGL格式
   * @param {number} glType - WebGL类型
   */
  function updateTexture(texture, image, glFormat, glType) {
    const componentStride = 4; // 目前只支持RGBA格式

    const updateRanges = texture.updateRanges;

    if (updateRanges.length === 0) {
      // 没有指定更新范围，更新整个纹理
      state.texSubImage2D(_gl.TEXTURE_2D, 0, 0, 0, image.width, image.height, glFormat, glType, image.data);
    } else {
      // 在应用更新范围之前，合并相邻/重叠的范围以减少gl.texSubImage2D的调用次数
      // 经验表明，这对大量使用更新范围的应用程序有性能改善
      // 可能是由于GPU命令开销的原因
      //
      // 注意：为了减少帧间垃圾回收，我们就地合并更新范围
      // 这是安全的，因为此方法会在更新后清除更新范围

      // 按起始位置排序
      updateRanges.sort((a, b) => a.start - b.start);

      // 就地合并更新范围，从左到右遍历现有的updateRanges数组，合并范围
      // 这可能导致最终数组比原始数组小。此索引跟踪表示合并范围的最后一个索引，
      // 完成合并算法后，可以修剪此索引之后的任何数据
      let mergeIndex = 0;

      for (let i = 1; i < updateRanges.length; i++) {
        const previousRange = updateRanges[mergeIndex];
        const range = updateRanges[i];

        // 只有在同一行且重叠/相邻时才合并
        const previousEnd = previousRange.start + previousRange.count;
        const currentRow = getRow(range.start, image.width, componentStride);
        const previousRow = getRow(previousRange.start, image.width, componentStride);

        // 这里加1是为了合并相邻范围。这是安全的，因为范围操作正整数
        if (
          range.start <= previousEnd + 1 &&
          currentRow === previousRow &&
          getRow(range.start + range.count - 1, image.width, componentStride) === currentRow // 确保范围不会溢出
        ) {
          // 合并范围
          previousRange.count = Math.max(previousRange.count, range.start + range.count - previousRange.start);
        } else {
          // 不能合并，移动到下一个位置
          ++mergeIndex;
          updateRanges[mergeIndex] = range;
        }
      }

      // 修剪数组，只包含合并后的范围
      updateRanges.length = mergeIndex + 1;

      // 保存当前的像素存储参数
      const currentUnpackRowLen = _gl.getParameter(_gl.UNPACK_ROW_LENGTH);
      const currentUnpackSkipPixels = _gl.getParameter(_gl.UNPACK_SKIP_PIXELS);
      const currentUnpackSkipRows = _gl.getParameter(_gl.UNPACK_SKIP_ROWS);

      // 设置行长度为图像宽度
      _gl.pixelStorei(_gl.UNPACK_ROW_LENGTH, image.width);

      // 遍历所有合并后的更新范围
      for (let i = 0, l = updateRanges.length; i < l; i++) {
        const range = updateRanges[i];

        // 将字节索引转换为像素索引
        const pixelStart = Math.floor(range.start / componentStride);
        const pixelCount = Math.ceil(range.count / componentStride);

        // 计算2D坐标
        const x = pixelStart % image.width;
        const y = Math.floor(pixelStart / image.width);

        // 假设更新范围引用连续内存（水平条带）
        const width = pixelCount;
        const height = 1;

        // 设置像素存储参数以跳过到正确的位置
        _gl.pixelStorei(_gl.UNPACK_SKIP_PIXELS, x);
        _gl.pixelStorei(_gl.UNPACK_SKIP_ROWS, y);

        // 更新纹理的指定区域
        state.texSubImage2D(_gl.TEXTURE_2D, 0, x, y, width, height, glFormat, glType, image.data);
      }

      // 清除更新范围，避免重复更新
      texture.clearUpdateRanges();

      // 恢复原始的像素存储参数
      _gl.pixelStorei(_gl.UNPACK_ROW_LENGTH, currentUnpackRowLen);
      _gl.pixelStorei(_gl.UNPACK_SKIP_PIXELS, currentUnpackSkipPixels);
      _gl.pixelStorei(_gl.UNPACK_SKIP_ROWS, currentUnpackSkipRows);
    }
  }

  /**
   * 上传纹理数据到GPU
   * 这是纹理管理的核心函数，处理各种类型纹理的上传逻辑
   *
   * @param {Object} textureProperties - 纹理属性对象
   * @param {Texture} texture - 要上传的纹理
   * @param {number} slot - 纹理单元槽位
   */
  function uploadTexture(textureProperties, texture, slot) {
    // 确定纹理类型
    let textureType = _gl.TEXTURE_2D;

    if (texture.isDataArrayTexture || texture.isCompressedArrayTexture) textureType = _gl.TEXTURE_2D_ARRAY;
    if (texture.isData3DTexture) textureType = _gl.TEXTURE_3D;

    // 初始化纹理，获取是否需要强制上传的标志
    const forceUpload = initTexture(textureProperties, texture);
    const source = texture.source;

    // 绑定纹理到指定的纹理单元
    state.bindTexture(textureType, textureProperties.__webglTexture, _gl.TEXTURE0 + slot);

    const sourceProperties = properties.get(source);

    // 检查是否需要上传新数据（版本变化或强制上传）
    if (source.version !== sourceProperties.__version || forceUpload === true) {
      // 激活纹理单元
      state.activeTexture(_gl.TEXTURE0 + slot);

      // 处理颜色空间转换
      const workingPrimaries = ColorManagement.getPrimaries(ColorManagement.workingColorSpace);
      const texturePrimaries = texture.colorSpace === NoColorSpace ? null : ColorManagement.getPrimaries(texture.colorSpace);
      const unpackConversion = texture.colorSpace === NoColorSpace || workingPrimaries === texturePrimaries ? _gl.NONE : _gl.BROWSER_DEFAULT_WEBGL;

      // 设置像素存储参数
      _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, texture.flipY); // Y轴翻转
      _gl.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha); // 预乘Alpha
      _gl.pixelStorei(_gl.UNPACK_ALIGNMENT, texture.unpackAlignment); // 对齐方式
      _gl.pixelStorei(_gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, unpackConversion); // 颜色空间转换

      // 处理图像：调整大小和验证颜色空间
      let image = resizeImage(texture.image, false, capabilities.maxTextureSize);
      image = verifyColorSpace(texture, image);

      // 获取WebGL格式和类型
      const glFormat = utils.convert(texture.format, texture.colorSpace);
      const glType = utils.convert(texture.type);
      let glInternalFormat = getInternalFormat(texture.internalFormat, glFormat, glType, texture.colorSpace, texture.isVideoTexture);

      // 设置纹理参数（过滤、包装等）
      setTextureParameters(textureType, texture);

      // 准备mipmap相关变量
      let mipmap;
      const mipmaps = texture.mipmaps;

      // 确定是否使用texStorage（视频纹理不使用）
      /* 
      视频纹理的特殊性：

      动态尺寸：视频帧的尺寸可能在运行时改变
      格式变化：视频编码格式可能动态调整
      频繁更新：视频纹理需要每帧更新内容
      浏览器优化：浏览器对视频纹理有特殊的优化路径
      texStorage 的限制：

      创建后尺寸和格式不可变
      适合静态或尺寸固定的纹理
      提供更好的性能优化机会

      使用 texStorage 的优势：

      GPU内存管理：提前分配固定大小的存储空间
      性能优化：GPU驱动可以进行更好的优化
      避免重新分配：减少内存碎片和分配开销
      类型安全：格式一致性保证
      视频纹理使用 texImage 的原因：
          
      灵活性：支持动态尺寸和格式变化
      兼容性：更好地支持各种视频编码格式
      浏览器优化：利用浏览器的视频解码优化
       */
      const useTexStorage = texture.isVideoTexture !== true;
      // 确定是否需要分配内存（新纹理或强制上传）
      const allocateMemory = sourceProperties.__version === undefined || forceUpload === true;
      // 检查数据是否准备就绪
      const dataReady = source.dataReady;
      // 计算mipmap级别数
      const levels = getMipLevels(texture, image);

      // 处理深度纹理
      if (texture.isDepthTexture) {
        // 获取深度纹理的内部格式
        glInternalFormat = getInternalDepthFormat(texture.format === DepthStencilFormat, texture.type);

        // 分配深度纹理内存
        if (allocateMemory) {
          if (useTexStorage) {
            // 使用texStorage2D分配不可变存储（只有1个级别，深度纹理不需要mipmap）
            state.texStorage2D(_gl.TEXTURE_2D, 1, glInternalFormat, image.width, image.height);
          } else {
            // 使用texImage2D分配可变存储
            state.texImage2D(_gl.TEXTURE_2D, 0, glInternalFormat, image.width, image.height, 0, glFormat, glType, null);
          }
        }
      } else if (texture.isDataTexture) {
        // 处理数据纹理（包含原始像素数据的纹理）

        // 如果有手动创建的mipmaps，使用它们
        // 如果没有手动mipmaps，设置0级mipmap然后让GL生成其他mipmap级别
        if (mipmaps.length > 0) {
          // 有预定义的mipmap数据
          if (useTexStorage && allocateMemory) {
            // 分配所有mipmap级别的存储空间
            state.texStorage2D(_gl.TEXTURE_2D, levels, glInternalFormat, mipmaps[0].width, mipmaps[0].height);
          }

          // 上传每个mipmap级别的数据
          for (let i = 0, il = mipmaps.length; i < il; i++) {
            mipmap = mipmaps[i];

            if (useTexStorage) {
              // 使用texSubImage2D更新已分配的存储
              if (dataReady) {
                state.texSubImage2D(_gl.TEXTURE_2D, i, 0, 0, mipmap.width, mipmap.height, glFormat, glType, mipmap.data);
              }
            } else {
              // 使用texImage2D直接设置每个级别
              state.texImage2D(_gl.TEXTURE_2D, i, glInternalFormat, mipmap.width, mipmap.height, 0, glFormat, glType, mipmap.data);
            }
          }

          // 禁用自动mipmap生成，因为我们已经提供了所有级别
          texture.generateMipmaps = false;
        } else {
          // 没有预定义的mipmap，只有基础级别
          if (useTexStorage) {
            if (allocateMemory) {
              // 分配存储空间（可能包含多个mipmap级别）
              state.texStorage2D(_gl.TEXTURE_2D, levels, glInternalFormat, image.width, image.height);
            }

            if (dataReady) {
              // 使用优化的更新函数上传数据（支持部分更新）
              updateTexture(texture, image, glFormat, glType);
            }
          } else {
            // 直接上传基础级别数据
            state.texImage2D(_gl.TEXTURE_2D, 0, glInternalFormat, image.width, image.height, 0, glFormat, glType, image.data);
          }
        }
      } else if (texture.isCompressedTexture) {
        // 处理压缩纹理

        if (texture.isCompressedArrayTexture) {
          // 处理压缩纹理数组
          if (useTexStorage && allocateMemory) {
            // 为3D纹理数组分配存储空间
            state.texStorage3D(_gl.TEXTURE_2D_ARRAY, levels, glInternalFormat, mipmaps[0].width, mipmaps[0].height, image.depth);
          }

          // 上传每个mipmap级别的数据
          for (let i = 0, il = mipmaps.length; i < il; i++) {
            mipmap = mipmaps[i];

            if (texture.format !== RGBAFormat) {
              // 处理压缩格式（如DXT、ETC、ASTC等）
              if (glFormat !== null) {
                if (useTexStorage) {
                  if (dataReady) {
                    if (texture.layerUpdates.size > 0) {
                      // 部分层更新：只更新指定的层
                      const layerByteLength = getByteLength(mipmap.width, mipmap.height, texture.format, texture.type);

                      for (const layerIndex of texture.layerUpdates) {
                        // 提取指定层的数据
                        const layerData = mipmap.data.subarray(
                          (layerIndex * layerByteLength) / mipmap.data.BYTES_PER_ELEMENT,
                          ((layerIndex + 1) * layerByteLength) / mipmap.data.BYTES_PER_ELEMENT
                        );
                        // 更新单个层的压缩纹理数据
                        state.compressedTexSubImage3D(_gl.TEXTURE_2D_ARRAY, i, 0, 0, layerIndex, mipmap.width, mipmap.height, 1, glFormat, layerData);
                      }

                      // 清除层更新标记
                      texture.clearLayerUpdates();
                    } else {
                      // 更新所有层的压缩纹理数据
                      state.compressedTexSubImage3D(_gl.TEXTURE_2D_ARRAY, i, 0, 0, 0, mipmap.width, mipmap.height, image.depth, glFormat, mipmap.data);
                    }
                  }
                } else {
                  // 直接设置压缩纹理数据
                  state.compressedTexImage3D(_gl.TEXTURE_2D_ARRAY, i, glInternalFormat, mipmap.width, mipmap.height, image.depth, 0, mipmap.data, 0, 0);
                }
              } else {
                console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");
              }
            } else {
              // 处理未压缩的RGBA格式
              if (useTexStorage) {
                if (dataReady) {
                  state.texSubImage3D(_gl.TEXTURE_2D_ARRAY, i, 0, 0, 0, mipmap.width, mipmap.height, image.depth, glFormat, glType, mipmap.data);
                }
              } else {
                state.texImage3D(_gl.TEXTURE_2D_ARRAY, i, glInternalFormat, mipmap.width, mipmap.height, image.depth, 0, glFormat, glType, mipmap.data);
              }
            }
          }
        } else {
          // 处理普通2D压缩纹理
          if (useTexStorage && allocateMemory) {
            // 为2D纹理分配存储空间
            state.texStorage2D(_gl.TEXTURE_2D, levels, glInternalFormat, mipmaps[0].width, mipmaps[0].height);
          }

          // 上传每个mipmap级别的数据
          for (let i = 0, il = mipmaps.length; i < il; i++) {
            mipmap = mipmaps[i];

            if (texture.format !== RGBAFormat) {
              // 处理压缩格式
              if (glFormat !== null) {
                if (useTexStorage) {
                  if (dataReady) {
                    // 更新压缩纹理数据
                    state.compressedTexSubImage2D(_gl.TEXTURE_2D, i, 0, 0, mipmap.width, mipmap.height, glFormat, mipmap.data);
                  }
                } else {
                  // 直接设置压缩纹理数据
                  state.compressedTexImage2D(_gl.TEXTURE_2D, i, glInternalFormat, mipmap.width, mipmap.height, 0, mipmap.data);
                }
              } else {
                console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");
              }
            } else {
              // 处理未压缩的RGBA格式
              if (useTexStorage) {
                if (dataReady) {
                  state.texSubImage2D(_gl.TEXTURE_2D, i, 0, 0, mipmap.width, mipmap.height, glFormat, glType, mipmap.data);
                }
              } else {
                state.texImage2D(_gl.TEXTURE_2D, i, glInternalFormat, mipmap.width, mipmap.height, 0, glFormat, glType, mipmap.data);
              }
            }
          }
        }
      } else if (texture.isDataArrayTexture) {
        // 处理数据纹理数组
        if (useTexStorage) {
          if (allocateMemory) {
            // 为3D纹理数组分配存储空间
            state.texStorage3D(_gl.TEXTURE_2D_ARRAY, levels, glInternalFormat, image.width, image.height, image.depth);
          }

          if (dataReady) {
            if (texture.layerUpdates.size > 0) {
              // 部分层更新：只更新指定的层
              const layerByteLength = getByteLength(image.width, image.height, texture.format, texture.type);

              for (const layerIndex of texture.layerUpdates) {
                // 提取指定层的数据
                const layerData = image.data.subarray(
                  (layerIndex * layerByteLength) / image.data.BYTES_PER_ELEMENT,
                  ((layerIndex + 1) * layerByteLength) / image.data.BYTES_PER_ELEMENT
                );
                // 更新单个层的纹理数据
                state.texSubImage3D(_gl.TEXTURE_2D_ARRAY, 0, 0, 0, layerIndex, image.width, image.height, 1, glFormat, glType, layerData);
              }

              // 清除层更新标记
              texture.clearLayerUpdates();
            } else {
              // 更新所有层的纹理数据
              state.texSubImage3D(_gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, image.width, image.height, image.depth, glFormat, glType, image.data);
            }
          }
        } else {
          // 直接设置3D纹理数据
          state.texImage3D(_gl.TEXTURE_2D_ARRAY, 0, glInternalFormat, image.width, image.height, image.depth, 0, glFormat, glType, image.data);
        }
      } else if (texture.isData3DTexture) {
        // 处理3D数据纹理
        if (useTexStorage) {
          if (allocateMemory) {
            // 为3D纹理分配存储空间
            state.texStorage3D(_gl.TEXTURE_3D, levels, glInternalFormat, image.width, image.height, image.depth);
          }

          if (dataReady) {
            // 更新3D纹理数据
            state.texSubImage3D(_gl.TEXTURE_3D, 0, 0, 0, 0, image.width, image.height, image.depth, glFormat, glType, image.data);
          }
        } else {
          // 直接设置3D纹理数据
          state.texImage3D(_gl.TEXTURE_3D, 0, glInternalFormat, image.width, image.height, image.depth, 0, glFormat, glType, image.data);
        }
      } else if (texture.isFramebufferTexture) {
        // 处理帧缓冲纹理（用于渲染到纹理）
        if (allocateMemory) {
          if (useTexStorage) {
            // 使用texStorage分配不可变存储
            state.texStorage2D(_gl.TEXTURE_2D, levels, glInternalFormat, image.width, image.height);
          } else {
            // 使用texImage2D为每个mipmap级别分配存储
            let width = image.width,
              height = image.height;

            for (let i = 0; i < levels; i++) {
              // 为每个级别创建空纹理（数据为null）
              state.texImage2D(_gl.TEXTURE_2D, i, glInternalFormat, width, height, 0, glFormat, glType, null);

              // 计算下一级别的尺寸（每级减半）
              width >>= 1;
              height >>= 1;
            }
          }
        }
      } else {
        // 处理普通纹理（图像、视频、画布）

        // 如果有手动创建的mipmaps，使用它们
        // 如果没有手动mipmaps，设置0级mipmap然后让GL生成其他mipmap级别
        if (mipmaps.length > 0) {
          // 有预定义的mipmap数据
          if (useTexStorage && allocateMemory) {
            // 获取第一个mipmap的尺寸作为基础尺寸
            const dimensions = getDimensions(mipmaps[0]);
            // 分配所有mipmap级别的存储空间
            state.texStorage2D(_gl.TEXTURE_2D, levels, glInternalFormat, dimensions.width, dimensions.height);
          }

          // 上传每个mipmap级别的数据
          for (let i = 0, il = mipmaps.length; i < il; i++) {
            mipmap = mipmaps[i];

            if (useTexStorage) {
              if (dataReady) {
                // 使用texSubImage2D更新已分配的存储
                state.texSubImage2D(_gl.TEXTURE_2D, i, 0, 0, glFormat, glType, mipmap);
              }
            } else {
              // 使用texImage2D直接设置每个级别
              state.texImage2D(_gl.TEXTURE_2D, i, glInternalFormat, glFormat, glType, mipmap);
            }
          }

          // 禁用自动mipmap生成，因为我们已经提供了所有级别
          texture.generateMipmaps = false;
        } else {
          // 没有预定义的mipmap，只有基础级别
          if (useTexStorage) {
            if (allocateMemory) {
              // 获取图像尺寸并分配存储空间
              const dimensions = getDimensions(image);
              state.texStorage2D(_gl.TEXTURE_2D, levels, glInternalFormat, dimensions.width, dimensions.height);
            }

            if (dataReady) {
              // 上传基础级别的图像数据
              state.texSubImage2D(_gl.TEXTURE_2D, 0, 0, 0, glFormat, glType, image);
            }
          } else {
            // 直接上传基础级别数据
            state.texImage2D(_gl.TEXTURE_2D, 0, glInternalFormat, glFormat, glType, image);
          }
        }
      }

      // 如果需要生成mipmap，自动生成
      if (textureNeedsGenerateMipmaps(texture)) {
        generateMipmap(textureType);
      }

      // 更新源版本号，标记已上传
      sourceProperties.__version = source.version;

      // 调用纹理更新回调（如果存在）
      if (texture.onUpdate) texture.onUpdate(texture);
    }

    // 更新纹理版本号
    textureProperties.__version = texture.version;
  }

  /**
   * 上传立方体纹理数据到GPU
   * 处理立方体纹理的6个面的上传，支持压缩纹理和数据纹理
   *
   * @param {Object} textureProperties - 纹理属性对象
   * @param {CubeTexture} texture - 要上传的立方体纹理
   * @param {number} slot - 纹理单元槽位
   */
  function uploadCubeTexture(textureProperties, texture, slot) {
    // 立方体纹理必须有6个面的图像
    if (texture.image.length !== 6) return;

    // 初始化纹理，获取是否需要强制上传的标志
    const forceUpload = initTexture(textureProperties, texture);
    const source = texture.source;

    // 绑定立方体纹理到指定的纹理单元
    state.bindTexture(_gl.TEXTURE_CUBE_MAP, textureProperties.__webglTexture, _gl.TEXTURE0 + slot);

    const sourceProperties = properties.get(source);

    // 检查是否需要上传新数据
    if (source.version !== sourceProperties.__version || forceUpload === true) {
      // 激活纹理单元
      state.activeTexture(_gl.TEXTURE0 + slot);

      // 处理颜色空间转换
      const workingPrimaries = ColorManagement.getPrimaries(ColorManagement.workingColorSpace);
      const texturePrimaries = texture.colorSpace === NoColorSpace ? null : ColorManagement.getPrimaries(texture.colorSpace);
      const unpackConversion = texture.colorSpace === NoColorSpace || workingPrimaries === texturePrimaries ? _gl.NONE : _gl.BROWSER_DEFAULT_WEBGL;

      // 设置像素存储参数
      _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, texture.flipY);
      _gl.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha);
      _gl.pixelStorei(_gl.UNPACK_ALIGNMENT, texture.unpackAlignment);
      _gl.pixelStorei(_gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, unpackConversion);

      // 检测纹理类型
      const isCompressed = texture.isCompressedTexture || texture.image[0].isCompressedTexture;
      const isDataTexture = texture.image[0] && texture.image[0].isDataTexture;

      // 处理立方体的6个面
      const cubeImage = [];

      for (let i = 0; i < 6; i++) {
        if (!isCompressed && !isDataTexture) {
          // 普通图像需要调整大小以适应立方体纹理限制
          cubeImage[i] = resizeImage(texture.image[i], true, capabilities.maxCubemapSize);
        } else {
          // 压缩纹理和数据纹理直接使用
          cubeImage[i] = isDataTexture ? texture.image[i].image : texture.image[i];
        }

        // 验证和转换颜色空间
        cubeImage[i] = verifyColorSpace(texture, cubeImage[i]);
      }

      // 获取格式信息（使用第一个面作为参考）
      const image = cubeImage[0],
        glFormat = utils.convert(texture.format, texture.colorSpace),
        glType = utils.convert(texture.type),
        glInternalFormat = getInternalFormat(texture.internalFormat, glFormat, glType, texture.colorSpace);

      // 设置存储和内存分配标志
      const useTexStorage = texture.isVideoTexture !== true;
      const allocateMemory = sourceProperties.__version === undefined || forceUpload === true;
      const dataReady = source.dataReady;
      let levels = getMipLevels(texture, image);

      // 设置立方体纹理参数
      setTextureParameters(_gl.TEXTURE_CUBE_MAP, texture);

      let mipmaps;

      if (isCompressed) {
        // 处理压缩立方体纹理
        if (useTexStorage && allocateMemory) {
          // 为立方体纹理分配存储空间
          state.texStorage2D(_gl.TEXTURE_CUBE_MAP, levels, glInternalFormat, image.width, image.height);
        }

        // 遍历立方体的6个面
        for (let i = 0; i < 6; i++) {
          mipmaps = cubeImage[i].mipmaps;

          // 上传每个面的每个mipmap级别
          for (let j = 0; j < mipmaps.length; j++) {
            const mipmap = mipmaps[j];

            if (texture.format !== RGBAFormat) {
              // 处理压缩格式
              if (glFormat !== null) {
                if (useTexStorage) {
                  if (dataReady) {
                    // 更新压缩纹理数据到指定的立方体面
                    state.compressedTexSubImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j, 0, 0, mipmap.width, mipmap.height, glFormat, mipmap.data);
                  }
                } else {
                  // 直接设置压缩纹理数据到指定的立方体面
                  state.compressedTexImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j, glInternalFormat, mipmap.width, mipmap.height, 0, mipmap.data);
                }
              } else {
                console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()");
              }
            } else {
              // 处理未压缩的RGBA格式
              if (useTexStorage) {
                if (dataReady) {
                  state.texSubImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j, 0, 0, mipmap.width, mipmap.height, glFormat, glType, mipmap.data);
                }
              } else {
                state.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j, glInternalFormat, mipmap.width, mipmap.height, 0, glFormat, glType, mipmap.data);
              }
            }
          }
        }
      } else {
        // 处理未压缩的立方体纹理
        mipmaps = texture.mipmaps;

        if (useTexStorage && allocateMemory) {
          // TODO: 统一处理mipmap定义
          // 普通纹理和压缩立方体纹理在mipmap数组中定义基础级别+mips
          // 未压缩立方体纹理的mipmap数组只用于mips（不包含基础级别）

          // 如果有mipmap，需要额外的级别
          if (mipmaps.length > 0) levels++;

          // 获取第一个面的尺寸作为基础尺寸
          const dimensions = getDimensions(cubeImage[0]);
          // 为立方体纹理分配存储空间
          state.texStorage2D(_gl.TEXTURE_CUBE_MAP, levels, glInternalFormat, dimensions.width, dimensions.height);
        }

        // 遍历立方体的6个面
        for (let i = 0; i < 6; i++) {
          if (isDataTexture) {
            // 处理数据纹理类型的立方体面

            // 上传基础级别（级别0）
            if (useTexStorage) {
              if (dataReady) {
                state.texSubImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, 0, 0, cubeImage[i].width, cubeImage[i].height, glFormat, glType, cubeImage[i].data);
              }
            } else {
              state.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, glInternalFormat, cubeImage[i].width, cubeImage[i].height, 0, glFormat, glType, cubeImage[i].data);
            }

            // 上传mipmap级别（级别1+）
            for (let j = 0; j < mipmaps.length; j++) {
              const mipmap = mipmaps[j];
              const mipmapImage = mipmap.image[i].image;

              if (useTexStorage) {
                if (dataReady) {
                  state.texSubImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j + 1, 0, 0, mipmapImage.width, mipmapImage.height, glFormat, glType, mipmapImage.data);
                }
              } else {
                state.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j + 1, glInternalFormat, mipmapImage.width, mipmapImage.height, 0, glFormat, glType, mipmapImage.data);
              }
            }
          } else {
            // 处理普通图像类型的立方体面

            // 上传基础级别（级别0）
            if (useTexStorage) {
              if (dataReady) {
                state.texSubImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, 0, 0, glFormat, glType, cubeImage[i]);
              }
            } else {
              state.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, glInternalFormat, glFormat, glType, cubeImage[i]);
            }

            // 上传mipmap级别（级别1+）
            for (let j = 0; j < mipmaps.length; j++) {
              const mipmap = mipmaps[j];

              if (useTexStorage) {
                if (dataReady) {
                  state.texSubImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j + 1, 0, 0, glFormat, glType, mipmap.image[i]);
                }
              } else {
                state.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j + 1, glInternalFormat, glFormat, glType, mipmap.image[i]);
              }
            }
          }
        }
      }

      // 如果需要生成mipmap，自动生成
      if (textureNeedsGenerateMipmaps(texture)) {
        // 我们假设立方体贴图的所有面都有相同的尺寸
        generateMipmap(_gl.TEXTURE_CUBE_MAP);
      }

      // 更新源版本号，标记已上传
      sourceProperties.__version = source.version;

      // 调用纹理更新回调（如果存在）
      if (texture.onUpdate) texture.onUpdate(texture);
    }

    // 更新纹理版本号
    textureProperties.__version = texture.version;
  }

  // ========================================
  // 渲染目标相关函数
  // ========================================

  /**
   * 设置帧缓冲纹理
   * 为目标纹理设置存储并将其绑定到正确的帧缓冲区
   *
   * @param {WebGLFramebuffer} framebuffer - 帧缓冲区对象
   * @param {WebGLRenderTarget} renderTarget - 渲染目标
   * @param {Texture} texture - 纹理对象
   * @param {number} attachment - 附件点
   * @param {number} textureTarget - 纹理目标
   * @param {number} level - mipmap级别
   */
  function setupFrameBufferTexture(framebuffer, renderTarget, texture, attachment, textureTarget, level) {
    // 获取纹理格式信息
    const glFormat = utils.convert(texture.format, texture.colorSpace);
    const glType = utils.convert(texture.type);
    const glInternalFormat = getInternalFormat(texture.internalFormat, glFormat, glType, texture.colorSpace);
    const renderTargetProperties = properties.get(renderTarget);
    const textureProperties = properties.get(texture);

    // 标记纹理属于哪个渲染目标
    textureProperties.__renderTarget = renderTarget;

    // 如果不是外部纹理，需要分配纹理存储
    if (!renderTargetProperties.__hasExternalTextures) {
      // 计算当前mipmap级别的尺寸
      const width = Math.max(1, renderTarget.width >> level);
      const height = Math.max(1, renderTarget.height >> level);

      if (textureTarget === _gl.TEXTURE_3D || textureTarget === _gl.TEXTURE_2D_ARRAY) {
        // 为3D纹理或纹理数组分配存储
        state.texImage3D(textureTarget, level, glInternalFormat, width, height, renderTarget.depth, 0, glFormat, glType, null);
      } else {
        // 为2D纹理分配存储
        state.texImage2D(textureTarget, level, glInternalFormat, width, height, 0, glFormat, glType, null);
      }
    }

    // 绑定帧缓冲区
    state.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);

    if (useMultisampledRTT(renderTarget)) {
      // 使用多重采样渲染到纹理扩展
      multisampledRTTExt.framebufferTexture2DMultisampleEXT(_gl.FRAMEBUFFER, attachment, textureTarget, textureProperties.__webglTexture, 0, getRenderTargetSamples(renderTarget));
    } else if (textureTarget === _gl.TEXTURE_2D || (textureTarget >= _gl.TEXTURE_CUBE_MAP_POSITIVE_X && textureTarget <= _gl.TEXTURE_CUBE_MAP_NEGATIVE_Z)) {
      // 将纹理附加到帧缓冲区（参见 #24753）
      _gl.framebufferTexture2D(_gl.FRAMEBUFFER, attachment, textureTarget, textureProperties.__webglTexture, level);
    }

    // 解绑帧缓冲区
    state.bindFramebuffer(_gl.FRAMEBUFFER, null);
  }

  /**
   * 设置渲染缓冲区存储
   * 为内部深度/模板缓冲区设置存储并绑定到正确的帧缓冲区
   *
   * @param {WebGLRenderbuffer} renderbuffer - 渲染缓冲区对象
   * @param {WebGLRenderTarget} renderTarget - 渲染目标
   * @param {boolean} isMultisample - 是否使用多重采样
   */
  function setupRenderBufferStorage(renderbuffer, renderTarget, isMultisample) {
    // 绑定渲染缓冲区
    _gl.bindRenderbuffer(_gl.RENDERBUFFER, renderbuffer);

    if (renderTarget.depthBuffer) {
      // 处理深度缓冲区

      // 获取深度附件类型
      const depthTexture = renderTarget.depthTexture;
      const depthType = depthTexture && depthTexture.isDepthTexture ? depthTexture.type : null;
      const glInternalFormat = getInternalDepthFormat(renderTarget.stencilBuffer, depthType);
      const glAttachmentType = renderTarget.stencilBuffer ? _gl.DEPTH_STENCIL_ATTACHMENT : _gl.DEPTH_ATTACHMENT;

      // 设置附件
      const samples = getRenderTargetSamples(renderTarget);
      const isUseMultisampledRTT = useMultisampledRTT(renderTarget);

      if (isUseMultisampledRTT) {
        // 使用多重采样渲染到纹理扩展
        multisampledRTTExt.renderbufferStorageMultisampleEXT(_gl.RENDERBUFFER, samples, glInternalFormat, renderTarget.width, renderTarget.height);
      } else if (isMultisample) {
        // 使用标准多重采样
        _gl.renderbufferStorageMultisample(_gl.RENDERBUFFER, samples, glInternalFormat, renderTarget.width, renderTarget.height);
      } else {
        // 单采样渲染缓冲区
        _gl.renderbufferStorage(_gl.RENDERBUFFER, glInternalFormat, renderTarget.width, renderTarget.height);
      }

      // 将渲染缓冲区附加到帧缓冲区
      _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, glAttachmentType, _gl.RENDERBUFFER, renderbuffer);
    } else {
      // 处理颜色缓冲区（多渲染目标情况）
      const textures = renderTarget.textures;

      for (let i = 0; i < textures.length; i++) {
        const texture = textures[i];

        // 获取纹理格式信息
        const glFormat = utils.convert(texture.format, texture.colorSpace);
        const glType = utils.convert(texture.type);
        const glInternalFormat = getInternalFormat(texture.internalFormat, glFormat, glType, texture.colorSpace);
        const samples = getRenderTargetSamples(renderTarget);

        if (isMultisample && useMultisampledRTT(renderTarget) === false) {
          // 标准多重采样
          _gl.renderbufferStorageMultisample(_gl.RENDERBUFFER, samples, glInternalFormat, renderTarget.width, renderTarget.height);
        } else if (useMultisampledRTT(renderTarget)) {
          // 多重采样渲染到纹理扩展
          multisampledRTTExt.renderbufferStorageMultisampleEXT(_gl.RENDERBUFFER, samples, glInternalFormat, renderTarget.width, renderTarget.height);
        } else {
          // 单采样渲染缓冲区
          _gl.renderbufferStorage(_gl.RENDERBUFFER, glInternalFormat, renderTarget.width, renderTarget.height);
        }
      }
    }

    // 解绑渲染缓冲区
    _gl.bindRenderbuffer(_gl.RENDERBUFFER, null);
  }

  /**
   * 为帧缓冲区设置深度纹理资源（需要扩展支持）
   *
   * @param {WebGLFramebuffer} framebuffer - 帧缓冲区对象
   * @param {WebGLRenderTarget} renderTarget - 渲染目标
   */
  function setupDepthTexture(framebuffer, renderTarget) {
    const isCube = renderTarget && renderTarget.isWebGLCubeRenderTarget;
    // 立方体渲染目标不支持深度纹理
    if (isCube) throw new Error("Depth Texture with cube render targets is not supported");

    // 绑定帧缓冲区
    state.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);

    // 验证深度纹理是否为有效的DepthTexture实例
    if (!(renderTarget.depthTexture && renderTarget.depthTexture.isDepthTexture)) {
      throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");
    }

    const textureProperties = properties.get(renderTarget.depthTexture);
    textureProperties.__renderTarget = renderTarget;

    // 上传与帧缓冲区尺寸匹配的空深度纹理
    if (!textureProperties.__webglTexture || renderTarget.depthTexture.image.width !== renderTarget.width || renderTarget.depthTexture.image.height !== renderTarget.height) {
      // 更新深度纹理尺寸以匹配渲染目标
      renderTarget.depthTexture.image.width = renderTarget.width;
      renderTarget.depthTexture.image.height = renderTarget.height;
      renderTarget.depthTexture.needsUpdate = true;
    }

    // 设置深度纹理
    setTexture2D(renderTarget.depthTexture, 0);

    const webglDepthTexture = textureProperties.__webglTexture;
    const samples = getRenderTargetSamples(renderTarget);

    if (renderTarget.depthTexture.format === DepthFormat) {
      // 只有深度的格式
      if (useMultisampledRTT(renderTarget)) {
        multisampledRTTExt.framebufferTexture2DMultisampleEXT(_gl.FRAMEBUFFER, _gl.DEPTH_ATTACHMENT, _gl.TEXTURE_2D, webglDepthTexture, 0, samples);
      } else {
        _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.DEPTH_ATTACHMENT, _gl.TEXTURE_2D, webglDepthTexture, 0);
      }
    } else if (renderTarget.depthTexture.format === DepthStencilFormat) {
      // 深度+模板的格式
      if (useMultisampledRTT(renderTarget)) {
        multisampledRTTExt.framebufferTexture2DMultisampleEXT(_gl.FRAMEBUFFER, _gl.DEPTH_STENCIL_ATTACHMENT, _gl.TEXTURE_2D, webglDepthTexture, 0, samples);
      } else {
        _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.DEPTH_STENCIL_ATTACHMENT, _gl.TEXTURE_2D, webglDepthTexture, 0);
      }
    } else {
      throw new Error("Unknown depthTexture format");
    }
  }

  /**
   * 为非纹理深度缓冲区设置WebGL资源
   * 处理深度渲染缓冲区的创建、绑定和管理，支持立方体和2D渲染目标
   *
   * @param {WebGLRenderTarget} renderTarget - 渲染目标
   */
  function setupDepthRenderbuffer(renderTarget) {
    // 获取渲染目标的属性对象，用于存储WebGL相关的状态和资源
    const renderTargetProperties = properties.get(renderTarget);
    // 检查是否为立方体渲染目标，立方体需要为6个面分别处理
    const isCube = renderTarget.isWebGLCubeRenderTarget === true;

    // 检查绑定的深度纹理是否发生了变化
    if (renderTargetProperties.__boundDepthTexture !== renderTarget.depthTexture) {
      // 触发销毁事件以清除与之前绑定的深度缓冲区相关的存储状态
      const depthTexture = renderTarget.depthTexture;
      // 如果存在之前的销毁回调，先执行它来清理旧的状态
      if (renderTargetProperties.__depthDisposeCallback) {
        renderTargetProperties.__depthDisposeCallback();
      }

      // 设置销毁监听器，用于跟踪当前附加的缓冲区何时被隐式解绑
      if (depthTexture) {
        // 创建销毁事件处理函数
        const disposeEvent = () => {
          // 删除绑定的深度纹理引用
          delete renderTargetProperties.__boundDepthTexture;
          // 删除销毁回调引用
          delete renderTargetProperties.__depthDisposeCallback;
          // 移除事件监听器，避免内存泄漏
          depthTexture.removeEventListener("dispose", disposeEvent);
        };

        // 为深度纹理添加销毁事件监听器
        depthTexture.addEventListener("dispose", disposeEvent);
        // 保存销毁回调的引用，以便后续清理
        renderTargetProperties.__depthDisposeCallback = disposeEvent;
      }

      // 更新当前绑定的深度纹理引用
      renderTargetProperties.__boundDepthTexture = depthTexture;
    }

    // 如果渲染目标有深度纹理且不是自动分配深度缓冲区模式
    if (renderTarget.depthTexture && !renderTargetProperties.__autoAllocateDepthBuffer) {
      // 立方体渲染目标不支持深度纹理，抛出错误
      if (isCube) throw new Error("target.depthTexture not supported in Cube render targets");

      // 获取渲染目标纹理的mipmap数组
      const mipmaps = renderTarget.texture.mipmaps;

      // 根据是否有mipmap来选择正确的帧缓冲区
      if (mipmaps && mipmaps.length > 0) {
        // 如果有mipmap，使用第一个级别的帧缓冲区
        setupDepthTexture(renderTargetProperties.__webglFramebuffer[0], renderTarget);
      } else {
        // 如果没有mipmap，直接使用主帧缓冲区
        setupDepthTexture(renderTargetProperties.__webglFramebuffer, renderTarget);
      }
    } else {
      // 处理使用渲染缓冲区作为深度缓冲区的情况
      if (isCube) {
        // 处理立方体渲染目标：需要为6个面分别创建深度缓冲区

        // 初始化深度缓冲区数组，每个面一个
        renderTargetProperties.__webglDepthbuffer = [];

        // 遍历立方体的6个面（+X, -X, +Y, -Y, +Z, -Z）
        for (let i = 0; i < 6; i++) {
          // 绑定当前面对应的帧缓冲区
          state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglFramebuffer[i]);

          // 检查当前面的深度缓冲区是否已经创建
          if (renderTargetProperties.__webglDepthbuffer[i] === undefined) {
            // 如果未创建，创建新的渲染缓冲区
            renderTargetProperties.__webglDepthbuffer[i] = _gl.createRenderbuffer();
            // 设置渲染缓冲区的存储格式和尺寸（非多重采样）
            setupRenderBufferStorage(renderTargetProperties.__webglDepthbuffer[i], renderTarget, false);
          } else {
            // 如果缓冲区已经创建，重新附加到帧缓冲区

            // 根据是否需要模板缓冲区确定附件类型
            const glAttachmentType = renderTarget.stencilBuffer ? _gl.DEPTH_STENCIL_ATTACHMENT : _gl.DEPTH_ATTACHMENT;
            // 获取当前面的渲染缓冲区
            const renderbuffer = renderTargetProperties.__webglDepthbuffer[i];
            // 绑定渲染缓冲区
            _gl.bindRenderbuffer(_gl.RENDERBUFFER, renderbuffer);
            // 将渲染缓冲区附加到帧缓冲区的深度附件点
            _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, glAttachmentType, _gl.RENDERBUFFER, renderbuffer);
          }
        }
      } else {
        // 处理2D渲染目标：只需要一个深度缓冲区

        // 获取渲染目标纹理的mipmap数组
        const mipmaps = renderTarget.texture.mipmaps;

        // 根据是否有mipmap来选择正确的帧缓冲区进行绑定
        if (mipmaps && mipmaps.length > 0) {
          // 如果有mipmap，绑定第一个级别的帧缓冲区
          state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglFramebuffer[0]);
        } else {
          // 如果没有mipmap，绑定主帧缓冲区
          state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglFramebuffer);
        }

        // 检查深度缓冲区是否已经创建
        if (renderTargetProperties.__webglDepthbuffer === undefined) {
          // 如果未创建，创建新的渲染缓冲区
          renderTargetProperties.__webglDepthbuffer = _gl.createRenderbuffer();
          // 设置渲染缓冲区的存储格式和尺寸（非多重采样）
          setupRenderBufferStorage(renderTargetProperties.__webglDepthbuffer, renderTarget, false);
        } else {
          // 如果缓冲区已经创建，重新附加到帧缓冲区

          // 根据是否需要模板缓冲区确定附件类型
          const glAttachmentType = renderTarget.stencilBuffer ? _gl.DEPTH_STENCIL_ATTACHMENT : _gl.DEPTH_ATTACHMENT;
          // 获取深度渲染缓冲区
          const renderbuffer = renderTargetProperties.__webglDepthbuffer;
          // 绑定渲染缓冲区
          _gl.bindRenderbuffer(_gl.RENDERBUFFER, renderbuffer);
          // 将渲染缓冲区附加到帧缓冲区的深度附件点
          _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, glAttachmentType, _gl.RENDERBUFFER, renderbuffer);
        }
      }
    }

    // 解绑帧缓冲区，恢复到默认状态
    state.bindFramebuffer(_gl.FRAMEBUFFER, null);
  }

  /**
   * 使用外部纹理重新绑定帧缓冲区
   *
   * @param {WebGLRenderTarget} renderTarget - 渲染目标
   * @param {Texture} colorTexture - 颜色纹理（可选）
   * @param {Texture} depthTexture - 深度纹理（可选）
   */
  function rebindTextures(renderTarget, colorTexture, depthTexture) {
    const renderTargetProperties = properties.get(renderTarget);

    if (colorTexture !== undefined) {
      // 重新设置颜色纹理附件
      setupFrameBufferTexture(renderTargetProperties.__webglFramebuffer, renderTarget, renderTarget.texture, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, 0);
    }

    if (depthTexture !== undefined) {
      // 重新设置深度渲染缓冲区
      setupDepthRenderbuffer(renderTarget);
    }
  }

  /**
   * 设置渲染目标的WebGL资源
   * 创建帧缓冲区、纹理和相关的WebGL对象
   *
   * @param {WebGLRenderTarget} renderTarget - 要设置的渲染目标
   */
  function setupRenderTarget(renderTarget) {
    // 获取渲染目标的主纹理（第一个纹理或单一纹理）
    const texture = renderTarget.texture;

    // 获取渲染目标和主纹理的属性对象，用于存储WebGL相关状态
    const renderTargetProperties = properties.get(renderTarget);
    const textureProperties = properties.get(texture);

    // 添加销毁事件监听器，确保在渲染目标被销毁时正确清理WebGL资源
    renderTarget.addEventListener("dispose", onRenderTargetDispose);

    // 获取渲染目标的所有纹理（可能是多渲染目标MRT的情况）
    const textures = renderTarget.textures;

    // ========================================
    // 渲染目标类型检测
    // ========================================

    // 检查是否为立方体渲染目标（需要为6个面分别处理）
    const isCube = renderTarget.isWebGLCubeRenderTarget === true;
    // 检查是否为多渲染目标（MRT，Multiple Render Targets）
    const isMultipleRenderTargets = textures.length > 1;

    // ========================================
    // 单渲染目标纹理创建
    // ========================================

    // 如果不是多渲染目标，为主纹理创建WebGL纹理对象
    if (!isMultipleRenderTargets) {
      // 检查WebGL纹理是否已经创建
      if (textureProperties.__webglTexture === undefined) {
        // 创建新的WebGL纹理对象
        textureProperties.__webglTexture = _gl.createTexture();
      }

      // 同步纹理版本号，用于跟踪纹理更新
      textureProperties.__version = texture.version;
      // 更新内存统计中的纹理计数
      info.memory.textures++;
    }

    // ========================================
    // 帧缓冲区设置
    // ========================================

    if (isCube) {
      // 立方体渲染目标：需要为6个面分别创建帧缓冲区
      // 立方体的6个面：+X, -X, +Y, -Y, +Z, -Z
      renderTargetProperties.__webglFramebuffer = [];

      // 遍历立方体的6个面
      for (let i = 0; i < 6; i++) {
        // 检查纹理是否有预定义的mipmap级别
        if (texture.mipmaps && texture.mipmaps.length > 0) {
          // 如果有mipmap，需要为每个mipmap级别创建单独的帧缓冲区
          // 这样可以直接渲染到特定的mipmap级别
          renderTargetProperties.__webglFramebuffer[i] = [];

          // 为当前面的每个mipmap级别创建帧缓冲区
          for (let level = 0; level < texture.mipmaps.length; level++) {
            renderTargetProperties.__webglFramebuffer[i][level] = _gl.createFramebuffer();
          }
        } else {
          // 没有mipmap，只需要为当前面创建一个帧缓冲区（级别0）
          renderTargetProperties.__webglFramebuffer[i] = _gl.createFramebuffer();
        }
      }
    } else {
      // ========================================
      // 2D渲染目标帧缓冲区设置
      // ========================================

      // 检查主纹理是否有预定义的mipmap级别
      if (texture.mipmaps && texture.mipmaps.length > 0) {
        // 如果有mipmap，需要为每个mipmap级别创建单独的帧缓冲区
        // 这允许直接渲染到特定的mipmap级别，用于实时mipmap生成
        renderTargetProperties.__webglFramebuffer = [];

        // 为每个mipmap级别创建帧缓冲区
        for (let level = 0; level < texture.mipmaps.length; level++) {
          renderTargetProperties.__webglFramebuffer[level] = _gl.createFramebuffer();
        }
      } else {
        // 没有mipmap，只需要创建一个帧缓冲区（级别0）
        renderTargetProperties.__webglFramebuffer = _gl.createFramebuffer();
      }

      // ========================================
      // 多渲染目标（MRT）纹理创建
      // ========================================

      // 如果是多渲染目标，需要为每个颜色附件创建纹理
      if (isMultipleRenderTargets) {
        // 遍历所有纹理附件
        for (let i = 0, il = textures.length; i < il; i++) {
          // 获取当前附件纹理的属性对象
          const attachmentProperties = properties.get(textures[i]);

          // 检查当前附件的WebGL纹理是否已创建
          if (attachmentProperties.__webglTexture === undefined) {
            // 为当前附件创建WebGL纹理对象
            attachmentProperties.__webglTexture = _gl.createTexture();
            // 更新内存统计中的纹理计数
            info.memory.textures++;
          }
        }
      }

      // ========================================
      // 多重采样帧缓冲区设置（标准MSAA）
      // ========================================

      // 检查是否需要多重采样且不使用多重采样RTT扩展
      if (renderTarget.samples > 0 && useMultisampledRTT(renderTarget) === false) {
        // 创建多重采样帧缓冲区，用于MSAA渲染
        renderTargetProperties.__webglMultisampledFramebuffer = _gl.createFramebuffer();
        // 初始化颜色渲染缓冲区数组，每个纹理附件一个
        renderTargetProperties.__webglColorRenderbuffer = [];

        // 绑定多重采样帧缓冲区进行设置
        state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglMultisampledFramebuffer);

        // 为每个纹理附件创建多重采样颜色渲染缓冲区
        for (let i = 0; i < textures.length; i++) {
          const texture = textures[i];
          // 为当前附件创建颜色渲染缓冲区
          renderTargetProperties.__webglColorRenderbuffer[i] = _gl.createRenderbuffer();

          // 绑定当前颜色渲染缓冲区
          _gl.bindRenderbuffer(_gl.RENDERBUFFER, renderTargetProperties.__webglColorRenderbuffer[i]);

          // 获取纹理的格式信息
          const glFormat = utils.convert(texture.format, texture.colorSpace);
          const glType = utils.convert(texture.type);
          // 获取内部格式，考虑XR渲染目标的特殊需求
          const glInternalFormat = getInternalFormat(texture.internalFormat, glFormat, glType, texture.colorSpace, renderTarget.isXRRenderTarget === true);
          // 获取实际使用的采样数（不超过硬件限制）
          const samples = getRenderTargetSamples(renderTarget);
          // 为渲染缓冲区分配多重采样存储
          _gl.renderbufferStorageMultisample(_gl.RENDERBUFFER, samples, glInternalFormat, renderTarget.width, renderTarget.height);

          // 将颜色渲染缓冲区附加到对应的颜色附件点
          _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.RENDERBUFFER, renderTargetProperties.__webglColorRenderbuffer[i]);
        }

        // 解绑渲染缓冲区
        _gl.bindRenderbuffer(_gl.RENDERBUFFER, null);

        // 如果需要深度缓冲区，创建多重采样深度渲染缓冲区
        if (renderTarget.depthBuffer) {
          renderTargetProperties.__webglDepthRenderbuffer = _gl.createRenderbuffer();
          // 设置深度渲染缓冲区存储（启用多重采样）
          setupRenderBufferStorage(renderTargetProperties.__webglDepthRenderbuffer, renderTarget, true);
        }

        // 解绑帧缓冲区，恢复默认状态
        state.bindFramebuffer(_gl.FRAMEBUFFER, null);
      }
    }

    // ========================================
    // 颜色缓冲区设置
    // ========================================

    if (isCube) {
      // ========================================
      // 立方体纹理颜色缓冲区设置
      // ========================================

      // 绑定立方体纹理并设置纹理参数
      state.bindTexture(_gl.TEXTURE_CUBE_MAP, textureProperties.__webglTexture);
      setTextureParameters(_gl.TEXTURE_CUBE_MAP, texture);

      // 为立方体的每个面设置帧缓冲纹理
      for (let i = 0; i < 6; i++) {
        // 检查是否有预定义的mipmap级别
        if (texture.mipmaps && texture.mipmaps.length > 0) {
          // 如果有mipmap，为每个级别设置帧缓冲纹理
          for (let level = 0; level < texture.mipmaps.length; level++) {
            // 设置当前面当前级别的帧缓冲纹理
            // _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i 计算出具体的立方体面
            setupFrameBufferTexture(renderTargetProperties.__webglFramebuffer[i][level], renderTarget, texture, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, level);
          }
        } else {
          // 没有mipmap，只设置级别0的帧缓冲纹理
          setupFrameBufferTexture(renderTargetProperties.__webglFramebuffer[i], renderTarget, texture, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0);
        }
      }

      // 如果纹理需要生成mipmap，自动生成立方体纹理的mipmap
      if (textureNeedsGenerateMipmaps(texture)) {
        generateMipmap(_gl.TEXTURE_CUBE_MAP);
      }

      // 解绑纹理，恢复默认状态
      state.unbindTexture();
    } else if (isMultipleRenderTargets) {
      // ========================================
      // 多渲染目标（MRT）颜色缓冲区设置
      // ========================================

      // 遍历所有纹理附件，为每个附件设置颜色缓冲区
      for (let i = 0, il = textures.length; i < il; i++) {
        // 获取当前附件纹理和其属性
        const attachment = textures[i];
        const attachmentProperties = properties.get(attachment);

        // 默认使用2D纹理类型
        let glTextureType = _gl.TEXTURE_2D;

        // 根据渲染目标类型确定纹理类型
        if (renderTarget.isWebGL3DRenderTarget || renderTarget.isWebGLArrayRenderTarget) {
          // 3D渲染目标使用3D纹理，数组渲染目标使用2D纹理数组
          glTextureType = renderTarget.isWebGL3DRenderTarget ? _gl.TEXTURE_3D : _gl.TEXTURE_2D_ARRAY;
        }

        // 绑定当前附件的纹理并设置纹理参数
        state.bindTexture(glTextureType, attachmentProperties.__webglTexture);
        setTextureParameters(glTextureType, attachment);
        // 将纹理附加到对应的颜色附件点（COLOR_ATTACHMENT0 + i）
        setupFrameBufferTexture(renderTargetProperties.__webglFramebuffer, renderTarget, attachment, _gl.COLOR_ATTACHMENT0 + i, glTextureType, 0);

        // 如果当前附件需要生成mipmap，自动生成
        if (textureNeedsGenerateMipmaps(attachment)) {
          generateMipmap(glTextureType);
        }
      }

      // 解绑所有纹理，恢复默认状态
      state.unbindTexture();
    } else {
      // ========================================
      // 单一渲染目标颜色缓冲区设置
      // ========================================

      // 默认使用2D纹理类型
      let glTextureType = _gl.TEXTURE_2D;

      // 根据渲染目标类型确定纹理类型
      if (renderTarget.isWebGL3DRenderTarget || renderTarget.isWebGLArrayRenderTarget) {
        // 3D渲染目标使用3D纹理，数组渲染目标使用2D纹理数组
        glTextureType = renderTarget.isWebGL3DRenderTarget ? _gl.TEXTURE_3D : _gl.TEXTURE_2D_ARRAY;
      }

      // 绑定主纹理并设置纹理参数
      state.bindTexture(glTextureType, textureProperties.__webglTexture);
      setTextureParameters(glTextureType, texture);

      // 根据是否有mipmap设置帧缓冲纹理
      if (texture.mipmaps && texture.mipmaps.length > 0) {
        // 如果有预定义的mipmap，为每个级别设置帧缓冲纹理
        for (let level = 0; level < texture.mipmaps.length; level++) {
          setupFrameBufferTexture(renderTargetProperties.__webglFramebuffer[level], renderTarget, texture, _gl.COLOR_ATTACHMENT0, glTextureType, level);
        }
      } else {
        // 没有mipmap，只设置级别0的帧缓冲纹理
        setupFrameBufferTexture(renderTargetProperties.__webglFramebuffer, renderTarget, texture, _gl.COLOR_ATTACHMENT0, glTextureType, 0);
      }

      // 如果纹理需要生成mipmap，自动生成
      if (textureNeedsGenerateMipmaps(texture)) {
        generateMipmap(glTextureType);
      }

      // 解绑纹理，恢复默认状态
      state.unbindTexture();
    }

    // ========================================
    // 深度和模板缓冲区设置
    // ========================================

    // 如果渲染目标需要深度缓冲区，设置深度渲染缓冲区
    if (renderTarget.depthBuffer) {
      setupDepthRenderbuffer(renderTarget);
    }
  }

  /**
   * 更新渲染目标的mipmap
   * 为渲染目标的所有纹理生成mipmap（如果需要）
   *
   * @param {WebGLRenderTarget} renderTarget - 渲染目标
   */
  function updateRenderTargetMipmap(renderTarget) {
    const textures = renderTarget.textures;

    // 遍历渲染目标的所有纹理
    for (let i = 0, il = textures.length; i < il; i++) {
      const texture = textures[i];

      // 检查纹理是否需要生成mipmap
      if (textureNeedsGenerateMipmaps(texture)) {
        const targetType = getTargetType(renderTarget);
        const webglTexture = properties.get(texture).__webglTexture;

        // 绑定纹理并生成mipmap
        state.bindTexture(targetType, webglTexture);
        generateMipmap(targetType);
        state.unbindTexture();
      }
    }
  }

  // 用于帧缓冲区失效的数组缓存
  const invalidationArrayRead = [];
  const invalidationArrayDraw = [];

  /**
   * 更新多重采样渲染目标
   * 处理多重采样渲染目标的解析和失效操作
   *
   * @param {WebGLRenderTarget} renderTarget - 多重采样渲染目标
   */
  function updateMultisampleRenderTarget(renderTarget) {
    // 只有多重采样渲染目标才需要处理
    if (renderTarget.samples > 0) {
      // 检查是否使用标准多重采样（而非多重采样RTT扩展）
      if (useMultisampledRTT(renderTarget) === false) {
        // 获取渲染目标的基本信息
        const textures = renderTarget.textures; // 渲染目标的纹理数组
        const width = renderTarget.width; // 渲染目标宽度
        const height = renderTarget.height; // 渲染目标高度
        let mask = _gl.COLOR_BUFFER_BIT; // 初始化复制掩码，包含颜色缓冲区
        // 根据是否有模板缓冲区确定深度附件类型
        const depthStyle = renderTarget.stencilBuffer ? _gl.DEPTH_STENCIL_ATTACHMENT : _gl.DEPTH_ATTACHMENT;
        const renderTargetProperties = properties.get(renderTarget); // 获取渲染目标属性
        const isMultipleRenderTargets = textures.length > 1; // 检查是否为多渲染目标(MRT)

        // 如果是多渲染目标(MRT)，需要移除帧缓冲区附件
        if (isMultipleRenderTargets) {
          // 遍历所有纹理附件
          for (let i = 0; i < textures.length; i++) {
            // 绑定多重采样帧缓冲区并移除颜色渲染缓冲区附件
            state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglMultisampledFramebuffer);
            _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.RENDERBUFFER, null);

            // 绑定普通帧缓冲区并移除纹理附件
            state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglFramebuffer);
            _gl.framebufferTexture2D(_gl.DRAW_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.TEXTURE_2D, null, 0);
          }
        }

        // ========================================
        // 设置帧缓冲区解析操作
        // ========================================

        // 将多重采样帧缓冲区设置为读取源
        state.bindFramebuffer(_gl.READ_FRAMEBUFFER, renderTargetProperties.__webglMultisampledFramebuffer);

        // 获取主纹理的mipmap信息，用于确定目标帧缓冲区
        const mipmaps = renderTarget.texture.mipmaps;

        // 根据是否有mipmap选择正确的目标帧缓冲区
        if (mipmaps && mipmaps.length > 0) {
          // 如果有mipmap，使用第一个级别的帧缓冲区作为解析目标
          state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, renderTargetProperties.__webglFramebuffer[0]);
        } else {
          // 如果没有mipmap，使用主帧缓冲区作为解析目标
          state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, renderTargetProperties.__webglFramebuffer);
        }

        // ========================================
        // 执行多重采样解析
        // ========================================

        // 遍历所有纹理附件进行解析
        for (let i = 0; i < textures.length; i++) {
          // 检查是否需要解析深度缓冲区
          if (renderTarget.resolveDepthBuffer) {
            // 如果有深度缓冲区，添加深度位到复制掩码
            if (renderTarget.depthBuffer) mask |= _gl.DEPTH_BUFFER_BIT;

            // 解析模板缓冲区在D3D后端很慢，对所有传输渲染目标禁用它（参见 #27799）
            // 只有在明确启用模板解析时才添加模板位
            if (renderTarget.stencilBuffer && renderTarget.resolveStencilBuffer) mask |= _gl.STENCIL_BUFFER_BIT;
          }

          // 如果是多渲染目标，需要单独处理每个附件
          if (isMultipleRenderTargets) {
            // 将当前颜色渲染缓冲区附加到读取帧缓冲区的COLOR_ATTACHMENT0
            _gl.framebufferRenderbuffer(_gl.READ_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.RENDERBUFFER, renderTargetProperties.__webglColorRenderbuffer[i]);

            // 获取当前纹理的WebGL纹理对象
            const webglTexture = properties.get(textures[i]).__webglTexture;
            // 将纹理附加到绘制帧缓冲区的COLOR_ATTACHMENT0
            _gl.framebufferTexture2D(_gl.DRAW_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, webglTexture, 0);
          }

          // 执行帧缓冲区位块传输（blit），将多重采样数据解析到普通纹理
          // 参数：源矩形(x,y,w,h), 目标矩形(x,y,w,h), 复制掩码, 过滤模式
          _gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, mask, _gl.NEAREST);

          // ========================================
          // 帧缓冲区失效优化（仅在支持的设备上）
          // ========================================

          // 检查设备是否支持帧缓冲区失效操作（主要是移动设备优化）
          if (supportsInvalidateFramebuffer === true) {
            // 清空失效数组，准备添加新的附件
            invalidationArrayRead.length = 0;
            invalidationArrayDraw.length = 0;

            // 将当前颜色附件添加到读取帧缓冲区的失效列表
            invalidationArrayRead.push(_gl.COLOR_ATTACHMENT0 + i);

            // 如果有深度缓冲区但不需要解析深度数据，也将其标记为失效
            if (renderTarget.depthBuffer && renderTarget.resolveDepthBuffer === false) {
              // 将深度附件添加到两个失效列表
              invalidationArrayRead.push(depthStyle);
              invalidationArrayDraw.push(depthStyle);

              // 失效绘制帧缓冲区的深度附件
              _gl.invalidateFramebuffer(_gl.DRAW_FRAMEBUFFER, invalidationArrayDraw);
            }

            // 失效读取帧缓冲区的指定附件，告诉GPU这些数据不再需要
            _gl.invalidateFramebuffer(_gl.READ_FRAMEBUFFER, invalidationArrayRead);
          }
        }

        // ========================================
        // 清理帧缓冲区绑定
        // ========================================

        // 解绑读取和绘制帧缓冲区，恢复默认状态
        state.bindFramebuffer(_gl.READ_FRAMEBUFFER, null);
        state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, null);

        // ========================================
        // 重建多渲染目标附件（如果需要）
        // ========================================

        // 如果是MRT，由于在blit之前移除了FBO附件，现在需要重新构建附件
        if (isMultipleRenderTargets) {
          // 遍历所有纹理，重新附加到对应的帧缓冲区
          for (let i = 0; i < textures.length; i++) {
            // 重新绑定多重采样帧缓冲区并附加颜色渲染缓冲区
            state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglMultisampledFramebuffer);
            _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.RENDERBUFFER, renderTargetProperties.__webglColorRenderbuffer[i]);

            // 获取当前纹理的WebGL纹理对象
            const webglTexture = properties.get(textures[i]).__webglTexture;

            // 重新绑定普通帧缓冲区并附加纹理
            state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglFramebuffer);
            _gl.framebufferTexture2D(_gl.DRAW_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.TEXTURE_2D, webglTexture, 0);
          }
        }

        // 最后绑定多重采样帧缓冲区作为绘制目标，为下次渲染做准备
        state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, renderTargetProperties.__webglMultisampledFramebuffer);
      } else {
        // ========================================
        // 处理使用多重采样RTT扩展的情况
        // ========================================

        // 如果使用多重采样RTT扩展，不需要手动解析，但仍可以优化深度缓冲区
        if (renderTarget.depthBuffer && renderTarget.resolveDepthBuffer === false && supportsInvalidateFramebuffer) {
          // 确定深度附件类型（深度或深度+模板）
          const depthStyle = renderTarget.stencilBuffer ? _gl.DEPTH_STENCIL_ATTACHMENT : _gl.DEPTH_ATTACHMENT;

          // 失效深度缓冲区，告诉GPU深度数据不再需要，可以优化内存带宽
          _gl.invalidateFramebuffer(_gl.DRAW_FRAMEBUFFER, [depthStyle]);
        }
      }
    }
  }

  /**
   * 获取渲染目标的采样数
   * 返回渲染目标请求的采样数和GPU支持的最大采样数中的较小值
   *
   * @param {WebGLRenderTarget} renderTarget - 渲染目标
   * @returns {number} 实际使用的采样数
   */
  function getRenderTargetSamples(renderTarget) {
    return Math.min(capabilities.maxSamples, renderTarget.samples);
  }

  /**
   * 检查是否使用多重采样渲染到纹理
   * 判断渲染目标是否应该使用WEBGL_multisampled_render_to_texture扩展
   *
   * @param {WebGLRenderTarget} renderTarget - 渲染目标
   * @returns {boolean} 是否使用多重采样RTT
   */
  function useMultisampledRTT(renderTarget) {
    const renderTargetProperties = properties.get(renderTarget);

    return renderTarget.samples > 0 && extensions.has("WEBGL_multisampled_render_to_texture") === true && renderTargetProperties.__useRenderToTexture !== false;
  }

  /**
   * 更新视频纹理
   * 确保视频纹理在每帧只更新一次，避免重复更新
   *
   * @param {VideoTexture} texture - 要更新的视频纹理
   */
  function updateVideoTexture(texture) {
    const frame = info.render.frame;

    // 检查上次更新VideoTexture的帧号
    // 如果当前帧号与上次更新的帧号不同，则需要更新
    if (_videoTextures.get(texture) !== frame) {
      // 记录当前帧号，避免同一帧重复更新
      _videoTextures.set(texture, frame);
      // 调用纹理的更新方法，通常会从视频元素获取最新帧
      texture.update();
    }
  }

  /**
   * 验证纹理颜色空间
   * 检查纹理的颜色空间设置是否与格式和类型兼容
   *
   * @param {Texture} texture - 要验证的纹理
   * @param {Object} image - 图像数据
   * @returns {Object} 验证后的图像数据
   */
  function verifyColorSpace(texture, image) {
    const colorSpace = texture.colorSpace;
    const format = texture.format;
    const type = texture.type;

    // 压缩纹理和视频纹理跳过验证
    if (texture.isCompressedTexture === true || texture.isVideoTexture === true) return image;

    // 检查非线性颜色空间的兼容性
    if (colorSpace !== LinearSRGBColorSpace && colorSpace !== NoColorSpace) {
      // 处理sRGB颜色空间
      if (ColorManagement.getTransfer(colorSpace) === SRGBTransfer) {
        // 在WebGL 2中，未压缩的纹理只有在使用RGBA8格式时才能进行sRGB编码
        if (format !== RGBAFormat || type !== UnsignedByteType) {
          console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.");
        }
      } else {
        // 不支持的颜色空间
        console.error("THREE.WebGLTextures: Unsupported texture color space:", colorSpace);
      }
    }

    return image;
  }

  /**
   * 获取图像的实际尺寸
   * 处理不同类型的图像对象，返回其真实尺寸
   *
   * @param {HTMLImageElement|VideoFrame|Object} image - 图像对象
   * @returns {Vector2} 包含宽度和高度的向量
   */
  function getDimensions(image) {
    // 检查是否为HTML图像元素（需要先检查构造函数是否存在）
    if (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement) {
      // 优先使用naturalWidth/naturalHeight（图像的原始尺寸）
      // 如果naturalWidth不可用（图像未加载），回退到width/height属性
      _imageDimensions.width = image.naturalWidth || image.width;
      _imageDimensions.height = image.naturalHeight || image.height;
    } else if (typeof VideoFrame !== "undefined" && image instanceof VideoFrame) {
      // VideoFrame对象使用displayWidth/displayHeight
      // 这些属性表示视频帧的显示尺寸（可能与编码尺寸不同）
      _imageDimensions.width = image.displayWidth;
      _imageDimensions.height = image.displayHeight;
    } else {
      // 对于其他类型（Canvas、ImageBitmap、DataTexture等）
      // 直接使用width/height属性
      _imageDimensions.width = image.width;
      _imageDimensions.height = image.height;
    }

    // 返回包含图像尺寸的向量对象（复用同一个对象以避免垃圾回收）
    return _imageDimensions;
  }

  // ========================================
  // 公共API导出
  // ========================================

  // 纹理单元管理相关方法
  this.allocateTextureUnit = allocateTextureUnit; // 分配下一个可用的纹理单元
  this.resetTextureUnits = resetTextureUnits; // 重置纹理单元计数器

  // 纹理绑定方法 - 将不同类型的纹理绑定到WebGL纹理单元
  this.setTexture2D = setTexture2D; // 绑定2D纹理
  this.setTexture2DArray = setTexture2DArray; // 绑定2D纹理数组
  this.setTexture3D = setTexture3D; // 绑定3D纹理
  this.setTextureCube = setTextureCube; // 绑定立方体纹理

  // 渲染目标管理方法 - 处理帧缓冲区和渲染到纹理
  this.rebindTextures = rebindTextures; // 重新绑定渲染目标的纹理
  this.setupRenderTarget = setupRenderTarget; // 设置渲染目标的WebGL资源
  this.updateRenderTargetMipmap = updateRenderTargetMipmap; // 更新渲染目标的mipmap
  this.updateMultisampleRenderTarget = updateMultisampleRenderTarget; // 处理多重采样渲染目标
  this.setupDepthRenderbuffer = setupDepthRenderbuffer; // 设置深度渲染缓冲区
  this.setupFrameBufferTexture = setupFrameBufferTexture; // 设置帧缓冲纹理
  this.useMultisampledRTT = useMultisampledRTT; // 检查是否使用多重采样RTT
}

// 导出WebGL纹理管理器类
export { WebGLTextures };
