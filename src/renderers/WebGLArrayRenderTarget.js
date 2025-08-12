// 导入WebGL渲染目标基类
import { WebGLRenderTarget } from "./WebGLRenderTarget.js";
// 导入数组纹理类，用于存储多层纹理数据
import { DataArrayTexture } from "../textures/DataArrayTexture.js";

/**
 * 用于WebGL渲染器上下文的数组渲染目标
 * 支持渲染到纹理数组，可以同时渲染多个层级或切片
 * 常用于体积渲染、阴影贴图数组等高级渲染技术
 *
 * @augments WebGLRenderTarget
 */
class WebGLArrayRenderTarget extends WebGLRenderTarget {
  /**
   * 构造一个新的数组渲染目标
   *
   * @param {number} [width=1] - 渲染目标的宽度（像素）
   * @param {number} [height=1] - 渲染目标的高度（像素）
   * @param {number} [depth=1] - 渲染目标的深度（层数），表示数组中的纹理层数
   * @param {RenderTarget~Options} [options] - 配置对象，包含纹理格式、过滤方式等选项
   */
  constructor(width = 1, height = 1, depth = 1, options = {}) {
    // 调用父类构造函数，初始化基础WebGL渲染目标属性
    super(width, height, options);

    /**
     * 用于类型检测的标志
     * 可以通过此属性判断对象是否为WebGL数组渲染目标
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isWebGLArrayRenderTarget = true;

    /**
     * 渲染目标的深度（层数）
     * 表示纹理数组中包含的层数
     *
     * @type {number}
     */
    this.depth = depth;

    /**
     * 使用数组纹理类型重写默认纹理
     * 数组纹理可以存储多个2D纹理层，每层具有相同的尺寸和格式
     *
     * @type {DataArrayTexture}
     */
    this.texture = new DataArrayTexture(null, width, height, depth);
    // 应用纹理配置选项（格式、过滤方式、包装模式等）
    this._setTextureOptions(options);

    /**
     * 标记此纹理为渲染目标纹理
     * 用于渲染器内部优化和特殊处理
     *
     * @type {boolean}
     */
    this.texture.isRenderTargetTexture = true;
  }
}

// 导出WebGL数组渲染目标类
export { WebGLArrayRenderTarget };
