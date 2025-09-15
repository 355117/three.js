export default /* glsl */`
#ifdef USE_MORPHNORMALS // 中文：启用法线的形变目标

	// morphTargetBaseInfluence is set based on BufferGeometry.morphTargetsRelative value: // 中文：基准影响由 morphTargetsRelative 决定
	// When morphTargetsRelative is false, this is set to 1 - sum(influences); this results in normal = sum((target - base) * influence) // 中文：false 时：以 (target - base) 形式累加
	// When morphTargetsRelative is true, this is set to 1; as a result, all morph targets are simply added to the base after weighting // 中文：true 时：所有目标直接按权重加到基准
	objectNormal *= morphTargetBaseInfluence; // 中文：先缩放基础法线

	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) { // 中文：遍历形变目标

		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ]; // 中文：按权重累加法线偏移（offset=1 通道）

	}

#endif // 中文：结束 USE_MORPHNORMALS 条件
`;
