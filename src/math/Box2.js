// 从Vector2模块导入二维向量类
import { Vector2 } from "./Vector2.js";

// 创建一个临时向量，用于内部计算（使用纯函数标记进行优化）
const _vector = /*@__PURE__*/ new Vector2();

/**
 * 表示2D空间中的轴对齐包围盒（AABB）
 * Represents an axis-aligned bounding box (AABB) in 2D space.
 */
class Box2 {
  /**
   * 构造一个新的包围盒
   * Constructs a new bounding box.
   *
   * @param {Vector2} [min=(Infinity,Infinity)] - 表示包围盒下边界的向量 A vector representing the lower boundary of the box.
   * @param {Vector2} [max=(-Infinity,-Infinity)] - 表示包围盒上边界的向量 A vector representing the upper boundary of the box.
   */
  constructor(min = new Vector2(+Infinity, +Infinity), max = new Vector2(-Infinity, -Infinity)) {
    /**
     * 此标志可用于类型测试
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isBox2 = true;

    /**
     * 包围盒的下边界（最小值）
     * The lower boundary of the box.
     *
     * @type {Vector2}
     */
    this.min = min;

    /**
     * 包围盒的上边界（最大值）
     * The upper boundary of the box.
     *
     * @type {Vector2}
     */
    this.max = max;
  }

  /**
   * 设置此包围盒的下边界和上边界
   * 请注意，此方法只复制给定对象的值
   * Sets the lower and upper boundaries of this box.
   * Please note that this method only copies the values from the given objects.
   *
   * @param {Vector2} min - 包围盒的下边界 The lower boundary of the box.
   * @param {Vector2} max - 包围盒的上边界 The upper boundary of the box.
   * @return {Box2} 对此包围盒的引用 A reference to this bounding box.
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
   * @param {Array<Vector2>} points - 包含2D位置数据的数组，元素为Vector2实例 An array holding 2D position data as instances of {@link Vector2}.
   * @return {Box2} 对此包围盒的引用 A reference to this bounding box.
   */
  setFromPoints(points) {
    // 首先将包围盒设为空
    this.makeEmpty();

    // 遍历所有点，逐个扩展包围盒
    for (let i = 0, il = points.length; i < il; i++) {
      this.expandByPoint(points[i]);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将此包围盒以给定的中心向量为中心，并设置包围盒的宽度和高度
   * Centers this box on the given center vector and sets this box's width, height and
   * depth to the given size values.
   *
   * @param {Vector2} center - 包围盒的中心点 The center of the box.
   * @param {Vector2} size - 包围盒的x和y尺寸 The x and y dimensions of the box.
   * @return {Box2} 对此包围盒的引用 A reference to this bounding box.
   */
  setFromCenterAndSize(center, size) {
    // 计算尺寸的一半
    const halfSize = _vector.copy(size).multiplyScalar(0.5);
    // 设置最小值：中心点减去半尺寸
    this.min.copy(center).sub(halfSize);
    // 设置最大值：中心点加上半尺寸
    this.max.copy(center).add(halfSize);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 返回此实例的副本
   * Returns a new box with copied values from this instance.
   *
   * @return {Box2} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 创建新实例并复制当前值
    return new this.constructor().copy(this);
  }

  /**
   * 将给定包围盒的值复制到此实例
   * Copies the values of the given box to this instance.
   *
   * @param {Box2} box - 要复制的包围盒 The box to copy.
   * @return {Box2} 对此包围盒的引用 A reference to this bounding box.
   */
  copy(box) {
    // 复制最小值
    this.min.copy(box.min);
    // 复制最大值
    this.max.copy(box.max);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 使此包围盒为空，意味着它在2D中包围零空间
   * Makes this box empty which means in encloses a zero space in 2D.
   *
   * @return {Box2} 对此包围盒的引用 A reference to this bounding box.
   */
  makeEmpty() {
    // 将最小值设为正无穷
    this.min.x = this.min.y = +Infinity;
    // 将最大值设为负无穷
    this.max.x = this.max.y = -Infinity;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 如果此包围盒在其边界内包含零个点，则返回true
   * 注意，具有相等下边界和上边界的包围盒仍包含一个点，即两个边界共享的点
   * Returns true if this box includes zero points within its bounds.
   * Note that a box with equal lower and upper bounds still includes one
   * point, the one both bounds share.
   *
   * @return {boolean} 此包围盒是否为空 Whether this box is empty or not.
   */
  isEmpty() {
    // 这是比（体积 <= 0）更稳健的空检查，因为当两个轴都为负时体积可能为正
    // this is a more robust check for empty than ( volume <= 0 ) because volume can get positive with two negative axes

    return this.max.x < this.min.x || this.max.y < this.min.y;
  }

  /**
   * 返回此包围盒的中心点
   * Returns the center point of this box.
   *
   * @param {Vector2} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector2} 中心点 The center point.
   */
  getCenter(target) {
    // 如果包围盒为空，返回原点；否则返回最小值和最大值的中点
    return this.isEmpty() ? target.set(0, 0) : target.addVectors(this.min, this.max).multiplyScalar(0.5);
  }

  /**
   * 返回此包围盒的尺寸
   * Returns the dimensions of this box.
   *
   * @param {Vector2} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector2} 尺寸 The size.
   */
  getSize(target) {
    // 如果包围盒为空，返回零尺寸；否则返回最大值减去最小值
    return this.isEmpty() ? target.set(0, 0) : target.subVectors(this.max, this.min);
  }

  /**
   * 扩展此包围盒的边界以包含给定点
   * Expands the boundaries of this box to include the given point.
   *
   * @param {Vector2} point - 应被包围盒包含的点 The point that should be included by the bounding box.
   * @return {Box2} 对此包围盒的引用 A reference to this bounding box.
   */
  expandByPoint(point) {
    // 更新最小值（取较小值）
    this.min.min(point);
    // 更新最大值（取较大值）
    this.max.max(point);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 通过给定向量等边扩展此包围盒
   * 包围盒的宽度将在两个方向上按向量的x分量扩展
   * 包围盒的高度将在两个方向上按向量的y分量扩展
   * Expands this box equilaterally by the given vector. The width of this
   * box will be expanded by the x component of the vector in both
   * directions. The height of this box will be expanded by the y component of
   * the vector in both directions.
   *
   * @param {Vector2} vector - 应扩展包围盒的向量 The vector that should expand the bounding box.
   * @return {Box2} 对此包围盒的引用 A reference to this bounding box.
   */
  expandByVector(vector) {
    // 最小值减去向量（向负方向扩展）
    this.min.sub(vector);
    // 最大值加上向量（向正方向扩展）
    this.max.add(vector);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 通过给定标量扩展包围盒的每个维度
   * 如果为负值，包围盒的维度将收缩
   * Expands each dimension of the box by the given scalar. If negative, the
   * dimensions of the box will be contracted.
   *
   * @param {number} scalar - 应扩展包围盒的标量值 The scalar value that should expand the bounding box.
   * @return {Box2} 对此包围盒的引用 A reference to this bounding box.
   */
  expandByScalar(scalar) {
    // 最小值减去标量（向负方向扩展）
    this.min.addScalar(-scalar);
    // 最大值加上标量（向正方向扩展）
    this.max.addScalar(scalar);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 如果给定点位于此包围盒内或边界上，则返回true
   * Returns `true` if the given point lies within or on the boundaries of this box.
   *
   * @param {Vector2} point - 要测试的点 The point to test.
   * @return {boolean} 包围盒是否包含给定点 Whether the bounding box contains the given point or not.
   */
  containsPoint(point) {
    // 检查点是否在x和y范围内
    return point.x >= this.min.x && point.x <= this.max.x && point.y >= this.min.y && point.y <= this.max.y;
  }

  /**
   * 如果此包围盒包含给定包围盒的全部，则返回true
   * 如果此包围盒与给定包围盒相同，此函数也返回true
   * Returns `true` if this bounding box includes the entirety of the given bounding box.
   * If this box and the given one are identical, this function also returns `true`.
   *
   * @param {Box2} box - 要测试的包围盒 The bounding box to test.
   * @return {boolean} 包围盒是否包含给定包围盒 Whether the bounding box contains the given bounding box or not.
   */
  containsBox(box) {
    // 检查此包围盒是否完全包含给定包围盒
    return this.min.x <= box.min.x && box.max.x <= this.max.x && this.min.y <= box.min.y && box.max.y <= this.max.y;
  }

  /**
   * 返回点作为此包围盒宽度和高度的比例
   * Returns a point as a proportion of this box's width and height.
   *
   * @param {Vector2} point - 2D空间中的点 A point in 2D space.
   * @param {Vector2} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector2} 作为此包围盒宽度和高度比例的点 A point as a proportion of this box's width and height.
   */
  getParameter(point, target) {
    // 如果包围盒的尺寸维度为0，这可能会导致除零错误
    // This can potentially have a divide by zero if the box
    // has a size dimension of 0.

    // 计算点在包围盒中的相对位置（0-1范围）
    return target.set((point.x - this.min.x) / (this.max.x - this.min.x), (point.y - this.min.y) / (this.max.y - this.min.y));
  }

  /**
   * 如果给定包围盒与此包围盒相交，则返回true
   * Returns `true` if the given bounding box intersects with this bounding box.
   *
   * @param {Box2} box - 要测试的包围盒 The bounding box to test.
   * @return {boolean} 给定包围盒是否与此包围盒相交 Whether the given bounding box intersects with this bounding box.
   */
  intersectsBox(box) {
    // 使用4个分割平面来排除相交情况
    // using 4 splitting planes to rule out intersections

    return box.max.x >= this.min.x && box.min.x <= this.max.x && box.max.y >= this.min.y && box.min.y <= this.max.y;
  }

  /**
   * 将给定点限制在此包围盒的边界内
   * Clamps the given point within the bounds of this box.
   *
   * @param {Vector2} point - 要限制的点 The point to clamp.
   * @param {Vector2} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector2} 限制后的点 The clamped point.
   */
  clampPoint(point, target) {
    // 复制点并将其限制在包围盒范围内
    return target.copy(point).clamp(this.min, this.max);
  }

  /**
   * 返回从此包围盒任何边缘到指定点的欧几里得距离
   * 如果给定点位于此包围盒内，距离将为0
   * Returns the euclidean distance from any edge of this box to the specified point. If
   * the given point lies inside of this box, the distance will be `0`.
   *
   * @param {Vector2} point - 要计算距离的点 The point to compute the distance to.
   * @return {number} 欧几里得距离 The euclidean distance.
   */
  distanceToPoint(point) {
    // 将点限制到包围盒内，然后计算到原点的距离
    return this.clampPoint(point, _vector).distanceTo(point);
  }

  /**
   * 计算此包围盒与给定包围盒的交集
   * 将此包围盒的上边界设置为两个包围盒上边界的较小值
   * 将此包围盒的下边界设置为两个包围盒下边界的较大值
   * 如果没有重叠，则使此包围盒为空
   * Computes the intersection of this bounding box and the given one, setting the upper
   * bound of this box to the lesser of the two boxes' upper bounds and the
   * lower bound of this box to the greater of the two boxes' lower bounds. If
   * there's no overlap, makes this box empty.
   *
   * @param {Box2} box - 要相交的包围盒 The bounding box to intersect with.
   * @return {Box2} 对此包围盒的引用 A reference to this bounding box.
   */
  intersect(box) {
    // 最小值取较大者
    this.min.max(box.min);
    // 最大值取较小者
    this.max.min(box.max);

    // 如果结果为空，则明确设置为空
    if (this.isEmpty()) this.makeEmpty();

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 计算此包围盒与给定包围盒的并集
   * 将此包围盒的上边界设置为两个包围盒上边界的较大值
   * 将此包围盒的下边界设置为两个包围盒下边界的较小值
   * Computes the union of this box and another and the given one, setting the upper
   * bound of this box to the greater of the two boxes' upper bounds and the
   * lower bound of this box to the lesser of the two boxes' lower bounds.
   *
   * @param {Box2} box - 要与此实例合并的包围盒 The bounding box that will be unioned with this instance.
   * @return {Box2} 对此包围盒的引用 A reference to this bounding box.
   */
  union(box) {
    // 最小值取较小者
    this.min.min(box.min);
    // 最大值取较大者
    this.max.max(box.max);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将给定偏移量添加到此包围盒的上边界和下边界
   * 有效地在2D空间中移动它
   * Adds the given offset to both the upper and lower bounds of this bounding box,
   * effectively moving it in 2D space.
   *
   * @param {Vector2} offset - 应用于平移包围盒的偏移量 The offset that should be used to translate the bounding box.
   * @return {Box2} 对此包围盒的引用 A reference to this bounding box.
   */
  translate(offset) {
    // 最小值加上偏移量
    this.min.add(offset);
    // 最大值加上偏移量
    this.max.add(offset);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 如果此包围盒与给定包围盒相等，则返回true
   * Returns `true` if this bounding box is equal with the given one.
   *
   * @param {Box2} box - 要测试相等性的包围盒 The box to test for equality.
   * @return {boolean} 此包围盒是否与给定包围盒相等 Whether this bounding box is equal with the given one.
   */
  equals(box) {
    // 比较最小值和最大值是否都相等
    return box.min.equals(this.min) && box.max.equals(this.max);
  }
}

// 导出Box2类
export { Box2 };
