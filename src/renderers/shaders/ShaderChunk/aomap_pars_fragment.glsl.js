// Copyright (c) 2025 Aoki. All rights reserved.
// 环境光遮蔽贴图参数着色器 - 定义AO贴图的uniform参数
export default /* glsl */`
#ifdef USE_AOMAP
	// 如果使用环境光遮蔽贴图

	// 声明2D采样器uniform参数，用于采样环境光遮蔽贴图
	uniform sampler2D aoMap;
	// 声明AO贴图强度参数，用于控制遮蔽效果的强度
	uniform float aoMapIntensity;
	// 强度值范围通常为[0.0, 1.0]，0.0表示无遮蔽效果，1.0表示满遮蔽效果

#endif
// 结束环境光遮蔽贴图参数定义
`;
// Copyright (c) 2025 Aoki. All rights reserved.
