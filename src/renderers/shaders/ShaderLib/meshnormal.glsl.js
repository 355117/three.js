export const vertex = /* glsl */` // 导出 MeshNormalMaterial 顶点着色器
#define NORMAL // 标记法线可视化材质

#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE ) // 某些模式需要视图空间位置

	varying vec3 vViewPosition; // 视图空间位置（供片元侧法线贴图使用）

#endif // 条件结束

// 通用顶点片段
#include <common>
// 批处理参数
#include <batching_pars_vertex>
// UV 参数
#include <uv_pars_vertex>
// 位移贴图参数
#include <displacementmap_pars_vertex>
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

	#include <uv_vertex> // 处理 UV
	#include <batching_vertex> // 批处理位移

	// 法线计算流程
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
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

#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE ) // 需要视图空间位置的情况

	vViewPosition = - mvPosition.xyz; // 记录视图空间坐标

#endif // 条件结束

} // 顶点着色器结束
`;

export const fragment = /* glsl */` // 导出 MeshNormalMaterial 片元着色器
#define NORMAL // 法线可视化宏

uniform float opacity; // 透明度控制

#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE ) // 需要视图空间向量

	varying vec3 vViewPosition; // 视图空间位置（用于切线空间法线等）

#endif // 条件结束

// 打包/解包与片段参数
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() { // 片元着色器主函数

	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity ); // 仅使用 alpha 通道

	#include <clipping_planes_fragment> // 裁剪测试
	#include <logdepthbuf_fragment>     // 深度写入
	#include <normal_fragment_begin>    // 计算片元法线
	#include <normal_fragment_maps>     // 应用法线/凹凸贴图

	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a ); // 将法线打包到 RGB，保留 alpha

	#ifdef OPAQUE // 不透明模式强制 alpha=1

		gl_FragColor.a = 1.0; // 覆盖 alpha

	#endif // 结束不透明条件

} // 片元着色器结束
`;
