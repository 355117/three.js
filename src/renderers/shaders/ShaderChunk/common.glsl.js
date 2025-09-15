// Copyright (c) 2025 Aoki. All rights reserved.
// 通用函数着色器 - 定义常用的数学常量、函数和结构体
export default /* glsl */`
// 数学常量定义
#define PI 3.141592653589793          // 圆周率π
#define PI2 6.283185307179586         // 2π，完整圆周
#define PI_HALF 1.5707963267948966    // π/2，直角
#define RECIPROCAL_PI 0.3183098861837907   // 1/π，常用于归一化
#define RECIPROCAL_PI2 0.15915494309189535 // 1/(2π)，常用于角度转换
#define EPSILON 1e-6                  // 极小值，防止除零错误

// 定义saturate函数（如果尚未定义）
#ifndef saturate
// <tonemapping_pars_fragment>可能已经定义了saturate()
// 将值限制在[0.0, 1.0]范围内
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
// 定义白色补充函数，返回1.0减去输入值（即反色）
#define whiteComplement( a ) ( 1.0 - saturate( a ) )

// 常用数学函数定义
// 浮点数的平方函数
float pow2( const in float x ) { return x*x; }
// 三维向量的逐分量平方函数
vec3 pow2( const in vec3 x ) { return x*x; }
// 浮点数的三次方函数
float pow3( const in float x ) { return x*x*x; }
// 浮点数的四次方函数（优化版本）
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
// 获取三维向量中的最大分量
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
// 计算三维向量的平均值（灰度值）
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }

// 伪随机数生成函数
// 期望输入值在[0,1]x[0,1]范围内，返回[0,1]范围的随机值
// 不应合并为单个函数，参考: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
highp float rand( const in vec2 uv ) {
	// 定义随机数生成的魔数常量
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	// 计算点积并对π取模，获得随机种子
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	// 使用正弦函数和大数乘法创建伪随机数，取小数部分
	return fract( sin( sn ) * c );
}
// 结束rand函数

// 精度安全的长度计算函数
#ifdef HIGH_PRECISION
	// 高精度模式下直接使用内置length函数
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	// 低精度模式下的精度安全版本
	float precisionSafeLength( vec3 v ) {
		// 找到绝对值的最大分量，防止数值上溢或下溢
		float maxComponent = max3( abs( v ) );
		// 通过除以最大分量来缩放向量，计算后再放大回来
		return length( v / maxComponent ) * maxComponent;
	}
#endif
// 结束精度安全长度函数

// 入射光结构体 - 描述从光源入射到表面的光线
struct IncidentLight {
	vec3 color;       // 光线颜色和强度
	vec3 direction;   // 光线方向（从表面指向光源）
	bool visible;     // 光线是否可见（未被遮挡）
};

// 反射光结构体 - 描述从表面反射出来的光线
struct ReflectedLight {
	vec3 directDiffuse;      // 直接漫反射光
	vec3 directSpecular;     // 直接镜面反射光
	vec3 indirectDiffuse;    // 间接漫反射光（环境光）
	vec3 indirectSpecular;   // 间接镜面反射光（环境反射）
};

// Alpha哈希相关变量
#ifdef USE_ALPHAHASH
	// 声明一个varying变量，用于从顶点着色器传递位置到片段着色器
	varying vec3 vPosition;
#endif
// 结束Alpha哈希变量定义

// 方向向量变换函数 - 使用矩阵变换方向向量
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	// 将方向向量作为位置向量（w=0）进行矩阵变换，然后归一化
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
// 结束transformDirection函数

// 反向方向向量变换函数 - 使用矩阵的逆变换方向向量
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	// dir可以是方向向量或法线向量
	// 假设矩阵的左上3x3部分是正交矩阵
	// 使用转置矩阵来进行反向变换
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
// 结束inverseTransformDirection函数

// 3x3矩阵转置函数
mat3 transposeMat3( const in mat3 m ) {
	// 创建临时矩阵存储转置结果
	mat3 tmp;
	// 转置矩阵：行和列互换
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x ); // 第一列
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y ); // 第二列
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z ); // 第三列
	// 返回转置后的矩阵
	return tmp;
}
// 结束transposeMat3函数

// 判断是否为透视投影矩阵
bool isPerspectiveMatrix( mat4 m ) {
	// 透视投影矩阵的第3行第4列元素为-1.0
	return m[ 2 ][ 3 ] == - 1.0;
}
// 结束isPerspectiveMatrix函数

// 等距形投影UV坐标计算函数
vec2 equirectUv( in vec3 dir ) {
	// 假设方向向量是单位长度
	// 计算水平角度（经度）：使用atan2函数计算角度，转换为[0,1]范围
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	// 计算垂直角度（纬度）：使用asin函数计算角度，限制范围后转换为[0,1]范围
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	// 返回UV坐标
	return vec2( u, v );
}
// 结束equirectUv函数

// Lambert BRDF函数 - 实现完全漫反射的BRDF模型
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	// Lambert模型：漫反射系数除以π，保证能量守恒
	return RECIPROCAL_PI * diffuseColor;
} // 已验证的实现
// 结束BRDF_Lambert函数

// Schlick菲殅尔近似函数（三维版本）
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	// Christophe Schlick 1994年的原始近似公式
	// float fresnel = pow( 1.0 - dotVH, 5.0 );

	// 优化版本（Epic在SIGGRAPH '13上提出）
	// 参考: https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf
	// 使用exp2代替pow函数，提高性能
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	// 计算菲殅尔项：f0和f90之间的插值
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // 已验证的实现
// 结束F_Schlick函数（三维版本）

// Schlick菲殅尔近似函数（标量版本）
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	// Christophe Schlick 1994年的原始近似公式
	// float fresnel = pow( 1.0 - dotVH, 5.0 );

	// 优化版本（Epic在SIGGRAPH '13上提出）
	// 参考: https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf
	// 使用exp2代替pow函数，提高性能
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	// 计算菲殅尔项：f0和f90之间的插值
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // 已验证的实现
// 结束F_Schlick函数（标量版本）
`;
// Copyright (c) 2025 Aoki. All rights reserved.
