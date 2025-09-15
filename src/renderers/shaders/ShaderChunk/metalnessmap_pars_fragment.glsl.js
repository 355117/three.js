export default /* glsl */`
#ifdef USE_METALNESSMAP // 中文：如果启用金属度贴图

	uniform sampler2D metalnessMap; // 中文：金属度贴图采样器

#endif // 中文：结束 USE_METALNESSMAP 条件
`;
