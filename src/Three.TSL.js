/**
 * Three.js TSL (Three.js Shading Language) 函数库
 *
 * 这个文件导出了 Three.js 着色器语言 (TSL) 的所有函数和常量。
 * TSL 是 Three.js 的现代着色器编程接口，提供了类型安全的着色器开发体验。
 *
 * TSL 的主要特性：
 * - 类型安全：编译时类型检查，减少着色器错误
 * - 节点化编程：基于节点图的着色器构建
 * - 跨平台：支持 WebGL 和 WebGPU 后端
 * - 高级抽象：提供高级的着色器编程抽象
 * - 性能优化：自动优化着色器代码
 * - 可视化调试：支持节点图的可视化调试
 *
 * 功能分类：
 * - BRDF 和光照模型：物理基础的光照计算
 * - 数学函数：向量、矩阵、三角函数等
 * - 纹理操作：纹理采样、过滤、变换
 * - 几何操作：顶点变换、法线计算
 * - 材质属性：各种材质参数的访问
 * - 后处理效果：色调映射、模糊、混合等
 * - 计算着色器：GPU 计算功能
 * - MaterialX 集成：支持 MaterialX 标准
 *
 * 注意：这个文件包含了 590 个导出函数，涵盖了现代着色器编程的所有方面。
 * 所有函数都是从 three/webgpu 模块的 TSL 命名空间重新导出的。
 *
 * @version r168
 * @author Three.js Authors
 */

// 从 Three.js WebGPU 模块导入 TSL 着色器语言核心
// TSL 提供了类型安全的着色器编程接口和丰富的函数库
import { TSL } from "three/webgpu";

// ============================================================================
// BRDF (双向反射分布函数) 和光照模型
// ============================================================================

// GGX BRDF - 基于 GGX 分布的双向反射分布函数
// 用于物理基础渲染 (PBR) 的镜面反射计算，提供真实的金属和非金属表面反射
export const BRDF_GGX = TSL.BRDF_GGX;

// Lambert BRDF - 朗伯特双向反射分布函数
// 用于漫反射计算，模拟完全漫反射表面的光照行为
export const BRDF_Lambert = TSL.BRDF_Lambert;

// ============================================================================
// 阴影过滤器
// ============================================================================

// 基础点光源阴影过滤器 - 简单的点光源阴影采样
// 提供基本的点光源阴影效果，性能较好但质量一般
export const BasicPointShadowFilter = TSL.BasicPointShadowFilter;

// 基础阴影过滤器 - 简单的阴影采样
// 提供基本的阴影效果，适用于性能要求较高的场景
export const BasicShadowFilter = TSL.BasicShadowFilter;

// PCF 阴影过滤器 - 百分比接近过滤
// 通过多次采样提供平滑的阴影边缘，质量较好
export const PCFShadowFilter = TSL.PCFShadowFilter;

// PCF 软阴影过滤器 - 软化的百分比接近过滤
// 提供更柔和的阴影效果，模拟真实世界的软阴影
export const PCFSoftShadowFilter = TSL.PCFSoftShadowFilter;

// 点光源阴影过滤器 - 专用的点光源阴影处理
// 处理立方体贴图阴影的特殊采样需求
export const PointShadowFilter = TSL.PointShadowFilter;

// VSM 阴影过滤器 - 方差阴影映射
// 使用方差阴影映射技术，提供高质量的软阴影效果
export const VSMShadowFilter = TSL.VSMShadowFilter;

// ============================================================================
// 控制流和程序结构
// ============================================================================

// 中断语句 - 着色器中的 break 语句
// 用于跳出循环或条件分支
export const Break = TSL.Break;

// 继续语句 - 着色器中的 continue 语句
// 用于跳过当前循环迭代
export const Continue = TSL.Continue;

// 返回语句 - 着色器中的 return 语句
// 用于从函数中返回值
export const Return = TSL.Return;

// 条件语句 - 着色器中的 if 语句
// 用于条件分支控制
export const If = TSL.If;

// 循环语句 - 着色器中的循环结构
// 用于重复执行代码块
export const Loop = TSL.Loop;

// 分支语句 - 着色器中的 switch 语句
// 用于多分支选择控制
export const Switch = TSL.Switch;

// 丢弃语句 - 着色器中的 discard 语句
// 用于丢弃当前片段，常用于透明度测试
export const Discard = TSL.Discard;

// ============================================================================
// 节点系统和变量
// ============================================================================

// 常量节点 - 表示常量值的节点
// 用于在节点图中表示不变的数值
export const Const = TSL.Const;

// 变量节点 - 表示变量的节点
// 用于在节点图中存储和传递变量值
export const Var = TSL.Var;

// 变量意图 - 变量的使用意图标识
// 用于优化和调试变量的使用方式
export const VarIntent = TSL.VarIntent;

// 函数节点 - 表示函数调用的节点
// 用于在节点图中封装函数调用
export const Fn = TSL.Fn;

// 着色器节点 - 着色器程序的节点表示
// 用于构建复杂的着色器程序
export const ShaderNode = TSL.ShaderNode;

// 节点访问控制 - 节点的访问权限控制
// 用于管理节点的读写权限
export const NodeAccess = TSL.NodeAccess;

// 节点着色器阶段 - 节点所属的着色器阶段
// 标识节点在顶点、片段或计算着色器中的位置
export const NodeShaderStage = TSL.NodeShaderStage;

// 节点类型 - 节点的数据类型
// 用于类型检查和优化
export const NodeType = TSL.NodeType;

// 节点更新类型 - 节点的更新频率
// 控制节点值的更新时机
export const NodeUpdateType = TSL.NodeUpdateType;

// 堆栈节点 - 用于管理计算堆栈的节点
// 用于复杂的计算流程管理
export const Stack = TSL.Stack;

// 可脚本化节点资源 - 支持脚本化的节点资源
// 用于动态生成和管理节点资源
export const ScriptableNodeResources = TSL.ScriptableNodeResources;

// ============================================================================
// 数学常量和物理量
// ============================================================================

// 圆周率 π - 数学常量 π (3.14159...)
// 用于各种数学计算，特别是三角函数和圆形计算
export const PI = TSL.PI;

// 2π - 数学常量 2π (6.28318...)
// 用于完整圆周的角度计算
export const PI2 = TSL.PI2;

// 无穷大 - 数学常量无穷大
// 用于表示无限大的数值
export const INFINITY = TSL.INFINITY;

// 机器精度 - 浮点数的最小精度值
// 用于浮点数比较和数值稳定性计算
export const EPSILON = TSL.EPSILON;

// ============================================================================
// 高级光照函数
// ============================================================================

// DFG 近似 - 预积分的 BRDF 查找表近似
// 用于实时 PBR 渲染中的性能优化
export const DFGApprox = TSL.DFGApprox;

// GGX 分布函数 - GGX 法线分布函数
// 计算微表面法线分布，用于镜面反射计算
export const D_GGX = TSL.D_GGX;

// Schlick 菲涅尔近似 - Schlick 菲涅尔反射近似
// 计算菲涅尔反射系数，用于真实的反射效果
export const F_Schlick = TSL.F_Schlick;

// Schlick 到 F0 转换 - 将 Schlick 参数转换为 F0 值
// 用于材质参数的转换和兼容性
export const Schlick_to_F0 = TSL.Schlick_to_F0;

// Smith G 函数相关遮蔽 - Smith 几何遮蔽函数
// 计算微表面的几何遮蔽和阴影效应
export const V_GGX_SmithCorrelated = TSL.V_GGX_SmithCorrelated;

// TBN 视图矩阵 - 切线空间到视图空间的变换矩阵
// 用于法线贴图和切线空间计算
export const TBNViewMatrix = TSL.TBNViewMatrix;
// ============================================================================
// 基础数学函数
// ============================================================================

// 绝对值函数 - 计算数值的绝对值
// 返回输入值的非负值，用于距离计算和数值处理
export const abs = TSL.abs;

// 反余弦函数 - 计算反余弦值
// 返回角度值（弧度），用于角度计算和向量操作
export const acos = TSL.acos;

// 反正弦函数 - 计算反正弦值
// 返回角度值（弧度），用于角度计算和向量操作
export const asin = TSL.asin;

// 反正切函数 - 计算反正切值
// 返回角度值（弧度），用于角度计算
export const atan = TSL.atan;

// 双参数反正切函数 - 计算 atan2(y, x)
// 考虑象限的反正切函数，用于向量角度计算
export const atan2 = TSL.atan2;

// ============================================================================
// 基础算术运算
// ============================================================================

// 加法运算 - 数值或向量加法
// 支持标量、向量、矩阵的加法运算
export const add = TSL.add;

// 赋值运算 - 变量赋值操作
// 用于在着色器中给变量赋值
export const assign = TSL.assign;

// ============================================================================
// 色调映射函数
// ============================================================================

// ACES 电影色调映射 - ACES 标准的色调映射
// 提供电影级的色调映射效果，广泛用于电影和游戏
export const acesFilmicToneMapping = TSL.acesFilmicToneMapping;

// AGX 色调映射 - AGX 色调映射算法
// 现代的色调映射技术，提供自然的色彩表现
export const agxToneMapping = TSL.agxToneMapping;

// ============================================================================
// 节点系统扩展
// ============================================================================

// 方法链式调用 - 为节点添加链式调用方法
// 用于扩展节点的功能和提高代码可读性
export const addMethodChaining = TSL.addMethodChaining;

// 节点元素添加 - 向节点系统添加新元素
// 用于扩展节点系统的功能
export const addNodeElement = TSL.addNodeElement;

// ============================================================================
// 逻辑运算
// ============================================================================

// 全部为真 - 检查所有分量是否为真
// 用于向量或数组的逻辑与运算
export const all = TSL.all;

// 任意为真 - 检查是否有分量为真
// 用于向量或数组的逻辑或运算
export const any = TSL.any;

// 逻辑与 - 逻辑与运算
// 用于布尔值的与运算
export const and = TSL.and;

// ============================================================================
// 材质属性访问
// ============================================================================

// Alpha 测试阈值 - 透明度测试的阈值
// 用于透明度测试和裁剪
export const alphaT = TSL.alphaT;

// 各向异性 - 材质的各向异性属性
// 用于模拟金属拉丝等各向异性表面
export const anisotropy = TSL.anisotropy;

// 各向异性 B 分量 - 各向异性的副切线分量
// 用于各向异性材质的详细控制
export const anisotropyB = TSL.anisotropyB;

// 各向异性 T 分量 - 各向异性的切线分量
// 用于各向异性材质的详细控制
export const anisotropyT = TSL.anisotropyT;

// ============================================================================
// 数据结构操作
// ============================================================================

// 数组追加 - 向数组添加元素（已弃用）
// 用于动态构建数组结构
export const append = TSL.append;

// 数组创建 - 创建数组结构
// 用于构建向量、矩阵等数组数据
export const array = TSL.array;

// 数组缓冲区 - 创建数组缓冲区
// 用于高效的数据存储和传输
export const arrayBuffer = TSL.arrayBuffer;

// ============================================================================
// 原子操作（计算着色器）
// ============================================================================

// 原子加法 - 原子性加法操作
// 用于计算着色器中的线程安全加法
export const atomicAdd = TSL.atomicAdd;

// 原子与运算 - 原子性按位与操作
// 用于计算着色器中的线程安全位运算
export const atomicAnd = TSL.atomicAnd;

// 原子函数 - 通用原子操作函数
// 用于自定义原子操作
export const atomicFunc = TSL.atomicFunc;

// 原子加载 - 原子性数据加载
// 用于计算着色器中的线程安全数据读取
export const atomicLoad = TSL.atomicLoad;

// 原子最大值 - 原子性最大值操作
// 用于计算着色器中的线程安全最大值计算
export const atomicMax = TSL.atomicMax;

// 原子最小值 - 原子性最小值操作
// 用于计算着色器中的线程安全最小值计算
export const atomicMin = TSL.atomicMin;

// 原子或运算 - 原子性按位或操作
// 用于计算着色器中的线程安全位运算
export const atomicOr = TSL.atomicOr;

// 原子存储 - 原子性数据存储
// 用于计算着色器中的线程安全数据写入
export const atomicStore = TSL.atomicStore;

// 原子减法 - 原子性减法操作
// 用于计算着色器中的线程安全减法
export const atomicSub = TSL.atomicSub;

// 原子异或 - 原子性按位异或操作
// 用于计算着色器中的线程安全位运算
export const atomicXor = TSL.atomicXor;
// ============================================================================
// 材质衰减属性
// ============================================================================

// 衰减颜色 - 材质的衰减颜色
// 用于体积散射和透射材质的颜色衰减
export const attenuationColor = TSL.attenuationColor;

// 衰减距离 - 材质的衰减距离
// 控制光线在材质中的衰减程度
export const attenuationDistance = TSL.attenuationDistance;

// ============================================================================
// 属性和缓冲区访问
// ============================================================================

// 属性访问 - 访问顶点属性
// 用于获取顶点的位置、法线、UV 等属性
export const attribute = TSL.attribute;

// 属性数组 - 访问属性数组
// 用于批量处理顶点属性数据
export const attributeArray = TSL.attributeArray;

// 缓冲区 - 通用缓冲区访问
// 用于访问各种 GPU 缓冲区数据
export const buffer = TSL.buffer;

// 缓冲区属性 - 缓冲区属性访问
// 用于访问缓冲几何体的属性数据
export const bufferAttribute = TSL.bufferAttribute;

// ============================================================================
// 背景和环境属性
// ============================================================================

// 背景模糊度 - 背景的模糊程度
// 用于控制环境贴图的模糊效果
export const backgroundBlurriness = TSL.backgroundBlurriness;

// 背景强度 - 背景的亮度强度
// 用于控制环境光照的强度
export const backgroundIntensity = TSL.backgroundIntensity;

// 背景旋转 - 背景的旋转角度
// 用于旋转环境贴图的方向
export const backgroundRotation = TSL.backgroundRotation;

// ============================================================================
// 渲染批处理和几何变换
// ============================================================================

// 批处理 - 渲染批处理信息
// 用于批量渲染优化
export const batch = TSL.batch;

// 广告牌效果 - 使对象始终面向相机
// 用于粒子系统和精灵渲染
export const billboarding = TSL.billboarding;

// ============================================================================
// 几何属性 - 副切线向量
// ============================================================================

// 几何副切线 - 几何体空间的副切线向量
// 用于切线空间计算和法线贴图
export const bitangentGeometry = TSL.bitangentGeometry;

// 局部副切线 - 局部空间的副切线向量
// 用于对象空间的切线计算
export const bitangentLocal = TSL.bitangentLocal;

// 视图副切线 - 视图空间的副切线向量
// 用于视图空间的光照计算
export const bitangentView = TSL.bitangentView;

// 世界副切线 - 世界空间的副切线向量
// 用于世界空间的光照和反射计算
export const bitangentWorld = TSL.bitangentWorld;

// 弯曲法线视图 - 环境遮蔽的弯曲法线
// 用于高级的环境遮蔽效果
export const bentNormalView = TSL.bentNormalView;

// ============================================================================
// 位运算操作
// ============================================================================

// 按位与 - 位运算与操作
// 用于整数的位级操作
export const bitAnd = TSL.bitAnd;

// 按位非 - 位运算非操作
// 用于整数的位级取反
export const bitNot = TSL.bitNot;

// 按位或 - 位运算或操作
// 用于整数的位级或运算
export const bitOr = TSL.bitOr;

// 按位异或 - 位运算异或操作
// 用于整数的位级异或运算
export const bitXor = TSL.bitXor;

// 位类型转换 - 位级类型转换
// 用于不同数据类型的位级转换
export const bitcast = TSL.bitcast;

// ============================================================================
// 混合模式和后处理效果
// ============================================================================

// 燃烧混合 - 燃烧混合模式
// 用于图像混合和后处理效果
export const blendBurn = TSL.blendBurn;

// 颜色混合 - 颜色混合模式
// 用于颜色的混合计算
export const blendColor = TSL.blendColor;

// 减淡混合 - 减淡混合模式
// 用于图像的减淡效果
export const blendDodge = TSL.blendDodge;

// 叠加混合 - 叠加混合模式
// 用于图像的叠加效果
export const blendOverlay = TSL.blendOverlay;

// 屏幕混合 - 屏幕混合模式
// 用于图像的屏幕混合效果
export const blendScreen = TSL.blendScreen;

// 燃烧效果 - 燃烧后处理效果（已弃用）
// 用于创建燃烧视觉效果
export const burn = TSL.burn;

// 模糊效果 - 图像模糊处理
// 用于各种模糊后处理效果
export const blur = TSL.blur;

// ============================================================================
// 数据类型 - 布尔向量
// ============================================================================

// 布尔类型 - 布尔值类型
// 用于逻辑运算和条件判断
export const bool = TSL.bool;

// 2D 布尔向量 - 二维布尔向量类型
// 用于二维逻辑运算
export const bvec2 = TSL.bvec2;

// 3D 布尔向量 - 三维布尔向量类型
// 用于三维逻辑运算
export const bvec3 = TSL.bvec3;

// 4D 布尔向量 - 四维布尔向量类型
// 用于四维逻辑运算和 RGBA 逻辑操作
export const bvec4 = TSL.bvec4;

// ============================================================================
// 纹理映射
// ============================================================================

// 凹凸贴图 - 凹凸贴图采样和计算
// 用于表面细节的凹凸效果
export const bumpMap = TSL.bumpMap;
// ============================================================================
// 节点系统控制和缓存
// ============================================================================

// 绕过节点 - 绕过当前节点的处理
// 用于条件性跳过某些节点的计算
export const bypass = TSL.bypass;

// 缓存节点 - 缓存节点计算结果
// 用于避免重复计算，提高性能
export const cache = TSL.cache;

// 函数调用 - 调用自定义函数
// 用于在节点图中调用用户定义的函数
export const call = TSL.call;

// 上下文节点 - 获取当前渲染上下文
// 用于访问渲染状态和环境信息
export const context = TSL.context;

// ============================================================================
// 相机参数访问
// ============================================================================

// 相机远平面 - 相机的远裁剪平面距离
// 用于深度计算和视锥体裁剪
export const cameraFar = TSL.cameraFar;

// 相机索引 - 当前相机的索引
// 用于多相机渲染中的相机识别
export const cameraIndex = TSL.cameraIndex;

// 相机近平面 - 相机的近裁剪平面距离
// 用于深度计算和视锥体裁剪
export const cameraNear = TSL.cameraNear;

// 相机法线矩阵 - 相机的法线变换矩阵
// 用于将法线从模型空间变换到视图空间
export const cameraNormalMatrix = TSL.cameraNormalMatrix;

// 相机位置 - 相机在世界空间中的位置
// 用于光照计算和反射效果
export const cameraPosition = TSL.cameraPosition;

// 相机投影矩阵 - 相机的投影变换矩阵
// 用于将视图空间坐标变换到裁剪空间
export const cameraProjectionMatrix = TSL.cameraProjectionMatrix;

// 相机投影逆矩阵 - 相机投影矩阵的逆矩阵
// 用于从裁剪空间反变换到视图空间
export const cameraProjectionMatrixInverse = TSL.cameraProjectionMatrixInverse;

// 相机视图矩阵 - 相机的视图变换矩阵
// 用于将世界空间坐标变换到视图空间
export const cameraViewMatrix = TSL.cameraViewMatrix;

// 相机世界矩阵 - 相机的世界变换矩阵
// 用于相机在世界空间中的变换
export const cameraWorldMatrix = TSL.cameraWorldMatrix;

// ============================================================================
// 高级数学函数
// ============================================================================

// 立方根函数 - 计算立方根
// 返回输入值的立方根，用于特殊的数学计算
export const cbrt = TSL.cbrt;

// 余弦函数 - 计算余弦值
// 返回角度的余弦值，用于三角函数计算
export const cos = TSL.cos;

// 向上取整 - 向上取整到最近的整数
// 返回大于或等于输入值的最小整数
export const ceil = TSL.ceil;

// 向量叉积 - 计算两个向量的叉积
// 返回垂直于两个输入向量的向量，用于法线计算
export const cross = TSL.cross;

// ============================================================================
// 色彩管理和色调映射
// ============================================================================

// CDL 色彩校正 - ASC CDL 色彩决策列表
// 用于电影级的色彩校正和调色
export const cdl = TSL.cdl;

// Cineon 色调映射 - Cineon 色调映射算法
// 用于电影胶片风格的色调映射
export const cineonToneMapping = TSL.cineonToneMapping;

// 数值钳制 - 将数值限制在指定范围内
// 确保数值在最小值和最大值之间
export const clamp = TSL.clamp;

// 颜色节点 - 创建颜色值
// 用于定义和操作颜色数据
export const color = TSL.color;

// 色彩空间转换到工作空间 - 将色彩空间转换为工作色彩空间
// 用于色彩管理和一致性处理
export const colorSpaceToWorking = TSL.colorSpaceToWorking;

// 颜色转方向 - 将颜色值转换为方向向量
// 用于法线贴图和方向编码
export const colorToDirection = TSL.colorToDirection;

// ============================================================================
// 材质属性 - 清漆层
// ============================================================================

// 清漆强度 - 材质清漆层的强度
// 用于汽车漆面等多层材质效果
export const clearcoat = TSL.clearcoat;

// 清漆法线视图 - 清漆层的法线在视图空间中的表示
// 用于清漆层的光照计算
export const clearcoatNormalView = TSL.clearcoatNormalView;

// 清漆粗糙度 - 清漆层的表面粗糙度
// 控制清漆层的反射模糊程度
export const clearcoatRoughness = TSL.clearcoatRoughness;

// ============================================================================
// 纹理和图案生成
// ============================================================================

// 棋盘图案 - 生成棋盘格图案
// 用于程序化纹理生成和测试
export const checker = TSL.checker;

// 立方体纹理 - 立方体贴图纹理采样
// 用于环境映射和反射效果
export const cubeTexture = TSL.cubeTexture;

// 立方体纹理基础 - 立方体纹理的基础采样
// 提供立方体纹理的底层采样功能
export const cubeTextureBase = TSL.cubeTextureBase;

// 立方体到UV转换 - 将立方体坐标转换为UV坐标
// 用于立方体贴图的UV映射
export const cubeToUV = TSL.cubeToUV;

// ============================================================================
// 计算着色器和代码生成
// ============================================================================

// 代码节点 - 插入自定义着色器代码
// 用于在节点图中嵌入原始着色器代码
export const code = TSL.code;

// 计算着色器 - 创建计算着色器
// 用于 GPU 并行计算任务
export const compute = TSL.compute;

// 计算内核 - 计算着色器的内核函数
// 定义计算着色器的主要计算逻辑
export const computeKernel = TSL.computeKernel;

// 计算蒙皮 - GPU 加速的骨骼蒙皮计算
// 用于高性能的骨骼动画处理
export const computeSkinning = TSL.computeSkinning;

// ============================================================================
// 数据转换和处理
// ============================================================================

// 转换函数 - 通用数据类型转换
// 用于不同数据类型之间的转换
export const convert = TSL.convert;

// 色彩空间转换 - 在不同色彩空间间转换
// 用于色彩管理和显示适配
export const convertColorSpace = TSL.convertColorSpace;

// 转换为纹理 - 将数据转换为纹理格式
// 用于动态纹理生成和数据可视化
export const convertToTexture = TSL.convertToTexture;
// ============================================================================
// 偏导数和微分函数
// ============================================================================

// X 方向偏导数 - 计算 X 方向的偏导数
// 用于边缘检测和法线计算
export const dFdx = TSL.dFdx;

// Y 方向偏导数 - 计算 Y 方向的偏导数
// 用于边缘检测和法线计算
export const dFdy = TSL.dFdy;

// ============================================================================
// 线条和调试功能
// ============================================================================

// 虚线大小 - 虚线材质的线段大小
// 用于虚线效果的控制
export const dashSize = TSL.dashSize;

// 调试节点 - 调试信息输出
// 用于着色器调试和可视化
export const debug = TSL.debug;

// ============================================================================
// 数值操作函数
// ============================================================================

// 递减操作 - 数值递减（后递减）
// 用于循环计数和数值操作
export const decrement = TSL.decrement;

// 前递减操作 - 数值递减（前递减）
// 用于循环计数和数值操作
export const decrementBefore = TSL.decrementBefore;

// ============================================================================
// 着色器构建配置
// ============================================================================

// 默认构建阶段 - 默认的着色器构建阶段
// 定义着色器编译的默认流程
export const defaultBuildStages = TSL.defaultBuildStages;

// 默认着色器阶段 - 默认的着色器执行阶段
// 定义着色器执行的默认阶段
export const defaultShaderStages = TSL.defaultShaderStages;

// ============================================================================
// 条件和时间函数
// ============================================================================

// 已定义检查 - 检查变量是否已定义
// 用于条件编译和错误检查
export const defined = TSL.defined;

// 弧度转角度 - 将弧度转换为角度
// 用于角度单位转换
export const degrees = TSL.degrees;

// 时间增量 - 帧间时间差
// 用于动画和时间相关的计算
export const deltaTime = TSL.deltaTime;

// ============================================================================
// 深度和雾效
// ============================================================================

// 密度雾 - 基于密度的雾效果（已弃用）
// 用于体积雾和大气效果
export const densityFog = TSL.densityFog;

// 密度雾因子 - 密度雾的衰减因子
// 控制雾效果的强度和分布
export const densityFogFactor = TSL.densityFogFactor;

// 深度值 - 当前像素的深度值
// 用于深度测试和深度相关效果
export const depth = TSL.depth;

// 深度通道 - 深度渲染通道
// 用于深度预渲染和深度相关处理
export const depthPass = TSL.depthPass;

// ============================================================================
// 矩阵和几何运算
// ============================================================================

// 行列式 - 计算矩阵的行列式
// 用于矩阵运算和几何变换
export const determinant = TSL.determinant;

// 差值运算 - 计算两个值的差
// 用于数值比较和变化检测
export const difference = TSL.difference;

// 距离函数 - 计算两点间的距离
// 用于空间计算和距离场
export const distance = TSL.distance;

// 除法运算 - 数值除法
// 用于数学计算和比例运算
export const div = TSL.div;

// 点积运算 - 计算向量点积
// 用于角度计算和投影运算
export const dot = TSL.dot;

// ============================================================================
// 材质颜色属性
// ============================================================================

// 漫反射颜色 - 材质的漫反射颜色
// 用于基础的漫反射光照计算
export const diffuseColor = TSL.diffuseColor;

// 自发光颜色 - 材质的自发光颜色
// 用于发光效果和自发光材质
export const emissive = TSL.emissive;

// 色散效果 - 材质的色散属性
// 用于模拟光的色散现象，如彩虹效果
export const dispersion = TSL.dispersion;

// ============================================================================
// 光照计算
// ============================================================================

// 直接点光源 - 直接点光源光照计算
// 用于点光源的直接光照效果
export const directPointLight = TSL.directPointLight;

// 方向转颜色 - 将方向向量转换为颜色
// 用于法线可视化和方向编码
export const directionToColor = TSL.directionToColor;

// 方向转面方向 - 将方向转换为面朝向
// 用于双面材质和背面剔除
export const directionToFaceDirection = TSL.directionToFaceDirection;

// ============================================================================
// 混合和特效
// ============================================================================

// 减淡效果 - 减淡混合效果（已弃用）
// 用于图像混合和特殊效果
export const dodge = TSL.dodge;

// ============================================================================
// 渲染和缓冲区
// ============================================================================

// 绘制索引 - 当前绘制调用的索引
// 用于多绘制调用的识别
export const drawIndex = TSL.drawIndex;

// 动态缓冲属性 - 动态更新的缓冲区属性
// 用于动态几何体和实时数据更新
export const dynamicBufferAttribute = TSL.dynamicBufferAttribute;

// 元素访问 - 访问数组或向量的元素
// 用于数据结构的元素访问
export const element = TSL.element;

// ============================================================================
// 比较和逻辑运算
// ============================================================================

// 相等比较 - 数值相等比较
// 用于条件判断和逻辑运算
export const equal = TSL.equal;

// 相等判断 - 值相等判断（已弃用）
// 用于条件判断和逻辑运算
export const equals = TSL.equals;

// ============================================================================
// UV 坐标和指数函数
// ============================================================================

// 等距柱状投影 UV - 等距柱状投影的 UV 坐标
// 用于全景图和环境贴图的 UV 映射
export const equirectUV = TSL.equirectUV;

// 指数函数 - 自然指数函数 e^x
// 用于指数增长和衰减计算
export const exp = TSL.exp;

// 2的指数函数 - 2^x 指数函数
// 用于二进制相关的指数计算
export const exp2 = TSL.exp2;

// 表达式节点 - 自定义表达式
// 用于创建复杂的数学表达式
export const expression = TSL.expression;
// ============================================================================
// 面向和几何方向
// ============================================================================

// 面方向 - 当前面的朝向
// 用于确定面的正面或背面
export const faceDirection = TSL.faceDirection;

// 面向前方 - 使向量面向前方
// 用于法线方向的调整
export const faceForward = TSL.faceForward;

// 面向前方（别名） - faceForward 的别名
// 用于法线方向的调整
export const faceforward = TSL.faceforward;

// 正面朝向 - 检查是否为正面
// 用于双面材质和背面剔除
export const frontFacing = TSL.frontFacing;

// ============================================================================
// 数据类型和数学函数
// ============================================================================

// 浮点数类型 - 浮点数数据类型
// 用于声明浮点数变量
export const float = TSL.float;

// 向下取整 - 向下取整到最近的整数
// 返回小于或等于输入值的最大整数
export const floor = TSL.floor;

// 小数部分 - 获取数值的小数部分
// 返回数值减去其整数部分的结果
export const fract = TSL.fract;

// 偏导数宽度 - 计算偏导数的宽度
// 用于抗锯齿和边缘检测
export const fwidth = TSL.fwidth;

// ============================================================================
// 雾效和帧管理
// ============================================================================

// 雾效 - 雾效果计算
// 用于大气透视和景深效果
export const fog = TSL.fog;

// 帧组 - 帧分组标识
// 用于多帧渲染和时间管理
export const frameGroup = TSL.frameGroup;

// 帧 ID - 当前帧的标识
// 用于帧间动画和时间相关计算
export const frameId = TSL.frameId;

// ============================================================================
// 线条属性
// ============================================================================

// 增益函数 - 增益调整函数
// 用于对比度和亮度调整
export const gain = TSL.gain;

// 间隙大小 - 虚线材质的间隙大小
// 用于虚线效果的控制
export const gapSize = TSL.gapSize;

// ============================================================================
// 节点系统工具函数
// ============================================================================

// 获取常量节点类型 - 获取常量节点的数据类型
// 用于节点系统的类型推断
export const getConstNodeType = TSL.getConstNodeType;

// 获取当前堆栈 - 获取当前的计算堆栈
// 用于复杂计算的状态管理
export const getCurrentStack = TSL.getCurrentStack;

// ============================================================================
// 几何和光照工具函数
// ============================================================================

// 获取方向 - 获取光照或视图方向
// 用于光照计算和方向相关效果
export const getDirection = TSL.getDirection;

// 获取距离衰减 - 计算光源的距离衰减
// 用于点光源和聚光灯的衰减计算
export const getDistanceAttenuation = TSL.getDistanceAttenuation;

// 获取几何粗糙度 - 从几何体获取粗糙度信息
// 用于基于几何的粗糙度计算
export const getGeometryRoughness = TSL.getGeometryRoughness;

// 从深度获取法线 - 从深度缓冲重建法线
// 用于屏幕空间法线重建
export const getNormalFromDepth = TSL.getNormalFromDepth;

// 获取视差校正法线 - 获取视差校正后的法线
// 用于视差贴图和立体效果
export const getParallaxCorrectNormal = TSL.getParallaxCorrectNormal;

// 获取粗糙度 - 获取材质的粗糙度值
// 用于 PBR 材质的粗糙度计算
export const getRoughness = TSL.getRoughness;

// 获取屏幕位置 - 获取屏幕空间坐标
// 用于屏幕空间效果和后处理
export const getScreenPosition = TSL.getScreenPosition;

// 获取球谐光照 - 在指定位置获取球谐光照
// 用于全局光照和环境光照
export const getShIrradianceAt = TSL.getShIrradianceAt;

// 获取阴影材质 - 获取阴影渲染的材质
// 用于阴影映射和阴影渲染
export const getShadowMaterial = TSL.getShadowMaterial;

// 获取阴影渲染对象函数 - 获取阴影渲染的对象函数
// 用于自定义阴影渲染逻辑
export const getShadowRenderObjectFunction = TSL.getShadowRenderObjectFunction;

// 获取纹理索引 - 获取纹理数组的索引
// 用于纹理数组和纹理图集
export const getTextureIndex = TSL.getTextureIndex;

// 获取视图位置 - 获取视图空间中的位置
// 用于视图空间的计算和效果
export const getViewPosition = TSL.getViewPosition;

// ============================================================================
// 计算着色器和并行计算
// ============================================================================

// 全局 ID - 计算着色器的全局线程 ID
// 用于计算着色器中的线程识别
export const globalId = TSL.globalId;

// ============================================================================
// 着色器语言集成
// ============================================================================

// GLSL 代码 - 嵌入 GLSL 着色器代码
// 用于在 TSL 中使用原生 GLSL 代码
export const glsl = TSL.glsl;

// GLSL 函数 - 创建 GLSL 函数
// 用于封装 GLSL 函数调用
export const glslFn = TSL.glslFn;

// ============================================================================
// 图像处理和颜色调整
// ============================================================================

// 灰度转换 - 将彩色转换为灰度
// 用于灰度效果和亮度计算
export const grayscale = TSL.grayscale;

// 色相调整 - 调整颜色的色相
// 用于色彩校正和艺术效果
export const hue = TSL.hue;

// ============================================================================
// 比较运算
// ============================================================================

// 大于比较 - 数值大于比较
// 用于条件判断和逻辑运算
export const greaterThan = TSL.greaterThan;

// 大于等于比较 - 数值大于等于比较
// 用于条件判断和逻辑运算
export const greaterThanEqual = TSL.greaterThanEqual;

// ============================================================================
// 哈希和矩阵
// ============================================================================

// 哈希函数 - 计算哈希值
// 用于随机数生成和噪声函数
export const hash = TSL.hash;

// 高精度模型法线视图矩阵 - 高精度的模型法线视图变换矩阵
// 用于高精度的法线变换
export const highpModelNormalViewMatrix = TSL.highpModelNormalViewMatrix;

// 高精度模型视图矩阵 - 高精度的模型视图变换矩阵
// 用于高精度的几何变换
export const highpModelViewMatrix = TSL.highpModelViewMatrix;
// ============================================================================
// 数值递增操作
// ============================================================================

// 递增操作 - 数值递增（后递增）
// 用于循环计数和数值操作
export const increment = TSL.increment;

// 前递增操作 - 数值递增（前递增）
// 用于循环计数和数值操作
export const incrementBefore = TSL.incrementBefore;

// ============================================================================
// 实例化渲染
// ============================================================================

// 实例 - 实例化渲染的实例信息
// 用于实例化渲染中的实例识别
export const instance = TSL.instance;

// 实例索引 - 当前实例的索引
// 用于实例化渲染中的实例区分
export const instanceIndex = TSL.instanceIndex;

// 实例化数组 - 实例化数据数组
// 用于存储实例化渲染的数据
export const instancedArray = TSL.instancedArray;

// 实例化缓冲属性 - 实例化的缓冲区属性
// 用于实例化渲染的属性数据
export const instancedBufferAttribute = TSL.instancedBufferAttribute;

// 实例化动态缓冲属性 - 动态更新的实例化缓冲属性
// 用于动态实例化渲染
export const instancedDynamicBufferAttribute = TSL.instancedDynamicBufferAttribute;

// 实例化网格 - 实例化网格对象
// 用于高效渲染大量相同几何体
export const instancedMesh = TSL.instancedMesh;

// ============================================================================
// 数据类型 - 整数
// ============================================================================

// 整数类型 - 整数数据类型
// 用于声明整数变量
export const int = TSL.int;

// ============================================================================
// 数学运算 - 逆运算
// ============================================================================

// 逆矩阵 - 计算矩阵的逆
// 用于矩阵运算和几何变换
export const inverse = TSL.inverse;

// 平方根倒数 - 计算平方根的倒数
// 用于向量归一化和数学计算
export const inverseSqrt = TSL.inverseSqrt;

// 平方根倒数（别名） - inverseSqrt 的别名
// 用于向量归一化和数学计算
export const inversesqrt = TSL.inversesqrt;

// ============================================================================
// 计算着色器 - 调用和子组
// ============================================================================

// 调用本地索引 - 工作组内的本地调用索引
// 用于计算着色器的线程管理
export const invocationLocalIndex = TSL.invocationLocalIndex;

// 调用子组索引 - 子组内的调用索引
// 用于计算着色器的子组操作
export const invocationSubgroupIndex = TSL.invocationSubgroupIndex;

// ============================================================================
// 材质属性 - 光学属性
// ============================================================================

// 折射率 - 材质的折射率
// 用于透明材质和折射效果
export const ior = TSL.ior;

// 彩虹色 - 材质的彩虹色效果
// 用于模拟肥皂泡、油膜等彩虹色现象
export const iridescence = TSL.iridescence;

// 彩虹色折射率 - 彩虹色效果的折射率
// 用于控制彩虹色的强度
export const iridescenceIOR = TSL.iridescenceIOR;

// 彩虹色厚度 - 彩虹色薄膜的厚度
// 用于控制彩虹色的分布
export const iridescenceThickness = TSL.iridescenceThickness;

// ============================================================================
// 数据类型 - 整数向量
// ============================================================================

// 2D 整数向量 - 二维整数向量类型
// 用于整数坐标和索引
export const ivec2 = TSL.ivec2;

// 3D 整数向量 - 三维整数向量类型
// 用于三维整数坐标和索引
export const ivec3 = TSL.ivec3;

// 4D 整数向量 - 四维整数向量类型
// 用于四维整数坐标和 RGBA 整数值
export const ivec4 = TSL.ivec4;

// ============================================================================
// 脚本集成和标签
// ============================================================================

// JavaScript 集成 - JavaScript 代码集成
// 用于在着色器中集成 JavaScript 逻辑
export const js = TSL.js;

// 标签 - 节点标签（已弃用）
// 用于节点的标识和调试
export const label = TSL.label;

// ============================================================================
// 向量运算
// ============================================================================

// 向量长度 - 计算向量的长度
// 用于向量归一化和距离计算
export const length = TSL.length;

// 向量长度平方 - 计算向量长度的平方
// 用于避免开方运算的性能优化
export const lengthSq = TSL.lengthSq;

// ============================================================================
// 比较运算
// ============================================================================

// 小于比较 - 数值小于比较
// 用于条件判断和逻辑运算
export const lessThan = TSL.lessThan;

// 小于等于比较 - 数值小于等于比较
// 用于条件判断和逻辑运算
export const lessThanEqual = TSL.lessThanEqual;
// ============================================================================
// 光照系统
// ============================================================================

// 光源位置 - 光源在世界空间中的位置
// 用于光照计算和阴影生成
export const lightPosition = TSL.lightPosition;

// 光源投影 UV - 光源投影的 UV 坐标
// 用于投影纹理和光源贴图
export const lightProjectionUV = TSL.lightProjectionUV;

// 光源阴影矩阵 - 光源的阴影变换矩阵
// 用于阴影映射和阴影计算
export const lightShadowMatrix = TSL.lightShadowMatrix;

// 光源目标方向 - 聚光灯的目标方向
// 用于聚光灯的方向控制
export const lightTargetDirection = TSL.lightTargetDirection;

// 光源目标位置 - 聚光灯的目标位置
// 用于聚光灯的目标定位
export const lightTargetPosition = TSL.lightTargetPosition;

// 光源视图位置 - 光源在视图空间中的位置
// 用于视图空间的光照计算
export const lightViewPosition = TSL.lightViewPosition;

// 光照上下文 - 光照计算的上下文信息
// 包含光照计算所需的各种参数
export const lightingContext = TSL.lightingContext;

// 光源数组 - 场景中的所有光源
// 用于多光源光照计算
export const lights = TSL.lights;

// ============================================================================
// 深度和色调映射
// ============================================================================

// 线性深度 - 线性化的深度值
// 用于深度相关的计算和效果
export const linearDepth = TSL.linearDepth;

// 线性色调映射 - 线性色调映射算法
// 用于简单的线性色调映射
export const linearToneMapping = TSL.linearToneMapping;

// ============================================================================
// 计算着色器标识
// ============================================================================

// 本地 ID - 工作组内的本地线程 ID
// 用于计算着色器的线程管理
export const localId = TSL.localId;

// ============================================================================
// 数学函数 - 对数
// ============================================================================

// 自然对数 - 计算自然对数 ln(x)
// 用于对数运算和数学计算
export const log = TSL.log;

// 以2为底的对数 - 计算以2为底的对数
// 用于二进制相关的对数计算
export const log2 = TSL.log2;

// 对数深度转视图Z - 将对数深度转换为视图空间Z值
// 用于对数深度缓冲的深度重建
export const logarithmicDepthToViewZ = TSL.logarithmicDepthToViewZ;

// ============================================================================
// 颜色和亮度
// ============================================================================

// 亮度计算 - 计算颜色的亮度值
// 用于亮度相关的计算和效果
export const luminance = TSL.luminance;
// ============================================================================
// 数据类型 - 矩阵
// ============================================================================

// 2x2 矩阵 - 二维矩阵类型
// 用于 2D 变换和计算
export const mat2 = TSL.mat2;

// 3x3 矩阵 - 三维矩阵类型
// 用于 3D 变换和法线变换
export const mat3 = TSL.mat3;

// 4x4 矩阵 - 四维矩阵类型
// 用于 3D 变换和投影变换
export const mat4 = TSL.mat4;

// ============================================================================
// 特殊 UV 坐标
// ============================================================================

// MatCap UV - MatCap 材质的 UV 坐标
// 用于 MatCap（材质捕获）渲染技术
export const matcapUV = TSL.matcapUV;

// ============================================================================
// 材质属性访问
// ============================================================================

// 材质环境遮蔽 - 材质的环境遮蔽值
// 用于增强表面细节和深度感
export const materialAO = TSL.materialAO;

// 材质 Alpha 测试 - 材质的透明度测试阈值
// 用于透明度裁剪和抗锯齿
export const materialAlphaTest = TSL.materialAlphaTest;

// 材质各向异性 - 材质的各向异性强度
// 用于金属拉丝等各向异性表面效果
export const materialAnisotropy = TSL.materialAnisotropy;

// 材质各向异性向量 - 各向异性的方向向量
// 控制各向异性效果的方向
export const materialAnisotropyVector = TSL.materialAnisotropyVector;

// 材质衰减颜色 - 材质的体积衰减颜色
// 用于透明材质的颜色衰减效果
export const materialAttenuationColor = TSL.materialAttenuationColor;

// 材质衰减距离 - 材质的体积衰减距离
// 控制透明材质的衰减程度
export const materialAttenuationDistance = TSL.materialAttenuationDistance;

// 材质清漆 - 材质的清漆层强度
// 用于汽车漆面等多层材质效果
export const materialClearcoat = TSL.materialClearcoat;

// 材质清漆法线 - 清漆层的法线贴图
// 用于清漆层的表面细节
export const materialClearcoatNormal = TSL.materialClearcoatNormal;

// 材质清漆粗糙度 - 清漆层的粗糙度
// 控制清漆层的反射模糊程度
export const materialClearcoatRoughness = TSL.materialClearcoatRoughness;

// 材质颜色 - 材质的基础颜色
// 材质的主要颜色属性
export const materialColor = TSL.materialColor;

// 材质色散 - 材质的色散效果
// 用于模拟光的色散现象
export const materialDispersion = TSL.materialDispersion;

// 材质自发光 - 材质的自发光颜色
// 用于发光效果和自发光材质
export const materialEmissive = TSL.materialEmissive;

// 材质环境强度 - 环境贴图的强度
// 控制环境反射的强度
export const materialEnvIntensity = TSL.materialEnvIntensity;

// 材质环境旋转 - 环境贴图的旋转角度
// 用于调整环境贴图的方向
export const materialEnvRotation = TSL.materialEnvRotation;

// 材质折射率 - 材质的折射率
// 用于透明材质和折射效果
export const materialIOR = TSL.materialIOR;

// 材质彩虹色 - 材质的彩虹色效果
// 用于模拟肥皂泡等彩虹色现象
export const materialIridescence = TSL.materialIridescence;

// 材质彩虹色折射率 - 彩虹色的折射率
// 控制彩虹色效果的强度
export const materialIridescenceIOR = TSL.materialIridescenceIOR;

// 材质彩虹色厚度 - 彩虹色薄膜的厚度
// 控制彩虹色的分布和强度
export const materialIridescenceThickness = TSL.materialIridescenceThickness;

// 材质光照贴图 - 材质的光照贴图
// 用于预计算的光照信息
export const materialLightMap = TSL.materialLightMap;

// 材质线条虚线偏移 - 虚线的偏移量
// 用于动画虚线效果
export const materialLineDashOffset = TSL.materialLineDashOffset;

// 材质线条虚线大小 - 虚线的线段大小
// 控制虚线的线段长度
export const materialLineDashSize = TSL.materialLineDashSize;

// 材质线条间隙大小 - 虚线的间隙大小
// 控制虚线的间隙长度
export const materialLineGapSize = TSL.materialLineGapSize;

// 材质线条缩放 - 线条的缩放比例
// 用于线条粗细的缩放
export const materialLineScale = TSL.materialLineScale;

// 材质线条宽度 - 线条的宽度
// 控制线条材质的粗细
export const materialLineWidth = TSL.materialLineWidth;

// 材质金属度 - 材质的金属性
// 用于 PBR 材质的金属/非金属区分
export const materialMetalness = TSL.materialMetalness;

// 材质法线 - 材质的法线贴图
// 用于表面细节和凹凸效果
export const materialNormal = TSL.materialNormal;

// 材质不透明度 - 材质的透明度值
// 控制材质的透明程度，0为完全透明，1为完全不透明
export const materialOpacity = TSL.materialOpacity;

// 材质点大小 - 点材质的点大小
// 用于点云渲染中控制点的大小
export const materialPointSize = TSL.materialPointSize;

// 材质引用 - 材质的引用信息
// 用于材质系统的内部引用和管理
export const materialReference = TSL.materialReference;

// 材质反射率 - 材质的反射强度
// 控制材质表面的反射程度
export const materialReflectivity = TSL.materialReflectivity;

// 材质折射比 - 材质的折射比率
// 用于透明材质的折射效果计算
export const materialRefractionRatio = TSL.materialRefractionRatio;

// 材质旋转 - 材质的旋转角度
// 用于旋转材质的纹理或图案
export const materialRotation = TSL.materialRotation;

// 材质粗糙度 - 材质表面的粗糙程度
// 用于 PBR 材质的表面粗糙度控制，影响反射的模糊程度
export const materialRoughness = TSL.materialRoughness;

// 材质光泽 - 材质的光泽效果
// 用于模拟织物等材质的光泽现象
export const materialSheen = TSL.materialSheen;

// 材质光泽粗糙度 - 光泽效果的粗糙度
// 控制光泽效果的模糊程度
export const materialSheenRoughness = TSL.materialSheenRoughness;

// 材质光泽度 - 材质的光泽强度（传统光照模型）
// 用于 Phong 等传统光照模型的光泽度控制
export const materialShininess = TSL.materialShininess;

// 材质镜面反射 - 材质的镜面反射属性
// 用于传统光照模型的镜面反射计算
export const materialSpecular = TSL.materialSpecular;

// 材质镜面反射颜色 - 镜面反射的颜色
// 控制镜面反射的颜色特性
export const materialSpecularColor = TSL.materialSpecularColor;

// 材质镜面反射强度 - 镜面反射的强度
// 控制镜面反射的亮度
export const materialSpecularIntensity = TSL.materialSpecularIntensity;

// 材质镜面反射强度（别名） - 镜面反射强度的另一种表示
// 用于兼容不同的材质系统
export const materialSpecularStrength = TSL.materialSpecularStrength;

// 材质厚度 - 材质的厚度属性
// 用于体积散射和透射效果
export const materialThickness = TSL.materialThickness;

// 材质透射 - 材质的透射属性
// 用于模拟光线穿透材质的效果
export const materialTransmission = TSL.materialTransmission;
// ============================================================================
// 数学函数 - 最值和混合
// ============================================================================

// 最大值函数 - 返回两个值中的较大值
// 用于数值比较和范围限制
export const max = TSL.max;

// 最小值函数 - 返回两个值中的较小值
// 用于数值比较和范围限制
export const min = TSL.min;

// 混合函数 - 线性插值混合两个值
// 根据混合因子在两个值之间进行线性插值
export const mix = TSL.mix;

// 元素混合 - 对向量元素进行混合
// 对向量的各个分量分别进行混合操作
export const mixElement = TSL.mixElement;

// 取模运算 - 计算模运算（余数）
// 返回除法运算的余数，用于周期性计算
export const mod = TSL.mod;

// 整数取模运算 - 整数的模运算（已弃用）
// 专门用于整数的模运算，已被 mod 函数替代
export const modInt = TSL.modInt;

// ============================================================================
// 纹理和采样
// ============================================================================

// 最大 Mip 级别 - 纹理的最大 Mip 映射级别
// 用于纹理采样和 LOD 计算
export const maxMipLevel = TSL.maxMipLevel;

// 金属度 - 材质的金属度属性（简化访问）
// 用于快速访问材质的金属度值
export const metalness = TSL.metalness;

// ============================================================================
// 模型变换矩阵
// ============================================================================

// 中精度模型视图矩阵 - 中等精度的模型视图变换矩阵
// 用于性能优化的中精度几何变换
export const mediumpModelViewMatrix = TSL.mediumpModelViewMatrix;

// 模型方向 - 模型空间中的方向向量
// 用于方向相关的计算和变换
export const modelDirection = TSL.modelDirection;

// 模型法线矩阵 - 模型的法线变换矩阵
// 用于将法线从模型空间变换到世界空间
export const modelNormalMatrix = TSL.modelNormalMatrix;

// 模型位置 - 模型在世界空间中的位置
// 用于位置相关的计算和变换
export const modelPosition = TSL.modelPosition;

// 模型半径 - 模型的包围球半径
// 用于距离计算和碰撞检测
export const modelRadius = TSL.modelRadius;

// 模型缩放 - 模型的缩放比例
// 用于缩放相关的计算和变换
export const modelScale = TSL.modelScale;

// 模型视图矩阵 - 模型视图变换矩阵
// 用于将模型空间坐标变换到视图空间
export const modelViewMatrix = TSL.modelViewMatrix;

// 模型视图位置 - 模型在视图空间中的位置
// 用于视图空间的位置计算
export const modelViewPosition = TSL.modelViewPosition;

// 模型视图投影矩阵 - 模型视图投影变换矩阵
// 用于将模型空间坐标直接变换到裁剪空间
export const modelViewProjection = TSL.modelViewProjection;

// 模型世界矩阵 - 模型的世界变换矩阵
// 用于将模型空间坐标变换到世界空间
export const modelWorldMatrix = TSL.modelWorldMatrix;

// 模型世界逆矩阵 - 模型世界矩阵的逆矩阵
// 用于从世界空间反变换到模型空间
export const modelWorldMatrixInverse = TSL.modelWorldMatrixInverse;

// ============================================================================
// 变形和渲染目标
// ============================================================================

// 变形引用 - 变形动画的引用信息
// 用于变形动画（Morph Target）的数据访问
export const morphReference = TSL.morphReference;

// 多渲染目标 - 多重渲染目标输出
// 用于同时渲染到多个渲染目标
export const mrt = TSL.mrt;
// ============================================================================
// 基础数学运算
// ============================================================================

// 乘法运算 - 数值或向量乘法
// 支持标量、向量、矩阵的乘法运算
export const mul = TSL.mul;

// ============================================================================
// MaterialX 标准节点库
// ============================================================================

// MaterialX 抗锯齿阶跃 - 带抗锯齿的阶跃函数
// 用于创建平滑的边缘过渡，避免锯齿效果
export const mx_aastep = TSL.mx_aastep;

// MaterialX 加法 - MaterialX 标准的加法运算
// 符合 MaterialX 规范的数值加法操作
export const mx_add = TSL.mx_add;

// MaterialX 反正切2 - MaterialX 标准的 atan2 函数
// 计算两个参数的反正切值，考虑象限
export const mx_atan2 = TSL.mx_atan2;

// MaterialX 对比度 - 调整图像对比度
// 用于图像处理中的对比度调整
export const mx_contrast = TSL.mx_contrast;

// MaterialX 除法 - MaterialX 标准的除法运算
// 符合 MaterialX 规范的数值除法操作
export const mx_divide = TSL.mx_divide;

// MaterialX 乘法 - MaterialX 标准的乘法运算
// 符合 MaterialX 规范的数值乘法操作
export const mx_multiply = TSL.mx_multiply;

// MaterialX 减法 - MaterialX 标准的减法运算
// 符合 MaterialX 规范的数值减法操作
export const mx_subtract = TSL.mx_subtract;

// MaterialX 取模 - MaterialX 标准的取模运算
// 符合 MaterialX 规范的模运算
export const mx_modulo = TSL.mx_modulo;

// MaterialX 幂运算 - MaterialX 标准的幂运算
// 计算底数的指数次幂
export const mx_power = TSL.mx_power;

// MaterialX 安全幂运算 - 避免负数底数的幂运算
// 提供数值稳定的幂运算，处理边界情况
export const mx_safepower = TSL.mx_safepower;

// ============================================================================
// MaterialX 噪声函数
// ============================================================================

// MaterialX 单元噪声（浮点） - 单元格噪声的浮点版本
// 生成基于网格的程序化噪声
export const mx_cell_noise_float = TSL.mx_cell_noise_float;

// MaterialX 分形噪声（浮点） - 分形噪声的浮点版本
// 生成多层次的分形噪声模式
export const mx_fractal_noise_float = TSL.mx_fractal_noise_float;

// MaterialX 分形噪声（2D向量） - 分形噪声的2D向量版本
// 生成二维向量形式的分形噪声
export const mx_fractal_noise_vec2 = TSL.mx_fractal_noise_vec2;

// MaterialX 分形噪声（3D向量） - 分形噪声的3D向量版本
// 生成三维向量形式的分形噪声
export const mx_fractal_noise_vec3 = TSL.mx_fractal_noise_vec3;

// MaterialX 分形噪声（4D向量） - 分形噪声的4D向量版本
// 生成四维向量形式的分形噪声
export const mx_fractal_noise_vec4 = TSL.mx_fractal_noise_vec4;

// MaterialX 噪声（浮点） - 基础噪声的浮点版本
// 生成基础的程序化噪声
export const mx_noise_float = TSL.mx_noise_float;

// MaterialX 噪声（3D向量） - 基础噪声的3D向量版本
// 生成三维向量形式的基础噪声
export const mx_noise_vec3 = TSL.mx_noise_vec3;

// MaterialX 噪声（4D向量） - 基础噪声的4D向量版本
// 生成四维向量形式的基础噪声
export const mx_noise_vec4 = TSL.mx_noise_vec4;

// MaterialX 统一噪声2D - 二维统一噪声函数
// 生成二维空间的统一噪声模式
export const mx_unifiednoise2d = TSL.mx_unifiednoise2d;

// MaterialX 统一噪声3D - 三维统一噪声函数
// 生成三维空间的统一噪声模式
export const mx_unifiednoise3d = TSL.mx_unifiednoise3d;

// ============================================================================
// MaterialX 图像处理
// ============================================================================

// MaterialX 反转 - 颜色反转操作
// 将颜色值进行反转处理
export const mx_invert = TSL.mx_invert;

// MaterialX 高度转法线 - 将高度图转换为法线贴图
// 从高度信息生成法线向量
export const mx_heighttonormal = TSL.mx_heighttonormal;

// MaterialX HSV转RGB - HSV色彩空间转RGB
// 将HSV颜色模式转换为RGB颜色模式
export const mx_hsvtorgb = TSL.mx_hsvtorgb;

// MaterialX RGB转HSV - RGB色彩空间转HSV
// 将RGB颜色模式转换为HSV颜色模式
export const mx_rgbtohsv = TSL.mx_rgbtohsv;

// MaterialX sRGB纹理转线性Rec709 - sRGB到线性Rec709的转换
// 将sRGB纹理转换为线性Rec709色彩空间
export const mx_srgb_texture_to_lin_rec709 = TSL.mx_srgb_texture_to_lin_rec709;

// ============================================================================
// MaterialX 条件和控制
// ============================================================================

// MaterialX 相等判断 - 条件相等判断
// 比较两个值是否相等
export const mx_ifequal = TSL.mx_ifequal;

// MaterialX 大于判断 - 条件大于判断
// 比较第一个值是否大于第二个值
export const mx_ifgreater = TSL.mx_ifgreater;

// MaterialX 大于等于判断 - 条件大于等于判断
// 比较第一个值是否大于等于第二个值
export const mx_ifgreatereq = TSL.mx_ifgreatereq;

// ============================================================================
// MaterialX 几何变换
// ============================================================================

// MaterialX 2D旋转 - 二维旋转变换
// 对2D坐标进行旋转变换
export const mx_rotate2d = TSL.mx_rotate2d;

// MaterialX 3D旋转 - 三维旋转变换
// 对3D坐标进行旋转变换
export const mx_rotate3d = TSL.mx_rotate3d;

// MaterialX UV变换 - UV坐标变换
// 对纹理坐标进行变换操作
export const mx_transform_uv = TSL.mx_transform_uv;

// MaterialX 2D放置 - 2D纹理放置
// 控制2D纹理的位置和缩放
export const mx_place2d = TSL.mx_place2d;

// ============================================================================
// MaterialX 渐变和分离
// ============================================================================

// MaterialX 4点渐变 - 四点渐变函数
// 创建基于四个控制点的渐变
export const mx_ramp4 = TSL.mx_ramp4;

// MaterialX 左右渐变 - 水平方向渐变
// 创建从左到右的渐变效果
export const mx_ramplr = TSL.mx_ramplr;

// MaterialX 上下渐变 - 垂直方向渐变
// 创建从上到下的渐变效果
export const mx_ramptb = TSL.mx_ramptb;

// MaterialX 分离 - 通道分离操作
// 分离颜色或向量的各个通道
export const mx_separate = TSL.mx_separate;

// MaterialX 左右分割 - 水平分割操作
// 在水平方向上分割图像或数据
export const mx_splitlr = TSL.mx_splitlr;

// MaterialX 上下分割 - 垂直分割操作
// 在垂直方向上分割图像或数据
export const mx_splittb = TSL.mx_splittb;

// ============================================================================
// MaterialX 工具函数
// ============================================================================

// MaterialX 帧 - 帧相关操作
// 处理动画帧和时间相关的计算
export const mx_frame = TSL.mx_frame;

// MaterialX 计时器 - 时间计时功能
// 提供时间相关的计算和动画支持
export const mx_timer = TSL.mx_timer;
// ============================================================================
// MaterialX Worley 噪声函数
// ============================================================================

// MaterialX Worley 噪声（浮点） - Worley 噪声的浮点版本
// 生成基于 Voronoi 图的细胞噪声模式
export const mx_worley_noise_float = TSL.mx_worley_noise_float;

// MaterialX Worley 噪声（2D向量） - Worley 噪声的2D向量版本
// 生成二维向量形式的 Worley 噪声
export const mx_worley_noise_vec2 = TSL.mx_worley_noise_vec2;

// MaterialX Worley 噪声（3D向量） - Worley 噪声的3D向量版本
// 生成三维向量形式的 Worley 噪声
export const mx_worley_noise_vec3 = TSL.mx_worley_noise_vec3;

// ============================================================================
// 基础数学和逻辑运算
// ============================================================================

// 取反运算 - 数值取反操作
// 将正数变为负数，负数变为正数
export const negate = TSL.negate;

// 归一化 - 向量归一化操作
// 将向量转换为单位向量（长度为1）
export const normalize = TSL.normalize;

// 逻辑非 - 布尔值取反
// 将 true 变为 false，false 变为 true
export const not = TSL.not;

// 不等于比较 - 判断两个值是否不相等
// 返回布尔值表示两个值是否不同
export const notEqual = TSL.notEqual;

// ============================================================================
// 色调映射
// ============================================================================

// 中性色调映射 - 中性的色调映射算法
// 用于将 HDR 颜色映射到 LDR 显示范围
export const neutralToneMapping = TSL.neutralToneMapping;

// ============================================================================
// 节点系统
// ============================================================================

// 节点数组 - 创建节点数组
// 用于管理多个节点的集合
export const nodeArray = TSL.nodeArray;

// 不可变节点 - 创建不可变的节点
// 创建不能被修改的节点对象
export const nodeImmutable = TSL.nodeImmutable;

// 节点对象 - 创建节点对象
// 用于节点图系统的基础对象创建
export const nodeObject = TSL.nodeObject;

// 节点对象意图 - 节点对象的意图声明
// 用于声明节点对象的用途和行为
export const nodeObjectIntent = TSL.nodeObjectIntent;

// 节点对象集合 - 多个节点对象的集合
// 用于管理多个相关的节点对象
export const nodeObjects = TSL.nodeObjects;

// 节点代理 - 创建节点代理
// 用于代理访问其他节点的功能
export const nodeProxy = TSL.nodeProxy;

// 节点代理意图 - 节点代理的意图声明
// 用于声明节点代理的用途和行为
export const nodeProxyIntent = TSL.nodeProxyIntent;

// ============================================================================
// 法线系统
// ============================================================================

// 平面法线 - 平面着色的法线
// 用于平面着色模式的法线计算
export const normalFlat = TSL.normalFlat;

// 几何法线 - 几何体的原始法线
// 来自几何体顶点数据的法线信息
export const normalGeometry = TSL.normalGeometry;

// 局部法线 - 局部空间的法线
// 在模型局部坐标系中的法线向量
export const normalLocal = TSL.normalLocal;

// 法线贴图 - 法线贴图的法线
// 从法线贴图中采样得到的法线信息
export const normalMap = TSL.normalMap;

// 视图法线 - 视图空间的法线
// 在相机视图坐标系中的法线向量
export const normalView = TSL.normalView;

// 视图几何法线 - 视图空间的几何法线
// 在视图空间中的几何体原始法线
export const normalViewGeometry = TSL.normalViewGeometry;

// 世界法线 - 世界空间的法线
// 在世界坐标系中的法线向量
export const normalWorld = TSL.normalWorld;

// 世界几何法线 - 世界空间的几何法线
// 在世界空间中的几何体原始法线
export const normalWorldGeometry = TSL.normalWorldGeometry;

// ============================================================================
// 计算着色器
// ============================================================================

// 工作组数量 - 计算着色器的工作组数量
// 用于计算着色器的并行执行控制
export const numWorkgroups = TSL.numWorkgroups;

// ============================================================================
// 对象属性
// ============================================================================

// 对象方向 - 对象的方向向量
// 表示对象在空间中的朝向
export const objectDirection = TSL.objectDirection;

// 对象组 - 对象的分组信息
// 用于对象的分组和批处理
export const objectGroup = TSL.objectGroup;

// 对象位置 - 对象的位置坐标
// 对象在世界空间中的位置
export const objectPosition = TSL.objectPosition;

// 对象半径 - 对象的包围半径
// 对象的包围球半径，用于距离计算
export const objectRadius = TSL.objectRadius;

// 对象缩放 - 对象的缩放比例
// 对象在各个轴上的缩放系数
export const objectScale = TSL.objectScale;

// 对象视图位置 - 对象在视图空间的位置
// 对象在相机视图坐标系中的位置
export const objectViewPosition = TSL.objectViewPosition;

// 对象世界矩阵 - 对象的世界变换矩阵
// 将对象从局部空间变换到世界空间的矩阵
export const objectWorldMatrix = TSL.objectWorldMatrix;

// ============================================================================
// 更新回调
// ============================================================================

// 对象更新回调 - 对象更新时的回调
// 当对象属性更新时触发的回调函数
export const OnObjectUpdate = TSL.OnObjectUpdate;

// 材质更新回调 - 材质更新时的回调
// 当材质属性更新时触发的回调函数
export const OnMaterialUpdate = TSL.OnMaterialUpdate;

// ============================================================================
// 数学运算和逻辑操作
// ============================================================================

// 1减去 - 计算 1 减去输入值
// 常用于反转归一化值，如 1-alpha 等
export const oneMinus = TSL.oneMinus;

// 逻辑或 - 布尔逻辑或运算
// 当任一输入为真时返回真
export const or = TSL.or;

// ============================================================================
// 深度转换函数
// ============================================================================

// 正交深度转视图Z - 将正交投影深度转换为视图空间Z值
// 用于正交相机的深度值转换
export const orthographicDepthToViewZ = TSL.orthographicDepthToViewZ;

// 透视深度转视图Z - 将透视投影深度转换为视图空间Z值
// 用于透视相机的深度值转换
export const perspectiveDepthToViewZ = TSL.perspectiveDepthToViewZ;

// ============================================================================
// 振荡器函数
// ============================================================================

// 锯齿波振荡器 - 生成锯齿波形
// 产生线性上升然后急剧下降的波形
export const oscSawtooth = TSL.oscSawtooth;

// 正弦波振荡器 - 生成正弦波形
// 产生平滑的正弦波振荡
export const oscSine = TSL.oscSine;

// 方波振荡器 - 生成方波形
// 产生在两个值之间快速切换的波形
export const oscSquare = TSL.oscSquare;

// 三角波振荡器 - 生成三角波形
// 产生线性上升和下降的三角波形
export const oscTriangle = TSL.oscTriangle;

// ============================================================================
// 输出和渲染
// ============================================================================

// 输出 - 定义着色器输出
// 用于指定着色器的最终输出值
export const output = TSL.output;

// 输出结构 - 定义结构化输出
// 用于多重渲染目标等复杂输出场景
export const outputStruct = TSL.outputStruct;

// 覆盖混合 - 覆盖混合模式（已弃用）
// 实现覆盖混合效果，已被新的混合函数替代
export const overlay = TSL.overlay;

// ============================================================================
// 函数和参数系统
// ============================================================================

// 重载函数 - 创建函数重载
// 用于定义具有多个签名的函数
export const overloadingFn = TSL.overloadingFn;

// 参数 - 定义函数参数
// 用于创建可配置的着色器参数
export const parameter = TSL.parameter;

// ============================================================================
// 数学曲线函数
// ============================================================================

// 抛物线 - 抛物线函数
// 生成抛物线形状的数学曲线
export const parabola = TSL.parabola;

// P曲线 - 参数化曲线函数
// 生成可参数化控制的曲线
export const pcurve = TSL.pcurve;

// 色调分离 - 色调分离效果
// 将连续色调转换为有限的色阶
export const posterize = TSL.posterize;

// ============================================================================
// 视差映射
// ============================================================================

// 视差方向 - 视差映射的方向向量
// 用于视差遮蔽映射的方向计算
export const parallaxDirection = TSL.parallaxDirection;

// 视差UV - 视差映射的UV坐标
// 经过视差偏移后的纹理坐标
export const parallaxUV = TSL.parallaxUV;

// ============================================================================
// 渲染通道
// ============================================================================

// 渲染通道 - 定义渲染通道
// 用于多通道渲染管线
export const pass = TSL.pass;

// 通道纹理 - 渲染通道的纹理
// 获取指定渲染通道的纹理结果
export const passTexture = TSL.passTexture;

// ============================================================================
// 纹理和采样
// ============================================================================

// PMREM纹理 - 预过滤的环境贴图
// 用于基于图像的光照（IBL）
export const pmremTexture = TSL.pmremTexture;

// ============================================================================
// 点和阴影
// ============================================================================

// 点阴影 - 点光源阴影
// 计算点光源产生的阴影效果
export const pointShadow = TSL.pointShadow;

// 点UV - 点的UV坐标
// 用于点云渲染的纹理坐标
export const pointUV = TSL.pointUV;

// 点宽度 - 点的宽度
// 控制点云渲染中点的大小
export const pointWidth = TSL.pointWidth;

// ============================================================================
// 位置属性
// ============================================================================

// 几何位置 - 几何体的原始位置
// 来自几何体顶点数据的位置信息
export const positionGeometry = TSL.positionGeometry;

// 局部位置 - 局部空间的位置
// 在模型局部坐标系中的位置
export const positionLocal = TSL.positionLocal;

// 前一帧位置 - 前一帧的位置
// 用于运动模糊和时间相关效果
export const positionPrevious = TSL.positionPrevious;

// 视图位置 - 视图空间的位置
// 在相机视图坐标系中的位置
export const positionView = TSL.positionView;

// 视图位置方向 - 视图空间的位置方向
// 从相机到位置的方向向量
export const positionViewDirection = TSL.positionViewDirection;

// 世界位置 - 世界空间的位置
// 在世界坐标系中的位置
export const positionWorld = TSL.positionWorld;

// 世界位置方向 - 世界空间的位置方向
// 在世界空间中的方向向量
export const positionWorldDirection = TSL.positionWorldDirection;

// ============================================================================
// 幂运算
// ============================================================================

// 幂运算 - 计算底数的指数次幂
// 基础的数学幂运算函数
export const pow = TSL.pow;

// 平方运算 - 计算数值的平方
// 等价于 pow(x, 2) 的优化版本
export const pow2 = TSL.pow2;
// 立方运算 - 计算数值的立方
// 等价于 pow(x, 3) 的优化版本
export const pow3 = TSL.pow3;

// 四次方运算 - 计算数值的四次方
// 等价于 pow(x, 4) 的优化版本
export const pow4 = TSL.pow4;

// ============================================================================
// Alpha 和属性处理
// ============================================================================

// 预乘Alpha - 将颜色与Alpha预乘
// 用于正确的Alpha混合计算
export const premultiplyAlpha = TSL.premultiplyAlpha;

// 属性 - 定义材质属性
// 用于创建可配置的材质属性
export const property = TSL.property;

// ============================================================================
// 数学函数和随机
// ============================================================================

// 弧度转换 - 将角度转换为弧度
// 将度数转换为弧度单位
export const radians = TSL.radians;

// 随机数 - 生成随机数
// 生成伪随机数值
export const rand = TSL.rand;

// 范围映射 - 将值映射到指定范围
// 将输入值从一个范围映射到另一个范围
export const range = TSL.range;

// 倒数 - 计算数值的倒数
// 计算 1/x 的值
export const reciprocal = TSL.reciprocal;

// 四舍五入 - 数值四舍五入
// 将浮点数四舍五入到最近的整数
export const round = TSL.round;

// ============================================================================
// 雾效系统
// ============================================================================

// 范围雾 - 基于距离的雾效（已弃用）
// 根据距离范围计算雾效强度，已被新的雾效函数替代
export const rangeFog = TSL.rangeFog;

// 范围雾因子 - 范围雾的计算因子
// 用于范围雾效果的强度计算
export const rangeFogFactor = TSL.rangeFogFactor;

// ============================================================================
// 引用和缓冲
// ============================================================================

// 引用 - 创建节点引用
// 用于引用其他节点或值
export const reference = TSL.reference;

// 引用缓冲 - 创建缓冲区引用
// 用于引用缓冲区数据
export const referenceBuffer = TSL.referenceBuffer;

// 渲染器引用 - 渲染器的引用信息
// 用于访问渲染器相关的属性和状态
export const rendererReference = TSL.rendererReference;

// ============================================================================
// 反射和折射
// ============================================================================

// 反射 - 计算反射向量
// 根据入射向量和法线计算反射方向
export const reflect = TSL.reflect;

// 反射向量 - 反射方向向量
// 用于环境反射和镜面效果
export const reflectVector = TSL.reflectVector;

// 反射视图 - 视图空间的反射
// 在视图空间中计算的反射效果
export const reflectView = TSL.reflectView;

// 反射器 - 反射器对象
// 用于创建反射效果的特殊对象
export const reflector = TSL.reflector;

// 折射 - 计算折射向量
// 根据入射向量、法线和折射率计算折射方向
export const refract = TSL.refract;

// 折射向量 - 折射方向向量
// 用于透明材质的折射效果
export const refractVector = TSL.refractVector;

// 折射视图 - 视图空间的折射
// 在视图空间中计算的折射效果
export const refractView = TSL.refractView;

// ============================================================================
// 色调映射
// ============================================================================

// Reinhard色调映射 - Reinhard色调映射算法
// 经典的HDR到LDR色调映射方法
export const reinhardToneMapping = TSL.reinhardToneMapping;

// ============================================================================
// 值映射和变换
// ============================================================================

// 重映射 - 值的重新映射
// 将值从一个范围重新映射到另一个范围
export const remap = TSL.remap;

// 重映射限制 - 带限制的重映射
// 重映射并限制在目标范围内
export const remapClamp = TSL.remapClamp;

// ============================================================================
// 渲染系统
// ============================================================================

// 渲染组 - 渲染对象分组
// 用于批量渲染和性能优化
export const renderGroup = TSL.renderGroup;

// 渲染输出 - 渲染管线输出
// 定义渲染管线的最终输出
export const renderOutput = TSL.renderOutput;

// 渲染到纹理 - 渲染到纹理目标
// 将渲染结果输出到纹理
export const rtt = TSL.rtt;

// ============================================================================
// 旋转和变换
// ============================================================================

// 旋转 - 旋转变换
// 对坐标或向量进行旋转变换
export const rotate = TSL.rotate;

// 旋转UV - UV坐标旋转
// 对纹理坐标进行旋转变换
export const rotateUV = TSL.rotateUV;

// ============================================================================
// 材质属性
// ============================================================================

// 粗糙度 - 材质粗糙度属性
// 用于快速访问材质的粗糙度值
export const roughness = TSL.roughness;

// ============================================================================
// 色彩空间转换
// ============================================================================

// sRGB传输EOTF - sRGB电光传输函数
// 将线性RGB转换为sRGB色彩空间
export const sRGBTransferEOTF = TSL.sRGBTransferEOTF;

// sRGB传输OETF - sRGB光电传输函数
// 将sRGB转换为线性RGB色彩空间
export const sRGBTransferOETF = TSL.sRGBTransferOETF;

// ============================================================================
// 采样和纹理
// ============================================================================

// 采样 - 纹理采样
// 从纹理中采样颜色值
export const sample = TSL.sample;

// 采样器 - 纹理采样器
// 定义纹理采样的方式和参数
export const sampler = TSL.sampler;

// 比较采样器 - 深度比较采样器
// 用于阴影贴图等深度比较操作
export const samplerComparison = TSL.samplerComparison;

// ============================================================================
// 颜色处理
// ============================================================================

// 饱和度限制 - 将值限制在0-1范围
// 确保颜色值在有效范围内
export const saturate = TSL.saturate;

// 饱和度调整 - 调整颜色饱和度
// 增强或减弱颜色的饱和度
export const saturation = TSL.saturation;

// ============================================================================
// 屏幕混合和坐标
// ============================================================================

// 屏幕混合 - 屏幕混合模式（已弃用）
// 实现屏幕混合效果，已被新的混合函数替代
export const screen = TSL.screen;

// 屏幕坐标 - 屏幕空间坐标
// 获取当前像素的屏幕坐标
export const screenCoordinate = TSL.screenCoordinate;

// 屏幕尺寸 - 屏幕的尺寸信息
// 获取渲染目标的宽度和高度
export const screenSize = TSL.screenSize;

// 屏幕UV - 屏幕空间的UV坐标
// 将屏幕坐标转换为0-1范围的UV坐标
export const screenUV = TSL.screenUV;

// ============================================================================
// 脚本化系统
// ============================================================================

// 脚本化 - 创建脚本化节点
// 用于动态脚本控制的节点
export const scriptable = TSL.scriptable;

// 脚本化值 - 脚本化的数值
// 可通过脚本动态控制的数值
export const scriptableValue = TSL.scriptableValue;

// ============================================================================
// 选择和控制流
// ============================================================================

// 选择函数 - 条件选择操作
// 根据条件选择两个值中的一个，类似三元运算符
export const select = TSL.select;

// ============================================================================
// 堆栈和命名系统
// ============================================================================

// 设置当前堆栈 - 设置节点堆栈
// 用于管理节点的执行堆栈
export const setCurrentStack = TSL.setCurrentStack;

// 设置名称 - 为节点设置名称
// 用于调试和节点识别
export const setName = TSL.setName;

// 堆栈 - 创建节点堆栈
// 用于管理节点的执行顺序
export const stack = TSL.stack;

// ============================================================================
// 着色器系统
// ============================================================================

// 着色器阶段 - 定义着色器阶段
// 指定代码在哪个着色器阶段执行（顶点、片段等）
export const shaderStages = TSL.shaderStages;

// ============================================================================
// 阴影系统
// ============================================================================

// 阴影 - 阴影计算
// 计算阴影的强度和效果
export const shadow = TSL.shadow;

// 阴影世界位置 - 阴影在世界空间的位置
// 用于阴影贴图的世界坐标计算
export const shadowPositionWorld = TSL.shadowPositionWorld;

// ============================================================================
// 形状和几何
// ============================================================================

// 圆形形状 - 生成圆形形状
// 创建圆形的SDF（有向距离场）
export const shapeCircle = TSL.shapeCircle;

// ============================================================================
// 统一变量组
// ============================================================================

// 共享统一变量组 - 共享的统一变量组
// 用于在多个着色器间共享统一变量
export const sharedUniformGroup = TSL.sharedUniformGroup;

// ============================================================================
// 材质光泽属性
// ============================================================================

// 光泽 - 材质的光泽效果
// 用于模拟织物等材质的光泽现象
export const sheen = TSL.sheen;

// 光泽粗糙度 - 光泽效果的粗糙度
// 控制光泽效果的模糊程度
export const sheenRoughness = TSL.sheenRoughness;

// 光泽度 - 材质的光泽强度（传统模型）
// 用于 Phong 等传统光照模型
export const shininess = TSL.shininess;

// ============================================================================
// 位运算
// ============================================================================

// 左移位 - 位左移运算
// 将二进制位向左移动指定位数
export const shiftLeft = TSL.shiftLeft;

// 右移位 - 位右移运算
// 将二进制位向右移动指定位数
export const shiftRight = TSL.shiftRight;

// ============================================================================
// 数学函数
// ============================================================================

// 符号函数 - 返回数值的符号
// 正数返回1，负数返回-1，零返回0
export const sign = TSL.sign;

// 正弦函数 - 三角函数正弦
// 计算角度的正弦值
export const sin = TSL.sin;

// Sinc函数 - 归一化正弦函数
// 计算 sin(πx)/(πx) 的值，常用于信号处理
export const sinc = TSL.sinc;

// 正切函数 - 三角函数正切
// 计算角度的正切值
export const tan = TSL.tan;

// 平方根 - 计算平方根
// 计算数值的平方根
export const sqrt = TSL.sqrt;

// ============================================================================
// 动画和变形
// ============================================================================

// 骨骼动画 - 骨骼蒙皮动画
// 用于角色动画的骨骼变形
export const skinning = TSL.skinning;

// ============================================================================
// 插值和步进函数
// ============================================================================

// 平滑步进 - 平滑的步进插值
// 在两个值之间进行平滑的阶跃过渡
export const smoothstep = TSL.smoothstep;

// 平滑步进元素 - 对向量元素的平滑步进
// 对向量的各个分量分别进行平滑步进
export const smoothstepElement = TSL.smoothstepElement;

// 步进函数 - 阶跃函数
// 当输入大于阈值时返回1，否则返回0
export const step = TSL.step;

// 步进元素 - 对向量元素的步进
// 对向量的各个分量分别进行步进操作
export const stepElement = TSL.stepElement;

// ============================================================================
// 镜面反射属性
// ============================================================================

// 镜面反射颜色 - 镜面反射的颜色
// 控制镜面反射的颜色特性
export const specularColor = TSL.specularColor;

// 镜面反射F90 - 90度角的镜面反射
// 用于PBR材质的边缘反射计算
export const specularF90 = TSL.specularF90;

// ============================================================================
// UV变换和纹理操作
// ============================================================================

// 球化UV - 将UV坐标球化变形
// 将平面UV坐标变形为球面坐标
export const spherizeUV = TSL.spherizeUV;

// 分割 - 分割操作
// 将数据或向量进行分割处理
export const split = TSL.split;

// 精灵表UV - 精灵表的UV坐标
// 用于精灵动画的纹理坐标计算
export const spritesheetUV = TSL.spritesheetUV;

// ============================================================================
// 存储系统
// ============================================================================

// 存储 - 存储缓冲区
// 用于计算着色器的数据存储
export const storage = TSL.storage;

// 存储屏障 - 存储同步屏障
// 用于计算着色器的内存同步
export const storageBarrier = TSL.storageBarrier;

// 存储对象 - 存储对象（已弃用）
// 用于存储系统的对象管理，已被新的存储函数替代
export const storageObject = TSL.storageObject;

// 存储纹理 - 存储纹理
// 用于计算着色器的纹理存储
export const storageTexture = TSL.storageTexture;

// ============================================================================
// 数据类型
// ============================================================================

// 字符串 - 字符串类型
// 用于着色器中的字符串处理
export const string = TSL.string;

// 结构体 - 定义结构体类型
// 用于创建复杂的数据结构
export const struct = TSL.struct;

// ============================================================================
// 运算和构建
// ============================================================================

// 减法 - 减法运算
// 执行数值或向量的减法操作
export const sub = TSL.sub;

// 子构建 - 子节点构建
// 用于构建子节点图
export const subBuild = TSL.subBuild;

// ============================================================================
// 子组操作（计算着色器）
// ============================================================================

// 子组索引 - 计算着色器子组的索引
// 获取当前线程在子组中的索引
export const subgroupIndex = TSL.subgroupIndex;

// 子组大小 - 计算着色器子组的大小
// 获取子组包含的线程数量
export const subgroupSize = TSL.subgroupSize;

// ============================================================================
// 切线系统
// ============================================================================

// 几何切线 - 几何体的原始切线
// 来自几何体顶点数据的切线信息
export const tangentGeometry = TSL.tangentGeometry;

// 局部切线 - 局部空间的切线
// 在模型局部坐标系中的切线向量
export const tangentLocal = TSL.tangentLocal;

// 视图切线 - 视图空间的切线
// 在相机视图坐标系中的切线向量
export const tangentView = TSL.tangentView;
// 世界切线 - 世界空间的切线
// 在世界坐标系中的切线向量
export const tangentWorld = TSL.tangentWorld;

// ============================================================================
// 临时变量和纹理系统
// ============================================================================

// 临时变量 - 创建临时变量
// 用于存储中间计算结果
export const temp = TSL.temp;

// 纹理 - 2D纹理采样
// 从2D纹理中采样颜色值
export const texture = TSL.texture;

// 3D纹理 - 3D纹理采样
// 从3D体积纹理中采样颜色值
export const texture3D = TSL.texture3D;

// 纹理屏障 - 纹理同步屏障
// 用于计算着色器的纹理内存同步
export const textureBarrier = TSL.textureBarrier;

// 双三次纹理 - 双三次插值纹理采样
// 使用双三次插值进行高质量纹理采样
export const textureBicubic = TSL.textureBicubic;

// 双三次级别纹理 - 指定级别的双三次纹理采样
// 在指定mip级别进行双三次插值采样
export const textureBicubicLevel = TSL.textureBicubicLevel;

// 立方体UV纹理 - 立方体贴图的UV采样
// 使用UV坐标从立方体贴图采样
export const textureCubeUV = TSL.textureCubeUV;

// 纹理加载 - 直接加载纹理像素
// 直接读取纹理的像素值，不进行插值
export const textureLoad = TSL.textureLoad;

// 纹理尺寸 - 获取纹理的尺寸
// 返回纹理的宽度和高度信息
export const textureSize = TSL.textureSize;

// 纹理存储 - 存储数据到纹理
// 将数据写入到存储纹理中
export const textureStore = TSL.textureStore;

// ============================================================================
// 材质属性
// ============================================================================

// 厚度 - 材质的厚度属性
// 用于体积散射和透射效果
export const thickness = TSL.thickness;

// 透射 - 材质的透射属性
// 用于模拟光线穿透材质的效果
export const transmission = TSL.transmission;

// ============================================================================
// 时间系统
// ============================================================================

// 时间 - 当前时间
// 获取当前的时间值，用于动画
export const time = TSL.time;

// 计时器增量 - 时间增量
// 获取帧间的时间差
export const timerDelta = TSL.timerDelta;

// 全局计时器 - 全局时间计时器
// 获取全局的时间值
export const timerGlobal = TSL.timerGlobal;

// 局部计时器 - 局部时间计时器
// 获取局部的时间值
export const timerLocal = TSL.timerLocal;

// ============================================================================
// 色调映射
// ============================================================================

// 色调映射 - 色调映射处理
// 将HDR颜色映射到LDR显示范围
export const toneMapping = TSL.toneMapping;

// 色调映射曝光 - 色调映射的曝光值
// 控制色调映射的曝光强度
export const toneMappingExposure = TSL.toneMappingExposure;

// ============================================================================
// 特殊效果
// ============================================================================

// 卡通轮廓通道 - 卡通风格的轮廓渲染
// 用于创建卡通风格的轮廓效果
export const toonOutlinePass = TSL.toonOutlinePass;

// ============================================================================
// 变换系统
// ============================================================================

// 变换方向 - 变换方向向量
// 对方向向量进行坐标变换
export const transformDirection = TSL.transformDirection;

// 变换法线 - 变换法线向量
// 对法线向量进行坐标变换
export const transformNormal = TSL.transformNormal;

// 变换法线到视图 - 将法线变换到视图空间
// 将法线从其他空间变换到视图空间
export const transformNormalToView = TSL.transformNormalToView;

// 变换后的清漆法线视图 - 变换后的清漆法线（已弃用）
// 清漆层的法线在视图空间中的表示，已被新的法线函数替代
export const transformedClearcoatNormalView = TSL.transformedClearcoatNormalView;

// 变换后的法线视图 - 变换后的法线视图（已弃用）
// 变换后的法线在视图空间中的表示，已被新的法线函数替代
export const transformedNormalView = TSL.transformedNormalView;

// 变换后的法线世界 - 变换后的法线世界（已弃用）
// 变换后的法线在世界空间中的表示，已被新的法线函数替代
export const transformedNormalWorld = TSL.transformedNormalWorld;

// 转置 - 矩阵转置
// 计算矩阵的转置
export const transpose = TSL.transpose;

// ============================================================================
// 噪声和纹理特效
// ============================================================================

// 三角噪声3D - 三维三角噪声
// 生成三维空间的三角噪声模式
export const triNoise3D = TSL.triNoise3D;

// 三平面纹理 - 三平面投影纹理
// 使用三平面投影进行纹理映射
export const triplanarTexture = TSL.triplanarTexture;

// 三平面纹理组 - 多个三平面纹理
// 管理多个三平面投影纹理
export const triplanarTextures = TSL.triplanarTextures;

// ============================================================================
// 数学函数
// ============================================================================

// 截断 - 数值截断
// 截断浮点数的小数部分，保留整数部分
export const trunc = TSL.trunc;

// ============================================================================
// 数据类型
// ============================================================================

// 无符号整数 - 无符号整数类型
// 定义无符号整数数据类型
export const uint = TSL.uint;

// 无符号2D向量 - 无符号整数2D向量
// 定义无符号整数的2D向量类型
export const uvec2 = TSL.uvec2;

// ============================================================================
// 统一变量系统
// ============================================================================

// 统一变量 - 创建统一变量
// 定义着色器的统一变量
export const uniform = TSL.uniform;

// 统一变量数组 - 统一变量数组
// 定义统一变量的数组
export const uniformArray = TSL.uniformArray;

// 统一立方体纹理 - 统一立方体纹理变量
// 定义立方体纹理的统一变量
export const uniformCubeTexture = TSL.uniformCubeTexture;

// 统一变量组 - 统一变量分组
// 将相关的统一变量组织在一起
export const uniformGroup = TSL.uniformGroup;

// 统一变量流 - 统一变量的数据流
// 管理统一变量的数据流动
export const uniformFlow = TSL.uniformFlow;

// 统一纹理 - 统一纹理变量
// 定义纹理的统一变量
export const uniformTexture = TSL.uniformTexture;

// ============================================================================
// Alpha处理
// ============================================================================

// 取消预乘Alpha - 取消Alpha预乘
// 将预乘Alpha的颜色转换回普通颜色
export const unpremultiplyAlpha = TSL.unpremultiplyAlpha;

// ============================================================================
// 用户数据和UV坐标
// ============================================================================

// 用户数据 - 用户自定义数据
// 访问用户自定义的数据
export const userData = TSL.userData;

// UV坐标 - 纹理UV坐标
// 获取当前的纹理坐标
export const uv = TSL.uv;
// 无符号3D向量 - 无符号整数3D向量
// 定义无符号整数的3D向量类型
export const uvec3 = TSL.uvec3;

// 无符号4D向量 - 无符号整数4D向量
// 定义无符号整数的4D向量类型
export const uvec4 = TSL.uvec4;

// ============================================================================
// 变量系统
// ============================================================================

// 变化变量 - 顶点着色器到片段着色器的变量
// 定义在顶点和片段着色器间传递的变量
export const varying = TSL.varying;

// 变化属性 - 变化变量的属性
// 定义变化变量的属性和特性
export const varyingProperty = TSL.varyingProperty;

// ============================================================================
// 向量类型
// ============================================================================

// 2D向量 - 二维向量类型
// 定义包含x,y分量的2D向量
export const vec2 = TSL.vec2;

// 3D向量 - 三维向量类型
// 定义包含x,y,z分量的3D向量
export const vec3 = TSL.vec3;

// 4D向量 - 四维向量类型
// 定义包含x,y,z,w分量的4D向量
export const vec4 = TSL.vec4;

// 向量分量 - 向量的分量访问
// 用于访问和操作向量的各个分量
export const vectorComponents = TSL.vectorComponents;

// ============================================================================
// 顶点属性
// ============================================================================

// 速度 - 顶点的速度属性
// 用于运动模糊和动画效果
export const velocity = TSL.velocity;

// 顶点颜色 - 顶点的颜色属性
// 来自几何体顶点数据的颜色信息
export const vertexColor = TSL.vertexColor;

// 顶点索引 - 当前顶点的索引
// 获取当前处理的顶点在几何体中的索引
export const vertexIndex = TSL.vertexIndex;

// 顶点阶段 - 顶点着色器阶段
// 指定代码在顶点着色器阶段执行
export const vertexStage = TSL.vertexStage;

// ============================================================================
// 颜色处理
// ============================================================================

// 鲜艳度 - 颜色的鲜艳度调整
// 增强或减弱颜色的鲜艳程度
export const vibrance = TSL.vibrance;

// ============================================================================
// 深度转换
// ============================================================================

// 视图Z转对数深度 - 将视图Z值转换为对数深度
// 用于对数深度缓冲的深度值转换
export const viewZToLogarithmicDepth = TSL.viewZToLogarithmicDepth;

// 视图Z转正交深度 - 将视图Z值转换为正交深度
// 用于正交投影的深度值转换
export const viewZToOrthographicDepth = TSL.viewZToOrthographicDepth;

// 视图Z转透视深度 - 将视图Z值转换为透视深度
// 用于透视投影的深度值转换
export const viewZToPerspectiveDepth = TSL.viewZToPerspectiveDepth;

// ============================================================================
// 视口系统
// ============================================================================

// 视口 - 视口信息
// 获取当前渲染视口的信息
export const viewport = TSL.viewport;

// 视口坐标 - 视口空间坐标
// 获取当前像素在视口中的坐标
export const viewportCoordinate = TSL.viewportCoordinate;

// 视口深度纹理 - 视口的深度纹理
// 获取视口的深度缓冲纹理
export const viewportDepthTexture = TSL.viewportDepthTexture;

// 视口线性深度 - 视口的线性深度
// 获取视口的线性化深度值
export const viewportLinearDepth = TSL.viewportLinearDepth;

// 视口Mip纹理 - 视口的Mip纹理
// 获取视口的多级渐远纹理
export const viewportMipTexture = TSL.viewportMipTexture;

// 视口分辨率 - 视口的分辨率（已弃用）
// 获取视口的分辨率信息，已被 viewportSize 替代
export const viewportResolution = TSL.viewportResolution;

// 视口安全UV - 视口的安全UV坐标
// 获取经过边界保护的视口UV坐标
export const viewportSafeUV = TSL.viewportSafeUV;

// 视口共享纹理 - 视口的共享纹理
// 获取视口的共享纹理资源
export const viewportSharedTexture = TSL.viewportSharedTexture;

// 视口尺寸 - 视口的尺寸信息
// 获取视口的宽度和高度
export const viewportSize = TSL.viewportSize;

// 视口纹理 - 视口的纹理
// 获取视口的颜色纹理
export const viewportTexture = TSL.viewportTexture;

// 视口UV - 视口的UV坐标
// 将视口坐标转换为0-1范围的UV坐标
export const viewportUV = TSL.viewportUV;

// ============================================================================
// WGSL 支持
// ============================================================================

// WGSL - WebGPU着色语言代码
// 嵌入原生WGSL代码
export const wgsl = TSL.wgsl;

// WGSL函数 - WGSL函数定义
// 定义WGSL原生函数
export const wgslFn = TSL.wgslFn;

// ============================================================================
// 工作组（计算着色器）
// ============================================================================

// 工作组数组 - 工作组共享数组
// 定义工作组内共享的数组数据
export const workgroupArray = TSL.workgroupArray;

// 工作组屏障 - 工作组同步屏障
// 用于工作组内线程的同步
export const workgroupBarrier = TSL.workgroupBarrier;

// 工作组ID - 当前工作组的ID
// 获取当前工作组的标识符
export const workgroupId = TSL.workgroupId;

// ============================================================================
// 色彩空间
// ============================================================================

// 工作色彩空间转换 - 从工作色彩空间转换
// 将颜色从工作色彩空间转换到目标色彩空间
export const workingToColorSpace = TSL.workingToColorSpace;
// 异或运算 - 逻辑异或运算
// 用于布尔值的异或逻辑运算
export const xor = TSL.xor;

// ============================================================================
// 代码生成工具
// ============================================================================

/**
 * 动态生成 TSL 导出语句的工具代码
 *
 * 这段注释掉的代码用于自动生成上述所有的 export 语句。
 * 当 TSL 库添加新函数时，可以使用这段代码来自动生成对应的导出语句。
 *
 * 使用方法：
 * 1. 取消注释下面的代码
 * 2. 在浏览器控制台中运行
 * 3. 复制生成的代码替换现有的导出语句
 *
 * 注意：这个工具代码依赖于 THREE.TSL 对象的存在，
 * 需要在加载了 Three.js WebGPU 模块的环境中运行。
 */

/*
// 动态生成导出语句的工具代码
// Use this code to generate the export statements dynamically

let code = '';

// 遍历 THREE.TSL 对象的所有属性
for ( const key of Object.keys( THREE.TSL ) ) {

	// 为每个属性生成对应的导出语句
	code += `export const ${ key } = TSL.${ key };\n`;

}

// 输出生成的代码到控制台
console.log( code );
//*/

// ============================================================================
// 文件结束
// ============================================================================

/**
 * TSL 函数库导出完成
 *
 * 本文件总共导出了 590+ 个 TSL 函数和常量，涵盖了：
 * - 数学运算和三角函数
 * - 向量和矩阵操作
 * - 纹理采样和处理
 * - 光照和材质计算
 * - 几何变换和投影
 * - 后处理和特效
 * - 计算着色器功能
 * - MaterialX 节点支持
 *
 * 这些函数构成了 Three.js 现代着色器编程的完整工具集，
 * 为开发者提供了类型安全、高性能的着色器开发体验。
 */
