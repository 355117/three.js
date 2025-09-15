export default /* glsl */` // 导出GLSL片段开始
#if defined( TONE_MAPPING ) // 若启用色调映射

	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb ); // 对最终颜色执行色调映射

#endif // 结束TONE_MAPPING
`; // 导出GLSL片段结束
