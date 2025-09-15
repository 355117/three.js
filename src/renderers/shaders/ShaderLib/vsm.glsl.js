export const vertex = /* glsl */ ` // 顶点着色器开始，使用模板字符串定义GLSL
void main() { // 主函数入口

	gl_Position = vec4( position, 1.0 ); // 将顶点位置扩展为裁剪空间坐标

} // 结束主函数
`; // 顶点着色器字符串结束

export const fragment = /* glsl */ ` // 片元着色器开始
uniform sampler2D shadow_pass; // 输入：上一通道的阴影贴图（VSM数据）
uniform vec2 resolution; // 输入：纹理分辨率，用于像素偏移归一化
uniform float radius; // 输入：模糊半径，控制采样偏移

#include <packing> // 引入打包/解包工具函数

void main() { // 主函数入口

	const float samples = float( VSM_SAMPLES ); // 采样数量（编译期常量转为浮点）

	float mean = 0.0; // 均值累加器
	float squared_mean = 0.0; // 平方均值累加器

	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 ); // UV步进（-1到1之间均匀分布）
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0; // 起始UV偏移
	for ( float i = 0.0; i < samples; i ++ ) { // 遍历样本索引

		float uvOffset = uvStart + i * uvStride; // 计算当前样本的相对偏移

		#ifdef HORIZONTAL_PASS // 水平方向的模糊通道

			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) ); // 采样并解包得到(均值, 标准差)或相关分布参数
			mean += distribution.x; // 累加均值分量
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x; // 累加平方和以便计算方差

		#else // 垂直方向的模糊或初始深度通道

			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) ); // 采样并解包深度
			mean += depth; // 累加深度均值
			squared_mean += depth * depth; // 累加深度平方

		#endif // 条件编译结束

	} // for循环结束

	mean = mean / samples; // 计算均值
	squared_mean = squared_mean / samples; // 计算平方均值

	float std_dev = sqrt( squared_mean - mean * mean ); // 标准差 = sqrt(E[x^2] - (E[x])^2)

	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) ); // 将(均值, 标准差)打包写出

} // 主函数结束
`; // 片元着色器字符串结束
