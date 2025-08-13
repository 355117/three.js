// 从数学工具模块导入 clamp 函数，用于数值范围限制
import { clamp } from "./MathUtils.js";
// 从四元数模块导入 Quaternion 类，用于旋转计算
import { Quaternion } from "./Quaternion.js";

/**
 * 表示三维向量的类。三维向量是一个有序的三元数组 (x, y, z)，
 * 可以用来表示多种概念，例如：
 *
 * - 三维空间中的一个点
 * - 三维空间中的方向和长度。在 three.js 中，长度总是从 (0, 0, 0) 到 (x, y, z) 的
 *   欧几里得距离（直线距离），方向也是从 (0, 0, 0) 指向 (x, y, z)
 * - 任意有序的三元数组
 *
 * 三维向量还可以用来表示其他概念，比如动量向量等，
 * 但上述是 three.js 中最常见的用法。
 *
 * 遍历向量实例将按对应顺序产生其分量 (x, y, z)。
 * ```js
 * const a = new THREE.Vector3( 0, 1, 0 );
 *
 * // 无参数；将初始化为 (0, 0, 0)
 * const b = new THREE.Vector3( );
 *
 * const d = a.distanceTo( b );
 * ```
 */
class Vector3 {
  /**
   * 构造一个新的三维向量。
   *
   * @param {number} [x=0] - 向量的 x 分量值
   * @param {number} [y=0] - 向量的 y 分量值
   * @param {number} [z=0] - 向量的 z 分量值
   */
  constructor(x = 0, y = 0, z = 0) {
    /**
     * 此标志可用于类型检测。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    Vector3.prototype.isVector3 = true; // 设置类型标识符为 true

    /**
     * 向量的 x 分量值。
     *
     * @type {number}
     */
    this.x = x; // 设置 x 分量

    /**
     * 向量的 y 分量值。
     *
     * @type {number}
     */
    this.y = y; // 设置 y 分量

    /**
     * 向量的 z 分量值。
     *
     * @type {number}
     */
    this.z = z; // 设置 z 分量
  }

  /**
   * 设置向量的各个分量。
   *
   * @param {number} x - x 分量的值
   * @param {number} y - y 分量的值
   * @param {number} z - z 分量的值
   * @return {Vector3} 返回此向量的引用
   */
  set(x, y, z) {
    if (z === undefined) z = this.z; // 如果 z 未定义，保持原值（用于 sprite.scale.set(x,y) 的情况）

    this.x = x; // 设置 x 分量
    this.y = y; // 设置 y 分量
    this.z = z; // 设置 z 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将向量的所有分量设置为相同的值。
   *
   * @param {number} scalar - 要设置给所有向量分量的值
   * @return {Vector3} 返回此向量的引用
   */
  setScalar(scalar) {
    this.x = scalar; // 设置 x 分量为标量值
    this.y = scalar; // 设置 y 分量为标量值
    this.z = scalar; // 设置 z 分量为标量值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 设置向量的 x 分量为给定值。
   *
   * @param {number} x - 要设置的值
   * @return {Vector3} 返回此向量的引用
   */
  setX(x) {
    this.x = x; // 设置 x 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 设置向量的 y 分量为给定值。
   *
   * @param {number} y - 要设置的值
   * @return {Vector3} 返回此向量的引用
   */
  setY(y) {
    this.y = y; // 设置 y 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 设置向量的 z 分量为给定值。
   *
   * @param {number} z - 要设置的值
   * @return {Vector3} 返回此向量的引用
   */
  setZ(z) {
    this.z = z; // 设置 z 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 允许通过索引设置向量分量。
   *
   * @param {number} index - 分量索引。0 对应 x，1 对应 y，2 对应 z
   * @param {number} value - 要设置的值
   * @return {Vector3} 返回此向量的引用
   */
  setComponent(index, value) {
    switch (
      index // 根据索引选择对应的分量
    ) {
      case 0:
        this.x = value; // 索引 0：设置 x 分量
        break;
      case 1:
        this.y = value; // 索引 1：设置 y 分量
        break;
      case 2:
        this.z = value; // 索引 2：设置 z 分量
        break;
      default:
        throw new Error("index is out of range: " + index); // 索引超出范围时抛出错误
    }

    return this; // 返回自身以支持链式调用
  }

  /**
   * 返回与给定索引匹配的向量分量值。
   *
   * @param {number} index - 分量索引。0 对应 x，1 对应 y，2 对应 z
   * @return {number} 向量分量值
   */
  getComponent(index) {
    switch (
      index // 根据索引选择对应的分量
    ) {
      case 0:
        return this.x; // 索引 0：返回 x 分量
      case 1:
        return this.y; // 索引 1：返回 y 分量
      case 2:
        return this.z; // 索引 2：返回 z 分量
      default:
        throw new Error("index is out of range: " + index); // 索引超出范围时抛出错误
    }
  }

  /**
   * 返回一个复制了此实例值的新向量。
   *
   * @return {Vector3} 此实例的克隆
   */
  clone() {
    return new this.constructor(this.x, this.y, this.z); // 创建新的向量实例并复制当前值
  }

  /**
   * 将给定向量的值复制到此实例。
   *
   * @param {Vector3} v - 要复制的向量
   * @return {Vector3} 返回此向量的引用
   */
  copy(v) {
    this.x = v.x; // 复制 x 分量
    this.y = v.y; // 复制 y 分量
    this.z = v.z; // 复制 z 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定向量加到此实例上。
   *
   * @param {Vector3} v - 要相加的向量
   * @return {Vector3} 返回此向量的引用
   */
  add(v) {
    this.x += v.x; // x 分量相加
    this.y += v.y; // y 分量相加
    this.z += v.z; // z 分量相加

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定标量值加到此实例的所有分量上。
   *
   * @param {number} s - 要相加的标量
   * @return {Vector3} 返回此向量的引用
   */
  addScalar(s) {
    this.x += s; // x 分量加上标量
    this.y += s; // y 分量加上标量
    this.z += s; // z 分量加上标量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定的两个向量相加，并将结果存储在此实例中。
   *
   * @param {Vector3} a - 第一个向量
   * @param {Vector3} b - 第二个向量
   * @return {Vector3} 返回此向量的引用
   */
  addVectors(a, b) {
    this.x = a.x + b.x; // 计算 x 分量的和
    this.y = a.y + b.y; // 计算 y 分量的和
    this.z = a.z + b.z; // 计算 z 分量的和

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定向量按给定因子缩放后加到此实例上。
   *
   * @param {Vector3} v - 要相加的向量
   * @param {number} s - 缩放向量 v 的因子
   * @return {Vector3} 返回此向量的引用
   */
  addScaledVector(v, s) {
    this.x += v.x * s; // x 分量加上缩放后的 v.x
    this.y += v.y * s; // y 分量加上缩放后的 v.y
    this.z += v.z * s; // z 分量加上缩放后的 v.z

    return this; // 返回自身以支持链式调用
  }

  /**
   * 从此实例中减去给定向量。
   *
   * @param {Vector3} v - 要减去的向量
   * @return {Vector3} 返回此向量的引用
   */
  sub(v) {
    this.x -= v.x; // x 分量相减
    this.y -= v.y; // y 分量相减
    this.z -= v.z; // z 分量相减

    return this; // 返回自身以支持链式调用
  }

  /**
   * 从此实例的所有分量中减去给定标量值。
   *
   * @param {number} s - 要减去的标量
   * @return {Vector3} 返回此向量的引用
   */
  subScalar(s) {
    this.x -= s; // x 分量减去标量
    this.y -= s; // y 分量减去标量
    this.z -= s; // z 分量减去标量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 计算给定向量的差值，并将结果存储在此实例中。
   *
   * @param {Vector3} a - 第一个向量（被减数）
   * @param {Vector3} b - 第二个向量（减数）
   * @return {Vector3} 返回此向量的引用
   */
  subVectors(a, b) {
    this.x = a.x - b.x; // 计算 x 分量的差
    this.y = a.y - b.y; // 计算 y 分量的差
    this.z = a.z - b.z; // 计算 z 分量的差

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定向量与此实例相乘。
   *
   * @param {Vector3} v - 要相乘的向量
   * @return {Vector3} 返回此向量的引用
   */
  multiply(v) {
    this.x *= v.x; // x 分量相乘
    this.y *= v.y; // y 分量相乘
    this.z *= v.z; // z 分量相乘

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定标量值与此实例的所有分量相乘。
   *
   * @param {number} scalar - 要相乘的标量
   * @return {Vector3} 返回此向量的引用
   */
  multiplyScalar(scalar) {
    this.x *= scalar; // x 分量乘以标量
    this.y *= scalar; // y 分量乘以标量
    this.z *= scalar; // z 分量乘以标量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定的两个向量相乘，并将结果存储在此实例中。
   *
   * @param {Vector3} a - 第一个向量
   * @param {Vector3} b - 第二个向量
   * @return {Vector3} 返回此向量的引用
   */
  multiplyVectors(a, b) {
    this.x = a.x * b.x; // 计算 x 分量的乘积
    this.y = a.y * b.y; // 计算 y 分量的乘积
    this.z = a.z * b.z; // 计算 z 分量的乘积

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定的欧拉角旋转应用到此向量。
   *
   * @param {Euler} euler - 欧拉角
   * @return {Vector3} 返回此向量的引用
   */
  applyEuler(euler) {
    return this.applyQuaternion(_quaternion.setFromEuler(euler)); // 先转换为四元数再应用旋转
  }

  /**
   * 将由轴和角度指定的旋转应用到此向量。
   *
   * @param {Vector3} axis - 表示旋转轴的标准化向量
   * @param {number} angle - 旋转角度（弧度）
   * @return {Vector3} 返回此向量的引用
   */
  applyAxisAngle(axis, angle) {
    return this.applyQuaternion(_quaternion.setFromAxisAngle(axis, angle)); // 先转换为四元数再应用旋转
  }

  /**
   * 将此向量与给定的 3x3 矩阵相乘。
   *
   * @param {Matrix3} m - 3x3 矩阵
   * @return {Vector3} 返回此向量的引用
   */
  applyMatrix3(m) {
    const x = this.x, // 保存原始 x 值
      y = this.y, // 保存原始 y 值
      z = this.z; // 保存原始 z 值
    const e = m.elements; // 获取矩阵元素数组

    this.x = e[0] * x + e[3] * y + e[6] * z; // 计算新的 x 分量
    this.y = e[1] * x + e[4] * y + e[7] * z; // 计算新的 y 分量
    this.z = e[2] * x + e[5] * y + e[8] * z; // 计算新的 z 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量与给定的法线矩阵相乘并标准化结果。
   *
   * @param {Matrix3} m - 法线矩阵
   * @return {Vector3} 返回此向量的引用
   */
  applyNormalMatrix(m) {
    return this.applyMatrix3(m).normalize(); // 应用矩阵变换后进行标准化
  }

  /**
   * 将此向量（在第4维隐含为1）与矩阵 m 相乘，并除以透视分量。
   *
   * @param {Matrix4} m - 要应用的矩阵
   * @return {Vector3} 返回此向量的引用
   */
  applyMatrix4(m) {
    const x = this.x, // 保存原始 x 值
      y = this.y, // 保存原始 y 值
      z = this.z; // 保存原始 z 值
    const e = m.elements; // 获取矩阵元素数组

    const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]); // 计算透视除法的分母

    this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w; // 计算新的 x 分量并应用透视除法
    this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w; // 计算新的 y 分量并应用透视除法
    this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w; // 计算新的 z 分量并应用透视除法

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定的四元数应用到此向量。
   *
   * @param {Quaternion} q - 四元数
   * @return {Vector3} 返回此向量的引用
   */
  applyQuaternion(q) {
    // 假设四元数 q 具有单位长度

    const vx = this.x, // 保存向量的 x 分量
      vy = this.y, // 保存向量的 y 分量
      vz = this.z; // 保存向量的 z 分量
    const qx = q.x, // 四元数的 x 分量
      qy = q.y, // 四元数的 y 分量
      qz = q.z, // 四元数的 z 分量
      qw = q.w; // 四元数的 w 分量

    // t = 2 * cross( q.xyz, v ); 计算叉积的2倍
    const tx = 2 * (qy * vz - qz * vy); // 叉积 x 分量的2倍
    const ty = 2 * (qz * vx - qx * vz); // 叉积 y 分量的2倍
    const tz = 2 * (qx * vy - qy * vx); // 叉积 z 分量的2倍

    // v + q.w * t + cross( q.xyz, t ); 四元数旋转公式
    this.x = vx + qw * tx + qy * tz - qz * ty; // 计算旋转后的 x 分量
    this.y = vy + qw * ty + qz * tx - qx * tz; // 计算旋转后的 y 分量
    this.z = vz + qw * tz + qx * ty - qy * tx; // 计算旋转后的 z 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量从世界空间投影到相机的标准化设备坐标（NDC）空间。
   *
   * @param {Camera} camera - 相机对象
   * @return {Vector3} 返回此向量的引用
   */
  project(camera) {
    return this.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix); // 先应用世界逆矩阵，再应用投影矩阵
  }

  /**
   * 将此向量从相机的标准化设备坐标（NDC）空间反投影到世界空间。
   *
   * @param {Camera} camera - 相机对象
   * @return {Vector3} 返回此向量的引用
   */
  unproject(camera) {
    return this.applyMatrix4(camera.projectionMatrixInverse).applyMatrix4(camera.matrixWorld); // 先应用投影逆矩阵，再应用世界矩阵
  }

  /**
   * 通过矩阵变换此向量的方向（使用给定4x4矩阵的左上角3x3子集），然后标准化结果。
   *
   * @param {Matrix4} m - 变换矩阵
   * @return {Vector3} 返回此向量的引用
   */
  transformDirection(m) {
    // 输入：THREE.Matrix4 仿射矩阵
    // 向量被解释为方向

    const x = this.x, // 保存原始 x 值
      y = this.y, // 保存原始 y 值
      z = this.z; // 保存原始 z 值
    const e = m.elements; // 获取矩阵元素数组

    this.x = e[0] * x + e[4] * y + e[8] * z; // 使用矩阵的旋转部分变换 x 分量
    this.y = e[1] * x + e[5] * y + e[9] * z; // 使用矩阵的旋转部分变换 y 分量
    this.z = e[2] * x + e[6] * y + e[10] * z; // 使用矩阵的旋转部分变换 z 分量

    return this.normalize(); // 标准化结果向量
  }

  /**
   * 将此实例除以给定向量。
   *
   * @param {Vector3} v - 要除以的向量
   * @return {Vector3} 返回此向量的引用
   */
  divide(v) {
    this.x /= v.x; // x 分量相除
    this.y /= v.y; // y 分量相除
    this.z /= v.z; // z 分量相除

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量除以给定标量。
   *
   * @param {number} scalar - 要除以的标量
   * @return {Vector3} 返回此向量的引用
   */
  divideScalar(scalar) {
    return this.multiplyScalar(1 / scalar); // 通过乘以倒数来实现除法
  }

  /**
   * 如果此向量的 x、y 或 z 值大于给定向量的对应值，
   * 则将该值替换为对应的最小值。
   *
   * @param {Vector3} v - 比较的向量
   * @return {Vector3} 返回此向量的引用
   */
  min(v) {
    this.x = Math.min(this.x, v.x); // 取 x 分量的最小值
    this.y = Math.min(this.y, v.y); // 取 y 分量的最小值
    this.z = Math.min(this.z, v.z); // 取 z 分量的最小值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量的 x、y 或 z 值小于给定向量的对应值，
   * 则将该值替换为对应的最大值。
   *
   * @param {Vector3} v - 比较的向量
   * @return {Vector3} 返回此向量的引用
   */
  max(v) {
    this.x = Math.max(this.x, v.x); // 取 x 分量的最大值
    this.y = Math.max(this.y, v.y); // 取 y 分量的最大值
    this.z = Math.max(this.z, v.z); // 取 z 分量的最大值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量的 x、y 或 z 值大于最大向量的对应值，则替换为最大值。
   * 如果此向量的 x、y 或 z 值小于最小向量的对应值，则替换为最小值。
   *
   * @param {Vector3} min - 最小 x、y 和 z 值
   * @param {Vector3} max - 期望范围内的最大 x、y 和 z 值
   * @return {Vector3} 返回此向量的引用
   */
  clamp(min, max) {
    // 假设 min < max，按分量比较

    this.x = clamp(this.x, min.x, max.x); // 限制 x 分量在范围内
    this.y = clamp(this.y, min.y, max.y); // 限制 y 分量在范围内
    this.z = clamp(this.z, min.z, max.z); // 限制 z 分量在范围内

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量的 x、y 或 z 值大于最大值，则替换为最大值。
   * 如果此向量的 x、y 或 z 值小于最小值，则替换为最小值。
   *
   * @param {number} minVal - 分量将被限制到的最小值
   * @param {number} maxVal - 分量将被限制到的最大值
   * @return {Vector3} 返回此向量的引用
   */
  clampScalar(minVal, maxVal) {
    this.x = clamp(this.x, minVal, maxVal); // 限制 x 分量在标量范围内
    this.y = clamp(this.y, minVal, maxVal); // 限制 y 分量在标量范围内
    this.z = clamp(this.z, minVal, maxVal); // 限制 z 分量在标量范围内

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量的长度大于最大值，则替换为最大值。
   * 如果此向量的长度小于最小值，则替换为最小值。
   *
   * @param {number} min - 向量长度将被限制到的最小值
   * @param {number} max - 向量长度将被限制到的最大值
   * @return {Vector3} 返回此向量的引用
   */
  clampLength(min, max) {
    const length = this.length(); // 计算当前向量长度

    return this.divideScalar(length || 1).multiplyScalar(clamp(length, min, max)); // 标准化后乘以限制后的长度
  }

  /**
   * 将此向量的分量向下舍入到最近的整数值。
   *
   * @return {Vector3} 返回此向量的引用
   */
  floor() {
    this.x = Math.floor(this.x); // x 分量向下舍入
    this.y = Math.floor(this.y); // y 分量向下舍入
    this.z = Math.floor(this.z); // z 分量向下舍入

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量的分量向上舍入到最近的整数值。
   *
   * @return {Vector3} 返回此向量的引用
   */
  ceil() {
    this.x = Math.ceil(this.x); // x 分量向上舍入
    this.y = Math.ceil(this.y); // y 分量向上舍入
    this.z = Math.ceil(this.z); // z 分量向上舍入

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量的分量舍入到最近的整数值。
   *
   * @return {Vector3} 返回此向量的引用
   */
  round() {
    this.x = Math.round(this.x); // x 分量四舍五入
    this.y = Math.round(this.y); // y 分量四舍五入
    this.z = Math.round(this.z); // z 分量四舍五入

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量的分量向零舍入（负数向上，正数向下）到整数值。
   *
   * @return {Vector3} 返回此向量的引用
   */
  roundToZero() {
    this.x = Math.trunc(this.x); // x 分量截断小数部分
    this.y = Math.trunc(this.y); // y 分量截断小数部分
    this.z = Math.trunc(this.z); // z 分量截断小数部分

    return this; // 返回自身以支持链式调用
  }

  /**
   * 反转此向量 - 即设置 x = -x，y = -y，z = -z。
   *
   * @return {Vector3} 返回此向量的引用
   */
  negate() {
    this.x = -this.x; // 反转 x 分量
    this.y = -this.y; // 反转 y 分量
    this.z = -this.z; // 反转 z 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 计算给定向量与此实例的点积。
   *
   * @param {Vector3} v - 要计算点积的向量
   * @return {number} 点积的结果
   */
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z; // 计算点积：x1*x2 + y1*y2 + z1*z2
  }

  // TODO lengthSquared? 待实现：长度平方？

  /**
   * 计算从 (0, 0, 0) 到 (x, y, z) 的欧几里得长度（直线长度）的平方。
   * 如果要比较向量的长度，应该比较长度的平方，因为计算效率更高。
   *
   * @return {number} 此向量的长度平方
   */
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z; // 计算长度平方：x² + y² + z²
  }

  /**
   * 计算从 (0, 0, 0) 到 (x, y, z) 的欧几里得长度（直线长度）。
   *
   * @return {number} 此向量的长度
   */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); // 计算长度：√(x² + y² + z²)
  }

  /**
   * 计算此向量的曼哈顿长度。
   *
   * @return {number} 此向量的曼哈顿长度
   */
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z); // 计算曼哈顿长度：|x| + |y| + |z|
  }

  /**
   * 将此向量转换为单位向量 - 即设置为与此向量方向相同但长度为 1 的向量。
   *
   * @return {Vector3} 返回此向量的引用
   */
  normalize() {
    return this.divideScalar(this.length() || 1); // 除以长度进行标准化，避免除零
  }

  /**
   * 将此向量设置为与此向量方向相同但具有指定长度的向量。
   *
   * @param {number} length - 此向量的新长度
   * @return {Vector3} 返回此向量的引用
   */
  setLength(length) {
    return this.normalize().multiplyScalar(length); // 先标准化再乘以指定长度
  }

  /**
   * 在给定向量和此实例之间进行线性插值，其中 alpha 是沿线的百分比距离 -
   * alpha = 0 将是此向量，alpha = 1 将是给定向量。
   *
   * @param {Vector3} v - 要插值到的向量
   * @param {number} alpha - 插值因子，通常在闭区间 [0, 1] 内
   * @return {Vector3} 返回此向量的引用
   */
  lerp(v, alpha) {
    this.x += (v.x - this.x) * alpha; // x 分量线性插值
    this.y += (v.y - this.y) * alpha; // y 分量线性插值
    this.z += (v.z - this.z) * alpha; // z 分量线性插值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 在给定的两个向量之间进行线性插值，其中 alpha 是沿线的百分比距离 -
   * alpha = 0 将是第一个向量，alpha = 1 将是第二个向量。结果存储在此实例中。
   *
   * @param {Vector3} v1 - 第一个向量
   * @param {Vector3} v2 - 第二个向量
   * @param {number} alpha - 插值因子，通常在闭区间 [0, 1] 内
   * @return {Vector3} 返回此向量的引用
   */
  lerpVectors(v1, v2, alpha) {
    this.x = v1.x + (v2.x - v1.x) * alpha; // x 分量在两向量间插值
    this.y = v1.y + (v2.y - v1.y) * alpha; // y 分量在两向量间插值
    this.z = v1.z + (v2.z - v1.z) * alpha; // z 分量在两向量间插值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 计算给定向量与此实例的叉积。
   *
   * @param {Vector3} v - 要计算叉积的向量
   * @return {Vector3} 叉积的结果
   */
  cross(v) {
    return this.crossVectors(this, v); // 调用 crossVectors 方法计算叉积
  }

  /**
   * 计算给定向量的叉积并将结果存储在此实例中。
   *
   * @param {Vector3} a - 第一个向量
   * @param {Vector3} b - 第二个向量
   * @return {Vector3} 返回此向量的引用
   */
  crossVectors(a, b) {
    const ax = a.x, // 第一个向量的 x 分量
      ay = a.y, // 第一个向量的 y 分量
      az = a.z; // 第一个向量的 z 分量
    const bx = b.x, // 第二个向量的 x 分量
      by = b.y, // 第二个向量的 y 分量
      bz = b.z; // 第二个向量的 z 分量

    this.x = ay * bz - az * by; // 叉积的 x 分量：ay*bz - az*by
    this.y = az * bx - ax * bz; // 叉积的 y 分量：az*bx - ax*bz
    this.z = ax * by - ay * bx; // 叉积的 z 分量：ax*by - ay*bx

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量投影到给定向量上。
   *
   * @param {Vector3} v - 要投影到的向量
   * @return {Vector3} 返回此向量的引用
   */
  projectOnVector(v) {
    const denominator = v.lengthSq(); // 计算目标向量的长度平方

    if (denominator === 0) return this.set(0, 0, 0); // 如果目标向量为零向量，返回零向量

    const scalar = v.dot(this) / denominator; // 计算投影的标量系数

    return this.copy(v).multiplyScalar(scalar); // 复制目标向量并乘以标量系数
  }

  /**
   * 通过从此向量中减去此向量在平面法线上的投影，将此向量投影到平面上。
   *
   * @param {Vector3} planeNormal - 平面法线
   * @return {Vector3} 返回此向量的引用
   */
  projectOnPlane(planeNormal) {
    _vector.copy(this).projectOnVector(planeNormal); // 计算此向量在法线上的投影

    return this.sub(_vector); // 从此向量中减去投影，得到平面投影
  }

  /**
   * 将此向量从与给定法线向量正交的平面上反射。
   *
   * @param {Vector3} normal - （标准化的）法线向量
   * @return {Vector3} 返回此向量的引用
   */
  reflect(normal) {
    return this.sub(_vector.copy(normal).multiplyScalar(2 * this.dot(normal))); // 反射公式：v - 2 * (v · n) * n
  }
  /**
   * 返回给定向量与此实例之间的角度（弧度）。
   *
   * @param {Vector3} v - 要计算角度的向量
   * @return {number} 角度（弧度）
   */
  angleTo(v) {
    const denominator = Math.sqrt(this.lengthSq() * v.lengthSq()); // 计算两向量长度的乘积

    if (denominator === 0) return Math.PI / 2; // 如果有零向量，返回 π/2

    const theta = this.dot(v) / denominator; // 计算余弦值

    // 限制范围以处理数值问题

    return Math.acos(clamp(theta, -1, 1)); // 返回反余弦值，即角度
  }

  /**
   * 计算从给定向量到此实例的距离。
   *
   * @param {Vector3} v - 要计算距离的向量
   * @return {number} 距离
   */
  distanceTo(v) {
    return Math.sqrt(this.distanceToSquared(v)); // 计算距离平方的平方根
  }

  /**
   * 计算从给定向量到此实例的距离平方。
   * 如果只是比较距离，应该比较距离平方，因为计算效率更高。
   *
   * @param {Vector3} v - 要计算距离平方的向量
   * @return {number} 距离平方
   */
  distanceToSquared(v) {
    const dx = this.x - v.x, // x 方向的差值
      dy = this.y - v.y, // y 方向的差值
      dz = this.z - v.z; // z 方向的差值

    return dx * dx + dy * dy + dz * dz; // 计算距离平方：Δx² + Δy² + Δz²
  }

  /**
   * 计算从给定向量到此实例的曼哈顿距离。
   *
   * @param {Vector3} v - 要计算曼哈顿距离的向量
   * @return {number} 曼哈顿距离
   */
  manhattanDistanceTo(v) {
    return Math.abs(this.x - v.x) + Math.abs(this.y - v.y) + Math.abs(this.z - v.z); // 计算曼哈顿距离：|Δx| + |Δy| + |Δz|
  }

  /**
   * 从给定的球坐标设置向量分量。
   *
   * @param {Spherical} s - 球坐标对象
   * @return {Vector3} 返回此向量的引用
   */
  setFromSpherical(s) {
    return this.setFromSphericalCoords(s.radius, s.phi, s.theta); // 调用具体的球坐标设置方法
  }

  /**
   * 从给定的球坐标设置向量分量。
   *
   * @param {number} radius - 半径
   * @param {number} phi - phi 角度（弧度）
   * @param {number} theta - theta 角度（弧度）
   * @return {Vector3} 返回此向量的引用
   */
  setFromSphericalCoords(radius, phi, theta) {
    const sinPhiRadius = Math.sin(phi) * radius; // 计算 sin(phi) * radius

    this.x = sinPhiRadius * Math.sin(theta); // x = r * sin(phi) * sin(theta)
    this.y = Math.cos(phi) * radius; // y = r * cos(phi)
    this.z = sinPhiRadius * Math.cos(theta); // z = r * sin(phi) * cos(theta)

    return this; // 返回自身以支持链式调用
  }

  /**
   * 从给定的柱坐标设置向量分量。
   *
   * @param {Cylindrical} c - 柱坐标对象
   * @return {Vector3} 返回此向量的引用
   */
  setFromCylindrical(c) {
    return this.setFromCylindricalCoords(c.radius, c.theta, c.y); // 调用具体的柱坐标设置方法
  }

  /**
   * 从给定的柱坐标设置向量分量。
   *
   * @param {number} radius - 半径
   * @param {number} theta - theta 角度（弧度）
   * @param {number} y - y 值
   * @return {Vector3} 返回此向量的引用
   */
  setFromCylindricalCoords(radius, theta, y) {
    this.x = radius * Math.sin(theta); // x = r * sin(theta)
    this.y = y; // y 保持不变
    this.z = radius * Math.cos(theta); // z = r * cos(theta)

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将向量分量设置为给定变换矩阵的位置元素。
   *
   * @param {Matrix4} m - 4x4 矩阵
   * @return {Vector3} 返回此向量的引用
   */
  setFromMatrixPosition(m) {
    const e = m.elements; // 获取矩阵元素数组

    this.x = e[12]; // 提取位置的 x 分量（第4列第1行）
    this.y = e[13]; // 提取位置的 y 分量（第4列第2行）
    this.z = e[14]; // 提取位置的 z 分量（第4列第3行）

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将向量分量设置为给定变换矩阵的缩放元素。
   *
   * @param {Matrix4} m - 4x4 矩阵
   * @return {Vector3} 返回此向量的引用
   */
  setFromMatrixScale(m) {
    const sx = this.setFromMatrixColumn(m, 0).length(); // 计算第1列的长度（x轴缩放）
    const sy = this.setFromMatrixColumn(m, 1).length(); // 计算第2列的长度（y轴缩放）
    const sz = this.setFromMatrixColumn(m, 2).length(); // 计算第3列的长度（z轴缩放）

    this.x = sx; // 设置 x 缩放
    this.y = sy; // 设置 y 缩放
    this.z = sz; // 设置 z 缩放

    return this; // 返回自身以支持链式调用
  }

  /**
   * 从指定的矩阵列设置向量分量。
   *
   * @param {Matrix4} m - 4x4 矩阵
   * @param {number} index - 列索引
   * @return {Vector3} 返回此向量的引用
   */
  setFromMatrixColumn(m, index) {
    return this.fromArray(m.elements, index * 4); // 从矩阵元素数组中提取指定列
  }

  /**
   * 从指定的矩阵列设置向量分量。
   *
   * @param {Matrix3} m - 3x3 矩阵
   * @param {number} index - 列索引
   * @return {Vector3} 返回此向量的引用
   */
  setFromMatrix3Column(m, index) {
    return this.fromArray(m.elements, index * 3); // 从3x3矩阵元素数组中提取指定列
  }

  /**
   * 从给定的欧拉角设置向量分量。
   *
   * @param {Euler} e - 要设置的欧拉角
   * @return {Vector3} 返回此向量的引用
   */
  setFromEuler(e) {
    this.x = e._x; // 设置 x 分量为欧拉角的 x 值
    this.y = e._y; // 设置 y 分量为欧拉角的 y 值
    this.z = e._z; // 设置 z 分量为欧拉角的 z 值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 从给定颜色的 RGB 分量设置向量分量。
   *
   * @param {Color} c - 要设置的颜色
   * @return {Vector3} 返回此向量的引用
   */
  setFromColor(c) {
    this.x = c.r; // 设置 x 分量为红色分量
    this.y = c.g; // 设置 y 分量为绿色分量
    this.z = c.b; // 设置 z 分量为蓝色分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量与给定向量相等，则返回 true。
   *
   * @param {Vector3} v - 要测试相等性的向量
   * @return {boolean} 此向量是否与给定向量相等
   */
  equals(v) {
    return v.x === this.x && v.y === this.y && v.z === this.z; // 比较所有分量是否相等
  }

  /**
   * 将此向量的 x 值设置为 array[offset]，y 值设置为 array[offset + 1]，
   * z 值设置为 array[offset + 2]。
   *
   * @param {Array<number>} array - 包含向量分量值的数组
   * @param {number} [offset=0] - 数组中的偏移量
   * @return {Vector3} 返回此向量的引用
   */
  fromArray(array, offset = 0) {
    this.x = array[offset]; // 从数组中读取 x 分量
    this.y = array[offset + 1]; // 从数组中读取 y 分量
    this.z = array[offset + 2]; // 从数组中读取 z 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量的分量写入给定数组。如果未提供数组，该方法返回一个新实例。
   *
   * @param {Array<number>} [array=[]] - 保存向量分量的目标数组
   * @param {number} [offset=0] - 数组中第一个元素的索引
   * @return {Array<number>} 向量分量数组
   */
  toArray(array = [], offset = 0) {
    array[offset] = this.x; // 将 x 分量写入数组
    array[offset + 1] = this.y; // 将 y 分量写入数组
    array[offset + 2] = this.z; // 将 z 分量写入数组

    return array; // 返回数组
  }

  /**
   * 从给定的缓冲区属性设置此向量的分量。
   *
   * @param {BufferAttribute} attribute - 保存向量数据的缓冲区属性
   * @param {number} index - 属性中的索引
   * @return {Vector3} 返回此向量的引用
   */
  fromBufferAttribute(attribute, index) {
    this.x = attribute.getX(index); // 从缓冲区属性获取 x 分量
    this.y = attribute.getY(index); // 从缓冲区属性获取 y 分量
    this.z = attribute.getZ(index); // 从缓冲区属性获取 z 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量的每个分量设置为 0 到 1 之间的伪随机值（不包括 1）。
   *
   * @return {Vector3} 返回此向量的引用
   */
  random() {
    this.x = Math.random(); // 设置 x 分量为随机值
    this.y = Math.random(); // 设置 y 分量为随机值
    this.z = Math.random(); // 设置 z 分量为随机值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量设置为单位球面上的均匀随机点。
   *
   * @return {Vector3} 返回此向量的引用
   */
  randomDirection() {
    // 参考：https://mathworld.wolfram.com/SpherePointPicking.html

    const theta = Math.random() * Math.PI * 2; // 随机角度 θ，范围 [0, 2π]
    const u = Math.random() * 2 - 1; // 随机值 u，范围 [-1, 1]
    const c = Math.sqrt(1 - u * u); // 计算 √(1 - u²)

    this.x = c * Math.cos(theta); // x = √(1 - u²) * cos(θ)
    this.y = u; // y = u
    this.z = c * Math.sin(theta); // z = √(1 - u²) * sin(θ)

    return this; // 返回自身以支持链式调用
  }

  /**
   * 迭代器方法，允许使用 for...of 循环遍历向量分量。
   */
  *[Symbol.iterator]() {
    yield this.x; // 产出 x 分量
    yield this.y; // 产出 y 分量
    yield this.z; // 产出 z 分量
  }
}

// 创建用于内部计算的向量实例（纯函数标记用于优化）
const _vector = /*@__PURE__*/ new Vector3();
// 创建用于内部计算的四元数实例（纯函数标记用于优化）
const _quaternion = /*@__PURE__*/ new Quaternion();

// 导出 Vector3 类
export { Vector3 };
