export default /* glsl */`

vec4 LinearTransferOETF( in vec4 value ) { // 线性到输出传递函数（线性空间保持不变）
	return value; // 直接返回输入值（无变换）
}

vec4 sRGBTransferEOTF( in vec4 value ) { // sRGB 的 EOTF（显示端：非线性到线性）
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a ); // 分段函数：低亮线段，高亮幂次
}

vec4 sRGBTransferOETF( in vec4 value ) { // sRGB 的 OETF（编码端：线性到非线性）
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a ); // 分段函数：低亮线性缩放，高亮 1/2.4 幂
}

`;
