// 导入光源基类
import { Light } from "./Light.js";

/**
 * 矩形区域光源类
 * 此类在矩形平面的表面均匀发射光线
 * 这种光源类型可用于模拟明亮的窗户或条形照明等光源
 *
 * 重要说明：
 *
 * - 不支持阴影
 * - 仅支持PBR材质
 * - 您必须在应用程序中包含`RectAreaLightUniformsLib`（`WebGLRenderer`）或
 *   `RectAreaLightTexturesLib`（`WebGPURenderer`）并初始化uniforms/textures
 *
 * ```js
 * RectAreaLightUniformsLib.init(); // 仅适用于WebGLRenderer
 * THREE.RectAreaLightNode.setLTC( RectAreaLightTexturesLib.init() ); // 仅适用于WebGPURenderer
 *
 * const intensity = 1; const width = 10; const height = 10;
 * const rectLight = new THREE.RectAreaLight( 0xffffff, intensity, width, height );
 * rectLight.position.set( 5, 5, 0 );
 * rectLight.lookAt( 0, 0, 0 );
 * scene.add( rectLight )
 * ```
 *
 * @augments Light
 */
class RectAreaLight extends Light {
  /**
   * 构造一个新的矩形区域光源
   *
   * @param {(number|Color|string)} [color=0xffffff] - 光源的颜色
   * @param {number} [intensity=1] - 光源的强度/亮度
   * @param {number} [width=10] - 光源的宽度
   * @param {number} [height=10] - 光源的高度
   */
  constructor(color, intensity, width = 10, height = 10) {
    // 调用父类构造函数，传入颜色和强度参数
    super(color, intensity);

    /**
     * 用于类型检测的标志位
     * 可以通过此属性判断对象是否为矩形区域光源
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isRectAreaLight = true;

    // 设置光源类型标识
    this.type = "RectAreaLight";

    /**
     * 光源的宽度
     * 定义矩形光源在X轴方向的尺寸
     *
     * @type {number}
     * @default 10
     */
    this.width = width;

    /**
     * 光源的高度
     * 定义矩形光源在Y轴方向的尺寸
     *
     * @type {number}
     * @default 10
     */
    this.height = height;
  }

  /**
   * 光源的功率
   * 功率是以流明(lm)为单位测量的光源光通量
   * 改变功率也会改变光源的强度
   *
   * @type {number}
   */
  get power() {
    // 从强度(以尼特为单位)计算光源的光通量(以流明为单位)
    return this.intensity * this.width * this.height * Math.PI;
  }

  set power(power) {
    // 从所需的光通量(以流明为单位)设置光源的强度(以尼特为单位)
    this.intensity = power / (this.width * this.height * Math.PI);
  }

  /**
   * 复制另一个矩形区域光源的属性到当前对象
   *
   * @param {RectAreaLight} source - 要复制的源对象
   * @returns {RectAreaLight} 返回当前对象以支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 复制宽度属性
    this.width = source.width;
    // 复制高度属性
    this.height = source.height;

    // 返回当前对象以支持链式调用
    return this;
  }

  /**
   * 将矩形区域光源序列化为JSON格式
   *
   * @param {Object} meta - 元数据对象
   * @returns {Object} 包含序列化数据的对象
   */
  toJSON(meta) {
    // 调用父类的序列化方法
    const data = super.toJSON(meta);

    // 添加宽度到序列化数据
    data.object.width = this.width;
    // 添加高度到序列化数据
    data.object.height = this.height;

    // 返回序列化数据
    return data;
  }
}

// 导出矩形区域光源类
export { RectAreaLight };
