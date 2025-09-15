export default /* glsl */`
#if defined( USE_POINTS_UV ) // 中文：点精灵直接使用顶点阶段传入的 vUv

	varying vec2 vUv; // 中文：片元着色器接收的 UV 坐标

#else // 中文：否则使用点精灵自身的 gl_PointCoord 并结合变换

	#if defined( USE_MAP ) || defined( USE_ALPHAMAP ) // 中文：当使用颜色贴图或透明贴图时，需要 UV 变换矩阵

		uniform mat3 uvTransform; // 中文：UV 变换矩阵（平移/缩放/旋转）

	#endif // 中文：结束 UV 变换矩阵条件

#endif // 中文：结束 USE_POINTS_UV 条件

#ifdef USE_MAP // 中文：如果启用颜色贴图

	uniform sampler2D map; // 中文：颜色贴图采样器

#endif // 中文：结束 USE_MAP 条件

#ifdef USE_ALPHAMAP // 中文：如果启用透明度贴图

	uniform sampler2D alphaMap; // 中文：透明度贴图采样器

#endif // 中文：结束 USE_ALPHAMAP 条件
`;
