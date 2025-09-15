export const vertex = /* glsl */` // 顶点着色器：阴影体渲染
#include <common> // 通用定义
#include <batching_pars_vertex> // 批处理参数
#include <fog_pars_vertex> // 雾化参数
#include <morphtarget_pars_vertex> // 形变目标参数
#include <skinning_pars_vertex> // 骨骼蒙皮参数
#include <logdepthbuf_pars_vertex> // 对数深度缓冲参数
#include <shadowmap_pars_vertex> // 阴影映射参数

void main() { // 顶点主函数

	#include <batching_vertex> // 批处理顶点变换

	#include <beginnormal_vertex> // 法线起始
	#include <morphinstance_vertex> // 实例/形变处理
	#include <morphnormal_vertex> // 形变法线
	#include <skinbase_vertex> // 骨骼基础
	#include <skinnormal_vertex> // 骨骼法线
	#include <defaultnormal_vertex> // 默认法线

	#include <begin_vertex> // 顶点起始
	#include <morphtarget_vertex> // 形变顶点
	#include <skinning_vertex> // 骨骼顶点
	#include <project_vertex> // 投影到裁剪空间
	#include <logdepthbuf_vertex> // 写入对数深度

	#include <worldpos_vertex> // 世界位置
	#include <shadowmap_vertex> // 阴影映射相关输出
	#include <fog_vertex> // 雾化顶点阶段

} // 结束
`; // 顶点着色器字符串结束

export const fragment = /* glsl */` // 片元着色器：阴影体渲染
uniform vec3 color; // 基础颜色
uniform float opacity; // 不透明度

#include <common> // 通用定义
#include <packing> // 打包/解包
#include <fog_pars_fragment> // 雾化参数（片元）
#include <bsdfs> // BRDF/BSDF 工具
#include <lights_pars_begin> // 光照参数开始
#include <logdepthbuf_pars_fragment> // 对数深度参数（片元）
#include <shadowmap_pars_fragment> // 阴影贴图采样参数
#include <shadowmask_pars_fragment> // 阴影遮罩函数

void main() { // 片元主函数

	#include <logdepthbuf_fragment> // 对数深度处理

	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) ); // 根据阴影遮罩降低不透明度

	#include <tonemapping_fragment> // 色调映射
	#include <colorspace_fragment> // 颜色空间
	#include <fog_fragment> // 雾化片元阶段

} // 结束
`; // 片元着色器字符串结束
