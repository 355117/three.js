// 导入绑定基类
import Binding from "./Binding.js";

/**
 * 采样器类
 *
 * 表示采样器绑定类型。采样器定义了如何从纹理中读取数据，
 * 包括过滤模式、包装模式等采样参数。它是GPU着色器中访问纹理的基础。
 *
 * @private
 * @augments Binding
 */
class Sampler extends Binding {
  /**
   * 构造一个新的采样器
   *
   * @param {string} name - 采样器的名称，用于在着色器中标识
   * @param {?Texture} texture - 此绑定引用的纹理对象
   */
  constructor(name, texture) {
    // 调用父类构造函数
    super(name);

    /**
     * 当纹理被销毁时调用的函数
     * 确保在纹理销毁时清理引用，避免内存泄漏
     *
     * @type {function}
     * @private
     */
    this._onDisposeTexture = () => {
      // 清空纹理引用
      this.texture = null;
    };

    /**
     * 采样器引用的纹理
     * 通过setter/getter管理，确保事件监听器的正确绑定
     *
     * @type {?Texture}
     */
    this.texture = texture;

    /**
     * 绑定的版本号
     * 用于跟踪纹理的变化，决定是否需要重新上传到GPU
     *
     * @type {number}
     */
    this.version = texture ? texture.version : 0;

    /**
     * 绑定的生成号，是额外的版本限定符
     * 用于更细粒度的版本控制
     *
     * @type {?number}
     * @default null
     */
    this.generation = null;

    /**
     * 用于类型测试的标志
     * 标识此对象为采样器类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSampler = true;
  }

  /**
   * 设置此采样器的纹理
   * 管理纹理引用的变更，包括事件监听器的绑定和解绑
   *
   * @param {?Object} value - 要设置的纹理对象
   */
  set texture(value) {
    // 如果纹理没有变化，直接返回
    if (this._texture === value) return;

    // 如果之前有纹理，移除事件监听器
    if (this._texture) {
      this._texture.removeEventListener("dispose", this._onDisposeTexture);
    }

    // 设置新的纹理
    this._texture = value;

    // 重置生成号和版本号
    this.generation = null;
    this.version = 0;

    // 如果新纹理存在，添加事件监听器
    if (this._texture) {
      this._texture.addEventListener("dispose", this._onDisposeTexture);
    }
  }

  /**
   * 获取此采样器的纹理
   * 返回当前绑定的纹理对象
   *
   * @return {?Object} 纹理对象
   */
  get texture() {
    return this._texture;
  }

  /**
   * 更新绑定
   * 检查纹理是否发生变化，决定是否需要重新上传到GPU
   *
   * @return {boolean} 纹理是否已更新且必须上传到GPU
   */
  update() {
    // 获取当前纹理和版本号
    const { texture, version } = this;

    // 检查版本号是否发生变化
    if (version !== texture.version) {
      // 更新版本号
      this.version = texture.version;

      // 返回true表示需要更新
      return true;
    }

    // 返回false表示不需要更新
    return false;
  }
}

// 导出采样器类
export default Sampler;
