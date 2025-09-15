export const vertex = /* glsl */` // 导出 MeshLambertMaterial 顶点着色器
// 使用 Lambert 漫反射模型（通过宏标记）
#define LAMBERT

varying vec3 vViewPosition; // 视图空间位置（供片元阶段用于光照）

// 通用顶点片段
#include <common>
// 批处理参数
#include <batching_pars_vertex>
// UV 参数
#include <uv_pars_vertex>
// 位移贴图参数
#include <displacementmap_pars_vertex>
// 环境贴图参数
#include <envmap_pars_vertex>
// 顶点颜色参数
#include <color_pars_vertex>
// 雾化参数（顶点侧）
#include <fog_pars_vertex>
// 法线参数（顶点侧）
#include <normal_pars_vertex>
// 形态目标参数
#include <morphtarget_pars_vertex>
// 骨骼蒙皮参数
#include <skinning_pars_vertex>
// 阴影贴图（顶点侧）参数
#include <shadowmap_pars_vertex>
// 对数深度参数（顶点侧）
#include <logdepthbuf_pars_vertex>
// 裁剪平面参数（顶点侧）
#include <clipping_planes_pars_vertex>

void main() { // 顶点着色器主函数

	// 处理 UV 与颜色
	#include <uv_vertex>
	#include <color_vertex>
	// 实例化形变与颜色
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	// 批处理位移
	#include <batching_vertex>

	// 法线计算流程
	#include <beginnormal_vertex> // 获取基础法线
	#include <morphnormal_vertex> // 应用形变法线
	#include <skinbase_vertex>    // 骨骼基姿态（法线）
	#include <skinnormal_vertex>  // 骨骼蒙皮（法线）
	#include <defaultnormal_vertex> // 默认法线兜底
	#include <normal_vertex>        // 法线标准化与变换

	// 位置计算流程
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

	vViewPosition = - mvPosition.xyz; // 保存视图空间坐标（相机空间）

	// 其他插值量与效果
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>

} // 顶点着色器结束
`;

export const fragment = /* glsl */` // 导出 MeshLambertMaterial 片元着色器
#define LAMBERT // 使用 Lambert 光照模型（与顶点侧一致）

uniform vec3 diffuse;  // 漫反射基色
uniform vec3 emissive; // 自发光颜色
uniform float opacity; // 不透明度

// 通用工具与宏
#include <common>
// 深度打包/解包工具
#include <packing>
// 抖动工具（减少色带）
#include <dithering_pars_fragment>
// 顶点颜色片段
#include <color_pars_fragment>
// UV 片段
#include <uv_pars_fragment>
// 颜色贴图片段
#include <map_pars_fragment>
// 透明度贴图片段
#include <alphamap_pars_fragment>
// alpha 测试片段
#include <alphatest_pars_fragment>
// Alpha Hash 透明抗锯齿
#include <alphahash_pars_fragment>
// AO 片段
#include <aomap_pars_fragment>
// 光照贴图片段（烘焙光）
#include <lightmap_pars_fragment>
// 自发光贴图片段
#include <emissivemap_pars_fragment>
// 环境贴图公共片段
#include <envmap_common_pars_fragment>
// 环境贴图片段
#include <envmap_pars_fragment>
// 雾化片段
#include <fog_pars_fragment>
// 双向反射分布函数（BSDF）工具
#include <bsdfs>
// 光源参数与数据起始
#include <lights_pars_begin>
// 法线片段（片元侧）
#include <normal_pars_fragment>
// Lambert 光照计算片段
#include <lights_lambert_pars_fragment>
// 阴影贴图片段（片元侧）
#include <shadowmap_pars_fragment>
// 凹凸贴图片段（bump）
#include <bumpmap_pars_fragment>
// 法线贴图片段（normal map）
#include <normalmap_pars_fragment>
// 高光贴图片段
#include <specularmap_pars_fragment>
// 对数深度片段（片元侧）
#include <logdepthbuf_pars_fragment>
// 裁剪平面片段（片元侧）
#include <clipping_planes_pars_fragment>

void main() { // 片元着色器主函数

	vec4 diffuseColor = vec4( diffuse, opacity ); // 组装基础漫反射颜色
	#include <clipping_planes_fragment> // 裁剪测试

	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) ); // 反射光累积容器
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
	#include <normal_fragment_maps>  // 应用法线贴图/凹凸贴图
	#include <emissivemap_fragment>  // 应用自发光贴图

	// 光照累积（直接与间接）
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>

	// AO 调制
	#include <aomap_fragment>

	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance; // 合成输出光

	// 环境贴图与后处理
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>

} // 片元着色器结束
`;
