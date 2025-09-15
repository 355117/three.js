export default /* glsl */`
/**
 * This is a template that can be used to light a material, it uses pluggable
 * RenderEquations (RE)for specific lighting scenarios.
 *
 * Instructions for use:
 * - Ensure that both RE_Direct, RE_IndirectDiffuse and RE_IndirectSpecular are defined
 * - Create a material parameter that is to be passed as the third parameter to your lighting functions.
 *
 * TODO:
 * - Add area light support.
 * - Add sphere light support.
 * - Add diffuse light probe (irradiance cubemap) support.
 */

vec3 geometryPosition = - vViewPosition; // 中文：几何位置（视图空间）：从视点指向片元
vec3 geometryNormal = normal; // 中文：几何法线
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition ); // 中文：视线方向（正交为 +Z，否则归一化 vViewPosition）

vec3 geometryClearcoatNormal = vec3( 0.0 ); // 中文：清漆层法线（默认 0）

#ifdef USE_CLEARCOAT // 中文：如果启用清漆层

	geometryClearcoatNormal = clearcoatNormal; // 中文：采用前面计算的清漆法线

#endif // 中文：结束 USE_CLEARCOAT 条件

#ifdef USE_IRIDESCENCE // 中文：如果启用虹彩（薄膜干涉）

	float dotNVi = saturate( dot( normal, geometryViewDir ) ); // 中文：法线与视线角度余弦，钳制到 [0,1]

	if ( material.iridescenceThickness == 0.0 ) { // 中文：虹彩厚度为 0

		material.iridescence = 0.0; // 中文：无虹彩贡献

	} else { // 中文：否则钳制强度

		material.iridescence = saturate( material.iridescence ); // 中文：虹彩强度钳制到 [0,1]

	}

	if ( material.iridescence > 0.0 ) { // 中文：若有虹彩贡献

		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor ); // 中文：计算虹彩菲涅耳项

		// Iridescence F0 approximation // 中文：虹彩 F0 的近似
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi ); // 中文：由 Schlick 近似反推 F0

	}

#endif // 中文：结束 USE_IRIDESCENCE 条件

IncidentLight directLight; // 中文：直接光照信息（方向、颜色、可见性）

#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct ) // 中文：点光源直接光

	PointLight pointLight; // 中文：点光源参数
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0 // 中文：点光阴影存在时
	PointLightShadow pointLightShadow; // 中文：点光阴影参数
	#endif // 中文：结束点光阴影条件

	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) { // 中文：遍历点光源

		pointLight = pointLights[ i ]; // 中文：读取第 i 个点光

		getPointLightInfo( pointLight, geometryPosition, directLight ); // 中文：计算点光对当前片元的照明信息

		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) // 中文：点光阴影路径
		pointLightShadow = pointLightShadows[ i ]; // 中文：读取点光阴影参数
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0; // 中文：可见且接收阴影则应用阴影衰减
		#endif // 中文：结束点光阴影条件

		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight ); // 中文：调用直接光渲染方程

	}
	#pragma unroll_loop_end

#endif // 中文：结束点光直接光条件

#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct ) // 中文：聚光灯直接光

	SpotLight spotLight; // 中文：聚光灯参数
	vec4 spotColor; // 中文：聚光投影颜色
	vec3 spotLightCoord; // 中文：聚光投影坐标
	bool inSpotLightMap; // 中文：是否在聚光贴图范围

	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0 // 中文：聚光阴影存在时
	SpotLightShadow spotLightShadow; // 中文：聚光阴影参数
	#endif // 中文：结束聚光阴影条件

	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) { // 中文：遍历聚光灯

		spotLight = spotLights[ i ]; // 中文：读取第 i 个聚光

		getSpotLightInfo( spotLight, geometryPosition, directLight ); // 中文：计算聚光照明信息

		// spot lights are ordered [shadows with maps, shadows without maps, maps without shadows, none]

		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS ) // 中文：索引在“有阴影+贴图”区段
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX // 中文：贴图索引=循环索引
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS ) // 中文：“有阴影无贴图”区段
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS // 中文：无贴图（占位）
		#else // 中文：“有贴图无阴影”区段
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS ) // 中文：计算对应贴图索引
		#endif

		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS ) // 中文：存在聚光贴图时
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w; // 中文：齐次除法得到 NDC
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) ); // 中文：是否落在 [-1,1]
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy ); // 中文：采样聚光贴图
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color; // 中文：可见则调制颜色
		#endif

		#undef SPOT_LIGHT_MAP_INDEX // 中文：清理宏

		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS ) // 中文：聚光阴影
		spotLightShadow = spotLightShadows[ i ]; // 中文：读取阴影参数
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0; // 中文：应用阴影衰减
		#endif

		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight ); // 中文：调用直接光方程

	}
	#pragma unroll_loop_end

#endif // 中文：结束聚光直接光条件

#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct ) // 中文：方向光直接光

	DirectionalLight directionalLight; // 中文：方向光参数
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0 // 中文：方向光阴影存在时
	DirectionalLightShadow directionalLightShadow; // 中文：方向光阴影参数
	#endif // 中文：结束方向光阴影条件

	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) { // 中文：遍历方向光

		directionalLight = directionalLights[ i ]; // 中文：读取第 i 个方向光

		getDirectionalLightInfo( directionalLight, directLight ); // 中文：计算方向光照明信息

		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS ) // 中文：方向光阴影
		directionalLightShadow = directionalLightShadows[ i ]; // 中文：读取阴影参数
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0; // 中文：应用阴影衰减
		#endif

		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight ); // 中文：调用直接光方程

	}
	#pragma unroll_loop_end

#endif // 中文：结束方向光直接光条件

#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea ) // 中文：矩形面光源直接光

	RectAreaLight rectAreaLight; // 中文：矩形面光参数

	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) { // 中文：遍历矩形面光

		rectAreaLight = rectAreaLights[ i ]; // 中文：读取第 i 个面光
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight ); // 中文：调用矩形面光渲染方程

	}
	#pragma unroll_loop_end

#endif // 中文：结束矩形面光直接光条件

#if defined( RE_IndirectDiffuse ) // 中文：间接漫反射（环境+IBL 漫反射）

	vec3 iblIrradiance = vec3( 0.0 ); // 中文：IBL 漫反射辐照度累加器

	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor ); // 中文：环境光辐照度

	#if defined( USE_LIGHT_PROBES ) // 中文：若使用光照探针

		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal ); // 中文：叠加探针辐照度

	#endif

	#if ( NUM_HEMI_LIGHTS > 0 ) // 中文：半球光

		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) { // 中文：遍历半球光

			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal ); // 中文：叠加半球光辐照度

		}
		#pragma unroll_loop_end

	#endif

#endif // 中文：结束间接漫反射条件

#if defined( RE_IndirectSpecular ) // 中文：间接高光（IBL 镜面）

	vec3 radiance = vec3( 0.0 ); // 中文：IBL 镜面辐射亮度累加器
	vec3 clearcoatRadiance = vec3( 0.0 ); // 中文：清漆层 IBL 镜面辐射亮度累加器

#endif // 中文：结束间接高光条件
`;
