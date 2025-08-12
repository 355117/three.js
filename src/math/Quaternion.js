// 导入数学工具函数
import { clamp } from "./MathUtils.js";

/**
 * 表示四元数的类。四元数在three.js中用于表示旋转
 * Class for representing a Quaternion. Quaternions are used in three.js to represent rotations.
 *
 * 遍历四元数实例将按相应顺序产生其分量`(x, y, z, w)`
 * Iterating through a vector instance will yield its components `(x, y, z, w)` in
 * the corresponding order.
 *
 * 注意：three.js期望四元数是归一化的
 * Note that three.js expects Quaternions to be normalized.
 * ```js
 * const quaternion = new THREE.Quaternion();
 * quaternion.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), Math.PI / 2 );
 *
 * const vector = new THREE.Vector3( 1, 0, 0 );
 * vector.applyQuaternion( quaternion );
 * ```
 */
class Quaternion {
  /**
   * 构造一个新的四元数
   * Constructs a new quaternion.
   *
   * @param {number} [x=0] - 此四元数的x值 The x value of this quaternion.
   * @param {number} [y=0] - 此四元数的y值 The y value of this quaternion.
   * @param {number} [z=0] - 此四元数的z值 The z value of this quaternion.
   * @param {number} [w=1] - 此四元数的w值 The w value of this quaternion.
   */
  constructor(x = 0, y = 0, z = 0, w = 1) {
    /**
     * 此标志可用于类型测试
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isQuaternion = true;

    this._x = x; // 内部x分量
    this._y = y; // 内部y分量
    this._z = z; // 内部z分量
    this._w = w; // 内部w分量
  }

  /**
   * 通过SLERP在两个四元数之间进行插值。此实现假设四元数数据在平面数组中管理
   * Interpolates between two quaternions via SLERP. This implementation assumes the
   * quaternion data are managed  in flat arrays.
   *
   * @param {Array<number>} dst - 目标数组 The destination array.
   * @param {number} dstOffset - 目标数组的偏移量 An offset into the destination array.
   * @param {Array<number>} src0 - 第一个四元数的源数组 The source array of the first quaternion.
   * @param {number} srcOffset0 - 第一个源数组的偏移量 An offset into the first source array.
   * @param {Array<number>} src1 - 第二个四元数的源数组 The source array of the second quaternion.
   * @param {number} srcOffset1 - 第二个源数组的偏移量 An offset into the second source array.
   * @param {number} t - 插值因子，范围`[0,1]` The interpolation factor in the range `[0,1]`.
   * @see {@link Quaternion#slerp}
   */
  static slerpFlat(dst, dstOffset, src0, srcOffset0, src1, srcOffset1, t) {
    // fuzz-free, array-based Quaternion SLERP operation
    // 无模糊、基于数组的四元数SLERP操作

    // 提取第一个四元数的分量
    let x0 = src0[srcOffset0 + 0], // x分量
      y0 = src0[srcOffset0 + 1], // y分量
      z0 = src0[srcOffset0 + 2], // z分量
      w0 = src0[srcOffset0 + 3]; // w分量

    // 提取第二个四元数的分量
    const x1 = src1[srcOffset1 + 0], // x分量
      y1 = src1[srcOffset1 + 1], // y分量
      z1 = src1[srcOffset1 + 2], // z分量
      w1 = src1[srcOffset1 + 3]; // w分量

    if (t === 0) {
      // 如果插值因子为0，直接返回第一个四元数
      dst[dstOffset + 0] = x0;
      dst[dstOffset + 1] = y0;
      dst[dstOffset + 2] = z0;
      dst[dstOffset + 3] = w0;
      return;
    }

    if (t === 1) {
      // 如果插值因子为1，直接返回第二个四元数
      dst[dstOffset + 0] = x1;
      dst[dstOffset + 1] = y1;
      dst[dstOffset + 2] = z1;
      dst[dstOffset + 3] = w1;
      return;
    }

    if (w0 !== w1 || x0 !== x1 || y0 !== y1 || z0 !== z1) {
      // 如果两个四元数不相同，执行SLERP插值
      let s = 1 - t; // 第一个四元数的权重
      const cos = x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1, // 计算点积（余弦值）
        dir = cos >= 0 ? 1 : -1, // 确定方向，选择最短路径
        sqrSin = 1 - cos * cos; // 计算sin²θ

      // Skip the Slerp for tiny steps to avoid numeric problems:
      // 对于微小步长跳过Slerp以避免数值问题
      if (sqrSin > Number.EPSILON) {
        const sin = Math.sqrt(sqrSin), // 计算sinθ
          len = Math.atan2(sin, cos * dir); // 计算角度θ

        // 计算SLERP权重
        s = Math.sin(s * len) / sin; // sin((1-t)θ) / sinθ
        t = Math.sin(t * len) / sin; // sin(tθ) / sinθ
      }

      const tDir = t * dir; // 应用方向

      // 执行插值计算
      x0 = x0 * s + x1 * tDir;
      y0 = y0 * s + y1 * tDir;
      z0 = z0 * s + z1 * tDir;
      w0 = w0 * s + w1 * tDir;

      // Normalize in case we just did a lerp:
      // 如果刚刚执行了线性插值，则进行归一化
      if (s === 1 - t) {
        const f = 1 / Math.sqrt(x0 * x0 + y0 * y0 + z0 * z0 + w0 * w0);

        x0 *= f;
        y0 *= f;
        z0 *= f;
        w0 *= f;
      }
    }

    // 将结果写入目标数组
    dst[dstOffset] = x0;
    dst[dstOffset + 1] = y0;
    dst[dstOffset + 2] = z0;
    dst[dstOffset + 3] = w0;
  }

  /**
   * 将两个四元数相乘。此实现假设四元数数据在平面数组中管理
   * Multiplies two quaternions. This implementation assumes the quaternion data are managed
   * in flat arrays.
   *
   * @param {Array<number>} dst - 目标数组 The destination array.
   * @param {number} dstOffset - 目标数组的偏移量 An offset into the destination array.
   * @param {Array<number>} src0 - 第一个四元数的源数组 The source array of the first quaternion.
   * @param {number} srcOffset0 - 第一个源数组的偏移量 An offset into the first source array.
   * @param {Array<number>} src1 - 第二个四元数的源数组 The source array of the second quaternion.
   * @param {number} srcOffset1 - 第二个源数组的偏移量 An offset into the second source array.
   * @return {Array<number>} 目标数组 The destination array.
   * @see {@link Quaternion#multiplyQuaternions}.
   */
  static multiplyQuaternionsFlat(dst, dstOffset, src0, srcOffset0, src1, srcOffset1) {
    // 提取第一个四元数的分量
    const x0 = src0[srcOffset0]; // x分量
    const y0 = src0[srcOffset0 + 1]; // y分量
    const z0 = src0[srcOffset0 + 2]; // z分量
    const w0 = src0[srcOffset0 + 3]; // w分量

    // 提取第二个四元数的分量
    const x1 = src1[srcOffset1]; // x分量
    const y1 = src1[srcOffset1 + 1]; // y分量
    const z1 = src1[srcOffset1 + 2]; // z分量
    const w1 = src1[srcOffset1 + 3]; // w分量

    // 四元数乘法公式：q1 * q2
    dst[dstOffset] = x0 * w1 + w0 * x1 + y0 * z1 - z0 * y1; // 结果的x分量
    dst[dstOffset + 1] = y0 * w1 + w0 * y1 + z0 * x1 - x0 * z1; // 结果的y分量
    dst[dstOffset + 2] = z0 * w1 + w0 * z1 + x0 * y1 - y0 * x1; // 结果的z分量
    dst[dstOffset + 3] = w0 * w1 - x0 * x1 - y0 * y1 - z0 * z1; // 结果的w分量

    return dst;
  }

  /**
   * 此四元数的x值
   * The x value of this quaternion.
   *
   * @type {number}
   * @default 0
   */
  get x() {
    return this._x;
  }

  set x(value) {
    this._x = value;
    this._onChangeCallback(); // 触发变更回调
  }

  /**
   * 此四元数的y值
   * The y value of this quaternion.
   *
   * @type {number}
   * @default 0
   */
  get y() {
    return this._y;
  }

  set y(value) {
    this._y = value;
    this._onChangeCallback(); // 触发变更回调
  }

  /**
   * 此四元数的z值
   * The z value of this quaternion.
   *
   * @type {number}
   * @default 0
   */
  get z() {
    return this._z;
  }

  set z(value) {
    this._z = value;
    this._onChangeCallback(); // 触发变更回调
  }

  /**
   * 此四元数的w值
   * The w value of this quaternion.
   *
   * @type {number}
   * @default 1
   */
  get w() {
    return this._w;
  }

  set w(value) {
    this._w = value;
    this._onChangeCallback(); // 触发变更回调
  }

  /**
   * 设置四元数分量
   * Sets the quaternion components.
   *
   * @param {number} x - 此四元数的x值 The x value of this quaternion.
   * @param {number} y - 此四元数的y值 The y value of this quaternion.
   * @param {number} z - 此四元数的z值 The z value of this quaternion.
   * @param {number} w - 此四元数的w值 The w value of this quaternion.
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  set(x, y, z, w) {
    this._x = x; // 设置x分量
    this._y = y; // 设置y分量
    this._z = z; // 设置z分量
    this._w = w; // 设置w分量

    this._onChangeCallback(); // 触发变更回调

    return this;
  }

  /**
   * 返回一个从此实例复制值的新四元数
   * Returns a new quaternion with copied values from this instance.
   *
   * @return {Quaternion} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 创建新的四元数实例并复制当前值
    return new this.constructor(this._x, this._y, this._z, this._w);
  }

  /**
   * 将给定四元数的值复制到此实例
   * Copies the values of the given quaternion to this instance.
   *
   * @param {Quaternion} quaternion - 要复制的四元数 The quaternion to copy.
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  copy(quaternion) {
    this._x = quaternion.x; // 复制x分量
    this._y = quaternion.y; // 复制y分量
    this._z = quaternion.z; // 复制z分量
    this._w = quaternion.w; // 复制w分量

    this._onChangeCallback(); // 触发变更回调

    return this;
  }

  /**
   * 从给定欧拉角指定的旋转设置此四元数
   * Sets this quaternion from the rotation specified by the given
   * Euler angles.
   *
   * @param {Euler} euler - 欧拉角对象 The Euler angles.
   * @param {boolean} [update=true] - 是否应执行内部`onChange`回调 Whether the internal `onChange` callback should be executed or not.
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  setFromEuler(euler, update = true) {
    // 提取欧拉角的分量和旋转顺序
    const x = euler._x, // X轴旋转角度
      y = euler._y, // Y轴旋转角度
      z = euler._z, // Z轴旋转角度
      order = euler._order; // 旋转顺序

    // http://www.mathworks.com/matlabcentral/fileexchange/
    // 	20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/
    //	content/SpinCalc.m
    // 参考MATLAB的SpinCalc实现

    const cos = Math.cos; // 余弦函数
    const sin = Math.sin; // 正弦函数

    // 计算半角的余弦值
    const c1 = cos(x / 2); // cos(x/2)
    const c2 = cos(y / 2); // cos(y/2)
    const c3 = cos(z / 2); // cos(z/2)

    // 计算半角的正弦值
    const s1 = sin(x / 2); // sin(x/2)
    const s2 = sin(y / 2); // sin(y/2)
    const s3 = sin(z / 2); // sin(z/2)

    // 根据旋转顺序计算四元数分量
    switch (order) {
      case "XYZ":
        // XYZ旋转顺序：先绕X轴，再绕Y轴，最后绕Z轴
        this._x = s1 * c2 * c3 + c1 * s2 * s3;
        this._y = c1 * s2 * c3 - s1 * c2 * s3;
        this._z = c1 * c2 * s3 + s1 * s2 * c3;
        this._w = c1 * c2 * c3 - s1 * s2 * s3;
        break;

      case "YXZ":
        // YXZ旋转顺序：先绕Y轴，再绕X轴，最后绕Z轴
        this._x = s1 * c2 * c3 + c1 * s2 * s3;
        this._y = c1 * s2 * c3 - s1 * c2 * s3;
        this._z = c1 * c2 * s3 - s1 * s2 * c3;
        this._w = c1 * c2 * c3 + s1 * s2 * s3;
        break;

      case "ZXY":
        // ZXY旋转顺序：先绕Z轴，再绕X轴，最后绕Y轴
        this._x = s1 * c2 * c3 - c1 * s2 * s3;
        this._y = c1 * s2 * c3 + s1 * c2 * s3;
        this._z = c1 * c2 * s3 + s1 * s2 * c3;
        this._w = c1 * c2 * c3 - s1 * s2 * s3;
        break;

      case "ZYX":
        // ZYX旋转顺序：先绕Z轴，再绕Y轴，最后绕X轴
        this._x = s1 * c2 * c3 - c1 * s2 * s3;
        this._y = c1 * s2 * c3 + s1 * c2 * s3;
        this._z = c1 * c2 * s3 - s1 * s2 * c3;
        this._w = c1 * c2 * c3 + s1 * s2 * s3;
        break;

      case "YZX":
        // YZX旋转顺序：先绕Y轴，再绕Z轴，最后绕X轴
        this._x = s1 * c2 * c3 + c1 * s2 * s3;
        this._y = c1 * s2 * c3 + s1 * c2 * s3;
        this._z = c1 * c2 * s3 - s1 * s2 * c3;
        this._w = c1 * c2 * c3 - s1 * s2 * s3;
        break;

      case "XZY":
        // XZY旋转顺序：先绕X轴，再绕Z轴，最后绕Y轴
        this._x = s1 * c2 * c3 - c1 * s2 * s3;
        this._y = c1 * s2 * c3 - s1 * c2 * s3;
        this._z = c1 * c2 * s3 + s1 * s2 * c3;
        this._w = c1 * c2 * c3 + s1 * s2 * s3;
        break;

      default:
        // 未知的旋转顺序，输出警告
        console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: " + order);
    }

    // 如果需要更新，触发变更回调
    if (update === true) this._onChangeCallback();

    return this;
  }

  /**
   * 从给定的轴和角度设置此四元数
   * Sets this quaternion from the given axis and angle.
   *
   * @param {Vector3} axis - 归一化的旋转轴 The normalized axis.
   * @param {number} angle - 旋转角度（弧度） The angle in radians.
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  setFromAxisAngle(axis, angle) {
    // http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm
    // 参考轴角到四元数的转换公式

    const halfAngle = angle / 2, // 半角
      s = Math.sin(halfAngle); // sin(θ/2)

    // 四元数公式：q = [sin(θ/2) * axis, cos(θ/2)]
    this._x = axis.x * s; // x分量 = axis.x * sin(θ/2)
    this._y = axis.y * s; // y分量 = axis.y * sin(θ/2)
    this._z = axis.z * s; // z分量 = axis.z * sin(θ/2)
    this._w = Math.cos(halfAngle); // w分量 = cos(θ/2)

    this._onChangeCallback(); // 触发变更回调

    return this;
  }

  /**
   * 从给定的旋转矩阵设置此四元数
   * Sets this quaternion from the given rotation matrix.
   *
   * @param {Matrix4} m - 4x4矩阵，其中左上角3x3是纯旋转矩阵（即未缩放） A 4x4 matrix of which the upper 3x3 of matrix is a pure rotation matrix (i.e. unscaled).
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  setFromRotationMatrix(m) {
    // http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
    // 参考矩阵到四元数的转换算法

    // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
    // 假设m的左上角3x3是纯旋转矩阵（即未缩放）

    const te = m.elements, // 获取矩阵元素
      // 提取旋转矩阵的元素
      m11 = te[0], // 第1行第1列
      m12 = te[4], // 第1行第2列
      m13 = te[8], // 第1行第3列
      m21 = te[1], // 第2行第1列
      m22 = te[5], // 第2行第2列
      m23 = te[9], // 第2行第3列
      m31 = te[2], // 第3行第1列
      m32 = te[6], // 第3行第2列
      m33 = te[10], // 第3行第3列
      trace = m11 + m22 + m33; // 计算矩阵的迹（对角线元素之和）

    if (trace > 0) {
      // 情况1：迹大于0，使用标准算法
      const s = 0.5 / Math.sqrt(trace + 1.0);

      this._w = 0.25 / s; // w分量
      this._x = (m32 - m23) * s; // x分量
      this._y = (m13 - m31) * s; // y分量
      this._z = (m21 - m12) * s; // z分量
    } else if (m11 > m22 && m11 > m33) {
      // 情况2：m11是最大的对角元素
      const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);

      this._w = (m32 - m23) / s; // w分量
      this._x = 0.25 * s; // x分量
      this._y = (m12 + m21) / s; // y分量
      this._z = (m13 + m31) / s; // z分量
    } else if (m22 > m33) {
      // 情况3：m22是最大的对角元素
      const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);

      this._w = (m13 - m31) / s; // w分量
      this._x = (m12 + m21) / s; // x分量
      this._y = 0.25 * s; // y分量
      this._z = (m23 + m32) / s; // z分量
    } else {
      // 情况4：m33是最大的对角元素
      const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);

      this._w = (m21 - m12) / s; // w分量
      this._x = (m13 + m31) / s; // x分量
      this._y = (m23 + m32) / s; // y分量
      this._z = 0.25 * s; // z分量
    }

    this._onChangeCallback(); // 触发变更回调

    return this;
  }

  /**
   * 将此四元数设置为将方向向量`vFrom`旋转到方向向量`vTo`所需的旋转
   * Sets this quaternion to the rotation required to rotate the direction vector
   * `vFrom` to the direction vector `vTo`.
   *
   * @param {Vector3} vFrom - 第一个（归一化的）方向向量 The first (normalized) direction vector.
   * @param {Vector3} vTo - 第二个（归一化的）方向向量 The second (normalized) direction vector.
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  setFromUnitVectors(vFrom, vTo) {
    // assumes direction vectors vFrom and vTo are normalized
    // 假设方向向量vFrom和vTo已归一化

    let r = vFrom.dot(vTo) + 1; // 计算点积加1

    if (r < 1e-8) {
      // the epsilon value has been discussed in #31286
      // epsilon值在#31286中已讨论

      // vFrom and vTo point in opposite directions
      // vFrom和vTo指向相反方向

      r = 0;

      if (Math.abs(vFrom.x) > Math.abs(vFrom.z)) {
        // 选择与vFrom垂直的轴
        this._x = -vFrom.y;
        this._y = vFrom.x;
        this._z = 0;
        this._w = r;
      } else {
        // 选择与vFrom垂直的轴
        this._x = 0;
        this._y = -vFrom.z;
        this._z = vFrom.y;
        this._w = r;
      }
    } else {
      // crossVectors( vFrom, vTo ); // inlined to avoid cyclic dependency on Vector3
      // 计算叉积以避免对Vector3的循环依赖

      this._x = vFrom.y * vTo.z - vFrom.z * vTo.y; // 叉积的x分量
      this._y = vFrom.z * vTo.x - vFrom.x * vTo.z; // 叉积的y分量
      this._z = vFrom.x * vTo.y - vFrom.y * vTo.x; // 叉积的z分量
      this._w = r; // w分量
    }

    return this.normalize(); // 归一化四元数
  }

  /**
   * 返回此四元数与给定四元数之间的角度（弧度）
   * Returns the angle between this quaternion and the given one in radians.
   *
   * @param {Quaternion} q - 要计算角度的四元数 The quaternion to compute the angle with.
   * @return {number} 角度（弧度） The angle in radians.
   */
  angleTo(q) {
    // 使用四元数点积计算角度：θ = 2 * arccos(|q1·q2|)
    return 2 * Math.acos(Math.abs(clamp(this.dot(q), -1, 1)));
  }

  /**
   * 将此四元数按给定角度步长旋转到给定四元数
   * 该方法确保最终四元数不会超过`q`
   * Rotates this quaternion by a given angular step to the given quaternion.
   * The method ensures that the final quaternion will not overshoot `q`.
   *
   * @param {Quaternion} q - 目标四元数 The target quaternion.
   * @param {number} step - 角度步长（弧度） The angular step in radians.
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  rotateTowards(q, step) {
    const angle = this.angleTo(q); // 计算到目标的角度

    if (angle === 0) return this; // 如果已经相同，直接返回

    const t = Math.min(1, step / angle); // 计算插值参数，确保不超过目标

    this.slerp(q, t); // 执行球面线性插值

    return this;
  }

  /**
   * 将此四元数设置为单位四元数；即表示"无旋转"的四元数
   * Sets this quaternion to the identity quaternion; that is, to the
   * quaternion that represents "no rotation".
   *
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  identity() {
    // 单位四元数：(0, 0, 0, 1)，表示无旋转
    return this.set(0, 0, 0, 1);
  }

  /**
   * 通过{@link Quaternion#conjugate}求此四元数的逆。假设四元数具有单位长度
   * Inverts this quaternion via {@link Quaternion#conjugate}. The
   * quaternion is assumed to have unit length.
   *
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  invert() {
    // 对于单位四元数，逆等于共轭
    return this.conjugate();
  }

  /**
   * 返回此四元数的旋转共轭。四元数的共轭表示绕旋转轴的相反方向的相同旋转
   * Returns the rotational conjugate of this quaternion. The conjugate of a
   * quaternion represents the same rotation in the opposite direction about
   * the rotational axis.
   *
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  conjugate() {
    // 共轭四元数：对虚部取反，实部保持不变
    this._x *= -1; // x分量取反
    this._y *= -1; // y分量取反
    this._z *= -1; // z分量取反
    // w分量保持不变

    this._onChangeCallback(); // 触发变更回调

    return this;
  }

  /**
   * 计算此四元数与给定四元数的点积
   * Calculates the dot product of this quaternion and the given one.
   *
   * @param {Quaternion} v - 要计算点积的四元数 The quaternion to compute the dot product with.
   * @return {number} 点积的结果 The result of the dot product.
   */
  dot(v) {
    // 四元数点积：q1·q2 = x1*x2 + y1*y2 + z1*z2 + w1*w2
    return this._x * v._x + this._y * v._y + this._z * v._z + this._w * v._w;
  }

  /**
   * 计算此四元数的欧几里得长度的平方（直线长度），将其视为4维向量。
   * 如果要比较两个四元数的长度，这很有用，因为这比{@link Quaternion#length}的计算稍微高效一些
   * Computes the squared Euclidean length (straight-line length) of this quaternion,
   * considered as a 4 dimensional vector. This can be useful if you are comparing the
   * lengths of two quaternions, as this is a slightly more efficient calculation than
   * {@link Quaternion#length}.
   *
   * @return {number} 欧几里得长度的平方 The squared Euclidean length.
   */
  lengthSq() {
    // 长度平方：|q|² = x² + y² + z² + w²
    return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;
  }

  /**
   * 计算此四元数的欧几里得长度（直线长度），将其视为4维向量
   * Computes the Euclidean length (straight-line length) of this quaternion,
   * considered as a 4 dimensional vector.
   *
   * @return {number} 欧几里得长度 The Euclidean length.
   */
  length() {
    // 长度：|q| = √(x² + y² + z² + w²)
    return Math.sqrt(this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w);
  }

  /**
   * 归一化此四元数 - 即计算执行与此四元数相同旋转但长度等于`1`的四元数
   * Normalizes this quaternion - that is, calculated the quaternion that performs
   * the same rotation as this one, but has a length equal to `1`.
   *
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  normalize() {
    let l = this.length(); // 计算长度

    if (l === 0) {
      // 如果长度为0，设置为单位四元数
      this._x = 0;
      this._y = 0;
      this._z = 0;
      this._w = 1;
    } else {
      // 归一化：每个分量除以长度
      l = 1 / l; // 计算长度的倒数

      this._x = this._x * l; // 归一化x分量
      this._y = this._y * l; // 归一化y分量
      this._z = this._z * l; // 归一化z分量
      this._w = this._w * l; // 归一化w分量
    }

    this._onChangeCallback(); // 触发变更回调

    return this;
  }

  /**
   * 将此四元数乘以给定的四元数
   * Multiplies this quaternion by the given one.
   *
   * @param {Quaternion} q - 四元数 The quaternion.
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  multiply(q) {
    // 执行 this = this * q
    return this.multiplyQuaternions(this, q);
  }

  /**
   * 将此四元数与给定四元数进行前乘
   * Pre-multiplies this quaternion by the given one.
   *
   * @param {Quaternion} q - 四元数 The quaternion.
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  premultiply(q) {
    // 执行 this = q * this
    return this.multiplyQuaternions(q, this);
  }

  /**
   * 将给定的两个四元数相乘，并将结果存储在此实例中
   * Multiplies the given quaternions and stores the result in this instance.
   *
   * @param {Quaternion} a - 第一个四元数 The first quaternion.
   * @param {Quaternion} b - 第二个四元数 The second quaternion.
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  multiplyQuaternions(a, b) {
    // from http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/code/index.htm
    // 参考四元数乘法的标准实现

    // 提取第一个四元数的分量
    const qax = a._x, // a的x分量
      qay = a._y, // a的y分量
      qaz = a._z, // a的z分量
      qaw = a._w; // a的w分量
    // 提取第二个四元数的分量
    const qbx = b._x, // b的x分量
      qby = b._y, // b的y分量
      qbz = b._z, // b的z分量
      qbw = b._w; // b的w分量

    // 四元数乘法公式：q1 * q2
    this._x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby; // 结果的x分量
    this._y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz; // 结果的y分量
    this._z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx; // 结果的z分量
    this._w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz; // 结果的w分量

    this._onChangeCallback(); // 触发变更回调

    return this;
  }

  /**
   * 在四元数之间执行球面线性插值
   * Performs a spherical linear interpolation between quaternions.
   *
   * @param {Quaternion} qb - 目标四元数 The target quaternion.
   * @param {number} t - 闭区间`[0, 1]`中的插值因子 The interpolation factor in the closed interval `[0, 1]`.
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  slerp(qb, t) {
    if (t === 0) return this; // 如果t为0，返回当前四元数
    if (t === 1) return this.copy(qb); // 如果t为1，返回目标四元数

    // 保存当前四元数的分量
    const x = this._x,
      y = this._y,
      z = this._z,
      w = this._w;

    // http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/slerp/
    // 参考球面线性插值的标准实现

    // 计算两个四元数的点积（半角的余弦值）
    let cosHalfTheta = w * qb._w + x * qb._x + y * qb._y + z * qb._z;

    if (cosHalfTheta < 0) {
      // 如果点积为负，取反目标四元数以选择最短路径
      this._w = -qb._w;
      this._x = -qb._x;
      this._y = -qb._y;
      this._z = -qb._z;

      cosHalfTheta = -cosHalfTheta; // 更新余弦值
    } else {
      // 直接复制目标四元数
      this.copy(qb);
    }

    if (cosHalfTheta >= 1.0) {
      // 如果四元数几乎相同，直接返回原始四元数
      this._w = w;
      this._x = x;
      this._y = y;
      this._z = z;

      return this;
    }

    const sqrSinHalfTheta = 1.0 - cosHalfTheta * cosHalfTheta; // 计算sin²(θ/2)

    if (sqrSinHalfTheta <= Number.EPSILON) {
      // 如果角度很小，使用线性插值避免数值问题
      const s = 1 - t; // 第一个四元数的权重
      this._w = s * w + t * this._w; // 线性插值w分量
      this._x = s * x + t * this._x; // 线性插值x分量
      this._y = s * y + t * this._y; // 线性插值y分量
      this._z = s * z + t * this._z; // 线性插值z分量

      this.normalize(); // normalize calls _onChangeCallback()
      // 归一化并触发回调

      return this;
    }

    // 执行标准的球面线性插值
    const sinHalfTheta = Math.sqrt(sqrSinHalfTheta); // 计算sin(θ/2)
    const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta); // 计算θ/2
    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta, // 第一个四元数的权重
      ratioB = Math.sin(t * halfTheta) / sinHalfTheta; // 第二个四元数的权重

    // 计算插值结果
    this._w = w * ratioA + this._w * ratioB; // 插值w分量
    this._x = x * ratioA + this._x * ratioB; // 插值x分量
    this._y = y * ratioA + this._y * ratioB; // 插值y分量
    this._z = z * ratioA + this._z * ratioB; // 插值z分量

    this._onChangeCallback(); // 触发变更回调

    return this;
  }

  /**
   * 在给定的四元数之间执行球面线性插值，并将结果存储在此四元数中
   * Performs a spherical linear interpolation between the given quaternions
   * and stores the result in this quaternion.
   *
   * @param {Quaternion} qa - 源四元数 The source quaternion.
   * @param {Quaternion} qb - 目标四元数 The target quaternion.
   * @param {number} t - 闭区间`[0, 1]`中的插值因子 The interpolation factor in the closed interval `[0, 1]`.
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  slerpQuaternions(qa, qb, t) {
    // 复制源四元数，然后对目标四元数进行球面线性插值
    return this.copy(qa).slerp(qb, t);
  }

  /**
   * 将此四元数设置为均匀随机的归一化四元数
   * Sets this quaternion to a uniformly random, normalized quaternion.
   *
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  random() {
    // Ken Shoemake
    // Uniform random rotations
    // D. Kirk, editor, Graphics Gems III, pages 124-132. Academic Press, New York, 1992.
    // Ken Shoemake的均匀随机旋转算法

    const theta1 = 2 * Math.PI * Math.random(); // 第一个随机角度
    const theta2 = 2 * Math.PI * Math.random(); // 第二个随机角度

    const x0 = Math.random(); // 随机数[0,1]
    const r1 = Math.sqrt(1 - x0); // 第一个半径
    const r2 = Math.sqrt(x0); // 第二个半径

    // 生成均匀分布的随机四元数
    return this.set(r1 * Math.sin(theta1), r1 * Math.cos(theta1), r2 * Math.sin(theta2), r2 * Math.cos(theta2));
  }

  /**
   * 如果此四元数与给定四元数相等，则返回`true`
   * Returns `true` if this quaternion is equal with the given one.
   *
   * @param {Quaternion} quaternion - 要测试相等性的四元数 The quaternion to test for equality.
   * @return {boolean} 此四元数是否与给定四元数相等 Whether this quaternion is equal with the given one.
   */
  equals(quaternion) {
    // 比较所有四个分量是否相等
    return quaternion._x === this._x && quaternion._y === this._y && quaternion._z === this._z && quaternion._w === this._w;
  }

  /**
   * 从给定数组设置此四元数的分量
   * Sets this quaternion's components from the given array.
   *
   * @param {Array<number>} array - 保存四元数分量值的数组 An array holding the quaternion component values.
   * @param {number} [offset=0] - 数组中的偏移量 The offset into the array.
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  fromArray(array, offset = 0) {
    this._x = array[offset]; // 从数组读取x分量
    this._y = array[offset + 1]; // 从数组读取y分量
    this._z = array[offset + 2]; // 从数组读取z分量
    this._w = array[offset + 3]; // 从数组读取w分量

    this._onChangeCallback(); // 触发变更回调

    return this;
  }

  /**
   * 将此四元数的分量写入给定数组。如果没有提供数组，该方法返回一个新实例
   * Writes the components of this quaternion to the given array. If no array is provided,
   * the method returns a new instance.
   *
   * @param {Array<number>} [array=[]] - 保存四元数分量的目标数组 The target array holding the quaternion components.
   * @param {number} [offset=0] - 数组中第一个元素的索引 Index of the first element in the array.
   * @return {Array<number>} 四元数分量数组 The quaternion components.
   */
  toArray(array = [], offset = 0) {
    array[offset] = this._x; // 写入x分量
    array[offset + 1] = this._y; // 写入y分量
    array[offset + 2] = this._z; // 写入z分量
    array[offset + 3] = this._w; // 写入w分量

    return array;
  }

  /**
   * 从给定的缓冲区属性设置此四元数的分量
   * Sets the components of this quaternion from the given buffer attribute.
   *
   * @param {BufferAttribute} attribute - 保存四元数数据的缓冲区属性 The buffer attribute holding quaternion data.
   * @param {number} index - 属性中的索引 The index into the attribute.
   * @return {Quaternion} 此四元数的引用 A reference to this quaternion.
   */
  fromBufferAttribute(attribute, index) {
    this._x = attribute.getX(index); // 从缓冲区获取x分量
    this._y = attribute.getY(index); // 从缓冲区获取y分量
    this._z = attribute.getZ(index); // 从缓冲区获取z分量
    this._w = attribute.getW(index); // 从缓冲区获取w分量

    this._onChangeCallback(); // 触发变更回调

    return this;
  }

  /**
   * 此方法定义此类的序列化结果。以`[x, y, z, w]`格式的数组返回此四元数的数值元素
   * This methods defines the serialization result of this class. Returns the
   * numerical elements of this quaternion in an array of format `[x, y, z, w]`.
   *
   * @return {Array<number>} 序列化的四元数 The serialized quaternion.
   */
  toJSON() {
    // 返回四元数的数组表示，用于JSON序列化
    return this.toArray();
  }

  // 设置变更回调函数
  _onChange(callback) {
    this._onChangeCallback = callback; // 设置当四元数发生变化时要调用的回调函数

    return this;
  }

  // 内部变更回调函数（空实现，可被子类重写）
  _onChangeCallback() {}

  // 迭代器实现，允许解构和for...of循环
  *[Symbol.iterator]() {
    yield this._x; // 产出x分量
    yield this._y; // 产出y分量
    yield this._z; // 产出z分量
    yield this._w; // 产出w分量
  }
}

// 导出Quaternion类
export { Quaternion };
