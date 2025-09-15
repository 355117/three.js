// Copyright (c) 2025 Aoki. All rights reserved.
// 批处理参数顶点着色器 - 实现GPU实例化批量渲染的参数和函数
export default /* glsl */`
#ifdef USE_BATCHING
	// 如果使用批处理功能（实例化渲染）

	// 检查是否支持ANGLE_multi_draw扩展
	#if ! defined( GL_ANGLE_multi_draw )
		// 如果不支持，则使用自定义的DrawID
		#define gl_DrawID _gl_DrawID
		// 声明自定义的DrawID uniform参数，用于标识当前绘制调用
		uniform int _gl_DrawID;
	#endif

	// 声明高精度的批处理矩阵贴图，存储每个实例的变换矩阵
	uniform highp sampler2D batchingTexture;
	// 声明批处理ID贴图，存储每个实例的标识符
	uniform highp usampler2D batchingIdTexture;

	// 获取批处理矩阵函数 - 根据实例索引返回相应的变换矩阵
	mat4 getBatchingMatrix( const in float i ) {
		// 获取贴图的宽度，用于计算索引
		int size = textureSize( batchingTexture, 0 ).x;
		// 每个矩阵需要4个像素存储（每行一个像素）
		int j = int( i ) * 4;
		// 计算在贴图中的x坐标（列索引）
		int x = j % size;
		// 计算在贴图中的y坐标（行索引）
		int y = j / size;
		// 获取矩阵的第一行（第1列）
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		// 获取矩阵的第二行（第2列）
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		// 获取矩阵的第三行（第3列）
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		// 获取矩阵的第四行（第4列）
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		// 组合成完整的4x4变换矩阵
		return mat4( v1, v2, v3, v4 );
	}
	// 结束getBatchingMatrix函数

	// 获取间接索引函数 - 用于获取实例的间接索引值
	float getIndirectIndex( const in int i ) {
		// 获取ID贴图的宽度
		int size = textureSize( batchingIdTexture, 0 ).x;
		// 计算在贴图中的x坐标
		int x = i % size;
		// 计算在贴图中的y坐标
		int y = i / size;
		// 从贴图的红色通道获取间接索引值并转换为float
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
	// 结束getIndirectIndex函数

#endif
// 结束批处理功能定义

#ifdef USE_BATCHING_COLOR
	// 如果使用批处理颜色功能

	// 声明批处理颜色贴图，存储每个实例的颜色信息
	uniform sampler2D batchingColorTexture;

	// 获取批处理颜色函数 - 根据实例索引返回相应的颜色
	vec3 getBatchingColor( const in float i ) {
		// 获取颜色贴图的宽度
		int size = textureSize( batchingColorTexture, 0 ).x;
		// 将浮点索引转换为整数
		int j = int( i );
		// 计算在贴图中的x坐标
		int x = j % size;
		// 计算在贴图中的y坐标
		int y = j / size;
		// 从贴图获取RGB颜色值
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
	// 结束getBatchingColor函数

#endif
// 结束批处理颜色功能定义
`;
// Copyright (c) 2025 Aoki. All rights reserved.
