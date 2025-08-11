/**
 * TSL.js - Three.js 着色语言 (Three.js Shading Language) 主导出文件
 *
 * 该文件是TSL的主要入口点，导出了所有TSL相关的函数、节点和工具。
 * TSL是Three.js的着色器编程语言，提供了一套高级的、类型安全的
 * 着色器编程接口，使开发者能够以更直观的方式创建复杂的材质效果。
 */

// ===== 常量定义 =====
// 导出节点系统中使用的所有常量
export * from "./core/constants.js";

// ===== 核心节点 =====
// TSL核心节点系统，提供基础的节点功能
export * from "./core/AssignNode.js"; // 赋值节点 - 变量赋值操作
export * from "./core/AttributeNode.js"; // 属性节点 - 几何体属性访问
export * from "./core/BypassNode.js"; // 旁路节点 - 条件性跳过节点
export * from "./core/CacheNode.js"; // 缓存节点 - 结果缓存优化
export * from "./core/ContextNode.js"; // 上下文节点 - 执行上下文管理
export * from "./core/IndexNode.js"; // 索引节点 - 数组索引访问
export * from "./core/ParameterNode.js"; // 参数节点 - 函数参数定义
export * from "./core/PropertyNode.js"; // 属性节点 - 对象属性访问
export * from "./core/StackNode.js"; // 堆栈节点 - 节点堆栈管理
export * from "./core/StructNode.js"; // 结构体节点 - 结构体定义
export * from "./core/UniformGroupNode.js"; // 统一变量组节点 - 统一变量分组
export * from "./core/UniformNode.js"; // 统一变量节点 - 统一变量定义
export * from "./core/VaryingNode.js"; // 变化量节点 - 顶点到片段数据传递
export * from "./core/OutputStructNode.js"; // 输出结构体节点 - 输出结构体定义
export * from "./core/MRTNode.js"; // 多渲染目标节点 - 多重渲染目标

// ===== 数学工具 =====
// 数学相关的函数和工具
export * from "./math/Hash.js"; // 哈希函数 - 随机数生成和哈希计算
export * from "./math/MathUtils.js"; // 数学工具 - 常用数学函数
export * from "./math/TriNoise3D.js"; // 三角噪声 - 3D三角噪声函数

// ===== 实用工具 =====
// 各种实用的工具函数和节点
export * from "./utils/EquirectUV.js"; // 等距圆柱投影UV - 全景图UV映射
export * from "./utils/FunctionOverloadingNode.js"; // 函数重载节点 - 函数重载支持
export * from "./utils/LoopNode.js"; // 循环节点 - 循环控制结构
export * from "./utils/MatcapUV.js"; // Matcap UV - 材质捕获UV映射
export * from "./utils/MaxMipLevelNode.js"; // 最大Mip级别节点 - 纹理Mip级别查询
export * from "./utils/Oscillators.js"; // 振荡器 - 各种波形生成函数
export * from "./utils/Packing.js"; // 打包工具 - 数据打包和解包
export * from "./utils/RemapNode.js"; // 重映射节点 - 数值范围重映射
export * from "./utils/UVUtils.js"; // UV工具 - UV坐标变换工具
export * from "./utils/SpriteUtils.js"; // 精灵工具 - 精灵和广告牌效果
export * from "./utils/ViewportUtils.js"; // 视口工具 - 视口相关操作
export * from "./utils/RotateNode.js"; // 旋转节点 - 向量旋转变换
export * from "./utils/SpriteSheetUVNode.js"; // 精灵图集UV节点 - 精灵动画UV计算
export * from "./utils/Timer.js"; // 时间工具 - 时间相关的统一变量
export * from "./utils/TriplanarTextures.js"; // 三平面纹理 - 三平面纹理映射
export * from "./utils/ReflectorNode.js"; // 反射器节点 - 平面反射效果
export * from "./utils/RTTNode.js"; // 渲染到纹理节点 - 离屏渲染
export * from "./utils/PostProcessingUtils.js"; // 后处理工具 - 后期处理效果
export * from "./utils/SampleNode.js"; // 采样节点 - 纹理采样工具
export * from "./utils/EventNode.js"; // 事件节点 - 事件处理

// ===== TSL核心语言 =====
// Three.js着色语言的核心实现
export * from "./tsl/TSLBase.js"; // TSL基础 - TSL语言核心功能

// ===== 访问器 =====
// 用于访问各种数据源的函数和节点
export * from "./accessors/AccessorsUtils.js"; // 访问器工具 - 访问器相关的实用函数
export * from "./accessors/Arrays.js"; // 数组访问 - 数组数据访问工具
export * from "./accessors/UniformArrayNode.js"; // 统一数组节点 - 统一变量数组访问
export * from "./accessors/Bitangent.js"; // 副切线 - 副切线向量访问
export * from "./accessors/BufferAttributeNode.js"; // 缓冲区属性节点 - 几何体缓冲区属性访问
export * from "./accessors/BufferNode.js"; // 缓冲区节点 - 通用缓冲区访问
export * from "./accessors/Camera.js"; // 相机 - 相机相关属性访问
export * from "./accessors/VertexColorNode.js"; // 顶点颜色节点 - 顶点颜色属性访问
export * from "./accessors/CubeTextureNode.js"; // 立方体纹理节点 - 立方体贴图访问
export * from "./accessors/InstanceNode.js"; // 实例节点 - 实例化渲染数据访问
export * from "./accessors/InstancedMeshNode.js"; // 实例化网格节点 - 实例化网格数据访问
export * from "./accessors/BatchNode.js"; // 批处理节点 - 批处理渲染数据访问
export * from "./accessors/MaterialNode.js"; // 材质节点 - 材质属性访问
export * from "./accessors/MaterialProperties.js"; // 材质属性 - 材质属性访问工具
export * from "./accessors/MaterialReferenceNode.js"; // 材质引用节点 - 材质属性引用
export * from "./accessors/RendererReferenceNode.js"; // 渲染器引用节点 - 渲染器属性引用
export * from "./accessors/MorphNode.js"; // 变形节点 - 变形目标数据访问
export * from "./accessors/TextureBicubic.js"; // 双三次纹理 - 双三次插值纹理采样
export * from "./accessors/ModelNode.js"; // 模型节点 - 模型变换矩阵访问
export * from "./accessors/ModelViewProjectionNode.js"; // 模型视图投影节点 - MVP矩阵访问
export * from "./accessors/Normal.js"; // 法线 - 法线向量访问
export * from "./accessors/Object3DNode.js"; // 3D对象节点 - 3D对象属性访问
export * from "./accessors/PointUVNode.js"; // 点UV节点 - 点精灵UV坐标访问
export * from "./accessors/Position.js"; // 位置 - 顶点位置访问
export * from "./accessors/ReferenceNode.js"; // 引用节点 - 对象属性引用访问
export * from "./accessors/ReflectVector.js"; // 反射向量 - 反射向量计算
export * from "./accessors/SkinningNode.js"; // 蒙皮节点 - 骨骼动画数据访问
export * from "./accessors/SceneNode.js"; // 场景节点 - 场景属性访问
export * from "./accessors/StorageBufferNode.js"; // 存储缓冲区节点 - 存储缓冲区访问
export * from "./accessors/Tangent.js"; // 切线 - 切线向量访问
export * from "./accessors/TextureNode.js"; // 纹理节点 - 纹理采样访问
export * from "./accessors/TextureSizeNode.js"; // 纹理尺寸节点 - 纹理尺寸查询
export * from "./accessors/StorageTextureNode.js"; // 存储纹理节点 - 存储纹理访问
export * from "./accessors/Texture3DNode.js"; // 3D纹理节点 - 3D纹理访问
export * from "./accessors/UV.js"; // UV坐标 - UV坐标访问
export * from "./accessors/UserDataNode.js"; // 用户数据节点 - 用户自定义数据访问
export * from "./accessors/VelocityNode.js"; // 速度节点 - 速度向量访问

// ===== 显示和渲染 =====
// 用于图像处理、后期效果和渲染输出的函数和节点
export * from "./display/BlendModes.js"; // 混合模式 - 各种颜色混合模式
export * from "./display/BumpMapNode.js"; // 凹凸贴图节点 - 凹凸贴图效果
export * from "./display/ColorAdjustment.js"; // 颜色调整 - 颜色调整工具函数
export * from "./display/ColorSpaceNode.js"; // 色彩空间节点 - 色彩空间转换
export * from "./display/FrontFacingNode.js"; // 正面朝向节点 - 面朝向检测
export * from "./display/NormalMapNode.js"; // 法线贴图节点 - 法线贴图处理
export * from "./display/PosterizeNode.js"; // 色调分离节点 - 色调分离效果
export * from "./display/ToneMappingNode.js"; // 色调映射节点 - HDR色调映射
export * from "./display/ScreenNode.js"; // 屏幕节点 - 屏幕空间坐标
export * from "./display/ViewportTextureNode.js"; // 视口纹理节点 - 视口纹理访问
export * from "./display/ViewportSharedTextureNode.js"; // 视口共享纹理节点 - 共享视口纹理
export * from "./display/ViewportDepthTextureNode.js"; // 视口深度纹理节点 - 深度缓冲区访问
export * from "./display/ViewportDepthNode.js"; // 视口深度节点 - 深度值处理
export * from "./display/RenderOutputNode.js"; // 渲染输出节点 - 渲染结果输出
export * from "./display/ToonOutlinePassNode.js"; // 卡通轮廓通道节点 - 卡通轮廓效果

export * from "./display/PassNode.js"; // 通道节点 - 渲染通道管理

export * from "./display/ColorSpaceFunctions.js"; // 色彩空间函数 - 色彩空间转换函数
export * from "./display/ToneMappingFunctions.js"; // 色调映射函数 - 色调映射算法

// ===== 代码节点 =====
// 用于自定义代码和函数的节点
export * from "./code/ExpressionNode.js"; // 表达式节点 - 自定义表达式
export * from "./code/CodeNode.js"; // 代码节点 - 自定义着色器代码
export * from "./code/FunctionCallNode.js"; // 函数调用节点 - 函数调用
export * from "./code/FunctionNode.js"; // 函数节点 - 函数定义
export * from "./code/ScriptableNode.js"; // 可脚本化节点 - 脚本化逻辑
export * from "./code/ScriptableValueNode.js"; // 可脚本化值节点 - 脚本化值

// ===== 雾效 =====
// 雾效相关的函数和节点
export * from "./fog/Fog.js"; // 雾效 - 各种雾效算法

// ===== 几何 =====
// 几何体相关的函数和节点
export * from "./geometry/RangeNode.js"; // 范围节点 - 数值范围处理

// ===== GPGPU计算 =====
// 通用GPU计算相关的函数和节点
export * from "./gpgpu/ComputeNode.js"; // 计算节点 - GPU计算着色器
export * from "./gpgpu/ComputeBuiltinNode.js"; // 计算内置节点 - 计算着色器内置函数
export * from "./gpgpu/BarrierNode.js"; // 屏障节点 - 同步屏障
export * from "./gpgpu/WorkgroupInfoNode.js"; // 工作组信息节点 - 工作组相关信息
export * from "./gpgpu/AtomicFunctionNode.js"; // 原子函数节点 - 原子操作函数

// ===== 光照系统 =====
// 光照计算相关的函数和节点
export * from "./accessors/Lights.js"; // 光源访问 - 光源数据访问
export * from "./lighting/LightsNode.js"; // 光源节点 - 多光源管理
export * from "./lighting/LightingContextNode.js"; // 光照上下文节点 - 光照上下文管理
export * from "./lighting/ShadowBaseNode.js"; // 阴影基础节点 - 阴影计算基类
export * from "./lighting/ShadowNode.js"; // 阴影节点 - 阴影计算
export * from "./lighting/ShadowFilterNode.js"; // 阴影过滤节点 - 阴影过滤算法
export * from "./lighting/PointShadowNode.js"; // 点光源阴影节点 - 点光源阴影计算
export * from "./lighting/PointLightNode.js"; // 点光源节点 - 点光源计算

// ===== PMREM环境贴图 =====
// 预过滤多分辨率环境贴图相关的函数和节点
export * from "./pmrem/PMREMNode.js"; // PMREM节点 - 预过滤多分辨率环境贴图
export * from "./pmrem/PMREMUtils.js"; // PMREM工具 - PMREM相关工具函数

// ===== 程序化生成 =====
// 程序化生成相关的函数和节点
export * from "./procedural/Checker.js"; // 棋盘格 - 棋盘格图案生成

// ===== 形状 =====
// 几何形状相关的函数和节点
export * from "./shapes/Shapes.js"; // 形状 - 各种几何形状函数

// ===== MaterialX支持 =====
// MaterialX标准支持
export * from "./materialx/MaterialXNodes.js"; // MaterialX节点 - MaterialX标准节点

// ===== 着色函数 =====
// 各种着色和材质相关的函数

// BSDF (双向散射分布函数) 相关函数
export { default as BRDF_GGX } from "./functions/BSDF/BRDF_GGX.js"; // GGX BRDF - GGX双向反射分布函数
export { default as BRDF_Lambert } from "./functions/BSDF/BRDF_Lambert.js"; // Lambert BRDF - Lambert双向反射分布函数
export { default as D_GGX } from "./functions/BSDF/D_GGX.js"; // GGX分布函数 - GGX法线分布函数
export { default as DFGApprox } from "./functions/BSDF/DFGApprox.js"; // DFG近似 - 预积分BRDF查找表近似
export { default as F_Schlick } from "./functions/BSDF/F_Schlick.js"; // Schlick菲涅尔 - Schlick菲涅尔近似
export { default as Schlick_to_F0 } from "./functions/BSDF/Schlick_to_F0.js"; // Schlick到F0转换 - Schlick参数到F0转换
export { default as V_GGX_SmithCorrelated } from "./functions/BSDF/V_GGX_SmithCorrelated.js"; // Smith相关遮蔽函数 - GGX Smith相关几何函数

// 光照工具函数
export * from "./lighting/LightUtils.js"; // 光照工具 - 光照计算相关工具函数

// 材质相关函数
export { default as getGeometryRoughness } from "./functions/material/getGeometryRoughness.js"; // 几何粗糙度 - 获取几何体粗糙度
export { default as getParallaxCorrectNormal } from "./functions/material/getParallaxCorrectNormal.js"; // 视差校正法线 - 获取视差校正的法线
export { default as getRoughness } from "./functions/material/getRoughness.js"; // 粗糙度 - 获取材质粗糙度
export { default as getShIrradianceAt } from "./functions/material/getShIrradianceAt.js"; // 球谐辐照度 - 获取指定位置的球谐辐照度
