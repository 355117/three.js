// Copyright (c) 2025 Aoki. All rights reserved.
// 批处理顶点着色器 - 获取当前实例的批处理变换矩阵
export default /* glsl */`
#ifdef USE_BATCHING
	// 如果使用批处理功能（实例化渲染）
	// 获取当前绘制调用的批处理变换矩阵
	// gl_DrawID → getIndirectIndex() → getBatchingMatrix() 的调用链
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
	// batchingMatrix将用于变换当前实例的顶点位置和法线
#endif
// 结束批处理顶点变换
`;
// Copyright (c) 2025 Aoki. All rights reserved.
