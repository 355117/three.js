export default /* glsl */`
#ifdef DITHERING // 若启用抖动

	gl_FragColor.rgb = dithering( gl_FragColor.rgb ); // 对 RGB 进行抖动处理，减轻色带

#endif // 结束：DITHERING
`;
