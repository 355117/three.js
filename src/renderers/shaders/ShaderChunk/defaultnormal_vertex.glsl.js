export default /* glsl */`

vec3 transformedNormal = objectNormal; // 初始法线为对象空间法线
#ifdef USE_TANGENT // 若使用切线

	vec3 transformedTangent = objectTangent; // 初始切线为对象空间切线

#endif // 结束：USE_TANGENT

#ifdef USE_BATCHING // 若使用批处理矩阵（每批次变换）

	// this is in lieu of a per-instance normal-matrix // 用批处理矩阵近似法线矩阵
	// shear transforms in the instance matrix are not supported // 不支持剪切变换

	mat3 bm = mat3( batchingMatrix ); // 批处理 3x3 矩阵
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) ); // 归一化缩放影响
	transformedNormal = bm * transformedNormal; // 应用批处理变换

	#ifdef USE_TANGENT // 若有切线

		transformedTangent = bm * transformedTangent; // 对切线应用相同变换

	#endif // 结束：USE_TANGENT

#endif // 结束：USE_BATCHING

#ifdef USE_INSTANCING // 若使用实例化矩阵（每实例变换）

	// this is in lieu of a per-instance normal-matrix // 用实例矩阵近似法线矩阵
	// shear transforms in the instance matrix are not supported // 不支持剪切变换

	mat3 im = mat3( instanceMatrix ); // 实例 3x3 矩阵
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) ); // 归一化缩放影响
	transformedNormal = im * transformedNormal; // 应用实例变换

	#ifdef USE_TANGENT // 若有切线

		transformedTangent = im * transformedTangent; // 对切线应用相同变换

	#endif // 结束：USE_TANGENT

#endif // 结束：USE_INSTANCING

transformedNormal = normalMatrix * transformedNormal; // 转换到视图空间法线

#ifdef FLIP_SIDED // 若翻转面向

	transformedNormal = - transformedNormal; // 翻转法线方向

#endif // 结束：FLIP_SIDED

#ifdef USE_TANGENT // 若使用切线

	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz; // 切线转到视图空间

	#ifdef FLIP_SIDED // 若翻转

		transformedTangent = - transformedTangent; // 翻转切线

	#endif // 结束：FLIP_SIDED

#endif // 结束：USE_TANGENT
`;
