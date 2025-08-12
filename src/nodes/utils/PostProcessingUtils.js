// 导入TSL基础功能：数学函数和向量构造
import { abs, cross, float, Fn, normalize, ivec2, sub, vec2, vec3, vec4 } from "../tsl/TSLBase.js";
// 导入纹理尺寸访问器
import { textureSize } from "../accessors/TextureSizeNode.js";
// 导入纹理加载访问器
import { textureLoad } from "../accessors/TextureNode.js";
// 导入WebGPU坐标系常量
import { WebGPUCoordinateSystem } from "../../constants.js";

/**
 * 基于片段的屏幕位置（UV坐标表示）、深度值和相机的逆投影矩阵计算视图空间中的位置。
 *
 * 该函数是后处理管线中的核心工具，用于从屏幕空间信息重建3D位置。
 * 这在许多后处理效果中都很重要，如：
 * - 屏幕空间环境光遮蔽（SSAO）
 * - 屏幕空间反射（SSR）
 * - 延迟渲染管线
 * - 体积光效果
 *
 * 重建过程：
 * 1. 将屏幕坐标转换为裁剪空间坐标
 * 2. 使用逆投影矩阵变换到视图空间
 * 3. 执行透视除法得到最终位置
 *
 * @tsl
 * @function
 * @param {Node<vec2>} screenPosition - 片段的屏幕位置，以UV坐标表示（范围[0,1]）。
 * @param {Node<float>} depth - 片段的深度值。
 * @param {Node<mat4>} projectionMatrixInverse - 相机的逆投影矩阵。
 * @return {Node<vec3>} 片段在视图空间中的位置。
 */
export const getViewPosition = /*@__PURE__*/ Fn(([screenPosition, depth, projectionMatrixInverse], builder) => {
  let clipSpacePosition;

  // 根据渲染器的坐标系统处理坐标转换
  if (builder.renderer.coordinateSystem === WebGPUCoordinateSystem) {
    // WebGPU坐标系：Y轴向上，深度范围[0,1]
    screenPosition = vec2(screenPosition.x, screenPosition.y.oneMinus()).mul(2.0).sub(1.0);
    clipSpacePosition = vec4(vec3(screenPosition, depth), 1.0);
  } else {
    // OpenGL坐标系：Y轴向上，深度范围[-1,1]
    clipSpacePosition = vec4(vec3(screenPosition.x, screenPosition.y.oneMinus(), depth).mul(2.0).sub(1.0), 1.0);
  }

  // 使用逆投影矩阵将裁剪空间坐标变换到视图空间
  const viewSpacePosition = vec4(projectionMatrixInverse.mul(clipSpacePosition));

  // 执行透视除法，得到最终的视图空间位置
  return viewSpacePosition.xyz.div(viewSpacePosition.w);
});

/**
 * 基于片段在视图空间中的位置和相机的投影矩阵计算屏幕位置（UV坐标表示）。
 *
 * 该函数是getViewPosition的逆操作，将3D视图空间位置投影回屏幕空间。
 * 这在以下场景中非常有用：
 * - 屏幕空间反射中的反射点计算
 * - 重投影技术（如时间抗锯齿TAA）
 * - 运动模糊效果
 * - 屏幕空间粒子系统
 *
 * 投影过程：
 * 1. 使用投影矩阵将视图空间位置变换到裁剪空间
 * 2. 执行透视除法得到标准化设备坐标（NDC）
 * 3. 将NDC坐标映射到UV坐标范围[0,1]
 *
 * @tsl
 * @function
 * @param {Node<vec3>} viewPosition - 片段在视图空间中的位置。
 * @param {Node<mat4>} projectionMatrix - 相机的投影矩阵。
 * @return {Node<vec2>} 片段的屏幕位置，以UV坐标表示（范围[0,1]）。
 */
export const getScreenPosition = /*@__PURE__*/ Fn(([viewPosition, projectionMatrix]) => {
  // 使用投影矩阵将视图空间位置变换到裁剪空间
  const sampleClipPos = projectionMatrix.mul(vec4(viewPosition, 1.0));

  // 执行透视除法并转换到UV坐标系
  // 1. 除以w分量得到NDC坐标（范围[-1,1]）
  // 2. 乘以0.5并加0.5映射到[0,1]范围
  const sampleUv = sampleClipPos.xy.div(sampleClipPos.w).mul(0.5).add(0.5).toVar();

  // 翻转Y坐标以匹配纹理坐标系（Y轴向下）
  return vec2(sampleUv.x, sampleUv.y.oneMinus());
});

/**
 * 基于深度数据计算法线向量。
 *
 * 该函数可以作为后备方案，当没有法线渲染目标可用或需要平坦表面法线时使用。
 * 通过分析深度缓冲区中相邻像素的深度变化来重建表面法线。
 *
 * 这种技术在以下场景中很有用：
 * - 延迟渲染管线中缺少法线缓冲区时
 * - 屏幕空间环境光遮蔽（SSAO）
 * - 边缘检测和轮廓渲染
 * - 深度感知的后处理效果
 *
 * 算法原理：
 * 1. 采样当前像素及其周围的深度值
 * 2. 重建这些点在视图空间中的3D位置
 * 3. 计算相邻点之间的向量差
 * 4. 使用叉积计算表面法线
 *
 * @tsl
 * @function
 * @param {Node<vec2>} uv - 纹理坐标。
 * @param {DepthTexture} depthTexture - 深度纹理。
 * @param {Node<mat4>} projectionMatrixInverse - 相机的逆投影矩阵。
 * @return {Node<vec3>} 计算得到的法线向量。
 */
export const getNormalFromDepth = /*@__PURE__*/ Fn(([uv, depthTexture, projectionMatrixInverse]) => {
  // 获取深度纹理的尺寸
  const size = textureSize(textureLoad(depthTexture));
  // 将UV坐标转换为像素坐标
  const p = ivec2(uv.mul(size)).toVar();

  // 采样中心像素的深度值
  const c0 = textureLoad(depthTexture, p).toVar();

  // 采样周围8个方向的深度值，用于计算梯度
  // 左侧两个像素
  const l2 = textureLoad(depthTexture, p.sub(ivec2(2, 0))).toVar();
  const l1 = textureLoad(depthTexture, p.sub(ivec2(1, 0))).toVar();
  // 右侧两个像素
  const r1 = textureLoad(depthTexture, p.add(ivec2(1, 0))).toVar();
  const r2 = textureLoad(depthTexture, p.add(ivec2(2, 0))).toVar();
  // 下方两个像素
  const b2 = textureLoad(depthTexture, p.add(ivec2(0, 2))).toVar();
  const b1 = textureLoad(depthTexture, p.add(ivec2(0, 1))).toVar();
  // 上方两个像素
  const t1 = textureLoad(depthTexture, p.sub(ivec2(0, 1))).toVar();
  const t2 = textureLoad(depthTexture, p.sub(ivec2(0, 2))).toVar();

  // 计算各个方向的深度梯度，用于选择最佳的差分方向
  // 使用二阶差分来减少噪声：2*邻近值 - 远端值
  const dl = abs(sub(float(2).mul(l1).sub(l2), c0)).toVar(); // 左侧梯度
  const dr = abs(sub(float(2).mul(r1).sub(r2), c0)).toVar(); // 右侧梯度
  const db = abs(sub(float(2).mul(b1).sub(b2), c0)).toVar(); // 下方梯度
  const dt = abs(sub(float(2).mul(t1).sub(t2), c0)).toVar(); // 上方梯度

  // 重建中心点在视图空间中的位置
  const ce = getViewPosition(uv, c0, projectionMatrixInverse).toVar();

  // 选择梯度较小的方向进行差分计算，以获得更稳定的结果
  // X方向的位置差分：选择左侧或右侧梯度较小的方向
  const dpdx = dl.lessThan(dr).select(
    // 使用左侧：中心点 - 左侧点
    ce.sub(getViewPosition(uv.sub(vec2(float(1).div(size.x), 0)), l1, projectionMatrixInverse)),
    // 使用右侧：右侧点 - 中心点
    ce.negate().add(getViewPosition(uv.add(vec2(float(1).div(size.x), 0)), r1, projectionMatrixInverse))
  );

  // Y方向的位置差分：选择下方或上方梯度较小的方向
  const dpdy = db.lessThan(dt).select(
    // 使用下方：中心点 - 下方点
    ce.sub(getViewPosition(uv.add(vec2(0, float(1).div(size.y))), b1, projectionMatrixInverse)),
    // 使用上方：上方点 - 中心点
    ce.negate().add(getViewPosition(uv.sub(vec2(0, float(1).div(size.y))), t1, projectionMatrixInverse))
  );

  // 使用叉积计算表面法线并归一化
  return normalize(cross(dpdx, dpdy));
});
