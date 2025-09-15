export default /* glsl */` // 导出GLSL片段开始

#if NUM_SPOT_LIGHT_COORDS > 0 // 若存在聚光坐标

	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ]; // 聚光投影矩阵数组
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ]; // 传递到片段的聚光投影视图坐标

#endif // 结束NUM_SPOT_LIGHT_COORDS

#ifdef USE_SHADOWMAP // 若启用阴影贴图

	#if NUM_DIR_LIGHT_SHADOWS > 0 // 若存在方向光阴影

		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ]; // 方向光阴影矩阵
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ]; // 传递方向光阴影坐标

		struct DirectionalLightShadow { // 方向光阴影参数
			float shadowIntensity; // 阴影强度
			float shadowBias; // 深度偏移
			float shadowNormalBias; // 法线偏移
			float shadowRadius; // PCF半径
			vec2 shadowMapSize; // 阴影贴图尺寸
		};

		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ]; // 方向光阴影数组

	#endif // 结束方向光阴影

	#if NUM_SPOT_LIGHT_SHADOWS > 0 // 若存在聚光阴影

		struct SpotLightShadow { // 聚光阴影参数
			float shadowIntensity; // 阴影强度
			float shadowBias; // 深度偏移
			float shadowNormalBias; // 法线偏移
			float shadowRadius; // PCF半径
			vec2 shadowMapSize; // 阴影贴图尺寸
		};

		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ]; // 聚光阴影数组

	#endif // 结束聚光阴影

	#if NUM_POINT_LIGHT_SHADOWS > 0 // 若存在点光阴影

		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ]; // 点光阴影矩阵
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ]; // 传递点光阴影坐标

		struct PointLightShadow { // 点光阴影参数
			float shadowIntensity; // 阴影强度
			float shadowBias; // 深度偏移
			float shadowNormalBias; // 法线偏移
			float shadowRadius; // 采样半径
			vec2 shadowMapSize; // 阴影贴图尺寸
			float shadowCameraNear; // 阴影相机近
			float shadowCameraFar; // 阴影相机远
		};

		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ]; // 点光阴影数组

	#endif // 结束点光阴影

	/* // 区域光阴影保留占位
	#if NUM_RECT_AREA_LIGHTS > 0

		// TODO (abelnation): uniforms for area light shadows // 区域光阴影Uniform待实现

	#endif
	*/

#endif // 结束USE_SHADOWMAP
`; // 导出GLSL片段结束
