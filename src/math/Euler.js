// 导入四元数类，用于欧拉角和四元数之间的转换
import { Quaternion } from "./Quaternion.js";
// 导入4x4矩阵类，用于旋转矩阵的操作
import { Matrix4 } from "./Matrix4.js";
// 导入数学工具函数，用于数值夹紧
import { clamp } from "./MathUtils.js";

// 临时矩阵，用于内部计算
const _matrix = /*@__PURE__*/ new Matrix4();
// 临时四元数，用于内部计算
const _quaternion = /*@__PURE__*/ new Quaternion();

/**
 * 表示欧拉角的类
 * A class representing Euler angles.
 *
 * 欧拉角通过在指定的轴上按指定的量旋转对象来描述旋转变换，
 * 并按指定的轴顺序进行旋转。
 * Euler angles describe a rotational transformation by rotating an object on
 * its various axes in specified amounts per axis, and a specified axis
 * order.
 *
 * 遍历实例将按相应顺序产生其分量（x、y、z、order）。
 * Iterating through an instance will yield its components (x, y, z,
 * order) in the corresponding order.
 *
 * ```js
 * // 创建一个欧拉角对象，绕x轴0弧度，绕y轴1弧度，绕z轴1.57弧度，顺序为XYZ
 * const a = new THREE.Euler( 0, 1, 1.57, 'XYZ' );
 * const b = new THREE.Vector3( 1, 0, 1 );
 * // 将欧拉角应用到向量上
 * b.applyEuler(a);
 * ```
 */
class Euler {
  /**
   * 构造一个新的欧拉角实例
   * Constructs a new euler instance.
   *
   * @param {number} [x=0] - x轴的角度（弧度） The angle of the x axis in radians.
   * @param {number} [y=0] - y轴的角度（弧度） The angle of the y axis in radians.
   * @param {number} [z=0] - z轴的角度（弧度） The angle of the z axis in radians.
   * @param {string} [order=Euler.DEFAULT_ORDER] - 表示旋转应用顺序的字符串 A string representing the order that the rotations are applied.
   */
  constructor(x = 0, y = 0, z = 0, order = Euler.DEFAULT_ORDER) {
    /**
     * 此标志可用于类型测试
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isEuler = true;

    // 存储x轴旋转角度的私有属性
    this._x = x;
    // 存储y轴旋转角度的私有属性
    this._y = y;
    // 存储z轴旋转角度的私有属性
    this._z = z;
    // 存储旋转顺序的私有属性
    this._order = order;
  }

  /**
   * x轴的角度（弧度）
   * The angle of the x axis in radians.
   *
   * @type {number}
   * @default 0
   */
  get x() {
    // 返回x轴旋转角度
    return this._x;
  }

  set x(value) {
    // 设置x轴旋转角度
    this._x = value;
    // 触发变化回调
    this._onChangeCallback();
  }

  /**
   * y轴的角度（弧度）
   * The angle of the y axis in radians.
   *
   * @type {number}
   * @default 0
   */
  get y() {
    // 返回y轴旋转角度
    return this._y;
  }

  set y(value) {
    // 设置y轴旋转角度
    this._y = value;
    // 触发变化回调
    this._onChangeCallback();
  }

  /**
   * z轴的角度（弧度）
   * The angle of the z axis in radians.
   *
   * @type {number}
   * @default 0
   */
  get z() {
    // 返回z轴旋转角度
    return this._z;
  }

  set z(value) {
    // 设置z轴旋转角度
    this._z = value;
    // 触发变化回调
    this._onChangeCallback();
  }

  /**
   * 表示旋转应用顺序的字符串
   * A string representing the order that the rotations are applied.
   *
   * @type {string}
   * @default 'XYZ'
   */
  get order() {
    // 返回旋转顺序
    return this._order;
  }

  set order(value) {
    // 设置旋转顺序
    this._order = value;
    // 触发变化回调
    this._onChangeCallback();
  }

  /**
   * 设置此欧拉变换的角度，可选择设置顺序，然后调用onChangeCallback
   * Sets the Euler components.
   *
   * @param {number} x - x轴的角度（弧度） The angle of the x axis in radians.
   * @param {number} y - y轴的角度（弧度） The angle of the y axis in radians.
   * @param {number} z - z轴的角度（弧度） The angle of the z axis in radians.
   * @param {string} [order] - 表示旋转应用顺序的字符串 A string representing the order that the rotations are applied.
   * @return {Euler} 对此欧拉角的引用 A reference to this Euler instance.
   */
  set(x, y, z, order = this._order) {
    // 设置x轴旋转角度
    this._x = x;
    // 设置y轴旋转角度
    this._y = y;
    // 设置z轴旋转角度
    this._z = z;
    // 设置旋转顺序
    this._order = order;

    // 触发变化回调
    this._onChangeCallback();

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 返回一个复制了此实例值的新欧拉角实例
   * Returns a new Euler instance with copied values from this instance.
   *
   * @return {Euler} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 使用当前的角度值和旋转顺序创建新的欧拉角实例
    return new this.constructor(this._x, this._y, this._z, this._order);
  }

  /**
   * 将给定欧拉角实例的值复制到此实例
   * Copies the values of the given Euler instance to this instance.
   *
   * @param {Euler} euler - 要复制的欧拉角实例 The Euler instance to copy.
   * @return {Euler} 对此欧拉角实例的引用 A reference to this Euler instance.
   */
  copy(euler) {
    // 复制x轴旋转角度
    this._x = euler._x;
    // 复制y轴旋转角度
    this._y = euler._y;
    // 复制z轴旋转角度
    this._z = euler._z;
    // 复制旋转顺序
    this._order = euler._order;

    // 触发变化回调
    this._onChangeCallback();

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 从纯旋转矩阵设置此欧拉角实例的角度
   * Sets the angles of this Euler instance from a pure rotation matrix.
   *
   * @param {Matrix4} m - 一个4x4矩阵，其中矩阵的上3x3部分是纯旋转矩阵（即未缩放） A 4x4 matrix of which the upper 3x3 of matrix is a pure rotation matrix (i.e. unscaled).
   * @param {string} [order] - 表示旋转应用顺序的字符串 A string representing the order that the rotations are applied.
   * @param {boolean} [update=true] - 是否应该执行内部的onChange回调 Whether the internal `onChange` callback should be executed or not.
   * @return {Euler} 对此欧拉角实例的引用 A reference to this Euler instance.
   */
  setFromRotationMatrix(m, order = this._order, update = true) {
    // 获取矩阵元素数组
    const te = m.elements;
    // 提取旋转矩阵的3x3部分元素
    // 第一行：m11, m12, m13
    const m11 = te[0],
      m12 = te[4],
      m13 = te[8];
    // 第二行：m21, m22, m23
    const m21 = te[1],
      m22 = te[5],
      m23 = te[9];
    // 第三行：m31, m32, m33
    const m31 = te[2],
      m32 = te[6],
      m33 = te[10];

    // 根据旋转顺序计算欧拉角
    switch (order) {
      case "XYZ":
        // XYZ顺序：先绕X轴，再绕Y轴，最后绕Z轴
        // 从旋转矩阵提取Y轴旋转角度
        this._y = Math.asin(clamp(m13, -1, 1));

        // 检查是否存在万向节锁（gimbal lock）
        if (Math.abs(m13) < 0.9999999) {
          // 正常情况：计算X和Z轴旋转角度
          this._x = Math.atan2(-m23, m33);
          this._z = Math.atan2(-m12, m11);
        } else {
          // 万向节锁情况：设置X轴旋转，Z轴设为0
          this._x = Math.atan2(m32, m22);
          this._z = 0;
        }

        break;

      case "YXZ":
        // YXZ顺序：先绕Y轴，再绕X轴，最后绕Z轴
        // 从旋转矩阵提取X轴旋转角度
        this._x = Math.asin(-clamp(m23, -1, 1));

        // 检查是否存在万向节锁
        if (Math.abs(m23) < 0.9999999) {
          // 正常情况：计算Y和Z轴旋转角度
          this._y = Math.atan2(m13, m33);
          this._z = Math.atan2(m21, m22);
        } else {
          // 万向节锁情况：设置Y轴旋转，Z轴设为0
          this._y = Math.atan2(-m31, m11);
          this._z = 0;
        }

        break;

      case "ZXY":
        // ZXY顺序：先绕Z轴，再绕X轴，最后绕Y轴
        // 从旋转矩阵提取X轴旋转角度
        this._x = Math.asin(clamp(m32, -1, 1));

        // 检查是否存在万向节锁
        if (Math.abs(m32) < 0.9999999) {
          // 正常情况：计算Y和Z轴旋转角度
          this._y = Math.atan2(-m31, m33);
          this._z = Math.atan2(-m12, m22);
        } else {
          // 万向节锁情况：设置Y轴为0，计算Z轴旋转
          this._y = 0;
          this._z = Math.atan2(m21, m11);
        }

        break;

      case "ZYX":
        // ZYX顺序：先绕Z轴，再绕Y轴，最后绕X轴
        // 从旋转矩阵提取Y轴旋转角度
        this._y = Math.asin(-clamp(m31, -1, 1));

        // 检查是否存在万向节锁
        if (Math.abs(m31) < 0.9999999) {
          // 正常情况：计算X和Z轴旋转角度
          this._x = Math.atan2(m32, m33);
          this._z = Math.atan2(m21, m11);
        } else {
          // 万向节锁情况：设置X轴为0，计算Z轴旋转
          this._x = 0;
          this._z = Math.atan2(-m12, m22);
        }

        break;

      case "YZX":
        // YZX顺序：先绕Y轴，再绕Z轴，最后绕X轴
        // 从旋转矩阵提取Z轴旋转角度
        this._z = Math.asin(clamp(m21, -1, 1));

        // 检查是否存在万向节锁
        if (Math.abs(m21) < 0.9999999) {
          // 正常情况：计算X和Y轴旋转角度
          this._x = Math.atan2(-m23, m22);
          this._y = Math.atan2(-m31, m11);
        } else {
          // 万向节锁情况：设置X轴为0，计算Y轴旋转
          this._x = 0;
          this._y = Math.atan2(m13, m33);
        }

        break;

      case "XZY":
        // XZY顺序：先绕X轴，再绕Z轴，最后绕Y轴
        // 从旋转矩阵提取Z轴旋转角度
        this._z = Math.asin(-clamp(m12, -1, 1));

        // 检查是否存在万向节锁
        if (Math.abs(m12) < 0.9999999) {
          // 正常情况：计算X和Y轴旋转角度
          this._x = Math.atan2(m32, m22);
          this._y = Math.atan2(m13, m11);
        } else {
          // 万向节锁情况：计算X轴旋转，Y轴设为0
          this._x = Math.atan2(-m23, m33);
          this._y = 0;
        }

        break;

      default:
        // 未知的旋转顺序
        console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: " + order);
    }

    // 设置旋转顺序
    this._order = order;

    // 如果需要更新，触发变化回调
    if (update === true) this._onChangeCallback();

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 从标准化四元数设置此欧拉角实例的角度
   * Sets the angles of this Euler instance from a normalized quaternion.
   *
   * @param {Quaternion} q - 标准化的四元数 A normalized Quaternion.
   * @param {string} [order] - 表示旋转应用顺序的字符串 A string representing the order that the rotations are applied.
   * @param {boolean} [update=true] - 是否应该执行内部的onChange回调 Whether the internal `onChange` callback should be executed or not.
   * @return {Euler} 对此欧拉角实例的引用 A reference to this Euler instance.
   */
  setFromQuaternion(q, order, update) {
    // 从四元数创建旋转矩阵
    _matrix.makeRotationFromQuaternion(q);

    // 使用旋转矩阵设置欧拉角
    return this.setFromRotationMatrix(_matrix, order, update);
  }

  /**
   * 从给定向量设置此欧拉角实例的角度
   * Sets the angles of this Euler instance from the given vector.
   *
   * @param {Vector3} v - 向量（包含x、y、z角度） The vector.
   * @param {string} [order] - 表示旋转应用顺序的字符串 A string representing the order that the rotations are applied.
   * @return {Euler} 对此欧拉角实例的引用 A reference to this Euler instance.
   */
  setFromVector3(v, order = this._order) {
    // 使用向量的x、y、z分量作为欧拉角
    return this.set(v.x, v.y, v.z, order);
  }

  /**
   * 通过从此欧拉角创建四元数，然后使用四元数和新顺序设置此欧拉角，
   * 以新顺序重置欧拉角
   * Resets the euler angle with a new order by creating a quaternion from this
   * euler angle and then setting this euler angle with the quaternion and the
   * new order.
   *
   * 警告：这会丢弃旋转圈数信息
   * Warning: This discards revolution information.
   *
   * @param {string} [newOrder] - 表示新的旋转应用顺序的字符串 A string representing the new order that the rotations are applied.
   * @return {Euler} 对此欧拉角实例的引用 A reference to this Euler instance.
   */
  reorder(newOrder) {
    // 从当前欧拉角创建四元数
    _quaternion.setFromEuler(this);

    // 使用四元数和新顺序重新设置欧拉角
    return this.setFromQuaternion(_quaternion, newOrder);
  }

  /**
   * 如果此欧拉角实例与给定实例相等，则返回true
   * Returns `true` if this Euler instance is equal with the given one.
   *
   * @param {Euler} euler - 要测试相等性的欧拉角实例 The Euler instance to test for equality.
   * @return {boolean} 此欧拉角实例是否与给定实例相等 Whether this Euler instance is equal with the given one.
   */
  equals(euler) {
    // 比较所有分量和旋转顺序是否相等
    return euler._x === this._x && euler._y === this._y && euler._z === this._z && euler._order === this._order;
  }

  /**
   * 将此欧拉角实例的分量设置为给定数组中的值。数组的前三个条目
   * 分配给x、y和z分量。可选的第四个条目定义欧拉角顺序。
   * Sets this Euler instance's components to values from the given array. The first three
   * entries of the array are assign to the x,y and z components. An optional fourth entry
   * defines the Euler order.
   *
   * @param {Array<number,number,number,?string>} array - 包含欧拉角分量值的数组 An array holding the Euler component values.
   * @return {Euler} 对此欧拉角实例的引用 A reference to this Euler instance.
   */
  fromArray(array) {
    // 设置x轴旋转角度
    this._x = array[0];
    // 设置y轴旋转角度
    this._y = array[1];
    // 设置z轴旋转角度
    this._z = array[2];
    // 如果提供了第四个元素，设置旋转顺序
    if (array[3] !== undefined) this._order = array[3];

    // 触发变化回调
    this._onChangeCallback();

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将此欧拉角实例的分量写入给定数组。如果未提供数组，该方法返回一个新实例。
   * Writes the components of this Euler instance to the given array. If no array is provided,
   * the method returns a new instance.
   *
   * @param {Array<number,number,number,string>} [array=[]] - 保存欧拉角分量的目标数组 The target array holding the Euler components.
   * @param {number} [offset=0] - 数组中第一个元素的索引 Index of the first element in the array.
   * @return {Array<number,number,number,string>} 欧拉角分量 The Euler components.
   */
  toArray(array = [], offset = 0) {
    // 将x轴旋转角度写入数组
    array[offset] = this._x;
    // 将y轴旋转角度写入数组
    array[offset + 1] = this._y;
    // 将z轴旋转角度写入数组
    array[offset + 2] = this._z;
    // 将旋转顺序写入数组
    array[offset + 3] = this._order;

    // 返回数组
    return array;
  }

  /**
   * 设置变化回调函数（私有方法）
   * Sets the change callback function (private method)
   *
   * @param {Function} callback - 变化时要调用的回调函数 The callback function to call on change
   * @return {Euler} 对此欧拉角实例的引用 A reference to this Euler instance
   */
  _onChange(callback) {
    // 设置变化回调函数
    this._onChangeCallback = callback;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 默认的变化回调函数（空函数）
   * Default change callback function (empty function)
   */
  _onChangeCallback() {}

  /**
   * 迭代器方法，允许使用for...of循环遍历欧拉角分量
   * Iterator method that allows using for...of loops to iterate over Euler components
   */
  *[Symbol.iterator]() {
    // 依次产生x、y、z角度和旋转顺序
    yield this._x;
    yield this._y;
    yield this._z;
    yield this._order;
  }
}

/**
 * 默认的欧拉角顺序
 * The default Euler angle order.
 *
 * @static
 * @type {string}
 * @default 'XYZ'
 */
Euler.DEFAULT_ORDER = "XYZ";

// 导出Euler类
export { Euler };
