// 导入TSL基础类型和函数
import { float, vec2, vec4, If, Fn } from "../tsl/TSLBase.js";
// 导入引用节点访问器
import { reference } from "../accessors/ReferenceNode.js";
// 导入纹理访问器
import { texture } from "../accessors/TextureNode.js";
// 导入数学函数节点
import { mix, fract, step, max, clamp } from "../math/MathNode.js";
// 导入运算符节点
import { add, sub } from "../math/OperatorNode.js";
// 导入渲染组
import { renderGroup } from "../core/UniformGroupNode.js";
// 导入节点材质类
import NodeMaterial from "../../materials/nodes/NodeMaterial.js";
// 导入对象位置访问器
import { objectPosition } from "../accessors/Object3DNode.js";
// 导入世界位置访问器
import { positionWorld } from "../accessors/Position.js";

// 用于存储阴影材质的弱映射，避免内存泄漏
const shadowMaterialLib = /*@__PURE__*/ new WeakMap();

/**
 * 执行基础过滤的阴影过滤函数。这实际上是阴影贴图的未过滤版本，
 * 具有二进制 `[0,1]` 结果。
 *
 * @method
 * @param {Object} inputs - 输入参数对象
 * @param {DepthTexture} inputs.depthTexture - 阴影贴图纹理数据的引用
 * @param {Node<vec3>} inputs.shadowCoord - 阴影坐标
 * @param {Node<float>} inputs.depthLayer - 深度层（用于数组纹理）
 * @return {Node<float>} 过滤结果
 */
export const BasicShadowFilter = /*@__PURE__*/ Fn(({ depthTexture, shadowCoord, depthLayer }) => {
  // 从阴影贴图中采样深度值
  let basic = texture(depthTexture, shadowCoord.xy).setName("t_basic");

  // 如果是数组纹理，需要指定深度层
  if (depthTexture.isArrayTexture) {
    basic = basic.depth(depthLayer);
  }

  // 比较采样深度与当前片段深度，返回阴影测试结果
  return basic.compare(shadowCoord.z);
});

/**
 * 执行PCF（百分比接近过滤）过滤的阴影过滤函数。
 *
 * @method
 * @param {Object} inputs - 输入参数对象
 * @param {DepthTexture} inputs.depthTexture - 阴影贴图纹理数据的引用
 * @param {Node<vec3>} inputs.shadowCoord - 阴影坐标
 * @param {LightShadow} inputs.shadow - 光源阴影对象
 * @param {Node<float>} inputs.depthLayer - 深度层（用于数组纹理）
 * @return {Node<float>} 过滤结果
 */
export const PCFShadowFilter = /*@__PURE__*/ Fn(({ depthTexture, shadowCoord, shadow, depthLayer }) => {
  // 深度比较函数，用于在指定UV坐标处进行阴影测试
  const depthCompare = (uv, compare) => {
    // 从阴影贴图中采样深度值
    let depth = texture(depthTexture, uv);

    // 如果是数组纹理，需要指定深度层
    if (depthTexture.isArrayTexture) {
      depth = depth.depth(depthLayer);
    }

    // 返回深度比较结果
    return depth.compare(compare);
  };

  // 获取阴影贴图尺寸和过滤半径
  const mapSize = reference("mapSize", "vec2", shadow).setGroup(renderGroup);
  const radius = reference("radius", "float", shadow).setGroup(renderGroup);

  // 计算纹理像素大小
  const texelSize = vec2(1).div(mapSize);
  // 计算各个方向的偏移量
  const dx0 = texelSize.x.negate().mul(radius); // 左偏移
  const dy0 = texelSize.y.negate().mul(radius); // 下偏移
  const dx1 = texelSize.x.mul(radius); // 右偏移
  const dy1 = texelSize.y.mul(radius); // 上偏移
  const dx2 = dx0.div(2); // 左半偏移
  const dy2 = dy0.div(2); // 下半偏移
  const dx3 = dx1.div(2); // 右半偏移
  const dy3 = dy1.div(2); // 上半偏移

  // 对17个采样点进行深度比较并求和，然后取平均值
  // 这些采样点形成一个5x5的网格模式，提供平滑的阴影边缘
  return add(
    depthCompare(shadowCoord.xy.add(vec2(dx0, dy0)), shadowCoord.z), // 左下角
    depthCompare(shadowCoord.xy.add(vec2(0, dy0)), shadowCoord.z), // 下方中心
    depthCompare(shadowCoord.xy.add(vec2(dx1, dy0)), shadowCoord.z), // 右下角
    depthCompare(shadowCoord.xy.add(vec2(dx2, dy2)), shadowCoord.z), // 左下半
    depthCompare(shadowCoord.xy.add(vec2(0, dy2)), shadowCoord.z), // 下半中心
    depthCompare(shadowCoord.xy.add(vec2(dx3, dy2)), shadowCoord.z), // 右下半
    depthCompare(shadowCoord.xy.add(vec2(dx0, 0)), shadowCoord.z), // 左方中心
    depthCompare(shadowCoord.xy.add(vec2(dx2, 0)), shadowCoord.z), // 左半中心
    depthCompare(shadowCoord.xy, shadowCoord.z), // 中心点
    depthCompare(shadowCoord.xy.add(vec2(dx3, 0)), shadowCoord.z), // 右半中心
    depthCompare(shadowCoord.xy.add(vec2(dx1, 0)), shadowCoord.z), // 右方中心
    depthCompare(shadowCoord.xy.add(vec2(dx2, dy3)), shadowCoord.z), // 左上半
    depthCompare(shadowCoord.xy.add(vec2(0, dy3)), shadowCoord.z), // 上半中心
    depthCompare(shadowCoord.xy.add(vec2(dx3, dy3)), shadowCoord.z), // 右上半
    depthCompare(shadowCoord.xy.add(vec2(dx0, dy1)), shadowCoord.z), // 左上角
    depthCompare(shadowCoord.xy.add(vec2(0, dy1)), shadowCoord.z), // 上方中心
    depthCompare(shadowCoord.xy.add(vec2(dx1, dy1)), shadowCoord.z) // 右上角
  ).mul(1 / 17); // 除以17得到平均值
});

/**
 * 执行PCF软过滤的阴影过滤函数。
 *
 * @method
 * @param {Object} inputs - 输入参数对象
 * @param {DepthTexture} inputs.depthTexture - 阴影贴图纹理数据的引用
 * @param {Node<vec3>} inputs.shadowCoord - 阴影坐标
 * @param {LightShadow} inputs.shadow - 光源阴影对象
 * @param {Node<float>} inputs.depthLayer - 深度层（用于数组纹理）
 * @return {Node<float>} 过滤结果
 */
export const PCFSoftShadowFilter = /*@__PURE__*/ Fn(({ depthTexture, shadowCoord, shadow, depthLayer }) => {
  // 深度比较函数，用于在指定UV坐标处进行阴影测试
  const depthCompare = (uv, compare) => {
    // 从阴影贴图中采样深度值
    let depth = texture(depthTexture, uv);

    // 如果是数组纹理，需要指定深度层
    if (depthTexture.isArrayTexture) {
      depth = depth.depth(depthLayer);
    }

    // 返回深度比较结果
    return depth.compare(compare);
  };

  // 获取阴影贴图尺寸
  const mapSize = reference("mapSize", "vec2", shadow).setGroup(renderGroup);

  // 计算纹理像素大小
  const texelSize = vec2(1).div(mapSize);
  const dx = texelSize.x; // X方向像素大小
  const dy = texelSize.y; // Y方向像素大小

  // 计算双线性插值的UV坐标和权重
  const uv = shadowCoord.xy;
  const f = fract(uv.mul(mapSize).add(0.5)); // 计算小数部分用于插值
  uv.subAssign(f.mul(texelSize)); // 调整UV到像素中心

  // 使用双线性插值进行9个采样点的软阴影过滤
  return add(
    depthCompare(uv, shadowCoord.z), // 左下角
    depthCompare(uv.add(vec2(dx, 0)), shadowCoord.z), // 右下角
    depthCompare(uv.add(vec2(0, dy)), shadowCoord.z), // 左上角
    depthCompare(uv.add(texelSize), shadowCoord.z), // 右上角
    // X方向的插值采样
    mix(depthCompare(uv.add(vec2(dx.negate(), 0)), shadowCoord.z), depthCompare(uv.add(vec2(dx.mul(2), 0)), shadowCoord.z), f.x),
    mix(depthCompare(uv.add(vec2(dx.negate(), dy)), shadowCoord.z), depthCompare(uv.add(vec2(dx.mul(2), dy)), shadowCoord.z), f.x),
    // Y方向的插值采样
    mix(depthCompare(uv.add(vec2(0, dy.negate())), shadowCoord.z), depthCompare(uv.add(vec2(0, dy.mul(2))), shadowCoord.z), f.y),
    mix(depthCompare(uv.add(vec2(dx, dy.negate())), shadowCoord.z), depthCompare(uv.add(vec2(dx, dy.mul(2))), shadowCoord.z), f.y),
    // 双向插值采样
    mix(
      mix(depthCompare(uv.add(vec2(dx.negate(), dy.negate())), shadowCoord.z), depthCompare(uv.add(vec2(dx.mul(2), dy.negate())), shadowCoord.z), f.x),
      mix(depthCompare(uv.add(vec2(dx.negate(), dy.mul(2))), shadowCoord.z), depthCompare(uv.add(vec2(dx.mul(2), dy.mul(2))), shadowCoord.z), f.x),
      f.y
    )
  ).mul(1 / 9); // 除以9得到平均值
});

/**
 * 执行VSM（方差阴影映射）过滤的阴影过滤函数。
 *
 * @method
 * @param {Object} inputs - 输入参数对象
 * @param {DepthTexture} inputs.depthTexture - 阴影贴图纹理数据的引用
 * @param {Node<vec3>} inputs.shadowCoord - 阴影坐标
 * @param {Node<float>} inputs.depthLayer - 深度层（用于数组纹理）
 * @return {Node<float>} 过滤结果
 */
export const VSMShadowFilter = /*@__PURE__*/ Fn(({ depthTexture, shadowCoord, depthLayer }) => {
  // 初始化遮挡值为1（完全照亮）
  const occlusion = float(1).toVar();

  // 从VSM纹理中采样深度分布（包含深度均值和深度平方均值）
  let distribution = texture(depthTexture).sample(shadowCoord.xy);

  // 如果是数组纹理，需要指定深度层
  if (depthTexture.isArrayTexture) {
    distribution = distribution.depth(depthLayer);
  }

  // 获取RG通道（深度均值和深度平方均值）
  distribution = distribution.rg;

  // 执行硬阴影测试（基础深度比较）
  const hardShadow = step(shadowCoord.z, distribution.x);

  // 如果硬阴影测试失败，执行软阴影计算
  If(hardShadow.notEqual(float(1.0)), () => {
    // 计算当前深度与均值深度的差值
    const distance = shadowCoord.z.sub(distribution.x);
    // 计算方差（深度平方均值 - 深度均值的平方）
    const variance = max(0, distribution.y.mul(distribution.y));
    // 使用切比雪夫不等式计算软阴影概率
    let softnessProbability = variance.div(variance.add(distance.mul(distance))); // 切比雪夫不等式
    // 应用偏移和缩放以减少光泄漏
    softnessProbability = clamp(sub(softnessProbability, 0.3).div(0.95 - 0.3));
    // 取硬阴影和软阴影概率的最大值作为最终遮挡值
    occlusion.assign(clamp(max(hardShadow, softnessProbability)));
  });

  // 返回遮挡值
  return occlusion;
});

// 辅助函数和材质管理

/**
 * 计算线性距离的TSL函数，用于点光源阴影的深度计算。
 *
 * @param {Array} params - 参数数组 [position, cameraNear, cameraFar]
 * @return {Node<float>} 归一化的线性距离
 */
const linearDistance = /*@__PURE__*/ Fn(([position, cameraNear, cameraFar]) => {
  // 计算世界位置到光源位置的距离
  let dist = positionWorld.sub(position).length();
  // 将距离映射到[0,1]范围内
  dist = dist.sub(cameraNear).div(cameraFar.sub(cameraNear));
  dist = dist.saturate(); // 限制到 [0, 1] 范围

  return dist;
});

/**
 * 计算点光源的线性阴影距离。
 *
 * @param {Light} light - 光源对象
 * @return {Node<float>} 线性阴影距离节点
 */
const linearShadowDistance = (light) => {
  // 获取阴影相机
  const camera = light.shadow.camera;

  // 获取相机的近平面和远平面距离
  const nearDistance = reference("near", "float", camera).setGroup(renderGroup);
  const farDistance = reference("far", "float", camera).setGroup(renderGroup);

  // 获取光源的世界位置
  const referencePosition = objectPosition(light);

  // 返回线性距离计算结果
  return linearDistance(referencePosition, nearDistance, farDistance);
};

/**
 * 获取或创建给定光源的阴影材质。
 *
 * 此函数检查提供的光源是否已存在阴影材质。
 * 如果不存在，则创建一个配置用于阴影渲染的新 `NodeMaterial` 并将其存储在
 * `shadowMaterialLib` 中以供将来使用。
 *
 * @param {Object} light - 需要阴影材质的光源对象。
 *                         如果是点光源，将使用线性阴影距离计算深度节点。
 * @returns {NodeMaterial} 与给定光源关联的阴影材质
 */
export const getShadowMaterial = (light) => {
  // 尝试从缓存中获取已存在的材质
  let material = shadowMaterialLib.get(light);

  // 如果材质不存在，创建新的阴影材质
  if (material === undefined) {
    // 对于点光源，使用线性阴影距离；其他光源使用null
    const depthNode = light.isPointLight ? linearShadowDistance(light) : null;

    // 创建新的节点材质
    material = new NodeMaterial();
    material.colorNode = vec4(0, 0, 0, 1); // 设置为黑色
    material.depthNode = depthNode; // 设置深度节点
    material.isShadowPassMaterial = true; // 标记为阴影通道材质，避免其他覆盖材质意外覆盖colorNode
    material.name = "ShadowMaterial"; // 设置材质名称
    material.fog = false; // 禁用雾效

    // 将材质存储到缓存中
    shadowMaterialLib.set(light, material);
  }

  // 返回材质
  return material;
};
