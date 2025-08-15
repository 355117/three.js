// 导入事件分发器基类
import { EventDispatcher } from "./EventDispatcher.js";
// 导入纹理类
import { Texture } from "../textures/Texture.js";
// 导入线性过滤常量
import { LinearFilter } from "../constants.js";
// 导入四维向量类
import { Vector4 } from "../math/Vector4.js";
// 导入纹理源类
import { Source } from "../textures/Source.js";

/**
 * 渲染目标类
 *
 * 渲染目标是显卡为在后台渲染的场景绘制像素的缓冲区。
 * 它在各种效果中使用，例如在将渲染图像显示到屏幕之前对其应用后处理。
 *
 * 渲染目标的主要用途：
 * 1. 离屏渲染：将场景渲染到纹理而不是屏幕
 * 2. 后处理效果：模糊、发光、色调映射等
 * 3. 阴影映射：生成阴影贴图
 * 4. 反射和折射：环境映射、水面反射等
 * 5. 多重渲染目标（MRT）：同时渲染到多个纹理
 * 6. 深度纹理：用于深度测试和特殊效果
 *
 * 工作原理：
 * - 创建一个或多个纹理作为颜色附件
 * - 可选地创建深度缓冲区和模板缓冲区
 * - 渲染器将场景渲染到这些缓冲区而不是屏幕
 * - 生成的纹理可以用作其他渲染过程的输入
 *
 * @augments EventDispatcher
 */
class RenderTarget extends EventDispatcher {
  /**
   * 渲染目标配置选项
   *
   * 这个类型定义描述了创建渲染目标时可用的所有配置选项。
   *
   * @typedef {Object} RenderTarget~Options
   * @property {boolean} [generateMipmaps=false] - 是否生成 mipmap（多级纹理）
   * @property {number} [magFilter=LinearFilter] - 放大过滤器（当纹理被放大时使用）
   * @property {number} [minFilter=LinearFilter] - 缩小过滤器（当纹理被缩小时使用）
   * @property {number} [format=RGBAFormat] - 纹理格式（RGBA、RGB、Alpha 等）
   * @property {number} [type=UnsignedByteType] - 纹理数据类型（字节、浮点等）
   * @property {?string} [internalFormat=null] - 纹理的内部格式（WebGL 特定）
   * @property {number} [wrapS=ClampToEdgeWrapping] - S 轴（U 轴）的纹理包装模式
   * @property {number} [wrapT=ClampToEdgeWrapping] - T 轴（V 轴）的纹理包装模式
   * @property {number} [anisotropy=1] - 纹理的各向异性过滤值
   * @property {string} [colorSpace=NoColorSpace] - 纹理的颜色空间
   * @property {boolean} [depthBuffer=true] - 是否分配深度缓冲区
   * @property {boolean} [stencilBuffer=false] - 是否分配模板缓冲区
   * @property {boolean} [resolveDepthBuffer=true] - 是否解析深度缓冲区（MSAA 相关）
   * @property {boolean} [resolveStencilBuffer=true] - 是否解析模板缓冲区（MSAA 相关）
   * @property {?Texture} [depthTexture=null] - 深度纹理的引用
   * @property {number} [samples=0] - MSAA（多重采样抗锯齿）采样数
   * @property {number} [count=1] - 颜色附件的数量，至少为 1
   * @property {number} [depth=1] - 纹理深度（用于 3D 纹理或纹理数组）
   * @property {boolean} [multiview=false] - 是否用于多视图渲染（VR/AR）
   */

  /**
   * 构造一个新的渲染目标
   *
   * @param {number} [width=1] - 渲染目标的宽度（像素）
   * @param {number} [height=1] - 渲染目标的高度（像素）
   * @param {RenderTarget~Options} [options] - 配置对象
   */
  constructor(width = 1, height = 1, options = {}) {
    // 调用父类构造函数
    super();

    // 合并默认选项和用户提供的选项
    options = Object.assign(
      {
        generateMipmaps: false, // 默认不生成 mipmap
        internalFormat: null, // 默认内部格式为 null
        minFilter: LinearFilter, // 默认使用线性过滤
        depthBuffer: true, // 默认启用深度缓冲区
        stencilBuffer: false, // 默认禁用模板缓冲区
        resolveDepthBuffer: true, // 默认解析深度缓冲区
        resolveStencilBuffer: true, // 默认解析模板缓冲区
        depthTexture: null, // 默认无深度纹理
        samples: 0, // 默认无 MSAA
        count: 1, // 默认一个颜色附件
        depth: 1, // 默认深度为 1
        multiview: false, // 默认非多视图渲染
      },
      options
    );

    /**
     * 类型测试标志
     *
     * 此标志可用于类型测试，用于识别对象是否为渲染目标。
     * 在 Three.js 中，许多类都有类似的标志用于运行时类型检查。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isRenderTarget = true;

    /**
     * 渲染目标的宽度
     *
     * 以像素为单位的渲染目标宽度。这决定了生成纹理的宽度。
     *
     * @type {number}
     * @default 1
     */
    this.width = width;

    /**
     * 渲染目标的高度
     *
     * 以像素为单位的渲染目标高度。这决定了生成纹理的高度。
     *
     * @type {number}
     * @default 1
     */
    this.height = height;

    /**
     * 渲染目标的深度
     *
     * 用于 3D 纹理或纹理数组。对于普通的 2D 渲染目标，此值通常为 1。
     *
     * @type {number}
     * @default 1
     */
    this.depth = options.depth;

    /**
     * 裁剪区域
     *
     * 渲染目标视口内的矩形区域。超出此区域的片段将被丢弃。
     * 裁剪测试是一种优化技术，可以限制渲染到特定区域。
     *
     * Vector4 格式：(x, y, width, height)
     * - x, y: 裁剪区域的左下角坐标
     * - width, height: 裁剪区域的宽度和高度
     *
     * @type {Vector4}
     * @default (0,0,width,height)
     */
    this.scissor = new Vector4(0, 0, width, height);

    /**
     * 裁剪测试开关
     *
     * 指示在渲染到此渲染目标时是否应启用裁剪测试。
     * 当启用时，只有在裁剪区域内的像素才会被渲染。
     *
     * @type {boolean}
     * @default false
     */
    this.scissorTest = false;

    /**
     * 视口区域
     *
     * 表示渲染目标视口的矩形区域。视口定义了渲染的坐标系统。
     *
     * Vector4 格式：(x, y, width, height)
     * - x, y: 视口的左下角坐标
     * - width, height: 视口的宽度和高度
     *
     * @type {Vector4}
     * @default (0,0,width,height)
     */
    this.viewport = new Vector4(0, 0, width, height);

    // 创建图像描述对象，包含尺寸信息
    const image = { width: width, height: height, depth: options.depth };

    // 创建基础纹理对象
    const texture = new Texture(image);

    /**
     * 纹理数组
     *
     * 每个颜色附件都表示为一个单独的纹理。
     * 至少有一个条目用于默认颜色附件。
     *
     * 多重渲染目标（MRT）允许同时渲染到多个纹理，
     * 这在延迟渲染、G-Buffer 生成等高级渲染技术中非常有用。
     *
     * @type {Array<Texture>}
     */
    this.textures = [];

    // 根据配置的颜色附件数量创建纹理
    const count = options.count;
    for (let i = 0; i < count; i++) {
      // 克隆基础纹理
      this.textures[i] = texture.clone();
      // 标记为渲染目标纹理
      this.textures[i].isRenderTargetTexture = true;
      // 设置反向引用
      this.textures[i].renderTarget = this;
    }

    // 应用纹理选项配置
    this._setTextureOptions(options);

    /**
     * 深度缓冲区开关
     *
     * 是否分配深度缓冲区。深度缓冲区用于深度测试，
     * 确保正确的前后关系渲染。
     *
     * @type {boolean}
     * @default true
     */
    this.depthBuffer = options.depthBuffer;

    /**
     * 模板缓冲区开关
     *
     * 是否分配模板缓冲区。模板缓冲区用于模板测试，
     * 可以实现复杂的渲染效果，如阴影体积、轮廓渲染等。
     *
     * @type {boolean}
     * @default false
     */
    this.stencilBuffer = options.stencilBuffer;

    /**
     * 深度缓冲区解析开关
     *
     * 是否解析深度缓冲区。在使用 MSAA（多重采样抗锯齿）时，
     * 需要将多重采样的深度缓冲区解析为单一采样的缓冲区。
     *
     * @type {boolean}
     * @default true
     */
    this.resolveDepthBuffer = options.resolveDepthBuffer;

    /**
     * 模板缓冲区解析开关
     *
     * 是否解析模板缓冲区。在使用 MSAA 时，
     * 需要将多重采样的模板缓冲区解析为单一采样的缓冲区。
     *
     * @type {boolean}
     * @default true
     */
    this.resolveStencilBuffer = options.resolveStencilBuffer;

    // 私有深度纹理属性
    this._depthTexture = null;
    // 通过 setter 设置深度纹理
    this.depthTexture = options.depthTexture;

    /**
     * MSAA 采样数
     *
     * 多重采样抗锯齿（MSAA）的采样数。
     * 值为 `0` 表示禁用 MSAA。
     *
     * 常见值：
     * - 0: 禁用 MSAA
     * - 2: 2x MSAA
     * - 4: 4x MSAA
     * - 8: 8x MSAA
     *
     * 更高的采样数提供更好的抗锯齿效果，但会消耗更多的 GPU 内存和性能。
     *
     * @type {number}
     * @default 0
     */
    this.samples = options.samples;

    /**
     * 多视图渲染标志
     *
     * 指示此目标是否用于多视图渲染。
     * 多视图渲染主要用于 VR/AR 应用，可以同时为多个视点（如左眼和右眼）渲染。
     *
     * @type {boolean}
     * @default false
     */
    this.multiview = options.multiview;
  }

  /**
   * 设置纹理选项的私有方法
   *
   * 这个方法将配置选项应用到所有纹理附件上。
   * 它处理纹理的过滤、包装、格式等属性。
   *
   * @param {Object} [options={}] - 纹理配置选项
   * @private
   */
  _setTextureOptions(options = {}) {
    // 默认纹理值
    const values = {
      minFilter: LinearFilter, // 默认缩小过滤器
      generateMipmaps: false, // 默认不生成 mipmap
      flipY: false, // 默认不翻转 Y 轴
      internalFormat: null, // 默认内部格式
    };

    // 根据提供的选项设置纹理属性
    if (options.mapping !== undefined) values.mapping = options.mapping; // 纹理映射模式
    if (options.wrapS !== undefined) values.wrapS = options.wrapS; // S 轴包装模式
    if (options.wrapT !== undefined) values.wrapT = options.wrapT; // T 轴包装模式
    if (options.wrapR !== undefined) values.wrapR = options.wrapR; // R 轴包装模式（3D 纹理）
    if (options.magFilter !== undefined) values.magFilter = options.magFilter; // 放大过滤器
    if (options.minFilter !== undefined) values.minFilter = options.minFilter; // 缩小过滤器
    if (options.format !== undefined) values.format = options.format; // 纹理格式
    if (options.type !== undefined) values.type = options.type; // 数据类型
    if (options.anisotropy !== undefined) values.anisotropy = options.anisotropy; // 各向异性过滤
    if (options.colorSpace !== undefined) values.colorSpace = options.colorSpace; // 颜色空间
    if (options.flipY !== undefined) values.flipY = options.flipY; // Y 轴翻转
    if (options.generateMipmaps !== undefined) values.generateMipmaps = options.generateMipmaps; // 生成 mipmap
    if (options.internalFormat !== undefined) values.internalFormat = options.internalFormat; // 内部格式

    // 将配置应用到所有纹理附件
    for (let i = 0; i < this.textures.length; i++) {
      const texture = this.textures[i];
      texture.setValues(values);
    }
  }

  /**
   * 默认颜色附件纹理的获取器
   *
   * 返回表示默认颜色附件的纹理。
   * 这是 textures[0] 的便捷访问器。
   *
   * @type {Texture}
   */
  get texture() {
    return this.textures[0];
  }

  /**
   * 默认颜色附件纹理的设置器
   *
   * 设置默认颜色附件的纹理。
   *
   * @param {Texture} value - 要设置的纹理
   */
  set texture(value) {
    this.textures[0] = value;
  }

  /**
   * 深度纹理的设置器
   *
   * 设置深度纹理，并正确管理渲染目标的引用关系。
   *
   * @param {?DepthTexture} current - 要设置的深度纹理，或 null
   */
  set depthTexture(current) {
    // 如果之前有深度纹理，清除其渲染目标引用
    if (this._depthTexture !== null) this._depthTexture.renderTarget = null;
    // 如果新的深度纹理不为空，设置其渲染目标引用
    if (current !== null) current.renderTarget = this;

    // 设置私有深度纹理属性
    this._depthTexture = current;
  }

  /**
   * 深度纹理的获取器
   *
   * 代替将深度保存在渲染缓冲区中，可以使用纹理，
   * 这对于进一步处理很有用，例如在后处理的上下文中。
   *
   * 深度纹理的用途：
   * - 阴影映射：存储光源视角的深度信息
   * - 深度感知后处理：景深、SSAO 等效果
   * - 体积渲染：3D 纹理的深度信息
   * - 碰撞检测：基于深度的物理计算
   *
   * @type {?DepthTexture}
   * @default null
   */
  get depthTexture() {
    return this._depthTexture;
  }

  /**
   * 设置此渲染目标的尺寸
   *
   * 更改渲染目标的宽度、高度和深度。
   * 当尺寸发生变化时，会自动更新所有相关的纹理和缓冲区。
   *
   * @param {number} width - 新的宽度（像素）
   * @param {number} height - 新的高度（像素）
   * @param {number} [depth=1] - 新的深度（用于 3D 纹理或纹理数组）
   */
  setSize(width, height, depth = 1) {
    // 只有当尺寸实际发生变化时才进行更新
    if (this.width !== width || this.height !== height || this.depth !== depth) {
      // 更新渲染目标的尺寸属性
      this.width = width;
      this.height = height;
      this.depth = depth;

      // 更新所有纹理附件的尺寸
      for (let i = 0, il = this.textures.length; i < il; i++) {
        this.textures[i].image.width = width;
        this.textures[i].image.height = height;
        this.textures[i].image.depth = depth;
        // 如果深度大于 1，标记为数组纹理
        this.textures[i].isArrayTexture = this.textures[i].image.depth > 1;
      }

      // 释放旧的 GPU 资源，强制重新创建
      this.dispose();
    }

    // 更新视口和裁剪区域以匹配新的尺寸
    this.viewport.set(0, 0, width, height);
    this.scissor.set(0, 0, width, height);
  }

  /**
   * 返回此实例的克隆副本
   *
   * 创建一个新的渲染目标，其值从当前实例复制而来。
   * 这是一个便捷方法，等价于 new RenderTarget().copy(this)。
   *
   * @return {RenderTarget} 当前实例的克隆副本
   */
  clone() {
    return new this.constructor().copy(this);
  }

  /**
   * 复制给定渲染目标的设置
   *
   * 这是一个结构性复制，因此复制后渲染目标之间不共享资源。
   * 这包括所有 MRT（多重渲染目标）纹理和深度纹理。
   *
   * 复制的内容包括：
   * - 尺寸信息（宽度、高度、深度）
   * - 视口和裁剪设置
   * - 所有纹理附件（深拷贝）
   * - 深度和模板缓冲区设置
   * - 深度纹理（如果存在）
   * - MSAA 采样设置
   *
   * @param {RenderTarget} source - 要复制的渲染目标
   * @return {RenderTarget} 返回当前实例的引用，支持链式调用
   */
  copy(source) {
    // 复制尺寸信息
    this.width = source.width;
    this.height = source.height;
    this.depth = source.depth;

    // 复制裁剪设置
    this.scissor.copy(source.scissor);
    this.scissorTest = source.scissorTest;

    // 复制视口设置
    this.viewport.copy(source.viewport);

    // 清空当前纹理数组
    this.textures.length = 0;

    // 复制所有纹理附件
    for (let i = 0, il = source.textures.length; i < il; i++) {
      // 克隆源纹理
      this.textures[i] = source.textures[i].clone();
      // 标记为渲染目标纹理
      this.textures[i].isRenderTargetTexture = true;
      // 设置渲染目标引用
      this.textures[i].renderTarget = this;

      // 确保图像对象不被共享，参见 #20328
      // 这避免了多个渲染目标意外共享同一个图像对象的问题
      const image = Object.assign({}, source.textures[i].image);
      this.textures[i].source = new Source(image);
    }

    // 复制缓冲区设置
    this.depthBuffer = source.depthBuffer;
    this.stencilBuffer = source.stencilBuffer;

    // 复制缓冲区解析设置
    this.resolveDepthBuffer = source.resolveDepthBuffer;
    this.resolveStencilBuffer = source.resolveStencilBuffer;

    // 复制深度纹理（如果存在）
    if (source.depthTexture !== null) this.depthTexture = source.depthTexture.clone();

    // 复制 MSAA 采样设置
    this.samples = source.samples;

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 释放此实例分配的 GPU 相关资源
   *
   * 当此实例在您的应用程序中不再使用时，请调用此方法。
   * 这对于防止内存泄漏和优化性能非常重要。
   *
   * 释放的资源包括：
   * - GPU 上的纹理内存
   * - 深度和模板缓冲区
   * - 帧缓冲对象（FBO）
   * - 相关的 WebGL 资源
   *
   * 注意：调用此方法后，渲染目标将不再可用，
   * 尝试使用它可能会导致错误。
   *
   * @fires RenderTarget#dispose
   */
  dispose() {
    // 分发 dispose 事件，通知渲染器和其他监听器释放相关资源
    this.dispatchEvent({ type: "dispose" });
  }
}

// 导出渲染目标类
export { RenderTarget };
