// 导入基础材质类
import { Material } from "./Material.js";
// 导入乘法操作常量
import { MultiplyOperation } from "../constants.js";
// 导入颜色类
import { Color } from "../math/Color.js";
// 导入欧拉角类
import { Euler } from "../math/Euler.js";

/**
 * 用于以简单着色（平面或线框）方式绘制几何体的材质。
 * A material for drawing geometries in a simple shaded (flat or wireframe) way.
 *
 * 此材质不受光照影响。
 * This material is not affected by lights.
 *
 * @augments Material
 */
class MeshBasicMaterial extends Material {
  /**
   * 构造一个新的网格基础材质。
   * Constructs a new mesh basic material.
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
    this.isMeshBasicMaterial = true;

    // 设置材质类型名称
    this.type = "MeshBasicMaterial";

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
   * 复制另一个MeshBasicMaterial的属性到当前材质。
   * Copy properties from another MeshBasicMaterial to this material.
   *
   * @param {MeshBasicMaterial} source - 要复制属性的源材质
   * @returns {MeshBasicMaterial} 返回当前材质实例，支持链式调用
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

    // 复制雾效设置
    this.fog = source.fog;

    // 返回当前实例以支持链式调用
    return this;
  }
}

// 导出MeshBasicMaterial类
export { MeshBasicMaterial };
