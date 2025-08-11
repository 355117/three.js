/**
 * SpriteSheetUVNode.js - 精灵图集UV坐标节点
 *
 * 该文件实现了用于计算动画精灵图集纹理坐标的节点。
 * 精灵图集是将多个小图像组合成一个大纹理的技术，常用于2D动画和游戏开发。
 */

// 导入核心节点类
import Node from "../core/Node.js";
// 导入UV坐标访问器
import { uv } from "../accessors/UV.js";
// 导入TSL基础工具
import { nodeProxy, float, vec2 } from "../tsl/TSLBase.js";

/**
 * 精灵图集UV坐标节点类
 *
 * 用于计算动画精灵图集的纹理坐标。可以根据帧数自动计算
 * 当前帧在精灵图集中的UV坐标位置。
 *
 * 使用示例：
 * ```js
 * const uvNode = spritesheetUV( vec2( 6, 6 ), uv(), time.mul( animationSpeed ) );
 *
 * material.colorNode = texture( spriteSheet, uvNode );
 * ```
 *
 * @augments Node
 */
class SpriteSheetUVNode extends Node {
  /**
   * 获取节点类型名称
   * @returns {string} 返回 'SpriteSheetUVNode'
   */
  static get type() {
    return "SpriteSheetUVNode";
  }

  /**
   * 构造一个新的精灵图集UV节点
   *
   * @param {Node<vec2>} countNode - 定义精灵图集在x和y方向上的精灵数量的节点（例如6x6）
   * @param {Node<vec2>} [uvNode=uv()] - UV坐标节点
   * @param {Node<float>} [frameNode=float()] - 定义当前帧/精灵索引的节点
   */
  constructor(countNode, uvNode = uv(), frameNode = float(0)) {
    // 调用父类构造函数，指定输出类型为vec2
    super("vec2");

    /**
     * 定义精灵图集在x和y方向上的精灵数量的节点（例如6x6）
     *
     * @type {Node<vec2>}
     */
    this.countNode = countNode;

    /**
     * UV坐标节点
     *
     * @type {Node<vec2>}
     */
    this.uvNode = uvNode;

    /**
     * 定义当前帧/精灵索引的节点
     *
     * @type {Node<float>}
     */
    this.frameNode = frameNode;
  }

  /**
   * 设置节点的计算逻辑
   * 计算精灵图集中特定帧的UV坐标
   *
   * @returns {Node} 计算后的UV坐标节点
   */
  setup() {
    // 解构获取节点引用
    const { frameNode, uvNode, countNode } = this;

    // 获取精灵图集的宽度和高度（精灵数量）
    const { width, height } = countNode;

    // 计算当前帧号，确保在有效范围内并向下取整
    const frameNum = frameNode.mod(width.mul(height)).floor();

    // 计算当前帧在精灵图集中的列位置
    const column = frameNum.mod(width);
    // 计算当前帧在精灵图集中的行位置（从上到下）
    const row = height.sub(frameNum.add(1).div(width).ceil());

    // 计算每个精灵的缩放比例（1/count）
    const scale = countNode.reciprocal();
    // 计算当前帧的UV偏移量
    const uvFrameOffset = vec2(column, row);

    // 返回最终的UV坐标：原始UV + 帧偏移，然后缩放到单个精灵大小
    return uvNode.add(uvFrameOffset).mul(scale);
  }
}

// 导出默认类
export default SpriteSheetUVNode;

/**
 * TSL 函数：创建精灵图集UV节点
 *
 * 这是一个便捷的工厂函数，用于创建精灵图集UV节点实例。
 *
 * @tsl
 * @function
 * @param {Node<vec2>} countNode - 定义精灵图集在x和y方向上的精灵数量的节点（例如6x6）
 * @param {?Node<vec2>} [uvNode=uv()] - UV坐标节点
 * @param {?Node<float>} [frameNode=float()] - 定义当前帧/精灵索引的节点
 * @returns {SpriteSheetUVNode} 创建的精灵图集UV节点实例
 */
export const spritesheetUV = /*@__PURE__*/ nodeProxy(SpriteSheetUVNode).setParameterLength(3);
