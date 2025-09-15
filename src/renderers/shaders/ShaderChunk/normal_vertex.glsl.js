export default /* glsl */` // 导出GLSL片段开始
#ifndef FLAT_SHADED // 当启用FLAT_SHADED时法线由导数计算，这里未启用

	vNormal = normalize( transformedNormal ); // 归一化后的顶点法线传递给片段阶段

	#ifdef USE_TANGENT // 若启用切线空间支持

		vTangent = normalize( transformedTangent ); // 归一化切线
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w ); // 依据切线手性计算并归一化副切线

	#endif // 结束USE_TANGENT

#endif // 结束FLAT_SHADED
`; // 导出GLSL片段结束
