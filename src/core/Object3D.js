// 导入四元数类，用于表示旋转
import { Quaternion } from "../math/Quaternion.js";
// 导入三维向量类，用于表示位置、缩放等
import { Vector3 } from "../math/Vector3.js";
// 导入4x4矩阵类，用于变换计算
import { Matrix4 } from "../math/Matrix4.js";
// 导入事件分发器基类，提供事件处理功能
import { EventDispatcher } from "./EventDispatcher.js";
// 导入欧拉角类，用于表示旋转
import { Euler } from "../math/Euler.js";
// 导入图层类，用于控制对象的可见性
import { Layers } from "./Layers.js";
// 导入3x3矩阵类，用于法线变换
import { Matrix3 } from "../math/Matrix3.js";
// 导入UUID生成函数，用于创建唯一标识符
import { generateUUID } from "../math/MathUtils.js";

// 全局Object3D对象ID计数器，用于分配唯一ID
let _object3DId = 0;

// 临时向量，用于内部计算，避免重复创建对象
const _v1 = /*@__PURE__*/ new Vector3();
// 临时四元数，用于内部计算
const _q1 = /*@__PURE__*/ new Quaternion();
// 临时矩阵，用于内部计算
const _m1 = /*@__PURE__*/ new Matrix4();
// 临时目标向量，用于lookAt等方法
const _target = /*@__PURE__*/ new Vector3();

// 临时位置向量，用于矩阵分解
const _position = /*@__PURE__*/ new Vector3();
// 临时缩放向量，用于矩阵分解
const _scale = /*@__PURE__*/ new Vector3();
// 临时四元数，用于矩阵分解
const _quaternion = /*@__PURE__*/ new Quaternion();

// X轴单位向量 (1, 0, 0)
const _xAxis = /*@__PURE__*/ new Vector3(1, 0, 0);
// Y轴单位向量 (0, 1, 0)
const _yAxis = /*@__PURE__*/ new Vector3(0, 1, 0);
// Z轴单位向量 (0, 0, 1)
const _zAxis = /*@__PURE__*/ new Vector3(0, 0, 1);

/**
 * 当对象被添加到其父对象时触发的事件
 * Fires when the object has been added to its parent object.
 *
 * @event Object3D#added
 * @type {Object}
 */
const _addedEvent = { type: "added" };

/**
 * 当对象从其父对象中移除时触发的事件
 * Fires when the object has been removed from its parent object.
 *
 * @event Object3D#removed
 * @type {Object}
 */
const _removedEvent = { type: "removed" };

/**
 * 当添加新的子对象时触发的事件
 * Fires when a new child object has been added.
 *
 * @event Object3D#childadded
 * @type {Object}
 */
const _childaddedEvent = { type: "childadded", child: null };

/**
 * 当移除子对象时触发的事件
 * Fires when a child object has been removed.
 *
 * @event Object3D#childremoved
 * @type {Object}
 */
const _childremovedEvent = { type: "childremoved", child: null };

/**
 * 这是 three.js 中大多数对象的基类，提供了一套在3D空间中操作对象的属性和方法
 * This is the base class for most objects in three.js and provides a set of
 * properties and methods for manipulating objects in 3D space.
 *
 * @augments EventDispatcher
 */
class Object3D extends EventDispatcher {
  /**
   * 构造一个新的3D对象
   * Constructs a new 3D object.
   */
  constructor() {
    // 调用父类构造函数
    super();

    /**
     * 此标志可用于类型检测
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isObject3D = true;

    /**
     * 3D对象的ID
     * The ID of the 3D object.
     *
     * @name Object3D#id
     * @type {number}
     * @readonly
     */
    Object.defineProperty(this, "id", { value: _object3DId++ });

    /**
     * 3D对象的UUID（通用唯一标识符）
     * The UUID of the 3D object.
     *
     * @type {string}
     * @readonly
     */
    this.uuid = generateUUID();

    /**
     * 3D对象的名称
     * The name of the 3D object.
     *
     * @type {string}
     */
    this.name = "";

    /**
     * 类型属性用于在序列化/反序列化上下文中检测对象类型
     * The type property is used for detecting the object type
     * in context of serialization/deserialization.
     *
     * @type {string}
     * @readonly
     */
    this.type = "Object3D";

    /**
     * 对父对象的引用
     * A reference to the parent object.
     *
     * @type {?Object3D}
     * @default null
     */
    this.parent = null;

    /**
     * 保存此实例的子3D对象的数组
     * An array holding the child 3D objects of this instance.
     *
     * @type {Array<Object3D>}
     */
    this.children = [];

    /**
     * 定义3D对象的"向上"方向，通过lookAt等方法影响方向
     * Defines the `up` direction of the 3D object which influences
     * the orientation via methods like {@link Object3D#lookAt}.
     *
     * 所有3D对象的默认值由 `Object3D.DEFAULT_UP` 定义
     * The default values for all 3D objects is defined by `Object3D.DEFAULT_UP`.
     *
     * @type {Vector3}
     */
    this.up = Object3D.DEFAULT_UP.clone();

    // 创建本地位置向量
    const position = new Vector3();
    // 创建本地旋转欧拉角
    const rotation = new Euler();
    // 创建本地旋转四元数
    const quaternion = new Quaternion();
    // 创建本地缩放向量，默认为(1,1,1)
    const scale = new Vector3(1, 1, 1);

    // 当旋转改变时的回调函数，将欧拉角转换为四元数
    function onRotationChange() {
      quaternion.setFromEuler(rotation, false);
    }

    // 当四元数改变时的回调函数，将四元数转换为欧拉角
    function onQuaternionChange() {
      rotation.setFromQuaternion(quaternion, undefined, false);
    }

    // 为旋转设置变化监听器
    rotation._onChange(onRotationChange);
    // 为四元数设置变化监听器
    quaternion._onChange(onQuaternionChange);

    // 定义对象的变换属性
    Object.defineProperties(this, {
      /**
       * 表示对象的本地位置
       * Represents the object's local position.
       *
       * @name Object3D#position
       * @type {Vector3}
       * @default (0,0,0)
       */
      position: {
        configurable: true,
        enumerable: true,
        value: position,
      },
      /**
       * 表示对象的本地旋转（欧拉角，以弧度为单位）
       * Represents the object's local rotation as Euler angles, in radians.
       *
       * @name Object3D#rotation
       * @type {Euler}
       * @default (0,0,0)
       */
      rotation: {
        configurable: true,
        enumerable: true,
        value: rotation,
      },
      /**
       * 表示对象的本地旋转（四元数）
       * Represents the object's local rotation as Quaternions.
       *
       * @name Object3D#quaternion
       * @type {Quaternion}
       */
      quaternion: {
        configurable: true,
        enumerable: true,
        value: quaternion,
      },
      /**
       * 表示对象的本地缩放
       * Represents the object's local scale.
       *
       * @name Object3D#scale
       * @type {Vector3}
       * @default (1,1,1)
       */
      scale: {
        configurable: true,
        enumerable: true,
        value: scale,
      },
      /**
       * 表示对象的模型视图矩阵
       * Represents the object's model-view matrix.
       *
       * @name Object3D#modelViewMatrix
       * @type {Matrix4}
       */
      modelViewMatrix: {
        value: new Matrix4(),
      },
      /**
       * 表示对象的法线矩阵
       * Represents the object's normal matrix.
       *
       * @name Object3D#normalMatrix
       * @type {Matrix3}
       */
      normalMatrix: {
        value: new Matrix3(),
      },
    });

    /**
     * 表示对象在本地空间中的变换矩阵
     * Represents the object's transformation matrix in local space.
     *
     * @type {Matrix4}
     */
    this.matrix = new Matrix4();

    /**
     * 表示对象在世界空间中的变换矩阵
     * 如果3D对象没有父对象，则与本地变换矩阵相同
     * Represents the object's transformation matrix in world space.
     * If the 3D object has no parent, then it's identical to the local transformation matrix
     *
     * @type {Matrix4}
     */
    this.matrixWorld = new Matrix4();

    /**
     * 当设置为 `true` 时，引擎每帧自动从位置、旋转和缩放计算本地矩阵
     * When set to `true`, the engine automatically computes the local matrix from position,
     * rotation and scale every frame.
     *
     * 所有3D对象的默认值由 `Object3D.DEFAULT_MATRIX_AUTO_UPDATE` 定义
     * The default values for all 3D objects is defined by `Object3D.DEFAULT_MATRIX_AUTO_UPDATE`.
     *
     * @type {boolean}
     * @default true
     */
    this.matrixAutoUpdate = Object3D.DEFAULT_MATRIX_AUTO_UPDATE;

    /**
     * 当设置为 `true` 时，引擎自动从当前本地矩阵和对象的变换层次结构计算世界矩阵
     * When set to `true`, the engine automatically computes the world matrix from the current local
     * matrix and the object's transformation hierarchy.
     *
     * 所有3D对象的默认值由 `Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE` 定义
     * The default values for all 3D objects is defined by `Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE`.
     *
     * @type {boolean}
     * @default true
     */
    this.matrixWorldAutoUpdate = Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE; // 由渲染器检查

    /**
     * 当设置为 `true` 时，在该帧中计算世界矩阵并将此属性重置为 `false`
     * When set to `true`, it calculates the world matrix in that frame and resets this property
     * to `false`.
     *
     * @type {boolean}
     * @default false
     */
    this.matrixWorldNeedsUpdate = false;

    /**
     * 3D对象的图层成员关系。只有当3D对象与使用的相机至少有一个共同图层时，它才可见
     * 此属性也可用于在使用 {@link Raycaster} 时过滤射线相交测试中不需要的对象
     * The layer membership of the 3D object. The 3D object is only visible if it has
     * at least one layer in common with the camera in use. This property can also be
     * used to filter out unwanted objects in ray-intersection tests when using {@link Raycaster}.
     *
     * @type {Layers}
     */
    this.layers = new Layers();

    /**
     * 当设置为 `true` 时，3D对象被渲染
     * When set to `true`, the 3D object gets rendered.
     *
     * @type {boolean}
     * @default true
     */
    this.visible = true;

    /**
     * 当设置为 `true` 时，3D对象被渲染到阴影贴图中
     * When set to `true`, the 3D object gets rendered into shadow maps.
     *
     * @type {boolean}
     * @default false
     */
    this.castShadow = false;

    /**
     * 当设置为 `true` 时，3D对象受场景中阴影的影响
     * When set to `true`, the 3D object is affected by shadows in the scene.
     *
     * @type {boolean}
     * @default false
     */
    this.receiveShadow = false;

    /**
     * 当设置为 `true` 时，3D对象受视锥体剔除的影响
     * When set to `true`, the 3D object is honored by view frustum culling.
     *
     * @type {boolean}
     * @default true
     */
    this.frustumCulled = true;

    /**
     * 此值允许覆盖场景图对象的默认渲染顺序，尽管不透明和透明对象仍然独立排序
     * 当为 {@link Group} 实例设置此属性时，所有后代对象将一起排序和渲染
     * 排序从最低到最高渲染顺序
     * This value allows the default rendering order of scene graph objects to be
     * overridden although opaque and transparent objects remain sorted independently.
     * When this property is set for an instance of {@link Group},all descendants
     * objects will be sorted and rendered together. Sorting is from lowest to highest
     * render order.
     *
     * @type {number}
     * @default 0
     */
    this.renderOrder = 0;

    /**
     * 保存3D对象动画剪辑的数组
     * An array holding the animation clips of the 3D object.
     *
     * @type {Array<AnimationClip>}
     */
    this.animations = [];

    /**
     * 渲染到深度贴图时使用的自定义深度材质。只能在网格上下文中使用
     * 当使用 {@link DirectionalLight} 或 {@link SpotLight} 投射阴影时，
     * 如果在顶点着色器中修改顶点位置，必须指定自定义深度材质以获得正确的阴影
     * Custom depth material to be used when rendering to the depth map. Can only be used
     * in context of meshes. When shadow-casting with a {@link DirectionalLight} or {@link SpotLight},
     * if you are modifying vertex positions in the vertex shader you must specify a custom depth
     * material for proper shadows.
     *
     * 仅在 {@link WebGLRenderer} 上下文中相关
     * Only relevant in context of {@link WebGLRenderer}.
     *
     * @type {(Material|undefined)}
     * @default undefined
     */
    this.customDepthMaterial = undefined;

    /**
     * 与 {@link Object3D#customDepthMaterial} 相同，但用于 {@link PointLight}
     * Same as {@link Object3D#customDepthMaterial}, but used with {@link PointLight}.
     *
     * 仅在 {@link WebGLRenderer} 上下文中相关
     * Only relevant in context of {@link WebGLRenderer}.
     *
     * @type {(Material|undefined)}
     * @default undefined
     */
    this.customDistanceMaterial = undefined;

    /**
     * 可用于存储有关3D对象的自定义数据的对象
     * 它不应该持有对函数的引用，因为这些不会被克隆
     * An object that can be used to store custom data about the 3D object. It
     * should not hold references to functions as these will not be cloned.
     *
     * @type {Object}
     */
    this.userData = {};
  } // 构造函数结束

  /**
   * 在3D对象渲染到阴影贴图之前立即执行的回调
   * A callback that is executed immediately before a 3D object is rendered to a shadow map.
   *
   * @param {Renderer|WebGLRenderer} renderer - 渲染器
   * @param {Object3D} object - 3D对象
   * @param {Camera} camera - 用于渲染场景的相机
   * @param {Camera} shadowCamera - 阴影相机
   * @param {BufferGeometry} geometry - 3D对象的几何体
   * @param {Material} depthMaterial - 深度材质
   * @param {Object} group - 几何体组数据
   */
  onBeforeShadow(/* renderer, object, camera, shadowCamera, geometry, depthMaterial, group */) {}

  /**
   * 在3D对象渲染到阴影贴图之后立即执行的回调
   * A callback that is executed immediately after a 3D object is rendered to a shadow map.
   *
   * @param {Renderer|WebGLRenderer} renderer - 渲染器
   * @param {Object3D} object - 3D对象
   * @param {Camera} camera - 用于渲染场景的相机
   * @param {Camera} shadowCamera - 阴影相机
   * @param {BufferGeometry} geometry - 3D对象的几何体
   * @param {Material} depthMaterial - 深度材质
   * @param {Object} group - 几何体组数据
   */
  onAfterShadow(/* renderer, object, camera, shadowCamera, geometry, depthMaterial, group */) {}

  /**
   * 在3D对象渲染之前立即执行的回调
   * A callback that is executed immediately before a 3D object is rendered.
   *
   * @param {Renderer|WebGLRenderer} renderer - 渲染器
   * @param {Object3D} object - 3D对象
   * @param {Camera} camera - 用于渲染场景的相机
   * @param {BufferGeometry} geometry - 3D对象的几何体
   * @param {Material} material - 3D对象的材质
   * @param {Object} group - 几何体组数据
   */
  onBeforeRender(/* renderer, scene, camera, geometry, material, group */) {}

  /**
   * 在3D对象渲染之后立即执行的回调
   * A callback that is executed immediately after a 3D object is rendered.
   *
   * @param {Renderer|WebGLRenderer} renderer - 渲染器
   * @param {Object3D} object - 3D对象
   * @param {Camera} camera - 用于渲染场景的相机
   * @param {BufferGeometry} geometry - 3D对象的几何体
   * @param {Material} material - 3D对象的材质
   * @param {Object} group - 几何体组数据
   */
  onAfterRender(/* renderer, scene, camera, geometry, material, group */) {}

  /**
   * 将给定的变换矩阵应用到对象并更新对象的位置、旋转和缩放
   * Applies the given transformation matrix to the object and updates the object's position,
   * rotation and scale.
   *
   * @param {Matrix4} matrix - 变换矩阵
   */
  applyMatrix4(matrix) {
    // 如果启用了矩阵自动更新，先更新矩阵
    if (this.matrixAutoUpdate) this.updateMatrix();

    // 将变换矩阵预乘到当前矩阵
    this.matrix.premultiply(matrix);

    // 将矩阵分解为位置、四元数和缩放
    this.matrix.decompose(this.position, this.quaternion, this.scale);
  }

  /**
   * 将给定四元数表示的旋转应用到3D对象
   * Applies a rotation represented by given the quaternion to the 3D object.
   *
   * @param {Quaternion} q - 四元数
   * @return {Object3D} 对此实例的引用
   */
  applyQuaternion(q) {
    // 将四元数预乘到当前四元数
    this.quaternion.premultiply(q);

    return this;
  }

  /**
   * 将给定的轴/角度对表示的旋转设置到3D对象
   * Sets the given rotation represented as an axis/angle couple to the 3D object.
   *
   * @param {Vector3} axis - （标准化的）轴向量
   * @param {number} angle - 角度（弧度）
   */
  setRotationFromAxisAngle(axis, angle) {
    // 假设轴已标准化
    // assumes axis is normalized

    this.quaternion.setFromAxisAngle(axis, angle);
  }

  /**
   * 将给定的欧拉角表示的旋转设置到3D对象
   * Sets the given rotation represented as Euler angles to the 3D object.
   *
   * @param {Euler} euler - 欧拉角
   */
  setRotationFromEuler(euler) {
    this.quaternion.setFromEuler(euler, true);
  }

  /**
   * 将给定的旋转矩阵表示的旋转设置到3D对象
   * Sets the given rotation represented as rotation matrix to the 3D object.
   *
   * @param {Matrix4} m - 虽然期望4x4矩阵，但上3x3部分必须是纯旋转矩阵（即未缩放）
   */
  setRotationFromMatrix(m) {
    // 假设m的上3x3是纯旋转矩阵（即未缩放）
    // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

    this.quaternion.setFromRotationMatrix(m);
  }

  /**
   * 将给定的四元数表示的旋转设置到3D对象
   * Sets the given rotation represented as a Quaternion to the 3D object.
   *
   * @param {Quaternion} q - 四元数
   */
  setRotationFromQuaternion(q) {
    // 假设q已标准化
    // assumes q is normalized

    this.quaternion.copy(q);
  }

  /**
   * 在本地空间中沿轴旋转3D对象
   * Rotates the 3D object along an axis in local space.
   *
   * @param {Vector3} axis - （标准化的）轴向量
   * @param {number} angle - 角度（弧度）
   * @return {Object3D} 对此实例的引用
   */
  rotateOnAxis(axis, angle) {
    // 在对象空间中沿轴旋转对象
    // 假设轴已标准化
    // rotate object on axis in object space
    // axis is assumed to be normalized

    _q1.setFromAxisAngle(axis, angle);

    this.quaternion.multiply(_q1);

    return this;
  }

  /**
   * 在世界空间中沿轴旋转3D对象
   * Rotates the 3D object along an axis in world space.
   *
   * @param {Vector3} axis - （标准化的）轴向量
   * @param {number} angle - 角度（弧度）
   * @return {Object3D} 对此实例的引用
   */
  rotateOnWorldAxis(axis, angle) {
    // 在世界空间中沿轴旋转对象
    // 假设轴已标准化
    // 方法假设没有旋转的父对象
    // rotate object on axis in world space
    // axis is assumed to be normalized
    // method assumes no rotated parent

    _q1.setFromAxisAngle(axis, angle);

    this.quaternion.premultiply(_q1);

    return this;
  }

  /**
   * 在本地空间中绕X轴旋转3D对象
   * Rotates the 3D object around its X axis in local space.
   *
   * @param {number} angle - 角度（弧度）
   * @return {Object3D} 对此实例的引用
   */
  rotateX(angle) {
    return this.rotateOnAxis(_xAxis, angle);
  }

  /**
   * 在本地空间中绕Y轴旋转3D对象
   * Rotates the 3D object around its Y axis in local space.
   *
   * @param {number} angle - 角度（弧度）
   * @return {Object3D} 对此实例的引用
   */
  rotateY(angle) {
    return this.rotateOnAxis(_yAxis, angle);
  }

  /**
   * 在本地空间中绕Z轴旋转3D对象
   * Rotates the 3D object around its Z axis in local space.
   *
   * @param {number} angle - 角度（弧度）
   * @return {Object3D} 对此实例的引用
   */
  rotateZ(angle) {
    return this.rotateOnAxis(_zAxis, angle);
  }

  /**
   * 在本地空间中沿给定轴平移3D对象一定距离
   * Translate the 3D object by a distance along the given axis in local space.
   *
   * @param {Vector3} axis - （标准化的）轴向量
   * @param {number} distance - 距离（世界单位）
   * @return {Object3D} 对此实例的引用
   */
  translateOnAxis(axis, distance) {
    // 在对象空间中沿轴平移对象一定距离
    // 假设轴已标准化
    // translate object by distance along axis in object space
    // axis is assumed to be normalized

    _v1.copy(axis).applyQuaternion(this.quaternion);

    this.position.add(_v1.multiplyScalar(distance));

    return this;
  }

  /**
   * 在本地空间中沿X轴平移3D对象一定距离
   * Translate the 3D object by a distance along its X-axis in local space.
   *
   * @param {number} distance - 距离（世界单位）
   * @return {Object3D} 对此实例的引用
   */
  translateX(distance) {
    return this.translateOnAxis(_xAxis, distance);
  }

  /**
   * 在本地空间中沿Y轴平移3D对象一定距离
   * Translate the 3D object by a distance along its Y-axis in local space.
   *
   * @param {number} distance - 距离（世界单位）
   * @return {Object3D} 对此实例的引用
   */
  translateY(distance) {
    return this.translateOnAxis(_yAxis, distance);
  }

  /**
   * 在本地空间中沿Z轴平移3D对象一定距离
   * Translate the 3D object by a distance along its Z-axis in local space.
   *
   * @param {number} distance - 距离（世界单位）
   * @return {Object3D} 对此实例的引用
   */
  translateZ(distance) {
    return this.translateOnAxis(_zAxis, distance);
  }

  /**
   * 将给定向量从此3D对象的本地空间转换为世界空间
   * Converts the given vector from this 3D object's local space to world space.
   *
   * @param {Vector3} vector - 要转换的向量
   * @return {Vector3} 转换后的向量
   */
  localToWorld(vector) {
    // 更新世界矩阵
    this.updateWorldMatrix(true, false);

    return vector.applyMatrix4(this.matrixWorld);
  }

  /**
   * 将给定向量从此3D对象的世界空间转换为本地空间
   * Converts the given vector from this 3D object's word space to local space.
   *
   * @param {Vector3} vector - 要转换的向量
   * @return {Vector3} 转换后的向量
   */
  worldToLocal(vector) {
    // 更新世界矩阵
    this.updateWorldMatrix(true, false);

    return vector.applyMatrix4(_m1.copy(this.matrixWorld).invert());
  }

  /**
   * 旋转对象以面向世界空间中的一个点
   * Rotates the object to face a point in world space.
   *
   * 此方法不支持具有非均匀缩放父对象的对象
   * This method does not support objects having non-uniformly-scaled parent(s).
   *
   * @param {number|Vector3} x - 世界空间中的x坐标。或者，表示世界空间中位置的向量
   * @param {number} [y] - 世界空间中的y坐标
   * @param {number} [z] - 世界空间中的z坐标
   */
  lookAt(x, y, z) {
    // 此方法不支持具有非均匀缩放父对象的对象
    // This method does not support objects having non-uniformly-scaled parent(s)

    // 如果x是Vector3，直接复制；否则设置坐标
    if (x.isVector3) {
      _target.copy(x);
    } else {
      _target.set(x, y, z);
    }

    // 获取父对象引用
    const parent = this.parent;

    // 更新世界矩阵
    this.updateWorldMatrix(true, false);

    // 从世界矩阵中提取位置
    _position.setFromMatrixPosition(this.matrixWorld);

    // 根据对象类型设置lookAt方向
    if (this.isCamera || this.isLight) {
      _m1.lookAt(_position, _target, this.up);
    } else {
      _m1.lookAt(_target, _position, this.up);
    }

    // 从旋转矩阵设置四元数
    this.quaternion.setFromRotationMatrix(_m1);

    // 如果有父对象，需要考虑父对象的旋转
    if (parent) {
      _m1.extractRotation(parent.matrixWorld);
      _q1.setFromRotationMatrix(_m1);
      this.quaternion.premultiply(_q1.invert());
    }
  }

  /**
   * 将给定的3D对象作为子对象添加到此3D对象。可以添加任意数量的对象
   * 传入的对象的任何当前父对象都将被移除，因为一个对象最多只能有一个父对象
   * Adds the given 3D object as a child to this 3D object. An arbitrary number of
   * objects may be added. Any current parent on an object passed in here will be
   * removed, since an object can have at most one parent.
   *
   * @fires Object3D#added
   * @fires Object3D#childadded
   * @param {Object3D} object - 要添加的3D对象
   * @return {Object3D} 对此实例的引用
   */
  add(object) {
    // 如果传入多个参数，递归添加每个对象
    if (arguments.length > 1) {
      for (let i = 0; i < arguments.length; i++) {
        this.add(arguments[i]);
      }

      return this;
    }

    // 不能将对象添加为自己的子对象
    if (object === this) {
      console.error("THREE.Object3D.add: object can't be added as a child of itself.", object);
      return this;
    }

    // 检查对象是否为Object3D实例
    if (object && object.isObject3D) {
      // 从当前父对象中移除
      object.removeFromParent();
      // 设置新的父对象
      object.parent = this;
      // 添加到子对象数组
      this.children.push(object);

      // 触发添加事件
      object.dispatchEvent(_addedEvent);

      // 触发子对象添加事件
      _childaddedEvent.child = object;
      this.dispatchEvent(_childaddedEvent);
      _childaddedEvent.child = null;
    } else {
      console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.", object);
    }

    return this;
  }

  /**
   * 从此3D对象中移除给定的3D子对象。可以移除任意数量的对象
   * Removes the given 3D object as child from this 3D object.
   * An arbitrary number of objects may be removed.
   *
   * @fires Object3D#removed
   * @fires Object3D#childremoved
   * @param {Object3D} object - 要移除的3D对象
   * @return {Object3D} 对此实例的引用
   */
  remove(object) {
    // 如果传入多个参数，递归移除每个对象
    if (arguments.length > 1) {
      for (let i = 0; i < arguments.length; i++) {
        this.remove(arguments[i]);
      }

      return this;
    }

    // 查找对象在子对象数组中的索引
    const index = this.children.indexOf(object);

    // 如果找到对象，进行移除操作
    if (index !== -1) {
      // 清除父对象引用
      object.parent = null;
      // 从子对象数组中移除
      this.children.splice(index, 1);

      // 触发移除事件
      object.dispatchEvent(_removedEvent);

      // 触发子对象移除事件
      _childremovedEvent.child = object;
      this.dispatchEvent(_childremovedEvent);
      _childremovedEvent.child = null;
    }

    return this;
  }

  /**
   * 从当前父对象中移除此3D对象
   * Removes this 3D object from its current parent.
   *
   * @fires Object3D#removed
   * @fires Object3D#childremoved
   * @return {Object3D} 对此实例的引用
   */
  removeFromParent() {
    // 获取父对象引用
    const parent = this.parent;

    // 如果有父对象，从父对象中移除自己
    if (parent !== null) {
      parent.remove(this);
    }

    return this;
  }

  /**
   * 移除所有子对象
   * Removes all child objects.
   *
   * @fires Object3D#removed
   * @fires Object3D#childremoved
   * @return {Object3D} 对此实例的引用
   */
  clear() {
    // 使用展开运算符移除所有子对象
    return this.remove(...this.children);
  }

  /**
   * 将给定的3D对象作为此3D对象的子对象添加，同时保持对象的世界变换
   * 此方法不支持具有非均匀缩放节点的场景图
   * Adds the given 3D object as a child of this 3D object, while maintaining the object's world
   * transform. This method does not support scene graphs having non-uniformly-scaled nodes(s).
   *
   * @fires Object3D#added
   * @fires Object3D#childadded
   * @param {Object3D} object - 要附加的3D对象
   * @return {Object3D} 对此实例的引用
   */
  attach(object) {
    // 将对象作为此对象的子对象添加，同时保持对象的世界变换
    // adds object as a child of this, while maintaining the object's world transform

    // 注意：此方法不支持具有非均匀缩放节点的场景图
    // Note: This method does not support scene graphs having non-uniformly-scaled nodes(s)

    // 更新此对象的世界矩阵
    this.updateWorldMatrix(true, false);

    // 计算逆世界矩阵
    _m1.copy(this.matrixWorld).invert();

    // 如果对象有父对象，需要考虑父对象的变换
    if (object.parent !== null) {
      object.parent.updateWorldMatrix(true, false);

      _m1.multiply(object.parent.matrixWorld);
    }

    // 应用变换矩阵
    object.applyMatrix4(_m1);

    // 从原父对象中移除并设置新的父子关系
    object.removeFromParent();
    object.parent = this;
    this.children.push(object);

    // 更新对象的世界矩阵
    object.updateWorldMatrix(false, true);

    // 触发添加事件
    object.dispatchEvent(_addedEvent);

    // 触发子对象添加事件
    _childaddedEvent.child = object;
    this.dispatchEvent(_childaddedEvent);
    _childaddedEvent.child = null;

    return this;
  }

  /**
   * 搜索3D对象及其子对象，从3D对象本身开始，返回第一个匹配ID的对象
   * Searches through the 3D object and its children, starting with the 3D object
   * itself, and returns the first with a matching ID.
   *
   * @param {number} id - ID
   * @return {Object3D|undefined} 找到的3D对象。如果没有找到3D对象则返回 `undefined`
   */
  getObjectById(id) {
    return this.getObjectByProperty("id", id);
  }

  /**
   * 搜索3D对象及其子对象，从3D对象本身开始，返回第一个匹配名称的对象
   * Searches through the 3D object and its children, starting with the 3D object
   * itself, and returns the first with a matching name.
   *
   * @param {string} name - 名称
   * @return {Object3D|undefined} 找到的3D对象。如果没有找到3D对象则返回 `undefined`
   */
  getObjectByName(name) {
    return this.getObjectByProperty("name", name);
  }

  /**
   * 搜索3D对象及其子对象，从3D对象本身开始，返回第一个匹配属性值的对象
   * Searches through the 3D object and its children, starting with the 3D object
   * itself, and returns the first with a matching property value.
   *
   * @param {string} name - 属性名称
   * @param {any} value - 属性值
   * @return {Object3D|undefined} 找到的3D对象。如果没有找到3D对象则返回 `undefined`
   */
  getObjectByProperty(name, value) {
    // 检查当前对象是否匹配
    if (this[name] === value) return this;

    // 递归搜索子对象
    for (let i = 0, l = this.children.length; i < l; i++) {
      const child = this.children[i];
      const object = child.getObjectByProperty(name, value);

      if (object !== undefined) {
        return object;
      }
    }

    return undefined;
  }

  /**
   * 搜索3D对象及其子对象，从3D对象本身开始，返回所有匹配属性值的3D对象
   * Searches through the 3D object and its children, starting with the 3D object
   * itself, and returns all 3D objects with a matching property value.
   *
   * @param {string} name - 属性名称
   * @param {any} value - 属性值
   * @param {Array<Object3D>} result - 方法将结果存储在此数组中
   * @return {Array<Object3D>} 找到的3D对象数组
   */
  getObjectsByProperty(name, value, result = []) {
    // 如果当前对象匹配，添加到结果数组
    if (this[name] === value) result.push(this);

    // 获取子对象数组
    const children = this.children;

    // 递归搜索所有子对象
    for (let i = 0, l = children.length; i < l; i++) {
      children[i].getObjectsByProperty(name, value, result);
    }

    return result;
  }

  /**
   * 返回表示3D对象在世界空间中位置的向量
   * Returns a vector representing the position of the 3D object in world space.
   *
   * @param {Vector3} target - 存储结果的目标向量
   * @return {Vector3} 3D对象在世界空间中的位置
   */
  getWorldPosition(target) {
    // 更新世界矩阵
    this.updateWorldMatrix(true, false);

    // 从世界矩阵中提取位置
    return target.setFromMatrixPosition(this.matrixWorld);
  }

  /**
   * 返回表示3D对象在世界空间中旋转的四元数
   * Returns a Quaternion representing the position of the 3D object in world space.
   *
   * @param {Quaternion} target - 存储结果的目标四元数
   * @return {Quaternion} 3D对象在世界空间中的旋转
   */
  getWorldQuaternion(target) {
    // 更新世界矩阵
    this.updateWorldMatrix(true, false);

    // 分解世界矩阵以获取旋转
    this.matrixWorld.decompose(_position, target, _scale);

    return target;
  }

  /**
   * 返回表示3D对象在世界空间中缩放的向量
   * Returns a vector representing the scale of the 3D object in world space.
   *
   * @param {Vector3} target - 存储结果的目标向量
   * @return {Vector3} 3D对象在世界空间中的缩放
   */
  getWorldScale(target) {
    // 更新世界矩阵
    this.updateWorldMatrix(true, false);

    // 分解世界矩阵以获取缩放
    this.matrixWorld.decompose(_position, _quaternion, target);

    return target;
  }

  /**
   * 返回表示3D对象在世界空间中（"观察"）方向的向量
   * Returns a vector representing the ("look") direction of the 3D object in world space.
   *
   * @param {Vector3} target - 存储结果的目标向量
   * @return {Vector3} 3D对象在世界空间中的方向
   */
  getWorldDirection(target) {
    // 更新世界矩阵
    this.updateWorldMatrix(true, false);

    // 获取矩阵元素
    const e = this.matrixWorld.elements;

    // 提取Z轴方向并标准化
    return target.set(e[8], e[9], e[10]).normalize();
  }

  /**
   * 获取投射射线与此3D对象之间交点的抽象方法
   * 可渲染的3D对象如 {@link Mesh}、{@link Line} 或 {@link Points}
   * 实现此方法以便使用射线投射
   * Abstract method to get intersections between a casted ray and this
   * 3D object. Renderable 3D objects such as {@link Mesh}, {@link Line} or {@link Points}
   * implement this method in order to use raycasting.
   *
   * @abstract
   * @param {Raycaster} raycaster - 射线投射器
   * @param {Array<Object>} intersects - 保存方法结果的数组
   */
  raycast(/* raycaster, intersects */) {}

  /**
   * 在此3D对象及其所有后代上执行回调
   * Executes the callback on this 3D object and all descendants.
   *
   * 注意：不建议在回调内部修改场景图
   * Note: Modifying the scene graph inside the callback is discouraged.
   *
   * @param {Function} callback - 允许处理当前3D对象的回调函数
   */
  traverse(callback) {
    // 对当前对象执行回调
    callback(this);

    // 获取子对象数组
    const children = this.children;

    // 递归遍历所有子对象
    for (let i = 0, l = children.length; i < l; i++) {
      children[i].traverse(callback);
    }
  }

  /**
   * 类似于 {@link Object3D#traverse}，但回调只会对可见的3D对象执行
   * 不可见3D对象的后代不会被遍历
   * Like {@link Object3D#traverse}, but the callback will only be executed for visible 3D objects.
   * Descendants of invisible 3D objects are not traversed.
   *
   * 注意：不建议在回调内部修改场景图
   * Note: Modifying the scene graph inside the callback is discouraged.
   *
   * @param {Function} callback - 允许处理当前3D对象的回调函数
   */
  traverseVisible(callback) {
    // 如果对象不可见，直接返回
    if (this.visible === false) return;

    // 对当前对象执行回调
    callback(this);

    // 获取子对象数组
    const children = this.children;

    // 递归遍历所有可见的子对象
    for (let i = 0, l = children.length; i < l; i++) {
      children[i].traverseVisible(callback);
    }
  }

  /**
   * 类似于 {@link Object3D#traverse}，但回调只会对所有祖先执行
   * Like {@link Object3D#traverse}, but the callback will only be executed for all ancestors.
   *
   * 注意：不建议在回调内部修改场景图
   * Note: Modifying the scene graph inside the callback is discouraged.
   *
   * @param {Function} callback - 允许处理当前3D对象的回调函数
   */
  traverseAncestors(callback) {
    // 获取父对象引用
    const parent = this.parent;

    // 如果有父对象，对其执行回调并递归遍历
    if (parent !== null) {
      callback(parent);

      parent.traverseAncestors(callback);
    }
  }

  /**
   * 通过从当前位置、旋转和缩放值计算来更新本地空间中的变换矩阵
   * Updates the transformation matrix in local space by computing it from the current
   * position, rotation and scale values.
   */
  updateMatrix() {
    // 从位置、四元数和缩放组合矩阵
    this.matrix.compose(this.position, this.quaternion, this.scale);

    // 标记世界矩阵需要更新
    this.matrixWorldNeedsUpdate = true;
  }

  /**
   * 更新此3D对象及其后代在世界空间中的变换矩阵
   * Updates the transformation matrix in world space of this 3D objects and its descendants.
   *
   * 为确保正确的结果，此方法还会重新计算3D对象在本地空间中的变换矩阵
   * 本地和世界矩阵的计算可以通过 {@link Object3D#matrixAutoUpdate} 和
   * {@link Object3D#matrixWorldAutoUpdate} 标志控制，这两个标志默认都是 `true`
   * 如果需要更多控制更新矩阵过程，请将这些标志设置为 `false`
   * To ensure correct results, this method also recomputes the 3D object's transformation matrix in
   * local space. The computation of the local and world matrix can be controlled with the
   * {@link Object3D#matrixAutoUpdate} and {@link Object3D#matrixWorldAutoUpdate} flags which are both
   * `true` by default.  Set these flags to `false` if you need more control over the update matrix process.
   *
   * @param {boolean} [force=false] - 当设置为 `true` 时，即使 {@link Object3D#matrixWorldAutoUpdate} 设置为 `false`，也会强制重新计算世界矩阵
   */
  updateMatrixWorld(force) {
    // 如果启用了矩阵自动更新，先更新本地矩阵
    if (this.matrixAutoUpdate) this.updateMatrix();

    // 如果世界矩阵需要更新或强制更新
    if (this.matrixWorldNeedsUpdate || force) {
      if (this.matrixWorldAutoUpdate === true) {
        if (this.parent === null) {
          // 没有父对象，世界矩阵等于本地矩阵
          this.matrixWorld.copy(this.matrix);
        } else {
          // 有父对象，世界矩阵 = 父对象世界矩阵 × 本地矩阵
          this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
        }
      }

      // 重置更新标志
      this.matrixWorldNeedsUpdate = false;

      // 强制更新子对象
      force = true;
    }

    // 确保后代在需要时被更新
    // make sure descendants are updated if required

    const children = this.children;

    // 递归更新所有子对象的世界矩阵
    for (let i = 0, l = children.length; i < l; i++) {
      const child = children[i];

      child.updateMatrixWorld(force);
    }
  }

  /**
   * {@link Object3D#updateMatrixWorld} 的替代版本，对祖先和后代节点的更新有更多控制
   * An alternative version of {@link Object3D#updateMatrixWorld} with more control over the
   * update of ancestor and descendant nodes.
   *
   * @param {boolean} [updateParents=false] 是否应该更新祖先节点
   * @param {boolean} [updateChildren=false] 是否应该更新后代节点
   */
  updateWorldMatrix(updateParents, updateChildren) {
    // 获取父对象引用
    const parent = this.parent;

    // 如果需要更新父对象且父对象存在
    if (updateParents === true && parent !== null) {
      parent.updateWorldMatrix(true, false);
    }

    // 如果启用了矩阵自动更新，先更新本地矩阵
    if (this.matrixAutoUpdate) this.updateMatrix();

    // 如果启用了世界矩阵自动更新
    if (this.matrixWorldAutoUpdate === true) {
      if (this.parent === null) {
        // 没有父对象，世界矩阵等于本地矩阵
        this.matrixWorld.copy(this.matrix);
      } else {
        // 有父对象，世界矩阵 = 父对象世界矩阵 × 本地矩阵
        this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
      }
    }

    // 确保后代被更新
    // make sure descendants are updated

    if (updateChildren === true) {
      const children = this.children;

      // 递归更新所有子对象
      for (let i = 0, l = children.length; i < l; i++) {
        const child = children[i];

        child.updateWorldMatrix(false, true);
      }
    }
  }

  /**
   * 将3D对象序列化为JSON
   * Serializes the 3D object into JSON.
   *
   * @param {?(Object|string)} meta - 保存序列化元信息的可选值
   * @return {Object} 表示序列化3D对象的JSON对象
   * @see {@link ObjectLoader#parse}
   */
  toJSON(meta) {
    // 当从JSON.stringify调用时，meta是字符串
    // meta is a string when called from JSON.stringify
    const isRootObject = meta === undefined || typeof meta === "string";

    const output = {};

    // meta是用于收集几何体、材质的哈希表
    // 不提供它意味着这是被序列化的根对象
    // meta is a hash used to collect geometries, materials.
    // not providing it implies that this is the root object
    // being serialized.
    if (isRootObject) {
      // 初始化meta对象
      // initialize meta obj
      meta = {
        geometries: {},
        materials: {},
        textures: {},
        images: {},
        shapes: {},
        skeletons: {},
        animations: {},
        nodes: {},
      };

      output.metadata = {
        version: 4.7,
        type: "Object",
        generator: "Object3D.toJSON",
      };
    }

    // 标准Object3D序列化
    // standard Object3D serialization

    const object = {};

    // 设置基本属性
    object.uuid = this.uuid;
    object.type = this.type;

    // 只序列化非默认值
    if (this.name !== "") object.name = this.name;
    if (this.castShadow === true) object.castShadow = true;
    if (this.receiveShadow === true) object.receiveShadow = true;
    if (this.visible === false) object.visible = false;
    if (this.frustumCulled === false) object.frustumCulled = false;
    if (this.renderOrder !== 0) object.renderOrder = this.renderOrder;
    if (Object.keys(this.userData).length > 0) object.userData = this.userData;

    // 序列化图层、矩阵和向上方向
    object.layers = this.layers.mask;
    object.matrix = this.matrix.toArray();
    object.up = this.up.toArray();

    // 只在非默认值时序列化
    if (this.matrixAutoUpdate === false) object.matrixAutoUpdate = false;

    // 对象特定属性
    // object specific properties

    // 如果是实例化网格
    if (this.isInstancedMesh) {
      object.type = "InstancedMesh";
      object.count = this.count;
      object.instanceMatrix = this.instanceMatrix.toJSON();
      if (this.instanceColor !== null) object.instanceColor = this.instanceColor.toJSON();
    }

    // 如果是批处理网格
    if (this.isBatchedMesh) {
      object.type = "BatchedMesh";
      object.perObjectFrustumCulled = this.perObjectFrustumCulled;
      object.sortObjects = this.sortObjects;

      object.drawRanges = this._drawRanges;
      object.reservedRanges = this._reservedRanges;

      object.geometryInfo = this._geometryInfo.map((info) => ({
        ...info,
        boundingBox: info.boundingBox ? info.boundingBox.toJSON() : undefined,
        boundingSphere: info.boundingSphere ? info.boundingSphere.toJSON() : undefined,
      }));
      object.instanceInfo = this._instanceInfo.map((info) => ({ ...info }));

      object.availableInstanceIds = this._availableInstanceIds.slice();
      object.availableGeometryIds = this._availableGeometryIds.slice();

      object.nextIndexStart = this._nextIndexStart;
      object.nextVertexStart = this._nextVertexStart;
      object.geometryCount = this._geometryCount;

      object.maxInstanceCount = this._maxInstanceCount;
      object.maxVertexCount = this._maxVertexCount;
      object.maxIndexCount = this._maxIndexCount;

      object.geometryInitialized = this._geometryInitialized;

      object.matricesTexture = this._matricesTexture.toJSON(meta);

      object.indirectTexture = this._indirectTexture.toJSON(meta);

      // 序列化颜色纹理（如果存在）
      if (this._colorsTexture !== null) {
        object.colorsTexture = this._colorsTexture.toJSON(meta);
      }

      // 序列化包围球（如果存在）
      if (this.boundingSphere !== null) {
        object.boundingSphere = this.boundingSphere.toJSON();
      }

      // 序列化包围盒（如果存在）
      if (this.boundingBox !== null) {
        object.boundingBox = this.boundingBox.toJSON();
      }
    }

    // 序列化辅助函数
    // Serialization helper function

    // 序列化元素到库中，避免重复序列化相同的元素
    function serialize(library, element) {
      if (library[element.uuid] === undefined) {
        library[element.uuid] = element.toJSON(meta);
      }

      return element.uuid;
    }

    // 如果是场景对象，序列化场景特定属性
    if (this.isScene) {
      // 序列化背景
      if (this.background) {
        if (this.background.isColor) {
          // 背景是颜色
          object.background = this.background.toJSON();
        } else if (this.background.isTexture) {
          // 背景是纹理
          object.background = this.background.toJSON(meta).uuid;
        }
      }

      // 序列化环境贴图
      if (this.environment && this.environment.isTexture && this.environment.isRenderTargetTexture !== true) {
        object.environment = this.environment.toJSON(meta).uuid;
      }
    } else if (this.isMesh || this.isLine || this.isPoints) {
      // 如果是网格、线条或点对象，序列化几何体
      object.geometry = serialize(meta.geometries, this.geometry);

      // 获取几何体参数
      const parameters = this.geometry.parameters;

      // 如果几何体有形状参数，序列化形状
      if (parameters !== undefined && parameters.shapes !== undefined) {
        const shapes = parameters.shapes;

        if (Array.isArray(shapes)) {
          // 形状是数组，遍历序列化每个形状
          for (let i = 0, l = shapes.length; i < l; i++) {
            const shape = shapes[i];

            serialize(meta.shapes, shape);
          }
        } else {
          // 形状是单个对象
          serialize(meta.shapes, shapes);
        }
      }
    }

    // 如果是蒙皮网格，序列化蒙皮相关属性
    if (this.isSkinnedMesh) {
      object.bindMode = this.bindMode; // 绑定模式
      object.bindMatrix = this.bindMatrix.toArray(); // 绑定矩阵

      // 如果有骨骼，序列化骨骼
      if (this.skeleton !== undefined) {
        serialize(meta.skeletons, this.skeleton);

        object.skeleton = this.skeleton.uuid;
      }
    }

    // 序列化材质
    if (this.material !== undefined) {
      if (Array.isArray(this.material)) {
        // 材质是数组（多材质）
        const uuids = [];

        for (let i = 0, l = this.material.length; i < l; i++) {
          uuids.push(serialize(meta.materials, this.material[i]));
        }

        object.material = uuids;
      } else {
        // 材质是单个对象
        object.material = serialize(meta.materials, this.material);
      }
    }

    // 序列化子对象
    // Serialize children

    if (this.children.length > 0) {
      object.children = [];

      // 递归序列化所有子对象
      for (let i = 0; i < this.children.length; i++) {
        object.children.push(this.children[i].toJSON(meta).object);
      }
    }

    // 序列化动画
    // Serialize animations

    if (this.animations.length > 0) {
      object.animations = [];

      // 序列化所有动画剪辑
      for (let i = 0; i < this.animations.length; i++) {
        const animation = this.animations[i];

        object.animations.push(serialize(meta.animations, animation));
      }
    }

    // 如果是根对象，收集所有序列化的资源
    if (isRootObject) {
      // 从缓存中提取各种资源
      const geometries = extractFromCache(meta.geometries);
      const materials = extractFromCache(meta.materials);
      const textures = extractFromCache(meta.textures);
      const images = extractFromCache(meta.images);
      const shapes = extractFromCache(meta.shapes);
      const skeletons = extractFromCache(meta.skeletons);
      const animations = extractFromCache(meta.animations);
      const nodes = extractFromCache(meta.nodes);

      // 只有当资源存在时才添加到输出中
      if (geometries.length > 0) output.geometries = geometries;
      if (materials.length > 0) output.materials = materials;
      if (textures.length > 0) output.textures = textures;
      if (images.length > 0) output.images = images;
      if (shapes.length > 0) output.shapes = shapes;
      if (skeletons.length > 0) output.skeletons = skeletons;
      if (animations.length > 0) output.animations = animations;
      if (nodes.length > 0) output.nodes = nodes;
    }

    // 设置序列化的对象
    output.object = object;

    return output;

    // 从缓存哈希表中提取数据
    // 移除每个项目的元数据
    // 并作为数组返回
    // extract data from the cache hash
    // remove metadata on each item
    // and return as array
    function extractFromCache(cache) {
      const values = [];
      // 遍历缓存中的所有项目
      for (const key in cache) {
        const data = cache[key];
        // 删除元数据以减少输出大小
        delete data.metadata;
        values.push(data);
      }

      return values;
    }
  }

  /**
   * 返回一个从此实例复制值的新3D对象
   * Returns a new 3D object with copied values from this instance.
   *
   * @param {boolean} [recursive=true] - 当设置为 `true` 时，3D对象的后代也会被克隆
   * @return {Object3D} 此实例的克隆
   */
  clone(recursive) {
    return new this.constructor().copy(this, recursive);
  }

  /**
   * 将给定3D对象的值复制到此实例
   * Copies the values of the given 3D object to this instance.
   *
   * @param {Object3D} source - 要复制的3D对象
   * @param {boolean} [recursive=true] - 当设置为 `true` 时，3D对象的后代会被克隆
   * @return {Object3D} 对此实例的引用
   */
  copy(source, recursive = true) {
    // 复制基本属性
    this.name = source.name;

    // 复制向上方向
    this.up.copy(source.up);

    // 复制变换属性
    this.position.copy(source.position);
    this.rotation.order = source.rotation.order;
    this.quaternion.copy(source.quaternion);
    this.scale.copy(source.scale);

    // 复制矩阵
    this.matrix.copy(source.matrix);
    this.matrixWorld.copy(source.matrixWorld);

    // 复制矩阵更新标志
    this.matrixAutoUpdate = source.matrixAutoUpdate;

    this.matrixWorldAutoUpdate = source.matrixWorldAutoUpdate;
    this.matrixWorldNeedsUpdate = source.matrixWorldNeedsUpdate;

    // 复制渲染相关属性
    this.layers.mask = source.layers.mask;
    this.visible = source.visible;

    // 复制阴影属性
    this.castShadow = source.castShadow;
    this.receiveShadow = source.receiveShadow;

    // 复制其他渲染属性
    this.frustumCulled = source.frustumCulled;
    this.renderOrder = source.renderOrder;

    // 复制动画数组（浅拷贝）
    this.animations = source.animations.slice();

    // 深拷贝用户数据
    this.userData = JSON.parse(JSON.stringify(source.userData));

    // 如果需要递归复制子对象
    if (recursive === true) {
      for (let i = 0; i < source.children.length; i++) {
        const child = source.children[i];
        this.add(child.clone());
      }
    }

    return this;
  }
}

/**
 * 对象的默认向上方向，也用作 {@link DirectionalLight} 和 {@link HemisphereLight} 的默认位置
 * The default up direction for objects, also used as the default
 * position for {@link DirectionalLight} and {@link HemisphereLight}.
 *
 * @static
 * @type {Vector3}
 * @default (0,1,0)
 */
Object3D.DEFAULT_UP = /*@__PURE__*/ new Vector3(0, 1, 0);

/**
 * 新创建的3D对象的 {@link Object3D#matrixAutoUpdate} 默认设置
 * The default setting for {@link Object3D#matrixAutoUpdate} for
 * newly created 3D objects.
 *
 * @static
 * @type {boolean}
 * @default true
 */
Object3D.DEFAULT_MATRIX_AUTO_UPDATE = true;

/**
 * 新创建的3D对象的 {@link Object3D#matrixWorldAutoUpdate} 默认设置
 * The default setting for {@link Object3D#matrixWorldAutoUpdate} for
 * newly created 3D objects.
 *
 * @static
 * @type {boolean}
 * @default true
 */
Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE = true;

// 导出Object3D类
export { Object3D };
