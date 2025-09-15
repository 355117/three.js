export default /* glsl */`

#ifdef USE_GRADIENTMAP // 若启用渐变贴图

	uniform sampler2D gradientMap; // 渐变贴图（1D 取样，使用 x 坐标）

#endif // 结束：USE_GRADIENTMAP

vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) { // 依据法线与光向计算渐变辐照度

	// dotNL will be from -1.0 to 1.0 // 点积范围 [-1,1]
	float dotNL = dot( normal, lightDirection ); // N·L
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 ); // 将 [-1,1] 映射到 [0,1]，y 为 0

	#ifdef USE_GRADIENTMAP // 使用贴图

		return vec3( texture2D( gradientMap, coord ).r ); // 从贴图采样 R 通道，复制到 RGB

	#else // 无贴图时使用近似插值

		vec2 fw = fwidth( coord ) * 0.5; // 计算屏幕空间导数用于抗锯齿
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) ); // 在 0.7 处平滑过渡

	#endif // 结束：USE_GRADIENTMAP

} // getGradientIrradiance 结束
`;
