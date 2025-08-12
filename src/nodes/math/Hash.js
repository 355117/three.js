// 导入TSL函数基础类
import { Fn } from "../tsl/TSLBase.js";

/**
 * 从给定的种子生成范围在 `[0, 1]` 内的哈希值。
 *
 * 使用PCG（Permuted Congruential Generator）算法的变体来生成高质量的伪随机数。
 * 该算法具有良好的统计特性和快速的计算性能，适用于着色器中的随机数生成。
 *
 * @tsl
 * @function
 * @param {Node<float>} seed - 种子值，用于生成哈希
 * @return {Node<float>} 生成的哈希值，范围在[0, 1)内
 */
export const hash = /*@__PURE__*/ Fn(([seed]) => {
  // 算法来源：https://www.shadertoy.com/view/XlGcRh，最初来自 pcg-random.org
  // 这是PCG算法的一个简化版本，专门为GPU着色器优化

  // 第一步：将种子转换为无符号整数并应用线性同余生成器
  // 使用PCG算法的标准常数：747796405（乘数）和2891336453（增量）
  const state = seed.toUint().mul(747796405).add(2891336453);

  // 第二步：应用PCG的输出函数进行置换
  // 通过位移和异或操作来改善随机性分布
  const word = state.shiftRight(state.shiftRight(28).add(4)).bitXor(state).mul(277803737);

  // 第三步：最终的位移和异或操作，进一步改善输出质量
  const result = word.shiftRight(22).bitXor(word);

  // 第四步：将32位无符号整数转换为[0, 1)范围的浮点数
  return result.toFloat().mul(1 / 2 ** 32); // 除以2^32将结果标准化到[0, 1)范围
});
