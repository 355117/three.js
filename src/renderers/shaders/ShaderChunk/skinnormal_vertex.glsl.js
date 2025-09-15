export default /* glsl */` // 导出GLSL片段开始
#ifdef USE_SKINNING // 若启用蒙皮

	mat4 skinMatrix = mat4( 0.0 ); // 初始化蒙皮矩阵
	skinMatrix += skinWeight.x * boneMatX; // 加权骨骼X
	skinMatrix += skinWeight.y * boneMatY; // 加权骨骼Y
	skinMatrix += skinWeight.z * boneMatZ; // 加权骨骼Z
	skinMatrix += skinWeight.w * boneMatW; // 加权骨骼W
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix; // 转回对象空间

	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz; // 变换法线

	#ifdef USE_TANGENT // 若启用切线

		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz; // 变换切线

	#endif // 结束USE_TANGENT

#endif // 结束USE_SKINNING
`; // 导出GLSL片段结束
