// Copyright (c) 2025 Aoki. All rights reserved.
// 环境光遮蔽贴图片段着色器 - 应用环境光遮蔽贴图来增强阴影和细节
export default /* glsl */`
#ifdef USE_AOMAP
	// 如果使用环境光遮蔽贴图（Ambient Occlusion Map）

	// 读取红色通道，兼容组合的ORM（遮蔽+粗糙度+金属度）RGB贴图
	// 从贴图的R通道采样遮蔽值，然后用强度参数调节并重新映射到[0,1]范围
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;

	// 将环境光遮蔽应用到间接漫反射光照，模拟阴影和细节
	reflectedLight.indirectDiffuse *= ambientOcclusion;

	// 如果使用清漆材质效果
	#if defined( USE_CLEARCOAT ) 
		// 将环境光遮蔽应用到清漆层的间接镜面反射
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif

	// 如果使用绒光材质效果
	#if defined( USE_SHEEN ) 
		// 将环境光遮蔽应用到绒光层的间接镜面反射
		sheenSpecularIndirect *= ambientOcclusion;
	#endif

	// 如果同时使用环境贴图和标准材质
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		// 计算法线和视线的点积，用于镜面反射遮蔽计算
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );

		// 使用专门的函数计算镜面反射遮蔽，考虑视角和粗糙度的影响
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
	// 结束环境贴图和标准材质处理

#endif
// 结束环境光遮蔽贴图处理
`;
// Copyright (c) 2025 Aoki. All rights reserved.
