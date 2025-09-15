export default /* glsl */` // 导出GLSL片段开始
#ifdef USE_SKINNING // 若启用蒙皮

	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 ); // 顶点绑定到骨骼空间

	vec4 skinned = vec4( 0.0 ); // 初始化蒙皮结果
	skinned += boneMatX * skinVertex * skinWeight.x; // 权重X
	skinned += boneMatY * skinVertex * skinWeight.y; // 权重Y
	skinned += boneMatZ * skinVertex * skinWeight.z; // 权重Z
	skinned += boneMatW * skinVertex * skinWeight.w; // 权重W

	transformed = ( bindMatrixInverse * skinned ).xyz; // 转回对象空间

#endif // 结束USE_SKINNING
`; // 导出GLSL片段结束
