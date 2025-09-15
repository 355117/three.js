export default /* glsl */`
#ifdef USE_INSTANCING_MORPH // 中文：启用实例化的形变（每实例从纹理中读取权重）

	float morphTargetInfluences[ MORPHTARGETS_COUNT ]; // 中文：每个形变目标的权重数组

	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r; // 中文：从形变纹理第 0 列读取基准影响（按实例）

	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) { // 中文：遍历所有形变目标

		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r; // 中文：从纹理第 i+1 列读取对应目标的权重

	}
#endif // 中文：结束 USE_INSTANCING_MORPH 条件
`;
