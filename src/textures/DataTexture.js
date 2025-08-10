// 导入基础纹理类
import { Texture } from "./Texture.js";
// 导入最近邻过滤常量，数据纹理的默认过滤方式
import { NearestFilter } from "../constants.js";

/**
 * 数据纹理类
 *
 * 直接从原始缓冲区数据创建纹理，无需图像文件
 * 主要用于程序化生成的纹理数据或需要精确控制像素值的场景
 *
 * 数据解释规则：
 * - 数据的解释取决于类型（type）和格式（format）
 * - 如果类型是 UnsignedByteType，使用 Uint8Array 来访问纹素数据
 * - 如果格式是 RGBAFormat，每个纹素需要四个值：红、绿、蓝、透明度
 *
 * 主要特点：
 * - 完全控制：可以精确控制每个像素的值
 * - 高性能：直接使用原始数据，无需图像解码
 * - 灵活性：支持各种数据格式和类型
 * - 程序化：适合算法生成的纹理内容
 *
 * 使用场景：
 * - 程序化纹理生成（噪声、渐变等）
 * - 数据可视化（热力图、高度图等）
 * - 查找表（LUT）纹理
 * - 计算着色器的输入/输出数据
 * - 自定义图像处理结果
 *
 * 数据格式示例：
 * ```js
 * // RGBA格式的2x2红色纹理
 * const data = new Uint8Array([
 *   255, 0, 0, 255,  // 像素(0,0): 红色
 *   255, 0, 0, 255,  // 像素(1,0): 红色
 *   255, 0, 0, 255,  // 像素(0,1): 红色
 *   255, 0, 0, 255   // 像素(1,1): 红色
 * ]);
 * const texture = new THREE.DataTexture(data, 2, 2);
 * ```
 *
 * @augments Texture - 继承自基础纹理类，具有所有纹理的基本功能
 */
class DataTexture extends Texture {
  /**
   * 构造一个新的数据纹理
   *
   * 从原始数据数组创建纹理，需要指定数据、尺寸和格式信息
   * 默认使用最近邻过滤，适合像素精确的应用
   *
   * @param {?TypedArray} [data=null] - 缓冲区数据
   *                                   通常是 Uint8Array、Float32Array 等类型化数组
   *                                   数据长度应该等于 width × height × 每像素字节数
   * @param {number} [width=1] - 纹理宽度（像素）
   *                            必须是正整数，通常是2的幂次方以获得最佳性能
   * @param {number} [height=1] - 纹理高度（像素）
   *                             必须是正整数，通常是2的幂次方以获得最佳性能
   * @param {number} [format=RGBAFormat] - 纹理格式
   *                                      定义像素数据的组织方式（RGB、RGBA、Luminance等）
   * @param {number} [type=UnsignedByteType] - 纹理数据类型
   *                                          定义每个分量的数据类型（字节、浮点等）
   * @param {number} [mapping=Texture.DEFAULT_MAPPING] - 纹理映射方式
   *                                                     定义纹理坐标如何映射到3D表面
   * @param {number} [wrapS=ClampToEdgeWrapping] - S轴（水平）包装模式
   *                                              控制纹理在水平方向的重复行为
   * @param {number} [wrapT=ClampToEdgeWrapping] - T轴（垂直）包装模式
   *                                              控制纹理在垂直方向的重复行为
   * @param {number} [magFilter=NearestFilter] - 放大过滤器
   *                                            默认使用最近邻过滤，保持像素精确性
   * @param {number} [minFilter=NearestFilter] - 缩小过滤器
   *                                            默认使用最近邻过滤，保持像素精确性
   * @param {number} [anisotropy=Texture.DEFAULT_ANISOTROPY] - 各向异性过滤级别
   *                                                          提高倾斜角度观看时的纹理质量
   * @param {string} [colorSpace=NoColorSpace] - 颜色空间
   *                                            定义颜色数据的解释方式
   */
  constructor(data = null, width = 1, height = 1, format, type, mapping, wrapS, wrapT, magFilter = NearestFilter, minFilter = NearestFilter, anisotropy, colorSpace) {
    // 调用父类构造函数，注意第一个参数传入null（因为没有图像对象）
    super(null, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, colorSpace);

    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 DataTexture 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isDataTexture = true;

    /**
     * 数据纹理的图像定义
     *
     * 包含纹理的原始数据和尺寸信息
     * 这个对象替代了普通纹理中的图像元素
     *
     * 对象结构：
     * - data: 原始像素数据数组
     * - width: 纹理宽度
     * - height: 纹理高度
     *
     * @type {{data: TypedArray, width: number, height: number}}
     */
    this.image = { data: data, width: width, height: height };

    /**
     * 是否生成多级渐远纹理（Mipmaps）
     *
     * 对于数据纹理，默认设置为 false
     * 因为数据纹理通常用于精确的像素操作，不需要多级渐远纹理
     *
     * 多级渐远纹理的作用：
     * - 提高远距离观看时的渲染质量
     * - 减少纹理走样（aliasing）
     * - 但会增加内存使用和生成时间
     *
     * @type {boolean}
     * @default false
     */
    this.generateMipmaps = false;

    /**
     * 是否在上传到GPU时沿垂直轴翻转纹理
     *
     * 对于数据纹理，默认设置为 false
     * 因为数据纹理的坐标系通常与数据的组织方式一致
     *
     * 翻转的原因：
     * - 图像文件的坐标系（左上角为原点）与OpenGL坐标系（左下角为原点）不同
     * - 数据纹理通常按程序逻辑组织，不需要翻转
     *
     * @type {boolean}
     * @default false
     */
    this.flipY = false;

    /**
     * 内存中每个像素行起始位置的对齐要求
     *
     * 对于数据纹理，默认设置为 1（字节对齐）
     * 这确保了数据的紧密排列，没有额外的填充字节
     *
     * 对齐值的影响：
     * - 1: 字节对齐，数据紧密排列
     * - 4: 4字节对齐，可能有填充字节
     * - 8: 8字节对齐，可能有更多填充字节
     *
     * 数据纹理通常使用1字节对齐以确保数据的精确控制
     *
     * @type {number}
     * @default 1
     */
    this.unpackAlignment = 1;
  }
}

// ===== 模块导出 =====

/**
 * 导出 DataTexture 类
 *
 * DataTexture 类是处理原始像素数据的专用纹理类
 * 是实现程序化纹理生成和精确像素控制的重要工具
 */
export { DataTexture };
