/**
 * 表示一个2x2矩阵
 * Represents a 2x2 matrix.
 *
 * 关于行主序和列主序的说明：
 * A Note on Row-Major and Column-Major Ordering:
 *
 * 构造函数和{@link Matrix2#set}方法接受行主序参数，
 * 但内部存储在{@link Matrix2#elements}数组中时使用列主序。
 * The constructor and {@link Matrix2#set} method take arguments in
 * [row-major]{@link https://en.wikipedia.org/wiki/Row-_and_column-major_order#Column-major_order}
 * order, while internally they are stored in the {@link Matrix2#elements} array in column-major order.
 * 这意味着调用：
 * This means that calling:
 * ```js
 * const m = new THREE.Matrix2();
 * m.set( 11, 12,
 *        21, 22 );
 * ```
 * 将导致elements数组包含：
 * will result in the elements array containing:
 * ```js
 * m.elements = [ 11, 21,
 *                12, 22 ];
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
export class Matrix2 {
  /**
   * 构造一个新的2x2矩阵。参数应该按行主序提供。
   * 如果没有提供参数，构造函数将矩阵初始化为单位矩阵。
   * Constructs a new 2x2 matrix. The arguments are supposed to be
   * in row-major order. If no arguments are provided, the constructor
   * initializes the matrix as an identity matrix.
   *
   * @param {number} [n11] - 第1行第1列矩阵元素 1-1 matrix element.
   * @param {number} [n12] - 第1行第2列矩阵元素 1-2 matrix element.
   * @param {number} [n21] - 第2行第1列矩阵元素 2-1 matrix element.
   * @param {number} [n22] - 第2行第2列矩阵元素 2-2 matrix element.
   */
  constructor(n11, n12, n21, n22) {
    /**
     * 此标志可用于类型测试
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    Matrix2.prototype.isMatrix2 = true;

    /**
     * 列主序的矩阵值列表
     * A column-major list of matrix values.
     *
     * @type {Array<number>}
     */
    this.elements = [
      1,
      0, // 第一列：[1, 0]
      0,
      1, // 第二列：[0, 1]
    ];

    if (n11 !== undefined) {
      // 如果提供了参数

      this.set(n11, n12, n21, n22); // 设置矩阵元素
    }
  }

  /**
   * 将此矩阵设置为2x2单位矩阵
   * Sets this matrix to the 2x2 identity matrix.
   *
   * @return {Matrix2} 此矩阵的引用 A reference to this matrix.
   */
  identity() {
    // 设置为单位矩阵：[1, 0; 0, 1]
    this.set(1, 0, 0, 1);

    return this;
  }

  /**
   * 从给定数组设置矩阵元素
   * Sets the elements of the matrix from the given array.
   *
   * @param {Array<number>} array - 列主序的矩阵元素 The matrix elements in column-major order.
   * @param {number} [offset=0] - 数组中第一个元素的索引 Index of the first element in the array.
   * @return {Matrix2} 此矩阵的引用 A reference to this matrix.
   */
  fromArray(array, offset = 0) {
    // 复制4个矩阵元素
    for (let i = 0; i < 4; i++) {
      this.elements[i] = array[i + offset]; // 从数组复制元素
    }

    return this;
  }

  /**
   * 设置矩阵的元素。参数应该按行主序提供。
   * Sets the elements of the matrix.The arguments are supposed to be
   * in row-major order.
   *
   * @param {number} n11 - 第1行第1列矩阵元素 1-1 matrix element.
   * @param {number} n12 - 第1行第2列矩阵元素 1-2 matrix element.
   * @param {number} n21 - 第2行第1列矩阵元素 2-1 matrix element.
   * @param {number} n22 - 第2行第2列矩阵元素 2-2 matrix element.
   * @return {Matrix2} 此矩阵的引用 A reference to this matrix.
   */
  set(n11, n12, n21, n22) {
    const te = this.elements; // 获取元素数组引用

    // 按列主序存储：第一列[n11, n21]，第二列[n12, n22]
    te[0] = n11;
    te[2] = n12; // 第一行元素
    te[1] = n21;
    te[3] = n22; // 第二行元素

    return this;
  }
}
