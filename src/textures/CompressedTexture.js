// 导入基础纹理类
import { Texture } from "./Texture.js";

/**
 * 压缩纹理类
 *
 * 基于压缩格式数据创建纹理，主要用于优化内存使用和加载性能
 * 压缩纹理可以显著减少GPU内存占用和带宽需求
 *
 * 压缩纹理的优势：
 * - 内存效率：比未压缩纹理占用更少的GPU内存
 * - 带宽优化：减少GPU内存带宽的使用
 * - 加载性能：文件更小，加载更快
 * - 硬件支持：现代GPU对压缩纹理有原生支持
 *
 * 常见的压缩格式：
 * - DXT/S3TC：DirectX纹理压缩，广泛支持
 * - ETC1/ETC2：Ericsson纹理压缩，移动设备常用
 * - PVRTC：PowerVR纹理压缩，iOS设备专用
 * - ASTC：自适应可伸缩纹理压缩，新一代标准
 * - BC1-BC7：块压缩格式，DirectX 11+
 *
 * 使用限制：
 * - 不能动态生成Mipmaps，必须预先嵌入
 * - 不能进行垂直翻转操作
 * - 格式支持依赖于硬件和驱动
 * - 压缩可能导致质量损失
 *
 * 使用场景：
 * - 移动设备应用（内存受限）
 * - 大型纹理资源（如地形纹理）
 * - 网络游戏（减少下载时间）
 * - VR应用（高分辨率纹理优化）
 *
 * 通常通过 CompressedTextureLoader 加载：
 * ```js
 * const loader = new THREE.CompressedTextureLoader();
 * const texture = loader.load('texture.dds');
 * ```
 *
 * @augments Texture - 继承自基础纹理类，具有所有纹理的基本功能
 */
class CompressedTexture extends Texture {
  /**
   * 构造一个新的压缩纹理
   *
   * 创建基于压缩数据的纹理，需要提供预先准备的Mipmap数据
   * 压缩纹理的数据格式和结构由具体的压缩算法决定
   *
   * @param {Array<Object>} mipmaps - 包含所有Mipmap级别（包括基础级别）的数据和尺寸数组
   *                                 每个对象包含：{data: ArrayBuffer, width: number, height: number}
   *                                 数组按Mipmap级别排序，索引0为最高分辨率
   * @param {number} width - 纹理宽度（像素）
   *                        必须是正整数，通常是2的幂次方
   * @param {number} height - 纹理高度（像素）
   *                         必须是正整数，通常是2的幂次方
   * @param {number} [format=RGBAFormat] - 纹理格式
   *                                      对于压缩纹理，通常是特定的压缩格式常量
   * @param {number} [type=UnsignedByteType] - 纹理数据类型
   *                                          压缩纹理通常使用特定的类型
   * @param {number} [mapping=Texture.DEFAULT_MAPPING] - 纹理映射方式
   *                                                     定义纹理坐标如何映射到3D表面
   * @param {number} [wrapS=ClampToEdgeWrapping] - S轴（水平）包装模式
   *                                              控制纹理在水平方向的重复行为
   * @param {number} [wrapT=ClampToEdgeWrapping] - T轴（垂直）包装模式
   *                                              控制纹理在垂直方向的重复行为
   * @param {number} [magFilter=LinearFilter] - 放大过滤器
   *                                           当纹理被放大时使用的过滤算法
   * @param {number} [minFilter=LinearMipmapLinearFilter] - 缩小过滤器
   *                                                       当纹理被缩小时使用的过滤算法
   * @param {number} [anisotropy=Texture.DEFAULT_ANISOTROPY] - 各向异性过滤级别
   *                                                          提高倾斜角度观看时的纹理质量
   * @param {string} [colorSpace=NoColorSpace] - 颜色空间
   *                                            定义颜色数据的解释方式
   */
  constructor(mipmaps, width, height, format, type, mapping, wrapS, wrapT, magFilter, minFilter, anisotropy, colorSpace) {
    // 调用父类构造函数，注意第一个参数传入null（因为没有图像对象）
    super(null, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, colorSpace);

    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 CompressedTexture 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isCompressedTexture = true;

    /**
     * 压缩纹理的图像属性
     *
     * 对于压缩纹理，图像属性仅定义其尺寸信息
     * 实际的图像数据存储在mipmaps数组中
     *
     * 这个对象提供纹理的基本尺寸信息，用于：
     * - 纹理坐标计算
     * - 渲染管线的尺寸检查
     * - 内存分配计算
     *
     * @type {{width: number, height: number}}
     */
    this.image = { width: width, height: height };

    /**
     * Mipmap数据数组
     *
     * 包含所有Mipmap级别（包括基础级别）的压缩数据和尺寸信息
     * 每个元素是一个对象，包含该级别的压缩数据和尺寸
     *
     * 数组结构：
     * - 索引0：最高分辨率级别（基础Mipmap）
     * - 索引1：一半分辨率级别
     * - 索引n：最低分辨率级别（通常是1x1）
     *
     * 每个Mipmap对象包含：
     * - data: 压缩的像素数据（ArrayBuffer或TypedArray）
     * - width: 该级别的宽度
     * - height: 该级别的高度
     *
     * 注意事项：
     * - 压缩纹理必须预先包含所有需要的Mipmap级别
     * - 不能动态生成，必须在压缩时嵌入
     * - 数据格式取决于具体的压缩算法
     *
     * @type {Array<Object>}
     */
    this.mipmaps = mipmaps;

    /**
     * 是否在上传到GPU时沿垂直轴翻转纹理
     *
     * 对于压缩纹理，强制设置为 false
     * 因为压缩纹理不支持翻转操作
     *
     * 不支持翻转的原因：
     * - 压缩数据的块结构不允许简单的翻转
     * - 翻转需要重新压缩数据
     * - 硬件解压缩器不支持翻转
     *
     * 如果需要翻转效果，必须在压缩前处理原始图像
     *
     * @type {boolean}
     * @default false
     * @readonly
     */
    this.flipY = false;

    /**
     * 是否生成多级渐远纹理（Mipmaps）
     *
     * 对于压缩纹理，强制设置为 false
     * 因为压缩纹理不能动态生成Mipmaps
     *
     * 压缩纹理的Mipmap限制：
     * - 必须在压缩时预先生成并嵌入
     * - GPU无法从压缩数据动态生成Mipmaps
     * - 所有Mipmap级别必须使用相同的压缩格式
     *
     * 如果需要Mipmaps，必须：
     * 1. 在压缩前生成所有Mipmap级别
     * 2. 分别压缩每个级别
     * 3. 将所有级别包含在mipmaps数组中
     *
     * @type {boolean}
     * @default false
     * @readonly
     */
    this.generateMipmaps = false;
  }
}

// ===== 模块导出 =====

/**
 * 导出 CompressedTexture 类
 *
 * CompressedTexture 类是处理压缩纹理格式的专用类
 * 提供了高效的内存使用和优化的渲染性能，是现代3D应用的重要组件
 */
export { CompressedTexture };
