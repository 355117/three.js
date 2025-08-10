/**
 * Three.js WebGPU 渲染器模块
 *
 * 这是 Three.js 的 WebGPU 渲染器入口文件，提供了基于 WebGPU API 的现代渲染功能。
 * WebGPU 是下一代 Web 图形 API，提供了更好的性能和更现代的图形编程模型。
 *
 * 主要功能包括：
 * - WebGPU 渲染器：基于 WebGPU API 的高性能渲染引擎
 * - 节点材质系统：基于节点的可视化材质编辑系统
 * - 计算着色器支持：GPU 计算功能
 * - 存储纹理和缓冲区：高级存储功能
 * - TSL 着色器语言：Three.js 着色器语言支持
 * - 现代光照系统：IES 光源、投影光源等
 * - 后处理管线：现代后处理效果系统
 *
 * @version r168
 * @author Three.js Authors
 */

// 导出 Three.js 核心模块的所有功能
// 包括基础的数学库、几何体、材质、光源、相机等核心组件
export * from "./Three.Core.js";

// ============================================================================
// 节点材质系统
// ============================================================================

// 导出所有节点材质类型
// 基于节点的材质系统，支持可视化材质编辑和复杂的材质组合
export * from "./materials/nodes/NodeMaterials.js";

// ============================================================================
// WebGPU 渲染器
// ============================================================================

// WebGPU 渲染器 - 基于 WebGPU API 的现代渲染引擎
// 提供比 WebGL 更好的性能和更现代的图形编程接口
export { default as WebGPURenderer } from "./renderers/webgpu/WebGPURenderer.js";

// ============================================================================
// 渲染系统组件
// ============================================================================

// 光照系统 - 统一的光照计算和管理
// 处理各种光源类型的光照计算和阴影渲染
export { default as Lighting } from "./renderers/common/Lighting.js";

// 捆绑组 - 渲染对象的批处理和优化
// 用于提高渲染性能，减少绘制调用次数
export { default as BundleGroup } from "./renderers/common/BundleGroup.js";

// 四边形网格 - 用于后处理和屏幕空间效果的基础网格
// 提供全屏四边形，常用于后处理通道
export { default as QuadMesh } from "./renderers/common/QuadMesh.js";

// 预过滤多分辨率环境贴图生成器 - WebGPU 版本
// 用于生成基于物理的渲染（PBR）所需的环境贴图
export { default as PMREMGenerator } from "./renderers/common/extras/PMREMGenerator.js";

// 后处理系统 - 现代后处理效果管线
// 提供各种后处理效果，如抗锯齿、色调映射、景深等
export { default as PostProcessing } from "./renderers/common/PostProcessing.js";

// 渲染器工具集 - 渲染相关的实用工具函数
// 提供渲染器通用的辅助功能和工具函数
import * as RendererUtils from "./renderers/common/RendererUtils.js";
export { RendererUtils };

// ============================================================================
// 存储系统
// ============================================================================

// 存储纹理 - 可读写的 GPU 存储纹理
// 用于计算着色器和高级渲染技术
export { default as StorageTexture } from "./renderers/common/StorageTexture.js";

// 3D 存储纹理 - 三维存储纹理
// 用于体积渲染和 3D 计算应用
export { default as Storage3DTexture } from "./renderers/common/Storage3DTexture.js";

// 数组存储纹理 - 纹理数组的存储版本
// 用于分层存储和批量纹理处理
export { default as StorageArrayTexture } from "./renderers/common/StorageArrayTexture.js";

// 存储缓冲属性 - GPU 存储缓冲区属性
// 用于计算着色器的数据存储和交换
export { default as StorageBufferAttribute } from "./renderers/common/StorageBufferAttribute.js";

// 实例化存储缓冲属性 - 支持实例化的存储缓冲属性
// 用于大量实例的高效存储和处理
export { default as StorageInstancedBufferAttribute } from "./renderers/common/StorageInstancedBufferAttribute.js";

// 间接存储缓冲属性 - 支持间接绘制的存储缓冲属性
// 用于 GPU 驱动的渲染和间接绘制调用
export { default as IndirectStorageBufferAttribute } from "./renderers/common/IndirectStorageBufferAttribute.js";

// ============================================================================
// WebGPU 专用光源
// ============================================================================

// IES 聚光灯 - 基于 IES 光度学数据的聚光灯
// 使用真实世界的光源数据，提供更真实的光照效果
export { default as IESSpotLight } from "./lights/webgpu/IESSpotLight.js";

// 投影光源 - 支持纹理投影的光源
// 可以投影图像或图案，用于创建复杂的光影效果
export { default as ProjectorLight } from "./lights/webgpu/ProjectorLight.js";

// ============================================================================
// 节点系统加载器
// ============================================================================

// 节点加载器 - 加载节点图数据
// 用于加载和解析节点材质和着色器图
export { default as NodeLoader } from "./loaders/nodes/NodeLoader.js";

// 节点对象加载器 - 加载包含节点的 3D 对象
// 支持加载带有节点材质的复杂 3D 场景
export { default as NodeObjectLoader } from "./loaders/nodes/NodeObjectLoader.js";

// 节点材质加载器 - 专门加载节点材质数据
// 用于加载和实例化节点材质系统
export { default as NodeMaterialLoader } from "./loaders/nodes/NodeMaterialLoader.js";

// ============================================================================
// 高级对象和节点系统
// ============================================================================

// 裁剪组 - 高级裁剪功能
// 提供复杂的几何裁剪和遮罩功能
export { ClippingGroup } from "./objects/ClippingGroup.js";

// 导出所有节点系统功能
// 包括各种节点类型、节点操作和节点图构建功能
export * from "./nodes/Nodes.js";

// TSL (Three.js Shading Language) - Three.js 着色器语言
// 提供类型安全的着色器编程接口和函数库
import * as TSL from "./nodes/TSL.js";
export { TSL };
