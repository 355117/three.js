// 导入基础纹理类
import { Texture } from "./Texture.js";
// 导入数组纹理相关的常量
import { ClampToEdgeWrapping, NearestFilter } from "../constants.js";

/**
 * 数据数组纹理类
 *
 * 直接从原始缓冲区数据创建纹理数组，是数据纹理的数组版本
 * 纹理数组允许在单个纹理对象中存储多个2D纹理层
 *
 * 数据数组纹理的特点：
 * - 层级结构：包含多个2D纹理层，每层具有相同的尺寸
 * - 原始数据：直接使用类型化数组作为数据源
 * - 三维采样：使用UVW坐标，W坐标选择纹理层
 * - 精确控制：可以精确控制每个像素的值
 *
 * 主要优势：
 * - 批量处理：一次调用可以处理多个纹理
 * - 内存效率：减少纹理切换的开销
 * - 着色器优化：可以在着色器中动态选择纹理层
 * - 层级更新：支持单独更新特定层，提高性能
 *
 * 使用场景：
 * - 动画序列纹理（帧动画）
 * - 地形纹理系统（多种地表材质）
 * - 材质变体集合（同一物体的不同材质）
 * - 程序化纹理生成（多层噪声）
 * - 数据可视化（时间序列数据）
 * - 光照贴图数组（多个物体的光照信息）
 *
 * 数据组织：
 * - 数据按层、行、列的顺序排列
 * - 每层是一个完整的2D纹理
 * - 总数据大小 = width × height × depth × 分量数 × 字节数
 *
 * 坐标系统：
 * - U: 水平坐标（0-1，对应width）
 * - V: 垂直坐标（0-1，对应height）
 * - W: 层索引坐标（0-1，对应depth）
 *
 * 性能优化：
 * - 支持层级更新，只更新变化的层
 * - 使用最近邻过滤保持数据精度
 * - 避免不必要的Mipmap生成
 *
 * 使用示例：
 * ```js
 * // 创建包含4层的纹理数组
 * const width = 256, height = 256, depth = 4;
 * const data = new Uint8Array(width * height * depth * 4); // RGBA
 *
 * // 填充每层数据
 * for (let layer = 0; layer < depth; layer++) {
 *   for (let i = 0; i < width * height; i++) {
 *     const offset = (layer * width * height + i) * 4;
 *     data[offset] = layer * 64;     // R
 *     data[offset + 1] = 0;          // G
 *     data[offset + 2] = 0;          // B
 *     data[offset + 3] = 255;        // A
 *   }
 * }
 *
 * const textureArray = new THREE.DataArrayTexture(data, width, height, depth);
 * textureArray.needsUpdate = true;
 * ```
 *
 * @augments Texture - 继承自基础纹理类，具有所有纹理的基本功能
 */
class DataArrayTexture extends Texture {
  /**
   * 构造一个新的数据数组纹理
   *
   * 从原始数据数组创建纹理数组，需要指定每层的尺寸和层数
   * 数据按照层、行、列的顺序组织，每层是一个完整的2D纹理
   *
   * @param {?TypedArray} [data=null] - 缓冲区数据
   *                                   通常是 Uint8Array、Float32Array 等类型化数组
   *                                   数据长度应该等于 width × height × depth × 分量数
   *                                   数据按层、行、列顺序排列
   * @param {number} [width=1] - 纹理宽度（像素）
   *                            每层纹理的宽度，必须是正整数
   * @param {number} [height=1] - 纹理高度（像素）
   *                             每层纹理的高度，必须是正整数
   * @param {number} [depth=1] - 纹理深度（层数）
   *                            数组中包含的纹理层数量，必须是正整数
   */
  constructor(data = null, width = 1, height = 1, depth = 1) {
    // 调用父类构造函数，传入null作为图像参数
    super(null);

    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 DataArrayTexture 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isDataArrayTexture = true;

    /**
     * 数据数组纹理的图像定义
     *
     * 包含纹理的原始数据和三维尺寸信息
     * 这个对象替代了普通纹理中的图像元素
     *
     * 对象结构：
     * - data: 原始像素数据数组
     * - width: 每层纹理的宽度
     * - height: 每层纹理的高度
     * - depth: 纹理层数
     *
     * 数据索引计算：
     * index = (layer * width * height + y * width + x) * components
     *
     * @type {{data: TypedArray, width: number, height: number, depth: number}}
     */
    this.image = { data, width, height, depth };

    /**
     * 放大过滤器
     *
     * 当纹理被放大时使用的过滤算法
     * 对于数据数组纹理，默认使用最近邻过滤
     *
     * 使用最近邻过滤的原因：
     * - 保持数据的精确性，避免插值
     * - 适合程序化生成的数据
     * - 避免层间的意外混合
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
     * 对于数据数组纹理，默认使用最近邻过滤
     *
     * 使用最近邻过滤的原因：
     * - 保持数据的精确性，避免插值
     * - 适合程序化生成的数据
     * - 避免不相关层的数据混合
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
     * 对于数据数组纹理，通常使用边缘夹紧模式，因为：
     * - 避免层间的意外混合
     * - 确保W坐标在有效范围内
     * - 提供可预测的采样行为
     *
     * @type {(RepeatWrapping|ClampToEdgeWrapping|MirroredRepeatWrapping)}
     * @default ClampToEdgeWrapping
     */
    this.wrapR = ClampToEdgeWrapping;

    /**
     * 是否生成多级渐远纹理（Mipmaps）
     *
     * 对于数据数组纹理，默认设置为 false
     * 因为数据纹理通常需要保持精确性
     *
     * 不生成Mipmaps的原因：
     * - 数据的插值可能导致错误的结果
     * - 数组纹理的Mipmaps会显著增加内存使用
     * - 程序化数据通常需要原始精度
     * - 层间插值可能产生意外效果
     *
     * @type {boolean}
     * @default false
     */
    this.generateMipmaps = false;

    /**
     * 是否在上传到GPU时沿垂直轴翻转纹理
     *
     * 对于数据数组纹理，默认设置为 false
     * 因为数据纹理的坐标系通常与数据的组织方式一致
     *
     * 不翻转的原因：
     * - 数据纹理通常按程序逻辑组织
     * - 翻转可能导致数据解释错误
     * - 保持与数据源的一致性
     * - 避免层间关系的混乱
     *
     * @type {boolean}
     * @default false
     */
    this.flipY = false;

    /**
     * 内存中每个像素行起始位置的对齐要求
     *
     * 对于数据数组纹理，默认设置为 1（字节对齐）
     * 这确保了数据的紧密排列，没有额外的填充字节
     *
     * 对齐值的影响：
     * - 1: 字节对齐，数据紧密排列
     * - 4: 4字节对齐，可能有填充字节
     * - 8: 8字节对齐，可能有更多填充字节
     *
     * 数据数组纹理通常使用1字节对齐以确保：
     * - 数据的精确控制
     * - 内存使用的最小化
     * - 与原始数据格式的一致性
     *
     * @type {number}
     * @default 1
     */
    this.unpackAlignment = 1;

    /**
     * 层更新注册表
     *
     * 记录需要更新的纹理层索引集合
     * 用于优化纹理上传，只更新变化的层而不是整个数组
     *
     * 性能优化原理：
     * - 避免上传整个纹理数组
     * - 只传输变化的层和相关Mipmaps
     * - 减少GPU内存带宽使用
     * - 提高动态纹理更新的性能
     *
     * 使用方式：
     * - addLayerUpdate(index): 标记层需要更新
     * - clearLayerUpdates(): 清除所有更新标记
     * - 渲染器会检查此集合来决定上传策略
     *
     * @type {Set<number>}
     */
    this.layerUpdates = new Set();
  }

  // ===== 层更新管理方法 =====

  /**
   * 标记特定层需要更新
   *
   * 描述纹理数组中的特定层需要更新到GPU
   * 这是一个性能优化功能，避免更新整个纹理数组
   *
   * 工作原理：
   * - 正常情况下，needsUpdate=true会上传整个数据纹理数组
   * - 标记特定层只会传输该层相关的所有Mipmap子集
   * - 这通常比上传整个数组更高效
   *
   * 使用场景：
   * - 动态纹理内容更新
   * - 流式纹理加载
   * - 实时纹理修改
   * - 纹理动画系统
   *
   * @param {number} layerIndex - 需要更新的层索引
   *                             必须在0到depth-1的范围内
   */
  addLayerUpdate(layerIndex) {
    this.layerUpdates.add(layerIndex);
  }

  /**
   * 重置层更新注册表
   *
   * 清除所有层更新标记，通常在完成更新后调用
   * 这样可以重新开始跟踪下一轮的层更新
   *
   * 调用时机：
   * - 完成纹理上传后
   * - 开始新的更新周期前
   * - 重置纹理状态时
   */
  clearLayerUpdates() {
    this.layerUpdates.clear();
  }
}

// ===== 模块导出 =====

/**
 * 导出 DataArrayTexture 类
 *
 * DataArrayTexture 类是处理原始数据纹理数组的专用类
 * 结合了数据纹理的精确控制和纹理数组的批处理能力
 */
export { DataArrayTexture };
