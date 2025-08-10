// 导入基础纹理类和相关常量
import { Texture } from "../../textures/Texture.js";
import { LinearFilter, ClampToEdgeWrapping } from "../../constants.js";

/**
 * 存储3D纹理类
 *
 * 这种特殊类型的纹理专为计算着色器设计。它可以用于通过计算着色器
 * 计算3D纹理的数据。3D纹理具有宽度、高度和深度三个维度，常用于
 * 体积渲染、3D噪声生成、体积光照等需要三维数据的场景。
 *
 * 注意：此类型的纹理只能与 `WebGPURenderer` 和 WebGPU 后端一起使用。
 *
 * @augments Texture
 */
class Storage3DTexture extends Texture {
  /**
   * 构造一个新的存储3D纹理
   *
   * @param {number} [width=1] - 存储纹理的宽度
   * @param {number} [height=1] - 存储纹理的高度
   * @param {number} [depth=1] - 存储纹理的深度
   */
  constructor(width = 1, height = 1, depth = 1) {
    // 调用父类构造函数
    super();

    // 继承自纹理类。对于3D纹理必须为false
    // 明确标识这不是数组纹理
    this.isArrayTexture = false;

    /**
     * 图像对象，仅表示纹理的三维尺寸
     * 存储3D纹理不包含实际的图像数据，只定义三维尺寸信息
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
     * 定义纹理在深度方向上的包装方式
     * 对应UVW映射中的W方向，默认为边缘夹紧包装
     *
     * @type {number}
     */
    this.wrapR = ClampToEdgeWrapping;

    /**
     * 用于类型测试的标志
     * 标识此对象为存储纹理类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isStorageTexture = true;

    /**
     * 标识此纹理是否为3D纹理
     * 用于区分2D纹理和3D纹理
     *
     * @type {boolean}
     */
    this.is3DTexture = true;
  }

  /**
   * 设置存储3D纹理的尺寸
   * 当任何维度发生变化时，会销毁旧的纹理资源
   *
   * @param {number} width - 存储纹理的新宽度
   * @param {number} height - 存储纹理的新高度
   * @param {number} depth - 存储纹理的新深度
   */
  setSize(width, height, depth) {
    // 检查任何维度是否发生变化
    if (this.image.width !== width || this.image.height !== height || this.image.depth !== depth) {
      // 更新三维尺寸
      this.image.width = width;
      this.image.height = height;
      this.image.depth = depth;

      // 销毁旧的纹理资源，强制重新创建
      this.dispose();
    }
  }
}

// 导出存储3D纹理类
export default Storage3DTexture;
