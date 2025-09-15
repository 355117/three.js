export const vertex = /* glsl */` // 导出 MeshMatcapMaterial 顶点着色器
// 使用 Matcap（材质捕获）模型
#define MATCAP

varying vec3 vViewPosition; // 视图空间位置（供片元计算视线方向）

// 通用顶点工具
#include <common>
// 批处理参数
#include <batching_pars_vertex>
// UV 参数
#include <uv_pars_vertex>
// 顶点颜色参数
#include <color_pars_vertex>
// 位移贴图参数
#include <displacementmap_pars_vertex>
// 雾化参数（顶点侧）
#include <fog_pars_vertex>
// 法线参数（顶点侧）
#include <normal_pars_vertex>
// 形态目标参数
#include <morphtarget_pars_vertex>
// 骨骼蒙皮参数
#include <skinning_pars_vertex>

// 对数深度参数（顶点侧）
#include <logdepthbuf_pars_vertex>
// 裁剪平面参数（顶点侧）
#include <clipping_planes_pars_vertex>

void main() { // 顶点着色器主函数

	// UV、颜色与实例化形变
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>

	// 法线计算流程
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

	// 深度与裁剪、雾化插值
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>

	vViewPosition = - mvPosition.xyz; // 记录视图空间位置

} // 顶点着色器结束
`;

export const fragment = /* glsl */` // 导出 MeshMatcapMaterial 片元着色器
#define MATCAP // Matcap 模型宏

uniform vec3 diffuse; // 基础颜色
uniform float opacity; // 不透明度
uniform sampler2D matcap; // Matcap 纹理采样器

varying vec3 vViewPosition; // 视图空间位置（来自顶点着色器）

// 通用与工具片段
#include <common>
// 抖动工具
#include <dithering_pars_fragment>
// 顶点颜色（片元侧）
#include <color_pars_fragment>
// UV（片元侧）
#include <uv_pars_fragment>
// 颜色贴图参数
#include <map_pars_fragment>
// 透明度贴图参数
#include <alphamap_pars_fragment>
// alpha 测试参数
#include <alphatest_pars_fragment>
// Alpha Hash 透明
#include <alphahash_pars_fragment>
// 雾化参数（片元侧）
#include <fog_pars_fragment>
// 法线参数（片元侧）
#include <normal_pars_fragment>
// 凹凸贴图参数
#include <bumpmap_pars_fragment>
// 法线贴图参数
#include <normalmap_pars_fragment>
// 对数深度参数（片元侧）
#include <logdepthbuf_pars_fragment>
// 裁剪平面参数（片元侧）
#include <clipping_planes_pars_fragment>

void main() { // 片元着色器主函数

	vec4 diffuseColor = vec4( diffuse, opacity ); // 基础颜色
	#include <clipping_planes_fragment> // 裁剪测试

	// 深度与贴图准备
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin> // 计算片元法线
	#include <normal_fragment_maps>  // 应用法线/凹凸贴图

	vec3 viewDir = normalize( vViewPosition ); // 视线方向（视图空间）
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) ); // 构造与视线相关的切线基 x
	vec3 y = cross( viewDir, x ); // 基向量 y（与视线和 x 正交）
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5; // 根据法线投影计算 Matcap 采样坐标（0.495 缓解边缘伪影）

	#ifdef USE_MATCAP // 使用外部 Matcap 纹理

		vec4 matcapColor = texture2D( matcap, uv ); // 采样 matcap 纹理

	#else // 未提供 Matcap 时的默认外观

		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 ); // 简单的渐变替代

	#endif // 结束 Matcap 条件

	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb; // 基础色与 matcap 相乘得到输出光

	// 写入颜色并做后处理
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>

} // 片元着色器结束
`;
