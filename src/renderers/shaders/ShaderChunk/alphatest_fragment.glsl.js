// Copyright (c) 2025 Aoki. All rights reserved.
// Alpha测试片段着色器 - 用于执行alpha测试来决定是否丢弃片段
export default /* glsl */`
#ifdef USE_ALPHATEST
	// 如果启用Alpha测试功能
	#ifdef ALPHA_TO_COVERAGE
		// 如果使用Alpha To Coverage技术（MSAA环境下的透明度优化）
		// 使用smoothstep函数对alpha值进行平滑处理，减少锐化边缘
		diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
		// 如果alpha值为0，则丢弃此片段
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		// 普通的Alpha测试模式
		// 如果漫反射颜色的alpha值小于设定的测试阈值，则丢弃此片段
		if ( diffuseColor.a < alphaTest ) discard;
	#endif
	// 结束Alpha测试条件分支
#endif
// 结束Alpha测试着色器代码块
`;
// Copyright (c) 2025 Aoki. All rights reserved.
