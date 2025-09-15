export default /* glsl */`
#ifdef USE_ENVMAP // 若启用环境贴图采样

	#ifdef ENV_WORLDPOS // 若使用世界空间位置计算反射向量

		vec3 cameraToFrag; // 摄像机到片元方向

		if ( isOrthographic ) { // 正交相机

			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) ); // 取相机前方向

		} else { // 透视相机

			cameraToFrag = normalize( vWorldPosition - cameraPosition ); // 世界坐标差归一化

		}

		// Transforming Normal Vectors with the Inverse Transformation // 使用逆变换将法线转至世界空间
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix ); // 将视空间法线转到世界空间

		#ifdef ENVMAP_MODE_REFLECTION // 反射模式

			vec3 reflectVec = reflect( cameraToFrag, worldNormal ); // 根据世界法线计算反射向量

		#else // 折射模式

			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio ); // 根据折射率计算折射向量

		#endif // 结束：反射/折射选择

	#else // 若不在世界空间，直接使用插值向量

		vec3 reflectVec = vReflect; // 顶点阶段已计算的反射/折射向量

	#endif // 结束：ENV_WORLDPOS

	#ifdef ENVMAP_TYPE_CUBE // 立方体贴图类型

		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) ); // 应用旋转与 X 翻转后采样

	#else // 非立方体类型（此处默认为 0）

		vec4 envColor = vec4( 0.0 ); // 预留：其它类型在别处实现

	#endif // 结束：贴图类型

	#ifdef ENVMAP_BLENDING_MULTIPLY // 乘法混合

		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity ); // 按强度插值

	#elif defined( ENVMAP_BLENDING_MIX ) // 线性混合

		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity ); // 用反射强度控制混合

	#elif defined( ENVMAP_BLENDING_ADD ) // 加法混合

		outgoingLight += envColor.xyz * specularStrength * reflectivity; // 叠加高光贡献

	#endif // 结束：混合模式

#endif // 结束：USE_ENVMAP
`;
