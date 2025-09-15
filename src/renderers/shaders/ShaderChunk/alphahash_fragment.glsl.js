// Copyright (c) 2025 Aoki. All rights reserved.
// Alpha哈希片段着色器 - 用于实现透明度哈希算法的着色器代码
export default /* glsl */`
#ifdef USE_ALPHAHASH
	// 如果使用Alpha哈希算法
	// 如果漫反射颜色的alpha值小于基于位置计算的alpha哈希阈值，则丢弃此片段
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
	// 这样可以创建一种噪声透明效果，避免传统alpha测试的排序问题
#endif
// 结束Alpha哈希着色器代码块
`;
// Copyright (c) 2025 Aoki. All rights reserved.
