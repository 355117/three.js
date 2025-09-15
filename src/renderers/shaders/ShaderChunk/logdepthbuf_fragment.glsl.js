export default /* glsl */`
#if defined( USE_LOGDEPTHBUF ) // 如果启用日志深度缓冲（Log Depth Buffer）

	// Doing a strict comparison with == 1.0 can cause noise artifacts // 中文：对 1.0 进行严格相等比较可能产生噪点伪影
	// on some platforms. See issue #17623. // 中文：在某些平台上会出现。参见问题 #17623
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5; // 中文：正交相机用 gl_FragCoord.z；透视相机使用对数深度公式

#endif // 中文：结束 USE_LOGDEPTHBUF 条件编译
`;
