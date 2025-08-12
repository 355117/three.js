// 导入统一变量节点基类
import UniformNode from "../core/UniformNode.js";
// 导入节点更新类型常量
import { NodeUpdateType } from "../core/constants.js";
// 导入TSL基础的节点代理功能
import { nodeProxy } from "../tsl/TSLBase.js";

/**
 * 最大Mip级别节点类，一种特殊的统一变量节点，用于计算给定纹理节点的最大mipmap级别。
 *
 * Mipmap是一种纹理优化技术，它为同一张纹理生成多个不同分辨率的版本。
 * 最大Mip级别表示纹理可用的最高细节级别（最小尺寸的mipmap）。
 *
 * 该节点在以下场景中非常有用：
 * - 纹理LOD（细节级别）计算
 * - 自适应纹理采样
 * - 性能优化和内存管理
 * - 纹理流式加载
 *
 * 使用示例：
 * ```js
 * const level = maxMipLevel( textureNode );
 * ```
 *
 * @augments UniformNode
 */
class MaxMipLevelNode extends UniformNode {
  /**
   * 获取节点类型标识符。
   *
   * @static
   * @return {string} 返回'MaxMipLevelNode'类型标识符。
   */
  static get type() {
    return "MaxMipLevelNode";
  }

  /**
   * 构造一个新的最大Mip级别节点。
   *
   * @param {TextureNode} textureNode - 要计算最大Mip级别的纹理节点。
   */
  constructor(textureNode) {
    // 初始化为0，实际值将在update方法中计算
    super(0);

    /**
     * 要计算最大Mip级别的纹理节点。
     *
     * 该节点引用的纹理将用于计算最大mipmap级别。
     * 计算基于纹理的实际尺寸和mipmap生成设置。
     *
     * @private
     * @type {TextureNode}
     */
    this._textureNode = textureNode;

    /**
     * 更新类型设置为每帧更新。
     *
     * 由于节点在其 {@link MaxMipLevelNode#update} 方法中
     * 每帧更新纹理，所以设置为 `NodeUpdateType.FRAME`。
     * 这确保了在每帧都会重新计算最大Mip级别。
     *
     * @type {string}
     * @default 'frame'
     */
    this.updateType = NodeUpdateType.FRAME;
  }

  /**
   * 获取要计算最大Mip级别的纹理节点。
   *
   * @readonly
   * @type {TextureNode}
   */
  get textureNode() {
    return this._textureNode;
  }

  /**
   * 获取纹理对象。
   *
   * 该属性返回纹理节点中包含的实际纹理对象，
   * 用于访问纹理的属性和方法。
   *
   * @readonly
   * @type {Texture}
   */
  get texture() {
    return this._textureNode.value;
  }

  /**
   * 更新最大Mip级别的值。
   *
   * 该方法在每帧被调用，计算纹理的最大mipmap级别。
   * 计算公式基于纹理图像的宽度和高度：
   * maxMipLevel = log2(max(width, height))
   *
   * 这个公式确定了可以生成多少个mipmap级别，
   * 直到纹理尺寸减小到1x1像素。
   *
   * 该方法还处理了纹理数组的情况，会优先使用images数组中的图像。
   */
  update() {
    const texture = this.texture;
    // 处理纹理数组的情况，优先使用images数组
    const images = texture.images;
    const image = images && images.length > 0 ? (images[0] && images[0].image) || images[0] : texture.image;

    // 检查图像是否已加载且具有有效的尺寸
    if (image && image.width !== undefined) {
      const { width, height } = image;

      // 计算最大Mip级别：log2(max(width, height))
      // 这表示可以生成多少个mipmap级别
      this.value = Math.log2(Math.max(width, height));
    }
  }
}

// 导出MaxMipLevelNode类作为默认导出
export default MaxMipLevelNode;

/**
 * TSL函数，用于创建最大Mip级别节点。
 *
 * 该函数提供了一个便捷的方式来创建MaxMipLevelNode实例，
 * 用于计算纹理的最大mipmap级别。这在需要进行纹理LOD计算
 * 或自适应纹理采样的场景中非常有用。
 *
 * @tsl
 * @function
 * @param {TextureNode} textureNode - 要计算最大Mip级别的纹理节点。
 * @returns {MaxMipLevelNode} 最大Mip级别节点实例。
 */
export const maxMipLevel = /*@__PURE__*/ nodeProxy(MaxMipLevelNode).setParameterLength(1);
