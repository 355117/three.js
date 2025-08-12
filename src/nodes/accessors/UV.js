// 导入属性节点函数
import { attribute } from "../core/AttributeNode.js";

/**
 * TSL函数 - 用于创建具有给定索引的UV属性节点
 *
 * @tsl
 * @function
 * @param {number} [index=0] - UV索引（0表示uv，1表示uv1，以此类推）
 * @return {AttributeNode<vec2>} UV属性节点
 */
export const uv = (index = 0) => attribute("uv" + (index > 0 ? index : ""), "vec2");
