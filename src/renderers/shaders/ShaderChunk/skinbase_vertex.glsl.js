export default /* glsl */` // 导出GLSL片段开始
#ifdef USE_SKINNING // 若启用蒙皮

	mat4 boneMatX = getBoneMatrix( skinIndex.x ); // 骨骼矩阵X
	mat4 boneMatY = getBoneMatrix( skinIndex.y ); // 骨骼矩阵Y
	mat4 boneMatZ = getBoneMatrix( skinIndex.z ); // 骨骼矩阵Z
	mat4 boneMatW = getBoneMatrix( skinIndex.w ); // 骨骼矩阵W

#endif // 结束USE_SKINNING
`; // 导出GLSL片段结束
