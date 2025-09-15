// Copyright (c) 2025 Aoki. All rights reserved.
// 顶点处理开始着色器 - 初始化顶点变换和相关变量
export default /* glsl */`
// 初始化变换后的顶点位置，从原始顶点位置开始
vec3 transformed = vec3( position );

#ifdef USE_ALPHAHASH
	// 如果使用Alpha哈希算法
	// 保存顶点位置信息到varying变量，用于片段着色器中的哈希计算
	vPosition = vec3( position );
	// 这个位置信息将用于基于位置的alpha阈值计算
#endif
// 结束Alpha哈希相关处理
`;
// Copyright (c) 2025 Aoki. All rights reserved.
