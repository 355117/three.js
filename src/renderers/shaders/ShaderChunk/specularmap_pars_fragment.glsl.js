export default /* glsl */` // 导出GLSL片段开始
#ifdef USE_SPECULARMAP // 若启用传统镜面贴图

	uniform sampler2D specularMap; // 镜面贴图采样器

#endif // 结束USE_SPECULARMAP
`; // 导出GLSL片段结束
