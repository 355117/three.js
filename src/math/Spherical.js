// 导入clamp函数，用于数值范围限制
import { clamp } from "./MathUtils.js";

/**
 * 球坐标类 - 可用于将3D空间中的点表示为球坐标
 * 参考：https://en.wikipedia.org/wiki/Spherical_coordinate_system
 *
 * This class can be used to represent points in 3D space as
 * [Spherical coordinates]{@link https://en.wikipedia.org/wiki/Spherical_coordinate_system}.
 */
class Spherical {
  /**
   * 构造一个新的球坐标
   * Constructs a new spherical.
   *
   * @param {number} [radius=1] - 半径，或从点到原点的欧几里得距离（直线距离） The radius, or the Euclidean distance (straight-line distance) from the point to the origin.
   * @param {number} [phi=0] - 从y（向上）轴的极角（弧度） The polar angle in radians from the y (up) axis.
   * @param {number} [theta=0] - 围绕y（向上）轴的赤道/方位角（弧度） The equator/azimuthal angle in radians around the y (up) axis.
   */
  constructor(radius = 1, phi = 0, theta = 0) {
    /**
     * 半径，或从点到原点的欧几里得距离（直线距离）
     * The radius, or the Euclidean distance (straight-line distance) from the point to the origin.
     *
     * @type {number}
     * @default 1
     */
    this.radius = radius;

    /**
     * 从y（向上）轴的极角（弧度）
     * The polar angle in radians from the y (up) axis.
     *
     * @type {number}
     * @default 0
     */
    this.phi = phi;

    /**
     * 围绕y（向上）轴的赤道/方位角（弧度）
     * The equator/azimuthal angle in radians around the y (up) axis.
     *
     * @type {number}
     * @default 0
     */
    this.theta = theta;
  }

  /**
   * 通过复制给定值来设置球坐标组件
   * Sets the spherical components by copying the given values.
   *
   * @param {number} radius - 半径 The radius.
   * @param {number} phi - 极角 The polar angle.
   * @param {number} theta - 方位角 The azimuthal angle.
   * @return {Spherical} 返回此球坐标的引用 A reference to this spherical.
   */
  set(radius, phi, theta) {
    // 设置半径
    this.radius = radius;
    // 设置极角
    this.phi = phi;
    // 设置方位角
    this.theta = theta;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将给定球坐标的值复制到此实例
   * Copies the values of the given spherical to this instance.
   *
   * @param {Spherical} other - 要复制的球坐标 The spherical to copy.
   * @return {Spherical} 返回此球坐标的引用 A reference to this spherical.
   */
  copy(other) {
    // 复制半径
    this.radius = other.radius;
    // 复制极角
    this.phi = other.phi;
    // 复制方位角
    this.theta = other.theta;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将极角phi限制在0.000001和π-0.000001之间
   * Restricts the polar angle [page:.phi phi] to be between `0.000001` and pi -
   * `0.000001`.
   *
   * @return {Spherical} 返回此球坐标的引用 A reference to this spherical.
   */
  makeSafe() {
    // 定义一个小的epsilon值
    const EPS = 0.000001;
    // 将phi限制在安全范围内，避免奇点
    this.phi = clamp(this.phi, EPS, Math.PI - EPS);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 从给定的向量设置球坐标组件，该向量假定包含笛卡尔坐标
   * Sets the spherical components from the given vector which is assumed to hold
   * Cartesian coordinates.
   *
   * @param {Vector3} v - 要设置的向量 The vector to set.
   * @return {Spherical} 返回此球坐标的引用 A reference to this spherical.
   */
  setFromVector3(v) {
    // 委托给笛卡尔坐标设置方法
    return this.setFromCartesianCoords(v.x, v.y, v.z);
  }

  /**
   * 从给定的笛卡尔坐标设置球坐标组件
   * Sets the spherical components from the given Cartesian coordinates.
   *
   * @param {number} x - x值 The x value.
   * @param {number} y - y值 The y value.
   * @param {number} z - z值 The z value.
   * @return {Spherical} 返回此球坐标的引用 A reference to this spherical.
   */
  setFromCartesianCoords(x, y, z) {
    // 计算半径（到原点的距离）
    this.radius = Math.sqrt(x * x + y * y + z * z);

    if (this.radius === 0) {
      // 如果半径为0，设置角度为0
      this.theta = 0;
      this.phi = 0;
    } else {
      // 计算方位角（在xz平面上的角度）
      this.theta = Math.atan2(x, z);
      // 计算极角（从y轴的角度）
      this.phi = Math.acos(clamp(y / this.radius, -1, 1));
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 返回一个复制了此实例值的新球坐标
   * Returns a new spherical with copied values from this instance.
   *
   * @return {Spherical} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 创建新的球坐标实例并复制当前值
    return new this.constructor().copy(this);
  }
}

// 导出Spherical类
export { Spherical };
