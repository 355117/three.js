/**
 * 此类可用于将3D空间中的点表示为柱坐标系
 * This class can be used to represent points in 3D space as
 * [Cylindrical coordinates]{@link https://en.wikipedia.org/wiki/Cylindrical_coordinate_system}.
 *
 * 柱坐标系使用半径、角度和高度来描述3D空间中的点，
 * 特别适用于具有旋转对称性的几何体和物理问题。
 */
class Cylindrical {
  /**
   * 构造一个新的柱坐标对象
   * Constructs a new cylindrical.
   *
   * @param {number} [radius=1] - 从原点到x-z平面中某点的距离（半径） The distance from the origin to a point in the x-z plane.
   * @param {number} [theta=0] - 在x-z平面中从正z轴开始逆时针测量的角度（弧度） A counterclockwise angle in the x-z plane measured in radians from the positive z-axis.
   * @param {number} [y=0] - x-z平面上方的高度 The height above the x-z plane.
   */
  constructor(radius = 1, theta = 0, y = 0) {
    /**
     * 从原点到x-z平面中某点的距离（半径分量）
     * The distance from the origin to a point in the x-z plane.
     *
     * @type {number}
     * @default 1
     */
    this.radius = radius;

    /**
     * 在x-z平面中从正z轴开始逆时针测量的角度（弧度）
     * 角度范围通常为[0, 2π]或[-π, π]
     * A counterclockwise angle in the x-z plane measured in radians from the positive z-axis.
     *
     * @type {number}
     * @default 0
     */
    this.theta = theta;

    /**
     * x-z平面上方的高度（y坐标）
     * The height above the x-z plane.
     *
     * @type {number}
     * @default 0
     */
    this.y = y;
  }

  /**
   * 通过复制给定值来设置柱坐标分量
   * Sets the cylindrical components by copying the given values.
   *
   * @param {number} radius - 半径值 The radius.
   * @param {number} theta - 角度值（弧度） The theta angle.
   * @param {number} y - 高度值 The height value.
   * @return {Cylindrical} 对此柱坐标对象的引用 A reference to this cylindrical.
   */
  set(radius, theta, y) {
    // 设置半径分量
    this.radius = radius;
    // 设置角度分量
    this.theta = theta;
    // 设置高度分量
    this.y = y;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将给定柱坐标对象的值复制到此实例
   * Copies the values of the given cylindrical to this instance.
   *
   * @param {Cylindrical} other - 要复制的柱坐标对象 The cylindrical to copy.
   * @return {Cylindrical} 对此柱坐标对象的引用 A reference to this cylindrical.
   */
  copy(other) {
    // 复制半径分量
    this.radius = other.radius;
    // 复制角度分量
    this.theta = other.theta;
    // 复制高度分量
    this.y = other.y;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 从给定的向量设置柱坐标分量，该向量假定包含笛卡尔坐标
   * Sets the cylindrical components from the given vector which is assumed to hold
   * Cartesian coordinates.
   *
   * @param {Vector3} v - 要设置的向量（包含笛卡尔坐标） The vector to set.
   * @return {Cylindrical} 对此柱坐标对象的引用 A reference to this cylindrical.
   */
  setFromVector3(v) {
    // 调用setFromCartesianCoords方法进行坐标转换
    return this.setFromCartesianCoords(v.x, v.y, v.z);
  }

  /**
   * 从给定的笛卡尔坐标设置柱坐标分量
   * Sets the cylindrical components from the given Cartesian coordinates.
   *
   * @param {number} x - x坐标值 The x value.
   * @param {number} y - y坐标值 The y value.
   * @param {number} z - z坐标值 The z value.
   * @return {Cylindrical} 对此柱坐标对象的引用 A reference to this cylindrical.
   */
  setFromCartesianCoords(x, y, z) {
    // 计算半径：在x-z平面上到原点的距离
    // 使用勾股定理：r = √(x² + z²)
    this.radius = Math.sqrt(x * x + z * z);

    // 计算角度：从正z轴开始的逆时针角度
    // 使用atan2函数确保角度在正确的象限
    this.theta = Math.atan2(x, z);

    // 高度直接等于y坐标
    this.y = y;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 返回一个复制了此实例值的新柱坐标对象
   * Returns a new cylindrical with copied values from this instance.
   *
   * @return {Cylindrical} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 创建新的构造函数实例并复制当前值
    return new this.constructor().copy(this);
  }
}

// 导出Cylindrical类
export { Cylindrical };
