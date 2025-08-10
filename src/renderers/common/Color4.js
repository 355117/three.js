/**
 * Color4.js
 *
 * 四分量颜色类 - 带有Alpha通道的颜色
 *
 * 这是{@link Color}的四分量版本，渲染器内部使用它来
 * 将带有Alpha的清除颜色表示为一个对象。
 */

// 导入基础颜色类
import { Color } from "../../math/Color.js";

/**
 * 四分量颜色类
 *
 * {@link Color}的四分量版本，渲染器内部使用它来将带有Alpha的
 * 清除颜色表示为一个对象。这个类扩展了基础Color类，添加了
 * Alpha通道支持，用于处理透明度和混合操作。
 *
 * @private
 * @augments Color
 */
class Color4 extends Color {
  /**
   * 构造新的四分量颜色
   *
   * 创建一个新的四分量颜色实例。你也可以向此构造函数传递
   * 单个THREE.Color、十六进制值或字符串参数。
   *
   * @param {number|string} [r=1] - 红色值，或者Color对象/十六进制/字符串
   * @param {number} [g=1] - 绿色值
   * @param {number} [b=1] - 蓝色值
   * @param {number} [a=1] - Alpha值（透明度）
   */
  constructor(r, g, b, a = 1) {
    // 调用父类构造函数设置RGB分量
    super(r, g, b);

    /**
     * Alpha分量（透明度）
     *
     * 控制颜色的透明度，取值范围0.0到1.0。
     *
     * @type {number}
     * @default 1
     */
    this.a = a;
  }

  /**
   * 设置颜色值（重写默认方法以支持Alpha）
   *
   * 重写默认方法以支持Alpha通道。你也可以向此方法传递
   * 单个THREE.Color、十六进制值或字符串参数。
   *
   * @param {number|string|import('../../math/Color.js').Color} r - 红色值，或者Color对象/十六进制/字符串
   * @param {number} [g] - 绿色值
   * @param {number} [b] - 蓝色值
   * @param {number} [a=1] - Alpha值
   * @return {Color4} 返回此对象的引用，支持链式调用
   */
  set(r, g, b, a = 1) {
    // 设置Alpha值
    this.a = a;

    // 调用父类方法设置RGB值
    return super.set(r, g, b);
  }

  /**
   * 复制颜色（重写默认方法以支持Alpha）
   *
   * 重写默认方法以支持Alpha通道的复制。如果源颜色
   * 包含Alpha分量，则会被复制。
   *
   * @param {Color4} color - 要复制的颜色对象
   * @return {Color4} 返回此对象的引用，支持链式调用
   */
  copy(color) {
    // 如果源颜色有Alpha分量，则复制它
    if (color.a !== undefined) this.a = color.a;

    // 调用父类方法复制RGB分量
    return super.copy(color);
  }

  /**
   * 克隆颜色（重写默认方法以支持Alpha）
   *
   * 重写默认方法以支持Alpha通道的克隆。创建包含
   * 所有RGBA分量的新Color4实例。
   *
   * @return {Color4} 克隆的颜色对象
   */
  clone() {
    // 使用当前的RGBA值创建新实例
    return new this.constructor(this.r, this.g, this.b, this.a);
  }
}

export default Color4;
