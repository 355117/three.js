export default /* glsl */`
#ifdef ENVMAP_TYPE_CUBE_UV // 若环境贴图类型为立方体 UV（PMREM 贴图集）

	#define cubeUV_minMipLevel 4.0 // 最小 mip 级别（与 PMREM 匹配）
	#define cubeUV_minTileSize 16.0 // 最小瓦片尺寸（像素）

	// These shader functions convert between the UV coordinates of a single face of // 下述函数用于在立方体单面 UV、面索引 0-5、以及方向向量之间转换
	// a cubemap, the 0-5 integer index of a cube face, and the direction vector for // 采样立方体纹理的方向向量（通常未单位化）
	// sampling a textureCube (not generally normalized ). // 说明：方向可能未归一化

	float getFace( vec3 direction ) { // 根据方向向量得到立方体面索引

		vec3 absDirection = abs( direction ); // 方向的绝对值分量

		float face = - 1.0; // 初始化为无效面

		if ( absDirection.x > absDirection.z ) { // X 分量主导

			if ( absDirection.x > absDirection.y ) // X 大于 Y

				face = direction.x > 0.0 ? 0.0 : 3.0; // 正 X 为面 0，负 X 为面 3

			else // 否则 Y 分量主导

				face = direction.y > 0.0 ? 1.0 : 4.0; // 正 Y 为面 1，负 Y 为面 4

		} else { // 否则 Z 分量 >= X 分量

			if ( absDirection.z > absDirection.y ) // Z 大于 Y

				face = direction.z > 0.0 ? 2.0 : 5.0; // 正 Z 为面 2，负 Z 为面 5

			else // 否则 Y 分量主导

				face = direction.y > 0.0 ? 1.0 : 4.0; // 正 Y 为面 1，负 Y 为面 4

		}

		return face; // 返回面索引

	} // getFace 结束

	// RH coordinate system; PMREM face-indexing convention // 右手坐标系；PMREM 面索引约定
	vec2 getUV( vec3 direction, float face ) { // 根据方向和面索引计算该面的 UV

		vec2 uv; // 局部 UV

		if ( face == 0.0 ) { // 面 0（+X）

			uv = vec2( direction.z, direction.y ) / abs( direction.x ); // pos x // 用 Z,Y 除以 |X|

		} else if ( face == 1.0 ) { // 面 1（+Y）

			uv = vec2( - direction.x, - direction.z ) / abs( direction.y ); // pos y // 用 -X,-Z 除以 |Y|

		} else if ( face == 2.0 ) { // 面 2（+Z）

			uv = vec2( - direction.x, direction.y ) / abs( direction.z ); // pos z // 用 -X,Y 除以 |Z|

		} else if ( face == 3.0 ) { // 面 3（-X）

			uv = vec2( - direction.z, direction.y ) / abs( direction.x ); // neg x // 用 -Z,Y 除以 |X|

		} else if ( face == 4.0 ) { // 面 4（-Y）

			uv = vec2( - direction.x, direction.z ) / abs( direction.y ); // neg y // 用 -X,Z 除以 |Y|

		} else { // 面 5（-Z）

			uv = vec2( direction.x, direction.y ) / abs( direction.z ); // neg z // 用 X,Y 除以 |Z|

		}

		return 0.5 * ( uv + 1.0 ); // 将 [-1,1] 映射到 [0,1]

	} // getUV 结束

	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) { // 在 PMREM 贴图集中做双线性采样

		float face = getFace( direction ); // 选择面

		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 ); // 过滤偏移（小于最小 mip 时）

		mipInt = max( mipInt, cubeUV_minMipLevel ); // 限制最小 mip 级别

		float faceSize = exp2( mipInt ); // 当前 mip 的面边长（像素）

		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0; // #25071 // 留出边界 1 像素

		if ( face > 2.0 ) { // 索引 3,4,5 在贴图集第二行

			uv.y += faceSize; // 向下偏移一行

			face -= 3.0; // 将面索引归一化到 0..2

		}

		uv.x += face * faceSize; // X 上按面索引偏移到对应列

		uv.x += filterInt * 3.0 * cubeUV_minTileSize; // 过滤偏移的列偏置（每级 3 块）

		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize ); // 按 mip 行起始位置上移

		uv.x *= CUBEUV_TEXEL_WIDTH; // 归一化到 [0,1] 纹理坐标（宽）
		uv.y *= CUBEUV_TEXEL_HEIGHT; // 归一化到 [0,1] 纹理坐标（高）

		#ifdef texture2DGradEXT // 若可用显式梯度采样扩展

			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb; // disable anisotropic filtering // 关闭各向异性（提供零梯度）

		#else // 否则标准 2D 采样

			return texture2D( envMap, uv ).rgb; // 返回 RGB 颜色

		#endif // 结束：texture2DGradEXT 分支

	} // bilinearCubeUV 结束

	// These defines must match with PMREMGenerator // 以下常量需与 PMREMGenerator 匹配

	#define cubeUV_r0 1.0 // 分段粗糙度阈值 r0
	#define cubeUV_m0 - 2.0 // 对应斜率/偏置 m0
	#define cubeUV_r1 0.8 // r1
	#define cubeUV_m1 - 1.0 // m1
	#define cubeUV_r4 0.4 // r4
	#define cubeUV_m4 2.0 // m4
	#define cubeUV_r5 0.305 // r5
	#define cubeUV_m5 3.0 // m5
	#define cubeUV_r6 0.21 // r6
	#define cubeUV_m6 4.0 // m6

	float roughnessToMip( float roughness ) { // 将粗糙度映射为 PMREM mip 级别

		float mip = 0.0; // 输出 mip 级

		if ( roughness >= cubeUV_r1 ) { // 第一段

			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0; // 线性插值

		} else if ( roughness >= cubeUV_r4 ) { // 第二段

			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1; // 线性插值

		} else if ( roughness >= cubeUV_r5 ) { // 第三段

			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4; // 线性插值

		} else if ( roughness >= cubeUV_r6 ) { // 第四段

			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5; // 线性插值

		} else { // 最低段，使用对数映射

			mip = - 2.0 * log2( 1.16 * roughness ); // 1.16 = 1.79^0.25 // 常数来自经验拟合
		}

		return mip; // 返回 mip 级别

	} // roughnessToMip 结束

	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) { // 依据粗糙度从 PMREM 贴图集中采样

		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP ); // 计算并裁剪 mip

		float mipF = fract( mip ); // 小数部分（用于线性混合）

		float mipInt = floor( mip ); // 整数 mip 级

		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt ); // 低 mip 颜色

		if ( mipF == 0.0 ) { // 若正好在整数级

			return vec4( color0, 1.0 ); // 直接返回颜色

		} else { // 否则在相邻两级之间插值

			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 ); // 高 mip 颜色

			return vec4( mix( color0, color1, mipF ), 1.0 ); // 按小数部分混合

		}

	} // textureCubeUV 结束

#endif // 结束：ENVMAP_TYPE_CUBE_UV 条件
`;
