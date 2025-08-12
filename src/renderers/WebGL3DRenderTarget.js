// 导入WebGL渲染目标基类
import { WebGLRenderTarget } from "./WebGLRenderTarget.js";
// 导入3D纹理类，用于存储三维体积数据
import { Data3DTexture } from "../textures/Data3DTexture.js";

/**
 * 用于WebGL渲染器上下文的3D渲染目标
 * 支持渲染到3D纹理，用于体积渲染、3D噪声生成等需要三维数据的应用
 * 与数组纹理不同，3D纹理在三个维度上都支持插值和采样
 *
 * @augments WebGLRenderTarget
 */
class WebGL3DRenderTarget extends WebGLRenderTarget {
  /**
   * 构造一个新的3D渲染目标
   *
   * @param {number} [width=1] - 渲染目标的宽度（像素）
   * @param {number} [height=1] - 渲染目标的高度（像素）
   * @param {number} [depth=1] - 渲染目标的深度（像素），表示3D纹理的Z轴尺寸
   * @param {RenderTarget~Options} [options] - 配置对象，包含纹理格式、过滤方式等选项
   */
  constructor(width = 1, height = 1, depth = 1, options = {}) {
    // 调用父类构造函数，初始化基础WebGL渲染目标属性
    super(width, height, options);

    /**
     * 用于类型检测的标志
     * 可以通过此属性判断对象是否为WebGL 3D渲染目标
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isWebGL3DRenderTarget = true;

    /**
     * 渲染目标的深度（Z轴尺寸）
     * 表示3D纹理在深度方向上的像素数量
     *
     * @type {number}
     */
    this.depth = depth;

    /**
     * 使用3D纹理类型重写默认纹理
     * 3D纹理是真正的三维纹理，支持在X、Y、Z三个维度上的插值采样
     * 适用于体积渲染、3D噪声、密度场等应用
     *
     * @type {Data3DTexture}
     */
    this.texture = new Data3DTexture(null, width, height, depth);
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

// 导出WebGL 3D渲染目标类
export { WebGL3DRenderTarget };
