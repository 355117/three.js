// 从操作符节点模块导入基本数学运算函数
import { sub, mul, div, add } from "./OperatorNode.js";
// 从数学节点模块导入PI常量、幂函数和正弦函数
import { PI, pow, sin } from "./MathNode.js";

/**
 * 将 `[0,1]` 区间重新映射到 `[0,1]` 区间的函数。
 * 角落映射到 `0`，中心映射到 `1`。
 * 参考: {@link https://iquilezles.org/articles/functions/}。
 *
 * @tsl
 * @function
 * @param {Node<float>} x - 要重新映射的值。
 * @param {Node<float>} k - 允许通过将抛物线提升到幂 `k` 来控制重新映射函数的形状。
 * @return {Node<float>} 重新映射的值。
 */
export const parabola = (x, k) => pow(mul(4.0, x.mul(sub(1.0, x))), k);

/**
 * 将 `[0,1]` 区间重新映射到 `[0,1]` 区间的函数。
 * 扩展两侧并压缩中心，保持 `0.5` 映射到 `0.5`。
 * 参考: {@link https://iquilezles.org/articles/functions/}。
 *
 * @tsl
 * @function
 * @param {Node<float>} x - 要重新映射的值。
 * @param {Node<float>} k - `k=1` 是恒等曲线，`k<1` 产生经典的 `gain()` 形状，`k>1` 产生"s"形曲线。
 * @return {Node<float>} 重新映射的值。
 */
export const gain = (x, k) => (x.lessThan(0.5) ? parabola(x.mul(2.0), k).div(2.0) : sub(1.0, parabola(mul(sub(1.0, x), 2.0), k).div(2.0)));

/**
 * 将 `[0,1]` 区间重新映射到 `[0,1]` 区间的函数。
 * `parabola()` 的泛化。保持角落映射到0，但允许控制曲线两侧的形状。
 * 参考: {@link https://iquilezles.org/articles/functions/}。
 *
 * @tsl
 * @function
 * @param {Node<float>} x - 要重新映射的值。
 * @param {Node<float>} a - 第一个控制参数。
 * @param {Node<float>} b - 第二个控制参数。
 * @return {Node<float>} 重新映射的值。
 */
export const pcurve = (x, a, b) => pow(div(pow(x, a), add(pow(x, a), pow(sub(1.0, x), b))), 1.0 / a);

/**
 * 相位偏移的正弦曲线，从零开始到零结束，具有弹跳行为。
 * 参考: {@link https://iquilezles.org/articles/functions/}。
 *
 * @tsl
 * @function
 * @param {Node<float>} x - 要计算正弦值的值。
 * @param {Node<float>} k - 控制弹跳次数。
 * @return {Node<float>} 结果值。
 */
export const sinc = (x, k) => sin(PI.mul(k.mul(x).sub(1.0))).div(PI.mul(k.mul(x).sub(1.0)));
