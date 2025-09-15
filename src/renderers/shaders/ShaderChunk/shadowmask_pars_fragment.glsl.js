export default /* glsl */` // 导出GLSL片段开始
float getShadowMask() { // 计算阴影遮罩(0~1)

	float shadow = 1.0; // 初始无阴影

	#ifdef USE_SHADOWMAP // 若启用阴影贴图

	#if NUM_DIR_LIGHT_SHADOWS > 0 // 方向光阴影

	DirectionalLightShadow directionalLight; // 临时方向光阴影参数

	#pragma unroll_loop_start // 循环展开开始
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) { // 遍历方向光

		directionalLight = directionalLightShadows[ i ]; // 取参数
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0; // 链式相乘

	}
	#pragma unroll_loop_end // 循环展开结束

	#endif // 结束方向光阴影

	#if NUM_SPOT_LIGHT_SHADOWS > 0 // 聚光阴影

	SpotLightShadow spotLight; // 临时聚光参数

	#pragma unroll_loop_start // 循环展开开始
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) { // 遍历聚光

		spotLight = spotLightShadows[ i ]; // 取参数
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0; // 链式相乘

	}
	#pragma unroll_loop_end // 循环展开结束

	#endif // 结束聚光阴影

	#if NUM_POINT_LIGHT_SHADOWS > 0 // 点光阴影

	PointLightShadow pointLight; // 临时点光参数

	#pragma unroll_loop_start // 循环展开开始
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) { // 遍历点光

		pointLight = pointLightShadows[ i ]; // 取参数
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0; // 链式相乘

	}
	#pragma unroll_loop_end // 循环展开结束

	#endif // 结束点光阴影

	/* // 区域光阴影占位
	#if NUM_RECT_AREA_LIGHTS > 0

		// TODO (abelnation): update shadow for Area light // 需要实现区域光阴影

	#endif
	*/

	#endif // 结束USE_SHADOWMAP

	return shadow; // 返回最终阴影遮罩

} // getShadowMask结束
`; // 导出GLSL片段结束
