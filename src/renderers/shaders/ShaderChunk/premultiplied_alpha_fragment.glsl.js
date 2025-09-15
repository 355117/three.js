export default /* glsl */` // 导出GLSL片段开始
#ifdef PREMULTIPLIED_ALPHA // 预乘Alpha

	// Get normal blending with premultipled, use with CustomBlending, OneFactor, OneMinusSrcAlphaFactor, AddEquation. // 预乘下的常规混合设置
	gl_FragColor.rgb *= gl_FragColor.a; // 预乘处理

#endif // 结束PREMULTIPLIED_ALPHA
`; // 导出GLSL片段结束
