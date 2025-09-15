export const vertex = /* glsl */` // 导出 MeshToonMaterial 顶点着色器
#define TOON // 使用卡通渲染（Toon）模型

varying vec3 vViewPosition; // 视图空间位置（供片元光照分级）

// 通用与参数片段
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

void main() { // 顶点着色器主函数

	#include <uv_vertex> // 处理 UV
	#include <color_vertex> // 处理颜色
	#include <morphinstance_vertex> // 实例化形变
	#include <morphcolor_vertex> // 形变颜色
	#include <batching_vertex> // 批处理

	// 法线计算
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>

	// 顶点位置与投影
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

	vViewPosition = - mvPosition.xyz; // 记录视图空间位置

	// 世界位置、阴影与雾化
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>

} // 顶点着色器结束
`;

export const fragment = /* glsl */` // 导出 MeshToonMaterial 片元着色器
#define TOON // 卡通渲染宏

uniform vec3 diffuse;  // 漫反射颜色
uniform vec3 emissive; // 自发光颜色
uniform float opacity; // 透明度

// 通用与工具片段
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() { // 片元着色器主函数

	vec4 diffuseColor = vec4( diffuse, opacity ); // 基础漫反射颜色
	#include <clipping_planes_fragment> // 裁剪测试

	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) ); // 反射光容器
	vec3 totalEmissiveRadiance = emissive; // 自发光

	// 深度与贴图
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>

	// 光照累积（Toon：分级漫反射）
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>

	// AO 调制
	#include <aomap_fragment>

	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance; // 合成输出

	// 后处理与输出
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>

} // 片元着色器结束
`;
