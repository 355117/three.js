// 导入切线空间法线贴图常量
import { TangentSpaceNormalMap } from "../constants.js";
// 导入基础材质类
import { Material } from "./Material.js";
// 导入二维向量类
import { Vector2 } from "../math/Vector2.js";
// 导入颜色类
import { Color } from "../math/Color.js";

/**
 * 此材质由MatCap（或Lit Sphere）纹理定义，该纹理编码了材质颜色和着色。
 * This material is defined by a MatCap (or Lit Sphere) texture, which encodes the
 * material color and shading.
 *
 * `MeshMatcapMaterial` 不响应光照，因为matcap图像文件编码了烘焙的光照。
 * 它会在接收阴影的对象上投射阴影（阴影裁剪有效），但它不会自阴影或接收阴影。
 * `MeshMatcapMaterial` does not respond to lights since the matcap image file encodes
 * baked lighting. It will cast a shadow onto an object that receives shadows
 * (and shadow clipping works), but it will not self-shadow or receive
 * shadows.
 *
 * @augments Material
 */
class MeshMatcapMaterial extends Material {
  /**
   * 构造一个新的网格matcap材质。
   * Constructs a new mesh matcap material.
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
    this.isMeshMatcapMaterial = true;

    // 定义着色器宏
    this.defines = { MATCAP: "" };

    // 设置材质类型名称
    this.type = "MeshMatcapMaterial";

    /**
     * 材质的颜色。
     * Color of the material.
     *
     * @type {Color}
     * @default (1,1,1)
     */
    this.color = new Color(0xffffff); // 漫反射颜色

    /**
     * matcap贴图。
     * The matcap map.
     *
     * @type {?Texture}
     * @default null
     */
    this.matcap = null;

    /**
     * 颜色贴图。可以选择性地包含alpha通道，通常与 {@link Material#transparent}
     * 或 {@link Material#alphaTest} 结合使用。纹理贴图颜色会与漫反射颜色相乘。
     * The color map. May optionally include an alpha channel, typically combined
     * with {@link Material#transparent} or {@link Material#alphaTest}. The texture map
     * color is modulated by the diffuse `color`.
     *
     * @type {?Texture}
     * @default null
     */
    this.map = null;

    /**
     * 用于创建凹凸贴图的纹理。黑白值映射到相对于光照的感知深度。
     * 凹凸实际上不会影响对象的几何形状，只影响光照。如果定义了法线贴图，这将被忽略。
     * The texture to create a bump map. The black and white values map to the
     * perceived depth in relation to the lights. Bump doesn't actually affect
     * the geometry of the object, only the lighting. If a normal map is defined
     * this will be ignored.
     *
     * @type {?Texture}
     * @default null
     */
    this.bumpMap = null;

    /**
     * 凹凸贴图对材质的影响程度。典型范围是 `[0,1]`。
     * How much the bump map affects the material. Typical range is `[0,1]`.
     *
     * @type {number}
     * @default 1
     */
    this.bumpScale = 1;

    /**
     * 用于创建法线贴图的纹理。RGB值影响每个像素片段的表面法线，
     * 并改变颜色的光照方式。法线贴图不会改变表面的实际形状，只改变光照。
     * 如果材质的法线贴图是使用左手坐标系创建的，应该将 `normalScale` 的 `y` 分量取反，
     * 以补偿不同的手性。
     * The texture to create a normal map. The RGB values affect the surface
     * normal for each pixel fragment and change the way the color is lit. Normal
     * maps do not change the actual shape of the surface, only the lighting. In
     * case the material has a normal map authored using the left handed
     * convention, the `y` component of `normalScale` should be negated to compensate
     * for the different handedness.
     *
     * @type {?Texture}
     * @default null
     */
    this.normalMap = null;

    /**
     * 法线贴图的类型。
     * The type of normal map.
     *
     * @type {(TangentSpaceNormalMap|ObjectSpaceNormalMap)}
     * @default TangentSpaceNormalMap
     */
    this.normalMapType = TangentSpaceNormalMap;

    /**
     * 法线贴图对材质的影响程度。典型值范围是 `[0,1]`。
     * How much the normal map affects the material. Typical value range is `[0,1]`.
     *
     * @type {Vector2}
     * @default (1,1)
     */
    this.normalScale = new Vector2(1, 1);

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
     * 材质是否使用平面着色渲染。
     * Whether the material is rendered with flat shading or not.
     *
     * @type {boolean}
     * @default false
     */
    this.flatShading = false;

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
   * 复制另一个MeshMatcapMaterial的属性到当前材质。
   * Copy properties from another MeshMatcapMaterial to this material.
   *
   * @param {MeshMatcapMaterial} source - 要复制属性的源材质
   * @returns {MeshMatcapMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 调用父类的copy方法
    super.copy(source);

    // 复制着色器宏定义
    this.defines = { MATCAP: "" };

    // 复制颜色属性
    this.color.copy(source.color);

    // 复制matcap贴图
    this.matcap = source.matcap;

    // 复制颜色贴图
    this.map = source.map;

    // 复制凹凸贴图相关属性
    this.bumpMap = source.bumpMap;
    this.bumpScale = source.bumpScale;

    // 复制法线贴图相关属性
    this.normalMap = source.normalMap;
    this.normalMapType = source.normalMapType;
    this.normalScale.copy(source.normalScale);

    // 复制位移贴图相关属性
    this.displacementMap = source.displacementMap;
    this.displacementScale = source.displacementScale;
    this.displacementBias = source.displacementBias;

    // 复制alpha贴图
    this.alphaMap = source.alphaMap;

    // 复制平面着色设置
    this.flatShading = source.flatShading;

    // 复制雾效设置
    this.fog = source.fog;

    // 返回当前实例以支持链式调用
    return this;
  }
}

// 导出MeshMatcapMaterial类
export { MeshMatcapMaterial };
