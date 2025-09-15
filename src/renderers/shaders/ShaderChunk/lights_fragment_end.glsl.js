export default /* glsl */`
#if defined( RE_IndirectDiffuse ) // 中文：若定义了间接漫反射的渲染方程

	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight ); // 中文：调用间接漫反射方程，累加到 reflectedLight

#endif // 中文：结束 RE_IndirectDiffuse 条件

#if defined( RE_IndirectSpecular ) // 中文：若定义了间接高光的渲染方程

	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight ); // 中文：调用间接镜面反射方程，累加到 reflectedLight

#endif // 中文：结束 RE_IndirectSpecular 条件
`;
