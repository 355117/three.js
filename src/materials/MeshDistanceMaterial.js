// 导入基础材质类
import { Material } from "./Material.js";

/**
 * 用于内部实现点光源阴影映射的材质。
 * A material used internally for implementing shadow mapping with
 * point lights.
 *
 * 也可以通过将 `MeshDistanceMaterial` 实例分配给 {@link Object3D#customDistanceMaterial}
 * 来自定义对象的阴影投射。以下示例演示了这种方法，以确保对象的透明部分不投射阴影。
 * Can also be used to customize the shadow casting of an object by assigning
 * an instance of `MeshDistanceMaterial` to {@link Object3D#customDistanceMaterial}.
 * The following examples demonstrates this approach in order to ensure
 * transparent parts of objects do no cast shadows.
 *
 * @augments Material
 */
class MeshDistanceMaterial extends Material {
  /**
   * 构造一个新的网格距离材质。
   * Constructs a new mesh distance material.
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
    this.isMeshDistanceMaterial = true;

    // 设置材质类型名称
    this.type = "MeshDistanceMaterial";

    /**
     * 颜色贴图。可以选择性地包含alpha通道，通常与 {@link Material#transparent}
     * 或 {@link Material#alphaTest} 结合使用。
     * The color map. May optionally include an alpha channel, typically combined
     * with {@link Material#transparent} or {@link Material#alphaTest}.
     *
     * @type {?Texture}
     * @default null
     */
    this.map = null;

    /**
     * alpha贴图是一个灰度纹理，用于控制表面的不透明度（黑色：完全透明；白色：完全不透明）。
     * 只使用纹理的颜色，如果存在alpha通道则忽略。对于RGB和RGBA纹理，渲染器在采样此纹理时
     * 将使用绿色通道，因为在DXT压缩和未压缩的RGB 565格式中绿色提供了额外的精度位。
     * 仅亮度和亮度/alpha纹理也仍然按预期工作。
     * The alpha map is a grayscale texture that controls the opacity across the
     * surface (black: fully transparent; white: fully opaque).
     * Only the color of the texture is used, ignoring the alpha channel if one
     * exists. For RGB and RGBA textures, the renderer will use the green channel
     * when sampling this texture due to the extra bit of precision provided for
     * green in DXT-compressed and uncompressed RGB 565 formats. Luminance-only and
     * luminance/alpha textures will also still work as expected.
     *
     * @type {?Texture}
     * @default null
     */
    this.alphaMap = null;

    /**
     * 位移贴图影响网格顶点的位置。与仅影响材质光照和阴影的其他贴图不同，
     * 位移的顶点可以投射阴影、阻挡其他对象，并以其他方式表现为真实几何体。
     * 位移纹理是一个图像，其中每个像素的值（白色为最高值）被映射并重新定位网格的顶点。
     * The displacement map affects the position of the mesh's vertices. Unlike
     * other maps which only affect the light and shade of the material the
     * displaced vertices can cast shadows, block other objects, and otherwise
     * act as real geometry. The displacement texture is an image where the value
     * of each pixel (white being the highest) is mapped against, and
     * repositions, the vertices of the mesh.
     *
     * @type {?Texture}
     * @default null
     */
    this.displacementMap = null;

    /**
     * 位移贴图对网格的影响程度（黑色为无位移，白色为最大位移）。
     * 如果没有设置位移贴图，此值不会被应用。
     * How much the displacement map affects the mesh (where black is no
     * displacement, and white is maximum displacement). Without a displacement
     * map set, this value is not applied.
     *
     * @type {number}
     * @default 0
     */
    this.displacementScale = 1;

    /**
     * 位移贴图值在网格顶点上的偏移量。
     * 偏移量会添加到位移贴图的缩放采样中。
     * 如果没有设置位移贴图，此值不会被应用。
     * The offset of the displacement map's values on the mesh's vertices.
     * The bias is added to the scaled sample of the displacement map.
     * Without a displacement map set, this value is not applied.
     *
     * @type {number}
     * @default 0
     */
    this.displacementBias = 0;

    // 设置传入的参数值
    this.setValues(parameters);
  }

  /**
   * 复制另一个MeshDistanceMaterial的属性到当前材质。
   * Copy properties from another MeshDistanceMaterial to this material.
   *
   * @param {MeshDistanceMaterial} source - 要复制属性的源材质
   * @returns {MeshDistanceMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 调用父类的copy方法
    super.copy(source);

    // 复制颜色贴图
    this.map = source.map;

    // 复制alpha贴图
    this.alphaMap = source.alphaMap;

    // 复制位移贴图相关属性
    this.displacementMap = source.displacementMap;
    this.displacementScale = source.displacementScale;
    this.displacementBias = source.displacementBias;

    // 返回当前实例以支持链式调用
    return this;
  }
}

// 导出MeshDistanceMaterial类
export { MeshDistanceMaterial };
