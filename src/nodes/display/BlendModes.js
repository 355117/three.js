import { Fn, If, vec4 } from "../tsl/TSLBase.js"; // 导入TSL核心函数
import { mix, min, step } from "../math/MathNode.js"; // 导入数学节点函数

/**
 * 表示"颜色加深"混合模式。
 *
 * 它旨在根据混合层的颜色使基础层的颜色变暗。
 * 它显著增加基础层的对比度，使颜色更加鲜艳和饱和。
 * 混合层中的颜色越暗，对基础层的变暗和对比度效果越强。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} base - 基础颜色。
 * @param {Node<vec3>} blend - 混合颜色。白色(#ffffff)混合颜色不会改变基础颜色。
 * @return {Node<vec3>} 结果。
 */
export const blendBurn = /*@__PURE__*/ Fn(([base, blend]) => {
  // 导出颜色加深混合函数

  return min(1.0, base.oneMinus().div(blend)).oneMinus(); // 计算颜色加深效果
}).setLayout({
  // 设置函数布局
  name: "blendBurn", // 函数名称
  type: "vec3", // 返回类型
  inputs: [
    // 输入参数
    { name: "base", type: "vec3" }, // 基础颜色参数
    { name: "blend", type: "vec3" }, // 混合颜色参数
  ],
});

/**
 * 表示"颜色减淡"混合模式。
 *
 * 它旨在根据混合层的颜色使基础层的颜色变亮。
 * 它显著增加基础层的亮度，使颜色更亮更鲜艳。
 * 混合层中的颜色越亮，对基础层的变亮和对比度效果越强。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} base - 基础颜色。
 * @param {Node<vec3>} blend - 混合颜色。黑色(#000000)混合颜色不会改变基础颜色。
 * @return {Node<vec3>} 结果。
 */
export const blendDodge = /*@__PURE__*/ Fn(([base, blend]) => {
  // 导出颜色减淡混合函数

  return min(base.div(blend.oneMinus()), 1.0); // 计算颜色减淡效果
}).setLayout({
  // 设置函数布局
  name: "blendDodge", // 函数名称
  type: "vec3", // 返回类型
  inputs: [
    // 输入参数
    { name: "base", type: "vec3" }, // 基础颜色参数
    { name: "blend", type: "vec3" }, // 混合颜色参数
  ],
});

/**
 * 表示"滤色"混合模式。
 *
 * 与 `blendDodge()` 类似，此模式也根据混合层的颜色使基础层的颜色变亮。
 * "滤色"混合模式更适合一般的变亮，而"减淡"产生更微妙和细致的效果。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} base - 基础颜色。
 * @param {Node<vec3>} blend - 混合颜色。黑色(#000000)混合颜色不会改变基础颜色。
 * @return {Node<vec3>} 结果。
 */
export const blendScreen = /*@__PURE__*/ Fn(([base, blend]) => {
  // 导出滤色混合函数

  return base.oneMinus().mul(blend.oneMinus()).oneMinus(); // 计算滤色效果
}).setLayout({
  // 设置函数布局
  name: "blendScreen", // 函数名称
  type: "vec3", // 返回类型
  inputs: [
    // 输入参数
    { name: "base", type: "vec3" }, // 基础颜色参数
    { name: "blend", type: "vec3" }, // 混合颜色参数
  ],
});

/**
 * 表示"叠加"混合模式。
 *
 * 它旨在根据混合层的颜色增加基础层的对比度。
 * 它放大基础层中现有的颜色和对比度，使较亮的区域更亮，较暗的区域更暗。
 * 混合层的颜色显著影响基础层中产生的对比度和颜色偏移。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} base - 基础颜色。
 * @param {Node<vec3>} blend - 混合颜色。
 * @return {Node<vec3>} 结果。
 */
export const blendOverlay = /*@__PURE__*/ Fn(([base, blend]) => {
  // 导出叠加混合函数

  return mix(base.mul(2.0).mul(blend), base.oneMinus().mul(2.0).mul(blend.oneMinus()).oneMinus(), step(0.5, base)); // 计算叠加效果
}).setLayout({
  // 设置函数布局
  name: "blendOverlay", // 函数名称
  type: "vec3", // 返回类型
  inputs: [
    // 输入参数
    { name: "base", type: "vec3" }, // 基础颜色参数
    { name: "blend", type: "vec3" }, // 混合颜色参数
  ],
});

/**
 * 此函数通过复制 `THREE.NormalBlending` 的行为，
 * 基于两个颜色的alpha值混合它们。
 * 它假设两个输入颜色都具有非预乘alpha。
 *
 * @tsl
 * @function
 * @param {Node<vec4>} base - 基础颜色。
 * @param {Node<vec4>} blend - 混合颜色。
 * @return {Node<vec4>} 结果。
 */
export const blendColor = /*@__PURE__*/ Fn(([base, blend]) => {
  // 导出颜色混合函数
  const outAlpha = blend.a.add(base.a.mul(blend.a.oneMinus())); // 计算输出alpha值

  return vec4(blend.rgb.mul(blend.a).add(base.rgb.mul(base.a).mul(blend.a.oneMinus())).div(outAlpha), outAlpha); // 计算混合后的颜色
}).setLayout({
  // 设置函数布局
  name: "blendColor", // 函数名称
  type: "vec4", // 返回类型
  inputs: [
    // 输入参数
    { name: "base", type: "vec4" }, // 基础颜色参数
    { name: "blend", type: "vec4" }, // 混合颜色参数
  ],
});

/**
 * 将颜色的RGB通道与其alpha通道预乘。
 *
 * 此函数对于将非预乘alpha颜色转换为
 * 预乘alpha格式很有用，其中RGB值按
 * alpha值缩放。预乘alpha通常用于图形
 * 渲染中的某些操作，如合成和图像处理。
 *
 * @tsl
 * @function
 * @param {Node<vec4>} color - 具有非预乘alpha的输入颜色。
 * @return {Node<vec4>} 具有预乘alpha的颜色。
 */
export const premultiplyAlpha = /*@__PURE__*/ Fn(
  // 导出预乘alpha函数
  ([color]) => {
    return vec4(color.rgb.mul(color.a), color.a); // 返回预乘alpha的颜色
  },
  { color: "vec4", return: "vec4" } // 设置函数参数类型
);

/**
 * 将颜色的RGB通道除以其alpha通道以取消预乘。
 *
 * 此函数对于将预乘alpha颜色转换回
 * 非预乘alpha格式很有用，其中RGB值被
 * alpha值除。非预乘alpha通常用于图形
 * 渲染中的某些操作，如合成和图像处理。
 *
 * @tsl
 * @function
 * @param {Node<vec4>} color - 具有预乘alpha的输入颜色。
 * @return {Node<vec4>} 具有非预乘alpha的颜色。
 */
export const unpremultiplyAlpha = /*@__PURE__*/ Fn(
  // 导出取消预乘alpha函数
  ([color]) => {
    If(color.a.equal(0.0), () => vec4(0.0)); // 如果alpha为0，返回零向量

    return vec4(color.rgb.div(color.a), color.a); // 返回取消预乘alpha的颜色
  },
  { color: "vec4", return: "vec4" } // 设置函数参数类型
);

// 已弃用

/**
 * @tsl
 * @function
 * @deprecated 自r171起已弃用。请使用 {@link blendBurn} 代替。
 *
 * @param {...any} params
 * @returns {Function}
 */
export const burn = (...params) => {
  // 导出已弃用的burn函数
  // @deprecated, r171

  console.warn('THREE.TSL: "burn" has been renamed. Use "blendBurn" instead.'); // 输出弃用警告
  return blendBurn(params); // 调用新的blendBurn函数
};

/**
 * @tsl
 * @function
 * @deprecated 自r171起已弃用。请使用 {@link blendDodge} 代替。
 *
 * @param {...any} params
 * @returns {Function}
 */
export const dodge = (...params) => {
  // 导出已弃用的dodge函数
  // @deprecated, r171

  console.warn('THREE.TSL: "dodge" has been renamed. Use "blendDodge" instead.'); // 输出弃用警告
  return blendDodge(params); // 调用新的blendDodge函数
};

/**
 * @tsl
 * @function
 * @deprecated 自r171起已弃用。请使用 {@link blendScreen} 代替。
 *
 * @param {...any} params
 * @returns {Function}
 */
export const screen = (...params) => {
  // 导出已弃用的screen函数
  // @deprecated, r171

  console.warn('THREE.TSL: "screen" has been renamed. Use "blendScreen" instead.'); // 输出弃用警告
  return blendScreen(params); // 调用新的blendScreen函数
};

/**
 * @tsl
 * @function
 * @deprecated 自r171起已弃用。请使用 {@link blendOverlay} 代替。
 *
 * @param {...any} params
 * @returns {Function}
 */
export const overlay = (...params) => {
  // 导出已弃用的overlay函数
  // @deprecated, r171

  console.warn('THREE.TSL: "overlay" has been renamed. Use "blendOverlay" instead.'); // 输出弃用警告
  return blendOverlay(params); // 调用新的blendOverlay函数
};
