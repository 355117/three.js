// 导入材质基类
import { Material } from "../Material.js";
// 导入常量：正常混合模式
import { NormalBlending } from "../../constants.js";

// 导入节点工具函数：获取节点子元素和缓存键
import { getNodeChildren, getCacheKey } from "../../nodes/core/NodeUtils.js";
// 导入核心属性节点：输出、漫反射颜色、自发光、变化属性
import { output, diffuseColor, emissive, varyingProperty } from "../../nodes/core/PropertyNode.js";
// 导入材质访问器节点：透明度测试、颜色、不透明度、自发光、法线、光照贴图、环境光遮蔽
import { materialAlphaTest, materialColor, materialOpacity, materialEmissive, materialNormal, materialLightMap, materialAO } from "../../nodes/accessors/MaterialNode.js";
// 导入模型视图投影矩阵节点
import { modelViewProjection } from "../../nodes/accessors/ModelViewProjectionNode.js";
// 导入局部法线访问器
import { normalLocal } from "../../nodes/accessors/Normal.js";
// 导入实例化网格访问器
import { instancedMesh } from "../../nodes/accessors/InstancedMeshNode.js";
// 导入批处理访问器
import { batch } from "../../nodes/accessors/BatchNode.js";
// 导入材质引用访问器
import { materialReference } from "../../nodes/accessors/MaterialReferenceNode.js";
// 导入位置访问器：局部位置和视图位置
import { positionLocal, positionView } from "../../nodes/accessors/Position.js";
// 导入骨骼动画访问器
import { skinning } from "../../nodes/accessors/SkinningNode.js";
// 导入变形动画引用访问器
import { morphReference } from "../../nodes/accessors/MorphNode.js";
// 导入数学节点：混合函数
import { mix } from "../../nodes/math/MathNode.js";
// 导入 TSL 基础类型：浮点数、三维向量、四维向量、布尔值
import { float, vec3, vec4, bool } from "../../nodes/tsl/TSLBase.js";
// 导入环境光遮蔽节点
import AONode from "../../nodes/lighting/AONode.js";
// 导入光照上下文节点
import { lightingContext } from "../../nodes/lighting/LightingContextNode.js";
// 导入辐照度节点
import IrradianceNode from "../../nodes/lighting/IrradianceNode.js";
// 导入视口深度节点：深度、视图Z到对数深度、视图Z到正交深度
import { depth, viewZToLogarithmicDepth, viewZToOrthographicDepth } from "../../nodes/display/ViewportDepthNode.js";
// 导入相机访问器：远平面、近平面、投影矩阵
import { cameraFar, cameraNear, cameraProjectionMatrix } from "../../nodes/accessors/Camera.js";
// 导入裁剪节点：裁剪、裁剪透明度、硬件裁剪
import { clipping, clippingAlpha, hardwareClipping } from "../../nodes/accessors/ClippingNode.js";
// 导入节点材质观察者
import NodeMaterialObserver from "./manager/NodeMaterialObserver.js";
// 导入透明度哈希阈值获取函数
import getAlphaHashThreshold from "../../nodes/functions/material/getAlphaHashThreshold.js";
// 导入模型视图矩阵访问器
import { modelViewMatrix } from "../../nodes/accessors/ModelNode.js";
// 导入顶点颜色访问器
import { vertexColor } from "../../nodes/accessors/VertexColorNode.js";
// 导入预乘透明度混合模式
import { premultiplyAlpha } from "../../nodes/display/BlendModes.js";
// 导入子构建节点
import { subBuild } from "../../nodes/core/SubBuildNode.js";

/**
 * 节点材质基类 - 所有节点材质的基础类
 *
 * NodeMaterial 是 Three.js 节点材质系统的核心基类，它扩展了传统的 Material 类，
 * 提供了基于节点图的材质定义方式。节点材质系统允许开发者通过连接不同的节点
 * 来创建复杂的材质效果，提供了比传统材质更强大的灵活性和可扩展性。
 *
 * 主要特性：
 * - 基于节点图的材质定义
 * - 支持自定义着色器逻辑
 * - 提供丰富的节点属性接口
 * - 支持动态材质构建和优化
 *
 * @augments Material
 */
class NodeMaterial extends Material {
  // 静态方法：返回材质类型标识符
  static get type() {
    // 返回材质类型名称，用于材质系统识别
    return "NodeMaterial";
  }

  /**
   * 获取节点材质的类型
   *
   * 这个属性返回材质的类型字符串，用于运行时类型识别。
   * 它通过访问构造函数的静态 type 属性来获取类型信息。
   *
   * @type {string}
   */
  get type() {
    // 返回构造函数的类型标识符
    return this.constructor.type;
  }

  // 类型设置器（空实现，防止外部修改类型）
  set type(_value) {
    /* 空实现，类型不可修改 */
  }

  /**
   * 构造函数：创建新的节点材质实例
   *
   * 初始化节点材质的基础属性和所有节点属性。
   * 节点材质提供了大量的节点属性，允许开发者自定义材质的各个方面。
   */
  constructor() {
    // 调用父类构造函数，初始化基础材质属性
    super();

    /**
     * 类型标识标志，用于运行时类型检测
     *
     * 这个标志可以用来快速判断一个对象是否为 NodeMaterial 实例，
     * 避免使用 instanceof 操作符带来的性能开销。在节点材质系统中，
     * 这个标志被广泛用于类型检查和材质分类。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isNodeMaterial = true;

    /**
     * 雾效影响标志
     *
     * 控制此材质是否受场景雾效影响。当设置为 true 时，
     * 材质会根据距离和雾的设置产生雾化效果。这是材质系统中
     * 常用的环境效果控制属性。
     *
     * @type {boolean}
     * @default true
     */
    this.fog = true;

    /**
     * 光照影响标志
     *
     * 控制此材质是否受场景光照影响。当设置为 true 时，
     * 材质会响应场景中的光源，进行光照计算。节点材质的默认值为 false，
     * 需要在具体的材质类型中根据需要设置为 true。
     *
     * @type {boolean}
     * @default false
     */
    this.lights = false;

    /**
     * 硬件裁剪标志
     *
     * 控制此材质是否使用硬件裁剪功能。这个属性由引擎管理，
     * 应用程序不应该直接修改。硬件裁剪可以提供更好的性能，
     * 但需要硬件支持（如 WebGL 的 ANGLE_clip_cull_distance 扩展）。
     *
     * @type {boolean}
     * @default false
     */
    this.hardwareClipping = false;

    /**
     * 光源节点
     *
     * 将 `lights` 属性设置为 `true` 的节点材质会受到场景中所有光源的影响。
     * 有时需要选择性光照，即只让场景中的某些光源影响材质。
     * 这可以通过创建一个包含选择性光源列表的 {@link LightsNode} 实例
     * 并将其分配给此属性来实现。
     *
     * 使用示例：
     * ```js
     * const customLightsNode = lights( [ light1, light2 ] );
     * material.lightsNode = customLightsNode;
     * ```
     *
     * @type {?LightsNode}
     * @default null
     */
    this.lightsNode = null;

    /**
     * 环境节点
     *
     * 节点材质的环境可以通过分配给 `envMap` 属性的环境贴图来定义，
     * 或者如果节点材质是 PBR 材质，则通过 `Scene.environment` 来定义。
     * 这个节点属性允许覆盖默认行为，并使用自定义节点来定义环境。
     *
     * 环境节点通常用于反射、折射和环境光照计算，是 PBR 材质的重要组成部分。
     *
     * 使用示例：
     * ```js
     * material.envNode = pmremTexture( renderTarget.texture );
     * ```
     *
     * @type {?Node<vec3>}
     * @default null
     */
    this.envNode = null;

    /**
     * 环境光遮蔽节点
     *
     * 节点材质的光照可能受到环境光遮蔽的影响。默认的 AO 从分配给 `aoMap`
     * 的环境光遮蔽贴图和相应的 `aoMapIntensity` 推断。这个节点属性允许
     * 覆盖默认值，并使用自定义节点来定义环境光遮蔽。
     *
     * 环境光遮蔽用于模拟几何体凹陷部分接收较少环境光的现象，
     * 增强材质的立体感和真实感。
     *
     * 如果你不想覆盖环境光遮蔽而是修改现有值，
     * 请使用 {@link materialAO}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.aoNode = null;

    /**
     * 漫反射颜色节点
     *
     * 节点材质的漫反射颜色默认从 `color` 和 `map` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义漫反射颜色。
     *
     * 漫反射颜色是材质的基础颜色，决定了物体在漫反射光照下的外观。
     * 通过节点定义颜色可以实现复杂的颜色变化和动画效果。
     *
     * 使用示例：
     * ```js
     * material.colorNode = color( 0xff0000 ); // 定义红色
     * ```
     *
     * 如果你不想覆盖漫反射颜色而是修改现有值，
     * 请使用 {@link materialColor}：
     *
     * ```js
     * material.colorNode = materialColor.mul( color( 0xff0000 ) ); // 给漫反射颜色添加红色色调
     * ```
     *
     * @type {?Node<vec3>}
     * @default null
     */
    this.colorNode = null;

    /**
     * 法线节点
     *
     * 节点材质的法线默认从 `normalMap`/`normalScale` 或 `bumpMap`/`bumpScale`
     * 属性推断。这个节点属性允许覆盖默认值，并使用节点来定义法线。
     *
     * 法线决定了表面的朝向，影响光照计算和视觉效果。
     * 自定义法线节点可以实现复杂的表面细节和动态法线效果。
     *
     * 如果你不想覆盖法线而是修改现有值，
     * 请使用 {@link materialNormal}。
     *
     * @type {?Node<vec3>}
     * @default null
     */
    this.normalNode = null;

    /**
     * 不透明度节点
     *
     * 节点材质的不透明度默认从 `opacity` 和 `alphaMap` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义不透明度。
     *
     * 不透明度控制材质的透明程度，值为 0 表示完全透明，值为 1 表示完全不透明。
     * 通过节点定义不透明度可以实现复杂的透明度变化和动画效果。
     *
     * 如果你不想覆盖不透明度而是修改现有值，
     * 请使用 {@link materialOpacity}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.opacityNode = null;

    /**
     * 背景节点
     *
     * 这个节点可以用来实现各种滤镜效果。基本思路是将当前渲染存储到纹理中
     * （例如通过 `viewportSharedTexture()`），使用它创建任意效果，
     * 然后将节点组合分配给此属性。使用此材质的对象后面的所有内容
     * 现在都会受到滤镜的影响。
     *
     * 这是一个强大的后处理效果系统，可以实现模糊、扭曲、颜色调整等效果。
     *
     * 使用示例：
     * ```js
     * const material = new NodeMaterial()
     * material.transparent = true;
     *
     * // 对象后面的所有内容都会变成单色
     * material.backdropNode = saturation( viewportSharedTexture().rgb, 0 );
     * ```
     *
     * 背景计算是光照的一部分，因此只有受光照影响的材质才能使用此属性。
     *
     * @type {?Node<vec3>}
     * @default null
     */
    this.backdropNode = null;

    /**
     * 背景透明度节点
     *
     * 这个节点允许调节 `backdropNode` 对输出光线的影响程度。
     * 它控制背景效果的强度，可以实现背景效果的淡入淡出和混合控制。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.backdropAlphaNode = null;

    /**
     * 透明度测试节点
     *
     * 节点材质的透明度测试默认从 `alphaTest` 属性推断。
     * 这个节点属性允许覆盖默认值，并使用节点来定义透明度测试。
     *
     * 透明度测试用于丢弃透明度低于阈值的片段，常用于实现镂空效果
     * 和优化半透明渲染性能。通过节点定义可以实现动态的透明度测试阈值。
     *
     * 如果你不想覆盖透明度测试而是修改现有值，
     * 请使用 {@link materialAlphaTest}。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.alphaTestNode = null;

    /**
     * 遮罩节点
     *
     * 如果遮罩值为 `false`，则丢弃该片段。
     * 这是一个强大的片段丢弃机制，可以基于任意条件来控制像素的渲染。
     *
     * 遮罩节点常用于实现复杂的裁剪效果、动态孔洞、条件渲染等功能。
     * 与透明度测试不同，遮罩节点提供了更灵活的布尔控制。
     *
     * @type {?Node<bool>}
     * @default null
     */
    this.maskNode = null;

    /**
     * 位置节点
     *
     * 局部顶点位置基于多个因素计算，如属性数据、变形或骨骼动画。
     * 这个节点属性允许覆盖默认值，并使用节点来定义局部顶点位置。
     *
     * 位置节点是顶点着色器中最重要的节点之一，它决定了顶点在3D空间中的位置。
     * 通过自定义位置节点可以实现顶点动画、位移效果、程序化几何等功能。
     *
     * 如果你不想覆盖顶点位置而是修改现有值，
     * 请使用 {@link positionLocal}：
     *
     * 使用示例：
     *```js
     * material.positionNode = positionLocal.add( displace );
     * ```
     *
     * @type {?Node<vec3>}
     * @default null
     */
    this.positionNode = null;

    /**
     * 几何节点
     *
     * 这个节点属性用于实现一次性或每个动画步骤修改几何数据的逻辑。
     * 应用程序通常在初始化例程或动画循环中随机放置此类逻辑。
     * `geometryNode` 旨在作为专用 API，为几何修改提供指定的实现位置。
     *
     * 基本思路是分配一个包含几何修改逻辑的 `Fn` 定义。典型的例子是
     * 基于 GPU 的粒子系统，它提供节点材质供应用程序级别使用。
     * 粒子模拟将作为计算着色器实现，并在 `Fn` 函数内管理。
     * 这个函数最终分配给 `geometryNode`。
     *
     * 这是一个高级功能，主要用于 GPU 计算和程序化几何生成。
     *
     * @type {?Function}
     * @default null
     */
    this.geometryNode = null;

    /**
     * 深度节点
     *
     * 允许在片段着色器中覆盖深度值。
     * 这是一个高级功能，可以用于实现自定义深度效果、深度偏移、
     * 或特殊的深度缓冲操作。
     *
     * 自定义深度值会影响深度测试和深度写入，可以用于实现
     * 透明度排序、深度剥离等高级渲染技术。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.depthNode = null;

    /**
     * 接收阴影位置节点
     *
     * 允许覆盖用于阴影贴图渲染的位置，默认为 {@link positionWorld}，
     * 即世界空间中的顶点位置。
     *
     * 这个节点控制对象在接收阴影时使用的位置计算，
     * 可以用于实现特殊的阴影接收效果或修正阴影位置。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.receivedShadowPositionNode = null;

    /**
     * 投射阴影位置节点
     *
     * 允许覆盖用于阴影贴图投影的几何位置，默认为 {@link positionLocal}，
     * 即局部空间中的顶点位置。
     *
     * 这个节点控制对象在投射阴影时使用的位置计算，
     * 可以用于实现特殊的阴影投射效果或阴影形状修改。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.castShadowPositionNode = null;

    /**
     * 接收阴影节点
     *
     * 这个节点可以用来影响使用此节点材质的对象如何接收阴影。
     * 它提供了对阴影接收过程的完全控制，可以实现自定义阴影效果。
     *
     * 通过这个节点可以修改阴影的颜色、强度、混合方式等，
     * 实现特殊的阴影视觉效果。
     *
     * 使用示例：
     * ```js
     * const totalShadows = float( 1 ).toVar();
     * material.receivedShadowNode = Fn( ( [ shadow ] ) => {
     * 	totalShadows.mulAssign( shadow );
     * 	//return float( 1 ); // 绕过接收阴影
     * 	return shadow.mix( color( 0xff0000 ), 1 ); // 修改阴影颜色
     * } );
     * ```
     *
     * @type {?(Function|FunctionNode<vec4>)}
     * @default null
     */
    this.receivedShadowNode = null;

    /**
     * 投射阴影节点
     *
     * 这个节点可以用来影响使用此节点材质的对象如何投射阴影。
     * 它提供了对阴影投射过程的完全控制，可以实现自定义阴影效果。
     *
     * 要为阴影应用颜色，可以简单地这样做：
     *
     * ```js
     * material.castShadowNode = vec4( 1, 0, 0, 1 );
     * ```
     *
     * 这对于伪造半透明对象的彩色阴影很有用。通常也会将此属性
     * 与 `Fn` 函数一起使用，以便按片段执行检查：
     *
     * ```js
     * materialCustomShadow.castShadowNode = Fn( () => {
     * 	hash( vertexIndex ).greaterThan( 0.5 ).discard();
     * 	return materialColor;
     * } )();
     *  ```
     *
     * @type {?Node<vec4>}
     * @default null
     */
    this.castShadowNode = null;

    /**
     * 输出节点
     *
     * 这个节点可以用来定义材质的最终输出。
     * 它提供了对最终渲染结果的控制，可以在材质级别进行后处理。
     *
     * TODO: 解释与 `fragmentNode` 的区别。
     *
     * @type {?Node<vec4>}
     * @default null
     */
    this.outputNode = null;

    /**
     * 多渲染目标节点
     *
     * MRT 配置在渲染器或通道级别完成。这个节点允许在材质级别
     * 覆盖写入 MRT 目标的值。这对于实现只影响特定对象的
     * 选择性特效功能很有用。
     *
     * 多渲染目标允许在单次渲染过程中输出到多个纹理，
     * 常用于延迟渲染和高级后处理效果。
     *
     * @type {?MRTNode}
     * @default null
     */
    this.mrtNode = null;

    /**
     * 片段节点
     *
     * 如果你需要在实现片段着色器时拥有完全的自由度，
     * 可以使用这个节点属性。分配一个节点将替换片段阶段
     * 使用的内置材质逻辑。
     *
     * 这是一个高级功能，允许完全自定义片段着色器的行为。
     *
     * @type {?Node<vec4>}
     * @default null
     */
    this.fragmentNode = null;

    /**
     * 顶点节点
     *
     * 如果你需要在实现顶点着色器时拥有完全的自由度，
     * 可以使用这个节点属性。分配一个节点将替换顶点阶段
     * 使用的内置材质逻辑。
     *
     * 这是一个高级功能，允许完全自定义顶点着色器的行为。
     *
     * @type {?Node<vec4>}
     * @default null
     */
    this.vertexNode = null;

    // 废弃的属性

    // 定义废弃的 shadowPositionNode 属性，重定向到新的 receivedShadowPositionNode
    Object.defineProperty(this, "shadowPositionNode", {
      // @deprecated, r176

      get: () => {
        // 返回新的属性值
        return this.receivedShadowPositionNode;
      },

      set: (value) => {
        // 显示废弃警告
        console.warn('THREE.NodeMaterial: ".shadowPositionNode" was renamed to ".receivedShadowPositionNode".');

        // 设置新的属性值
        this.receivedShadowPositionNode = value;
      },
    });
  }

  /**
   * 自定义程序缓存键
   *
   * 允许定义影响渲染对象材质键计算的自定义缓存键。
   * 这个方法用于材质系统的缓存优化，确保具有相同特征的材质
   * 可以共享编译后的着色器程序。
   *
   * 缓存键的计算基于材质类型和节点结构，相同的缓存键
   * 意味着可以复用已编译的着色器程序，提高渲染性能。
   *
   * @return {string} 自定义缓存键
   */
  customProgramCacheKey() {
    // 返回材质类型和节点缓存键的组合
    return this.type + getCacheKey(this);
  }

  /**
   * 构建材质
   *
   * 使用给定的节点构建器构建此材质。这是材质编译过程的入口点，
   * 它会调用 setup 方法来配置材质的所有节点和着色器逻辑。
   *
   * 构建过程会生成最终的着色器代码，并设置所有必要的渲染状态。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   */
  build(builder) {
    // 调用设置方法来配置材质
    this.setup(builder);
  }

  /**
   * 设置节点材质观察者
   *
   * 使用给定的构建器设置节点材质观察者。观察者用于监控材质状态的变化，
   * 并在需要时触发重新编译或更新操作。
   *
   * 这是材质系统中重要的优化机制，可以避免不必要的重新编译。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {NodeMaterialObserver} 节点材质观察者实例
   */
  setupObserver(builder) {
    // 创建并返回新的节点材质观察者
    return new NodeMaterialObserver(builder);
  }

  /**
   * 设置节点材质的顶点和片段阶段
   *
   * 这是节点材质系统的核心方法，负责配置材质的完整渲染管线。
   * 它设置顶点着色器和片段着色器的所有逻辑，包括位置变换、
   * 光照计算、纹理采样等所有渲染相关的操作。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   */
  setup(builder) {
    // 设置构建上下文中的关键方法
    // 法线设置：创建法线计算的子构建
    builder.context.setupNormal = () => subBuild(this.setupNormal(builder), "NORMAL", "vec3");
    // 视图位置设置：设置顶点在视图空间中的位置
    builder.context.setupPositionView = () => this.setupPositionView(builder);
    // 模型视图投影设置：设置顶点的最终投影位置
    builder.context.setupModelViewProjection = () => this.setupModelViewProjection(builder);

    // 获取渲染器和渲染目标
    const renderer = builder.renderer;
    const renderTarget = renderer.getRenderTarget();

    // ===== 顶点着色器阶段 =====
    // 顶点着色器负责处理顶点位置变换、属性传递等

    // 添加新的构建堆栈，用于顶点阶段的节点构建
    builder.addStack();

    // 设置顶点处理逻辑，返回模型视图投影变换
    const mvp = subBuild(this.setupVertex(builder), "VERTEX");

    // 确定最终的顶点节点：使用自定义顶点节点或默认的MVP变换
    const vertexNode = this.vertexNode || mvp;

    // 设置顶点阶段的输出节点
    builder.stack.outputNode = vertexNode;

    // 设置硬件裁剪（如果支持）
    this.setupHardwareClipping(builder);

    // 如果设置了几何节点，将其应用到输出节点
    if (this.geometryNode !== null) {
      // 使用 bypass 方法将几何节点集成到渲染管线中
      builder.stack.outputNode = builder.stack.outputNode.bypass(this.geometryNode);
    }

    // 完成顶点阶段的构建，添加到渲染流程中
    builder.addFlow("vertex", builder.removeStack());

    // ===== 片段着色器阶段 =====
    // 片段着色器负责处理像素颜色计算、光照、纹理等

    // 添加新的构建堆栈，用于片段阶段的节点构建
    builder.addStack();

    // 声明结果节点变量
    let resultNode;

    // 设置裁剪节点（用于平面裁剪）
    const clippingNode = this.setupClipping(builder);

    // 深度处理：只有在配置了深度缓冲时才写入深度
    if (this.depthWrite === true || this.depthTest === true) {
      // 检查是否需要设置深度

      if (renderTarget !== null) {
        // 如果有渲染目标，检查其深度缓冲配置
        if (renderTarget.depthBuffer === true) this.setupDepth(builder);
      } else {
        // 如果没有渲染目标，检查渲染器的深度配置
        if (renderer.depth === true) this.setupDepth(builder);
      }
    }

    // 片段着色器逻辑分支：自定义片段节点 vs 标准材质逻辑
    if (this.fragmentNode === null) {
      // 标准材质逻辑路径

      // 设置漫反射颜色（包括顶点颜色、实例颜色等）
      this.setupDiffuseColor(builder);
      // 设置材质变体（由子类实现的特定材质逻辑）
      this.setupVariants(builder);

      // 设置光照计算，返回输出光线节点
      const outgoingLightNode = this.setupLighting(builder);

      // 如果有裁剪节点，添加到构建堆栈中
      if (clippingNode !== null) builder.stack.add(clippingNode);

      // 强制使用无符号浮点数 - 对渲染目标很有用
      // 组合输出光线和透明度，并确保值不为负
      const basicOutput = vec4(outgoingLightNode, diffuseColor.a).max(0);

      // 设置最终输出（包括雾效、预乘透明度等后处理）
      resultNode = this.setupOutput(builder, basicOutput);

      // 输出节点赋值
      output.assign(resultNode);

      // 检查是否有自定义输出节点
      const isCustomOutput = this.outputNode !== null;

      // 如果有自定义输出节点，使用它作为结果节点
      if (isCustomOutput) resultNode = this.outputNode;

      // 多渲染目标（MRT）处理
      if (renderTarget !== null) {
        // 获取渲染器的MRT配置和材质的MRT节点
        const mrt = renderer.getMRT();
        const materialMRT = this.mrtNode;

        if (mrt !== null) {
          // 如果渲染器有MRT配置

          // 如果有自定义输出，先赋值给output
          if (isCustomOutput) output.assign(resultNode);

          // 使用渲染器的MRT作为结果节点
          resultNode = mrt;

          if (materialMRT !== null) {
            // 如果材质也有MRT节点，将两者合并
            resultNode = mrt.merge(materialMRT);
          }
        } else if (materialMRT !== null) {
          // 如果只有材质MRT节点，直接使用它
          resultNode = materialMRT;
        }
      }
    } else {
      // 自定义片段节点路径

      // 获取自定义片段节点
      let fragmentNode = this.fragmentNode;

      // 如果片段节点不是输出结构节点，将其转换为vec4
      if (fragmentNode.isOutputStructNode !== true) {
        fragmentNode = vec4(fragmentNode);
      }

      // 设置输出（应用后处理效果）
      resultNode = this.setupOutput(builder, fragmentNode);
    }

    // 设置片段阶段的输出节点
    builder.stack.outputNode = resultNode;

    // 完成片段阶段的构建，添加到渲染流程中
    builder.addFlow("fragment", builder.removeStack());

    // ===== 观察者设置 =====
    // 设置材质观察者，用于监控状态变化和优化

    builder.observer = this.setupObserver(builder);
  }

  /**
   * 设置裁剪节点
   *
   * 配置材质的平面裁剪功能。裁剪节点用于实现平面裁剪效果，
   * 可以根据定义的裁剪平面来丢弃不需要渲染的片段。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {Node} 裁剪节点，如果没有裁剪则返回 null
   */
  setupClipping(builder) {
    // 如果没有裁剪上下文，直接返回null
    if (builder.clippingContext === null) return null;

    // 从裁剪上下文中获取联合平面和交集平面
    const { unionPlanes, intersectionPlanes } = builder.clippingContext;

    // 初始化结果节点
    let result = null;

    // 检查是否有裁剪平面需要处理
    if (unionPlanes.length > 0 || intersectionPlanes.length > 0) {
      // 获取渲染器的采样数
      const samples = builder.renderer.samples;

      if (this.alphaToCoverage && samples > 1) {
        // 如果启用了alpha到覆盖率转换且采样数大于1
        // 使用裁剪透明度节点，将在确定颜色/透明度值时添加到流程中
        result = clippingAlpha();
      } else {
        // 否则直接添加标准裁剪节点到构建堆栈
        builder.stack.add(clipping());
      }
    }

    // 返回裁剪结果节点
    return result;
  }

  /**
   * 设置硬件裁剪（如果当前设备支持）
   *
   * 硬件裁剪利用GPU的原生裁剪功能来提高性能，避免在片段着色器中
   * 进行裁剪计算。这个功能需要硬件支持，如WebGL的ANGLE_clip_cull_distance
   * 扩展或WebGPU的clip-distances功能。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   */
  setupHardwareClipping(builder) {
    // 默认禁用硬件裁剪
    this.hardwareClipping = false;

    // 如果没有裁剪上下文，直接返回
    if (builder.clippingContext === null) return;

    // 获取候选裁剪平面的数量
    const candidateCount = builder.clippingContext.unionPlanes.length;

    // WebGL ANGLE_clip_cull_distance 和 WebGPU clip-distances 支持8个平面
    if (candidateCount > 0 && candidateCount <= 8 && builder.isAvailable("clipDistance")) {
      // 添加硬件裁剪节点到构建堆栈
      builder.stack.add(hardwareClipping());

      // 启用硬件裁剪标志
      this.hardwareClipping = true;
    }

    return;
  }

  /**
   * 设置材质的深度处理
   *
   * 配置深度缓冲的写入和测试逻辑。深度处理对于正确的3D渲染至关重要，
   * 它确保物体按照正确的前后顺序渲染。这个方法支持标准深度、
   * 对数深度缓冲和多渲染目标中的深度输出。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   */
  setupDepth(builder) {
    // 从构建器中获取渲染器和相机
    const { renderer, camera } = builder;

    // 深度节点处理
    let depthNode = this.depthNode;

    if (depthNode === null) {
      // 如果没有自定义深度节点，尝试从其他来源获取

      // 检查多渲染目标中是否有深度输出
      const mrt = renderer.getMRT();

      if (mrt && mrt.has("depth")) {
        // 如果MRT中有深度目标，使用它
        depthNode = mrt.get("depth");
      } else if (renderer.logarithmicDepthBuffer === true) {
        // 如果启用了对数深度缓冲，根据相机类型设置相应的深度计算

        if (camera.isPerspectiveCamera) {
          // 透视相机：使用对数深度转换
          depthNode = viewZToLogarithmicDepth(positionView.z, cameraNear, cameraFar);
        } else {
          // 正交相机：使用正交深度转换
          depthNode = viewZToOrthographicDepth(positionView.z, cameraNear, cameraFar);
        }
      }
    }

    if (depthNode !== null) {
      // 如果有深度节点，将其分配给深度输出并添加到堆栈
      depth.assign(depthNode).toStack();
    }
  }

  /**
   * 设置视图空间中的位置节点
   *
   * 这个方法存在的目的是让派生的节点材质可以修改实现，
   * 例如精灵材质可能需要特殊的位置计算。
   *
   * 视图空间是相机坐标系，Z轴指向相机后方，用于光照计算和深度测试。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器（未使用）
   * @return {Node<vec3>} 视图空间中的位置
   */
  setupPositionView(/*builder*/) {
    // 将局部位置通过模型视图矩阵变换到视图空间，并取xyz分量
    return modelViewMatrix.mul(positionLocal).xyz;
  }

  /**
   * 设置裁剪空间中的位置
   *
   * 裁剪空间是GPU渲染管线中的标准化设备坐标系，
   * 用于视锥体裁剪和屏幕坐标转换。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器（未使用）
   * @return {Node<vec4>} 裁剪空间中的位置
   */
  setupModelViewProjection(/*builder*/) {
    // 将视图空间位置通过相机投影矩阵变换到裁剪空间
    return cameraProjectionMatrix.mul(positionView);
  }

  /**
   * 设置顶点阶段的逻辑
   *
   * 这个方法配置顶点着色器的核心逻辑，包括位置变换、
   * 属性处理等所有顶点相关的计算。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {Node<vec4>} 裁剪空间中的位置
   */
  setupVertex(builder) {
    // 添加新的构建堆栈，用于顶点阶段的节点构建
    builder.addStack();

    // 设置位置计算逻辑（包括变形、骨骼动画、实例化等）
    this.setupPosition(builder);

    // 将顶点阶段的构建结果保存到上下文中
    builder.context.vertex = builder.removeStack();

    // 返回模型视图投影变换结果
    return modelViewProjection;
  }

  /**
   * 设置局部空间中位置的计算
   *
   * 这个方法处理顶点位置的所有变换，包括变形动画、骨骼动画、
   * 位移贴图、批处理、实例化等。它是顶点着色器中最重要的方法之一，
   * 决定了顶点的最终位置。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {Node<vec3>} 局部空间中的位置
   */
  setupPosition(builder) {
    // 从构建器中获取对象和几何体
    const { object, geometry } = builder;

    // 变形动画处理：如果几何体有变形属性（位置、法线或颜色）
    if (geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color) {
      // 添加变形引用到构建堆栈
      morphReference(object).toStack();
    }

    // 骨骼动画处理：如果对象是骨骼网格
    if (object.isSkinnedMesh === true) {
      // 添加骨骼动画计算到构建堆栈
      skinning(object).toStack();
    }

    // 位移贴图处理：如果材质有位移贴图
    if (this.displacementMap) {
      // 获取位移贴图相关的材质引用
      const displacementMap = materialReference("displacementMap", "texture");
      const displacementScale = materialReference("displacementScale", "float");
      const displacementBias = materialReference("displacementBias", "float");

      // 沿法线方向应用位移：位置 += 法线 * (位移值 * 缩放 + 偏移)
      positionLocal.addAssign(normalLocal.normalize().mul(displacementMap.x.mul(displacementScale).add(displacementBias)));
    }

    // 批处理网格处理：如果对象是批处理网格
    if (object.isBatchedMesh) {
      // 添加批处理变换到构建堆栈
      batch(object).toStack();
    }

    // 实例化网格处理：如果对象是实例化网格且有实例矩阵
    if (object.isInstancedMesh && object.instanceMatrix && object.instanceMatrix.isInstancedBufferAttribute === true) {
      // 添加实例化变换到构建堆栈
      instancedMesh(object).toStack();
    }

    // 自定义位置节点处理：如果设置了自定义位置节点
    if (this.positionNode !== null) {
      // 使用自定义位置节点覆盖局部位置
      positionLocal.assign(subBuild(this.positionNode, "POSITION", "vec3"));
    }

    // 返回最终的局部位置
    return positionLocal;
  }

  /**
   * 设置材质漫反射颜色的计算
   *
   * 这个方法处理材质颜色的所有来源和修改，包括基础颜色、顶点颜色、
   * 实例颜色、批处理颜色、遮罩、透明度、透明度测试等。
   * 它是片段着色器中颜色计算的核心方法。
   *
   * @param {Object} params - 包含object和geometry的参数对象
   * @param {Object} params.object - 渲染对象
   * @param {BufferGeometry} params.geometry - 几何体
   */
  setupDiffuseColor({ object, geometry }) {
    // ===== 遮罩处理 =====
    // 遮罩用于基于条件丢弃片段

    if (this.maskNode !== null) {
      // 如果遮罩为 false，则丢弃该片段
      // not() 取反，discard() 丢弃片段
      bool(this.maskNode).not().discard();
    }

    // ===== 基础颜色设置 =====
    // 确定基础颜色：使用自定义颜色节点或材质默认颜色

    let colorNode = this.colorNode ? vec4(this.colorNode) : materialColor;

    // ===== 顶点颜色处理 =====
    // 如果启用顶点颜色且几何体有颜色属性

    if (this.vertexColors === true && geometry.hasAttribute("color")) {
      // 将顶点颜色与基础颜色相乘
      colorNode = colorNode.mul(vertexColor());
    }

    // ===== 实例化颜色处理 =====
    // 处理实例化对象的颜色

    if (object.instanceColor) {
      // 创建实例颜色的变化属性
      const instanceColor = varyingProperty("vec3", "vInstanceColor");

      // 将实例颜色与当前颜色相乘
      colorNode = instanceColor.mul(colorNode);
    }

    // ===== 批处理颜色处理 =====
    // 处理批处理网格的颜色

    if (object.isBatchedMesh && object._colorsTexture) {
      // 创建批处理颜色的变化属性
      const batchColor = varyingProperty("vec3", "vBatchColor");

      // 将批处理颜色与当前颜色相乘
      colorNode = batchColor.mul(colorNode);
    }

    // ===== 漫反射颜色赋值 =====
    // 将计算出的颜色赋值给全局漫反射颜色

    diffuseColor.assign(colorNode);

    // ===== 不透明度处理 =====
    // 设置材质的不透明度

    const opacityNode = this.opacityNode ? float(this.opacityNode) : materialOpacity;
    // 将不透明度与漫反射颜色的alpha通道相乘
    diffuseColor.a.assign(diffuseColor.a.mul(opacityNode));

    // ===== 透明度测试处理 =====
    // 透明度测试用于丢弃透明度低于阈值的片段

    let alphaTestNode = null;

    if (this.alphaTestNode !== null || this.alphaTest > 0) {
      // 确定透明度测试阈值：使用自定义节点或材质默认值
      alphaTestNode = this.alphaTestNode !== null ? float(this.alphaTestNode) : materialAlphaTest;

      // 如果透明度小于等于阈值，丢弃该片段
      diffuseColor.a.lessThanEqual(alphaTestNode).discard();
    }

    // ===== 透明度哈希处理 =====
    // 透明度哈希用于创建抖动透明效果

    if (this.alphaHash === true) {
      // 如果透明度小于基于位置的哈希阈值，丢弃该片段
      // 这创建了一种抖动透明效果，避免了排序问题
      diffuseColor.a.lessThan(getAlphaHashThreshold(positionLocal)).discard();
    }

    // ===== 不透明材质处理 =====
    // 检查材质是否为完全不透明

    const isOpaque = this.transparent === false && this.blending === NormalBlending && this.alphaToCoverage === false;

    if (isOpaque) {
      // 如果是不透明材质，强制设置alpha为1.0
      diffuseColor.a.assign(1.0);
    } else if (alphaTestNode === null) {
      // 如果是透明材质且没有透明度测试，丢弃完全透明的片段
      diffuseColor.a.lessThanEqual(0).discard();
    }
  }

  /**
   * 设置材质变体的抽象接口方法
   *
   * 这是一个抽象接口方法，可以由派生材质实现来设置特定材质的节点变量。
   * 不同类型的材质（如标准材质、物理材质等）会在这里实现各自特有的逻辑。
   *
   * @abstract
   * @param {NodeBuilder} builder - 当前的节点构建器（未使用）
   */
  setupVariants(/*builder*/) {
    // 接口函数，由子类实现具体逻辑
  }

  /**
   * 设置输出光线节点变量
   *
   * 确定材质的基础输出光线。对于受光照影响的材质，
   * 初始输出光线为黑色（vec3(0)），后续会通过光照计算添加光线。
   * 对于不受光照影响的材质，直接使用漫反射颜色作为输出光线。
   *
   * @return {Node<vec3>} 输出光线节点
   */
  setupOutgoingLight() {
    // 如果材质受光照影响，返回黑色作为初始值；否则返回漫反射颜色
    return this.lights === true ? vec3(0) : diffuseColor.rgb;
  }

  /**
   * 设置材质的法线节点
   *
   * 确定用于光照计算的法线。优先使用自定义法线节点，
   * 否则使用材质的默认法线（可能来自法线贴图或几何体法线）。
   *
   * @return {Node<vec3>} 法线节点
   */
  setupNormal() {
    // 使用自定义法线节点或材质默认法线
    return this.normalNode ? vec3(this.normalNode) : materialNormal;
  }

  /**
   * 设置材质的环境节点
   *
   * 确定用于环境光照和反射的环境节点。环境可以来自自定义环境节点
   * 或环境贴图。支持立方体纹理和普通纹理两种环境贴图格式。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器（未使用）
   * @return {Node<vec4>} 环境节点，如果没有环境则返回 null
   */
  setupEnvironment(/*builder*/) {
    // 初始化环境节点
    let node = null;

    if (this.envNode) {
      // 如果有自定义环境节点，直接使用
      node = this.envNode;
    } else if (this.envMap) {
      // 如果有环境贴图，根据类型创建相应的材质引用
      node = this.envMap.isCubeTexture ? materialReference("envMap", "cubeTexture") : materialReference("envMap", "texture");
    }

    // 返回环境节点
    return node;
  }

  /**
   * 设置材质的光照贴图节点
   *
   * 光照贴图是预计算的光照信息，存储在纹理中用于提供静态光照效果。
   * 这个方法检查材质是否有光照贴图，如果有则创建相应的辐照度节点。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {Node<vec3>} 光照贴图节点，如果没有光照贴图则返回 null
   */
  setupLightMap(builder) {
    // 初始化光照贴图节点
    let node = null;

    // 检查材质是否有光照贴图
    if (builder.material.lightMap) {
      // 创建辐照度节点来处理光照贴图
      node = new IrradianceNode(materialLightMap);
    }

    // 返回光照贴图节点
    return node;
  }

  /**
   * 设置基于场景、环境和材质的光源节点
   *
   * 这个方法收集所有影响材质的光源，包括场景光源、环境光照、
   * 光照贴图和环境光遮蔽。它创建一个统一的光照节点来处理所有光照计算。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {LightsNode} 光源节点
   */
  setupLights(builder) {
    // 材质光照节点数组，用于收集所有材质相关的光照
    const materialLightsNode = [];

    // ===== 环境光照处理 =====
    // 设置环境光照（如环境贴图、IBL等）

    const envNode = this.setupEnvironment(builder);

    if (envNode && envNode.isLightingNode) {
      // 如果环境节点是光照节点，添加到材质光照列表
      materialLightsNode.push(envNode);
    }

    // ===== 光照贴图处理 =====
    // 设置预计算的光照贴图

    const lightMapNode = this.setupLightMap(builder);

    if (lightMapNode && lightMapNode.isLightingNode) {
      // 如果光照贴图节点是光照节点，添加到材质光照列表
      materialLightsNode.push(lightMapNode);
    }

    // ===== 环境光遮蔽处理 =====
    // 设置环境光遮蔽效果

    if (this.aoNode !== null || builder.material.aoMap) {
      // 确定AO节点：使用自定义AO节点或材质默认AO
      const aoNode = this.aoNode !== null ? this.aoNode : materialAO;

      // 创建AO节点并添加到材质光照列表
      materialLightsNode.push(new AONode(aoNode));
    }

    // ===== 光源节点组合 =====
    // 组合所有光源

    // 获取基础光源节点：使用材质自定义光源或构建器默认光源
    let lightsN = this.lightsNode || builder.lightsNode;

    if (materialLightsNode.length > 0) {
      // 如果有材质特定的光照节点，将它们与场景光源合并
      lightsN = builder.renderer.lighting.createNode([...lightsN.getLights(), ...materialLightsNode]);
    }

    // 返回最终的光源节点
    return lightsN;
  }

  /**
   * 设置材质的光照模型（抽象方法）
   *
   * 这个方法应该由大多数派生材质实现，因为它定义了材质的光照模型。
   * 不同的材质类型（如Lambert、Phong、PBR等）会实现不同的光照模型。
   *
   * @abstract
   * @param {NodeBuilder} builder - 当前的节点构建器（未使用）
   * @return {LightingModel} 光照模型
   */
  setupLightingModel(/*builder*/) {
    // 接口函数，由子类实现具体的光照模型
  }

  /**
   * 设置输出光线节点
   *
   * 这是光照计算的核心方法，它整合所有光照来源（直接光照、环境光照、
   * 背景效果、自发光等）来计算最终的输出光线。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {Node<vec3>} 输出光线节点
   */
  setupLighting(builder) {
    // 从构建器中获取材质和相关节点
    const { material } = builder;
    const { backdropNode, backdropAlphaNode, emissiveNode } = this;

    // ===== 输出光线计算 =====

    // 检查是否需要光照计算
    const lights = this.lights === true || this.lightsNode !== null;

    // 如果需要光照，设置光源节点
    const lightsNode = lights ? this.setupLights(builder) : null;

    // 获取基础输出光线（无光照或漫反射颜色）
    let outgoingLightNode = this.setupOutgoingLight(builder);

    // ===== 光照计算 =====
    if (lightsNode && lightsNode.getScope().hasLights) {
      // 如果有光源且光源范围包含光照

      // 获取光照模型
      const lightingModel = this.setupLightingModel(builder) || null;

      // 使用光照上下文计算最终光照，包括背景效果
      outgoingLightNode = lightingContext(lightsNode, lightingModel, backdropNode, backdropAlphaNode);
    } else if (backdropNode !== null) {
      // 如果没有光照但有背景节点，应用背景效果

      // 根据背景透明度混合背景和当前输出光线
      outgoingLightNode = vec3(backdropAlphaNode !== null ? mix(outgoingLightNode, backdropNode, backdropAlphaNode) : backdropNode);
    }

    // ===== 自发光处理 =====
    // 添加材质的自发光效果

    if ((emissiveNode && emissiveNode.isNode === true) || (material.emissive && material.emissive.isColor === true)) {
      // 设置自发光颜色：使用自定义自发光节点或材质默认自发光
      emissive.assign(vec3(emissiveNode ? emissiveNode : materialEmissive));

      // 将自发光添加到输出光线
      outgoingLightNode = outgoingLightNode.add(emissive);
    }

    // 返回最终的输出光线
    return outgoingLightNode;
  }

  /**
   * 设置雾效
   *
   * 这个方法处理雾效的应用。雾效是一种距离相关的视觉效果，
   * 可以模拟大气散射、深度感知等效果。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @param {Node<vec4>} outputNode - 现有的输出节点
   * @return {Node<vec4>} 应用雾效后的输出节点
   */
  setupFog(builder, outputNode) {
    // 从构建器获取雾效节点
    const fogNode = builder.fogNode;

    if (fogNode) {
      // 如果有雾效节点，先保存当前输出
      output.assign(outputNode);

      // 应用雾效变换
      outputNode = vec4(fogNode.toVar());
    }

    // 返回处理后的输出节点
    return outputNode;
  }

  /**
   * 设置预乘透明度
   *
   * 预乘透明度是一种优化的透明度处理方式，它将颜色值预先乘以透明度值。
   * 这种方式可以简化混合计算并提供更好的视觉效果。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器（未使用）
   * @param {Node<vec4>} outputNode - 现有的输出节点
   * @return {Node<vec4>} 预乘透明度处理后的输出节点
   */
  setupPremultipliedAlpha(builder, outputNode) {
    // 应用预乘透明度处理
    return premultiplyAlpha(outputNode);
  }

  /**
   * 设置输出节点
   *
   * 这个方法处理最终输出前的所有后处理效果，包括雾效和预乘透明度。
   * 它是渲染管线中的最后一个处理步骤，确保所有视觉效果都被正确应用。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @param {Node<vec4>} outputNode - 现有的输出节点
   * @return {Node<vec4>} 处理后的输出节点
   */
  setupOutput(builder, outputNode) {
    // ===== 雾效处理 =====
    // 如果材质受雾效影响，应用雾效

    if (this.fog === true) {
      outputNode = this.setupFog(builder, outputNode);
    }

    // ===== 预乘透明度处理 =====
    // 如果启用预乘透明度，应用预乘透明度处理

    if (this.premultipliedAlpha === true) {
      outputNode = this.setupPremultipliedAlpha(builder, outputNode);
    }

    // 返回最终处理后的输出节点
    return outputNode;
  }

  /**
   * 设置材质的默认值
   *
   * 大多数经典材质类型都有对应的节点版本，例如 `MeshBasicMaterial`
   * 对应 `MeshBasicNodeMaterial`。这个工具方法用于将经典材质类型的
   * 所有材质属性定义到节点材质类型中。
   *
   * @param {Material} material - 要复制属性及其值到此节点材质的材质对象
   */
  setDefaultValues(material) {
    // 这种方法是为了重用原生的 refreshUniforms* 方法
    // 并使核心功能（如透射和环境）可用

    // 遍历源材质的所有属性
    for (const property in material) {
      const value = material[property];

      // 只设置当前实例中未定义的属性
      if (this[property] === undefined) {
        // 直接赋值
        this[property] = value;

        // 如果值有 clone 方法（如颜色、向量等对象），则克隆它
        if (value && value.clone) this[property] = value.clone();
      }
    }

    // 获取源材质构造函数原型的所有属性描述符
    const descriptors = Object.getOwnPropertyDescriptors(material.constructor.prototype);

    // 遍历所有描述符
    for (const key in descriptors) {
      // 如果当前构造函数原型中没有该属性且源描述符有getter方法
      if (Object.getOwnPropertyDescriptor(this.constructor.prototype, key) === undefined && descriptors[key].get !== undefined) {
        // 将属性描述符复制到当前构造函数原型中
        Object.defineProperty(this.constructor.prototype, key, descriptors[key]);
      }
    }
  }

  /**
   * 将此材质序列化为JSON
   *
   * 这个方法将节点材质及其所有相关的节点、纹理、图像等资源
   * 序列化为JSON格式，用于保存和加载材质配置。
   *
   * @param {?(Object|string)} meta - 序列化的元信息对象
   * @return {Object} 序列化后的节点数据
   */
  toJSON(meta) {
    // 检查是否为根级序列化调用
    const isRoot = meta === undefined || typeof meta === "string";

    if (isRoot) {
      // 如果是根级调用，初始化元信息对象
      meta = {
        textures: {}, // 纹理缓存
        images: {}, // 图像缓存
        nodes: {}, // 节点缓存
      };
    }

    // 调用父类的toJSON方法获取基础材质数据
    const data = Material.prototype.toJSON.call(this, meta);
    // 获取此材质的所有子节点
    const nodeChildren = getNodeChildren(this);

    // 初始化输入节点数据
    data.inputNodes = {};

    // 序列化所有子节点
    for (const { property, childNode } of nodeChildren) {
      // 将子节点序列化并存储其UUID引用
      data.inputNodes[property] = childNode.toJSON(meta).uuid;
    }

    // TODO: 从 Object3D.toJSON 复制的代码

    // 从缓存中提取数据的辅助函数
    function extractFromCache(cache) {
      const values = [];

      // 遍历缓存中的所有项
      for (const key in cache) {
        const data = cache[key];
        // 删除元数据以减少输出大小
        delete data.metadata;
        values.push(data);
      }

      return values;
    }

    if (isRoot) {
      // 如果是根级调用，提取所有缓存的资源
      const textures = extractFromCache(meta.textures);
      const images = extractFromCache(meta.images);
      const nodes = extractFromCache(meta.nodes);

      // 只有在有数据时才添加到输出中
      if (textures.length > 0) data.textures = textures;
      if (images.length > 0) data.images = images;
      if (nodes.length > 0) data.nodes = nodes;
    }

    // 返回序列化后的数据
    return data;
  }

  /**
   * 复制给定节点材质的属性到此实例
   *
   * 这个方法将源节点材质的所有节点属性复制到当前材质实例中。
   * 它确保所有自定义节点都被正确复制，包括光照、颜色、几何、
   * 阴影、输出等各个方面的节点。
   *
   * @param {NodeMaterial} source - 要复制的源材质
   * @return {NodeMaterial} 返回当前节点材质的引用，支持链式调用
   */
  copy(source) {
    // 复制光照相关节点
    this.lightsNode = source.lightsNode;
    this.envNode = source.envNode;

    // 复制外观相关节点
    this.colorNode = source.colorNode;
    this.normalNode = source.normalNode;
    this.opacityNode = source.opacityNode;
    this.backdropNode = source.backdropNode;
    this.backdropAlphaNode = source.backdropAlphaNode;
    this.alphaTestNode = source.alphaTestNode;
    this.maskNode = source.maskNode;

    // 复制几何相关节点
    this.positionNode = source.positionNode;
    this.geometryNode = source.geometryNode;

    // 复制深度和阴影相关节点
    this.depthNode = source.depthNode;
    this.receivedShadowPositionNode = source.receivedShadowPositionNode;
    this.castShadowPositionNode = source.castShadowPositionNode;
    this.receivedShadowNode = source.receivedShadowNode;
    this.castShadowNode = source.castShadowNode;

    // 复制输出相关节点
    this.outputNode = source.outputNode;
    this.mrtNode = source.mrtNode;

    // 复制着色器节点
    this.fragmentNode = source.fragmentNode;
    this.vertexNode = source.vertexNode;

    // 调用父类的复制方法并返回当前对象
    return super.copy(source);
  }
}

// 导出节点材质类作为默认导出
export default NodeMaterial;
