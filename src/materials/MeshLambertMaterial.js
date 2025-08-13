// 导入乘法操作和切线空间法线贴图常量
import { MultiplyOperation, TangentSpaceNormalMap } from "../constants.js";
// 导入基础材质类
import { Material } from "./Material.js";
// 导入二维向量类
import { Vector2 } from "../math/Vector2.js";
// 导入颜色类
import { Color } from "../math/Color.js";
// 导入欧拉角类
import { Euler } from "../math/Euler.js";

/**
 * 用于非光泽表面的材质，没有镜面高光。
 * A material for non-shiny surfaces, without specular highlights.
 *
 * 该材质使用基于非物理的 [Lambertian]{@link https://en.wikipedia.org/wiki/Lambertian_reflectance}
 * 模型来计算反射率。这可以很好地模拟一些表面（如未处理的木材或石材），
 * 但无法模拟具有镜面高光的光泽表面（如清漆木材）。`MeshLambertMaterial` 使用逐片段着色。
 * The material uses a non-physically based [Lambertian]{@link https://en.wikipedia.org/wiki/Lambertian_reflectance}
 * model for calculating reflectance. This can simulate some surfaces (such
 * as untreated wood or stone) well, but cannot simulate shiny surfaces with
 * specular highlights (such as varnished wood). `MeshLambertMaterial` uses per-fragment
 * shading.
 *
 * 由于反射率和光照模型的简单性，使用此材质比使用 {@link MeshPhongMaterial}、
 * {@link MeshStandardMaterial} 或 {@link MeshPhysicalMaterial} 性能更好，
 * 但会牺牲一些图形精度。
 * Due to the simplicity of the reflectance and illumination models,
 * performance will be greater when using this material over the
 * {@link MeshPhongMaterial}, {@link MeshStandardMaterial} or
 * {@link MeshPhysicalMaterial}, at the cost of some graphical accuracy.
 *
 * @augments Material
 */
class MeshLambertMaterial extends Material {
  /**
   * 构造一个新的网格Lambert材质。
   * Constructs a new mesh lambert material.
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
    this.isMeshLambertMaterial = true;

    // 设置材质类型名称
    this.type = "MeshLambertMaterial";

    /**
     * 材质的颜色。
     * Color of the material.
     *
     * @type {Color}
     * @default (1,1,1)
     */
    this.color = new Color(0xffffff); // 漫反射颜色

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
     * 环境遮挡效果的强度。范围是 `[0,1]`，其中 `0` 禁用环境遮挡。
     * 当强度为 `1` 且AO贴图的红色通道也为 `1` 时，表面的环境光完全被遮挡。
     * Intensity of the ambient occlusion effect. Range is `[0,1]`, where `0`
     * disables ambient occlusion. Where intensity is `1` and the AO map's
     * red channel is also `1`, ambient light is fully occluded on a surface.
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
     * 自发光的强度。调节自发光颜色。
     * Intensity of the emissive light. Modulates the emissive color.
     *
     * @type {number}
     * @default 1
     */
    this.emissiveIntensity = 1.0;

    /**
     * 设置自发光（发光）贴图。自发光贴图颜色由自发光颜色和自发光强度调节。
     * 如果有自发光贴图，请确保将自发光颜色设置为黑色以外的颜色。
     * Set emissive (glow) map. The emissive map color is modulated by the
     * emissive color and the emissive intensity. If you have an emissive map,
     * be sure to set the emissive color to something other than black.
     *
     * @type {?Texture}
     * @default null
     */
    this.emissiveMap = null;

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
     * 材质使用的镜面反射贴图。
     * Specular map used by the material.
     *
     * @type {?Texture}
     * @default null
     */
    this.specularMap = null;

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
     * 环境贴图。
     * The environment map.
     *
     * @type {?Texture}
     * @default null
     */
    this.envMap = null;

    /**
     * 环境贴图的旋转角度（弧度）。
     * The rotation of the environment map in radians.
     *
     * @type {Euler}
     * @default (0,0,0)
     */
    this.envMapRotation = new Euler();

    /**
     * 如何将表面颜色的结果与环境贴图（如果有）结合。
     * 当设置为 `MixOperation` 时，使用 {@link MeshBasicMaterial#reflectivity}
     * 在两种颜色之间进行混合。
     * How to combine the result of the surface's color with the environment map, if any.
     * When set to `MixOperation`, the {@link MeshBasicMaterial#reflectivity} is used to
     * blend between the two colors.
     *
     * @type {(MultiplyOperation|MixOperation|AddOperation)}
     * @default MultiplyOperation
     */
    this.combine = MultiplyOperation;

    /**
     * 环境贴图对表面的影响程度。
     * 有效范围在 `0`（无反射）和 `1`（完全反射）之间。
     * How much the environment map affects the surface.
     * The valid range is between `0` (no reflections) and `1` (full reflections).
     *
     * @type {number}
     * @default 1
     */
    this.reflectivity = 1;

    /**
     * 空气的折射率（约为1）除以材质的折射率。它与环境映射模式
     * {@link CubeRefractionMapping} 和 {@link EquirectangularRefractionMapping} 一起使用。
     * 折射比不应超过 `1`。
     * The index of refraction (IOR) of air (approximately 1) divided by the
     * index of refraction of the material. It is used with environment mapping
     * modes {@link CubeRefractionMapping} and {@link EquirectangularRefractionMapping}.
     * The refraction ratio should not exceed `1`.
     *
     * @type {number}
     * @default 0.98
     */
    this.refractionRatio = 0.98;

    /**
     * 将几何体渲染为线框。
     * Renders the geometry as a wireframe.
     *
     * @type {boolean}
     * @default false
     */
    this.wireframe = false;

    /**
     * 控制线框的粗细。
     * 只能与 {@link SVGRenderer} 一起使用。
     * Controls the thickness of the wireframe.
     * Can only be used with {@link SVGRenderer}.
     *
     * @type {number}
     * @default 1
     */
    this.wireframeLinewidth = 1;

    /**
     * 定义线框端点的外观。
     * 只能与 {@link SVGRenderer} 一起使用。
     * Defines appearance of wireframe ends.
     * Can only be used with {@link SVGRenderer}.
     *
     * @type {('round'|'bevel'|'miter')}
     * @default 'round'
     */
    this.wireframeLinecap = "round";

    /**
     * 定义线框连接点的外观。
     * 只能与 {@link SVGRenderer} 一起使用。
     * Defines appearance of wireframe joints.
     * Can only be used with {@link SVGRenderer}.
     *
     * @type {('round'|'bevel'|'miter')}
     * @default 'round'
     */
    this.wireframeLinejoin = "round";

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
   * 复制另一个MeshLambertMaterial的属性到当前材质。
   * Copy properties from another MeshLambertMaterial to this material.
   *
   * @param {MeshLambertMaterial} source - 要复制属性的源材质
   * @returns {MeshLambertMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 调用父类的copy方法
    super.copy(source);

    // 复制颜色属性
    this.color.copy(source.color);

    // 复制颜色贴图
    this.map = source.map;

    // 复制光照贴图和强度
    this.lightMap = source.lightMap;
    this.lightMapIntensity = source.lightMapIntensity;

    // 复制环境遮挡贴图和强度
    this.aoMap = source.aoMap;
    this.aoMapIntensity = source.aoMapIntensity;

    // 复制自发光相关属性
    this.emissive.copy(source.emissive);
    this.emissiveMap = source.emissiveMap;
    this.emissiveIntensity = source.emissiveIntensity;

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

    // 复制镜面反射贴图
    this.specularMap = source.specularMap;

    // 复制alpha贴图
    this.alphaMap = source.alphaMap;

    // 复制环境贴图相关属性
    this.envMap = source.envMap;
    this.envMapRotation.copy(source.envMapRotation);
    this.combine = source.combine;
    this.reflectivity = source.reflectivity;
    this.refractionRatio = source.refractionRatio;

    // 复制线框相关属性
    this.wireframe = source.wireframe;
    this.wireframeLinewidth = source.wireframeLinewidth;
    this.wireframeLinecap = source.wireframeLinecap;
    this.wireframeLinejoin = source.wireframeLinejoin;

    // 复制平面着色设置
    this.flatShading = source.flatShading;

    // 复制雾效设置
    this.fog = source.fog;

    // 返回当前实例以支持链式调用
    return this;
  }
}

// 导出MeshLambertMaterial类
export { MeshLambertMaterial };
