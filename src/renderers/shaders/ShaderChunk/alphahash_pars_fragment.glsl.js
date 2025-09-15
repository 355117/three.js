// Copyright (c) 2025 Aoki. All rights reserved.
// Alpha哈希参数着色器 - 实现基于哈希的透明度效果的函数定义
export default /* glsl */`
#ifdef USE_ALPHAHASH
	// 如果使用Alpha哈希算法
	/**
	 * 基于哈希的透明度算法实现
	 * 参考文献: https://casual-effects.com/research/Wyman2017Hashed/index.html
	 * 这种技术可以创建噪声透明效果，避免传统alpha测试的排序问题
	 */

	// 定义Alpha哈希缩放因子常量，通过实验获得，可以调整
	const float ALPHA_HASH_SCALE = 0.05; 

	// 2D哈希函数 - 将二维坐标转换为伪随机数
	float hash2D( vec2 value ) {
		// 使用正弦函数和数学运算创建伪随机数，取小数部分保证结果在[0,1]区间
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}

	// 3D哈希函数 - 将三维坐标转换为伪随机数
	float hash3D( vec3 value ) {
		// 递归调用2D哈希函数，先处理XY，再与Z组合
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}

	// 获取Alpha哈希阈值 - 基于3D位置计算自适应的alpha阈值
	float getAlphaHashThreshold( vec3 position ) {

		// 找到坐标的离散化导数，用于计算像素尺度
		// 计算X和Y方向的最大偏导数，用于确定像素大小
		float maxDeriv = max(
			length( dFdx( position.xyz ) ), // X方向的偏导数长度
			length( dFdy( position.xyz ) )  // Y方向的偏导数长度
		);
		// 计算像素缩放因子，用于自适应噪声尺度
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );

		// 找到两个最近的对数离散化噪声尺度
		// 使用对数空间中的上下边界来提供两个不同的噪声尺度
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ), // 下边界（较小的尺度）
			exp2( ceil( log2( pixScale ) ) )   // 上边界（较大的尺度）
		);

		// 在两个噪声尺度下计算alpha阈值
		// 使用哈希函数在不同尺度下生成噪声值
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ), // 小尺度噪声
			hash3D( floor( pixScales.y * position.xyz ) )  // 大尺度噪声
		);

		// 计算用于线性插值的因子
		// 取对数尺度的小数部分，用于在两个噪声尺度间插值
		float lerpFactor = fract( log2( pixScale ) );

		// 在两个噪声尺度的alpha阈值之间进行线性插值
		// 得到的x值作为累积分布函数（CDF）的输入
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;

		// 通过累积分布函数计算均匀分布的阈值
		// 计算用于CDF的参数a，用于确保最终结果的均匀性
		float a = min( lerpFactor, 1.0 - lerpFactor );
		// 定义三种情况下的CDF计算，用于将噪声值转换为均匀分布
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),                                    // 情况A: x < a
			( x - 0.5 * a ) / ( 1.0 - a ),                                        // 情况B: a <= x < 1-a
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )      // 情况C: x >= 1-a
		);

		// 找到最终的、均匀分布的alpha阈值（ατ）
		// 根据x的值选择相应的CDF计算情况
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )  // x在前两个区间
			: cases.z;                           // x在最后一个区间

		// 避免ατ == 0的情况，保证阈值在有效范围内
		// 将阈值限制在1.0e-6到1.0之间，防止数值问题
		return clamp( threshold , 1.0e-6, 1.0 );
	}
	// 结束getAlphaHashThreshold函数

#endif
// 结束Alpha哈希参数定义
`;
// Copyright (c) 2025 Aoki. All rights reserved.
