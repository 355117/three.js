// 导入视图空间法线访问器
import { normalView } from "../accessors/Normal.js";
// 导入视图空间位置方向访问器
import { positionViewDirection } from "../accessors/Position.js";
// 导入TSL基础功能：函数定义、二维向量和三维向量构造
import { Fn, vec2, vec3 } from "../tsl/TSLBase.js";

/**
 * TSL函数，用于创建Matcap UV坐标节点。
 *
 * Matcap（Material Capture，材质捕获）是一种基于图像的光照技术，
 * 它使用一个球形纹理来模拟复杂的材质和光照效果。该技术通过将
 * 3D表面的法线映射到2D纹理坐标来实现快速的材质渲染。
 *
 * 该函数计算将Matcap纹理投影到网格上所需的纹理坐标。
 * 计算过程基于视图空间中的法线和位置方向，生成适合Matcap
 * 采样的UV坐标。
 *
 * 主要用于 {@link MeshMatcapNodeMaterial} 材质。
 *
 * @tsl
 * @function
 * @returns {Node<vec2>} Matcap UV坐标（二维向量）。
 */
export const matcapUV = /*@__PURE__*/ Fn(() => {
  // 构建视图空间的切线向量X
  // 使用视图方向的Z和X分量，Y分量设为0，然后归一化
  // 这创建了一个垂直于视图方向的水平向量
  const x = vec3(positionViewDirection.z, 0, positionViewDirection.x.negate()).normalize();

  // 通过视图方向与X向量的叉积计算Y向量
  // 这确保了X、Y、视图方向构成一个正交坐标系
  const y = positionViewDirection.cross(x);

  // 计算最终的UV坐标
  // 使用法线与X、Y向量的点积来获取纹理坐标
  // 乘以0.495是为了移除由于Matcap圆盘尺寸不足造成的伪影
  // 加0.5将坐标从[-0.495, 0.495]范围映射到[0.005, 0.995]范围
  return vec2(x.dot(normalView), y.dot(normalView)).mul(0.495).add(0.5);
})
  .once(["NORMAL", "VERTEX"])()
  .toVar("matcapUV");
