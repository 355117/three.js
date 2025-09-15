export default /* glsl */` // 导出GLSL片段开始
#ifndef saturate // 若未定义saturate
// <common> may have defined saturate() already // <common>可能已定义
#define saturate( a ) clamp( a, 0.0, 1.0 ) // 饱和函数，限制到[0,1]
#endif // 结束saturate宏

uniform float toneMappingExposure; // 曝光系数

// exposure only // 仅曝光线性映射
vec3 LinearToneMapping( vec3 color ) {

	return saturate( toneMappingExposure * color ); // 乘曝光后饱和

} // 结束LinearToneMapping

// source: https://www.cs.utah.edu/docs/techreports/2002/pdf/UUCS-02-001.pdf // 参考Reinhard
vec3 ReinhardToneMapping( vec3 color ) {

	color *= toneMappingExposure; // 曝光
	return saturate( color / ( vec3( 1.0 ) + color ) ); // Reinhard压缩

} // 结束ReinhardToneMapping

// source: http://filmicworlds.com/blog/filmic-tonemapping-operators/ // 参考Cineon
vec3 CineonToneMapping( vec3 color ) {

	// filmic operator by Jim Hejl and Richard Burgess-Dawson // 电影风格算子
	color *= toneMappingExposure; // 曝光
	color = max( vec3( 0.0 ), color - 0.004 ); // 去偏置
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) ); // 非线性映射

} // 结束CineonToneMapping

// source: https://github.com/selfshadow/ltc_code/blob/master/webgl/shaders/ltc/ltc_blit.fs // RRT+ODT拟合
vec3 RRTAndODTFit( vec3 v ) {

	vec3 a = v * ( v + 0.0245786 ) - 0.000090537; // 分子
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081; // 分母
	return a / b; // 比值

} // 结束RRTAndODTFit

// this implementation of ACES is modified to accommodate a brighter viewing environment. // ACES实现针对更亮观看环境调整
// the scale factor of 1/0.6 is subjective. see discussion in #19621. // 1/0.6为经验值

vec3 ACESFilmicToneMapping( vec3 color ) { // ACES胶片映射

	// sRGB => XYZ => D65_2_D60 => AP1 => RRT_SAT // 输入变换
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ), // transposed from source // 行列转置
		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);

	// ODT_SAT => XYZ => D60_2_D65 => sRGB // 输出变换
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ), // transposed from source // 行列转置
		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);

	color *= toneMappingExposure / 0.6; // 曝光并按0.6缩放

	color = ACESInputMat * color; // 输入矩阵

	// Apply RRT and ODT // 应用RRT/ODT
	color = RRTAndODTFit( color ); // 拟合

	color = ACESOutputMat * color; // 输出矩阵

	// Clamp to [0, 1] // 限制范围
	return saturate( color ); // 返回颜色

} // 结束ACESFilmicToneMapping

// Matrices for rec 2020 <> rec 709 color space conversion // rec2020与rec709转换矩阵
// matrix provided in row-major order so it has been transposed // 行主序提供，已转置
// https://www.itu.int/pub/R-REP-BT.2407-2017 // 参考
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ), // 第一行
	vec3( - 0.5876, 1.1329, - 0.1006 ), // 第二行
	vec3( - 0.0728, - 0.0083, 1.1187 ) // 第三行
); // rec2020->srgb

const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ), // 第一行
	vec3( 0.3293, 0.9195, 0.0880 ), // 第二行
	vec3( 0.0433, 0.0113, 0.8956 ) // 第三行
); // srgb->rec2020

// https://iolite-engine.com/blog_posts/minimal_agx_implementation // 参考AgX
// Mean error^2: 3.6705141e-06 // 平方误差
vec3 agxDefaultContrastApprox( vec3 x ) { // AgX对比度近似

	vec3 x2 = x * x; // x^2
	vec3 x4 = x2 * x2; // x^4

	return + 15.5 * x4 * x2 // 多项式项
		- 40.14 * x4 * x // 多项式项
		+ 31.96 * x4 // 多项式项
		- 6.868 * x2 * x // 多项式项
		+ 0.4298 * x2 // 多项式项
		+ 0.1191 * x // 多项式项
		- 0.00232; // 常数项

} // 结束agxDefaultContrastApprox

// AgX Tone Mapping implementation based on Filament, which in turn is based // AgX实现基于Filament
// on Blender's implementation using rec 2020 primaries // 最初来源于Blender rec2020实现
// https://github.com/google/filament/pull/7236 // 参考链接
// Inputs and outputs are encoded as Linear-sRGB. // 输入输出为线性sRGB

vec3 AgXToneMapping( vec3 color ) { // AgX色调映射

	// AgX constants // 常量矩阵
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ), // 第一行
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ), // 第二行
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 ) // 第三行
	); // 内嵌矩阵

	// explicit AgXOutsetMatrix generated from Filaments AgXOutsetMatrixInv // 外扩矩阵
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ), // 第一行
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ), // 第二行
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 ) // 第三行
	); // 外扩矩阵

	// LOG2_MIN      = -10.0 // 最小log2
	// LOG2_MAX      =  +6.5 // 最大log2
	// MIDDLE_GRAY   =  0.18 // 中灰
	const float AgxMinEv = - 12.47393;  // log2( pow( 2, LOG2_MIN ) * MIDDLE_GRAY ) // 最小曝光
	const float AgxMaxEv = 4.026069;    // log2( pow( 2, LOG2_MAX ) * MIDDLE_GRAY ) // 最大曝光

	color *= toneMappingExposure; // 曝光

	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color; // 转到rec2020原色

	color = AgXInsetMatrix * color; // Inset矩阵

	// Log2 encoding // 对数编码
	color = max( color, 1e-10 ); // avoid 0 or negative numbers for log2 // 避免非正数
	color = log2( color ); // 取log2
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv ); // 归一化

	color = clamp( color, 0.0, 1.0 ); // 限制范围

	// Apply sigmoid // 应用Sigmoid近似
	color = agxDefaultContrastApprox( color ); // 对比度曲线

	// Apply AgX look // 应用AgX风格
	// v = agxLook(v, look); // 保留

	color = AgXOutsetMatrix * color; // Outset矩阵

	// Linearize // 线性化
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) ); // Gamma

	color = LINEAR_REC2020_TO_LINEAR_SRGB * color; // 转回线性sRGB

	// Gamut mapping. Simple clamp for now. // 色域映射，简单夹紧
	color = clamp( color, 0.0, 1.0 ); // 限制范围

	return color; // 返回

} // 结束AgXToneMapping

// https://modelviewer.dev/examples/tone-mapping // 参考Neutral

vec3 NeutralToneMapping( vec3 color ) { // 中性色调映射

	const float StartCompression = 0.8 - 0.04; // 开始压缩阈值
	const float Desaturation = 0.15; // 去饱和强度

	color *= toneMappingExposure; // 曝光

	float x = min( color.r, min( color.g, color.b ) ); // 最小分量

	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04; // 偏移

	color -= offset; // 减去偏移

	float peak = max( color.r, max( color.g, color.b ) ); // 最大分量

	if ( peak < StartCompression ) return color; // 未达压缩阈值直接返回

	float d = 1. - StartCompression; // 差值

	float newPeak = 1. - d * d / ( peak + d - StartCompression ); // 新峰值

	color *= newPeak / peak; // 归一化

	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. ); // 去饱和权重

	return mix( color, vec3( newPeak ), g ); // 混合

} // 结束NeutralToneMapping

vec3 CustomToneMapping( vec3 color ) { return color; } // 自定义映射（直通）
`; // 导出GLSL片段结束
