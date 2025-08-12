import Node from "../core/Node.js"; // 导入Node基类
import { nodeImmutable, float, Fn } from "../tsl/TSLBase.js"; // 导入TSL核心函数

import { BackSide, DoubleSide, WebGLCoordinateSystem } from "../../constants.js"; // 导入常量

/**
 * 此节点可用于评估图元是正面还是背面朝向。
 *
 * @augments Node
 */
class FrontFacingNode extends Node {
  // 定义FrontFacingNode类，继承自Node

  static get type() {
    // 静态getter方法，返回节点类型

    return "FrontFacingNode"; // 返回节点类型字符串
  }

  /**
   * 构造一个新的正面朝向节点。
   */
  constructor() {
    // 构造函数

    super("bool"); // 调用父类构造函数，类型为bool

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isFrontFacingNode = true; // 标识这是一个正面朝向节点对象
  }

  generate(builder) {
    // 生成着色器代码的方法

    if (builder.shaderStage !== "fragment") return "true"; // 如果不是片段着色器阶段，返回true

    //

    const { renderer, material } = builder; // 解构获取渲染器和材质

    if (renderer.coordinateSystem === WebGLCoordinateSystem) {
      // 如果是WebGL坐标系

      if (material.side === BackSide) {
        // 如果材质设置为背面

        return "false"; // 返回false
      }
    }

    return builder.getFrontFacing(); // 返回构建器的正面朝向状态
  }
}

export default FrontFacingNode; // 导出FrontFacingNode类作为默认导出

/**
 * 表示图元是正面还是背面朝向的TSL对象
 *
 * @tsl
 * @type {FrontFacingNode<bool>}
 */
export const frontFacing = /*@__PURE__*/ nodeImmutable(FrontFacingNode); // 导出不可变的正面朝向节点

/**
 * 表示正面朝向状态为数字而不是布尔值的TSL对象。
 * `1` 表示正面朝向，`-1` 表示背面朝向。
 *
 * @tsl
 * @type {Node<float>}
 */
export const faceDirection = /*@__PURE__*/ float(frontFacing).mul(2.0).sub(1.0); // 导出面朝向方向，将布尔值转换为1或-1

/**
 * 根据材质的面设置将方向向量转换为面方向向量。
 *
 * 如果材质设置为 `BackSide`，方向会被反转。
 * 如果材质设置为 `DoubleSide`，方向会乘以 `faceDirection`。
 *
 * @tsl
 * @param {Node<vec3>} direction - 要转换的方向向量。
 * @returns {Node<vec3>} 转换后的方向向量。
 */
export const directionToFaceDirection = /*@__PURE__*/ Fn(([direction], { material }) => {
  // 导出方向到面方向的转换函数

  const side = material.side; // 获取材质的面设置

  if (side === BackSide) {
    // 如果是背面

    direction = direction.mul(-1.0); // 反转方向
  } else if (side === DoubleSide) {
    // 如果是双面

    direction = direction.mul(faceDirection); // 乘以面方向
  }

  return direction; // 返回转换后的方向
});
