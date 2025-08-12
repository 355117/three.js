// 导入阴影基础节点类和阴影位置世界坐标
import ShadowBaseNode, { shadowPositionWorld } from "./ShadowBaseNode.js";
// 导入TSL基础类型和函数
import { float, vec2, vec3, int, Fn, nodeObject } from "../tsl/TSLBase.js";
// 导入引用节点访问器
import { reference } from "../accessors/ReferenceNode.js";
// 导入纹理访问器
import { texture } from "../accessors/TextureNode.js";
// 导入世界法线访问器
import { normalWorld } from "../accessors/Normal.js";
// 导入数学函数节点
import { mix, sqrt } from "../math/MathNode.js";
// 导入运算符节点
import { add } from "../math/OperatorNode.js";
// 导入深度纹理类
import { DepthTexture } from "../../textures/DepthTexture.js";
// 导入节点材质类
import NodeMaterial from "../../materials/nodes/NodeMaterial.js";
// 导入四边形网格类
import QuadMesh from "../../renderers/common/QuadMesh.js";
// 导入循环节点
import { Loop } from "../utils/LoopNode.js";
// 导入屏幕坐标节点
import { screenCoordinate } from "../display/ScreenNode.js";
// 导入常量定义
import { HalfFloatType, LessCompare, RGFormat, VSMShadowMap, WebGPUCoordinateSystem } from "../../constants.js";
// 导入渲染组
import { renderGroup } from "../core/UniformGroupNode.js";
// 导入视图深度转换函数
import { viewZToLogarithmicDepth } from "../display/ViewportDepthNode.js";
// 导入光源阴影矩阵访问器
import { lightShadowMatrix } from "../accessors/Lights.js";
// 导入渲染器状态管理工具
import { resetRendererAndSceneState, restoreRendererAndSceneState } from "../../renderers/common/RendererUtils.js";
// 导入节点工具函数
import { getDataFromObject } from "../core/NodeUtils.js";
// 导入阴影过滤相关函数和材质
import { getShadowMaterial, BasicShadowFilter, PCFShadowFilter, PCFSoftShadowFilter, VSMShadowFilter } from "./ShadowFilterNode.js";
// 导入链式映射类
import ChainMap from "../../renderers/common/ChainMap.js";

// 全局变量定义

// 用于缓存阴影渲染对象函数的链式映射，提高性能
const _shadowRenderObjectLibrary = /*@__PURE__*/ new ChainMap();
// 用于存储阴影渲染对象键的数组，避免重复创建
const _shadowRenderObjectKeys = [];

/**
 * 创建一个用于在场景中渲染阴影对象的函数。
 *
 * @param {Renderer} renderer - 渲染器对象
 * @param {LightShadow} shadow - 包含阴影属性的光源阴影对象
 * @param {number} shadowType - 阴影贴图类型（例如：BasicShadowMap）
 * @param {boolean} useVelocity - 是否使用速度数据进行渲染
 * @return {Function} 渲染阴影对象的函数
 *
 * 返回的函数具有以下参数：
 * @param {Object3D} object - 要渲染的3D对象
 * @param {Scene} scene - 包含对象的场景
 * @param {Camera} _camera - 用于渲染的相机
 * @param {BufferGeometry} geometry - 对象的几何体
 * @param {Material} material - 对象的材质
 * @param {Group} group - 对象所属的组
 * @param {...any} params - 渲染的附加参数
 */
export const getShadowRenderObjectFunction = (renderer, shadow, shadowType, useVelocity) => {
  // 设置缓存键，用于查找已存在的渲染函数
  _shadowRenderObjectKeys[0] = renderer;
  _shadowRenderObjectKeys[1] = shadow;

  // 尝试从缓存中获取渲染函数
  let renderObjectFunction = _shadowRenderObjectLibrary.get(_shadowRenderObjectKeys);

  // 如果函数不存在或参数发生变化，创建新的渲染函数
  if (renderObjectFunction === undefined || renderObjectFunction.shadowType !== shadowType || renderObjectFunction.useVelocity !== useVelocity) {
    // 创建新的阴影渲染函数
    renderObjectFunction = (object, scene, _camera, geometry, material, group, ...params) => {
      // 检查对象是否投射阴影或接收阴影（VSM情况下）
      if (object.castShadow === true || (object.receiveShadow && shadowType === VSMShadowMap)) {
        // 如果使用速度数据，标记对象使用速度
        if (useVelocity) {
          getDataFromObject(object).useVelocity = true;
        }

        // 调用对象的阴影前回调
        object.onBeforeShadow(renderer, object, _camera, shadow.camera, geometry, scene.overrideMaterial, group);

        // 渲染对象
        renderer.renderObject(object, scene, _camera, geometry, material, group, ...params);

        // 调用对象的阴影后回调
        object.onAfterShadow(renderer, object, _camera, shadow.camera, geometry, scene.overrideMaterial, group);
      }
    };

    // 为函数添加属性标记
    renderObjectFunction.shadowType = shadowType;
    renderObjectFunction.useVelocity = useVelocity;

    // 将新函数存储到缓存中
    _shadowRenderObjectLibrary.set(_shadowRenderObjectKeys, renderObjectFunction);
  }

  // 清空键数组，避免内存泄漏
  _shadowRenderObjectKeys[0] = null;
  _shadowRenderObjectKeys[1] = null;

  return renderObjectFunction;
};

/**
 * 表示VSM（方差阴影映射）第一次渲染通道的着色器代码（垂直方向）。
 *
 * @method
 * @param {Object} inputs - 输入参数对象
 * @param {Node<float>} inputs.samples - 采样数量
 * @param {Node<float>} inputs.radius - 模糊半径
 * @param {Node<float>} inputs.size - 纹理尺寸
 * @param {TextureNode} inputs.shadowPass - 渲染目标深度数据的引用
 * @param {Node<float>} inputs.depthLayer - 深度层（用于数组纹理）
 * @return {Node<vec2>} VSM输出（均值和标准差）
 */
const VSMPassVertical = /*@__PURE__*/ Fn(({ samples, radius, size, shadowPass, depthLayer }) => {
  // 初始化均值和平方均值变量
  const mean = float(0).toVar("meanVertical");
  const squaredMean = float(0).toVar("squareMeanVertical");

  // 计算UV步长和起始位置
  const uvStride = samples.lessThanEqual(float(1)).select(float(0), float(2).div(samples.sub(1)));
  const uvStart = samples.lessThanEqual(float(1)).select(float(0), float(-1));

  // 循环采样
  Loop({ start: int(0), end: int(samples), type: "int", condition: "<" }, ({ i }) => {
    // 计算当前采样的UV偏移
    const uvOffset = uvStart.add(float(i).mul(uvStride));

    // 在垂直方向上采样深度值
    let depth = shadowPass.sample(add(screenCoordinate.xy, vec2(0, uvOffset).mul(radius)).div(size));

    // 如果是数组纹理，需要指定深度层
    if (shadowPass.value.isArrayTexture) {
      depth = depth.depth(depthLayer);
    }

    // 提取深度值的x分量
    depth = depth.x;

    // 累加深度值和深度平方值
    mean.addAssign(depth);
    squaredMean.addAssign(depth.mul(depth));
  });

  // 计算平均值
  mean.divAssign(samples);
  squaredMean.divAssign(samples);

  // 计算标准差：sqrt(E[X²] - E[X]²)
  const std_dev = sqrt(squaredMean.sub(mean.mul(mean)));
  return vec2(mean, std_dev);
});

/**
 * 表示VSM（方差阴影映射）第二次渲染通道的着色器代码（水平方向）。
 *
 * @method
 * @param {Object} inputs - 输入参数对象
 * @param {Node<float>} inputs.samples - 采样数量
 * @param {Node<float>} inputs.radius - 模糊半径
 * @param {Node<float>} inputs.size - 纹理尺寸
 * @param {TextureNode} inputs.shadowPass - 第一次VSM渲染通道的结果
 * @param {Node<float>} inputs.depthLayer - 深度层（用于数组纹理）
 * @return {Node<vec2>} VSM输出（均值和标准差）
 */
const VSMPassHorizontal = /*@__PURE__*/ Fn(({ samples, radius, size, shadowPass, depthLayer }) => {
  // 初始化均值和平方均值变量
  const mean = float(0).toVar("meanHorizontal");
  const squaredMean = float(0).toVar("squareMeanHorizontal");

  // 计算UV步长和起始位置
  const uvStride = samples.lessThanEqual(float(1)).select(float(0), float(2).div(samples.sub(1)));
  const uvStart = samples.lessThanEqual(float(1)).select(float(0), float(-1));

  // 循环采样
  Loop({ start: int(0), end: int(samples), type: "int", condition: "<" }, ({ i }) => {
    // 计算当前采样的UV偏移
    const uvOffset = uvStart.add(float(i).mul(uvStride));

    // 在水平方向上采样分布值（第一次通道的结果）
    let distribution = shadowPass.sample(add(screenCoordinate.xy, vec2(uvOffset, 0).mul(radius)).div(size));

    // 如果是数组纹理，需要指定深度层
    if (shadowPass.value.isArrayTexture) {
      distribution = distribution.depth(depthLayer);
    }

    // 累加均值（x分量）和平方均值（y分量的平方 + x分量的平方）
    mean.addAssign(distribution.x);
    squaredMean.addAssign(add(distribution.y.mul(distribution.y), distribution.x.mul(distribution.x)));
  });

  // 计算平均值
  mean.divAssign(samples);
  squaredMean.divAssign(samples);

  // 计算标准差：sqrt(E[X²] - E[X]²)
  const std_dev = sqrt(squaredMean.sub(mean.mul(mean)));
  return vec2(mean, std_dev);
});

// 阴影过滤函数库，包含不同类型的阴影过滤算法
const _shadowFilterLib = [BasicShadowFilter, PCFShadowFilter, PCFSoftShadowFilter, VSMShadowFilter];

// 全局变量

// 渲染器状态变量，用于保存和恢复渲染状态
let _rendererState;
// 用于VSM渲染通道的四边形网格
const _quadMesh = /*@__PURE__*/ new QuadMesh();

/**
 * 表示光照节点的默认阴影实现。
 *
 * @augments ShadowBaseNode
 */
class ShadowNode extends ShadowBaseNode {
  // 返回节点类型标识符
  static get type() {
    return "ShadowNode";
  }

  /**
   * 构造一个新的阴影节点。
   *
   * @param {Object} light - 投射阴影的光源对象
   * @param {?Object} [shadow=null] - 可选的光源阴影对象
   */
  constructor(light, shadow = null) {
    // 调用父类构造函数
    super(light);

    /**
     * 定义光源阴影属性的光源阴影对象。
     *
     * @type {?Object}
     * @default null
     */
    this.shadow = shadow || light.shadow;

    /**
     * 阴影贴图的引用，它是一个渲染目标。
     *
     * @type {?RenderTarget}
     * @default null
     */
    this.shadowMap = null;

    /**
     * 仅与VSM阴影相关。第一次VSM渲染通道的渲染目标。
     *
     * @type {?RenderTarget}
     * @default null
     */
    this.vsmShadowMapVertical = null;

    /**
     * 仅与VSM阴影相关。第二次VSM渲染通道的渲染目标。
     *
     * @type {?RenderTarget}
     * @default null
     */
    this.vsmShadowMapHorizontal = null;

    /**
     * 仅与VSM阴影相关。用于渲染第一次VSM通道的节点材质。
     *
     * @type {?NodeMaterial}
     * @default null
     */
    this.vsmMaterialVertical = null;

    /**
     * 仅与VSM阴影相关。用于渲染第二次VSM通道的节点材质。
     *
     * @type {?NodeMaterial}
     * @default null
     */
    this.vsmMaterialHorizontal = null;

    /**
     * 定义此阴影节点最终结果的输出节点的引用。
     *
     * @type {?Node}
     * @private
     * @default null
     */
    this._node = null;

    // 用于跟踪相机帧ID的弱映射，避免重复计算
    this._cameraFrameId = new WeakMap();

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isShadowNode = true;

    /**
     * 当使用RenderTarget数组重写setupRenderTarget时，此索引可用于指定深度层。
     *
     * @type {number}
     * @readonly
     * @default 0
     */
    this.depthLayer = 0;
  }

  /**
   * 设置阴影过滤。
   *
   * @param {NodeBuilder} builder - 当前节点构建器的引用（此参数未使用但保持接口一致性）
   * @param {Object} inputs - 定义阴影过滤的配置对象
   * @param {Function} inputs.filterFn - 定义阴影贴图过滤类型的函数，例如PCF
   * @param {DepthTexture} inputs.depthTexture - 阴影贴图纹理数据的引用
   * @param {Node<vec3>} inputs.shadowCoord - 用于从阴影贴图采样的阴影坐标
   * @param {Object} inputs.shadow - 光源阴影对象
   * @param {Node<float>} inputs.depthLayer - 深度层
   * @return {Node<float>} 阴影过滤的结果节点
   */
  setupShadowFilter(builder, { filterFn, depthTexture, shadowCoord, shadow, depthLayer }) {
    // 执行视锥体测试，确保阴影坐标在有效范围内
    const frustumTest = shadowCoord.x
      .greaterThanEqual(0) // X坐标 >= 0
      .and(shadowCoord.x.lessThanEqual(1)) // X坐标 <= 1
      .and(shadowCoord.y.greaterThanEqual(0)) // Y坐标 >= 0
      .and(shadowCoord.y.lessThanEqual(1)) // Y坐标 <= 1
      .and(shadowCoord.z.lessThanEqual(1)); // Z坐标 <= 1

    // 应用阴影过滤函数
    const shadowNode = filterFn({ depthTexture, shadowCoord, shadow, depthLayer });

    // 如果在视锥体内则返回阴影值，否则返回1（完全照亮）
    return frustumTest.select(shadowNode, float(1));
  }

  /**
   * 设置阴影坐标。
   *
   * @param {NodeBuilder} builder - 当前节点构建器的引用
   * @param {Node<vec3>} shadowPosition - 表示阴影位置的节点
   * @return {Node<vec3>} 阴影坐标
   */
  setupShadowCoord(builder, shadowPosition) {
    // 获取阴影对象和渲染器
    const { shadow } = this;
    const { renderer } = builder;

    // 获取阴影偏移值
    const bias = reference("bias", "float", shadow).setGroup(renderGroup);

    // 初始化阴影坐标和Z坐标
    let shadowCoord = shadowPosition;
    let coordZ;

    // 根据相机类型和渲染器设置处理坐标
    if (shadow.camera.isOrthographicCamera || renderer.logarithmicDepthBuffer !== true) {
      // 对于正交相机或非对数深度缓冲，执行透视除法
      shadowCoord = shadowCoord.xyz.div(shadowCoord.w);

      // 获取Z坐标
      coordZ = shadowCoord.z;

      // WebGPU坐标系统需要转换深度范围
      if (renderer.coordinateSystem === WebGPUCoordinateSystem) {
        coordZ = coordZ.mul(2).sub(1); // WebGPU: 将 [0, 1] 转换为 [-1, 1]
      }
    } else {
      // 对于透视相机且使用对数深度缓冲的情况
      const w = shadowCoord.w;
      shadowCoord = shadowCoord.xy.div(w); // 只除以X/Y坐标，因为不需要Z

      // 通常可用的"cameraNear"和"cameraFar"节点在这里不能使用，因为它们不会
      // 更新为使用阴影相机。所以，我们必须在这里声明自己的"本地"节点。
      // TODO: 如何让cameraNear/cameraFar节点使用阴影相机，这样我们就不必在这里声明本地节点？
      const cameraNearLocal = reference("near", "float", shadow.camera).setGroup(renderGroup);
      const cameraFarLocal = reference("far", "float", shadow.camera).setGroup(renderGroup);

      // 将视图Z转换为对数深度
      coordZ = viewZToLogarithmicDepth(w.negate(), cameraNearLocal, cameraFarLocal);
    }

    // 构建最终的阴影坐标
    shadowCoord = vec3(
      shadowCoord.x, // X坐标
      shadowCoord.y.oneMinus(), // Y坐标翻转（遵循WebGPU标准）
      coordZ.add(bias) // Z坐标加上偏移值
    );

    return shadowCoord;
  }

  /**
   * 返回给定阴影类型的阴影过滤函数。
   *
   * @param {number} type - 阴影类型
   * @return {Function} 过滤函数
   */
  getShadowFilterFn(type) {
    return _shadowFilterLib[type];
  }

  /**
   * 设置渲染目标。
   *
   * @param {Object} shadow - 阴影对象
   * @param {NodeBuilder} builder - 节点构建器
   * @return {Object} 包含shadowMap和depthTexture的对象
   */
  setupRenderTarget(shadow, builder) {
    // 创建深度纹理
    const depthTexture = new DepthTexture(shadow.mapSize.width, shadow.mapSize.height);
    depthTexture.name = "ShadowDepthTexture";
    depthTexture.compareFunction = LessCompare;

    // 创建阴影贴图渲染目标
    const shadowMap = builder.createRenderTarget(shadow.mapSize.width, shadow.mapSize.height);
    shadowMap.texture.name = "ShadowMap";
    shadowMap.texture.type = shadow.mapType;
    shadowMap.depthTexture = depthTexture;

    return { shadowMap, depthTexture };
  }

  /**
   * 设置阴影输出节点。
   *
   * @param {NodeBuilder} builder - 当前节点构建器的引用
   * @return {Node<vec3>} 阴影输出节点
   */
  setupShadow(builder) {
    // 获取渲染器
    const { renderer } = builder;

    // 获取光源和阴影对象
    const { light, shadow } = this;

    // 获取阴影贴图类型
    const shadowMapType = renderer.shadowMap.type;

    // 设置渲染目标
    const { depthTexture, shadowMap } = this.setupRenderTarget(shadow, builder);

    // 更新阴影相机的投影矩阵
    shadow.camera.updateProjectionMatrix();

    // VSM（方差阴影映射）处理

    // 如果是VSM阴影且不是点光源阴影
    if (shadowMapType === VSMShadowMap && shadow.isPointLightShadow !== true) {
      depthTexture.compareFunction = null; // VSM不使用textureSampleCompare()/texture2DCompare()

      // 如果是数组纹理（深度 > 1）
      if (shadowMap.depth > 1) {
        // 创建垂直VSM阴影贴图
        if (!shadowMap._vsmShadowMapVertical) {
          shadowMap._vsmShadowMapVertical = builder.createRenderTarget(shadow.mapSize.width, shadow.mapSize.height, {
            format: RGFormat, // RG格式存储均值和方差
            type: HalfFloatType, // 半精度浮点
            depth: shadowMap.depth, // 保持相同深度
            depthBuffer: false, // 不需要深度缓冲
          });
          shadowMap._vsmShadowMapVertical.texture.name = "VSMVertical";
        }

        // 设置垂直VSM阴影贴图
        this.vsmShadowMapVertical = shadowMap._vsmShadowMapVertical;

        // 创建水平VSM阴影贴图
        if (!shadowMap._vsmShadowMapHorizontal) {
          shadowMap._vsmShadowMapHorizontal = builder.createRenderTarget(shadow.mapSize.width, shadow.mapSize.height, {
            format: RGFormat, // RG格式存储均值和方差
            type: HalfFloatType, // 半精度浮点
            depth: shadowMap.depth, // 保持相同深度
            depthBuffer: false, // 不需要深度缓冲
          });
          shadowMap._vsmShadowMapHorizontal.texture.name = "VSMHorizontal";
        }

        // 设置水平VSM阴影贴图
        this.vsmShadowMapHorizontal = shadowMap._vsmShadowMapHorizontal;
      } else {
        // 对于非数组纹理，直接创建VSM渲染目标
        this.vsmShadowMapVertical = builder.createRenderTarget(shadow.mapSize.width, shadow.mapSize.height, { format: RGFormat, type: HalfFloatType, depthBuffer: false });
        this.vsmShadowMapHorizontal = builder.createRenderTarget(shadow.mapSize.width, shadow.mapSize.height, { format: RGFormat, type: HalfFloatType, depthBuffer: false });
      }

      // 设置垂直通道的输入纹理
      let shadowPassVertical = texture(depthTexture);

      // 如果是数组纹理，指定深度层
      if (depthTexture.isArrayTexture) {
        shadowPassVertical = shadowPassVertical.depth(this.depthLayer);
      }

      // 设置水平通道的输入纹理（来自垂直通道的输出）
      let shadowPassHorizontal = texture(this.vsmShadowMapVertical.texture);

      // 如果是数组纹理，指定深度层
      if (depthTexture.isArrayTexture) {
        shadowPassHorizontal = shadowPassHorizontal.depth(this.depthLayer);
      }

      // 获取VSM参数
      const samples = reference("blurSamples", "float", shadow).setGroup(renderGroup); // 模糊采样数
      const radius = reference("radius", "float", shadow).setGroup(renderGroup); // 模糊半径
      const size = reference("mapSize", "vec2", shadow).setGroup(renderGroup); // 贴图尺寸

      // 创建或获取垂直通道材质
      let material = this.vsmMaterialVertical || (this.vsmMaterialVertical = new NodeMaterial());
      material.fragmentNode = VSMPassVertical({ samples, radius, size, shadowPass: shadowPassVertical, depthLayer: this.depthLayer }).context(builder.getSharedContext());
      material.name = "VSMVertical";

      // 创建或获取水平通道材质
      material = this.vsmMaterialHorizontal || (this.vsmMaterialHorizontal = new NodeMaterial());
      material.fragmentNode = VSMPassHorizontal({ samples, radius, size, shadowPass: shadowPassHorizontal, depthLayer: this.depthLayer }).context(builder.getSharedContext());
      material.name = "VSMHorizontal";
    }

    // 阴影计算

    // 获取阴影强度和法线偏移
    const shadowIntensity = reference("intensity", "float", shadow).setGroup(renderGroup);
    const normalBias = reference("normalBias", "float", shadow).setGroup(renderGroup);

    // 计算阴影位置：光源阴影矩阵 * (阴影世界位置 + 法线偏移)
    const shadowPosition = lightShadowMatrix(light).mul(shadowPositionWorld.add(normalWorld.mul(normalBias)));
    // 设置阴影坐标
    const shadowCoord = this.setupShadowCoord(builder, shadowPosition);

    // 阴影过滤设置

    // 获取过滤函数：优先使用自定义过滤节点，否则使用默认过滤函数
    const filterFn = shadow.filterNode || this.getShadowFilterFn(renderer.shadowMap.type) || null;

    // 如果没有找到合适的过滤函数，抛出错误
    if (filterFn === null) {
      throw new Error("THREE.WebGPURenderer: Shadow map type not supported yet.");
    }

    // 选择深度纹理：VSM使用水平通道输出，其他使用原始深度纹理
    const shadowDepthTexture = shadowMapType === VSMShadowMap && shadow.isPointLightShadow !== true ? this.vsmShadowMapHorizontal.texture : depthTexture;

    // 设置阴影过滤
    const shadowNode = this.setupShadowFilter(builder, {
      filterFn, // 过滤函数
      shadowTexture: shadowMap.texture, // 阴影纹理
      depthTexture: shadowDepthTexture, // 深度纹理
      shadowCoord, // 阴影坐标
      shadow, // 阴影对象
      depthLayer: this.depthLayer, // 深度层
    });

    // 从阴影贴图采样颜色
    let shadowColor = texture(shadowMap.texture, shadowCoord);

    // 如果是数组纹理，指定深度层
    if (depthTexture.isArrayTexture) {
      shadowColor = shadowColor.depth(this.depthLayer);
    }

    // 计算最终阴影输出：混合完全照亮(1)和阴影值，考虑阴影强度
    const shadowOutput = mix(1, shadowNode.rgb.mix(shadowColor, 1), shadowIntensity.mul(shadowColor.a)).toVar();

    // 设置阴影贴图引用
    this.shadowMap = shadowMap;
    this.shadow.map = shadowMap;

    return shadowOutput;
  }

  /**
   * 该实现执行输出节点的设置。只有在渲染器中全局启用阴影映射时才会产生输出。
   *
   * @param {NodeBuilder} builder - 当前节点构建器的引用
   * @return {ShaderCallNodeInternal} 输出节点
   */
  setup(builder) {
    // 如果阴影映射未启用，直接返回
    if (builder.renderer.shadowMap.enabled === false) return;

    // 返回一个函数节点
    return Fn(() => {
      let node = this._node;

      // 设置阴影位置
      this.setupShadowPosition(builder);

      // 如果节点尚未创建，创建阴影节点
      if (node === null) {
        this._node = node = this.setupShadow(builder);
      }

      // 处理已弃用的shadowNode属性
      if (builder.material.shadowNode) {
        // @deprecated, r171
        console.warn('THREE.NodeMaterial: ".shadowNode" is deprecated. Use ".castShadowNode" instead.');
      }

      // 如果材质有接收阴影节点，应用它
      if (builder.material.receivedShadowNode) {
        node = builder.material.receivedShadowNode(node);
      }

      return node;
    })();
  }

  /**
   * 渲染阴影。此函数的逻辑可以包含在 {@link ShadowNode#updateShadow} 中，
   * 但是更专业的阴影节点可能需要自定义阴影贴图渲染。通过拥有专用方法，
   * 更容易重写默认行为。
   *
   * @param {NodeFrame} frame - 当前节点帧的引用
   */
  renderShadow(frame) {
    // 获取阴影、阴影贴图和光源对象
    const { shadow, shadowMap, light } = this;
    // 获取渲染器和场景
    const { renderer, scene } = frame;

    // 更新阴影矩阵
    // 更新阴影矩阵
    shadow.updateMatrices(light);

    // 设置阴影贴图尺寸
    shadowMap.setSize(shadow.mapSize.width, shadow.mapSize.height, shadowMap.depth);

    // 使用阴影相机渲染场景
    renderer.render(scene, shadow.camera);
  }

  /**
   * 更新阴影。
   *
   * @param {NodeFrame} frame - 当前节点帧的引用
   */
  updateShadow(frame) {
    // 获取阴影相关对象
    const { shadowMap, light, shadow } = this;
    // 获取渲染器、场景和相机
    const { renderer, scene, camera } = frame;

    // 获取阴影类型
    const shadowType = renderer.shadowMap.type;

    // 缓存深度版本，用于检测变化
    const depthVersion = shadowMap.depthTexture.version;
    this._depthVersionCached = depthVersion;

    // 保存阴影相机的层级掩码
    const _shadowCameraLayer = shadow.camera.layers.mask;

    // 如果阴影相机的层级掩码为0，使用主相机的层级掩码
    if ((shadow.camera.layers.mask & 0xfffffffe) === 0) {
      shadow.camera.layers.mask = camera.layers.mask;
    }

    // 保存当前的渲染对象函数
    const currentRenderObjectFunction = renderer.getRenderObjectFunction();

    // 检查是否使用多渲染目标和速度缓冲
    const currentMRT = renderer.getMRT();
    const useVelocity = currentMRT ? currentMRT.has("velocity") : false;

    // 重置渲染器和场景状态
    _rendererState = resetRendererAndSceneState(renderer, scene, _rendererState);

    // 设置阴影材质作为覆盖材质
    scene.overrideMaterial = getShadowMaterial(light);

    // 设置阴影渲染对象函数
    renderer.setRenderObjectFunction(getShadowRenderObjectFunction(renderer, shadow, shadowType, useVelocity));

    // 设置清除颜色为黑色
    renderer.setClearColor(0x000000, 0);

    // 设置渲染目标为阴影贴图
    renderer.setRenderTarget(shadowMap);

    // 执行阴影渲染
    this.renderShadow(frame);

    // 恢复原始的渲染对象函数
    // 恢复原始的渲染对象函数
    renderer.setRenderObjectFunction(currentRenderObjectFunction);

    // VSM模糊通道

    // 如果是VSM阴影且不是点光源阴影，执行VSM通道
    if (shadowType === VSMShadowMap && shadow.isPointLightShadow !== true) {
      this.vsmPass(renderer);
    }

    // 恢复阴影相机的层级掩码
    shadow.camera.layers.mask = _shadowCameraLayer;

    // 恢复渲染器和场景状态
    restoreRendererAndSceneState(renderer, scene, _rendererState);
  }

  /**
   * 对于VSM需要额外的渲染通道。
   *
   * @param {Renderer} renderer - 当前渲染器的引用
   */
  vsmPass(renderer) {
    // 获取阴影对象
    const { shadow } = this;

    // 获取深度并设置VSM渲染目标尺寸
    const depth = this.shadowMap.depth;
    this.vsmShadowMapVertical.setSize(shadow.mapSize.width, shadow.mapSize.height, depth);
    this.vsmShadowMapHorizontal.setSize(shadow.mapSize.width, shadow.mapSize.height, depth);

    // 执行垂直模糊通道
    renderer.setRenderTarget(this.vsmShadowMapVertical);
    _quadMesh.material = this.vsmMaterialVertical;
    _quadMesh.render(renderer);

    // 执行水平模糊通道
    renderer.setRenderTarget(this.vsmShadowMapHorizontal);
    _quadMesh.material = this.vsmMaterialHorizontal;
    _quadMesh.render(renderer);
  }

  /**
   * 释放此阴影节点的内部资源。
   */
  dispose() {
    // 释放阴影贴图
    this.shadowMap.dispose();
    this.shadowMap = null;

    // 释放垂直VSM资源
    if (this.vsmShadowMapVertical !== null) {
      this.vsmShadowMapVertical.dispose();
      this.vsmShadowMapVertical = null;

      this.vsmMaterialVertical.dispose();
      this.vsmMaterialVertical = null;
    }

    // 释放水平VSM资源
    if (this.vsmShadowMapHorizontal !== null) {
      this.vsmShadowMapHorizontal.dispose();
      this.vsmShadowMapHorizontal = null;

      // 释放水平VSM材质
      this.vsmMaterialHorizontal.dispose();
      this.vsmMaterialHorizontal = null;
    }

    // 调用父类的dispose方法
    super.dispose();
  }

  /**
   * 该实现在必要时执行阴影贴图的更新。
   *
   * @param {NodeFrame} frame - 当前节点帧的引用
   */
  updateBefore(frame) {
    // 获取阴影对象
    const { shadow } = this;

    // 检查是否需要更新：手动标记或自动更新
    let needsUpdate = shadow.needsUpdate || shadow.autoUpdate;

    // 避免在同一帧中重复更新同一相机的阴影
    if (needsUpdate) {
      if (this._cameraFrameId[frame.camera] === frame.frameId) {
        needsUpdate = false;
      }

      // 记录当前相机的帧ID
      this._cameraFrameId[frame.camera] = frame.frameId;
    }

    // 如果需要更新，执行阴影更新
    if (needsUpdate) {
      this.updateShadow(frame);

      // 如果深度纹理版本没有变化，标记为不需要更新
      if (this.shadowMap.depthTexture.version === this._depthVersionCached) {
        shadow.needsUpdate = false;
      }
    }
  }
}

// 导出阴影节点类作为默认导出
export default ShadowNode;

/**
 * TSL函数，用于创建 `ShadowNode` 实例。
 *
 * @tsl
 * @function
 * @param {Object} light - 投射阴影的光源对象
 * @param {?Object} [shadow] - 光源阴影对象
 * @return {ShadowNode} 创建的阴影节点
 */
export const shadow = (light, shadow) => nodeObject(new ShadowNode(light, shadow));
