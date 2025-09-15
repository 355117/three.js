export default /* glsl */`
#ifdef USE_MAP // 中文：如果启用基础颜色贴图

	vec4 sampledDiffuseColor = texture2D( map, vMapUv ); // 中文：使用 vMapUv 对 map 进行采样，得到采样的漫反射颜色

	#ifdef DECODE_VIDEO_TEXTURE // 中文：如果贴图来自视频，需要手动进行 sRGB 解码

		// use inline sRGB decode until browsers properly support SRGB8_ALPHA8 with video textures (#26516) // 中文：在浏览器正确支持视频纹理的 SRGB8_ALPHA8 之前，使用内联 sRGB 解码

		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor ); // 中文：对采样结果应用 sRGB EOTF 解码

	#endif // 中文：结束 DECODE_VIDEO_TEXTURE 条件编译

	diffuseColor *= sampledDiffuseColor; // 中文：将采样颜色乘到当前片元的漫反射颜色上

#endif // 中文：结束 USE_MAP 条件编译
`;
