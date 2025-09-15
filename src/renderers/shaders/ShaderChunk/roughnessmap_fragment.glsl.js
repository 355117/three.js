export default /* glsl */` // 导出GLSL片段开始
float roughnessFactor = roughness; // 初始粗糙度因子

#ifdef USE_ROUGHNESSMAP // 若启用粗糙度贴图

	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv ); // 采样粗糙度贴图

	// reads channel G, compatible with a combined OcclusionRoughnessMetallic (RGB) texture // 从G通道读取，兼容ORM贴图
	roughnessFactor *= texelRoughness.g; // 调制粗糙度

#endif // 结束USE_ROUGHNESSMAP
`; // 导出GLSL片段结束
