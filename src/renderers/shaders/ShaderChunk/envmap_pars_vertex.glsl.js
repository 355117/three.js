export default /* glsl */`
#ifdef USE_ENVMAP // 若启用环境贴图

	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT ) // 若采用依赖法线的模型

		#define ENV_WORLDPOS // 使用世界空间路径（更准确）

	#endif // 结束：模型条件

	#ifdef ENV_WORLDPOS // 世界空间路径（顶点侧）
		
		varying vec3 vWorldPosition; // 传递世界坐标到片元

	#else // 非世界空间路径

		varying vec3 vReflect; // 传递反射/折射向量
		uniform float refractionRatio; // 折射率

	#endif // 结束：ENV_WORLDPOS

#endif // 结束：USE_ENVMAP
`;
