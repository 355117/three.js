export default /* glsl */`
#ifdef USE_MORPHTARGETS // 中文：启用形变目标（Morph Targets）

	#ifndef USE_INSTANCING_MORPH // 中文：非实例化路径下，权重来自 uniform

		uniform float morphTargetBaseInfluence; // 中文：基准影响（与 relative 模式相关）
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ]; // 中文：各形变目标的权重数组

	#endif // 中文：结束非实例化条件

	uniform sampler2DArray morphTargetsTexture; // 中文：存储形变数据的纹理数组
	uniform ivec2 morphTargetsTextureSize; // 中文：形变纹理的二维尺寸（宽，高）

	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) { // 中文：读取给定顶点与形变目标的数据

		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset; // 中文：计算该顶点对应的纹素索引（带偏移）
		int y = texelIndex / morphTargetsTextureSize.x; // 中文：行坐标
		int x = texelIndex - y * morphTargetsTextureSize.x; // 中文：列坐标

		ivec3 morphUV = ivec3( x, y, morphTargetIndex ); // 中文：三维坐标（x,y,层索引）
		return texelFetch( morphTargetsTexture, morphUV, 0 ); // 中文：从纹理数组精确取样

	} // 中文：函数结束

#endif // 中文：结束 USE_MORPHTARGETS 条件
`;
