// 导入数据映射基类
import DataMap from "./DataMap.js";

// 导入数学和纹理相关类
import { Vector3 } from "../../math/Vector3.js";
import { DepthTexture } from "../../textures/DepthTexture.js";
import { DepthStencilFormat, DepthFormat, UnsignedIntType, UnsignedInt248Type, UnsignedByteType, SRGBTransfer } from "../../constants.js";
import { ColorManagement } from "../../math/ColorManagement.js";

// 用于存储纹理尺寸的临时向量，避免重复创建对象
const _size = /*@__PURE__*/ new Vector3();

/**
 * 纹理管理器类
 *
 * 此模块管理渲染器的纹理资源，负责纹理的创建、更新、缓存和销毁。
 * 它处理各种类型的纹理，包括2D纹理、3D纹理、立方体纹理、数组纹理等，
 * 并管理纹理的GPU资源分配和内存优化。
 *
 * @private
 * @augments DataMap
 */
class Textures extends DataMap {
  /**
   * 构造一个新的纹理管理组件
   *
   * @param {Renderer} renderer - 渲染器实例
   * @param {Backend} backend - 渲染器的后端实现（WebGPU或WebGL）
   * @param {Info} info - 用于管理指标和监控数据的渲染器组件
   */
  constructor(renderer, backend, info) {
    // 调用父类构造函数
    super();

    /**
     * 渲染器实例
     * 提供渲染相关的全局功能和配置
     *
     * @type {Renderer}
     */
    this.renderer = renderer;

    /**
     * 渲染后端实例
     * 负责具体的GPU API调用和资源管理
     *
     * @type {Backend}
     */
    this.backend = backend;

    /**
     * 信息收集组件
     * 用于收集和报告纹理相关的性能指标和监控数据
     *
     * @type {Info}
     */
    this.info = info;
  }

  /**
   * 更新给定的渲染目标
   * 根据给定的渲染目标配置，更新表示帧缓冲区附件的纹理状态
   *
   * @param {RenderTarget} renderTarget - 要更新的渲染目标
   * @param {number} [activeMipmapLevel=0] - 活动的mipmap级别
   */
  updateRenderTarget(renderTarget, activeMipmapLevel = 0) {
    // 获取渲染目标的数据
    const renderTargetData = this.get(renderTarget);

    // 确定采样数量，0表示无多重采样
    const sampleCount = renderTarget.samples === 0 ? 1 : renderTarget.samples;
    // 获取或创建深度纹理mipmap映射
    const depthTextureMips = renderTargetData.depthTextureMips || (renderTargetData.depthTextureMips = {});

    // 获取渲染目标的纹理数组
    const textures = renderTarget.textures;

    // 获取第一个纹理的尺寸作为基准
    const size = this.getSize(textures[0]);

    // 计算当前mipmap级别的尺寸
    const mipWidth = size.width >> activeMipmapLevel;
    const mipHeight = size.height >> activeMipmapLevel;

    // 获取深度纹理，优先使用渲染目标的深度纹理，否则使用mipmap中的
    let depthTexture = renderTarget.depthTexture || depthTextureMips[activeMipmapLevel];
    // 判断是否需要使用深度纹理
    const useDepthTexture = renderTarget.depthBuffer === true || renderTarget.stencilBuffer === true;

    // 标记纹理是否需要更新
    let textureNeedsUpdate = false;

    // 如果需要深度纹理但尚未创建，则创建新的深度纹理
    if (depthTexture === undefined && useDepthTexture) {
      depthTexture = new DepthTexture();

      // 根据是否需要模板缓冲区设置格式和类型
      depthTexture.format = renderTarget.stencilBuffer ? DepthStencilFormat : DepthFormat;
      depthTexture.type = renderTarget.stencilBuffer ? UnsignedInt248Type : UnsignedIntType; // FloatType
      // 设置深度纹理的尺寸
      depthTexture.image.width = mipWidth;
      depthTexture.image.height = mipHeight;
      depthTexture.image.depth = size.depth;
      // 如果是多视图且深度大于1，设置为数组纹理
      depthTexture.isArrayTexture = renderTarget.multiview === true && size.depth > 1;

      // 将深度纹理存储到对应的mipmap级别
      depthTextureMips[activeMipmapLevel] = depthTexture;
    }

    // 检查尺寸是否发生变化
    if (renderTargetData.width !== size.width || size.height !== renderTargetData.height) {
      textureNeedsUpdate = true;

      // 如果有深度纹理，更新其尺寸
      if (depthTexture) {
        depthTexture.needsUpdate = true;
        depthTexture.image.width = mipWidth;
        depthTexture.image.height = mipHeight;
        // 根据是否为数组纹理设置深度
        depthTexture.image.depth = depthTexture.isArrayTexture ? depthTexture.image.depth : 1;
      }
    }

    // 更新渲染目标数据
    renderTargetData.width = size.width;
    renderTargetData.height = size.height;
    renderTargetData.textures = textures;
    renderTargetData.depthTexture = depthTexture || null;
    renderTargetData.depth = renderTarget.depthBuffer;
    renderTargetData.stencil = renderTarget.stencilBuffer;
    renderTargetData.renderTarget = renderTarget;

    // 检查采样数量是否发生变化
    if (renderTargetData.sampleCount !== sampleCount) {
      textureNeedsUpdate = true;

      // 如果有深度纹理，标记需要更新
      if (depthTexture) {
        depthTexture.needsUpdate = true;
      }

      // 更新采样数量
      renderTargetData.sampleCount = sampleCount;
    }

    // 准备纹理更新选项
    const options = { sampleCount };

    // XR渲染目标不需要纹理更新
    if (renderTarget.isXRRenderTarget !== true) {
      // 更新所有颜色纹理
      for (let i = 0; i < textures.length; i++) {
        const texture = textures[i];

        // 如果纹理需要更新，标记纹理
        if (textureNeedsUpdate) texture.needsUpdate = true;

        // 更新纹理
        this.updateTexture(texture, options);
      }

      // 如果有深度纹理，也进行更新
      if (depthTexture) {
        this.updateTexture(depthTexture, options);
      }
    }

    // 设置销毁处理器
    if (renderTargetData.initialized !== true) {
      renderTargetData.initialized = true;

      // 创建销毁回调函数
      const onDispose = () => {
        // 移除事件监听器
        renderTarget.removeEventListener("dispose", onDispose);

        // 销毁所有颜色纹理
        for (let i = 0; i < textures.length; i++) {
          this._destroyTexture(textures[i]);
        }

        // 销毁深度纹理
        if (depthTexture) {
          this._destroyTexture(depthTexture);
        }

        // 从数据映射中删除渲染目标
        this.delete(renderTarget);
      };

      // 添加销毁事件监听器
      renderTarget.addEventListener("dispose", onDispose);
    }
  }

  /**
   * 更新给定的纹理
   * 根据纹理状态，此方法触发纹理数据上传到GPU内存。
   * 如果纹理数据尚未准备好上传，则使用默认纹理数据作为占位符。
   *
   * @param {Object} texture - 要更新的纹理
   * @param {Object} [options={}] - 更新选项
   */
  updateTexture(texture, options = {}) {
    // 获取纹理数据
    const textureData = this.get(texture);
    // 如果纹理已初始化且版本未变化，直接返回
    if (textureData.initialized === true && textureData.version === texture.version) return;

    // 判断是否为渲染目标纹理
    const isRenderTarget = texture.isRenderTargetTexture || texture.isDepthTexture || texture.isFramebufferTexture;
    const backend = this.backend;

    // 如果是渲染目标纹理且已初始化，需要先销毁旧资源
    if (isRenderTarget && textureData.initialized === true) {
      // 这是一次更新操作

      // 销毁旧的采样器和纹理
      backend.destroySampler(texture);
      backend.destroyTexture(texture);
    }

    // 处理帧缓冲区纹理
    if (texture.isFramebufferTexture) {
      // 获取当前渲染目标
      const renderTarget = this.renderer.getRenderTarget();

      // 根据渲染目标设置纹理类型
      if (renderTarget) {
        texture.type = renderTarget.texture.type;
      } else {
        texture.type = UnsignedByteType;
      }
    }

    // 获取纹理尺寸并设置选项
    const { width, height, depth } = this.getSize(texture);

    options.width = width;
    options.height = height;
    options.depth = depth;
    options.needsMipmaps = this.needsMipmaps(texture);
    options.levels = options.needsMipmaps ? this.getMipLevels(texture, width, height) : 1;

    // 处理不同类型的纹理
    if (isRenderTarget || texture.isStorageTexture === true) {
      // 渲染目标纹理或存储纹理的处理
      backend.createSampler(texture);
      backend.createTexture(texture, options);

      // 记录纹理生成版本
      textureData.generation = texture.version;
    } else {
      // 普通纹理的处理
      const needsCreate = textureData.initialized !== true;

      // 如果需要创建，先创建采样器
      if (needsCreate) backend.createSampler(texture);

      // 如果纹理版本大于0，处理纹理数据
      if (texture.version > 0) {
        const image = texture.image;

        // 检查图像数据的有效性
        if (image === undefined) {
          console.warn("THREE.Renderer: Texture marked for update but image is undefined.");
        } else if (image.complete === false) {
          console.warn("THREE.Renderer: Texture marked for update but image is incomplete.");
        } else {
          // 处理多图像纹理（如立方体纹理）
          if (texture.images) {
            const images = [];

            // 收集所有图像
            for (const image of texture.images) {
              images.push(image);
            }

            options.images = images;
          } else {
            // 单图像纹理
            options.image = image;
          }

          // 如果是默认纹理或首次创建，创建新纹理
          if (textureData.isDefaultTexture === undefined || textureData.isDefaultTexture === true) {
            backend.createTexture(texture, options);

            // 标记不再是默认纹理
            textureData.isDefaultTexture = false;
            textureData.generation = texture.version;
          }

          // 如果纹理数据已准备好，更新纹理
          if (texture.source.dataReady === true) backend.updateTexture(texture, options);

          // 如果需要mipmap且尚未生成，生成mipmap
          if (options.needsMipmaps && texture.mipmaps.length === 0) backend.generateMipmaps(texture);
        }
      } else {
        // 异步更新 - 纹理数据尚未准备好

        // 创建默认纹理作为占位符
        backend.createDefaultTexture(texture);

        // 标记为默认纹理
        textureData.isDefaultTexture = true;
        textureData.generation = texture.version;
      }
    }

    // 设置销毁处理器
    if (textureData.initialized !== true) {
      textureData.initialized = true;
      textureData.generation = texture.version;

      // 增加纹理计数
      this.info.memory.textures++;

      // 检查视频纹理的颜色空间
      if (texture.isVideoTexture && ColorManagement.getTransfer(texture.colorSpace) !== SRGBTransfer) {
        console.warn("WebGPURenderer: Video textures must use a color space with a sRGB transfer function, e.g. SRGBColorSpace.");
      }

      // 创建销毁回调函数
      const onDispose = () => {
        // 移除事件监听器
        texture.removeEventListener("dispose", onDispose);

        // 销毁纹理资源
        this._destroyTexture(texture);
      };

      // 添加销毁事件监听器
      texture.addEventListener("dispose", onDispose);
    }

    // 更新纹理数据版本
    textureData.version = texture.version;
  }

  /**
   * 计算给定纹理的尺寸
   * 将结果写入目标向量并返回该向量
   *
   * 如果纹理数据尚未可用，该方法返回默认尺寸值
   *
   * @param {Object} texture - 要计算尺寸的纹理
   * @param {Vector3} target - 目标向量，用于存储结果
   * @return {Vector3} 包含尺寸信息的目标向量
   */
  getSize(texture, target = _size) {
    // 获取图像数据，优先使用images数组的第一个元素
    let image = texture.images ? texture.images[0] : texture.image;

    if (image) {
      // 如果图像对象包含嵌套的image属性，使用内部图像
      if (image.image !== undefined) image = image.image;

      // 处理HTML视频元素
      if (image instanceof HTMLVideoElement) {
        target.width = image.videoWidth || 1;
        target.height = image.videoHeight || 1;
        target.depth = 1;
      }
      // 处理VideoFrame对象
      else if (image instanceof VideoFrame) {
        target.width = image.displayWidth || 1;
        target.height = image.displayHeight || 1;
        target.depth = 1;
      }
      // 处理普通图像对象
      else {
        target.width = image.width || 1;
        target.height = image.height || 1;
        // 立方体纹理有6个面，其他纹理使用图像深度或默认为1
        target.depth = texture.isCubeTexture ? 6 : image.depth || 1;
      }
    } else {
      // 如果没有图像数据，使用默认尺寸
      target.width = target.height = target.depth = 1;
    }

    return target;
  }

  /**
   * 计算给定纹理的mipmap级别数量
   * 基于纹理的宽度和高度计算所需的mipmap层数
   *
   * @param {Object} texture - 纹理对象
   * @param {number} width - 纹理的宽度
   * @param {number} height - 纹理的高度
   * @return {number} mipmap级别数量
   */
  getMipLevels(texture, width, height) {
    let mipLevelCount;

    // 处理压缩纹理
    if (texture.isCompressedTexture) {
      // 如果有预生成的mipmap，使用其数量
      if (texture.mipmaps) {
        mipLevelCount = texture.mipmaps.length;
      } else {
        // 否则只有一个级别
        mipLevelCount = 1;
      }
    } else {
      // 对于普通纹理，计算理论上的最大mipmap级别数
      // 使用log2(max(width, height)) + 1的公式
      mipLevelCount = Math.floor(Math.log2(Math.max(width, height))) + 1;
    }

    return mipLevelCount;
  }

  /**
   * 检查给定纹理是否需要mipmap
   * 根据纹理类型和设置判断是否需要生成mipmap
   *
   * @param {Object} texture - 纹理对象
   * @return {boolean} 是否需要mipmap
   */
  needsMipmaps(texture) {
    // 压缩纹理或设置了generateMipmaps的纹理需要mipmap
    return texture.isCompressedTexture === true || texture.generateMipmaps;
  }

  /**
   * 销毁纹理资源
   * 当给定纹理不再需要时，释放其内部资源
   *
   * @param {Object} texture - 要销毁的纹理
   * @private
   */
  _destroyTexture(texture) {
    // 检查纹理是否存在于管理器中
    if (this.has(texture) === true) {
      // 销毁采样器
      this.backend.destroySampler(texture);
      // 销毁纹理
      this.backend.destroyTexture(texture);

      // 从数据映射中删除纹理
      this.delete(texture);

      // 减少纹理计数
      this.info.memory.textures--;
    }
  }
}

// 导出纹理管理器类
export default Textures;
