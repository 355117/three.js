// 从数学工具模块导入 clamp 函数，用于数值范围限制
import { clamp } from "./MathUtils.js";

/**
 * 表示四维向量的类。四维向量是一个有序的四元数组 (x, y, z, w)，
 * 可以用来表示多种概念，例如：
 *
 * - 四维空间中的一个点
 * - 四维空间中的方向和长度。在 three.js 中，长度总是从 (0, 0, 0, 0) 到 (x, y, z, w) 的
 *   欧几里得距离（直线距离），方向也是从 (0, 0, 0, 0) 指向 (x, y, z, w)
 * - 任意有序的四元数组
 *
 * 四维向量还可以用来表示其他概念，但上述是 three.js 中最常见的用法。
 *
 * 遍历向量实例将按对应顺序产生其分量 (x, y, z, w)。
 * ```js
 * const a = new THREE.Vector4( 0, 1, 0, 0 );
 *
 * // 无参数；将初始化为 (0, 0, 0, 1)
 * const b = new THREE.Vector4( );
 *
 * const d = a.dot( b );
 * ```
 */
class Vector4 {
  /**
   * 构造一个新的四维向量。
   *
   * @param {number} [x=0] - 向量的 x 分量值
   * @param {number} [y=0] - 向量的 y 分量值
   * @param {number} [z=0] - 向量的 z 分量值
   * @param {number} [w=1] - 向量的 w 分量值
   */
  constructor(x = 0, y = 0, z = 0, w = 1) {
    /**
     * 此标志可用于类型检测。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    Vector4.prototype.isVector4 = true; // 设置类型标识符为 true

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

    /**
     * 向量的 w 分量值。
     *
     * @type {number}
     */
    this.w = w; // 设置 w 分量
  }

  /**
   * {@link Vector4#z} 的别名。
   *
   * @type {number}
   */
  get width() {
    return this.z; // 返回 z 分量作为宽度
  }

  set width(value) {
    this.z = value; // 设置 z 分量作为宽度
  }

  /**
   * {@link Vector4#w} 的别名。
   *
   * @type {number}
   */
  get height() {
    return this.w; // 返回 w 分量作为高度
  }

  set height(value) {
    this.w = value; // 设置 w 分量作为高度
  }

  /**
   * 设置向量的各个分量。
   *
   * @param {number} x - x 分量的值
   * @param {number} y - y 分量的值
   * @param {number} z - z 分量的值
   * @param {number} w - w 分量的值
   * @return {Vector4} 返回此向量的引用
   */
  set(x, y, z, w) {
    this.x = x; // 设置 x 分量
    this.y = y; // 设置 y 分量
    this.z = z; // 设置 z 分量
    this.w = w; // 设置 w 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将向量的所有分量设置为相同的值。
   *
   * @param {number} scalar - 要设置给所有向量分量的值
   * @return {Vector4} 返回此向量的引用
   */
  setScalar(scalar) {
    this.x = scalar; // 设置 x 分量为标量值
    this.y = scalar; // 设置 y 分量为标量值
    this.z = scalar; // 设置 z 分量为标量值
    this.w = scalar; // 设置 w 分量为标量值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 设置向量的 x 分量为给定值。
   *
   * @param {number} x - 要设置的值
   * @return {Vector4} 返回此向量的引用
   */
  setX(x) {
    this.x = x; // 设置 x 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 设置向量的 y 分量为给定值。
   *
   * @param {number} y - 要设置的值
   * @return {Vector4} 返回此向量的引用
   */
  setY(y) {
    this.y = y; // 设置 y 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 设置向量的 z 分量为给定值。
   *
   * @param {number} z - 要设置的值
   * @return {Vector4} 返回此向量的引用
   */
  setZ(z) {
    this.z = z; // 设置 z 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 设置向量的 w 分量为给定值。
   *
   * @param {number} w - 要设置的值
   * @return {Vector4} 返回此向量的引用
   */
  setW(w) {
    this.w = w; // 设置 w 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 允许通过索引设置向量分量。
   *
   * @param {number} index - 分量索引。0 对应 x，1 对应 y，2 对应 z，3 对应 w
   * @param {number} value - 要设置的值
   * @return {Vector4} 返回此向量的引用
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
      case 3:
        this.w = value; // 索引 3：设置 w 分量
        break;
      default:
        throw new Error("index is out of range: " + index); // 索引超出范围时抛出错误
    }

    return this; // 返回自身以支持链式调用
  }

  /**
   * 返回与给定索引匹配的向量分量值。
   *
   * @param {number} index - 分量索引。0 对应 x，1 对应 y，2 对应 z，3 对应 w
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
      case 3:
        return this.w; // 索引 3：返回 w 分量
      default:
        throw new Error("index is out of range: " + index); // 索引超出范围时抛出错误
    }
  }

  /**
   * 返回一个复制了此实例值的新向量。
   *
   * @return {Vector4} 此实例的克隆
   */
  clone() {
    return new this.constructor(this.x, this.y, this.z, this.w); // 创建新的向量实例并复制当前值
  }

  /**
   * 将给定向量的值复制到此实例。
   *
   * @param {Vector3|Vector4} v - 要复制的向量
   * @return {Vector4} 返回此向量的引用
   */
  copy(v) {
    this.x = v.x; // 复制 x 分量
    this.y = v.y; // 复制 y 分量
    this.z = v.z; // 复制 z 分量
    this.w = v.w !== undefined ? v.w : 1; // 复制 w 分量，如果未定义则默认为 1

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定向量加到此实例上。
   *
   * @param {Vector4} v - 要相加的向量
   * @return {Vector4} 返回此向量的引用
   */
  add(v) {
    this.x += v.x; // x 分量相加
    this.y += v.y; // y 分量相加
    this.z += v.z; // z 分量相加
    this.w += v.w; // w 分量相加

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定标量值加到此实例的所有分量上。
   *
   * @param {number} s - 要相加的标量
   * @return {Vector4} 返回此向量的引用
   */
  addScalar(s) {
    this.x += s; // x 分量加上标量
    this.y += s; // y 分量加上标量
    this.z += s; // z 分量加上标量
    this.w += s; // w 分量加上标量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定的两个向量相加，并将结果存储在此实例中。
   *
   * @param {Vector4} a - 第一个向量
   * @param {Vector4} b - 第二个向量
   * @return {Vector4} 返回此向量的引用
   */
  addVectors(a, b) {
    this.x = a.x + b.x; // 计算 x 分量的和
    this.y = a.y + b.y; // 计算 y 分量的和
    this.z = a.z + b.z; // 计算 z 分量的和
    this.w = a.w + b.w; // 计算 w 分量的和

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定向量按给定因子缩放后加到此实例上。
   *
   * @param {Vector4} v - 要相加的向量
   * @param {number} s - 缩放向量 v 的因子
   * @return {Vector4} 返回此向量的引用
   */
  addScaledVector(v, s) {
    this.x += v.x * s; // x 分量加上缩放后的 v.x
    this.y += v.y * s; // y 分量加上缩放后的 v.y
    this.z += v.z * s; // z 分量加上缩放后的 v.z
    this.w += v.w * s; // w 分量加上缩放后的 v.w

    return this; // 返回自身以支持链式调用
  }

  /**
   * 从此实例中减去给定向量。
   *
   * @param {Vector4} v - 要减去的向量
   * @return {Vector4} 返回此向量的引用
   */
  sub(v) {
    this.x -= v.x; // x 分量相减
    this.y -= v.y; // y 分量相减
    this.z -= v.z; // z 分量相减
    this.w -= v.w; // w 分量相减

    return this; // 返回自身以支持链式调用
  }

  /**
   * 从此实例的所有分量中减去给定标量值。
   *
   * @param {number} s - 要减去的标量
   * @return {Vector4} 返回此向量的引用
   */
  subScalar(s) {
    this.x -= s; // x 分量减去标量
    this.y -= s; // y 分量减去标量
    this.z -= s; // z 分量减去标量
    this.w -= s; // w 分量减去标量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 计算给定向量的差值，并将结果存储在此实例中。
   *
   * @param {Vector4} a - 第一个向量（被减数）
   * @param {Vector4} b - 第二个向量（减数）
   * @return {Vector4} 返回此向量的引用
   */
  subVectors(a, b) {
    this.x = a.x - b.x; // 计算 x 分量的差
    this.y = a.y - b.y; // 计算 y 分量的差
    this.z = a.z - b.z; // 计算 z 分量的差
    this.w = a.w - b.w; // 计算 w 分量的差

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定向量与此实例相乘。
   *
   * @param {Vector4} v - 要相乘的向量
   * @return {Vector4} 返回此向量的引用
   */
  multiply(v) {
    this.x *= v.x; // x 分量相乘
    this.y *= v.y; // y 分量相乘
    this.z *= v.z; // z 分量相乘
    this.w *= v.w; // w 分量相乘

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将给定标量值与此实例的所有分量相乘。
   *
   * @param {number} scalar - 要相乘的标量
   * @return {Vector4} 返回此向量的引用
   */
  multiplyScalar(scalar) {
    this.x *= scalar; // x 分量乘以标量
    this.y *= scalar; // y 分量乘以标量
    this.z *= scalar; // z 分量乘以标量
    this.w *= scalar; // w 分量乘以标量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量与给定的 4x4 矩阵相乘。
   *
   * @param {Matrix4} m - 4x4 矩阵
   * @return {Vector4} 返回此向量的引用
   */
  applyMatrix4(m) {
    const x = this.x, // 保存原始 x 值
      y = this.y, // 保存原始 y 值
      z = this.z, // 保存原始 z 值
      w = this.w; // 保存原始 w 值
    const e = m.elements; // 获取矩阵元素数组

    this.x = e[0] * x + e[4] * y + e[8] * z + e[12] * w; // 计算新的 x 分量
    this.y = e[1] * x + e[5] * y + e[9] * z + e[13] * w; // 计算新的 y 分量
    this.z = e[2] * x + e[6] * y + e[10] * z + e[14] * w; // 计算新的 z 分量
    this.w = e[3] * x + e[7] * y + e[11] * z + e[15] * w; // 计算新的 w 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此实例除以给定向量。
   *
   * @param {Vector4} v - 要除以的向量
   * @return {Vector4} 返回此向量的引用
   */
  divide(v) {
    this.x /= v.x; // x 分量相除
    this.y /= v.y; // y 分量相除
    this.z /= v.z; // z 分量相除
    this.w /= v.w; // w 分量相除

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量除以给定标量。
   *
   * @param {number} scalar - 要除以的标量
   * @return {Vector4} 返回此向量的引用
   */
  divideScalar(scalar) {
    return this.multiplyScalar(1 / scalar); // 通过乘以倒数来实现除法
  }

  /**
   * 将此向量的 x、y 和 z 分量设置为四元数的轴，w 设置为角度。
   *
   * @param {Quaternion} q - 要设置的四元数
   * @return {Vector4} 返回此向量的引用
   */
  setAxisAngleFromQuaternion(q) {
    // 参考：http://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToAngle/index.htm

    // 假设四元数 q 已经标准化

    this.w = 2 * Math.acos(q.w); // 计算旋转角度：w = 2 * arccos(qw)

    const s = Math.sqrt(1 - q.w * q.w); // 计算 sin(angle/2)

    if (s < 0.0001) {
      // 如果 sin(angle/2) 接近零（角度接近 0 或 2π）
      this.x = 1; // 设置默认轴为 x 轴
      this.y = 0;
      this.z = 0;
    } else {
      this.x = q.x / s; // 标准化轴向量：axis = q.xyz / sin(angle/2)
      this.y = q.y / s;
      this.z = q.z / s;
    }

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量的 x、y 和 z 分量设置为旋转轴，w 设置为角度。
   *
   * @param {Matrix4} m - 4x4 矩阵，其左上角 3x3 矩阵是纯旋转矩阵
   * @return {Vector4} 返回此向量的引用
   */
  setAxisAngleFromRotationMatrix(m) {
    // 参考：http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToAngle/index.htm

    // 假设 m 的上 3x3 部分是纯旋转矩阵（即未缩放）

    let angle, x, y, z; // 结果变量
    const epsilon = 0.01, // 允许舍入误差的边界
      epsilon2 = 0.1, // 区分 0 度和 180 度的边界
      te = m.elements, // 获取矩阵元素
      m11 = te[0], // 矩阵第1行第1列
      m12 = te[4], // 矩阵第1行第2列
      m13 = te[8], // 矩阵第1行第3列
      m21 = te[1], // 矩阵第2行第1列
      m22 = te[5], // 矩阵第2行第2列
      m23 = te[9], // 矩阵第2行第3列
      m31 = te[2], // 矩阵第3行第1列
      m32 = te[6], // 矩阵第3行第2列
      m33 = te[10]; // 矩阵第3行第3列

    if (Math.abs(m12 - m21) < epsilon && Math.abs(m13 - m31) < epsilon && Math.abs(m23 - m32) < epsilon) {
      // 发现奇点
      // 首先检查单位矩阵，主对角线上的所有项必须为 +1，其他项为零

      if (Math.abs(m12 + m21) < epsilon2 && Math.abs(m13 + m31) < epsilon2 && Math.abs(m23 + m32) < epsilon2 && Math.abs(m11 + m22 + m33 - 3) < epsilon2) {
        // 这个奇点是单位矩阵，所以角度 = 0

        this.set(1, 0, 0, 0); // 设置为零角度，任意轴

        return this; // 零角度，任意轴
      }

      // 否则这个奇点是角度 = 180 度

      angle = Math.PI; // 设置角度为 π（180度）

      const xx = (m11 + 1) / 2; // 计算轴分量的平方
      const yy = (m22 + 1) / 2;
      const zz = (m33 + 1) / 2;
      const xy = (m12 + m21) / 4; // 计算轴分量的乘积
      const xz = (m13 + m31) / 4;
      const yz = (m23 + m32) / 4;

      if (xx > yy && xx > zz) {
        // m11 是最大的对角线项

        if (xx < epsilon) {
          x = 0; // 如果 xx 太小，使用默认值
          y = 0.707106781; // √2/2
          z = 0.707106781; // √2/2
        } else {
          x = Math.sqrt(xx); // 计算 x 轴分量
          y = xy / x; // 计算 y 轴分量
          z = xz / x; // 计算 z 轴分量
        }
      } else if (yy > zz) {
        // m22 是最大的对角线项

        if (yy < epsilon) {
          x = 0.707106781; // √2/2
          y = 0; // 如果 yy 太小，使用默认值
          z = 0.707106781; // √2/2
        } else {
          y = Math.sqrt(yy); // 计算 y 轴分量
          x = xy / y; // 计算 x 轴分量
          z = yz / y; // 计算 z 轴分量
        }
      } else {
        // m33 是最大的对角线项，基于此计算结果

        if (zz < epsilon) {
          x = 0.707106781; // √2/2
          y = 0.707106781; // √2/2
          z = 0; // 如果 zz 太小，使用默认值
        } else {
          z = Math.sqrt(zz); // 计算 z 轴分量
          x = xz / z; // 计算 x 轴分量
          y = yz / z; // 计算 y 轴分量
        }
      }

      this.set(x, y, z, angle); // 设置轴和角度

      return this; // 返回 180 度旋转
    }

    // 到达这里说明没有奇点，可以正常处理

    let s = Math.sqrt((m32 - m23) * (m32 - m23) + (m13 - m31) * (m13 - m31) + (m21 - m12) * (m21 - m12)); // 用于标准化

    if (Math.abs(s) < 0.001) s = 1; // 防止除零

    // 防止除零，如果矩阵是正交的应该不会发生，
    // 应该被上面的奇点测试捕获，但为了安全起见保留

    this.x = (m32 - m23) / s; // 计算标准化的轴 x 分量
    this.y = (m13 - m31) / s; // 计算标准化的轴 y 分量
    this.z = (m21 - m12) / s; // 计算标准化的轴 z 分量
    this.w = Math.acos((m11 + m22 + m33 - 1) / 2); // 计算旋转角度

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将向量分量设置为给定变换矩阵的位置元素。
   *
   * @param {Matrix4} m - 4x4 矩阵
   * @return {Vector4} 返回此向量的引用
   */
  setFromMatrixPosition(m) {
    const e = m.elements; // 获取矩阵元素数组

    this.x = e[12]; // 提取位置的 x 分量（第4列第1行）
    this.y = e[13]; // 提取位置的 y 分量（第4列第2行）
    this.z = e[14]; // 提取位置的 z 分量（第4列第3行）
    this.w = e[15]; // 提取位置的 w 分量（第4列第4行）

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量的 x、y、z 或 w 值大于给定向量的对应值，
   * 则将该值替换为对应的最小值。
   *
   * @param {Vector4} v - 比较的向量
   * @return {Vector4} 返回此向量的引用
   */
  min(v) {
    this.x = Math.min(this.x, v.x); // 取 x 分量的最小值
    this.y = Math.min(this.y, v.y); // 取 y 分量的最小值
    this.z = Math.min(this.z, v.z); // 取 z 分量的最小值
    this.w = Math.min(this.w, v.w); // 取 w 分量的最小值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量的 x、y、z 或 w 值小于给定向量的对应值，
   * 则将该值替换为对应的最大值。
   *
   * @param {Vector4} v - 比较的向量
   * @return {Vector4} 返回此向量的引用
   */
  max(v) {
    this.x = Math.max(this.x, v.x); // 取 x 分量的最大值
    this.y = Math.max(this.y, v.y); // 取 y 分量的最大值
    this.z = Math.max(this.z, v.z); // 取 z 分量的最大值
    this.w = Math.max(this.w, v.w); // 取 w 分量的最大值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量的 x、y、z 或 w 值大于最大向量的对应值，则替换为最大值。
   * 如果此向量的 x、y、z 或 w 值小于最小向量的对应值，则替换为最小值。
   *
   * @param {Vector4} min - 最小 x、y、z 和 w 值
   * @param {Vector4} max - 期望范围内的最大 x、y、z 和 w 值
   * @return {Vector4} 返回此向量的引用
   */
  clamp(min, max) {
    // 假设 min < max，按分量比较

    this.x = clamp(this.x, min.x, max.x); // 限制 x 分量在范围内
    this.y = clamp(this.y, min.y, max.y); // 限制 y 分量在范围内
    this.z = clamp(this.z, min.z, max.z); // 限制 z 分量在范围内
    this.w = clamp(this.w, min.w, max.w); // 限制 w 分量在范围内

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量的 x、y、z 或 w 值大于最大值，则替换为最大值。
   * 如果此向量的 x、y、z 或 w 值小于最小值，则替换为最小值。
   *
   * @param {number} minVal - 分量将被限制到的最小值
   * @param {number} maxVal - 分量将被限制到的最大值
   * @return {Vector4} 返回此向量的引用
   */
  clampScalar(minVal, maxVal) {
    this.x = clamp(this.x, minVal, maxVal); // 限制 x 分量在标量范围内
    this.y = clamp(this.y, minVal, maxVal); // 限制 y 分量在标量范围内
    this.z = clamp(this.z, minVal, maxVal); // 限制 z 分量在标量范围内
    this.w = clamp(this.w, minVal, maxVal); // 限制 w 分量在标量范围内

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量的长度大于最大值，则替换为最大值。
   * 如果此向量的长度小于最小值，则替换为最小值。
   *
   * @param {number} min - 向量长度将被限制到的最小值
   * @param {number} max - 向量长度将被限制到的最大值
   * @return {Vector4} 返回此向量的引用
   */
  clampLength(min, max) {
    const length = this.length(); // 计算当前向量长度

    return this.divideScalar(length || 1).multiplyScalar(clamp(length, min, max)); // 标准化后乘以限制后的长度
  }

  /**
   * 将此向量的分量向下舍入到最近的整数值。
   *
   * @return {Vector4} 返回此向量的引用
   */
  floor() {
    this.x = Math.floor(this.x); // x 分量向下舍入
    this.y = Math.floor(this.y); // y 分量向下舍入
    this.z = Math.floor(this.z); // z 分量向下舍入
    this.w = Math.floor(this.w); // w 分量向下舍入

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量的分量向上舍入到最近的整数值。
   *
   * @return {Vector4} 返回此向量的引用
   */
  ceil() {
    this.x = Math.ceil(this.x); // x 分量向上舍入
    this.y = Math.ceil(this.y); // y 分量向上舍入
    this.z = Math.ceil(this.z); // z 分量向上舍入
    this.w = Math.ceil(this.w); // w 分量向上舍入

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量的分量舍入到最近的整数值。
   *
   * @return {Vector4} 返回此向量的引用
   */
  round() {
    this.x = Math.round(this.x); // x 分量四舍五入
    this.y = Math.round(this.y); // y 分量四舍五入
    this.z = Math.round(this.z); // z 分量四舍五入
    this.w = Math.round(this.w); // w 分量四舍五入

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量的分量向零舍入（负数向上，正数向下）到整数值。
   *
   * @return {Vector4} 返回此向量的引用
   */
  roundToZero() {
    this.x = Math.trunc(this.x); // x 分量截断小数部分
    this.y = Math.trunc(this.y); // y 分量截断小数部分
    this.z = Math.trunc(this.z); // z 分量截断小数部分
    this.w = Math.trunc(this.w); // w 分量截断小数部分

    return this; // 返回自身以支持链式调用
  }

  /**
   * 反转此向量 - 即设置 x = -x，y = -y，z = -z，w = -w。
   *
   * @return {Vector4} 返回此向量的引用
   */
  negate() {
    this.x = -this.x; // 反转 x 分量
    this.y = -this.y; // 反转 y 分量
    this.z = -this.z; // 反转 z 分量
    this.w = -this.w; // 反转 w 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 计算给定向量与此实例的点积。
   *
   * @param {Vector4} v - 要计算点积的向量
   * @return {number} 点积的结果
   */
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w; // 计算点积：x1*x2 + y1*y2 + z1*z2 + w1*w2
  }

  /**
   * 计算从 (0, 0, 0, 0) 到 (x, y, z, w) 的欧几里得长度（直线长度）的平方。
   * 如果要比较向量的长度，应该比较长度的平方，因为计算效率更高。
   *
   * @return {number} 此向量的长度平方
   */
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w; // 计算长度平方：x² + y² + z² + w²
  }

  /**
   * 计算从 (0, 0, 0, 0) 到 (x, y, z, w) 的欧几里得长度（直线长度）。
   *
   * @return {number} 此向量的长度
   */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w); // 计算长度：√(x² + y² + z² + w²)
  }

  /**
   * 计算此向量的曼哈顿长度。
   *
   * @return {number} 此向量的曼哈顿长度
   */
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z) + Math.abs(this.w); // 计算曼哈顿长度：|x| + |y| + |z| + |w|
  }

  /**
   * 将此向量转换为单位向量 - 即设置为与此向量方向相同但长度为 1 的向量。
   *
   * @return {Vector4} 返回此向量的引用
   */
  normalize() {
    return this.divideScalar(this.length() || 1); // 除以长度进行标准化，避免除零
  }

  /**
   * 将此向量设置为与此向量方向相同但具有指定长度的向量。
   *
   * @param {number} length - 此向量的新长度
   * @return {Vector4} 返回此向量的引用
   */
  setLength(length) {
    return this.normalize().multiplyScalar(length); // 先标准化再乘以指定长度
  }

  /**
   * 在给定向量和此实例之间进行线性插值，其中 alpha 是沿线的百分比距离 -
   * alpha = 0 将是此向量，alpha = 1 将是给定向量。
   *
   * @param {Vector4} v - 要插值到的向量
   * @param {number} alpha - 插值因子，通常在闭区间 [0, 1] 内
   * @return {Vector4} 返回此向量的引用
   */
  lerp(v, alpha) {
    this.x += (v.x - this.x) * alpha; // x 分量线性插值
    this.y += (v.y - this.y) * alpha; // y 分量线性插值
    this.z += (v.z - this.z) * alpha; // z 分量线性插值
    this.w += (v.w - this.w) * alpha; // w 分量线性插值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 在给定的两个向量之间进行线性插值，其中 alpha 是沿线的百分比距离 -
   * alpha = 0 将是第一个向量，alpha = 1 将是第二个向量。结果存储在此实例中。
   *
   * @param {Vector4} v1 - 第一个向量
   * @param {Vector4} v2 - 第二个向量
   * @param {number} alpha - 插值因子，通常在闭区间 [0, 1] 内
   * @return {Vector4} 返回此向量的引用
   */
  lerpVectors(v1, v2, alpha) {
    this.x = v1.x + (v2.x - v1.x) * alpha; // x 分量在两向量间插值
    this.y = v1.y + (v2.y - v1.y) * alpha; // y 分量在两向量间插值
    this.z = v1.z + (v2.z - v1.z) * alpha; // z 分量在两向量间插值
    this.w = v1.w + (v2.w - v1.w) * alpha; // w 分量在两向量间插值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 如果此向量与给定向量相等，则返回 true。
   *
   * @param {Vector4} v - 要测试相等性的向量
   * @return {boolean} 此向量是否与给定向量相等
   */
  equals(v) {
    return v.x === this.x && v.y === this.y && v.z === this.z && v.w === this.w; // 比较所有分量是否相等
  }

  /**
   * 将此向量的 x 值设置为 array[offset]，y 值设置为 array[offset + 1]，
   * z 值设置为 array[offset + 2]，w 值设置为 array[offset + 3]。
   *
   * @param {Array<number>} array - 包含向量分量值的数组
   * @param {number} [offset=0] - 数组中的偏移量
   * @return {Vector4} 返回此向量的引用
   */
  fromArray(array, offset = 0) {
    this.x = array[offset]; // 从数组中读取 x 分量
    this.y = array[offset + 1]; // 从数组中读取 y 分量
    this.z = array[offset + 2]; // 从数组中读取 z 分量
    this.w = array[offset + 3]; // 从数组中读取 w 分量

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
    array[offset + 3] = this.w; // 将 w 分量写入数组

    return array; // 返回数组
  }

  /**
   * 从给定的缓冲区属性设置此向量的分量。
   *
   * @param {BufferAttribute} attribute - 保存向量数据的缓冲区属性
   * @param {number} index - 属性中的索引
   * @return {Vector4} 返回此向量的引用
   */
  fromBufferAttribute(attribute, index) {
    this.x = attribute.getX(index); // 从缓冲区属性获取 x 分量
    this.y = attribute.getY(index); // 从缓冲区属性获取 y 分量
    this.z = attribute.getZ(index); // 从缓冲区属性获取 z 分量
    this.w = attribute.getW(index); // 从缓冲区属性获取 w 分量

    return this; // 返回自身以支持链式调用
  }

  /**
   * 将此向量的每个分量设置为 0 到 1 之间的伪随机值（不包括 1）。
   *
   * @return {Vector4} 返回此向量的引用
   */
  random() {
    this.x = Math.random(); // 设置 x 分量为随机值
    this.y = Math.random(); // 设置 y 分量为随机值
    this.z = Math.random(); // 设置 z 分量为随机值
    this.w = Math.random(); // 设置 w 分量为随机值

    return this; // 返回自身以支持链式调用
  }

  /**
   * 迭代器方法，允许使用 for...of 循环遍历向量分量。
   */
  *[Symbol.iterator]() {
    yield this.x; // 产出 x 分量
    yield this.y; // 产出 y 分量
    yield this.z; // 产出 z 分量
    yield this.w; // 产出 w 分量
  }
}

// 导出 Vector4 类
export { Vector4 };
