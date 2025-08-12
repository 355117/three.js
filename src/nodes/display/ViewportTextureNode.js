// 从纹理访问器模块导入TextureNode基类
import TextureNode from "../accessors/TextureNode.js";
// 从核心常量模块导入节点更新类型枚举
import { NodeUpdateType } from "../core/constants.js";
// 从TSL基础模块导入nodeProxy函数，用于创建节点代理
import { nodeProxy } from "../tsl/TSLBase.js";
// 从屏幕节点模块导入屏幕UV坐标
import { screenUV } from "./ScreenNode.js";

// 从数学模块导入二维向量类
import { Vector2 } from "../../math/Vector2.js";
// 从纹理模块导入帧缓冲纹理类
import { FramebufferTexture } from "../../textures/FramebufferTexture.js";
// 从常量模块导入线性mipmap线性过滤器
import { LinearMipmapLinearFilter } from "../../constants.js";

// 创建一个纯净的二维向量实例，用于存储尺寸信息
const _size = /*@__PURE__*/ new Vector2();

/**
 * 一种特殊类型的纹理节点，将当前视口的数据表示为纹理。
 * 该模块通过复制操作从当前绑定的帧缓冲区中提取数据，因此不需要额外的
 * 渲染通道来生成纹理数据（这对性能有好处）。`ViewportTextureNode`可以
 * 用作各种效果的输入，如折射或透射材质。
 *
 * @augments TextureNode
 */
class ViewportTextureNode extends TextureNode {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "ViewportTextureNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的视口纹理节点。
   *
   * @param {Node} [uvNode=screenUV] - UV节点，默认为屏幕UV坐标
   * @param {?Node} [levelNode=null] - 级别节点，用于指定mipmap级别
   * @param {?Texture} [framebufferTexture=null] - 保存视口数据的帧缓冲纹理。如果未提供，将自动创建帧缓冲纹理
   */
  constructor(uvNode = screenUV, levelNode = null, framebufferTexture = null) {
    let defaultFramebuffer = null; // 默认帧缓冲纹理变量

    // 如果没有提供帧缓冲纹理，则创建新的
    if (framebufferTexture === null) {
      defaultFramebuffer = new FramebufferTexture(); // 创建帧缓冲纹理
      defaultFramebuffer.minFilter = LinearMipmapLinearFilter; // 设置最小过滤器

      framebufferTexture = defaultFramebuffer; // 使用新创建的帧缓冲纹理
    } else {
      defaultFramebuffer = framebufferTexture; // 使用提供的帧缓冲纹理
    }

    // 调用父类构造函数
    super(framebufferTexture, uvNode, levelNode);

    /**
     * 是否生成mipmap。
     *
     * @type {boolean}
     * @default false
     */
    this.generateMipmaps = false; // 默认不生成mipmap

    /**
     * 参考帧缓冲纹理。用于存储当前渲染目标的帧缓冲纹理。
     * 如果渲染目标发生变化，会自动创建新的帧缓冲纹理。
     *
     * @type {FramebufferTexture}
     * @default null
     */
    this.defaultFramebuffer = defaultFramebuffer; // 存储默认帧缓冲纹理

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isOutputTextureNode = true; // 设置输出纹理节点标识

    /**
     * `updateBeforeType`设置为`NodeUpdateType.RENDER`，因为节点在其
     * {@link ViewportTextureNode#updateBefore}方法中每次渲染时渲染一次场景。
     *
     * @type {string}
     * @default 'frame'
     */
    this.updateBeforeType = NodeUpdateType.RENDER; // 设置更新类型为渲染时更新

    /**
     * 当前渲染器上下文的帧缓冲纹理。
     *
     * @type {WeakMap<RenderTarget, FramebufferTexture>}
     * @private
     */
    this._textures = new WeakMap(); // 创建弱映射存储纹理
  }

  // 获取帧缓冲纹理
  getFrameBufferTexture(reference = null) {
    // 获取默认帧缓冲纹理：优先使用引用节点的，否则使用自身的
    const defaultFramebuffer = this.referenceNode ? this.referenceNode.defaultFramebuffer : this.defaultFramebuffer;

    // 如果没有引用，返回默认帧缓冲纹理
    if (reference === null) {
      return defaultFramebuffer; // 返回默认帧缓冲纹理
    }

    // 如果缓存中没有该引用的纹理，则创建新的
    if (this._textures.has(reference) === false) {
      const framebufferTexture = defaultFramebuffer.clone(); // 克隆默认帧缓冲纹理

      this._textures.set(reference, framebufferTexture); // 将新纹理存储到缓存中
    }

    return this._textures.get(reference); // 返回缓存中的纹理
  }

  // 在渲染前更新节点
  updateBefore(frame) {
    const renderer = frame.renderer; // 获取渲染器
    const renderTarget = renderer.getRenderTarget(); // 获取当前渲染目标

    // 获取渲染尺寸
    if (renderTarget === null) {
      renderer.getDrawingBufferSize(_size); // 如果没有渲染目标，获取绘制缓冲区尺寸
    } else {
      _size.set(renderTarget.width, renderTarget.height); // 设置为渲染目标的尺寸
    }

    // 获取对应的帧缓冲纹理

    const framebufferTexture = this.getFrameBufferTexture(renderTarget);

    // 如果纹理尺寸与当前尺寸不匹配，则更新纹理尺寸
    if (framebufferTexture.image.width !== _size.width || framebufferTexture.image.height !== _size.height) {
      framebufferTexture.image.width = _size.width; // 更新纹理宽度
      framebufferTexture.image.height = _size.height; // 更新纹理高度
      framebufferTexture.needsUpdate = true; // 标记纹理需要更新
    }

    // 处理mipmap生成

    const currentGenerateMipmaps = framebufferTexture.generateMipmaps; // 保存当前mipmap生成设置
    framebufferTexture.generateMipmaps = this.generateMipmaps; // 设置为节点的mipmap生成设置

    renderer.copyFramebufferToTexture(framebufferTexture); // 将帧缓冲区内容复制到纹理

    framebufferTexture.generateMipmaps = currentGenerateMipmaps; // 恢复原始mipmap生成设置

    this.value = framebufferTexture; // 设置节点的值为帧缓冲纹理
  }

  // 克隆当前节点
  clone() {
    // 创建新的同类型节点实例
    const viewportTextureNode = new this.constructor(this.uvNode, this.levelNode, this.value);
    viewportTextureNode.generateMipmaps = this.generateMipmaps; // 复制mipmap生成设置

    return viewportTextureNode; // 返回克隆的节点
  }
} // ViewportTextureNode类结束

// 导出ViewportTextureNode类作为默认导出
export default ViewportTextureNode;

/**
 * TSL函数，用于创建视口纹理节点。
 *
 * @tsl
 * @function
 * @param {?Node} [uvNode=screenUV] - UV节点，默认为屏幕UV坐标
 * @param {?Node} [levelNode=null] - 级别节点，用于指定mipmap级别
 * @param {?Texture} [framebufferTexture=null] - 保存视口数据的帧缓冲纹理。如果未提供，将自动创建帧缓冲纹理
 * @returns {ViewportTextureNode} 返回配置好的视口纹理节点
 */
export const viewportTexture = /*@__PURE__*/ nodeProxy(ViewportTextureNode).setParameterLength(0, 3); // 创建具有0-3个参数的节点代理

/**
 * TSL函数，用于创建启用mipmap生成的视口纹理节点。
 *
 * @tsl
 * @function
 * @param {?Node} [uvNode=screenUV] - UV节点，默认为屏幕UV坐标
 * @param {?Node} [levelNode=null] - 级别节点，用于指定mipmap级别
 * @param {?Texture} [framebufferTexture=null] - 保存视口数据的帧缓冲纹理。如果未提供，将自动创建帧缓冲纹理
 * @returns {ViewportTextureNode} 返回配置好的启用mipmap的视口纹理节点
 */
export const viewportMipTexture = /*@__PURE__*/ nodeProxy(ViewportTextureNode, null, null, { generateMipmaps: true }).setParameterLength(0, 3); // 创建启用mipmap的节点代理
