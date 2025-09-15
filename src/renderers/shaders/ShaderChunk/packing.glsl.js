export default /* glsl */` // 导出GLSL片段开始
vec3 packNormalToRGB( const in vec3 normal ) { // 将法线[-1,1]打包到RGB[0,1]
	return normalize( normal ) * 0.5 + 0.5; // 归一化后缩放偏移
}

vec3 unpackRGBToNormal( const in vec3 rgb ) { // 将RGB[0,1]还原为法线[-1,1]
	return 2.0 * rgb.xyz - 1.0; // 反向缩放偏移
}

const float PackUpscale = 256. / 255.; // fraction -> 0..1 (including 1) // 打包上调因子，确保包含1
const float UnpackDownscale = 255. / 256.; // 0..1 -> fraction (excluding 1) // 解包下调因子，避免得到1
const float ShiftRight8 = 1. / 256.; // 右移8位的比例系数
const float Inv255 = 1. / 255.; // 1/255 常量

const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 ); // 深度打包到RGBA的权重

const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g ); // 从RG还原深度的权重
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b ); // 从RGB还原深度的权重
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a ); // 从RGBA还原深度的权重

vec4 packDepthToRGBA( const in float v ) { // 将[0,1]深度打包为RGBA
	if( v <= 0.0 ) // 小于等于0的边界情况
		return vec4( 0., 0., 0., 0. ); // 全零
	if( v >= 1.0 ) // 大于等于1的边界情况
		return vec4( 1., 1., 1., 1. ); // 全一
	float vuf; // 整数部分临时变量
	float af = modf( v * PackFactors.a, vuf ); // 提取最低位分量a的小数部分
	float bf = modf( vuf * ShiftRight8, vuf ); // 继续移位得到b分量
	float gf = modf( vuf * ShiftRight8, vuf ); // 继续移位得到g分量
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af ); // 组合成RGBA
}

vec3 packDepthToRGB( const in float v ) { // 将[0,1]深度打包为RGB
	if( v <= 0.0 ) // 边界处理
		return vec3( 0., 0., 0. ); // 全零
	if( v >= 1.0 ) // 边界处理
		return vec3( 1., 1., 1. ); // 全一
	float vuf; // 整数部分临时变量
	float bf = modf( v * PackFactors.b, vuf ); // 先取b分量小数
	float gf = modf( vuf * ShiftRight8, vuf ); // 再取g分量小数
	// the 0.9999 tweak is unimportant, very tiny empirical improvement // 0.9999微调影响极小
	// return vec3( vuf * Inv255, gf * PackUpscale, bf * 0.9999 ); // 可选微调版本
	return vec3( vuf * Inv255, gf * PackUpscale, bf ); // 组合成RGB
}

vec2 packDepthToRG( const in float v ) { // 将深度打包到RG
	if( v <= 0.0 ) // 边界处理
		return vec2( 0., 0. ); // 全零
	if( v >= 1.0 ) // 边界处理
		return vec2( 1., 1. ); // 全一
	float vuf; // 整数部分临时变量
	float gf = modf( v * 256., vuf ); // g存小数部分
	return vec2( vuf * Inv255, gf ); // r存整数部分缩放
}

float unpackRGBAToDepth( const in vec4 v ) { // 从RGBA还原深度
	return dot( v, UnpackFactors4 ); // 点积加权还原
}

float unpackRGBToDepth( const in vec3 v ) { // 从RGB还原深度
	return dot( v, UnpackFactors3 ); // 点积加权还原
}

float unpackRGToDepth( const in vec2 v ) { // 从RG还原深度
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g; // 线性组合
}

vec4 pack2HalfToRGBA( const in vec2 v ) { // 将两个half浮点打包到RGBA
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) ); // 分离整数与小数
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w ); // 组装避免进位误差
}

vec2 unpackRGBATo2Half( const in vec4 v ) { // 从RGBA还原两个half浮点
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) ); // 合并整数与小数
}

// NOTE: viewZ, the z-coordinate in camera space, is negative for points in front of the camera // 说明：在相机空间中，位于相机前方的viewZ为负

float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) { // 正交投影视图Z转深度[0,1]
	// -near maps to 0; -far maps to 1 // -near映射到0，-far映射到1
	return ( viewZ + near ) / ( near - far ); // 线性映射
}

float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) { // 正交深度转视图Z
	// maps orthographic depth in [ 0, 1 ] to viewZ // 将[0,1]深度映射为viewZ
	return depth * ( near - far ) - near; // 反向线性映射
}

// NOTE: https://twitter.com/gonnavis/status/1377183786949959682 // 参考链接

float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) { // 透视投影视图Z转深度[0,1]
	// -near maps to 0; -far maps to 1 // -near映射到0，-far映射到1
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ ); // 透视深度公式
}

float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) { // 透视深度转视图Z
	// maps perspective depth in [ 0, 1 ] to viewZ // 将[0,1]透视深度映射为viewZ
	return ( near * far ) / ( ( far - near ) * depth - far ); // 反求viewZ
}
`; // 导出GLSL片段结束
