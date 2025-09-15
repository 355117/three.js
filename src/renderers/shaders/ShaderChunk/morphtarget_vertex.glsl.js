export default /* glsl */`
#ifdef USE_MORPHTARGETS // 中文：启用位置的形变目标

	// morphTargetBaseInfluence is set based on BufferGeometry.morphTargetsRelative value: // 中文：基准影响与 morphTargetsRelative 设置相关
	// When morphTargetsRelative is false, this is set to 1 - sum(influences); this results in position = sum((target - base) * influence) // 中文：false 时：按 (target - base) 叠加位移
	// When morphTargetsRelative is true, this is set to 1; as a result, all morph targets are simply added to the base after weighting // 中文：true 时：按权重直接加到基准位置
	transformed *= morphTargetBaseInfluence; // 中文：先对基准位置做缩放

	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) { // 中文：遍历所有形变目标

		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ]; // 中文：按权重累加位置偏移（offset=0 通道）

	}

#endif // 中文：结束 USE_MORPHTARGETS 条件
`;
