// 导入基础纹理类
import { Texture } from "./Texture.js";

/**
 * 外部纹理类
 *
 * 表示在渲染器上下文之外创建的纹理，用于处理外部纹理资源
 * 这种纹理通常来自系统级别的纹理源，不是由Three.js直接创建的
 *
 * 外部纹理的特点：
 * - 系统级别：由操作系统或硬件直接提供
 * - 受保护内容：可以处理受版权保护的媒体内容
 * - 硬件加速：通常具有硬件级别的优化
 * - 实时数据：支持实时变化的数据源
 *
 * 典型的外部纹理源：
 * - 受保护的媒体流（DRM保护的视频内容）
 * - 设备摄像头实时画面
 * - 深度传感器数据（如Kinect、RealSense）
 * - 系统级别的视频解码器输出
 * - 硬件编码器的输出
 * - 其他设备的数据流（如雷达、激光雷达）
 *
 * 安全和权限考虑：
 * - 受保护内容：某些内容可能有访问限制
 * - 隐私保护：摄像头等设备需要用户授权
 * - 跨域限制：可能受到同源策略限制
 * - 硬件权限：需要相应的硬件访问权限
 *
 * 使用场景：
 * - WebRTC视频通话中的远程视频流
 * - 增强现实（AR）应用中的摄像头画面
 * - 受DRM保护的视频播放
 * - 实时深度感知应用
 * - 机器视觉和计算机视觉应用
 * - 实时数据可视化
 *
 * 技术限制：
 * - 目前仅在 WebGLRenderer 中支持
 * - 依赖于浏览器和硬件的支持
 * - 可能有性能和兼容性限制
 * - 某些操作可能受到安全策略限制
 *
 * 与普通纹理的区别：
 * - 不需要上传数据到GPU（已经在GPU中）
 * - 内容可能实时变化
 * - 可能有特殊的访问限制
 * - 生命周期由外部系统管理
 *
 * 使用示例：
 * ```js
 * // 从摄像头创建外部纹理（伪代码）
 * navigator.mediaDevices.getUserMedia({ video: true })
 *   .then(stream => {
 *     const video = document.createElement('video');
 *     video.srcObject = stream;
 *
 *     // 假设有API可以获取WebGL纹理
 *     const webglTexture = getWebGLTextureFromVideo(video);
 *     const externalTexture = new THREE.ExternalTexture(webglTexture);
 *
 *     material.map = externalTexture;
 *   });
 * ```
 *
 * @augments Texture - 继承自基础纹理类，具有所有纹理的基本功能
 */
class ExternalTexture extends Texture {
  /**
   * 构造一个新的外部纹理
   *
   * 创建一个包装外部WebGL纹理的Three.js纹理对象
   * 外部纹理通常由系统或硬件直接提供，不需要Three.js进行数据上传
   *
   * @param {?WebGLTexture} [sourceTexture=null] - 外部纹理对象
   *                                              这是一个原生的WebGL纹理对象
   *                                              通常由浏览器API或硬件驱动提供
   *                                              如果为null，表示暂时没有关联的外部纹理
   */
  constructor(sourceTexture = null) {
    // 调用父类构造函数，不传递图像数据
    super();

    /**
     * 外部源纹理
     *
     * 存储原生的WebGL纹理对象，这个纹理是在Three.js渲染器上下文之外创建的
     * 通常来自系统级别的API或硬件驱动程序
     *
     * 纹理来源：
     * - 媒体解码器：视频解码器的输出纹理
     * - 摄像头驱动：实时摄像头画面的纹理
     * - 传感器数据：深度传感器等设备的输出
     * - 系统服务：操作系统提供的纹理资源
     *
     * 生命周期管理：
     * - 创建：由外部系统负责
     * - 更新：内容可能实时变化
     * - 销毁：通常由外部系统管理
     * - 同步：需要与外部系统保持同步
     *
     * 使用注意事项：
     * - 不要手动删除这个纹理对象
     * - 内容可能随时变化，无需调用needsUpdate
     * - 可能有特殊的格式或限制
     * - 访问可能受到安全策略限制
     *
     * @type {?WebGLTexture}
     * @default null
     */
    this.sourceTexture = sourceTexture;

    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 ExternalTexture 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * 类型检测的重要性：
     * - 渲染器需要特殊处理外部纹理
     * - 某些操作可能不适用于外部纹理
     * - 调试和错误处理时的类型识别
     * - 性能优化的分支判断
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isExternalTexture = true;
  }
}

// ===== 模块导出 =====

/**
 * 导出 ExternalTexture 类
 *
 * ExternalTexture 类是处理外部纹理资源的专用类
 * 主要用于集成系统级别的纹理源，如摄像头、传感器等设备的实时数据
 */
export { ExternalTexture };
