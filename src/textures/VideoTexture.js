// 导入线性过滤常量
import { LinearFilter } from "../constants.js";
// 导入基础纹理类
import { Texture } from "./Texture.js";

/**
 * 视频纹理类
 *
 * 专门用于处理视频元素作为纹理源的纹理类
 * 支持实时视频内容的纹理映射，可以将动态视频内容应用到3D物体表面
 *
 * 视频纹理的特点：
 * - 实时更新：视频播放时纹理内容会自动更新
 * - 高性能：使用GPU硬件加速的视频解码
 * - 同步播放：纹理更新与视频帧率同步
 * - 内存效率：直接使用视频缓冲区，避免额外拷贝
 *
 * 主要用途：
 * - 视频播放器界面：在3D场景中播放视频
 * - 动态广告牌：显示动态视频内容
 * - 监控系统：实时视频流显示
 * - 教育应用：交互式视频内容
 * - 游戏场景：动态背景或特效
 * - 虚拟现实：沉浸式视频体验
 *
 * 技术特性：
 * - 自动帧同步：使用requestVideoFrameCallback API
 * - 回退机制：不支持新API时使用传统更新方式
 * - 内存优化：禁用Mipmap生成以节省内存
 * - 颜色空间：WebGPU渲染器需要设置为SRGBColorSpace
 *
 * 使用示例：
 * ```js
 * // 假设已创建了id为"video"的HTML视频元素
 * const video = document.getElementById( 'video' );
 * const texture = new THREE.VideoTexture( video );
 *
 * // 设置视频纹理属性
 * texture.minFilter = THREE.LinearFilter;
 * texture.magFilter = THREE.LinearFilter;
 * texture.format = THREE.RGBAFormat;
 *
 * // 应用到材质
 * const material = new THREE.MeshBasicMaterial({ map: texture });
 * ```
 *
 * 重要注意事项：
 * - WebGPU渲染器：必须设置colorSpace为SRGBColorSpace
 * - 尺寸限制：首次使用后无法更改尺寸、格式和类型
 * - 性能考虑：大分辨率视频可能影响渲染性能
 * - 浏览器兼容性：某些功能依赖现代浏览器API
 *
 * @augments Texture - 继承自基础纹理类，具有所有纹理的基本功能
 */
class VideoTexture extends Texture {
  /**
   * 构造一个新的视频纹理
   *
   * 创建基于HTML视频元素的纹理，自动处理视频帧的更新
   * 默认使用线性过滤以获得平滑的视频播放效果
   *
   * @param {HTMLVideoElement} video - 用作纹理数据源的视频元素
   *                                  必须是有效的HTML视频元素
   *                                  视频应该已经加载并准备播放
   * @param {number} [mapping=Texture.DEFAULT_MAPPING] - 纹理映射方式
   *                                                     通常使用默认的UV映射
   * @param {number} [wrapS=ClampToEdgeWrapping] - S轴（水平）包装模式
   *                                              视频纹理通常使用边缘夹紧
   * @param {number} [wrapT=ClampToEdgeWrapping] - T轴（垂直）包装模式
   *                                              视频纹理通常使用边缘夹紧
   * @param {number} [magFilter=LinearFilter] - 放大过滤器
   *                                           默认使用线性过滤获得平滑效果
   * @param {number} [minFilter=LinearFilter] - 缩小过滤器
   *                                           默认使用线性过滤获得平滑效果
   * @param {number} [format=RGBAFormat] - 纹理格式
   *                                      视频通常使用RGBA格式
   * @param {number} [type=UnsignedByteType] - 纹理数据类型
   *                                          视频数据通常是无符号字节类型
   * @param {number} [anisotropy=Texture.DEFAULT_ANISOTROPY] - 各向异性过滤级别
   *                                                          可以提高倾斜观看时的质量
   */
  constructor(video, mapping, wrapS, wrapT, magFilter = LinearFilter, minFilter = LinearFilter, format, type, anisotropy) {
    // 调用父类构造函数，传入视频元素作为图像源
    super(video, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy);

    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 VideoTexture 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isVideoTexture = true;

    /**
     * 是否生成多级渐远纹理（Mipmaps）
     *
     * 对于视频纹理，默认设置为 false
     * 因为视频内容会频繁变化，生成Mipmaps会消耗大量资源且效果有限
     *
     * 禁用Mipmaps的原因：
     * - 视频内容实时变化，Mipmaps需要频繁重新生成
     * - 生成Mipmaps会显著增加GPU负载
     * - 视频播放的流畅性比细节质量更重要
     * - 内存使用优化，避免额外的Mipmap存储
     *
     * @type {boolean}
     * @default false
     */
    this.generateMipmaps = false;

    /**
     * 视频帧请求回调标识符
     *
     * 存储requestVideoFrameCallback的回调ID，用于管理视频帧同步
     * 正整数表示活跃的回调，0表示没有计划的回调
     *
     * 回调机制的作用：
     * - 与视频帧率精确同步
     * - 避免不必要的纹理更新
     * - 提高性能和电池续航
     * - 确保视频播放的流畅性
     *
     * @private
     * @type {number}
     */
    this._requestVideoFrameCallbackId = 0;

    // 保存当前实例的引用，用于回调函数中访问
    const scope = this;

    /**
     * 视频更新回调函数
     *
     * 当新的视频帧可用时被调用，负责标记纹理需要更新
     * 并安排下一次回调以保持连续的更新循环
     */
    function updateVideo() {
      // 标记纹理需要更新，触发GPU上传新的视频帧
      scope.needsUpdate = true;
      // 安排下一次视频帧回调，保持更新循环
      scope._requestVideoFrameCallbackId = video.requestVideoFrameCallback(updateVideo);
    }

    // 检查浏览器是否支持requestVideoFrameCallback API
    if ("requestVideoFrameCallback" in video) {
      // 启动视频帧回调循环，实现精确的帧同步
      this._requestVideoFrameCallbackId = video.requestVideoFrameCallback(updateVideo);
    }
  }

  // ===== 视频纹理操作方法 =====

  /**
   * 克隆视频纹理
   *
   * 创建当前视频纹理的副本，包括所有属性和设置
   * 新的纹理实例将使用相同的视频元素作为数据源
   *
   * 克隆的特点：
   * - 共享视频数据源：多个纹理实例使用同一个视频元素
   * - 独立属性：每个纹理可以有不同的变换、过滤等设置
   * - 性能优化：避免重复的视频解码和内存使用
   *
   * 使用场景：
   * - 多材质使用同一视频：不同的过滤或变换设置
   * - 性能优化：共享视频数据减少内存占用
   * - 特效处理：对同一视频应用不同的后处理效果
   *
   * @return {VideoTexture} 新的视频纹理实例
   */
  clone() {
    return new this.constructor(this.image).copy(this);
  }

  /**
   * 更新视频纹理
   *
   * 此方法由渲染器自动调用，在新视频帧可用时将needsUpdate设置为true
   * 仅在浏览器不支持requestVideoFrameCallback时相关
   *
   * 更新机制：
   * - 现代浏览器：使用requestVideoFrameCallback实现精确同步
   * - 传统浏览器：使用此方法检查视频状态并手动更新
   *
   * 检查条件：
   * - 浏览器不支持requestVideoFrameCallback
   * - 视频已准备好当前帧数据（readyState >= HAVE_CURRENT_DATA）
   *
   * 性能考虑：
   * - 避免不必要的纹理更新
   * - 只在视频状态改变时触发更新
   * - 与视频播放状态保持同步
   */
  update() {
    const video = this.image;
    const hasVideoFrameCallback = "requestVideoFrameCallback" in video;

    // 仅在不支持新API且视频有可用帧时更新
    if (hasVideoFrameCallback === false && video.readyState >= video.HAVE_CURRENT_DATA) {
      this.needsUpdate = true;
    }
  }

  /**
   * 销毁视频纹理
   *
   * 清理视频纹理使用的资源，包括取消视频帧回调
   * 重写父类的dispose方法以处理视频特有的清理工作
   *
   * 清理工作包括：
   * - 取消活跃的requestVideoFrameCallback
   * - 调用父类的dispose方法清理基础纹理资源
   * - 释放GPU内存和相关引用
   *
   * 调用时机：
   * - 纹理不再需要时
   * - 场景清理时
   * - 内存优化时
   * - 应用程序关闭时
   *
   * 重要性：
   * - 防止内存泄漏
   * - 停止不必要的回调执行
   * - 释放GPU资源
   * - 提高应用程序性能
   *
   * @override
   */
  dispose() {
    // 如果有活跃的视频帧回调，取消它
    if (this._requestVideoFrameCallbackId !== 0) {
      this.source.data.cancelVideoFrameCallback(this._requestVideoFrameCallbackId);
    }

    // 调用父类的dispose方法，清理基础纹理资源
    super.dispose();
  }
}

// ===== 模块导出 =====

/**
 * 导出 VideoTexture 类
 *
 * VideoTexture 类是处理视频内容作为纹理的专用类
 * 提供了高效的视频纹理功能，支持实时视频内容的3D渲染
 */
export { VideoTexture };
