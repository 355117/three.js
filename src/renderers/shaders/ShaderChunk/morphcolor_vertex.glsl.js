export default /* glsl */`
#if defined( USE_MORPHCOLORS ) // 中文：启用颜色的形变目标（Morph Colors）

	// morphTargetBaseInfluence is set based on BufferGeometry.morphTargetsRelative value: // 中文：morphTargetBaseInfluence 由 BufferGeometry.morphTargetsRelative 决定
	// When morphTargetsRelative is false, this is set to 1 - sum(influences); this results in normal = sum((target - base) * influence) // 中文：当为 false 时，值为 1 - 权重和；表示以 (target - base) 形式累加
	// When morphTargetsRelative is true, this is set to 1; as a result, all morph targets are simply added to the base after weighting // 中文：当为 true 时，值为 1；所有目标按权重直接叠加到基准
	vColor *= morphTargetBaseInfluence; // 中文：先按基准影响缩放顶点颜色

	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) { // 中文：遍历所有形变目标

		#if defined( USE_COLOR_ALPHA ) // 中文：若颜色包含 alpha 通道

			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ]; // 中文：按权重累加 RGBA 颜色形变

		#elif defined( USE_COLOR ) // 中文：仅使用 RGB 颜色

			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ]; // 中文：按权重累加 RGB 颜色形变

		#endif // 中文：结束颜色条件

	} // 中文：for 循环结束

#endif // 中文：结束 USE_MORPHCOLORS 条件
`;
