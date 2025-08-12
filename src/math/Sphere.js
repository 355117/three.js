// 导入Box3类，用于表示三维包围盒
import { Box3 } from "./Box3.js";
// 导入Vector3类，用于表示三维向量
import { Vector3 } from "./Vector3.js";

// 用于临时计算的Box3实例，避免重复创建对象
const _box = /*@__PURE__*/ new Box3();
// 用于临时计算的Vector3实例1
const _v1 = /*@__PURE__*/ new Vector3();
// 用于临时计算的Vector3实例2
const _v2 = /*@__PURE__*/ new Vector3();

/**
 * 球体类 - 由中心点和半径定义的解析3D球体
 * 该类主要用作3D对象的包围球
 *
 * An analytical 3D sphere defined by a center and radius. This class is mainly
 * used as a Bounding Sphere for 3D objects.
 */
class Sphere {
  /**
   * 构造一个新的球体
   * Constructs a new sphere.
   *
   * @param {Vector3} [center=(0,0,0)] - 球体的中心点 The center of the sphere
   * @param {number} [radius=-1] - 球体的半径 The radius of the sphere.
   */
  constructor(center = new Vector3(), radius = -1) {
    /**
     * 此标志可用于类型测试
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSphere = true;

    /**
     * 球体的中心点
     * The center of the sphere
     *
     * @type {Vector3}
     */
    this.center = center;

    /**
     * 球体的半径
     * The radius of the sphere.
     *
     * @type {number}
     */
    this.radius = radius;
  }

  /**
   * 通过复制给定值来设置球体的组件
   * Sets the sphere's components by copying the given values.
   *
   * @param {Vector3} center - 中心点 The center.
   * @param {number} radius - 半径 The radius.
   * @return {Sphere} 返回此球体的引用 A reference to this sphere.
   */
  set(center, radius) {
    // 复制中心点坐标
    this.center.copy(center);
    // 设置半径
    this.radius = radius;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 计算点列表的最小包围球
   * 如果给定了可选的中心点，则将其用作球体的中心
   * 否则，计算包含这些点的轴对齐包围盒的中心
   *
   * Computes the minimum bounding sphere for list of points.
   * If the optional center point is given, it is used as the sphere's
   * center. Otherwise, the center of the axis-aligned bounding box
   * encompassing the points is calculated.
   *
   * @param {Array<Vector3>} points - 3D空间中的点列表 A list of points in 3D space.
   * @param {Vector3} [optionalCenter] - 球体的中心点（可选） The center of the sphere.
   * @return {Sphere} 返回此球体的引用 A reference to this sphere.
   */
  setFromPoints(points, optionalCenter) {
    // 获取球体中心点的引用
    const center = this.center;

    if (optionalCenter !== undefined) {
      // 如果提供了可选中心点，则使用它
      center.copy(optionalCenter);
    } else {
      // 否则，从点列表创建包围盒并获取其中心
      _box.setFromPoints(points).getCenter(center);
    }

    // 初始化最大半径平方
    let maxRadiusSq = 0;

    // 遍历所有点，找到距离中心最远的点
    for (let i = 0, il = points.length; i < il; i++) {
      // 更新最大半径平方值
      maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(points[i]));
    }

    // 设置半径为最大距离的平方根
    this.radius = Math.sqrt(maxRadiusSq);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将给定球体的值复制到此实例
   * Copies the values of the given sphere to this instance.
   *
   * @param {Sphere} sphere - 要复制的球体 The sphere to copy.
   * @return {Sphere} 返回此球体的引用 A reference to this sphere.
   */
  copy(sphere) {
    // 复制球体的中心点
    this.center.copy(sphere.center);
    // 复制球体的半径
    this.radius = sphere.radius;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 如果球体为空（半径设置为负数）则返回true
   * Returns `true` if the sphere is empty (the radius set to a negative number).
   *
   * 半径为0的球体只包含其中心点，不被认为是空的
   * Spheres with a radius of `0` contain only their center point and are not
   * considered to be empty.
   *
   * @return {boolean} 此球体是否为空 Whether this sphere is empty or not.
   */
  isEmpty() {
    // 检查半径是否为负数
    return this.radius < 0;
  }

  /**
   * 使此球体为空，这意味着它在3D中包围零空间
   * Makes this sphere empty which means in encloses a zero space in 3D.
   *
   * @return {Sphere} 返回此球体的引用 A reference to this sphere.
   */
  makeEmpty() {
    // 将中心点设置为原点
    this.center.set(0, 0, 0);
    // 将半径设置为-1（表示空球体）
    this.radius = -1;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 如果此球体包含给定点（包括球体表面）则返回true
   * Returns `true` if this sphere contains the given point inclusive of
   * the surface of the sphere.
   *
   * @param {Vector3} point - 要检查的点 The point to check.
   * @return {boolean} 此球体是否包含给定点 Whether this sphere contains the given point or not.
   */
  containsPoint(point) {
    // 检查点到球心的距离平方是否小于等于半径平方
    return point.distanceToSquared(this.center) <= this.radius * this.radius;
  }

  /**
   * 返回从球体边界到给定点的最近距离
   * 如果球体包含该点，距离将为负数
   *
   * Returns the closest distance from the boundary of the sphere to the
   * given point. If the sphere contains the point, the distance will
   * be negative.
   *
   * @param {Vector3} point - 要计算距离的点 The point to compute the distance to.
   * @return {number} 到点的距离 The distance to the point.
   */
  distanceToPoint(point) {
    // 计算点到球心的距离减去半径
    return point.distanceTo(this.center) - this.radius;
  }

  /**
   * 如果此球体与给定球体相交则返回true
   * Returns `true` if this sphere intersects with the given one.
   *
   * @param {Sphere} sphere - 要测试的球体 The sphere to test.
   * @return {boolean} 此球体是否与给定球体相交 Whether this sphere intersects with the given one or not.
   */
  intersectsSphere(sphere) {
    // 计算两个球体半径之和
    const radiusSum = this.radius + sphere.radius;

    // 检查两球心距离平方是否小于等于半径和的平方
    return sphere.center.distanceToSquared(this.center) <= radiusSum * radiusSum;
  }

  /**
   * 如果此球体与给定包围盒相交则返回true
   * Returns `true` if this sphere intersects with the given box.
   *
   * @param {Box3} box - 要测试的包围盒 The box to test.
   * @return {boolean} 此球体是否与给定包围盒相交 Whether this sphere intersects with the given box or not.
   */
  intersectsBox(box) {
    // 委托给包围盒的相交检测方法
    return box.intersectsSphere(this);
  }

  /**
   * 如果此球体与给定平面相交则返回true
   * Returns `true` if this sphere intersects with the given plane.
   *
   * @param {Plane} plane - 要测试的平面 The plane to test.
   * @return {boolean} 此球体是否与给定平面相交 Whether this sphere intersects with the given plane or not.
   */
  intersectsPlane(plane) {
    // 检查球心到平面的距离绝对值是否小于等于半径
    return Math.abs(plane.distanceToPoint(this.center)) <= this.radius;
  }

  /**
   * 将点限制在球体内。如果点在球体外部，将其限制到球体边缘上最近的点
   * 已经在球体内部的点不会受到影响
   *
   * Clamps a point within the sphere. If the point is outside the sphere, it
   * will clamp it to the closest point on the edge of the sphere. Points
   * already inside the sphere will not be affected.
   *
   * @param {Vector3} point - 要限制的点 The plane to clamp.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 限制后的点 The clamped point.
   */
  clampPoint(point, target) {
    // 计算点到球心的距离平方
    const deltaLengthSq = this.center.distanceToSquared(point);

    // 首先复制原始点
    target.copy(point);

    // 如果点在球体外部
    if (deltaLengthSq > this.radius * this.radius) {
      // 将点移动到球心，标准化方向，然后缩放到半径长度，最后加回球心
      // 先减去球心得到方向向量，然后标准化
      target.sub(this.center).normalize();
      // 缩放到半径长度并加回球心
      target.multiplyScalar(this.radius).add(this.center);
    }

    return target;
  }

  /**
   * 返回包围此球体的包围盒
   * Returns a bounding box that encloses this sphere.
   *
   * @param {Box3} target - 用于存储方法结果的目标包围盒 The target box that is used to store the method's result.
   * @return {Box3} 包围此球体的包围盒 The bounding box that encloses this sphere.
   */
  getBoundingBox(target) {
    if (this.isEmpty()) {
      // 空球体产生空包围盒
      // Empty sphere produces empty bounding box
      target.makeEmpty();
      return target;
    }

    // 设置包围盒的最小和最大点都为球心
    target.set(this.center, this.center);
    // 按半径扩展包围盒
    target.expandByScalar(this.radius);

    return target;
  }

  /**
   * 使用给定的4x4变换矩阵变换此球体
   * Transforms this sphere with the given 4x4 transformation matrix.
   *
   * @param {Matrix4} matrix - 变换矩阵 The transformation matrix.
   * @return {Sphere} 返回此球体的引用 A reference to this sphere.
   */
  applyMatrix4(matrix) {
    // 变换球心
    this.center.applyMatrix4(matrix);
    // 根据矩阵的最大缩放因子调整半径
    this.radius = this.radius * matrix.getMaxScaleOnAxis();

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 通过给定的偏移量平移球体的中心
   * Translates the sphere's center by the given offset.
   *
   * @param {Vector3} offset - 偏移量 The offset.
   * @return {Sphere} 返回此球体的引用 A reference to this sphere.
   */
  translate(offset) {
    // 将偏移量添加到球心
    this.center.add(offset);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 扩展此球体的边界以包含给定点
   * Expands the boundaries of this sphere to include the given point.
   *
   * @param {Vector3} point - 要包含的点 The point to include.
   * @return {Sphere} 返回此球体的引用 A reference to this sphere.
   */
  expandByPoint(point) {
    if (this.isEmpty()) {
      // 如果球体为空，将中心设置为该点
      this.center.copy(point);

      // 半径设置为0
      this.radius = 0;

      return this;
    }

    // 计算从球心到点的向量
    _v1.subVectors(point, this.center);

    // 计算距离的平方
    const lengthSq = _v1.lengthSq();

    if (lengthSq > this.radius * this.radius) {
      // 计算最小球体
      // calculate the minimal sphere

      // 计算实际距离
      const length = Math.sqrt(lengthSq);

      // 计算需要扩展的距离的一半
      const delta = (length - this.radius) * 0.5;

      // 将球心向点的方向移动delta距离
      this.center.addScaledVector(_v1, delta / length);

      // 增加半径
      this.radius += delta;
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 扩展此球体以包围原始球体和给定球体
   * Expands this sphere to enclose both the original sphere and the given sphere.
   *
   * @param {Sphere} sphere - 要包含的球体 The sphere to include.
   * @return {Sphere} 返回此球体的引用 A reference to this sphere.
   */
  union(sphere) {
    if (sphere.isEmpty()) {
      // 如果给定球体为空，直接返回
      return this;
    }

    if (this.isEmpty()) {
      // 如果当前球体为空，复制给定球体
      this.copy(sphere);

      return this;
    }

    if (this.center.equals(sphere.center) === true) {
      // 如果两个球体中心相同，取较大的半径
      this.radius = Math.max(this.radius, sphere.radius);
    } else {
      // 计算从当前球心到给定球心的方向向量，长度为给定球体的半径
      _v2.subVectors(sphere.center, this.center).setLength(sphere.radius);

      // 扩展球体以包含给定球体的最远点（球心+半径方向）
      this.expandByPoint(_v1.copy(sphere.center).add(_v2));

      // 扩展球体以包含给定球体的最近点（球心-半径方向）
      this.expandByPoint(_v1.copy(sphere.center).sub(_v2));
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 如果此球体与给定球体相等则返回true
   * Returns `true` if this sphere is equal with the given one.
   *
   * @param {Sphere} sphere - 要测试相等性的球体 The sphere to test for equality.
   * @return {boolean} 此包围球是否与给定球体相等 Whether this bounding sphere is equal with the given one.
   */
  equals(sphere) {
    // 比较中心点和半径是否都相等
    return sphere.center.equals(this.center) && sphere.radius === this.radius;
  }

  /**
   * 返回一个复制了此实例值的新球体
   * Returns a new sphere with copied values from this instance.
   *
   * @return {Sphere} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 创建新的球体实例并复制当前球体的值
    return new this.constructor().copy(this);
  }

  /**
   * 返回包围球的序列化结构
   * Returns a serialized structure of the bounding sphere.
   *
   * @return {Object} 表示对象状态的序列化结构 Serialized structure with fields representing the object state.
   */
  toJSON() {
    return {
      // 序列化半径
      radius: this.radius,
      // 序列化中心点为数组
      center: this.center.toArray(),
    };
  }

  /**
   * 从序列化的JSON设置球体
   * Returns a serialized structure of the bounding sphere.
   *
   * @param {Object} json - 要设置球体的序列化JSON The serialized json to set the sphere from.
   * @return {Sphere} 返回此包围球的引用 A reference to this bounding sphere.
   */
  fromJSON(json) {
    // 从JSON恢复半径
    this.radius = json.radius;
    // 从JSON数组恢复中心点
    this.center.fromArray(json.center);
    // 返回自身以支持链式调用
    return this;
  }
}

// 导出Sphere类
export { Sphere };
