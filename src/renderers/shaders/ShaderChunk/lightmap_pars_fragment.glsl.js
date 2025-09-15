export default /* glsl */`
#ifdef USE_LIGHTMAP // 若启用光照贴图

	uniform sampler2D lightMap; // 光照贴图采样器
	uniform float lightMapIntensity; // 光照贴图强度

#endif // 结束：USE_LIGHTMAP
`;
