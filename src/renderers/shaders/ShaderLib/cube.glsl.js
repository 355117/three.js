export const vertex = /* glsl */` // 顶点着色器开始
varying vec3 vWorldDirection; // 传递到片元的世界方向

#include <common> // 引入通用着色器片段

void main() { // 主函数

	vWorldDirection = transformDirection( position, modelMatrix ); // 将局部方向变换到世界空间

	#include <begin_vertex> // three.js 顶点初始化
	#include <project_vertex> // three.js 投影处理

	gl_Position.z = gl_Position.w; // 将z设为w，使其渲染在最远平面（天空盒技巧）

} // 结束
`; // 顶点着色器字符串结束

export const fragment = /* glsl */` // 片元着色器开始
uniform samplerCube tCube; // 输入：立方体贴图
uniform float tFlip; // 输入：X方向翻转因子（视口相关）
uniform float opacity; // 输入：不透明度

varying vec3 vWorldDirection; // 来自顶点的世界方向

void main() { // 主函数

	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) ); // 采样立方体贴图

	gl_FragColor = texColor; // 写入片元颜色
	gl_FragColor.a *= opacity; // 应用不透明度

	#include <tonemapping_fragment> // 色调映射
	#include <colorspace_fragment> // 颜色空间转换

} // 结束
`; // 片元着色器字符串结束
