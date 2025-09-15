export default /* glsl */`
#ifdef USE_ENVMAP // 若启用环境贴图

	vec3 getIBLIrradiance( const in vec3 normal ) { // 基于环境贴图的漫反射（辐照度）

		#ifdef ENVMAP_TYPE_CUBE_UV // 使用 PMREM 立方体 UV 合图

			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix ); // 将法线转到世界空间

			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 ); // 使用固定 mip 级（1.0）采样

			return PI * envMapColor.rgb * envMapIntensity; // 乘以 PI 与强度得到辐照度

		#else // 非 CUBE_UV 类型暂不支持

			return vec3( 0.0 ); // 返回零

		#endif // 结束：ENVMAP_TYPE_CUBE_UV

	} // getIBLIrradiance 结束

	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) { // 基于环境贴图的镜面反射辐射率

		#ifdef ENVMAP_TYPE_CUBE_UV // 使用 PMREM 合图

			vec3 reflectVec = reflect( - viewDir, normal ); // 入射方向为 -viewDir，计算反射向量

			// Mixing the reflection with the normal is more accurate and keeps rough objects from gathering light from behind their tangent plane. // 将反射向量与法线混合更准确，可避免粗糙表面采样到切平面后的光
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) ); // 按粗糙度平方混合

			reflectVec = inverseTransformDirection( reflectVec, viewMatrix ); // 转到世界空间

			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness ); // 以粗糙度映射的 mip 级采样

			return envMapColor.rgb * envMapIntensity; // 乘以强度得到辐射率

		#else // 非 CUBE_UV 类型暂不支持

			return vec3( 0.0 ); // 返回零

		#endif // 结束：ENVMAP_TYPE_CUBE_UV

	} // getIBLRadiance 结束

	#ifdef USE_ANISOTROPY // 若启用各向异性

		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) { // 各向异性 IBL 辐射率

			#ifdef ENVMAP_TYPE_CUBE_UV // 使用 PMREM 合图

			  // https://google.github.io/filament/Filament.md.html#lighting/imagebasedlights/anisotropy // 参考 Filament 文档
				vec3 bentNormal = cross( bitangent, viewDir ); // 计算初始弯曲法线（与视线和副切线相关）
				bentNormal = normalize( cross( bentNormal, bitangent ) ); // 正交化到副切线平面
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) ); // 按各向异性与粗糙度混合

				return getIBLRadiance( viewDir, bentNormal, roughness ); // 使用弯曲法线计算辐射率

			#else // 非 CUBE_UV 类型

				return vec3( 0.0 ); // 返回零

			#endif // 结束：ENVMAP_TYPE_CUBE_UV

		} // getIBLAnisotropyRadiance 结束

	#endif // 结束：USE_ANISOTROPY

#endif // 结束：USE_ENVMAP

`;
