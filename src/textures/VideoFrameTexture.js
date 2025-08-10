// 导入视频纹理基类
import { VideoTexture } from "./VideoTexture.js";

/**
 * 视频帧纹理类
 *
 * 此类可以作为定义视频数据的替代方式使用
 * 与使用HTMLVideoElement实例的VideoTexture不同，VideoFrameTexture期望每一帧都通过setFrame方法手动定义
 *
 * 视频帧纹理的特点：
 * - 手动帧控制：每一帧都需要手动设置，提供精确控制
 * - WebCodecs集成：专为WebCodecs API解码的视频帧设计
 * - 高性能：直接使用VideoFrame对象，避免额外的数据转换
 * - 灵活性：支持自定义的视频处理和帧率控制
 *
 * 主要用途：
 * - WebCodecs API：处理WebCodecs解码的视频帧
 * - 自定义视频处理：实现特殊的视频效果或滤镜
 * - 帧精确控制：需要精确控制每一帧显示的应用
 * - 视频分析：逐帧分析和处理视频内容
 * - 实时视频流：处理来自网络或传感器的实时视频数据
 * - 视频编辑：视频编辑软件中的帧预览
 *
 * 技术优势：
 * - 零拷贝：直接使用VideoFrame，无需额外的内存拷贝
 * - 硬件加速：利用GPU硬件解码的VideoFrame
 * - 精确时序：完全控制帧的显示时机
 * - 内存效率：按需更新，避免不必要的资源消耗
 *
 * WebCodecs集成示例：
 * ```js
 * // 创建视频帧纹理
 * const texture = new THREE.VideoFrameTexture();
 *
 * // 使用WebCodecs解码器
 * const decoder = new VideoDecoder({
 *   output: (frame) => {
 *     // 将解码的帧设置到纹理
 *     texture.setFrame(frame);
 *     // 渲染场景
 *     renderer.render(scene, camera);
 *     // 释放帧资源
 *     frame.close();
 *   },
 *   error: (e) => console.error(e)
 * });
 * ```
 *
 * 与VideoTexture的区别：
 * - VideoTexture：自动从HTMLVideoElement获取帧
 * - VideoFrameTexture：手动设置每一帧，更精确的控制
 * - VideoTexture：适合标准视频播放
 * - VideoFrameTexture：适合自定义视频处理和WebCodecs
 *
 * 性能考虑：
 * - 帧管理：需要手动管理VideoFrame的生命周期
 * - 内存使用：及时释放不需要的VideoFrame
 * - 更新频率：根据需要控制纹理更新频率
 * - GPU同步：确保GPU处理完成后再释放帧
 *
 * @augments VideoTexture - 继承自视频纹理类，具有视频纹理的基本功能
 */
class VideoFrameTexture extends VideoTexture {
  /**
   * 构造一个新的视频帧纹理
   *
   * 创建一个空的视频帧纹理，不绑定特定的视频源
   * 视频帧需要通过setFrame方法手动设置
   *
   * @param {number} [mapping=Texture.DEFAULT_MAPPING] - 纹理映射方式
   *                                                     通常使用默认的UV映射
   * @param {number} [wrapS=ClampToEdgeWrapping] - S轴（水平）包装模式
   *                                              视频帧纹理通常使用边缘夹紧
   * @param {number} [wrapT=ClampToEdgeWrapping] - T轴（垂直）包装模式
   *                                              视频帧纹理通常使用边缘夹紧
   * @param {number} [magFilter=LinearFilter] - 放大过滤器
   *                                           默认使用线性过滤获得平滑效果
   * @param {number} [minFilter=LinearFilter] - 缩小过滤器
   *                                           默认使用线性过滤获得平滑效果
   * @param {number} [format=RGBAFormat] - 纹理格式
   *                                      视频帧通常使用RGBA格式
   * @param {number} [type=UnsignedByteType] - 纹理数据类型
   *                                          视频帧数据通常是无符号字节类型
   * @param {number} [anisotropy=Texture.DEFAULT_ANISOTROPY] - 各向异性过滤级别
   *                                                          可以提高倾斜观看时的质量
   */
  constructor(mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy) {
    // 调用父类构造函数，传入空对象作为初始图像源
    super({}, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy);

    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 VideoFrameTexture 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isVideoFrameTexture = true;
  }

  // ===== 视频帧纹理操作方法 =====

  /**
   * 更新纹理（空实现）
   *
   * 此方法被重写为空实现，因为这种类型的纹理通过setFrame()方法更新
   * 不需要自动的更新机制，所有更新都是手动控制的
   *
   * 空实现的原因：
   * - 手动控制：所有帧更新都通过setFrame方法手动触发
   * - 避免冲突：防止自动更新与手动更新冲突
   * - 性能优化：避免不必要的自动检查和更新
   * - 精确控制：确保只在需要时更新纹理
   */
  update() {}

  /**
   * 克隆视频帧纹理
   *
   * 创建当前视频帧纹理的副本，恢复基础Texture的克隆行为
   * 新的纹理实例将具有相同的属性设置，但不会共享VideoFrame数据
   *
   * 克隆的特点：
   * - 独立实例：每个克隆都是独立的纹理实例
   * - 属性复制：复制所有纹理属性和设置
   * - 帧独立：不共享VideoFrame数据，需要单独设置
   *
   * 使用场景：
   * - 多材质使用：为不同材质创建独立的纹理实例
   * - 特效处理：对同一帧应用不同的处理效果
   * - 备份和恢复：保存纹理状态的副本
   *
   * @return {VideoFrameTexture} 新的视频帧纹理实例
   */
  clone() {
    // 恢复基础Texture的克隆行为，不传递图像参数
    return new this.constructor().copy(this);
  }

  /**
   * 设置当前视频帧
   *
   * 设置视频的当前帧，这将自动更新纹理以便数据可以用于渲染
   * 这是VideoFrameTexture的核心方法，负责更新纹理内容
   *
   * 帧设置的过程：
   * 1. 将VideoFrame对象设置为纹理的图像源
   * 2. 标记纹理需要更新，触发GPU上传
   * 3. 下次渲染时使用新的帧数据
   *
   * VideoFrame管理：
   * - 生命周期：调用者负责管理VideoFrame的生命周期
   * - 内存释放：使用完毕后应调用frame.close()释放内存
   * - 时序控制：可以控制帧的显示时机和顺序
   *
   * 性能优化：
   * - 零拷贝：直接使用VideoFrame，无需额外拷贝
   * - 按需更新：只在设置新帧时更新纹理
   * - GPU优化：利用硬件加速的VideoFrame
   *
   * 使用注意事项：
   * - 及时释放：使用完VideoFrame后及时调用close()
   * - 线程安全：确保在正确的线程中调用
   * - 错误处理：检查VideoFrame的有效性
   *
   * @param {VideoFrame} frame - 视频帧对象
   *                            必须是有效的VideoFrame实例
   *                            通常来自WebCodecs解码器或其他视频源
   */
  setFrame(frame) {
    // 设置VideoFrame作为纹理的图像源
    this.image = frame;
    // 标记纹理需要更新，触发GPU上传新的帧数据
    this.needsUpdate = true;
  }
}

// ===== 模块导出 =====

/**
 * 导出 VideoFrameTexture 类
 *
 * VideoFrameTexture 类是处理WebCodecs VideoFrame的专用纹理类
 * 提供了精确的帧控制和高性能的视频帧渲染功能
 */
export { VideoFrameTexture };
