import TempNode from "../core/TempNode.js"; // 导入TempNode基类
import { addMethodChaining, mat3, nodeObject, vec4 } from "../tsl/TSLCore.js"; // 导入TSL核心函数

import { SRGBTransfer } from "../../constants.js"; // 导入sRGB传输函数常量
import { ColorManagement } from "../../math/ColorManagement.js"; // 导入颜色管理
import { sRGBTransferEOTF, sRGBTransferOETF } from "./ColorSpaceFunctions.js"; // 导入色彩空间转换函数
import { Matrix3 } from "../../math/Matrix3.js"; // 导入Matrix3类

const WORKING_COLOR_SPACE = "WorkingColorSpace"; // 工作色彩空间常量
const OUTPUT_COLOR_SPACE = "OutputColorSpace"; // 输出色彩空间常量

/**
 * 此节点表示色彩空间转换。即它将
 * 颜色值从源色彩空间转换为目标色彩空间。
 *
 * @augments TempNode
 */
class ColorSpaceNode extends TempNode {
  // 定义ColorSpaceNode类，继承自TempNode

  static get type() {
    // 静态getter方法，返回节点类型

    return "ColorSpaceNode"; // 返回节点类型字符串
  }

  /**
   * 构造一个新的色彩空间节点。
   *
   * @param {Node} colorNode - 表示要转换的颜色。
   * @param {string} source - 源色彩空间。
   * @param {string} target - 目标色彩空间。
   */
  constructor(colorNode, source, target) {
    // 构造函数，接受颜色节点、源和目标色彩空间

    super("vec4"); // 调用父类构造函数，类型为vec4

    /**
     * 表示要转换的颜色。
     *
     * @type {Node}
     */
    this.colorNode = colorNode; // 存储颜色节点

    /**
     * 源色彩空间。
     *
     * @type {string}
     */
    this.source = source; // 存储源色彩空间

    /**
     * 目标色彩空间。
     *
     * @type {string}
     */
    this.target = target; // 存储目标色彩空间
  }

  /**
   * 此方法根据颜色管理和渲染器的当前配置
   * 解析常量 `WORKING_COLOR_SPACE` 和 `OUTPUT_COLOR_SPACE`。
   *
   * @param {NodeBuilder} builder - 当前节点构建器。
   * @param {string} colorSpace - 要解析的色彩空间。
   * @return {string} 解析后的色彩空间。
   */
  resolveColorSpace(builder, colorSpace) {
    // 解析色彩空间的方法

    if (colorSpace === WORKING_COLOR_SPACE) {
      // 如果是工作色彩空间

      return ColorManagement.workingColorSpace; // 返回颜色管理的工作色彩空间
    } else if (colorSpace === OUTPUT_COLOR_SPACE) {
      // 如果是输出色彩空间

      return builder.context.outputColorSpace || builder.renderer.outputColorSpace; // 返回上下文或渲染器的输出色彩空间
    }

    return colorSpace; // 返回原始色彩空间
  }

  setup(builder) {
    // 设置方法

    const { colorNode } = this; // 解构获取颜色节点

    const source = this.resolveColorSpace(builder, this.source); // 解析源色彩空间
    const target = this.resolveColorSpace(builder, this.target); // 解析目标色彩空间

    let outputNode = colorNode; // 初始化输出节点为颜色节点

    if (ColorManagement.enabled === false || source === target || !source || !target) {
      // 如果颜色管理未启用或源目标相同或为空

      return outputNode; // 直接返回输出节点
    }

    if (ColorManagement.getTransfer(source) === SRGBTransfer) {
      // 如果源色彩空间使用sRGB传输函数

      outputNode = vec4(sRGBTransferEOTF(outputNode.rgb), outputNode.a); // 应用sRGB到线性转换
    }

    if (ColorManagement.getPrimaries(source) !== ColorManagement.getPrimaries(target)) {
      // 如果源和目标的原色不同

      outputNode = vec4(
        // 创建新的vec4
        mat3(ColorManagement._getMatrix(new Matrix3(), source, target)).mul(outputNode.rgb), // 应用色彩空间转换矩阵
        outputNode.a // 保持alpha通道
      );
    }

    if (ColorManagement.getTransfer(target) === SRGBTransfer) {
      // 如果目标色彩空间使用sRGB传输函数

      outputNode = vec4(sRGBTransferOETF(outputNode.rgb), outputNode.a); // 应用线性到sRGB转换
    }

    return outputNode; // 返回转换后的输出节点
  }
}

export default ColorSpaceNode; // 导出ColorSpaceNode类作为默认导出

/**
 * 用于将给定颜色节点从当前工作色彩空间转换为给定色彩空间的TSL函数。
 *
 * @tsl
 * @function
 * @param {Node} node - 表示要转换的节点。
 * @param {string} targetColorSpace - 目标色彩空间。
 * @returns {ColorSpaceNode}
 */
export const workingToColorSpace = (node, targetColorSpace) => nodeObject(new ColorSpaceNode(nodeObject(node), WORKING_COLOR_SPACE, targetColorSpace)); // 导出工作空间到色彩空间的转换函数

/**
 * 用于将给定颜色节点从给定色彩空间转换为当前工作色彩空间的TSL函数。
 *
 * @tsl
 * @function
 * @param {Node} node - 表示要转换的节点。
 * @param {string} sourceColorSpace - 源色彩空间。
 * @returns {ColorSpaceNode}
 */
export const colorSpaceToWorking = (node, sourceColorSpace) => nodeObject(new ColorSpaceNode(nodeObject(node), sourceColorSpace, WORKING_COLOR_SPACE)); // 导出色彩空间到工作空间的转换函数

/**
 * 用于将给定颜色节点从一个色彩空间转换为另一个色彩空间的TSL函数。
 *
 * @tsl
 * @function
 * @param {Node} node - 表示要转换的节点。
 * @param {string} sourceColorSpace - 源色彩空间。
 * @param {string} targetColorSpace - 目标色彩空间。
 * @returns {ColorSpaceNode}
 */
export const convertColorSpace = (node, sourceColorSpace, targetColorSpace) => nodeObject(new ColorSpaceNode(nodeObject(node), sourceColorSpace, targetColorSpace)); // 导出通用色彩空间转换函数

addMethodChaining("workingToColorSpace", workingToColorSpace); // 添加workingToColorSpace方法链
addMethodChaining("colorSpaceToWorking", colorSpaceToWorking); // 添加colorSpaceToWorking方法链
