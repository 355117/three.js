export default /* glsl */` // 导出GLSL片段开始
#if defined( USE_UV ) || defined( USE_ANISOTROPY ) // 若启用基础UV或各向异性

	vUv = vec3( uv, 1 ).xy; // 将模型UV扩展为vec3再取前两分量，便于矩阵变换

#endif // 结束基础UV
#ifdef USE_MAP // 颜色贴图

	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy; // 应用颜色贴图UV变换后传递

#endif // 结束USE_MAP
#ifdef USE_ALPHAMAP // 透明度贴图

	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy; // 应用透明度贴图UV变换

#endif // 结束USE_ALPHAMAP
#ifdef USE_LIGHTMAP // 光照贴图

	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy; // 应用光照贴图UV变换

#endif // 结束USE_LIGHTMAP
#ifdef USE_AOMAP // 环境光遮蔽贴图

	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy; // 应用AO贴图UV变换

#endif // 结束USE_AOMAP
#ifdef USE_BUMPMAP // 凹凸贴图（高度图）

	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy; // 应用凹凸贴图UV变换

#endif // 结束USE_BUMPMAP
#ifdef USE_NORMALMAP // 法线贴图

	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy; // 应用法线贴图UV变换

#endif // 结束USE_NORMALMAP
#ifdef USE_DISPLACEMENTMAP // 置换贴图

	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy; // 应用置换贴图UV变换

#endif // 结束USE_DISPLACEMENTMAP
#ifdef USE_EMISSIVEMAP // 自发光贴图

	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy; // 应用自发光贴图UV变换

#endif // 结束USE_EMISSIVEMAP
#ifdef USE_METALNESSMAP // 金属度贴图

	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy; // 应用金属度贴图UV变换

#endif // 结束USE_METALNESSMAP
#ifdef USE_ROUGHNESSMAP // 粗糙度贴图

	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy; // 应用粗糙度贴图UV变换

#endif // 结束USE_ROUGHNESSMAP
#ifdef USE_ANISOTROPYMAP // 各向异性贴图

	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy; // 应用各向异性贴图UV变换

#endif // 结束USE_ANISOTROPYMAP
#ifdef USE_CLEARCOATMAP // 清漆强度贴图

	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy; // 应用清漆强度贴图UV变换

#endif // 结束USE_CLEARCOATMAP
#ifdef USE_CLEARCOAT_NORMALMAP // 清漆法线贴图

	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy; // 应用清漆法线贴图UV变换

#endif // 结束USE_CLEARCOAT_NORMALMAP
#ifdef USE_CLEARCOAT_ROUGHNESSMAP // 清漆粗糙度贴图

	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy; // 应用清漆粗糙度贴图UV变换

#endif // 结束USE_CLEARCOAT_ROUGHNESSMAP
#ifdef USE_IRIDESCENCEMAP // 虹彩强度贴图

	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy; // 应用虹彩强度贴图UV变换

#endif // 结束USE_IRIDESCENCEMAP
#ifdef USE_IRIDESCENCE_THICKNESSMAP // 虹彩膜厚贴图

	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy; // 应用虹彩膜厚贴图UV变换

#endif // 结束USE_IRIDESCENCE_THICKNESSMAP
#ifdef USE_SHEEN_COLORMAP // 光泽颜色贴图

	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy; // 应用光泽颜色贴图UV变换

#endif // 结束USE_SHEEN_COLORMAP
#ifdef USE_SHEEN_ROUGHNESSMAP // 光泽粗糙度贴图

	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy; // 应用光泽粗糙度贴图UV变换

#endif // 结束USE_SHEEN_ROUGHNESSMAP
#ifdef USE_SPECULARMAP // 传统镜面贴图

	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy; // 应用镜面贴图UV变换

#endif // 结束USE_SPECULARMAP
#ifdef USE_SPECULAR_COLORMAP // Specular Color贴图

	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy; // 应用Specular Color贴图UV变换

#endif // 结束USE_SPECULAR_COLORMAP
#ifdef USE_SPECULAR_INTENSITYMAP // Specular Intensity贴图

	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy; // 应用Specular Intensity贴图UV变换

#endif // 结束USE_SPECULAR_INTENSITYMAP
#ifdef USE_TRANSMISSIONMAP // 透射强度贴图

	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy; // 应用透射贴图UV变换

#endif // 结束USE_TRANSMISSIONMAP
#ifdef USE_THICKNESSMAP // 厚度贴图

	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy; // 应用厚度贴图UV变换

#endif // 结束USE_THICKNESSMAP
`; // 导出GLSL片段结束
