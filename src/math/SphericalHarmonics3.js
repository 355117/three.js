// 导入Vector3类，用于表示三维向量
import { Vector3 } from "./Vector3.js";

/**
 * 三阶球谐函数类 - 表示三阶球谐函数（SH）
 * 光照探针使用此类来编码光照信息
 *
 * Represents a third-order spherical harmonics (SH). Light probes use this class
 * to encode lighting information.
 *
 * - 主要参考：{@link https://graphics.stanford.edu/papers/envmap/envmap.pdf}
 * - 次要参考：{@link https://www.ppsloan.org/publications/StupidSH36.pdf}
 * - Primary reference: {@link https://graphics.stanford.edu/papers/envmap/envmap.pdf}
 * - Secondary reference: {@link https://www.ppsloan.org/publications/StupidSH36.pdf}
 */
class SphericalHarmonics3 {
  /**
   * 构造一个新的球谐函数
   * Constructs a new spherical harmonics.
   */
  constructor() {
    /**
     * 此标志可用于类型测试
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSphericalHarmonics3 = true;

    /**
     * 保存（9个）SH系数的数组
     * An array holding the (9) SH coefficients.
     *
     * @type {Array<Vector3>}
     */
    this.coefficients = [];

    // 初始化9个球谐函数系数（三阶球谐函数有9个基函数）
    for (let i = 0; i < 9; i++) {
      // 每个系数都是一个Vector3，用于存储RGB颜色值
      this.coefficients.push(new Vector3());
    }
  }

  /**
   * 通过复制值将给定的SH系数设置到此实例
   * Sets the given SH coefficients to this instance by copying
   * the values.
   *
   * @param {Array<Vector3>} coefficients - SH系数数组 The SH coefficients.
   * @return {SphericalHarmonics3} 返回此球谐函数的引用 A reference to this spherical harmonics.
   */
  set(coefficients) {
    // 复制所有9个系数
    for (let i = 0; i < 9; i++) {
      // 复制每个系数的Vector3值
      this.coefficients[i].copy(coefficients[i]);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将所有SH系数设置为0
   * Sets all SH coefficients to `0`.
   *
   * @return {SphericalHarmonics3} 返回此球谐函数的引用 A reference to this spherical harmonics.
   */
  zero() {
    // 将所有9个系数设置为零向量
    for (let i = 0; i < 9; i++) {
      // 将每个系数设置为(0, 0, 0)
      this.coefficients[i].set(0, 0, 0);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 返回给定法向量方向的辐射度
   * Returns the radiance in the direction of the given normal.
   *
   * @param {Vector3} normal - 法向量（假定为单位长度） The normal vector (assumed to be unit length)
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 辐射度 The radiance.
   */
  getAt(normal, target) {
    // 假定法向量为单位长度
    // normal is assumed to be unit length

    // 提取法向量的x、y、z分量
    const x = normal.x,
      y = normal.y,
      z = normal.z;

    // 获取系数数组的引用
    const coeff = this.coefficients;

    // 第0频带（常数项）
    // band 0
    target.copy(coeff[0]).multiplyScalar(0.282095);

    // 第1频带（线性项）
    // band 1
    target.addScaledVector(coeff[1], 0.488603 * y); // Y分量
    target.addScaledVector(coeff[2], 0.488603 * z); // Z分量
    target.addScaledVector(coeff[3], 0.488603 * x); // X分量

    // 第2频带（二次项）
    // band 2
    target.addScaledVector(coeff[4], 1.092548 * (x * y)); // XY项
    target.addScaledVector(coeff[5], 1.092548 * (y * z)); // YZ项
    target.addScaledVector(coeff[6], 0.315392 * (3.0 * z * z - 1.0)); // 3Z²-1项
    target.addScaledVector(coeff[7], 1.092548 * (x * z)); // XZ项
    target.addScaledVector(coeff[8], 0.546274 * (x * x - y * y)); // X²-Y²项

    return target;
  }

  /**
   * 返回给定法向量方向的辐照度（辐射度与余弦波瓣卷积）
   * Returns the irradiance (radiance convolved with cosine lobe) in the
   * direction of the given normal.
   *
   * @param {Vector3} normal - 法向量（假定为单位长度） The normal vector (assumed to be unit length)
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 辐照度 The irradiance.
   */
  getIrradianceAt(normal, target) {
    // 假定法向量为单位长度
    // normal is assumed to be unit length

    // 提取法向量的x、y、z分量
    const x = normal.x,
      y = normal.y,
      z = normal.z;

    // 获取系数数组的引用
    const coeff = this.coefficients;

    // 第0频带（常数项）- 使用辐照度系数
    // band 0
    target.copy(coeff[0]).multiplyScalar(0.886227); // π * 0.282095

    // 第1频带（线性项）- 使用辐照度系数
    // band 1
    target.addScaledVector(coeff[1], 2.0 * 0.511664 * y); // Y分量 ( 2 * π / 3 ) * 0.488603
    target.addScaledVector(coeff[2], 2.0 * 0.511664 * z); // Z分量
    target.addScaledVector(coeff[3], 2.0 * 0.511664 * x); // X分量

    // 第2频带（二次项）- 使用辐照度系数
    // band 2
    target.addScaledVector(coeff[4], 2.0 * 0.429043 * x * y); // XY项 ( π / 4 ) * 1.092548
    target.addScaledVector(coeff[5], 2.0 * 0.429043 * y * z); // YZ项
    target.addScaledVector(coeff[6], 0.743125 * z * z - 0.247708); // 3Z²-1项 ( π / 4 ) * 0.315392 * 3
    target.addScaledVector(coeff[7], 2.0 * 0.429043 * x * z); // XZ项
    target.addScaledVector(coeff[8], 0.429043 * (x * x - y * y)); // X²-Y²项 ( π / 4 ) * 0.546274

    return target;
  }

  /**
   * 将给定的SH添加到此实例
   * Adds the given SH to this instance.
   *
   * @param {SphericalHarmonics3} sh - 要添加的SH The SH to add.
   * @return {SphericalHarmonics3} 返回此球谐函数的引用 A reference to this spherical harmonics.
   */
  add(sh) {
    // 将所有9个系数相加
    for (let i = 0; i < 9; i++) {
      // 将对应的系数向量相加
      this.coefficients[i].add(sh.coefficients[i]);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 同时执行add和scale操作的便捷方法
   * A convenience method for performing {@link SphericalHarmonics3#add} and
   * {@link SphericalHarmonics3#scale} at once.
   *
   * @param {SphericalHarmonics3} sh - 要添加的SH The SH to add.
   * @param {number} s - 缩放因子 The scale factor.
   * @return {SphericalHarmonics3} 返回此球谐函数的引用 A reference to this spherical harmonics.
   */
  addScaledSH(sh, s) {
    // 将所有9个系数按比例添加
    for (let i = 0; i < 9; i++) {
      // 将对应的系数向量按比例相加
      this.coefficients[i].addScaledVector(sh.coefficients[i], s);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 按给定的缩放因子缩放此SH
   * Scales this SH by the given scale factor.
   *
   * @param {number} s - 缩放因子 The scale factor.
   * @return {SphericalHarmonics3} 返回此球谐函数的引用 A reference to this spherical harmonics.
   */
  scale(s) {
    // 将所有9个系数乘以缩放因子
    for (let i = 0; i < 9; i++) {
      // 将每个系数向量乘以缩放因子
      this.coefficients[i].multiplyScalar(s);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 在给定SH和此实例之间按给定alpha因子进行线性插值
   * Linear interpolates between the given SH and this instance by the given
   * alpha factor.
   *
   * @param {SphericalHarmonics3} sh - 要插值的SH The SH to interpolate with.
   * @param {number} alpha - alpha因子 The alpha factor.
   * @return {SphericalHarmonics3} 返回此球谐函数的引用 A reference to this spherical harmonics.
   */
  lerp(sh, alpha) {
    // 对所有9个系数进行线性插值
    for (let i = 0; i < 9; i++) {
      // 对每个系数向量进行线性插值
      this.coefficients[i].lerp(sh.coefficients[i], alpha);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 如果此球谐函数与给定球谐函数相等则返回true
   * Returns `true` if this spherical harmonics is equal with the given one.
   *
   * @param {SphericalHarmonics3} sh - 要测试相等性的球谐函数 The spherical harmonics to test for equality.
   * @return {boolean} 此球谐函数是否与给定球谐函数相等 Whether this spherical harmonics is equal with the given one.
   */
  equals(sh) {
    // 检查所有9个系数是否相等
    for (let i = 0; i < 9; i++) {
      if (!this.coefficients[i].equals(sh.coefficients[i])) {
        return false;
      }
    }

    // 所有系数都相等
    return true;
  }

  /**
   * 将给定球谐函数的值复制到此实例
   * Copies the values of the given spherical harmonics to this instance.
   *
   * @param {SphericalHarmonics3} sh - 要复制的球谐函数 The spherical harmonics to copy.
   * @return {SphericalHarmonics3} 返回此球谐函数的引用 A reference to this spherical harmonics.
   */
  copy(sh) {
    // 使用set方法复制系数
    return this.set(sh.coefficients);
  }

  /**
   * 返回一个复制了此实例值的新球谐函数
   * Returns a new spherical harmonics with copied values from this instance.
   *
   * @return {SphericalHarmonics3} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 创建新的球谐函数实例并复制当前值
    return new this.constructor().copy(this);
  }

  /**
   * 从给定数组设置此实例的SH系数
   * Sets the SH coefficients of this instance from the given array.
   *
   * @param {Array<number>} array - 保存SH系数的数组 An array holding the SH coefficients.
   * @param {number} [offset=0] - 开始复制的数组偏移量 The array offset where to start copying.
   * @return {SphericalHarmonics3} 返回此球谐函数的引用 A reference to this spherical harmonics.
   */
  fromArray(array, offset = 0) {
    // 获取系数数组的引用
    const coefficients = this.coefficients;

    // 从数组中恢复所有9个系数
    for (let i = 0; i < 9; i++) {
      // 每个系数占用3个数组元素（RGB）
      coefficients[i].fromArray(array, offset + i * 3);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 返回包含SH系数的数组，或将它们复制到提供的数组中
   * 系数表示为数字
   *
   * Returns an array with the SH coefficients, or copies them into the provided
   * array. The coefficients are represented as numbers.
   *
   * @param {Array<number>} [array=[]] - 目标数组 The target array.
   * @param {number} [offset=0] - 开始复制的数组偏移量 The array offset where to start copying.
   * @return {Array<number>} 包含扁平SH系数的数组 An array with flat SH coefficients.
   */
  toArray(array = [], offset = 0) {
    // 获取系数数组的引用
    const coefficients = this.coefficients;

    // 将所有9个系数转换为数组
    for (let i = 0; i < 9; i++) {
      // 每个系数占用3个数组元素（RGB）
      coefficients[i].toArray(array, offset + i * 3);
    }

    // 返回结果数组
    return array;
  }

  /**
   * 计算给定法向量的SH基函数
   * Computes the SH basis for the given normal vector.
   *
   * @param {Vector3} normal - 法向量 The normal.
   * @param {Array<number>} shBasis - 保存SH基函数的目标数组 The target array holding the SH basis.
   */
  static getBasisAt(normal, shBasis) {
    // 假定法向量为单位长度
    // normal is assumed to be unit length

    // 提取法向量的x、y、z分量
    const x = normal.x,
      y = normal.y,
      z = normal.z;

    // 第0频带（常数项）
    // band 0
    shBasis[0] = 0.282095; // 常数基函数

    // 第1频带（线性项）
    // band 1
    shBasis[1] = 0.488603 * y; // Y分量基函数
    shBasis[2] = 0.488603 * z; // Z分量基函数
    shBasis[3] = 0.488603 * x; // X分量基函数

    // 第2频带（二次项）
    // band 2
    shBasis[4] = 1.092548 * x * y; // XY项基函数
    shBasis[5] = 1.092548 * y * z; // YZ项基函数
    shBasis[6] = 0.315392 * (3 * z * z - 1); // 3Z²-1项基函数
    shBasis[7] = 1.092548 * x * z; // XZ项基函数
    shBasis[8] = 0.546274 * (x * x - y * y); // X²-Y²项基函数
  }
}

// 导出SphericalHarmonics3类
export { SphericalHarmonics3 };
