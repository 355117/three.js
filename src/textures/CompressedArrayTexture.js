// 导入边缘夹紧包装常量
import { ClampToEdgeWrapping } from "../constants.js";
// 导入压缩纹理基类
import { CompressedTexture } from "./CompressedTexture.js";

/**
 * 压缩数组纹理类
 *
 * 基于压缩格式数据创建2D纹理数组，是压缩纹理的扩展版本
 * 纹理数组允许在单个纹理对象中存储多个2D纹理层
 *
 * 纹理数组的优势：
 * - 批量处理：一次调用可以处理多个纹理
 * - 内存效率：减少纹理切换的开销
 * - 着色器优化：可以在着色器中动态选择纹理层
 * - 压缩优化：结合压缩格式，进一步优化内存使用
 *
 * 主要特点：
 * - 三维索引：使用UVW坐标，W坐标选择纹理层
 * - 层级更新：支持单独更新特定层，提高性能
 * - 压缩支持：每层都使用相同的压缩格式
 * - 硬件加速：现代GPU对纹理数组有原生支持
 *
 * 使用场景：
 * - 地形纹理系统（多种地表材质）
 * - 动画序列（帧动画纹理）
 * - 材质变体（同一物体的不同材质）
 * - 光照贴图数组（多个物体的光照信息）
 * - 阴影贴图级联（级联阴影映射）
 *
 * 坐标系统：
 * - U: 水平坐标（0-1）
 * - V: 垂直坐标（0-1）
 * - W: 深度坐标（0-1），对应纹理层索引
 *
 * 通常通过 CompressedTextureLoader 加载：
 * ```js
 * const loader = new THREE.CompressedTextureLoader();
 * const textureArray = loader.load('texture_array.ktx2');
 * ```
 *
 * @augments CompressedTexture - 继承自压缩纹理类，具有所有压缩纹理的功能
 */
class CompressedArrayTexture extends CompressedTexture {
  /**
   * 构造一个新的压缩数组纹理
   *
   * 创建包含多个压缩纹理层的数组纹理
   * 每一层都是相同尺寸的2D纹理，使用相同的压缩格式
   *
   * @param {Array<Object>} mipmaps - 包含所有Mipmap级别的数据和尺寸数组
   *                                 对于数组纹理，每个Mipmap级别包含所有层的数据
   *                                 数据结构：[{data: ArrayBuffer, width: number, height: number, depth: number}]
   * @param {number} width - 纹理宽度（像素）
   *                        每一层纹理的宽度，必须是正整数
   * @param {number} height - 纹理高度（像素）
   *                         每一层纹理的高度，必须是正整数
   * @param {number} depth - 纹理深度（层数）
   *                        数组中包含的纹理层数量，必须是正整数
   * @param {number} [format=RGBAFormat] - 纹理格式
   *                                      对于压缩数组纹理，通常是特定的压缩格式常量
   * @param {number} [type=UnsignedByteType] - 纹理数据类型
   *                                          压缩数组纹理通常使用特定的类型
   */
  constructor(mipmaps, width, height, depth, format, type) {
    // 调用父类构造函数，传递基本的压缩纹理参数
    super(mipmaps, width, height, format, type);

    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 CompressedArrayTexture 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isCompressedArrayTexture = true;

    /**
     * 压缩数组纹理的图像属性
     *
     * 扩展父类的图像属性，添加深度（层数）信息
     * 对于数组纹理，图像属性定义了三维尺寸
     *
     * 深度值表示：
     * - 纹理数组中包含的层数
     * - 着色器中W坐标的范围（0到depth-1）
     * - 内存分配的层数计算基础
     *
     * @name CompressedArrayTexture#image
     * @type {{width: number, height: number, depth: number}}
     */
    this.image.depth = depth;

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
     * 对于纹理数组，通常使用边缘夹紧模式，因为：
     * - 避免层间的意外混合
     * - 确保W坐标在有效范围内
     * - 提供可预测的采样行为
     *
     * @type {(RepeatWrapping|ClampToEdgeWrapping|MirroredRepeatWrapping)}
     * @default ClampToEdgeWrapping
     */
    this.wrapR = ClampToEdgeWrapping;

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
   * - 正常情况下，needsUpdate=true会上传整个压缩纹理数组
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
 * 导出 CompressedArrayTexture 类
 *
 * CompressedArrayTexture 类是处理压缩纹理数组的专用类
 * 结合了压缩纹理的内存优势和纹理数组的批处理能力
 */
export { CompressedArrayTexture };
