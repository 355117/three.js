export default /* glsl */` // 导出GLSL片段开始
#ifdef USE_TRANSMISSION // 若启用透射

	material.transmission = transmission; // 透射强度
	material.transmissionAlpha = 1.0; // 透射Alpha初值
	material.thickness = thickness; // 厚度
	material.attenuationDistance = attenuationDistance; // 吸收距离
	material.attenuationColor = attenuationColor; // 吸收颜色

	#ifdef USE_TRANSMISSIONMAP // 透射贴图

		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r; // 采样并调制透射

	#endif // 结束USE_TRANSMISSIONMAP

	#ifdef USE_THICKNESSMAP // 厚度贴图

		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g; // 采样并调制厚度

	#endif // 结束USE_THICKNESSMAP

	vec3 pos = vWorldPosition; // 片元世界位置
	vec3 v = normalize( cameraPosition - pos ); // 视线方向
	vec3 n = inverseTransformDirection( normal, viewMatrix ); // 世界法线

	vec4 transmitted = getIBLVolumeRefraction( // 计算体积折射与透射
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90, // 参数
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness, // 参数
		material.attenuationColor, material.attenuationDistance ); // 参数

	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission ); // 更新透射Alpha

	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission ); // 将透射混入漫反射

#endif // 结束USE_TRANSMISSION
`; // 导出GLSL片段结束
