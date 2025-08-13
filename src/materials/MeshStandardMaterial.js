// 导入切线空间法线贴图常量
import { TangentSpaceNormalMap } from "../constants.js";
// 导入基础材质类
import { Material } from "./Material.js";
// 导入二维向量类
import { Vector2 } from "../math/Vector2.js";
// 导入颜色类
import { Color } from "../math/Color.js";
// 导入欧拉角类
import { Euler } from "../math/Euler.js";

/**
 * 使用金属-粗糙度工作流程的标准物理基础材质。
 * A standard physically based material, using Metallic-Roughness workflow.
 *
 * 基于物理的渲染（PBR）最近已成为许多3D应用程序的标准，
 * Physically based rendering (PBR) has recently become the standard in many
 * 3D applications,
 * 例如[Unity]{@link https://blogs.unity3d.com/2014/10/29/physically-based-shading-in-unity-5-a-primer/}、
 * such as [Unity]{@link https://blogs.unity3d.com/2014/10/29/physically-based-shading-in-unity-5-a-primer/},
 * [Unreal]{@link https://docs.unrealengine.com/latest/INT/Engine/Rendering/Materials/PhysicallyBased/}和
 * [Unreal]{@link https://docs.unrealengine.com/latest/INT/Engine/Rendering/Materials/PhysicallyBased/} and
 * [3D Studio Max]{@link http://area.autodesk.com/blogs/the-3ds-max-blog/what039s-new-for-rendering-in-3ds-max-2017}。
 * [3D Studio Max]{@link http://area.autodesk.com/blogs/the-3ds-max-blog/what039s-new-for-rendering-in-3ds-max-2017}.
 *
 * 这种方法与旧方法的不同之处在于，它不使用光与表面相互作用方式的近似值，
 * This approach differs from older approaches in that instead of using
 * approximations for the way in which light interacts with a surface,
 * 而是使用物理上正确的模型。其理念是，不是调整材质在特定光照下看起来不错，
 * a physically correct model is used. The idea is that, instead of tweaking
 * materials to look good under specific lighting,
 * 而是可以创建一个在所有光照场景下都能"正确"反应的材质。
 * a material can be created that will react 'correctly' under all lighting scenarios.
 *
 * 在实践中，这比{@link MeshLambertMaterial}或{@link MeshPhongMaterial}提供了更准确和逼真的结果，
 * In practice this gives a more accurate and realistic looking result than
 * the {@link MeshLambertMaterial} or {@link MeshPhongMaterial},
 * 代价是计算成本稍高。`MeshStandardMaterial`使用逐片段着色。
 * at the cost of being somewhat more computationally expensive. `MeshStandardMaterial` uses per-fragment shading.
 *
 * 请注意，为了获得最佳效果，使用此材质时应始终指定环境贴图。
 * Note that for best results you should always specify an environment map when using this material.
 *
 * 有关PBR概念的非技术性介绍以及如何设置PBR材质，请查看[marmoset]{@link https://www.marmoset.co}团队的这些文章：
 * For a non-technical introduction to the concept of PBR and how to set up a
 * PBR material, check out these articles by the people at [marmoset]{@link https://www.marmoset.co}:
 *
 * - [基于物理渲染的基本理论]{@link https://www.marmoset.co/posts/basic-theory-of-physically-based-rendering/}
 * - [Basic Theory of Physically Based Rendering]{@link https://www.marmoset.co/posts/basic-theory-of-physically-based-rendering/}
 * - [基于物理的渲染，你也可以]{@link https://www.marmoset.co/posts/physically-based-rendering-and-you-can-too/}
 * - [Physically Based Rendering and You Can Too]{@link https://www.marmoset.co/posts/physically-based-rendering-and-you-can-too/}
 *
 * three.js（和大多数其他PBR系统）中使用的方法的技术细节可以在Brent Burley的这篇
 * Technical details of the approach used in three.js (and most other PBR systems) can be found is this
 * [迪士尼论文]{@link https://media.disneyanimation.com/uploads/production/publication_asset/48/asset/s2012_pbs_disney_brdf_notes_v3.pdf}（pdf）中找到。
 * [paper from Disney]{@link https://media.disneyanimation.com/uploads/production/publication_asset/48/asset/s2012_pbs_disney_brdf_notes_v3.pdf}
 * (pdf), by Brent Burley.
 *
 * @augments Material
 */
class MeshStandardMaterial extends Material {
  /**
   * 构造一个新的网格标准材质。
   * Constructs a new mesh standard material.
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
    this.isMeshStandardMaterial = true;

    // 设置材质类型
    this.type = "MeshStandardMaterial";

    // 定义着色器宏，标识为标准材质
    this.defines = { STANDARD: "" };

    /**
     * 材质的颜色。
     * Color of the material.
     *
     * @type {Color}
     * @default (1,1,1)
     */
    this.color = new Color(0xffffff); // 漫反射颜色

    /**
     * 材质的粗糙程度。`0.0`表示光滑的镜面反射，`1.0`表示完全漫反射。
     * How rough the material appears. `0.0` means a smooth mirror reflection, `1.0`
     * means fully diffuse.
     * 如果还提供了`roughnessMap`，两个值将相乘。
     * If `roughnessMap` is also provided, both values are multiplied.
     *
     * @type {number}
     * @default 1
     */
    this.roughness = 1.0;

    /**
     * 材质的金属程度。非金属材质（如木材或石头）使用`0.0`，金属使用`1.0`，
     * How much the material is like a metal. Non-metallic materials such as wood
     * or stone use `0.0`, metallic use `1.0`,
     * 通常两者之间没有中间值。`0.0`到`1.0`之间的值可用于生锈金属的外观。
     * with nothing (usually) in between. A value between `0.0` and `1.0` could be used for a rusty metal look.
     * 如果还提供了`metalnessMap`，两个值将相乘。
     * If `metalnessMap` is also provided, both values are multiplied.
     *
     * @type {number}
     * @default 0
     */
    this.metalness = 0.0;

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
     * 此纹理的绿色通道用于改变材质的粗糙度。
     * The green channel of this texture is used to alter the roughness of the
     * material.
     *
     * @type {?Texture}
     * @default null
     */
    this.roughnessMap = null;

    /**
     * 此纹理的蓝色通道用于改变材质的金属度。
     * The blue channel of this texture is used to alter the metalness of the
     * material.
     *
     * @type {?Texture}
     * @default null
     */
    this.metalnessMap = null;

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
     * 环境贴图。为了确保物理上正确的渲染，环境贴图在内部使用{@link PMREMGenerator}进行预处理。
     * The environment map. To ensure a physically correct rendering, environment maps
     * are internally pre-processed with {@link PMREMGenerator}.
     *
     * @type {?Texture}
     * @default null
     */
    this.envMap = null;

    /**
     * 环境贴图的旋转（以弧度为单位）。
     * The rotation of the environment map in radians.
     *
     * @type {Euler}
     * @default (0,0,0)
     */
    this.envMapRotation = new Euler();

    /**
     * 通过乘以环境贴图的颜色来缩放环境贴图的效果。
     * Scales the effect of the environment map by multiplying its color.
     *
     * @type {number}
     * @default 1
     */
    this.envMapIntensity = 1.0;

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
     * 材质是否使用平面着色渲染。
     * Whether the material is rendered with flat shading or not.
     *
     * @type {boolean}
     * @default false
     */
    this.flatShading = false;

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
   * 复制另一个MeshStandardMaterial的属性到当前材质。
   * Copy properties from another MeshStandardMaterial to this material.
   *
   * @param {MeshStandardMaterial} source - 要复制的源材质
   * @returns {MeshStandardMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 调用父类的copy方法
    super.copy(source);

    // 重新设置着色器宏定义
    this.defines = { STANDARD: "" };

    // 复制基础颜色属性
    this.color.copy(source.color);
    // 复制粗糙度
    this.roughness = source.roughness;
    // 复制金属度
    this.metalness = source.metalness;

    // 复制颜色贴图
    this.map = source.map;

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

    // 复制粗糙度贴图
    this.roughnessMap = source.roughnessMap;

    // 复制金属度贴图
    this.metalnessMap = source.metalnessMap;

    // 复制alpha贴图
    this.alphaMap = source.alphaMap;

    // 复制环境贴图属性
    this.envMap = source.envMap;
    // 复制环境贴图旋转
    this.envMapRotation.copy(source.envMapRotation);
    // 复制环境贴图强度
    this.envMapIntensity = source.envMapIntensity;

    // 复制线框属性
    this.wireframe = source.wireframe;
    // 复制线框线宽
    this.wireframeLinewidth = source.wireframeLinewidth;
    // 复制线框端点样式
    this.wireframeLinecap = source.wireframeLinecap;
    // 复制线框连接样式
    this.wireframeLinejoin = source.wireframeLinejoin;

    // 复制平面着色属性
    this.flatShading = source.flatShading;

    // 复制雾效果属性
    this.fog = source.fog;

    // 返回当前实例以支持链式调用
    return this;
  }
}

// 导出MeshStandardMaterial类
export { MeshStandardMaterial };
