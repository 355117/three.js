export default /* glsl */`
float metalnessFactor = metalness; // 中文：金属度因子初始化为材质金属度

#ifdef USE_METALNESSMAP // 中文：如果使用金属度贴图

	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv ); // 中文：采样金属度贴图

	// reads channel B, compatible with a combined OcclusionRoughnessMetallic (RGB) texture // 中文：从蓝色通道读取（与 ORM 合并贴图约定兼容）
	metalnessFactor *= texelMetalness.b; // 中文：将贴图金属度乘到因子上

#endif // 中文：结束 USE_METALNESSMAP 条件
`;
