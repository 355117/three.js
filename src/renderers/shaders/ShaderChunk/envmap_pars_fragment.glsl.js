export default /* glsl */`
#ifdef USE_ENVMAP // 若启用环境贴图

	uniform float reflectivity; // 反射强度系数

	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT ) // 若使用需法线的着色模型

		#define ENV_WORLDPOS // 启用世界位置路径（更精确）

	#endif // 结束：模型条件

	#ifdef ENV_WORLDPOS // 世界空间路径（片元侧）

		varying vec3 vWorldPosition; // 片元世界坐标
		uniform float refractionRatio; // 折射率（空气/介质）
	#else // 非世界空间路径
		varying vec3 vReflect; // 插值的反射/折射向量
	#endif // 结束：ENV_WORLDPOS

#endif // 结束：USE_ENVMAP
`;
