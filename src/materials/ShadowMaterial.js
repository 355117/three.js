// 导入基础材质类
import { Material } from "./Material.js";
// 导入颜色类
import { Color } from "../math/Color.js";

/**
 * 这种材质可以接收阴影，但在其他方面是完全透明的。
 * This material can receive shadows, but otherwise is completely transparent.
 *
 * ```js
 * const geometry = new THREE.PlaneGeometry( 2000, 2000 );
 * geometry.rotateX( - Math.PI / 2 );
 *
 * const material = new THREE.ShadowMaterial();
 * material.opacity = 0.2;
 *
 * const plane = new THREE.Mesh( geometry, material );
 * plane.position.y = -200;
 * plane.receiveShadow = true;
 * scene.add( plane );
 * ```
 *
 * @augments Material
 */
class ShadowMaterial extends Material {
  /**
   * 构造一个新的阴影材质。
   * Constructs a new shadow material.
   *
   * @param {Object} [parameters] - 包含一个或多个属性的对象，用于定义材质的外观
   * An object with one or more properties defining the material's appearance.
   * 材质的任何属性（包括从继承材质的任何属性）都可以在这里传递。
   * Any property of the material (including any property from inherited materials) can be passed in here.
   * 颜色值可以传递{@link Color#set}接受的任何类型的值。
   * Color values can be passed any type of value accepted by {@link Color#set}.
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
    this.isShadowMaterial = true;

    // 设置材质类型
    this.type = "ShadowMaterial";

    /**
     * 材质的颜色。
     * Color of the material.
     *
     * @type {Color}
     * @default (0,0,0)
     */
    this.color = new Color(0x000000);

    /**
     * 由于阴影材质默认是透明的，所以重写此属性。
     * Overwritten since shadow materials are transparent
     * by default.
     *
     * @type {boolean}
     * @default true
     */
    this.transparent = true;

    /**
     * 材质是否受雾影响。
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
   * 复制另一个ShadowMaterial的属性到当前材质。
   * Copy properties from another ShadowMaterial to this material.
   *
   * @param {ShadowMaterial} source - 要复制的源材质
   * @returns {ShadowMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 调用父类的copy方法
    super.copy(source);

    // 复制颜色属性
    this.color.copy(source.color);

    // 复制雾效果属性
    this.fog = source.fog;

    // 返回当前实例以支持链式调用
    return this;
  }
}

// 导出ShadowMaterial类
export { ShadowMaterial };
