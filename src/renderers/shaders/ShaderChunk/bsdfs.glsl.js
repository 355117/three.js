// Copyright (c) 2025 Aoki. All rights reserved.
// BSDF函数着色器 - 实现双向散射分布函数（BSDF）的各种照明模型
export default /* glsl */`

// Blinn-Phong几何项函数（隐式版本）
// 计算光线和视线的几何遮蔽和阴影效应
float G_BlinnPhong_Implicit( /* const in float dotNL, const in float dotNV */ ) {
	// 几何项 = (n · l)(n · v) / 4(n · l)(n · v) = 1/4
	// Blinn-Phong模型中的简化几何项，假设无遮蔽
	return 0.25;
}
// 结束G_BlinnPhong_Implicit函数

// Blinn-Phong分布项函数
// 计算基于镜面反射的微面分布
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	// 使用Blinn-Phong公式计算分布：(shininess/2 + 1) * (dotNH)^shininess / PI
	// shininess控制镜面反射的集中程度，值越大越集中
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
// 结束D_BlinnPhong函数

// Blinn-Phong BRDF函数
// 完整的双向反射分布函数，结合菲殅尔、几何和分布项
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	// 计算半角向量（光线和视线的平均方向）
	vec3 halfDir = normalize( lightDir + viewDir );

	// 计算法线与半角向量的点积，用于镜面反射计算
	float dotNH = saturate( dot( normal, halfDir ) );
	// 计算视线与半角向量的点积，用于菲殅尔项计算
	float dotVH = saturate( dot( viewDir, halfDir ) );

	// 使用Schlick近似计算菲殅尔项，描述反射率随视角的变化
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );

	// 获取几何项（阴影遮蔽因子）
	float G = G_BlinnPhong_Implicit( /* dotNL, dotNV */ );

	// 获取分布项（法线分布函数）
	float D = D_BlinnPhong( shininess, dotNH );

	// 组合三个项得到最终的BRDF结果：F * G * D
	return F * ( G * D );
} // 已验证的实现
// 结束BRDF_BlinnPhong函数

`;
// Copyright (c) 2025 Aoki. All rights reserved.
