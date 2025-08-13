// 导入基础材质类
import { Material } from "./Material.js";
// 导入颜色类
import { Color } from "../math/Color.js";

/**
 * 用于渲染线条图元的材质。
 * A material for rendering line primitives.
 *
 * 材质定义了可渲染3D对象的外观。
 * Materials define the appearance of renderable 3D objects.
 *
 * ```js
 * const material = new THREE.LineBasicMaterial( { color: 0xffffff } );
 * ```
 *
 * @augments Material
 */
class LineBasicMaterial extends Material {
  /**
   * 构造一个新的线条基础材质。
   * Constructs a new line basic material.
   *
   * @param {Object} [parameters] - 包含一个或多个属性的对象，用于定义材质的外观。
   * 材质的任何属性（包括从继承材质中的任何属性）都可以在这里传递。
   * 颜色值可以传递任何被 {@link Color#set} 接受的类型值。
   * An object with one or more properties defining the material's appearance.
   * Any property of the material (including any property from inherited materials)
   * can be passed in here. Color values can be passed any type of value accepted
   * by {@link Color#set}.
   */
  constructor(parameters) {
    // 调用父类构造函数
    super();

    /**
     * 此标志可用于类型测试。
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isLineBasicMaterial = true;

    // 设置材质类型名称
    this.type = "LineBasicMaterial";

    /**
     * 材质的颜色。
     * Color of the material.
     *
     * @type {Color}
     * @default (1,1,1)
     */
    this.color = new Color(0xffffff);

    /**
     * 使用纹理数据设置线条的颜色。纹理贴图颜色会与漫反射颜色相乘。
     * Sets the color of the lines using data from a texture. The texture map
     * color is modulated by the diffuse `color`.
     *
     * @type {?Texture}
     * @default null
     */
    this.map = null;

    /**
     * 控制线条的粗细。
     * Controls line thickness or lines.
     *
     * 只能与 {@link SVGRenderer} 一起使用。WebGL 和 WebGPU 忽略此设置，
     * 始终以一个像素的宽度渲染线条图元。
     * Can only be used with {@link SVGRenderer}. WebGL and WebGPU
     * ignore this setting and always render line primitives with a
     * width of one pixel.
     *
     * @type {number}
     * @default 1
     */
    this.linewidth = 1;

    /**
     * 定义线条端点的外观。
     * Defines appearance of line ends.
     *
     * 只能与 {@link SVGRenderer} 一起使用。
     * Can only be used with {@link SVGRenderer}.
     *
     * @type {('butt'|'round'|'square')}
     * @default 'round'
     */
    this.linecap = "round";

    /**
     * 定义线条连接点的外观。
     * Defines appearance of line joints.
     *
     * 只能与 {@link SVGRenderer} 一起使用。
     * Can only be used with {@link SVGRenderer}.
     *
     * @type {('round'|'bevel'|'miter')}
     * @default 'round'
     */
    this.linejoin = "round";

    /**
     * 材质是否受雾效影响。
     * Whether the material is affected by fog or not.
     *
     * @type {boolean}
     * @default true
     */
    this.fog = true;

    // 设置传入的参数值
    this.setValues(parameters);
  }

  /**
   * 复制另一个LineBasicMaterial的属性到当前材质。
   * Copy properties from another LineBasicMaterial to this material.
   *
   * @param {LineBasicMaterial} source - 要复制属性的源材质
   * @returns {LineBasicMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 调用父类的copy方法
    super.copy(source);

    // 复制颜色属性
    this.color.copy(source.color);

    // 复制纹理贴图
    this.map = source.map;

    // 复制线条宽度
    this.linewidth = source.linewidth;
    // 复制线条端点样式
    this.linecap = source.linecap;
    // 复制线条连接点样式
    this.linejoin = source.linejoin;

    // 复制雾效设置
    this.fog = source.fog;

    // 返回当前实例以支持链式调用
    return this;
  }
}

// 导出LineBasicMaterial类
export { LineBasicMaterial };
