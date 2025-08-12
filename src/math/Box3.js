// 从Vector3模块导入三维向量类
import { Vector3 } from "./Vector3.js";

/**
 * 表示3D空间中的轴对齐包围盒（AABB）
 * Represents an axis-aligned bounding box (AABB) in 3D space.
 */
class Box3 {
  /**
   * 构造一个新的包围盒
   * Constructs a new bounding box.
   *
   * @param {Vector3} [min=(Infinity,Infinity,Infinity)] - 表示包围盒下边界的向量 A vector representing the lower boundary of the box.
   * @param {Vector3} [max=(-Infinity,-Infinity,-Infinity)] - 表示包围盒上边界的向量 A vector representing the upper boundary of the box.
   */
  constructor(min = new Vector3(+Infinity, +Infinity, +Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity)) {
    /**
     * 此标志可用于类型测试
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isBox3 = true;

    /**
     * 包围盒的下边界（最小值）
     * The lower boundary of the box.
     *
     * @type {Vector3}
     */
    this.min = min;

    /**
     * 包围盒的上边界（最大值）
     * The upper boundary of the box.
     *
     * @type {Vector3}
     */
    this.max = max;
  }

  /**
   * 设置此包围盒的下边界和上边界
   * 请注意，此方法只复制给定对象的值
   * Sets the lower and upper boundaries of this box.
   * Please note that this method only copies the values from the given objects.
   *
   * @param {Vector3} min - 包围盒的下边界 The lower boundary of the box.
   * @param {Vector3} max - 包围盒的上边界 The upper boundary of the box.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  set(min, max) {
    // 复制最小值向量
    this.min.copy(min);
    // 复制最大值向量
    this.max.copy(max);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 设置此包围盒的上下边界，使其包围给定数组中的位置数据
   * Sets the upper and lower bounds of this box so it encloses the position data
   * in the given array.
   *
   * @param {Array<number>} array - 包含3D位置数据的数组 An array holding 3D position data.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  setFromArray(array) {
    // 首先清空包围盒
    this.makeEmpty();

    // 遍历数组中的每个3D点（每3个元素为一组）
    for (let i = 0, il = array.length; i < il; i += 3) {
      // 从数组中创建向量并扩展包围盒以包含该点
      this.expandByPoint(_vector.fromArray(array, i));
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 设置此包围盒的上下边界，使其包围给定缓冲区属性中的位置数据
   * Sets the upper and lower bounds of this box so it encloses the position data
   * in the given buffer attribute.
   *
   * @param {BufferAttribute} attribute - 包含3D位置数据的缓冲区属性 A buffer attribute holding 3D position data.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  setFromBufferAttribute(attribute) {
    // 首先清空包围盒
    this.makeEmpty();

    // 遍历缓冲区属性中的每个顶点
    for (let i = 0, il = attribute.count; i < il; i++) {
      // 从缓冲区属性中获取顶点位置并扩展包围盒
      this.expandByPoint(_vector.fromBufferAttribute(attribute, i));
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 设置此包围盒的上下边界，使其包围给定数组中的位置数据
   * Sets the upper and lower bounds of this box so it encloses the position data
   * in the given array.
   *
   * @param {Array<Vector3>} points - 包含3D位置数据的Vector3实例数组 An array holding 3D position data as instances of {@link Vector3}.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  setFromPoints(points) {
    // 首先清空包围盒
    this.makeEmpty();

    // 遍历点数组中的每个Vector3点
    for (let i = 0, il = points.length; i < il; i++) {
      // 扩展包围盒以包含当前点
      this.expandByPoint(points[i]);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将此包围盒以给定的中心向量为中心，并设置包围盒的宽度、高度和深度为给定的尺寸值
   * Centers this box on the given center vector and sets this box's width, height and
   * depth to the given size values.
   *
   * @param {Vector3} center - 包围盒的中心点 The center of the box.
   * @param {Vector3} size - 包围盒在x、y、z方向的尺寸 The x, y and z dimensions of the box.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  setFromCenterAndSize(center, size) {
    // 计算尺寸的一半
    const halfSize = _vector.copy(size).multiplyScalar(0.5);

    // 设置最小边界为中心减去半尺寸
    this.min.copy(center).sub(halfSize);
    // 设置最大边界为中心加上半尺寸
    this.max.copy(center).add(halfSize);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 计算给定3D对象（包括其子对象）的世界轴对齐包围盒，
   * 考虑对象及其子对象的世界变换。该函数可能会产生比严格必要更大的包围盒。
   * Computes the world-axis-aligned bounding box for the given 3D object
   * (including its children), accounting for the object's, and children's,
   * world transforms. The function may result in a larger box than strictly necessary.
   *
   * @param {Object3D} object - 要计算包围盒的3D对象 The 3D object to compute the bounding box for.
   * @param {boolean} [precise=false] - 如果设置为true，该方法会以更多计算为代价计算最小的世界轴对齐包围盒 If set to `true`, the method computes the smallest world-axis-aligned bounding box at the expense of more computation.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  setFromObject(object, precise = false) {
    // 首先清空包围盒
    this.makeEmpty();

    // 通过扩展对象来设置包围盒
    return this.expandByObject(object, precise);
  }

  /**
   * 返回一个复制了此实例值的新包围盒
   * Returns a new box with copied values from this instance.
   *
   * @return {Box3} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 创建新的构造函数实例并复制当前值
    return new this.constructor().copy(this);
  }

  /**
   * 将给定包围盒的值复制到此实例
   * Copies the values of the given box to this instance.
   *
   * @param {Box3} box - 要复制的包围盒 The box to copy.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  copy(box) {
    // 复制最小边界
    this.min.copy(box.min);
    // 复制最大边界
    this.max.copy(box.max);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 使此包围盒为空，这意味着它在3D空间中包围零空间
   * Makes this box empty which means in encloses a zero space in 3D.
   *
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  makeEmpty() {
    // 将最小边界设置为正无穷大
    this.min.x = this.min.y = this.min.z = +Infinity;
    // 将最大边界设置为负无穷大
    this.max.x = this.max.y = this.max.z = -Infinity;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 如果此包围盒在其边界内包含零个点，则返回true
   * 注意，具有相等下边界和上边界的包围盒仍然包含一个点，即两个边界共享的点
   * Returns true if this box includes zero points within its bounds.
   * Note that a box with equal lower and upper bounds still includes one
   * point, the one both bounds share.
   *
   * @return {boolean} 此包围盒是否为空 Whether this box is empty or not.
   */
  isEmpty() {
    // 这是比（体积 <= 0）更稳健的空检查，因为当两个轴为负时体积可能为正
    // this is a more robust check for empty than ( volume <= 0 ) because volume can get positive with two negative axes

    return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
  }

  /**
   * 返回此包围盒的中心点
   * Returns the center point of this box.
   *
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 中心点 The center point.
   */
  getCenter(target) {
    // 如果包围盒为空则返回原点，否则计算最小值和最大值的中点
    return this.isEmpty() ? target.set(0, 0, 0) : target.addVectors(this.min, this.max).multiplyScalar(0.5);
  }

  /**
   * 返回此包围盒的尺寸
   * Returns the dimensions of this box.
   *
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 尺寸 The size.
   */
  getSize(target) {
    // 如果包围盒为空则返回零向量，否则计算最大值减去最小值
    return this.isEmpty() ? target.set(0, 0, 0) : target.subVectors(this.max, this.min);
  }

  /**
   * 扩展此包围盒的边界以包含给定的点
   * Expands the boundaries of this box to include the given point.
   *
   * @param {Vector3} point - 应该被包围盒包含的点 The point that should be included by the bounding box.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  expandByPoint(point) {
    // 更新最小边界为当前最小值和点的最小值
    this.min.min(point);
    // 更新最大边界为当前最大值和点的最大值
    this.max.max(point);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 通过给定向量等边地扩展此包围盒。包围盒的宽度将在两个方向上
   * 按向量的x分量扩展。包围盒的高度将在两个方向上按向量的y分量扩展。
   * 包围盒的深度将在两个方向上按向量的z分量扩展。
   * Expands this box equilaterally by the given vector. The width of this
   * box will be expanded by the x component of the vector in both
   * directions. The height of this box will be expanded by the y component of
   * the vector in both directions. The depth of this box will be
   * expanded by the z component of the vector in both directions.
   *
   * @param {Vector3} vector - 应该扩展包围盒的向量 The vector that should expand the bounding box.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  expandByVector(vector) {
    // 最小边界减去向量
    this.min.sub(vector);
    // 最大边界加上向量
    this.max.add(vector);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 通过给定标量扩展包围盒的每个维度。如果为负值，包围盒的维度将收缩。
   * Expands each dimension of the box by the given scalar. If negative, the
   * dimensions of the box will be contracted.
   *
   * @param {number} scalar - 应该扩展包围盒的标量值 The scalar value that should expand the bounding box.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  expandByScalar(scalar) {
    // 最小边界减去标量
    this.min.addScalar(-scalar);
    // 最大边界加上标量
    this.max.addScalar(scalar);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 扩展此包围盒的边界以包含给定的3D对象及其子对象，
   * 考虑对象及其子对象的世界变换。该函数可能会产生比严格必要更大的包围盒
   * （除非precise参数设置为true）。
   * Expands the boundaries of this box to include the given 3D object and
   * its children, accounting for the object's, and children's, world
   * transforms. The function may result in a larger box than strictly
   * necessary (unless the precise parameter is set to true).
   *
   * @param {Object3D} object - 应该扩展包围盒的3D对象 The 3D object that should expand the bounding box.
   * @param {boolean} precise - 如果设置为true，该方法会以更多计算为代价尽可能少地扩展包围盒 If set to `true`, the method expands the bounding box as little as necessary at the expense of more computation.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  expandByObject(object, precise = false) {
    // 计算对象（包括其子对象）的世界轴对齐包围盒，
    // 考虑对象及其子对象的世界变换
    // Computes the world-axis-aligned bounding box of an object (including its children),
    // accounting for both the object's, and children's, world transforms

    // 更新对象的世界矩阵
    object.updateWorldMatrix(false, false);

    // 获取对象的几何体
    const geometry = object.geometry;

    if (geometry !== undefined) {
      // 获取位置属性
      const positionAttribute = geometry.getAttribute("position");

      // 基于顶点数据的精确AABB计算至少需要位置属性
      // 目前不支持实例化，使用常规（保守）代码路径
      // precise AABB computation based on vertex data requires at least a position attribute.
      // instancing isn't supported so far and uses the normal (conservative) code path.

      if (precise === true && positionAttribute !== undefined && object.isInstancedMesh !== true) {
        // 精确模式：遍历每个顶点
        for (let i = 0, l = positionAttribute.count; i < l; i++) {
          if (object.isMesh === true) {
            // 如果是网格，获取顶点位置
            object.getVertexPosition(i, _vector);
          } else {
            // 否则从缓冲区属性获取
            _vector.fromBufferAttribute(positionAttribute, i);
          }

          // 应用世界变换矩阵
          _vector.applyMatrix4(object.matrixWorld);
          // 扩展包围盒以包含该点
          this.expandByPoint(_vector);
        }
      } else {
        // 非精确模式：使用现有的包围盒
        if (object.boundingBox !== undefined) {
          // 对象级包围盒
          // object-level bounding box

          if (object.boundingBox === null) {
            // 如果包围盒为空，计算包围盒
            object.computeBoundingBox();
          }

          // 复制对象的包围盒
          _box.copy(object.boundingBox);
        } else {
          // 几何体级包围盒
          // geometry-level bounding box

          if (geometry.boundingBox === null) {
            // 如果几何体包围盒为空，计算包围盒
            geometry.computeBoundingBox();
          }

          // 复制几何体的包围盒
          _box.copy(geometry.boundingBox);
        }

        // 应用世界变换矩阵
        _box.applyMatrix4(object.matrixWorld);

        // 与当前包围盒合并
        this.union(_box);
      }
    }

    // 获取子对象
    const children = object.children;

    // 递归处理所有子对象
    for (let i = 0, l = children.length; i < l; i++) {
      this.expandByObject(children[i], precise);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 如果给定点位于此包围盒内或边界上，则返回true
   * Returns `true` if the given point lies within or on the boundaries of this box.
   *
   * @param {Vector3} point - 要测试的点 The point to test.
   * @return {boolean} 包围盒是否包含给定点 Whether the bounding box contains the given point or not.
   */
  containsPoint(point) {
    // 检查点的x、y、z坐标是否都在包围盒的最小值和最大值之间
    return point.x >= this.min.x && point.x <= this.max.x && point.y >= this.min.y && point.y <= this.max.y && point.z >= this.min.z && point.z <= this.max.z;
  }

  /**
   * 如果此包围盒包含给定包围盒的全部，则返回true。
   * 如果此包围盒与给定包围盒相同，此函数也返回true。
   * Returns `true` if this bounding box includes the entirety of the given bounding box.
   * If this box and the given one are identical, this function also returns `true`.
   *
   * @param {Box3} box - 要测试的包围盒 The bounding box to test.
   * @return {boolean} 包围盒是否包含给定包围盒 Whether the bounding box contains the given bounding box or not.
   */
  containsBox(box) {
    // 检查此包围盒的最小值是否小于等于给定包围盒的最小值，且给定包围盒的最大值是否小于等于此包围盒的最大值
    return this.min.x <= box.min.x && box.max.x <= this.max.x && this.min.y <= box.min.y && box.max.y <= this.max.y && this.min.z <= box.min.z && box.max.z <= this.max.z;
  }

  /**
   * 返回一个点作为此包围盒宽度、高度和深度的比例
   * Returns a point as a proportion of this box's width, height and depth.
   *
   * @param {Vector3} point - 3D空间中的一个点 A point in 3D space.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 作为此包围盒宽度、高度和深度比例的点 A point as a proportion of this box's width, height and depth.
   */
  getParameter(point, target) {
    // 如果包围盒的某个尺寸维度为0，这可能会导致除零错误
    // This can potentially have a divide by zero if the box
    // has a size dimension of 0.

    // 计算点在包围盒中的相对位置（0-1之间的比例）
    return target.set((point.x - this.min.x) / (this.max.x - this.min.x), (point.y - this.min.y) / (this.max.y - this.min.y), (point.z - this.min.z) / (this.max.z - this.min.z));
  }

  /**
   * 如果给定包围盒与此包围盒相交，则返回true
   * Returns `true` if the given bounding box intersects with this bounding box.
   *
   * @param {Box3} box - 要测试的包围盒 The bounding box to test.
   * @return {boolean} 给定包围盒是否与此包围盒相交 Whether the given bounding box intersects with this bounding box.
   */
  intersectsBox(box) {
    // 使用6个分割平面来排除相交
    // using 6 splitting planes to rule out intersections.
    return box.max.x >= this.min.x && box.min.x <= this.max.x && box.max.y >= this.min.y && box.min.y <= this.max.y && box.max.z >= this.min.z && box.min.z <= this.max.z;
  }

  /**
   * 如果给定包围球与此包围盒相交，则返回true
   * Returns `true` if the given bounding sphere intersects with this bounding box.
   *
   * @param {Sphere} sphere - 要测试的包围球 The bounding sphere to test.
   * @return {boolean} 给定包围球是否与此包围盒相交 Whether the given bounding sphere intersects with this bounding box.
   */
  intersectsSphere(sphere) {
    // 找到AABB上最接近球心的点
    // Find the point on the AABB closest to the sphere center.
    this.clampPoint(sphere.center, _vector);

    // 如果该点在球内，则AABB和球相交
    // If that point is inside the sphere, the AABB and sphere intersect.
    return _vector.distanceToSquared(sphere.center) <= sphere.radius * sphere.radius;
  }

  /**
   * 如果给定平面与此包围盒相交，则返回true
   * Returns `true` if the given plane intersects with this bounding box.
   *
   * @param {Plane} plane - 要测试的平面 The plane to test.
   * @return {boolean} 给定平面是否与此包围盒相交 Whether the given plane intersects with this bounding box.
   */
  intersectsPlane(plane) {
    // 我们计算最小和最大点积值。如果这些值在平面的同一侧（背面或正面），则没有相交
    // We compute the minimum and maximum dot product values. If those values
    // are on the same side (back or front) of the plane, then there is no intersection.

    let min, max;

    // 根据平面法向量的x分量符号选择合适的包围盒顶点
    if (plane.normal.x > 0) {
      min = plane.normal.x * this.min.x;
      max = plane.normal.x * this.max.x;
    } else {
      min = plane.normal.x * this.max.x;
      max = plane.normal.x * this.min.x;
    }

    // 根据平面法向量的y分量符号累加计算
    if (plane.normal.y > 0) {
      min += plane.normal.y * this.min.y;
      max += plane.normal.y * this.max.y;
    } else {
      min += plane.normal.y * this.max.y;
      max += plane.normal.y * this.min.y;
    }

    // 根据平面法向量的z分量符号累加计算
    if (plane.normal.z > 0) {
      min += plane.normal.z * this.min.z;
      max += plane.normal.z * this.max.z;
    } else {
      min += plane.normal.z * this.max.z;
      max += plane.normal.z * this.min.z;
    }

    // 检查包围盒是否跨越平面
    return min <= -plane.constant && max >= -plane.constant;
  }

  /**
   * 如果给定三角形与此包围盒相交，则返回true
   * Returns `true` if the given triangle intersects with this bounding box.
   *
   * @param {Triangle} triangle - 要测试的三角形 The triangle to test.
   * @return {boolean} 给定三角形是否与此包围盒相交 Whether the given triangle intersects with this bounding box.
   */
  intersectsTriangle(triangle) {
    // 如果包围盒为空，直接返回false
    if (this.isEmpty()) {
      return false;
    }

    // 计算包围盒中心和范围
    // compute box center and extents
    this.getCenter(_center);
    _extents.subVectors(this.max, _center);

    // 将三角形平移到AABB原点
    // translate triangle to aabb origin
    _v0.subVectors(triangle.a, _center);
    _v1.subVectors(triangle.b, _center);
    _v2.subVectors(triangle.c, _center);

    // 计算三角形的边向量
    // compute edge vectors for triangle
    _f0.subVectors(_v1, _v0);
    _f1.subVectors(_v2, _v1);
    _f2.subVectors(_v0, _v2);

    // 测试由三角形边和AABB边的叉积组合给出的轴
    // 对AABB的3条边与三角形的3条边进行轴测试 = 9个分离轴
    // axis_ij = u_i x f_j (u0, u1, u2 = AABB的面法向量 = x,y,z轴向量，因为AABB是轴对齐的)
    // test against axes that are given by cross product combinations of the edges of the triangle and the edges of the aabb
    // make an axis testing of each of the 3 sides of the aabb against each of the 3 sides of the triangle = 9 axis of separation
    // axis_ij = u_i x f_j (u0, u1, u2 = face normals of aabb = x,y,z axes vectors since aabb is axis aligned)
    let axes = [0, -_f0.z, _f0.y, 0, -_f1.z, _f1.y, 0, -_f2.z, _f2.y, _f0.z, 0, -_f0.x, _f1.z, 0, -_f1.x, _f2.z, 0, -_f2.x, -_f0.y, _f0.x, 0, -_f1.y, _f1.x, 0, -_f2.y, _f2.x, 0];
    if (!satForAxes(axes, _v0, _v1, _v2, _extents)) {
      return false;
    }

    // 测试AABB的3个面法向量
    // test 3 face normals from the aabb
    axes = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    if (!satForAxes(axes, _v0, _v1, _v2, _extents)) {
      return false;
    }

    // 最后测试三角形的面法向量
    // 这里使用已经存在的三角形边向量
    // finally testing the face normal of the triangle
    // use already existing triangle edge vectors here
    _triangleNormal.crossVectors(_f0, _f1);
    axes = [_triangleNormal.x, _triangleNormal.y, _triangleNormal.z];

    return satForAxes(axes, _v0, _v1, _v2, _extents);
  }

  /**
   * 将给定点夹紧在此包围盒的边界内
   * Clamps the given point within the bounds of this box.
   *
   * @param {Vector3} point - 要夹紧的点 The point to clamp.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 夹紧后的点 The clamped point.
   */
  clampPoint(point, target) {
    // 复制点并将其夹紧在包围盒的最小值和最大值之间
    return target.copy(point).clamp(this.min, this.max);
  }

  /**
   * 返回从此包围盒的任何边到指定点的欧几里得距离。
   * 如果给定点位于此包围盒内，距离将为0。
   * Returns the euclidean distance from any edge of this box to the specified point. If
   * the given point lies inside of this box, the distance will be `0`.
   *
   * @param {Vector3} point - 要计算距离的点 The point to compute the distance to.
   * @return {number} 欧几里得距离 The euclidean distance.
   */
  distanceToPoint(point) {
    // 将点夹紧到包围盒内，然后计算到原点的距离
    return this.clampPoint(point, _vector).distanceTo(point);
  }

  /**
   * 返回包围此包围盒的包围球
   * Returns a bounding sphere that encloses this bounding box.
   *
   * @param {Sphere} target - 用于存储方法结果的目标球 The target sphere that is used to store the method's result.
   * @return {Sphere} 包围此包围盒的包围球 The bounding sphere that encloses this bounding box.
   */
  getBoundingSphere(target) {
    if (this.isEmpty()) {
      // 如果包围盒为空，使目标球也为空
      target.makeEmpty();
    } else {
      // 设置球心为包围盒中心
      this.getCenter(target.center);

      // 设置半径为包围盒尺寸长度的一半
      target.radius = this.getSize(_vector).length() * 0.5;
    }

    // 返回目标球
    return target;
  }

  /**
   * 计算此包围盒与给定包围盒的相交，将此包围盒的上边界设置为两个包围盒上边界的较小者，
   * 将此包围盒的下边界设置为两个包围盒下边界的较大者。如果没有重叠，使此包围盒为空。
   * Computes the intersection of this bounding box and the given one, setting the upper
   * bound of this box to the lesser of the two boxes' upper bounds and the
   * lower bound of this box to the greater of the two boxes' lower bounds. If
   * there's no overlap, makes this box empty.
   *
   * @param {Box3} box - 要相交的包围盒 The bounding box to intersect with.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  intersect(box) {
    // 最小边界取两者的最大值
    this.min.max(box.min);
    // 最大边界取两者的最小值
    this.max.min(box.max);

    // 确保如果没有重叠，结果是完全空的，而不是带有非无穷大值的轻微空值，这会导致后续相交错误地返回有效值
    // ensure that if there is no overlap, the result is fully empty, not slightly empty with non-inf/+inf values that will cause subsequence intersects to erroneously return valid values.
    if (this.isEmpty()) this.makeEmpty();

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 计算此包围盒与另一个给定包围盒的并集，将此包围盒的上边界设置为两个包围盒上边界的较大者，
   * 将此包围盒的下边界设置为两个包围盒下边界的较小者。
   * Computes the union of this box and another and the given one, setting the upper
   * bound of this box to the greater of the two boxes' upper bounds and the
   * lower bound of this box to the lesser of the two boxes' lower bounds.
   *
   * @param {Box3} box - 要与此实例合并的包围盒 The bounding box that will be unioned with this instance.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  union(box) {
    // 最小边界取两者的最小值
    this.min.min(box.min);
    // 最大边界取两者的最大值
    this.max.max(box.max);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 通过给定的4x4变换矩阵变换此包围盒
   * Transforms this bounding box by the given 4x4 transformation matrix.
   *
   * @param {Matrix4} matrix - 变换矩阵 The transformation matrix.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  applyMatrix4(matrix) {
    // 空包围盒的变换仍然是空包围盒
    // transform of empty box is an empty box.
    if (this.isEmpty()) return this;

    // 注意：我使用二进制模式来指定下面所有2^3种组合
    // NOTE: I am using a binary pattern to specify all 2^3 combinations below
    _points[0].set(this.min.x, this.min.y, this.min.z).applyMatrix4(matrix); // 000
    _points[1].set(this.min.x, this.min.y, this.max.z).applyMatrix4(matrix); // 001
    _points[2].set(this.min.x, this.max.y, this.min.z).applyMatrix4(matrix); // 010
    _points[3].set(this.min.x, this.max.y, this.max.z).applyMatrix4(matrix); // 011
    _points[4].set(this.max.x, this.min.y, this.min.z).applyMatrix4(matrix); // 100
    _points[5].set(this.max.x, this.min.y, this.max.z).applyMatrix4(matrix); // 101
    _points[6].set(this.max.x, this.max.y, this.min.z).applyMatrix4(matrix); // 110
    _points[7].set(this.max.x, this.max.y, this.max.z).applyMatrix4(matrix); // 111

    // 从变换后的点重新设置包围盒
    this.setFromPoints(_points);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将给定偏移量添加到此包围盒的上边界和下边界，有效地在3D空间中移动它
   * Adds the given offset to both the upper and lower bounds of this bounding box,
   * effectively moving it in 3D space.
   *
   * @param {Vector3} offset - 应该用于平移包围盒的偏移量 The offset that should be used to translate the bounding box.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  translate(offset) {
    // 最小边界加上偏移量
    this.min.add(offset);
    // 最大边界加上偏移量
    this.max.add(offset);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 如果此包围盒与给定包围盒相等，则返回true
   * Returns `true` if this bounding box is equal with the given one.
   *
   * @param {Box3} box - 要测试相等性的包围盒 The box to test for equality.
   * @return {boolean} 此包围盒是否与给定包围盒相等 Whether this bounding box is equal with the given one.
   */
  equals(box) {
    // 比较最小值和最大值是否都相等
    return box.min.equals(this.min) && box.max.equals(this.max);
  }

  /**
   * 返回包围盒的序列化结构
   * Returns a serialized structure of the bounding box.
   *
   * @return {Object} 表示对象状态的序列化结构 Serialized structure with fields representing the object state.
   */
  toJSON() {
    return {
      // 将最小值转换为数组
      min: this.min.toArray(),
      // 将最大值转换为数组
      max: this.max.toArray(),
    };
  }

  /**
   * 从序列化的JSON设置包围盒
   * Returns a serialized structure of the bounding box.
   *
   * @param {Object} json - 要设置包围盒的序列化JSON The serialized json to set the box from.
   * @return {Box3} 对此包围盒的引用 A reference to this bounding box.
   */
  fromJSON(json) {
    // 从JSON数组设置最小值
    this.min.fromArray(json.min);
    // 从JSON数组设置最大值
    this.max.fromArray(json.max);
    // 返回自身以支持链式调用
    return this;
  }
}

// 用于矩阵变换的8个包围盒顶点
// 8 bounding box vertices for matrix transformation
const _points = [
  /*@__PURE__*/ new Vector3(),
  /*@__PURE__*/ new Vector3(),
  /*@__PURE__*/ new Vector3(),
  /*@__PURE__*/ new Vector3(),
  /*@__PURE__*/ new Vector3(),
  /*@__PURE__*/ new Vector3(),
  /*@__PURE__*/ new Vector3(),
  /*@__PURE__*/ new Vector3(),
];

// 临时向量，用于各种计算
// Temporary vector for various calculations
const _vector = /*@__PURE__*/ new Vector3();

// 临时包围盒，用于计算
// Temporary bounding box for calculations
const _box = /*@__PURE__*/ new Box3();

// 三角形中心化顶点
// triangle centered vertices

const _v0 = /*@__PURE__*/ new Vector3();
const _v1 = /*@__PURE__*/ new Vector3();
const _v2 = /*@__PURE__*/ new Vector3();

// 三角形边向量
// triangle edge vectors

const _f0 = /*@__PURE__*/ new Vector3();
const _f1 = /*@__PURE__*/ new Vector3();
const _f2 = /*@__PURE__*/ new Vector3();

// 包围盒中心点
// Bounding box center
const _center = /*@__PURE__*/ new Vector3();
// 包围盒范围（从中心到边界的距离）
// Bounding box extents (distance from center to boundary)
const _extents = /*@__PURE__*/ new Vector3();
// 三角形法向量
// Triangle normal vector
const _triangleNormal = /*@__PURE__*/ new Vector3();
// 测试轴向量
// Test axis vector
const _testAxis = /*@__PURE__*/ new Vector3();

/**
 * 分离轴定理（SAT）轴测试函数
 * 用于检测三角形与AABB的相交
 * Separating Axis Theorem (SAT) axis testing function
 * Used to detect triangle-AABB intersection
 *
 * @param {Array<number>} axes - 测试轴数组 Array of test axes
 * @param {Vector3} v0 - 三角形第一个顶点 First triangle vertex
 * @param {Vector3} v1 - 三角形第二个顶点 Second triangle vertex
 * @param {Vector3} v2 - 三角形第三个顶点 Third triangle vertex
 * @param {Vector3} extents - AABB的范围 AABB extents
 * @return {boolean} 是否通过轴测试 Whether the axis test passes
 */
function satForAxes(axes, v0, v1, v2, extents) {
  // 遍历所有测试轴（每3个元素为一组）
  for (let i = 0, j = axes.length - 3; i <= j; i += 3) {
    // 从数组中设置测试轴
    _testAxis.fromArray(axes, i);
    // 将AABB投影到分离轴上
    // project the aabb onto the separating axis
    const r = extents.x * Math.abs(_testAxis.x) + extents.y * Math.abs(_testAxis.y) + extents.z * Math.abs(_testAxis.z);
    // 将三角形的所有3个顶点投影到分离轴上
    // project all 3 vertices of the triangle onto the separating axis
    const p0 = v0.dot(_testAxis);
    const p1 = v1.dot(_testAxis);
    const p2 = v2.dot(_testAxis);
    // 实际测试，基本上看三角形点的最极端值是否与r相交
    // actual test, basically see if either of the most extreme of the triangle points intersects r
    if (Math.max(-Math.max(p0, p1, p2), Math.min(p0, p1, p2)) > r) {
      // 投影三角形的点在AABB投影半长度之外
      // 轴是分离的，我们可以退出
      // points of the projected triangle are outside the projected half-length of the aabb
      // the axis is separating and we can exit
      return false;
    }
  }

  // 所有轴测试都通过，没有分离轴
  return true;
}

// 导出Box3类
export { Box3 };
