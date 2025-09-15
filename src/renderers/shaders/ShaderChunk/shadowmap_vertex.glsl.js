export default /* glsl */` // 导出GLSL片段开始

#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 ) // 若启用阴影或需要聚光坐标

	// Offsetting the position used for querying occlusion along the world normal can be used to reduce shadow acne. // 沿世界法线偏移可减少阴影痘痘
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix ); // 世界空间法线
	vec4 shadowWorldPosition; // 用于阴影投影的世界位置

#endif // 结束条件

#if defined( USE_SHADOWMAP ) // 若启用阴影贴图

	#if NUM_DIR_LIGHT_SHADOWS > 0 // 方向光阴影

		#pragma unroll_loop_start // 循环展开开始
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) { // 遍历方向光阴影

			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 ); // 法线偏移后的位置
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition; // 计算阴影坐标

		}
		#pragma unroll_loop_end // 循环展开结束

	#endif // 结束方向光阴影

	#if NUM_POINT_LIGHT_SHADOWS > 0 // 点光阴影

		#pragma unroll_loop_start // 循环展开开始
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) { // 遍历点光阴影

			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 ); // 法线偏移
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition; // 计算阴影坐标

		}
		#pragma unroll_loop_end // 循环展开结束

	#endif // 结束点光阴影

	/* // 区域光阴影保留占位
	#if NUM_RECT_AREA_LIGHTS > 0

		// TODO (abelnation): update vAreaShadowCoord with area light info // 更新区域光阴影坐标

	#endif
	*/

#endif // 结束USE_SHADOWMAP

// spot lights can be evaluated without active shadow mapping (when SpotLight.map is used) // 当使用SpotLight.map时可不启用阴影映射

#if NUM_SPOT_LIGHT_COORDS > 0 // 若存在聚光坐标

	#pragma unroll_loop_start // 循环展开开始
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) { // 遍历聚光

		shadowWorldPosition = worldPosition; // 默认使用世界位置
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS ) // 若对应有阴影
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias; // 法线偏移
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition; // 计算聚光投影坐标

	}
	#pragma unroll_loop_end // 循环展开结束

#endif // 结束NUM_SPOT_LIGHT_COORDS


`; // 导出GLSL片段结束
