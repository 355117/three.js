export default /* glsl */`
#ifdef USE_LOGDEPTHBUF // 中文：如果启用日志深度缓冲（顶点着色器实现）

	vFragDepth = 1.0 + gl_Position.w; // 中文：保留 gl_Position.w（透视除法前的深度分量）并偏移 1.0
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) ); // 中文：检测投影矩阵是否为透视，转为 0.0/1.0

#endif // 中文：结束 USE_LOGDEPTHBUF 条件编译
`;
