export default /* glsl */`
#ifdef USE_FOG // 若启用雾效

	uniform vec3 fogColor; // 雾颜色（线性空间）
	varying float vFogDepth; // 从顶点阶段传入的深度

	#ifdef FOG_EXP2 // 指数平方雾参数

		uniform float fogDensity; // 雾密度

	#else // 线性雾参数

		uniform float fogNear; // 雾起始距离
		uniform float fogFar; // 雾结束距离

	#endif // 结束：雾模型参数

#endif // 结束：USE_FOG
`;
