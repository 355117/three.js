// 导入纹理数据源类
import { Source } from "./Source.js";
// 导入基础纹理类
import { Texture } from "./Texture.js";
// 导入深度纹理相关的常量
import { NearestFilter, UnsignedIntType, DepthFormat, DepthStencilFormat } from "../constants.js";

/**
 * 深度纹理类
 *
 * 此类用于自动将渲染的深度信息保存到纹理中
 * 深度纹理是现代3D渲染管线中的重要组件，用于存储场景的深度信息
 *
 * 主要功能：
 * - 深度缓冲：存储每个像素的深度值
 * - 阴影映射：实现阴影效果的核心技术
 * - 后处理效果：为各种后处理提供深度信息
 * - 深度测试：优化渲染性能和正确性
 *
 * 深度值的含义：
 * - 0.0：最近距离（相机近裁剪面）
 * - 1.0：最远距离（相机远裁剪面）
 * - 中间值：按距离线性或非线性分布
 *
 * 使用场景：
 * - 阴影映射（Shadow Mapping）
 * - 屏幕空间环境光遮蔽（SSAO）
 * - 景深效果（Depth of Field）
 * - 体积光效果（Volumetric Lighting）
 * - 深度剥离（Depth Peeling）
 * - 碰撞检测和拾取
 *
 * 格式支持：
 * - DepthFormat：仅深度信息
 * - DepthStencilFormat：深度+模板信息
 *
 * @augments Texture - 继承自基础纹理类，具有所有纹理的基本功能
 */
class DepthTexture extends Texture {
  /**
   * 构造一个新的深度纹理
   *
   * 创建指定尺寸的深度纹理，用于存储渲染的深度信息
   * 深度纹理必须指定宽度和高度，其他参数有合理的默认值
   *
   * @param {number} width - 纹理宽度（像素）
   *                        必须是正整数，通常与渲染目标尺寸一致
   * @param {number} height - 纹理高度（像素）
   *                         必须是正整数，通常与渲染目标尺寸一致
   * @param {number} [type=UnsignedIntType] - 纹理数据类型
   *                                         定义深度值的存储精度和范围
   *                                         常用类型：UnsignedIntType、FloatType
   * @param {number} [mapping=Texture.DEFAULT_MAPPING] - 纹理映射方式
   *                                                     深度纹理通常使用默认映射
   * @param {number} [wrapS=ClampToEdgeWrapping] - S轴（水平）包装模式
   *                                              深度纹理通常使用边缘夹紧
   * @param {number} [wrapT=ClampToEdgeWrapping] - T轴（垂直）包装模式
   *                                              深度纹理通常使用边缘夹紧
   * @param {number} [magFilter=NearestFilter] - 放大过滤器
   *                                            默认使用最近邻过滤，保持深度精度
   * @param {number} [minFilter=NearestFilter] - 缩小过滤器
   *                                            默认使用最近邻过滤，保持深度精度
   * @param {number} [anisotropy=Texture.DEFAULT_ANISOTROPY] - 各向异性过滤级别
   *                                                          深度纹理通常不需要各向异性过滤
   * @param {number} [format=DepthFormat] - 纹理格式
   *                                       必须是DepthFormat或DepthStencilFormat
   * @param {number} [depth=1] - 纹理深度（层数）
   *                            对于2D深度纹理通常为1，3D纹理可以大于1
   */
  constructor(width, height, type = UnsignedIntType, mapping, wrapS, wrapT, magFilter = NearestFilter, minFilter = NearestFilter, anisotropy, format = DepthFormat, depth = 1) {
    // 验证格式参数，深度纹理只支持特定的格式
    if (format !== DepthFormat && format !== DepthStencilFormat) {
      throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");
    }

    // 创建图像对象，包含尺寸信息
    const image = { width: width, height: height, depth: depth };

    // 调用父类构造函数
    super(image, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy);

    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 DepthTexture 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isDepthTexture = true;

    /**
     * 是否在上传到GPU时沿垂直轴翻转纹理
     *
     * 对于深度纹理，默认设置为 false
     * 因为深度纹理通常直接从渲染管线生成，坐标系已经正确
     *
     * 深度纹理的坐标约定：
     * - 通常与渲染目标的坐标系一致
     * - 翻转可能导致深度信息错误
     * - 在阴影映射中尤其重要
     *
     * @type {boolean}
     * @default false
     */
    this.flipY = false;

    /**
     * 是否生成多级渐远纹理（Mipmaps）
     *
     * 对于深度纹理，默认设置为 false
     * 因为深度信息需要保持精确性，多级渐远纹理会导致深度值的插值
     *
     * 深度纹理不生成Mipmaps的原因：
     * - 深度值的插值可能导致错误的深度比较
     * - 阴影映射需要精确的深度值
     * - 深度测试要求像素级的精度
     *
     * @type {boolean}
     * @default false
     */
    this.generateMipmaps = false;

    /**
     * 深度比较函数
     *
     * 定义深度测试时使用的比较函数，用于阴影映射等高级效果
     * 当设置为非null值时，启用深度比较模式
     *
     * 支持的比较函数：
     * - NeverCompare: 永远不通过
     * - LessCompare: 小于时通过（默认深度测试）
     * - EqualCompare: 等于时通过
     * - LessEqualCompare: 小于等于时通过
     * - GreaterCompare: 大于时通过
     * - NotEqualCompare: 不等于时通过
     * - GreaterEqualCompare: 大于等于时通过
     * - AlwaysCompare: 永远通过
     *
     * 使用场景：
     * - 阴影映射的深度比较
     * - 自定义深度测试逻辑
     * - 特殊的渲染效果
     *
     * @type {?(NeverCompare|LessCompare|EqualCompare|LessEqualCompare|GreaterCompare|NotEqualCompare|GreaterEqualCompare|AlwaysCompare)}
     * @default null
     */
    this.compareFunction = null;
  }

  // ===== 深度纹理操作方法 =====

  /**
   * 复制另一个深度纹理的属性到当前深度纹理
   *
   * 从源深度纹理复制所有相关属性，包括图像数据和深度比较函数
   * 这是一个深拷贝操作，会创建新的数据源实例
   *
   * 复制的属性包括：
   * - 基础纹理属性（通过super.copy）
   * - 图像数据（创建新的Source实例）
   * - 深度比较函数
   *
   * 注意：创建新的Source实例是为了避免共享引用问题（见issue #30540）
   *
   * @param {DepthTexture} source - 源深度纹理对象
   * @return {DepthTexture} 返回当前深度纹理实例，支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法，处理基础纹理属性
    super.copy(source);

    // 创建新的数据源实例，避免共享引用问题
    // Object.assign创建图像对象的浅拷贝
    this.source = new Source(Object.assign({}, source.image)); // see #30540

    // 复制深度比较函数
    this.compareFunction = source.compareFunction;

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 将深度纹理序列化为JSON格式
   *
   * 将深度纹理的所有属性转换为JSON对象，用于数据存储、传输或场景保存
   * 继承自基础纹理的序列化功能，并添加深度纹理特有的属性
   *
   * 序列化的深度纹理属性包括：
   * - 基础纹理属性（通过super.toJSON）
   * - 深度比较函数（如果设置了的话）
   *
   * 优化策略：
   * - 只序列化非默认值的属性，减少数据大小
   * - 深度比较函数只在非null时才序列化
   *
   * @param {Object} meta - 序列化元信息，包含纹理、材质等共享资源的映射
   * @return {Object} 表示序列化深度纹理的JSON对象
   */
  toJSON(meta) {
    // 调用父类的序列化方法，获取基础纹理数据
    const data = super.toJSON(meta);

    // 序列化深度比较函数（仅当非null时）
    if (this.compareFunction !== null) {
      data.compareFunction = this.compareFunction;
    }

    return data;
  }
}

// ===== 模块导出 =====

/**
 * 导出 DepthTexture 类
 *
 * DepthTexture 类是实现深度缓冲和阴影映射的核心组件
 * 提供了完整的深度信息存储和处理功能，是现代3D渲染的重要工具
 */
export { DepthTexture };
