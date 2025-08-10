// 导入基础纹理类
import { Texture } from "./Texture.js";
// 导入立方体反射映射常量，立方体纹理的默认映射方式
import { CubeReflectionMapping } from "../constants.js";

/**
 * 立方体纹理类
 *
 * 由六个图像组成的立方体纹理，主要用于环境映射和天空盒
 * 每个面对应立方体的一个面：正X、负X、正Y、负Y、正Z、负Z
 *
 * 立方体纹理的特点：
 * - 360度环境：提供完整的环境信息
 * - 无缝连接：六个面在边缘处无缝连接
 * - 高效采样：GPU对立方体纹理有专门的优化
 * - 方向映射：使用3D方向向量进行采样
 *
 * 主要用途：
 * - 天空盒（Skybox）：创建无限远的背景环境
 * - 环境映射（Environment Mapping）：实现反射和环境光照
 * - 基于图像的光照（IBL）：提供真实的环境光照
 * - 全景图显示：展示360度全景内容
 *
 * 图像顺序（标准立方体映射）：
 * - 索引0：正X面（右侧，+X方向）
 * - 索引1：负X面（左侧，-X方向）
 * - 索引2：正Y面（顶部，+Y方向）
 * - 索引3：负Y面（底部，-Y方向）
 * - 索引4：正Z面（前面，+Z方向）
 * - 索引5：负Z面（后面，-Z方向）
 *
 * 使用示例：
 * ```js
 * // 使用CubeTextureLoader加载立方体纹理
 * const loader = new THREE.CubeTextureLoader();
 * loader.setPath( 'textures/cube/pisa/' );
 *
 * const textureCube = loader.load( [
 * 	'px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'
 * ] );
 *
 * // 用作环境贴图
 * const material = new THREE.MeshBasicMaterial( { color: 0xffffff, envMap: textureCube } );
 *
 * // 用作场景背景
 * scene.background = textureCube;
 * ```
 *
 * @augments Texture - 继承自基础纹理类，具有所有纹理的基本功能
 */
class CubeTexture extends Texture {
  /**
   * 构造一个新的立方体纹理
   *
   * 创建由六个图像组成的立方体纹理，默认使用立方体反射映射
   * 图像数组的顺序必须按照标准立方体映射的面顺序排列
   *
   * @param {Array<Image>} [images=[]] - 包含立方体每个面图像的数组
   *                                    数组长度应该为6，按照+X,-X,+Y,-Y,+Z,-Z的顺序
   *                                    每个元素可以是Image、Canvas或其他图像源
   * @param {number} [mapping=CubeReflectionMapping] - 纹理映射方式
   *                                                  默认使用立方体反射映射，适合环境映射
   * @param {number} [wrapS=ClampToEdgeWrapping] - S轴（水平）包装模式
   *                                              立方体纹理通常使用边缘夹紧模式
   * @param {number} [wrapT=ClampToEdgeWrapping] - T轴（垂直）包装模式
   *                                              立方体纹理通常使用边缘夹紧模式
   * @param {number} [magFilter=LinearFilter] - 放大过滤器
   *                                           线性过滤提供平滑的视觉效果
   * @param {number} [minFilter=LinearMipmapLinearFilter] - 缩小过滤器
   *                                                       支持多级渐远纹理的线性过滤
   * @param {number} [format=RGBAFormat] - 纹理格式
   *                                      通常使用RGBA格式支持透明度
   * @param {number} [type=UnsignedByteType] - 纹理数据类型
   *                                          标准的无符号字节类型
   * @param {number} [anisotropy=Texture.DEFAULT_ANISOTROPY] - 各向异性过滤级别
   *                                                          提高倾斜角度观看时的纹理质量
   * @param {string} [colorSpace=NoColorSpace] - 颜色空间
   *                                            定义颜色数据的解释方式
   */
  constructor(images = [], mapping = CubeReflectionMapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, colorSpace) {
    // 调用父类构造函数，传入图像数组和其他参数
    super(images, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, colorSpace);

    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 CubeTexture 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isCubeTexture = true;

    /**
     * 是否在上传到GPU时沿垂直轴翻转纹理
     *
     * 对于立方体纹理，默认设置为 false
     * 因为立方体纹理的每个面都有特定的方向要求，不应该翻转
     *
     * 立方体纹理的方向约定：
     * - 每个面都有标准的朝向
     * - 翻转会破坏面之间的连续性
     * - 通常在图像准备阶段就确保正确的方向
     *
     * @type {boolean}
     * @default false
     */
    this.flipY = false;
  }

  // ===== 访问器属性 =====

  /**
   * 获取立方体纹理的图像数组
   *
   * 这是 image 属性的别名，提供更直观的访问方式
   * 返回包含六个面图像的数组
   *
   * @type {Array<Image>}
   */
  get images() {
    return this.image;
  }

  /**
   * 设置立方体纹理的图像数组
   *
   * 这是 image 属性的别名，提供更直观的设置方式
   * 设置包含六个面图像的数组
   *
   * 注意事项：
   * - 数组长度应该为6
   * - 图像顺序必须正确（+X,-X,+Y,-Y,+Z,-Z）
   * - 所有图像应该具有相同的尺寸
   * - 设置后需要调用 needsUpdate = true
   *
   * @type {Array<Image>}
   */
  set images(value) {
    this.image = value;
  }
}

// ===== 模块导出 =====

/**
 * 导出 CubeTexture 类
 *
 * CubeTexture 类是实现环境映射和天空盒效果的核心组件
 * 提供了完整的360度环境纹理功能，是现代3D渲染的重要工具
 */
export { CubeTexture };
