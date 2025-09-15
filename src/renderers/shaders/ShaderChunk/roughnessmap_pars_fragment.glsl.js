export default /* glsl */` // 导出GLSL片段开始
#ifdef USE_ROUGHNESSMAP // 若启用粗糙度贴图

	uniform sampler2D roughnessMap; // 粗糙度贴图采样器

#endif // 结束USE_ROUGHNESSMAP
`; // 导出GLSL片段结束
