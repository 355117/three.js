/**
 * Timer.js - 时间相关的工具节点
 *
 * 该文件提供了用于着色器中时间计算的统一变量节点。
 * 包括总时间、帧间隔时间和帧ID等时间相关的数据。
 */

// 导入渲染组节点
import { renderGroup } from "../core/UniformGroupNode.js";
// 导入统一变量节点
import { uniform } from "../core/UniformNode.js";

/**
 * 表示从应用启动开始的累计时间（秒）
 *
 * 该节点提供了一个持续递增的时间值，常用于：
 * - 动画计算
 * - 周期性效果
 * - 时间相关的着色器效果
 *
 * @tsl
 * @type {UniformNode<float>}
 */
export const time = /*@__PURE__*/ uniform(0)
  .setGroup(renderGroup)
  .onRenderUpdate((frame) => frame.time);

/**
 * 表示当前帧与上一帧之间的时间间隔（秒）
 *
 * 该节点提供了帧间时间差，常用于：
 * - 帧率无关的动画
 * - 平滑的运动计算
 * - 时间步长相关的物理模拟
 *
 * @tsl
 * @type {UniformNode<float>}
 */
export const deltaTime = /*@__PURE__*/ uniform(0)
  .setGroup(renderGroup)
  .onRenderUpdate((frame) => frame.deltaTime);

/**
 * 表示当前渲染帧的唯一标识符
 *
 * 该节点提供了一个递增的帧计数器，常用于：
 * - 基于帧的随机数生成
 * - 帧相关的缓存策略
 * - 调试和性能分析
 *
 * @tsl
 * @type {UniformNode<uint>}
 */
export const frameId = /*@__PURE__*/ uniform(0, "uint")
  .setGroup(renderGroup)
  .onRenderUpdate((frame) => frame.frameId);
