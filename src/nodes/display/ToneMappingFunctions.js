// 从TSL基础模块导入函数、浮点数、矩阵、向量和条件语句
import { Fn, float, mat3, vec3, If } from "../tsl/TSLBase.js";
// 从条件节点模块导入选择函数
import { select } from "../math/ConditionalNode.js";
// 从数学节点模块导入各种数学函数
import { clamp, log2, max, min, pow, mix } from "../math/MathNode.js";
// 从操作符节点模块导入乘法、减法、除法操作
import { mul, sub, div } from "../math/OperatorNode.js";

/**
 * 线性色调映射，仅应用曝光度。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} color - 需要进行色调映射的颜色
 * @param {Node<float>} exposure - 曝光度
 * @return {Node<vec3>} 色调映射后的颜色
 */
export const linearToneMapping = /*@__PURE__*/ Fn(([color, exposure]) => {
  // 将颜色乘以曝光度并限制在[0,1]范围内
  return color.mul(exposure).clamp();
}).setLayout({
  name: "linearToneMapping", // 函数名称
  type: "vec3", // 返回类型
  inputs: [
    { name: "color", type: "vec3" }, // 颜色输入参数
    { name: "exposure", type: "float" }, // 曝光度输入参数
  ],
});

/**
 * Reinhard色调映射算法。
 *
 * 参考文献: {@link https://www.cs.utah.edu/docs/techreports/2002/pdf/UUCS-02-001.pdf}
 *
 * @tsl
 * @function
 * @param {Node<vec3>} color - 需要进行色调映射的颜色
 * @param {Node<float>} exposure - 曝光度
 * @return {Node<vec3>} 色调映射后的颜色
 */
export const reinhardToneMapping = /*@__PURE__*/ Fn(([color, exposure]) => {
  color = color.mul(exposure); // 应用曝光度

  // Reinhard算法：color / (color + 1)
  return color.div(color.add(1.0)).clamp();
}).setLayout({
  name: "reinhardToneMapping", // 函数名称
  type: "vec3", // 返回类型
  inputs: [
    { name: "color", type: "vec3" }, // 颜色输入参数
    { name: "exposure", type: "float" }, // 曝光度输入参数
  ],
});

/**
 * Cineon色调映射算法。
 *
 * 参考文献: {@link http://filmicworlds.com/blog/filmic-tonemapping-operators/}
 *
 * @tsl
 * @function
 * @param {Node<vec3>} color - 需要进行色调映射的颜色
 * @param {Node<float>} exposure - 曝光度
 * @return {Node<vec3>} 色调映射后的颜色
 */
export const cineonToneMapping = /*@__PURE__*/ Fn(([color, exposure]) => {
  // 由Jim Hejl和Richard Burgess-Dawson开发的电影级操作符
  color = color.mul(exposure); // 应用曝光度
  color = color.sub(0.004).max(0.0); // 减去偏移量并确保非负

  // 计算Cineon算法的分子和分母
  const a = color.mul(color.mul(6.2).add(0.5)); // 分子：color * (color * 6.2 + 0.5)
  const b = color.mul(color.mul(6.2).add(1.7)).add(0.06); // 分母：color * (color * 6.2 + 1.7) + 0.06

  return a.div(b).pow(2.2); // 除法后应用伽马校正
}).setLayout({
  name: "cineonToneMapping", // 函数名称
  type: "vec3", // 返回类型
  inputs: [
    { name: "color", type: "vec3" }, // 颜色输入参数
    { name: "exposure", type: "float" }, // 曝光度输入参数
  ],
});

// 来源: https://github.com/selfshadow/ltc_code/blob/master/webgl/shaders/ltc/ltc_blit.fs

// RRT（参考渲染变换）和ODT（输出设备变换）拟合函数
const RRTAndODTFit = /*@__PURE__*/ Fn(([color]) => {
  // ACES色调映射的核心算法
  const a = color.mul(color.add(0.0245786)).sub(0.000090537); // 分子计算
  const b = color.mul(color.add(0.432951).mul(0.983729)).add(0.238081); // 分母计算

  return a.div(b); // 返回拟合结果
});

/**
 * ACES电影级色调映射算法。
 *
 * 参考文献: {@link https://github.com/selfshadow/ltc_code/blob/master/webgl/shaders/ltc/ltc_blit.fs}
 *
 * @tsl
 * @function
 * @param {Node<vec3>} color - 需要进行色调映射的颜色
 * @param {Node<float>} exposure - 曝光度
 * @return {Node<vec3>} 色调映射后的颜色
 */
export const acesFilmicToneMapping = /*@__PURE__*/ Fn(([color, exposure]) => {
  // sRGB => XYZ => D65_2_D60 => AP1 => RRT_SAT 颜色空间转换矩阵
  const ACESInputMat = mat3(0.59719, 0.35458, 0.04823, 0.076, 0.90834, 0.01566, 0.0284, 0.13383, 0.83777);

  // ODT_SAT => XYZ => D60_2_D65 => sRGB 输出颜色空间转换矩阵
  const ACESOutputMat = mat3(1.60475, -0.53108, -0.07367, -0.10208, 1.10813, -0.00605, -0.00327, -0.07276, 1.07602);

  color = color.mul(exposure).div(0.6); // 应用曝光度并缩放

  color = ACESInputMat.mul(color); // 转换到ACES颜色空间

  // 应用RRT和ODT变换
  color = RRTAndODTFit(color);

  color = ACESOutputMat.mul(color); // 转换回sRGB颜色空间

  // 限制到[0, 1]范围
  return color.clamp();
}).setLayout({
  name: "acesFilmicToneMapping", // 函数名称
  type: "vec3", // 返回类型
  inputs: [
    { name: "color", type: "vec3" }, // 颜色输入参数
    { name: "exposure", type: "float" }, // 曝光度输入参数
  ],
});

// 线性Rec2020到线性sRGB的颜色空间转换矩阵
const LINEAR_REC2020_TO_LINEAR_SRGB = /*@__PURE__*/ mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
// 线性sRGB到线性Rec2020的颜色空间转换矩阵
const LINEAR_SRGB_TO_LINEAR_REC2020 = /*@__PURE__*/ mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.088), vec3(0.0433, 0.0113, 0.8956));

// AgX默认对比度近似函数
const agxDefaultContrastApprox = /*@__PURE__*/ Fn(([x_immutable]) => {
  const x = vec3(x_immutable).toVar(); // 输入向量
  const x2 = vec3(x.mul(x)).toVar(); // x的平方
  const x4 = vec3(x2.mul(x2)).toVar(); // x的四次方

  // AgX对比度曲线的多项式近似
  return float(15.5)
    .mul(x4.mul(x2)) // 15.5 * x^6
    .sub(mul(40.14, x4.mul(x))) // - 40.14 * x^5
    .add(
      mul(31.96, x4) // + 31.96 * x^4
        .sub(mul(6.868, x2.mul(x))) // - 6.868 * x^3
        .add(mul(0.4298, x2).add(mul(0.1191, x).sub(0.00232))) // + 0.4298 * x^2 + 0.1191 * x - 0.00232
    );
});

/**
 * AgX色调映射算法。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} color - 需要进行色调映射的颜色
 * @param {Node<float>} exposure - 曝光度
 * @return {Node<vec3>} 色调映射后的颜色
 */
export const agxToneMapping = /*@__PURE__*/ Fn(([color, exposure]) => {
  const colortone = vec3(color).toVar(); // 创建可变的颜色变量
  // AgX输入变换矩阵
  const AgXInsetMatrix = mat3(
    vec3(0.856627153315983, 0.137318972929847, 0.11189821299995),
    vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
    vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859)
  );
  // AgX输出变换矩阵
  const AgXOutsetMatrix = mat3(
    vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
    vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
    vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405)
  );
  const AgxMinEv = float(-12.47393); // AgX最小曝光值
  const AgxMaxEv = float(4.026069); // AgX最大曝光值
  colortone.mulAssign(exposure); // 应用曝光度
  colortone.assign(LINEAR_SRGB_TO_LINEAR_REC2020.mul(colortone)); // 转换到Rec2020色彩空间
  colortone.assign(AgXInsetMatrix.mul(colortone)); // 应用AgX输入变换
  colortone.assign(max(colortone, 1e-10)); // 确保非零值
  colortone.assign(log2(colortone)); // 转换到对数空间
  colortone.assign(colortone.sub(AgxMinEv).div(AgxMaxEv.sub(AgxMinEv))); // 标准化到[0,1]范围
  colortone.assign(clamp(colortone, 0.0, 1.0)); // 限制到有效范围
  colortone.assign(agxDefaultContrastApprox(colortone)); // 应用对比度曲线
  colortone.assign(AgXOutsetMatrix.mul(colortone)); // 应用AgX输出变换
  colortone.assign(pow(max(vec3(0.0), colortone), vec3(2.2))); // 应用伽马校正
  colortone.assign(LINEAR_REC2020_TO_LINEAR_SRGB.mul(colortone)); // 转换回sRGB色彩空间
  colortone.assign(clamp(colortone, 0.0, 1.0)); // 最终限制到[0,1]范围

  return colortone; // 返回处理后的颜色
}).setLayout({
  name: "agxToneMapping", // 函数名称
  type: "vec3", // 返回类型
  inputs: [
    { name: "color", type: "vec3" }, // 颜色输入参数
    { name: "exposure", type: "float" }, // 曝光度输入参数
  ],
});

/**
 * 中性色调映射算法。
 *
 * 参考文献: {@link https://modelviewer.dev/examples/tone-mapping}
 *
 * @tsl
 * @function
 * @param {Node<vec3>} color - 需要进行色调映射的颜色
 * @param {Node<float>} exposure - 曝光度
 * @return {Node<vec3>} 色调映射后的颜色
 */
export const neutralToneMapping = /*@__PURE__*/ Fn(([color, exposure]) => {
  const StartCompression = float(0.8 - 0.04); // 开始压缩的阈值
  const Desaturation = float(0.15); // 去饱和度参数

  color = color.mul(exposure); // 应用曝光度

  // 计算最小颜色分量和偏移量
  const x = min(color.r, min(color.g, color.b)); // 获取RGB中的最小值
  const offset = select(x.lessThan(0.08), x.sub(mul(6.25, x.mul(x))), 0.04); // 条件选择偏移量

  color.subAssign(offset); // 减去偏移量

  const peak = max(color.r, max(color.g, color.b)); // 获取RGB中的最大值（峰值）

  // 如果峰值小于压缩阈值，直接返回
  If(peak.lessThan(StartCompression), () => {
    return color;
  });

  // 计算压缩参数
  const d = sub(1, StartCompression); // 压缩范围
  const newPeak = sub(1, d.mul(d).div(peak.add(d.sub(StartCompression)))); // 新的峰值
  color.mulAssign(newPeak.div(peak)); // 缩放颜色
  const g = sub(1, div(1, Desaturation.mul(peak.sub(newPeak)).add(1))); // 去饱和度因子

  return mix(color, vec3(newPeak), g); // 混合原色和去饱和色
}).setLayout({
  name: "neutralToneMapping", // 函数名称
  type: "vec3", // 返回类型
  inputs: [
    { name: "color", type: "vec3" }, // 颜色输入参数
    { name: "exposure", type: "float" }, // 曝光度输入参数
  ],
});
