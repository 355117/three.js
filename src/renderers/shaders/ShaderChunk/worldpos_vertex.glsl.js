export default /* glsl */` // 导出GLSL片段开始
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0 // 若需要世界坐标供环境贴图/阴影/透射/聚光等使用

	vec4 worldPosition = vec4( transformed, 1.0 ); // 初始为模型空间位置齐次坐标

	#ifdef USE_BATCHING // 使用批处理矩阵时先应用批处理变换

		worldPosition = batchingMatrix * worldPosition; // 应用批处理矩阵

	#endif // 结束USE_BATCHING

	#ifdef USE_INSTANCING // 使用实例化矩阵时应用实例变换

		worldPosition = instanceMatrix * worldPosition; // 应用实例矩阵

	#endif // 结束USE_INSTANCING

	worldPosition = modelMatrix * worldPosition; // 最终乘以模型矩阵得到世界空间位置

#endif // 条件编译结束
`; // 导出GLSL片段结束
