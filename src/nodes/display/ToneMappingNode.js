// 从核心临时节点模块导入TempNode基类
import TempNode from "../core/TempNode.js";
// 从TSL核心模块导入方法链、节点对象和vec4函数
import { addMethodChaining, nodeObject, vec4 } from "../tsl/TSLCore.js";
// 从渲染器引用节点模块导入rendererReference函数
import { rendererReference } from "../accessors/RendererReferenceNode.js";

// 从常量模块导入无色调映射常量
import { NoToneMapping } from "../../constants.js";
// 从节点工具模块导入hash函数
import { hash } from "../core/NodeUtils.js";

/**
 * 此节点表示色调映射操作。
 *
 * @augments TempNode
 */
class ToneMappingNode extends TempNode {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "ToneMappingNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的色调映射节点。
   *
   * @param {number} toneMapping - 色调映射类型
   * @param {Node} exposureNode - 色调映射曝光度节点
   * @param {Node} [colorNode=null] - 要处理的颜色节点
   */
  constructor(toneMapping, exposureNode = toneMappingExposure, colorNode = null) {
    super("vec3"); // 调用父类构造函数，指定输出类型为vec3

    /**
     * 色调映射类型。
     *
     * @type {number}
     */
    this.toneMapping = toneMapping; // 存储色调映射类型

    /**
     * 色调映射曝光度节点。
     *
     * @type {Node}
     * @default null
     */
    this.exposureNode = exposureNode; // 存储曝光度节点

    /**
     * 表示要处理的颜色节点。
     *
     * @type {?Node}
     * @default null
     */
    this.colorNode = colorNode; // 存储颜色节点
  }

  /**
   * 重写默认的`customCacheKey()`实现，将色调映射类型
   * 包含到缓存键中。
   *
   * @return {number} 哈希值
   */
  customCacheKey() {
    return hash(this.toneMapping); // 返回色调映射类型的哈希值
  }

  // 设置节点的着色器逻辑
  setup(builder) {
    // 获取颜色节点：优先使用自身的颜色节点，否则使用构建器上下文中的颜色
    const colorNode = this.colorNode || builder.context.color;
    const toneMapping = this.toneMapping; // 获取色调映射类型

    // 如果是无色调映射，直接返回原始颜色节点
    if (toneMapping === NoToneMapping) return colorNode;

    let outputNode = null; // 输出节点变量

    // 从渲染器库中获取色调映射函数
    const toneMappingFn = builder.renderer.library.getToneMappingFunction(toneMapping);

    // 如果找到了色调映射函数
    if (toneMappingFn !== null) {
      // 应用色调映射函数到RGB通道，保持alpha通道不变
      outputNode = vec4(toneMappingFn(colorNode.rgb, this.exposureNode), colorNode.a);
    } else {
      // 如果不支持该色调映射配置，输出错误信息
      console.error("ToneMappingNode: Unsupported Tone Mapping configuration.", toneMapping);

      outputNode = colorNode; // 返回原始颜色节点
    }

    return outputNode; // 返回处理后的输出节点
  }
}

// 导出ToneMappingNode类作为默认导出
export default ToneMappingNode;

/**
 * TSL函数，用于创建色调映射节点。
 *
 * @tsl
 * @function
 * @param {number} mapping - 色调映射类型
 * @param {Node<float> | number} exposure - 色调映射曝光度
 * @param {Node<vec3> | Color} color - 要处理的颜色节点
 * @returns {ToneMappingNode<vec3>} 返回配置好的色调映射节点
 */
export const toneMapping = (mapping, exposure, color) => nodeObject(new ToneMappingNode(mapping, nodeObject(exposure), nodeObject(color)));

/**
 * TSL对象，表示渲染器的全局色调映射曝光度。
 *
 * @tsl
 * @type {RendererReferenceNode<vec3>}
 */
export const toneMappingExposure = /*@__PURE__*/ rendererReference("toneMappingExposure", "float");

// 为toneMapping函数添加方法链支持
addMethodChaining("toneMapping", (color, mapping, exposure) => toneMapping(mapping, exposure, color));
