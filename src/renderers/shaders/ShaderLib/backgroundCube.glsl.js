export const vertex = /* glsl */` // 顶点着色器：天空盒背景
varying vec3 vWorldDirection; // 传递到片元的世界方向

#include <common> // 通用宏/函数

void main() { // 顶点主函数

	vWorldDirection = transformDirection( position, modelMatrix ); // 局部方向->世界方向

	#include <begin_vertex> // 顶点起始
	#include <project_vertex> // 投影到裁剪空间

	gl_Position.z = gl_Position.w; // 将z设置为w，绘制在最远平面（防止裁剪）

} // 结束
`; // 顶点着色器字符串结束

export const fragment = /* glsl */` // 片元着色器：天空盒背景

#ifdef ENVMAP_TYPE_CUBE // 使用立方体贴图的环境贴图

	uniform samplerCube envMap; // 立方体环境贴图

#elif defined( ENVMAP_TYPE_CUBE_UV ) // 使用CubeUV的环境贴图

	uniform sampler2D envMap; // 2D纹理（编码了立方体贴图）

#endif // 条件结束

uniform float flipEnvMap; // X方向翻转系数
uniform float backgroundBlurriness; // 背景模糊度
uniform float backgroundIntensity; // 背景强度
uniform mat3 backgroundRotation; // 背景旋转矩阵

varying vec3 vWorldDirection; // 来自顶点的世界方向

#include <cube_uv_reflection_fragment> // CubeUV 反射采样工具

void main() { // 片元主函数

	#ifdef ENVMAP_TYPE_CUBE // 立方体贴图路径

		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ); // 采样立方体贴图

	#elif defined( ENVMAP_TYPE_CUBE_UV ) // CubeUV路径

		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness ); // 采样CubeUV

	#else // 无环境贴图

		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 ); // 回退为黑色

	#endif // 条件结束

	texColor.rgb *= backgroundIntensity; // 应用强度缩放

	gl_FragColor = texColor; // 输出颜色

	#include <tonemapping_fragment> // 色调映射
	#include <colorspace_fragment> // 颜色空间转换

} // 结束
`; // 片元着色器字符串结束
