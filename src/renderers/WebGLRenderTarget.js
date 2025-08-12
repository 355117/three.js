// 导入渲染目标基类
import { RenderTarget } from "../core/RenderTarget.js";

/**
 * 用于WebGL渲染器上下文的渲染目标
 * 提供了WebGL特定的渲染目标功能，用于离屏渲染和后处理效果
 *
 * @augments RenderTarget
 */
class WebGLRenderTarget extends RenderTarget {
  /**
   * 构造一个新的WebGL渲染目标
   *
   * @param {number} [width=1] - 渲染目标的宽度（像素）
   * @param {number} [height=1] - 渲染目标的高度（像素）
   * @param {RenderTarget~Options} [options] - 配置对象，包含纹理格式、过滤方式等选项
   */
  constructor(width = 1, height = 1, options = {}) {
    // 调用父类构造函数，初始化基础渲染目标属性
    super(width, height, options);

    /**
     * 用于类型检测的标志
     * 可以通过此属性判断对象是否为WebGL渲染目标
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isWebGLRenderTarget = true;
  }
}

// 导出WebGL渲染目标类
export { WebGLRenderTarget };
