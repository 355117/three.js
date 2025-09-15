// Copyright (c) 2025 Aoki. All rights reserved.
// 法线初始化顶点着色器 - 初始化法线和切线向量
export default /* glsl */`
// 初始化物体空间的法线向量，从原始法线属性开始
vec3 objectNormal = vec3( normal );

#ifdef USE_TANGENT
	// 如果使用切线空间（法线贴图、凹凸贴图等）
	// 初始化物体空间的切线向量，只取XYZ分量（忽略W分量的手性）
	vec3 objectTangent = vec3( tangent.xyz );
	// 切线向量用于构建TBN（切线-双法线-法线）矩阵，用于法线贴图计算
#endif
// 结束切线相关处理
`;
// Copyright (c) 2025 Aoki. All rights reserved.
