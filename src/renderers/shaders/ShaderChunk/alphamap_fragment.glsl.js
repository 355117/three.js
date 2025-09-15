// Copyright (c) 2025 Aoki. All rights reserved.
// Alpha贴图片段着色器 - 用于应用alpha贴图来控制透明度
export default /* glsl */`
#ifdef USE_ALPHAMAP
	// 如果使用Alpha贴图
	// 将漫反射颜色的alpha值与Alpha贴图的绿色通道值相乘（绿色通道存储alpha信息）
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
	// 这样可以通过贴图的灰度值来精细控制材质的透明度
#endif
// 结束Alpha贴图着色器代码块
`;
// Copyright (c) 2025 Aoki. All rights reserved.
