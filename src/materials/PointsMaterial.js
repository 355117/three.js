// 导入基础材质类
import { Material } from "./Material.js";
// 导入颜色类
import { Color } from "../math/Color.js";

/**
 * 用于渲染点图元的材质。
 * A material for rendering point primitives.
 *
 * 材质定义了可渲染3D对象的外观。
 * Materials define the appearance of renderable 3D objects.
 *
 * ```js
 * const vertices = [];
 *
 * for ( let i = 0; i < 10000; i ++ ) {
 * 	const x = THREE.MathUtils.randFloatSpread( 2000 );
 * 	const y = THREE.MathUtils.randFloatSpread( 2000 );
 * 	const z = THREE.MathUtils.randFloatSpread( 2000 );
 *
 * 	vertices.push( x, y, z );
 * }
 *
 * const geometry = new THREE.BufferGeometry();
 * geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
 * const material = new THREE.PointsMaterial( { color: 0x888888 } );
 * const points = new THREE.Points( geometry, material );
 * scene.add( points );
 * ```
 *
 * @augments Material
 */
class PointsMaterial extends Material {
  /**
   * 构造一个新的点材质。
   * Constructs a new points material.
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
    this.isPointsMaterial = true;

    // 设置材质类型
    this.type = "PointsMaterial";

    /**
     * 材质的颜色。
     * Color of the material.
     *
     * @type {Color}
     * @default (1,1,1)
     */
    this.color = new Color(0xffffff);

    /**
     * 颜色贴图。可以选择性地包含alpha通道，通常与{@link Material#transparent}或{@link Material#alphaTest}结合使用。
     * The color map. May optionally include an alpha channel, typically combined
     * with {@link Material#transparent} or {@link Material#alphaTest}.
     * 纹理贴图颜色由漫反射`color`调制。
     * The texture map color is modulated by the diffuse `color`.
     *
     * @type {?Texture}
     * @default null
     */
    this.map = null;

    /**
     * alpha贴图是一个灰度纹理，用于控制表面的不透明度（黑色：完全透明；白色：完全不透明）。
     * The alpha map is a grayscale texture that controls the opacity across the
     * surface (black: fully transparent; white: fully opaque).
     *
     * 只使用纹理的颜色，忽略alpha通道（如果存在）。
     * Only the color of the texture is used, ignoring the alpha channel if one exists.
     * 对于RGB和RGBA纹理，渲染器在采样此纹理时将使用绿色通道，
     * For RGB and RGBA textures, the renderer will use the green channel when sampling this texture
     * 因为在DXT压缩和未压缩的RGB 565格式中绿色提供了额外的精度位。
     * due to the extra bit of precision provided for green in DXT-compressed and uncompressed RGB 565 formats.
     * 仅亮度和亮度/alpha纹理也仍然按预期工作。
     * Luminance-only and luminance/alpha textures will also still work as expected.
     *
     * @type {?Texture}
     * @default null
     */
    this.alphaMap = null;

    /**
     * 定义点的大小（以像素为单位）。
     * Defines the size of the points in pixels.
     *
     * 如果值超过硬件相关参数（如[gl.ALIASED_POINT_SIZE_RANGE]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParamete}），可能会被限制。
     * Might be capped if the value exceeds hardware dependent parameters like [gl.ALIASED_POINT_SIZE_RANGE]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParamete}.
     *
     * @type {number}
     * @default 1
     */
    this.size = 1;

    /**
     * 指定单个点的大小是否受相机深度衰减（仅透视相机）。
     * Specifies whether size of individual points is attenuated by the camera depth (perspective camera only).
     *
     * @type {boolean}
     * @default true
     */
    this.sizeAttenuation = true;

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
   * 复制另一个PointsMaterial的属性到当前材质。
   * Copy properties from another PointsMaterial to this material.
   *
   * @param {PointsMaterial} source - 要复制的源材质
   * @returns {PointsMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 调用父类的copy方法
    super.copy(source);

    // 复制颜色属性
    this.color.copy(source.color);

    // 复制贴图属性
    this.map = source.map;

    // 复制alpha贴图属性
    this.alphaMap = source.alphaMap;

    // 复制点大小属性
    this.size = source.size;
    // 复制大小衰减属性
    this.sizeAttenuation = source.sizeAttenuation;

    // 复制雾效果属性
    this.fog = source.fog;

    // 返回当前实例以支持链式调用
    return this;
  }
}

// 导出PointsMaterial类
export { PointsMaterial };
