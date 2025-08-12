// 导入临时节点基类
import TempNode from "../core/TempNode.js";
// 导入节点更新类型常量
import { NodeUpdateType } from "../core/constants.js";
// 导入TSL基础的节点代理功能
import { nodeProxy } from "../tsl/TSLBase.js";
// 导入立方体纹理类
import { CubeTexture } from "../../textures/CubeTexture.js";
// 导入立方体纹理节点访问器
import { cubeTexture } from "../accessors/CubeTextureNode.js";
// 导入立方体渲染目标
import CubeRenderTarget from "../../renderers/common/CubeRenderTarget.js";
// 导入纹理映射常量
import { CubeReflectionMapping, CubeRefractionMapping, EquirectangularReflectionMapping, EquirectangularRefractionMapping } from "../../constants.js";

// 用于缓存已转换的立方体贴图的WeakMap，避免重复转换
const _cache = new WeakMap();

/**
 * 立方体贴图节点类。
 *
 * 该节点可以自动将等距柱状投影格式的环境贴图
 * 转换为立方体贴图格式。这在渲染环境反射和折射时非常有用，
 * 因为立方体贴图在GPU上的采样效率更高。
 *
 * 转换过程是异步的，会在渲染时动态进行，
 * 并使用缓存机制避免重复转换同一张纹理。
 *
 * @augments TempNode
 */
class CubeMapNode extends TempNode {
  /**
   * 获取节点类型标识符。
   *
   * @static
   * @return {string} 返回'CubeMapNode'类型标识符。
   */
  static get type() {
    return "CubeMapNode";
  }

  /**
   * 构造一个新的立方体贴图节点。
   *
   * @param {Node} envNode - 表示环境贴图的节点。
   */
  constructor(envNode) {
    // 立方体贴图节点输出vec3类型（用于采样方向）
    super("vec3");

    /**
     * 表示环境贴图的节点。
     *
     * 该节点可以是纹理节点或材质引用节点，
     * 包含需要转换的等距柱状投影环境贴图。
     *
     * @type {Node}
     */
    this.envNode = envNode;

    /**
     * 内部立方体纹理的引用。
     *
     * 存储转换后的立方体贴图纹理，
     * 在转换完成前为null。
     *
     * @private
     * @type {?CubeTexture}
     * @default null
     */
    this._cubeTexture = null;

    /**
     * 内部立方体纹理节点的引用。
     *
     * 用于包装立方体纹理并提供节点接口，
     * 初始时包装null值。
     *
     * @private
     * @type {Node}
     */
    this._cubeTextureNode = cubeTexture(null);

    // 创建默认的立方体纹理作为占位符
    const defaultTexture = new CubeTexture();
    defaultTexture.isRenderTargetTexture = true;

    /**
     * 默认立方体纹理，用作占位符。
     *
     * 当从等距柱状投影到立方体贴图的转换
     * 尚未完成时使用该纹理。这确保了渲染的连续性。
     *
     * @private
     * @type {CubeTexture}
     */
    this._defaultTexture = defaultTexture;

    /**
     * 更新类型设置为渲染前更新。
     *
     * 由于节点在其 {@link CubeMapNode#updateBefore} 方法中
     * 每次渲染时更新纹理，所以设置为 `NodeUpdateType.RENDER`。
     *
     * @type {string}
     * @default 'render'
     */
    this.updateBeforeType = NodeUpdateType.RENDER;
  }

  /**
   * 在渲染前更新立方体贴图。
   *
   * 该方法在每次渲染前被调用，负责检查环境贴图的状态
   * 并在需要时进行等距柱状投影到立方体贴图的转换。
   * 转换过程包括：
   * 1. 检查缓存中是否已有转换结果
   * 2. 如果没有，创建新的立方体渲染目标进行转换
   * 3. 更新内部的立方体纹理节点
   *
   * @param {Object} frame - 渲染帧对象，包含渲染器和材质信息。
   */
  updateBefore(frame) {
    const { renderer, material } = frame;

    const envNode = this.envNode;

    // 检查环境节点是否为纹理节点或材质引用节点
    if (envNode.isTextureNode || envNode.isMaterialReferenceNode) {
      // 获取实际的纹理对象
      const texture = envNode.isTextureNode ? envNode.value : material[envNode.property];

      if (texture && texture.isTexture) {
        const mapping = texture.mapping;

        // 检查是否为等距柱状投影映射
        if (mapping === EquirectangularReflectionMapping || mapping === EquirectangularRefractionMapping) {
          // 检查缓存中是否已有转换后的立方体贴图

          if (_cache.has(texture)) {
            // 从缓存中获取已转换的立方体贴图
            const cubeMap = _cache.get(texture);

            // 设置正确的纹理映射类型
            mapTextureMapping(cubeMap, texture.mapping);
            this._cubeTexture = cubeMap;
          } else {
            // 从等距柱状投影贴图创建立方体贴图

            const image = texture.image;

            // 检查等距柱状投影图像是否已准备就绪
            if (isEquirectangularMapReady(image)) {
              // 创建立方体渲染目标进行转换
              const renderTarget = new CubeRenderTarget(image.height);
              renderTarget.fromEquirectangularTexture(renderer, texture);

              // 设置正确的纹理映射类型
              mapTextureMapping(renderTarget.texture, texture.mapping);
              this._cubeTexture = renderTarget.texture;

              // 将转换结果缓存起来
              _cache.set(texture, renderTarget.texture);

              // 监听纹理销毁事件，以便清理缓存
              texture.addEventListener("dispose", onTextureDispose);
            } else {
              // 等距柱状投影纹理尚未加载时使用默认立方体纹理作为后备
              this._cubeTexture = this._defaultTexture;
            }
          }

          // 更新立方体纹理节点的值
          this._cubeTextureNode.value = this._cubeTexture;
        } else {
          // 环境节点已经引用了立方体贴图，直接使用
          this._cubeTextureNode = this.envNode;
        }
      }
    }
  }

  /**
   * 设置节点。
   *
   * 在设置阶段更新立方体贴图并返回内部的立方体纹理节点。
   * 这确保了在着色器构建时使用的是正确的立方体纹理。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {Node} 内部的立方体纹理节点。
   */
  setup(builder) {
    // 在设置阶段更新立方体贴图
    this.updateBefore(builder);

    // 返回内部的立方体纹理节点供着色器使用
    return this._cubeTextureNode;
  }
}

// 导出CubeMapNode类作为默认导出
export default CubeMapNode;

/**
 * 检查给定的等距柱状投影图像是否已完全加载并准备好进行进一步处理。
 *
 * 该函数通过检查图像的高度来判断图像是否已加载完成。
 * 只有当图像完全加载后，才能进行等距柱状投影到立方体贴图的转换。
 *
 * @private
 * @param {Image} image - 要检查的等距柱状投影图像。
 * @return {boolean} 图像是否准备就绪。
 */
function isEquirectangularMapReady(image) {
  // 检查图像是否存在
  if (image === null || image === undefined) return false;

  // 通过检查高度来判断图像是否已加载
  return image.height > 0;
}

/**
 * 纹理销毁事件处理函数。
 *
 * 当等距柱状投影纹理调用 `dispose()` 方法时执行该函数。
 * 在这种情况下，生成的立方体贴图及其渲染目标也会被删除，
 * 以避免内存泄漏。
 *
 * @private
 * @param {Object} event - 事件对象。
 */
function onTextureDispose(event) {
  const texture = event.target;

  // 移除事件监听器，避免重复调用
  texture.removeEventListener("dispose", onTextureDispose);

  // 从缓存中获取对应的渲染目标
  const renderTarget = _cache.get(texture);

  if (renderTarget !== undefined) {
    // 从缓存中删除该纹理的记录
    _cache.delete(texture);

    // 销毁渲染目标，释放GPU资源
    renderTarget.dispose();
  }
}

/**
 * 纹理映射类型转换函数。
 *
 * 该函数确保生成的立方体贴图使用与等距柱状投影原始纹理
 * 相对应的正确纹理映射类型。这对于保持反射和折射效果的
 * 正确性至关重要。
 *
 * @private
 * @param {Texture} texture - 立方体纹理。
 * @param {number} mapping - 原始纹理的映射类型。
 */
function mapTextureMapping(texture, mapping) {
  // 将等距柱状投影反射映射转换为立方体反射映射
  if (mapping === EquirectangularReflectionMapping) {
    texture.mapping = CubeReflectionMapping;
  }
  // 将等距柱状投影折射映射转换为立方体折射映射
  else if (mapping === EquirectangularRefractionMapping) {
    texture.mapping = CubeRefractionMapping;
  }
}

/**
 * TSL函数，用于创建立方体贴图节点。
 *
 * 该函数提供了一个便捷的方式来创建CubeMapNode实例，
 * 用于自动将等距柱状投影环境贴图转换为立方体贴图格式。
 * 这在需要高效环境映射的场景中非常有用。
 *
 * @tsl
 * @function
 * @param {Node} envNode - 表示环境贴图的节点。
 * @returns {CubeMapNode} 立方体贴图节点实例。
 */
export const cubeMapNode = /*@__PURE__*/ nodeProxy(CubeMapNode).setParameterLength(1);
