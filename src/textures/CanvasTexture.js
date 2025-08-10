// 导入基础纹理类
import { Texture } from "./Texture.js";

/**
 * 画布纹理类
 *
 * 从HTML画布元素创建纹理，是基础纹理类的特化版本
 * 主要用于将动态生成的画布内容作为纹理使用
 *
 * 与基础纹理类的区别：
 * - 自动设置 needsUpdate 为 true，因为画布可以直接用于渲染
 * - 专门优化用于处理画布元素
 * - 支持动态内容更新
 *
 * 主要特点：
 * - 实时更新：画布内容变化时可以实时反映到纹理中
 * - 高性能：直接使用画布的图像数据，无需额外转换
 * - 灵活性：支持任何可以在画布上绘制的内容
 *
 * 使用场景：
 * - 动态生成的纹理内容（如程序化纹理）
 * - 实时渲染的2D图形作为3D纹理
 * - 用户界面元素的纹理化
 * - 数据可视化结果的纹理应用
 * - 实时视频处理结果
 *
 * 使用示例：
 * ```js
 * // 创建画布
 * const canvas = document.createElement('canvas');
 * const context = canvas.getContext('2d');
 *
 * // 在画布上绘制内容
 * context.fillStyle = 'red';
 * context.fillRect(0, 0, 256, 256);
 *
 * // 创建画布纹理
 * const texture = new THREE.CanvasTexture(canvas);
 * ```
 *
 * @augments Texture - 继承自基础纹理类，具有所有纹理的基本功能
 */
class CanvasTexture extends Texture {
  /**
   * 构造一个新的画布纹理
   *
   * 创建基于HTML画布元素的纹理，自动设置为需要更新状态
   * 所有参数都是可选的，未指定的参数将使用默认值
   *
   * @param {HTMLCanvasElement} [canvas] - HTML画布元素
   *                                      包含要用作纹理的图像数据
   * @param {number} [mapping=Texture.DEFAULT_MAPPING] - 纹理映射方式
   *                                                     定义纹理坐标如何映射到3D表面
   * @param {number} [wrapS=ClampToEdgeWrapping] - S轴（水平）包装模式
   *                                              控制纹理在水平方向的重复行为
   * @param {number} [wrapT=ClampToEdgeWrapping] - T轴（垂直）包装模式
   *                                              控制纹理在垂直方向的重复行为
   * @param {number} [magFilter=LinearFilter] - 放大过滤器
   *                                           当纹理被放大时使用的过滤算法
   * @param {number} [minFilter=LinearMipmapLinearFilter] - 缩小过滤器
   *                                                       当纹理被缩小时使用的过滤算法
   * @param {number} [format=RGBAFormat] - 纹理格式
   *                                      定义像素数据的格式（RGB、RGBA等）
   * @param {number} [type=UnsignedByteType] - 纹理数据类型
   *                                          定义像素数据的数据类型
   * @param {number} [anisotropy=Texture.DEFAULT_ANISOTROPY] - 各向异性过滤级别
   *                                                          提高倾斜角度观看时的纹理质量
   */
  constructor(canvas, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy) {
    // 调用父类构造函数，传递所有参数
    super(canvas, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy);

    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 CanvasTexture 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isCanvasTexture = true;

    /**
     * 立即设置需要更新标志
     *
     * 画布纹理在创建时就设置为需要更新，因为：
     * - 画布内容可以立即用于渲染
     * - 避免首次渲染时的延迟
     * - 确保画布内容能够正确显示
     */
    this.needsUpdate = true;
  }
}

// ===== 模块导出 =====

/**
 * 导出 CanvasTexture 类
 *
 * CanvasTexture 类专门用于处理HTML画布元素作为纹理源
 * 是实现动态纹理和实时内容更新的重要工具
 */
export { CanvasTexture };
