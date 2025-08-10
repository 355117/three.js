// 导入基础纹理类
import { Texture } from "./Texture.js";
// 导入最近邻过滤常量
import { NearestFilter } from "../constants.js";

/**
 * 帧缓冲纹理类
 *
 * 此类只能与渲染器的 copyFramebufferToTexture() 方法结合使用
 * 它提取当前绑定的帧缓冲区内容，并将其作为纹理提供给后续使用
 *
 * 帧缓冲纹理的特点：
 * - 实时捕获：从当前渲染的帧缓冲区捕获内容
 * - 像素精确：保持原始像素数据的精确性
 * - 高性能：直接在GPU内存中操作，避免CPU-GPU数据传输
 * - 灵活区域：可以捕获帧缓冲区的任意矩形区域
 *
 * 主要用途：
 * - 屏幕截图：捕获渲染结果的一部分或全部
 * - 后处理效果：将渲染结果作为下一步处理的输入
 * - 反射效果：捕获场景用于反射贴图
 * - 镜像效果：实现镜子或水面反射
 * - 画中画效果：在场景中显示另一个视角的渲染结果
 * - 安全摄像头效果：模拟监控摄像头的画面
 *
 * 工作流程：
 * 1. 创建FramebufferTexture实例
 * 2. 正常渲染场景到帧缓冲区
 * 3. 调用renderer.copyFramebufferToTexture()复制数据
 * 4. 将纹理用于其他材质或后处理
 *
 * 性能考虑：
 * - GPU操作：复制操作在GPU内部进行，速度快
 * - 内存使用：需要额外的GPU内存存储纹理数据
 * - 同步问题：复制操作可能需要GPU同步
 * - 频率控制：高频复制可能影响性能
 *
 * 使用示例：
 * ```js
 * // 考虑设备像素比例
 * const pixelRatio = window.devicePixelRatio;
 * const textureSize = 128 * pixelRatio;
 *
 * // 创建帧缓冲纹理
 * const frameTexture = new FramebufferTexture( textureSize, textureSize );
 *
 * // 计算复制区域的起始位置（屏幕中心）
 * const vector = new Vector2();
 * vector.x = ( window.innerWidth * pixelRatio / 2 ) - ( textureSize / 2 );
 * vector.y = ( window.innerHeight * pixelRatio / 2 ) - ( textureSize / 2 );
 *
 * // 渲染场景
 * renderer.render( scene, camera );
 *
 * // 将渲染帧的一部分复制到帧缓冲纹理中
 * renderer.copyFramebufferToTexture( frameTexture, vector );
 *
 * // 现在可以将frameTexture用作其他材质的贴图
 * material.map = frameTexture;
 * ```
 *
 * 技术细节：
 * - 坐标系统：使用屏幕坐标系，左下角为原点
 * - 像素格式：通常为RGBA格式
 * - 数据类型：默认为无符号字节类型
 * - 过滤方式：默认使用最近邻过滤保持像素精确性
 *
 * @augments Texture - 继承自基础纹理类，具有所有纹理的基本功能
 */
class FramebufferTexture extends Texture {
  /**
   * 构造一个新的帧缓冲纹理
   *
   * 创建指定尺寸的帧缓冲纹理，用于接收从帧缓冲区复制的像素数据
   * 纹理尺寸应该与要复制的区域尺寸匹配
   *
   * @param {number} [width] - 纹理宽度（像素）
   *                          应该与要复制的帧缓冲区域宽度一致
   *                          考虑设备像素比例以获得正确的分辨率
   * @param {number} [height] - 纹理高度（像素）
   *                           应该与要复制的帧缓冲区域高度一致
   *                           考虑设备像素比例以获得正确的分辨率
   */
  constructor(width, height) {
    // 调用父类构造函数，传入尺寸信息作为图像对象
    super({ width, height });

    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 FramebufferTexture 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * 类型检测的用途：
     * - 渲染器识别特殊的纹理类型
     * - 优化复制操作的执行路径
     * - 调试和错误处理
     * - 性能分析和统计
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isFramebufferTexture = true;

    /**
     * 放大过滤器
     *
     * 当纹理被放大时使用的过滤算法
     * 对于帧缓冲纹理，默认使用最近邻过滤以禁用过滤
     *
     * 使用最近邻过滤的原因：
     * - 保持像素精确性：避免插值导致的模糊
     * - 性能优化：最近邻过滤计算量最小
     * - 数据完整性：确保复制的像素数据不被修改
     * - 调试友好：便于检查具体的像素值
     *
     * 如果需要平滑效果，可以手动设置为LinearFilter
     *
     * @type {(NearestFilter|NearestMipmapNearestFilter|NearestMipmapLinearFilter|LinearFilter|LinearMipmapNearestFilter|LinearMipmapLinearFilter)}
     * @default NearestFilter
     */
    this.magFilter = NearestFilter;

    /**
     * 缩小过滤器
     *
     * 当纹理被缩小时使用的过滤算法
     * 对于帧缓冲纹理，默认使用最近邻过滤以禁用过滤
     *
     * 使用最近邻过滤的原因：
     * - 保持像素精确性：避免插值导致的模糊
     * - 性能优化：最近邻过滤计算量最小
     * - 数据完整性：确保复制的像素数据不被修改
     * - 一致性：与放大过滤器保持一致的行为
     *
     * 如果需要平滑效果，可以手动设置为LinearFilter
     *
     * @type {(NearestFilter|NearestMipmapNearestFilter|NearestMipmapLinearFilter|LinearFilter|LinearMipmapNearestFilter|LinearMipmapLinearFilter)}
     * @default NearestFilter
     */
    this.minFilter = NearestFilter;

    /**
     * 是否生成多级渐远纹理（Mipmaps）
     *
     * 对于帧缓冲纹理，默认设置为 false
     * 因为帧缓冲纹理通常用于精确的像素操作
     *
     * 不生成Mipmaps的原因：
     * - 像素精确性：Mipmaps会改变原始像素数据
     * - 性能考虑：避免额外的GPU计算开销
     * - 实时性：帧缓冲纹理通常需要实时更新
     * - 用途特殊：主要用于后处理而非传统纹理映射
     *
     * 如果确实需要Mipmaps，可以手动设置为true
     *
     * @type {boolean}
     * @default false
     */
    this.generateMipmaps = false;

    /**
     * 立即标记需要更新
     *
     * 帧缓冲纹理在创建时就标记为需要更新
     * 这确保了纹理能够正确地接收从帧缓冲区复制的数据
     *
     * 更新标记的作用：
     * - 通知渲染器纹理已准备好接收数据
     * - 触发必要的GPU状态设置
     * - 确保纹理绑定和格式正确
     * - 为后续的复制操作做准备
     */
    this.needsUpdate = true;
  }
}

// ===== 模块导出 =====

/**
 * 导出 FramebufferTexture 类
 *
 * FramebufferTexture 类是处理帧缓冲区内容捕获的专用纹理类
 * 主要用于实现屏幕截图、后处理效果和实时反射等功能
 */
export { FramebufferTexture };
