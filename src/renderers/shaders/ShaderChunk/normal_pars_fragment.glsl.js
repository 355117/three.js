export default /* glsl */` // 导出GLSL片段开始
#ifndef FLAT_SHADED // 若未启用平面着色（法线由插值获得）

	varying vec3 vNormal; // 从顶点着色器传入的插值法线

	#ifdef USE_TANGENT // 若启用切线空间支持

		varying vec3 vTangent; // 插值切线向量
		varying vec3 vBitangent; // 插值副切线（双法线）

	#endif // 结束USE_TANGENT

#endif // 结束FLAT_SHADED
`; // 导出GLSL片段结束
