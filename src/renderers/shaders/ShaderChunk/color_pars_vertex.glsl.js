export default /* glsl */`
#if defined( USE_COLOR_ALPHA ) // 若顶点阶段输出 RGBA 颜色

	varying vec4 vColor; // 向片元阶段传递 RGBA 颜色

#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR ) // 若输出 RGB 或实例/批处理颜色

	varying vec3 vColor; // 向片元阶段传递 RGB 颜色

#endif // 结束：颜色 varying 声明
`;
