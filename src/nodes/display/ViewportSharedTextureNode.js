// 从视口纹理节点模块导入ViewportTextureNode基类
import ViewportTextureNode from "./ViewportTextureNode.js";
// 从TSL基础模块导入nodeProxy函数，用于创建节点代理
import { nodeProxy } from "../tsl/TSLBase.js";
// 从屏幕节点模块导入屏幕UV坐标
import { screenUV } from "./ScreenNode.js";

// 从纹理模块导入帧缓冲纹理类
import { FramebufferTexture } from "../../textures/FramebufferTexture.js";

// 共享的帧缓冲纹理，所有ViewportSharedTextureNode实例共用
let _sharedFramebuffer = null;

/**
 * `ViewportTextureNode`为每个节点实例创建内部纹理。此模块在所有
 * `ViewportSharedTextureNode`实例之间共享一个纹理。出于性能考虑，
 * 当使用默认/屏幕帧缓冲区的数据时，应该首选此模块。
 *
 * @augments ViewportTextureNode
 */
class ViewportSharedTextureNode extends ViewportTextureNode {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "ViewportSharedTextureNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的视口共享纹理节点。
   *
   * @param {Node} [uvNode=screenUV] - UV节点，默认为屏幕UV坐标
   * @param {?Node} [levelNode=null] - 级别节点，用于指定mipmap级别
   */
  constructor(uvNode = screenUV, levelNode = null) {
    // 如果共享帧缓冲纹理不存在，则创建新的帧缓冲纹理
    if (_sharedFramebuffer === null) {
      _sharedFramebuffer = new FramebufferTexture(); // 创建帧缓冲纹理实例
    }

    // 调用父类构造函数，传入UV节点、级别节点和共享帧缓冲纹理
    super(uvNode, levelNode, _sharedFramebuffer);
  }

  // 更新引用，返回自身（共享纹理不需要更新引用）
  updateReference() {
    return this; // 返回自身实例
  }
}

// 导出ViewportSharedTextureNode类作为默认导出
export default ViewportSharedTextureNode;

/**
 * TSL函数，用于创建共享视口纹理节点。
 *
 * @tsl
 * @function
 * @param {?Node} [uvNode=screenUV] - UV节点，默认为屏幕UV坐标
 * @param {?Node} [levelNode=null] - 级别节点，用于指定mipmap级别
 * @returns {ViewportSharedTextureNode} 返回配置好的共享视口纹理节点
 */
export const viewportSharedTexture = /*@__PURE__*/ nodeProxy(ViewportSharedTextureNode).setParameterLength(0, 2); // 创建具有0-2个参数的节点代理
