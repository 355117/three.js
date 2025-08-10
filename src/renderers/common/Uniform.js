// 导入数学类型
import { Color } from "../../math/Color.js";
import { Matrix2 } from "../../math/Matrix2.js";
import { Matrix3 } from "../../math/Matrix3.js";
import { Matrix4 } from "../../math/Matrix4.js";
import { Vector2 } from "../../math/Vector2.js";
import { Vector3 } from "../../math/Vector3.js";
import { Vector4 } from "../../math/Vector4.js";

/**
 * 统一变量抽象基类
 *
 * 统一变量（Uniform）是着色器中的全局变量，在整个绘制调用过程中保持不变。
 * 此抽象基类定义了所有统一变量类型的通用接口和属性，包括STD140布局规范
 * 所需的边界对齐和偏移量管理。
 *
 * @abstract
 * @private
 */
class Uniform {
  /**
   * 构造一个新的统一变量
   *
   * @param {string} name - 统一变量的名称，对应着色器中的变量名
   * @param {any} value - 统一变量的值
   */
  constructor(name, value) {
    /**
     * 统一变量的名称
     * 必须与着色器中声明的变量名完全匹配
     *
     * @type {string}
     */
    this.name = name;

    /**
     * 统一变量的值
     * 可以是数字、向量、矩阵、颜色等各种类型
     *
     * @type {any}
     */
    this.value = value;

    /**
     * 用于根据STD140布局构建统一缓冲区的边界对齐值
     * 派生的统一变量类将此属性设置为特定数据类型的值。
     * STD140是OpenGL/WebGL中统一缓冲区的标准内存布局规范。
     *
     * @type {number}
     */
    this.boundary = 0;

    /**
     * 项目大小（组件数量）
     * 派生的统一变量类将此属性设置为特定数据类型的值。
     * 例如：float为1，vec2为2，vec3为3，vec4为4
     *
     * @type {number}
     */
    this.itemSize = 0;

    /**
     * 在统一缓冲区中的起始位置偏移量
     * 此属性由 {@link UniformsGroup} 设置，标记在统一缓冲区中的位置
     *
     * @type {number}
     */
    this.offset = 0;
  }

  /**
   * 设置统一变量的值
   * 更新统一变量的值，新值将在下次渲染时传递给着色器
   *
   * @param {any} value - 要设置的值
   */
  setValue(value) {
    this.value = value;
  }

  /**
   * 获取统一变量的值
   * 返回当前统一变量存储的值
   *
   * @return {any} 统一变量的值
   */
  getValue() {
    return this.value;
  }
}

/**
 * 数字统一变量类
 *
 * 表示单个浮点数或整数的统一变量，对应着色器中的float或int类型。
 * 在STD140布局中，单个数字占用4字节，边界对齐为4字节。
 *
 * @private
 * @augments Uniform
 */
class NumberUniform extends Uniform {
  /**
   * 构造一个新的数字统一变量
   *
   * @param {string} name - 统一变量的名称
   * @param {number} value - 统一变量的数值，默认为0
   */
  constructor(name, value = 0) {
    // 调用父类构造函数
    super(name, value);

    /**
     * 用于类型测试的标志
     * 标识此对象为数字统一变量类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isNumberUniform = true;

    // STD140布局：单个float的边界对齐为4字节
    this.boundary = 4;
    // 单个数字包含1个组件
    this.itemSize = 1;
  }
}

/**
 * 二维向量统一变量类
 *
 * 表示二维向量的统一变量，对应着色器中的vec2类型。
 * 包含x和y两个浮点数分量，在STD140布局中占用8字节。
 *
 * @private
 * @augments Uniform
 */
class Vector2Uniform extends Uniform {
  /**
   * 构造一个新的二维向量统一变量
   *
   * @param {string} name - 统一变量的名称
   * @param {Vector2} value - 统一变量的二维向量值，默认为零向量
   */
  constructor(name, value = new Vector2()) {
    // 调用父类构造函数
    super(name, value);

    /**
     * 用于类型测试的标志
     * 标识此对象为二维向量统一变量类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isVector2Uniform = true;

    // STD140布局：vec2的边界对齐为8字节
    this.boundary = 8;
    // 二维向量包含2个组件（x, y）
    this.itemSize = 2;
  }
}

/**
 * 三维向量统一变量类
 *
 * 表示三维向量的统一变量，对应着色器中的vec3类型。
 * 包含x、y、z三个浮点数分量，在STD140布局中边界对齐为16字节。
 *
 * @private
 * @augments Uniform
 */
class Vector3Uniform extends Uniform {
  /**
   * 构造一个新的三维向量统一变量
   *
   * @param {string} name - 统一变量的名称
   * @param {Vector3} value - 统一变量的三维向量值，默认为零向量
   */
  constructor(name, value = new Vector3()) {
    // 调用父类构造函数
    super(name, value);

    /**
     * 用于类型测试的标志
     * 标识此对象为三维向量统一变量类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isVector3Uniform = true;

    // STD140布局：vec3的边界对齐为16字节（与vec4相同）
    this.boundary = 16;
    // 三维向量包含3个组件（x, y, z）
    this.itemSize = 3;
  }
}

/**
 * 四维向量统一变量类
 *
 * 表示四维向量的统一变量，对应着色器中的vec4类型。
 * 包含x、y、z、w四个浮点数分量，在STD140布局中占用16字节。
 *
 * @private
 * @augments Uniform
 */
class Vector4Uniform extends Uniform {
  /**
   * 构造一个新的四维向量统一变量
   *
   * @param {string} name - 统一变量的名称
   * @param {Vector4} value - 统一变量的四维向量值，默认为零向量
   */
  constructor(name, value = new Vector4()) {
    // 调用父类构造函数
    super(name, value);

    /**
     * 用于类型测试的标志
     * 标识此对象为四维向量统一变量类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isVector4Uniform = true;

    // STD140布局：vec4的边界对齐为16字节
    this.boundary = 16;
    // 四维向量包含4个组件（x, y, z, w）
    this.itemSize = 4;
  }
}

/**
 * 颜色统一变量类
 *
 * 表示颜色的统一变量，对应着色器中的vec3类型。
 * 包含红、绿、蓝三个颜色分量，在STD140布局中边界对齐为16字节。
 *
 * @private
 * @augments Uniform
 */
class ColorUniform extends Uniform {
  /**
   * 构造一个新的颜色统一变量
   *
   * @param {string} name - 统一变量的名称
   * @param {Color} value - 统一变量的颜色值，默认为黑色
   */
  constructor(name, value = new Color()) {
    // 调用父类构造函数
    super(name, value);

    /**
     * 用于类型测试的标志
     * 标识此对象为颜色统一变量类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isColorUniform = true;

    // STD140布局：颜色作为vec3，边界对齐为16字节
    this.boundary = 16;
    // 颜色包含3个组件（r, g, b）
    this.itemSize = 3;
  }
}

/**
 * 2x2矩阵统一变量类
 *
 * 表示2x2矩阵的统一变量，对应着色器中的mat2类型。
 * 包含4个浮点数元素，在STD140布局中按列存储。
 *
 * @private
 * @augments Uniform
 */
class Matrix2Uniform extends Uniform {
  /**
   * 构造一个新的2x2矩阵统一变量
   *
   * @param {string} name - 统一变量的名称
   * @param {Matrix2} value - 统一变量的2x2矩阵值，默认为单位矩阵
   */
  constructor(name, value = new Matrix2()) {
    // 调用父类构造函数
    super(name, value);

    /**
     * 用于类型测试的标志
     * 标识此对象为2x2矩阵统一变量类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMatrix2Uniform = true;

    // STD140布局：mat2的边界对齐为8字节（每列作为vec2）
    this.boundary = 8;
    // 2x2矩阵包含4个元素
    this.itemSize = 4;
  }
}

/**
 * 3x3矩阵统一变量类
 *
 * 表示3x3矩阵的统一变量，对应着色器中的mat3类型。
 * 包含9个浮点数元素，在STD140布局中按列存储，每列作为vec3处理。
 *
 * @private
 * @augments Uniform
 */
class Matrix3Uniform extends Uniform {
  /**
   * 构造一个新的3x3矩阵统一变量
   *
   * @param {string} name - 统一变量的名称
   * @param {Matrix3} value - 统一变量的3x3矩阵值，默认为单位矩阵
   */
  constructor(name, value = new Matrix3()) {
    // 调用父类构造函数
    super(name, value);

    /**
     * 用于类型测试的标志
     * 标识此对象为3x3矩阵统一变量类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMatrix3Uniform = true;

    // STD140布局：mat3的边界对齐为48字节（3列 × 16字节/列）
    this.boundary = 48;
    // 3x3矩阵包含9个元素，但在STD140中按12个元素存储（每列4个元素）
    this.itemSize = 12;
  }
}

/**
 * 4x4矩阵统一变量类
 *
 * 表示4x4矩阵的统一变量，对应着色器中的mat4类型。
 * 包含16个浮点数元素，在STD140布局中按列存储，每列作为vec4处理。
 *
 * @private
 * @augments Uniform
 */
class Matrix4Uniform extends Uniform {
  /**
   * 构造一个新的4x4矩阵统一变量
   *
   * @param {string} name - 统一变量的名称
   * @param {Matrix4} value - 统一变量的4x4矩阵值，默认为单位矩阵
   */
  constructor(name, value = new Matrix4()) {
    // 调用父类构造函数
    super(name, value);

    /**
     * 用于类型测试的标志
     * 标识此对象为4x4矩阵统一变量类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMatrix4Uniform = true;

    // STD140布局：mat4的边界对齐为64字节（4列 × 16字节/列）
    this.boundary = 64;
    // 4x4矩阵包含16个元素
    this.itemSize = 16;
  }
}

// 导出所有统一变量类
export {
  NumberUniform, // 数字统一变量
  Vector2Uniform, // 二维向量统一变量
  Vector3Uniform, // 三维向量统一变量
  Vector4Uniform, // 四维向量统一变量
  ColorUniform, // 颜色统一变量
  Matrix2Uniform, // 2x2矩阵统一变量
  Matrix3Uniform, // 3x3矩阵统一变量
  Matrix4Uniform, // 4x4矩阵统一变量
};
