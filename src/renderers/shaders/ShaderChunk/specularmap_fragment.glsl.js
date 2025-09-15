export default /* glsl */` // 导出GLSL片段开始
float specularStrength; // 镜面强度

#ifdef USE_SPECULARMAP // 若启用传统镜面贴图

	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv ); // 采样镜面贴图
	specularStrength = texelSpecular.r; // 使用R通道作为强度

#else // 未启用镜面贴图

	specularStrength = 1.0; // 默认强度1

#endif // 结束USE_SPECULARMAP
`; // 导出GLSL片段结束
