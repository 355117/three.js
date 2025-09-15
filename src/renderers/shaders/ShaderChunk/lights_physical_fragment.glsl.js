export default /* glsl */` // 导出GLSL片段开始
PhysicalMaterial material; // 声明物理材质临时变量
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor ); // 计算非金属部分的漫反射颜色

vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) ); // 法线变化量估计
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z ); // 几何粗糙度（基于导数）

material.roughness = max( roughnessFactor, 0.0525 );// 0.0525 corresponds to the base mip of a 256 cubemap. // 基础粗糙度下限
material.roughness += geometryRoughness; // 加上几何粗糙度
material.roughness = min( material.roughness, 1.0 ); // 上限裁剪

#ifdef IOR // 若启用IOR参数

	material.ior = ior; // 赋值材质IOR

	#ifdef USE_SPECULAR // 若启用可控Specular

		float specularIntensityFactor = specularIntensity; // 镜面强度因子
		vec3 specularColorFactor = specularColor; // 镜面颜色因子

		#ifdef USE_SPECULAR_COLORMAP // 使用Specular颜色贴图

			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb; // 采样并调制镜面颜色

		#endif

		#ifdef USE_SPECULAR_INTENSITYMAP // 使用Specular强度贴图

			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a; // 采样并调制镜面强度

		#endif

		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor ); // 金属度影响F90

	#else // 未启用可控Specular

		float specularIntensityFactor = 1.0; // 默认强度1
		vec3 specularColorFactor = vec3( 1.0 ); // 默认颜色白
		material.specularF90 = 1.0; // 默认F90为1

	#endif

	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor ); // 基于IOR与金属度混合F0

#else // 未定义IOR时

	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor ); // Dielectric基准F0=0.04
	material.specularF90 = 1.0; // F90取1

#endif // 结束IOR路径

#ifdef USE_CLEARCOAT // 若启用清漆层

	material.clearcoat = clearcoat; // 清漆强度
	material.clearcoatRoughness = clearcoatRoughness; // 清漆粗糙度
	material.clearcoatF0 = vec3( 0.04 ); // 清漆F0
	material.clearcoatF90 = 1.0; // 清漆F90

	#ifdef USE_CLEARCOATMAP // 使用清漆强度贴图

		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x; // 采样并调制清漆强度

	#endif

	#ifdef USE_CLEARCOAT_ROUGHNESSMAP // 使用清漆粗糙度贴图

		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y; // 采样并调制清漆粗糙度

	#endif

	material.clearcoat = saturate( material.clearcoat ); // Burley clearcoat model // 限幅清漆强度
	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 ); // 设置下限
	material.clearcoatRoughness += geometryRoughness; // 加上几何粗糙度
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 ); // 上限裁剪

#endif // 结束清漆

#ifdef USE_DISPERSION // 若启用色散

	material.dispersion = dispersion; // 赋值色散强度

#endif // 结束色散

#ifdef USE_IRIDESCENCE // 若启用虹彩

	material.iridescence = iridescence; // 虹彩强度
	material.iridescenceIOR = iridescenceIOR; // 虹彩IOR

	#ifdef USE_IRIDESCENCEMAP // 虹彩强度贴图

		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r; // 采样并调制虹彩强度

	#endif

	#ifdef USE_IRIDESCENCE_THICKNESSMAP // 虹彩膜厚贴图

		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum; // 采样后映射到范围

	#else // 未使用膜厚贴图

		material.iridescenceThickness = iridescenceThicknessMaximum; // 使用最大膜厚

	#endif

#endif // 结束虹彩

#ifdef USE_SHEEN // 若启用光泽(织物)

	material.sheenColor = sheenColor; // 光泽颜色

	#ifdef USE_SHEEN_COLORMAP // 光泽颜色贴图

		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb; // 采样并调制

	#endif

	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 ); // 限制光泽粗糙度范围

	#ifdef USE_SHEEN_ROUGHNESSMAP // 光泽粗糙度贴图

		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a; // 采样并调制

	#endif

#endif // 结束光泽

#ifdef USE_ANISOTROPY // 若启用各向异性

	#ifdef USE_ANISOTROPYMAP // 使用各向异性贴图

		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x ); // 将向量旋转到切线基
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb; // 采样极坐标参数
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b; // 求各向异性方向向量

	#else // 未使用贴图，采用常量

		vec2 anisotropyV = anisotropyVector; // 直接使用输入向量

	#endif // 结束各向异性方向获取

	material.anisotropy = length( anisotropyV ); // 各向异性强度

	if( material.anisotropy == 0.0 ) { // 若无各向异性
		anisotropyV = vec2( 1.0, 0.0 ); // 使用默认方向
	} else { // 归一化方向并限幅强度
		anisotropyV /= material.anisotropy; // 方向归一化
		material.anisotropy = saturate( material.anisotropy ); // 强度限幅
	}

	// Roughness along the anisotropy bitangent is the material roughness, while the tangent roughness increases with anisotropy. // 各向异性副切线方向粗糙度为材质粗糙度，切线方向粗糙度随各向异性增大
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) ); // 计算切线方向粗糙度alphaT

	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y; // 各向异性切线方向向量
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y; // 各向异性副切线方向向量

#endif // 结束各向异性
`; // 导出GLSL片段结束
