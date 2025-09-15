export default /* glsl */`
#ifdef USE_LOGDEPTHBUF // 中文：如果启用日志深度缓冲（顶点着色器声明）

	varying float vFragDepth; // 中文：传递给片元着色器的深度值
	varying float vIsPerspective; // 中文：标记是否透视投影（float 标志）

#endif // 中文：结束 USE_LOGDEPTHBUF 条件编译
`;
