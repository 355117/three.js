// Copyright (c) 2025 Aoki. All rights reserved.
// Alpha测试参数着色器 - 定义Alpha测试的uniform参数
export default /* glsl */`
#ifdef USE_ALPHATEST
	// 如果使用Alpha测试功能
	// 声明一个float类型uniform参数，设定Alpha测试的阈值
	uniform float alphaTest;
	// 当片段的alpha值小于此阈值时，片段将被丢弃，范围通常为[0.0, 1.0]
#endif
// 结束Alpha测试参数定义
`;
// Copyright (c) 2025 Aoki. All rights reserved.
