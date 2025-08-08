/**
 * 着色器代码片段库
 *
 * 这个模块导入并导出所有的着色器代码片段，这些片段用于构建完整的着色器程序。
 * 着色器片段按功能分类，包括：
 * - Alpha 处理相关片段
 * - 纹理映射片段
 * - 光照计算片段
 * - 变形动画片段
 * - 阴影映射片段
 * - 环境映射片段
 * - 雾效果片段
 * - 等等...
 *
 * 这些片段会在运行时根据材质和渲染参数动态组合成完整的着色器程序。
 */

// === Alpha 透明度处理相关片段 ===
// Alpha 哈希抖动：用于实现透明度的随机抖动效果，避免透明度排序问题
import alphahash_fragment from "./ShaderChunk/alphahash_fragment.glsl.js";
// Alpha 哈希参数声明：定义 Alpha 哈希所需的 uniform 变量和函数
import alphahash_pars_fragment from "./ShaderChunk/alphahash_pars_fragment.glsl.js";

// Alpha 贴图：从纹理中采样透明度值并应用到片段
import alphamap_fragment from "./ShaderChunk/alphamap_fragment.glsl.js";
// Alpha 贴图参数声明：定义 Alpha 贴图的 uniform 变量和采样器
import alphamap_pars_fragment from "./ShaderChunk/alphamap_pars_fragment.glsl.js";

// Alpha 测试：根据透明度阈值丢弃像素，用于硬边透明效果
import alphatest_fragment from "./ShaderChunk/alphatest_fragment.glsl.js";
// Alpha 测试参数声明：定义 Alpha 测试的阈值 uniform 变量
import alphatest_pars_fragment from "./ShaderChunk/alphatest_pars_fragment.glsl.js";

// === 环境光遮蔽 (AO) 相关片段 ===
// AO 贴图应用：将环境光遮蔽贴图应用到最终颜色，增强阴影细节
import aomap_fragment from "./ShaderChunk/aomap_fragment.glsl.js";
// AO 贴图参数声明：定义 AO 贴图的 uniform 变量和采样器
import aomap_pars_fragment from "./ShaderChunk/aomap_pars_fragment.glsl.js";

// === 批处理渲染相关片段 ===
// 批处理顶点参数：定义批处理渲染所需的实例化变换矩阵
import batching_pars_vertex from "./ShaderChunk/batching_pars_vertex.glsl.js";
// 批处理顶点变换：应用批处理的实例化变换到顶点位置
import batching_vertex from "./ShaderChunk/batching_vertex.glsl.js";

// === 顶点处理基础片段 ===
// 顶点位置初始化：设置变换后的顶点位置，是顶点着色器的起始点
import begin_vertex from "./ShaderChunk/begin_vertex.glsl.js";
// 法线初始化：设置变换后的法线向量，用于光照计算
import beginnormal_vertex from "./ShaderChunk/beginnormal_vertex.glsl.js";

// === 物理渲染相关片段 ===
// 双向散射分布函数：定义各种材质的 BRDF 函数，用于 PBR 渲染
import bsdfs from "./ShaderChunk/bsdfs.glsl.js";
// 彩虹色效果：模拟薄膜干涉产生的彩虹色效果，用于肥皂泡、油膜等
import iridescence_fragment from "./ShaderChunk/iridescence_fragment.glsl.js";

// === 法线贴图相关片段 ===
// 凹凸贴图参数：定义凹凸贴图的 uniform 变量，用于法线扰动
import bumpmap_pars_fragment from "./ShaderChunk/bumpmap_pars_fragment.glsl.js";
// === 裁剪平面相关片段 ===
// 裁剪平面片段处理：在片段着色器中执行裁剪测试，丢弃被裁剪的像素
import clipping_planes_fragment from "./ShaderChunk/clipping_planes_fragment.glsl.js";
// 裁剪平面片段参数：定义片段着色器中裁剪平面的 uniform 变量
import clipping_planes_pars_fragment from "./ShaderChunk/clipping_planes_pars_fragment.glsl.js";
// 裁剪平面顶点参数：定义顶点着色器中裁剪平面的 uniform 变量
import clipping_planes_pars_vertex from "./ShaderChunk/clipping_planes_pars_vertex.glsl.js";
// 裁剪平面顶点处理：在顶点着色器中计算到裁剪平面的距离
import clipping_planes_vertex from "./ShaderChunk/clipping_planes_vertex.glsl.js";

// === 顶点颜色相关片段 ===
// 顶点颜色片段应用：将顶点颜色应用到最终的片段颜色
import color_fragment from "./ShaderChunk/color_fragment.glsl.js";
// 顶点颜色片段参数：定义片段着色器中顶点颜色的 varying 变量
import color_pars_fragment from "./ShaderChunk/color_pars_fragment.glsl.js";
// 顶点颜色顶点参数：定义顶点着色器中顶点颜色的 attribute 变量
import color_pars_vertex from "./ShaderChunk/color_pars_vertex.glsl.js";
// 顶点颜色处理：在顶点着色器中处理顶点颜色并传递给片段着色器
import color_vertex from "./ShaderChunk/color_vertex.glsl.js";

// === 通用工具函数 ===
// 通用函数库：包含数学函数、常量和工具函数，被其他着色器片段广泛使用
import common from "./ShaderChunk/common.glsl.js";

// === 环境映射相关片段 ===
// 立方体UV反射：使用立方体贴图的UV映射实现环境反射效果
import cube_uv_reflection_fragment from "./ShaderChunk/cube_uv_reflection_fragment.glsl.js";

// === 法线处理相关片段 ===
// 默认法线计算：当没有法线贴图时，计算几何体的默认法线
import defaultnormal_vertex from "./ShaderChunk/defaultnormal_vertex.glsl.js";

// === 顶点位移相关片段 ===
// 位移贴图参数：定义位移贴图的 uniform 变量，用于顶点位移
import displacementmap_pars_vertex from "./ShaderChunk/displacementmap_pars_vertex.glsl.js";
// 位移贴图应用：根据位移贴图对顶点位置进行偏移，实现几何细节
import displacementmap_vertex from "./ShaderChunk/displacementmap_vertex.glsl.js";

// === 自发光相关片段 ===
// 自发光贴图应用：将自发光贴图添加到最终颜色，模拟发光效果
import emissivemap_fragment from "./ShaderChunk/emissivemap_fragment.glsl.js";
// 自发光贴图参数：定义自发光贴图的 uniform 变量和采样器
import emissivemap_pars_fragment from "./ShaderChunk/emissivemap_pars_fragment.glsl.js";

// === 颜色空间转换相关片段 ===
// 颜色空间转换：将渲染结果转换到目标颜色空间（如 sRGB）
import colorspace_fragment from "./ShaderChunk/colorspace_fragment.glsl.js";
// 颜色空间参数：定义颜色空间转换所需的函数和常量
import colorspace_pars_fragment from "./ShaderChunk/colorspace_pars_fragment.glsl.js";
// 环境映射应用：将环境贴图应用到材质，实现反射和折射效果
import envmap_fragment from "./ShaderChunk/envmap_fragment.glsl.js";
// 环境映射通用参数：定义环境映射的通用 uniform 变量和函数
import envmap_common_pars_fragment from "./ShaderChunk/envmap_common_pars_fragment.glsl.js";
// 环境映射片段参数：定义片段着色器中环境映射的 uniform 变量
import envmap_pars_fragment from "./ShaderChunk/envmap_pars_fragment.glsl.js";
// 环境映射顶点参数：定义顶点着色器中环境映射的 uniform 变量
import envmap_pars_vertex from "./ShaderChunk/envmap_pars_vertex.glsl.js";
// 环境映射顶点处理：在顶点着色器中计算环境映射所需的向量
import envmap_vertex from "./ShaderChunk/envmap_vertex.glsl.js";

// === 雾效果相关片段 ===
// 雾效果顶点处理：在顶点着色器中计算雾效果所需的距离信息
import fog_vertex from "./ShaderChunk/fog_vertex.glsl.js";
// 雾效果顶点参数：定义顶点着色器中雾效果的 uniform 变量
import fog_pars_vertex from "./ShaderChunk/fog_pars_vertex.glsl.js";
// 雾效果片段应用：在片段着色器中应用雾效果，混合雾颜色
import fog_fragment from "./ShaderChunk/fog_fragment.glsl.js";
// 雾效果片段参数：定义片段着色器中雾效果的 uniform 变量和函数
import fog_pars_fragment from "./ShaderChunk/fog_pars_fragment.glsl.js";

// === 渐变映射和光照贴图相关片段 ===
// 渐变映射参数：定义渐变映射的 uniform 变量，用于卡通渲染的色调分离
import gradientmap_pars_fragment from "./ShaderChunk/gradientmap_pars_fragment.glsl.js";
// 光照贴图参数：定义光照贴图的 uniform 变量，用于预计算的全局光照
import lightmap_pars_fragment from "./ShaderChunk/lightmap_pars_fragment.glsl.js";
// === 光照模型相关片段 ===
// Lambert 光照模型：实现漫反射光照，适用于无光泽表面
import lights_lambert_fragment from "./ShaderChunk/lights_lambert_fragment.glsl.js";
// Lambert 光照参数：定义 Lambert 光照模型的 uniform 变量和函数
import lights_lambert_pars_fragment from "./ShaderChunk/lights_lambert_pars_fragment.glsl.js";

// 光照参数初始化：定义所有光照计算的基础 uniform 变量和结构体
import lights_pars_begin from "./ShaderChunk/lights_pars_begin.glsl.js";

// 物理环境映射参数：定义基于物理的环境映射 uniform 变量，用于 PBR 渲染
import envmap_physical_pars_fragment from "./ShaderChunk/envmap_physical_pars_fragment.glsl.js";

// Toon 卡通光照：实现卡通风格的非真实感光照效果
import lights_toon_fragment from "./ShaderChunk/lights_toon_fragment.glsl.js";
// Toon 光照参数：定义卡通光照的 uniform 变量和渐变映射
import lights_toon_pars_fragment from "./ShaderChunk/lights_toon_pars_fragment.glsl.js";

// Phong 光照模型：实现镜面反射光照，适用于有光泽表面
import lights_phong_fragment from "./ShaderChunk/lights_phong_fragment.glsl.js";
// Phong 光照参数：定义 Phong 光照模型的 uniform 变量和函数
import lights_phong_pars_fragment from "./ShaderChunk/lights_phong_pars_fragment.glsl.js";

// 物理光照模型：实现基于物理的渲染 (PBR)，最真实的光照效果
import lights_physical_fragment from "./ShaderChunk/lights_physical_fragment.glsl.js";
// 物理光照参数：定义 PBR 光照的 uniform 变量、BRDF 函数和 IBL
import lights_physical_pars_fragment from "./ShaderChunk/lights_physical_pars_fragment.glsl.js";

// === 光照计算流程片段 ===
// 光照计算开始：初始化光照计算所需的变量和数据结构
import lights_fragment_begin from "./ShaderChunk/lights_fragment_begin.glsl.js";
// 光照贴图处理：应用各种光照相关的贴图（法线、粗糙度、金属度等）
import lights_fragment_maps from "./ShaderChunk/lights_fragment_maps.glsl.js";
// 光照计算结束：完成最终的光照计算并输出结果
import lights_fragment_end from "./ShaderChunk/lights_fragment_end.glsl.js";
// === 对数深度缓冲相关片段 ===
// 对数深度缓冲片段：在片段着色器中写入对数深度值，提高深度精度
import logdepthbuf_fragment from "./ShaderChunk/logdepthbuf_fragment.glsl.js";
// 对数深度缓冲片段参数：定义片段着色器中对数深度的 uniform 变量
import logdepthbuf_pars_fragment from "./ShaderChunk/logdepthbuf_pars_fragment.glsl.js";
// 对数深度缓冲顶点参数：定义顶点着色器中对数深度的 uniform 变量
import logdepthbuf_pars_vertex from "./ShaderChunk/logdepthbuf_pars_vertex.glsl.js";
// 对数深度缓冲顶点：在顶点着色器中计算对数深度值
import logdepthbuf_vertex from "./ShaderChunk/logdepthbuf_vertex.glsl.js";

// === 基础贴图相关片段 ===
// 主贴图应用：将主要的漫反射贴图应用到材质颜色
import map_fragment from "./ShaderChunk/map_fragment.glsl.js";
// 主贴图参数：定义主贴图的 uniform 变量和采样器
import map_pars_fragment from "./ShaderChunk/map_pars_fragment.glsl.js";

// === 粒子贴图相关片段 ===
// 粒子贴图应用：专门用于粒子系统的贴图采样和应用
import map_particle_fragment from "./ShaderChunk/map_particle_fragment.glsl.js";
// 粒子贴图参数：定义粒子贴图的 uniform 变量和采样器
import map_particle_pars_fragment from "./ShaderChunk/map_particle_pars_fragment.glsl.js";

// === PBR 材质贴图相关片段 ===
// 金属度贴图应用：从贴图中采样金属度值，用于 PBR 渲染
import metalnessmap_fragment from "./ShaderChunk/metalnessmap_fragment.glsl.js";
// 金属度贴图参数：定义金属度贴图的 uniform 变量和采样器
import metalnessmap_pars_fragment from "./ShaderChunk/metalnessmap_pars_fragment.glsl.js";

// === 变形动画 (Morph Targets) 相关片段 ===
// 变形实例化：处理实例化渲染中的变形动画
import morphinstance_vertex from "./ShaderChunk/morphinstance_vertex.glsl.js";
// 变形颜色：应用变形动画到顶点颜色
import morphcolor_vertex from "./ShaderChunk/morphcolor_vertex.glsl.js";
// 变形法线：应用变形动画到顶点法线
import morphnormal_vertex from "./ShaderChunk/morphnormal_vertex.glsl.js";
// 变形目标参数：定义变形动画的 uniform 变量和 attribute
import morphtarget_pars_vertex from "./ShaderChunk/morphtarget_pars_vertex.glsl.js";
// 变形目标应用：将变形动画应用到顶点位置
import morphtarget_vertex from "./ShaderChunk/morphtarget_vertex.glsl.js";
// === 法线处理相关片段 ===
// 法线计算开始：初始化片段着色器中的法线计算
import normal_fragment_begin from "./ShaderChunk/normal_fragment_begin.glsl.js";
// 法线贴图应用：从法线贴图中采样并应用法线扰动
import normal_fragment_maps from "./ShaderChunk/normal_fragment_maps.glsl.js";
// 法线片段参数：定义片段着色器中法线计算的 uniform 变量
import normal_pars_fragment from "./ShaderChunk/normal_pars_fragment.glsl.js";
// 法线顶点参数：定义顶点着色器中法线处理的 uniform 变量
import normal_pars_vertex from "./ShaderChunk/normal_pars_vertex.glsl.js";
// 法线顶点处理：在顶点着色器中变换法线向量
import normal_vertex from "./ShaderChunk/normal_vertex.glsl.js";
// 法线贴图参数：定义法线贴图的 uniform 变量和采样函数
import normalmap_pars_fragment from "./ShaderChunk/normalmap_pars_fragment.glsl.js";

// === 清漆涂层 (Clear Coat) 相关片段 ===
// 清漆法线计算开始：初始化清漆层的法线计算
import clearcoat_normal_fragment_begin from "./ShaderChunk/clearcoat_normal_fragment_begin.glsl.js";
// 清漆法线贴图：应用清漆层的法线贴图
import clearcoat_normal_fragment_maps from "./ShaderChunk/clearcoat_normal_fragment_maps.glsl.js";
// 清漆涂层参数：定义清漆涂层效果的 uniform 变量，用于汽车漆面等
import clearcoat_pars_fragment from "./ShaderChunk/clearcoat_pars_fragment.glsl.js";

// === 高级材质效果相关片段 ===
// 彩虹色参数：定义彩虹色效果的 uniform 变量和计算函数
import iridescence_pars_fragment from "./ShaderChunk/iridescence_pars_fragment.glsl.js";

// === 渲染管线相关片段 ===
// 不透明片段处理：处理不透明材质的最终输出
import opaque_fragment from "./ShaderChunk/opaque_fragment.glsl.js";
// 数据打包函数：提供深度值和法线的编码/解码函数
import packing from "./ShaderChunk/packing.glsl.js";
// 预乘 Alpha 处理：处理预乘 Alpha 的透明度混合
import premultiplied_alpha_fragment from "./ShaderChunk/premultiplied_alpha_fragment.glsl.js";
// 投影变换：将顶点从世界空间变换到裁剪空间
import project_vertex from "./ShaderChunk/project_vertex.glsl.js";

// === 抖动 (Dithering) 相关片段 ===
// 抖动处理：应用抖动算法减少色带现象
import dithering_fragment from "./ShaderChunk/dithering_fragment.glsl.js";
// 抖动参数：定义抖动算法的 uniform 变量和函数
import dithering_pars_fragment from "./ShaderChunk/dithering_pars_fragment.glsl.js";
// === PBR 粗糙度贴图相关片段 ===
// 粗糙度贴图应用：从贴图中采样粗糙度值，控制表面的微观几何粗糙程度
import roughnessmap_fragment from "./ShaderChunk/roughnessmap_fragment.glsl.js";
// 粗糙度贴图参数：定义粗糙度贴图的 uniform 变量和采样器
import roughnessmap_pars_fragment from "./ShaderChunk/roughnessmap_pars_fragment.glsl.js";

// === 阴影映射相关片段 ===
// 阴影映射片段参数：定义片段着色器中阴影计算的 uniform 变量和函数
import shadowmap_pars_fragment from "./ShaderChunk/shadowmap_pars_fragment.glsl.js";
// 阴影映射顶点参数：定义顶点着色器中阴影计算的 uniform 变量
import shadowmap_pars_vertex from "./ShaderChunk/shadowmap_pars_vertex.glsl.js";
// 阴影映射顶点处理：在顶点着色器中计算阴影坐标
import shadowmap_vertex from "./ShaderChunk/shadowmap_vertex.glsl.js";
// 阴影遮罩参数：定义阴影遮罩的计算函数，用于软阴影和阴影过滤
import shadowmask_pars_fragment from "./ShaderChunk/shadowmask_pars_fragment.glsl.js";

// === 骨骼动画 (Skinning) 相关片段 ===
// 骨骼动画基础：初始化骨骼动画的基础变量和矩阵
import skinbase_vertex from "./ShaderChunk/skinbase_vertex.glsl.js";
// 骨骼动画参数：定义骨骼动画的 uniform 变量、attribute 和函数
import skinning_pars_vertex from "./ShaderChunk/skinning_pars_vertex.glsl.js";
// 骨骼动画顶点：应用骨骼变换到顶点位置
import skinning_vertex from "./ShaderChunk/skinning_vertex.glsl.js";
// 骨骼动画法线：应用骨骼变换到法线向量
import skinnormal_vertex from "./ShaderChunk/skinnormal_vertex.glsl.js";

// === 镜面反射贴图相关片段 ===
// 镜面反射贴图应用：从贴图中采样镜面反射强度，用于 Phong 光照模型
import specularmap_fragment from "./ShaderChunk/specularmap_fragment.glsl.js";
// 镜面反射贴图参数：定义镜面反射贴图的 uniform 变量和采样器
import specularmap_pars_fragment from "./ShaderChunk/specularmap_pars_fragment.glsl.js";

// === 色调映射相关片段 ===
// 色调映射应用：将 HDR 颜色映射到 LDR 显示范围，实现曝光控制
import tonemapping_fragment from "./ShaderChunk/tonemapping_fragment.glsl.js";
// 色调映射参数：定义各种色调映射算法的函数和参数
import tonemapping_pars_fragment from "./ShaderChunk/tonemapping_pars_fragment.glsl.js";

// === 透射效果相关片段 ===
// 透射效果应用：模拟光线穿透半透明材质的效果，如玻璃、水等
import transmission_fragment from "./ShaderChunk/transmission_fragment.glsl.js";
// 透射效果参数：定义透射效果的 uniform 变量和计算函数
import transmission_pars_fragment from "./ShaderChunk/transmission_pars_fragment.glsl.js";

// === UV 纹理坐标相关片段 ===
// UV 坐标片段参数：定义片段着色器中 UV 坐标的 varying 变量
import uv_pars_fragment from "./ShaderChunk/uv_pars_fragment.glsl.js";
// UV 坐标顶点参数：定义顶点着色器中 UV 坐标的 attribute 变量
import uv_pars_vertex from "./ShaderChunk/uv_pars_vertex.glsl.js";
// UV 坐标处理：在顶点着色器中处理和变换 UV 坐标
import uv_vertex from "./ShaderChunk/uv_vertex.glsl.js";

// === 世界坐标相关片段 ===
// 世界坐标计算：计算顶点在世界空间中的位置，用于光照和环境映射
import worldpos_vertex from "./ShaderChunk/worldpos_vertex.glsl.js";

// === 完整着色器程序库 (ShaderLib) ===
// 这些是完整的着色器程序，包含顶点着色器和片段着色器的完整代码

// 背景着色器：用于渲染平面背景（如渐变背景）
import * as background from "./ShaderLib/background.glsl.js";
// 立方体背景着色器：用于渲染天空盒背景
import * as backgroundCube from "./ShaderLib/backgroundCube.glsl.js";
// 立方体着色器：用于渲染简单的立方体几何体
import * as cube from "./ShaderLib/cube.glsl.js";
// 深度着色器：专门用于深度渲染和阴影映射
import * as depth from "./ShaderLib/depth.glsl.js";
// 距离 RGBA 着色器：将距离信息编码到 RGBA 通道，用于点光源阴影
import * as distanceRGBA from "./ShaderLib/distanceRGBA.glsl.js";
// 等距柱状投影着色器：用于全景图像的等距柱状投影
import * as equirect from "./ShaderLib/equirect.glsl.js";
// 虚线着色器：用于渲染虚线效果
import * as linedashed from "./ShaderLib/linedashed.glsl.js";

// === 网格材质着色器 ===
// 基础网格着色器：最简单的材质，支持颜色、贴图和基本透明度
import * as meshbasic from "./ShaderLib/meshbasic.glsl.js";
// Lambert 网格着色器：实现 Lambert 漫反射光照模型
import * as meshlambert from "./ShaderLib/meshlambert.glsl.js";
// MatCap 网格着色器：使用材质捕获贴图实现快速光照效果
import * as meshmatcap from "./ShaderLib/meshmatcap.glsl.js";
// 法线网格着色器：将法线信息可视化为颜色
import * as meshnormal from "./ShaderLib/meshnormal.glsl.js";
// Phong 网格着色器：实现 Phong 光照模型，支持镜面反射
import * as meshphong from "./ShaderLib/meshphong.glsl.js";
// 物理网格着色器：实现基于物理的渲染 (PBR)，最真实的光照
import * as meshphysical from "./ShaderLib/meshphysical.glsl.js";
// 卡通网格着色器：实现卡通风格的非真实感渲染
import * as meshtoon from "./ShaderLib/meshtoon.glsl.js";

// === 特殊渲染着色器 ===
// 点精灵着色器：用于渲染粒子系统和点云
import * as points from "./ShaderLib/points.glsl.js";
// 阴影着色器：专门用于阴影映射的渲染
import * as shadow from "./ShaderLib/shadow.glsl.js";
// 精灵着色器：用于渲染始终面向摄像机的 2D 精灵
import * as sprite from "./ShaderLib/sprite.glsl.js";

/**
 * 着色器代码片段集合
 *
 * 包含所有可用的着色器代码片段，按功能分类组织。
 * 这些片段在运行时会根据材质属性和渲染设置动态组合成完整的着色器程序。
 *
 * 详细功能分类：
 *
 * === 透明度和 Alpha 处理 ===
 * - alphahash_*: Alpha 哈希抖动，避免透明度排序问题
 * - alphamap_*: Alpha 贴图采样和应用
 * - alphatest_*: Alpha 测试，硬边透明效果
 *
 * === 纹理映射系统 ===
 * - aomap_*: 环境光遮蔽贴图，增强阴影细节
 * - bumpmap_*: 凹凸贴图，法线扰动
 * - normalmap_*: 法线贴图，表面细节
 * - roughnessmap_*: 粗糙度贴图，PBR 材质
 * - metalnessmap_*: 金属度贴图，PBR 材质
 * - specularmap_*: 镜面反射贴图，Phong 材质
 * - emissivemap_*: 自发光贴图，发光效果
 * - map_*: 主要漫反射贴图
 *
 * === 光照计算系统 ===
 * - lights_lambert_*: Lambert 漫反射光照模型
 * - lights_phong_*: Phong 镜面反射光照模型
 * - lights_physical_*: 基于物理的渲染 (PBR)
 * - lights_toon_*: 卡通风格光照
 * - bsdfs: 双向散射分布函数，PBR 核心
 *
 * === 动画系统 ===
 * - morphtarget_*: 变形动画 (Morph Targets)
 * - skinning_*: 骨骼动画 (Skeletal Animation)
 * - batching_*: 批处理渲染，实例化
 *
 * === 阴影系统 ===
 * - shadowmap_*: 阴影映射计算
 * - shadowmask_*: 阴影遮罩和过滤
 *
 * === 环境效果 ===
 * - envmap_*: 环境映射，反射和折射
 * - cube_uv_*: 立方体 UV 映射
 * - fog_*: 雾效果
 * - transmission_*: 透射效果，玻璃材质
 * - iridescence_*: 彩虹色效果，薄膜干涉
 * - clearcoat_*: 清漆涂层，汽车漆面
 *
 * === 渲染管线 ===
 * - colorspace_*: 颜色空间转换
 * - tonemapping_*: 色调映射，HDR 到 LDR
 * - dithering_*: 抖动算法，减少色带
 * - logdepthbuf_*: 对数深度缓冲，提高精度
 *
 * === 几何处理 ===
 * - begin_*, beginnormal_*: 顶点和法线初始化
 * - project_*: 投影变换
 * - worldpos_*: 世界坐标计算
 * - uv_*: 纹理坐标处理
 * - normal_*: 法线计算和变换
 * - displacementmap_*: 位移贴图，几何细节
 *
 * === 特殊效果 ===
 * - clipping_planes_*: 裁剪平面
 * - gradientmap_*: 渐变映射，卡通渲染
 * - lightmap_*: 光照贴图，预计算光照
 * - packing: 数据编码/解码函数
 */
export const ShaderChunk = {
  alphahash_fragment: alphahash_fragment,
  alphahash_pars_fragment: alphahash_pars_fragment,
  alphamap_fragment: alphamap_fragment,
  alphamap_pars_fragment: alphamap_pars_fragment,
  alphatest_fragment: alphatest_fragment,
  alphatest_pars_fragment: alphatest_pars_fragment,
  aomap_fragment: aomap_fragment,
  aomap_pars_fragment: aomap_pars_fragment,
  batching_pars_vertex: batching_pars_vertex,
  batching_vertex: batching_vertex,
  begin_vertex: begin_vertex,
  beginnormal_vertex: beginnormal_vertex,
  bsdfs: bsdfs,
  iridescence_fragment: iridescence_fragment,
  bumpmap_pars_fragment: bumpmap_pars_fragment,
  clipping_planes_fragment: clipping_planes_fragment,
  clipping_planes_pars_fragment: clipping_planes_pars_fragment,
  clipping_planes_pars_vertex: clipping_planes_pars_vertex,
  clipping_planes_vertex: clipping_planes_vertex,
  color_fragment: color_fragment,
  color_pars_fragment: color_pars_fragment,
  color_pars_vertex: color_pars_vertex,
  color_vertex: color_vertex,
  common: common,
  cube_uv_reflection_fragment: cube_uv_reflection_fragment,
  defaultnormal_vertex: defaultnormal_vertex,
  displacementmap_pars_vertex: displacementmap_pars_vertex,
  displacementmap_vertex: displacementmap_vertex,
  emissivemap_fragment: emissivemap_fragment,
  emissivemap_pars_fragment: emissivemap_pars_fragment,
  colorspace_fragment: colorspace_fragment,
  colorspace_pars_fragment: colorspace_pars_fragment,
  envmap_fragment: envmap_fragment,
  envmap_common_pars_fragment: envmap_common_pars_fragment,
  envmap_pars_fragment: envmap_pars_fragment,
  envmap_pars_vertex: envmap_pars_vertex,
  envmap_physical_pars_fragment: envmap_physical_pars_fragment,
  envmap_vertex: envmap_vertex,
  fog_vertex: fog_vertex,
  fog_pars_vertex: fog_pars_vertex,
  fog_fragment: fog_fragment,
  fog_pars_fragment: fog_pars_fragment,
  gradientmap_pars_fragment: gradientmap_pars_fragment,
  lightmap_pars_fragment: lightmap_pars_fragment,
  lights_lambert_fragment: lights_lambert_fragment,
  lights_lambert_pars_fragment: lights_lambert_pars_fragment,
  lights_pars_begin: lights_pars_begin,
  lights_toon_fragment: lights_toon_fragment,
  lights_toon_pars_fragment: lights_toon_pars_fragment,
  lights_phong_fragment: lights_phong_fragment,
  lights_phong_pars_fragment: lights_phong_pars_fragment,
  lights_physical_fragment: lights_physical_fragment,
  lights_physical_pars_fragment: lights_physical_pars_fragment,
  lights_fragment_begin: lights_fragment_begin,
  lights_fragment_maps: lights_fragment_maps,
  lights_fragment_end: lights_fragment_end,
  logdepthbuf_fragment: logdepthbuf_fragment,
  logdepthbuf_pars_fragment: logdepthbuf_pars_fragment,
  logdepthbuf_pars_vertex: logdepthbuf_pars_vertex,
  logdepthbuf_vertex: logdepthbuf_vertex,
  map_fragment: map_fragment,
  map_pars_fragment: map_pars_fragment,
  map_particle_fragment: map_particle_fragment,
  map_particle_pars_fragment: map_particle_pars_fragment,
  metalnessmap_fragment: metalnessmap_fragment,
  metalnessmap_pars_fragment: metalnessmap_pars_fragment,
  morphinstance_vertex: morphinstance_vertex,
  morphcolor_vertex: morphcolor_vertex,
  morphnormal_vertex: morphnormal_vertex,
  morphtarget_pars_vertex: morphtarget_pars_vertex,
  morphtarget_vertex: morphtarget_vertex,
  normal_fragment_begin: normal_fragment_begin,
  normal_fragment_maps: normal_fragment_maps,
  normal_pars_fragment: normal_pars_fragment,
  normal_pars_vertex: normal_pars_vertex,
  normal_vertex: normal_vertex,
  normalmap_pars_fragment: normalmap_pars_fragment,
  clearcoat_normal_fragment_begin: clearcoat_normal_fragment_begin,
  clearcoat_normal_fragment_maps: clearcoat_normal_fragment_maps,
  clearcoat_pars_fragment: clearcoat_pars_fragment,
  iridescence_pars_fragment: iridescence_pars_fragment,
  opaque_fragment: opaque_fragment,
  packing: packing,
  premultiplied_alpha_fragment: premultiplied_alpha_fragment,
  project_vertex: project_vertex,
  dithering_fragment: dithering_fragment,
  dithering_pars_fragment: dithering_pars_fragment,
  roughnessmap_fragment: roughnessmap_fragment,
  roughnessmap_pars_fragment: roughnessmap_pars_fragment,
  shadowmap_pars_fragment: shadowmap_pars_fragment,
  shadowmap_pars_vertex: shadowmap_pars_vertex,
  shadowmap_vertex: shadowmap_vertex,
  shadowmask_pars_fragment: shadowmask_pars_fragment,
  skinbase_vertex: skinbase_vertex,
  skinning_pars_vertex: skinning_pars_vertex,
  skinning_vertex: skinning_vertex,
  skinnormal_vertex: skinnormal_vertex,
  specularmap_fragment: specularmap_fragment,
  specularmap_pars_fragment: specularmap_pars_fragment,
  tonemapping_fragment: tonemapping_fragment,
  tonemapping_pars_fragment: tonemapping_pars_fragment,
  transmission_fragment: transmission_fragment,
  transmission_pars_fragment: transmission_pars_fragment,
  uv_pars_fragment: uv_pars_fragment,
  uv_pars_vertex: uv_pars_vertex,
  uv_vertex: uv_vertex,
  worldpos_vertex: worldpos_vertex,

  background_vert: background.vertex,
  background_frag: background.fragment,
  backgroundCube_vert: backgroundCube.vertex,
  backgroundCube_frag: backgroundCube.fragment,
  cube_vert: cube.vertex,
  cube_frag: cube.fragment,
  depth_vert: depth.vertex,
  depth_frag: depth.fragment,
  distanceRGBA_vert: distanceRGBA.vertex,
  distanceRGBA_frag: distanceRGBA.fragment,
  equirect_vert: equirect.vertex,
  equirect_frag: equirect.fragment,
  linedashed_vert: linedashed.vertex,
  linedashed_frag: linedashed.fragment,
  meshbasic_vert: meshbasic.vertex,
  meshbasic_frag: meshbasic.fragment,
  meshlambert_vert: meshlambert.vertex,
  meshlambert_frag: meshlambert.fragment,
  meshmatcap_vert: meshmatcap.vertex,
  meshmatcap_frag: meshmatcap.fragment,
  meshnormal_vert: meshnormal.vertex,
  meshnormal_frag: meshnormal.fragment,
  meshphong_vert: meshphong.vertex,
  meshphong_frag: meshphong.fragment,
  meshphysical_vert: meshphysical.vertex,
  meshphysical_frag: meshphysical.fragment,
  meshtoon_vert: meshtoon.vertex,
  meshtoon_frag: meshtoon.fragment,
  points_vert: points.vertex,
  points_frag: points.fragment,
  shadow_vert: shadow.vertex,
  shadow_frag: shadow.fragment,
  sprite_vert: sprite.vertex,
  sprite_frag: sprite.fragment,
};
