export const vertex = /* glsl */` // 导出 MeshPhongMaterial 顶点着色器
#define PHONG // 使用 Phong 光照模型

varying vec3 vViewPosition; // 视图空间位置（供片元侧使用）

// 通用与参数片段
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

void main() { // 顶点着色器主函数

	#include <uv_vertex>        // 处理 UV
	#include <color_vertex>     // 处理颜色
	#include <morphcolor_vertex>// 形变颜色
	#include <batching_vertex>  // 批处理位移

	// 法线计算
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>

	// 顶点位置计算与投影
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

	vViewPosition = - mvPosition.xyz; // 记录视图空间位置

	// 世界位置、环境与阴影、雾化
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>

} // 顶点着色器结束
`;

export const fragment = /* glsl */` // 导出 MeshPhongMaterial 片元着色器
#define PHONG // Phong 模型宏

uniform vec3 diffuse;   // 漫反射颜色
uniform vec3 emissive;  // 自发光颜色
uniform vec3 specular;  // 高光颜色
uniform float shininess; // 高光粗糙度（越大越尖锐）
uniform float opacity;  // 透明度

// 工具与参数片段
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
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() { // 片元着色器主函数

	vec4 diffuseColor = vec4( diffuse, opacity ); // 基础漫反射颜色
	#include <clipping_planes_fragment> // 裁剪测试

	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) ); // 反射光容器
	vec3 totalEmissiveRadiance = emissive; // 自发光初值

	// 深度与贴图准备
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin> // 片元法线起始
	#include <normal_fragment_maps>  // 法线/凹凸贴图
	#include <emissivemap_fragment>  // 自发光贴图

	// 光照累积（Phong：漫反射 + 高光）
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>

	// AO 调制
	#include <aomap_fragment>

	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance; // 组合输出

	// 环境与后处理
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>

} // 片元着色器结束
`;
