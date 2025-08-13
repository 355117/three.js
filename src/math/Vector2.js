// 导入数学工具函数clamp，用于将数值限制在指定范围内
import { clamp } from "./MathUtils.js";

/**
 * 表示二维向量的类。二维向量是一个有序的数字对(标记为x和y)，可以用来表示许多东西，例如：
 * Class representing a 2D vector. A 2D vector is an ordered pair of numbers
 * (labeled x and y), which can be used to represent a number of things, such as:
 *
 * - 二维空间中的一个点（即平面上的位置）
 * - A point in 2D space (i.e. a position on a plane).
 * - 平面上的方向和长度。在three.js中，长度始终是从(0,0)到(x,y)的欧几里得距离（直线距离），
 * - A direction and length across a plane. In three.js the length will
 * 方向也是从(0,0)指向(x,y)测量的
 * always be the Euclidean distance(straight-line distance) from `(0, 0)` to `(x, y)`
 * and the direction is also measured from `(0, 0)` towards `(x, y)`.
 * - 任意有序的数字对
 * - Any arbitrary ordered pair of numbers.
 *
 * 二维向量还可以用来表示其他东西，比如动量向量、复数等等，
 * There are other things a 2D vector can be used to represent, such as
 * 但是这些是three.js中最常见的用途
 * momentum vectors, complex numbers and so on, however these are the most
 * common uses in three.js.
 *
 * 遍历向量实例将按相应顺序产生其分量(x, y)
 * Iterating through a vector instance will yield its components `(x, y)` in
 * the corresponding order.
 * ```js
 * const a = new THREE.Vector2( 0, 1 );
 *
 * //无参数；将初始化为(0, 0)
 * //no arguments; will be initialised to (0, 0)
 * const b = new THREE.Vector2( );
 *
 * const d = a.distanceTo( b );
 * ```
 */
class Vector2 {
  /**
   * 构造一个新的二维向量
   * Constructs a new 2D vector.
   *
   * @param {number} [x=0] - 此向量的x值 The x value of this vector.
   * @param {number} [y=0] - 此向量的y值 The y value of this vector.
   */
  constructor(x = 0, y = 0) {
    /**
     * 此标志可用于类型测试
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    Vector2.prototype.isVector2 = true; // 设置类型标识符

    /**
     * 此向量的x值
     * The x value of this vector.
     *
     * @type {number}
     */
    this.x = x; // 设置x分量

    /**
     * 此向量的y值
     * The y value of this vector.
     *
     * @type {number}
     */
    this.y = y; // 设置y分量
  }

  /**
   * {@link Vector2#x} 的别名，用于表示宽度
   * Alias for {@link Vector2#x}.
   *
   * @type {number}
   */
  get width() {
    return this.x; // 返回x分量作为宽度
  }

  set width(value) {
    this.x = value; // 设置x分量作为宽度
  }

  /**
   * {@link Vector2#y} 的别名，用于表示高度
   * Alias for {@link Vector2#y}.
   *
   * @type {number}
   */
  get height() {
    return this.y; // 返回y分量作为高度
  }

  set height(value) {
    this.y = value; // 设置y分量作为高度
  }

  /**
   * 设置向量分量
   * Sets the vector components.
   *
   * @param {number} x - x分量的值 The value of the x component.
   * @param {number} y - y分量的值 The value of the y component.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  set(x, y) {
    this.x = x; // 设置x分量
    this.y = y; // 设置y分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将向量分量设置为相同的值
   * Sets the vector components to the same value.
   *
   * @param {number} scalar - 为所有向量分量设置的值 The value to set for all vector components.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  setScalar(scalar) {
    this.x = scalar; // 设置x分量为标量值
    this.y = scalar; // 设置y分量为标量值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将向量的x分量设置为给定值
   * Sets the vector's x component to the given value
   *
   * @param {number} x - 要设置的值 The value to set.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  setX(x) {
    this.x = x; // 设置x分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将向量的y分量设置为给定值
   * Sets the vector's y component to the given value
   *
   * @param {number} y - 要设置的值 The value to set.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  setY(y) {
    this.y = y; // 设置y分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 允许使用索引设置向量分量
   * Allows to set a vector component with an index.
   *
   * @param {number} index - 分量索引。0对应x，1对应y The component index. `0` equals to x, `1` equals to y.
   * @param {number} value - 要设置的值 The value to set.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  setComponent(index, value) {
    switch (index) {
      case 0:
        this.x = value; // 设置x分量
        break;
      case 1:
        this.y = value; // 设置y分量
        break;
      default:
        throw new Error("index is out of range: " + index); // 索引超出范围错误
    }

    return this; // 返回自身以支持链式调用
  }

  /**
   * 返回与给定索引匹配的向量分量值
   * Returns the value of the vector component which matches the given index.
   *
   * @param {number} index - 分量索引。0对应x，1对应y The component index. `0` equals to x, `1` equals to y.
   * @return {number} 向量分量值 A vector component value.
   */
  getComponent(index) {
    switch (index) {
      case 0:
        return this.x; // 返回x分量
      case 1:
        return this.y; // 返回y分量
      default:
        throw new Error("index is out of range: " + index); // 索引超出范围错误
    }
  }

  /**
   * 返回一个复制了此实例值的新向量
   * Returns a new vector with copied values from this instance.
   *
   * @return {Vector2} 此实例的克隆 A clone of this instance.
   */
  clone() {
    return new this.constructor(this.x, this.y); // 创建新实例并复制当前向量的值
  }

  /**
   * 将给定向量的值复制到此实例
   * Copies the values of the given vector to this instance.
   *
   * @param {Vector2} v - 要复制的向量 The vector to copy.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  copy(v) {
    this.x = v.x; // 复制x分量
    this.y = v.y; // 复制y分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定向量加到此实例
   * Adds the given vector to this instance.
   *
   * @param {Vector2} v - 要相加的向量 The vector to add.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  add(v) {
    this.x += v.x; // 将x分量相加
    this.y += v.y; // 将y分量相加

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定标量值加到此实例的所有分量
   * Adds the given scalar value to all components of this instance.
   *
   * @param {number} s - 要相加的标量 The scalar to add.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  addScalar(s) {
    this.x += s; // 将标量加到x分量
    this.y += s; // 将标量加到y分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定向量相加并将结果存储在此实例中
   * Adds the given vectors and stores the result in this instance.
   *
   * @param {Vector2} a - 第一个向量 The first vector.
   * @param {Vector2} b - 第二个向量 The second vector.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  addVectors(a, b) {
    this.x = a.x + b.x; // 计算两个向量x分量的和
    this.y = a.y + b.y; // 计算两个向量y分量的和

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定向量按给定因子缩放后加到此实例
   * Adds the given vector scaled by the given factor to this instance.
   *
   * @param {Vector2} v - 向量 The vector.
   * @param {number} s - 缩放向量v的因子 The factor that scales `v`.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  addScaledVector(v, s) {
    this.x += v.x * s; // 将缩放后的x分量加到当前x分量
    this.y += v.y * s; // 将缩放后的y分量加到当前y分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 从此实例中减去给定向量
   * Subtracts the given vector from this instance.
   *
   * @param {Vector2} v - 要减去的向量 The vector to subtract.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  sub(v) {
    this.x -= v.x; // 从x分量中减去
    this.y -= v.y; // 从y分量中减去

    return this; // 返回自身以支持链式调用
  }

  /**
   * 从此实例的所有分量中减去给定标量值
   * Subtracts the given scalar value from all components of this instance.
   *
   * @param {number} s - 要减去的标量 The scalar to subtract.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  subScalar(s) {
    this.x -= s; // 从x分量中减去标量
    this.y -= s; // 从y分量中减去标量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定向量相减并将结果存储在此实例中
   * Subtracts the given vectors and stores the result in this instance.
   *
   * @param {Vector2} a - 第一个向量 The first vector.
   * @param {Vector2} b - 第二个向量 The second vector.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  subVectors(a, b) {
    this.x = a.x - b.x; // 计算两个向量x分量的差
    this.y = a.y - b.y; // 计算两个向量y分量的差

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定向量与此实例相乘
   * Multiplies the given vector with this instance.
   *
   * @param {Vector2} v - 要相乘的向量 The vector to multiply.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  multiply(v) {
    this.x *= v.x; // 将x分量相乘
    this.y *= v.y; // 将y分量相乘

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定标量值与此实例的所有分量相乘
   * Multiplies the given scalar value with all components of this instance.
   *
   * @param {number} scalar - 要相乘的标量 The scalar to multiply.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  multiplyScalar(scalar) {
    this.x *= scalar; // 将x分量乘以标量
    this.y *= scalar; // 将y分量乘以标量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此实例除以给定向量
   * Divides this instance by the given vector.
   *
   * @param {Vector2} v - 要除以的向量 The vector to divide.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  divide(v) {
    this.x /= v.x; // 将x分量相除
    this.y /= v.y; // 将y分量相除

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量除以给定标量
   * Divides this vector by the given scalar.
   *
   * @param {number} scalar - 要除以的标量 The scalar to divide.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  divideScalar(scalar) {
    return this.multiplyScalar(1 / scalar); // 通过乘以倒数来实现除法
  }

  /**
   * 将此向量（隐式第3个分量为1）乘以给定的3x3矩阵
   * Multiplies this vector (with an implicit 1 as the 3rd component) by
   * the given 3x3 matrix.
   *
   * @param {Matrix3} m - 要应用的矩阵 The matrix to apply.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  applyMatrix3(m) {
    const x = this.x, // 保存原始x值
      y = this.y; // 保存原始y值
    const e = m.elements; // 获取矩阵元素

    this.x = e[0] * x + e[3] * y + e[6]; // 计算新的x分量：m11*x + m12*y + m13*1
    this.y = e[1] * x + e[4] * y + e[7]; // 计算新的y分量：m21*x + m22*y + m23*1

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量的x或y值大于给定向量的x或y值，
   * If this vector's x or y value is greater than the given vector's x or y
   * 则用相应的最小值替换该值
   * value, replace that value with the corresponding min value.
   *
   * @param {Vector2} v - 向量 The vector.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  min(v) {
    this.x = Math.min(this.x, v.x); // 取x分量的最小值
    this.y = Math.min(this.y, v.y); // 取y分量的最小值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量的x或y值小于给定向量的x或y值，
   * If this vector's x or y value is less than the given vector's x or y
   * 则用相应的最大值替换该值
   * value, replace that value with the corresponding max value.
   *
   * @param {Vector2} v - 向量 The vector.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  max(v) {
    this.x = Math.max(this.x, v.x); // 取x分量的最大值
    this.y = Math.max(this.y, v.y); // 取y分量的最大值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量的x或y值大于最大向量的x或y值，则用相应值替换。
   * If this vector's x or y value is greater than the max vector's x or y
   * 如果此向量的x或y值小于最小向量的x或y值，则用相应值替换。
   * value, it is replaced by the corresponding value.
   * If this vector's x or y value is less than the min vector's x or y value,
   * it is replaced by the corresponding value.
   *
   * @param {Vector2} min - 最小x和y值 The minimum x and y values.
   * @param {Vector2} max - 期望范围内的最大x和y值 The maximum x and y values in the desired range.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  clamp(min, max) {
    // 假设min < max，按分量比较
    // assumes min < max, componentwise

    this.x = clamp(this.x, min.x, max.x); // 将x分量限制在范围内
    this.y = clamp(this.y, min.y, max.y); // 将y分量限制在范围内

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量的x或y值大于最大值，则用最大值替换。
   * If this vector's x or y values are greater than the max value, they are
   * 如果此向量的x或y值小于最小值，则用最小值替换。
   * replaced by the max value.
   * If this vector's x or y values are less than the min value, they are
   * replaced by the min value.
   *
   * @param {number} minVal - 分量将被限制到的最小值 The minimum value the components will be clamped to.
   * @param {number} maxVal - 分量将被限制到的最大值 The maximum value the components will be clamped to.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  clampScalar(minVal, maxVal) {
    this.x = clamp(this.x, minVal, maxVal); // 将x分量限制在标量范围内
    this.y = clamp(this.y, minVal, maxVal); // 将y分量限制在标量范围内

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量的长度大于最大值，则用最大值替换。
   * If this vector's length is greater than the max value, it is replaced by
   * 如果此向量的长度小于最小值，则用最小值替换。
   * the max value.
   * If this vector's length is less than the min value, it is replaced by the
   * min value.
   *
   * @param {number} min - 向量长度将被限制到的最小值 The minimum value the vector length will be clamped to.
   * @param {number} max - 向量长度将被限制到的最大值 The maximum value the vector length will be clamped to.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  clampLength(min, max) {
    const length = this.length(); // 获取当前向量长度

    return this.divideScalar(length || 1).multiplyScalar(clamp(length, min, max)); // 归一化后乘以限制后的长度
  }

  /**
   * 此向量的分量向下舍入到最近的整数值
   * The components of this vector are rounded down to the nearest integer value.
   *
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  floor() {
    this.x = Math.floor(this.x); // 将x分量向下舍入
    this.y = Math.floor(this.y); // 将y分量向下舍入

    return this; // 返回自身以支持链式调用
  }

  /**
   * 此向量的分量向上舍入到最近的整数值
   * The components of this vector are rounded up to the nearest integer value.
   *
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  ceil() {
    this.x = Math.ceil(this.x); // 将x分量向上舍入
    this.y = Math.ceil(this.y); // 将y分量向上舍入

    return this; // 返回自身以支持链式调用
  }

  /**
   * 此向量的分量舍入到最近的整数值
   * The components of this vector are rounded to the nearest integer value
   *
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  round() {
    this.x = Math.round(this.x); // 将x分量四舍五入
    this.y = Math.round(this.y); // 将y分量四舍五入

    return this; // 返回自身以支持链式调用
  }

  /**
   * 此向量的分量向零舍入（负数向上，正数向下）到整数值
   * The components of this vector are rounded towards zero (up if negative,
   * down if positive) to an integer value.
   *
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  roundToZero() {
    this.x = Math.trunc(this.x); // 将x分量向零截断
    this.y = Math.trunc(this.y); // 将y分量向零截断

    return this; // 返回自身以支持链式调用
  }

  /**
   * 反转此向量 - 即设置x = -x和y = -y
   * Inverts this vector - i.e. sets x = -x and y = -y.
   *
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  negate() {
    this.x = -this.x; // 反转x分量
    this.y = -this.y; // 反转y分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 计算给定向量与此实例的点积
   * Calculates the dot product of the given vector with this instance.
   *
   * @param {Vector2} v - 要计算点积的向量 The vector to compute the dot product with.
   * @return {number} 点积的结果 The result of the dot product.
   */
  dot(v) {
    return this.x * v.x + this.y * v.y; // 计算点积：x1*x2 + y1*y2
  }

  /**
   * 计算给定向量与此实例的叉积
   * Calculates the cross product of the given vector with this instance.
   *
   * @param {Vector2} v - 要计算叉积的向量 The vector to compute the cross product with.
   * @return {number} 叉积的结果 The result of the cross product.
   */
  cross(v) {
    return this.x * v.y - this.y * v.x; // 计算2D叉积：x1*y2 - y1*x2
  }

  /**
   * 计算从(0,0)到(x,y)的欧几里得长度（直线长度）的平方。
   * Computes the square of the Euclidean length (straight-line length) from
   * 如果要比较向量的长度，应该比较长度的平方，因为计算效率稍高。
   * (0, 0) to (x, y). If you are comparing the lengths of vectors, you should
   * compare the length squared instead as it is slightly more efficient to calculate.
   *
   * @return {number} 此向量的长度平方 The square length of this vector.
   */
  lengthSq() {
    return this.x * this.x + this.y * this.y; // 计算长度平方：x² + y²
  }

  /**
   * 计算从(0,0)到(x,y)的欧几里得长度（直线长度）
   * Computes the  Euclidean length (straight-line length) from (0, 0) to (x, y).
   *
   * @return {number} 此向量的长度 The length of this vector.
   */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y); // 计算长度：√(x² + y²)
  }

  /**
   * 计算此向量的曼哈顿长度
   * Computes the Manhattan length of this vector.
   *
   * @return {number} 此向量的曼哈顿长度 The Manhattan length of this vector.
   */
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y); // 计算曼哈顿长度：|x| + |y|
  }

  /**
   * 将此向量转换为单位向量 - 即设置为与此向量方向相同但长度为1的向量
   * Converts this vector to a unit vector - that is, sets it equal to a vector
   * with the same direction as this one, but with a vector length of `1`.
   *
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  normalize() {
    return this.divideScalar(this.length() || 1); // 除以长度进行归一化，避免除零
  }

  /**
   * 计算此向量相对于正x轴的角度（弧度）
   * Computes the angle in radians of this vector with respect to the positive x-axis.
   *
   * @return {number} 角度（弧度） The angle in radians.
   */
  angle() {
    const angle = Math.atan2(-this.y, -this.x) + Math.PI; // 计算角度并调整到[0, 2π]范围

    return angle; // 返回角度值
  }

  /**
   * 返回给定向量与此实例之间的角度（弧度）
   * Returns the angle between the given vector and this instance in radians.
   *
   * @param {Vector2} v - 要计算角度的向量 The vector to compute the angle with.
   * @return {number} 角度（弧度） The angle in radians.
   */
  angleTo(v) {
    const denominator = Math.sqrt(this.lengthSq() * v.lengthSq()); // 计算两个向量长度的乘积

    if (denominator === 0) return Math.PI / 2; // 如果有零向量，返回π/2

    const theta = this.dot(v) / denominator; // 计算余弦值

    // 限制范围，处理数值问题
    // clamp, to handle numerical problems

    return Math.acos(clamp(theta, -1, 1)); // 返回反余弦值
  }

  /**
   * 计算从给定向量到此实例的距离
   * Computes the distance from the given vector to this instance.
   *
   * @param {Vector2} v - 要计算距离的向量 The vector to compute the distance to.
   * @return {number} 距离 The distance.
   */
  distanceTo(v) {
    return Math.sqrt(this.distanceToSquared(v)); // 计算距离平方的平方根
  }

  /**
   * 计算从给定向量到此实例的距离平方
   * Computes the squared distance from the given vector to this instance.
   * 如果只是比较距离，应该比较距离平方，因为计算效率稍高
   * If you are just comparing the distance with another distance, you should compare
   * the distance squared instead as it is slightly more efficient to calculate.
   *
   * @param {Vector2} v - 要计算距离平方的向量 The vector to compute the squared distance to.
   * @return {number} 距离平方 The squared distance.
   */
  distanceToSquared(v) {
    const dx = this.x - v.x, // 计算x方向的差值
      dy = this.y - v.y; // 计算y方向的差值
    return dx * dx + dy * dy; // 返回距离平方：Δx² + Δy²
  }

  /**
   * 计算从给定向量到此实例的曼哈顿距离
   * Computes the Manhattan distance from the given vector to this instance.
   *
   * @param {Vector2} v - 要计算曼哈顿距离的向量 The vector to compute the Manhattan distance to.
   * @return {number} 曼哈顿距离 The Manhattan distance.
   */
  manhattanDistanceTo(v) {
    return Math.abs(this.x - v.x) + Math.abs(this.y - v.y); // 计算曼哈顿距离：|Δx| + |Δy|
  }

  /**
   * 将此向量设置为与此向量方向相同但具有指定长度的向量
   * Sets this vector to a vector with the same direction as this one, but
   * with the specified length.
   *
   * @param {number} length - 此向量的新长度 The new length of this vector.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  setLength(length) {
    return this.normalize().multiplyScalar(length); // 先归一化再乘以指定长度
  }

  /**
   * 在给定向量和此实例之间进行线性插值，其中alpha是沿线的百分比距离
   * Linearly interpolates between the given vector and this instance, where
   * alpha = 0将是此向量，alpha = 1将是给定向量
   * alpha is the percent distance along the line - alpha = 0 will be this
   * vector, and alpha = 1 will be the given one.
   *
   * @param {Vector2} v - 要插值到的向量 The vector to interpolate towards.
   * @param {number} alpha - 插值因子，通常在闭区间[0, 1]内 The interpolation factor, typically in the closed interval `[0, 1]`.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  lerp(v, alpha) {
    this.x += (v.x - this.x) * alpha; // 线性插值x分量
    this.y += (v.y - this.y) * alpha; // 线性插值y分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 在给定向量之间进行线性插值，其中alpha是沿线的百分比距离
   * Linearly interpolates between the given vectors, where alpha is the percent
   * alpha = 0将是第一个向量，alpha = 1将是第二个向量。结果存储在此实例中
   * distance along the line - alpha = 0 will be first vector, and alpha = 1 will
   * be the second one. The result is stored in this instance.
   *
   * @param {Vector2} v1 - 第一个向量 The first vector.
   * @param {Vector2} v2 - 第二个向量 The second vector.
   * @param {number} alpha - 插值因子，通常在闭区间[0, 1]内 The interpolation factor, typically in the closed interval `[0, 1]`.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  lerpVectors(v1, v2, alpha) {
    this.x = v1.x + (v2.x - v1.x) * alpha; // 计算插值后的x分量
    this.y = v1.y + (v2.y - v1.y) * alpha; // 计算插值后的y分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量与给定向量相等，则返回true
   * Returns `true` if this vector is equal with the given one.
   *
   * @param {Vector2} v - 要测试相等性的向量 The vector to test for equality.
   * @return {boolean} 此向量是否与给定向量相等 Whether this vector is equal with the given one.
   */
  equals(v) {
    return v.x === this.x && v.y === this.y; // 比较x和y分量是否都相等
  }

  /**
   * 将此向量的x值设置为array[offset]，y值设置为array[offset + 1]
   * Sets this vector's x value to be `array[ offset ]` and y
   * value to be `array[ offset + 1 ]`.
   *
   * @param {Array<number>} array - 包含向量分量值的数组 An array holding the vector component values.
   * @param {number} [offset=0] - 数组中的偏移量 The offset into the array.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  fromArray(array, offset = 0) {
    this.x = array[offset]; // 从数组中读取x分量
    this.y = array[offset + 1]; // 从数组中读取y分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量的分量写入给定数组。如果未提供数组，该方法返回一个新实例
   * Writes the components of this vector to the given array. If no array is provided,
   * the method returns a new instance.
   *
   * @param {Array<number>} [array=[]] - 保存向量分量的目标数组 The target array holding the vector components.
   * @param {number} [offset=0] - 数组中第一个元素的索引 Index of the first element in the array.
   * @return {Array<number>} 向量分量数组 The vector components.
   */
  toArray(array = [], offset = 0) {
    array[offset] = this.x; // 将x分量写入数组
    array[offset + 1] = this.y; // 将y分量写入数组

    return array; // 返回数组
  }

  /**
   * 从给定的缓冲区属性设置此向量的分量
   * Sets the components of this vector from the given buffer attribute.
   *
   * @param {BufferAttribute} attribute - 包含向量数据的缓冲区属性 The buffer attribute holding vector data.
   * @param {number} index - 属性中的索引 The index into the attribute.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  fromBufferAttribute(attribute, index) {
    this.x = attribute.getX(index); // 从缓冲区属性获取x分量
    this.y = attribute.getY(index); // 从缓冲区属性获取y分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量绕给定中心点按给定角度旋转
   * Rotates this vector around the given center by the given angle.
   *
   * @param {Vector2} center - 旋转中心点 The point around which to rotate.
   * @param {number} angle - 旋转角度（弧度） The angle to rotate, in radians.
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  rotateAround(center, angle) {
    const c = Math.cos(angle), // 计算角度的余弦值
      s = Math.sin(angle); // 计算角度的正弦值

    const x = this.x - center.x; // 计算相对于中心点的x坐标
    const y = this.y - center.y; // 计算相对于中心点的y坐标

    this.x = x * c - y * s + center.x; // 应用旋转矩阵并恢复到原坐标系
    this.y = x * s + y * c + center.y; // 应用旋转矩阵并恢复到原坐标系

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量的每个分量设置为0到1之间的伪随机值（不包括1）
   * Sets each component of this vector to a pseudo-random value between `0` and
   * `1`, excluding `1`.
   *
   * @return {Vector2} 对此向量的引用 A reference to this vector.
   */
  random() {
    this.x = Math.random(); // 设置x分量为随机值
    this.y = Math.random(); // 设置y分量为随机值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 迭代器方法，使向量可以被for...of循环遍历
   * Iterator method that makes the vector iterable with for...of loops
   */
  *[Symbol.iterator]() {
    yield this.x; // 产出x分量
    yield this.y; // 产出y分量
  }
}

// 导出Vector2类供其他模块使用
export { Vector2 };
