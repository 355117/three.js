// 导入切线空间法线贴图常量
import { TangentSpaceNormalMap } from "../constants.js";
// 导入基础材质类
import { Material } from "./Material.js";
// 导入二维向量类
import { Vector2 } from "../math/Vector2.js";
// 导入颜色类
import { Color } from "../math/Color.js";

/**
 * 实现卡通着色的材质。
 * A material implementing toon shading.
 *
 * @augments Material
 */
class MeshToonMaterial extends Material {
  /**
   * 构造一个新的网格卡通材质。
   * Constructs a new mesh toon material.
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
    this.isMeshToonMaterial = true;

    // 定义着色器宏，标识为卡通材质
    this.defines = { TOON: "" };

    // 设置材质类型
    this.type = "MeshToonMaterial";

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
     * 用于卡通着色的渐变贴图。使用此类型纹理时，需要将{@link Texture#minFilter}和{@link Texture#magFilter}设置为{@linkNearestFilter}。
     * Gradient map for toon shading. It's required to set
     * {@link Texture#minFilter} and {@link Texture#magFilter} to {@linkNearestFilter}
     * when using this type of texture.
     *
     * @type {?Texture}
     * @default null
     */
    this.gradientMap = null;

    /**
     * 光照贴图。需要第二套UV坐标。
     * The light map. Requires a second set of UVs.
     *
     * @type {?Texture}
     * @default null
     */
    this.lightMap = null;

    /**
     * 烘焙光照的强度。
     * Intensity of the baked light.
     *
     * @type {number}
     * @default 1
     */
    this.lightMapIntensity = 1.0;

    /**
     * 此纹理的红色通道用作环境遮挡贴图。需要第二套UV坐标。
     * The red channel of this texture is used as the ambient occlusion map.
     * Requires a second set of UVs.
     *
     * @type {?Texture}
     * @default null
     */
    this.aoMap = null;

    /**
     * 环境遮挡效果的强度。范围是`[0,1]`，其中`0`禁用环境遮挡。
     * Intensity of the ambient occlusion effect. Range is `[0,1]`, where `0`
     * disables ambient occlusion.
     * 当强度为`1`且AO贴图的红色通道也为`1`时，表面上的环境光完全被遮挡。
     * Where intensity is `1` and the AO map's red channel is also `1`, ambient light is fully occluded on a surface.
     *
     * @type {number}
     * @default 1
     */
    this.aoMapIntensity = 1.0;

    /**
     * 材质的自发光（发光）颜色，本质上是不受其他光照影响的纯色。
     * Emissive (light) color of the material, essentially a solid color
     * unaffected by other lighting.
     *
     * @type {Color}
     * @default (0,0,0)
     */
    this.emissive = new Color(0x000000);

    /**
     * 自发光的强度。调制自发光颜色。
     * Intensity of the emissive light. Modulates the emissive color.
     *
     * @type {number}
     * @default 1
     */
    this.emissiveIntensity = 1.0;

    /**
     * 设置自发光（发光）贴图。自发光贴图颜色由自发光颜色和自发光强度调制。
     * Set emissive (glow) map. The emissive map color is modulated by the
     * emissive color and the emissive intensity.
     * 如果有自发光贴图，请确保将自发光颜色设置为黑色以外的颜色。
     * If you have an emissive map, be sure to set the emissive color to something other than black.
     *
     * @type {?Texture}
     * @default null
     */
    this.emissiveMap = null;

    /**
     * 用于创建凹凸贴图的纹理。黑白值映射到与光照相关的感知深度。
     * The texture to create a bump map. The black and white values map to the
     * perceived depth in relation to the lights.
     * 凹凸实际上不会影响对象的几何形状，只影响光照。如果定义了法线贴图，这将被忽略。
     * Bump doesn't actually affect the geometry of the object, only the lighting. If a normal map is defined this will be ignored.
     *
     * @type {?Texture}
     * @default null
     */
    this.bumpMap = null;

    /**
     * 凹凸贴图对材质的影响程度。典型范围是`[0,1]`。
     * How much the bump map affects the material. Typical range is `[0,1]`.
     *
     * @type {number}
     * @default 1
     */
    this.bumpScale = 1;

    /**
     * 用于创建法线贴图的纹理。RGB值影响每个像素片段的表面法线，并改变颜色的光照方式。
     * The texture to create a normal map. The RGB values affect the surface
     * normal for each pixel fragment and change the way the color is lit.
     * 法线贴图不会改变表面的实际形状，只改变光照。
     * Normal maps do not change the actual shape of the surface, only the lighting.
     * 如果材质的法线贴图是使用左手坐标系创建的，应该将`normalScale`的`y`分量取反以补偿不同的手性。
     * In case the material has a normal map authored using the left handed
     * convention, the `y` component of `normalScale` should be negated to compensate for the different handedness.
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
     * 法线贴图对材质的影响程度。典型值范围是`[0,1]`。
     * How much the normal map affects the material. Typical value range is `[0,1]`.
     *
     * @type {Vector2}
     * @default (1,1)
     */
    this.normalScale = new Vector2(1, 1);

    /**
     * 位移贴图影响网格顶点的位置。与其他只影响材质光照和阴影的贴图不同，
     * The displacement map affects the position of the mesh's vertices. Unlike
     * other maps which only affect the light and shade of the material
     * 位移的顶点可以投射阴影、阻挡其他对象，并以其他方式表现为真实几何体。
     * the displaced vertices can cast shadows, block other objects, and otherwise act as real geometry.
     * 位移纹理是一个图像，其中每个像素的值（白色为最高）被映射并重新定位网格的顶点。
     * The displacement texture is an image where the value of each pixel (white being the highest) is mapped against, and repositions, the vertices of the mesh.
     *
     * @type {?Texture}
     * @default null
     */
    this.displacementMap = null;

    /**
     * 位移贴图对网格的影响程度（黑色为无位移，白色为最大位移）。
     * How much the displacement map affects the mesh (where black is no
     * displacement, and white is maximum displacement).
     * 如果没有设置位移贴图，此值不会被应用。
     * Without a displacement map set, this value is not applied.
     *
     * @type {number}
     * @default 0
     */
    this.displacementScale = 1;

    /**
     * 位移贴图值在网格顶点上的偏移。偏移被添加到位移贴图的缩放采样中。
     * The offset of the displacement map's values on the mesh's vertices.
     * The bias is added to the scaled sample of the displacement map.
     * 如果没有设置位移贴图，此值不会被应用。
     * Without a displacement map set, this value is not applied.
     *
     * @type {number}
     * @default 0
     */
    this.displacementBias = 0;

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
     * 将几何体渲染为线框。
     * Renders the geometry as a wireframe.
     *
     * @type {boolean}
     * @default false
     */
    this.wireframe = false;

    /**
     * 控制线框的粗细。只能与{@link SVGRenderer}一起使用。
     * Controls the thickness of the wireframe.
     * Can only be used with {@link SVGRenderer}.
     *
     * @type {number}
     * @default 1
     */
    this.wireframeLinewidth = 1;

    /**
     * 定义线框端点的外观。只能与{@link SVGRenderer}一起使用。
     * Defines appearance of wireframe ends.
     * Can only be used with {@link SVGRenderer}.
     *
     * @type {('round'|'bevel'|'miter')}
     * @default 'round'
     */
    this.wireframeLinecap = "round";

    /**
     * 定义线框连接点的外观。只能与{@link SVGRenderer}一起使用。
     * Defines appearance of wireframe joints.
     * Can only be used with {@link SVGRenderer}.
     *
     * @type {('round'|'bevel'|'miter')}
     * @default 'round'
     */
    this.wireframeLinejoin = "round";

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
   * 复制另一个MeshToonMaterial的属性到当前材质。
   * Copy properties from another MeshToonMaterial to this material.
   *
   * @param {MeshToonMaterial} source - 要复制的源材质
   * @returns {MeshToonMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 调用父类的copy方法
    super.copy(source);

    // 复制颜色属性
    this.color.copy(source.color);

    // 复制贴图属性
    this.map = source.map;
    // 复制渐变贴图属性
    this.gradientMap = source.gradientMap;

    // 复制光照贴图属性
    this.lightMap = source.lightMap;
    // 复制光照贴图强度
    this.lightMapIntensity = source.lightMapIntensity;

    // 复制环境遮挡贴图属性
    this.aoMap = source.aoMap;
    // 复制环境遮挡强度
    this.aoMapIntensity = source.aoMapIntensity;

    // 复制自发光颜色
    this.emissive.copy(source.emissive);
    // 复制自发光贴图
    this.emissiveMap = source.emissiveMap;
    // 复制自发光强度
    this.emissiveIntensity = source.emissiveIntensity;

    // 复制凹凸贴图属性
    this.bumpMap = source.bumpMap;
    // 复制凹凸缩放
    this.bumpScale = source.bumpScale;

    // 复制法线贴图属性
    this.normalMap = source.normalMap;
    // 复制法线贴图类型
    this.normalMapType = source.normalMapType;
    // 复制法线缩放
    this.normalScale.copy(source.normalScale);

    // 复制位移贴图属性
    this.displacementMap = source.displacementMap;
    // 复制位移缩放
    this.displacementScale = source.displacementScale;
    // 复制位移偏移
    this.displacementBias = source.displacementBias;

    // 复制alpha贴图
    this.alphaMap = source.alphaMap;

    // 复制线框属性
    this.wireframe = source.wireframe;
    // 复制线框线宽
    this.wireframeLinewidth = source.wireframeLinewidth;
    // 复制线框端点样式
    this.wireframeLinecap = source.wireframeLinecap;
    // 复制线框连接样式
    this.wireframeLinejoin = source.wireframeLinejoin;

    // 复制雾效果属性
    this.fog = source.fog;

    // 返回当前实例以支持链式调用
    return this;
  }
}

// 导出MeshToonMaterial类
export { MeshToonMaterial };
