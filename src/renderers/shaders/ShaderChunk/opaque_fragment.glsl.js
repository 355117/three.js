export default /* glsl */` // 导出GLSL片段开始
#ifdef OPAQUE // 不透明模式
diffuseColor.a = 1.0; // 强制Alpha为1
#endif // 结束OPAQUE

#ifdef USE_TRANSMISSION // 若启用透射
diffuseColor.a *= material.transmissionAlpha; // 乘以透射Alpha校正
#endif // 结束USE_TRANSMISSION

gl_FragColor = vec4( outgoingLight, diffuseColor.a ); // 写出最终片元颜色
`; // 导出GLSL片段结束
