// 导入TSL核心的节点对象包装功能
import { nodeObject } from "../tsl/TSLCore.js";
// 导入纹理节点基类
import TextureNode from "../accessors/TextureNode.js";
// 导入节点更新类型常量
import { NodeUpdateType } from "../core/constants.js";
// 导入UV坐标访问器
import { uv } from "../accessors/UV.js";
// 导入节点材质类
import NodeMaterial from "../../materials/nodes/NodeMaterial.js";
// 导入四边形网格类
import QuadMesh from "../../renderers/common/QuadMesh.js";

// 导入渲染目标类
import { RenderTarget } from "../../core/RenderTarget.js";
// 导入二维向量类
import { Vector2 } from "../../math/Vector2.js";
// 导入半精度浮点类型常量
import { HalfFloatType } from "../../constants.js";

// 用于存储尺寸信息的临时向量
const _size = /*@__PURE__*/ new Vector2();

/**
 * RTT（Render To Texture）节点类。
 *
 * `RTTNode` 接受另一个节点并使用 `QuadMesh` 将其渲染到纹理中（RTT）。
 * 该模块在后处理上下文中特别重要，因为某些节点的效果需要纹理输入。
 * 通过基于此模块的辅助函数 `convertToTexture()`，节点系统可以在需要时
 * 自动确保纹理输入。
 *
 * RTT技术的主要用途：
 * - 后处理效果链
 * - 动态纹理生成
 * - 多通道渲染
 * - 纹理缓存和优化
 * - 复杂着色器效果的分解
 *
 * @augments TextureNode
 */
class RTTNode extends TextureNode {
  /**
   * 获取节点类型标识符。
   *
   * @static
   * @return {string} 返回'RTTNode'类型标识符。
   */
  static get type() {
    return "RTTNode";
  }

  /**
   * 构造一个新的RTT节点。
   *
   * @param {Node} node - 用于渲染纹理的节点。
   * @param {?number} [width=null] - 内部渲染目标的宽度。如果未指定宽度，渲染目标会自动调整大小。
   * @param {?number} [height=null] - 内部渲染目标的高度。
   * @param {Object} [options={type:HalfFloatType}] - 内部渲染目标的选项配置。
   */
  constructor(node, width = null, height = null, options = { type: HalfFloatType }) {
    // 创建渲染目标，用于存储渲染结果
    const renderTarget = new RenderTarget(width, height, options);

    // 调用父类构造函数，使用渲染目标的纹理和UV坐标
    super(renderTarget.texture, uv());

    /**
     * 类型测试标志，用于识别RTTNode实例。
     *
     * 该标志可用于运行时类型检查，
     * 快速判断一个节点是否为RTTNode类型。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isRTTNode = true;

    /**
     * 用于渲染纹理的节点。
     *
     * 该节点定义了要渲染到纹理中的内容。
     * 可以是任何类型的节点，如颜色节点、纹理节点或复杂的着色器节点。
     *
     * @type {Node}
     */
    this.node = node;

    /**
     * 内部渲染目标的宽度。
     *
     * 如果未指定宽度，渲染目标会根据当前渲染器的尺寸自动调整大小。
     * 这对于响应式渲染和动态尺寸调整很有用。
     *
     * @type {?number}
     * @default null
     */
    this.width = width;

    /**
     * 内部渲染目标的高度。
     *
     * 如果未指定高度，渲染目标会根据当前渲染器的尺寸自动调整大小。
     *
     * @type {?number}
     * @default null
     */
    this.height = height;

    /**
     * 像素比率。
     *
     * 用于控制渲染目标的分辨率相对于显示尺寸的比例。
     * 值大于1会提高质量但增加性能开销，值小于1会降低质量但提高性能。
     *
     * @type {number}
     * @default 1
     */
    this.pixelRatio = 1;

    /**
     * 渲染目标对象。
     *
     * 存储渲染结果的目标，包含纹理和相关的帧缓冲区设置。
     * 这是RTT操作的核心组件。
     *
     * @type {RenderTarget}
     */
    this.renderTarget = renderTarget;

    /**
     * 纹理是否需要更新。
     *
     * 当设置为true时，表示纹理内容已过时，需要重新渲染。
     * 这个标志用于优化，避免不必要的重新渲染。
     *
     * @type {boolean}
     * @default true
     */
    this.textureNeedsUpdate = true;

    /**
     * 纹理是否应该自动更新。
     *
     * 当设置为true时，纹理会在每次渲染时自动更新。
     * 设置为false可以手动控制更新时机，用于性能优化。
     *
     * @type {boolean}
     * @default true
     */
    this.autoUpdate = true;

    /**
     * 与四边形网格一起用于RTT的节点。
     *
     * 这是经过上下文处理的节点副本，用于实际的渲染操作。
     * 在setup阶段会根据构建器的共享上下文进行初始化。
     *
     * @private
     * @type {?Node}
     * @default null
     */
    this._rttNode = null;

    /**
     * 用于RTT的内部四边形网格。
     *
     * 四边形网格用于将节点内容渲染到全屏四边形上，
     * 然后捕获到渲染目标中。使用NodeMaterial来支持节点系统。
     *
     * @private
     * @type {QuadMesh}
     */
    this._quadMesh = new QuadMesh(new NodeMaterial());

    /**
     * 更新类型设置为渲染前更新。
     *
     * 由于节点在其 {@link RTTNode#updateBefore} 方法中
     * 每次渲染时更新纹理，所以设置为 `NodeUpdateType.RENDER`。
     *
     * @type {string}
     * @default 'render'
     */
    this.updateBeforeType = NodeUpdateType.RENDER;
  }

  /**
   * 内部渲染目标是否应该自动调整大小。
   *
   * 当宽度为null时，表示应该根据当前渲染器的尺寸自动调整大小。
   * 这对于响应式渲染和动态尺寸调整很有用。
   *
   * @type {boolean}
   * @readonly
   * @default true
   */
  get autoResize() {
    return this.width === null;
  }

  /**
   * 设置节点。
   *
   * 在设置阶段初始化RTT节点和四边形网格材质。
   * 创建带有共享上下文的节点副本，并配置材质属性。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {*} 父类setup方法的返回值。
   */
  setup(builder) {
    // 创建带有共享上下文的节点副本
    this._rttNode = this.node.context(builder.getSharedContext());
    // 设置材质名称和更新标志
    this._quadMesh.material.name = "RTT";
    this._quadMesh.material.needsUpdate = true;

    return super.setup(builder);
  }

  /**
   * 设置内部渲染目标的尺寸。
   *
   * 该方法会更新渲染目标的宽度和高度，并考虑像素比率。
   * 设置新尺寸后会标记纹理需要更新。
   *
   * @param {number} width - 要设置的宽度。
   * @param {number} height - 要设置的高度。
   */
  setSize(width, height) {
    this.width = width;
    this.height = height;

    // 计算考虑像素比率的有效尺寸
    const effectiveWidth = width * this.pixelRatio;
    const effectiveHeight = height * this.pixelRatio;

    // 设置渲染目标的实际尺寸
    this.renderTarget.setSize(effectiveWidth, effectiveHeight);

    // 标记纹理需要更新
    this.textureNeedsUpdate = true;
  }

  /**
   * 设置像素比率。
   *
   * 该方法会更新像素比率并重新调整渲染目标的尺寸。
   * 像素比率的改变会影响渲染质量和性能。
   *
   * @param {number} pixelRatio - 要设置的像素比率。
   */
  setPixelRatio(pixelRatio) {
    this.pixelRatio = pixelRatio;

    // 使用新的像素比率重新设置尺寸
    this.setSize(this.width, this.height);
  }

  /**
   * 在渲染前更新RTT纹理。
   *
   * 该方法在每次渲染前被调用，负责：
   * 1. 检查是否需要更新纹理
   * 2. 处理自动尺寸调整
   * 3. 执行实际的RTT渲染操作
   *
   * @param {Object} frame - 渲染帧对象，包含渲染器等信息。
   */
  updateBefore({ renderer }) {
    // 如果纹理不需要更新且不是自动更新模式，则跳过
    if (this.textureNeedsUpdate === false && this.autoUpdate === false) return;

    // 重置更新标志
    this.textureNeedsUpdate = false;

    // 处理自动尺寸调整
    if (this.autoResize === true) {
      const pixelRatio = renderer.getPixelRatio();
      const size = renderer.getSize(_size);

      // 计算有效的渲染尺寸
      const effectiveWidth = size.width * pixelRatio;
      const effectiveHeight = size.height * pixelRatio;

      // 如果尺寸发生变化，更新渲染目标
      if (effectiveWidth !== this.renderTarget.width || effectiveHeight !== this.renderTarget.height) {
        this.renderTarget.setSize(effectiveWidth, effectiveHeight);

        this.textureNeedsUpdate = true;
      }
    }

    // 设置四边形网格材质的片段节点为RTT节点
    this._quadMesh.material.fragmentNode = this._rttNode;

    // 保存当前的渲染目标
    const currentRenderTarget = renderer.getRenderTarget();

    // 切换到RTT的渲染目标
    renderer.setRenderTarget(this.renderTarget);

    // 渲染四边形网格到渲染目标
    this._quadMesh.render(renderer);

    // 恢复之前的渲染目标
    renderer.setRenderTarget(currentRenderTarget);
  }

  /**
   * 克隆RTT节点。
   *
   * 创建一个新的纹理节点作为当前RTT节点的克隆。
   * 克隆的节点会保持对原始节点的引用。
   *
   * @return {TextureNode} 克隆的纹理节点。
   */
  clone() {
    const newNode = new TextureNode(this.value, this.uvNode, this.levelNode);
    newNode.sampler = this.sampler;
    newNode.referenceNode = this;

    return newNode;
  }
}

// 导出RTTNode类作为默认导出
export default RTTNode;

/**
 * TSL函数，用于创建RTT节点。
 *
 * 该函数提供了一个便捷的方式来创建RTTNode实例，
 * 用于将节点内容渲染到纹理中。这在后处理管线和
 * 复杂着色器效果中非常有用。
 *
 * @tsl
 * @function
 * @param {Node} node - 用于渲染纹理的节点。
 * @param {?number} [width=null] - 内部渲染目标的宽度。如果未指定宽度，渲染目标会自动调整大小。
 * @param {?number} [height=null] - 内部渲染目标的高度。
 * @param {Object} [options={type:HalfFloatType}] - 内部渲染目标的选项配置。
 * @returns {RTTNode} RTT节点实例。
 */
export const rtt = (node, ...params) => nodeObject(new RTTNode(nodeObject(node), ...params));

/**
 * TSL函数，用于将节点转换为纹理节点。
 *
 * 该函数是一个智能转换器，会根据输入节点的类型决定是否需要RTT：
 * - 如果节点已经是纹理或采样节点，直接返回
 * - 如果是通道节点，返回其纹理节点
 * - 否则创建RTT节点进行转换
 *
 * 这个函数在节点系统中广泛使用，确保需要纹理输入的地方
 * 能够自动获得正确的纹理数据。
 *
 * @tsl
 * @function
 * @param {Node} node - 要转换的节点。
 * @param {?number} [width=null] - 内部渲染目标的宽度。
 * @param {?number} [height=null] - 内部渲染目标的高度。
 * @param {Object} [options={type:HalfFloatType}] - 内部渲染目标的选项配置。
 * @returns {Node} 转换后的纹理节点或原始节点。
 */
export const convertToTexture = (node, ...params) => {
  // 如果已经是采样节点或纹理节点，直接返回
  if (node.isSampleNode || node.isTextureNode) return node;
  // 如果是通道节点，返回其纹理节点
  if (node.isPassNode) return node.getTextureNode();

  // 否则创建RTT节点进行转换
  return rtt(node, ...params);
};
