export default /* glsl */ ` // 导出GLSL着色器片段

struct PhysicalMaterial { // 物理材质结构体定义

	vec3 diffuseColor; // 漫反射颜色
	float roughness; // 粗糙度参数
	vec3 specularColor; // 镜面反射基底色F0
	float specularF90; // 90°入射镜面反射F90
	float dispersion; // 色散强度

	#ifdef USE_CLEARCOAT // 启用清漆层
		float clearcoat; // 清漆层强度
		float clearcoatRoughness; // 清漆层粗糙度
		vec3 clearcoatF0; // 清漆层F0
		float clearcoatF90; // 清漆层F90
	#endif // 条件编译结束

	#ifdef USE_IRIDESCENCE // 启用虹彩
		float iridescence; // 虹彩强度
		float iridescenceIOR; // 虹彩折射率
		float iridescenceThickness; // 虹彩膜厚(纳米)
		vec3 iridescenceFresnel; // 虹彩Fresnel系数
		vec3 iridescenceF0; // 虹彩F0
	#endif // 条件编译结束

	#ifdef USE_SHEEN // 启用光泽(纤维/织物)
		vec3 sheenColor; // 光泽(织物)颜色
		float sheenRoughness; // 光泽粗糙度
	#endif // 条件编译结束

	#ifdef IOR // 启用折射率(IOR)
		float ior; // IOR折射率
	#endif // 条件编译结束

	#ifdef USE_TRANSMISSION // 启用透射(玻璃/半透明)
		float transmission; // 透射强度
		float transmissionAlpha; // 透射Alpha(厚薄/阴影修正)
		float thickness; // 厚度(用于次表面/透射)
		float attenuationDistance; // 吸收距离(Beer-Lambert)
		vec3 attenuationColor; // 吸收颜色
	#endif // 条件编译结束

	#ifdef USE_ANISOTROPY // 启用各向异性
		float anisotropy; // 各向异性强度
		float alphaT; // 切线方向粗糙度alphaT
		vec3 anisotropyT; // 各向异性切线T
		vec3 anisotropyB; // 各向异性副切线B
	#endif // 条件编译结束

}; // 语句

// temporary  // 注释说明
vec3 clearcoatSpecularDirect = vec3( 0.0 ); // 变量赋值/表达式
vec3 clearcoatSpecularIndirect = vec3( 0.0 ); // 变量赋值/表达式
vec3 sheenSpecularDirect = vec3( 0.0 ); // 变量赋值/表达式
vec3 sheenSpecularIndirect = vec3(0.0 ); // 变量赋值/表达式

vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) { // Schlick近似: Fresnel反推F0
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 ); // 夹紧范围
    float x2 = x * x; // 变量赋值/表达式
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 ); // 夹紧范围

    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 ); // 返回结果
} // 作用域结束

// Moving Frostbite to Physically Based Rendering 3.0 - page 12, listing 2  // 注释说明
// https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf  // 参考链接
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) { // GGX相关可见性(Smith)

	float a2 = pow2( alpha ); // 平方运算

	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) ); // 平方运算
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) ); // 平方运算

	return 0.5 / max( gv + gl, EPSILON ); // 返回结果

} // 作用域结束

// Microfacet Models for Refraction through Rough Surfaces - equation (33)  // 注释说明
// http://graphicrants.blogspot.com/2013/08/specular-brdf-reference.html  // 参考链接
// alpha is "roughness squared" in Disneyâs reparameterization  // 注释说明
float D_GGX( const in float alpha, const in float dotNH ) { // GGX法线分布函数(NDF)

	float a2 = pow2( alpha ); // 平方运算

	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0; // avoid alpha = 0 with dotNH = 1 // 平方运算

	return RECIPROCAL_PI * a2 / pow2( denom ); // 1/PI 常数

} // 作用域结束

// https://google.github.io/filament/Filament.md.html#materialsystem/anisotropicmodel/anisotropicspecularbrdf  // 参考链接
#ifdef USE_ANISOTROPY // 启用各向异性

	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) { // 切线方向粗糙度alphaT

		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) ); // 切线方向粗糙度alphaT
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) ); // 切线方向粗糙度alphaT
		float v = 0.5 / ( gv + gl ); // 变量赋值/表达式

		return saturate(v); // 限幅到[0,1]

	} // 作用域结束

	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) { // 切线方向粗糙度alphaT

		float a2 = alphaT * alphaB; // 切线方向粗糙度alphaT
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH ); // 切线方向粗糙度alphaT
		highp float v2 = dot( v, v ); // 点积(余弦)
		float w2 = a2 / v2; // 变量赋值/表达式

		return RECIPROCAL_PI * a2 * pow2 ( w2 ); // 1/PI 常数

	} // 作用域结束

#endif // 条件编译结束

#ifdef USE_CLEARCOAT // 启用清漆层

	// GGX Distribution, Schlick Fresnel, GGX_SmithCorrelated Visibility  // 注释说明
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) { // 清漆层GGX BRDF(镜面)

		vec3 f0 = material.clearcoatF0; // 清漆层F0
		float f90 = material.clearcoatF90; // 清漆层F90
		float roughness = material.clearcoatRoughness; // 粗糙度参数

		float alpha = pow2( roughness ); // UE4's roughness // 粗糙度参数

		vec3 halfDir = normalize( lightDir + viewDir ); // 向量归一化

		float dotNL = saturate( dot( normal, lightDir ) ); // 限幅到[0,1]
		float dotNV = saturate( dot( normal, viewDir ) ); // 限幅到[0,1]
		float dotNH = saturate( dot( normal, halfDir ) ); // 限幅到[0,1]
		float dotVH = saturate( dot( viewDir, halfDir ) ); // 限幅到[0,1]

		vec3 F = F_Schlick( f0, f90, dotVH ); // 变量赋值/表达式

		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV ); // GGX相关可见性(Smith)

		float D = D_GGX( alpha, dotNH ); // GGX法线分布函数(NDF)

		return F * ( V * D ); // 返回结果

	} // 作用域结束

#endif // 条件编译结束

vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) { // GGX镜面BRDF

	vec3 f0 = material.specularColor; // 镜面反射基底色F0
	float f90 = material.specularF90; // 90°入射镜面反射F90
	float roughness = material.roughness; // 粗糙度参数

	float alpha = pow2( roughness ); // UE4's roughness // 粗糙度参数

	vec3 halfDir = normalize( lightDir + viewDir ); // 向量归一化

	float dotNL = saturate( dot( normal, lightDir ) ); // 限幅到[0,1]
	float dotNV = saturate( dot( normal, viewDir ) ); // 限幅到[0,1]
	float dotNH = saturate( dot( normal, halfDir ) ); // 限幅到[0,1]
	float dotVH = saturate( dot( viewDir, halfDir ) ); // 限幅到[0,1]

	vec3 F = F_Schlick( f0, f90, dotVH ); // 变量赋值/表达式

	#ifdef USE_IRIDESCENCE // 启用虹彩

		F = mix( F, material.iridescenceFresnel, material.iridescence ); // 虹彩Fresnel系数

	#endif // 条件编译结束

	#ifdef USE_ANISOTROPY // 启用各向异性

		float dotTL = dot( material.anisotropyT, lightDir ); // 各向异性切线T
		float dotTV = dot( material.anisotropyT, viewDir ); // 各向异性切线T
		float dotTH = dot( material.anisotropyT, halfDir ); // 各向异性切线T
		float dotBL = dot( material.anisotropyB, lightDir ); // 各向异性副切线B
		float dotBV = dot( material.anisotropyB, viewDir ); // 各向异性副切线B
		float dotBH = dot( material.anisotropyB, halfDir ); // 各向异性副切线B

		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL ); // 切线方向粗糙度alphaT

		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH ); // 切线方向粗糙度alphaT

	#else // 语句

		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV ); // GGX相关可见性(Smith)

		float D = D_GGX( alpha, dotNH ); // GGX法线分布函数(NDF)

	#endif // 条件编译结束

	return F * ( V * D ); // 返回结果

} // 作用域结束

// Rect Area Light  // 注释说明

// Real-Time Polygonal-Light Shading with Linearly Transformed Cosines  // 注释说明
// by Eric Heitz, Jonathan Dupuy, Stephen Hill and David Neubelt  // 注释说明
// code: https://github.com/selfshadow/ltc_code/  // 参考链接

vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) { // 粗糙度参数

	const float LUT_SIZE = 64.0; // 变量赋值/表达式
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE; // 变量赋值/表达式
	const float LUT_BIAS = 0.5 / LUT_SIZE; // 变量赋值/表达式

	float dotNV = saturate( dot( N, V ) ); // 限幅到[0,1]

	// texture parameterized by sqrt( GGX alpha ) and sqrt( 1 - cos( theta ) )  // 注释说明
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) ); // 粗糙度参数

	uv = uv * LUT_SCALE + LUT_BIAS; // 变量赋值/表达式

	return uv; // 返回结果

} // 作用域结束

float LTC_ClippedSphereFormFactor( const in vec3 f ) { // LTC线性变换余弦(矩形光)

	// Real-Time Area Lighting: a Journey from Research to Production (p.102)  // 注释说明
	// An approximation of the form factor of a horizon-clipped rectangle.  // 注释说明

	float l = length( f ); // 变量赋值/表达式

	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 ); // 返回结果

} // 作用域结束

vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) { // LTC线性变换余弦(矩形光)

	float x = dot( v1, v2 ); // 点积(余弦)

	float y = abs( x ); // 变量赋值/表达式

	// rational polynomial approximation to theta / sin( theta ) / 2PI  // 注释说明
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y; // 变量赋值/表达式
	float b = 3.4175940 + ( 4.1616724 + y ) * y; // 变量赋值/表达式
	float v = a / b; // 变量赋值/表达式

	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v; // 变量赋值/表达式

	return cross( v1, v2 ) * theta_sintheta; // 返回结果

} // 作用域结束

vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) { // LTC线性变换余弦(矩形光)

	// bail if point is on back side of plane of light  // 注释说明
	// assumes ccw winding order of light vertices  // 注释说明
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ]; // 变量赋值/表达式
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ]; // 变量赋值/表达式
	vec3 lightNormal = cross( v1, v2 ); // 变量赋值/表达式

	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 ); // 点积(余弦)

	// construct orthonormal basis around N  // 注释说明
	vec3 T1, T2; // 语句
	T1 = normalize( V - N * dot( V, N ) ); // 向量归一化
	T2 = - cross( N, T1 ); // negated from paper; possibly due to a different handedness of world coordinate system // 变量赋值/表达式

	// compute transform  // 注释说明
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) ); // 变量赋值/表达式

	// transform rect  // 注释说明
	vec3 coords[ 4 ]; // 语句
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P ); // 变量赋值/表达式
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P ); // 变量赋值/表达式
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P ); // 变量赋值/表达式
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P ); // 变量赋值/表达式

	// project rect onto sphere  // 注释说明
	coords[ 0 ] = normalize( coords[ 0 ] ); // 向量归一化
	coords[ 1 ] = normalize( coords[ 1 ] ); // 向量归一化
	coords[ 2 ] = normalize( coords[ 2 ] ); // 向量归一化
	coords[ 3 ] = normalize( coords[ 3 ] ); // 向量归一化

	// calculate vector form factor  // 注释说明
	vec3 vectorFormFactor = vec3( 0.0 ); // 变量赋值/表达式
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] ); // LTC线性变换余弦(矩形光)
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] ); // LTC线性变换余弦(矩形光)
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] ); // LTC线性变换余弦(矩形光)
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] ); // LTC线性变换余弦(矩形光)

	// adjust for horizon clipping  // 注释说明
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor ); // LTC线性变换余弦(矩形光)

/* // 语句
	// alternate method of adjusting for horizon clipping (see reference)  // 注释说明
	// refactoring required  // 注释说明
	float len = length( vectorFormFactor ); // 变量赋值/表达式
	float z = vectorFormFactor.z / len; // 变量赋值/表达式

	const float LUT_SIZE = 64.0; // 变量赋值/表达式
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE; // 变量赋值/表达式
	const float LUT_BIAS = 0.5 / LUT_SIZE; // 变量赋值/表达式

	// tabulated horizon-clipped sphere, apparently...  // 注释说明
	vec2 uv = vec2( z * 0.5 + 0.5, len ); // 变量赋值/表达式
	uv = uv * LUT_SCALE + LUT_BIAS; // 变量赋值/表达式

	float scale = texture2D( ltc_2, uv ).w; // 变量赋值/表达式

	float result = len * scale; // 变量赋值/表达式
*/ // 语句

	return vec3( result ); // 返回结果

} // 作用域结束

// End Rect Area Light  // 注释说明

#if defined( USE_SHEEN ) // 语句

// https://github.com/google/filament/blob/master/shaders/src/brdf.fs  // 参考链接
float D_Charlie( float roughness, float dotNH ) { // 粗糙度参数

	float alpha = pow2( roughness ); // 粗糙度参数

	// Estevez and Kulla 2017, "Production Friendly Microfacet Sheen BRDF"  // 注释说明
	float invAlpha = 1.0 / alpha; // 变量赋值/表达式
	float cos2h = dotNH * dotNH; // 变量赋值/表达式
	float sin2h = max( 1.0 - cos2h, 0.0078125 ); // 2^(-14/2), so sin2h^2 > 0 in fp16 // 变量赋值/表达式

	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI ); // 返回结果

} // 作用域结束

// https://github.com/google/filament/blob/master/shaders/src/brdf.fs  // 参考链接
float V_Neubelt( float dotNV, float dotNL ) { // 语句

	// Neubelt and Pettineo 2013, "Crafting a Next-gen Material Pipeline for The Order: 1886"  // 注释说明
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) ); // 限幅到[0,1]

} // 作用域结束

vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) { // 光泽(织物)颜色

	vec3 halfDir = normalize( lightDir + viewDir ); // 向量归一化

	float dotNL = saturate( dot( normal, lightDir ) ); // 限幅到[0,1]
	float dotNV = saturate( dot( normal, viewDir ) ); // 限幅到[0,1]
	float dotNH = saturate( dot( normal, halfDir ) ); // 限幅到[0,1]

	float D = D_Charlie( sheenRoughness, dotNH ); // 光泽粗糙度
	float V = V_Neubelt( dotNV, dotNL ); // 变量赋值/表达式

	return sheenColor * ( D * V ); // 光泽(织物)颜色

} // 作用域结束

#endif // 条件编译结束

// This is a curve-fit approximation to the "Charlie sheen" BRDF integrated over the hemisphere from  // 注释说明
// Estevez and Kulla 2017, "Production Friendly Microfacet Sheen BRDF". The analysis can be found  // 注释说明
// in the Sheen section of https://drive.google.com/file/d/1T0D1VSyR4AllqIJTQAraEIzjlb5h4FKH/view?usp=sharing  // 参考链接
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) { // 粗糙度参数

	float dotNV = saturate( dot( normal, viewDir ) ); // 限幅到[0,1]

	float r2 = roughness * roughness; // 粗糙度参数

	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95; // 粗糙度参数

	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72; // 粗糙度参数

	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) ); // 粗糙度参数

	return saturate( DG * RECIPROCAL_PI ); // 1/PI 常数

} // 作用域结束

// Analytical approximation of the DFG LUT, one half of the  // 注释说明
// split-sum approximation used in indirect specular lighting.  // 注释说明
// via 'environmentBRDF' from "Physically Based Shading on Mobile"  // 注释说明
// https://www.unrealengine.com/blog/physically-based-shading-on-mobile  // 参考链接
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) { // 粗糙度参数

	float dotNV = saturate( dot( normal, viewDir ) ); // 限幅到[0,1]

	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 ); // 变量赋值/表达式

	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 ); // 变量赋值/表达式

	vec4 r = roughness * c0 + c1; // 粗糙度参数

	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y; // 变量赋值/表达式

	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw; // 变量赋值/表达式

	return fab; // 返回结果

} // 作用域结束

vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) { // 粗糙度参数

	vec2 fab = DFGApprox( normal, viewDir, roughness ); // 粗糙度参数

	return specularColor * fab.x + specularF90 * fab.y; // 镜面反射基底色F0

} // 作用域结束

// Fdez-AgÃ¼era's "Multiple-Scattering Microfacet Model for Real-Time Image Based Lighting"  // 注释说明
// Approximates multiscattering in order to preserve energy.  // 注释说明
// http://www.jcgt.org/published/0008/01/03/  // 参考链接
#ifdef USE_IRIDESCENCE // 启用虹彩
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) { // 粗糙度参数
#else // 语句
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) { // 粗糙度参数
#endif // 条件编译结束

	vec2 fab = DFGApprox( normal, viewDir, roughness ); // 粗糙度参数

	#ifdef USE_IRIDESCENCE // 启用虹彩

		vec3 Fr = mix( specularColor, iridescenceF0, iridescence ); // 镜面反射基底色F0

	#else // 语句

		vec3 Fr = specularColor; // 镜面反射基底色F0

	#endif // 条件编译结束

	vec3 FssEss = Fr * fab.x + specularF90 * fab.y; // 90°入射镜面反射F90

	float Ess = fab.x + fab.y; // 变量赋值/表达式
	float Ems = 1.0 - Ess; // 变量赋值/表达式

	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619; // 1/21 // 变量赋值/表达式
	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg ); // 变量赋值/表达式

	singleScatter += FssEss; // 变量赋值/表达式
	multiScatter += Fms * Ems; // 变量赋值/表达式

} // 作用域结束

#if NUM_RECT_AREA_LIGHTS > 0 // 语句

	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) { // 矩形面光源处理

		vec3 normal = geometryNormal; // 变量赋值/表达式
		vec3 viewDir = geometryViewDir; // 变量赋值/表达式
		vec3 position = geometryPosition; // 变量赋值/表达式
		vec3 lightPos = rectAreaLight.position; // 变量赋值/表达式
		vec3 halfWidth = rectAreaLight.halfWidth; // 变量赋值/表达式
		vec3 halfHeight = rectAreaLight.halfHeight; // 变量赋值/表达式
		vec3 lightColor = rectAreaLight.color; // 变量赋值/表达式
		float roughness = material.roughness; // 粗糙度参数

		vec3 rectCoords[ 4 ]; // 语句
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight; // counterclockwise; light shines in local neg z direction // 变量赋值/表达式
		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight; // 变量赋值/表达式
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight; // 变量赋值/表达式
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight; // 变量赋值/表达式

		vec2 uv = LTC_Uv( normal, viewDir, roughness ); // 粗糙度参数

		vec4 t1 = texture2D( ltc_1, uv ); // 变量赋值/表达式
		vec4 t2 = texture2D( ltc_2, uv ); // 变量赋值/表达式

		mat3 mInv = mat3( // 变量赋值/表达式
			vec3( t1.x, 0, t1.y ), // 语句
			vec3(    0, 1,    0 ), // 语句
			vec3( t1.z, 0, t1.w ) // 语句
		); // 语句

		// LTC Fresnel Approximation by Stephen Hill  // 注释说明
		// http://blog.selfshadow.com/publications/s2016-advances/s2016_ltc_fresnel.pdf  // 参考链接
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y ); // 镜面反射基底色F0

		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords ); // LTC线性变换余弦(矩形光)

		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords ); // 漫反射颜色

	} // 作用域结束

#endif // 条件编译结束

void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) { // 点/聚光等直射贡献(物理)

	float dotNL = saturate( dot( geometryNormal, directLight.direction ) ); // 限幅到[0,1]

	vec3 irradiance = dotNL * directLight.color; // 变量赋值/表达式

	#ifdef USE_CLEARCOAT // 启用清漆层

		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) ); // 限幅到[0,1]

		vec3 ccIrradiance = dotNLcc * directLight.color; // 变量赋值/表达式

		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material ); // 清漆层GGX BRDF(镜面)

	#endif // 条件编译结束

	#ifdef USE_SHEEN // 启用光泽(纤维/织物)

		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness ); // 光泽(织物)颜色

	#endif // 条件编译结束

	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material ); // GGX镜面BRDF

	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor ); // 漫反射颜色
} // 作用域结束

void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) { // 环境漫反射贡献(物理)

	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor ); // 漫反射颜色

} // 作用域结束

void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) { // 环境镜面贡献(物理)

	#ifdef USE_CLEARCOAT // 启用清漆层

		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness ); // 清漆层F0

	#endif // 条件编译结束

	#ifdef USE_SHEEN // 启用光泽(纤维/织物)

		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ); // 光泽(织物)颜色

	#endif // 条件编译结束

	// Both indirect specular and indirect diffuse light accumulate here  // 注释说明

	vec3 singleScattering = vec3( 0.0 ); // 变量赋值/表达式
	vec3 multiScattering = vec3( 0.0 ); // 变量赋值/表达式
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI; // 1/PI 常数

	#ifdef USE_IRIDESCENCE // 启用虹彩

		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering ); // 粗糙度参数

	#else // 语句

		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering ); // 粗糙度参数

	#endif // 条件编译结束

	vec3 totalScattering = singleScattering + multiScattering; // 变量赋值/表达式
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) ); // 漫反射颜色

	reflectedLight.indirectSpecular += radiance * singleScattering; // 变量赋值/表达式
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance; // 变量赋值/表达式

	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance; // 变量赋值/表达式

} // 作用域结束

#define RE_Direct				RE_Direct_Physical // 宏定义
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical // 宏定义
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical // 宏定义
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical // 宏定义

// ref: https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf  // 参考链接
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) { // 粗糙度参数

	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion ); // 粗糙度参数

} // 作用域结束
`; // 结束导出
