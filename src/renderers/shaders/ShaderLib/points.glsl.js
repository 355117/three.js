export const vertex = /* glsl */` // 导出 PointsMaterial 顶点着色器
uniform float size;  // 点精灵基准像素尺寸
uniform float scale; // 随距离衰减时的缩放系数

// 通用与参数片段
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

#ifdef USE_POINTS_UV // 是否为每个点使用单独的 UV

	varying vec2 vUv; // 传递点的 UV 坐标
	uniform mat3 uvTransform; // UV 变换矩阵

#endif // 结束点 UV 条件

void main() { // 顶点着色器主函数

	#ifdef USE_POINTS_UV // 计算点的 UV

		vUv = ( uvTransform * vec3( uv, 1 ) ).xy; // 应用 UV 变换

	#endif // 结束点 UV 条件

	// 颜色与形变
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>

	gl_PointSize = size; // 设置基础点大小

	#ifdef USE_SIZEATTENUATION // 开启随距离衰减的点大小

		bool isPerspective = isPerspectiveMatrix( projectionMatrix ); // 判断投影是否为透视

		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z ); // 透视投影：根据深度缩放点大小

	#endif // 结束衰减条件

	// 深度、裁剪、世界位置与雾化插值
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>

} // 顶点着色器结束
`;

export const fragment = /* glsl */` // 导出 PointsMaterial 片元着色器
uniform vec3 diffuse;  // 点颜色
uniform float opacity; // 透明度

// 通用与参数片段
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() { // 片元着色器主函数

	vec4 diffuseColor = vec4( diffuse, opacity ); // 基础颜色
	#include <clipping_planes_fragment> // 裁剪测试

	vec3 outgoingLight = vec3( 0.0 ); // 初始化输出光

	// 深度与贴图、颜色与透明处理
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>

	outgoingLight = diffuseColor.rgb; // 最终颜色来自 diffuseColor

	// 输出与后处理
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>

} // 片元着色器结束
`;
