// 导入线条基础材质类
import { LineBasicMaterial } from "./LineBasicMaterial.js";

/**
 * 用于渲染虚线图元的材质。
 * A material for rendering line primitives.
 *
 * 材质定义了可渲染3D对象的外观。
 * Materials define the appearance of renderable 3D objects.
 *
 * ```js
 * const material = new THREE.LineDashedMaterial( {
 * 	color: 0xffffff,
 * 	scale: 1,
 * 	dashSize: 3,
 * 	gapSize: 1,
 * } );
 * ```
 *
 * @augments LineBasicMaterial
 */
class LineDashedMaterial extends LineBasicMaterial {
  /**
   * 构造一个新的虚线材质。
   * Constructs a new line dashed material.
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
    this.isLineDashedMaterial = true;
    // 设置材质类型名称
    this.type = "LineDashedMaterial";

    /**
     * 虚线部分的缩放比例。
     * The scale of the dashed part of a line.
     *
     * @type {number}
     * @default 1
     */
    this.scale = 1;

    /**
     * 虚线段的大小。这是虚线和间隙的长度。
     * The size of the dash. This is both the gap with the stroke.
     *
     * @type {number}
     * @default 3
     */
    this.dashSize = 3;

    /**
     * 间隙的大小。
     * The size of the gap.
     *
     * @type {number}
     * @default 1
     */
    this.gapSize = 1;

    // 设置传入的参数值
    this.setValues(parameters);
  }

  /**
   * 复制另一个LineDashedMaterial的属性到当前材质。
   * Copy properties from another LineDashedMaterial to this material.
   *
   * @param {LineDashedMaterial} source - 要复制属性的源材质
   * @returns {LineDashedMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 调用父类的copy方法
    super.copy(source);

    // 复制缩放比例
    this.scale = source.scale;
    // 复制虚线段大小
    this.dashSize = source.dashSize;
    // 复制间隙大小
    this.gapSize = source.gapSize;

    // 返回当前实例以支持链式调用
    return this;
  }
}

// 导出LineDashedMaterial类
export { LineDashedMaterial };
