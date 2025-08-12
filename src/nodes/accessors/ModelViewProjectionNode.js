// 导入TSL函数
import { Fn } from "../tsl/TSLCore.js";

/**
 * TSL对象 - 表示当前渲染对象经过模型-视图-投影变换后在裁剪空间中的位置
 *
 * @tsl
 * @type {VaryingNode<vec4>}
 */
export const modelViewProjection = /*@__PURE__*/ Fn((builder) => {
  // 通过构建器上下文设置模型视图投影变换
  return builder.context.setupModelViewProjection();
}, "vec4")
  .once()()
  .toVarying("v_modelViewProjection");
