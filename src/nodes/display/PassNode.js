// 从核心临时节点模块导入TempNode基类
import TempNode from "../core/TempNode.js";
// 从纹理访问器模块导入TextureNode类（注释掉的texture函数暂未使用）
import { default as TextureNode /*, texture*/ } from "../accessors/TextureNode.js";
// 从核心常量模块导入节点更新类型枚举
import { NodeUpdateType } from "../core/constants.js";
// 从TSL基础模块导入nodeObject函数，用于创建节点对象
import { nodeObject } from "../tsl/TSLBase.js";
// 从统一变量节点模块导入uniform函数
import { uniform } from "../core/UniformNode.js";
// 从视口深度节点模块导入深度转换函数
import { viewZToOrthographicDepth, perspectiveDepthToViewZ } from "./ViewportDepthNode.js";

// 从常量模块导入半浮点类型（注释掉的FloatType暂未使用）
import { HalfFloatType /*, FloatType*/ } from "../../constants.js";
// 从数学模块导入二维向量类
import { Vector2 } from "../../math/Vector2.js";
// 从数学模块导入四维向量类
import { Vector4 } from "../../math/Vector4.js";
// 从纹理模块导入深度纹理类
import { DepthTexture } from "../../textures/DepthTexture.js";
// 从核心模块导入渲染目标类
import { RenderTarget } from "../../core/RenderTarget.js";

// 创建一个纯净的二维向量实例，用于存储尺寸信息
const _size = /*@__PURE__*/ new Vector2();

/**
 * 表示通道节点的纹理。
 *
 * @augments TextureNode
 */
class PassTextureNode extends TextureNode {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "PassTextureNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的通道纹理节点。
   *
   * @param {PassNode} passNode - 通道节点
   * @param {Texture} texture - 输出纹理
   */
  constructor(passNode, texture) {
    super(texture); // 调用父类TextureNode的构造函数

    /**
     * 对通道节点的引用。
     *
     * @type {PassNode}
     */
    this.passNode = passNode; // 存储通道节点引用

    this.setUpdateMatrix(false); // 设置不更新矩阵
  }

  // 设置节点的着色器逻辑
  setup(builder) {
    this.passNode.build(builder); // 构建通道节点

    return super.setup(builder); // 调用父类的setup方法
  }

  // 克隆当前节点
  clone() {
    return new this.constructor(this.passNode, this.value); // 创建新的同类型节点实例
  }
}

/**
 * `PassTextureNode`的扩展，允许管理多个内部纹理。
 * 与`getPreviousTexture()`相关API有关。
 *
 * @augments PassTextureNode
 */
class PassMultipleTextureNode extends PassTextureNode {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "PassMultipleTextureNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的多重通道纹理节点。
   *
   * @param {PassNode} passNode - 通道节点
   * @param {string} textureName - 输出纹理名称
   * @param {boolean} [previousTexture=false] - 是否应该使用前一帧数据
   */
  constructor(passNode, textureName, previousTexture = false) {
    // 向super调用传递null，因为此类不使用外部纹理来渲染通道数据。
    // 相反，纹理由通道节点本身管理

    super(passNode, null); // 调用父类构造函数，纹理参数为null

    /**
     * 输出纹理名称。
     *
     * @type {string}
     */
    this.textureName = textureName; // 存储纹理名称

    /**
     * 是否应该使用前一帧数据。
     *
     * @type {boolean}
     */
    this.previousTexture = previousTexture; // 存储是否使用前一帧数据的标志
  }

  /**
   * 更新此节点的纹理引用。
   */
  updateTexture() {
    // 根据previousTexture标志选择获取当前纹理还是前一帧纹理
    this.value = this.previousTexture ? this.passNode.getPreviousTexture(this.textureName) : this.passNode.getTexture(this.textureName);
  }

  // 设置节点的着色器逻辑
  setup(builder) {
    this.updateTexture(); // 更新纹理引用

    return super.setup(builder); // 调用父类的setup方法
  }

  // 克隆当前节点
  clone() {
    // 创建新的同类型节点实例
    const newNode = new this.constructor(this.passNode, this.textureName, this.previousTexture);
    // 复制所有相关属性
    newNode.uvNode = this.uvNode; // 复制UV节点
    newNode.levelNode = this.levelNode; // 复制级别节点
    newNode.biasNode = this.biasNode; // 复制偏移节点
    newNode.sampler = this.sampler; // 复制采样器
    newNode.depthNode = this.depthNode; // 复制深度节点
    newNode.compareNode = this.compareNode; // 复制比较节点
    newNode.gradNode = this.gradNode; // 复制梯度节点

    return newNode; // 返回克隆的节点
  }
}

/**
 * 表示后处理上下文中的渲染通道（有时称为美化通道）。
 * 此通道为给定的场景和相机生成渲染，并可以通过MRT提供多个输出以供进一步处理。
 *
 * ```js
 * const postProcessing = new PostProcessing( renderer );
 *
 * const scenePass = pass( scene, camera );
 *
 * postProcessing.outputNode = scenePass;
 * ```
 *
 * @augments TempNode
 */
class PassNode extends TempNode {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "PassNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的通道节点。
   *
   * @param {('color'|'depth')} scope - 通道的作用域。作用域决定节点输出颜色还是深度
   * @param {Scene} scene - 场景的引用
   * @param {Camera} camera - 相机的引用
   * @param {Object} options - 内部渲染目标的选项
   */
  constructor(scope, scene, camera, options = {}) {
    super("vec4"); // 调用父类构造函数，指定输出类型为vec4

    /**
     * 通道的作用域。作用域决定节点输出颜色还是深度。
     *
     * @type {('color'|'depth')}
     */
    this.scope = scope; // 存储通道作用域

    /**
     * 场景的引用。
     *
     * @type {Scene}
     */
    this.scene = scene; // 存储场景引用

    /**
     * 相机的引用。
     *
     * @type {Camera}
     */
    this.camera = camera; // 存储相机引用

    /**
     * 内部渲染目标的选项。
     *
     * @type {Object}
     */
    this.options = options; // 存储渲染目标选项

    /**
     * 通道的像素比率。将自动与渲染器的像素比率保持同步。
     *
     * @private
     * @type {number}
     * @default 1
     */
    this._pixelRatio = 1; // 初始化像素比率

    /**
     * 通道的像素宽度。将自动与渲染器的宽度保持同步。
     * @private
     * @type {number}
     * @default 1
     */
    this._width = 1; // 初始化宽度

    /**
     * 通道的像素高度。将自动与渲染器的高度保持同步。
     * @private
     * @type {number}
     * @default 1
     */
    this._height = 1; // 初始化高度

    // 创建深度纹理
    const depthTexture = new DepthTexture();
    depthTexture.isRenderTargetTexture = true; // 标记为渲染目标纹理
    //depthTexture.type = FloatType; // 注释掉的浮点类型设置
    depthTexture.name = "depth"; // 设置深度纹理名称

    // 创建渲染目标
    const renderTarget = new RenderTarget(this._width * this._pixelRatio, this._height * this._pixelRatio, { type: HalfFloatType, ...options });
    renderTarget.texture.name = "output"; // 设置输出纹理名称
    renderTarget.depthTexture = depthTexture; // 设置深度纹理

    /**
     * 通道的渲染目标。
     *
     * @type {RenderTarget}
     */
    this.renderTarget = renderTarget; // 存储渲染目标

    /**
     * 保存内部结果纹理的字典。
     *
     * @private
     * @type {Object<string, Texture>}
     */
    this._textures = {
      output: renderTarget.texture, // 输出纹理
      depth: depthTexture, // 深度纹理
    };

    /**
     * 保存内部纹理节点的字典。
     *
     * @private
     * @type {Object<string, TextureNode>}
     */
    this._textureNodes = {}; // 初始化纹理节点字典

    /**
     * 保存内部深度节点的字典。
     *
     * @private
     * @type {Object}
     */
    this._linearDepthNodes = {}; // 初始化线性深度节点字典

    /**
     * 保存内部viewZ节点的字典。
     *
     * @private
     * @type {Object}
     */
    this._viewZNodes = {}; // 初始化viewZ节点字典

    /**
     * 保存前一帧纹理数据的字典。
     * 用于计算速度/运动向量。
     *
     * @private
     * @type {Object<string, Texture>}
     */
    this._previousTextures = {}; // 初始化前一帧纹理字典

    /**
     * 保存前一帧纹理节点的字典。
     * 用于计算速度/运动向量。
     *
     * @private
     * @type {Object<string, TextureNode>}
     */
    this._previousTextureNodes = {}; // 初始化前一帧纹理节点字典

    /**
     * 相机的`near`属性作为统一变量。
     *
     * @private
     * @type {UniformNode}
     */
    this._cameraNear = uniform(0); // 初始化相机近平面统一变量

    /**
     * 相机的`far`属性作为统一变量。
     *
     * @private
     * @type {UniformNode}
     */
    this._cameraFar = uniform(0); // 初始化相机远平面统一变量

    /**
     * 配置MRT设置的MRT节点。
     *
     * @private
     * @type {?MRTNode}
     * @default null
     */
    this._mrt = null; // 初始化MRT节点为null

    /**
     * 用于配置生成通道的相机的图层对象。
     *
     * @private
     * @type {?Layers}
     * @default null
     */
    this._layers = null; // 初始化图层对象为null

    /**
     * 缩放内部渲染目标的分辨率。
     *
     * @private
     * @type {number}
     * @default 1
     */
    this._resolution = 1; // 初始化分辨率缩放因子

    /**
     * 自定义视口定义。
     *
     * @private
     * @type {?Vector4}
     * @default null
     */
    this._viewport = null; // 初始化视口为null

    /**
     * 自定义裁剪定义。
     *
     * @private
     * @type {?Vector4}
     * @default null
     */
    this._scissor = null; // 初始化裁剪区域为null

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isPassNode = true; // 设置通道节点类型标识

    /**
     * `updateBeforeType`设置为`NodeUpdateType.FRAME`，因为节点在其
     * {@link PassNode#updateBefore}方法中每帧渲染一次场景。
     *
     * @type {string}
     * @default 'frame'
     */
    this.updateBeforeType = NodeUpdateType.FRAME; // 设置更新类型为每帧更新

    /**
     * 此标志用于全局缓存。
     *
     * @type {boolean}
     * @default true
     */
    this.global = true; // 设置全局缓存标志
  } // 构造函数结束

  /**
   * 设置通道的分辨率。
   * 分辨率是与渲染器宽度和高度相乘的因子。
   *
   * @param {number} resolution - 要设置的分辨率。值为`1`表示全分辨率
   * @return {PassNode} 对此通道的引用
   */
  setResolution(resolution) {
    this._resolution = resolution; // 设置分辨率

    return this; // 返回自身以支持链式调用
  }

  /**
   * 获取通道的当前分辨率。
   *
   * @return {number} 当前分辨率。值为`1`表示全分辨率
   */
  getResolution() {
    return this._resolution; // 返回当前分辨率
  }

  /**
   * 设置渲染通道时应使用的图层配置。
   *
   * @param {Layers} layers - 要设置的图层对象
   * @return {PassNode} 对此通道的引用
   */
  setLayers(layers) {
    this._layers = layers; // 设置图层配置

    return this; // 返回自身以支持链式调用
  }

  /**
   * 获取通道的当前图层配置。
   *
   * @return {?Layers} 当前图层配置
   */
  getLayers() {
    return this._layers; // 返回当前图层配置
  }

  /**
   * 设置给定的MRT节点以为此通道设置MRT。
   *
   * @param {MRTNode} mrt - MRT对象
   * @return {PassNode} 对此通道的引用
   */
  setMRT(mrt) {
    this._mrt = mrt; // 设置MRT节点

    return this; // 返回自身以支持链式调用
  }

  /**
   * 返回当前的MRT节点。
   *
   * @return {MRTNode} 当前的MRT节点
   */
  getMRT() {
    return this._mrt; // 返回当前MRT节点
  }

  /**
   * 返回给定输出名称的纹理。
   *
   * @param {string} name - 要获取纹理的输出名称
   * @return {Texture} 纹理对象
   */
  getTexture(name) {
    let texture = this._textures[name]; // 从纹理字典中获取纹理

    // 如果纹理不存在，则创建新纹理
    if (texture === undefined) {
      const refTexture = this.renderTarget.texture; // 获取参考纹理

      texture = refTexture.clone(); // 克隆参考纹理
      texture.name = name; // 设置纹理名称

      this._textures[name] = texture; // 将新纹理存储到字典中

      this.renderTarget.textures.push(texture); // 将纹理添加到渲染目标的纹理数组中
    }

    return texture; // 返回纹理
  }

  /**
   * 返回保存给定输出名称的前一帧数据的纹理。
   *
   * @param {string} name - 要获取纹理的输出名称
   * @return {Texture} 保存前一帧数据的纹理
   */
  getPreviousTexture(name) {
    let texture = this._previousTextures[name]; // 从前一帧纹理字典中获取纹理

    // 如果前一帧纹理不存在，则创建新纹理
    if (texture === undefined) {
      texture = this.getTexture(name).clone(); // 克隆当前纹理

      this._previousTextures[name] = texture; // 将新纹理存储到前一帧纹理字典中
    }

    return texture; // 返回前一帧纹理
  }

  /**
   * 为给定输出名称切换当前纹理和前一帧纹理。
   *
   * @param {string} name - 输出名称
   */
  toggleTexture(name) {
    const prevTexture = this._previousTextures[name]; // 获取前一帧纹理

    // 如果前一帧纹理存在，则进行切换
    if (prevTexture !== undefined) {
      const texture = this._textures[name]; // 获取当前纹理

      const index = this.renderTarget.textures.indexOf(texture); // 找到当前纹理在数组中的索引
      this.renderTarget.textures[index] = prevTexture; // 用前一帧纹理替换当前纹理

      this._textures[name] = prevTexture; // 更新当前纹理字典
      this._previousTextures[name] = texture; // 更新前一帧纹理字典

      this._textureNodes[name].updateTexture(); // 更新当前纹理节点
      this._previousTextureNodes[name].updateTexture(); // 更新前一帧纹理节点
    }
  }

  /**
   * 返回给定输出名称的纹理节点。
   *
   * @param {string} [name='output'] - 要获取纹理节点的输出名称
   * @return {TextureNode} 纹理节点
   */
  getTextureNode(name = "output") {
    let textureNode = this._textureNodes[name]; // 从纹理节点字典中获取节点

    // 如果纹理节点不存在，则创建新节点
    if (textureNode === undefined) {
      textureNode = nodeObject(new PassMultipleTextureNode(this, name)); // 创建多重纹理节点
      textureNode.updateTexture(); // 更新纹理引用
      this._textureNodes[name] = textureNode; // 将新节点存储到字典中
    }

    return textureNode; // 返回纹理节点
  }

  /**
   * 返回给定输出名称的前一帧纹理节点。
   *
   * @param {string} [name='output'] - 要获取前一帧纹理节点的输出名称
   * @return {TextureNode} 前一帧纹理节点
   */
  getPreviousTextureNode(name = "output") {
    let textureNode = this._previousTextureNodes[name]; // 从前一帧纹理节点字典中获取节点

    // 如果前一帧纹理节点不存在，则创建新节点
    if (textureNode === undefined) {
      if (this._textureNodes[name] === undefined) this.getTextureNode(name); // 确保当前纹理节点存在

      textureNode = nodeObject(new PassMultipleTextureNode(this, name, true)); // 创建前一帧多重纹理节点
      textureNode.updateTexture(); // 更新纹理引用
      this._previousTextureNodes[name] = textureNode; // 将新节点存储到字典中
    }

    return textureNode; // 返回前一帧纹理节点
  }

  /**
   * 返回此通道的viewZ节点。
   *
   * @param {string} [name='depth'] - 要获取viewZ节点的输出名称。大多数情况下可以使用默认的`'depth'`，但参数存在是为了自定义深度输出
   * @return {Node} viewZ节点
   */
  getViewZNode(name = "depth") {
    let viewZNode = this._viewZNodes[name]; // 从viewZ节点字典中获取节点

    // 如果viewZ节点不存在，则创建新节点
    if (viewZNode === undefined) {
      const cameraNear = this._cameraNear; // 获取相机近平面
      const cameraFar = this._cameraFar; // 获取相机远平面

      // 创建并存储viewZ节点，将透视深度转换为viewZ
      this._viewZNodes[name] = viewZNode = perspectiveDepthToViewZ(this.getTextureNode(name), cameraNear, cameraFar);
    }

    return viewZNode; // 返回viewZ节点
  }

  /**
   * 返回此通道的线性深度节点。
   *
   * @param {string} [name='depth'] - 要获取线性深度节点的输出名称。大多数情况下可以使用默认的`'depth'`，但参数存在是为了自定义深度输出
   * @return {Node} 线性深度节点
   */
  getLinearDepthNode(name = "depth") {
    let linearDepthNode = this._linearDepthNodes[name]; // 从线性深度节点字典中获取节点

    // 如果线性深度节点不存在，则创建新节点
    if (linearDepthNode === undefined) {
      const cameraNear = this._cameraNear; // 获取相机近平面
      const cameraFar = this._cameraFar; // 获取相机远平面
      const viewZNode = this.getViewZNode(name); // 获取viewZ节点

      // TODO: 仅当 ( builder.camera.isPerspectiveCamera ) 时

      // 创建并存储线性深度节点，将viewZ转换为正交深度
      this._linearDepthNodes[name] = linearDepthNode = viewZToOrthographicDepth(viewZNode, cameraNear, cameraFar);
    }

    return linearDepthNode; // 返回线性深度节点
  }

  /**
   * 预编译通道。
   *
   * 注意，此方法必须在通道配置完成后调用。
   * 因此像`setMRT()`和`getTextureNode()`这样的调用必须在预编译之前进行。
   *
   * @async
   * @param {Renderer} renderer - 渲染器
   * @return {Promise} 编译完成时解析的Promise
   * @see {@link Renderer#compileAsync}
   */
  async compileAsync(renderer) {
    const currentRenderTarget = renderer.getRenderTarget(); // 保存当前渲染目标
    const currentMRT = renderer.getMRT(); // 保存当前MRT设置

    renderer.setRenderTarget(this.renderTarget); // 设置通道的渲染目标
    renderer.setMRT(this._mrt); // 设置通道的MRT

    await renderer.compileAsync(this.scene, this.camera); // 异步编译场景和相机

    renderer.setRenderTarget(currentRenderTarget); // 恢复原始渲染目标
    renderer.setMRT(currentMRT); // 恢复原始MRT设置
  }

  // 设置节点的着色器逻辑
  setup({ renderer }) {
    // 设置渲染目标的采样数：如果选项中未定义，则使用渲染器的采样数
    this.renderTarget.samples = this.options.samples === undefined ? renderer.samples : this.options.samples;

    // 设置渲染目标纹理类型为渲染器的颜色缓冲区类型
    this.renderTarget.texture.type = renderer.getColorBufferType();

    // 根据作用域返回相应的节点：颜色作用域返回纹理节点，深度作用域返回线性深度节点
    return this.scope === PassNode.COLOR ? this.getTextureNode() : this.getLinearDepthNode();
  }

  // 在每帧渲染前更新通道
  updateBefore(frame) {
    const { renderer } = frame; // 从帧对象中获取渲染器
    const { scene } = this; // 获取场景

    let camera; // 相机变量
    let pixelRatio; // 像素比率变量

    const outputRenderTarget = renderer.getOutputRenderTarget(); // 获取输出渲染目标

    // 检查是否为XR渲染目标
    if (outputRenderTarget && outputRenderTarget.isXRRenderTarget === true) {
      pixelRatio = 1; // XR模式下像素比率为1
      camera = renderer.xr.getCamera(); // 获取XR相机

      renderer.xr.updateCamera(camera); // 更新XR相机

      _size.set(outputRenderTarget.width, outputRenderTarget.height); // 设置尺寸为输出渲染目标的尺寸
    } else {
      camera = this.camera; // 使用通道的相机
      pixelRatio = renderer.getPixelRatio(); // 获取渲染器的像素比率

      renderer.getSize(_size); // 获取渲染器尺寸
    }

    this._pixelRatio = pixelRatio; // 更新像素比率

    this.setSize(_size.width, _size.height); // 设置通道尺寸

    const currentRenderTarget = renderer.getRenderTarget(); // 保存当前渲染目标
    const currentMRT = renderer.getMRT(); // 保存当前MRT设置
    const currentMask = camera.layers.mask; // 保存当前图层掩码

    this._cameraNear.value = camera.near; // 更新相机近平面值
    this._cameraFar.value = camera.far; // 更新相机远平面值

    // 如果设置了图层配置，则应用到相机
    if (this._layers !== null) {
      camera.layers.mask = this._layers.mask; // 设置相机图层掩码
    }

    // 切换所有前一帧纹理
    for (const name in this._previousTextures) {
      this.toggleTexture(name); // 切换纹理
    }

    renderer.setRenderTarget(this.renderTarget); // 设置通道的渲染目标
    renderer.setMRT(this._mrt); // 设置通道的MRT

    renderer.render(scene, camera); // 渲染场景

    renderer.setRenderTarget(currentRenderTarget); // 恢复原始渲染目标
    renderer.setMRT(currentMRT); // 恢复原始MRT设置

    camera.layers.mask = currentMask; // 恢复原始图层掩码
  }

  /**
   * 设置通道渲染目标的尺寸。考虑像素比率。
   *
   * @param {number} width - 要设置的宽度
   * @param {number} height - 要设置的高度
   */
  setSize(width, height) {
    this._width = width; // 存储宽度
    this._height = height; // 存储高度

    // 计算有效宽度：宽度 × 像素比率 × 分辨率
    const effectiveWidth = this._width * this._pixelRatio * this._resolution;
    // 计算有效高度：高度 × 像素比率 × 分辨率
    const effectiveHeight = this._height * this._pixelRatio * this._resolution;

    this.renderTarget.setSize(effectiveWidth, effectiveHeight); // 设置渲染目标尺寸

    // 如果设置了裁剪区域，则应用到渲染目标
    if (this._scissor !== null) this.renderTarget.scissor.copy(this._scissor);
    // 如果设置了视口，则应用到渲染目标
    if (this._viewport !== null) this.renderTarget.viewport.copy(this._viewport);
  }

  /**
   * 此方法允许定义通道的裁剪矩形。默认情况下，裁剪矩形与通道的尺寸保持同步。
   * 要逆转此过程并再次使用自动调整大小，请以`null`作为单个参数调用此方法。
   *
   * @param {?(number | Vector4)} x - 逻辑像素单位中框左下角的水平坐标。
   * 除了传递四个参数外，该方法也可以使用单个四维向量。
   * @param {number} y - 逻辑像素单位中框左下角的垂直坐标
   * @param {number} width - 逻辑像素单位中裁剪框的宽度
   * @param {number} height - 逻辑像素单位中裁剪框的高度
   */
  setScissor(x, y, width, height) {
    // 如果传入null，则清除裁剪设置
    if (x === null) {
      this._scissor = null; // 清除裁剪区域
    } else {
      // 如果裁剪区域不存在，则创建新的四维向量
      if (this._scissor === null) this._scissor = new Vector4();

      // 如果传入的是四维向量，则直接复制
      if (x.isVector4) {
        this._scissor.copy(x); // 复制向量
      } else {
        // 否则设置四个分量
        this._scissor.set(x, y, width, height); // 设置裁剪区域
      }

      // 应用像素比率和分辨率缩放，并向下取整
      this._scissor.multiplyScalar(this._pixelRatio * this._resolution).floor();
    }
  }

  /**
   * 此方法允许定义通道的视口。默认情况下，视口与通道的尺寸保持同步。
   * 要逆转此过程并再次使用自动调整大小，请以`null`作为单个参数调用此方法。
   *
   * @param {number | Vector4} x - 逻辑像素单位中视口原点左下角的水平坐标
   * @param {number} y - 逻辑像素单位中视口原点左下角的垂直坐标
   * @param {number} width - 逻辑像素单位中视口的宽度
   * @param {number} height - 逻辑像素单位中视口的高度
   */
  setViewport(x, y, width, height) {
    // 如果传入null，则清除视口设置
    if (x === null) {
      this._viewport = null; // 清除视口
    } else {
      // 如果视口不存在，则创建新的四维向量
      if (this._viewport === null) this._viewport = new Vector4();

      // 如果传入的是四维向量，则直接复制
      if (x.isVector4) {
        this._viewport.copy(x); // 复制向量
      } else {
        // 否则设置四个分量
        this._viewport.set(x, y, width, height); // 设置视口
      }

      // 应用像素比率和分辨率缩放，并向下取整
      this._viewport.multiplyScalar(this._pixelRatio * this._resolution).floor();
    }
  }

  /**
   * 设置通道渲染目标的像素比率并更新尺寸。
   *
   * @param {number} pixelRatio - 要设置的像素比率
   */
  setPixelRatio(pixelRatio) {
    this._pixelRatio = pixelRatio; // 设置像素比率

    this.setSize(this._width, this._height); // 更新尺寸
  }

  /**
   * 释放内部资源。当节点不再使用时应调用此方法。
   */
  dispose() {
    this.renderTarget.dispose(); // 释放渲染目标资源
  }
} // PassNode类结束

/**
 * 颜色作用域常量
 * @static
 * @type {'color'}
 * @default 'color'
 */
PassNode.COLOR = "color";

/**
 * 深度作用域常量
 * @static
 * @type {'depth'}
 * @default 'depth'
 */
PassNode.DEPTH = "depth";

// 导出PassNode类作为默认导出
export default PassNode;

/**
 * TSL函数，用于创建通道节点。
 *
 * @tsl
 * @function
 * @param {Scene} scene - 场景的引用
 * @param {Camera} camera - 相机的引用
 * @param {Object} options - 内部渲染目标的选项
 * @returns {PassNode} 返回配置好的颜色通道节点
 */
export const pass = (scene, camera, options) => nodeObject(new PassNode(PassNode.COLOR, scene, camera, options));

/**
 * TSL函数，用于创建通道纹理节点。
 *
 * @tsl
 * @function
 * @param {PassNode} pass - 通道节点
 * @param {Texture} texture - 输出纹理
 * @returns {PassTextureNode} 返回配置好的通道纹理节点
 */
export const passTexture = (pass, texture) => nodeObject(new PassTextureNode(pass, texture));

/**
 * TSL函数，用于创建深度通道节点。
 *
 * @tsl
 * @function
 * @param {Scene} scene - 场景的引用
 * @param {Camera} camera - 相机的引用
 * @param {Object} options - 内部渲染目标的选项
 * @returns {PassNode} 返回配置好的深度通道节点
 */
export const depthPass = (scene, camera, options) => nodeObject(new PassNode(PassNode.DEPTH, scene, camera, options));
