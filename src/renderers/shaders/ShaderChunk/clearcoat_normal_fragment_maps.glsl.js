export default /* glsl */`
#ifdef USE_CLEARCOAT_NORMALMAP // 如果启用清漆层法线贴图

	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0; // 采样并从 [0,1] 映射到 [-1,1]
	clearcoatMapN.xy *= clearcoatNormalScale; // 按比例缩放切向面的法线分量强度

	clearcoatNormal = normalize( tbn2 * clearcoatMapN ); // 将贴图法线从切空间变换到视/世界空间并归一化

#endif // 结束：USE_CLEARCOAT_NORMALMAP 条件
`;
