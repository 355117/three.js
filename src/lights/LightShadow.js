// 导入矩阵类
import { Matrix4 } from "../math/Matrix4.js";
// 导入二维向量类
import { Vector2 } from "../math/Vector2.js";
// 导入三维向量类
import { Vector3 } from "../math/Vector3.js";
// 导入四维向量类
import { Vector4 } from "../math/Vector4.js";
// 导入视锥体类
import { Frustum } from "../math/Frustum.js";
// 导入无符号字节类型常量
import { UnsignedByteType } from "../constants.js";

// 投影屏幕矩阵（纯函数，用于内部计算）
const _projScreenMatrix = /*@__PURE__*/ new Matrix4();
// 光源在世界坐标系中的位置（纯函数，用于内部计算）
const _lightPositionWorld = /*@__PURE__*/ new Vector3();
// 相机观察目标位置（纯函数，用于内部计算）
const _lookTarget = /*@__PURE__*/ new Vector3();

/**
 * 光源阴影抽象基类
 * 这些类表示不同光源类型的阴影配置
 * 所有光源阴影类都继承此基类的属性和方法
 *
 * @abstract
 */
class LightShadow {
  /**
   * 构造一个新的光源阴影
   *
   * @param {Camera} camera - 光源对世界的视图（阴影相机）
   */
  constructor(camera) {
    /**
     * 光源对世界的视图
     * 这是用于生成阴影贴图的相机
     *
     * @type {Camera}
     */
    this.camera = camera;

    /**
     * 阴影的强度
     * 默认值为1，有效值范围为[0, 1]
     *
     * @type {number}
     * @default 1
     */
    this.intensity = 1;

    /**
     * 阴影贴图偏移量
     * 在决定表面是否在阴影中时，从标准化深度中添加或减去的量
     *
     * 默认值为0。这里的微小调整（大约0.0001的数量级）
     * 可能有助于减少阴影中的伪影
     *
     * @type {number}
     * @default 0
     */
    this.bias = 0;

    /**
     * 法线偏移量
     * 定义用于查询阴影贴图的位置沿对象法线偏移的程度
     * 默认值为0。增加此值可用于减少阴影痤疮，
     * 特别是在大场景中光线以浅角度照射到几何体上时
     * 代价是阴影可能看起来扭曲
     *
     * @type {number}
     * @default 0
     */
    this.normalBias = 0;

    /**
     * 阴影半径
     * 将此值设置为大于1将模糊阴影的边缘
     * 高值会在阴影中产生不需要的条带效果 - 更大的贴图尺寸
     * 将允许在这些效果变得可见之前使用更高的值
     *
     * 当阴影贴图类型为PCFSoftShadowMap时，此属性无效，
     * 建议通过减少阴影贴图大小来增加柔和度
     *
     * 当阴影贴图类型为BasicShadowMap时，此属性无效
     *
     * @type {number}
     * @default 1
     */
    this.radius = 1;

    /**
     * 模糊VSM阴影贴图时使用的采样数量
     *
     * @type {number}
     * @default 8
     */
    this.blurSamples = 8;

    /**
     * 定义阴影贴图的宽度和高度
     * 更高的值以计算时间为代价提供更好质量的阴影
     * 值必须是2的幂
     *
     * @type {Vector2}
     * @default (512,512)
     */
    this.mapSize = new Vector2(512, 512);

    /**
     * 阴影纹理的类型
     * 默认值为UnsignedByteType
     *
     * @type {number}
     * @default UnsignedByteType
     */
    this.mapType = UnsignedByteType;

    /**
     * 使用内部相机生成的深度贴图
     * 超出像素深度的位置处于阴影中
     * 在渲染期间内部计算
     *
     * @type {?RenderTarget}
     * @default null
     */
    this.map = null;

    /**
     * 使用内部相机生成的分布贴图
     * 基于深度分布计算遮挡
     * 在渲染期间内部计算
     *
     * @type {?RenderTarget}
     * @default null
     */
    this.mapPass = null;

    /**
     * 模型到阴影相机空间的矩阵
     * 用于计算阴影贴图中的位置和深度
     * 在渲染期间内部计算
     *
     * @type {Matrix4}
     */
    this.matrix = new Matrix4();

    /**
     * 启用光源阴影的自动更新
     * 如果不需要动态光照/阴影，可以将其设置为false
     *
     * @type {boolean}
     * @default true
     */
    this.autoUpdate = true;

    /**
     * 当设置为true时，阴影贴图将在下一次render调用中更新
     * 如果已将{@link LightShadow#autoUpdate}设置为false，
     * 则需要将此属性设置为true，然后进行渲染调用以更新光源的阴影
     *
     * @type {boolean}
     * @default false
     */
    this.needsUpdate = false;

    // 内部视锥体对象，用于裁剪计算
    this._frustum = new Frustum();
    // 帧扩展，默认为1x1
    this._frameExtents = new Vector2(1, 1);

    // 视口数量，默认为1
    this._viewportCount = 1;

    // 视口数组，默认包含一个全屏视口
    this._viewports = [new Vector4(0, 0, 1, 1)];
  }

  /**
   * 由渲染器内部使用，获取此阴影需要渲染的视口数量
   *
   * @return {number} 视口数量
   */
  getViewportCount() {
    // 返回视口数量
    return this._viewportCount;
  }

  /**
   * 获取阴影相机的视锥体
   * 由渲染器内部使用来裁剪对象
   *
   * @return {Frustum} 阴影相机视锥体
   */
  getFrustum() {
    // 返回内部视锥体对象
    return this._frustum;
  }

  /**
   * 更新相机和阴影的矩阵
   * 由渲染器内部使用
   *
   * @param {Light} light - 要渲染阴影的光源
   */
  updateMatrices(light) {
    // 获取阴影相机引用
    const shadowCamera = this.camera;
    // 获取阴影矩阵引用
    const shadowMatrix = this.matrix;

    // 从光源的世界矩阵中提取位置
    _lightPositionWorld.setFromMatrixPosition(light.matrixWorld);
    // 设置阴影相机位置为光源位置
    shadowCamera.position.copy(_lightPositionWorld);

    // 从光源目标的世界矩阵中提取位置
    _lookTarget.setFromMatrixPosition(light.target.matrixWorld);
    // 让阴影相机观察目标位置
    shadowCamera.lookAt(_lookTarget);
    // 更新阴影相机的世界矩阵
    shadowCamera.updateMatrixWorld();

    // 计算投影屏幕矩阵：投影矩阵 × 相机世界逆矩阵
    _projScreenMatrix.multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse);
    // 从投影矩阵设置视锥体
    this._frustum.setFromProjectionMatrix(_projScreenMatrix, shadowCamera.coordinateSystem, shadowCamera.reversedDepth);

    // 根据相机是否使用反向深度设置不同的阴影矩阵
    if (shadowCamera.reversedDepth) {
      // 反向深度的阴影矩阵设置
      shadowMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);
    } else {
      // 正常深度的阴影矩阵设置
      shadowMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);
    }

    // 将阴影矩阵与投影屏幕矩阵相乘
    shadowMatrix.multiply(_projScreenMatrix);
  }

  /**
   * 返回给定视口索引的视口定义
   *
   * @param {number} viewportIndex - 视口索引
   * @return {Vector4} 视口定义
   */
  getViewport(viewportIndex) {
    // 返回指定索引的视口
    return this._viewports[viewportIndex];
  }

  /**
   * 返回帧扩展
   *
   * @return {Vector2} 帧扩展
   */
  getFrameExtents() {
    // 返回帧扩展对象
    return this._frameExtents;
  }

  /**
   * 释放此实例分配的GPU相关资源
   * 当此实例在应用程序中不再使用时调用此方法
   */
  dispose() {
    // 如果存在阴影贴图，则释放它
    if (this.map) {
      this.map.dispose();
    }

    // 如果存在分布贴图，则释放它
    if (this.mapPass) {
      this.mapPass.dispose();
    }
  }

  /**
   * 将给定光源阴影实例的值复制到此实例
   *
   * @param {LightShadow} source - 要复制的光源阴影
   * @return {LightShadow} 返回此光源阴影实例的引用
   */
  copy(source) {
    // 克隆源阴影的相机
    this.camera = source.camera.clone();

    // 复制阴影强度
    this.intensity = source.intensity;

    // 复制偏移量和半径
    this.bias = source.bias;
    this.radius = source.radius;

    // 复制更新标志
    this.autoUpdate = source.autoUpdate;
    this.needsUpdate = source.needsUpdate;
    // 复制法线偏移量
    this.normalBias = source.normalBias;
    // 复制模糊采样数
    this.blurSamples = source.blurSamples;

    // 复制贴图尺寸
    this.mapSize.copy(source.mapSize);

    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 返回一个新的光源阴影实例，其值从此实例复制
   *
   * @return {LightShadow} 此实例的克隆
   */
  clone() {
    // 创建新实例并复制当前实例的值
    return new this.constructor().copy(this);
  }

  /**
   * 将光源阴影序列化为JSON
   *
   * @return {Object} 表示序列化光源阴影的JSON对象
   * @see {@link ObjectLoader#parse}
   */
  toJSON() {
    // 创建序列化对象
    const object = {};

    // 只有当值不是默认值时才添加到序列化对象中
    if (this.intensity !== 1) object.intensity = this.intensity;
    if (this.bias !== 0) object.bias = this.bias;
    if (this.normalBias !== 0) object.normalBias = this.normalBias;
    if (this.radius !== 1) object.radius = this.radius;
    if (this.mapSize.x !== 512 || this.mapSize.y !== 512) object.mapSize = this.mapSize.toArray();

    // 序列化相机对象
    object.camera = this.camera.toJSON(false).object;
    // 删除相机的矩阵属性（不需要序列化）
    delete object.camera.matrix;

    // 返回序列化对象
    return object;
  }
}

// 导出光源阴影基类
export { LightShadow };
