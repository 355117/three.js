export default /* glsl */`
#ifdef USE_EMISSIVEMAP // 若启用自发光贴图

	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv ); // 采样自发光颜色

	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE // 若需要对视频纹理做 sRGB 解码

		// use inline sRGB decode until browsers properly support SRGB8_ALPHA8 with video textures (#26516) // 浏览器未完善支持前使用内联 sRGB 解码

		emissiveColor = sRGBTransferEOTF( emissiveColor ); // 将 sRGB 转为线性

	#endif // 结束：DECODE_VIDEO_TEXTURE_EMISSIVE

	totalEmissiveRadiance *= emissiveColor.rgb; // 将自发光累乘到总辐照度

#endif // 结束：USE_EMISSIVEMAP
`;
