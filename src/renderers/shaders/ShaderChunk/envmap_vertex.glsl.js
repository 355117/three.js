export default /* glsl */`
#ifdef USE_ENVMAP // 若启用环境贴图

	#ifdef ENV_WORLDPOS // 世界空间路径

		vWorldPosition = worldPosition.xyz; // 将世界坐标传递到片元

	#else // 非世界空间路径

		vec3 cameraToVertex; // 摄像机到顶点方向

		if ( isOrthographic ) { // 正交相机

			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) ); // 相机前方向

		} else { // 透视相机

			cameraToVertex = normalize( worldPosition.xyz - cameraPosition ); // 世界空间向量归一化

		}

		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix ); // 将法线转到世界空间

		#ifdef ENVMAP_MODE_REFLECTION // 反射模式

			vReflect = reflect( cameraToVertex, worldNormal ); // 计算反射向量

		#else // 折射模式

			vReflect = refract( cameraToVertex, worldNormal, refractionRatio ); // 计算折射向量

		#endif // 结束：反射/折射

	#endif // 结束：ENV_WORLDPOS

#endif // 结束：USE_ENVMAP
`;
