import { dot, max, mix } from "../math/MathNode.js"; // 导入数学节点函数
import { add } from "../math/OperatorNode.js"; // 导入操作符节点函数
import { Fn, If, float, vec3, vec4 } from "../tsl/TSLBase.js"; // 导入TSL核心函数
import { ColorManagement } from "../../math/ColorManagement.js"; // 导入颜色管理
import { Vector3 } from "../../math/Vector3.js"; // 导入Vector3类
import { LinearSRGBColorSpace } from "../../constants.js"; // 导入线性sRGB色彩空间常量

/**
 * 计算给定RGB颜色值的灰度值。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} color - 要计算灰度的颜色值。
 * @return {Node<vec3>} 灰度颜色。
 */
export const grayscale = /*@__PURE__*/ Fn(([color]) => {
  // 导出灰度转换函数

  return luminance(color.rgb); // 返回颜色的亮度值
});

/**
 * 对给定的RGB颜色进行超饱和或去饱和处理。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} color - 输入颜色。
 * @param {Node<float>} [adjustment=1] - 指定转换的量。小于`1`的值去饱和颜色，大于`1`的值超饱和颜色。
 * @return {Node<vec3>} 饱和后的颜色。
 */
export const saturation = /*@__PURE__*/ Fn(([color, adjustment = float(1)]) => {
  // 导出饱和度调整函数

  return adjustment.mix(luminance(color.rgb), color.rgb); // 在亮度和原色之间按调整值混合
});

/**
 * 选择性地增强饱和度较低的RGB颜色的强度。与
 * {@link ColorAdjustment#saturation} 相比，可以产生更自然和视觉上更吸引人的图像，
 * 具有增强的色彩深度。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} color - 输入颜色。
 * @param {Node<float>} [adjustment=1] - 控制鲜艳度效果的强度。
 * @return {Node<vec3>} 更新后的颜色。
 */
export const vibrance = /*@__PURE__*/ Fn(([color, adjustment = float(1)]) => {
  // 导出鲜艳度调整函数

  const average = add(color.r, color.g, color.b).div(3.0); // 计算RGB分量的平均值

  const mx = color.r.max(color.g.max(color.b)); // 获取RGB中的最大值
  const amt = mx.sub(average).mul(adjustment).mul(-3.0); // 计算调整量

  return mix(color.rgb, mx, amt); // 在原色和最大值之间混合
});

/**
 * 更新给定RGB颜色的色相分量，同时保持其亮度和饱和度。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} color - 输入颜色。
 * @param {Node<float>} [adjustment=1] - 定义色相旋转的度数（弧度）。正值顺时针旋转色相，负值逆时针旋转。
 * @return {Node<vec3>} 更新后的颜色。
 */
export const hue = /*@__PURE__*/ Fn(([color, adjustment = float(1)]) => {
  // 导出色相调整函数

  const k = vec3(0.57735, 0.57735, 0.57735); // 旋转轴向量

  const cosAngle = adjustment.cos(); // 计算角度的余弦值

  return vec3(
    color.rgb.mul(cosAngle).add(
      k
        .cross(color.rgb)
        .mul(adjustment.sin())
        .add(k.mul(dot(k, color.rgb).mul(cosAngle.oneMinus())))
    )
  ); // 应用罗德里格旋转公式
});

/**
 * 计算给定RGB颜色值的亮度。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} color - 要计算亮度的颜色值。
 * @param {?Node<vec3>} luminanceCoefficients - 亮度系数。默认使用当前工作色彩空间的预定义值。
 * @return {Node<vec3>} 亮度。
 */
export const luminance = (
  // 导出亮度计算函数
  color, // 颜色参数
  luminanceCoefficients = vec3(ColorManagement.getLuminanceCoefficients(new Vector3())) // 亮度系数，默认从颜色管理获取
) => dot(color, luminanceCoefficients); // 返回颜色与亮度系数的点积

/**
 * 颜色决策列表 (CDL) v1.2
 *
 * 颜色分级信息的紧凑表示，由斜率、偏移、幂次和
 * 饱和度定义。CDL通常应在对数空间（如LogC、ACEScc
 * 或AgX Log）中给定输入，并在相同空间中返回输出。输出可能需要钳制>=0。
 *
 * @tsl
 * @function
 * @param {Node<vec4>} color 输入 (-Infinity < input < +Infinity)
 * @param {Node<vec3>} slope 斜率 (0 ≤ slope < +Infinity)
 * @param {Node<vec3>} offset 偏移 (-Infinity < offset < +Infinity; 通常 -1 < offset < 1)
 * @param {Node<vec3>} power 幂次 (0 < power < +Infinity)
 * @param {Node<float>} saturation 饱和度 (0 ≤ saturation < +Infinity; 通常 0 ≤ saturation < 4)
 * @param {Node<vec3>} luminanceCoefficients 饱和度项的亮度系数，通常为Rec. 709
 * @return {Node<vec4>} 输出, -Infinity < output < +Infinity
 *
 * 参考资料:
 * - ASC CDL v1.2
 * - {@link https://blender.stackexchange.com/a/55239/43930}
 * - {@link https://docs.acescentral.com/specifications/acescc/}
 */
export const cdl = /*@__PURE__*/ Fn(
  // 导出颜色决策列表函数
  ([
    color, // 输入颜色
    slope = vec3(1), // 斜率，默认为1
    offset = vec3(0), // 偏移，默认为0
    power = vec3(1), // 幂次，默认为1
    saturation = float(1), // 饱和度，默认为1
    // ASC CDL v1.2明确要求Rec. 709亮度系数。
    luminanceCoefficients = vec3(ColorManagement.getLuminanceCoefficients(new Vector3(), LinearSRGBColorSpace)), // 亮度系数
  ]) => {
    // 注意：ASC CDL v1.2在斜率+偏移项上定义了[0, 1]钳制，在
    // 饱和度项上定义了另一个钳制。根据ACEScc规范和Filament，可以省略限制以支持
    // [0, 1]之外的值，需要对幂次表达式中的负值进行变通处理。

    const luma = color.rgb.dot(vec3(luminanceCoefficients)); // 计算亮度

    const v = max(color.rgb.mul(slope).add(offset), 0.0).toVar(); // 计算斜率和偏移后的值，并钳制到0以上
    const pv = v.pow(power).toVar(); // 计算幂次值

    If(v.r.greaterThan(0.0), () => {
      // 如果红色分量大于0
      v.r.assign(pv.r); // 应用幂次到红色分量
    }); // eslint-disable-line
    If(v.g.greaterThan(0.0), () => {
      // 如果绿色分量大于0
      v.g.assign(pv.g); // 应用幂次到绿色分量
    }); // eslint-disable-line
    If(v.b.greaterThan(0.0), () => {
      // 如果蓝色分量大于0
      v.b.assign(pv.b); // 应用幂次到蓝色分量
    }); // eslint-disable-line

    v.assign(luma.add(v.sub(luma).mul(saturation))); // 应用饱和度调整

    return vec4(v.rgb, color.a); // 返回处理后的颜色，保持alpha通道
  }
);
