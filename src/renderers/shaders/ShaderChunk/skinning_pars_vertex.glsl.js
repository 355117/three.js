export default /* glsl */` // 导出GLSL片段开始
#ifdef USE_SKINNING // 若启用蒙皮

	uniform mat4 bindMatrix; // 绑定矩阵
	uniform mat4 bindMatrixInverse; // 绑定矩阵的逆

	uniform highp sampler2D boneTexture; // 骨骼纹理（矩阵存储）

	mat4 getBoneMatrix( const in float i ) { // 从纹理读取骨骼矩阵

		int size = textureSize( boneTexture, 0 ).x; // 纹理宽度
		int j = int( i ) * 4; // 起始行索引
		int x = j % size; // 列
		int y = j / size; // 行
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 ); // 第一行
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 ); // 第二行
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 ); // 第三行
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 ); // 第四行

		return mat4( v1, v2, v3, v4 ); // 组装矩阵

	} // 结束getBoneMatrix

#endif // 结束USE_SKINNING
`; // 导出GLSL片段结束
