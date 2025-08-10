/**
 * Constants.js
 *
 * 渲染器常量定义 - 定义渲染器使用的各种常量
 *
 * 这个模块定义了渲染器中使用的各种常量，包括属性类型、
 * GPU配置参数和混合因子等。
 */

/**
 * 属性类型枚举
 *
 * 表示不同的属性类型。这些类型用于区分几何体中不同用途的
 * 属性数据，如顶点数据、索引数据、存储数据等。
 *
 * @readonly
 * @enum {number}
 */
export const AttributeType = {
  /** 顶点属性 - 包含顶点位置、法线、UV坐标等数据 */
  VERTEX: 1,
  /** 索引属性 - 定义顶点连接关系的索引数据 */
  INDEX: 2,
  /** 存储属性 - 用于计算着色器的可读写存储缓冲区 */
  STORAGE: 3,
  /** 间接属性 - 用于间接绘制的参数缓冲区 */
  INDIRECT: 4,
};

/**
 * GPU块大小（字节）
 *
 * GPU内存对齐的基本块大小（STD140布局），通常为16字节。
 * 这个值用于计算uniform缓冲区的内存布局，确保数据按照GPU要求对齐。
 *
 * STD140是OpenGL和WebGL中uniform缓冲区的标准内存布局规范。
 *
 * @type {number}
 * @readonly
 */
export const GPU_CHUNK_BYTES = 16;

// @TODO: 移动到 src/constants.js

/**
 * 混合颜色因子
 *
 * 用于颜色混合的特殊因子，表示使用混合颜色作为混合因子。
 * 这是WebGL混合方程中的一个特殊常量。
 *
 * @type {number}
 * @readonly
 */
export const BlendColorFactor = 211;

/**
 * 一减混合颜色因子
 *
 * 用于颜色混合的特殊因子，表示使用(1 - 混合颜色)作为混合因子。
 * 这是WebGL混合方程中的一个特殊常量。
 *
 * @type {number}
 * @readonly
 */
export const OneMinusBlendColorFactor = 212;
