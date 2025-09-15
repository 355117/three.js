export const vertex = /* glsl */` // 顶点着色器：精灵(Sprite)
uniform float rotation; // 旋转角（弧度）
uniform vec2 center; // 精灵的锚点中心(0..1)

#include <common> // 通用
#include <uv_pars_vertex> // UV 参数
#include <fog_pars_vertex> // 雾化参数
#include <logdepthbuf_pars_vertex> // 对数深度
#include <clipping_planes_pars_vertex> // 裁剪平面

void main() { // 顶点主函数

	#include <uv_vertex> // 传递UV

	vec4 mvPosition = modelViewMatrix[ 3 ]; // 从模型视图矩阵中取平移分量作为基准

	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) ); // 从模型矩阵求缩放

	#ifndef USE_SIZEATTENUATION // 若未使用距离缩放

		bool isPerspective = isPerspectiveMatrix( projectionMatrix ); // 检测透视投影

		if ( isPerspective ) scale *= - mvPosition.z; // 透视下按深度缩放像素大小

	#endif // 条件结束

	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale; // 对齐到锚点后再缩放

	vec2 rotatedPosition; // 旋转后的局部位置
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y; // 旋转X
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y; // 旋转Y

	mvPosition.xy += rotatedPosition; // 应用旋转位移

	gl_Position = projectionMatrix * mvPosition; // 投影到裁剪空间

	#include <logdepthbuf_vertex> // 对数深度
	#include <clipping_planes_vertex> // 裁剪平面
	#include <fog_vertex> // 雾化

} // 结束
`; // 顶点着色器字符串结束

export const fragment = /* glsl */` // 片元着色器：精灵(Sprite)
uniform vec3 diffuse; // 基础颜色
uniform float opacity; // 不透明度

#include <common> // 通用
#include <uv_pars_fragment> // UV 参数
#include <map_pars_fragment> // 贴图参数
#include <alphamap_pars_fragment> // Alpha贴图
#include <alphatest_pars_fragment> // Alpha测试
#include <alphahash_pars_fragment> // Alpha哈希
#include <fog_pars_fragment> // 雾化
#include <logdepthbuf_pars_fragment> // 对数深度
#include <clipping_planes_pars_fragment> // 裁剪平面

void main() { // 片元主函数

	vec4 diffuseColor = vec4( diffuse, opacity ); // 初始漫反射颜色
	#include <clipping_planes_fragment> // 裁剪

	vec3 outgoingLight = vec3( 0.0 ); // 输出光颜色

	#include <logdepthbuf_fragment> // 深度
	#include <map_fragment> // 贴图采样
	#include <alphamap_fragment> // Alpha贴图
	#include <alphatest_fragment> // Alpha测试
	#include <alphahash_fragment> // Alpha哈希

	outgoingLight = diffuseColor.rgb; // 使用漫反射

	#include <opaque_fragment> // 输出不透明颜色
	#include <tonemapping_fragment> // 色调映射
	#include <colorspace_fragment> // 颜色空间
	#include <fog_fragment> // 雾化

} // 结束
`; // 片元着色器字符串结束
