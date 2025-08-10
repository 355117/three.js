// 导入图像工具类，用于处理图像数据
import { ImageUtils } from "../extras/ImageUtils.js";
// 导入UUID生成函数，用于创建唯一标识符
import { generateUUID } from "../math/MathUtils.js";

// 全局源ID计数器，用于为每个Source实例分配唯一的数字ID
let _sourceId = 0;

/**
 * 纹理数据源类
 *
 * 此类表示纹理的数据源，是Three.js纹理系统的核心组件之一
 * 主要目的是将数据定义与纹理定义解耦，使同一数据可以被多个纹理实例使用
 *
 * 设计理念：
 * - 数据与纹理分离：一个数据源可以被多个纹理共享
 * - 内存优化：避免重复存储相同的图像数据
 * - 灵活性：支持各种类型的数据源（图像、画布、视频等）
 *
 * 支持的数据类型：
 * - HTMLImageElement: 图像元素
 * - HTMLCanvasElement: 画布元素
 * - HTMLVideoElement: 视频元素
 * - ImageData: 图像数据对象
 * - TypedArray: 类型化数组（用于原始数据）
 * - null: 空数据源
 *
 * 使用场景：
 * - 多个纹理共享同一图像数据
 * - 动态纹理数据的管理
 * - 纹理数据的缓存和复用
 * - 内存使用的优化
 */
class Source {
  /**
   * 构造一个新的纹理数据源
   *
   * @param {any} [data=null] - 纹理的数据定义
   *                           可以是图像、画布、视频元素或原始数据
   */
  constructor(data = null) {
    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 Source 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSource = true;

    /**
     * 数据源的唯一数字标识符
     *
     * 每个Source实例都有一个唯一的数字ID，从0开始递增
     * 主要用于内部识别和调试，比UUID更轻量级
     * 使用Object.defineProperty确保ID不可修改
     *
     * @name Source#id
     * @type {number}
     * @readonly
     */
    Object.defineProperty(this, "id", { value: _sourceId++ });

    /**
     * 数据源的UUID（通用唯一标识符）
     *
     * 全局唯一的字符串标识符，用于序列化、网络传输等场景
     * 比数字ID更适合跨系统的唯一性保证
     *
     * @type {string}
     * @readonly
     */
    this.uuid = generateUUID();

    /**
     * 纹理的数据定义
     *
     * 存储实际的纹理数据，可以是各种类型的数据源
     * 这是Source类的核心属性，包含了纹理的实际内容
     *
     * 数据类型示例：
     * - HTMLImageElement: 从<img>标签加载的图像
     * - HTMLCanvasElement: 动态生成的画布内容
     * - HTMLVideoElement: 视频帧数据
     * - ImageData: 像素数据数组
     * - TypedArray: 原始二进制数据
     *
     * @type {any}
     */
    this.data = data;

    /**
     * 数据就绪状态标志
     *
     * 此属性仅在 needsUpdate 设置为 true 时相关，提供对纹理数据处理方式的更精细控制
     * 当 dataReady 设置为 false 时，引擎会执行内存分配（如有必要），但不会将数据传输到GPU内存
     *
     * 使用场景：
     * - 分阶段的纹理加载：先分配内存，后传输数据
     * - 异步数据准备：数据还在加载中时暂时不上传
     * - 性能优化：控制GPU上传的时机
     *
     * 工作流程：
     * 1. dataReady = false: 分配GPU内存但不传输数据
     * 2. 数据准备完成后设置 dataReady = true
     * 3. 下次使用时完成实际的数据传输
     *
     * @type {boolean}
     * @default true
     */
    this.dataReady = true;

    /**
     * 版本计数器
     *
     * 从0开始计数，每次 needsUpdate 设置为 true 时递增
     * 用于跟踪数据源的更新次数，帮助纹理系统判断是否需要重新上传数据
     *
     * 版本控制的作用：
     * - 缓存失效：版本变化时使相关缓存失效
     * - 更新检测：比较版本号判断数据是否已更新
     * - 调试辅助：跟踪数据更新的频率
     *
     * @type {number}
     * @readonly
     * @default 0
     */
    this.version = 0;
  }

  // ===== 数据源操作方法 =====

  /**
   * 获取数据源的尺寸信息
   *
   * 将数据源的尺寸信息写入给定的目标向量中
   * 支持不同类型的数据源，自动检测并返回相应的尺寸
   *
   * 支持的数据源类型：
   * - HTMLVideoElement: 返回视频的实际尺寸
   * - VideoFrame: 返回视频帧的显示尺寸
   * - 其他数据源: 返回width、height和depth属性
   * - null数据源: 返回(0,0,0)
   *
   * @param {Vector2|Vector3} target - 写入结果的目标对象
   * @return {Vector2|Vector3} 包含数据源尺寸的目标对象
   */
  getSize(target) {
    const data = this.data;

    if (data instanceof HTMLVideoElement) {
      // 视频元素：使用videoWidth和videoHeight获取实际视频尺寸
      target.set(data.videoWidth, data.videoHeight, 0);
    } else if (data instanceof VideoFrame) {
      // 视频帧：使用displayWidth和displayHeight获取显示尺寸
      target.set(data.displayHeight, data.displayWidth, 0);
    } else if (data !== null) {
      // 其他数据源：使用标准的width、height和depth属性
      target.set(data.width, data.height, data.depth || 0);
    } else {
      // 空数据源：返回零尺寸
      target.set(0, 0, 0);
    }

    return target;
  }

  /**
   * 设置更新需求标志
   *
   * 当属性设置为 true 时，引擎会为纹理分配内存（如有必要）
   * 并在下次使用数据源时触发实际的纹理上传到GPU
   *
   * 更新机制：
   * - 设置为true时自动递增版本号
   * - 版本号变化会触发相关纹理的更新
   * - 引擎会在适当时机执行实际的GPU上传
   *
   * 使用时机：
   * - 数据源内容发生变化时
   * - 需要强制重新上传纹理时
   * - 动态纹理内容更新时
   *
   * @type {boolean}
   * @default false
   * @param {boolean} value - 是否需要更新
   */
  set needsUpdate(value) {
    if (value === true) this.version++;
  }

  /**
   * 将数据源序列化为JSON格式
   *
   * 将数据源的所有属性转换为JSON对象，用于数据存储、传输或场景保存
   * 支持不同类型的数据源序列化，包括单个纹理和立方体纹理数组
   *
   * 序列化策略：
   * - 避免重复序列化：通过UUID检查是否已序列化
   * - 支持数据共享：多个纹理可以引用同一个序列化的数据源
   * - 格式兼容：生成的JSON可以被ObjectLoader解析
   *
   * 序列化的数据包括：
   * - UUID: 数据源的唯一标识符
   * - URL: 图像数据的序列化表示（Data URL或数据数组）
   *
   * @param {?(Object|string)} meta - 序列化元信息，包含已序列化对象的映射
   * @return {Object} 表示序列化数据源的JSON对象
   * @see {@link ObjectLoader#parse} - 用于解析序列化数据的加载器
   */
  toJSON(meta) {
    // 判断是否为根对象（没有元信息或元信息为字符串）
    const isRootObject = meta === undefined || typeof meta === "string";

    // 检查是否已经序列化过此数据源，避免重复序列化
    if (!isRootObject && meta.images[this.uuid] !== undefined) {
      return meta.images[this.uuid];
    }

    // 创建序列化输出对象
    const output = {
      uuid: this.uuid, // 数据源的唯一标识符
      url: "", // 图像数据的URL表示
    };

    const data = this.data;

    if (data !== null) {
      let url;

      if (Array.isArray(data)) {
        // 立方体纹理：数据是图像数组
        url = [];

        // 遍历数组中的每个图像并序列化
        for (let i = 0, l = data.length; i < l; i++) {
          if (data[i].isDataTexture) {
            // 数据纹理：序列化其图像属性
            url.push(serializeImage(data[i].image));
          } else {
            // 普通图像：直接序列化
            url.push(serializeImage(data[i]));
          }
        }
      } else {
        // 单个纹理：直接序列化数据
        url = serializeImage(data);
      }

      output.url = url;
    }

    // 如果不是根对象，将序列化结果缓存到元信息中
    if (!isRootObject) {
      meta.images[this.uuid] = output;
    }

    return output;
  }
}

// ===== 辅助函数 =====

/**
 * 序列化图像数据
 *
 * 将不同类型的图像数据转换为可序列化的格式
 * 支持DOM图像元素和原始数据纹理的序列化
 *
 * 支持的图像类型：
 * - HTMLImageElement: HTML图像元素
 * - HTMLCanvasElement: HTML画布元素
 * - ImageBitmap: 图像位图对象
 * - DataTexture的图像数据: 包含原始像素数据的对象
 *
 * 序列化策略：
 * - DOM元素: 转换为Data URL格式
 * - 原始数据: 转换为包含数据数组和元信息的对象
 *
 * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap|Object} image - 要序列化的图像
 * @return {string|Object} 序列化后的图像数据
 */
function serializeImage(image) {
  if (
    (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement) ||
    (typeof HTMLCanvasElement !== "undefined" && image instanceof HTMLCanvasElement) ||
    (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap)
  ) {
    // 标准图像类型：转换为Data URL
    // Data URL包含完整的图像数据，可以直接在浏览器中使用
    return ImageUtils.getDataURL(image);
  } else {
    if (image.data) {
      // 数据纹理的图像：序列化原始像素数据
      return {
        data: Array.from(image.data), // 像素数据数组
        width: image.width, // 图像宽度
        height: image.height, // 图像高度
        type: image.data.constructor.name, // 数据类型名称
      };
    } else {
      // 无法序列化的图像类型
      console.warn("THREE.Texture: Unable to serialize Texture.");
      return {};
    }
  }
}

// ===== 模块导出 =====

/**
 * 导出 Source 类
 *
 * Source 类是 Three.js 纹理系统的基础组件，负责管理纹理的数据源
 * 通过数据与纹理的分离设计，实现了高效的内存管理和数据共享
 */
export { Source };
