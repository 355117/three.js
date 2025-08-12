// 导入统一变量节点基类和统一变量函数
import UniformNode, { uniform } from "../core/UniformNode.js";
// 导入UV坐标
import { uv } from "./UV.js";
// 导入纹理尺寸函数
import { textureSize } from "./TextureSizeNode.js";
// 导入颜色空间转换函数
import { colorSpaceToWorking } from "../display/ColorSpaceNode.js";
// 导入表达式节点
import { expression } from "../code/ExpressionNode.js";
// 导入最大mip级别函数
import { maxMipLevel } from "../utils/MaxMipLevelNode.js";
// 导入TSL基础函数和类型
import { nodeProxy, vec3, nodeObject, int } from "../tsl/TSLBase.js";
// 导入节点更新类型常量
import { NodeUpdateType } from "../core/constants.js";

// 导入Three.js常量
import { IntType, NearestFilter, UnsignedIntType } from "../../constants.js";

// 导入纹理类
import { Texture } from "../../textures/Texture.js";

// 空纹理实例，用作默认值
const EmptyTexture = /*@__PURE__*/ new Texture();

/**
 * 纹理节点 - 表示2D纹理的统一变量节点类型
 *
 * @augments UniformNode
 */
class TextureNode extends UniformNode {
  // 返回节点类型标识符
  static get type() {
    return "TextureNode";
  }

  /**
   * 构造一个新的纹理节点
   *
   * @param {Texture} [value=EmptyTexture] - 纹理对象
   * @param {?Node<vec2|vec3>} [uvNode=null] - UV节点
   * @param {?Node<int>} [levelNode=null] - 级别节点
   * @param {?Node<float>} [biasNode=null] - 偏移节点
   */
  constructor(value = EmptyTexture, uvNode = null, levelNode = null, biasNode = null) {
    // 调用父类构造函数
    super(value);

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isTextureNode = true;

    /**
     * 表示纹理坐标
     *
     * @type {?Node<vec2|vec3>}
     * @default null
     */
    this.uvNode = uvNode;

    /**
     * 表示应选择的mip级别
     *
     * @type {?Node<int>}
     * @default null
     */
    this.levelNode = levelNode;

    /**
     * 表示在细节级别计算期间应用的偏移
     *
     * @type {?Node<float>}
     * @default null
     */
    this.biasNode = biasNode;

    /**
     * 表示纹理采样与之比较的参考值
     *
     * @type {?Node<float>}
     * @default null
     */
    this.compareNode = null;

    /**
     * 使用纹理数组时，深度节点定义要选择的层
     *
     * @type {?Node<int>}
     * @default null
     */
    this.depthNode = null;

    /**
     * 定义时，使用显式梯度对纹理进行采样
     *
     * @type {?Array<Node<vec2>>}
     * @default null
     */
    this.gradNode = null;

    /**
     * 纹理值是否应该被采样或获取
     *
     * @type {boolean}
     * @default true
     */
    this.sampler = true;

    /**
     * UV变换矩阵是否应该自动更新
     * 如果要更改属性值，请使用 `setUpdateMatrix()`
     *
     * @type {boolean}
     * @default false
     */
    this.updateMatrix = false;

    /**
     * 默认情况下不执行 `update()` 方法。当UV变换矩阵应该
     * 自动更新时，`setUpdateMatrix()` 将值设置为 `frame`
     *
     * @type {string}
     * @default 'none'
     */
    this.updateType = NodeUpdateType.NONE;

    /**
     * 引用节点
     *
     * @type {?Node}
     * @default null
     */
    this.referenceNode = null;

    /**
     * 纹理值存储在私有属性中
     *
     * @private
     * @type {Texture}
     */
    this._value = value;

    /**
     * 表示UV变换矩阵的统一变量节点
     *
     * @private
     * @type {?UniformNode<mat3>}
     */
    this._matrixUniform = null;

    // 设置更新矩阵标志
    this.setUpdateMatrix(uvNode === null);
  }

  /**
   * 设置纹理值
   *
   * @param {Texture} value - 要设置的纹理值
   */
  set value(value) {
    // 如果有引用节点，设置引用节点的值
    if (this.referenceNode) {
      this.referenceNode.value = value;
    } else {
      // 否则设置私有属性
      this._value = value;
    }
  }

  /**
   * 获取纹理值
   *
   * @type {Texture}
   */
  get value() {
    // 如果有引用节点，返回引用节点的值，否则返回私有属性值
    return this.referenceNode ? this.referenceNode.value : this._value;
  }

  /**
   * 重写，因为统一变量哈希由纹理的UUID定义
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 统一变量哈希
   */
  getUniformHash(/*builder*/) {
    return this.value.uuid;
  }

  /**
   * 重写，因为节点类型从纹理类型推断
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 节点类型
   */
  getNodeType(/*builder*/) {
    // 如果是深度纹理，返回float类型
    if (this.value.isDepthTexture === true) return "float";

    // 根据纹理数据类型返回相应的向量类型
    if (this.value.type === UnsignedIntType) {
      return "uvec4"; // 无符号整数向量
    } else if (this.value.type === IntType) {
      return "ivec4"; // 有符号整数向量
    }

    // 默认返回浮点向量
    return "vec4";
  }

  /**
   * 重写默认实现以返回固定值 `'texture'`
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 输入类型
   */
  getInputType(/*builder*/) {
    return "texture";
  }

  /**
   * 根据当前纹理的通道返回默认UV坐标
   *
   * @return {AttributeNode<vec2>} 默认UV坐标
   */
  getDefaultUV() {
    return uv(this.value.channel);
  }

  /**
   * 重写以始终返回节点的纹理引用
   *
   * @param {any} state - 此方法可以在不同上下文中调用，因此 `state` 可以引用任何对象类型
   * @return {Texture} 纹理引用
   */
  updateReference(/*state*/) {
    return this.value;
  }

  /**
   * 使用纹理变换矩阵变换给定的UV节点
   *
   * @param {Node} uvNode - 要变换的UV节点
   * @return {Node} 变换后的UV节点
   */
  getTransformedUV(uvNode) {
    // 如果矩阵统一变量为空，创建一个新的
    if (this._matrixUniform === null) this._matrixUniform = uniform(this.value.matrix);

    // 应用变换矩阵并返回xy分量
    return this._matrixUniform.mul(vec3(uvNode, 1)).xy;
  }

  /**
   * 定义UV变换矩阵是否应该自动更新
   *
   * @param {boolean} value - 更新切换标志
   * @return {TextureNode} 对此节点的引用
   */
  setUpdateMatrix(value) {
    this.updateMatrix = value;
    // 根据值设置更新类型
    this.updateType = value ? NodeUpdateType.OBJECT : NodeUpdateType.NONE;

    return this;
  }

  /**
   * 设置UV节点。根据后端以及纹理的图像和类型，可能需要
   * 修改UV节点以进行正确的采样
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {Node} uvNode - 要设置的UV节点
   * @return {Node} 更新后的UV节点
   */
  setupUV(builder, uvNode) {
    const texture = this.value;

    // 检查是否需要翻转Y轴
    if (
      builder.isFlipY() &&
      ((texture.image instanceof ImageBitmap && texture.flipY === true) ||
        texture.isRenderTargetTexture === true ||
        texture.isFramebufferTexture === true ||
        texture.isDepthTexture === true)
    ) {
      if (this.sampler) {
        // 如果使用采样器，直接翻转Y轴
        uvNode = uvNode.flipY();
      } else {
        // 否则手动计算翻转后的Y坐标
        uvNode = uvNode.setY(int(textureSize(this, this.levelNode).y).sub(uvNode.y).sub(1));
      }
    }

    return uvNode;
  }

  /**
   * 通过为代码生成准备内部节点来设置纹理节点
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   */
  setup(builder) {
    // 获取节点属性并设置引用节点
    const properties = builder.getNodeProperties(this);
    properties.referenceNode = this.referenceNode;

    // 验证纹理

    const texture = this.value;

    // 检查纹理是否有效
    if (!texture || texture.isTexture !== true) {
      throw new Error("THREE.TSL: `texture( value )` function expects a valid instance of THREE.Texture().");
    }

    // 设置UV节点

    let uvNode = this.uvNode;

    // 如果UV节点为空或强制使用UV上下文，从上下文获取UV
    if ((uvNode === null || builder.context.forceUVContext === true) && builder.context.getUV) {
      uvNode = builder.context.getUV(this, builder);
    }

    // 如果仍然没有UV节点，使用默认UV
    if (!uvNode) uvNode = this.getDefaultUV();

    // 如果需要更新矩阵，应用变换
    if (this.updateMatrix === true) {
      uvNode = this.getTransformedUV(uvNode);
    }

    // 设置UV节点（处理Y轴翻转等）
    uvNode = this.setupUV(builder, uvNode);

    // 设置级别节点

    let levelNode = this.levelNode;

    // 如果级别节点为空且上下文提供纹理级别，从上下文获取
    if (levelNode === null && builder.context.getTextureLevel) {
      levelNode = builder.context.getTextureLevel(this);
    }

    // 保存所有属性到节点属性中

    properties.uvNode = uvNode;
    properties.levelNode = levelNode;
    properties.biasNode = this.biasNode;
    properties.compareNode = this.compareNode;
    properties.gradNode = this.gradNode;
    properties.depthNode = this.depthNode;
  }

  /**
   * 生成UV代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {Node} uvNode - 要生成代码的UV节点
   * @return {string} 生成的代码片段
   */
  generateUV(builder, uvNode) {
    // 根据是否使用采样器选择合适的类型
    return uvNode.build(builder, this.sampler === true ? "vec2" : "ivec2");
  }

  /**
   * 生成纹理采样的代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {string} textureProperty - 纹理属性
   * @param {string} uvSnippet - UV代码片段
   * @param {?string} levelSnippet - 级别代码片段
   * @param {?string} biasSnippet - 偏移代码片段
   * @param {?string} depthSnippet - 深度代码片段
   * @param {?string} compareSnippet - 比较代码片段
   * @param {?Array<string>} gradSnippet - 梯度代码片段
   * @return {string} 生成的代码片段
   */
  generateSnippet(builder, textureProperty, uvSnippet, levelSnippet, biasSnippet, depthSnippet, compareSnippet, gradSnippet) {
    const texture = this.value;

    let snippet;

    // 根据不同的参数生成相应的纹理采样代码
    if (levelSnippet) {
      // 使用指定级别采样
      snippet = builder.generateTextureLevel(texture, textureProperty, uvSnippet, levelSnippet, depthSnippet);
    } else if (biasSnippet) {
      // 使用偏移采样
      snippet = builder.generateTextureBias(texture, textureProperty, uvSnippet, biasSnippet, depthSnippet);
    } else if (gradSnippet) {
      // 使用梯度采样
      snippet = builder.generateTextureGrad(texture, textureProperty, uvSnippet, gradSnippet, depthSnippet);
    } else if (compareSnippet) {
      // 使用比较采样（用于阴影贴图）
      snippet = builder.generateTextureCompare(texture, textureProperty, uvSnippet, compareSnippet, depthSnippet);
    } else if (this.sampler === false) {
      // 直接加载纹理数据（不使用采样器）
      snippet = builder.generateTextureLoad(texture, textureProperty, uvSnippet, depthSnippet);
    } else {
      // 标准纹理采样
      snippet = builder.generateTexture(texture, textureProperty, uvSnippet, depthSnippet);
    }

    return snippet;
  }

  /**
   * 生成纹理节点的代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {string} output - 当前输出
   * @return {string} 生成的代码片段
   */
  generate(builder, output) {
    const texture = this.value;

    // 获取节点属性和纹理属性
    const properties = builder.getNodeProperties(this);
    const textureProperty = super.generate(builder, "property");

    // 如果输出是采样器类型，返回采样器属性
    if (/^sampler/.test(output)) {
      return textureProperty + "_sampler";
    } else if (builder.isReference(output)) {
      // 如果是引用输出，直接返回纹理属性
      return textureProperty;
    } else {
      // 获取节点数据
      const nodeData = builder.getDataFromNode(this);

      let propertyName = nodeData.propertyName;

      // 如果属性名未定义，生成纹理采样代码
      if (propertyName === undefined) {
        // 从属性中提取各种节点
        const { uvNode, levelNode, biasNode, compareNode, depthNode, gradNode } = properties;

        // 生成各种代码片段
        const uvSnippet = this.generateUV(builder, uvNode);
        const levelSnippet = levelNode ? levelNode.build(builder, "float") : null;
        const biasSnippet = biasNode ? biasNode.build(builder, "float") : null;
        const depthSnippet = depthNode ? depthNode.build(builder, "int") : null;
        const compareSnippet = compareNode ? compareNode.build(builder, "float") : null;
        const gradSnippet = gradNode ? [gradNode[0].build(builder, "vec2"), gradNode[1].build(builder, "vec2")] : null;

        // 获取节点变量和属性名
        const nodeVar = builder.getVarFromNode(this);
        propertyName = builder.getPropertyName(nodeVar);

        // 生成纹理采样代码片段
        const snippet = this.generateSnippet(builder, textureProperty, uvSnippet, levelSnippet, biasSnippet, depthSnippet, compareSnippet, gradSnippet);

        // 添加代码行到流程中
        builder.addLineFlowCode(`${propertyName} = ${snippet}`, this);

        // 缓存代码片段和属性名
        nodeData.snippet = snippet;
        nodeData.propertyName = propertyName;
      }

      // 处理颜色空间转换
      let snippet = propertyName;
      const nodeType = this.getNodeType(builder);

      // 如果需要转换到工作颜色空间
      if (builder.needsToWorkingColorSpace(texture)) {
        snippet = colorSpaceToWorking(expression(snippet, nodeType), texture.colorSpace).setup(builder).build(builder, nodeType);
      }

      // 格式化并返回最终代码片段
      return builder.format(snippet, nodeType, output);
    }
  }

  /**
   * 设置采样器值
   *
   * @param {boolean} value - 要设置的采样器值
   * @return {TextureNode} 对此纹理节点的引用
   */
  setSampler(value) {
    this.sampler = value;

    return this;
  }

  /**
   * 返回采样器值
   *
   * @return {boolean} 采样器值
   */
  getSampler() {
    return this.sampler;
  }

  // @TODO: 移动到TSL

  /**
   * 已弃用的纹理采样方法
   *
   * @function
   * @deprecated 自r172起弃用。请使用 {@link TextureNode#sample} 代替
   *
   * @param {Node} uvNode - UV节点
   * @return {TextureNode} 表示纹理采样的纹理节点
   */
  uv(uvNode) {
    // @deprecated, r172

    console.warn("THREE.TextureNode: .uv() has been renamed. Use .sample() instead.");

    return this.sample(uvNode);
  }

  /**
   * 使用给定的UV节点对纹理进行采样
   *
   * @param {Node} uvNode - UV节点
   * @return {TextureNode} 表示纹理采样的纹理节点
   */
  sample(uvNode) {
    // 克隆当前纹理节点
    const textureNode = this.clone();
    // 设置新的UV节点
    textureNode.uvNode = nodeObject(uvNode);
    // 设置引用节点为当前节点
    textureNode.referenceNode = this.getSelf();

    return nodeObject(textureNode);
  }

  /**
   * TSL函数 - 创建无插值获取/加载纹素的纹理节点
   *
   * @param {Node<uvec2>} uvNode - UV节点
   * @returns {TextureNode} 表示纹理加载的纹理节点
   */
  load(uvNode) {
    // 使用sample方法并禁用采样器（无插值）
    return this.sample(uvNode).setSampler(false);
  }

  /**
   * 通过定义内部偏移对纹理的模糊版本进行采样
   *
   * @param {Node<float>} amountNode - 纹理应该有多模糊
   * @return {TextureNode} 表示纹理采样的纹理节点
   */
  blur(amountNode) {
    // 克隆当前纹理节点
    const textureNode = this.clone();
    // 设置偏移节点：模糊量乘以最大mip级别
    textureNode.biasNode = nodeObject(amountNode).mul(maxMipLevel(textureNode));
    // 设置引用节点
    textureNode.referenceNode = this.getSelf();

    const map = textureNode.value;

    // 检查是否支持模糊（需要mipmap和线性过滤）
    if (textureNode.generateMipmaps === false && ((map && map.generateMipmaps === false) || map.minFilter === NearestFilter || map.magFilter === NearestFilter)) {
      console.warn("THREE.TSL: texture().blur() requires mipmaps and sampling. Use .generateMipmaps=true and .minFilter/.magFilter=THREE.LinearFilter in the Texture.");

      // 如果不支持，清除偏移节点
      textureNode.biasNode = null;
    }

    return nodeObject(textureNode);
  }

  /**
   * 对纹理的特定mip级别进行采样
   *
   * @param {Node<int>} levelNode - 要采样的mip级别
   * @return {TextureNode} 表示纹理采样的纹理节点
   */
  level(levelNode) {
    // 克隆当前纹理节点
    const textureNode = this.clone();
    // 设置级别节点
    textureNode.levelNode = nodeObject(levelNode);
    // 设置引用节点
    textureNode.referenceNode = this.getSelf();

    return nodeObject(textureNode);
  }

  /**
   * 返回请求级别的纹理尺寸
   *
   * @param {Node<int>} levelNode - 要计算尺寸的级别
   * @return {TextureSizeNode} 纹理尺寸
   */
  size(levelNode) {
    // 调用textureSize函数获取纹理尺寸
    return textureSize(this, levelNode);
  }

  /**
   * 使用给定偏移对纹理进行采样
   *
   * @param {Node<float>} biasNode - 偏移节点
   * @return {TextureNode} 表示纹理采样的纹理节点
   */
  bias(biasNode) {
    // 克隆当前纹理节点
    const textureNode = this.clone();
    // 设置偏移节点
    textureNode.biasNode = nodeObject(biasNode);
    // 设置引用节点
    textureNode.referenceNode = this.getSelf();

    return nodeObject(textureNode);
  }

  /**
   * 通过执行比较操作对纹理进行采样
   *
   * @param {Node<float>} compareNode - 定义比较值的节点
   * @return {TextureNode} 表示纹理采样的纹理节点
   */
  compare(compareNode) {
    // 克隆当前纹理节点
    const textureNode = this.clone();
    // 设置比较节点（用于阴影贴图等）
    textureNode.compareNode = nodeObject(compareNode);
    // 设置引用节点
    textureNode.referenceNode = this.getSelf();

    return nodeObject(textureNode);
  }

  /**
   * 使用显式梯度对纹理进行采样
   *
   * @param {Node<vec2>} gradNodeX - X方向梯度节点
   * @param {Node<vec2>} gradNodeY - Y方向梯度节点
   * @return {TextureNode} 表示纹理采样的纹理节点
   */
  grad(gradNodeX, gradNodeY) {
    // 克隆当前纹理节点
    const textureNode = this.clone();
    // 设置梯度节点数组（用于手动控制mip级别选择）
    textureNode.gradNode = [nodeObject(gradNodeX), nodeObject(gradNodeY)];
    // 设置引用节点
    textureNode.referenceNode = this.getSelf();

    return nodeObject(textureNode);
  }

  /**
   * 通过定义深度节点对纹理进行采样
   *
   * @param {Node<int>} depthNode - 深度节点
   * @return {TextureNode} 表示纹理采样的纹理节点
   */
  depth(depthNode) {
    // 克隆当前纹理节点
    const textureNode = this.clone();
    // 设置深度节点（用于纹理数组或3D纹理的层选择）
    textureNode.depthNode = nodeObject(depthNode);
    // 设置引用节点
    textureNode.referenceNode = this.getSelf();

    return nodeObject(textureNode);
  }

  // 序列化和反序列化方法

  /**
   * 序列化纹理节点数据
   *
   * @param {Object} data - 序列化数据对象
   */
  serialize(data) {
    // 调用父类序列化方法
    super.serialize(data);

    // 序列化纹理节点特有的属性
    data.value = this.value.toJSON(data.meta).uuid;
    data.sampler = this.sampler;
    data.updateMatrix = this.updateMatrix;
    data.updateType = this.updateType;
  }

  /**
   * 反序列化纹理节点数据
   *
   * @param {Object} data - 反序列化数据对象
   */
  deserialize(data) {
    // 调用父类反序列化方法
    super.deserialize(data);

    // 反序列化纹理节点特有的属性
    this.value = data.meta.textures[data.value];
    this.sampler = data.sampler;
    this.updateMatrix = data.updateMatrix;
    this.updateType = data.updateType;
  }

  /**
   * 更新方法用于实现UV变换矩阵的更新
   */
  update() {
    // 获取纹理和矩阵统一变量
    const texture = this.value;
    const matrixUniform = this._matrixUniform;

    // 如果矩阵统一变量存在，更新其值
    if (matrixUniform !== null) matrixUniform.value = texture.matrix;

    // 如果纹理设置为自动更新矩阵，执行更新
    if (texture.matrixAutoUpdate === true) {
      texture.updateMatrix();
    }
  }

  /**
   * 克隆纹理节点
   *
   * @return {TextureNode} 克隆的纹理节点
   */
  clone() {
    // 创建新的纹理节点实例
    const newNode = new this.constructor(this.value, this.uvNode, this.levelNode, this.biasNode);

    // 复制所有相关属性
    newNode.sampler = this.sampler;
    newNode.depthNode = this.depthNode;
    newNode.compareNode = this.compareNode;
    newNode.gradNode = this.gradNode;

    return newNode;
  }
}

// 导出TextureNode类作为默认导出
export default TextureNode;

/**
 * TSL函数 - 用于创建纹理节点的基础函数
 *
 * @tsl
 * @function
 * @param {?Texture} value - 纹理对象
 * @param {?Node<vec2|vec3>} [uvNode=null] - UV节点
 * @param {?Node<int>} [levelNode=null] - 级别节点
 * @param {?Node<float>} [biasNode=null] - 偏移节点
 * @returns {TextureNode}
 */
const textureBase = /*@__PURE__*/ nodeProxy(TextureNode).setParameterLength(1, 4).setName("texture");

/**
 * TSL函数 - 用于创建纹理节点或对已存在的纹理节点进行采样
 *
 * @tsl
 * @function
 * @param {?Texture|TextureNode} [value=EmptyTexture] - 纹理对象或纹理节点
 * @param {?Node<vec2|vec3>} [uvNode=null] - UV节点
 * @param {?Node<int>} [levelNode=null] - 级别节点
 * @param {?Node<float>} [biasNode=null] - 偏移节点
 * @returns {TextureNode}
 */
export const texture = (value = EmptyTexture, uvNode = null, levelNode = null, biasNode = null) => {
  let textureNode;

  // 如果值是纹理节点，克隆它并设置新参数
  if (value && value.isTextureNode === true) {
    textureNode = nodeObject(value.clone());
    textureNode.referenceNode = value.getSelf(); // 确保引用设置为原始节点

    // 设置新的节点参数
    if (uvNode !== null) textureNode.uvNode = nodeObject(uvNode);
    if (levelNode !== null) textureNode.levelNode = nodeObject(levelNode);
    if (biasNode !== null) textureNode.biasNode = nodeObject(biasNode);
  } else {
    // 否则创建新的纹理节点
    textureNode = textureBase(value, uvNode, levelNode, biasNode);
  }

  return textureNode;
};

/**
 * TSL函数 - 用于创建统一纹理节点
 *
 * @tsl
 * @function
 * @param {?Texture} value - 纹理对象
 * @returns {TextureNode}
 */
export const uniformTexture = (value = EmptyTexture) => texture(value);

/**
 * TSL函数 - 用于创建无插值获取/加载纹素的纹理节点
 *
 * @tsl
 * @function
 * @param {?Texture|TextureNode} [value=EmptyTexture] - 纹理对象或纹理节点
 * @param {?Node<vec2|vec3>} [uvNode=null] - UV节点
 * @param {?Node<int>} [levelNode=null] - 级别节点
 * @param {?Node<float>} [biasNode=null] - 偏移节点
 * @returns {TextureNode}
 */
export const textureLoad = (...params) => texture(...params).setSampler(false);

//export const textureLevel = ( value, uv, level ) => texture( value, uv ).level( level );

/**
 * TSL函数 - 将纹理或纹理节点转换为采样器
 *
 * @tsl
 * @function
 * @param {TextureNode|Texture} value - 要转换的纹理或纹理节点
 * @returns {Node}
 */
export const sampler = (value) => (value.isNode === true ? value : texture(value)).convert("sampler");

/**
 * TSL函数 - 将纹理或纹理节点转换为比较采样器
 *
 * @tsl
 * @function
 * @param {TextureNode|Texture} value - 要转换的纹理或纹理节点
 * @returns {Node}
 */
export const samplerComparison = (value) => (value.isNode === true ? value : texture(value)).convert("samplerComparison");
