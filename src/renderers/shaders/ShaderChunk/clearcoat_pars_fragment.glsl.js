export default /* glsl */`

#ifdef USE_CLEARCOATMAP // 如果启用清漆层强度贴图

	uniform sampler2D clearcoatMap; // 清漆层强度贴图采样器

#endif // 结束：USE_CLEARCOATMAP 条件

#ifdef USE_CLEARCOAT_NORMALMAP // 如果启用清漆层法线贴图

	uniform sampler2D clearcoatNormalMap; // 清漆层法线贴图采样器
	uniform vec2 clearcoatNormalScale; // 清漆层法线强度缩放（x,y 分量）

#endif // 结束：USE_CLEARCOAT_NORMALMAP 条件

#ifdef USE_CLEARCOAT_ROUGHNESSMAP // 如果启用清漆层粗糙度贴图

	uniform sampler2D clearcoatRoughnessMap; // 清漆层粗糙度贴图采样器

#endif // 结束：USE_CLEARCOAT_ROUGHNESSMAP 条件
`;
