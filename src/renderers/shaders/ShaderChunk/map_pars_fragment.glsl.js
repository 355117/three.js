export default /* glsl */`
#ifdef USE_MAP // 中文：如果启用基础颜色贴图（漫反射贴图）

	uniform sampler2D map; // 中文：基础颜色纹理采样器

#endif // 中文：结束 USE_MAP 条件编译
`;
