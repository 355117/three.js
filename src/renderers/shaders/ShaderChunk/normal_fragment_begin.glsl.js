export default /* glsl */`
float faceDirection = gl_FrontFacing ? 1.0 : - 1.0; // 中文：正面为 +1，背面为 -1（用于双面翻转法线）

#ifdef FLAT_SHADED // 中文：平面着色（flat shading）使用屏幕空间导数计算法线

	vec3 fdx = dFdx( vViewPosition ); // 中文：视图空间位置对 x 的偏导
	vec3 fdy = dFdy( vViewPosition ); // 中文：视图空间位置对 y 的偏导
	vec3 normal = normalize( cross( fdx, fdy ) ); // 中文：交叉得到面法线并归一化

#else // 中文：否则使用插值后的顶点法线

	vec3 normal = normalize( vNormal ); // 中文：插值法线归一化

	#ifdef DOUBLE_SIDED // 中文：双面材质需要根据面朝向翻转法线

		normal *= faceDirection; // 中文：背面时翻转法线方向

	#endif // 中文：结束 DOUBLE_SIDED 条件

#endif // 中文：结束 FLAT_SHADED 分支

#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) // 中文：当需要切线空间法线/清漆法线/各向异性时构建 TBN

	#ifdef USE_TANGENT // 中文：若提供了顶点切线/副切线

		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal ); // 中文：直接用 vTangent/vBitangent/normal 组成 TBN

	#else // 中文：否则从几何和 UV 推导切线空间

		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP ) // 中文：使用法线贴图的 UV
			vNormalMapUv // 中文：法线贴图 UV
		#elif defined( USE_CLEARCOAT_NORMALMAP ) // 中文：使用清漆法线贴图的 UV
			vClearcoatNormalMapUv // 中文：清漆法线贴图 UV
		#else // 中文：退化为基础 UV
			vUv // 中文：基础 UV
		#endif
		); // 中文：根据视线方向与法线求解 TBN

	#endif // 中文：结束 USE_TANGENT 条件

	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED ) // 中文：双面且非平面着色时，翻转 TBN 的切/副切分量

		tbn[0] *= faceDirection; // 中文：翻转切线
		tbn[1] *= faceDirection; // 中文：翻转副切线

	#endif // 中文：结束双面条件

#endif // 中文：结束 TBN 构建条件

#ifdef USE_CLEARCOAT_NORMALMAP // 中文：为清漆层单独构建 TBN2

	#ifdef USE_TANGENT // 中文：若提供了切线

		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal ); // 中文：直接使用顶点切线/副切线/法线

	#else // 中文：否则从视线和法线推导

		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv ); // 中文：根据清漆法线贴图 UV 推导 TBN2

	#endif // 中文：结束 USE_TANGENT 条件

	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED ) // 中文：双面且非平面着色时，同样翻转 tbn2 的切/副切

		tbn2[0] *= faceDirection; // 中文：翻转切线
		tbn2[1] *= faceDirection; // 中文：翻转副切线

	#endif // 中文：结束双面条件

#endif // 中文：结束清漆法线贴图条件

// non perturbed normal for clearcoat among others // 中文：未扰动的法线（用于清漆等层的基法线）

vec3 nonPerturbedNormal = normal; // 中文：保留原始（未贴图扰动）的法线

`;
