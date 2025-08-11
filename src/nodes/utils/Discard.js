// 导入条件节点的选择函数
import { select } from "../math/ConditionalNode.js";
// 导入表达式节点的表达式函数
import { expression } from "../code/ExpressionNode.js";
// 导入TSL核心的方法链添加函数
import { addMethodChaining } from "../tsl/TSLCore.js";

/**
 * 表示TSL中的`discard`着色器操作。
 *
 * `discard`操作用于在片段着色器中丢弃当前片段，
 * 使其不会被写入到帧缓冲区中。这通常用于实现透明效果或裁剪。
 * 当条件为真时，片段将被丢弃，不会进行后续的渲染处理。
 *
 * @tsl
 * @function
 * @param {?ConditionalNode} conditional - 可选的条件节点。允许决定是否执行discard操作。
 * @return {Node} `discard`表达式节点。
 */
export const Discard = (conditional) => (conditional ? select(conditional, expression("discard")) : expression("discard")).toStack();

/**
 * 表示TSL中的`return`着色器操作。
 *
 * `return`操作用于从当前函数中提前返回，
 * 终止函数的执行并返回到调用者。这在着色器函数中
 * 用于控制执行流程，避免执行不必要的代码。
 *
 * @tsl
 * @function
 * @return {Node} `return`表达式节点。
 */
export const Return = () => expression("return").toStack();

// 将discard函数添加到方法链中，使其可以作为节点的方法调用
// 例如：someNode.discard(condition) 等价于 Discard(condition)
addMethodChaining("discard", Discard);
