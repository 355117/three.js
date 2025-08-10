/**
 * ClippingContext.js
 *
 * 裁剪上下文 - 管理裁剪平面的状态和计算
 *
 * 这个模块表示用于通过裁剪平面执行裁剪的状态。每个渲染上下文
 * 都有一个默认的裁剪上下文。当场景包含`ClippingGroup`实例时，
 * 每个组都会有一个对应的上下文。
 */

// 导入数学库
import { Matrix3 } from "../../math/Matrix3.js"; // 3x3矩阵
import { Plane } from "../../math/Plane.js"; // 平面
import { Vector4 } from "../../math/Vector4.js"; // 4D向量

// 模块级临时平面对象，避免重复创建
const _plane = /*@__PURE__*/ new Plane();

/**
 * 裁剪上下文类
 *
 * 表示用于通过裁剪平面执行裁剪的状态。每个渲染上下文都有一个
 * 默认的裁剪上下文。当场景包含`ClippingGroup`实例时，每个组
 * 都会有一个对应的上下文。
 *
 * 裁剪上下文管理：
 * - 裁剪平面的变换和投影
 * - 交集和并集裁剪模式
 * - 层次化的裁剪组管理
 * - 阴影渲染时的裁剪处理
 *
 * @private
 */
class ClippingContext {
  /**
   * 构造新的裁剪上下文
   *
   * 创建一个新的裁剪上下文实例，可以指定父上下文来建立
   * 层次化的裁剪关系。子上下文会继承父上下文的某些属性。
   *
   * @param {?ClippingContext} [parentContext=null] - 父裁剪上下文的引用
   */
  constructor(parentContext = null) {
    /**
     * 裁剪上下文的版本号
     *
     * 用于跟踪裁剪上下文的变化，当裁剪平面或配置发生
     * 变化时，版本号会递增。
     *
     * @type {number}
     * @readonly
     */
    this.version = 0;

    /**
     * 是否使用裁剪平面的交集进行裁剪
     *
     * 当为true时，使用裁剪平面的交集来裁剪对象；
     * 当为false时，使用裁剪平面的并集。
     *
     * @type {?boolean}
     * @default null
     */
    this.clipIntersection = null;

    /**
     * 裁剪上下文的缓存键
     *
     * 用于标识裁剪配置的字符串，相同配置的对象可以
     * 共享裁剪计算结果。
     *
     * @type {string}
     */
    this.cacheKey = "";

    /**
     * 阴影渲染通道是否激活
     *
     * 在阴影渲染时，某些裁剪行为可能需要特殊处理。
     *
     * @type {boolean}
     * @default false
     */
    this.shadowPass = false;

    /**
     * 视图法线矩阵
     *
     * 用于将裁剪平面从世界空间变换到视图空间的法线矩阵。
     * 这是视图矩阵的逆转置矩阵。
     *
     * @type {Matrix3}
     */
    this.viewNormalMatrix = new Matrix3();

    /**
     * 裁剪组上下文的内部缓存
     *
     * 使用WeakMap维护裁剪上下文，确保当裁剪组被垃圾回收时，
     * 相关的上下文也会被自动清理。
     *
     * @type {WeakMap<ClippingGroup,ClippingContext>}
     */
    this.clippingGroupContexts = new WeakMap();

    /**
     * 交集裁剪平面数组
     *
     * 存储用于交集裁剪的平面，这些平面的交集区域内的
     * 几何体会被保留。
     *
     * @type {Array<Vector4>}
     */
    this.intersectionPlanes = [];

    /**
     * 并集裁剪平面数组
     *
     * 存储用于并集裁剪的平面，这些平面的并集区域外的
     * 几何体会被裁剪掉。
     *
     * @type {Array<Vector4>}
     */
    this.unionPlanes = [];

    /**
     * 父上下文的版本号
     *
     * 记录父裁剪上下文的版本号，用于检测父上下文的变化
     * 并相应地更新当前上下文。
     *
     * @type {?number}
     * @readonly
     */
    this.parentVersion = null;

    // 如果有父上下文，继承某些属性
    if (parentContext !== null) {
      // 共享视图法线矩阵
      this.viewNormalMatrix = parentContext.viewNormalMatrix;
      // 共享裁剪组上下文缓存
      this.clippingGroupContexts = parentContext.clippingGroupContexts;

      // 继承阴影渲染状态和视图矩阵
      this.shadowPass = parentContext.shadowPass;
      this.viewMatrix = parentContext.viewMatrix;
    }
  }

  /**
   * 投影给定的源裁剪平面并将结果写入目标数组
   *
   * 将裁剪平面从世界空间变换到视图空间，这是GPU裁剪计算
   * 所需的格式。变换后的平面以Vector4格式存储。
   *
   * @param {Array<import('../../math/Plane.js').Plane>} source - 源裁剪平面数组
   * @param {Array<import('../../math/Vector4.js').Vector4>} destination - 目标数组
   * @param {number} offset - 在目标数组中的偏移量
   */
  projectPlanes(source, destination, offset) {
    const l = source.length;

    // 遍历所有源裁剪平面
    for (let i = 0; i < l; i++) {
      // 将平面变换到视图空间
      _plane.copy(source[i]).applyMatrix4(this.viewMatrix, this.viewNormalMatrix);

      // 获取目标向量
      const v = destination[offset + i];
      const normal = _plane.normal;

      // 将平面法线和距离存储为Vector4
      // 注意：法线取负值是为了符合GPU裁剪的约定
      v.x = -normal.x;
      v.y = -normal.y;
      v.z = -normal.z;
      v.w = _plane.constant;
    }
  }

  /**
   * 更新场景的根裁剪上下文
   *
   * 更新场景级别的裁剪上下文，设置视图矩阵、法线矩阵和
   * 阴影渲染状态。这是裁剪系统的全局初始化步骤。
   *
   * @param {import('../../scenes/Scene.js').Scene} scene - 场景对象
   * @param {import('../../cameras/Camera.js').Camera} camera - 用于渲染场景的相机
   */
  updateGlobal(scene, camera) {
    // 检查是否在阴影渲染通道中（通过覆盖材质判断）
    this.shadowPass = scene.overrideMaterial !== null && scene.overrideMaterial.isShadowPassMaterial;
    // 设置视图矩阵（相机的逆世界矩阵）
    this.viewMatrix = camera.matrixWorldInverse;

    // 计算视图法线矩阵（用于变换法线向量）
    this.viewNormalMatrix.getNormalMatrix(this.viewMatrix);
  }

  /**
   * 更新裁剪上下文
   *
   * 根据父上下文和裁剪组的配置更新当前裁剪上下文。这个方法
   * 处理裁剪平面的继承、合并和变换，是裁剪系统的核心更新逻辑。
   *
   * 更新过程：
   * 1. 检查父上下文是否有变化
   * 2. 同步裁剪模式设置
   * 3. 分配和管理裁剪平面数组
   * 4. 投影变换裁剪平面
   * 5. 更新版本和缓存键
   *
   * @param {ClippingContext} parentContext - 父上下文
   * @param {import('../../objects/ClippingGroup.js').ClippingGroup} clippingGroup - 此上下文所属的裁剪组
   */
  update(parentContext, clippingGroup) {
    let update = false;

    // 检查父上下文是否有变化，如果有则同步父上下文的裁剪平面
    if (parentContext.version !== this.parentVersion) {
      // 复制父上下文的交集和并集裁剪平面
      this.intersectionPlanes = Array.from(parentContext.intersectionPlanes);
      this.unionPlanes = Array.from(parentContext.unionPlanes);
      // 更新父版本号
      this.parentVersion = parentContext.version;
    }

    // 检查裁剪模式是否发生变化
    if (this.clipIntersection !== clippingGroup.clipIntersection) {
      // 更新裁剪模式
      this.clipIntersection = clippingGroup.clipIntersection;

      // 根据裁剪模式调整平面数组长度
      if (this.clipIntersection) {
        // 交集模式：重置并集平面数组长度
        this.unionPlanes.length = parentContext.unionPlanes.length;
      } else {
        // 并集模式：重置交集平面数组长度
        this.intersectionPlanes.length = parentContext.intersectionPlanes.length;
      }
    }

    // 获取裁剪组的源裁剪平面
    const srcClippingPlanes = clippingGroup.clippingPlanes;
    const l = srcClippingPlanes.length;

    // 根据裁剪模式选择目标平面数组和偏移量
    let dstClippingPlanes;
    let offset;

    if (this.clipIntersection) {
      // 交集模式：添加到交集平面数组
      dstClippingPlanes = this.intersectionPlanes;
      offset = parentContext.intersectionPlanes.length;
    } else {
      // 并集模式：添加到并集平面数组
      dstClippingPlanes = this.unionPlanes;
      offset = parentContext.unionPlanes.length;
    }

    // 检查目标数组是否需要调整大小
    if (dstClippingPlanes.length !== offset + l) {
      // 调整数组长度
      dstClippingPlanes.length = offset + l;

      // 为新增的平面创建Vector4对象
      for (let i = 0; i < l; i++) {
        dstClippingPlanes[offset + i] = new Vector4();
      }

      // 标记需要更新
      update = true;
    }

    // 将源裁剪平面投影变换到目标数组
    this.projectPlanes(srcClippingPlanes, dstClippingPlanes, offset);

    // 如果有更新，增加版本号并生成新的缓存键
    if (update) {
      this.version++;
      // 缓存键格式：交集平面数量:并集平面数量
      this.cacheKey = `${this.intersectionPlanes.length}:${this.unionPlanes.length}`;
    }
  }

  /**
   * 获取给定裁剪组的裁剪上下文
   *
   * 为指定的裁剪组返回或创建一个裁剪上下文。这个方法实现了
   * 裁剪上下文的缓存和重用机制，避免重复创建相同的上下文。
   *
   * 特殊处理：
   * - 在阴影渲染通道中，如果裁剪组不裁剪阴影，则返回当前上下文
   * - 使用WeakMap缓存上下文，确保内存安全
   * - 自动更新上下文以反映最新的裁剪配置
   *
   * @param {import('../../objects/ClippingGroup.js').ClippingGroup} clippingGroup - 裁剪组
   * @return {ClippingContext} 裁剪上下文
   */
  getGroupContext(clippingGroup) {
    // 在阴影渲染通道中，如果裁剪组不裁剪阴影，直接返回当前上下文
    if (this.shadowPass && !clippingGroup.clipShadows) return this;

    // 尝试从缓存中获取裁剪组的上下文
    let context = this.clippingGroupContexts.get(clippingGroup);

    // 如果上下文不存在，创建新的上下文
    if (context === undefined) {
      // 创建以当前上下文为父的新上下文
      context = new ClippingContext(this);
      // 将新上下文缓存到WeakMap中
      this.clippingGroupContexts.set(clippingGroup, context);
    }

    // 更新上下文以反映最新的裁剪配置
    context.update(this, clippingGroup);

    return context;
  }

  /**
   * 获取并集裁剪平面的数量
   *
   * 返回当前上下文中并集裁剪平面的数量。这个属性用于
   * 着色器中的裁剪计算和性能优化。
   *
   * @type {number}
   * @readonly
   */
  get unionClippingCount() {
    return this.unionPlanes.length;
  }
}

// 导出裁剪上下文类
export default ClippingContext;
