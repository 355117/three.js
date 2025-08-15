// 导入 4x4 矩阵类
import { Matrix4 } from "../math/Matrix4.js";
// 导入射线类
import { Ray } from "../math/Ray.js";
// 导入层级类
import { Layers } from "./Layers.js";

// 用于射线投射计算的临时矩阵（使用 /*@__PURE__*/ 注释进行优化标记）
const _matrix = /*@__PURE__*/ new Matrix4();

/**
 * 射线投射器类
 *
 * 这个类用于辅助射线投射（Raycasting）操作。射线投射是 3D 图形学中的一个重要概念，
 * 主要用于以下场景：
 *
 * 1. 鼠标拾取（Mouse Picking）：确定鼠标在 3D 空间中指向哪个对象
 * 2. 碰撞检测：检测射线与 3D 对象的交点
 * 3. 可见性测试：确定从某个点是否能看到另一个点
 * 4. 路径查找：在游戏中寻找从一点到另一点的路径
 * 5. 光线追踪：模拟光线在场景中的传播
 *
 * 射线投射的工作原理：
 * - 从一个起点（origin）发出一条射线
 * - 射线有一个方向（direction）
 * - 检测射线与场景中对象的交点
 * - 返回交点信息（距离、位置、法线等）
 */
class Raycaster {
  /**
   * 构造一个新的射线投射器
   *
   * @param {Vector3} origin - 射线的起点向量
   * @param {Vector3} direction - 射线的方向向量（应该是标准化的）
   * @param {number} [near=0] - 近距离限制，所有返回的结果都比这个距离远。near 不能为负数
   * @param {number} [far=Infinity] - 远距离限制，所有返回的结果都比这个距离近。far 不能小于 near
   */
  constructor(origin, direction, near = 0, far = Infinity) {
    /**
     * 用于射线投射的射线对象
     *
     * 射线由起点和方向定义，是射线投射的核心组件。
     *
     * @type {Ray}
     */
    this.ray = new Ray(origin, direction);

    /**
     * 近距离限制
     *
     * 所有返回的结果都比这个距离远。这用于排除过于接近射线起点的交点。
     * near 不能为负数，因为负距离在射线投射中没有意义。
     *
     * @type {number}
     * @default 0
     */
    this.near = near;

    /**
     * 远距离限制
     *
     * 所有返回的结果都比这个距离近。这用于限制射线投射的范围，
     * 提高性能并排除过远的交点。far 不能小于 near。
     *
     * @type {number}
     * @default Infinity
     */
    this.far = far;

    /**
     * 相机对象
     *
     * 当对视图相关对象（如广告牌对象、精灵等）进行射线投射时使用的相机。
     * 这个字段可以手动设置，或者在调用 `setFromCamera()` 时自动设置。
     *
     * 视图相关对象的特点：
     * - 它们的外观或行为依赖于观察者的位置
     * - 例如：精灵总是面向相机，广告牌对象会根据相机位置调整朝向
     *
     * @type {?Camera}
     * @default null
     */
    this.camera = null;

    /**
     * 层级过滤器
     *
     * 允许在执行交点测试时选择性地忽略 3D 对象。
     * 只有与射线投射器共享至少一个层级的对象才会被检测。
     *
     * 使用示例：
     * ```js
     * // 设置射线投射器只检测第 1 层的对象
     * raycaster.layers.set( 1 );
     * // 将对象添加到第 1 层
     * object.layers.enable( 1 );
     * ```
     *
     * 这种机制非常有用，可以：
     * - 创建不同的交互层级（UI层、游戏对象层等）
     * - 提高性能（只检测相关对象）
     * - 实现复杂的选择逻辑
     *
     * @type {Layers}
     */
    this.layers = new Layers();

    /**
     * 射线投射参数配置对象
     *
     * 这个对象配置射线投射的行为，针对不同类型的对象有不同的参数。
     *
     * 结构如下：
     * ```
     * {
     * 	Mesh: {},                    // 网格对象参数
     * 	Line: { threshold: 1 },      // 线条对象参数
     * 	LOD: {},                     // LOD（细节层次）对象参数
     * 	Points: { threshold: 1 },    // 点对象参数
     * 	Sprite: {}                   // 精灵对象参数
     * }
     * ```
     *
     * 其中 `threshold` 是射线投射器与对象相交时的精度，以世界单位为单位。
     * - 对于线条：threshold 定义了射线与线条的最大距离
     * - 对于点：threshold 定义了射线与点的最大距离
     *
     * 较大的 threshold 值使得选择更容易，但精度较低；
     * 较小的 threshold 值需要更精确的瞄准，但精度更高。
     *
     * @type {Object}
     */
    this.params = {
      Mesh: {}, // 网格对象：通常不需要额外参数
      Line: { threshold: 1 }, // 线条对象：1 个世界单位的选择阈值
      LOD: {}, // LOD 对象：通常不需要额外参数
      Points: { threshold: 1 }, // 点对象：1 个世界单位的选择阈值
      Sprite: {}, // 精灵对象：通常不需要额外参数
    };
  }

  /**
   * 使用新的起点和方向更新射线
   *
   * 通过复制参数中的值来更新射线的起点和方向。
   * 这是设置射线投射器最基本的方法。
   *
   * @param {Vector3} origin - 射线投射的起点向量
   * @param {Vector3} direction - 射线的方向向量（应该是标准化的）
   */
  set(origin, direction) {
    // 假设方向已经标准化（用于准确的距离计算）
    // 标准化的方向向量确保距离计算的准确性
    this.ray.set(origin, direction);
  }

  /**
   * 使用给定的坐标和相机计算内部射线的新起点和方向
   *
   * 这是实现鼠标拾取功能的核心方法。它将 2D 屏幕坐标转换为 3D 世界空间中的射线。
   *
   * 工作原理：
   * 1. 透视相机：射线从相机位置开始，方向指向屏幕上的点
   * 2. 正交相机：射线平行于相机的观察方向，起点在屏幕对应的世界位置
   *
   * @param {Vector2} coords - 鼠标的 2D 坐标，使用标准化设备坐标 (NDC)
   *                          X 和 Y 分量应该在 `-1` 到 `1` 之间
   * @param {Camera} camera - 射线应该从中发出的相机
   */
  setFromCamera(coords, camera) {
    // 处理透视相机
    if (camera.isPerspectiveCamera) {
      // 设置射线起点为相机的世界位置
      this.ray.origin.setFromMatrixPosition(camera.matrixWorld);
      // 计算射线方向：屏幕坐标 -> 世界坐标 -> 方向向量 -> 标准化
      this.ray.direction.set(coords.x, coords.y, 0.5).unproject(camera).sub(this.ray.origin).normalize();
      // 保存相机引用
      this.camera = camera;
    } else if (camera.isOrthographicCamera) {
      // 处理正交相机：设置射线起点在相机平面上对应的世界位置
      this.ray.origin.set(coords.x, coords.y, (camera.near + camera.far) / (camera.near - camera.far)).unproject(camera);
      // 正交相机的射线方向始终平行于相机的观察方向
      this.ray.direction.set(0, 0, -1).transformDirection(camera.matrixWorld);
      // 保存相机引用
      this.camera = camera;
    } else {
      // 不支持的相机类型
      console.error("THREE.Raycaster: Unsupported camera type: " + camera.type);
    }
  }

  /**
   * 使用给定的 WebXR 控制器计算内部射线的新起点和方向
   *
   * 这个方法专门用于 WebXR（虚拟现实/增强现实）应用，
   * 从 VR/AR 控制器的位置和朝向创建射线。
   *
   * 工作原理：
   * 1. 提取控制器的旋转矩阵
   * 2. 设置射线起点为控制器的世界位置
   * 3. 设置射线方向为控制器的前向方向（-Z 轴）
   *
   * @param {WebXRController} controller - 要复制位置和方向的控制器
   * @return {Raycaster} 返回此射线投射器的引用，支持链式调用
   */
  setFromXRController(controller) {
    // 重置临时矩阵并提取控制器的旋转信息
    _matrix.identity().extractRotation(controller.matrixWorld);

    // 设置射线起点为控制器的世界位置
    this.ray.origin.setFromMatrixPosition(controller.matrixWorld);

    // 设置射线方向：控制器的前向方向（-Z 轴）
    // 在 Three.js 中，前向方向通常是 -Z 轴
    this.ray.direction.set(0, 0, -1).applyMatrix4(_matrix);

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 射线投射器交点测试的交点信息
   *
   * 这个类型定义描述了射线与 3D 对象相交时返回的交点信息结构。
   *
   * @typedef {Object} Raycaster~Intersection
   * @property {number} distance - 从射线起点到交点的距离
   * @property {number} distanceToRay - 某些 3D 对象（如 {@link Points}）提供的
   *                                   交点到射线上最近点的距离。对于其他对象，此值为 `undefined`
   * @property {Vector3} point - 交点的世界坐标位置
   * @property {Object} face - 被相交的面对象（包含顶点索引、法线等信息）
   * @property {number} faceIndex - 面的索引号
   * @property {Object3D} object - 被相交的 3D 对象
   * @property {Vector2} uv - 交点处的 U,V 纹理坐标
   * @property {Vector2} uv1 - 交点处的第二组 U,V 纹理坐标（用于多重纹理）
   * @property {Vector3} normal - 交点处的插值法线向量
   * @property {number} instanceId - 射线与 {@link InstancedMesh} 相交时的实例索引号
   */

  /**
   * 检查射线与对象（包括或不包括其后代）的所有交点
   *
   * 交点按距离排序返回，最近的在前。这是射线投射的核心方法之一。
   *
   * 工作机制：
   * - `Raycaster` 委托给传入的 3D 对象的 `raycast()` 方法来评估射线是否与对象相交
   * - 这允许网格、线条、点等不同类型的对象以不同方式响应射线投射
   *
   * 重要注意事项：
   * - 对于网格，面必须朝向射线起点才能被检测到
   * - 射线穿过面背面的交点不会被检测到
   * - 要对对象的两面都进行射线投射，需要将 {@link Material#side} 设置为 `THREE.DoubleSide`
   *
   * @param {Object3D} object - 要检查与射线交点的 3D 对象
   * @param {boolean} [recursive=true] - 如果设置为 `true`，也会检查所有后代对象
   *                                    否则只检查与该对象的交点
   * @param {Array<Raycaster~Intersection>} [intersects=[]] 保存方法结果的目标数组
   * @return {Array<Raycaster~Intersection>} 包含交点信息的数组
   */
  intersectObject(object, recursive = true, intersects = []) {
    // 调用内部函数检查交点
    intersect(object, this, intersects, recursive);

    // 按距离排序交点，最近的在前
    intersects.sort(ascSort);

    // 返回排序后的交点数组
    return intersects;
  }

  /**
   * 检查射线与多个对象（包括或不包括其后代）的所有交点
   *
   * 这是 `intersectObject` 的批量版本，可以一次检查多个对象。
   * 交点按距离排序返回，最近的在前。
   *
   * @param {Array<Object3D>} objects - 要检查与射线交点的 3D 对象数组
   * @param {boolean} [recursive=true] - 如果设置为 `true`，也会检查所有后代对象
   *                                    否则只检查与这些对象的交点
   * @param {Array<Raycaster~Intersection>} [intersects=[]] 保存方法结果的目标数组
   * @return {Array<Raycaster~Intersection>} 包含交点信息的数组
   */
  intersectObjects(objects, recursive = true, intersects = []) {
    // 遍历所有对象，检查每个对象的交点
    for (let i = 0, l = objects.length; i < l; i++) {
      intersect(objects[i], this, intersects, recursive);
    }

    // 按距离排序所有交点，最近的在前
    intersects.sort(ascSort);

    // 返回排序后的交点数组
    return intersects;
  }
}

/**
 * 升序排序函数
 *
 * 用于按距离对交点进行排序，距离近的排在前面。
 * 这确保了射线投射结果中最近的交点总是在数组的开头。
 *
 * @param {Raycaster~Intersection} a - 第一个交点对象
 * @param {Raycaster~Intersection} b - 第二个交点对象
 * @return {number} 排序比较结果：负数表示 a 在前，正数表示 b 在前，0 表示相等
 */
function ascSort(a, b) {
  return a.distance - b.distance;
}

/**
 * 递归检查对象及其子对象的射线交点
 *
 * 这是射线投射的核心递归函数，处理层级过滤和子对象遍历。
 *
 * @param {Object3D} object - 要检查的 3D 对象
 * @param {Raycaster} raycaster - 射线投射器实例
 * @param {Array<Raycaster~Intersection>} intersects - 存储交点结果的数组
 * @param {boolean} recursive - 是否递归检查子对象
 */
function intersect(object, raycaster, intersects, recursive) {
  // 默认允许继续传播到子对象
  let propagate = true;

  // 检查对象是否在射线投射器的层级范围内
  if (object.layers.test(raycaster.layers)) {
    // 调用对象的 raycast 方法进行实际的交点检测
    const result = object.raycast(raycaster, intersects);

    // 如果 raycast 返回 false，则停止传播到子对象
    // 这允许对象控制是否检查其子对象
    if (result === false) propagate = false;
  }

  // 如果允许传播且启用了递归，则检查所有子对象
  if (propagate === true && recursive === true) {
    const children = object.children;

    // 递归检查每个子对象
    for (let i = 0, l = children.length; i < l; i++) {
      intersect(children[i], raycaster, intersects, true);
    }
  }
}

// 导出射线投射器类
export { Raycaster };
