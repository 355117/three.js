export default /* glsl */`
#if defined( USE_COLOR_ALPHA ) // 若片元阶段需要 RGBA 顶点颜色

	varying vec4 vColor; // 接收插值后的 RGBA 颜色

#elif defined( USE_COLOR ) // 若片元阶段只需 RGB 顶点颜色

	varying vec3 vColor; // 接收插值后的 RGB 颜色

#endif // 结束：颜色 varying 声明
`;
