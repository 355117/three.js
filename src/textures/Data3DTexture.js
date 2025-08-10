// 导入基础纹理类
import { Texture } from "./Texture.js";
// 导入3D纹理相关的常量
import { ClampToEdgeWrapping, NearestFilter } from "../constants.js";

/**
 * 三维数据纹理类
 *
 * 从原始数据创建三维纹理，具有宽度、高度和深度参数
 * 三维纹理是体积数据的表示，可以存储三维空间中的数据
 *
 * 三维纹理的特点：
 * - 体积数据：存储三维空间中每个体素（voxel）的数据
 * - 三维采样：使用UVW坐标进行三维采样
 * - 内存密集：比2D纹理占用更多内存
 * - 硬件支持：现代GPU对3D纹理有原生支持
 *
 * 主要用途：
 * - 体积渲染（Volume Rendering）
 * - 医学图像可视化（CT、MRI扫描）
 * - 科学数据可视化（流体模拟、气象数据）
 * - 3D噪声纹理（程序化生成）
 * - 体积光照效果（体积雾、云朵）
 * - 3D查找表（LUT）
 *
 * 数据组织：
 * - 数据按Z、Y、X顺序排列
 * - 每个体素可以包含多个分量（RGB、RGBA等）
 * - 总数据大小 = width × height × depth × 分量数 × 字节数
 *
 * 坐标系统：
 * - U: 水平坐标（0-1，对应width）
 * - V: 垂直坐标（0-1，对应height）
 * - W: 深度坐标（0-1，对应depth）
 *
 * 性能考虑：
 * - 内存使用量大，需要谨慎管理
 * - 采样性能比2D纹理低
 * - 适合使用最近邻过滤保持数据精度
 *
 * 使用示例：
 * ```js
 * // 创建简单的3D噪声纹理
 * const size = 64;
 * const data = new Uint8Array(size * size * size);
 * for (let i = 0; i < data.length; i++) {
 *   data[i] = Math.random() * 255;
 * }
 * const texture3D = new THREE.Data3DTexture(data, size, size, size);
 * texture3D.format = THREE.RedFormat;
 * texture3D.needsUpdate = true;
 * ```
 *
 * @augments Texture - 继承自基础纹理类，具有所有纹理的基本功能
 */
class Data3DTexture extends Texture {
  /**
   * 构造一个新的三维数据纹理
   *
   * 从原始数据数组创建三维纹理，需要指定三维尺寸
   * 数据按照Z、Y、X的顺序组织，每个体素可以包含多个分量
   *
   * @param {?TypedArray} [data=null] - 缓冲区数据
   *                                   通常是 Uint8Array、Float32Array 等类型化数组
   *                                   数据长度应该等于 width × height × depth × 分量数
   *                                   数据按Z、Y、X顺序排列
   * @param {number} [width=1] - 纹理宽度（体素）
   *                            X轴方向的体素数量，必须是正整数
   * @param {number} [height=1] - 纹理高度（体素）
   *                             Y轴方向的体素数量，必须是正整数
   * @param {number} [depth=1] - 纹理深度（体素）
   *                            Z轴方向的体素数量，必须是正整数
   */
  constructor(data = null, width = 1, height = 1, depth = 1) {
    // 注意：未来可能会添加 .setXXX() 方法来设置属性
    // 用户仍然可以直接在 Data3DTexture 上设置属性
    //
    //	const texture = new THREE.Data3DTexture( data, width, height, depth );
    // 	texture.anisotropy = 16;
    //
    // 参见 issue #14839

    // 调用父类构造函数，传入null作为图像参数
    super(null);

    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 Data3DTexture 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isData3DTexture = true;

    /**
     * 三维数据纹理的图像定义
     *
     * 包含纹理的原始数据和三维尺寸信息
     * 这个对象替代了普通纹理中的图像元素
     *
     * 对象结构：
     * - data: 原始体素数据数组
     * - width: 纹理宽度（X轴体素数）
     * - height: 纹理高度（Y轴体素数）
     * - depth: 纹理深度（Z轴体素数）
     *
     * 数据索引计算：
     * index = z * width * height + y * width + x
     *
     * @type {{data: TypedArray, width: number, height: number, depth: number}}
     */
    this.image = { data, width, height, depth };

    /**
     * 放大过滤器
     *
     * 当纹理被放大时使用的过滤算法
     * 对于三维数据纹理，默认使用最近邻过滤
     *
     * 使用最近邻过滤的原因：
     * - 保持数据的精确性，避免插值
     * - 适合体积数据的离散特性
     * - 避免边界伪影
     * - 提高采样性能
     *
     * @type {(NearestFilter|NearestMipmapNearestFilter|NearestMipmapLinearFilter|LinearFilter|LinearMipmapNearestFilter|LinearMipmapLinearFilter)}
     * @default NearestFilter
     */
    this.magFilter = NearestFilter;

    /**
     * 缩小过滤器
     *
     * 当纹理被缩小时使用的过滤算法
     * 对于三维数据纹理，默认使用最近邻过滤
     *
     * 使用最近邻过滤的原因：
     * - 保持数据的精确性，避免插值
     * - 适合体积数据的离散特性
     * - 避免混合不相关的体素数据
     * - 提高采样性能
     *
     * @type {(NearestFilter|NearestMipmapNearestFilter|NearestMipmapLinearFilter|LinearFilter|LinearMipmapNearestFilter|LinearMipmapLinearFilter)}
     * @default NearestFilter
     */
    this.minFilter = NearestFilter;

    /**
     * R轴（深度）包装模式
     *
     * 定义纹理在深度方向（W坐标）的包装行为
     * 对应UVW映射中的W轴处理方式
     *
     * 包装模式选项：
     * - ClampToEdgeWrapping: 边缘夹紧（默认）
     * - RepeatWrapping: 重复包装
     * - MirroredRepeatWrapping: 镜像重复包装
     *
     * 对于三维数据纹理，通常使用边缘夹紧模式，因为：
     * - 体积数据有明确的边界
     * - 避免不合理的数据重复
     * - 确保W坐标在有效范围内
     *
     * @type {(RepeatWrapping|ClampToEdgeWrapping|MirroredRepeatWrapping)}
     * @default ClampToEdgeWrapping
     */
    this.wrapR = ClampToEdgeWrapping;

    /**
     * 是否生成多级渐远纹理（Mipmaps）
     *
     * 对于三维数据纹理，默认设置为 false
     * 因为体积数据通常需要保持精确性
     *
     * 不生成Mipmaps的原因：
     * - 体积数据的插值可能导致错误的结果
     * - 三维Mipmaps会显著增加内存使用
     * - 体积渲染通常需要原始精度
     * - 生成成本高，收益有限
     *
     * @type {boolean}
     * @default false
     */
    this.generateMipmaps = false;

    /**
     * 是否在上传到GPU时沿垂直轴翻转纹理
     *
     * 对于三维数据纹理，默认设置为 false
     * 因为体积数据的坐标系通常与数据的组织方式一致
     *
     * 不翻转的原因：
     * - 体积数据有特定的空间方向
     * - 翻转可能导致数据解释错误
     * - 医学图像等有标准的方向约定
     * - 三维数据的Y轴翻转会影响整体结构
     *
     * @type {boolean}
     * @default false
     */
    this.flipY = false;

    /**
     * 内存中每个像素行起始位置的对齐要求
     *
     * 对于三维数据纹理，默认设置为 1（字节对齐）
     * 这确保了数据的紧密排列，没有额外的填充字节
     *
     * 对齐值的影响：
     * - 1: 字节对齐，数据紧密排列
     * - 4: 4字节对齐，可能有填充字节
     * - 8: 8字节对齐，可能有更多填充字节
     *
     * 三维数据纹理通常使用1字节对齐以确保：
     * - 数据的精确控制
     * - 内存使用的最小化
     * - 与原始数据格式的一致性
     *
     * @type {number}
     * @default 1
     */
    this.unpackAlignment = 1;
  }
}

// ===== 模块导出 =====

/**
 * 导出 Data3DTexture 类
 *
 * Data3DTexture 类是处理三维体积数据的专用纹理类
 * 是实现体积渲染和三维数据可视化的重要工具
 */
export { Data3DTexture };
