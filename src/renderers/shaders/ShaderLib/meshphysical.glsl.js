export const vertex = /* glsl */` // 导出 MeshPhysicalMaterial 顶点着色器
#define STANDARD // 标准物理模型（PBR）

varying vec3 vViewPosition; // 视图空间位置（供片元侧使用）

#ifdef USE_TRANSMISSION // 透光（折射/传输）时需要世界空间位置

	varying vec3 vWorldPosition; // 世界空间位置（供片元传输使用）

#endif // 结束传输条件

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

	#include <uv_vertex> // UV
	#include <color_vertex> // 顶点颜色
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

#ifdef USE_TRANSMISSION // 若启用透光，传递世界空间位置

	vWorldPosition = worldPosition.xyz; // 保存世界空间坐标

#endif // 结束透光条件
} // 顶点着色器结束
`;

export const fragment = /* glsl */` // 导出 MeshPhysicalMaterial 片元着色器
#define STANDARD // 标准物理模型

#ifdef PHYSICAL // 完整物理模型时启用 IOR 与 Specular
	#define IOR // 折射率支持
	#define USE_SPECULAR // 启用镜面反射分量
#endif // 结束 PHYSICAL 条件

uniform vec3 diffuse;   // 漫反射颜色
uniform vec3 emissive;  // 自发光颜色
uniform float roughness; // 粗糙度（0 光滑，1 粗糙）
uniform float metalness; // 金属度（0 绝缘体，1 金属）
uniform float opacity;  // 透明度

#ifdef IOR
	uniform float ior; // 介质折射率
#endif

#ifdef USE_SPECULAR
	uniform float specularIntensity; // 镜面强度
	uniform vec3 specularColor;      // 镜面颜色

	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap; // 镜面颜色贴图
	#endif

	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap; // 镜面强度贴图
	#endif
#endif // 结束镜面参数

#ifdef USE_CLEARCOAT
	uniform float clearcoat;          // 清漆层强度
	uniform float clearcoatRoughness; // 清漆层粗糙度
#endif

#ifdef USE_DISPERSION
	uniform float dispersion; // 色散强度
#endif

#ifdef USE_IRIDESCENCE
	uniform float iridescence;                 // 变彩强度
	uniform float iridescenceIOR;              // 变彩折射率
	uniform float iridescenceThicknessMinimum; // 最小薄膜厚度
	uniform float iridescenceThicknessMaximum; // 最大薄膜厚度
#endif

#ifdef USE_SHEEN
	uniform vec3 sheenColor;    // 绒面反射颜色
	uniform float sheenRoughness; // 绒面粗糙度

	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap; // 绒面颜色贴图
	#endif

	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap; // 绒面粗糙度贴图
	#endif
#endif // 结束绒面

#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector; // 各向异性方向与强度

	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap; // 各向异性贴图
	#endif
#endif // 结束各向异性

varying vec3 vViewPosition; // 视图空间位置（来自顶点着色器）

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
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() { // 片元着色器主函数

	vec4 diffuseColor = vec4( diffuse, opacity ); // 基础漫反射颜色
	#include <clipping_planes_fragment> // 裁剪测试

	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) ); // 反射光容器
	vec3 totalEmissiveRadiance = emissive; // 自发光

	// 深度与贴图、材质属性采样
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>

	// 光照累积（物理 BRDF）
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>

	// AO 调制
	#include <aomap_fragment>

	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;   // 总漫反射
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular; // 总镜面

	#include <transmission_fragment> // 透光（折射/次表面传输）

	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance; // 合成输出

	#ifdef USE_SHEEN // 绒面能量补偿与叠加

		// Sheen 能量补偿近似的推导可参考文末链接
		// https://drive.google.com/file/d/1T0D1VSyR4AllqIJTQAraEIzjlb5h4FKH/view?usp=sharing
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor ); // 能量补偿系数

		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect; // 叠加绒面高光

	#endif // 结束绒面

	#ifdef USE_CLEARCOAT // 清漆层反射叠加

		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) ); // 视角与清漆法线夹角

		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc ); // 清漆菲涅尔

		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat; // 混合清漆贡献

	#endif // 结束清漆

	// 输出与后处理
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>

} // 片元着色器结束
`;
