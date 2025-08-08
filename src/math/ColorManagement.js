// 导入颜色空间常量和相关工具类
import { SRGBColorSpace, LinearSRGBColorSpace, SRGBTransfer, LinearTransfer, NoColorSpace } from "../constants.js";
import { Matrix3 } from "./Matrix3.js";
import { warnOnce } from "../utils.js";

// 线性 Rec.709 RGB 到 XYZ 颜色空间的转换矩阵
// 基于 ITU-R BT.709 标准的色彩原色定义
const LINEAR_REC709_TO_XYZ = /*@__PURE__*/ new Matrix3().set(0.4123908, 0.3575843, 0.1804808, 0.212639, 0.7151687, 0.0721923, 0.0193308, 0.1191948, 0.9505322);

// XYZ 颜色空间到线性 Rec.709 RGB 的转换矩阵
// 是上述矩阵的逆矩阵，用于从 XYZ 转换回 RGB
const XYZ_TO_LINEAR_REC709 = /*@__PURE__*/ new Matrix3().set(3.2409699, -1.5373832, -0.4986108, -0.9692436, 1.8759675, 0.0415551, 0.0556301, -0.203977, 1.0569715);

/**
 * 创建颜色管理对象的工厂函数
 * 用于管理不同颜色空间之间的转换和配置
 */
function createColorManagement() {
  const ColorManagement = {
    // 是否启用颜色管理功能
    enabled: true,

    // 工作颜色空间，默认为线性 sRGB
    workingColorSpace: LinearSRGBColorSpace,

    /**
     * 支持的颜色空间实现配置
     *
     * 必需属性：
     *	- primaries: 色度坐标 [ rx ry gx gy bx by ] - 定义红、绿、蓝三原色的色度坐标
     *	- whitePoint: 参考白点 [ x y ] - 定义白色的色度坐标
     *	- transfer: 传输函数（预定义） - 定义伽马校正或线性传输
     *	- toXYZ: Matrix3 RGB 到 XYZ 的转换矩阵
     *	- fromXYZ: Matrix3 XYZ 到 RGB 的转换矩阵
     *	- luminanceCoefficients: RGB 亮度系数 - 用于计算亮度的权重
     *
     * 可选属性：
     *  - outputColorSpaceConfig: { drawingBufferColorSpace: ColorSpace, toneMappingMode: 'extended' | 'standard' }
     *    输出颜色空间配置，包括绘制缓冲区颜色空间和色调映射模式
     *  - workingColorSpaceConfig: { unpackColorSpace: ColorSpace }
     *    工作颜色空间配置，包括解包颜色空间
     *
     * 参考资料：
     * - https://www.russellcottrell.com/photo/matrixCalculator.htm
     */
    spaces: {},

    /**
     * 在不同颜色空间之间转换颜色
     * @param {Color} color - 要转换的颜色对象
     * @param {string} sourceColorSpace - 源颜色空间
     * @param {string} targetColorSpace - 目标颜色空间
     * @returns {Color} 转换后的颜色对象
     */
    convert: function (color, sourceColorSpace, targetColorSpace) {
      // 如果颜色管理被禁用，或源和目标颜色空间相同，或颜色空间无效，则直接返回原颜色
      if (this.enabled === false || sourceColorSpace === targetColorSpace || !sourceColorSpace || !targetColorSpace) {
        return color;
      }

      // 如果源颜色空间使用 sRGB 传输函数，先转换为线性空间
      if (this.spaces[sourceColorSpace].transfer === SRGBTransfer) {
        color.r = SRGBToLinear(color.r);
        color.g = SRGBToLinear(color.g);
        color.b = SRGBToLinear(color.b);
      }

      // 如果源和目标颜色空间的三原色不同，需要通过 XYZ 空间进行转换
      if (this.spaces[sourceColorSpace].primaries !== this.spaces[targetColorSpace].primaries) {
        // 先转换到 XYZ 颜色空间
        color.applyMatrix3(this.spaces[sourceColorSpace].toXYZ);
        // 再从 XYZ 转换到目标颜色空间
        color.applyMatrix3(this.spaces[targetColorSpace].fromXYZ);
      }

      // 如果目标颜色空间使用 sRGB 传输函数，从线性空间转换为 sRGB
      if (this.spaces[targetColorSpace].transfer === SRGBTransfer) {
        color.r = LinearToSRGB(color.r);
        color.g = LinearToSRGB(color.g);
        color.b = LinearToSRGB(color.b);
      }

      return color;
    },

    /**
     * 将颜色从工作颜色空间转换到指定颜色空间
     * @param {Color} color - 要转换的颜色对象
     * @param {string} targetColorSpace - 目标颜色空间
     * @returns {Color} 转换后的颜色对象
     */
    workingToColorSpace: function (color, targetColorSpace) {
      return this.convert(color, this.workingColorSpace, targetColorSpace);
    },

    /**
     * 将颜色从指定颜色空间转换到工作颜色空间
     * @param {Color} color - 要转换的颜色对象
     * @param {string} sourceColorSpace - 源颜色空间
     * @returns {Color} 转换后的颜色对象
     */
    colorSpaceToWorking: function (color, sourceColorSpace) {
      return this.convert(color, sourceColorSpace, this.workingColorSpace);
    },

    /**
     * 获取指定颜色空间的三原色坐标
     * @param {string} colorSpace - 颜色空间名称
     * @returns {Array} 三原色的色度坐标数组 [rx, ry, gx, gy, bx, by]
     */
    getPrimaries: function (colorSpace) {
      return this.spaces[colorSpace].primaries;
    },

    /**
     * 获取指定颜色空间的传输函数
     * @param {string} colorSpace - 颜色空间名称
     * @returns {string} 传输函数类型
     */
    getTransfer: function (colorSpace) {
      // 如果是无颜色空间，返回线性传输
      if (colorSpace === NoColorSpace) return LinearTransfer;

      return this.spaces[colorSpace].transfer;
    },

    /**
     * 获取指定颜色空间的色调映射模式
     * @param {string} colorSpace - 颜色空间名称
     * @returns {string} 色调映射模式，默认为 "standard"
     */
    getToneMappingMode: function (colorSpace) {
      return this.spaces[colorSpace].outputColorSpaceConfig.toneMappingMode || "standard";
    },

    /**
     * 获取指定颜色空间的亮度系数
     * @param {Vector3} target - 用于存储结果的向量对象
     * @param {string} colorSpace - 颜色空间名称，默认为工作颜色空间
     * @returns {Vector3} 包含亮度系数的向量对象
     */
    getLuminanceCoefficients: function (target, colorSpace = this.workingColorSpace) {
      return target.fromArray(this.spaces[colorSpace].luminanceCoefficients);
    },

    /**
     * 定义新的颜色空间配置
     * @param {Object} colorSpaces - 颜色空间配置对象
     */
    define: function (colorSpaces) {
      Object.assign(this.spaces, colorSpaces);
    },

    // 内部 API

    /**
     * 获取从源颜色空间到目标颜色空间的转换矩阵
     * @param {Matrix3} targetMatrix - 用于存储结果的矩阵对象
     * @param {string} sourceColorSpace - 源颜色空间
     * @param {string} targetColorSpace - 目标颜色空间
     * @returns {Matrix3} 转换矩阵
     */
    _getMatrix: function (targetMatrix, sourceColorSpace, targetColorSpace) {
      return targetMatrix.copy(this.spaces[sourceColorSpace].toXYZ).multiply(this.spaces[targetColorSpace].fromXYZ);
    },

    /**
     * 获取指定颜色空间的绘制缓冲区颜色空间
     * @param {string} colorSpace - 颜色空间名称
     * @returns {string} 绘制缓冲区颜色空间
     */
    _getDrawingBufferColorSpace: function (colorSpace) {
      return this.spaces[colorSpace].outputColorSpaceConfig.drawingBufferColorSpace;
    },

    /**
     * 获取指定颜色空间的解包颜色空间
     * @param {string} colorSpace - 颜色空间名称，默认为工作颜色空间
     * @returns {string} 解包颜色空间
     */
    _getUnpackColorSpace: function (colorSpace = this.workingColorSpace) {
      return this.spaces[colorSpace].workingColorSpaceConfig.unpackColorSpace;
    },

    // 已弃用的方法

    /**
     * 从工作颜色空间转换颜色（已弃用）
     * @deprecated 请使用 workingToColorSpace() 方法
     */
    fromWorkingColorSpace: function (color, targetColorSpace) {
      warnOnce("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."); // @deprecated, r177

      return ColorManagement.workingToColorSpace(color, targetColorSpace);
    },

    /**
     * 转换颜色到工作颜色空间（已弃用）
     * @deprecated 请使用 colorSpaceToWorking() 方法
     */
    toWorkingColorSpace: function (color, sourceColorSpace) {
      warnOnce("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."); // @deprecated, r177

      return ColorManagement.colorSpaceToWorking(color, sourceColorSpace);
    },
  };

  /******************************************************************************
   * sRGB 颜色空间定义
   * 基于 ITU-R BT.709 标准和 IEC 61966-2-1 sRGB 规范
   */

  // Rec.709 标准的三原色色度坐标 [红x, 红y, 绿x, 绿y, 蓝x, 蓝y]
  const REC709_PRIMARIES = [0.64, 0.33, 0.3, 0.6, 0.15, 0.06];
  // Rec.709 标准的亮度系数，用于计算相对亮度
  const REC709_LUMINANCE_COEFFICIENTS = [0.2126, 0.7152, 0.0722];
  // D65 标准光源的白点色度坐标
  const D65 = [0.3127, 0.329];

  // 定义内置的颜色空间配置
  ColorManagement.define({
    // 线性 sRGB 颜色空间配置
    [LinearSRGBColorSpace]: {
      primaries: REC709_PRIMARIES, // 三原色坐标
      whitePoint: D65, // 白点坐标
      transfer: LinearTransfer, // 线性传输函数
      toXYZ: LINEAR_REC709_TO_XYZ, // 到 XYZ 的转换矩阵
      fromXYZ: XYZ_TO_LINEAR_REC709, // 从 XYZ 的转换矩阵
      luminanceCoefficients: REC709_LUMINANCE_COEFFICIENTS, // 亮度系数
      workingColorSpaceConfig: { unpackColorSpace: SRGBColorSpace }, // 工作空间配置
      outputColorSpaceConfig: { drawingBufferColorSpace: SRGBColorSpace }, // 输出配置
    },

    // 标准 sRGB 颜色空间配置（带伽马校正）
    [SRGBColorSpace]: {
      primaries: REC709_PRIMARIES, // 三原色坐标
      whitePoint: D65, // 白点坐标
      transfer: SRGBTransfer, // sRGB 传输函数（伽马校正）
      toXYZ: LINEAR_REC709_TO_XYZ, // 到 XYZ 的转换矩阵
      fromXYZ: XYZ_TO_LINEAR_REC709, // 从 XYZ 的转换矩阵
      luminanceCoefficients: REC709_LUMINANCE_COEFFICIENTS, // 亮度系数
      outputColorSpaceConfig: { drawingBufferColorSpace: SRGBColorSpace }, // 输出配置
    },
  });

  return ColorManagement;
}

// 导出颜色管理单例对象
export const ColorManagement = /*@__PURE__*/ createColorManagement();

/**
 * 将 sRGB 颜色值转换为线性颜色值
 * 实现 sRGB 到线性 RGB 的逆伽马校正
 * @param {number} c - sRGB 颜色分量值 (0-1)
 * @returns {number} 线性颜色分量值 (0-1)
 */
export function SRGBToLinear(c) {
  // sRGB 规范定义的分段函数：
  // 对于小值使用线性部分，对于大值使用幂函数
  return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
}

/**
 * 将线性颜色值转换为 sRGB 颜色值
 * 实现线性 RGB 到 sRGB 的伽马校正
 * @param {number} c - 线性颜色分量值 (0-1)
 * @returns {number} sRGB 颜色分量值 (0-1)
 */
export function LinearToSRGB(c) {
  // sRGB 规范定义的分段函数：
  // 对于小值使用线性部分，对于大值使用幂函数
  return c < 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 0.41666) - 0.055;
}
