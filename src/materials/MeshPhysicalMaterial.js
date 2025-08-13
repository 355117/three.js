// 导入二维向量类
import { Vector2 } from "../math/Vector2.js";
// 导入标准网格材质类
import { MeshStandardMaterial } from "./MeshStandardMaterial.js";
// 导入颜色类
import { Color } from "../math/Color.js";
// 导入数学工具函数中的限制函数
import { clamp } from "../math/MathUtils.js";

/**
 * {@link MeshStandardMaterial} 的扩展，提供更高级的基于物理的渲染属性：
 * An extension of the {@link MeshStandardMaterial}, providing more advanced
 * physically-based rendering properties:
 *
 * - 各向异性（Anisotropy）：能够表现材质的各向异性特性，如拉丝金属中可观察到的效果。
 * - Anisotropy: Ability to represent the anisotropic property of materials
 * as observable with brushed metals.
 * - 清漆层（Clearcoat）：某些材质（如汽车漆、碳纤维和湿润表面）需要在另一个可能不规则或粗糙的层上有一个透明的反射层。
 * 清漆层近似这种效果，无需单独的透明表面。
 * - Clearcoat: Some materials — like car paints, carbon fiber, and wet surfaces — require
 * a clear, reflective layer on top of another layer that may be irregular or rough.
 * Clearcoat approximates this effect, without the need for a separate transparent surface.
 * - 彩虹色（Iridescence）：允许渲染色调根据观察角度和照明角度变化的效果。这可以在肥皂泡、油膜或许多昆虫的翅膀上看到。
 * - Iridescence: Allows to render the effect where hue varies  depending on the viewing
 * angle and illumination angle. This can be seen on soap bubbles, oil films, or on the
 * wings of many insects.
 * - 基于物理的透明度：{@link Material#opacity} 的一个限制是高度透明的材质反射性较差。
 * 基于物理的透射为薄的透明表面（如玻璃）提供了更现实的选择。
 * - Physically-based transparency: One limitation of {@link Material#opacity} is that highly
 * transparent materials are less reflective. Physically-based transmission provides a more
 * realistic option for thin, transparent surfaces like glass.
 * - 高级反射率：为非金属材质提供更灵活的反射率。
 * - Advanced reflectivity: More flexible reflectivity for non-metallic materials.
 * - 光泽（Sheen）：可用于表现布料和织物材质。
 * - Sheen: Can be used for representing cloth and fabric materials.
 *
 * 由于这些复杂的着色特性，`MeshPhysicalMaterial` 比其他 three.js 材质具有更高的每像素性能成本。
 * 大多数效果默认是禁用的，启用时会增加成本。为了获得最佳效果，使用此材质时请始终指定环境贴图。
 * As a result of these complex shading features, `MeshPhysicalMaterial` has a
 * higher performance cost, per pixel, than other three.js materials. Most
 * effects are disabled by default, and add cost as they are enabled. For
 * best results, always specify an environment map when using this material.
 *
 * @augments MeshStandardMaterial
 */
class MeshPhysicalMaterial extends MeshStandardMaterial {
  /**
   * 构造一个新的网格物理材质。
   * Constructs a new mesh physical material.
   *
   * @param {Object} [parameters] - 包含一个或多个属性的对象，用于定义材质的外观。
   * 材质的任何属性（包括从继承材质中的任何属性）都可以在这里传递。
   * 颜色值可以传递任何被 {@link Color#set} 接受的类型值。
   * An object with one or more properties
   * defining the material's appearance. Any property of the material
   * (including any property from inherited materials) can be passed
   * in here. Color values can be passed any type of value accepted
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
    this.isMeshPhysicalMaterial = true;

    // 定义着色器预处理器宏
    this.defines = {
      STANDARD: "", // 标准材质标识
      PHYSICAL: "", // 物理材质标识
    };

    // 设置材质类型名称
    this.type = "MeshPhysicalMaterial";

    /**
     * 各向异性在切线、副切线空间中的旋转，以弧度为单位，从切线逆时针测量。
     * 当存在 `anisotropyMap` 时，此属性为纹理中的向量提供额外的旋转。
     * The rotation of the anisotropy in tangent, bitangent space, measured in radians
     * counter-clockwise from the tangent. When `anisotropyMap` is present, this
     * property provides additional rotation to the vectors in the texture.
     *
     * @type {number}
     * @default 0
     */
    this.anisotropyRotation = 0;

    /**
     * 各向异性贴图。红色和绿色通道表示 `[-1, 1]` 切线、副切线空间中的各向异性方向，
     * 将被 `anisotropyRotation` 旋转。蓝色通道包含强度值 `[0, 1]`，将与 `anisotropy` 相乘。
     * Red and green channels represent the anisotropy direction in `[-1, 1]` tangent,
     * bitangent space, to be rotated by `anisotropyRotation`. The blue channel
     * contains strength as `[0, 1]` to be multiplied by `anisotropy`.
     *
     * @type {?Texture}
     * @default null
     */
    this.anisotropyMap = null;

    /**
     * 清漆层贴图。此纹理的红色通道与 `clearcoat` 相乘，用于逐像素控制涂层的强度。
     * The red channel of this texture is multiplied against `clearcoat`,
     * for per-pixel control over a coating's intensity.
     *
     * @type {?Texture}
     * @default null
     */
    this.clearcoatMap = null;

    /**
     * 清漆层的粗糙度，范围从 `0.0` 到 `1.0`。
     * Roughness of the clear coat layer, from `0.0` to `1.0`.
     *
     * @type {number}
     * @default 0
     */
    this.clearcoatRoughness = 0.0;

    /**
     * 清漆层粗糙度贴图。此纹理的绿色通道与 `clearcoatRoughness` 相乘，
     * 用于逐像素控制涂层的粗糙度。
     * The green channel of this texture is multiplied against
     * `clearcoatRoughness`, for per-pixel control over a coating's roughness.
     *
     * @type {?Texture}
     * @default null
     */
    this.clearcoatRoughnessMap = null;

    /**
     * `clearcoatNormalMap` 对清漆层的影响程度，范围从 `(0,0)` 到 `(1,1)`。
     * How much `clearcoatNormalMap` affects the clear coat layer, from
     * `(0,0)` to `(1,1)`.
     *
     * @type {Vector2}
     * @default (1,1)
     */
    this.clearcoatNormalScale = new Vector2(1, 1);

    /**
     * 清漆层法线贴图。可用于为清漆层启用独立的法线。
     * Can be used to enable independent normals for the clear coat layer.
     *
     * @type {?Texture}
     * @default null
     */
    this.clearcoatNormalMap = null;

    /**
     * 非金属材质的折射率，范围从 `1.0` 到 `2.333`。
     * Index-of-refraction for non-metallic materials, from `1.0` to `2.333`.
     *
     * @type {number}
     * @default 1.5
     */
    this.ior = 1.5;

    /**
     * 反射率程度，范围从 `0.0` 到 `1.0`。默认值是 `0.5`，对应折射率 `1.5`。
     * 这模拟了非金属材质的反射率。当 `metalness` 为 `1.0` 时无效果。
     * Degree of reflectivity, from `0.0` to `1.0`. Default is `0.5`, which
     * corresponds to an index-of-refraction of `1.5`.
     *
     * This models the reflectivity of non-metallic materials. It has no effect
     * when `metalness` is `1.0`
     *
     * @name MeshPhysicalMaterial#reflectivity
     * @type {number}
     * @default 0.5
     */
    Object.defineProperty(this, "reflectivity", {
      // 获取反射率值，基于折射率计算
      get: function () {
        return clamp((2.5 * (this.ior - 1)) / (this.ior + 1), 0, 1);
      },
      // 设置反射率值，自动计算对应的折射率
      set: function (reflectivity) {
        this.ior = (1 + 0.4 * reflectivity) / (1 - 0.4 * reflectivity);
      },
    });

    /**
     * 彩虹色贴图。此纹理的红色通道与 `iridescence` 相乘，用于逐像素控制彩虹色效果。
     * The red channel of this texture is multiplied against `iridescence`, for per-pixel
     * control over iridescence.
     *
     * @type {?Texture}
     * @default null
     */
    this.iridescenceMap = null;

    /**
     * 彩虹色RGB颜色偏移效果的强度，由折射率表示。范围在 `1.0` 到 `2.333` 之间。
     * Strength of the iridescence RGB color shift effect, represented by an index-of-refraction.
     * Between `1.0` to `2.333`.
     *
     * @type {number}
     * @default 1.3
     */
    this.iridescenceIOR = 1.3;

    /**
     * 包含恰好2个元素的数组，指定彩虹色层的最小和最大厚度。
     * 彩虹色层的厚度具有与 `thickness` 对 `ior` 的等效效果。
     * Array of exactly 2 elements, specifying minimum and maximum thickness of the iridescence layer.
     * Thickness of iridescence layer has an equivalent effect of the one `thickness` has on `ior`.
     *
     * @type {Array<number,number>}
     * @default [100,400]
     */
    this.iridescenceThicknessRange = [100, 400];

    /**
     * 定义彩虹色层厚度的纹理，存储在绿色通道中。
     * 厚度的最小值和最大值由 `iridescenceThicknessRange` 数组定义：
     * - 绿色通道中的 `0.0` 将导致厚度等于数组的第一个元素。
     * - 绿色通道中的 `1.0` 将导致厚度等于数组的第二个元素。
     * - 中间值将在数组元素之间线性插值。
     * A texture that defines the thickness of the iridescence layer, stored in the green channel.
     * Minimum and maximum values of thickness are defined by `iridescenceThicknessRange` array:
     * - `0.0` in the green channel will result in thickness equal to first element of the array.
     * - `1.0` in the green channel will result in thickness equal to second element of the array.
     * - Values in-between will linearly interpolate between the elements of the array.
     *
     * @type {?Texture}
     * @default null
     */
    this.iridescenceThicknessMap = null;

    /**
     * 光泽层的色调。
     * The sheen tint.
     *
     * @type {Color}
     * @default (0,0,0)
     */
    this.sheenColor = new Color(0x000000);

    /**
     * 光泽层颜色贴图。此纹理的RGB通道与 `sheenColor` 相乘，用于逐像素控制光泽色调。
     * The RGB channels of this texture are multiplied against  `sheenColor`, for per-pixel control
     * over sheen tint.
     *
     * @type {?Texture}
     * @default null
     */
    this.sheenColorMap = null;

    /**
     * 光泽层的粗糙度，范围从 `0.0` 到 `1.0`。
     * Roughness of the sheen layer, from `0.0` to `1.0`.
     *
     * @type {number}
     * @default 1
     */
    this.sheenRoughness = 1.0;

    /**
     * 光泽层粗糙度贴图。此纹理的alpha通道与 `sheenRoughness` 相乘，用于逐像素控制光泽粗糙度。
     * The alpha channel of this texture is multiplied against `sheenRoughness`, for per-pixel control
     * over sheen roughness.
     *
     * @type {?Texture}
     * @default null
     */
    this.sheenRoughnessMap = null;

    /**
     * 透射贴图。此纹理的红色通道与 `transmission` 相乘，用于逐像素控制光学透明度。
     * The red channel of this texture is multiplied against `transmission`, for per-pixel control over
     * optical transparency.
     *
     * @type {?Texture}
     * @default null
     */
    this.transmissionMap = null;

    /**
     * 表面下方体积的厚度。该值在网格的坐标空间中给出。
     * 如果值为 `0`，则材质是薄壁的。否则材质是体积边界。
     * The thickness of the volume beneath the surface. The value is given in the
     * coordinate space of the mesh. If the value is `0` the material is
     * thin-walled. Otherwise the material is a volume boundary.
     *
     * @type {number}
     * @default 0
     */
    this.thickness = 0;

    /**
     * 定义厚度的纹理，存储在绿色通道中。这将与 `thickness` 相乘。
     * A texture that defines the thickness, stored in the green channel. This will
     * be multiplied by `thickness`.
     *
     * @type {?Texture}
     * @default null
     */
    this.thicknessMap = null;

    /**
     * 介质的密度，表示为光在与粒子相互作用之前在介质中传播的平均距离。
     * 该值以世界空间单位给出，必须大于零。
     * Density of the medium given as the average distance that light travels in
     * the medium before interacting with a particle. The value is given in world
     * space units, and must be greater than zero.
     *
     * @type {number}
     * @default Infinity
     */
    this.attenuationDistance = Infinity;

    /**
     * 白光由于吸收在达到衰减距离时变成的颜色。
     * The color that white light turns into due to absorption when reaching the
     * attenuation distance.
     *
     * @type {Color}
     * @default (1,1,1)
     */
    this.attenuationColor = new Color(1, 1, 1);

    /**
     * 仅对非金属材质缩放镜面反射量的浮点数。
     * 当设置为零时，模型实际上是朗伯模型。范围从 `0.0` 到 `1.0`。
     * A float that scales the amount of specular reflection for non-metals only.
     * When set to zero, the model is effectively Lambertian. From `0.0` to `1.0`.
     *
     * @type {number}
     * @default 1
     */
    this.specularIntensity = 1.0;

    /**
     * 镜面反射强度贴图。此纹理的alpha通道与 `specularIntensity` 相乘，
     * 用于逐像素控制镜面反射强度。
     * The alpha channel of this texture is multiplied against `specularIntensity`,
     * for per-pixel control over specular intensity.
     *
     * @type {?Texture}
     * @default null
     */
    this.specularIntensityMap = null;

    /**
     * 仅对非金属材质在法线入射时为镜面反射着色。
     * Tints the specular reflection at normal incidence for non-metals only.
     *
     * @type {Color}
     * @default (1,1,1)
     */
    this.specularColor = new Color(1, 1, 1);

    /**
     * 镜面反射颜色贴图。此纹理的RGB通道与 `specularColor` 相乘，
     * 用于逐像素控制镜面反射颜色。
     * The RGB channels of this texture are multiplied against `specularColor`,
     * for per-pixel control over specular color.
     *
     * @type {?Texture}
     * @default null
     */
    this.specularColorMap = null;

    // 私有属性，用于存储各种效果的强度值
    this._anisotropy = 0; // 各向异性强度
    this._clearcoat = 0; // 清漆层强度
    this._dispersion = 0; // 色散强度
    this._iridescence = 0; // 彩虹色强度
    this._sheen = 0.0; // 光泽层强度
    this._transmission = 0; // 透射强度

    // 使用传入的参数设置材质属性
    this.setValues(parameters);
  }

  /**
   * 各向异性强度。
   * The anisotropy strength.
   *
   * @type {number}
   * @default 0
   */
  get anisotropy() {
    // 返回各向异性强度值
    return this._anisotropy;
  }

  set anisotropy(value) {
    // 如果各向异性状态发生变化（从0变为非0或从非0变为0），更新版本号
    if (this._anisotropy > 0 !== value > 0) {
      this.version++;
    }

    // 设置各向异性强度值
    this._anisotropy = value;
  }

  /**
   * 表示清漆层的强度，范围从 `0.0` 到 `1.0`。
   * 使用清漆层相关属性来启用在基础层上有薄半透明层的多层材质。
   * Represents the intensity of the clear coat layer, from `0.0` to `1.0`. Use
   * clear coat related properties to enable multilayer materials that have a
   * thin translucent layer over the base layer.
   *
   * @type {number}
   * @default 0
   */
  get clearcoat() {
    // 返回清漆层强度值
    return this._clearcoat;
  }

  set clearcoat(value) {
    // 如果清漆层状态发生变化（从0变为非0或从非0变为0），更新版本号
    if (this._clearcoat > 0 !== value > 0) {
      this.version++;
    }

    // 设置清漆层强度值
    this._clearcoat = value;
  }
  /**
   * 彩虹色层的强度，基于表面和观察者之间的角度模拟RGB颜色偏移，范围从 `0.0` 到 `1.0`。
   * The intensity of the iridescence layer, simulating RGB color shift based on the angle between
   * the surface and the viewer, from `0.0` to `1.0`.
   *
   * @type {number}
   * @default 0
   */
  get iridescence() {
    // 返回彩虹色强度值
    return this._iridescence;
  }

  set iridescence(value) {
    // 如果彩虹色状态发生变化（从0变为非0或从非0变为0），更新版本号
    if (this._iridescence > 0 !== value > 0) {
      this.version++;
    }

    // 设置彩虹色强度值
    this._iridescence = value;
  }

  /**
   * 定义通过相对透明体积传输的颜色角度分离强度（色散）。
   * 任何零或更大的值都有效，现实值的典型范围是 `[0, 1]`。
   * 此属性只能与透射对象一起使用。
   * Defines the strength of the angular separation of colors (chromatic aberration) transmitting
   * through a relatively clear volume. Any value zero or larger is valid, the typical range of
   * realistic values is `[0, 1]`. This property can be only be used with transmissive objects.
   *
   * @type {number}
   * @default 0
   */
  get dispersion() {
    // 返回色散强度值
    return this._dispersion;
  }

  set dispersion(value) {
    // 如果色散状态发生变化（从0变为非0或从非0变为0），更新版本号
    if (this._dispersion > 0 !== value > 0) {
      this.version++;
    }

    // 设置色散强度值
    this._dispersion = value;
  }

  /**
   * 光泽层的强度，范围从 `0.0` 到 `1.0`。
   * The intensity of the sheen layer, from `0.0` to `1.0`.
   *
   * @type {number}
   * @default 0
   */
  get sheen() {
    // 返回光泽层强度值
    return this._sheen;
  }

  set sheen(value) {
    // 如果光泽层状态发生变化（从0变为非0或从非0变为0），更新版本号
    if (this._sheen > 0 !== value > 0) {
      this.version++;
    }

    // 设置光泽层强度值
    this._sheen = value;
  }

  /**
   * 透射程度（或光学透明度），范围从 `0.0` 到 `1.0`。
   * 薄的、透明或半透明的塑料或玻璃材质即使完全透射也保持很大程度的反射性。
   * 透射属性可用于模拟这些材质。
   * 当透射非零时，`opacity` 应设置为 `1`。
   * Degree of transmission (or optical transparency), from `0.0` to `1.0`.
   *
   * Thin, transparent or semitransparent, plastic or glass materials remain
   * largely reflective even if they are fully transmissive. The transmission
   * property can be used to model these materials.
   *
   * When transmission is non-zero, `opacity` should be  set to `1`.
   *
   * @type {number}
   * @default 0
   */
  get transmission() {
    // 返回透射强度值
    return this._transmission;
  }

  set transmission(value) {
    // 如果透射状态发生变化（从0变为非0或从非0变为0），更新版本号
    if (this._transmission > 0 !== value > 0) {
      this.version++;
    }

    // 设置透射强度值
    this._transmission = value;
  }

  /**
   * 复制另一个MeshPhysicalMaterial的属性到当前材质。
   * Copy properties from another MeshPhysicalMaterial to this material.
   *
   * @param {MeshPhysicalMaterial} source - 要复制属性的源材质
   * @returns {MeshPhysicalMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 调用父类的copy方法
    super.copy(source);

    // 重新设置着色器预处理器宏
    this.defines = {
      STANDARD: "", // 标准材质标识
      PHYSICAL: "", // 物理材质标识
    };

    // 复制各向异性相关属性
    this.anisotropy = source.anisotropy;
    this.anisotropyRotation = source.anisotropyRotation;
    this.anisotropyMap = source.anisotropyMap;

    // 复制清漆层相关属性
    this.clearcoat = source.clearcoat;
    this.clearcoatMap = source.clearcoatMap;
    this.clearcoatRoughness = source.clearcoatRoughness;
    this.clearcoatRoughnessMap = source.clearcoatRoughnessMap;
    this.clearcoatNormalMap = source.clearcoatNormalMap;
    this.clearcoatNormalScale.copy(source.clearcoatNormalScale);

    // 复制色散和折射率属性
    this.dispersion = source.dispersion;
    this.ior = source.ior;

    // 复制彩虹色相关属性
    this.iridescence = source.iridescence;
    this.iridescenceMap = source.iridescenceMap;
    this.iridescenceIOR = source.iridescenceIOR;
    this.iridescenceThicknessRange = [...source.iridescenceThicknessRange];
    this.iridescenceThicknessMap = source.iridescenceThicknessMap;

    // 复制光泽层相关属性
    this.sheen = source.sheen;
    this.sheenColor.copy(source.sheenColor);
    this.sheenColorMap = source.sheenColorMap;
    this.sheenRoughness = source.sheenRoughness;
    this.sheenRoughnessMap = source.sheenRoughnessMap;

    // 复制透射相关属性
    this.transmission = source.transmission;
    this.transmissionMap = source.transmissionMap;

    // 复制厚度和衰减相关属性
    this.thickness = source.thickness;
    this.thicknessMap = source.thicknessMap;
    this.attenuationDistance = source.attenuationDistance;
    this.attenuationColor.copy(source.attenuationColor);

    // 复制镜面反射相关属性
    this.specularIntensity = source.specularIntensity;
    this.specularIntensityMap = source.specularIntensityMap;
    this.specularColor.copy(source.specularColor);
    this.specularColorMap = source.specularColorMap;

    // 返回当前实例以支持链式调用
    return this;
  }
}

// 导出MeshPhysicalMaterial类
export { MeshPhysicalMaterial };
