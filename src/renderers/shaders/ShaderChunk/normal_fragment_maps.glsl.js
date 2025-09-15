export default /* glsl */` // 导出GLSL片段开始

#ifdef USE_NORMALMAP_OBJECTSPACE // 若使用对象空间法线贴图

	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0; // overrides both flatShading and attribute normals // 采样对象空间法线并映射到[-1,1]，覆盖flatShading和属性法线

	#ifdef FLIP_SIDED // 反面渲染需要翻转法线

		normal = - normal; // 法线取反

	#endif // 结束FLIP_SIDED

	#ifdef DOUBLE_SIDED // 双面渲染按面方向调整法线

		normal = normal * faceDirection; // 乘以±1以匹配当前面朝向

	#endif // 结束DOUBLE_SIDED

	normal = normalize( normalMatrix * normal ); // 将对象空间法线变换至视图/世界空间并归一化

#elif defined( USE_NORMALMAP_TANGENTSPACE ) // 若使用切线空间法线贴图

	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0; // 采样切线空间法线并映射到[-1,1]
	mapN.xy *= normalScale; // 应用法线强度缩放（仅XY分量）

	normal = normalize( tbn * mapN ); // 使用TBN矩阵将切线空间法线变换到视图空间并归一化

#elif defined( USE_BUMPMAP ) // 若使用凹凸贴图（高度图）

	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection ); // 依据视线方向与高度梯度扰动法线

#endif // 条件编译结束
`; // 导出GLSL片段结束
