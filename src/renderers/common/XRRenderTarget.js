// 导入渲染目标基类
import { RenderTarget } from "../../core/RenderTarget.js";

/**
 * XR渲染目标类
 *
 * 这是一种特殊类型的渲染目标，专门用于WebXR Device API的渲染。
 * XR渲染目标处理虚拟现实和增强现实应用中的特殊渲染需求，
 * 包括立体渲染、多视图渲染和WebXR Layers API的集成。
 *
 * @private
 * @augments RenderTarget
 */
class XRRenderTarget extends RenderTarget {
  /**
   * 构造一个新的XR渲染目标
   *
   * @param {number} [width=1] - 渲染目标的宽度
   * @param {number} [height=1] - 渲染目标的高度
   * @param {Object} [options={}] - 配置选项
   */
  constructor(width = 1, height = 1, options = {}) {
    // 调用父类构造函数
    super(width, height, options);

    /**
     * 用于类型测试的标志
     * 标识此对象为XR渲染目标类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isXRRenderTarget = true;

    /**
     * 渲染目标的附件是否由外部纹理定义
     * 当使用WebXR Layers API时，此标志设置为true。
     * 外部纹理由XR系统管理，而不是由Three.js创建。
     *
     * @private
     * @type {boolean}
     * @default false
     */
    this._hasExternalTextures = false;

    /**
     * 是否应该为此XR渲染目标自动分配深度缓冲区
     *
     * 分配深度缓冲区是XR渲染目标的默认行为。但是，当使用WebXR Layers API时，
     * 如果投影层的`ignoreDepthValues`属性为`false`，则必须将此标志设置为`false`。
     *
     * 参考：{@link https://www.w3.org/TR/webxrlayers-1/#dom-xrprojectionlayer-ignoredepthvalues}
     *
     * @private
     * @type {boolean}
     * @default true
     */
    this._autoAllocateDepthBuffer = true;

    /**
     * 此渲染目标是否与XRWebGLLayer关联
     *
     * XRWebGLLayer指向一个不透明的帧缓冲区。基本上，这意味着你无法访问
     * 其绑定的颜色、模板和深度缓冲区。我们需要以不同的方式处理此帧缓冲区，
     * 因为其纹理总是绑定的。
     *
     * @private
     * @type {boolean}
     * @default false
     */
    this._isOpaqueFramebuffer = false;
  }

  /**
   * 复制另一个XR渲染目标的属性
   * 将源XR渲染目标的所有属性复制到当前实例
   *
   * @param {XRRenderTarget} source - 要复制的源XR渲染目标
   * @return {XRRenderTarget} 返回当前实例，支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 复制XR特有的属性
    this._hasExternalTextures = source._hasExternalTextures;
    this._autoAllocateDepthBuffer = source._autoAllocateDepthBuffer;
    this._isOpaqueFramebuffer = source._isOpaqueFramebuffer;

    // 返回当前实例，支持链式调用
    return this;
  }
}

// 导出XR渲染目标类
export { XRRenderTarget };
