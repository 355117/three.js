export const vertex = /* glsl */` // 导出 MeshBasicMaterial 顶点着色器
// 通用顶点着色器片段
#include <common>
// 批处理相关的顶点参数
#include <batching_pars_vertex>
// UV 坐标参数
#include <uv_pars_vertex>
// 环境贴图相关参数
#include <envmap_pars_vertex>
// 顶点颜色相关参数
#include <color_pars_vertex>
// 雾化效果相关参数（顶点阶段）
#include <fog_pars_vertex>
// 形态目标（morph target）参数
#include <morphtarget_pars_vertex>
// 骨骼蒙皮参数
#include <skinning_pars_vertex>
// 对数深度缓冲参数（顶点阶段）
#include <logdepthbuf_pars_vertex>
// 裁剪平面参数（顶点阶段）
#include <clipping_planes_pars_vertex>

void main() { // 顶点着色器主函数

	// 处理 UV 坐标
	#include <uv_vertex>
	// 传递或处理顶点颜色
	#include <color_vertex>
	// 处理实例化形变
	#include <morphinstance_vertex>
	// 处理形变后的颜色（如适用）
	#include <morphcolor_vertex>
	// 批处理位移与矩阵应用
	#include <batching_vertex>

	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING ) // 使用环境贴图或骨骼时需要法线

		// 开始计算法线
		#include <beginnormal_vertex>
		// 应用形态目标对法线影响
		#include <morphnormal_vertex>
		// 骨骼基姿态（法线）
		#include <skinbase_vertex>
		// 应用骨骼蒙皮对法线影响
		#include <skinnormal_vertex>
		// 计算默认法线（若未提供）
		#include <defaultnormal_vertex>

	#endif // 结束法线相关分支

	// 顶点位置计算与变换
	#include <begin_vertex>
	// 形态目标位移
	#include <morphtarget_vertex>
	// 骨骼蒙皮位移
	#include <skinning_vertex>
	// 投影到裁剪空间
	#include <project_vertex>
	// 对数深度写入
	#include <logdepthbuf_vertex>
	// 裁剪平面处理
	#include <clipping_planes_vertex>

	// 计算世界位置、环境贴图向量与雾化插值
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>

} // 顶点着色器结束
`;

export const fragment = /* glsl */` // 导出 MeshBasicMaterial 片元着色器
uniform vec3 diffuse; // 基础漫反射颜色
uniform float opacity; // 基础不透明度

#ifndef FLAT_SHADED // 非平面着色时，可能需要插值法线

	varying vec3 vNormal; // 插值后的法线（当需要时）

#endif // 结束 FLAT_SHADED 条件

// 通用片元片段与工具
#include <common>
// 抖动相关片段（减少色带）
#include <dithering_pars_fragment>
// 顶点颜色相关片段（片元侧）
#include <color_pars_fragment>
// UV 坐标（片元侧）
#include <uv_pars_fragment>
// 颜色贴图参数
#include <map_pars_fragment>
// 透明度贴图参数
#include <alphamap_pars_fragment>
// alpha 测试参数
#include <alphatest_pars_fragment>
// Alpha Hash 参数（透明抗锯齿）
#include <alphahash_pars_fragment>
// 环境光遮蔽（AO）参数
#include <aomap_pars_fragment>
// 光照贴图参数（烘焙间接光）
#include <lightmap_pars_fragment>
// 环境贴图公共参数
#include <envmap_common_pars_fragment>
// 环境贴图采样参数
#include <envmap_pars_fragment>
// 雾效参数（片元侧）
#include <fog_pars_fragment>
// 高光贴图参数（尽管 basic 一般不做光照，这里用于环境反射影响）
#include <specularmap_pars_fragment>
// 对数深度参数（片元侧）
#include <logdepthbuf_pars_fragment>
// 裁剪平面参数（片元侧）
#include <clipping_planes_pars_fragment>

void main() { // 片元着色器主函数

	vec4 diffuseColor = vec4( diffuse, opacity ); // 初始化基础颜色与不透明度
	#include <clipping_planes_fragment> // 执行裁剪判断

	// 深度相关处理与贴图采样
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>

	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) ); // 初始化反射光结构体

	// 累积（仅烘焙的间接光）
	#ifdef USE_LIGHTMAP // 启用光照贴图时，加入烘焙间接漫反射

		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv ); // 采样光照贴图
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI; // 加权累计到间接漫反射

	#else // 未使用光照贴图时，使用默认环境亮度

		reflectedLight.indirectDiffuse += vec3( 1.0 ); // 基础环境漫反射

	#endif // 结束光照贴图分支

	// 调制（AO）
	#include <aomap_fragment>

	reflectedLight.indirectDiffuse *= diffuseColor.rgb; // 将漫反射颜色作用于间接漫反射

	vec3 outgoingLight = reflectedLight.indirectDiffuse; // 输出光照（无直接光，仅间接）

	#include <envmap_fragment> // 加入环境贴图反射/折射影响

	// 写入最终颜色并做后处理
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>

} // 片元着色器结束
`;
