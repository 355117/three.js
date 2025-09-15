export default /* glsl */` // 导出GLSL片段开始
vec4 mvPosition = vec4( transformed, 1.0 ); // 模型空间顶点齐次坐标

#ifdef USE_BATCHING // 批处理矩阵

	mvPosition = batchingMatrix * mvPosition; // 应用批处理变换

#endif // 结束USE_BATCHING

#ifdef USE_INSTANCING // 实例化矩阵

	mvPosition = instanceMatrix * mvPosition; // 应用实例变换

#endif // 结束USE_INSTANCING

mvPosition = modelViewMatrix * mvPosition; // 变换到视图空间

gl_Position = projectionMatrix * mvPosition; // 投影到裁剪空间
`; // 导出GLSL片段结束
