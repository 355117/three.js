// 导入数学工具函数中的clamp函数
import { clamp } from "../math/MathUtils.js";

// 快速半精度浮点数转换工具
// 参考：http://www.fox-toolkit.org/ftp/fasthalffloatconversion.pdf
// 用于在32位浮点数和16位半精度浮点数之间进行高效转换

// 生成转换所需的查找表（使用纯函数标记进行优化）
const _tables = /*@__PURE__*/ _generateTables();

/**
 * 生成半精度浮点数转换所需的查找表
 * 创建用于float32到float16以及float16到float32转换的查找表
 * @returns {Object} 包含所有转换表的对象
 */
function _generateTables() {
  // float32到float16的辅助工具
  // 用于将32位浮点数转换为16位半精度浮点数

  const buffer = new ArrayBuffer(4); // 创建4字节的缓冲区
  const floatView = new Float32Array(buffer); // 32位浮点数视图
  const uint32View = new Uint32Array(buffer); // 32位无符号整数视图

  const baseTable = new Uint32Array(512); // 基础转换表，存储转换的基础值
  const shiftTable = new Uint32Array(512); // 位移转换表，存储需要的位移量

  // 为每个可能的指数值生成转换表项
  for (let i = 0; i < 256; ++i) {
    const e = i - 127; // 计算实际指数值（减去IEEE 754偏移量127）

    // 非常小的数字（0, -0）
    // 当指数小于-27时，结果为零
    if (e < -27) {
      baseTable[i] = 0x0000; // 正零的基础值
      baseTable[i | 0x100] = 0x8000; // 负零的基础值（设置符号位）
      shiftTable[i] = 24; // 位移量，完全右移
      shiftTable[i | 0x100] = 24; // 负数的位移量

      // 小数字（非规格化数）
      // 当指数在-27到-14之间时，使用非规格化表示
    } else if (e < -14) {
      baseTable[i] = 0x0400 >> (-e - 14); // 计算非规格化数的基础值
      baseTable[i | 0x100] = (0x0400 >> (-e - 14)) | 0x8000; // 负数版本
      shiftTable[i] = -e - 1; // 计算所需的位移量
      shiftTable[i | 0x100] = -e - 1; // 负数的位移量

      // 正常数字（规格化数）
      // 当指数在-14到15之间时，使用标准的半精度表示
    } else if (e <= 15) {
      baseTable[i] = (e + 15) << 10; // 计算规格化数的基础值（指数+偏移量）
      baseTable[i | 0x100] = ((e + 15) << 10) | 0x8000; // 负数版本
      shiftTable[i] = 13; // 标准位移量（32位尾数到10位尾数）
      shiftTable[i | 0x100] = 13; // 负数的标准位移量

      // 大数字（无穷大，-无穷大）
      // 当指数在15到128之间时，结果为无穷大
    } else if (e < 128) {
      baseTable[i] = 0x7c00; // 正无穷大
      baseTable[i | 0x100] = 0xfc00; // 负无穷大
      shiftTable[i] = 24; // 位移量，完全右移
      shiftTable[i | 0x100] = 24; // 负数的位移量

      // 保持不变（NaN，无穷大，-无穷大）
      // 当指数为128时（特殊值）
    } else {
      baseTable[i] = 0x7c00; // NaN或无穷大
      baseTable[i | 0x100] = 0xfc00; // 负NaN或负无穷大
      shiftTable[i] = 13; // 保持尾数位
      shiftTable[i | 0x100] = 13; // 负数的尾数位
    }
  }

  // float16到float32的辅助工具
  // 用于将16位半精度浮点数转换为32位浮点数

  const mantissaTable = new Uint32Array(2048); // 尾数转换表
  const exponentTable = new Uint32Array(64); // 指数转换表
  const offsetTable = new Uint32Array(64); // 偏移转换表

  // 生成尾数转换表（非规格化数部分）
  // 处理半精度浮点数中的非规格化数转换
  for (let i = 1; i < 1024; ++i) {
    let m = i << 13; // 零填充尾数位，左移13位对齐到32位格式
    let e = 0; // 初始指数为零

    // 规格化处理：找到第一个1位
    // 将非规格化数转换为规格化数
    while ((m & 0x00800000) === 0) {
      m <<= 1; // 左移尾数，寻找隐含的1位
      e -= 0x00800000; // 递减指数（以32位格式）
    }

    m &= ~0x00800000; // 清除前导1位（隐含位）
    e += 0x38800000; // 调整偏移量，从半精度偏移转换为单精度偏移

    mantissaTable[i] = m | e; // 组合尾数和指数
  }

  // 生成尾数转换表（规格化数部分）
  // 处理半精度浮点数中的规格化数转换
  for (let i = 1024; i < 2048; ++i) {
    mantissaTable[i] = 0x38000000 + ((i - 1024) << 13); // 直接计算规格化数的32位表示
  }

  // 生成指数转换表（正指数部分）
  // 将半精度指数转换为单精度指数
  for (let i = 1; i < 31; ++i) {
    exponentTable[i] = i << 23; // 标准指数转换，左移23位到单精度位置
  }

  exponentTable[31] = 0x47800000; // 特殊值：半精度无穷大对应的单精度值
  exponentTable[32] = 0x80000000; // 特殊值：负零

  // 生成指数转换表（负指数部分）
  // 处理负数的指数转换
  for (let i = 33; i < 63; ++i) {
    exponentTable[i] = 0x80000000 + ((i - 32) << 23); // 负数指数转换
  }

  exponentTable[63] = 0xc7800000; // 特殊值：半精度负无穷大对应的单精度值

  // 生成偏移转换表
  // 用于处理查找表的索引偏移
  for (let i = 1; i < 64; ++i) {
    if (i !== 32) {
      // 跳过特殊索引32（对应负零）
      offsetTable[i] = 1024; // 设置标准偏移值
    }
  }

  // 返回所有转换表的对象
  return {
    floatView: floatView, // 32位浮点数视图，用于类型转换
    uint32View: uint32View, // 32位无符号整数视图，用于位操作
    baseTable: baseTable, // 基础转换表，存储转换的基础值
    shiftTable: shiftTable, // 位移转换表，存储需要的位移量
    mantissaTable: mantissaTable, // 尾数转换表，用于float16到float32
    exponentTable: exponentTable, // 指数转换表，用于float16到float32
    offsetTable: offsetTable, // 偏移转换表，用于查找表索引计算
  };
}

/**
 * 将单精度浮点数（FP32）转换为半精度浮点数（FP16）
 * 从给定的单精度浮点数值返回半精度浮点数值
 *
 * @param {number} val - 单精度浮点数值
 * @return {number} 半精度浮点数值
 */
function toHalfFloat(val) {
  // 检查值是否超出半精度浮点数的范围（±65504）
  if (Math.abs(val) > 65504) console.warn("THREE.DataUtils.toHalfFloat(): Value out of range.");

  // 将值限制在半精度浮点数的有效范围内
  val = clamp(val, -65504, 65504);

  // 将浮点数写入共享缓冲区
  _tables.floatView[0] = val;
  // 以32位无符号整数的形式读取相同的数据
  const f = _tables.uint32View[0];
  // 提取指数部分（位23-31，加上符号位处理）
  const e = (f >> 23) & 0x1ff;
  // 使用查找表进行转换：基础值 + 处理后的尾数
  return _tables.baseTable[e] + ((f & 0x007fffff) >> _tables.shiftTable[e]);
}

/**
 * 将半精度浮点数（FP16）转换为单精度浮点数（FP32）
 * 从给定的半精度浮点数值返回单精度浮点数值
 *
 * @param {number} val - 半精度浮点数值
 * @return {number} 单精度浮点数值
 */
function fromHalfFloat(val) {
  // 提取指数和符号位（高6位）
  const m = val >> 10;
  // 使用查找表进行转换：尾数表 + 指数表
  // (val & 0x3ff) 提取尾数部分（低10位）
  _tables.uint32View[0] = _tables.mantissaTable[_tables.offsetTable[m] + (val & 0x3ff)] + _tables.exponentTable[m];
  // 以32位浮点数的形式返回结果
  return _tables.floatView[0];
}

/**
 * 包含数据处理工具函数的类
 * 提供半精度浮点数转换等数据处理功能
 *
 * @hideconstructor
 */
class DataUtils {
  /**
   * 将单精度浮点数（FP32）转换为半精度浮点数（FP16）
   * 静态方法，从给定的单精度浮点数值返回半精度浮点数值
   *
   * @param {number} val - 单精度浮点数值
   * @return {number} 半精度浮点数值
   */
  static toHalfFloat(val) {
    return toHalfFloat(val); // 调用内部转换函数
  }

  /**
   * 将半精度浮点数（FP16）转换为单精度浮点数（FP32）
   * 静态方法，从给定的半精度浮点数值返回单精度浮点数值
   *
   * @param {number} val - 半精度浮点数值
   * @return {number} 单精度浮点数值
   */
  static fromHalfFloat(val) {
    return fromHalfFloat(val); // 调用内部转换函数
  }
}

// 导出转换函数和DataUtils类
// toHalfFloat: 单精度到半精度转换函数
// fromHalfFloat: 半精度到单精度转换函数
// DataUtils: 数据工具类，提供静态方法接口
export { toHalfFloat, fromHalfFloat, DataUtils };
