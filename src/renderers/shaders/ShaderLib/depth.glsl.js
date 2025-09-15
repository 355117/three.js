export const vertex = /* glsl */` // 导出顶点着色器源码（GLSL 模板字符串）
// 引入通用着色器片段：common
#include <common>
// 引入批处理相关的顶点参数定义
#include <batching_pars_vertex>
// 引入 UV 坐标相关的顶点参数定义
#include <uv_pars_vertex>
// 引入位移贴图相关的顶点参数定义
#include <displacementmap_pars_vertex>
// 引入形态目标（morph target）相关的顶点参数定义
#include <morphtarget_pars_vertex>
// 引入骨骼蒙皮相关的顶点参数定义
#include <skinning_pars_vertex>
// 引入对数深度缓冲相关的顶点参数定义
#include <logdepthbuf_pars_vertex>
// 引入裁剪平面相关的顶点参数定义
#include <clipping_planes_pars_vertex>

// 说明：以下变量用于尽可能高精度地计算等价于 gl_FragCoord.z 的值。
// 一些平台以较低精度计算 gl_FragCoord，手动计算的值在基于深度的后期处理中效果更好。
// 已在搭载 A10 处理器、iPadOS 13.3.1 的 iPad 上复现。
varying vec2 vHighPrecisionZW; // 存储 gl_Position 的 z 和 w 分量，用于片元阶段高精度计算

void main() { // 顶点着色器主函数入口

	// 计算并传递 UV 坐标
	#include <uv_vertex>

	// 执行批处理相关的顶点变换
	#include <batching_vertex>
	// 设置皮肤基准姿态（用于骨骼蒙皮）
	#include <skinbase_vertex>

	// 处理实例化形变（morph instance）
	#include <morphinstance_vertex>

	#ifdef USE_DISPLACEMENTMAP // 如启用位移贴图，则需要正确的法线

		// 计算基础法线
		#include <beginnormal_vertex>
		// 应用形态目标对法线的影响
		#include <morphnormal_vertex>
		// 应用骨骼蒙皮对法线的影响
		#include <skinnormal_vertex>

	#endif // 结束位移贴图条件

	// 顶点位置计算起始（包含常规位移）
	#include <begin_vertex>
	// 应用形态目标（morph target）位移
	#include <morphtarget_vertex>
	// 应用骨骼蒙皮变换
	#include <skinning_vertex>
	// 应用位移贴图对位置的影响
	#include <displacementmap_vertex>
	// 将顶点从视图空间投影到裁剪空间，写入 gl_Position
	#include <project_vertex>
	// 对数深度缓冲写入支持
	#include <logdepthbuf_vertex>
	// 用户裁剪平面相关处理
	#include <clipping_planes_vertex>

	vHighPrecisionZW = gl_Position.zw; // 捕获投影后位置的 z、w 分量（用于片元高精度深度）

} // 顶点着色器结束
`;

export const fragment = /* glsl */` // 导出片元着色器源码（GLSL 模板字符串）
#if DEPTH_PACKING == 3200 // 若使用基本的深度打包格式（3200），声明不透明度 uniform

	uniform float opacity; // 不透明度，影响输出 alpha 值

#endif // 结束对 3200 模式的条件

// 引入通用片元片段：common（包含常用函数和宏）
#include <common>
// 引入深度打包与解包相关工具
#include <packing>
// 引入 UV 坐标相关的片元参数
#include <uv_pars_fragment>
// 引入颜色贴图相关的片元参数
#include <map_pars_fragment>
// 引入透明度贴图相关的片元参数
#include <alphamap_pars_fragment>
// 引入 alpha 测试（丢弃片元）相关的片元参数
#include <alphatest_pars_fragment>
// 引入 Alpha Hash 抗锯齿透明相关参数
#include <alphahash_pars_fragment>
// 引入对数深度缓冲相关的片元参数
#include <logdepthbuf_pars_fragment>
// 引入裁剪平面相关的片元参数
#include <clipping_planes_pars_fragment>

varying vec2 vHighPrecisionZW; // 从顶点阶段传入的高精度 z、w 值

void main() { // 片元着色器主函数入口

	vec4 diffuseColor = vec4( 1.0 ); // 基础颜色初始化为白色（alpha 为 1）
	#include <clipping_planes_fragment> // 裁剪平面测试与丢弃

	#if DEPTH_PACKING == 3200 // 若深度打包模式为 3200，则使用统一的不透明度

		diffuseColor.a = opacity; // 设置输出透明度

	#endif // 结束 3200 模式条件

	// 应用贴图、透明度与测试相关处理
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>

	// 对数深度写入支持
	#include <logdepthbuf_fragment>

	// 计算比 gl_FragCoord.z 更高精度的等价值

	#ifdef USE_REVERSEDEPTHBUF // 若启用反向深度缓冲

		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ]; // 直接使用 z/w（反向深度）

	#else // 常规深度缓冲

		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5; // 将 NDC z 映射到 [0,1]

	#endif // 结束反向深度条件

	// 根据不同的打包模式输出深度
	#if DEPTH_PACKING == 3200 // 基础：线性灰度（1.0 - z）到 RGB，alpha 为不透明度

		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity ); // 反转深度用于颜色展示

	#elif DEPTH_PACKING == 3201 // RGBA 打包深度（高精度）

		gl_FragColor = packDepthToRGBA( fragCoordZ ); // 将深度压缩到 RGBA 四通道

	#elif DEPTH_PACKING == 3202 // RGB 打包深度（忽略 alpha）

		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 ); // 深度编码到 RGB，alpha 固定 1

	#elif DEPTH_PACKING == 3203 // RG 打包深度（两通道）

		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 ); // 深度编码到 RG，其余分量补齐

	#endif // 结束深度打包分支

} // 片元着色器结束
`;
