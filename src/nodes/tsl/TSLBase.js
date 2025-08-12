/**
 * TSLBase.js - Three.js 着色语言基础语法
 *
 * 该文件是TSL（Three.js Shading Language）的基础语法导出文件。
 * 它导出了TSL中最常用的函数和方法，为着色器编程提供了高级的、
 * 类型安全的编程接口。
 *
 * 注意：这里的导出列表包含副作用，不是纯函数导出。
 */

// ===== TSL核心语法 =====
// 导出TSL的核心功能：数据类型、函数定义、节点操作等
export * from "./TSLCore.js"; // float(), vec2(), vec3(), vec4(), mat3(), mat4(), Fn(), If(), element(), nodeObject(), nodeProxy(), ...

// ===== 核心节点功能 =====
export * from "../core/ArrayNode.js"; // array(), .toArray() - 数组节点和数组转换
export * from "../core/UniformNode.js"; // uniform() - 统一变量定义
export * from "../core/PropertyNode.js"; // property() - 属性访问 <-> TODO: 将材质属性分离到其他文件
export * from "../core/AssignNode.js"; // .assign() - 赋值操作
export * from "../code/FunctionCallNode.js"; // .call() - 函数调用
export * from "../core/ContextNode.js"; // .context() - 上下文管理
export * from "../core/VarNode.js"; // .var() - 变量声明 -> TODO: 可能重命名 .toVar() -> .var()
export * from "../core/VaryingNode.js"; // varying(), vertexStage() - 变化量和顶点阶段
export * from "../core/CacheNode.js"; // .cache() - 结果缓存
export * from "../core/BypassNode.js"; // .bypass() - 条件性跳过
export * from "../core/SubBuildNode.js"; // subBuild() - 子构建

// ===== 数学运算 =====
export * from "../math/OperatorNode.js"; // .add(), .sub(), ... - 数学运算符
export * from "../math/MathNode.js"; // abs(), floor(), ... - 数学函数
export * from "../math/ConditionalNode.js"; // select(), ... - 条件选择

// ===== 工具功能 =====
export * from "../utils/RemapNode.js"; // .remap(), .remapClamp() - 数值重映射
export * from "../utils/Discard.js"; // Discard(), Return() - 丢弃和返回操作
export * from "../utils/DebugNode.js"; // debug() - 调试功能

// ===== 显示和渲染 =====
export * from "../display/ColorSpaceNode.js"; // .toColorSpace() - 色彩空间转换
export * from "../display/ToneMappingNode.js"; // .toToneMapping() - 色调映射
export * from "../display/RenderOutputNode.js"; // .renderOutput() - 渲染输出

// ===== 数据访问 =====
export * from "../accessors/BufferAttributeNode.js"; // .toAttribute() - 缓冲区属性转换

// ===== GPU计算 =====
export * from "../gpgpu/ComputeNode.js"; // .compute() - GPU计算

// ===== 代码生成 =====
export * from "../code/ExpressionNode.js"; // expression() - 表达式节点

/**
 * 添加节点元素（已废弃）
 *
 * 该函数已被移除，改为支持tree-shaking优化。
 *
 * @deprecated 该函数已被移除
 * @param {string} name - 节点元素名称
 */
export function addNodeElement(name /*, nodeElement*/) {
  console.warn("THREE.TSL: AddNodeElement has been removed in favor of tree-shaking. Trying add", name);
}
