export default /* glsl */`
#if defined( USE_COLOR_ALPHA ) // 若使用 RGBA 顶点颜色

	vColor = vec4( 1.0 ); // 先初始化为全 1（白色 + 不透明）

#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR ) // 若使用 RGB 或实例/批处理颜色

	vColor = vec3( 1.0 ); // 先初始化为白色（RGB 全 1）

#endif // 结束：初始化 vColor

#ifdef USE_COLOR // 静态顶点颜色属性

	vColor *= color; // 乘以顶点提供的颜色属性

#endif // 结束：USE_COLOR

#ifdef USE_INSTANCING_COLOR // 实例化颜色（每实例不同）

	vColor.xyz *= instanceColor.xyz; // 与实例颜色相乘

#endif // 结束：USE_INSTANCING_COLOR

#ifdef USE_BATCHING_COLOR // 批处理颜色（由间接索引获取）

	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) ); // 通过绘制 ID 获取批处理颜色

	vColor.xyz *= batchingColor.xyz; // 与批处理颜色相乘

#endif // 结束：USE_BATCHING_COLOR
`;
