export default /* glsl */`
#if defined( USE_MAP ) || defined( USE_ALPHAMAP ) // 中文：如使用颜色贴图或透明贴图，需要计算点精灵的 UV

	#if defined( USE_POINTS_UV ) // 中文：若顶点已提供 vUv，则直接使用

		vec2 uv = vUv; // 中文：使用插值后的 vUv

	#else // 中文：否则从 gl_PointCoord 构造 UV，并应用 uvTransform

		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy; // 中文：点精灵的原生 UV（翻转 Y）并进行矩阵变换

	#endif // 中文：结束 USE_POINTS_UV 条件

#endif // 中文：结束 贴图/透明贴图 的 UV 计算条件

#ifdef USE_MAP // 中文：如果启用颜色贴图

	diffuseColor *= texture2D( map, uv ); // 中文：将贴图颜色乘到漫反射颜色上

#endif // 中文：结束 USE_MAP 条件

#ifdef USE_ALPHAMAP // 中文：如果启用透明度贴图

	diffuseColor.a *= texture2D( alphaMap, uv ).g; // 中文：将贴图的绿色通道乘到 alpha 上（与 three 内部约定一致）

#endif // 中文：结束 USE_ALPHAMAP 条件
`;
