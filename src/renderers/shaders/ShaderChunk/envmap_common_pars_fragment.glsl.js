export default /* glsl */`
#ifdef USE_ENVMAP // 若启用环境贴图

	uniform float envMapIntensity; // 环境贴图强度
	uniform float flipEnvMap; // 水平翻转开关（+1/-1）
	uniform mat3 envMapRotation; // 环境贴图旋转矩阵（3x3）

	#ifdef ENVMAP_TYPE_CUBE // 若是立方体贴图
		uniform samplerCube envMap; // 立方体贴图采样器
	#else // 否则为 2D 贴图（如 PMREM 合图）
		uniform sampler2D envMap; // 二维贴图采样器
	#endif // 结束：贴图类型
	 
#endif // 结束：USE_ENVMAP
`;
