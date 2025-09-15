export const vertex = /* glsl */` // 顶点着色器开始
varying vec2 vUv; // 传递到片元的UV坐标
uniform mat3 uvTransform; // UV变换矩阵（缩放/平移/旋转）

void main() { // 顶点主函数

	vUv = ( uvTransform * vec3( uv, 1 ) ).xy; // 应用UV变换

	gl_Position = vec4( position.xy, 1.0, 1.0 ); // 将背景渲染到屏幕空间四边形

} // 结束
`; // 顶点着色器字符串结束

export const fragment = /* glsl */` // 片元着色器开始
uniform sampler2D t2D; // 输入：二维背景纹理
uniform float backgroundIntensity; // 输入：背景强度缩放

varying vec2 vUv; // 来自顶点的UV

void main() { // 片元主函数

	vec4 texColor = texture2D( t2D, vUv ); // 按UV采样背景纹理

	#ifdef DECODE_VIDEO_TEXTURE // 若为视频纹理，则行内解码sRGB

		// 在浏览器完全支持视频纹理的 SRGB8_ALPHA8 前，使用行内sRGB解码 // 保留原英文说明

		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w ); // sRGB->线性近似解码

	#endif // 条件编译结束

	texColor.rgb *= backgroundIntensity; // 应用背景强度

	gl_FragColor = texColor; // 写入片元颜色

	#include <tonemapping_fragment> // 色调映射
	#include <colorspace_fragment> // 颜色空间转换

} // 结束
`; // 片元着色器字符串结束
