/**
 * Three.js 核心模块
 *
 * 这个文件是 Three.js 的核心导出模块，包含了 Three.js 的所有核心功能组件。
 * 它导出了构建 3D 应用程序所需的基础类和工具，包括：
 *
 * - 渲染系统：WebGL 渲染目标、WebXR 支持
 * - 场景管理：场景、雾效、3D 对象
 * - 几何体系统：各种几何体和缓冲几何体
 * - 材质系统：各种材质类型和着色器
 * - 纹理系统：2D/3D 纹理、压缩纹理、视频纹理等
 * - 光照系统：各种光源类型
 * - 相机系统：透视相机、正交相机等
 * - 动画系统：关键帧动画、动画混合器
 * - 音频系统：3D 音频支持
 * - 数学库：向量、矩阵、四元数等数学工具
 * - 加载器：各种资源加载器
 * - 辅助工具：调试辅助器、工具类
 *
 * 这个模块不包含 WebGL 渲染器本身，渲染器在 Three.js 主文件中导出。
 *
 * @version r168
 * @author Three.js Authors
 */

// 导入版本常量，用于版本检查和开发工具集成
import { REVISION } from "./constants.js";

// ============================================================================
// WebGL 渲染目标系统
// ============================================================================

// WebGL 数组渲染目标 - 支持渲染到纹理数组的渲染目标
// 用于实现分层渲染、体积渲染等高级渲染技术
export { WebGLArrayRenderTarget } from "./renderers/WebGLArrayRenderTarget.js";

// WebGL 3D 渲染目标 - 支持渲染到 3D 纹理的渲染目标
// 用于体积渲染、3D 纹理生成等应用场景
export { WebGL3DRenderTarget } from "./renderers/WebGL3DRenderTarget.js";

// WebGL 立方体渲染目标 - 支持渲染到立方体贴图的渲染目标
// 用于环境映射、反射、阴影映射等效果
export { WebGLCubeRenderTarget } from "./renderers/WebGLCubeRenderTarget.js";

// WebGL 渲染目标 - 基础的离屏渲染目标
// 用于后处理效果、阴影映射、反射等需要离屏渲染的场景
export { WebGLRenderTarget } from "./renderers/WebGLRenderTarget.js";

// WebXR 控制器 - WebXR（虚拟现实/增强现实）控制器支持
// 提供 VR/AR 设备的手柄输入和交互功能
export { WebXRController } from "./renderers/webxr/WebXRController.js";
// ============================================================================
// 场景管理系统
// ============================================================================

// 指数雾效 - 基于指数函数的雾效果
// 提供更自然的雾效渐变，适用于大气效果和景深模拟
export { FogExp2 } from "./scenes/FogExp2.js";

// 线性雾效 - 基于线性插值的雾效果
// 在指定距离范围内线性变化的雾效，适用于简单的景深效果
export { Fog } from "./scenes/Fog.js";

// 场景 - 3D 场景的根容器
// 包含所有 3D 对象、光源、相机等，是渲染的基本单位
export { Scene } from "./scenes/Scene.js";

// ============================================================================
// 3D 对象系统
// ============================================================================

// 精灵 - 始终面向相机的 2D 图像对象
// 用于粒子效果、UI 元素、广告牌等应用
export { Sprite } from "./objects/Sprite.js";

// 细节层次（LOD）- 根据距离自动切换模型细节的对象
// 用于性能优化，远距离显示低精度模型，近距离显示高精度模型
export { LOD } from "./objects/LOD.js";

// 蒙皮网格 - 支持骨骼动画的网格对象
// 用于角色动画、变形动画等需要骨骼驱动的模型
export { SkinnedMesh } from "./objects/SkinnedMesh.js";

// 骨骼系统 - 用于蒙皮网格的骨骼结构
// 定义骨骼层次结构和变换关系
export { Skeleton } from "./objects/Skeleton.js";

// 骨骼 - 骨骼系统中的单个骨骼节点
// 表示骨骼层次结构中的一个关节点
export { Bone } from "./objects/Bone.js";

// 网格 - 基础的 3D 网格对象
// 由几何体和材质组成，是最常用的 3D 对象类型
export { Mesh } from "./objects/Mesh.js";

// 实例化网格 - 高效渲染大量相同几何体的网格对象
// 用于渲染森林、草地、粒子系统等大量重复对象
export { InstancedMesh } from "./objects/InstancedMesh.js";

// 批处理网格 - 将多个几何体合并为单个绘制调用的网格对象
// 用于优化渲染性能，减少绘制调用次数
export { BatchedMesh } from "./objects/BatchedMesh.js";

// 线段 - 由不连续线段组成的线条对象
// 用于绘制网格线、边框等不连续的线条
export { LineSegments } from "./objects/LineSegments.js";

// 线环 - 闭合的线条对象
// 用于绘制闭合的轮廓线、边界线等
export { LineLoop } from "./objects/LineLoop.js";

// 线条 - 连续的线条对象
// 用于绘制路径、轨迹、连续的线条等
export { Line } from "./objects/Line.js";

// 点云 - 由点组成的对象
// 用于粒子系统、点云数据可视化等
export { Points } from "./objects/Points.js";

// 组 - 用于组织和管理多个 3D 对象的容器
// 可以对组内所有对象进行统一的变换操作
export { Group } from "./objects/Group.js";
// ============================================================================
// 纹理系统
// ============================================================================

// 视频纹理 - 使用 HTML5 视频元素作为纹理源
// 用于视频播放、动态纹理效果等应用
export { VideoTexture } from "./textures/VideoTexture.js";

// 视频帧纹理 - 使用视频帧作为纹理源
// 提供更精确的视频帧控制和处理
export { VideoFrameTexture } from "./textures/VideoFrameTexture.js";

// 帧缓冲纹理 - 直接从 WebGL 帧缓冲创建的纹理
// 用于高级渲染技术和后处理效果
export { FramebufferTexture } from "./textures/FramebufferTexture.js";

// 纹理源 - 纹理数据的抽象源对象
// 管理纹理的原始数据和更新机制
export { Source } from "./textures/Source.js";

// 数据纹理 - 使用原始数据数组创建的纹理
// 用于程序化纹理生成、数据可视化等
export { DataTexture } from "./textures/DataTexture.js";

// 数据数组纹理 - 使用数据数组创建的纹理数组
// 用于分层纹理、纹理图集等应用
export { DataArrayTexture } from "./textures/DataArrayTexture.js";

// 3D 数据纹理 - 三维数据纹理
// 用于体积渲染、3D 噪声、体积光照等效果
export { Data3DTexture } from "./textures/Data3DTexture.js";

// 压缩纹理 - 使用 GPU 压缩格式的纹理
// 减少显存占用，提高加载性能
export { CompressedTexture } from "./textures/CompressedTexture.js";

// 压缩数组纹理 - 压缩格式的纹理数组
// 结合压缩和数组纹理的优势
export { CompressedArrayTexture } from "./textures/CompressedArrayTexture.js";

// 压缩立方体纹理 - 压缩格式的立方体贴图
// 用于高效的环境映射和反射效果
export { CompressedCubeTexture } from "./textures/CompressedCubeTexture.js";

// 立方体纹理 - 六面立方体贴图纹理
// 用于天空盒、环境映射、反射等效果
export { CubeTexture } from "./textures/CubeTexture.js";

// Canvas 纹理 - 使用 HTML5 Canvas 作为纹理源
// 用于动态生成的 2D 图形、文本渲染等
export { CanvasTexture } from "./textures/CanvasTexture.js";

// 深度纹理 - 存储深度信息的纹理
// 用于阴影映射、深度测试、后处理效果等
export { DepthTexture } from "./textures/DepthTexture.js";

// 纹理 - 基础纹理类
// 所有纹理类型的基类，提供通用的纹理功能
export { Texture } from "./textures/Texture.js";
// ============================================================================
// 几何体系统
// ============================================================================

// 导出所有几何体类型
// 包括基础几何体（立方体、球体、平面等）和复杂几何体（文本、管道、车床等）
// 以及缓冲几何体、实例化几何体等高级几何体类型
export * from "./geometries/Geometries.js";

// ============================================================================
// 材质系统
// ============================================================================

// 导出所有材质类型
// 包括基础材质（基本材质、Lambert 材质、Phong 材质）
// 物理材质（PBR 材质、标准材质）、特殊材质（点材质、线材质、精灵材质）
// 以及着色器材质、原始着色器材质等高级材质类型
export * from "./materials/Materials.js";
// ============================================================================
// 资源加载系统
// ============================================================================

// 动画加载器 - 加载动画数据
// 支持关键帧动画、骨骼动画等动画资源的加载
export { AnimationLoader } from "./loaders/AnimationLoader.js";

// 压缩纹理加载器 - 加载压缩格式的纹理文件
// 支持 DDS、KTX、PVR 等压缩纹理格式
export { CompressedTextureLoader } from "./loaders/CompressedTextureLoader.js";

// 立方体纹理加载器 - 加载立方体贴图纹理
// 用于加载天空盒、环境贴图等六面纹理
export { CubeTextureLoader } from "./loaders/CubeTextureLoader.js";

// 数据纹理加载器 - 加载原始数据纹理
// 用于加载高度图、法线贴图等数据纹理
export { DataTextureLoader } from "./loaders/DataTextureLoader.js";

// 纹理加载器 - 基础的图像纹理加载器
// 支持 JPG、PNG、GIF 等常见图像格式
export { TextureLoader } from "./loaders/TextureLoader.js";

// 对象加载器 - 加载 Three.js 对象数据
// 用于加载序列化的 3D 对象、场景等
export { ObjectLoader } from "./loaders/ObjectLoader.js";

// 材质加载器 - 加载材质数据
// 用于加载序列化的材质配置和参数
export { MaterialLoader } from "./loaders/MaterialLoader.js";

// 缓冲几何体加载器 - 加载缓冲几何体数据
// 用于加载优化的几何体数据格式
export { BufferGeometryLoader } from "./loaders/BufferGeometryLoader.js";

// 加载管理器 - 管理资源加载过程
// 提供加载进度跟踪、错误处理、并发控制等功能
// DefaultLoadingManager 是全局默认的加载管理器实例
export { DefaultLoadingManager, LoadingManager } from "./loaders/LoadingManager.js";

// 图像加载器 - 加载图像文件
// 提供跨域支持、进度回调等功能
export { ImageLoader } from "./loaders/ImageLoader.js";

// ImageBitmap 加载器 - 使用 ImageBitmap API 加载图像
// 提供更好的性能和内存管理
export { ImageBitmapLoader } from "./loaders/ImageBitmapLoader.js";

// 文件加载器 - 基础的文件加载器
// 支持文本、二进制、JSON 等各种文件格式
export { FileLoader } from "./loaders/FileLoader.js";

// 加载器基类 - 所有加载器的基础类
// 提供通用的加载器功能和接口
export { Loader } from "./loaders/Loader.js";

// 加载器工具 - 加载器相关的实用工具函数
// 提供路径解析、URL 处理等辅助功能
export { LoaderUtils } from "./loaders/LoaderUtils.js";

// 缓存系统 - 资源缓存管理
// 避免重复加载相同资源，提高性能
export { Cache } from "./loaders/Cache.js";

// 音频加载器 - 加载音频文件
// 支持 MP3、OGG、WAV 等音频格式
export { AudioLoader } from "./loaders/AudioLoader.js";
// ============================================================================
// 光照系统
// ============================================================================

// 聚光灯 - 锥形光束的光源
// 具有位置、方向、角度和衰减，适用于手电筒、舞台灯光等效果
export { SpotLight } from "./lights/SpotLight.js";

// 点光源 - 向所有方向发光的光源
// 具有位置和衰减，适用于灯泡、火焰等效果
export { PointLight } from "./lights/PointLight.js";

// 矩形区域光 - 矩形形状的面光源
// 提供更真实的光照效果，适用于窗户、显示器等面光源
export { RectAreaLight } from "./lights/RectAreaLight.js";

// 半球光 - 模拟天空光照的光源
// 提供来自天空和地面的环境光照，适用于户外场景
export { HemisphereLight } from "./lights/HemisphereLight.js";

// 平行光 - 平行光束的光源
// 模拟太阳光等远距离光源，光线平行且无衰减
export { DirectionalLight } from "./lights/DirectionalLight.js";

// 环境光 - 均匀照亮所有对象的光源
// 提供基础的全局照明，避免场景过暗
export { AmbientLight } from "./lights/AmbientLight.js";

// 光源基类 - 所有光源的基础类
// 定义光源的通用属性和方法
export { Light } from "./lights/Light.js";

// 光探针 - 基于球谐函数的环境光照
// 用于实现全局光照和环境光照效果
export { LightProbe } from "./lights/LightProbe.js";

// ============================================================================
// 相机系统
// ============================================================================

// 立体相机 - 用于 VR/3D 立体渲染的相机
// 模拟双眼视觉，生成立体效果
export { StereoCamera } from "./cameras/StereoCamera.js";

// 透视相机 - 模拟人眼视觉的透视投影相机
// 具有视野角度、近远裁剪面，适用于大多数 3D 场景
export { PerspectiveCamera } from "./cameras/PerspectiveCamera.js";

// 正交相机 - 平行投影的相机
// 没有透视效果，适用于 2D 界面、建筑图纸等应用
export { OrthographicCamera } from "./cameras/OrthographicCamera.js";

// 立方体相机 - 用于生成立方体贴图的相机
// 从一个点向六个方向渲染，用于环境映射和反射
export { CubeCamera } from "./cameras/CubeCamera.js";

// 相机数组 - 管理多个相机的容器
// 用于多视口渲染、分屏显示等应用
export { ArrayCamera } from "./cameras/ArrayCamera.js";

// 相机基类 - 所有相机的基础类
// 定义相机的通用属性和投影矩阵计算
export { Camera } from "./cameras/Camera.js";
// ============================================================================
// 音频系统
// ============================================================================

// 音频监听器 - 3D 音频系统的监听者
// 代表用户的耳朵位置，用于计算 3D 音频效果
export { AudioListener } from "./audio/AudioListener.js";

// 位置音频 - 具有 3D 位置的音频源
// 根据距离和方向计算音量和立体声效果
export { PositionalAudio } from "./audio/PositionalAudio.js";

// 音频上下文 - Web Audio API 的上下文管理
// 管理音频图和音频处理节点
export { AudioContext } from "./audio/AudioContext.js";

// 音频分析器 - 音频频谱分析工具
// 用于音频可视化、音乐同步等应用
export { AudioAnalyser } from "./audio/AudioAnalyser.js";

// 音频 - 基础的音频播放对象
// 提供音频播放、暂停、音量控制等功能
export { Audio } from "./audio/Audio.js";

// ============================================================================
// 动画系统
// ============================================================================

// 向量关键帧轨道 - 向量属性的动画轨道
// 用于位置、缩放等向量属性的动画
export { VectorKeyframeTrack } from "./animation/tracks/VectorKeyframeTrack.js";

// 字符串关键帧轨道 - 字符串属性的动画轨道
// 用于材质名称、纹理路径等字符串属性的动画
export { StringKeyframeTrack } from "./animation/tracks/StringKeyframeTrack.js";

// 四元数关键帧轨道 - 四元数旋转的动画轨道
// 用于平滑的旋转动画，避免万向锁问题
export { QuaternionKeyframeTrack } from "./animation/tracks/QuaternionKeyframeTrack.js";

// 数值关键帧轨道 - 数值属性的动画轨道
// 用于透明度、强度等标量属性的动画
export { NumberKeyframeTrack } from "./animation/tracks/NumberKeyframeTrack.js";

// 颜色关键帧轨道 - 颜色属性的动画轨道
// 用于材质颜色、光源颜色等颜色属性的动画
export { ColorKeyframeTrack } from "./animation/tracks/ColorKeyframeTrack.js";

// 布尔关键帧轨道 - 布尔属性的动画轨道
// 用于可见性、启用状态等布尔属性的动画
export { BooleanKeyframeTrack } from "./animation/tracks/BooleanKeyframeTrack.js";

// 属性混合器 - 动画属性的混合计算
// 处理多个动画轨道对同一属性的影响
export { PropertyMixer } from "./animation/PropertyMixer.js";

// 属性绑定 - 动画属性与对象属性的绑定
// 建立动画数据与实际对象属性之间的连接
export { PropertyBinding } from "./animation/PropertyBinding.js";

// 关键帧轨道 - 动画轨道的基础类
// 定义关键帧动画的通用接口和插值方法
export { KeyframeTrack } from "./animation/KeyframeTrack.js";

// 动画工具 - 动画相关的实用工具函数
// 提供动画数据处理、转换等辅助功能
export { AnimationUtils } from "./animation/AnimationUtils.js";

// 动画对象组 - 管理多个动画对象的组
// 用于批量操作和优化动画性能
export { AnimationObjectGroup } from "./animation/AnimationObjectGroup.js";

// 动画混合器 - 动画播放和混合的核心引擎
// 管理多个动画剪辑的播放、混合和过渡
export { AnimationMixer } from "./animation/AnimationMixer.js";

// 动画剪辑 - 包含完整动画数据的容器
// 存储一个完整动画序列的所有轨道数据
export { AnimationClip } from "./animation/AnimationClip.js";

// 动画动作 - 动画剪辑的播放实例
// 控制动画的播放状态、权重、时间等
export { AnimationAction } from "./animation/AnimationAction.js";
// ============================================================================
// 核心系统
// ============================================================================

// 渲染目标 - 抽象的渲染目标基类
// 定义渲染目标的通用接口和属性
export { RenderTarget } from "./core/RenderTarget.js";

// 3D 渲染目标 - 三维渲染目标
// 用于体积渲染和 3D 纹理渲染
export { RenderTarget3D } from "./core/RenderTarget3D.js";

// 统一变量 - 着色器统一变量的封装
// 管理着色器中的统一变量值和更新
export { Uniform } from "./core/Uniform.js";

// 统一变量组 - 统一变量的集合管理
// 用于批量管理和更新相关的统一变量
export { UniformsGroup } from "./core/UniformsGroup.js";

// 实例化缓冲几何体 - 支持实例化渲染的几何体
// 用于高效渲染大量相同几何体的实例
export { InstancedBufferGeometry } from "./core/InstancedBufferGeometry.js";

// 缓冲几何体 - 基于缓冲区的高性能几何体
// Three.js 的核心几何体类，使用 WebGL 缓冲区存储顶点数据
export { BufferGeometry } from "./core/BufferGeometry.js";

// 交错缓冲属性 - 交错存储的顶点属性
// 将多个属性交错存储在同一缓冲区中，提高性能
export { InterleavedBufferAttribute } from "./core/InterleavedBufferAttribute.js";

// 实例化交错缓冲 - 支持实例化的交错缓冲
// 结合实例化渲染和交错缓冲的优势
export { InstancedInterleavedBuffer } from "./core/InstancedInterleavedBuffer.js";

// 交错缓冲 - 交错存储多个属性的缓冲区
// 提高内存访问效率和渲染性能
export { InterleavedBuffer } from "./core/InterleavedBuffer.js";

// 实例化缓冲属性 - 支持实例化的缓冲属性
// 用于实例化渲染中的每实例数据
export { InstancedBufferAttribute } from "./core/InstancedBufferAttribute.js";

// WebGL 缓冲属性 - 直接使用 WebGL 缓冲对象的属性
// 提供更底层的缓冲区控制
export { GLBufferAttribute } from "./core/GLBufferAttribute.js";

// 导出所有缓冲属性类型
// 包括各种数据类型的缓冲属性（Float32、Uint16、Uint32 等）
export * from "./core/BufferAttribute.js";

// 3D 对象 - 所有 3D 对象的基类
// 提供变换、层次结构、事件等核心功能
export { Object3D } from "./core/Object3D.js";

// 射线投射器 - 3D 射线检测工具
// 用于鼠标拾取、碰撞检测、射线追踪等
export { Raycaster } from "./core/Raycaster.js";

// 图层系统 - 对象可见性分层管理
// 用于控制对象在不同相机中的可见性
export { Layers } from "./core/Layers.js";

// 事件分发器 - 事件系统的基础类
// 提供事件监听、触发、移除等功能
export { EventDispatcher } from "./core/EventDispatcher.js";

// 时钟 - 时间管理工具
// 提供时间测量、帧率计算等功能
export { Clock } from "./core/Clock.js";

// 计时器 - 高精度计时器
// 提供更精确的时间控制和测量
export { Timer } from "./core/Timer.js";
// ============================================================================
// 数学库 - 插值器
// ============================================================================

// 四元数线性插值器 - 四元数的线性插值
// 用于平滑的旋转动画插值
export { QuaternionLinearInterpolant } from "./math/interpolants/QuaternionLinearInterpolant.js";

// 线性插值器 - 线性插值算法
// 用于数值、向量等的线性插值
export { LinearInterpolant } from "./math/interpolants/LinearInterpolant.js";

// 离散插值器 - 阶跃插值算法
// 用于不需要平滑过渡的离散值插值
export { DiscreteInterpolant } from "./math/interpolants/DiscreteInterpolant.js";

// 三次插值器 - 三次样条插值算法
// 提供平滑的曲线插值，适用于动画曲线
export { CubicInterpolant } from "./math/interpolants/CubicInterpolant.js";

// 插值器基类 - 所有插值器的基础类
// 定义插值器的通用接口和方法
export { Interpolant } from "./math/Interpolant.js";

// ============================================================================
// 数学库 - 几何图形
// ============================================================================

// 三角形 - 三维空间中的三角形
// 提供面积计算、重心坐标、法向量等功能
export { Triangle } from "./math/Triangle.js";

// 数学工具 - 数学相关的实用函数
// 提供角度转换、随机数、插值等常用数学函数
export { MathUtils } from "./math/MathUtils.js";

// 球坐标 - 球坐标系统
// 用于球面坐标和笛卡尔坐标的转换
export { Spherical } from "./math/Spherical.js";

// 柱坐标 - 柱坐标系统
// 用于柱面坐标和笛卡尔坐标的转换
export { Cylindrical } from "./math/Cylindrical.js";

// 平面 - 三维空间中的无限平面
// 用于平面方程、点到平面距离等计算
export { Plane } from "./math/Plane.js";

// 视锥体 - 相机的视锥体
// 用于视锥体裁剪、可见性检测等
export { Frustum } from "./math/Frustum.js";

// 视锥体数组 - 多个视锥体的集合
// 用于多视锥体的批量处理
export { FrustumArray } from "./math/FrustumArray.js";

// 球体 - 三维空间中的球体
// 提供球体碰撞检测、包围球计算等功能
export { Sphere } from "./math/Sphere.js";

// 射线 - 三维空间中的射线
// 用于射线追踪、碰撞检测等
export { Ray } from "./math/Ray.js";

// ============================================================================
// 数学库 - 矩阵和向量
// ============================================================================

// 4x4 矩阵 - 四维变换矩阵
// 用于 3D 变换、投影变换等
export { Matrix4 } from "./math/Matrix4.js";

// 3x3 矩阵 - 三维变换矩阵
// 用于法向量变换、2D 变换等
export { Matrix3 } from "./math/Matrix3.js";

// 2x2 矩阵 - 二维变换矩阵
// 用于 2D 变换计算
export { Matrix2 } from "./math/Matrix2.js";

// 3D 包围盒 - 三维轴对齐包围盒
// 用于碰撞检测、空间分割等
export { Box3 } from "./math/Box3.js";

// 2D 包围盒 - 二维轴对齐包围盒
// 用于 2D 碰撞检测、UI 布局等
export { Box2 } from "./math/Box2.js";

// 3D 线段 - 三维空间中的线段
// 提供线段长度、最近点等计算
export { Line3 } from "./math/Line3.js";

// 欧拉角 - 欧拉角旋转表示
// 用于直观的旋转角度表示和转换
export { Euler } from "./math/Euler.js";

// 四维向量 - 四维向量数学
// 用于齐次坐标、颜色 RGBA 等
export { Vector4 } from "./math/Vector4.js";

// 三维向量 - 三维向量数学
// Three.js 中最常用的向量类，用于位置、方向、缩放等
export { Vector3 } from "./math/Vector3.js";

// 二维向量 - 二维向量数学
// 用于 UV 坐标、2D 位置等
export { Vector2 } from "./math/Vector2.js";

// 四元数 - 四元数旋转表示
// 用于平滑旋转插值，避免万向锁问题
export { Quaternion } from "./math/Quaternion.js";

// ============================================================================
// 颜色和光照
// ============================================================================

// 颜色 - RGB 颜色表示和操作
// 提供颜色空间转换、颜色混合等功能
export { Color } from "./math/Color.js";

// 颜色管理 - 颜色空间和色彩管理
// 处理不同颜色空间的转换和校正
export { ColorManagement } from "./math/ColorManagement.js";

// 三阶球谐函数 - 用于环境光照的球谐函数
// 用于实时全局光照和环境光照近似
export { SphericalHarmonics3 } from "./math/SphericalHarmonics3.js";
// ============================================================================
// 调试辅助器
// ============================================================================

// 聚光灯辅助器 - 可视化聚光灯的范围和方向
// 用于调试和可视化聚光灯的照射区域
export { SpotLightHelper } from "./helpers/SpotLightHelper.js";

// 骨骼辅助器 - 可视化骨骼系统的结构
// 用于调试骨骼动画和蒙皮网格
export { SkeletonHelper } from "./helpers/SkeletonHelper.js";

// 点光源辅助器 - 可视化点光源的位置和范围
// 用于调试点光源的照射效果
export { PointLightHelper } from "./helpers/PointLightHelper.js";

// 半球光辅助器 - 可视化半球光的方向
// 用于调试环境光照效果
export { HemisphereLightHelper } from "./helpers/HemisphereLightHelper.js";

// 网格辅助器 - 显示网格线
// 用于空间定位和尺寸参考
export { GridHelper } from "./helpers/GridHelper.js";

// 极坐标网格辅助器 - 显示极坐标网格
// 用于圆形或放射状的空间参考
export { PolarGridHelper } from "./helpers/PolarGridHelper.js";

// 平行光辅助器 - 可视化平行光的方向
// 用于调试平行光的照射方向
export { DirectionalLightHelper } from "./helpers/DirectionalLightHelper.js";

// 相机辅助器 - 可视化相机的视锥体
// 用于调试相机的视野范围
export { CameraHelper } from "./helpers/CameraHelper.js";

// 包围盒辅助器 - 可视化对象的包围盒
// 用于调试碰撞检测和空间计算
export { BoxHelper } from "./helpers/BoxHelper.js";

// 3D 包围盒辅助器 - 可视化 Box3 对象
// 用于调试三维包围盒计算
export { Box3Helper } from "./helpers/Box3Helper.js";

// 平面辅助器 - 可视化平面对象
// 用于调试平面方程和空间分割
export { PlaneHelper } from "./helpers/PlaneHelper.js";

// 箭头辅助器 - 显示方向箭头
// 用于可视化向量、方向、力等
export { ArrowHelper } from "./helpers/ArrowHelper.js";

// 坐标轴辅助器 - 显示 XYZ 坐标轴
// 用于空间方向参考和调试
export { AxesHelper } from "./helpers/AxesHelper.js";

// ============================================================================
// 曲线和路径系统
// ============================================================================

// 导出所有曲线类型
// 包括贝塞尔曲线、样条曲线、椭圆曲线等各种数学曲线
export * from "./extras/curves/Curves.js";

// 形状 - 2D 形状定义
// 用于创建复杂的 2D 轮廓和挤出几何体
export { Shape } from "./extras/core/Shape.js";

// 路径 - 2D 路径定义
// 用于创建复杂的 2D 路径和轮廓
export { Path } from "./extras/core/Path.js";

// 形状路径 - 包含孔洞的复杂形状
// 用于创建带有内部孔洞的复杂形状
export { ShapePath } from "./extras/core/ShapePath.js";

// 曲线路径 - 由多条曲线组成的路径
// 用于创建复杂的连续曲线路径
export { CurvePath } from "./extras/core/CurvePath.js";

// 曲线基类 - 所有曲线的基础类
// 定义曲线的通用接口和方法
export { Curve } from "./extras/core/Curve.js";

// ============================================================================
// 工具类和实用函数
// ============================================================================

// 控制器 - 相机控制器的基础类
// 用于实现各种相机控制方式
export { Controls } from "./extras/Controls.js";

// 数据工具 - 数据处理相关的实用函数
// 提供数据转换、压缩、解压等功能
export { DataUtils } from "./extras/DataUtils.js";

// 图像工具 - 图像处理相关的实用函数
// 提供图像格式检测、转换等功能
export { ImageUtils } from "./extras/ImageUtils.js";

// 形状工具 - 形状处理相关的实用函数
// 提供形状三角化、面积计算等功能
export { ShapeUtils } from "./extras/ShapeUtils.js";

// 纹理工具 - 纹理处理相关的实用函数
// 提供纹理生成、转换等功能
export { TextureUtils } from "./extras/TextureUtils.js";

// Canvas 元素创建工具 - 创建 Canvas 元素的实用函数
// 提供跨平台的 Canvas 创建功能
export { createCanvasElement } from "./utils.js";

// ============================================================================
// 常量和兼容性
// ============================================================================

// 导出所有常量定义
// 包括渲染模式、纹理格式、数据类型等常量
export * from "./constants.js";

// 导出遗留 API 兼容性接口
// 提供向后兼容的 API 接口
export * from "./Three.Legacy.js";

// ============================================================================
// 开发工具集成和版本检测
// ============================================================================

// Three.js 开发工具集成
// 如果存在 Three.js 开发工具扩展，则向其注册当前 Three.js 实例
// 这允许浏览器扩展检测和调试 Three.js 应用程序
if (typeof __THREE_DEVTOOLS__ !== "undefined") {
  // 向开发工具发送注册事件，包含当前版本信息
  __THREE_DEVTOOLS__.dispatchEvent(
    new CustomEvent("register", {
      detail: {
        revision: REVISION, // 当前 Three.js 版本号
      },
    })
  );
}

// 多实例检测和版本标记
// 在浏览器环境中检测是否存在多个 Three.js 实例
// 这有助于避免版本冲突和重复加载问题
if (typeof window !== "undefined") {
  // 检查是否已经存在 Three.js 实例
  if (window.__THREE__) {
    // 如果已存在，发出警告提示可能的版本冲突
    console.warn("WARNING: Multiple instances of Three.js being imported.");
  } else {
    // 如果不存在，则标记当前版本到全局对象
    window.__THREE__ = REVISION;
  }
}
