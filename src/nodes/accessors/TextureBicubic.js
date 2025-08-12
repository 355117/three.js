// 导入数学操作符节点
import { add, mul, div } from "../math/OperatorNode.js";
// 导入数学函数节点
import { floor, ceil, fract, pow } from "../math/MathNode.js";
// 导入TSL基础函数和类型
import { Fn, vec2, vec4, int } from "../tsl/TSLBase.js";
// 导入最大mip级别节点
import { maxMipLevel } from "../utils/MaxMipLevelNode.js";

// Mipped双三次纹理过滤算法 by N8
// 参考：https://www.shadertoy.com/view/Dl2SDW

// 双三次插值常数
const bC = 1.0 / 6.0;

// 双三次插值权重函数w0
const w0 = (a) => mul(bC, mul(a, mul(a, a.negate().add(3.0)).sub(3.0)).add(1.0));

// 双三次插值权重函数w1
const w1 = (a) => mul(bC, mul(a, mul(a, mul(3.0, a).sub(6.0))).add(4.0));

// 双三次插值权重函数w2
const w2 = (a) => mul(bC, mul(a, mul(a, mul(-3.0, a).add(3.0)).add(3.0)).add(1.0));

// 双三次插值权重函数w3
const w3 = (a) => mul(bC, pow(a, 3));

// 组合权重函数g0
const g0 = (a) => w0(a).add(w1(a));

// 组合权重函数g1
const g1 = (a) => w2(a).add(w3(a));

// h0和h1是两个偏移函数
const h0 = (a) => add(-1.0, w1(a).div(w0(a).add(w1(a))));

const h1 = (a) => add(1.0, w3(a).div(w2(a).add(w3(a))));

/**
 * 双三次插值函数 - 对给定纹理节点执行双三次插值采样
 *
 * @param {TextureNode} textureNode - 要采样的纹理节点
 * @param {Node<vec4>} texelSize - 纹理像素尺寸信息（xy: 1/尺寸, zw: 尺寸）
 * @param {Node<float>} lod - LOD级别
 * @return {Node<vec4>} 双三次插值采样结果
 */
const bicubic = (textureNode, texelSize, lod) => {
  // 获取UV坐标
  const uv = textureNode.uvNode;
  // 将UV坐标缩放到纹理空间并偏移0.5
  const uvScaled = mul(uv, texelSize.zw).add(0.5);

  // 计算整数和小数部分
  const iuv = floor(uvScaled);
  const fuv = fract(uvScaled);

  // 计算X和Y方向的权重和偏移
  const g0x = g0(fuv.x);
  const g1x = g1(fuv.x);
  const h0x = h0(fuv.x);
  const h1x = h1(fuv.x);
  const h0y = h0(fuv.y);
  const h1y = h1(fuv.y);

  // 计算四个采样点的UV坐标
  const p0 = vec2(iuv.x.add(h0x), iuv.y.add(h0y)).sub(0.5).mul(texelSize.xy);
  const p1 = vec2(iuv.x.add(h1x), iuv.y.add(h0y)).sub(0.5).mul(texelSize.xy);
  const p2 = vec2(iuv.x.add(h0x), iuv.y.add(h1y)).sub(0.5).mul(texelSize.xy);
  const p3 = vec2(iuv.x.add(h1x), iuv.y.add(h1y)).sub(0.5).mul(texelSize.xy);

  // 执行双三次插值计算
  const a = g0(fuv.y).mul(add(g0x.mul(textureNode.sample(p0).level(lod)), g1x.mul(textureNode.sample(p1).level(lod))));
  const b = g1(fuv.y).mul(add(g0x.mul(textureNode.sample(p2).level(lod)), g1x.mul(textureNode.sample(p3).level(lod))));

  // 返回最终插值结果
  return a.add(b);
};

/**
 * TSL函数 - 对给定纹理节点应用mipped双三次纹理过滤
 *
 * @tsl
 * @function
 * @param {TextureNode} textureNode - 应进行过滤的纹理节点
 * @param {Node<float>} lodNode - 定义要采样的LOD级别
 * @return {Node} 过滤后的纹理采样
 */
export const textureBicubicLevel = /*@__PURE__*/ Fn(([textureNode, lodNode]) => {
  // 计算当前LOD级别的纹理尺寸
  const fLodSize = vec2(textureNode.size(int(lodNode)));
  // 计算下一个LOD级别的纹理尺寸
  const cLodSize = vec2(textureNode.size(int(lodNode.add(1.0))));
  // 计算尺寸的倒数
  const fLodSizeInv = div(1.0, fLodSize);
  const cLodSizeInv = div(1.0, cLodSize);
  // 对两个LOD级别执行双三次采样
  const fSample = bicubic(textureNode, vec4(fLodSizeInv, fLodSize), floor(lodNode));
  const cSample = bicubic(textureNode, vec4(cLodSizeInv, cLodSize), ceil(lodNode));

  // 在两个LOD级别之间进行线性插值
  return fract(lodNode).mix(fSample, cSample);
});

/**
 * TSL函数 - 对给定纹理节点应用mipped双三次纹理过滤
 *
 * @tsl
 * @function
 * @param {TextureNode} textureNode - 应进行过滤的纹理节点
 * @param {Node<float>} [strength] - 定义双三次过滤的强度
 * @return {Node} 过滤后的纹理采样
 */
export const textureBicubic = /*@__PURE__*/ Fn(([textureNode, strength]) => {
  // 根据强度计算LOD级别
  const lod = strength.mul(maxMipLevel(textureNode));

  // 调用带LOD级别的双三次过滤函数
  return textureBicubicLevel(textureNode, lod);
});
