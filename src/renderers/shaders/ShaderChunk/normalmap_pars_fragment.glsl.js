export default /* glsl */` // 导出GLSL片段开始
#ifdef USE_NORMALMAP // 若启用法线贴图

	uniform sampler2D normalMap; // 法线贴图采样器
	uniform vec2 normalScale; // 法线强度缩放（XY分量）

#endif // 结束USE_NORMALMAP

#ifdef USE_NORMALMAP_OBJECTSPACE // 若使用对象空间法线贴图

	uniform mat3 normalMatrix; // 对象空间到视图空间的法线变换矩阵

#endif // 结束USE_NORMALMAP_OBJECTSPACE

#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) ) // 无预计算切线时的切线框架构建

	// Normal Mapping Without Precomputed Tangents // 无需预计算切线的法线贴图
	// http://www.thetenthplanet.de/archives/1180 // 参考链接

	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) { // 基于微分构建TBN矩阵

		vec3 q0 = dFdx( eye_pos.xyz ); // 视空间位置x方向偏导
		vec3 q1 = dFdy( eye_pos.xyz ); // 视空间位置y方向偏导
		vec2 st0 = dFdx( uv.st ); // UV的x方向偏导
		vec2 st1 = dFdy( uv.st ); // UV的y方向偏导

		vec3 N = surf_norm; // 法线（应已归一化）

		vec3 q1perp = cross( q1, N ); // 与法线垂直的方向1
		vec3 q0perp = cross( N, q0 ); // 与法线垂直的方向2

		vec3 T = q1perp * st0.x + q0perp * st1.x; // 切线T
		vec3 B = q1perp * st0.y + q0perp * st1.y; // 副切线B

		float det = max( dot( T, T ), dot( B, B ) ); // 归一化因子（防止零向量）
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det ); // 安全归一化比例

		return mat3( T * scale, B * scale, N ); // 返回TBN矩阵（列向量：T,B,N）

	} // getTangentFrame结束

#endif // 条件编译结束
`; // 导出GLSL片段结束
