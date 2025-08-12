// 从UV访问器模块导入uv函数，用于获取纹理坐标
import { uv } from "../accessors/UV.js";
// 从TSL基础模块导入Fn函数，用于创建着色器函数
import { Fn } from "../tsl/TSLBase.js";

/**
 * 创建一个2x2棋盘格图案，可用作程序化纹理数据
 * Creates a 2x2 checkerboard pattern that can be used as procedural texture data.
 *
 * @tsl
 * @function
 * @param {Node<vec2>} coord - UV坐标 The uv coordinates.
 * @return {Node<float>} 结果数据 The result data.
 */
// 导出棋盘格函数，使用纯函数标记进行优化
export const checker = /*@__PURE__*/ Fn(([coord = uv()]) => {
  // 将坐标乘以2.0，扩大棋盘格的尺寸
  const uv = coord.mul(2.0);

  // 获取UV坐标X分量的向下取整值，用于确定棋盘格的列位置
  const cx = uv.x.floor();
  // 获取UV坐标Y分量的向下取整值，用于确定棋盘格的行位置
  const cy = uv.y.floor();
  // 将行列位置相加后取模2，生成棋盘格图案（0或1的交替模式）
  const result = cx.add(cy).mod(2.0);

  // 返回结果的符号值，将0/1模式转换为-1/1模式
  return result.sign();
});
