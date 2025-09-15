export default /* glsl */`
#if defined( RE_IndirectDiffuse ) // 中文：若启用间接漫反射贡献

	#ifdef USE_LIGHTMAP // 中文：使用光照贴图时，加入贴图的辐照度

		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv ); // 中文：采样光照贴图
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity; // 中文：按强度缩放辐照度

		irradiance += lightMapIrradiance; // 中文：叠加到间接漫反射的辐照度上

	#endif // 中文：结束 USE_LIGHTMAP 条件

	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV ) // 中文：标准材质下，使用 CubeUV 环境贴图的 IBL 漫反射

		iblIrradiance += getIBLIrradiance( geometryNormal ); // 中文：根据法线方向获取 IBL 漫反射

	#endif // 中文：结束 IBL 漫反射条件

#endif // 中文：结束 RE_IndirectDiffuse 条件

#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular ) // 中文：若启用环境贴图和间接高光

	#ifdef USE_ANISOTROPY // 中文：各向异性高光路径

		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy ); // 中文：获取各向异性 IBL 反射

	#else // 中文：各向同性路径

		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness ); // 中文：获取 IBL 镜面反射

	#endif // 中文：结束各向异性条件

	#ifdef USE_CLEARCOAT // 中文：叠加清漆层的间接高光

		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness ); // 中文：基于清漆法线与粗糙度的 IBL 反射

	#endif // 中文：结束 USE_CLEARCOAT 条件

#endif // 中文：结束间接高光条件
`;
