// 导入四维向量类，用于表示视口和裁剪矩形
import { Vector4 } from "../../math/Vector4.js";
// 导入哈希数组函数，用于生成缓存键
import { hashArray } from "../../nodes/core/NodeUtils.js";

// 全局ID计数器，用于为每个渲染上下文分配唯一ID
let _id = 0;

/**
 * 渲染上下文类
 * 任何渲染或计算命令都在特定的上下文中执行，该上下文定义了
 * 渲染器及其后端的状态。此类上下文数据的典型示例是当前清除值
 * 或来自活动帧缓冲区的数据。此模块用于将这些上下文表示为对象。
 *
 * @private
 */
class RenderContext {
  /**
   * 构造一个新的渲染上下文
   */
  constructor() {
    /**
     * 上下文的唯一标识符
     *
     * @type {number}
     */
    this.id = _id++; // 分配并递增全局ID

    /**
     * 当前活动帧缓冲区是否有颜色附件
     *
     * @type {boolean}
     * @default true
     */
    this.color = true; // 默认启用颜色缓冲区

    /**
     * 是否应该清除颜色附件
     *
     * @type {boolean}
     * @default true
     */
    this.clearColor = true; // 默认清除颜色缓冲区

    /**
     * 清除颜色值
     * RGBA格式的颜色值
     *
     * @type {Object}
     * @default {r: 0, g: 0, b: 0, a: 1}
     */
    this.clearColorValue = { r: 0, g: 0, b: 0, a: 1 }; // 默认清除为黑色

    /**
     * 当前活动帧缓冲区是否有深度附件
     *
     * @type {boolean}
     * @default true
     */
    this.depth = true; // 默认启用深度缓冲区

    /**
     * 是否应该清除深度附件
     *
     * @type {boolean}
     * @default true
     */
    this.clearDepth = true; // 默认清除深度缓冲区

    /**
     * 清除深度值
     *
     * @type {number}
     * @default 1
     */
    this.clearDepthValue = 1; // 默认深度清除值为1（最远）

    /**
     * 当前活动帧缓冲区是否有模板附件
     *
     * @type {boolean}
     * @default false
     */
    this.stencil = false; // 默认禁用模板缓冲区

    /**
     * 是否应该清除模板附件
     *
     * @type {boolean}
     * @default true
     */
    this.clearStencil = true; // 默认清除模板缓冲区

    /**
     * 清除模板值
     *
     * @type {number}
     * @default 1
     */
    this.clearStencilValue = 1; // 默认模板清除值为1

    /**
     * 是否使用自定义视口
     * 默认情况下，视口包围整个帧缓冲区。如果手动定义了较小的视口，
     * 渲染器会将此属性设置为 `true`。
     *
     * @type {boolean}
     * @default false
     */
    this.viewport = false; // 默认使用全帧缓冲区视口

    /**
     * 视口值
     * 此值以物理像素为单位，意味着它包含了渲染器的像素比。
     * 渲染目标或渲染器的视口属性以逻辑像素为单位。
     *
     * @type {Vector4}
     */
    this.viewportValue = new Vector4(); // 初始化视口矩形

    /**
     * 是否启用裁剪测试
     * 当裁剪测试处于活动状态且裁剪矩形小于帧缓冲区尺寸时，
     * 渲染器会将此属性设置为 `true`。
     *
     * @type {boolean}
     * @default false
     */
    this.scissor = false; // 默认禁用裁剪测试

    /**
     * 裁剪矩形
     * 定义裁剪测试的矩形区域
     *
     * @type {Vector4}
     */
    this.scissorValue = new Vector4(); // 初始化裁剪矩形

    /**
     * 活动的渲染目标
     *
     * @type {?RenderTarget}
     * @default null
     */
    this.renderTarget = null; // 默认无渲染目标（渲染到屏幕）

    /**
     * 活动渲染目标的纹理数组
     * 当没有设置渲染目标时为 `null`
     *
     * @type {?Array<Texture>}
     * @default null
     */
    this.textures = null; // 渲染目标纹理数组

    /**
     * 活动渲染目标的深度纹理
     * 当没有设置渲染目标时为 `null`
     *
     * @type {?DepthTexture}
     * @default null
     */
    this.depthTexture = null; // 深度纹理引用

    /**
     * 活动的立方体贴图面
     * 用于立方体贴图渲染时指定当前渲染的面
     *
     * @type {number}
     * @default 0
     */
    this.activeCubeFace = 0; // 默认为第一个面（正X面）

    /**
     * 活动的mipmap级别
     * 指定当前渲染到的mipmap层级
     *
     * @type {number}
     * @default 0
     */
    this.activeMipmapLevel = 0; // 默认为最高分辨率级别

    /**
     * MSAA采样数量
     * 当不使用MSAA时，此值始终为 `1`
     *
     * @type {number}
     * @default 1
     */
    this.sampleCount = 1; // 默认无多重采样

    /**
     * 活动渲染目标的宽度（物理像素）
     * 包含像素比的实际像素宽度
     *
     * @type {number}
     * @default 0
     */
    this.width = 0; // 初始化宽度为0

    /**
     * 活动渲染目标的高度（物理像素）
     * 包含像素比的实际像素高度
     *
     * @type {number}
     * @default 0
     */
    this.height = 0; // 初始化高度为0

    /**
     * 遮挡查询计数
     * 用于跟踪当前活动的遮挡查询数量
     *
     * @type {number}
     * @default 0
     */
    this.occlusionQueryCount = 0; // 初始化遮挡查询计数

    /**
     * 当前裁剪上下文
     * 用于管理裁剪平面和裁剪状态
     *
     * @type {?ClippingContext}
     * @default null
     */
    this.clippingContext = null; // 默认无裁剪上下文

    /**
     * 类型标识符，用于类型检测
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isRenderContext = true; // 设置类型标识
  }

  /**
   * 获取此渲染上下文的缓存键
   * 用于标识渲染状态，以便进行缓存和优化
   *
   * @return {number} 缓存键值
   */
  getCacheKey() {
    // 调用全局函数计算缓存键
    return getCacheKey(this);
  }
}

/**
 * 计算给定渲染上下文的缓存键
 * 此键应该标识渲染目标状态，以便在相应的后端中
 * 配置正确的附件。
 *
 * @param {RenderContext} renderContext - 渲染上下文实例
 * @return {number} 计算得出的缓存键
 */
export function getCacheKey(renderContext) {
  // 从渲染上下文中提取纹理数组和活动立方体面
  const { textures, activeCubeFace } = renderContext;

  // 初始化值数组，包含活动立方体面
  const values = [activeCubeFace];

  // 遍历所有纹理，将纹理ID添加到值数组中
  for (const texture of textures) {
    values.push(texture.id); // 添加纹理的唯一标识符
  }

  // 使用哈希函数生成最终的缓存键
  return hashArray(values);
}

// 导出RenderContext类作为默认导出
export default RenderContext;
