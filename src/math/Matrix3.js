/**
 * 表示一个3x3矩阵
 * Represents a 3x3 matrix.
 *
 * 关于行主序和列主序的说明：
 * A Note on Row-Major and Column-Major Ordering:
 *
 * 构造函数和{@link Matrix3#set}方法接受行主序参数，
 * 但内部存储在{@link Matrix3#elements}数组中时使用列主序。
 * The constructor and {@link Matrix3#set} method take arguments in
 * [row-major]{@link https://en.wikipedia.org/wiki/Row-_and_column-major_order#Column-major_order}
 * order, while internally they are stored in the {@link Matrix3#elements} array in column-major order.
 * 这意味着调用：
 * This means that calling:
 * ```js
 * const m = new THREE.Matrix();
 * m.set( 11, 12, 13,
 *        21, 22, 23,
 *        31, 32, 33 );
 * ```
 * 将导致elements数组包含：
 * will result in the elements array containing:
 * ```js
 * m.elements = [ 11, 21, 31,
 *                12, 22, 32,
 *                13, 23, 33 ];
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
class Matrix3 {
  /**
   * 构造一个新的3x3矩阵。参数应该按行主序提供。
   * 如果没有提供参数，构造函数将矩阵初始化为单位矩阵。
   * Constructs a new 3x3 matrix. The arguments are supposed to be
   * in row-major order. If no arguments are provided, the constructor
   * initializes the matrix as an identity matrix.
   *
   * @param {number} [n11] - 第1行第1列矩阵元素 1-1 matrix element.
   * @param {number} [n12] - 第1行第2列矩阵元素 1-2 matrix element.
   * @param {number} [n13] - 第1行第3列矩阵元素 1-3 matrix element.
   * @param {number} [n21] - 第2行第1列矩阵元素 2-1 matrix element.
   * @param {number} [n22] - 第2行第2列矩阵元素 2-2 matrix element.
   * @param {number} [n23] - 第2行第3列矩阵元素 2-3 matrix element.
   * @param {number} [n31] - 第3行第1列矩阵元素 3-1 matrix element.
   * @param {number} [n32] - 第3行第2列矩阵元素 3-2 matrix element.
   * @param {number} [n33] - 第3行第3列矩阵元素 3-3 matrix element.
   */
  constructor(n11, n12, n13, n21, n22, n23, n31, n32, n33) {
    /**
     * 此标志可用于类型测试
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    Matrix3.prototype.isMatrix3 = true;

    /**
     * 列主序的矩阵值列表
     * A column-major list of matrix values.
     *
     * @type {Array<number>}
     */
    this.elements = [
      // 第一列：[1, 0, 0]
      1, 0, 0,
      // 第二列：[0, 1, 0]
      0, 1, 0,
      // 第三列：[0, 0, 1]
      0, 0, 1,
    ];

    if (n11 !== undefined) {
      // 如果提供了参数

      this.set(n11, n12, n13, n21, n22, n23, n31, n32, n33); // 设置矩阵元素
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
   * @param {number} [n21] - 第2行第1列矩阵元素 2-1 matrix element.
   * @param {number} [n22] - 第2行第2列矩阵元素 2-2 matrix element.
   * @param {number} [n23] - 第2行第3列矩阵元素 2-3 matrix element.
   * @param {number} [n31] - 第3行第1列矩阵元素 3-1 matrix element.
   * @param {number} [n32] - 第3行第2列矩阵元素 3-2 matrix element.
   * @param {number} [n33] - 第3行第3列矩阵元素 3-3 matrix element.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  set(n11, n12, n13, n21, n22, n23, n31, n32, n33) {
    const te = this.elements; // 获取元素数组引用

    // 按列主序存储矩阵元素
    te[0] = n11; // 第1列第1行
    te[1] = n21; // 第1列第2行
    te[2] = n31; // 第1列第3行
    te[3] = n12; // 第2列第1行
    te[4] = n22; // 第2列第2行
    te[5] = n32; // 第2列第3行
    te[6] = n13; // 第3列第1行
    te[7] = n23; // 第3列第2行
    te[8] = n33; // 第3列第3行

    return this;
  }

  /**
   * 将此矩阵设置为3x3单位矩阵
   * Sets this matrix to the 3x3 identity matrix.
   *
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  identity() {
    // 设置为单位矩阵：对角线为1，其他为0
    this.set(1, 0, 0, 0, 1, 0, 0, 0, 1);

    return this;
  }

  /**
   * 将给定矩阵的值复制到此实例
   * Copies the values of the given matrix to this instance.
   *
   * @param {Matrix3} m - 要复制的矩阵 The matrix to copy.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  copy(m) {
    const te = this.elements; // 此矩阵的元素数组
    const me = m.elements; // 源矩阵的元素数组

    // 逐个复制所有9个元素
    te[0] = me[0]; // 第1列第1行
    te[1] = me[1]; // 第1列第2行
    te[2] = me[2]; // 第1列第3行
    te[3] = me[3]; // 第2列第1行
    te[4] = me[4]; // 第2列第2行
    te[5] = me[5]; // 第2列第3行
    te[6] = me[6]; // 第3列第1行
    te[7] = me[7]; // 第3列第2行
    te[8] = me[8]; // 第3列第3行

    return this;
  }

  /**
   * 将此矩阵的基向量提取到提供的三个轴向量中
   * Extracts the basis of this matrix into the three axis vectors provided.
   *
   * @param {Vector3} xAxis - 基的x轴 The basis's x axis.
   * @param {Vector3} yAxis - 基的y轴 The basis's y axis.
   * @param {Vector3} zAxis - 基的z轴 The basis's z axis.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  extractBasis(xAxis, yAxis, zAxis) {
    xAxis.setFromMatrix3Column(this, 0); // 从第0列设置x轴
    yAxis.setFromMatrix3Column(this, 1); // 从第1列设置y轴
    zAxis.setFromMatrix3Column(this, 2); // 从第2列设置z轴

    return this;
  }

  /**
   * 将此矩阵设置为给定4x4矩阵的左上角3x3矩阵
   * Set this matrix to the upper 3x3 matrix of the given 4x4 matrix.
   *
   * @param {Matrix4} m - 4x4矩阵 The 4x4 matrix.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  setFromMatrix4(m) {
    const me = m.elements; // 获取4x4矩阵的元素

    // 提取左上角3x3部分，按列主序排列
    this.set(me[0], me[4], me[8], me[1], me[5], me[9], me[2], me[6], me[10]);

    return this;
  }

  /**
   * 将此矩阵与给定的3x3矩阵进行后乘
   * Post-multiplies this matrix by the given 3x3 matrix.
   *
   * @param {Matrix3} m - 要相乘的矩阵 The matrix to multiply with.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  multiply(m) {
    // 执行 this = this * m
    return this.multiplyMatrices(this, m);
  }

  /**
   * 将此矩阵与给定的3x3矩阵进行前乘
   * Pre-multiplies this matrix by the given 3x3 matrix.
   *
   * @param {Matrix3} m - 要相乘的矩阵 The matrix to multiply with.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  premultiply(m) {
    // 执行 this = m * this
    return this.multiplyMatrices(m, this);
  }

  /**
   * 将给定的两个3x3矩阵相乘，并将结果存储在此矩阵中
   * Multiples the given 3x3 matrices and stores the result
   * in this matrix.
   *
   * @param {Matrix3} a - 第一个矩阵 The first matrix.
   * @param {Matrix3} b - 第二个矩阵 The second matrix.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  multiplyMatrices(a, b) {
    const ae = a.elements; // 矩阵a的元素
    const be = b.elements; // 矩阵b的元素
    const te = this.elements; // 结果矩阵的元素

    // 提取矩阵a的元素（按行主序思考）
    const a11 = ae[0],
      a12 = ae[3],
      a13 = ae[6]; // 第一行
    const a21 = ae[1],
      a22 = ae[4],
      a23 = ae[7]; // 第二行
    const a31 = ae[2],
      a32 = ae[5],
      a33 = ae[8]; // 第三行

    // 提取矩阵b的元素（按行主序思考）
    const b11 = be[0],
      b12 = be[3],
      b13 = be[6]; // 第一行
    const b21 = be[1],
      b22 = be[4],
      b23 = be[7]; // 第二行
    const b31 = be[2],
      b32 = be[5],
      b33 = be[8]; // 第三行

    // 计算结果矩阵的第一行
    te[0] = a11 * b11 + a12 * b21 + a13 * b31; // 结果[1,1]
    te[3] = a11 * b12 + a12 * b22 + a13 * b32; // 结果[1,2]
    te[6] = a11 * b13 + a12 * b23 + a13 * b33; // 结果[1,3]

    // 计算结果矩阵的第二行
    te[1] = a21 * b11 + a22 * b21 + a23 * b31; // 结果[2,1]
    te[4] = a21 * b12 + a22 * b22 + a23 * b32; // 结果[2,2]
    te[7] = a21 * b13 + a22 * b23 + a23 * b33; // 结果[2,3]

    // 计算结果矩阵的第三行
    te[2] = a31 * b11 + a32 * b21 + a33 * b31; // 结果[3,1]
    te[5] = a31 * b12 + a32 * b22 + a33 * b32; // 结果[3,2]
    te[8] = a31 * b13 + a32 * b23 + a33 * b33; // 结果[3,3]

    return this;
  }

  /**
   * 将矩阵的每个分量乘以给定的标量
   * Multiplies every component of the matrix by the given scalar.
   *
   * @param {number} s - 标量值 The scalar.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  multiplyScalar(s) {
    const te = this.elements; // 获取矩阵元素

    // 将每个元素乘以标量
    te[0] *= s; // 第1列第1行
    te[3] *= s; // 第2列第1行
    te[6] *= s; // 第3列第1行
    te[1] *= s; // 第1列第2行
    te[4] *= s; // 第2列第2行
    te[7] *= s; // 第3列第2行
    te[2] *= s; // 第1列第3行
    te[5] *= s; // 第2列第3行
    te[8] *= s; // 第3列第3行

    return this;
  }

  /**
   * 计算并返回此矩阵的行列式
   * Computes and returns the determinant of this matrix.
   *
   * @return {number} 行列式值 The determinant.
   */
  determinant() {
    const te = this.elements; // 获取矩阵元素

    // 按列主序提取矩阵元素
    const a = te[0],
      b = te[1],
      c = te[2], // 第一列
      d = te[3],
      e = te[4],
      f = te[5], // 第二列
      g = te[6],
      h = te[7],
      i = te[8]; // 第三列

    // 使用萨吕斯规则计算3x3矩阵的行列式
    // det = aei - afh - bdi + bfg + cdh - ceg
    return a * e * i - a * f * h - b * d * i + b * f * g + c * d * h - c * e * g;
  }

  /**
   * 使用解析方法求此矩阵的逆矩阵
   * 不能对行列式为零的矩阵求逆。如果尝试这样做，该方法会产生零矩阵。
   * Inverts this matrix, using the [analytic method]{@link https://en.wikipedia.org/wiki/Invertible_matrix#Analytic_solution}.
   * You can not invert with a determinant of zero. If you attempt this, the method produces
   * a zero matrix instead.
   *
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  invert() {
    const te = this.elements, // 获取矩阵元素
      // 按行主序思考提取元素
      n11 = te[0],
      n21 = te[1],
      n31 = te[2], // 第一列
      n12 = te[3],
      n22 = te[4],
      n32 = te[5], // 第二列
      n13 = te[6],
      n23 = te[7],
      n33 = te[8], // 第三列
      // 计算余子式
      t11 = n33 * n22 - n32 * n23, // 余子式M11
      t12 = n32 * n13 - n33 * n12, // 余子式M12
      t13 = n23 * n12 - n22 * n13, // 余子式M13
      // 计算行列式
      det = n11 * t11 + n21 * t12 + n31 * t13;

    if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0); // 行列式为0，返回零矩阵

    const detInv = 1 / det; // 行列式的倒数

    // 计算逆矩阵的元素
    te[0] = t11 * detInv; // 第1列第1行
    te[1] = (n31 * n23 - n33 * n21) * detInv; // 第1列第2行
    te[2] = (n32 * n21 - n31 * n22) * detInv; // 第1列第3行

    te[3] = t12 * detInv; // 第2列第1行
    te[4] = (n33 * n11 - n31 * n13) * detInv; // 第2列第2行
    te[5] = (n31 * n12 - n32 * n11) * detInv; // 第2列第3行

    te[6] = t13 * detInv; // 第3列第1行
    te[7] = (n21 * n13 - n23 * n11) * detInv; // 第3列第2行
    te[8] = (n22 * n11 - n21 * n12) * detInv; // 第3列第3行

    return this;
  }

  /**
   * 就地转置此矩阵
   * Transposes this matrix in place.
   *
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  transpose() {
    let tmp; // 临时变量用于交换
    const m = this.elements; // 获取矩阵元素

    // 交换对称位置的元素
    tmp = m[1];
    m[1] = m[3];
    m[3] = tmp; // 交换[0,1]和[1,0]
    tmp = m[2];
    m[2] = m[6];
    m[6] = tmp; // 交换[0,2]和[2,0]
    tmp = m[5];
    m[5] = m[7];
    m[7] = tmp; // 交换[1,2]和[2,1]

    return this;
  }

  /**
   * 计算法线矩阵，即给定4x4矩阵左上角3x3部分的逆转置矩阵
   * Computes the normal matrix which is the inverse transpose of the upper
   * left 3x3 portion of the given 4x4 matrix.
   *
   * @param {Matrix4} matrix4 - 4x4矩阵 The 4x4 matrix.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  getNormalMatrix(matrix4) {
    // 从4x4矩阵设置，然后求逆，最后转置
    return this.setFromMatrix4(matrix4).invert().transpose();
  }

  /**
   * 将此矩阵转置到提供的数组中，并返回自身不变
   * Transposes this matrix into the supplied array, and returns itself unchanged.
   *
   * @param {Array<number>} r - 存储转置矩阵元素的数组 An array to store the transposed matrix elements.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  transposeIntoArray(r) {
    const m = this.elements; // 获取矩阵元素

    // 按转置顺序填充数组
    r[0] = m[0];
    r[1] = m[3];
    r[2] = m[6]; // 第一行
    r[3] = m[1];
    r[4] = m[4];
    r[5] = m[7]; // 第二行
    r[6] = m[2];
    r[7] = m[5];
    r[8] = m[8]; // 第三行

    return this;
  }

  /**
   * 根据偏移、重复、旋转和中心点设置UV变换矩阵
   * Sets the UV transform matrix from offset, repeat, rotation, and center.
   *
   * @param {number} tx - X轴偏移 Offset x.
   * @param {number} ty - Y轴偏移 Offset y.
   * @param {number} sx - X轴重复 Repeat x.
   * @param {number} sy - Y轴重复 Repeat y.
   * @param {number} rotation - 旋转角度（弧度），正值为逆时针旋转 Rotation, in radians. Positive values rotate counterclockwise.
   * @param {number} cx - 旋转中心X坐标 Center x of rotation.
   * @param {number} cy - 旋转中心Y坐标 Center y of rotation
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  setUvTransform(tx, ty, sx, sy, rotation, cx, cy) {
    const c = Math.cos(rotation); // 旋转角度的余弦值
    const s = Math.sin(rotation); // 旋转角度的正弦值

    // 设置UV变换矩阵：包含缩放、旋转和平移
    this.set(sx * c, sx * s, -sx * (c * cx + s * cy) + cx + tx, -sy * s, sy * c, -sy * (-s * cx + c * cy) + cy + ty, 0, 0, 1);

    return this;
  }

  /**
   * 用给定的标量值缩放此矩阵
   * Scales this matrix with the given scalar values.
   *
   * @param {number} sx - X轴缩放量 The amount to scale in the X axis.
   * @param {number} sy - Y轴缩放量 The amount to scale in the Y axis.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  scale(sx, sy) {
    // 前乘缩放矩阵
    this.premultiply(_m3.makeScale(sx, sy));

    return this;
  }

  /**
   * 将此矩阵按给定角度旋转
   * Rotates this matrix by the given angle.
   *
   * @param {number} theta - 旋转角度（弧度） The rotation in radians.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  rotate(theta) {
    // 前乘旋转矩阵（注意负号，因为屏幕坐标系）
    this.premultiply(_m3.makeRotation(-theta));

    return this;
  }

  /**
   * 用给定的标量值平移此矩阵
   * Translates this matrix by the given scalar values.
   *
   * @param {number} tx - X轴平移量 The amount to translate in the X axis.
   * @param {number} ty - Y轴平移量 The amount to translate in the Y axis.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  translate(tx, ty) {
    // 前乘平移矩阵
    this.premultiply(_m3.makeTranslation(tx, ty));

    return this;
  }

  // 用于2D变换的方法
  // for 2D Transforms

  /**
   * 将此矩阵设置为2D平移变换矩阵
   * Sets this matrix as a 2D translation transform.
   *
   * @param {number|Vector2} x - X轴平移量，或者是一个平移向量 The amount to translate in the X axis or alternatively a translation vector.
   * @param {number} y - Y轴平移量 The amount to translate in the Y axis.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  makeTranslation(x, y) {
    if (x.isVector2) {
      // 如果x是Vector2对象
      // 使用向量的x和y分量设置平移矩阵
      this.set(1, 0, x.x, 0, 1, x.y, 0, 0, 1);
    } else {
      // 如果x是数值
      // 使用x和y参数设置平移矩阵
      this.set(1, 0, x, 0, 1, y, 0, 0, 1);
    }

    return this;
  }

  /**
   * 将此矩阵设置为2D旋转变换矩阵
   * Sets this matrix as a 2D rotational transformation.
   *
   * @param {number} theta - 旋转角度（弧度） The rotation in radians.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  makeRotation(theta) {
    // 逆时针旋转
    // counterclockwise

    const c = Math.cos(theta); // 旋转角度的余弦值
    const s = Math.sin(theta); // 旋转角度的正弦值

    // 设置2D旋转矩阵：[cos -sin 0; sin cos 0; 0 0 1]
    this.set(c, -s, 0, s, c, 0, 0, 0, 1);

    return this;
  }

  /**
   * 将此矩阵设置为2D缩放变换矩阵
   * Sets this matrix as a 2D scale transform.
   *
   * @param {number} x - X轴缩放量 The amount to scale in the X axis.
   * @param {number} y - Y轴缩放量 The amount to scale in the Y axis.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  makeScale(x, y) {
    // 设置2D缩放矩阵：[x 0 0; 0 y 0; 0 0 1]
    this.set(x, 0, 0, 0, y, 0, 0, 0, 1);

    return this;
  }

  /**
   * 如果此矩阵与给定矩阵相等，则返回true
   * Returns `true` if this matrix is equal with the given one.
   *
   * @param {Matrix3} matrix - 要测试相等性的矩阵 The matrix to test for equality.
   * @return {boolean} 此矩阵是否与给定矩阵相等 Whether this matrix is equal with the given one.
   */
  equals(matrix) {
    const te = this.elements; // 此矩阵的元素
    const me = matrix.elements; // 比较矩阵的元素

    // 逐个比较所有9个元素
    for (let i = 0; i < 9; i++) {
      if (te[i] !== me[i]) return false; // 如果有任何元素不相等，返回false
    }

    return true; // 所有元素都相等
  }

  /**
   * 从给定数组设置矩阵元素
   * Sets the elements of the matrix from the given array.
   *
   * @param {Array<number>} array - 列主序的矩阵元素 The matrix elements in column-major order.
   * @param {number} [offset=0] - 数组中第一个元素的索引 Index of the first element in the array.
   * @return {Matrix3} 此矩阵的引用 A reference to this matrix.
   */
  fromArray(array, offset = 0) {
    // 从数组复制9个元素到矩阵
    for (let i = 0; i < 9; i++) {
      this.elements[i] = array[i + offset]; // 从指定偏移位置开始复制
    }

    return this;
  }

  /**
   * 将此矩阵的元素写入给定数组。如果未提供数组，该方法返回一个新实例。
   * Writes the elements of this matrix to the given array. If no array is provided,
   * the method returns a new instance.
   *
   * @param {Array<number>} [array=[]] - 保存列主序矩阵元素的目标数组 The target array holding the matrix elements in column-major order.
   * @param {number} [offset=0] - 数组中第一个元素的索引 Index of the first element in the array.
   * @return {Array<number>} 列主序的矩阵元素 The matrix elements in column-major order.
   */
  toArray(array = [], offset = 0) {
    const te = this.elements; // 获取矩阵元素

    // 按列主序将矩阵元素写入数组
    array[offset] = te[0];
    array[offset + 1] = te[1];
    array[offset + 2] = te[2]; // 第一列
    array[offset + 3] = te[3];
    array[offset + 4] = te[4];
    array[offset + 5] = te[5]; // 第二列
    array[offset + 6] = te[6];
    array[offset + 7] = te[7];
    array[offset + 8] = te[8]; // 第三列

    return array;
  }

  /**
   * 返回此实例值的副本矩阵
   * Returns a matrix with copied values from this instance.
   *
   * @return {Matrix3} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 创建新的Matrix3实例并从当前矩阵的元素数组复制值
    return new this.constructor().fromArray(this.elements);
  }
}

// 创建一个纯净的Matrix3实例用于内部计算
const _m3 = /*@__PURE__*/ new Matrix3();

// 导出Matrix3类
export { Matrix3 };
