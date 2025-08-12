// 从核心模块导入临时节点基类
import TempNode from "../core/TempNode.js";
// 从访问器模块导入纹理函数
import { texture } from "../accessors/TextureNode.js";
// 从PMREM工具模块导入立方体UV纹理函数
import { textureCubeUV } from "./PMREMUtils.js";
// 从核心模块导入uniform函数
import { uniform } from "../core/UniformNode.js";
// 从核心常量模块导入节点更新类型
import { NodeUpdateType } from "../core/constants.js";
// 从TSL基础模块导入节点代理和三维向量
import { nodeProxy, vec3 } from "../tsl/TSLBase.js";

// 从纹理模块导入纹理类
import { Texture } from "../../textures/Texture.js";
// 从渲染器模块导入PMREM生成器
import PMREMGenerator from "../../renderers/common/extras/PMREMGenerator.js";
// 从材质属性模块导入材质环境旋转
import { materialEnvRotation } from "../accessors/MaterialProperties.js";

// 用于缓存PMREM的WeakMap
const _cache = new WeakMap();

/**
 * 根据给定的图像高度生成立方体UV尺寸。
 *
 * @private
 * @param {number} imageHeight - 图像高度。
 * @return {{texelWidth: number,texelHeight: number, maxMip: number}} 结果对象。
 */
function _generateCubeUVSize(imageHeight) {
  // 计算最大mip级别
  const maxMip = Math.log2(imageHeight) - 2;

  // 计算纹素高度
  const texelHeight = 1.0 / imageHeight;

  // 计算纹素宽度
  const texelWidth = 1.0 / (3 * Math.max(Math.pow(2, maxMip), 7 * 16));

  // 返回计算结果
  return { texelWidth, texelHeight, maxMip };
}

/**
 * 从给定纹理生成PMREM。
 *
 * @private
 * @param {Texture} texture - 要创建PMREM的纹理。
 * @param {Renderer} renderer - 渲染器。
 * @param {PMREMGenerator} generator - PMREM生成器。
 * @return {?Texture} PMREM纹理。
 */
function _getPMREMFromTexture(texture, renderer, generator) {
  // 获取渲染器对应的缓存
  const cache = _getCache(renderer);

  // 从缓存中获取纹理
  let cacheTexture = cache.get(texture);

  // 获取缓存纹理的PMREM版本号
  const pmremVersion = cacheTexture !== undefined ? cacheTexture.pmremVersion : -1;

  // 如果版本号不匹配，需要重新生成
  if (pmremVersion !== texture.pmremVersion) {
    const image = texture.image; // 获取纹理图像

    // 如果是立方体纹理
    if (texture.isCubeTexture) {
      // 检查立方体贴图是否准备就绪
      if (isCubeMapReady(image)) {
        // 从立方体贴图生成PMREM
        cacheTexture = generator.fromCubemap(texture, cacheTexture);
      } else {
        return null; // 如果未准备就绪，返回null
      }
    } else {
      // 检查等距柱状投影贴图是否准备就绪
      if (isEquirectangularMapReady(image)) {
        // 从等距柱状投影贴图生成PMREM
        cacheTexture = generator.fromEquirectangular(texture, cacheTexture);
      } else {
        return null; // 如果未准备就绪，返回null
      }
    }

    // 更新缓存纹理的版本号
    cacheTexture.pmremVersion = texture.pmremVersion;

    // 将生成的纹理存入缓存
    cache.set(texture, cacheTexture);
  }

  // 返回缓存纹理的texture属性
  return cacheTexture.texture;
}

/**
 * 返回一个缓存，用于存储相应纹理生成的PMREM。
 * 必须为每个渲染器维护一个缓存，因为PMREM是渲染目标纹理，
 * 不能在渲染上下文之间共享。
 *
 * @private
 * @param {Renderer} renderer - 渲染器。
 * @return {WeakMap<Texture, Texture>} PMREM缓存。
 */
function _getCache(renderer) {
  // 从全局缓存中获取渲染器对应的缓存
  let rendererCache = _cache.get(renderer);

  // 如果缓存不存在，创建新的缓存
  if (rendererCache === undefined) {
    rendererCache = new WeakMap(); // 创建新的WeakMap
    _cache.set(renderer, rendererCache); // 存入全局缓存
  }

  // 返回渲染器缓存
  return rendererCache;
}

/**
 * 这个节点代表PMREM，它是一种专门为PBR材质设计的
 * 预处理环境贴图。
 *
 * ```js
 * const material = new MeshStandardNodeMaterial();
 * material.envNode = pmremTexture( envMap );
 * ```
 *
 * @augments TempNode
 */
class PMREMNode extends TempNode {
  // 获取节点类型的静态方法
  static get type() {
    return "PMREMNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的PMREM节点。
   *
   * @param {Texture} value - 输入纹理。
   * @param {Node<vec2>} [uvNode=null] - UV节点。
   * @param {Node<float>} [levelNode=null] - 级别节点。
   */
  constructor(value, uvNode = null, levelNode = null) {
    super("vec3"); // 调用父类构造函数，设置返回类型为vec3

    /**
     * 对输入纹理的引用。
     *
     * @private
     * @type {Texture}
     */
    this._value = value;

    /**
     * 对生成的PMREM的引用。
     *
     * @private
     * @type {Texture | null}
     * @default null
     */
    this._pmrem = null;

    /**
     * UV节点。
     *
     * @type {Node<vec2>}
     */
    this.uvNode = uvNode;

    /**
     * 级别节点。
     *
     * @type {Node<float>}
     */
    this.levelNode = levelNode;

    /**
     * 对PMREM生成器的引用。
     *
     * @private
     * @type {?PMREMGenerator}
     * @default null
     */
    this._generator = null;

    // 创建默认纹理
    const defaultTexture = new Texture();
    defaultTexture.isRenderTargetTexture = true; // 标记为渲染目标纹理

    /**
     * 持有生成的PMREM的纹理节点。
     *
     * @private
     * @type {TextureNode}
     */
    this._texture = texture(defaultTexture);

    /**
     * 表示PMREM宽度的uniform。
     *
     * @private
     * @type {UniformNode<float>}
     */
    this._width = uniform(0);

    /**
     * 表示PMREM高度的uniform。
     *
     * @private
     * @type {UniformNode<float>}
     */
    this._height = uniform(0);

    /**
     * 表示PMREM最大Mip级别的uniform。
     *
     * @private
     * @type {UniformNode<float>}
     */
    this._maxMip = uniform(0);

    /**
     * `updateBeforeType` 设置为 `NodeUpdateType.RENDER`。
     *
     * @type {string}
     * @default 'render'
     */
    this.updateBeforeType = NodeUpdateType.RENDER;
  }

  // 设置纹理值的setter方法
  set value(value) {
    this._value = value; // 更新内部纹理值
    this._pmrem = null; // 重置PMREM缓存
  }

  /**
   * 节点的纹理值。
   *
   * @type {Texture}
   */
  get value() {
    return this._value; // 返回内部纹理值
  }

  /**
   * 使用给定的PMREM纹理更新内部值。
   *
   * @param {Texture} texture - PMREM纹理。
   */
  updateFromTexture(texture) {
    // 根据纹理高度生成立方体UV尺寸
    const cubeUVSize = _generateCubeUVSize(texture.image.height);

    // 更新内部uniform值
    this._texture.value = texture; // 设置纹理
    this._width.value = cubeUVSize.texelWidth; // 设置纹素宽度
    this._height.value = cubeUVSize.texelHeight; // 设置纹素高度
    this._maxMip.value = cubeUVSize.maxMip; // 设置最大Mip级别
  }

  // 在渲染前更新的方法
  updateBefore(frame) {
    let pmrem = this._pmrem; // 获取当前PMREM

    // 获取PMREM版本号
    const pmremVersion = pmrem ? pmrem.pmremVersion : -1;
    const texture = this._value; // 获取输入纹理

    // 如果版本号不匹配，需要更新PMREM
    if (pmremVersion !== texture.pmremVersion) {
      // 如果纹理本身就是PMREM纹理
      if (texture.isPMREMTexture === true) {
        pmrem = texture;
      } else {
        // 否则从纹理生成PMREM
        pmrem = _getPMREMFromTexture(texture, frame.renderer, this._generator);
      }

      // 如果成功获取PMREM
      if (pmrem !== null) {
        this._pmrem = pmrem; // 缓存PMREM

        this.updateFromTexture(pmrem); // 更新内部值
      }
    }
  }

  // 设置节点的方法
  setup(builder) {
    // 如果生成器不存在，创建新的PMREM生成器
    if (this._generator === null) {
      this._generator = new PMREMGenerator(builder.renderer);
    }

    // 在渲染前更新
    this.updateBefore(builder);

    //

    let uvNode = this.uvNode; // 获取UV节点

    // 如果UV节点为空且上下文提供了getUV方法
    if (uvNode === null && builder.context.getUV) {
      uvNode = builder.context.getUV(this); // 从上下文获取UV
    }

    //

    // 应用材质环境旋转变换：翻转Y轴
    uvNode = materialEnvRotation.mul(vec3(uvNode.x, uvNode.y.negate(), uvNode.z));

    //

    let levelNode = this.levelNode; // 获取级别节点

    // 如果级别节点为空且上下文提供了getTextureLevel方法
    if (levelNode === null && builder.context.getTextureLevel) {
      levelNode = builder.context.getTextureLevel(this); // 从上下文获取纹理级别
    }

    //

    // 返回立方体UV纹理采样结果
    return textureCubeUV(this._texture, uvNode, levelNode, this._width, this._height, this._maxMip);
  }

  // 释放资源的方法
  dispose() {
    super.dispose(); // 调用父类的dispose方法

    // 如果生成器存在，释放其资源
    if (this._generator !== null) this._generator.dispose();
  }
}

export default PMREMNode; // 导出PMREMNode类

/**
 * 如果给定的立方体贴图图像已完全加载，则返回 `true`。
 *
 * @private
 * @param {?Array<(Image|Object)>} [image] - 立方体贴图图像。
 * @return {boolean} 给定的立方体贴图是否准备就绪。
 */
function isCubeMapReady(image) {
  // 如果图像为null或undefined，返回false
  if (image === null || image === undefined) return false;

  let count = 0; // 已加载的面数计数
  const length = 6; // 立方体贴图有6个面

  // 遍历所有6个面
  for (let i = 0; i < length; i++) {
    if (image[i] !== undefined) count++; // 如果面已定义，计数加1
  }

  // 只有当所有6个面都已加载时才返回true
  return count === length;
}

/**
 * 如果给定的等距柱状投影图像已完全加载，则返回 `true`。
 *
 * @private
 * @param {(Image|Object)} image - 等距柱状投影图像。
 * @return {boolean} 给定的等距柱状投影贴图是否准备就绪。
 */
function isEquirectangularMapReady(image) {
  // 如果图像为null或undefined，返回false
  if (image === null || image === undefined) return false;

  // 检查图像高度是否大于0
  return image.height > 0;
}

/**
 * 用于创建PMREM节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {Texture} value - 输入纹理。
 * @param {?Node<vec2>} [uvNode=null] - UV节点。
 * @param {?Node<float>} [levelNode=null] - 级别节点。
 * @returns {PMREMNode}
 */
export const pmremTexture = /*@__PURE__*/ nodeProxy(PMREMNode).setParameterLength(1, 3);
