// 导入网格基类
import { Mesh } from "./Mesh.js";
// 导入包围盒类，用于计算蒙皮网格的包围盒
import { Box3 } from "../math/Box3.js";
// 导入4x4矩阵类，用于骨骼变换计算
import { Matrix4 } from "../math/Matrix4.js";
// 导入球体类，用于计算蒙皮网格的包围球
import { Sphere } from "../math/Sphere.js";
// 导入三维向量类，用于位置计算
import { Vector3 } from "../math/Vector3.js";
// 导入四维向量类，用于存储蒙皮索引和权重
import { Vector4 } from "../math/Vector4.js";
// 导入射线类，用于射线检测
import { Ray } from "../math/Ray.js";
// 导入绑定模式常量，定义蒙皮网格与骨架的关系
import { AttachedBindMode, DetachedBindMode } from "../constants.js";

// 用于存储基础位置的临时向量
const _basePosition = /*@__PURE__*/ new Vector3();

// 用于存储蒙皮索引的临时四维向量
const _skinIndex = /*@__PURE__*/ new Vector4();
// 用于存储蒙皮权重的临时四维向量
const _skinWeight = /*@__PURE__*/ new Vector4();

// 通用临时向量和矩阵
const _vector3 = /*@__PURE__*/ new Vector3();
const _matrix4 = /*@__PURE__*/ new Matrix4();
const _vertex = /*@__PURE__*/ new Vector3();

// 用于射线检测的临时对象
const _sphere = /*@__PURE__*/ new Sphere();
const _inverseMatrix = /*@__PURE__*/ new Matrix4();
const _ray = /*@__PURE__*/ new Ray();

/**
 * 具有骨架的网格，可以使用蒙皮/骨骼动画来动画化几何体的顶点
 *
 * 除了有效的骨架外，蒙皮网格还需要在其几何体中包含蒙皮索引和权重作为缓冲属性。
 * 这些属性定义了哪些骨骼在一定程度上影响单个顶点。
 *
 * 通常蒙皮网格不是手动创建的，而是通过GLTFLoader或FBXLoader等加载器导入相应的模型。
 *
 * @augments Mesh
 */
class SkinnedMesh extends Mesh {
  /**
   * 构造一个新的蒙皮网格
   *
   * @param {BufferGeometry} [geometry] - 网格的几何体，必须包含蒙皮索引和权重属性
   * @param {Material|Array<Material>} [material] - 网格的材质
   */
  constructor(geometry, material) {
    // 调用父类构造函数
    super(geometry, material);

    /**
     * 用于类型检测的标志
     * 可以通过此属性判断对象是否为蒙皮网格
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSkinnedMesh = true;

    /**
     * 对象类型标识
     * 用于序列化和调试时识别对象类型
     *
     * @type {string}
     */
    this.type = "SkinnedMesh";

    /**
     * 绑定模式
     * AttachedBindMode表示蒙皮网格与骨架共享相同的世界空间
     * DetachedBindMode在多个蒙皮网格共享骨架时很有用
     *
     * @type {(AttachedBindMode|DetachedBindMode)}
     * @default AttachedBindMode
     */
    this.bindMode = AttachedBindMode;

    /**
     * 用于绑定骨骼变换的基础矩阵
     * 定义蒙皮网格在绑定时的世界变换
     *
     * @type {Matrix4}
     */
    this.bindMatrix = new Matrix4();

    /**
     * 用于重置绑定骨骼变换的基础矩阵
     * 是bindMatrix的逆矩阵
     *
     * @type {Matrix4}
     */
    this.bindMatrixInverse = new Matrix4();

    /**
     * 蒙皮网格的包围盒
     * 可以通过computeBoundingBox方法计算
     *
     * @type {?Box3}
     * @default null
     */
    this.boundingBox = null;

    /**
     * 蒙皮网格的包围球
     * 可以通过computeBoundingSphere方法计算
     *
     * @type {?Sphere}
     * @default null
     */
    this.boundingSphere = null;
  }

  /**
   * Computes the bounding box of the skinned mesh, and updates {@link SkinnedMesh#boundingBox}.
   * The bounding box is not automatically computed by the engine; this method must be called by your app.
   * If the skinned mesh is animated, the bounding box should be recomputed per frame in order to reflect
   * the current animation state.
   */
  /**
   * 计算蒙皮网格的包围盒，并更新boundingBox属性
   * 包围盒默认不计算，需要显式计算，否则为null
   * 考虑蒙皮变形后的顶点位置
   */
  computeBoundingBox() {
    // 获取几何体引用
    const geometry = this.geometry;

    // 如果包围盒不存在，创建一个新的
    if (this.boundingBox === null) {
      this.boundingBox = new Box3();
    }

    // 重置包围盒为空
    this.boundingBox.makeEmpty();

    // 获取位置属性
    const positionAttribute = geometry.getAttribute("position");

    // 遍历所有顶点，计算蒙皮变形后的位置并扩展包围盒
    for (let i = 0; i < positionAttribute.count; i++) {
      // 获取考虑蒙皮变形的顶点位置
      this.getVertexPosition(i, _vertex);
      // 用该点扩展包围盒
      this.boundingBox.expandByPoint(_vertex);
    }
  }

  /**
   * 计算蒙皮网格的包围球，并更新boundingSphere属性
   * 包围球在需要时（如射线投射和视锥剔除）由引擎自动计算一次。
   * 如果蒙皮网格有动画，应该每帧重新计算包围球以反映当前动画状态。
   */
  computeBoundingSphere() {
    // 获取几何体引用
    const geometry = this.geometry;

    // 如果包围球不存在，创建一个新的
    if (this.boundingSphere === null) {
      this.boundingSphere = new Sphere();
    }

    // 重置包围球为空
    this.boundingSphere.makeEmpty();

    // 获取位置属性
    const positionAttribute = geometry.getAttribute("position");

    // 遍历所有顶点，计算蒙皮变形后的位置并扩展包围球
    for (let i = 0; i < positionAttribute.count; i++) {
      // 获取考虑蒙皮变形的顶点位置
      this.getVertexPosition(i, _vertex);
      // 用该点扩展包围球
      this.boundingSphere.expandByPoint(_vertex);
    }
  }

  /**
   * 复制另一个蒙皮网格对象的属性
   * 包括绑定模式、绑定矩阵、骨架等所有相关属性
   *
   * @param {SkinnedMesh} source - 要复制的源蒙皮网格对象
   * @param {boolean} recursive - 是否递归复制子对象
   * @return {SkinnedMesh} 返回当前蒙皮网格对象，支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的copy方法
    super.copy(source, recursive);

    // 复制绑定模式
    this.bindMode = source.bindMode;
    // 复制绑定矩阵
    this.bindMatrix.copy(source.bindMatrix);
    // 复制绑定逆矩阵
    this.bindMatrixInverse.copy(source.bindMatrixInverse);

    // 复制骨架引用
    this.skeleton = source.skeleton;

    // 复制包围盒和包围球（如果存在）
    if (source.boundingBox !== null) this.boundingBox = source.boundingBox.clone();
    if (source.boundingSphere !== null) this.boundingSphere = source.boundingSphere.clone();

    return this;
  }

  /**
   * 计算射线与此蒙皮网格的交点
   * 重写父类方法以使用蒙皮网格特定的包围体
   *
   * @param {Raycaster} raycaster - 射线投射器
   * @param {Array<Object>} intersects - 存储交点信息的目标数组
   */
  raycast(raycaster, intersects) {
    // 获取材质和世界变换矩阵
    const material = this.material;
    const matrixWorld = this.matrixWorld;

    // 如果没有材质，直接返回
    if (material === undefined) return;

    // 第一步：在世界空间中进行包围球测试

    // 如果包围球不存在，计算包围球
    if (this.boundingSphere === null) this.computeBoundingSphere();

    // 将包围球转换到世界空间
    _sphere.copy(this.boundingSphere);
    _sphere.applyMatrix4(matrixWorld);

    // 如果射线不与包围球相交，直接返回
    if (raycaster.ray.intersectsSphere(_sphere) === false) return;

    // 第二步：将射线转换到蒙皮网格的本地空间

    // 计算世界变换矩阵的逆矩阵
    _inverseMatrix.copy(matrixWorld).invert();
    // 将射线转换到本地空间
    _ray.copy(raycaster.ray).applyMatrix4(_inverseMatrix);

    // 第三步：在本地空间中进行包围盒测试

    if (this.boundingBox !== null) {
      // 如果射线不与包围盒相交，直接返回
      if (_ray.intersectsBox(this.boundingBox) === false) return;
    }

    // 第四步：进行精确的几何体交点测试

    this._computeIntersections(raycaster, intersects, _ray);
  }

  /**
   * 获取指定索引顶点的位置，考虑蒙皮变形
   * 重写父类方法以应用骨骼变换
   *
   * @param {number} index - 顶点索引
   * @param {Vector3} target - 用于存储结果的目标向量
   * @return {Vector3} 应用蒙皮变形后的顶点位置
   */
  getVertexPosition(index, target) {
    // 调用父类方法获取基础顶点位置（包括变形目标）
    super.getVertexPosition(index, target);

    // 应用骨骼变换
    this.applyBoneTransform(index, target);

    return target;
  }

  /**
   * 将给定的骨架绑定到蒙皮网格
   * 建立蒙皮网格与骨架之间的关联关系
   *
   * @param {Skeleton} skeleton - 要绑定的骨架
   * @param {Matrix4} [bindMatrix] - 绑定矩阵。如果未提供，将使用蒙皮网格的世界矩阵
   */
  bind(skeleton, bindMatrix) {
    // 设置骨架引用
    this.skeleton = skeleton;

    if (bindMatrix === undefined) {
      // 如果没有提供绑定矩阵，使用当前的世界矩阵

      // 更新世界矩阵
      this.updateMatrixWorld(true);

      // 计算骨架的逆矩阵
      this.skeleton.calculateInverses();

      // 使用当前世界矩阵作为绑定矩阵
      bindMatrix = this.matrixWorld;
    }

    // 设置绑定矩阵
    this.bindMatrix.copy(bindMatrix);
    // 计算并设置绑定逆矩阵
    this.bindMatrixInverse.copy(bindMatrix).invert();
  }

  /**
   * 将蒙皮网格设置为静止姿势（绑定姿势）
   * 通过调用骨架的pose方法来重置所有骨骼到初始状态
   */
  pose() {
    this.skeleton.pose();
  }

  /**
   * 标准化蒙皮权重
   * 标准化在蒙皮网格几何体中定义为缓冲属性的蒙皮权重
   */
  normalizeSkinWeights() {
    // 创建临时四维向量
    const vector = new Vector4();

    // 获取蒙皮权重属性
    const skinWeight = this.geometry.attributes.skinWeight;

    // 遍历所有顶点的权重
    for (let i = 0, l = skinWeight.count; i < l; i++) {
      // 从缓冲属性中获取权重向量
      vector.fromBufferAttribute(skinWeight, i);

      // 计算曼哈顿长度的倒数作为缩放因子
      const scale = 1.0 / vector.manhattanLength();

      if (scale !== Infinity) {
        // 应用缩放因子进行标准化
        vector.multiplyScalar(scale);
      } else {
        // 如果权重为零，设置合理的默认值（第一个骨骼权重为1）
        vector.set(1, 0, 0, 0);
      }

      // 将标准化后的权重写回缓冲属性
      skinWeight.setXYZW(i, vector.x, vector.y, vector.z, vector.w);
    }
  }

  /**
   * 更新世界矩阵
   * 重写父类方法以根据绑定模式更新绑定逆矩阵
   *
   * @param {boolean} force - 是否强制更新
   */
  updateMatrixWorld(force) {
    // 调用父类方法更新世界矩阵
    super.updateMatrixWorld(force);

    // 根据绑定模式更新绑定逆矩阵
    if (this.bindMode === AttachedBindMode) {
      // 附加模式：使用当前世界矩阵的逆矩阵
      this.bindMatrixInverse.copy(this.matrixWorld).invert();
    } else if (this.bindMode === DetachedBindMode) {
      // 分离模式：使用固定绑定矩阵的逆矩阵
      this.bindMatrixInverse.copy(this.bindMatrix).invert();
    } else {
      // 未知绑定模式，发出警告
      console.warn("THREE.SkinnedMesh: Unrecognized bindMode: " + this.bindMode);
    }
  }

  /**
   * 将与给定索引关联的骨骼变换应用到给定的顶点位置
   * 这是蒙皮动画的核心计算方法
   *
   * @param {number} index - 顶点索引
   * @param {Vector3} target - 用于存储方法结果的目标向量
   * @return {Vector3} 更新后的顶点位置
   */
  applyBoneTransform(index, target) {
    // 获取骨架和几何体引用
    const skeleton = this.skeleton;
    const geometry = this.geometry;

    // 从几何体属性中获取该顶点的蒙皮索引和权重
    _skinIndex.fromBufferAttribute(geometry.attributes.skinIndex, index);
    _skinWeight.fromBufferAttribute(geometry.attributes.skinWeight, index);

    // 将顶点位置转换到绑定空间
    _basePosition.copy(target).applyMatrix4(this.bindMatrix);

    // 重置目标向量
    target.set(0, 0, 0);

    // 遍历影响该顶点的最多4个骨骼
    for (let i = 0; i < 4; i++) {
      // 获取当前骨骼的权重
      const weight = _skinWeight.getComponent(i);

      // 如果权重不为零，应用骨骼变换
      if (weight !== 0) {
        // 获取骨骼索引
        const boneIndex = _skinIndex.getComponent(i);

        // 计算骨骼变换矩阵：当前骨骼世界矩阵 × 骨骼逆矩阵
        _matrix4.multiplyMatrices(skeleton.bones[boneIndex].matrixWorld, skeleton.boneInverses[boneIndex]);

        // 应用骨骼变换并按权重累加到目标向量
        target.addScaledVector(_vector3.copy(_basePosition).applyMatrix4(_matrix4), weight);
      }
    }

    // 将结果从绑定空间转换回世界空间
    return target.applyMatrix4(this.bindMatrixInverse);
  }
}

// 导出蒙皮网格类
export { SkinnedMesh };
