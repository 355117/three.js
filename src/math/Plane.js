// 导入3x3矩阵和3D向量类
import { Matrix3 } from "./Matrix3.js";
import { Vector3 } from "./Vector3.js";

// 内部使用的临时变量（纯函数优化标记）
const _vector1 = /*@__PURE__*/ new Vector3(); // 临时向量1，用于计算
const _vector2 = /*@__PURE__*/ new Vector3(); // 临时向量2，用于计算
const _normalMatrix = /*@__PURE__*/ new Matrix3(); // 临时法线矩阵，用于变换计算

/**
 * 在3D空间中无限延伸的二维表面，以[海塞法线形式]{@link http://mathworld.wolfram.com/HessianNormalForm.html}表示，
 * 由单位长度的法向量和常数组成
 * A two dimensional surface that extends infinitely in 3D space, represented
 * in [Hessian normal form]{@link http://mathworld.wolfram.com/HessianNormalForm.html}
 * by a unit length normal vector and a constant.
 */
class Plane {
  /**
   * 构造一个新的平面
   * Constructs a new plane.
   *
   * @param {Vector3} [normal=(1,0,0)] - 定义平面法线的单位长度向量 A unit length vector defining the normal of the plane.
   * @param {number} [constant=0] - 从原点到平面的有符号距离 The signed distance from the origin to the plane.
   */
  constructor(normal = new Vector3(1, 0, 0), constant = 0) {
    /**
     * 此标志可用于类型测试
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isPlane = true;

    /**
     * 定义平面法线的单位长度向量
     * A unit length vector defining the normal of the plane.
     *
     * @type {Vector3}
     */
    this.normal = normal;

    /**
     * 从原点到平面的有符号距离
     * The signed distance from the origin to the plane.
     *
     * @type {number}
     * @default 0
     */
    this.constant = constant;
  }

  /**
   * 通过复制给定值来设置平面分量
   * Sets the plane components by copying the given values.
   *
   * @param {Vector3} normal - 法向量 The normal.
   * @param {number} constant - 常数 The constant.
   * @return {Plane} 此平面的引用 A reference to this plane.
   */
  set(normal, constant) {
    this.normal.copy(normal); // 复制法向量
    this.constant = constant; // 设置常数

    return this;
  }

  /**
   * 通过定义`x`、`y`、`z`作为平面法线，`w`作为常数来设置平面分量
   * Sets the plane components by defining `x`, `y`, `z` as the
   * plane normal and `w` as the constant.
   *
   * @param {number} x - 法向量的X分量值 The value for the normal's x component.
   * @param {number} y - 法向量的Y分量值 The value for the normal's y component.
   * @param {number} z - 法向量的Z分量值 The value for the normal's z component.
   * @param {number} w - 常数值 The constant value.
   * @return {Plane} 此平面的引用 A reference to this plane.
   */
  setComponents(x, y, z, w) {
    this.normal.set(x, y, z); // 设置法向量的三个分量
    this.constant = w; // 设置常数

    return this;
  }

  /**
   * 从给定的法向量和共面点（即位于平面上的点）设置平面
   * Sets the plane from the given normal and coplanar point (that is a point
   * that lies onto the plane).
   *
   * @param {Vector3} normal - 法向量 The normal.
   * @param {Vector3} point - 共面点 A coplanar point.
   * @return {Plane} 此平面的引用 A reference to this plane.
   */
  setFromNormalAndCoplanarPoint(normal, point) {
    this.normal.copy(normal); // 复制法向量
    this.constant = -point.dot(this.normal); // 计算常数：-点·法向量

    return this;
  }

  /**
   * 从三个共面点设置平面。假设缠绕顺序为逆时针，
   * 并确定平面法线的方向
   * Sets the plane from three coplanar points. The winding order is
   * assumed to be counter-clockwise, and determines the direction of
   * the plane normal.
   *
   * @param {Vector3} a - 第一个共面点 The first coplanar point.
   * @param {Vector3} b - 第二个共面点 The second coplanar point.
   * @param {Vector3} c - 第三个共面点 The third coplanar point.
   * @return {Plane} 此平面的引用 A reference to this plane.
   */
  setFromCoplanarPoints(a, b, c) {
    // 计算法向量：(c-b) × (a-b) 并归一化
    const normal = _vector1.subVectors(c, b).cross(_vector2.subVectors(a, b)).normalize();

    // Q: should an error be thrown if normal is zero (e.g. degenerate plane)?
    // 问题：如果法向量为零（例如退化平面），是否应该抛出错误？

    this.setFromNormalAndCoplanarPoint(normal, a); // 使用计算出的法向量和点a设置平面

    return this;
  }

  /**
   * 将给定平面的值复制到此实例
   * Copies the values of the given plane to this instance.
   *
   * @param {Plane} plane - 要复制的平面 The plane to copy.
   * @return {Plane} 此平面的引用 A reference to this plane.
   */
  copy(plane) {
    this.normal.copy(plane.normal); // 复制法向量
    this.constant = plane.constant; // 复制常数

    return this;
  }

  /**
   * 归一化平面法向量并相应地调整常数
   * Normalizes the plane normal and adjusts the constant accordingly.
   *
   * @return {Plane} 此平面的引用 A reference to this plane.
   */
  normalize() {
    // Note: will lead to a divide by zero if the plane is invalid.
    // 注意：如果平面无效，将导致除零错误

    const inverseNormalLength = 1.0 / this.normal.length(); // 计算法向量长度的倒数
    this.normal.multiplyScalar(inverseNormalLength); // 归一化法向量
    this.constant *= inverseNormalLength; // 按比例调整常数

    return this;
  }

  /**
   * 对平面法向量和常数取反
   * Negates both the plane normal and the constant.
   *
   * @return {Plane} 此平面的引用 A reference to this plane.
   */
  negate() {
    this.constant *= -1; // 常数取反
    this.normal.negate(); // 法向量取反

    return this;
  }

  /**
   * 返回从给定点到此平面的有符号距离
   * Returns the signed distance from the given point to this plane.
   *
   * @param {Vector3} point - 要计算距离的点 The point to compute the distance for.
   * @return {number} 有符号距离 The signed distance.
   */
  distanceToPoint(point) {
    // 使用平面方程：ax + by + cz + d = 0，其中(a,b,c)是法向量，d是常数
    return this.normal.dot(point) + this.constant;
  }

  /**
   * 返回从给定球体到此平面的有符号距离
   * Returns the signed distance from the given sphere to this plane.
   *
   * @param {Sphere} sphere - 要计算距离的球体 The sphere to compute the distance for.
   * @return {number} 有符号距离 The signed distance.
   */
  distanceToSphere(sphere) {
    // 球体到平面的距离 = 球心到平面的距离 - 球体半径
    return this.distanceToPoint(sphere.center) - sphere.radius;
  }

  /**
   * 将给定点投影到平面上
   * Projects a the given point onto the plane.
   *
   * @param {Vector3} point - 要投影的点 The point to project.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 平面上的投影点 The projected point on the plane.
   */
  projectPoint(point, target) {
    // 投影公式：投影点 = 原点 - 距离 * 法向量
    return target.copy(point).addScaledVector(this.normal, -this.distanceToPoint(point));
  }

  /**
   * 返回传入直线与平面的交点。如果直线不相交则返回`null`。
   * 如果直线与平面共面则返回直线的起点
   * Returns the intersection point of the passed line and the plane. Returns
   * `null` if the line does not intersect. Returns the line's starting point if
   * the line is coplanar with the plane.
   *
   * @param {Line3} line - 要计算交点的直线 The line to compute the intersection for.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {?Vector3} 交点 The intersection point.
   */
  intersectLine(line, target) {
    const direction = line.delta(_vector1); // 获取直线方向向量

    const denominator = this.normal.dot(direction); // 计算法向量与方向向量的点积

    if (denominator === 0) {
      // line is coplanar, return origin
      // 直线与平面平行或共面
      if (this.distanceToPoint(line.start) === 0) {
        // 如果起点在平面上，则直线共面，返回起点
        return target.copy(line.start);
      }

      // Unsure if this is the correct method to handle this case.
      // 不确定这是否是处理这种情况的正确方法
      return null; // 直线平行于平面但不共面，无交点
    }

    // 计算参数t：直线参数方程 P = start + t * direction
    const t = -(line.start.dot(this.normal) + this.constant) / denominator;

    if (t < 0 || t > 1) {
      // 交点不在线段范围内
      return null;
    }

    // 计算交点：start + t * direction
    return target.copy(line.start).addScaledVector(direction, t);
  }

  /**
   * 如果给定线段与平面相交（穿过），则返回`true`
   * Returns `true` if the given line segment intersects with (passes through) the plane.
   *
   * @param {Line3} line - 要测试的直线 The line to test.
   * @return {boolean} 给定线段是否与平面相交 Whether the given line segment intersects with the plane or not.
   */
  intersectsLine(line) {
    // Note: this tests if a line intersects the plane, not whether it (or its end-points) are coplanar with it.
    // 注意：这测试直线是否与平面相交，而不是它（或其端点）是否与平面共面

    const startSign = this.distanceToPoint(line.start); // 起点到平面的距离
    const endSign = this.distanceToPoint(line.end); // 终点到平面的距离

    // 如果起点和终点在平面的不同侧，则线段穿过平面
    return (startSign < 0 && endSign > 0) || (endSign < 0 && startSign > 0);
  }

  /**
   * 如果给定包围盒与平面相交，则返回`true`
   * Returns `true` if the given bounding box intersects with the plane.
   *
   * @param {Box3} box - 要测试的包围盒 The bounding box to test.
   * @return {boolean} 给定包围盒是否与平面相交 Whether the given bounding box intersects with the plane or not.
   */
  intersectsBox(box) {
    // 委托给包围盒的相交检测方法
    return box.intersectsPlane(this);
  }

  /**
   * 如果给定包围球与平面相交，则返回`true`
   * Returns `true` if the given bounding sphere intersects with the plane.
   *
   * @param {Sphere} sphere - 要测试的包围球 The bounding sphere to test.
   * @return {boolean} 给定包围球是否与平面相交 Whether the given bounding sphere intersects with the plane or not.
   */
  intersectsSphere(sphere) {
    // 委托给包围球的相交检测方法
    return sphere.intersectsPlane(this);
  }

  /**
   * 通过计算原点处法向量在平面上的投影，返回平面的共面向量
   * Returns a coplanar vector to the plane, by calculating the
   * projection of the normal at the origin onto the plane.
   *
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 共面点 The coplanar point.
   */
  coplanarPoint(target) {
    // 共面点 = -常数 * 法向量（这给出了平面上最接近原点的点）
    return target.copy(this.normal).multiplyScalar(-this.constant);
  }

  /**
   * 对平面应用4x4矩阵。矩阵必须是仿射齐次变换
   * Apply a 4x4 matrix to the plane. The matrix must be an affine, homogeneous transform.
   *
   * 可选的法线矩阵可以这样预计算：
   * The optional normal matrix can be pre-computed like so:
   * ```js
   * const optionalNormalMatrix = new THREE.Matrix3().getNormalMatrix( matrix );
   * ```
   *
   * @param {Matrix4} matrix - 变换矩阵 The transformation matrix.
   * @param {Matrix3} [optionalNormalMatrix] - 预计算的法线矩阵 A pre-computed normal matrix.
   * @return {Plane} 此平面的引用 A reference to this plane.
   */
  applyMatrix4(matrix, optionalNormalMatrix) {
    // 获取法线矩阵（用于正确变换法向量）
    const normalMatrix = optionalNormalMatrix || _normalMatrix.getNormalMatrix(matrix);

    // 获取平面上的一个参考点并应用变换
    const referencePoint = this.coplanarPoint(_vector1).applyMatrix4(matrix);

    // 变换法向量并归一化
    const normal = this.normal.applyMatrix3(normalMatrix).normalize();

    // 重新计算常数
    this.constant = -referencePoint.dot(normal);

    return this;
  }

  /**
   * 按给定偏移向量定义的距离平移平面
   * 注意：这只影响平面常数，不会影响法向量
   * Translates the plane by the distance defined by the given offset vector.
   * Note that this only affects the plane constant and will not affect the normal vector.
   *
   * @param {Vector3} offset - 偏移向量 The offset vector.
   * @return {Plane} 此平面的引用 A reference to this plane.
   */
  translate(offset) {
    // 平移平面：新常数 = 旧常数 - 偏移·法向量
    this.constant -= offset.dot(this.normal);

    return this;
  }

  /**
   * 如果此平面与给定平面相等，则返回`true`
   * Returns `true` if this plane is equal with the given one.
   *
   * @param {Plane} plane - 要测试相等性的平面 The plane to test for equality.
   * @return {boolean} 此平面是否与给定平面相等 Whether this plane is equal with the given one.
   */
  equals(plane) {
    // 比较法向量和常数是否都相等
    return plane.normal.equals(this.normal) && plane.constant === this.constant;
  }

  /**
   * 返回一个从此实例复制值的新平面
   * Returns a new plane with copied values from this instance.
   *
   * @return {Plane} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 创建新的平面实例并复制当前平面的值
    return new this.constructor().copy(this);
  }
}

// 导出Plane类
export { Plane };
