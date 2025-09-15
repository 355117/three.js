// Copyright (c) 2025 Aoki. All rights reserved.
// Alpha贴图参数着色器 - 定义Alpha贴图的uniform参数
export default /* glsl */`
#ifdef USE_ALPHAMAP
	// 如果使用Alpha贴图功能
	// 声明一个2D采样器uniform参数，用于采样alpha贴图
	uniform sampler2D alphaMap;
	// alphaMap存储了材质的透明度信息，通常使用绿色通道
#endif
// 结束Alpha贴图参数定义
`;
// Copyright (c) 2025 Aoki. All rights reserved.
