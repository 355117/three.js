export default /* glsl */`
#ifdef DITHERING // 若启用抖动

	// based on https://www.shadertoy.com/view/MslGR8 // 算法参考 Shadertoy 示例
	vec3 dithering( vec3 color ) { // 对输入颜色进行抖动偏移
		//Calculate grid position // 计算网格位置随机数
		float grid_position = rand( gl_FragCoord.xy ); // 基于片元坐标的随机值

		//Shift the individual colors differently, thus making it even harder to see the dithering pattern // 不同通道不同偏移，降低可见性
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 ); // 每通道微小偏移

		//modify shift according to grid position. // 根据随机值翻转偏移方向与幅度
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position ); // 插值正负两倍偏移

		//shift the color by dither_shift // 将偏移加到颜色
		return color + dither_shift_RGB; // 返回抖动后颜色
	} // dithering 结束

#endif // 结束：DITHERING
`;
