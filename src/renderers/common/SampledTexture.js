// 导入采样器基类
import Sampler from "./Sampler.js";

// 全局ID计数器，用于为每个采样纹理分配唯一ID
let _id = 0;

/**
 * 采样纹理类
 *
 * 表示采样纹理绑定类型。采样纹理是GPU着色器中用于读取纹理数据的绑定，
 * 它结合了纹理资源和采样器设置，定义了如何从纹理中采样像素数据。
 *
 * @private
 * @augments Sampler
 */
class SampledTexture extends Sampler {
  /**
   * 构造一个新的采样纹理
   *
   * @param {string} name - 采样纹理的名称，用于在着色器中标识
   * @param {?Texture} texture - 此绑定引用的纹理对象
   */
  constructor(name, texture) {
    // 调用父类构造函数
    super(name, texture);

    /**
     * 唯一标识符
     * 用于区分不同的采样纹理实例
     *
     * @type {number}
     */
    this.id = _id++;

    /**
     * 是否为存储纹理
     * 存储纹理允许着色器写入数据，而采样纹理通常只读
     *
     * @type {boolean}
     * @default false
     */
    this.store = false;

    /**
     * 用于类型测试的标志
     * 标识此对象为采样纹理类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSampledTexture = true;
  }
}

/**
 * 采样数组纹理类
 *
 * 表示采样数组纹理绑定类型。数组纹理是包含多个2D纹理层的纹理类型，
 * 可以在着色器中通过索引访问不同的纹理层。
 *
 * @private
 * @augments SampledTexture
 */
class SampledArrayTexture extends SampledTexture {
  /**
   * 构造一个新的采样数组纹理
   *
   * @param {string} name - 采样数组纹理的名称
   * @param {?(DataArrayTexture|CompressedArrayTexture)} texture - 此绑定引用的数组纹理对象
   */
  constructor(name, texture) {
    // 调用父类构造函数
    super(name, texture);

    /**
     * 用于类型测试的标志
     * 标识此对象为采样数组纹理类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSampledArrayTexture = true;
  }
}

/**
 * 采样3D纹理类
 *
 * 表示采样3D纹理绑定类型。3D纹理是具有宽度、高度和深度的三维纹理，
 * 常用于体积渲染、噪声生成等需要三维数据的场景。
 *
 * @private
 * @augments SampledTexture
 */
class Sampled3DTexture extends SampledTexture {
  /**
   * 构造一个新的采样3D纹理
   *
   * @param {string} name - 采样3D纹理的名称
   * @param {?Data3DTexture} texture - 此绑定引用的3D纹理对象
   */
  constructor(name, texture) {
    // 调用父类构造函数
    super(name, texture);

    /**
     * 用于类型测试的标志
     * 标识此对象为采样3D纹理类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSampled3DTexture = true;
  }
}

/**
 * 采样立方体纹理类
 *
 * 表示采样立方体纹理绑定类型。立方体纹理由6个面组成，常用于环境映射、
 * 天空盒渲染等需要全方向纹理数据的场景。
 *
 * @private
 * @augments SampledTexture
 */
class SampledCubeTexture extends SampledTexture {
  /**
   * 构造一个新的采样立方体纹理
   *
   * @param {string} name - 采样立方体纹理的名称
   * @param {?(CubeTexture|CompressedCubeTexture)} texture - 此绑定引用的立方体纹理对象
   */
  constructor(name, texture) {
    // 调用父类构造函数
    super(name, texture);

    /**
     * 用于类型测试的标志
     * 标识此对象为采样立方体纹理类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSampledCubeTexture = true;
  }
}

// 导出所有采样纹理类
export { SampledTexture, SampledArrayTexture, Sampled3DTexture, SampledCubeTexture };
