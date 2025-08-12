// 导入坐标系统常量和Vector3类
import { WebGLCoordinateSystem, WebGPUCoordinateSystem } from "../constants.js";
import { Vector3 } from "./Vector3.js";

/**
 * 表示一个4x4矩阵
 * Represents a 4x4 matrix.
 *
 * 4x4矩阵在3D计算机图形学中最常见的用途是作为变换矩阵。
 * 有关WebGL中使用的变换矩阵的介绍，请查看此教程。
 * The most common use of a 4x4 matrix in 3D computer graphics is as a transformation matrix.
 * For an introduction to transformation matrices as used in WebGL, check out [this tutorial]{@link https://www.opengl-tutorial.org/beginners-tutorials/tutorial-3-matrices}
 *
 * 这允许表示3D空间中点的3D向量通过与矩阵相乘来进行变换，
 * 如平移、旋转、剪切、缩放、反射、正交或透视投影等。
 * 这被称为将矩阵"应用"到向量上。
 * This allows a 3D vector representing a point in 3D space to undergo
 * transformations such as translation, rotation, shear, scale, reflection,
 * orthogonal or perspective projection and so on, by being multiplied by the
 * matrix. This is known as `applying` the matrix to the vector.
 *
 * 关于行主序和列主序的说明：
 * A Note on Row-Major and Column-Major Ordering:
 *
 * 构造函数和{@link Matrix4#set}方法接受行主序参数，
 * 但内部存储在{@link Matrix4#elements}数组中时使用列主序。
 * The constructor and {@link Matrix4#set} method take arguments in
 * [row-major]{@link https://en.wikipedia.org/wiki/Row-_and_column-major_order#Column-major_order}
 * order, while internally they are stored in the {@link Matrix4#elements} array in column-major order.
 * 这意味着调用：
 * This means that calling:
 * ```js
 * const m = new THREE.Matrix4();
 * m.set( 11, 12, 13, 14,
 *        21, 22, 23, 24,
 *        31, 32, 33, 34,
 *        41, 42, 43, 44 );
 * ```
 * 将导致elements数组包含：
 * will result in the elements array containing:
 * ```js
 * m.elements = [ 11, 21, 31, 41,
 *                12, 22, 32, 42,
 *                13, 23, 33, 43,
 *                14, 24, 34, 44 ];
 * ```
 * 内部所有计算都使用列主序进行。
 * 然而，由于实际顺序在数学上没有区别，且大多数人习惯于行主序思考矩阵，
 * three.js文档以行主序显示矩阵。请注意，如果您阅读源代码，
 * 需要对此处概述的任何矩阵进行转置以理解计算。
 * and internally all calculations are performed using column-major ordering.
 * However, as the actual ordering makes no difference mathematically and
 * most people are used to thinking about matrices in row-major order, the
 * three.js documentation shows matrices in row-major order. Just bear in
 * mind that if you are reading the source code, you'll have to take the
 * transpose of any matrices outlined here to make sense of the calculations.
 */
class Matrix4 {
  /**
   * 构造一个新的4x4矩阵。参数应该按行主序提供。
   * 如果没有提供参数，构造函数将矩阵初始化为单位矩阵。
   * Constructs a new 4x4 matrix. The arguments are supposed to be
   * in row-major order. If no arguments are provided, the constructor
   * initializes the matrix as an identity matrix.
   *
   * @param {number} [n11] - 第1行第1列矩阵元素 1-1 matrix element.
   * @param {number} [n12] - 第1行第2列矩阵元素 1-2 matrix element.
   * @param {number} [n13] - 第1行第3列矩阵元素 1-3 matrix element.
   * @param {number} [n14] - 第1行第4列矩阵元素 1-4 matrix element.
   * @param {number} [n21] - 第2行第1列矩阵元素 2-1 matrix element.
   * @param {number} [n22] - 第2行第2列矩阵元素 2-2 matrix element.
   * @param {number} [n23] - 第2行第3列矩阵元素 2-3 matrix element.
   * @param {number} [n24] - 第2行第4列矩阵元素 2-4 matrix element.
   * @param {number} [n31] - 第3行第1列矩阵元素 3-1 matrix element.
   * @param {number} [n32] - 第3行第2列矩阵元素 3-2 matrix element.
   * @param {number} [n33] - 第3行第3列矩阵元素 3-3 matrix element.
   * @param {number} [n34] - 第3行第4列矩阵元素 3-4 matrix element.
   * @param {number} [n41] - 第4行第1列矩阵元素 4-1 matrix element.
   * @param {number} [n42] - 第4行第2列矩阵元素 4-2 matrix element.
   * @param {number} [n43] - 第4行第3列矩阵元素 4-3 matrix element.
   * @param {number} [n44] - 第4行第4列矩阵元素 4-4 matrix element.
   */
  constructor(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
    /**
     * 此标志可用于类型测试
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    Matrix4.prototype.isMatrix4 = true;

    /**
     * 列主序的矩阵值列表
     * A column-major list of matrix values.
     *
     * @type {Array<number>}
     */
    this.elements = [
      // 第一列：[1, 0, 0, 0]
      1, 0, 0, 0,
      // 第二列：[0, 1, 0, 0]
      0, 1, 0, 0,
      // 第三列：[0, 0, 1, 0]
      0, 0, 1, 0,
      // 第四列：[0, 0, 0, 1]
      0, 0, 0, 1,
    ];

    if (n11 !== undefined) {
      // 如果提供了参数

      this.set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44); // 设置矩阵元素
    }
  }

  /**
   * 设置矩阵的元素。参数应该按行主序提供。
   * Sets the elements of the matrix.The arguments are supposed to be
   * in row-major order.
   *
   * @param {number} [n11] - 第1行第1列矩阵元素 1-1 matrix element.
   * @param {number} [n12] - 第1行第2列矩阵元素 1-2 matrix element.
   * @param {number} [n13] - 第1行第3列矩阵元素 1-3 matrix element.
   * @param {number} [n14] - 第1行第4列矩阵元素 1-4 matrix element.
   * @param {number} [n21] - 第2行第1列矩阵元素 2-1 matrix element.
   * @param {number} [n22] - 第2行第2列矩阵元素 2-2 matrix element.
   * @param {number} [n23] - 第2行第3列矩阵元素 2-3 matrix element.
   * @param {number} [n24] - 第2行第4列矩阵元素 2-4 matrix element.
   * @param {number} [n31] - 第3行第1列矩阵元素 3-1 matrix element.
   * @param {number} [n32] - 第3行第2列矩阵元素 3-2 matrix element.
   * @param {number} [n33] - 第3行第3列矩阵元素 3-3 matrix element.
   * @param {number} [n34] - 第3行第4列矩阵元素 3-4 matrix element.
   * @param {number} [n41] - 第4行第1列矩阵元素 4-1 matrix element.
   * @param {number} [n42] - 第4行第2列矩阵元素 4-2 matrix element.
   * @param {number} [n43] - 第4行第3列矩阵元素 4-3 matrix element.
   * @param {number} [n44] - 第4行第4列矩阵元素 4-4 matrix element.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
    const te = this.elements; // 获取元素数组引用

    // 按列主序存储矩阵元素
    te[0] = n11;
    te[4] = n12;
    te[8] = n13;
    te[12] = n14; // 第一行
    te[1] = n21;
    te[5] = n22;
    te[9] = n23;
    te[13] = n24; // 第二行
    te[2] = n31;
    te[6] = n32;
    te[10] = n33;
    te[14] = n34; // 第三行
    te[3] = n41;
    te[7] = n42;
    te[11] = n43;
    te[15] = n44; // 第四行

    return this;
  }

  /**
   * 将此矩阵设置为4x4单位矩阵
   * Sets this matrix to the 4x4 identity matrix.
   *
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  identity() {
    // 设置为单位矩阵：对角线为1，其他为0
    this.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);

    return this;
  }

  /**
   * 返回此实例值的副本矩阵
   * Returns a matrix with copied values from this instance.
   *
   * @return {Matrix4} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 创建新的Matrix4实例并从当前矩阵的元素数组复制值
    return new Matrix4().fromArray(this.elements);
  }

  /**
   * 将给定矩阵的值复制到此实例
   * Copies the values of the given matrix to this instance.
   *
   * @param {Matrix4} m - 要复制的矩阵 The matrix to copy.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  copy(m) {
    const te = this.elements; // 此矩阵的元素数组
    const me = m.elements; // 源矩阵的元素数组

    // 逐个复制所有16个元素
    te[0] = me[0];
    te[1] = me[1];
    te[2] = me[2];
    te[3] = me[3]; // 第一列
    te[4] = me[4];
    te[5] = me[5];
    te[6] = me[6];
    te[7] = me[7]; // 第二列
    te[8] = me[8];
    te[9] = me[9];
    te[10] = me[10];
    te[11] = me[11]; // 第三列
    te[12] = me[12];
    te[13] = me[13];
    te[14] = me[14];
    te[15] = me[15]; // 第四列

    return this;
  }

  /**
   * 将给定矩阵的平移分量复制到此矩阵的平移分量
   * Copies the translation component of the given matrix
   * into this matrix's translation component.
   *
   * @param {Matrix4} m - 要复制平移分量的矩阵 The matrix to copy the translation component.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  copyPosition(m) {
    const te = this.elements, // 此矩阵的元素数组
      me = m.elements; // 源矩阵的元素数组

    // 复制平移分量（第四列的前三个元素）
    te[12] = me[12]; // X轴平移
    te[13] = me[13]; // Y轴平移
    te[14] = me[14]; // Z轴平移

    return this;
  }

  /**
   * 将此矩阵的左上角3x3元素设置为给定3x3矩阵的值
   * Set the upper 3x3 elements of this matrix to the values of given 3x3 matrix.
   *
   * @param {Matrix3} m - 3x3矩阵 The 3x3 matrix.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  setFromMatrix3(m) {
    const me = m.elements; // 获取3x3矩阵的元素

    // 设置4x4矩阵，左上角3x3来自输入矩阵，第四行第四列为单位矩阵形式
    this.set(me[0], me[3], me[6], 0, me[1], me[4], me[7], 0, me[2], me[5], me[8], 0, 0, 0, 0, 1);

    return this;
  }

  /**
   * 从此矩阵中提取基向量到提供的三个轴向量中
   * Extracts the basis of this matrix into the three axis vectors provided.
   *
   * @param {Vector3} xAxis - 基向量的X轴 The basis's x axis.
   * @param {Vector3} yAxis - 基向量的Y轴 The basis's y axis.
   * @param {Vector3} zAxis - 基向量的Z轴 The basis's z axis.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  extractBasis(xAxis, yAxis, zAxis) {
    // 从矩阵的第0列提取X轴基向量
    xAxis.setFromMatrixColumn(this, 0);
    // 从矩阵的第1列提取Y轴基向量
    yAxis.setFromMatrixColumn(this, 1);
    // 从矩阵的第2列提取Z轴基向量
    zAxis.setFromMatrixColumn(this, 2);

    return this;
  }

  /**
   * 将给定的基向量设置到此矩阵中
   * Sets the given basis vectors to this matrix.
   *
   * @param {Vector3} xAxis - 基向量的X轴 The basis's x axis.
   * @param {Vector3} yAxis - 基向量的Y轴 The basis's y axis.
   * @param {Vector3} zAxis - 基向量的Z轴 The basis's z axis.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  makeBasis(xAxis, yAxis, zAxis) {
    // 设置矩阵，将三个基向量作为矩阵的前三列，第四列为[0,0,0,1]
    this.set(xAxis.x, yAxis.x, zAxis.x, 0, xAxis.y, yAxis.y, zAxis.y, 0, xAxis.z, yAxis.z, zAxis.z, 0, 0, 0, 0, 1);

    return this;
  }

  /**
   * 从给定矩阵中提取旋转分量到此矩阵的旋转分量中
   * Extracts the rotation component of the given matrix
   * into this matrix's rotation component.
   *
   * 注意：此方法不支持反射矩阵
   * Note: This method does not support reflection matrices.
   *
   * @param {Matrix4} m - 源矩阵 The matrix.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  extractRotation(m) {
    const te = this.elements; // 此矩阵的元素数组
    const me = m.elements; // 源矩阵的元素数组

    // 计算各轴的缩放因子的倒数，用于归一化旋转分量
    const scaleX = 1 / _v1.setFromMatrixColumn(m, 0).length(); // X轴缩放倒数
    const scaleY = 1 / _v1.setFromMatrixColumn(m, 1).length(); // Y轴缩放倒数
    const scaleZ = 1 / _v1.setFromMatrixColumn(m, 2).length(); // Z轴缩放倒数

    // 提取并归一化X轴旋转分量
    te[0] = me[0] * scaleX;
    te[1] = me[1] * scaleX;
    te[2] = me[2] * scaleX;
    te[3] = 0;

    // 提取并归一化Y轴旋转分量
    te[4] = me[4] * scaleY;
    te[5] = me[5] * scaleY;
    te[6] = me[6] * scaleY;
    te[7] = 0;

    // 提取并归一化Z轴旋转分量
    te[8] = me[8] * scaleZ;
    te[9] = me[9] * scaleZ;
    te[10] = me[10] * scaleZ;
    te[11] = 0;

    // 设置平移分量为0，第四行为单位矩阵形式
    te[12] = 0;
    te[13] = 0;
    te[14] = 0;
    te[15] = 1;

    return this;
  }

  /**
   * 将此矩阵的旋转分量（左上角3x3矩阵）设置为由给定欧拉角指定的旋转
   * 矩阵的其余部分设置为单位矩阵。根据{@link Euler#order}的不同，
   * 有六种可能的结果。完整列表请参见[此页面]{@link https://en.wikipedia.org/wiki/Euler_angles#Rotation_matrix}
   * Sets the rotation component (the upper left 3x3 matrix) of this matrix to
   * the rotation specified by the given Euler angles. The rest of
   * the matrix is set to the identity. Depending on the {@link Euler#order},
   * there are six possible outcomes. See [this page]{@link https://en.wikipedia.org/wiki/Euler_angles#Rotation_matrix}
   * for a complete list.
   *
   * @param {Euler} euler - 欧拉角对象 The Euler angles.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  makeRotationFromEuler(euler) {
    const te = this.elements; // 获取矩阵元素数组

    // 提取欧拉角的三个分量
    const x = euler.x, // X轴旋转角度
      y = euler.y, // Y轴旋转角度
      z = euler.z; // Z轴旋转角度
    // 预计算三角函数值以提高性能
    const a = Math.cos(x), // cos(x)
      b = Math.sin(x); // sin(x)
    const c = Math.cos(y), // cos(y)
      d = Math.sin(y); // sin(y)
    const e = Math.cos(z), // cos(z)
      f = Math.sin(z); // sin(z)

    // 根据欧拉角的旋转顺序计算旋转矩阵
    if (euler.order === "XYZ") {
      // XYZ旋转顺序：先绕X轴，再绕Y轴，最后绕Z轴
      const ae = a * e, // cos(x) * cos(z)
        af = a * f, // cos(x) * sin(z)
        be = b * e, // sin(x) * cos(z)
        bf = b * f; // sin(x) * sin(z)

      // 设置旋转矩阵的第一行
      te[0] = c * e; // cos(y) * cos(z)
      te[4] = -c * f; // -cos(y) * sin(z)
      te[8] = d; // sin(y)

      // 设置旋转矩阵的第二行
      te[1] = af + be * d; // cos(x)*sin(z) + sin(x)*cos(z)*sin(y)
      te[5] = ae - bf * d; // cos(x)*cos(z) - sin(x)*sin(z)*sin(y)
      te[9] = -b * c; // -sin(x) * cos(y)

      // 设置旋转矩阵的第三行
      te[2] = bf - ae * d; // sin(x)*sin(z) - cos(x)*cos(z)*sin(y)
      te[6] = be + af * d; // sin(x)*cos(z) + cos(x)*sin(z)*sin(y)
      te[10] = a * c; // cos(x) * cos(y)
    } else if (euler.order === "YXZ") {
      // YXZ旋转顺序：先绕Y轴，再绕X轴，最后绕Z轴
      const ce = c * e, // cos(y) * cos(z)
        cf = c * f, // cos(y) * sin(z)
        de = d * e, // sin(y) * cos(z)
        df = d * f; // sin(y) * sin(z)

      // 设置旋转矩阵的第一行
      te[0] = ce + df * b; // cos(y)*cos(z) + sin(y)*sin(z)*sin(x)
      te[4] = de * b - cf; // sin(y)*cos(z)*sin(x) - cos(y)*sin(z)
      te[8] = a * d; // cos(x) * sin(y)

      // 设置旋转矩阵的第二行
      te[1] = a * f; // cos(x) * sin(z)
      te[5] = a * e; // cos(x) * cos(z)
      te[9] = -b; // -sin(x)

      // 设置旋转矩阵的第三行
      te[2] = cf * b - de; // cos(y)*sin(z)*sin(x) - sin(y)*cos(z)
      te[6] = df + ce * b; // sin(y)*sin(z) + cos(y)*cos(z)*sin(x)
      te[10] = a * c; // cos(x) * cos(y)
    } else if (euler.order === "ZXY") {
      // ZXY旋转顺序：先绕Z轴，再绕X轴，最后绕Y轴
      const ce = c * e, // cos(y) * cos(z)
        cf = c * f, // cos(y) * sin(z)
        de = d * e, // sin(y) * cos(z)
        df = d * f; // sin(y) * sin(z)

      // 设置旋转矩阵的第一行
      te[0] = ce - df * b; // cos(y)*cos(z) - sin(y)*sin(z)*sin(x)
      te[4] = -a * f; // -cos(x) * sin(z)
      te[8] = de + cf * b; // sin(y)*cos(z) + cos(y)*sin(z)*sin(x)

      // 设置旋转矩阵的第二行
      te[1] = cf + de * b; // cos(y)*sin(z) + sin(y)*cos(z)*sin(x)
      te[5] = a * e; // cos(x) * cos(z)
      te[9] = df - ce * b; // sin(y)*sin(z) - cos(y)*cos(z)*sin(x)

      // 设置旋转矩阵的第三行
      te[2] = -a * d; // -cos(x) * sin(y)
      te[6] = b; // sin(x)
      te[10] = a * c; // cos(x) * cos(y)
    } else if (euler.order === "ZYX") {
      // ZYX旋转顺序：先绕Z轴，再绕Y轴，最后绕X轴
      const ae = a * e, // cos(x) * cos(z)
        af = a * f, // cos(x) * sin(z)
        be = b * e, // sin(x) * cos(z)
        bf = b * f; // sin(x) * sin(z)

      // 设置旋转矩阵的第一行
      te[0] = c * e; // cos(y) * cos(z)
      te[4] = be * d - af; // sin(x)*cos(z)*sin(y) - cos(x)*sin(z)
      te[8] = ae * d + bf; // cos(x)*cos(z)*sin(y) + sin(x)*sin(z)

      // 设置旋转矩阵的第二行
      te[1] = c * f; // cos(y) * sin(z)
      te[5] = bf * d + ae; // sin(x)*sin(z)*sin(y) + cos(x)*cos(z)
      te[9] = af * d - be; // cos(x)*sin(z)*sin(y) - sin(x)*cos(z)

      // 设置旋转矩阵的第三行
      te[2] = -d; // -sin(y)
      te[6] = b * c; // sin(x) * cos(y)
      te[10] = a * c; // cos(x) * cos(y)
    } else if (euler.order === "YZX") {
      // YZX旋转顺序：先绕Y轴，再绕Z轴，最后绕X轴
      const ac = a * c, // cos(x) * cos(y)
        ad = a * d, // cos(x) * sin(y)
        bc = b * c, // sin(x) * cos(y)
        bd = b * d; // sin(x) * sin(y)

      // 设置旋转矩阵的第一行
      te[0] = c * e; // cos(y) * cos(z)
      te[4] = bd - ac * f; // sin(x)*sin(y) - cos(x)*cos(y)*sin(z)
      te[8] = bc * f + ad; // sin(x)*cos(y)*sin(z) + cos(x)*sin(y)

      // 设置旋转矩阵的第二行
      te[1] = f; // sin(z)
      te[5] = a * e; // cos(x) * cos(z)
      te[9] = -b * e; // -sin(x) * cos(z)

      // 设置旋转矩阵的第三行
      te[2] = -d * e; // -sin(y) * cos(z)
      te[6] = ad * f + bc; // cos(x)*sin(y)*sin(z) + sin(x)*cos(y)
      te[10] = ac - bd * f; // cos(x)*cos(y) - sin(x)*sin(y)*sin(z)
    } else if (euler.order === "XZY") {
      // XZY旋转顺序：先绕X轴，再绕Z轴，最后绕Y轴
      const ac = a * c, // cos(x) * cos(y)
        ad = a * d, // cos(x) * sin(y)
        bc = b * c, // sin(x) * cos(y)
        bd = b * d; // sin(x) * sin(y)

      // 设置旋转矩阵的第一行
      te[0] = c * e; // cos(y) * cos(z)
      te[4] = -f; // -sin(z)
      te[8] = d * e; // sin(y) * cos(z)

      // 设置旋转矩阵的第二行
      te[1] = ac * f + bd; // cos(x)*cos(y)*sin(z) + sin(x)*sin(y)
      te[5] = a * e; // cos(x) * cos(z)
      te[9] = ad * f - bc; // cos(x)*sin(y)*sin(z) - sin(x)*cos(y)

      // 设置旋转矩阵的第三行
      te[2] = bc * f - ad; // sin(x)*cos(y)*sin(z) - cos(x)*sin(y)
      te[6] = b * e; // sin(x) * cos(z)
      te[10] = bd * f + ac; // sin(x)*sin(y)*sin(z) + cos(x)*cos(y)
    }

    // 设置矩阵的底行（第四行）
    te[3] = 0;
    te[7] = 0;
    te[11] = 0;

    // 设置矩阵的最后一列（第四列）
    te[12] = 0;
    te[13] = 0;
    te[14] = 0;
    te[15] = 1;

    return this;
  }

  /**
   * 将此矩阵的旋转分量设置为由给定四元数指定的旋转
   * 如[此处]{@link https://en.wikipedia.org/wiki/Rotation_matrix#Quaternion}所述
   * 矩阵的其余部分设置为单位矩阵
   * Sets the rotation component of this matrix to the rotation specified by
   * the given Quaternion as outlined [here]{@link https://en.wikipedia.org/wiki/Rotation_matrix#Quaternion}
   * The rest of the matrix is set to the identity.
   *
   * @param {Quaternion} q - 四元数对象 The Quaternion.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  makeRotationFromQuaternion(q) {
    // 使用compose方法，位置为零向量，旋转为给定四元数，缩放为单位向量
    return this.compose(_zero, q, _one);
  }

  /**
   * 设置变换矩阵的旋转分量，从`eye`位置看向`target`位置，
   * 并由up方向定向
   * Sets the rotation component of the transformation matrix, looking from `eye` towards
   * `target`, and oriented by the up-direction.
   *
   * @param {Vector3} eye - 观察者位置向量 The eye vector.
   * @param {Vector3} target - 目标位置向量 The target vector.
   * @param {Vector3} up - 上方向向量 The up vector.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  lookAt(eye, target, up) {
    const te = this.elements; // 获取矩阵元素数组

    // 计算Z轴方向（从目标指向观察者）
    _z.subVectors(eye, target);

    if (_z.lengthSq() === 0) {
      // 如果观察者和目标在同一位置
      // eye and target are in the same position

      _z.z = 1; // 设置默认的Z轴方向
    }

    _z.normalize(); // 归一化Z轴向量
    // 计算X轴方向（up向量与Z轴的叉积）
    _x.crossVectors(up, _z);

    if (_x.lengthSq() === 0) {
      // 如果up向量与Z轴平行
      // up and z are parallel

      if (Math.abs(up.z) === 1) {
        _z.x += 0.0001; // 微调Z轴的X分量
      } else {
        _z.z += 0.0001; // 微调Z轴的Z分量
      }

      _z.normalize(); // 重新归一化Z轴
      _x.crossVectors(up, _z); // 重新计算X轴
    }

    _x.normalize(); // 归一化X轴向量
    // 计算Y轴方向（Z轴与X轴的叉积）
    _y.crossVectors(_z, _x);

    // 将计算出的基向量设置到矩阵中
    te[0] = _x.x; // X轴的X分量
    te[4] = _y.x; // Y轴的X分量
    te[8] = _z.x; // Z轴的X分量
    te[1] = _x.y; // X轴的Y分量
    te[5] = _y.y; // Y轴的Y分量
    te[9] = _z.y; // Z轴的Y分量
    te[2] = _x.z; // X轴的Z分量
    te[6] = _y.z; // Y轴的Z分量
    te[10] = _z.z; // Z轴的Z分量

    return this;
  }

  /**
   * 将此矩阵与给定的4x4矩阵进行后乘
   * Post-multiplies this matrix by the given 4x4 matrix.
   *
   * @param {Matrix4} m - 要相乘的矩阵 The matrix to multiply with.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  multiply(m) {
    // 执行 this = this * m
    return this.multiplyMatrices(this, m);
  }

  /**
   * 将此矩阵与给定的4x4矩阵进行前乘
   * Pre-multiplies this matrix by the given 4x4 matrix.
   *
   * @param {Matrix4} m - 要相乘的矩阵 The matrix to multiply with.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  premultiply(m) {
    // 执行 this = m * this
    return this.multiplyMatrices(m, this);
  }

  /**
   * 将给定的两个4x4矩阵相乘，并将结果存储在此矩阵中
   * Multiples the given 4x4 matrices and stores the result
   * in this matrix.
   *
   * @param {Matrix4} a - 第一个矩阵 The first matrix.
   * @param {Matrix4} b - 第二个矩阵 The second matrix.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  multiplyMatrices(a, b) {
    const ae = a.elements; // 第一个矩阵的元素数组
    const be = b.elements; // 第二个矩阵的元素数组
    const te = this.elements; // 结果矩阵的元素数组

    // 提取矩阵a的元素（按行主序命名）
    const a11 = ae[0], // 第1行第1列
      a12 = ae[4], // 第1行第2列
      a13 = ae[8], // 第1行第3列
      a14 = ae[12]; // 第1行第4列
    const a21 = ae[1], // 第2行第1列
      a22 = ae[5], // 第2行第2列
      a23 = ae[9], // 第2行第3列
      a24 = ae[13]; // 第2行第4列
    const a31 = ae[2], // 第3行第1列
      a32 = ae[6], // 第3行第2列
      a33 = ae[10], // 第3行第3列
      a34 = ae[14]; // 第3行第4列
    const a41 = ae[3], // 第4行第1列
      a42 = ae[7], // 第4行第2列
      a43 = ae[11], // 第4行第3列
      a44 = ae[15]; // 第4行第4列

    // 提取矩阵b的元素（按行主序命名）
    const b11 = be[0], // 第1行第1列
      b12 = be[4], // 第1行第2列
      b13 = be[8], // 第1行第3列
      b14 = be[12]; // 第1行第4列
    const b21 = be[1], // 第2行第1列
      b22 = be[5], // 第2行第2列
      b23 = be[9], // 第2行第3列
      b24 = be[13]; // 第2行第4列
    const b31 = be[2], // 第3行第1列
      b32 = be[6], // 第3行第2列
      b33 = be[10], // 第3行第3列
      b34 = be[14]; // 第3行第4列
    const b41 = be[3], // 第4行第1列
      b42 = be[7], // 第4行第2列
      b43 = be[11], // 第4行第3列
      b44 = be[15]; // 第4行第4列

    // 计算结果矩阵的第一行
    te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41; // 结果[1,1]
    te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42; // 结果[1,2]
    te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43; // 结果[1,3]
    te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44; // 结果[1,4]

    // 计算结果矩阵的第二行
    te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41; // 结果[2,1]
    te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42; // 结果[2,2]
    te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43; // 结果[2,3]
    te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44; // 结果[2,4]

    // 计算结果矩阵的第三行
    te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41; // 结果[3,1]
    te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42; // 结果[3,2]
    te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43; // 结果[3,3]
    te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44; // 结果[3,4]

    // 计算结果矩阵的第四行
    te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41; // 结果[4,1]
    te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42; // 结果[4,2]
    te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43; // 结果[4,3]
    te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44; // 结果[4,4]

    return this;
  }

  /**
   * 将矩阵的每个分量都乘以给定的标量
   * Multiplies every component of the matrix by the given scalar.
   *
   * @param {number} s - 标量值 The scalar.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  multiplyScalar(s) {
    const te = this.elements; // 获取矩阵元素数组

    // 将矩阵的每个元素都乘以标量s
    te[0] *= s; // 第1列第1行
    te[4] *= s; // 第2列第1行
    te[8] *= s; // 第3列第1行
    te[12] *= s; // 第4列第1行
    te[1] *= s; // 第1列第2行
    te[5] *= s; // 第2列第2行
    te[9] *= s; // 第3列第2行
    te[13] *= s; // 第4列第2行
    te[2] *= s; // 第1列第3行
    te[6] *= s; // 第2列第3行
    te[10] *= s; // 第3列第3行
    te[14] *= s; // 第4列第3行
    te[3] *= s; // 第1列第4行
    te[7] *= s; // 第2列第4行
    te[11] *= s; // 第3列第4行
    te[15] *= s; // 第4列第4行

    return this;
  }

  /**
   * 计算并返回此矩阵的行列式
   * Computes and returns the determinant of this matrix.
   *
   * 基于[此处]{@link http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.html}概述的方法
   * Based on the method outlined [here]{@link http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.html}.
   *
   * @return {number} 行列式的值 The determinant.
   */
  determinant() {
    const te = this.elements; // 获取矩阵元素数组

    // 提取矩阵元素（按行主序命名）
    const n11 = te[0], // 第1行第1列
      n12 = te[4], // 第1行第2列
      n13 = te[8], // 第1行第3列
      n14 = te[12]; // 第1行第4列
    const n21 = te[1], // 第2行第1列
      n22 = te[5], // 第2行第2列
      n23 = te[9], // 第2行第3列
      n24 = te[13]; // 第2行第4列
    const n31 = te[2], // 第3行第1列
      n32 = te[6], // 第3行第2列
      n33 = te[10], // 第3行第3列
      n34 = te[14]; // 第3行第4列
    const n41 = te[3], // 第4行第1列
      n42 = te[7], // 第4行第2列
      n43 = te[11], // 第4行第3列
      n44 = te[15]; // 第4行第4列

    //TODO: make this more efficient
    // 使用拉普拉斯展开计算4x4矩阵的行列式

    return (
      n41 * (+n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34) +
      n42 * (+n11 * n23 * n34 - n11 * n24 * n33 + n14 * n21 * n33 - n13 * n21 * n34 + n13 * n24 * n31 - n14 * n23 * n31) +
      n43 * (+n11 * n24 * n32 - n11 * n22 * n34 - n14 * n21 * n32 + n12 * n21 * n34 + n14 * n22 * n31 - n12 * n24 * n31) +
      n44 * (-n13 * n22 * n31 - n11 * n23 * n32 + n11 * n22 * n33 + n13 * n21 * n32 - n12 * n21 * n33 + n12 * n23 * n31)
    );
  }

  /**
   * 就地转置此矩阵（行列互换）
   * Transposes this matrix in place.
   *
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  transpose() {
    const te = this.elements; // 获取矩阵元素数组
    let tmp; // 临时变量用于交换

    // 交换对称位置的元素来实现转置
    // 交换 [0,1] 和 [1,0] 位置的元素
    tmp = te[1];
    te[1] = te[4];
    te[4] = tmp;
    // 交换 [0,2] 和 [2,0] 位置的元素
    tmp = te[2];
    te[2] = te[8];
    te[8] = tmp;
    // 交换 [1,2] 和 [2,1] 位置的元素
    tmp = te[6];
    te[6] = te[9];
    te[9] = tmp;

    // 交换 [0,3] 和 [3,0] 位置的元素
    tmp = te[3];
    te[3] = te[12];
    te[12] = tmp;
    // 交换 [1,3] 和 [3,1] 位置的元素
    tmp = te[7];
    te[7] = te[13];
    te[13] = tmp;
    // 交换 [2,3] 和 [3,2] 位置的元素
    tmp = te[11];
    te[11] = te[14];
    te[14] = tmp;

    return this;
  }

  /**
   * 从给定向量设置此矩阵的位置分量，不影响矩阵的其余部分
   * Sets the position component for this matrix from the given vector,
   * without affecting the rest of the matrix.
   *
   * @param {number|Vector3} x - 向量的X分量或向量对象 The x component of the vector or alternatively the vector object.
   * @param {number} y - 向量的Y分量 The y component of the vector.
   * @param {number} z - 向量的Z分量 The z component of the vector.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  setPosition(x, y, z) {
    const te = this.elements; // 获取矩阵元素数组

    if (x.isVector3) {
      // 如果第一个参数是Vector3对象
      te[12] = x.x; // 设置X轴平移分量
      te[13] = x.y; // 设置Y轴平移分量
      te[14] = x.z; // 设置Z轴平移分量
    } else {
      // 如果参数是三个独立的数值
      te[12] = x; // 设置X轴平移分量
      te[13] = y; // 设置Y轴平移分量
      te[14] = z; // 设置Z轴平移分量
    }

    return this;
  }

  /**
   * 使用[解析方法]{@link https://en.wikipedia.org/wiki/Invertible_matrix#Analytic_solution}求此矩阵的逆矩阵
   * 不能对行列式为零的矩阵求逆。如果尝试这样做，该方法将产生零矩阵
   * Inverts this matrix, using the [analytic method]{@link https://en.wikipedia.org/wiki/Invertible_matrix#Analytic_solution}.
   * You can not invert with a determinant of zero. If you attempt this, the method produces
   * a zero matrix instead.
   *
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  invert() {
    // 基于 http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm
    // based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm
    const te = this.elements, // 获取矩阵元素数组
      // 提取矩阵元素（按行主序命名）
      n11 = te[0], // 第1行第1列
      n21 = te[1], // 第2行第1列
      n31 = te[2], // 第3行第1列
      n41 = te[3], // 第4行第1列
      n12 = te[4], // 第1行第2列
      n22 = te[5], // 第2行第2列
      n32 = te[6], // 第3行第2列
      n42 = te[7], // 第4行第2列
      n13 = te[8], // 第1行第3列
      n23 = te[9], // 第2行第3列
      n33 = te[10], // 第3行第3列
      n43 = te[11], // 第4行第3列
      n14 = te[12], // 第1行第4列
      n24 = te[13], // 第2行第4列
      n34 = te[14], // 第3行第4列
      n44 = te[15], // 第4行第4列
      // 计算第一行的余子式（用于计算行列式和逆矩阵）
      t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44,
      t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44,
      t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44,
      t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

    // 计算行列式
    const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

    // 如果行列式为0，矩阵不可逆，返回零矩阵
    if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

    // 计算行列式的倒数
    const detInv = 1 / det;

    // 计算逆矩阵的各个元素
    // 第一列
    te[0] = t11 * detInv; // 逆矩阵[1,1]
    te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv; // 逆矩阵[2,1]
    te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv; // 逆矩阵[3,1]
    te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv; // 逆矩阵[4,1]

    // 第二列
    te[4] = t12 * detInv; // 逆矩阵[1,2]
    te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv; // 逆矩阵[2,2]
    te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv; // 逆矩阵[3,2]
    te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv; // 逆矩阵[4,2]

    // 第三列
    te[8] = t13 * detInv; // 逆矩阵[1,3]
    te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv; // 逆矩阵[2,3]
    te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv; // 逆矩阵[3,3]
    te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv; // 逆矩阵[4,3]

    // 第四列
    te[12] = t14 * detInv; // 逆矩阵[1,4]
    te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv; // 逆矩阵[2,4]
    te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv; // 逆矩阵[3,4]
    te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv; // 逆矩阵[4,4]

    return this;
  }

  /**
   * 将此矩阵的列乘以给定向量的对应分量（缩放变换）
   * Multiplies the columns of this matrix by the given vector.
   *
   * @param {Vector3} v - 缩放向量 The scale vector.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  scale(v) {
    const te = this.elements; // 获取矩阵元素数组
    const x = v.x, // X轴缩放因子
      y = v.y, // Y轴缩放因子
      z = v.z; // Z轴缩放因子

    // 将矩阵的前三列分别乘以对应的缩放因子
    te[0] *= x; // 第1列第1行 * x
    te[4] *= y; // 第2列第1行 * y
    te[8] *= z; // 第3列第1行 * z
    te[1] *= x; // 第1列第2行 * x
    te[5] *= y; // 第2列第2行 * y
    te[9] *= z; // 第3列第2行 * z
    te[2] *= x; // 第1列第3行 * x
    te[6] *= y; // 第2列第3行 * y
    te[10] *= z; // 第3列第3行 * z
    te[3] *= x; // 第1列第4行 * x
    te[7] *= y; // 第2列第4行 * y
    te[11] *= z; // 第3列第4行 * z

    return this;
  }

  /**
   * 获取三个轴中的最大缩放值
   * Gets the maximum scale value of the three axes.
   *
   * @return {number} 最大缩放值 The maximum scale.
   */
  getMaxScaleOnAxis() {
    const te = this.elements; // 获取矩阵元素数组

    // 计算各轴缩放因子的平方
    const scaleXSq = te[0] * te[0] + te[1] * te[1] + te[2] * te[2]; // X轴缩放的平方
    const scaleYSq = te[4] * te[4] + te[5] * te[5] + te[6] * te[6]; // Y轴缩放的平方
    const scaleZSq = te[8] * te[8] + te[9] * te[9] + te[10] * te[10]; // Z轴缩放的平方

    // 返回最大缩放值
    return Math.sqrt(Math.max(scaleXSq, scaleYSq, scaleZSq));
  }

  /**
   * 将此矩阵设置为从给定向量的平移变换
   * Sets this matrix as a translation transform from the given vector.
   *
   * @param {number|Vector3} x - X轴平移量或平移向量对象 The amount to translate in the X axis or alternatively a translation vector.
   * @param {number} y - Y轴平移量 The amount to translate in the Y axis.
   * @param {number} z - Z轴平移量 The amount to translate in the z axis.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  makeTranslation(x, y, z) {
    if (x.isVector3) {
      // 如果第一个参数是Vector3对象
      this.set(1, 0, 0, x.x, 0, 1, 0, x.y, 0, 0, 1, x.z, 0, 0, 0, 1);
    } else {
      // 如果参数是三个独立的数值
      this.set(1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1);
    }

    return this;
  }

  /**
   * 将此矩阵设置为绕X轴旋转给定角度的旋转变换
   * Sets this matrix as a rotational transformation around the X axis by
   * the given angle.
   *
   * @param {number} theta - 旋转角度（弧度） The rotation in radians.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  makeRotationX(theta) {
    const c = Math.cos(theta), // 余弦值
      s = Math.sin(theta); // 正弦值

    // 设置绕X轴旋转的矩阵
    this.set(1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1);

    return this;
  }

  /**
   * 将此矩阵设置为绕Y轴旋转给定角度的旋转变换
   * Sets this matrix as a rotational transformation around the Y axis by
   * the given angle.
   *
   * @param {number} theta - 旋转角度（弧度） The rotation in radians.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  makeRotationY(theta) {
    const c = Math.cos(theta), // 余弦值
      s = Math.sin(theta); // 正弦值

    // 设置绕Y轴旋转的矩阵
    this.set(c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1);

    return this;
  }

  /**
   * 将此矩阵设置为绕Z轴旋转给定角度的旋转变换
   * Sets this matrix as a rotational transformation around the Z axis by
   * the given angle.
   *
   * @param {number} theta - 旋转角度（弧度） The rotation in radians.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  makeRotationZ(theta) {
    const c = Math.cos(theta), // 余弦值
      s = Math.sin(theta); // 正弦值

    // 设置绕Z轴旋转的矩阵
    this.set(c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);

    return this;
  }

  /**
   * 将此矩阵设置为绕给定轴旋转给定角度的旋转变换
   * Sets this matrix as a rotational transformation around the given axis by
   * the given angle.
   *
   * 这是一个有些争议但数学上合理的四元数旋转替代方案
   * 参见[此处]{@link https://www.gamedev.net/articles/programming/math-and-physics/do-we-really-need-quaternions-r1199}的讨论
   * This is a somewhat controversial but mathematically sound alternative to
   * rotating via Quaternions. See the discussion [here]{@link https://www.gamedev.net/articles/programming/math-and-physics/do-we-really-need-quaternions-r1199}.
   *
   * @param {Vector3} axis - 归一化的旋转轴 The normalized rotation axis.
   * @param {number} angle - 旋转角度（弧度） The rotation in radians.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  makeRotationAxis(axis, angle) {
    // 基于 http://www.gamedev.net/reference/articles/article1199.asp
    // Based on http://www.gamedev.net/reference/articles/article1199.asp

    const c = Math.cos(angle); // 余弦值
    const s = Math.sin(angle); // 正弦值
    const t = 1 - c; // 1 - cos(angle)
    const x = axis.x, // 旋转轴的X分量
      y = axis.y, // 旋转轴的Y分量
      z = axis.z; // 旋转轴的Z分量
    const tx = t * x, // t * x
      ty = t * y; // t * y

    // 使用罗德里格旋转公式设置旋转矩阵
    this.set(tx * x + c, tx * y - s * z, tx * z + s * y, 0, tx * y + s * z, ty * y + c, ty * z - s * x, 0, tx * z - s * y, ty * z + s * x, t * z * z + c, 0, 0, 0, 0, 1);

    return this;
  }

  /**
   * 将此矩阵设置为缩放变换
   * Sets this matrix as a scale transformation.
   *
   * @param {number} x - X轴缩放量 The amount to scale in the X axis.
   * @param {number} y - Y轴缩放量 The amount to scale in the Y axis.
   * @param {number} z - Z轴缩放量 The amount to scale in the Z axis.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  makeScale(x, y, z) {
    // 设置缩放矩阵：对角线为缩放因子，其他为0
    this.set(x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1);

    return this;
  }

  /**
   * 将此矩阵设置为剪切变换
   * Sets this matrix as a shear transformation.
   *
   * @param {number} xy - X被Y剪切的量 The amount to shear X by Y.
   * @param {number} xz - X被Z剪切的量 The amount to shear X by Z.
   * @param {number} yx - Y被X剪切的量 The amount to shear Y by X.
   * @param {number} yz - Y被Z剪切的量 The amount to shear Y by Z.
   * @param {number} zx - Z被X剪切的量 The amount to shear Z by X.
   * @param {number} zy - Z被Y剪切的量 The amount to shear Z by Y.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  makeShear(xy, xz, yx, yz, zx, zy) {
    // 设置剪切矩阵
    this.set(1, yx, zx, 0, xy, 1, zy, 0, xz, yz, 1, 0, 0, 0, 0, 1);

    return this;
  }

  /**
   * 将此矩阵设置为由给定位置、旋转（四元数）和缩放组成的变换
   * Sets this matrix to the transformation composed of the given position,
   * rotation (Quaternion) and scale.
   *
   * @param {Vector3} position - 位置向量 The position vector.
   * @param {Quaternion} quaternion - 旋转四元数 The rotation as a Quaternion.
   * @param {Vector3} scale - 缩放向量 The scale vector.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  compose(position, quaternion, scale) {
    const te = this.elements; // 获取矩阵元素数组

    // 提取四元数的分量
    const x = quaternion._x, // 四元数的x分量
      y = quaternion._y, // 四元数的y分量
      z = quaternion._z, // 四元数的z分量
      w = quaternion._w; // 四元数的w分量
    // 计算四元数分量的两倍值（优化计算）
    const x2 = x + x,
      y2 = y + y,
      z2 = z + z;
    // 计算四元数转换为旋转矩阵所需的中间值
    const xx = x * x2, // x * 2x
      xy = x * y2, // x * 2y
      xz = x * z2; // x * 2z
    const yy = y * y2, // y * 2y
      yz = y * z2, // y * 2z
      zz = z * z2; // z * 2z
    const wx = w * x2, // w * 2x
      wy = w * y2, // w * 2y
      wz = w * z2; // w * 2z

    // 提取缩放向量的分量
    const sx = scale.x, // X轴缩放
      sy = scale.y, // Y轴缩放
      sz = scale.z; // Z轴缩放

    // 计算组合变换矩阵：旋转矩阵 * 缩放矩阵
    // 第一列（X轴基向量）
    te[0] = (1 - (yy + zz)) * sx; // (1 - (y²+z²)) * sx
    te[1] = (xy + wz) * sx; // (xy + wz) * sx
    te[2] = (xz - wy) * sx; // (xz - wy) * sx
    te[3] = 0;

    // 第二列（Y轴基向量）
    te[4] = (xy - wz) * sy; // (xy - wz) * sy
    te[5] = (1 - (xx + zz)) * sy; // (1 - (x²+z²)) * sy
    te[6] = (yz + wx) * sy; // (yz + wx) * sy
    te[7] = 0;

    // 第三列（Z轴基向量）
    te[8] = (xz + wy) * sz; // (xz + wy) * sz
    te[9] = (yz - wx) * sz; // (yz - wx) * sz
    te[10] = (1 - (xx + yy)) * sz; // (1 - (x²+y²)) * sz
    te[11] = 0;

    // 第四列（平移向量）
    te[12] = position.x; // X轴平移
    te[13] = position.y; // Y轴平移
    te[14] = position.z; // Z轴平移
    te[15] = 1; // 齐次坐标

    return this;
  }

  /**
   * 将此矩阵分解为其位置、旋转和缩放分量，并将结果提供给给定的对象
   * Decomposes this matrix into its position, rotation and scale components
   * and provides the result in the given objects.
   *
   * 注意：并非所有矩阵都可以这样分解。例如，如果对象有非均匀缩放的父对象，
   * 那么该对象的世界矩阵可能无法分解，此方法可能不适用
   * Note: Not all matrices are decomposable in this way. For example, if an
   * object has a non-uniformly scaled parent, then the object's world matrix
   * may not be decomposable, and this method may not be appropriate.
   *
   * @param {Vector3} position - 位置向量 The position vector.
   * @param {Quaternion} quaternion - 旋转四元数 The rotation as a Quaternion.
   * @param {Vector3} scale - 缩放向量 The scale vector.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  decompose(position, quaternion, scale) {
    const te = this.elements; // 获取矩阵元素数组

    // 计算各轴的缩放因子（通过计算各列向量的长度）
    let sx = _v1.set(te[0], te[1], te[2]).length(); // X轴缩放
    const sy = _v1.set(te[4], te[5], te[6]).length(); // Y轴缩放
    const sz = _v1.set(te[8], te[9], te[10]).length(); // Z轴缩放

    // 如果行列式为负，需要反转一个缩放值（处理反射变换）
    const det = this.determinant();
    if (det < 0) sx = -sx;

    // 提取位置分量（第四列的前三个元素）
    position.x = te[12]; // X轴位置
    position.y = te[13]; // Y轴位置
    position.z = te[14]; // Z轴位置

    // 缩放旋转部分以提取纯旋转矩阵
    _m1.copy(this); // 复制当前矩阵

    // 计算缩放因子的倒数
    const invSX = 1 / sx; // X轴缩放倒数
    const invSY = 1 / sy; // Y轴缩放倒数
    const invSZ = 1 / sz; // Z轴缩放倒数

    // 通过除以缩放因子来归一化旋转部分
    // 归一化X轴基向量
    _m1.elements[0] *= invSX;
    _m1.elements[1] *= invSX;
    _m1.elements[2] *= invSX;

    // 归一化Y轴基向量
    _m1.elements[4] *= invSY;
    _m1.elements[5] *= invSY;
    _m1.elements[6] *= invSY;

    // 归一化Z轴基向量
    _m1.elements[8] *= invSZ;
    _m1.elements[9] *= invSZ;
    _m1.elements[10] *= invSZ;

    // 从归一化的旋转矩阵中提取四元数
    quaternion.setFromRotationMatrix(_m1);

    // 设置缩放分量
    scale.x = sx;
    scale.y = sy;
    scale.z = sz;

    return this;
  }

  /**
	 * 创建透视投影矩阵。这在内部被{@link PerspectiveCamera#updateProjectionMatrix}使用
	 * Creates a perspective projection matrix. This is used internally by
	 * {@link PerspectiveCamera#updateProjectionMatrix}.

	 * @param {number} left - 视锥体在近平面的左边界 Left boundary of the viewing frustum at the near plane.
	 * @param {number} right - 视锥体在近平面的右边界 Right boundary of the viewing frustum at the near plane.
	 * @param {number} top - 视锥体在近平面的上边界 Top boundary of the viewing frustum at the near plane.
	 * @param {number} bottom - 视锥体在近平面的下边界 Bottom boundary of the viewing frustum at the near plane.
	 * @param {number} near - 从相机到近平面的距离 The distance from the camera to the near plane.
	 * @param {number} far - 从相机到远平面的距离 The distance from the camera to the far plane.
	 * @param {(WebGLCoordinateSystem|WebGPUCoordinateSystem)} [coordinateSystem=WebGLCoordinateSystem] - 坐标系统 The coordinate system.
	 * @param {boolean} [reversedDepth=false] - 是否使用反向深度 Whether to use a reversed depth.
	 * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
	 */
  makePerspective(left, right, top, bottom, near, far, coordinateSystem = WebGLCoordinateSystem, reversedDepth = false) {
    const te = this.elements; // 获取矩阵元素数组

    // 计算透视投影的基本参数
    const x = (2 * near) / (right - left); // X轴缩放因子
    const y = (2 * near) / (top - bottom); // Y轴缩放因子

    // 计算偏移参数（用于非对称视锥体）
    const a = (right + left) / (right - left); // X轴偏移
    const b = (top + bottom) / (top - bottom); // Y轴偏移

    let c, d; // Z轴相关参数

    if (reversedDepth) {
      // 反向深度缓冲区配置
      c = near / (far - near);
      d = (far * near) / (far - near);
    } else {
      // 标准深度缓冲区配置
      if (coordinateSystem === WebGLCoordinateSystem) {
        // WebGL坐标系统（Z范围：-1到1）
        c = -(far + near) / (far - near);
        d = (-2 * far * near) / (far - near);
      } else if (coordinateSystem === WebGPUCoordinateSystem) {
        // WebGPU坐标系统（Z范围：0到1）
        c = -far / (far - near);
        d = (-far * near) / (far - near);
      } else {
        throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: " + coordinateSystem);
      }
    }

    // 设置透视投影矩阵的元素
    te[0] = x; // [1,1] X轴缩放
    te[4] = 0; // [1,2]
    te[8] = a; // [1,3] X轴偏移
    te[12] = 0; // [1,4]
    te[1] = 0; // [2,1]
    te[5] = y; // [2,2] Y轴缩放
    te[9] = b; // [2,3] Y轴偏移
    te[13] = 0; // [2,4]
    te[2] = 0; // [3,1]
    te[6] = 0; // [3,2]
    te[10] = c; // [3,3] Z轴缩放
    te[14] = d; // [3,4] Z轴偏移
    te[3] = 0; // [4,1]
    te[7] = 0; // [4,2]
    te[11] = -1; // [4,3] 透视除法因子
    te[15] = 0; // [4,4]

    return this;
  }

  /**
	 * 创建正交投影矩阵。这在内部被{@link OrthographicCamera#updateProjectionMatrix}使用
	 * Creates a orthographic projection matrix. This is used internally by
	 * {@link OrthographicCamera#updateProjectionMatrix}.

	 * @param {number} left - 视锥体在近平面的左边界 Left boundary of the viewing frustum at the near plane.
	 * @param {number} right - 视锥体在近平面的右边界 Right boundary of the viewing frustum at the near plane.
	 * @param {number} top - 视锥体在近平面的上边界 Top boundary of the viewing frustum at the near plane.
	 * @param {number} bottom - 视锥体在近平面的下边界 Bottom boundary of the viewing frustum at the near plane.
	 * @param {number} near - 从相机到近平面的距离 The distance from the camera to the near plane.
	 * @param {number} far - 从相机到远平面的距离 The distance from the camera to the far plane.
	 * @param {(WebGLCoordinateSystem|WebGPUCoordinateSystem)} [coordinateSystem=WebGLCoordinateSystem] - 坐标系统 The coordinate system.
	 * @param {boolean} [reversedDepth=false] - 是否使用反向深度 Whether to use a reversed depth.
	 * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
	 */
  makeOrthographic(left, right, top, bottom, near, far, coordinateSystem = WebGLCoordinateSystem, reversedDepth = false) {
    const te = this.elements; // 获取矩阵元素数组

    // 计算正交投影的缩放因子
    const x = 2 / (right - left); // X轴缩放因子
    const y = 2 / (top - bottom); // Y轴缩放因子

    // 计算平移参数（将视锥体中心移到原点）
    const a = -(right + left) / (right - left); // X轴平移
    const b = -(top + bottom) / (top - bottom); // Y轴平移

    let c, d; // Z轴相关参数

    if (reversedDepth) {
      // 反向深度缓冲区配置
      c = 1 / (far - near);
      d = far / (far - near);
    } else {
      // 标准深度缓冲区配置
      if (coordinateSystem === WebGLCoordinateSystem) {
        // WebGL坐标系统（Z范围：-1到1）
        c = -2 / (far - near);
        d = -(far + near) / (far - near);
      } else if (coordinateSystem === WebGPUCoordinateSystem) {
        // WebGPU坐标系统（Z范围：0到1）
        c = -1 / (far - near);
        d = -near / (far - near);
      } else {
        throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: " + coordinateSystem);
      }
    }

    // 设置正交投影矩阵的元素
    te[0] = x; // [1,1] X轴缩放
    te[4] = 0; // [1,2]
    te[8] = 0; // [1,3]
    te[12] = a; // [1,4] X轴平移
    te[1] = 0; // [2,1]
    te[5] = y; // [2,2] Y轴缩放
    te[9] = 0; // [2,3]
    te[13] = b; // [2,4] Y轴平移
    te[2] = 0; // [3,1]
    te[6] = 0; // [3,2]
    te[10] = c; // [3,3] Z轴缩放
    te[14] = d; // [3,4] Z轴平移
    te[3] = 0; // [4,1]
    te[7] = 0; // [4,2]
    te[11] = 0; // [4,3]
    te[15] = 1; // [4,4] 齐次坐标

    return this;
  }

  /**
   * 如果此矩阵与给定矩阵相等，则返回`true`
   * Returns `true` if this matrix is equal with the given one.
   *
   * @param {Matrix4} matrix - 要测试相等性的矩阵 The matrix to test for equality.
   * @return {boolean} 此矩阵是否与给定矩阵相等 Whether this matrix is equal with the given one.
   */
  equals(matrix) {
    const te = this.elements; // 此矩阵的元素数组
    const me = matrix.elements; // 比较矩阵的元素数组

    // 逐个比较所有16个元素
    for (let i = 0; i < 16; i++) {
      if (te[i] !== me[i]) return false; // 如果有任何元素不相等，返回false
    }

    return true; // 所有元素都相等
  }

  /**
   * 从给定数组设置矩阵的元素
   * Sets the elements of the matrix from the given array.
   *
   * @param {Array<number>} array - 列主序的矩阵元素数组 The matrix elements in column-major order.
   * @param {number} [offset=0] - 数组中第一个元素的索引 Index of the first element in the array.
   * @return {Matrix4} 此矩阵的引用 A reference to this matrix.
   */
  fromArray(array, offset = 0) {
    // 从数组中复制16个元素到矩阵
    for (let i = 0; i < 16; i++) {
      this.elements[i] = array[i + offset];
    }

    return this;
  }

  /**
   * 将此矩阵的元素写入给定数组。如果没有提供数组，该方法返回一个新实例
   * Writes the elements of this matrix to the given array. If no array is provided,
   * the method returns a new instance.
   *
   * @param {Array<number>} [array=[]] - 保存列主序矩阵元素的目标数组 The target array holding the matrix elements in column-major order.
   * @param {number} [offset=0] - 数组中第一个元素的索引 Index of the first element in the array.
   * @return {Array<number>} 列主序的矩阵元素 The matrix elements in column-major order.
   */
  toArray(array = [], offset = 0) {
    const te = this.elements; // 获取矩阵元素数组

    // 将矩阵元素复制到目标数组（第一列）
    array[offset] = te[0];
    array[offset + 1] = te[1];
    array[offset + 2] = te[2];
    array[offset + 3] = te[3];

    // 第二列
    array[offset + 4] = te[4];
    array[offset + 5] = te[5];
    array[offset + 6] = te[6];
    array[offset + 7] = te[7];

    // 第三列
    array[offset + 8] = te[8];
    array[offset + 9] = te[9];
    array[offset + 10] = te[10];
    array[offset + 11] = te[11];

    // 第四列
    array[offset + 12] = te[12];
    array[offset + 13] = te[13];
    array[offset + 14] = te[14];
    array[offset + 15] = te[15];

    return array;
  }
}

// 内部使用的临时变量（纯函数优化标记）
const _v1 = /*@__PURE__*/ new Vector3(); // 临时向量1
const _m1 = /*@__PURE__*/ new Matrix4(); // 临时矩阵1
const _zero = /*@__PURE__*/ new Vector3(0, 0, 0); // 零向量
const _one = /*@__PURE__*/ new Vector3(1, 1, 1); // 单位向量
const _x = /*@__PURE__*/ new Vector3(); // 临时X轴向量
const _y = /*@__PURE__*/ new Vector3(); // 临时Y轴向量
const _z = /*@__PURE__*/ new Vector3(); // 临时Z轴向量

export { Matrix4 };
