// 导入世界空间位置方向访问器
import { positionWorldDirection } from "../accessors/Position.js";
// 导入TSL基础功能：函数定义和二维向量构造
import { Fn, vec2 } from "../tsl/TSLBase.js";

/**
 * TSL函数，用于创建等距柱状投影UV坐标节点。
 *
 * 等距柱状投影（Equirectangular Projection）是一种将球面映射到矩形的投影方式，
 * 常用于全景图像和环境贴图。该函数将3D方向向量转换为2D纹理坐标，
 * 使得等距柱状投影纹理能够正确地投影到3D几何体上。
 *
 * 可用于计算将等距柱状投影纹理投影到网格上的纹理坐标，
 * 通常用作场景的背景。
 *
 * 使用示例：
 * ```js
 * scene.backgroundNode = texture( equirectTexture, equirectUV() );
 * ```
 *
 * @tsl
 * @function
 * @param {?Node<vec3>} [dirNode=positionWorldDirection] - 用于采样的方向向量，默认为`positionWorldDirection`（世界空间位置方向）。
 * @returns {Node<vec2>} 返回计算得到的UV坐标（二维向量）。
 */
export const equirectUV = /*@__PURE__*/ Fn(([dir = positionWorldDirection]) => {
  // 计算U坐标：使用atan2函数计算方位角，然后归一化到[0,1]范围
  // atan(z, x) 计算从X轴到点(x,z)的角度，范围[-π, π]
  // 除以2π后范围变为[-0.5, 0.5]，加0.5后变为[0, 1]
  const u = dir.z
    .atan(dir.x)
    .mul(1 / (Math.PI * 2))
    .add(0.5);

  // 计算V坐标：使用asin函数计算仰角，然后归一化到[0,1]范围
  // 首先将Y分量限制在[-1, 1]范围内，然后计算反正弦值
  // asin的结果范围为[-π/2, π/2]，除以π后范围变为[-0.5, 0.5]，加0.5后变为[0, 1]
  const v = dir.y
    .clamp(-1.0, 1.0)
    .asin()
    .mul(1 / Math.PI)
    .add(0.5);

  // 返回UV坐标向量
  return vec2(u, v);
});
