export default /* glsl */` // 导出GLSL片段开始
#if NUM_SPOT_LIGHT_COORDS > 0 // 若存在聚光坐标

	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ]; // 片段接收的聚光投影坐标

#endif // 结束NUM_SPOT_LIGHT_COORDS

#if NUM_SPOT_LIGHT_MAPS > 0 // 若存在聚光贴图

	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ]; // 聚光遮罩贴图数组

#endif // 结束NUM_SPOT_LIGHT_MAPS

#ifdef USE_SHADOWMAP // 若启用阴影贴图

	#if NUM_DIR_LIGHT_SHADOWS > 0 // 方向光阴影

		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ]; // 方向光阴影贴图数组
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ]; // 方向光阴影坐标

		struct DirectionalLightShadow { // 方向光阴影参数
			float shadowIntensity; // 阴影强度
			float shadowBias; // 深度偏移
			float shadowNormalBias; // 法线偏移
			float shadowRadius; // PCF半径
			vec2 shadowMapSize; // 阴影贴图尺寸
		};

		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ]; // 方向光阴影数组

	#endif // 结束方向光阴影

	#if NUM_SPOT_LIGHT_SHADOWS > 0 // 聚光阴影

		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ]; // 聚光阴影贴图数组

		struct SpotLightShadow { // 聚光阴影参数
			float shadowIntensity; // 阴影强度
			float shadowBias; // 深度偏移
			float shadowNormalBias; // 法线偏移
			float shadowRadius; // PCF半径
			vec2 shadowMapSize; // 阴影贴图尺寸
		};

		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ]; // 聚光阴影数组

	#endif // 结束聚光阴影

	#if NUM_POINT_LIGHT_SHADOWS > 0 // 点光阴影

		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ]; // 点光阴影贴图数组
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ]; // 点光阴影坐标

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

	/* // 区域光阴影占位
	#if NUM_RECT_AREA_LIGHTS > 0

		// TODO (abelnation): create uniforms for area light shadows // 创建区域光阴影Uniform

	#endif
	*/

	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) { // 比较深度，用于PCF

		float depth = unpackRGBAToDepth( texture2D( depths, uv ) ); // 取样并解包深度

		#ifdef USE_REVERSEDEPTHBUF // 反转深度缓冲时比较方向相反

			return step( depth, compare ); // depth <= compare

		#else // 常规深度缓冲

			return step( compare, depth ); // compare <= depth

		#endif // 结束USE_REVERSEDEPTHBUF

	} // texture2DCompare结束

	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) { // 读取VSM分布

		return unpackRGBATo2Half( texture2D( shadow, uv ) ); // 解包两半精度值

	} // 结束texture2DDistribution

	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){ // 体积阴影映射(VSM)

		float occlusion = 1.0; // 遮挡初始化为无

		vec2 distribution = texture2DDistribution( shadow, uv ); // 读取均值与方差

		#ifdef USE_REVERSEDEPTHBUF // 反转深度

			float hard_shadow = step( distribution.x, compare ); // Hard Shadow // 硬阴影

		#else // 常规深度

			float hard_shadow = step( compare , distribution.x ); // Hard Shadow // 硬阴影

		#endif // 结束USE_REVERSEDEPTHBUF

		if (hard_shadow != 1.0 ) { // 若非完全硬阴影

			float distance = compare - distribution.x ; // 距离
			float variance = max( 0.00000, distribution.y * distribution.y ); // 方差
			float softness_probability = variance / (variance + distance * distance ); // Chebeyshevs inequality // 软阴影概率
			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 ); // 0.3 reduces light bleed // 降低漏光
			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 ); // 合并硬/软阴影

		}
		return occlusion; // 返回遮挡

	} // VSMShadow结束

	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) { // 计算方向/聚光阴影

		float shadow = 1.0;

		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;

		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;

		if ( frustumTest ) {

		#if defined( SHADOWMAP_TYPE_PCF )

			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;

			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;

			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );

		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )

			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;

			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;

			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );

		#elif defined( SHADOWMAP_TYPE_VSM )

			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );

		#else // no percentage-closer filtering:

			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );

		#endif

		}

		return mix( 1.0, shadow, shadowIntensity ); // 根据强度混合

	} // getShadow结束

	// cubeToUV() maps a 3D direction vector suitable for cube texture mapping to a 2D // 将立方体方向映射到2D UV
	// vector suitable for 2D texture mapping. This code uses the following layout for the // 使用如下2D布局
	// 2D texture:
	//
	// xzXZ
	//  y Y
	//
	// Y - Positive y direction
	// y - Negative y direction
	// X - Positive x direction
	// x - Negative x direction
	// Z - Positive z direction
	// z - Negative z direction
	//
	// Source and test bed: // 参考与测试
	// https://gist.github.com/tschw/da10c43c467ce8afd0c4 // 链接

	vec2 cubeToUV( vec3 v, float texelSizeY ) { // 立方体方向到UV

		// Number of texels to avoid at the edge of each square // 每个方块边缘避开的像素

		vec3 absV = abs( v ); // 取绝对值

		// Intersect unit cube // 与单位立方体相交

		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) ); // 缩放系数
		absV *= scaleToCube; // 缩放

		// Apply scale to avoid seams // 缩放以避免接缝

		// two texels less per square (one texel will do for NEAREST) // 每个方块减少两个像素
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY ); // 应用缩放

		// Unwrap // 展开

		// space: -1 ... 1 range for each square
		//
		// #X##		dim    := ( 4 , 2 )
		//  # #		center := ( 1 , 1 )

		vec2 planar = v.xy; // 平面坐标

		float almostATexel = 1.5 * texelSizeY; // 接近一个像素
		float almostOne = 1.0 - almostATexel; // 接近1

		if ( absV.z >= almostOne ) { // 接近Z面

			if ( v.z > 0.0 ) // 正Z面
				planar.x = 4.0 - v.x; // 调整x

		} else if ( absV.x >= almostOne ) { // 接近X面

			float signX = sign( v.x ); // x符号
			planar.x = v.z * signX + 2.0 * signX; // 计算x

		} else if ( absV.y >= almostOne ) { // 接近Y面

			float signY = sign( v.y ); // y符号
			planar.x = v.x + 2.0 * signY + 2.0; // 计算x
			planar.y = v.z * signY - 2.0; // 计算y

		} // 条件分支结束

		// Transform to UV space // 转到UV空间

		// scale := 0.5 / dim // 缩放
		// translate := ( center + 0.5 ) / dim // 平移
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 ); // 返回UV

	} // cubeToUV结束

	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) { // 计算点光阴影

		float shadow = 1.0; // 初始无阴影

		// for point lights, the uniform @vShadowCoord is re-purposed to hold // 对于点光，vShadowCoord保存光到片元向量
		// the vector from the light to the world-space position of the fragment.
		vec3 lightToPosition = shadowCoord.xyz; // 光到片元向量
		
		float lightToPositionLength = length( lightToPosition ); // 长度

		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) { // 在阴影相机范围内

			// dp = normalized distance from light to fragment position // 归一化距离
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear ); // need to clamp? // 计算dp
			dp += shadowBias; // 加上偏移

			// bd3D = base direction 3D // 基础方向
			vec3 bd3D = normalize( lightToPosition ); // 归一化方向

			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) ); // 立方UV尺寸

			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM ) // 若使用PCF或VSM

				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y; // 采样偏移

				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 ); // 9次采样平均

			#else // no percentage-closer filtering // 无PCF

				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ); // 单点比较

			#endif // 结束PCF/VSM分支

		} // 在范围内分支结束

		return mix( 1.0, shadow, shadowIntensity ); // 按阴影强度混合

	} // getPointShadow结束

#endif // 结束USE_SHADOWMAP
`; // 导出GLSL片段结束
