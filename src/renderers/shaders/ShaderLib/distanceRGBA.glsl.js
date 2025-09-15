export const vertex = /* glsl */` // 顶点着色器：输出距离（RGBA编码）
#define DISTANCE // 启用距离模式

varying vec3 vWorldPosition; // 传递到片元的世界位置

#include <common> // 通用
#include <batching_pars_vertex> // 批处理参数
#include <uv_pars_vertex> // UV 参数
#include <displacementmap_pars_vertex> // 位移贴图参数
#include <morphtarget_pars_vertex> // 形变参数
#include <skinning_pars_vertex> // 骨骼参数
#include <clipping_planes_pars_vertex> // 裁剪平面参数

void main() { // 顶点主函数

	#include <uv_vertex> // UV 传递

	#include <batching_vertex> // 批处理
	#include <skinbase_vertex> // 骨骼基础

	#include <morphinstance_vertex> // 形变/实例

	#ifdef USE_DISPLACEMENTMAP // 若使用位移贴图

		#include <beginnormal_vertex> // 法线起始
		#include <morphnormal_vertex> // 形变法线
		#include <skinnormal_vertex> // 骨骼法线

	#endif // 结束

	#include <begin_vertex> // 顶点起始
	#include <morphtarget_vertex> // 形变顶点
	#include <skinning_vertex> // 骨骼顶点
	#include <displacementmap_vertex> // 顶点位移
	#include <project_vertex> // 投影
	#include <worldpos_vertex> // 计算世界位置
	#include <clipping_planes_vertex> // 裁剪平面

	vWorldPosition = worldPosition.xyz; // 将世界位置传递给片元

} // 结束
`; // 顶点着色器字符串结束

export const fragment = /* glsl */` // 片元着色器：输出距离（RGBA编码）
#define DISTANCE // 与顶点对应的宏

uniform vec3 referencePosition; // 参考位置（距离起点）
uniform float nearDistance; // 近距离阈值
uniform float farDistance; // 远距离阈值
varying vec3 vWorldPosition; // 顶点阶段传来的世界位置

#include <common> // 通用
#include <packing> // 深度/距离打包
#include <uv_pars_fragment> // UV 参数
#include <map_pars_fragment> // 贴图参数
#include <alphamap_pars_fragment> // Alpha贴图
#include <alphatest_pars_fragment> // Alpha测试
#include <alphahash_pars_fragment> // Alpha哈希
#include <clipping_planes_pars_fragment> // 裁剪平面

void main () { // 片元主函数

	vec4 diffuseColor = vec4( 1.0 ); // 基础白色
	#include <clipping_planes_fragment> // 执行裁剪

	#include <map_fragment> // 采样贴图
	#include <alphamap_fragment> // Alpha贴图
	#include <alphatest_fragment> // Alpha测试
	#include <alphahash_fragment> // Alpha哈希

	float dist = length( vWorldPosition - referencePosition ); // 计算距离
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance ); // 归一化到0..1
	dist = saturate( dist ); // clamp到[0,1]

	gl_FragColor = packDepthToRGBA( dist ); // 将距离打包为RGBA输出

} // 结束
`; // 片元着色器字符串结束
