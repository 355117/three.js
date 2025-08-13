// 导入切线空间法线贴图常量
import { TangentSpaceNormalMap } from "../constants.js";
// 导入基础材质类
import { Material } from "./Material.js";
// 导入二维向量类
import { Vector2 } from "../math/Vector2.js";

/**
 * 将法线向量映射到RGB颜色的材质。
 * A material that maps the normal vectors to RGB colors.
 *
 * @augments Material
 */
class MeshNormalMaterial extends Material {
  /**
   * 构造一个新的网格法线材质。
   * Constructs a new mesh normal material.
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
    this.isMeshNormalMaterial = true;

    // 设置材质类型名称
    this.type = "MeshNormalMaterial";

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
     * 将几何体渲染为线框。
     * Renders the geometry as a wireframe.
     *
     * @type {boolean}
     * @default false
     */
    this.wireframe = false;

    /**
     * 控制线框的粗细。
     * WebGL 和 WebGPU 忽略此属性，始终渲染1像素宽的线条。
     * Controls the thickness of the wireframe.
     * WebGL and WebGPU ignore this property and always render
     * 1 pixel wide lines.
     *
     * @type {number}
     * @default 1
     */
    this.wireframeLinewidth = 1;

    /**
     * 材质是否使用平面着色渲染。
     * Whether the material is rendered with flat shading or not.
     *
     * @type {boolean}
     * @default false
     */
    this.flatShading = false;

    // 设置传入的参数值
    this.setValues(parameters);
  }

  /**
   * 复制另一个MeshNormalMaterial的属性到当前材质。
   * Copy properties from another MeshNormalMaterial to this material.
   *
   * @param {MeshNormalMaterial} source - 要复制属性的源材质
   * @returns {MeshNormalMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 调用父类的copy方法
    super.copy(source);

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

    // 复制线框相关属性
    this.wireframe = source.wireframe;
    this.wireframeLinewidth = source.wireframeLinewidth;

    // 复制平面着色设置
    this.flatShading = source.flatShading;

    // 返回当前实例以支持链式调用
    return this;
  }
}

// 导出MeshNormalMaterial类
export { MeshNormalMaterial };
