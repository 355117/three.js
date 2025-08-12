// 三角噪声3D实现
// 参考: https://github.com/cabbibo/glsl-tri-noise-3d

// 从工具模块导入循环节点
import { Loop } from "../utils/LoopNode.js";
// 从TSL基础模块导入浮点数、三维向量和函数构造器
import { float, vec3, Fn } from "../tsl/TSLBase.js";

// 三角函数：计算输入值的小数部分减去0.5后的绝对值
const tri = /*@__PURE__*/ Fn(([x]) => {
  return x.fract().sub(0.5).abs(); // 返回 |fract(x) - 0.5|
}).setLayout({
  name: "tri", // 函数名称
  type: "float", // 返回类型为浮点数
  inputs: [
    { name: "x", type: "float" }, // 输入参数x，类型为浮点数
  ],
});

// 三维三角函数：对三维向量的每个分量应用三角函数的组合
const tri3 = /*@__PURE__*/ Fn(([p]) => {
  // 返回三维向量，每个分量都是三角函数的嵌套调用
  return vec3(
    tri(p.z.add(tri(p.y.mul(1)))), // x分量：tri(z + tri(y))
    tri(p.z.add(tri(p.x.mul(1)))), // y分量：tri(z + tri(x))
    tri(p.y.add(tri(p.x.mul(1)))) // z分量：tri(y + tri(x))
  );
}).setLayout({
  name: "tri3", // 函数名称
  type: "vec3", // 返回类型为三维向量
  inputs: [
    { name: "p", type: "vec3" }, // 输入参数p，类型为三维向量
  ],
});

/**
 * 根据给定的位置、速度和时间参数生成噪声值。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} position - 位置。
 * @param {Node<float>} speed - 速度。
 * @param {Node<float>} time - 时间。
 * @return {Node<float>} 生成的噪声值。
 */
export const triNoise3D = /*@__PURE__*/ Fn(([position, speed, time]) => {
  const p = vec3(position).toVar(); // 位置向量，可变
  const z = float(1.4).toVar(); // 缩放因子，初始值1.4
  const rz = float(0.0).toVar(); // 结果累积器，初始值0
  const bp = vec3(p).toVar(); // 基础位置向量，p的副本

  // 循环3次（从0到3，包含3）
  Loop({ start: float(0.0), end: float(3.0), type: "float", condition: "<=" }, () => {
    const dg = vec3(tri3(bp.mul(2.0))).toVar(); // 计算梯度：tri3(bp * 2.0)
    p.addAssign(dg.add(time.mul(float(0.1).mul(speed)))); // 更新位置：p += dg + time * 0.1 * speed
    bp.mulAssign(1.8); // 缩放基础位置：bp *= 1.8
    z.mulAssign(1.5); // 缩放因子：z *= 1.5
    p.mulAssign(1.2); // 缩放位置：p *= 1.2

    const t = float(tri(p.z.add(tri(p.x.add(tri(p.y)))))).toVar(); // 计算三角函数嵌套：tri(z + tri(x + tri(y)))
    rz.addAssign(t.div(z)); // 累积结果：rz += t / z
    bp.addAssign(0.14); // 偏移基础位置：bp += 0.14
  });

  return rz; // 返回累积的噪声值
}).setLayout({
  name: "triNoise3D", // 函数名称
  type: "float", // 返回类型为浮点数
  inputs: [
    { name: "position", type: "vec3" }, // 位置参数，三维向量
    { name: "speed", type: "float" }, // 速度参数，浮点数
    { name: "time", type: "float" }, // 时间参数，浮点数
  ],
});
