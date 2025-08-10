// 导入立方体反射映射常量
import { CubeReflectionMapping } from "../constants.js";
// 导入压缩纹理基类
import { CompressedTexture } from "./CompressedTexture.js";

/**
 * 压缩立方体纹理类
 *
 * 基于压缩格式数据创建立方体纹理，结合了压缩纹理和立方体纹理的优势
 * 主要用于优化环境映射和天空盒的内存使用
 *
 * 压缩立方体纹理的优势：
 * - 内存效率：比未压缩立方体纹理占用更少的GPU内存
 * - 带宽优化：减少GPU内存带宽的使用
 * - 加载性能：文件更小，加载更快
 * - 环境映射：提供高质量的360度环境效果
 *
 * 立方体结构：
 * - 六个面：+X、-X、+Y、-Y、+Z、-Z
 * - 每个面都是压缩的2D纹理
 * - 所有面使用相同的压缩格式和尺寸
 * - 面之间在边缘处无缝连接
 *
 * 压缩格式支持：
 * - DXT/S3TC：广泛支持的压缩格式
 * - ETC2：移动设备优化的压缩格式
 * - ASTC：新一代自适应压缩格式
 * - BC6H/BC7：HDR和高质量压缩格式
 *
 * 使用场景：
 * - 移动VR应用的环境映射
 * - 高分辨率天空盒优化
 * - 实时反射效果
 * - 基于图像的光照（IBL）
 * - 全景图显示优化
 *
 * 技术特点：
 * - 方向采样：使用3D方向向量进行采样
 * - 硬件优化：GPU对立方体纹理有专门支持
 * - 压缩优化：每个面独立压缩，保持质量
 * - 无缝连接：压缩不会破坏面间的连续性
 *
 * 通常通过 CompressedTextureLoader 加载：
 * ```js
 * const loader = new THREE.CompressedTextureLoader();
 * const cubeTexture = loader.load([
 *   'px.dds', 'nx.dds', 'py.dds', 'ny.dds', 'pz.dds', 'nz.dds'
 * ]);
 * ```
 *
 * @augments CompressedTexture - 继承自压缩纹理类，具有所有压缩纹理的功能
 */
class CompressedCubeTexture extends CompressedTexture {
  /**
   * 构造一个新的压缩立方体纹理
   *
   * 从六个压缩纹理创建立方体纹理，每个纹理对应立方体的一个面
   * 所有面必须具有相同的尺寸和压缩格式
   *
   * @param {Array<CompressedTexture>} images - 压缩纹理数组
   *                                           包含六个压缩纹理，按照标准立方体映射顺序：
   *                                           [+X, -X, +Y, -Y, +Z, -Z]
   *                                           每个纹理必须是相同尺寸的正方形
   * @param {number} [format=RGBAFormat] - 纹理格式
   *                                      对于压缩立方体纹理，通常是特定的压缩格式常量
   *                                      所有面必须使用相同的格式
   * @param {number} [type=UnsignedByteType] - 纹理数据类型
   *                                          压缩立方体纹理通常使用特定的类型
   *                                          所有面必须使用相同的类型
   */
  constructor(images, format, type) {
    // 调用父类构造函数
    // 注意：第一个参数传入undefined（mipmaps），因为立方体纹理的mipmaps存储在各个面中
    // 使用第一个面的尺寸作为整个立方体纹理的尺寸
    // 默认使用立方体反射映射
    super(undefined, images[0].width, images[0].height, format, type, CubeReflectionMapping);

    /**
     * 压缩立方体纹理类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 CompressedCubeTexture 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isCompressedCubeTexture = true;

    /**
     * 立方体纹理类型标识符
     *
     * 用于运行时类型检测，表明这个对象也是立方体纹理
     * 这样可以同时被识别为压缩纹理和立方体纹理
     *
     * 双重身份的意义：
     * - 可以使用立方体纹理的所有功能
     * - 可以享受压缩纹理的内存优势
     * - 兼容现有的立方体纹理处理代码
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isCubeTexture = true;

    /**
     * 立方体纹理的图像数组
     *
     * 存储六个面的压缩纹理数据
     * 每个元素都是一个压缩纹理，包含该面的所有mipmap级别
     *
     * 数组结构：
     * - 索引0：+X面（右侧）
     * - 索引1：-X面（左侧）
     * - 索引2：+Y面（顶部）
     * - 索引3：-Y面（底部）
     * - 索引4：+Z面（前面）
     * - 索引5：-Z面（后面）
     *
     * 每个面的要求：
     * - 必须是正方形纹理
     * - 所有面尺寸必须相同
     * - 所有面格式必须相同
     * - 包含完整的mipmap链（如果需要）
     */
    this.image = images;
  }
}

// ===== 模块导出 =====

/**
 * 导出 CompressedCubeTexture 类
 *
 * CompressedCubeTexture 类是处理压缩立方体纹理的专用类
 * 结合了压缩纹理的内存优势和立方体纹理的环境映射能力
 */
export { CompressedCubeTexture };
