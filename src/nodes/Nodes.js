/**
 * Nodes.js - Three.js 节点系统主导出文件
 *
 * 该文件是Three.js节点系统的主要入口点，导出了所有节点相关的类和工具。
 * 节点系统是Three.js中用于构建着色器和材质的强大工具，支持可视化编程和程序化材质创建。
 */

// ===== 常量 =====
// 导出节点系统中使用的所有常量定义
export * from "./core/constants.js";

// ===== 核心节点 =====
// 节点系统的核心组件，提供基础功能和抽象
export { default as ArrayNode } from "./core/ArrayNode.js"; // 数组节点 - 处理数组数据
export { default as AssignNode } from "./core/AssignNode.js"; // 赋值节点 - 变量赋值操作
export { default as AttributeNode } from "./core/AttributeNode.js"; // 属性节点 - 几何体属性访问
export { default as BypassNode } from "./core/BypassNode.js"; // 旁路节点 - 条件性跳过节点
export { default as CacheNode } from "./core/CacheNode.js"; // 缓存节点 - 结果缓存优化
export { default as ConstNode } from "./core/ConstNode.js"; // 常量节点 - 常量值定义
export { default as ContextNode } from "./core/ContextNode.js"; // 上下文节点 - 执行上下文管理
export { default as IndexNode } from "./core/IndexNode.js"; // 索引节点 - 数组索引访问
export { default as LightingModel } from "./core/LightingModel.js"; // 光照模型 - 光照计算抽象
export { default as Node } from "./core/Node.js"; // 基础节点 - 所有节点的基类
export { default as VarNode } from "./core/VarNode.js"; // 变量节点 - 变量声明和管理
export { default as NodeAttribute } from "./core/NodeAttribute.js"; // 节点属性 - 节点属性管理
export { default as NodeBuilder } from "./core/NodeBuilder.js"; // 节点构建器 - 着色器代码生成
export { default as NodeCache } from "./core/NodeCache.js"; // 节点缓存 - 节点实例缓存
export { default as NodeCode } from "./core/NodeCode.js"; // 节点代码 - 代码片段管理
export { default as NodeFrame } from "./core/NodeFrame.js"; // 节点帧 - 渲染帧信息
export { default as NodeFunctionInput } from "./core/NodeFunctionInput.js"; // 节点函数输入 - 函数参数管理
export { default as NodeUniform } from "./core/NodeUniform.js"; // 节点统一变量 - 统一变量管理
export { default as NodeVar } from "./core/NodeVar.js"; // 节点变量 - 着色器变量
export { default as NodeVarying } from "./core/NodeVarying.js"; // 节点变化量 - 顶点到片段的数据传递
export { default as ParameterNode } from "./core/ParameterNode.js"; // 参数节点 - 函数参数定义
export { default as PropertyNode } from "./core/PropertyNode.js"; // 属性节点 - 对象属性访问
export { default as StackNode } from "./core/StackNode.js"; // 堆栈节点 - 节点堆栈管理
export { default as TempNode } from "./core/TempNode.js"; // 临时节点 - 临时计算节点
export { default as UniformGroupNode } from "./core/UniformGroupNode.js"; // 统一变量组节点 - 统一变量分组
export { default as UniformNode } from "./core/UniformNode.js"; // 统一变量节点 - 统一变量定义
export { default as VaryingNode } from "./core/VaryingNode.js"; // 变化量节点 - 顶点着色器到片段着色器的数据传递
export { default as StructNode } from "./core/StructNode.js"; // 结构体节点 - 结构体定义
export { default as StructTypeNode } from "./core/StructTypeNode.js"; // 结构体类型节点 - 结构体类型定义
export { default as OutputStructNode } from "./core/OutputStructNode.js"; // 输出结构体节点 - 输出结构体定义
export { default as MRTNode } from "./core/MRTNode.js"; // 多渲染目标节点 - 多重渲染目标
export { default as SubBuildNode } from "./core/SubBuildNode.js"; // 子构建节点 - 子节点构建

// 节点工具函数集合
import * as NodeUtils from "./core/NodeUtils.js";
export { NodeUtils };

// ===== 工具节点 =====
// 提供各种实用功能的节点，用于数据处理、转换和特殊效果
export { default as ArrayElementNode } from "./utils/ArrayElementNode.js"; // 数组元素节点 - 数组元素访问
export { default as ConvertNode } from "./utils/ConvertNode.js"; // 转换节点 - 数据类型转换
export { default as FunctionOverloadingNode } from "./utils/FunctionOverloadingNode.js"; // 函数重载节点 - 函数重载支持
export { default as JoinNode } from "./utils/JoinNode.js"; // 连接节点 - 向量/矩阵组合
export { default as LoopNode } from "./utils/LoopNode.js"; // 循环节点 - 循环控制结构
export { default as MaxMipLevelNode } from "./utils/MaxMipLevelNode.js"; // 最大Mip级别节点 - 纹理Mip级别查询
export { default as RemapNode } from "./utils/RemapNode.js"; // 重映射节点 - 数值范围重映射
export { default as RotateNode } from "./utils/RotateNode.js"; // 旋转节点 - 向量旋转变换
export { default as SetNode } from "./utils/SetNode.js"; // 设置节点 - 向量分量设置
export { default as SplitNode } from "./utils/SplitNode.js"; // 分割节点 - 向量分量访问
export { default as SpriteSheetUVNode } from "./utils/SpriteSheetUVNode.js"; // 精灵图集UV节点 - 精灵动画UV计算
export { default as StorageArrayElementNode } from "./utils/StorageArrayElementNode.js"; // 存储数组元素节点 - 存储缓冲区元素访问
export { default as ReflectorNode } from "./utils/ReflectorNode.js"; // 反射器节点 - 平面反射效果
export { default as RTTNode } from "./utils/RTTNode.js"; // 渲染到纹理节点 - 离屏渲染
export { default as MemberNode } from "./utils/MemberNode.js"; // 成员节点 - 结构体成员访问
export { default as DebugNode } from "./utils/DebugNode.js"; // 调试节点 - 调试信息输出
export { default as EventNode } from "./utils/EventNode.js"; // 事件节点 - 事件处理

// ===== 访问器节点 =====
// 用于访问各种数据源的节点，如纹理、缓冲区、材质属性等
export { default as UniformArrayNode } from "./accessors/UniformArrayNode.js"; // 统一数组节点 - 统一变量数组访问
export { default as BufferAttributeNode } from "./accessors/BufferAttributeNode.js"; // 缓冲区属性节点 - 几何体缓冲区属性访问
export { default as BufferNode } from "./accessors/BufferNode.js"; // 缓冲区节点 - 通用缓冲区访问
export { default as VertexColorNode } from "./accessors/VertexColorNode.js"; // 顶点颜色节点 - 顶点颜色属性访问
export { default as CubeTextureNode } from "./accessors/CubeTextureNode.js"; // 立方体纹理节点 - 立方体贴图访问
export { default as InstanceNode } from "./accessors/InstanceNode.js"; // 实例节点 - 实例化渲染数据访问
export { default as InstancedMeshNode } from "./accessors/InstancedMeshNode.js"; // 实例化网格节点 - 实例化网格数据访问
export { default as BatchNode } from "./accessors/BatchNode.js"; // 批处理节点 - 批处理渲染数据访问
export { default as MaterialNode } from "./accessors/MaterialNode.js"; // 材质节点 - 材质属性访问
export { default as MaterialReferenceNode } from "./accessors/MaterialReferenceNode.js"; // 材质引用节点 - 材质属性引用
export { default as RendererReferenceNode } from "./accessors/RendererReferenceNode.js"; // 渲染器引用节点 - 渲染器属性引用
export { default as MorphNode } from "./accessors/MorphNode.js"; // 变形节点 - 变形目标数据访问
export { default as ModelNode } from "./accessors/ModelNode.js"; // 模型节点 - 模型变换矩阵访问
export { default as Object3DNode } from "./accessors/Object3DNode.js"; // 3D对象节点 - 3D对象属性访问
export { default as PointUVNode } from "./accessors/PointUVNode.js"; // 点UV节点 - 点精灵UV坐标访问
export { default as ReferenceNode } from "./accessors/ReferenceNode.js"; // 引用节点 - 对象属性引用访问
export { default as SkinningNode } from "./accessors/SkinningNode.js"; // 蒙皮节点 - 骨骼动画数据访问
export { default as SceneNode } from "./accessors/SceneNode.js"; // 场景节点 - 场景属性访问
export { default as StorageBufferNode } from "./accessors/StorageBufferNode.js"; // 存储缓冲区节点 - 存储缓冲区访问
export { default as TextureNode } from "./accessors/TextureNode.js"; // 纹理节点 - 纹理采样访问
export { default as TextureSizeNode } from "./accessors/TextureSizeNode.js"; // 纹理尺寸节点 - 纹理尺寸查询
export { default as StorageTextureNode } from "./accessors/StorageTextureNode.js"; // 存储纹理节点 - 存储纹理访问
export { default as Texture3DNode } from "./accessors/Texture3DNode.js"; // 3D纹理节点 - 3D纹理访问
export { default as UserDataNode } from "./accessors/UserDataNode.js"; // 用户数据节点 - 用户自定义数据访问

// ===== 显示节点 =====
// 用于图像处理、后期效果和渲染输出的节点
export { default as BumpMapNode } from "./display/BumpMapNode.js"; // 凹凸贴图节点 - 凹凸贴图效果
export { default as ColorSpaceNode } from "./display/ColorSpaceNode.js"; // 色彩空间节点 - 色彩空间转换
export { default as FrontFacingNode } from "./display/FrontFacingNode.js"; // 正面朝向节点 - 面朝向检测
export { default as NormalMapNode } from "./display/NormalMapNode.js"; // 法线贴图节点 - 法线贴图处理
export { default as PosterizeNode } from "./display/PosterizeNode.js"; // 色调分离节点 - 色调分离效果
export { default as ToneMappingNode } from "./display/ToneMappingNode.js"; // 色调映射节点 - HDR色调映射
export { default as ScreenNode } from "./display/ScreenNode.js"; // 屏幕节点 - 屏幕空间坐标
export { default as ViewportTextureNode } from "./display/ViewportTextureNode.js"; // 视口纹理节点 - 视口纹理访问
export { default as ViewportSharedTextureNode } from "./display/ViewportSharedTextureNode.js"; // 视口共享纹理节点 - 共享视口纹理
export { default as ViewportDepthTextureNode } from "./display/ViewportDepthTextureNode.js"; // 视口深度纹理节点 - 深度缓冲区访问
export { default as ViewportDepthNode } from "./display/ViewportDepthNode.js"; // 视口深度节点 - 深度值处理
export { default as RenderOutputNode } from "./display/RenderOutputNode.js"; // 渲染输出节点 - 渲染结果输出
export { default as PassNode } from "./display/PassNode.js"; // 通道节点 - 渲染通道管理
export { default as ToonOutlinePassNode } from "./display/ToonOutlinePassNode.js"; // 卡通轮廓通道节点 - 卡通轮廓效果

// ===== 代码节点 =====
// 用于自定义代码和函数的节点
export { default as ExpressionNode } from "./code/ExpressionNode.js"; // 表达式节点 - 自定义表达式
export { default as CodeNode } from "./code/CodeNode.js"; // 代码节点 - 自定义着色器代码
export { default as FunctionCallNode } from "./code/FunctionCallNode.js"; // 函数调用节点 - 函数调用
export { default as FunctionNode } from "./code/FunctionNode.js"; // 函数节点 - 函数定义
export { default as ScriptableNode } from "./code/ScriptableNode.js"; // 可脚本化节点 - 脚本化逻辑
export { default as ScriptableValueNode } from "./code/ScriptableValueNode.js"; // 可脚本化值节点 - 脚本化值

// ===== 几何节点 =====
// 用于几何体相关计算的节点
export { default as RangeNode } from "./geometry/RangeNode.js"; // 范围节点 - 数值范围处理

// ===== GPGPU节点 =====
// 用于通用GPU计算的节点
export { default as ComputeNode } from "./gpgpu/ComputeNode.js"; // 计算节点 - GPU计算着色器

// ===== 光照节点 =====
// 用于光照计算和光源处理的节点
export { default as PointLightNode } from "./lighting/PointLightNode.js"; // 点光源节点 - 点光源计算
export { default as DirectionalLightNode } from "./lighting/DirectionalLightNode.js"; // 方向光节点 - 方向光计算
export { default as RectAreaLightNode } from "./lighting/RectAreaLightNode.js"; // 矩形区域光节点 - 区域光计算
export { default as SpotLightNode } from "./lighting/SpotLightNode.js"; // 聚光灯节点 - 聚光灯计算
export { default as IESSpotLightNode } from "./lighting/IESSpotLightNode.js"; // IES聚光灯节点 - IES光度学聚光灯
export { default as ProjectorLightNode } from "./lighting/ProjectorLightNode.js"; // 投影光节点 - 投影光计算
export { default as AmbientLightNode } from "./lighting/AmbientLightNode.js"; // 环境光节点 - 环境光计算
export { default as LightsNode } from "./lighting/LightsNode.js"; // 光源节点 - 多光源管理
export { default as LightingNode } from "./lighting/LightingNode.js"; // 光照节点 - 光照计算核心
export { default as LightingContextNode } from "./lighting/LightingContextNode.js"; // 光照上下文节点 - 光照上下文管理
export { default as HemisphereLightNode } from "./lighting/HemisphereLightNode.js"; // 半球光节点 - 半球光计算
export { default as LightProbeNode } from "./lighting/LightProbeNode.js"; // 光探针节点 - 光探针数据
export { default as EnvironmentNode } from "./lighting/EnvironmentNode.js"; // 环境节点 - 环境光照
export { default as BasicEnvironmentNode } from "./lighting/BasicEnvironmentNode.js"; // 基础环境节点 - 基础环境光照
export { default as IrradianceNode } from "./lighting/IrradianceNode.js"; // 辐照度节点 - 辐照度计算
export { default as AONode } from "./lighting/AONode.js"; // 环境光遮蔽节点 - AO计算
export { default as AnalyticLightNode } from "./lighting/AnalyticLightNode.js"; // 解析光节点 - 解析光源计算
export { default as ShadowBaseNode } from "./lighting/ShadowBaseNode.js"; // 阴影基础节点 - 阴影计算基类
export { default as ShadowNode } from "./lighting/ShadowNode.js"; // 阴影节点 - 阴影计算

// ===== PMREM节点 =====
// 用于预过滤环境贴图的节点
export { default as PMREMNode } from "./pmrem/PMREMNode.js"; // PMREM节点 - 预过滤多分辨率环境贴图

// ===== 解析器 =====
// 用于解析着色器代码的工具
export { default as GLSLNodeParser } from "./parsers/GLSLNodeParser.js"; // GLSL节点解析器 - GLSL代码解析 @TODO: Move to jsm/renderers/webgl.

// ===== 光照模型 =====
// 预定义的光照模型实现
export { default as PhongLightingModel } from "./functions/PhongLightingModel.js"; // Phong光照模型 - 经典Phong光照
export { default as PhysicalLightingModel } from "./functions/PhysicalLightingModel.js"; // 物理光照模型 - 基于物理的光照
