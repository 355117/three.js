export default /* glsl */` // 导出GLSL片段开始
#ifndef FLAT_SHADED // 若未启用平面着色（法线将被插值）

	varying vec3 vNormal; // 传递到片段着色器的法线

	#ifdef USE_TANGENT // 若启用切线空间支持

		varying vec3 vTangent; // 传递切线
		varying vec3 vBitangent; // 传递副切线

	#endif // 结束USE_TANGENT

#endif // 结束FLAT_SHADED
`; // 导出GLSL片段结束
