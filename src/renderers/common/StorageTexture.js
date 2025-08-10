// 导入基础纹理类和线性过滤常量
import { Texture } from "../../textures/Texture.js";
import { LinearFilter } from "../../constants.js";

/**
 * 存储纹理类
 *
 * 这种特殊类型的纹理专为计算着色器设计。它可以用于通过计算着色器
 * 计算纹理的数据。存储纹理允许着色器直接写入纹理数据，而不仅仅是读取。
 *
 * 注意：此类型的纹理只能与 `WebGPURenderer` 和 WebGPU 后端一起使用。
 *
 * @augments Texture
 */
class StorageTexture extends Texture {
  /**
   * 构造一个新的存储纹理
   *
   * @param {number} [width=1] - 存储纹理的宽度
   * @param {number} [height=1] - 存储纹理的高度
   */
  constructor(width = 1, height = 1) {
    // 调用父类构造函数
    super();

    /**
     * 图像对象，仅表示纹理的尺寸
     * 存储纹理不包含实际的图像数据，只定义尺寸信息
     *
     * @type {{width: number, height: number}}
     */
    this.image = { width, height };

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
   * 设置存储纹理的尺寸
   * 当尺寸发生变化时，会销毁旧的纹理资源
   *
   * @param {number} width - 存储纹理的新宽度
   * @param {number} height - 存储纹理的新高度
   */
  setSize(width, height) {
    // 检查尺寸是否发生变化
    if (this.image.width !== width || this.image.height !== height) {
      // 更新尺寸
      this.image.width = width;
      this.image.height = height;

      // 销毁旧的纹理资源，强制重新创建
      this.dispose();
    }
  }
}

// 导出存储纹理类
export default StorageTexture;
