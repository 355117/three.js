// 从核心临时节点模块导入TempNode基类
import TempNode from "../core/TempNode.js";
// 从TSL核心模块导入方法链和节点对象函数
import { addMethodChaining, nodeObject } from "../tsl/TSLCore.js";

// 从常量模块导入无色彩空间和无色调映射常量
import { NoColorSpace, NoToneMapping } from "../../constants.js";
// 从颜色管理模块导入ColorManagement类
import { ColorManagement } from "../../math/ColorManagement.js";

/**
 * 通常情况下，色调映射和颜色转换会在输出像素到默认（屏幕）帧缓冲区之前自动进行。
 * 在某些后处理设置中，这种处理发生得太晚，因为某些效果需要例如sRGB输入。
 * 对于这种场景，可以使用`RenderOutputNode`在效果链中的任意点应用色调映射和色彩空间转换。
 *
 * 当使用此节点手动应用色调映射和色彩空间转换时，
 * 必须将{@link PostProcessing#outputColorTransform}设置为`false`。
 *
 * ```js
 * const postProcessing = new PostProcessing( renderer );
 * postProcessing.outputColorTransform = false;
 *
 * const scenePass = pass( scene, camera );
 * const outputPass = renderOutput( scenePass );
 *
 * postProcessing.outputNode = outputPass;
 * ```
 *
 * @augments TempNode
 */
class RenderOutputNode extends TempNode {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "RenderOutputNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的渲染输出节点。
   *
   * @param {Node} colorNode - 要处理的颜色节点
   * @param {?number} toneMapping - 色调映射类型
   * @param {?string} outputColorSpace - 输出色彩空间
   */
  constructor(colorNode, toneMapping, outputColorSpace) {
    super("vec4"); // 调用父类构造函数，指定输出类型为vec4

    /**
     * 要处理的颜色节点。
     *
     * @type {Node}
     */
    this.colorNode = colorNode; // 存储输入的颜色节点

    /**
     * 色调映射类型。
     *
     * @type {?number}
     */
    this.toneMapping = toneMapping; // 存储色调映射设置

    /**
     * 输出色彩空间。
     *
     * @type {?string}
     */
    this.outputColorSpace = outputColorSpace; // 存储输出色彩空间设置

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isRenderOutputNode = true; // 设置节点类型标识
  }

  // 设置节点的着色器逻辑
  setup({ context }) {
    // 获取输出节点，优先使用自身的颜色节点，否则使用上下文中的颜色
    let outputNode = this.colorNode || context.color;

    // 色调映射处理

    // 确定色调映射类型：优先使用节点自身设置，否则使用上下文设置，最后使用无色调映射
    const toneMapping = (this.toneMapping !== null ? this.toneMapping : context.toneMapping) || NoToneMapping;
    // 确定输出色彩空间：优先使用节点自身设置，否则使用上下文设置，最后使用无色彩空间
    const outputColorSpace = (this.outputColorSpace !== null ? this.outputColorSpace : context.outputColorSpace) || NoColorSpace;

    // 如果需要进行色调映射
    if (toneMapping !== NoToneMapping) {
      // 对输出节点应用色调映射
      outputNode = outputNode.toneMapping(toneMapping);
    }

    // 工作色彩空间到输出色彩空间的转换

    // 如果输出色彩空间不是无色彩空间且与当前工作色彩空间不同
    if (outputColorSpace !== NoColorSpace && outputColorSpace !== ColorManagement.workingColorSpace) {
      // 将输出节点从工作色彩空间转换到指定的输出色彩空间
      outputNode = outputNode.workingToColorSpace(outputColorSpace);
    }

    // 返回处理后的输出节点
    return outputNode;
  }
}

// 导出RenderOutputNode类作为默认导出
export default RenderOutputNode;

/**
 * TSL函数，用于创建渲染输出节点。
 *
 * @tsl
 * @function
 * @param {Node} color - 要处理的颜色节点
 * @param {?number} [toneMapping=null] - 色调映射类型
 * @param {?string} [outputColorSpace=null] - 输出色彩空间
 * @returns {RenderOutputNode} 返回配置好的渲染输出节点
 */
export const renderOutput = (color, toneMapping = null, outputColorSpace = null) => nodeObject(new RenderOutputNode(nodeObject(color), toneMapping, outputColorSpace));

// 为renderOutput函数添加方法链支持
addMethodChaining("renderOutput", renderOutput);
