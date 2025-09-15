export default /* glsl */`

#ifdef USE_IRIDESCENCE // 若启用虹彩薄膜效应

	// XYZ to linear-sRGB color space // CIE XYZ 转线性 sRGB 的矩阵
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434, // 第一行
		-1.5371385,  1.8760108, -0.2040259, // 第二行
		-0.4985314,  0.0415560,  1.0572252  // 第三行
	);

	// Assume air interface for top // 假设顶层为空气界面
	// Note: We don't handle the case fresnel0 == 1 // 注意：不处理 F0==1 的退化情况
	vec3 Fresnel0ToIor( vec3 fresnel0 ) { // 将 F0 转换为介质折射率

		vec3 sqrtF0 = sqrt( fresnel0 ); // 分通道开方
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 ); // 公式：ior = (1+sqrt(F0))/(1-sqrt(F0))

	} // 函数结束

	// Conversion FO/IOR // F0 与 IOR 互转
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) { // 由折射率求 F0（RGB）

		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) ); // F0 = ((n2-n1)/(n2+n1))^2

	} // 函数结束

	// ior is a value between 1.0 and 3.0. 1.0 is air interface // 折射率约在 1~3，1 为空气
	float IorToFresnel0( float transmittedIor, float incidentIor ) { // 标量版本

		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor )); // 标量 F0

	} // 函数结束

	// Fresnel equations for dielectric/dielectric interfaces. // 介电质/介电质界面的菲涅尔方程
	// Ref: https://belcour.github.io/blog/research/2017/05/01/brdf-thin-film.html // 参考文献
	// Evaluation XYZ sensitivity curves in Fourier space // 在傅里叶域评估 XYZ 灵敏度曲线
	vec3 evalSensitivity( float OPD, vec3 shift ) { // 评估人眼灵敏度对 OPD 的响应

		float phase = 2.0 * PI * OPD * 1.0e-9; // 相位：2π·OPD·1e-9（nm→m）
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 ); // 高斯幅值
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 ); // 中心位置
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 ); // 方差

		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var ); // 主项
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) ); // X 通道附加项
		xyz /= 1.0685e-7; // 归一化系数

		vec3 rgb = XYZ_TO_REC709 * xyz; // XYZ 转线性 sRGB
		return rgb; // 返回线性 sRGB 响应

	} // evalSensitivity 结束

	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) { // 计算虹彩薄膜的频谱干涉贡献

		vec3 I; // 最终强度

		// Force iridescenceIOR -> outsideIOR when thinFilmThickness -> 0.0 // 薄膜厚度趋近 0 时，薄膜 IOR 逼近外介质
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) ); // 平滑过渡薄膜 IOR
		// Evaluate the cosTheta on the base layer (Snell law) // 基层角度（斯涅尔定律）
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) ); // sin^2(theta2)

		// Handle TIR: // 全反射情况
		float cosTheta2Sq = 1.0 - sinTheta2Sq; // cos^2(theta2)
		if ( cosTheta2Sq < 0.0 ) { // 若为负则发生全反射

			return vec3( 1.0 ); // 反射率为 1

		}

		float cosTheta2 = sqrt( cosTheta2Sq ); // cos(theta2)

		// First interface // 第一界面（空气-薄膜）
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR ); // F0
		float R12 = F_Schlick( R0, 1.0, cosTheta1 ); // 反射率 R12（用 Schlick 近似）
		float T121 = 1.0 - R12; // 透射率
		float phi12 = 0.0; // 相位偏移
		if ( iridescenceIOR < outsideIOR ) phi12 = PI; // 由介质关系决定相位
		float phi21 = PI - phi12; // 反向相位

		// Second interface // 第二界面（薄膜-基层）
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) ); // guard against 1.0 // 防止 F0=1 导致奇异
		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR ); // 基层 F0
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 ); // 反射率 R23
		vec3 phi23 = vec3( 0.0 ); // 相位偏移向量
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI; // R 通道相位
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI; // G 通道相位
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI; // B 通道相位

		// Phase shift // 总的相位差
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2; // 光程差（nm）
		vec3 phi = vec3( phi21 ) + phi23; // 总相位偏移

		// Compound terms // 复合项
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 ); // 限幅避免数值问题
		vec3 r123 = sqrt( R123 ); // 振幅系数
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 ); // 多次反射的等比和

		// Reflectance term for m = 0 (DC term amplitude) // 直流项 m=0
		vec3 C0 = R12 + Rs; // 常量项
		I = C0; // 初始化强度

		// Reflectance term for m > 0 (pairs of diracs) // 谱线对 m>0
		vec3 Cm = Rs - T121; // 递推项初值
		for ( int m = 1; m <= 2; ++ m ) { // 累加前两阶

			Cm *= r123; // 乘以振幅系数
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi ); // 眼感度函数
			I += Cm * Sm; // 叠加到强度

		}

		// Since out of gamut colors might be produced, negative color values are clamped to 0. // 由于可能越界，负值需钳制
		return max( I, vec3( 0.0 ) ); // 返回非负的 RGB

	} // evalIridescence 结束

#endif // 结束：USE_IRIDESCENCE

`;
