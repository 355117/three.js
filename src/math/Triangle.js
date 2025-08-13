// 导入三维向量类，用于表示三角形的顶点坐标
import { Vector3 } from "./Vector3.js";
// 导入四维向量类，用于处理缓冲区属性插值
import { Vector4 } from "./Vector4.js";

// 临时向量变量，用于各种计算以避免重复创建对象
const _v0 = /*@__PURE__*/ new Vector3(); // 通用临时向量0
const _v1 = /*@__PURE__*/ new Vector3(); // 通用临时向量1
const _v2 = /*@__PURE__*/ new Vector3(); // 通用临时向量2
const _v3 = /*@__PURE__*/ new Vector3(); // 通用临时向量3，常用于存储重心坐标

// 用于三角形边和点计算的专用临时向量
const _vab = /*@__PURE__*/ new Vector3(); // 从点A到点B的向量
const _vac = /*@__PURE__*/ new Vector3(); // 从点A到点C的向量
const _vbc = /*@__PURE__*/ new Vector3(); // 从点B到点C的向量
const _vap = /*@__PURE__*/ new Vector3(); // 从点A到测试点P的向量
const _vbp = /*@__PURE__*/ new Vector3(); // 从点B到测试点P的向量
const _vcp = /*@__PURE__*/ new Vector3(); // 从点C到测试点P的向量

// 用于四维向量计算的临时变量，主要用于缓冲区属性插值
const _v40 = /*@__PURE__*/ new Vector4(); // 临时四维向量0
const _v41 = /*@__PURE__*/ new Vector4(); // 临时四维向量1
const _v42 = /*@__PURE__*/ new Vector4(); // 临时四维向量2

/**
 * 几何三角形类，由三个向量定义的三个顶点构成
 * A geometric triangle as defined by three vectors representing its three corners.
 */
class Triangle {
  /**
   * 构造一个新的三角形
   * Constructs a new triangle.
   *
   * @param {Vector3} [a=(0,0,0)] - 三角形的第一个顶点 The first corner of the triangle.
   * @param {Vector3} [b=(0,0,0)] - 三角形的第二个顶点 The second corner of the triangle.
   * @param {Vector3} [c=(0,0,0)] - 三角形的第三个顶点 The third corner of the triangle.
   */
  constructor(a = new Vector3(), b = new Vector3(), c = new Vector3()) {
    /**
     * 三角形的第一个顶点
     * The first corner of the triangle.
     *
     * @type {Vector3}
     */
    this.a = a; // 将传入的第一个顶点赋值给实例属性

    /**
     * 三角形的第二个顶点
     * The second corner of the triangle.
     *
     * @type {Vector3}
     */
    this.b = b; // 将传入的第二个顶点赋值给实例属性

    /**
     * 三角形的第三个顶点
     * The third corner of the triangle.
     *
     * @type {Vector3}
     */
    this.c = c; // 将传入的第三个顶点赋值给实例属性
  }

  /**
   * 计算三角形的法向量
   * Computes the normal vector of a triangle.
   *
   * @param {Vector3} a - 三角形的第一个顶点 The first corner of the triangle.
   * @param {Vector3} b - 三角形的第二个顶点 The second corner of the triangle.
   * @param {Vector3} c - 三角形的第三个顶点 The third corner of the triangle.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 三角形的法向量 The triangle's normal.
   */
  static getNormal(a, b, c, target) {
    target.subVectors(c, b); // 计算从点B到点C的向量
    _v0.subVectors(a, b); // 计算从点B到点A的向量
    target.cross(_v0); // 计算两个向量的叉积得到法向量

    const targetLengthSq = target.lengthSq(); // 获取法向量的长度平方
    if (targetLengthSq > 0) {
      // 如果法向量长度大于0，则归一化法向量
      return target.multiplyScalar(1 / Math.sqrt(targetLengthSq));
    }

    // 如果三角形退化（三点共线），返回零向量
    return target.set(0, 0, 0);
  }

  /**
   * 从给定向量计算重心坐标
   * Computes a barycentric coordinates from the given vector.
   * 如果三角形退化则返回null
   * Returns `null` if the triangle is degenerate.
   *
   * @param {Vector3} point - 三维空间中的一个点 A point in 3D space.
   * @param {Vector3} a - 三角形的第一个顶点 The first corner of the triangle.
   * @param {Vector3} b - 三角形的第二个顶点 The second corner of the triangle.
   * @param {Vector3} c - 三角形的第三个顶点 The third corner of the triangle.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {?Vector3} 给定点的重心坐标 The barycentric coordinates for the given point
   */
  static getBarycoord(point, a, b, c, target) {
    // 基于算法：http://www.blackpawn.com/texts/pointinpoly/default.html
    // based on: http://www.blackpawn.com/texts/pointinpoly/default.html

    _v0.subVectors(c, a); // 计算向量AC
    _v1.subVectors(b, a); // 计算向量AB
    _v2.subVectors(point, a); // 计算向量AP

    const dot00 = _v0.dot(_v0); // AC·AC
    const dot01 = _v0.dot(_v1); // AC·AB
    const dot02 = _v0.dot(_v2); // AC·AP
    const dot11 = _v1.dot(_v1); // AB·AB
    const dot12 = _v1.dot(_v2); // AB·AP

    const denom = dot00 * dot11 - dot01 * dot01; // 计算分母

    // 共线或奇异三角形
    // collinear or singular triangle
    if (denom === 0) {
      target.set(0, 0, 0); // 设置为零向量
      return null; // 返回null表示无效
    }

    const invDenom = 1 / denom; // 计算分母的倒数
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom; // 计算重心坐标u
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom; // 计算重心坐标v

    // 重心坐标的和必须始终为1
    // barycentric coordinates must always sum to 1
    return target.set(1 - u - v, v, u); // 返回重心坐标(w, v, u)，其中w = 1-u-v
  }

  /**
   * 如果给定点投影到三角形平面上时位于三角形内部，则返回true
   * Returns `true` if the given point, when projected onto the plane of the
   * triangle, lies within the triangle.
   *
   * @param {Vector3} point - 要测试的三维空间中的点 The point in 3D space to test.
   * @param {Vector3} a - 三角形的第一个顶点 The first corner of the triangle.
   * @param {Vector3} b - 三角形的第二个顶点 The second corner of the triangle.
   * @param {Vector3} c - 三角形的第三个顶点 The third corner of the triangle.
   * @return {boolean} 给定点投影到三角形平面上时是否位于三角形内部
   * Whether the given point, when projected onto the plane of the triangle, lies within the triangle or not.
   */
  static containsPoint(point, a, b, c) {
    // 如果三角形退化，则无法包含任何点
    // if the triangle is degenerate then we can't contain a point
    if (this.getBarycoord(point, a, b, c, _v3) === null) {
      return false; // 退化三角形返回false
    }

    // 检查重心坐标是否都非负且和不超过1（即点在三角形内部）
    return _v3.x >= 0 && _v3.y >= 0 && _v3.x + _v3.y <= 1;
  }

  /**
   * 计算三角形上给定点的重心插值值
   * Computes the value barycentrically interpolated for the given point on the
   * triangle. 如果三角形退化则返回null
   * Returns `null` if the triangle is degenerate.
   *
   * @param {Vector3} point - 插值点的位置 Position of interpolated point.
   * @param {Vector3} p1 - 三角形的第一个顶点 The first corner of the triangle.
   * @param {Vector3} p2 - 三角形的第二个顶点 The second corner of the triangle.
   * @param {Vector3} p3 - 三角形的第三个顶点 The third corner of the triangle.
   * @param {Vector3} v1 - 第一个顶点的插值值 Value to interpolate of first vertex.
   * @param {Vector3} v2 - 第二个顶点的插值值 Value to interpolate of second vertex.
   * @param {Vector3} v3 - 第三个顶点的插值值 Value to interpolate of third vertex.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {?Vector3} 插值后的值 The interpolated value.
   */
  static getInterpolation(point, p1, p2, p3, v1, v2, v3, target) {
    // 获取点的重心坐标，如果三角形退化则返回null
    if (this.getBarycoord(point, p1, p2, p3, _v3) === null) {
      target.x = 0; // 设置x分量为0
      target.y = 0; // 设置y分量为0
      if ("z" in target) target.z = 0; // 如果存在z分量，设置为0
      if ("w" in target) target.w = 0; // 如果存在w分量，设置为0
      return null; // 返回null表示无效
    }

    target.setScalar(0); // 将目标向量初始化为零向量
    target.addScaledVector(v1, _v3.x); // 添加第一个顶点值乘以对应重心坐标
    target.addScaledVector(v2, _v3.y); // 添加第二个顶点值乘以对应重心坐标
    target.addScaledVector(v3, _v3.z); // 添加第三个顶点值乘以对应重心坐标

    return target; // 返回插值结果
  }

  /**
   * 根据给定的属性和索引计算重心插值值
   * Computes the value barycentrically interpolated for the given attribute and indices.
   *
   * @param {BufferAttribute} attr - 要插值的属性 The attribute to interpolate.
   * @param {number} i1 - 第一个顶点的索引 Index of first vertex.
   * @param {number} i2 - 第二个顶点的索引 Index of second vertex.
   * @param {number} i3 - 第三个顶点的索引 Index of third vertex.
   * @param {Vector3} barycoord - 用于插值的重心坐标值 The barycoordinate value to use to interpolate.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 插值后的属性值 The interpolated attribute value.
   */
  static getInterpolatedAttribute(attr, i1, i2, i3, barycoord, target) {
    _v40.setScalar(0); // 初始化临时向量0
    _v41.setScalar(0); // 初始化临时向量1
    _v42.setScalar(0); // 初始化临时向量2

    _v40.fromBufferAttribute(attr, i1); // 从缓冲区属性获取第一个顶点的值
    _v41.fromBufferAttribute(attr, i2); // 从缓冲区属性获取第二个顶点的值
    _v42.fromBufferAttribute(attr, i3); // 从缓冲区属性获取第三个顶点的值

    target.setScalar(0); // 将目标向量初始化为零向量
    target.addScaledVector(_v40, barycoord.x); // 添加第一个顶点值乘以对应重心坐标
    target.addScaledVector(_v41, barycoord.y); // 添加第二个顶点值乘以对应重心坐标
    target.addScaledVector(_v42, barycoord.z); // 添加第三个顶点值乘以对应重心坐标

    return target; // 返回插值结果
  }

  /**
   * 如果三角形朝向给定方向，则返回true
   * Returns `true` if the triangle is oriented towards the given direction.
   *
   * @param {Vector3} a - 三角形的第一个顶点 The first corner of the triangle.
   * @param {Vector3} b - 三角形的第二个顶点 The second corner of the triangle.
   * @param {Vector3} c - 三角形的第三个顶点 The third corner of the triangle.
   * @param {Vector3} direction - （归一化的）方向向量 The (normalized) direction vector.
   * @return {boolean} 三角形是否朝向给定方向 Whether the triangle is oriented towards the given direction or not.
   */
  static isFrontFacing(a, b, c, direction) {
    _v0.subVectors(c, b); // 计算从点B到点C的向量
    _v1.subVectors(a, b); // 计算从点B到点A的向量

    // 严格的正面朝向检测
    // strictly front facing
    return _v0.cross(_v1).dot(direction) < 0 ? true : false; // 叉积与方向向量的点积小于0表示正面朝向
  }

  /**
   * 通过复制给定值来设置三角形的顶点
   * Sets the triangle's vertices by copying the given values.
   *
   * @param {Vector3} a - 三角形的第一个顶点 The first corner of the triangle.
   * @param {Vector3} b - 三角形的第二个顶点 The second corner of the triangle.
   * @param {Vector3} c - 三角形的第三个顶点 The third corner of the triangle.
   * @return {Triangle} 对此三角形的引用 A reference to this triangle.
   */
  set(a, b, c) {
    this.a.copy(a); // 复制第一个顶点
    this.b.copy(b); // 复制第二个顶点
    this.c.copy(c); // 复制第三个顶点

    return this; // 返回自身以支持链式调用
  }

  /**
   * 通过复制给定数组值来设置三角形的顶点
   * Sets the triangle's vertices by copying the given array values.
   *
   * @param {Array<Vector3>} points - 包含3D点的数组 An array with 3D points.
   * @param {number} i0 - 表示三角形第一个顶点的数组索引 The array index representing the first corner of the triangle.
   * @param {number} i1 - 表示三角形第二个顶点的数组索引 The array index representing the second corner of the triangle.
   * @param {number} i2 - 表示三角形第三个顶点的数组索引 The array index representing the third corner of the triangle.
   * @return {Triangle} 对此三角形的引用 A reference to this triangle.
   */
  setFromPointsAndIndices(points, i0, i1, i2) {
    this.a.copy(points[i0]); // 从数组中复制第一个顶点
    this.b.copy(points[i1]); // 从数组中复制第二个顶点
    this.c.copy(points[i2]); // 从数组中复制第三个顶点

    return this; // 返回自身以支持链式调用
  }

  /**
   * 通过复制给定属性值来设置三角形的顶点
   * Sets the triangle's vertices by copying the given attribute values.
   *
   * @param {BufferAttribute} attribute - 包含3D点数据的缓冲区属性 A buffer attribute with 3D points data.
   * @param {number} i0 - 表示三角形第一个顶点的属性索引 The attribute index representing the first corner of the triangle.
   * @param {number} i1 - 表示三角形第二个顶点的属性索引 The attribute index representing the second corner of the triangle.
   * @param {number} i2 - 表示三角形第三个顶点的属性索引 The attribute index representing the third corner of the triangle.
   * @return {Triangle} 对此三角形的引用 A reference to this triangle.
   */
  setFromAttributeAndIndices(attribute, i0, i1, i2) {
    this.a.fromBufferAttribute(attribute, i0); // 从缓冲区属性中获取第一个顶点
    this.b.fromBufferAttribute(attribute, i1); // 从缓冲区属性中获取第二个顶点
    this.c.fromBufferAttribute(attribute, i2); // 从缓冲区属性中获取第三个顶点

    return this; // 返回自身以支持链式调用
  }

  /**
   * 返回一个复制了此实例值的新三角形
   * Returns a new triangle with copied values from this instance.
   *
   * @return {Triangle} 此实例的克隆 A clone of this instance.
   */
  clone() {
    return new this.constructor().copy(this); // 创建新实例并复制当前三角形的值
  }

  /**
   * 将给定三角形的值复制到此实例
   * Copies the values of the given triangle to this instance.
   *
   * @param {Triangle} triangle - 要复制的三角形 The triangle to copy.
   * @return {Triangle} 对此三角形的引用 A reference to this triangle.
   */
  copy(triangle) {
    this.a.copy(triangle.a); // 复制第一个顶点
    this.b.copy(triangle.b); // 复制第二个顶点
    this.c.copy(triangle.c); // 复制第三个顶点

    return this; // 返回自身以支持链式调用
  }

  /**
   * 计算三角形的面积
   * Computes the area of the triangle.
   *
   * @return {number} 三角形的面积 The triangle's area.
   */
  getArea() {
    _v0.subVectors(this.c, this.b); // 计算从点B到点C的向量
    _v1.subVectors(this.a, this.b); // 计算从点B到点A的向量

    return _v0.cross(_v1).length() * 0.5; // 叉积的长度乘以0.5得到三角形面积
  }

  /**
   * 计算三角形的中点（重心）
   * Computes the midpoint of the triangle.
   *
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 三角形的中点 The triangle's midpoint.
   */
  getMidpoint(target) {
    return target
      .addVectors(this.a, this.b) // 将第一个和第二个顶点相加
      .add(this.c) // 加上第三个顶点
      .multiplyScalar(1 / 3); // 除以3得到重心坐标
  }

  /**
   * 计算三角形的法向量
   * Computes the normal of the triangle.
   *
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 三角形的法向量 The triangle's normal.
   */
  getNormal(target) {
    return Triangle.getNormal(this.a, this.b, this.c, target); // 调用静态方法计算法向量
  }

  /**
   * 计算三角形所在的平面
   * Computes a plane the triangle lies within.
   *
   * @param {Plane} target - 用于存储方法结果的目标平面 The target plane that is used to store the method's result.
   * @return {Plane} 三角形所在的平面 The plane the triangle lies within.
   */
  getPlane(target) {
    return target.setFromCoplanarPoints(this.a, this.b, this.c); // 通过三个共面点设置平面
  }

  /**
   * 从给定向量计算重心坐标
   * Computes a barycentric coordinates from the given vector.
   * 如果三角形退化则返回null
   * Returns `null` if the triangle is degenerate.
   *
   * @param {Vector3} point - 三维空间中的一个点 A point in 3D space.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {?Vector3} 给定点的重心坐标 The barycentric coordinates for the given point
   */
  getBarycoord(point, target) {
    return Triangle.getBarycoord(point, this.a, this.b, this.c, target); // 调用静态方法计算重心坐标
  }

  /**
   * 计算三角形上给定点的重心插值值
   * Computes the value barycentrically interpolated for the given point on the
   * triangle. 如果三角形退化则返回null
   * Returns `null` if the triangle is degenerate.
   *
   * @param {Vector3} point - 插值点的位置 Position of interpolated point.
   * @param {Vector3} v1 - 第一个顶点的插值值 Value to interpolate of first vertex.
   * @param {Vector3} v2 - 第二个顶点的插值值 Value to interpolate of second vertex.
   * @param {Vector3} v3 - 第三个顶点的插值值 Value to interpolate of third vertex.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {?Vector3} 插值后的值 The interpolated value.
   */
  getInterpolation(point, v1, v2, v3, target) {
    return Triangle.getInterpolation(point, this.a, this.b, this.c, v1, v2, v3, target); // 调用静态方法进行插值计算
  }

  /**
   * 如果给定点投影到三角形平面上时位于三角形内部，则返回true
   * Returns `true` if the given point, when projected onto the plane of the
   * triangle, lies within the triangle.
   *
   * @param {Vector3} point - 要测试的三维空间中的点 The point in 3D space to test.
   * @return {boolean} 给定点投影到三角形平面上时是否位于三角形内部
   * Whether the given point, when projected onto the plane of the triangle, lies within the triangle or not.
   */
  containsPoint(point) {
    return Triangle.containsPoint(point, this.a, this.b, this.c); // 调用静态方法检查点是否在三角形内
  }

  /**
   * 如果三角形朝向给定方向，则返回true
   * Returns `true` if the triangle is oriented towards the given direction.
   *
   * @param {Vector3} direction - （归一化的）方向向量 The (normalized) direction vector.
   * @return {boolean} 三角形是否朝向给定方向 Whether the triangle is oriented towards the given direction or not.
   */
  isFrontFacing(direction) {
    return Triangle.isFrontFacing(this.a, this.b, this.c, direction); // 调用静态方法检查三角形朝向
  }

  /**
   * 如果此三角形与给定的包围盒相交，则返回true
   * Returns `true` if this triangle intersects with the given box.
   *
   * @param {Box3} box - 要相交的包围盒 The box to intersect.
   * @return {boolean} 此三角形是否与给定包围盒相交 Whether this triangle intersects with the given box or not.
   */
  intersectsBox(box) {
    return box.intersectsTriangle(this); // 调用包围盒的方法检查与三角形的相交
  }

  /**
   * 返回三角形上距离给定点最近的点
   * Returns the closest point on the triangle to the given point.
   *
   * @param {Vector3} p - 要计算最近点的点 The point to compute the closest point for.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 三角形上的最近点 The closest point on the triangle.
   */
  closestPointToPoint(p, target) {
    const a = this.a, // 三角形顶点A
      b = this.b, // 三角形顶点B
      c = this.c; // 三角形顶点C
    let v, w; // 重心坐标参数

    // 算法来源：Christer Ericson的《实时碰撞检测》
    // algorithm thanks to Real-Time Collision Detection by Christer Ericson,
    // 由Morgan Kaufmann Publishers出版，(c) 2005 Elsevier Inc.
    // published by Morgan Kaufmann Publishers, (c) 2005 Elsevier Inc.,
    // 详细解释见第5.1.5章节
    // under the accompanying license; see chapter 5.1.5 for detailed explanation.
    // 基本思想是通过最少的冗余计算来区分点位于三角形的哪个Voronoi区域
    // basically, we're distinguishing which of the voronoi regions of the triangle
    // the point lies in with the minimum amount of redundant computation.

    _vab.subVectors(b, a); // 计算边向量AB
    _vac.subVectors(c, a); // 计算边向量AC
    _vap.subVectors(p, a); // 计算从A到P的向量
    const d1 = _vab.dot(_vap); // AB·AP
    const d2 = _vac.dot(_vap); // AC·AP
    if (d1 <= 0 && d2 <= 0) {
      // 顶点A的Voronoi区域；重心坐标(1, 0, 0)
      // vertex region of A; barycentric coords (1, 0, 0)
      return target.copy(a); // 最近点就是顶点A
    }

    _vbp.subVectors(p, b); // 计算从B到P的向量
    const d3 = _vab.dot(_vbp); // AB·BP
    const d4 = _vac.dot(_vbp); // AC·BP
    if (d3 >= 0 && d4 <= d3) {
      // 顶点B的Voronoi区域；重心坐标(0, 1, 0)
      // vertex region of B; barycentric coords (0, 1, 0)
      return target.copy(b); // 最近点就是顶点B
    }

    const vc = d1 * d4 - d3 * d2; // 计算重心坐标判别式
    if (vc <= 0 && d1 >= 0 && d3 <= 0) {
      v = d1 / (d1 - d3); // 计算边AB上的参数
      // 边AB的Voronoi区域；重心坐标(1-v, v, 0)
      // edge region of AB; barycentric coords (1-v, v, 0)
      return target.copy(a).addScaledVector(_vab, v); // 最近点在边AB上
    }

    _vcp.subVectors(p, c); // 计算从C到P的向量
    const d5 = _vab.dot(_vcp); // AB·CP
    const d6 = _vac.dot(_vcp); // AC·CP
    if (d6 >= 0 && d5 <= d6) {
      // 顶点C的Voronoi区域；重心坐标(0, 0, 1)
      // vertex region of C; barycentric coords (0, 0, 1)
      return target.copy(c); // 最近点就是顶点C
    }

    const vb = d5 * d2 - d1 * d6; // 计算重心坐标判别式
    if (vb <= 0 && d2 >= 0 && d6 <= 0) {
      w = d2 / (d2 - d6); // 计算边AC上的参数
      // 边AC的Voronoi区域；重心坐标(1-w, 0, w)
      // edge region of AC; barycentric coords (1-w, 0, w)
      return target.copy(a).addScaledVector(_vac, w); // 最近点在边AC上
    }

    const va = d3 * d6 - d5 * d4; // 计算重心坐标判别式
    if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
      _vbc.subVectors(c, b); // 计算边向量BC
      w = (d4 - d3) / (d4 - d3 + (d5 - d6)); // 计算边BC上的参数
      // 边BC的Voronoi区域；重心坐标(0, 1-w, w)
      // edge region of BC; barycentric coords (0, 1-w, w)
      return target.copy(b).addScaledVector(_vbc, w); // 最近点在边BC上
    }

    // 面区域：点在三角形内部
    // face region
    const denom = 1 / (va + vb + vc); // 计算重心坐标归一化因子
    // u = va * denom（第一个重心坐标，这里没有使用）
    v = vb * denom; // 第二个重心坐标
    w = vc * denom; // 第三个重心坐标

    // 使用重心坐标计算三角形内部的最近点
    return target.copy(a).addScaledVector(_vab, v).addScaledVector(_vac, w);
  }

  /**
   * 如果此三角形与给定三角形相等，则返回true
   * Returns `true` if this triangle is equal with the given one.
   *
   * @param {Triangle} triangle - 要测试相等性的三角形 The triangle to test for equality.
   * @return {boolean} 此三角形是否与给定三角形相等 Whether this triangle is equal with the given one.
   */
  equals(triangle) {
    // 比较三个顶点是否都相等
    return triangle.a.equals(this.a) && triangle.b.equals(this.b) && triangle.c.equals(this.c);
  }
}

// 导出Triangle类供其他模块使用
export { Triangle };
