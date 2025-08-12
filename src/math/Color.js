// 从数学工具模块导入夹紧、欧几里得模运算和线性插值函数
import { clamp, euclideanModulo, lerp } from "./MathUtils.js";
// 从颜色管理模块导入颜色管理器和转换函数
import { ColorManagement, SRGBToLinear, LinearToSRGB } from "./ColorManagement.js";
// 从常量模块导入sRGB颜色空间常量
import { SRGBColorSpace } from "../constants.js";

// CSS颜色关键字到十六进制值的映射表
// 包含所有标准CSS颜色名称及其对应的RGB十六进制值
const _colorKeywords = {
  aliceblue: 0xf0f8ff,
  antiquewhite: 0xfaebd7,
  aqua: 0x00ffff,
  aquamarine: 0x7fffd4,
  azure: 0xf0ffff,
  beige: 0xf5f5dc,
  bisque: 0xffe4c4,
  black: 0x000000,
  blanchedalmond: 0xffebcd,
  blue: 0x0000ff,
  blueviolet: 0x8a2be2,
  brown: 0xa52a2a,
  burlywood: 0xdeb887,
  cadetblue: 0x5f9ea0,
  chartreuse: 0x7fff00,
  chocolate: 0xd2691e,
  coral: 0xff7f50,
  cornflowerblue: 0x6495ed,
  cornsilk: 0xfff8dc,
  crimson: 0xdc143c,
  cyan: 0x00ffff,
  darkblue: 0x00008b,
  darkcyan: 0x008b8b,
  darkgoldenrod: 0xb8860b,
  darkgray: 0xa9a9a9,
  darkgreen: 0x006400,
  darkgrey: 0xa9a9a9,
  darkkhaki: 0xbdb76b,
  darkmagenta: 0x8b008b,
  darkolivegreen: 0x556b2f,
  darkorange: 0xff8c00,
  darkorchid: 0x9932cc,
  darkred: 0x8b0000,
  darksalmon: 0xe9967a,
  darkseagreen: 0x8fbc8f,
  darkslateblue: 0x483d8b,
  darkslategray: 0x2f4f4f,
  darkslategrey: 0x2f4f4f,
  darkturquoise: 0x00ced1,
  darkviolet: 0x9400d3,
  deeppink: 0xff1493,
  deepskyblue: 0x00bfff,
  dimgray: 0x696969,
  dimgrey: 0x696969,
  dodgerblue: 0x1e90ff,
  firebrick: 0xb22222,
  floralwhite: 0xfffaf0,
  forestgreen: 0x228b22,
  fuchsia: 0xff00ff,
  gainsboro: 0xdcdcdc,
  ghostwhite: 0xf8f8ff,
  gold: 0xffd700,
  goldenrod: 0xdaa520,
  gray: 0x808080,
  green: 0x008000,
  greenyellow: 0xadff2f,
  grey: 0x808080,
  honeydew: 0xf0fff0,
  hotpink: 0xff69b4,
  indianred: 0xcd5c5c,
  indigo: 0x4b0082,
  ivory: 0xfffff0,
  khaki: 0xf0e68c,
  lavender: 0xe6e6fa,
  lavenderblush: 0xfff0f5,
  lawngreen: 0x7cfc00,
  lemonchiffon: 0xfffacd,
  lightblue: 0xadd8e6,
  lightcoral: 0xf08080,
  lightcyan: 0xe0ffff,
  lightgoldenrodyellow: 0xfafad2,
  lightgray: 0xd3d3d3,
  lightgreen: 0x90ee90,
  lightgrey: 0xd3d3d3,
  lightpink: 0xffb6c1,
  lightsalmon: 0xffa07a,
  lightseagreen: 0x20b2aa,
  lightskyblue: 0x87cefa,
  lightslategray: 0x778899,
  lightslategrey: 0x778899,
  lightsteelblue: 0xb0c4de,
  lightyellow: 0xffffe0,
  lime: 0x00ff00,
  limegreen: 0x32cd32,
  linen: 0xfaf0e6,
  magenta: 0xff00ff,
  maroon: 0x800000,
  mediumaquamarine: 0x66cdaa,
  mediumblue: 0x0000cd,
  mediumorchid: 0xba55d3,
  mediumpurple: 0x9370db,
  mediumseagreen: 0x3cb371,
  mediumslateblue: 0x7b68ee,
  mediumspringgreen: 0x00fa9a,
  mediumturquoise: 0x48d1cc,
  mediumvioletred: 0xc71585,
  midnightblue: 0x191970,
  mintcream: 0xf5fffa,
  mistyrose: 0xffe4e1,
  moccasin: 0xffe4b5,
  navajowhite: 0xffdead,
  navy: 0x000080,
  oldlace: 0xfdf5e6,
  olive: 0x808000,
  olivedrab: 0x6b8e23,
  orange: 0xffa500,
  orangered: 0xff4500,
  orchid: 0xda70d6,
  palegoldenrod: 0xeee8aa,
  palegreen: 0x98fb98,
  paleturquoise: 0xafeeee,
  palevioletred: 0xdb7093,
  papayawhip: 0xffefd5,
  peachpuff: 0xffdab9,
  peru: 0xcd853f,
  pink: 0xffc0cb,
  plum: 0xdda0dd,
  powderblue: 0xb0e0e6,
  purple: 0x800080,
  rebeccapurple: 0x663399,
  red: 0xff0000,
  rosybrown: 0xbc8f8f,
  royalblue: 0x4169e1,
  saddlebrown: 0x8b4513,
  salmon: 0xfa8072,
  sandybrown: 0xf4a460,
  seagreen: 0x2e8b57,
  seashell: 0xfff5ee,
  sienna: 0xa0522d,
  silver: 0xc0c0c0,
  skyblue: 0x87ceeb,
  slateblue: 0x6a5acd,
  slategray: 0x708090,
  slategrey: 0x708090,
  snow: 0xfffafa,
  springgreen: 0x00ff7f,
  steelblue: 0x4682b4,
  tan: 0xd2b48c,
  teal: 0x008080,
  thistle: 0xd8bfd8,
  tomato: 0xff6347,
  turquoise: 0x40e0d0,
  violet: 0xee82ee,
  wheat: 0xf5deb3,
  white: 0xffffff,
  whitesmoke: 0xf5f5f5,
  yellow: 0xffff00,
  yellowgreen: 0x9acd32,
};

// 用于HSL颜色转换的临时对象A
const _hslA = { h: 0, s: 0, l: 0 };
// 用于HSL颜色转换的临时对象B
const _hslB = { h: 0, s: 0, l: 0 };

// HSL到RGB转换的辅助函数
// 将色相值转换为RGB分量
function hue2rgb(p, q, t) {
  // 确保t值在0-1范围内
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  // 根据色相位置计算RGB值
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * 6 * (2 / 3 - t);
  return p;
}

/**
 * 颜色实例由线性工作颜色空间中的RGB分量表示，默认为LinearSRGBColorSpace。
 * 传统上使用SRGBColorSpace的输入（如十六进制和CSS字符串）会自动转换为工作颜色空间。
 * A Color instance is represented by RGB components in the linear <i>working
 * color space</i>, which defaults to `LinearSRGBColorSpace`. Inputs
 * conventionally using `SRGBColorSpace` (such as hexadecimals and CSS
 * strings) are converted to the working color space automatically.
 *
 * ```js
 * // 自动从SRGBColorSpace转换为LinearSRGBColorSpace
 * // converted automatically from SRGBColorSpace to LinearSRGBColorSpace
 * const color = new THREE.Color().setHex( 0x112233 );
 * ```
 * 可以明确指定源颜色空间，以确保正确的转换。
 * Source color spaces may be specified explicitly, to ensure correct conversions.
 * ```js
 * // 假设已经是LinearSRGBColorSpace；无需转换
 * // assumed already LinearSRGBColorSpace; no conversion
 * const color = new THREE.Color().setRGB( 0.5, 0.5, 0.5 );
 *
 * // 明确从SRGBColorSpace转换为LinearSRGBColorSpace
 * // converted explicitly from SRGBColorSpace to LinearSRGBColorSpace
 * const color = new THREE.Color().setRGB( 0.5, 0.5, 0.5, SRGBColorSpace );
 * ```
 * 如果禁用THREE.ColorManagement，则不会发生转换。有关详细信息，请参阅颜色管理。
 * 遍历Color实例将按相应顺序产生其分量（r、g、b）。可以通过以下任何方式初始化Color：
 * If THREE.ColorManagement is disabled, no conversions occur. For details,
 * see <i>Color management</i>. Iterating through a Color instance will yield
 * its components (r, g, b) in the corresponding order. A Color can be initialised
 * in any of the following ways:
 * ```js
 * // 空构造函数 - 默认为白色
 * //empty constructor - will default white
 * const color1 = new THREE.Color();
 *
 * // 十六进制颜色（推荐）
 * //Hexadecimal color (recommended)
 * const color2 = new THREE.Color( 0xff0000 );
 *
 * // RGB字符串
 * //RGB string
 * const color3 = new THREE.Color("rgb(255, 0, 0)");
 * const color4 = new THREE.Color("rgb(100%, 0%, 0%)");
 *
 * // X11颜色名称 - 支持所有140种颜色名称
 * // 注意名称中没有驼峰命名
 * //X11 color name - all 140 color names are supported.
 * //Note the lack of CamelCase in the name
 * const color5 = new THREE.Color( 'skyblue' );
 * // HSL字符串
 * //HSL string
 * const color6 = new THREE.Color("hsl(0, 100%, 50%)");
 *
 * // 0到1之间的单独RGB值
 * //Separate RGB values between 0 and 1
 * const color7 = new THREE.Color( 1, 0, 0 );
 * ```
 */
class Color {
  /**
   * 构造一个新的颜色
   * Constructs a new color.
   *
   * 注意，在three.js中指定颜色的标准方法是使用十六进制三元组，
   * 该方法在文档的其余部分中使用。
   * Note that standard method of specifying color in three.js is with a hexadecimal triplet,
   * and that method is used throughout the rest of the documentation.
   *
   * @param {(number|string|Color)} [r] - 颜色的红色分量。如果未提供g和b，它可以是十六进制三元组、CSS样式字符串或另一个Color实例 The red component of the color. If `g` and `b` are not provided, it can be hexadecimal triplet, a CSS-style string or another `Color` instance.
   * @param {number} [g] - 绿色分量 The green component.
   * @param {number} [b] - 蓝色分量 The blue component.
   */
  constructor(r, g, b) {
    /**
     * 此标志可用于类型测试
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isColor = true;

    /**
     * 红色分量
     * The red component.
     *
     * @type {number}
     * @default 1
     */
    this.r = 1;

    /**
     * 绿色分量
     * The green component.
     *
     * @type {number}
     * @default 1
     */
    this.g = 1;

    /**
     * 蓝色分量
     * The blue component.
     *
     * @type {number}
     * @default 1
     */
    this.b = 1;

    // 使用提供的参数设置颜色值并返回实例
    return this.set(r, g, b);
  }

  /**
   * 从给定值设置颜色的分量
   * Sets the colors's components from the given values.
   *
   * @param {(number|string|Color)} [r] - 颜色的红色分量。如果未提供g和b，它可以是十六进制三元组、CSS样式字符串或另一个Color实例 The red component of the color. If `g` and `b` are not provided, it can be hexadecimal triplet, a CSS-style string or another `Color` instance.
   * @param {number} [g] - 绿色分量 The green component.
   * @param {number} [b] - 蓝色分量 The blue component.
   * @return {Color} 对此颜色的引用 A reference to this color.
   */
  set(r, g, b) {
    if (g === undefined && b === undefined) {
      // r是THREE.Color、十六进制或字符串
      // r is THREE.Color, hex or string

      const value = r;

      if (value && value.isColor) {
        // 如果是Color实例，直接复制
        this.copy(value);
      } else if (typeof value === "number") {
        // 如果是数字，作为十六进制处理
        this.setHex(value);
      } else if (typeof value === "string") {
        // 如果是字符串，作为CSS样式处理
        this.setStyle(value);
      }
    } else {
      // 如果提供了g和b，作为RGB值处理
      this.setRGB(r, g, b);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将颜色的分量设置为给定的标量值
   * Sets the colors's components to the given scalar value.
   *
   * @param {number} scalar - 标量值 The scalar value.
   * @return {Color} 对此颜色的引用 A reference to this color.
   */
  setScalar(scalar) {
    // 将所有RGB分量设置为相同的标量值
    this.r = scalar;
    this.g = scalar;
    this.b = scalar;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 从十六进制值设置此颜色
   * Sets this color from a hexadecimal value.
   *
   * @param {number} hex - 十六进制值 The hexadecimal value.
   * @param {string} [colorSpace=SRGBColorSpace] - 颜色空间 The color space.
   * @return {Color} 对此颜色的引用 A reference to this color.
   */
  setHex(hex, colorSpace = SRGBColorSpace) {
    // 确保十六进制值是整数
    hex = Math.floor(hex);

    // 从十六进制值中提取RGB分量
    // 右移16位并与255进行AND运算得到红色分量
    this.r = ((hex >> 16) & 255) / 255;
    // 右移8位并与255进行AND运算得到绿色分量
    this.g = ((hex >> 8) & 255) / 255;
    // 与255进行AND运算得到蓝色分量
    this.b = (hex & 255) / 255;

    // 将颜色从指定颜色空间转换为工作颜色空间
    ColorManagement.colorSpaceToWorking(this, colorSpace);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 从RGB值设置此颜色
   * Sets this color from RGB values.
   *
   * @param {number} r - 0.0到1.0之间的红色通道值 Red channel value between `0.0` and `1.0`.
   * @param {number} g - 0.0到1.0之间的绿色通道值 Green channel value between `0.0` and `1.0`.
   * @param {number} b - 0.0到1.0之间的蓝色通道值 Blue channel value between `0.0` and `1.0`.
   * @param {string} [colorSpace=ColorManagement.workingColorSpace] - 颜色空间 The color space.
   * @return {Color} 对此颜色的引用 A reference to this color.
   */
  setRGB(r, g, b, colorSpace = ColorManagement.workingColorSpace) {
    // 直接设置RGB分量
    this.r = r;
    this.g = g;
    this.b = b;

    // 将颜色从指定颜色空间转换为工作颜色空间
    ColorManagement.colorSpaceToWorking(this, colorSpace);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 从HSL值设置此颜色
   * Sets this color from RGB values.
   *
   * @param {number} h - 0.0到1.0之间的色相值 Hue value between `0.0` and `1.0`.
   * @param {number} s - 0.0到1.0之间的饱和度值 Saturation value between `0.0` and `1.0`.
   * @param {number} l - 0.0到1.0之间的亮度值 Lightness value between `0.0` and `1.0`.
   * @param {string} [colorSpace=ColorManagement.workingColorSpace] - 颜色空间 The color space.
   * @return {Color} 对此颜色的引用 A reference to this color.
   */
  setHSL(h, s, l, colorSpace = ColorManagement.workingColorSpace) {
    // h、s、l的范围都在0.0 - 1.0之间
    // h,s,l ranges are in 0.0 - 1.0
    h = euclideanModulo(h, 1); // 确保色相值在0-1范围内循环
    s = clamp(s, 0, 1); // 将饱和度夹紧在0-1范围内
    l = clamp(l, 0, 1); // 将亮度夹紧在0-1范围内

    if (s === 0) {
      // 如果饱和度为0，颜色是灰色，RGB分量都等于亮度值
      this.r = this.g = this.b = l;
    } else {
      // HSL到RGB的转换算法
      // 计算中间值p和q
      const p = l <= 0.5 ? l * (1 + s) : l + s - l * s;
      const q = 2 * l - p;

      // 使用hue2rgb函数计算RGB分量
      // 红色分量：色相偏移+1/3
      this.r = hue2rgb(q, p, h + 1 / 3);
      // 绿色分量：原始色相
      this.g = hue2rgb(q, p, h);
      // 蓝色分量：色相偏移-1/3
      this.b = hue2rgb(q, p, h - 1 / 3);
    }

    // 将颜色从指定颜色空间转换为工作颜色空间
    ColorManagement.colorSpaceToWorking(this, colorSpace);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 从CSS样式字符串设置此颜色。例如，rgb(250, 0,0)、rgb(100%, 0%, 0%)、
   * hsl(0, 100%, 50%)、#ff0000、#f00或red（或任何X11颜色名称 - 支持所有140种颜色名称）。
   * Sets this color from a CSS-style string. For example, `rgb(250, 0,0)`,
   * `rgb(100%, 0%, 0%)`, `hsl(0, 100%, 50%)`, `#ff0000`, `#f00`, or `red` ( or
   * any [X11 color name]{@link https://en.wikipedia.org/wiki/X11_color_names#Color_name_chart} -
   * all 140 color names are supported).
   *
   * @param {string} style - CSS样式字符串形式的颜色 Color as a CSS-style string.
   * @param {string} [colorSpace=SRGBColorSpace] - 颜色空间 The color space.
   * @return {Color} 对此颜色的引用 A reference to this color.
   */
  setStyle(style, colorSpace = SRGBColorSpace) {
    // 处理alpha通道的内部函数
    function handleAlpha(string) {
      if (string === undefined) return;

      // 如果alpha值小于1，发出警告（因为Color类不支持alpha）
      if (parseFloat(string) < 1) {
        console.warn("THREE.Color: Alpha component of " + style + " will be ignored.");
      }
    }

    let m;

    // 检查是否为函数式CSS颜色格式（如rgb()、hsl()）
    if ((m = /^(\w+)\(([^\)]*)\)/.exec(style))) {
      // rgb / hsl

      let color;
      const name = m[1]; // 函数名（rgb、rgba、hsl、hsla）
      const components = m[2]; // 括号内的参数

      switch (name) {
        case "rgb":
        case "rgba":
          // 匹配整数形式的RGB：rgb(255,0,0) rgba(255,0,0,0.5)
          if ((color = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(components))) {
            // rgb(255,0,0) rgba(255,0,0,0.5)

            // 处理可能的alpha值
            handleAlpha(color[4]);

            // 将0-255范围的整数转换为0-1范围的浮点数
            return this.setRGB(Math.min(255, parseInt(color[1], 10)) / 255, Math.min(255, parseInt(color[2], 10)) / 255, Math.min(255, parseInt(color[3], 10)) / 255, colorSpace);
          }

          // 匹配百分比形式的RGB：rgb(100%,0%,0%) rgba(100%,0%,0%,0.5)
          if ((color = /^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(components))) {
            // rgb(100%,0%,0%) rgba(100%,0%,0%,0.5)

            // 处理可能的alpha值
            handleAlpha(color[4]);

            // 将0-100范围的百分比转换为0-1范围的浮点数
            return this.setRGB(Math.min(100, parseInt(color[1], 10)) / 100, Math.min(100, parseInt(color[2], 10)) / 100, Math.min(100, parseInt(color[3], 10)) / 100, colorSpace);
          }

          break;

        case "hsl":
        case "hsla":
          // 匹配HSL格式：hsl(120,50%,50%) hsla(120,50%,50%,0.5)
          if ((color = /^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(components))) {
            // hsl(120,50%,50%) hsla(120,50%,50%,0.5)

            // 处理可能的alpha值
            handleAlpha(color[4]);

            // 将色相从0-360度转换为0-1，饱和度和亮度从0-100%转换为0-1
            return this.setHSL(parseFloat(color[1]) / 360, parseFloat(color[2]) / 100, parseFloat(color[3]) / 100, colorSpace);
          }

          break;

        default:
          // 未知的颜色模型
          console.warn("THREE.Color: Unknown color model " + style);
      }
    } else if ((m = /^\#([A-Fa-f\d]+)$/.exec(style))) {
      // 十六进制颜色
      // hex color

      const hex = m[1]; // 提取十六进制字符串
      const size = hex.length; // 获取长度

      if (size === 3) {
        // 3位十六进制格式：#ff0
        // #ff0
        // 每个字符代表一个颜色分量，需要除以15（0xF）来归一化
        return this.setRGB(parseInt(hex.charAt(0), 16) / 15, parseInt(hex.charAt(1), 16) / 15, parseInt(hex.charAt(2), 16) / 15, colorSpace);
      } else if (size === 6) {
        // 6位十六进制格式：#ff0000
        // #ff0000
        return this.setHex(parseInt(hex, 16), colorSpace);
      } else {
        // 无效的十六进制颜色格式
        console.warn("THREE.Color: Invalid hex color " + style);
      }
    } else if (style && style.length > 0) {
      // 如果不是函数式或十六进制格式，尝试作为颜色名称处理
      return this.setColorName(style, colorSpace);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 从颜色名称设置此颜色。如果不需要其他CSS样式格式，比setStyle更快。
   * Sets this color from a color name. Faster than {@link Color#setStyle} if
   * you don't need the other CSS-style formats.
   *
   * 为了方便，名称列表在Color.NAMES中作为哈希表公开。
   * For convenience, the list of names is exposed in `Color.NAMES` as a hash.
   * ```js
   * Color.NAMES.aliceblue // returns 0xF0F8FF
   * ```
   *
   * @param {string} style - 颜色名称 The color name.
   * @param {string} [colorSpace=SRGBColorSpace] - 颜色空间 The color space.
   * @return {Color} 对此颜色的引用 A reference to this color.
   */
  setColorName(style, colorSpace = SRGBColorSpace) {
    // 颜色关键字
    // color keywords
    const hex = _colorKeywords[style.toLowerCase()]; // 查找颜色名称对应的十六进制值

    if (hex !== undefined) {
      // 找到颜色名称，设置对应的十六进制值
      // red
      this.setHex(hex, colorSpace);
    } else {
      // 未知颜色名称
      // unknown color
      console.warn("THREE.Color: Unknown color " + style);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 返回一个复制了此实例值的新颜色
   * Returns a new color with copied values from this instance.
   *
   * @return {Color} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 使用当前RGB值创建新的颜色实例
    return new this.constructor(this.r, this.g, this.b);
  }

  /**
   * 将给定颜色的值复制到此实例
   * Copies the values of the given color to this instance.
   *
   * @param {Color} color - 要复制的颜色 The color to copy.
   * @return {Color} 对此颜色的引用 A reference to this color.
   */
  copy(color) {
    // 复制RGB分量
    this.r = color.r;
    this.g = color.g;
    this.b = color.b;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将给定颜色复制到此颜色，然后将此颜色从SRGBColorSpace转换为LinearSRGBColorSpace
   * Copies the given color into this color, and then converts this color from
   * `SRGBColorSpace` to `LinearSRGBColorSpace`.
   *
   * @param {Color} color - 要复制/转换的颜色 The color to copy/convert.
   * @return {Color} 对此颜色的引用 A reference to this color.
   */
  copySRGBToLinear(color) {
    // 复制并转换每个RGB分量从sRGB到线性空间
    this.r = SRGBToLinear(color.r);
    this.g = SRGBToLinear(color.g);
    this.b = SRGBToLinear(color.b);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将给定颜色复制到此颜色，然后将此颜色从LinearSRGBColorSpace转换为SRGBColorSpace
   * Copies the given color into this color, and then converts this color from
   * `LinearSRGBColorSpace` to `SRGBColorSpace`.
   *
   * @param {Color} color - 要复制/转换的颜色 The color to copy/convert.
   * @return {Color} 对此颜色的引用 A reference to this color.
   */
  copyLinearToSRGB(color) {
    // 复制并转换每个RGB分量从线性空间到sRGB
    this.r = LinearToSRGB(color.r);
    this.g = LinearToSRGB(color.g);
    this.b = LinearToSRGB(color.b);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将此颜色从SRGBColorSpace转换为LinearSRGBColorSpace
   * Converts this color from `SRGBColorSpace` to `LinearSRGBColorSpace`.
   *
   * @return {Color} 对此颜色的引用 A reference to this color.
   */
  convertSRGBToLinear() {
    // 使用自身作为源进行sRGB到线性转换
    this.copySRGBToLinear(this);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将此颜色从LinearSRGBColorSpace转换为SRGBColorSpace
   * Converts this color from `LinearSRGBColorSpace` to `SRGBColorSpace`.
   *
   * @return {Color} 对此颜色的引用 A reference to this color.
   */
  convertLinearToSRGB() {
    // 使用自身作为源进行线性到sRGB转换
    this.copyLinearToSRGB(this);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 返回此颜色的十六进制值
   * Returns the hexadecimal value of this color.
   *
   * @param {string} [colorSpace=SRGBColorSpace] - 颜色空间 The color space.
   * @return {number} 十六进制值 The hexadecimal value.
   */
  getHex(colorSpace = SRGBColorSpace) {
    // 将颜色从工作颜色空间转换到指定颜色空间
    ColorManagement.workingToColorSpace(_color.copy(this), colorSpace);

    // 将RGB分量转换为十六进制值
    // 红色分量左移16位，绿色分量左移8位，蓝色分量不移位，然后相加
    return Math.round(clamp(_color.r * 255, 0, 255)) * 65536 + Math.round(clamp(_color.g * 255, 0, 255)) * 256 + Math.round(clamp(_color.b * 255, 0, 255));
  }

  /**
   * 返回此颜色的十六进制值作为字符串（例如，'FFFFFF'）
   * Returns the hexadecimal value of this color as a string (for example, 'FFFFFF').
   *
   * @param {string} [colorSpace=SRGBColorSpace] - 颜色空间 The color space.
   * @return {string} 十六进制值字符串 The hexadecimal value as a string.
   */
  getHexString(colorSpace = SRGBColorSpace) {
    // 获取十六进制值，转换为16进制字符串，并确保是6位数
    return ("000000" + this.getHex(colorSpace).toString(16)).slice(-6);
  }

  /**
   * Converts the colors RGB values into the HSL format and stores them into the
   * given target object.
   *
   * @param {{h:number,s:number,l:number}} target - The target object that is used to store the method's result.
   * @param {string} [colorSpace=ColorManagement.workingColorSpace] - The color space.
   * @return {{h:number,s:number,l:number}} The HSL representation of this color.
   */
  getHSL(target, colorSpace = ColorManagement.workingColorSpace) {
    // h,s,l ranges are in 0.0 - 1.0

    ColorManagement.workingToColorSpace(_color.copy(this), colorSpace);

    const r = _color.r,
      g = _color.g,
      b = _color.b;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    let hue, saturation;
    const lightness = (min + max) / 2.0;

    if (min === max) {
      hue = 0;
      saturation = 0;
    } else {
      const delta = max - min;

      saturation = lightness <= 0.5 ? delta / (max + min) : delta / (2 - max - min);

      switch (max) {
        case r:
          hue = (g - b) / delta + (g < b ? 6 : 0);
          break;
        case g:
          hue = (b - r) / delta + 2;
          break;
        case b:
          hue = (r - g) / delta + 4;
          break;
      }

      hue /= 6;
    }

    target.h = hue;
    target.s = saturation;
    target.l = lightness;

    return target;
  }

  /**
   * Returns the RGB values of this color and stores them into the given target object.
   *
   * @param {Color} target - The target color that is used to store the method's result.
   * @param {string} [colorSpace=ColorManagement.workingColorSpace] - The color space.
   * @return {Color} The RGB representation of this color.
   */
  getRGB(target, colorSpace = ColorManagement.workingColorSpace) {
    ColorManagement.workingToColorSpace(_color.copy(this), colorSpace);

    target.r = _color.r;
    target.g = _color.g;
    target.b = _color.b;

    return target;
  }

  /**
   * Returns the value of this color as a CSS style string. Example: `rgb(255,0,0)`.
   *
   * @param {string} [colorSpace=SRGBColorSpace] - The color space.
   * @return {string} The CSS representation of this color.
   */
  getStyle(colorSpace = SRGBColorSpace) {
    ColorManagement.workingToColorSpace(_color.copy(this), colorSpace);

    const r = _color.r,
      g = _color.g,
      b = _color.b;

    if (colorSpace !== SRGBColorSpace) {
      // Requires CSS Color Module Level 4 (https://www.w3.org/TR/css-color-4/).
      return `color(${colorSpace} ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)})`;
    }

    return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
  }

  /**
   * Adds the given HSL values to this color's values.
   * Internally, this converts the color's RGB values to HSL, adds HSL
   * and then converts the color back to RGB.
   *
   * @param {number} h - Hue value between `0.0` and `1.0`.
   * @param {number} s - Saturation value between `0.0` and `1.0`.
   * @param {number} l - Lightness value between `0.0` and `1.0`.
   * @return {Color} A reference to this color.
   */
  offsetHSL(h, s, l) {
    this.getHSL(_hslA);

    return this.setHSL(_hslA.h + h, _hslA.s + s, _hslA.l + l);
  }

  /**
   * Adds the RGB values of the given color to the RGB values of this color.
   *
   * @param {Color} color - The color to add.
   * @return {Color} A reference to this color.
   */
  add(color) {
    this.r += color.r;
    this.g += color.g;
    this.b += color.b;

    return this;
  }

  /**
   * Adds the RGB values of the given colors and stores the result in this instance.
   *
   * @param {Color} color1 - The first color.
   * @param {Color} color2 - The second color.
   * @return {Color} A reference to this color.
   */
  addColors(color1, color2) {
    this.r = color1.r + color2.r;
    this.g = color1.g + color2.g;
    this.b = color1.b + color2.b;

    return this;
  }

  /**
   * Adds the given scalar value to the RGB values of this color.
   *
   * @param {number} s - The scalar to add.
   * @return {Color} A reference to this color.
   */
  addScalar(s) {
    this.r += s;
    this.g += s;
    this.b += s;

    return this;
  }

  /**
   * Subtracts the RGB values of the given color from the RGB values of this color.
   *
   * @param {Color} color - The color to subtract.
   * @return {Color} A reference to this color.
   */
  sub(color) {
    this.r = Math.max(0, this.r - color.r);
    this.g = Math.max(0, this.g - color.g);
    this.b = Math.max(0, this.b - color.b);

    return this;
  }

  /**
   * Multiplies the RGB values of the given color with the RGB values of this color.
   *
   * @param {Color} color - The color to multiply.
   * @return {Color} A reference to this color.
   */
  multiply(color) {
    this.r *= color.r;
    this.g *= color.g;
    this.b *= color.b;

    return this;
  }

  /**
   * Multiplies the given scalar value with the RGB values of this color.
   *
   * @param {number} s - The scalar to multiply.
   * @return {Color} A reference to this color.
   */
  multiplyScalar(s) {
    this.r *= s;
    this.g *= s;
    this.b *= s;

    return this;
  }

  /**
   * Linearly interpolates this color's RGB values toward the RGB values of the
   * given color. The alpha argument can be thought of as the ratio between
   * the two colors, where `0.0` is this color and `1.0` is the first argument.
   *
   * @param {Color} color - The color to converge on.
   * @param {number} alpha - The interpolation factor in the closed interval `[0,1]`.
   * @return {Color} A reference to this color.
   */
  lerp(color, alpha) {
    this.r += (color.r - this.r) * alpha;
    this.g += (color.g - this.g) * alpha;
    this.b += (color.b - this.b) * alpha;

    return this;
  }

  /**
   * Linearly interpolates between the given colors and stores the result in this instance.
   * The alpha argument can be thought of as the ratio between the two colors, where `0.0`
   * is the first and `1.0` is the second color.
   *
   * @param {Color} color1 - The first color.
   * @param {Color} color2 - The second color.
   * @param {number} alpha - The interpolation factor in the closed interval `[0,1]`.
   * @return {Color} A reference to this color.
   */
  lerpColors(color1, color2, alpha) {
    this.r = color1.r + (color2.r - color1.r) * alpha;
    this.g = color1.g + (color2.g - color1.g) * alpha;
    this.b = color1.b + (color2.b - color1.b) * alpha;

    return this;
  }

  /**
   * Linearly interpolates this color's HSL values toward the HSL values of the
   * given color. It differs from {@link Color#lerp} by not interpolating straight
   * from one color to the other, but instead going through all the hues in between
   * those two colors. The alpha argument can be thought of as the ratio between
   * the two colors, where 0.0 is this color and 1.0 is the first argument.
   *
   * @param {Color} color - The color to converge on.
   * @param {number} alpha - The interpolation factor in the closed interval `[0,1]`.
   * @return {Color} A reference to this color.
   */
  lerpHSL(color, alpha) {
    this.getHSL(_hslA);
    color.getHSL(_hslB);

    const h = lerp(_hslA.h, _hslB.h, alpha);
    const s = lerp(_hslA.s, _hslB.s, alpha);
    const l = lerp(_hslA.l, _hslB.l, alpha);

    this.setHSL(h, s, l);

    return this;
  }

  /**
   * Sets the color's RGB components from the given 3D vector.
   *
   * @param {Vector3} v - The vector to set.
   * @return {Color} A reference to this color.
   */
  setFromVector3(v) {
    this.r = v.x;
    this.g = v.y;
    this.b = v.z;

    return this;
  }

  /**
   * Transforms this color with the given 3x3 matrix.
   *
   * @param {Matrix3} m - The matrix.
   * @return {Color} A reference to this color.
   */
  applyMatrix3(m) {
    const r = this.r,
      g = this.g,
      b = this.b;
    const e = m.elements;

    this.r = e[0] * r + e[3] * g + e[6] * b;
    this.g = e[1] * r + e[4] * g + e[7] * b;
    this.b = e[2] * r + e[5] * g + e[8] * b;

    return this;
  }

  /**
   * Returns `true` if this color is equal with the given one.
   *
   * @param {Color} c - The color to test for equality.
   * @return {boolean} Whether this bounding color is equal with the given one.
   */
  equals(c) {
    return c.r === this.r && c.g === this.g && c.b === this.b;
  }

  /**
   * Sets this color's RGB components from the given array.
   *
   * @param {Array<number>} array - An array holding the RGB values.
   * @param {number} [offset=0] - The offset into the array.
   * @return {Color} A reference to this color.
   */
  fromArray(array, offset = 0) {
    this.r = array[offset];
    this.g = array[offset + 1];
    this.b = array[offset + 2];

    return this;
  }

  /**
   * 将此颜色的RGB分量写入给定数组。如果未提供数组，该方法返回一个新实例。
   * Writes the RGB components of this color to the given array. If no array is provided,
   * the method returns a new instance.
   *
   * @param {Array<number>} [array=[]] - 保存颜色分量的目标数组 The target array holding the color components.
   * @param {number} [offset=0] - 数组中第一个元素的索引 Index of the first element in the array.
   * @return {Array<number>} 颜色分量 The color components.
   */
  toArray(array = [], offset = 0) {
    // 将RGB分量写入数组的指定位置
    array[offset] = this.r;
    array[offset + 1] = this.g;
    array[offset + 2] = this.b;

    // 返回数组
    return array;
  }

  /**
   * 从给定的缓冲区属性设置此颜色的分量
   * Sets the components of this color from the given buffer attribute.
   *
   * @param {BufferAttribute} attribute - 保存颜色数据的缓冲区属性 The buffer attribute holding color data.
   * @param {number} index - 属性中的索引 The index into the attribute.
   * @return {Color} 对此颜色的引用 A reference to this color.
   */
  fromBufferAttribute(attribute, index) {
    // 从缓冲区属性的指定索引获取RGB分量
    this.r = attribute.getX(index);
    this.g = attribute.getY(index);
    this.b = attribute.getZ(index);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 此方法定义此类的序列化结果。返回颜色的十六进制值。
   * This methods defines the serialization result of this class. Returns the color
   * as a hexadecimal value.
   *
   * @return {number} 十六进制值 The hexadecimal value.
   */
  toJSON() {
    // 返回颜色的十六进制表示
    return this.getHex();
  }

  /**
   * 迭代器方法，允许使用for...of循环遍历RGB分量
   * Iterator method that allows using for...of loops to iterate over RGB components
   */
  *[Symbol.iterator]() {
    // 依次产生红、绿、蓝分量
    yield this.r;
    yield this.g;
    yield this.b;
  }
}

// 临时颜色实例，用于内部计算
// Temporary color instance for internal calculations
const _color = /*@__PURE__*/ new Color();

/**
 * 包含X11颜色名称的字典
 * A dictionary with X11 color names.
 *
 * 注意，多个单词（如Dark Orange）会变成字符串'darkorange'
 * Note that multiple words such as Dark Orange become the string 'darkorange'.
 *
 * @static
 * @type {Object}
 */
Color.NAMES = _colorKeywords;

// 导出Color类
export { Color };
