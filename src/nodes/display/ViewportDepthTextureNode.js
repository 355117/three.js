// 从视口纹理节点模块导入ViewportTextureNode基类
import ViewportTextureNode from "./ViewportTextureNode.js";
// 从TSL基础模块导入nodeProxy函数，用于创建节点代理
import { nodeProxy } from "../tsl/TSLBase.js";
// 从屏幕节点模块导入屏幕UV坐标
import { screenUV } from "./ScreenNode.js";

// 从纹理模块导入深度纹理类
import { DepthTexture } from "../../textures/DepthTexture.js";

// 共享的深度缓冲区，所有实例共用同一个深度纹理
let sharedDepthbuffer = null;

/**
 * 表示当前视口深度的纹理节点。此模块可以与视口纹理结合使用，
 * 实现需要深度评估的效果。
 *
 * @augments ViewportTextureNode
 */
class ViewportDepthTextureNode extends ViewportTextureNode {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "ViewportDepthTextureNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的视口深度纹理节点。
   *
   * @param {Node} [uvNode=screenUV] - UV节点，默认为屏幕UV坐标
   * @param {?Node} [levelNode=null] - 级别节点，用于指定mipmap级别
   */
  constructor(uvNode = screenUV, levelNode = null) {
    // 如果共享深度缓冲区不存在，则创建新的深度纹理
    if (sharedDepthbuffer === null) {
      sharedDepthbuffer = new DepthTexture(); // 创建深度纹理实例
    }

    // 调用父类构造函数，传入UV节点、级别节点和共享深度缓冲区
    super(uvNode, levelNode, sharedDepthbuffer);
  }
}

// 导出ViewportDepthTextureNode类作为默认导出
export default ViewportDepthTextureNode;

/**
 * TSL函数，用于创建视口深度纹理节点。
 *
 * @tsl
 * @function
 * @param {?Node} [uvNode=screenUV] - UV节点，默认为屏幕UV坐标
 * @param {?Node} [levelNode=null] - 级别节点，用于指定mipmap级别
 * @returns {ViewportDepthTextureNode} 返回配置好的视口深度纹理节点
 */
export const viewportDepthTexture = /*@__PURE__*/ nodeProxy(ViewportDepthTextureNode).setParameterLength(0, 2); // 创建具有0-2个参数的节点代理
