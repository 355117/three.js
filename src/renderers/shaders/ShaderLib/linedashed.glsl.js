export const vertex = /* glsl */` // 顶点着色器：虚线
uniform float scale; // 线段距离缩放
attribute float lineDistance; // 输入属性：该点沿线段的累计距离

varying float vLineDistance; // 输出到片元：用于计算虚线片段

#include <common> // 通用宏/函数
#include <uv_pars_vertex> // UV 参数
#include <color_pars_vertex> // 顶点色参数
#include <fog_pars_vertex> // 雾化参数
#include <morphtarget_pars_vertex> // 形变参数
#include <logdepthbuf_pars_vertex> // 对数深度参数
#include <clipping_planes_pars_vertex> // 裁剪平面参数

void main() { // 顶点主函数

	vLineDistance = scale * lineDistance; // 计算缩放后的线段距离

	#include <uv_vertex> // UV 传递
	#include <color_vertex> // 顶点色传递
	#include <morphinstance_vertex> // 实例/形变处理
	#include <morphcolor_vertex> // 形变颜色
	#include <begin_vertex> // 顶点起始
	#include <morphtarget_vertex> // 形变顶点
	#include <project_vertex> // 投影
	#include <logdepthbuf_vertex> // 对数深度
	#include <clipping_planes_vertex> // 裁剪平面
	#include <fog_vertex> // 雾化

} // 结束
`; // 顶点着色器字符串结束

export const fragment = /* glsl */` // 片元着色器：虚线
uniform vec3 diffuse; // 基础漫反射颜色
uniform float opacity; // 不透明度

uniform float dashSize; // 虚线中“实线”长度
uniform float totalSize; // 虚线重复周期（实线+空白）

varying float vLineDistance; // 来自顶点的距离值

#include <common> // 通用
#include <color_pars_fragment> // 片元颜色参数
#include <uv_pars_fragment> // UV 参数
#include <map_pars_fragment> // 贴图参数
#include <fog_pars_fragment> // 雾化参数
#include <logdepthbuf_pars_fragment> // 对数深度
#include <clipping_planes_pars_fragment> // 裁剪平面参数

void main() { // 片元主函数

	vec4 diffuseColor = vec4( diffuse, opacity ); // 初始颜色
	#include <clipping_planes_fragment> // 执行裁剪测试

	if ( mod( vLineDistance, totalSize ) > dashSize ) { // 超出实线段则丢弃

		discard; // 制造空白段

	} // 条件结束

	vec3 outgoingLight = vec3( 0.0 ); // 输出光颜色

	#include <logdepthbuf_fragment> // 深度处理
	#include <map_fragment> // 采样贴图
	#include <color_fragment> // 应用顶点色

	outgoingLight = diffuseColor.rgb; // 简单着色：输出漫反射

	#include <opaque_fragment> // 不透明写入
	#include <tonemapping_fragment> // 色调映射
	#include <colorspace_fragment> // 颜色空间
	#include <fog_fragment> // 雾化
	#include <premultiplied_alpha_fragment> // 预乘Alpha

} // 结束
`; // 片元着色器字符串结束
