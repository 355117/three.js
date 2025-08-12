// MaterialX节点库
//
// MaterialX是一个开放标准，用于在不同的应用程序和渲染器之间传输丰富的材质和外观信息。
// 这个文件实现了Three.js中的MaterialX标准节点函数。
// MaterialX规范：https://materialx.org/

// 从噪声库导入各种噪声函数
import {
  mx_perlin_noise_float,
  mx_perlin_noise_vec3, // Perlin噪声函数
  mx_worley_noise_float as worley_noise_float,
  mx_worley_noise_vec2 as worley_noise_vec2,
  mx_worley_noise_vec3 as worley_noise_vec3, // Worley噪声函数
  mx_cell_noise_float as cell_noise_float, // Cell噪声函数
  mx_unifiednoise2d as unifiednoise2d,
  mx_unifiednoise3d as unifiednoise3d, // 统一噪声函数
  mx_fractal_noise_float as fractal_noise_float,
  mx_fractal_noise_vec2 as fractal_noise_vec2,
  mx_fractal_noise_vec3 as fractal_noise_vec3,
  mx_fractal_noise_vec4 as fractal_noise_vec4, // 分形噪声函数
} from "./lib/mx_noise.js";
// 从HSV库导入颜色空间转换函数
import { mx_hsvtorgb, mx_rgbtohsv } from "./lib/mx_hsv.js";
// 从颜色变换库导入sRGB转换函数
import { mx_srgb_texture_to_lin_rec709 } from "./lib/mx_transform_color.js";

// 导入TSL基础类型和数学运算符
import { float, vec2, vec3, vec4, int, add, sub, mul, div, mod, atan, mix, pow, smoothstep } from "../tsl/TSLBase.js";
// 导入UV坐标访问器
import { uv } from "../accessors/UV.js";
// 导入凹凸贴图节点
import { bumpMap } from "../display/BumpMapNode.js";
// 导入旋转工具节点
import { rotate } from "../utils/RotateNode.js";
// 导入时间相关工具
import { frameId, time } from "../utils/Timer.js";

/**
 * 抗锯齿阶跃函数。
 *
 * 实现MaterialX标准的抗锯齿阶跃函数，通过使用导数信息来平滑阶跃边缘，
 * 减少锯齿效应。这在程序化纹理和着色器中非常有用。
 *
 * @param {Node} threshold - 阈值，决定阶跃发生的位置
 * @param {Node} value - 输入值
 * @return {Node} 抗锯齿的阶跃结果
 */
export const mx_aastep = (threshold, value) => {
  // 将输入转换为浮点类型
  threshold = float(threshold);
  value = float(value);

  // 计算抗锯齿宽度：使用偏导数计算像素间的变化率
  // 0.70710678118654757 是 1/sqrt(2)，用于对角线方向的归一化
  const afwidth = vec2(value.dFdx(), value.dFdy()).length().mul(0.70710678118654757);

  // 使用smoothstep在阈值附近创建平滑过渡，而不是硬边缘
  return smoothstep(threshold.sub(afwidth), threshold.add(afwidth), value);
};

/**
 * 内部渐变函数。
 *
 * 在两个值之间基于UV坐标的指定分量进行线性插值。
 *
 * @param {Node} a - 起始值
 * @param {Node} b - 结束值
 * @param {Node} uv - UV坐标
 * @param {string} p - 使用的坐标分量（'x'或'y'）
 * @return {Node} 插值结果
 */
const _ramp = (a, b, uv, p) => mix(a, b, uv[p].clamp());

/**
 * 左右渐变函数。
 *
 * 基于UV坐标的X分量在两个值之间创建水平渐变。
 *
 * @param {Node} valuel - 左侧值（X=0处的值）
 * @param {Node} valuer - 右侧值（X=1处的值）
 * @param {Node} texcoord - 纹理坐标，默认使用当前UV
 * @return {Node} 水平渐变结果
 */
export const mx_ramplr = (valuel, valuer, texcoord = uv()) => _ramp(valuel, valuer, texcoord, "x");

/**
 * 上下渐变函数。
 *
 * 基于UV坐标的Y分量在两个值之间创建垂直渐变。
 *
 * @param {Node} valuet - 顶部值（Y=1处的值）
 * @param {Node} valueb - 底部值（Y=0处的值）
 * @param {Node} texcoord - 纹理坐标，默认使用当前UV
 * @return {Node} 垂直渐变结果
 */
export const mx_ramptb = (valuet, valueb, texcoord = uv()) => _ramp(valuet, valueb, texcoord, "y");

/**
 * 四角双线性渐变函数。
 *
 * 在四个角的值之间进行双线性插值：左上(tl)、右上(tr)、左下(bl)、右下(br)。
 * 使用纹理坐标的x和y分量进行插值。
 *
 * @param {Node} valuetl - 左上角值
 * @param {Node} valuetr - 右上角值
 * @param {Node} valuebl - 左下角值
 * @param {Node} valuebr - 右下角值
 * @param {Node} texcoord - 纹理坐标，默认使用当前UV
 * @return {Node} 双线性插值结果
 */
export const mx_ramp4 = (valuetl, valuetr, valuebl, valuebr, texcoord = uv()) => {
  // 限制UV坐标到[0,1]范围
  const u = texcoord.x.clamp();
  const v = texcoord.y.clamp();
  // 在顶部两个值之间水平插值
  const top = mix(valuetl, valuetr, u);
  // 在底部两个值之间水平插值
  const bottom = mix(valuebl, valuebr, u);
  // 在顶部和底部结果之间垂直插值
  return mix(top, bottom, v);
};

/**
 * 内部分割函数。
 *
 * 使用抗锯齿阶跃函数在指定中心点分割两个值。
 *
 * @param {Node} a - 第一个值
 * @param {Node} b - 第二个值
 * @param {Node} center - 分割中心点
 * @param {Node} uv - UV坐标
 * @param {string} p - 使用的坐标分量
 * @return {Node} 分割结果
 */
const _split = (a, b, center, uv, p) => mix(a, b, mx_aastep(center, uv[p]));

/**
 * 左右分割函数。
 *
 * 在指定的中心点水平分割两个值。
 *
 * @param {Node} valuel - 左侧值
 * @param {Node} valuer - 右侧值
 * @param {Node} center - 分割中心点（X坐标）
 * @param {Node} texcoord - 纹理坐标，默认使用当前UV
 * @return {Node} 水平分割结果
 */
export const mx_splitlr = (valuel, valuer, center, texcoord = uv()) => _split(valuel, valuer, center, texcoord, "x");

/**
 * 上下分割函数。
 *
 * 在指定的中心点垂直分割两个值。
 *
 * @param {Node} valuet - 顶部值
 * @param {Node} valueb - 底部值
 * @param {Node} center - 分割中心点（Y坐标）
 * @param {Node} texcoord - 纹理坐标，默认使用当前UV
 * @return {Node} 垂直分割结果
 */
export const mx_splittb = (valuet, valueb, center, texcoord = uv()) => _split(valuet, valueb, center, texcoord, "y");

/**
 * UV坐标变换函数。
 *
 * 对UV坐标进行缩放和偏移变换。这是纹理映射中的基础操作。
 *
 * @param {Node} uv_scale - UV缩放因子，默认为1
 * @param {Node} uv_offset - UV偏移量，默认为0
 * @param {Node} uv_geo - 输入的UV坐标，默认使用当前UV
 * @return {Node} 变换后的UV坐标
 */
export const mx_transform_uv = (uv_scale = 1, uv_offset = 0, uv_geo = uv()) => uv_geo.mul(uv_scale).add(uv_offset);

/**
 * 安全幂函数。
 *
 * 执行安全的幂运算，保持输入值的符号。对于负数，先取绝对值进行幂运算，
 * 然后恢复原来的符号。这避免了负数的非整数幂运算问题。
 *
 * @param {Node} in1 - 底数
 * @param {Node} in2 - 指数，默认为1
 * @return {Node} 安全幂运算结果
 */
export const mx_safepower = (in1, in2 = 1) => {
  // 将输入转换为浮点类型
  in1 = float(in1);

  // 计算：abs(in1)^in2 * sign(in1)
  return in1.abs().pow(in2).mul(in1.sign());
};

/**
 * 对比度调整函数。
 *
 * 围绕指定的枢轴点调整输入值的对比度。
 *
 * @param {Node} input - 输入值
 * @param {Node} amount - 对比度量，默认为1（无变化）
 * @param {Node} pivot - 枢轴点，默认为0.5
 * @return {Node} 对比度调整后的值
 */
export const mx_contrast = (input, amount = 1, pivot = 0.5) => float(input).sub(pivot).mul(amount).add(pivot);

/**
 * 浮点Perlin噪声函数。
 *
 * 生成单个浮点值的Perlin噪声，带有振幅和枢轴点控制。
 *
 * @param {Node} texcoord - 纹理坐标，默认使用当前UV
 * @param {Node} amplitude - 噪声振幅，默认为1
 * @param {Node} pivot - 枢轴点（偏移），默认为0
 * @return {Node} 浮点噪声值
 */
export const mx_noise_float = (texcoord = uv(), amplitude = 1, pivot = 0) => mx_perlin_noise_float(texcoord.convert("vec2|vec3")).mul(amplitude).add(pivot);

// 注释掉的二维向量噪声函数
//export const mx_noise_vec2 = ( texcoord = uv(), amplitude = 1, pivot = 0 ) => mx_perlin_noise_vec3( texcoord.convert( 'vec2|vec3' ) ).mul( amplitude ).add( pivot );

/**
 * 三维向量Perlin噪声函数。
 *
 * 生成三维向量的Perlin噪声，常用于法线贴图和位移效果。
 *
 * @param {Node} texcoord - 纹理坐标，默认使用当前UV
 * @param {Node} amplitude - 噪声振幅，默认为1
 * @param {Node} pivot - 枢轴点（偏移），默认为0
 * @return {Node} 三维向量噪声值
 */
export const mx_noise_vec3 = (texcoord = uv(), amplitude = 1, pivot = 0) => mx_perlin_noise_vec3(texcoord.convert("vec2|vec3")).mul(amplitude).add(pivot);

/**
 * 四维向量Perlin噪声函数。
 *
 * 生成四维向量的Perlin噪声，前三个分量使用标准噪声，
 * 第四个分量使用偏移的噪声以确保独立性。
 *
 * @param {Node} texcoord - 纹理坐标，默认使用当前UV
 * @param {Node} amplitude - 噪声振幅，默认为1
 * @param {Node} pivot - 枢轴点（偏移），默认为0
 * @return {Node} 四维向量噪声值
 */
export const mx_noise_vec4 = (texcoord = uv(), amplitude = 1, pivot = 0) => {
  // 重载类型：确保纹理坐标为vec2或vec3类型
  texcoord = texcoord.convert("vec2|vec3");

  // 构建四维噪声：前三个分量使用标准噪声，第四个分量使用偏移的噪声
  const noise_vec4 = vec4(mx_perlin_noise_vec3(texcoord), mx_perlin_noise_float(texcoord.add(vec2(19, 73))));

  // 应用振幅和枢轴点变换
  return noise_vec4.mul(amplitude).add(pivot);
};

/**
 * 二维统一噪声函数。
 *
 * 提供统一的接口来生成不同类型的二维噪声（Perlin、Cell、Worley等）。
 * 支持完整的参数控制，包括频率、偏移、抖动、输出范围等。
 *
 * @param {Node} noiseType - 噪声类型（0=Perlin, 1=Cell, 2=Worley）
 * @param {Node} texcoord - 纹理坐标，默认使用当前UV
 * @param {Node} freq - 频率向量，默认为(1,1)
 * @param {Node} offset - 偏移向量，默认为(0,0)
 * @param {Node} jitter - 抖动量，默认为1
 * @param {Node} outmin - 输出最小值，默认为0
 * @param {Node} outmax - 输出最大值，默认为1
 * @param {Node} clampoutput - 是否限制输出范围，默认为false
 * @param {Node} octaves - 八度数，默认为1
 * @param {Node} lacunarity - 频率倍增因子，默认为2
 * @param {Node} diminish - 振幅衰减因子，默认为0.5
 * @return {Node} 生成的二维噪声值
 */
export const mx_unifiednoise2d = (
  noiseType,
  texcoord = uv(),
  freq = vec2(1, 1),
  offset = vec2(0, 0),
  jitter = 1,
  outmin = 0,
  outmax = 1,
  clampoutput = false,
  octaves = 1,
  lacunarity = 2,
  diminish = 0.5
) => unifiednoise2d(noiseType, texcoord.convert("vec2|vec3"), freq, offset, jitter, outmin, outmax, clampoutput, octaves, lacunarity, diminish);

/**
 * 三维统一噪声函数。
 *
 * 提供统一的接口来生成不同类型的三维噪声。
 * 参数与二维版本相同，但在三维空间中操作。
 *
 * @param {Node} noiseType - 噪声类型（0=Perlin, 1=Cell, 2=Worley）
 * @param {Node} texcoord - 纹理坐标，默认使用当前UV
 * @param {Node} freq - 频率向量，默认为(1,1)
 * @param {Node} offset - 偏移向量，默认为(0,0)
 * @param {Node} jitter - 抖动量，默认为1
 * @param {Node} outmin - 输出最小值，默认为0
 * @param {Node} outmax - 输出最大值，默认为1
 * @param {Node} clampoutput - 是否限制输出范围，默认为false
 * @param {Node} octaves - 八度数，默认为1
 * @param {Node} lacunarity - 频率倍增因子，默认为2
 * @param {Node} diminish - 振幅衰减因子，默认为0.5
 * @return {Node} 生成的三维噪声值
 */
export const mx_unifiednoise3d = (
  noiseType,
  texcoord = uv(),
  freq = vec2(1, 1),
  offset = vec2(0, 0),
  jitter = 1,
  outmin = 0,
  outmax = 1,
  clampoutput = false,
  octaves = 1,
  lacunarity = 2,
  diminish = 0.5
) => unifiednoise3d(noiseType, texcoord.convert("vec2|vec3"), freq, offset, jitter, outmin, outmax, clampoutput, octaves, lacunarity, diminish);

/**
 * 浮点Worley噪声函数。
 *
 * 生成基于Voronoi图的Worley噪声，常用于创建细胞状或石头纹理。
 *
 * @param {Node} texcoord - 纹理坐标，默认使用当前UV
 * @param {Node} jitter - 抖动量，控制细胞点的随机性，默认为1
 * @return {Node} 浮点Worley噪声值
 */
export const mx_worley_noise_float = (texcoord = uv(), jitter = 1) => worley_noise_float(texcoord.convert("vec2|vec3"), jitter, int(1));

/**
 * 二维向量Worley噪声函数。
 *
 * 生成二维向量的Worley噪声。
 *
 * @param {Node} texcoord - 纹理坐标，默认使用当前UV
 * @param {Node} jitter - 抖动量，默认为1
 * @return {Node} 二维向量Worley噪声值
 */
export const mx_worley_noise_vec2 = (texcoord = uv(), jitter = 1) => worley_noise_vec2(texcoord.convert("vec2|vec3"), jitter, int(1));

/**
 * 三维向量Worley噪声函数。
 *
 * 生成三维向量的Worley噪声。
 *
 * @param {Node} texcoord - 纹理坐标，默认使用当前UV
 * @param {Node} jitter - 抖动量，默认为1
 * @return {Node} 三维向量Worley噪声值
 */
export const mx_worley_noise_vec3 = (texcoord = uv(), jitter = 1) => worley_noise_vec3(texcoord.convert("vec2|vec3"), jitter, int(1));

/**
 * 浮点Cell噪声函数。
 *
 * 生成基于网格的Cell噪声，产生块状的随机值。
 *
 * @param {Node} texcoord - 纹理坐标，默认使用当前UV
 * @return {Node} 浮点Cell噪声值
 */
export const mx_cell_noise_float = (texcoord = uv()) => cell_noise_float(texcoord.convert("vec2|vec3"));

/**
 * 浮点分形噪声函数。
 *
 * 通过叠加多个八度的噪声来创建分形噪声，产生更复杂的纹理。
 *
 * @param {Node} position - 采样位置，默认使用当前UV
 * @param {Node} octaves - 八度数，默认为3
 * @param {Node} lacunarity - 频率倍增因子，默认为2
 * @param {Node} diminish - 振幅衰减因子，默认为0.5
 * @param {Node} amplitude - 总体振幅，默认为1
 * @return {Node} 浮点分形噪声值
 */
export const mx_fractal_noise_float = (position = uv(), octaves = 3, lacunarity = 2, diminish = 0.5, amplitude = 1) =>
  fractal_noise_float(position, int(octaves), lacunarity, diminish).mul(amplitude);

/**
 * 二维向量分形噪声函数。
 *
 * 生成二维向量的分形噪声。
 *
 * @param {Node} position - 采样位置，默认使用当前UV
 * @param {Node} octaves - 八度数，默认为3
 * @param {Node} lacunarity - 频率倍增因子，默认为2
 * @param {Node} diminish - 振幅衰减因子，默认为0.5
 * @param {Node} amplitude - 总体振幅，默认为1
 * @return {Node} 二维向量分形噪声值
 */
export const mx_fractal_noise_vec2 = (position = uv(), octaves = 3, lacunarity = 2, diminish = 0.5, amplitude = 1) =>
  fractal_noise_vec2(position, int(octaves), lacunarity, diminish).mul(amplitude);

/**
 * 三维向量分形噪声函数。
 *
 * 生成三维向量的分形噪声。
 *
 * @param {Node} position - 采样位置，默认使用当前UV
 * @param {Node} octaves - 八度数，默认为3
 * @param {Node} lacunarity - 频率倍增因子，默认为2
 * @param {Node} diminish - 振幅衰减因子，默认为0.5
 * @param {Node} amplitude - 总体振幅，默认为1
 * @return {Node} 三维向量分形噪声值
 */
export const mx_fractal_noise_vec3 = (position = uv(), octaves = 3, lacunarity = 2, diminish = 0.5, amplitude = 1) =>
  fractal_noise_vec3(position, int(octaves), lacunarity, diminish).mul(amplitude);

/**
 * 四维向量分形噪声函数。
 *
 * 生成四维向量的分形噪声。
 *
 * @param {Node} position - 采样位置，默认使用当前UV
 * @param {Node} octaves - 八度数，默认为3
 * @param {Node} lacunarity - 频率倍增因子，默认为2
 * @param {Node} diminish - 振幅衰减因子，默认为0.5
 * @param {Node} amplitude - 总体振幅，默认为1
 * @return {Node} 四维向量分形噪声值
 */
export const mx_fractal_noise_vec4 = (position = uv(), octaves = 3, lacunarity = 2, diminish = 0.5, amplitude = 1) =>
  fractal_noise_vec4(position, int(octaves), lacunarity, diminish).mul(amplitude);

// 重新导出颜色空间转换函数
export { mx_hsvtorgb, mx_rgbtohsv, mx_srgb_texture_to_lin_rec709 };

// === 从MaterialXLoader.js移动过来的函数 ===

// 数学运算函数

/**
 * MaterialX加法运算。
 *
 * @param {Node} in1 - 第一个操作数
 * @param {Node} in2 - 第二个操作数，默认为0
 * @return {Node} 加法结果
 */
export const mx_add = (in1, in2 = float(0)) => add(in1, in2);

/**
 * MaterialX减法运算。
 *
 * @param {Node} in1 - 被减数
 * @param {Node} in2 - 减数，默认为0
 * @return {Node} 减法结果
 */
export const mx_subtract = (in1, in2 = float(0)) => sub(in1, in2);

/**
 * MaterialX乘法运算。
 *
 * @param {Node} in1 - 第一个操作数
 * @param {Node} in2 - 第二个操作数，默认为1
 * @return {Node} 乘法结果
 */
export const mx_multiply = (in1, in2 = float(1)) => mul(in1, in2);

/**
 * MaterialX除法运算。
 *
 * @param {Node} in1 - 被除数
 * @param {Node} in2 - 除数，默认为1
 * @return {Node} 除法结果
 */
export const mx_divide = (in1, in2 = float(1)) => div(in1, in2);

/**
 * MaterialX取模运算。
 *
 * @param {Node} in1 - 被除数
 * @param {Node} in2 - 除数，默认为1
 * @return {Node} 取模结果
 */
export const mx_modulo = (in1, in2 = float(1)) => mod(in1, in2);

/**
 * MaterialX幂运算。
 *
 * @param {Node} in1 - 底数
 * @param {Node} in2 - 指数，默认为1
 * @return {Node} 幂运算结果
 */
export const mx_power = (in1, in2 = float(1)) => pow(in1, in2);

/**
 * MaterialX反正切函数（两参数版本）。
 *
 * @param {Node} in1 - Y坐标，默认为0
 * @param {Node} in2 - X坐标，默认为1
 * @return {Node} 反正切值（弧度）
 */
export const mx_atan2 = (in1 = float(0), in2 = float(1)) => atan(in1, in2);

/**
 * MaterialX时间函数。
 *
 * @return {Node} 当前时间值
 */
export const mx_timer = () => time;

/**
 * MaterialX帧计数函数。
 *
 * @return {Node} 当前帧ID
 */
export const mx_frame = () => frameId;

/**
 * MaterialX反转函数。
 *
 * @param {Node} in1 - 输入值
 * @param {Node} amount - 反转量，默认为1
 * @return {Node} 反转结果：amount - in1
 */
export const mx_invert = (in1, amount = float(1)) => sub(amount, in1);

/**
 * MaterialX条件判断：如果value1 > value2则返回in1，否则返回in2。
 *
 * @param {Node} value1 - 第一个比较值
 * @param {Node} value2 - 第二个比较值
 * @param {Node} in1 - 条件为真时的返回值
 * @param {Node} in2 - 条件为假时的返回值
 * @return {Node} 条件选择结果
 */
export const mx_ifgreater = (value1, value2, in1, in2) => value1.greaterThan(value2).mix(in1, in2);

/**
 * MaterialX条件判断：如果value1 >= value2则返回in1，否则返回in2。
 *
 * @param {Node} value1 - 第一个比较值
 * @param {Node} value2 - 第二个比较值
 * @param {Node} in1 - 条件为真时的返回值
 * @param {Node} in2 - 条件为假时的返回值
 * @return {Node} 条件选择结果
 */
export const mx_ifgreatereq = (value1, value2, in1, in2) => value1.greaterThanEqual(value2).mix(in1, in2);

/**
 * MaterialX条件判断：如果value1 == value2则返回in1，否则返回in2。
 *
 * @param {Node} value1 - 第一个比较值
 * @param {Node} value2 - 第二个比较值
 * @param {Node} in1 - 条件为真时的返回值
 * @param {Node} in2 - 条件为假时的返回值
 * @return {Node} 条件选择结果
 */
export const mx_ifequal = (value1, value2, in1, in2) => value1.equal(value2).mix(in1, in2);

/**
 * 增强的分离节点，支持多输出引用（outx, outy, outz, outw）。
 *
 * 从向量中提取指定的分量。支持多种引用方式：
 * - 字符串：'x', 'y', 'z', 'w' 或 'r', 'g', 'b', 'a'
 * - 带前缀的字符串：'outx', 'outy', 'outz', 'outw'
 * - 数字索引：0, 1, 2, 3
 *
 * @param {Node} in1 - 输入向量
 * @param {string|number|null} channelOrOut - 要提取的通道，默认为null（返回原向量）
 * @return {Node} 提取的分量或原向量
 */
export const mx_separate = (in1, channelOrOut = null) => {
  // 处理字符串类型的通道名
  if (typeof channelOrOut === "string") {
    // 通道映射：支持XYZW和RGBA两种命名方式
    const map = { x: 0, r: 0, y: 1, g: 1, z: 2, b: 2, w: 3, a: 3 };
    // 移除可能的"out"前缀并转换为小写
    const c = channelOrOut.replace(/^out/, "").toLowerCase();
    if (map[c] !== undefined) return in1.element(map[c]);
  }

  // 处理数字索引
  if (typeof channelOrOut === "number") {
    return in1.element(channelOrOut);
  }

  // 处理单字符字符串
  if (typeof channelOrOut === "string" && channelOrOut.length === 1) {
    const map = { x: 0, r: 0, y: 1, g: 1, z: 2, b: 2, w: 3, a: 3 };
    if (map[channelOrOut] !== undefined) return in1.element(map[channelOrOut]);
  }

  // 默认返回原向量
  return in1;
};

/**
 * MaterialX二维位置变换函数。
 *
 * 对二维坐标进行复合变换，包括缩放、旋转和偏移。
 * 变换顺序：移动到枢轴点 -> 缩放 -> 旋转 -> 移回枢轴点 -> 应用偏移
 *
 * @param {Node} texcoord - 输入的纹理坐标
 * @param {Node} pivot - 枢轴点，默认为(0.5, 0.5)
 * @param {Node} scale - 缩放因子，默认为(1, 1)
 * @param {Node} rotate - 旋转角度（度），默认为0
 * @param {Node} offset - 偏移量，默认为(0, 0)
 * @return {Node} 变换后的坐标
 */
export const mx_place2d = (texcoord, pivot = vec2(0.5, 0.5), scale = vec2(1, 1), rotate = float(0), offset = vec2(0, 0) /*, operationorder = int( 0 )*/) => {
  let uv = texcoord;
  // 第一步：移动到枢轴点（使枢轴点成为原点）
  if (pivot) uv = uv.sub(pivot);
  // 第二步：应用缩放
  if (scale) uv = uv.mul(scale);
  // 第三步：应用旋转
  if (rotate) {
    // 将角度转换为弧度
    const rad = rotate.mul(Math.PI / 180.0);
    const cosR = rad.cos();
    const sinR = rad.sin();
    // 应用2D旋转矩阵
    uv = vec2(uv.x.mul(cosR).sub(uv.y.mul(sinR)), uv.x.mul(sinR).add(uv.y.mul(cosR)));
  }

  // 第四步：移回枢轴点
  if (pivot) uv = uv.add(pivot);
  // 第五步：应用最终偏移
  if (offset) uv = uv.add(offset);
  return uv;
};

/**
 * MaterialX二维旋转函数。
 *
 * 围绕原点旋转二维向量。
 *
 * @param {Node} input - 输入的二维向量
 * @param {Node} amount - 旋转角度（度）
 * @return {Node} 旋转后的向量
 */
export const mx_rotate2d = (input, amount) => {
  // 确保输入为二维向量
  input = vec2(input);
  amount = float(amount);

  // 将角度转换为弧度
  const radians = amount.mul(Math.PI / 180.0);
  // 使用内置的旋转函数
  return rotate(input, radians);
};

/**
 * MaterialX三维旋转函数。
 *
 * 围绕指定轴旋转三维向量。使用Rodrigues旋转公式实现。
 *
 * @param {Node} input - 输入的三维向量
 * @param {Node} amount - 旋转角度（度）
 * @param {Node} axis - 旋转轴向量
 * @return {Node} 旋转后的向量
 */
export const mx_rotate3d = (input, amount, axis) => {
  // 确保输入为正确的类型
  input = vec3(input);
  amount = float(amount);
  axis = vec3(axis);

  // 将角度转换为弧度
  const radians = amount.mul(Math.PI / 180.0);
  // 归一化旋转轴
  const nAxis = axis.normalize();
  // 计算旋转所需的三角函数值
  const cosA = radians.cos();
  const sinA = radians.sin();
  const oneMinusCosA = float(1).sub(cosA);

  // 使用Rodrigues旋转公式：
  // v_rot = v*cos(θ) + (k×v)*sin(θ) + k*(k·v)*(1-cos(θ))
  // 其中 k 是归一化的旋转轴，v 是输入向量，θ 是旋转角度
  const rot = input
    .mul(cosA) // v*cos(θ)
    .add(nAxis.cross(input).mul(sinA)) // (k×v)*sin(θ)
    .add(nAxis.mul(nAxis.dot(input)).mul(oneMinusCosA)); // k*(k·v)*(1-cos(θ))
  return rot;
};

/**
 * MaterialX高度图转法线函数。
 *
 * 将高度图转换为法线贴图。通过计算高度的梯度来生成法线向量。
 *
 * @param {Node} input - 输入的高度图（三维向量）
 * @param {Node} scale - 法线强度缩放因子
 * @return {Node} 生成的法线向量
 */
export const mx_heighttonormal = (input, scale /*, texcoord*/) => {
  // 确保输入为正确的类型
  input = vec3(input);
  scale = float(scale);

  // 使用内置的凹凸贴图函数来计算法线
  return bumpMap(input, scale);
};
