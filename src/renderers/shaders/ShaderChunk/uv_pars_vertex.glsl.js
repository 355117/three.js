export default /* glsl */` // 导出GLSL片段开始
#if defined( USE_UV ) || defined( USE_ANISOTROPY ) // 若启用基础UV或各向异性

	varying vec2 vUv; // 基础UV（从顶点到片段）

#endif // 结束基础UV
#ifdef USE_MAP // 颜色贴图

	uniform mat3 mapTransform; // 颜色贴图UV变换
	varying vec2 vMapUv; // 颜色贴图UV

#endif // 结束USE_MAP
#ifdef USE_ALPHAMAP // 透明度贴图

	uniform mat3 alphaMapTransform; // 透明度贴图UV变换
	varying vec2 vAlphaMapUv; // 透明度贴图UV

#endif // 结束USE_ALPHAMAP
#ifdef USE_LIGHTMAP // 光照贴图

	uniform mat3 lightMapTransform; // 光照贴图UV变换
	varying vec2 vLightMapUv; // 光照贴图UV

#endif // 结束USE_LIGHTMAP
#ifdef USE_AOMAP // 环境光遮蔽贴图

	uniform mat3 aoMapTransform; // AO贴图UV变换
	varying vec2 vAoMapUv; // AO贴图UV

#endif // 结束USE_AOMAP
#ifdef USE_BUMPMAP // 凹凸贴图（高度图）

	uniform mat3 bumpMapTransform; // 凹凸贴图UV变换
	varying vec2 vBumpMapUv; // 凹凸贴图UV

#endif // 结束USE_BUMPMAP
#ifdef USE_NORMALMAP // 法线贴图

	uniform mat3 normalMapTransform; // 法线贴图UV变换
	varying vec2 vNormalMapUv; // 法线贴图UV

#endif // 结束USE_NORMALMAP
#ifdef USE_DISPLACEMENTMAP // 置换贴图

	uniform mat3 displacementMapTransform; // 置换贴图UV变换
	varying vec2 vDisplacementMapUv; // 置换贴图UV

#endif // 结束USE_DISPLACEMENTMAP
#ifdef USE_EMISSIVEMAP // 自发光贴图

	uniform mat3 emissiveMapTransform; // 自发光贴图UV变换
	varying vec2 vEmissiveMapUv; // 自发光贴图UV

#endif // 结束USE_EMISSIVEMAP
#ifdef USE_METALNESSMAP // 金属度贴图

	uniform mat3 metalnessMapTransform; // 金属度贴图UV变换
	varying vec2 vMetalnessMapUv; // 金属度贴图UV

#endif // 结束USE_METALNESSMAP
#ifdef USE_ROUGHNESSMAP // 粗糙度贴图

	uniform mat3 roughnessMapTransform; // 粗糙度贴图UV变换
	varying vec2 vRoughnessMapUv; // 粗糙度贴图UV

#endif // 结束USE_ROUGHNESSMAP
#ifdef USE_ANISOTROPYMAP // 各向异性贴图

	uniform mat3 anisotropyMapTransform; // 各向异性贴图UV变换
	varying vec2 vAnisotropyMapUv; // 各向异性贴图UV

#endif // 结束USE_ANISOTROPYMAP
#ifdef USE_CLEARCOATMAP // 清漆强度贴图

	uniform mat3 clearcoatMapTransform; // 清漆强度贴图UV变换
	varying vec2 vClearcoatMapUv; // 清漆强度贴图UV

#endif // 结束USE_CLEARCOATMAP
#ifdef USE_CLEARCOAT_NORMALMAP // 清漆法线贴图

	uniform mat3 clearcoatNormalMapTransform; // 清漆法线贴图UV变换
	varying vec2 vClearcoatNormalMapUv; // 清漆法线贴图UV

#endif // 结束USE_CLEARCOAT_NORMALMAP
#ifdef USE_CLEARCOAT_ROUGHNESSMAP // 清漆粗糙度贴图

	uniform mat3 clearcoatRoughnessMapTransform; // 清漆粗糙度贴图UV变换
	varying vec2 vClearcoatRoughnessMapUv; // 清漆粗糙度贴图UV

#endif // 结束USE_CLEARCOAT_ROUGHNESSMAP
#ifdef USE_SHEEN_COLORMAP // 光泽颜色贴图

	uniform mat3 sheenColorMapTransform; // 光泽颜色贴图UV变换
	varying vec2 vSheenColorMapUv; // 光泽颜色贴图UV

#endif // 结束USE_SHEEN_COLORMAP
#ifdef USE_SHEEN_ROUGHNESSMAP // 光泽粗糙度贴图

	uniform mat3 sheenRoughnessMapTransform; // 光泽粗糙度贴图UV变换
	varying vec2 vSheenRoughnessMapUv; // 光泽粗糙度贴图UV

#endif // 结束USE_SHEEN_ROUGHNESSMAP
#ifdef USE_IRIDESCENCEMAP // 虹彩强度贴图

	uniform mat3 iridescenceMapTransform; // 虹彩强度贴图UV变换
	varying vec2 vIridescenceMapUv; // 虹彩强度贴图UV

#endif // 结束USE_IRIDESCENCEMAP
#ifdef USE_IRIDESCENCE_THICKNESSMAP // 虹彩膜厚贴图

	uniform mat3 iridescenceThicknessMapTransform; // 虹彩膜厚贴图UV变换
	varying vec2 vIridescenceThicknessMapUv; // 虹彩膜厚贴图UV

#endif // 结束USE_IRIDESCENCE_THICKNESSMAP
#ifdef USE_SPECULARMAP // 传统镜面贴图

	uniform mat3 specularMapTransform; // 镜面贴图UV变换
	varying vec2 vSpecularMapUv; // 镜面贴图UV

#endif // 结束USE_SPECULARMAP
#ifdef USE_SPECULAR_COLORMAP // Specular Color贴图

	uniform mat3 specularColorMapTransform; // Specular Color贴图UV变换
	varying vec2 vSpecularColorMapUv; // Specular Color贴图UV

#endif // 结束USE_SPECULAR_COLORMAP
#ifdef USE_SPECULAR_INTENSITYMAP // Specular Intensity贴图

	uniform mat3 specularIntensityMapTransform; // Specular Intensity贴图UV变换
	varying vec2 vSpecularIntensityMapUv; // Specular Intensity贴图UV

#endif // 结束USE_SPECULAR_INTENSITYMAP
#ifdef USE_TRANSMISSIONMAP // 透射强度贴图

	uniform mat3 transmissionMapTransform; // 透射贴图UV变换
	varying vec2 vTransmissionMapUv; // 透射贴图UV

#endif // 结束USE_TRANSMISSIONMAP
#ifdef USE_THICKNESSMAP // 厚度贴图

	uniform mat3 thicknessMapTransform; // 厚度贴图UV变换
	varying vec2 vThicknessMapUv; // 厚度贴图UV

#endif // 结束USE_THICKNESSMAP
`; // 导出GLSL片段结束
