export default /* glsl */`
#if defined( USE_LOGDEPTHBUF ) // 中文：如果启用日志深度缓冲（片元着色器声明）

	uniform float logDepthBufFC; // 中文：对数深度缩放系数（factor/constant）
	varying float vFragDepth; // 中文：从顶点着色器传入的深度值（用于对数深度计算）
	varying float vIsPerspective; // 中文：是否为透视投影（1.0 为透视，0.0 为正交）

#endif // 中文：结束 USE_LOGDEPTHBUF 条件编译
`;
