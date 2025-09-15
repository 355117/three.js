export const vertex = /* glsl */` // 顶点着色器开始
varying vec3 vWorldDirection; // 传递到片元的世界方向

#include <common> // 引入通用函数/宏

void main() { // 顶点主函数

	vWorldDirection = transformDirection( position, modelMatrix ); // 将局部顶点方向变换到世界空间

	#include <begin_vertex> // three.js 顶点起始处理
	#include <project_vertex> // three.js 投影到裁剪空间

} // 结束
`; // 顶点着色器字符串结束

export const fragment = /* glsl */` // 片元着色器开始
uniform sampler2D tEquirect; // 输入：等距矩形投影贴图

varying vec3 vWorldDirection; // 来自顶点着色器的世界方向

#include <common> // 引入工具与常量

void main() { // 片元主函数

	vec3 direction = normalize( vWorldDirection ); // 归一化方向向量

	vec2 sampleUV = equirectUv( direction ); // 将方向映射到等距矩形UV

	gl_FragColor = texture2D( tEquirect, sampleUV ); // 采样等距矩形纹理

	#include <tonemapping_fragment> // 色调映射
	#include <colorspace_fragment> // 颜色空间转换

} // 结束
`; // 片元着色器字符串结束
