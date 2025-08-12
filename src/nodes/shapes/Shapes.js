// 从TSL基础模块导入Fn函数（用于创建着色器函数）、float函数（浮点数类型）和select函数（条件选择）
import { Fn, float, select } from "../tsl/TSLBase.js";
// 从数学节点模块导入lengthSq函数（计算向量长度的平方）和smoothstep函数（平滑插值）
import { lengthSq, smoothstep } from "../math/MathNode.js";
// 从UV访问器模块导入uv函数，用于获取纹理坐标
import { uv } from "../accessors/UV.js";

/**
 * 基于UV坐标生成圆形形状
 * Generates a circle based on the uv coordinates.
 *
 * @tsl
 * @function
 * @param {Node<vec2>} coord - 用于生成圆形的UV坐标 The uv to generate the circle.
 * @return {Node<float>} 圆形形状数据 The circle shape.
 */
// 导出圆形形状函数，接收坐标参数以及渲染器和材质上下文
export const shapeCircle = Fn(([coord = uv()], { renderer, material }) => {
  // 计算从中心点(-1到1范围)到当前坐标的距离的平方
  // 将UV坐标乘以2并减去1，将坐标范围从[0,1]转换为[-1,1]
  const len2 = lengthSq(coord.mul(2).sub(1));

  // 声明透明度变量
  let alpha;

  // 如果材质启用了alphaToCoverage且渲染器采样数大于1（抗锯齿模式）
  if (material.alphaToCoverage && renderer.samples > 1) {
    // 计算距离平方的屏幕空间导数，用于抗锯齿处理
    const dlen = float(len2.fwidth()).toVar();

    // 使用smoothstep函数创建平滑的圆形边缘，减少锯齿效果
    // 在(1-dlen)到(1+dlen)范围内进行平滑插值，然后取反得到圆形内部为1，外部为0
    alpha = smoothstep(dlen.oneMinus(), dlen.add(1), len2).oneMinus();
  } else {
    // 简单模式：如果距离平方大于1（圆形外部），透明度为0，否则为1
    alpha = select(len2.greaterThan(1.0), 0, 1);
  }

  // 返回计算得到的透明度值
  return alpha;
});
