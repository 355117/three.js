// 导入基础渲染目标类
import { RenderTarget } from "./RenderTarget.js";
// 导入3D数据纹理类
import { Data3DTexture } from "../textures/Data3DTexture.js";

/**
 * 表示一个3D渲染目标。
 *
 * 3D渲染目标是一种特殊的渲染目标，它具有深度维度，
 * 可以用于体积渲染、3D纹理生成等高级渲染技术。
 * 与普通的2D渲染目标不同，3D渲染目标使用Data3DTexture作为其纹理类型。
 *
 * @augments RenderTarget
 */
class RenderTarget3D extends RenderTarget {
  /**
   * 构造一个新的3D渲染目标
   *
   * @param {number} [width=1] - 渲染目标的宽度（像素）
   * @param {number} [height=1] - 渲染目标的高度（像素）
   * @param {number} [depth=1] - 渲染目标的深度（层数）
   * @param {RenderTarget~Options} [options] - 配置选项对象
   */
  constructor(width = 1, height = 1, depth = 1, options = {}) {
    // 调用父类构造函数，传入宽度、高度和选项
    super(width, height, options);

    /**
     * 此标志可用于类型测试，标识这是一个3D渲染目标实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isRenderTarget3D = true;

    // 设置3D渲染目标的深度属性
    this.depth = depth;

    /**
     * 使用不同的纹理类型重写父类的texture属性
     * 3D渲染目标使用Data3DTexture而不是普通的Texture
     *
     * @type {Data3DTexture}
     */
    this.texture = new Data3DTexture(null, width, height, depth);
    // 应用传入的纹理配置选项
    this._setTextureOptions(options);

    // 标记此纹理为渲染目标纹理，用于渲染器的特殊处理
    this.texture.isRenderTargetTexture = true;
  }
}

// 导出RenderTarget3D类
export { RenderTarget3D };
