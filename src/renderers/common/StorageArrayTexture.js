// 导入基础纹理类和线性过滤常量
import { Texture } from "../../textures/Texture.js";
import { LinearFilter } from "../../constants.js";

/**
 * 存储数组纹理类
 *
 * 这种特殊类型的纹理专为计算着色器设计。它可以用于通过计算着色器
 * 计算数组纹理的数据。数组纹理包含多个2D纹理层，可以在着色器中
 * 通过索引访问不同的纹理层，常用于纹理图集、动画帧序列等场景。
 *
 * 注意：此类型的纹理只能与 `WebGPURenderer` 和 WebGPU 后端一起使用。
 *
 * @augments Texture
 */
class StorageArrayTexture extends Texture {
  /**
   * 构造一个新的存储数组纹理
   *
   * @param {number} [width=1] - 存储纹理的宽度
   * @param {number} [height=1] - 存储纹理的高度
   * @param {number} [depth=1] - 存储纹理的深度（层数）
   */
  constructor(width = 1, height = 1, depth = 1) {
    // 调用父类构造函数
    super();

    // 继承自纹理类，标识这是数组纹理
    // 数组纹理由多个2D纹理层组成
    this.isArrayTexture = true;

    /**
     * 图像对象，表示纹理的尺寸
     * 对于数组纹理，depth表示纹理层的数量
     *
     * @type {{width: number, height: number, depth: number}}
     */
    this.image = { width, height, depth };

    /**
     * 存储纹理的默认放大过滤器为线性过滤
     * 当纹理被放大时使用的过滤方式
     *
     * @type {number}
     */
    this.magFilter = LinearFilter;

    /**
     * 存储纹理的默认缩小过滤器为线性过滤
     * 当纹理被缩小时使用的过滤方式
     *
     * @type {number}
     */
    this.minFilter = LinearFilter;

    /**
     * 用于类型测试的标志
     * 标识此对象为存储纹理类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isStorageTexture = true;
  }

  /**
   * 设置存储数组纹理的尺寸
   * 当任何维度发生变化时，会销毁旧的纹理资源
   *
   * @param {number} width - 存储纹理的新宽度
   * @param {number} height - 存储纹理的新高度
   * @param {number} depth - 存储纹理的新深度（层数）
   */
  setSize(width, height, depth) {
    // 检查任何维度是否发生变化
    if (this.image.width !== width || this.image.height !== height || this.image.depth !== depth) {
      // 更新尺寸信息
      this.image.width = width;
      this.image.height = height;
      this.image.depth = depth;

      // 销毁旧的纹理资源，强制重新创建
      this.dispose();
    }
  }
}

// 导出存储数组纹理类
export default StorageArrayTexture;
