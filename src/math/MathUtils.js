// 十六进制查找表，用于UUID生成，包含00-ff的所有256个十六进制字符串
const _lut = [
  "00",
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "0a",
  "0b",
  "0c",
  "0d",
  "0e",
  "0f",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "1a",
  "1b",
  "1c",
  "1d",
  "1e",
  "1f",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "2a",
  "2b",
  "2c",
  "2d",
  "2e",
  "2f",
  "30",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "3a",
  "3b",
  "3c",
  "3d",
  "3e",
  "3f",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "49",
  "4a",
  "4b",
  "4c",
  "4d",
  "4e",
  "4f",
  "50",
  "51",
  "52",
  "53",
  "54",
  "55",
  "56",
  "57",
  "58",
  "59",
  "5a",
  "5b",
  "5c",
  "5d",
  "5e",
  "5f",
  "60",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "68",
  "69",
  "6a",
  "6b",
  "6c",
  "6d",
  "6e",
  "6f",
  "70",
  "71",
  "72",
  "73",
  "74",
  "75",
  "76",
  "77",
  "78",
  "79",
  "7a",
  "7b",
  "7c",
  "7d",
  "7e",
  "7f",
  "80",
  "81",
  "82",
  "83",
  "84",
  "85",
  "86",
  "87",
  "88",
  "89",
  "8a",
  "8b",
  "8c",
  "8d",
  "8e",
  "8f",
  "90",
  "91",
  "92",
  "93",
  "94",
  "95",
  "96",
  "97",
  "98",
  "99",
  "9a",
  "9b",
  "9c",
  "9d",
  "9e",
  "9f",
  "a0",
  "a1",
  "a2",
  "a3",
  "a4",
  "a5",
  "a6",
  "a7",
  "a8",
  "a9",
  "aa",
  "ab",
  "ac",
  "ad",
  "ae",
  "af",
  "b0",
  "b1",
  "b2",
  "b3",
  "b4",
  "b5",
  "b6",
  "b7",
  "b8",
  "b9",
  "ba",
  "bb",
  "bc",
  "bd",
  "be",
  "bf",
  "c0",
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "c7",
  "c8",
  "c9",
  "ca",
  "cb",
  "cc",
  "cd",
  "ce",
  "cf",
  "d0",
  "d1",
  "d2",
  "d3",
  "d4",
  "d5",
  "d6",
  "d7",
  "d8",
  "d9",
  "da",
  "db",
  "dc",
  "dd",
  "de",
  "df",
  "e0",
  "e1",
  "e2",
  "e3",
  "e4",
  "e5",
  "e6",
  "e7",
  "e8",
  "e9",
  "ea",
  "eb",
  "ec",
  "ed",
  "ee",
  "ef",
  "f0",
  "f1",
  "f2",
  "f3",
  "f4",
  "f5",
  "f6",
  "f7",
  "f8",
  "f9",
  "fa",
  "fb",
  "fc",
  "fd",
  "fe",
  "ff",
];

// 伪随机数生成器的种子值，用于seededRandom函数
let _seed = 1234567;

// 角度转弧度的转换常数：π/180
const DEG2RAD = Math.PI / 180;
// 弧度转角度的转换常数：180/π
const RAD2DEG = 180 / Math.PI;

/**
 * 生成一个UUID（通用唯一标识符）
 * Generate a [UUID]{@link https://en.wikipedia.org/wiki/Universally_unique_identifier}
 * (universally unique identifier).
 *
 * @return {string} 生成的UUID字符串 The UUID.
 */
function generateUUID() {
  // 参考实现：http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136

  // 生成四个32位随机整数，用于构建UUID的不同部分
  const d0 = (Math.random() * 0xffffffff) | 0; // 第一个32位随机数
  const d1 = (Math.random() * 0xffffffff) | 0; // 第二个32位随机数
  const d2 = (Math.random() * 0xffffffff) | 0; // 第三个32位随机数
  const d3 = (Math.random() * 0xffffffff) | 0; // 第四个32位随机数

  // 按照UUID v4格式构建字符串：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuid =
    _lut[d0 & 0xff] + // d0的低8位
    _lut[(d0 >> 8) & 0xff] + // d0的第二个8位
    _lut[(d0 >> 16) & 0xff] + // d0的第三个8位
    _lut[(d0 >> 24) & 0xff] + // d0的高8位
    "-" + // 第一个连字符
    _lut[d1 & 0xff] + // d1的低8位
    _lut[(d1 >> 8) & 0xff] + // d1的第二个8位
    "-" + // 第二个连字符
    _lut[((d1 >> 16) & 0x0f) | 0x40] + // d1的第三个8位，设置版本号为4（0x40）
    _lut[(d1 >> 24) & 0xff] + // d1的高8位
    "-" + // 第三个连字符
    _lut[(d2 & 0x3f) | 0x80] + // d2的低8位，设置变体位（0x80）
    _lut[(d2 >> 8) & 0xff] + // d2的第二个8位
    "-" + // 第四个连字符
    _lut[(d2 >> 16) & 0xff] + // d2的第三个8位
    _lut[(d2 >> 24) & 0xff] + // d2的高8位
    _lut[d3 & 0xff] + // d3的低8位
    _lut[(d3 >> 8) & 0xff] + // d3的第二个8位
    _lut[(d3 >> 16) & 0xff] + // d3的第三个8位
    _lut[(d3 >> 24) & 0xff]; // d3的高8位

  // 转换为小写以节省堆内存空间（字符串扁平化）
  // .toLowerCase() here flattens concatenated strings to save heap memory space.
  return uuid.toLowerCase();
}

/**
 * 将给定值限制在最小值和最大值之间
 * Clamps the given value between min and max.
 *
 * @param {number} value - 要限制的值 The value to clamp.
 * @param {number} min - 最小值 The min value.
 * @param {number} max - 最大值 The max value.
 * @return {number} 限制后的值 The clamped value.
 */
function clamp(value, min, max) {
  // 使用Math.max和Math.min确保值在指定范围内
  return Math.max(min, Math.min(max, value));
}

/**
 * 计算给定参数的欧几里得模运算
 * 公式为：( ( n % m ) + m ) % m
 * Computes the Euclidean modulo of the given parameters that
 * is `( ( n % m ) + m ) % m`.
 *
 * @param {number} n - 被除数 The first parameter.
 * @param {number} m - 除数 The second parameter.
 * @return {number} 欧几里得模运算结果 The Euclidean modulo.
 */
function euclideanModulo(n, m) {
  // 参考：https://en.wikipedia.org/wiki/Modulo_operation
  // 欧几里得模运算确保结果总是非负数

  return ((n % m) + m) % m;
}

/**
 * 将值从范围<a1, a2>线性映射到范围<b1, b2>
 * Performs a linear mapping from range `<a1, a2>` to range `<b1, b2>`
 * for the given value.
 *
 * @param {number} x - 要映射的值 The value to be mapped.
 * @param {number} a1 - 范围A的最小值 Minimum value for range A.
 * @param {number} a2 - 范围A的最大值 Maximum value for range A.
 * @param {number} b1 - 范围B的最小值 Minimum value for range B.
 * @param {number} b2 - 范围B的最大值 Maximum value for range B.
 * @return {number} 映射后的值 The mapped value.
 */
function mapLinear(x, a1, a2, b1, b2) {
  // 线性映射公式：b1 + (x - a1) * (b2 - b1) / (a2 - a1)
  return b1 + ((x - a1) * (b2 - b1)) / (a2 - a1);
}

/**
 * 返回给定值在起点和终点之间的百分比，结果在闭区间[0, 1]内
 * Returns the percentage in the closed interval `[0, 1]` of the given value
 * between the start and end point.
 *
 * @param {number} x - 起点 The start point
 * @param {number} y - 终点 The end point.
 * @param {number} value - 起点和终点之间的值 A value between start and end.
 * @return {number} 插值因子 The interpolation factor.
 */
function inverseLerp(x, y, value) {
  // 参考：https://www.gamedev.net/tutorials/programming/general-and-gameplay-programming/inverse-lerp-a-super-useful-yet-often-overlooked-function-r5230/

  if (x !== y) {
    // 计算value在x和y之间的相对位置
    return (value - x) / (y - x);
  } else {
    // 如果起点和终点相同，返回0
    return 0;
  }
}

/**
 * 基于给定的插值因子，返回两个已知点之间的线性插值
 * t = 0 时返回 x，t = 1 时返回 y
 * Returns a value linearly interpolated from two known points based on the given interval -
 * `t = 0` will return `x` and `t = 1` will return `y`.
 *
 * @param {number} x - 起点 The start point
 * @param {number} y - 终点 The end point.
 * @param {number} t - 插值因子，在闭区间[0, 1]内 The interpolation factor in the closed interval `[0, 1]`.
 * @return {number} 插值结果 The interpolated value.
 */
function lerp(x, y, t) {
  // 线性插值公式：(1 - t) * x + t * y
  return (1 - t) * x + t * y;
}

/**
 * 使用增量时间以弹簧式方式从x平滑插值到y，保持帧率无关的运动
 * 详情参见：Frame rate independent damping using lerp
 * Smoothly interpolate a number from `x` to `y` in  a spring-like manner using a delta
 * time to maintain frame rate independent movement. For details, see
 * [Frame rate independent damping using lerp]{@link http://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/}.
 *
 * @param {number} x - 当前点 The current point.
 * @param {number} y - 目标点 The target point.
 * @param {number} lambda - 阻尼系数，值越大运动越突然，值越小运动越渐进 A higher lambda value will make the movement more sudden,
 * and a lower value will make the movement more gradual.
 * @param {number} dt - 增量时间（秒） Delta time in seconds.
 * @return {number} 插值结果 The interpolated value.
 */
function damp(x, y, lambda, dt) {
  // 使用指数衰减函数实现平滑阻尼效果
  return lerp(x, y, 1 - Math.exp(-lambda * dt));
}

/**
 * 返回在0和给定长度参数之间交替的值（乒乓效果）
 * Returns a value that alternates between `0` and the given `length` parameter.
 *
 * @param {number} x - 要进行乒乓运算的值 The value to pingpong.
 * @param {number} [length=1] - 乒乓函数的正值上限 The positive value the function will pingpong to.
 * @return {number} 交替后的值 The alternated value.
 */
function pingpong(x, length = 1) {
  // 可视化参考：https://www.desmos.com/calculator/vcsjnyz7x4

  // 乒乓算法：length - |euclideanModulo(x, length * 2) - length|
  return length - Math.abs(euclideanModulo(x, length * 2) - length);
}

/**
 * 返回范围[0,1]内的值，表示x在min和max之间移动的百分比
 * 但在接近min和max时会平滑或减缓
 * Returns a value in the range `[0,1]` that represents the percentage that `x` has
 * moved between `min` and `max`, but smoothed or slowed down the closer `x` is to
 * the `min` and `max`.
 *
 * 详情参见：[Smoothstep]{@link http://en.wikipedia.org/wiki/Smoothstep}
 * See [Smoothstep]{@link http://en.wikipedia.org/wiki/Smoothstep} for more details.
 *
 * @param {number} x - 基于其在min和max之间位置进行评估的值 The value to evaluate based on its position between min and max.
 * @param {number} min - 最小值，任何小于min的x值将返回0 The min value. Any x value below min will be `0`.
 * @param {number} max - 最大值，任何大于max的x值将返回1 The max value. Any x value above max will be `1`.
 * @return {number} 平滑步进值 The smoothed value.
 */
function smoothstep(x, min, max) {
  if (x <= min) return 0; // 小于等于最小值时返回0
  if (x >= max) return 1; // 大于等于最大值时返回1

  x = (x - min) / (max - min); // 将x标准化到[0,1]范围

  // Hermite插值公式：3x² - 2x³
  return x * x * (3 - 2 * x);
}

/**
 * smoothstep的变体，在x=0和x=1处具有零一阶和二阶导数
 * A [variation on smoothstep]{@link https://en.wikipedia.org/wiki/Smoothstep#Variations}
 * that has zero 1st and 2nd order derivatives at x=0 and x=1.
 *
 * @param {number} x - 基于其在min和max之间位置进行评估的值 The value to evaluate based on its position between min and max.
 * @param {number} min - 最小值，任何小于min的x值将返回0 The min value. Any x value below min will be `0`.
 * @param {number} max - 最大值，任何大于max的x值将返回1 The max value. Any x value above max will be `1`.
 * @return {number} 更平滑的步进值 The smoother stepped value.
 */
function smootherstep(x, min, max) {
  if (x <= min) return 0; // 小于等于最小值时返回0
  if (x >= max) return 1; // 大于等于最大值时返回1

  x = (x - min) / (max - min); // 将x标准化到[0,1]范围

  // 更高阶的Hermite插值公式：6x⁵ - 15x⁴ + 10x³
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * 返回指定区间<low, high>内的随机整数
 * Returns a random integer from `<low, high>` interval.
 *
 * @param {number} low - 下边界值 The lower value boundary.
 * @param {number} high - 上边界值 The upper value boundary
 * @return {number} 随机整数 A random integer.
 */
function randInt(low, high) {
  // 使用Math.floor确保结果为整数，+1确保包含上边界
  return low + Math.floor(Math.random() * (high - low + 1));
}

/**
 * 返回指定区间<low, high>内的随机浮点数
 * Returns a random float from `<low, high>` interval.
 *
 * @param {number} low - 下边界值 The lower value boundary.
 * @param {number} high - 上边界值 The upper value boundary
 * @return {number} 随机浮点数 A random float.
 */
function randFloat(low, high) {
  // 线性缩放随机数到指定范围
  return low + Math.random() * (high - low);
}

/**
 * 返回区间<-range/2, range/2>内的随机浮点数
 * Returns a random float from `<-range/2, range/2>` interval.
 *
 * @param {number} range - 定义值的范围 Defines the value range.
 * @return {number} 随机浮点数 A random float.
 */
function randFloatSpread(range) {
  // 生成以0为中心的对称随机数
  return range * (0.5 - Math.random());
}

/**
 * 返回区间[0, 1]内的确定性伪随机浮点数
 * Returns a deterministic pseudo-random float in the interval `[0, 1]`.
 *
 * @param {number} [s] - 整数种子值 The integer seed.
 * @return {number} 伪随机浮点数 A pseudo-random float.
 */
function seededRandom(s) {
  if (s !== undefined) _seed = s; // 如果提供种子值，则更新全局种子

  // Mulberry32伪随机数生成器
  // Mulberry32 generator

  let t = (_seed += 0x6d2b79f5); // 更新种子并添加常数

  t = Math.imul(t ^ (t >>> 15), t | 1); // 第一次混合操作

  t ^= t + Math.imul(t ^ (t >>> 7), t | 61); // 第二次混合操作

  // 最终混合并转换为[0,1]范围的浮点数
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * 将角度转换为弧度
 * Converts degrees to radians.
 *
 * @param {number} degrees - 角度值 A value in degrees.
 * @return {number} 转换后的弧度值 The converted value in radians.
 */
function degToRad(degrees) {
  // 使用预定义常数进行转换：degrees * (π/180)
  return degrees * DEG2RAD;
}

/**
 * 将弧度转换为角度
 * Converts radians to degrees.
 *
 * @param {number} radians - 弧度值 A value in radians.
 * @return {number} 转换后的角度值 The converted value in degrees.
 */
function radToDeg(radians) {
  // 使用预定义常数进行转换：radians * (180/π)
  return radians * RAD2DEG;
}

/**
 * 如果给定数字是2的幂，则返回true
 * Returns `true` if the given number is a power of two.
 *
 * @param {number} value - 要检查的值 The value to check.
 * @return {boolean} 给定数字是否为2的幂 Whether the given number is a power of two or not.
 */
function isPowerOfTwo(value) {
  // 位运算技巧：2的幂的二进制表示只有一个1位
  // 例如：8 (1000) & 7 (0111) = 0
  return (value & (value - 1)) === 0 && value !== 0;
}

/**
 * 返回大于或等于给定数字的最小2的幂
 * Returns the smallest power of two that is greater than or equal to the given number.
 *
 * @param {number} value - 要查找2的幂的值 The value to find a POT for.
 * @return {number} 大于或等于给定数字的最小2的幂 The smallest power of two that is greater than or equal to the given number.
 */
function ceilPowerOfTwo(value) {
  // 使用对数计算：2^ceil(log2(value))
  return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
}

/**
 * 返回小于或等于给定数字的最大2的幂
 * Returns the largest power of two that is less than or equal to the given number.
 *
 * @param {number} value - 要查找2的幂的值 The value to find a POT for.
 * @return {number} 小于或等于给定数字的最大2的幂 The largest power of two that is less than or equal to the given number.
 */
function floorPowerOfTwo(value) {
  // 使用对数计算：2^floor(log2(value))
  return Math.pow(2, Math.floor(Math.log(value) / Math.LN2));
}

/**
 * 根据给定的角度和顺序，从内在本征欧拉角设置四元数
 * Sets the given quaternion from the [Intrinsic Proper Euler Angles]{@link https://en.wikipedia.org/wiki/Euler_angles}
 * defined by the given angles and order.
 *
 * 旋转按照order指定的顺序应用到轴上：
 * 首先应用角度a的旋转，然后是角度b，最后是角度c
 * Rotations are applied to the axes in the order specified by order:
 * rotation by angle `a` is applied first, then by angle `b`, then by angle `c`.
 *
 * @param {Quaternion} q - 要设置的四元数 The quaternion to set.
 * @param {number} a - 应用到第一个轴的旋转角度（弧度） The rotation applied to the first axis, in radians.
 * @param {number} b - 应用到第二个轴的旋转角度（弧度） The rotation applied to the second axis, in radians.
 * @param {number} c - 应用到第三个轴的旋转角度（弧度） The rotation applied to the third axis, in radians.
 * @param {('XYX'|'XZX'|'YXY'|'YZY'|'ZXZ'|'ZYZ')} order - 指定轴顺序的字符串 A string specifying the axes order.
 */
function setQuaternionFromProperEuler(q, a, b, c, order) {
  // 缓存三角函数以提高性能
  const cos = Math.cos;
  const sin = Math.sin;

  // 计算中间角度的三角函数值
  const c2 = cos(b / 2); // cos(b/2)
  const s2 = sin(b / 2); // sin(b/2)

  const c13 = cos((a + c) / 2); // cos((a+c)/2)
  const s13 = sin((a + c) / 2); // sin((a+c)/2)

  const c1_3 = cos((a - c) / 2); // cos((a-c)/2)
  const s1_3 = sin((a - c) / 2); // sin((a-c)/2)

  const c3_1 = cos((c - a) / 2); // cos((c-a)/2)
  const s3_1 = sin((c - a) / 2); // sin((c-a)/2)

  // 根据旋转顺序设置四元数分量
  switch (order) {
    case "XYX": // X-Y-X旋转顺序
      q.set(c2 * s13, s2 * c1_3, s2 * s1_3, c2 * c13);
      break;

    case "YZY": // Y-Z-Y旋转顺序
      q.set(s2 * s1_3, c2 * s13, s2 * c1_3, c2 * c13);
      break;

    case "ZXZ": // Z-X-Z旋转顺序
      q.set(s2 * c1_3, s2 * s1_3, c2 * s13, c2 * c13);
      break;

    case "XZX": // X-Z-X旋转顺序
      q.set(c2 * s13, s2 * s3_1, s2 * c3_1, c2 * c13);
      break;

    case "YXY": // Y-X-Y旋转顺序
      q.set(s2 * c3_1, c2 * s13, s2 * s3_1, c2 * c13);
      break;

    case "ZYZ": // Z-Y-Z旋转顺序
      q.set(s2 * s3_1, s2 * c3_1, c2 * s13, c2 * c13);
      break;

    default: // 未知的旋转顺序
      console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: " + order);
  }
}

/**
 * 根据给定的类型化数组对值进行反归一化
 * Denormalizes the given value according to the given typed array.
 *
 * @param {number} value - 要反归一化的值 The value to denormalize.
 * @param {TypedArray} array - 定义值数据类型的类型化数组 The typed array that defines the data type of the value.
 * @return {number} 反归一化后的浮点值，范围在[0,1] The denormalized (float) value in the range `[0,1]`.
 */
function denormalize(value, array) {
  switch (array.constructor) {
    case Float32Array: // 32位浮点数组，直接返回
      return value;

    case Uint32Array: // 32位无符号整数数组，除以最大值
      return value / 4294967295.0; // 2^32 - 1

    case Uint16Array: // 16位无符号整数数组，除以最大值
      return value / 65535.0; // 2^16 - 1

    case Uint8Array: // 8位无符号整数数组，除以最大值
      return value / 255.0; // 2^8 - 1

    case Int32Array: // 32位有符号整数数组，除以最大值并限制最小值
      return Math.max(value / 2147483647.0, -1.0); // 2^31 - 1

    case Int16Array: // 16位有符号整数数组，除以最大值并限制最小值
      return Math.max(value / 32767.0, -1.0); // 2^15 - 1

    case Int8Array: // 8位有符号整数数组，除以最大值并限制最小值
      return Math.max(value / 127.0, -1.0); // 2^7 - 1

    default: // 无效的组件类型
      throw new Error("Invalid component type.");
  }
}

/**
 * 根据给定的类型化数组对值进行归一化
 * Normalizes the given value according to the given typed array.
 *
 * @param {number} value - 要归一化的浮点值，范围在[0,1] The float value in the range `[0,1]` to normalize.
 * @param {TypedArray} array - 定义值数据类型的类型化数组 The typed array that defines the data type of the value.
 * @return {number} 归一化后的值 The normalized value.
 */
function normalize(value, array) {
  switch (array.constructor) {
    case Float32Array: // 32位浮点数组，直接返回
      return value;

    case Uint32Array: // 32位无符号整数数组，乘以最大值并四舍五入
      return Math.round(value * 4294967295.0); // 2^32 - 1

    case Uint16Array: // 16位无符号整数数组，乘以最大值并四舍五入
      return Math.round(value * 65535.0); // 2^16 - 1

    case Uint8Array: // 8位无符号整数数组，乘以最大值并四舍五入
      return Math.round(value * 255.0); // 2^8 - 1

    case Int32Array: // 32位有符号整数数组，乘以最大值并四舍五入
      return Math.round(value * 2147483647.0); // 2^31 - 1

    case Int16Array: // 16位有符号整数数组，乘以最大值并四舍五入
      return Math.round(value * 32767.0); // 2^15 - 1

    case Int8Array: // 8位有符号整数数组，乘以最大值并四舍五入
      return Math.round(value * 127.0); // 2^7 - 1

    default: // 无效的组件类型
      throw new Error("Invalid component type.");
  }
}

/**
 * 数学工具函数集合
 * @class
 * @classdesc 数学工具函数的集合 A collection of math utility functions.
 * @hideconstructor
 */
const MathUtils = {
  // 角度转弧度常数
  DEG2RAD: DEG2RAD,
  // 弧度转角度常数
  RAD2DEG: RAD2DEG,
  /**
   * 生成UUID（通用唯一标识符）
   * Generate a [UUID]{@link https://en.wikipedia.org/wiki/Universally_unique_identifier}
   * (universally unique identifier).
   *
   * @static
   * @method
   * @return {string} UUID字符串 The UUID.
   */
  generateUUID: generateUUID,
  /**
   * 将给定值限制在最小值和最大值之间
   * Clamps the given value between min and max.
   *
   * @static
   * @method
   * @param {number} value - 要限制的值 The value to clamp.
   * @param {number} min - 最小值 The min value.
   * @param {number} max - 最大值 The max value.
   * @return {number} 限制后的值 The clamped value.
   */
  clamp: clamp,
  /**
   * 计算给定参数的欧几里得模运算
   * 公式为：( ( n % m ) + m ) % m
   * Computes the Euclidean modulo of the given parameters that
   * is `( ( n % m ) + m ) % m`.
   *
   * @static
   * @method
   * @param {number} n - 被除数 The first parameter.
   * @param {number} m - 除数 The second parameter.
   * @return {number} 欧几里得模运算结果 The Euclidean modulo.
   */
  euclideanModulo: euclideanModulo,
  /**
   * 将值从范围<a1, a2>线性映射到范围<b1, b2>
   * Performs a linear mapping from range `<a1, a2>` to range `<b1, b2>`
   * for the given value.
   *
   * @static
   * @method
   * @param {number} x - 要映射的值 The value to be mapped.
   * @param {number} a1 - 范围A的最小值 Minimum value for range A.
   * @param {number} a2 - 范围A的最大值 Maximum value for range A.
   * @param {number} b1 - 范围B的最小值 Minimum value for range B.
   * @param {number} b2 - 范围B的最大值 Maximum value for range B.
   * @return {number} 映射后的值 The mapped value.
   */
  mapLinear: mapLinear,
  /**
   * 返回给定值在起点和终点之间的百分比，结果在闭区间[0, 1]内
   * Returns the percentage in the closed interval `[0, 1]` of the given value
   * between the start and end point.
   *
   * @static
   * @method
   * @param {number} x - 起点 The start point
   * @param {number} y - 终点 The end point.
   * @param {number} value - 起点和终点之间的值 A value between start and end.
   * @return {number} 插值因子 The interpolation factor.
   */
  inverseLerp: inverseLerp,
  /**
   * 基于给定的插值因子，返回两个已知点之间的线性插值
   * t = 0 时返回 x，t = 1 时返回 y
   * Returns a value linearly interpolated from two known points based on the given interval -
   * `t = 0` will return `x` and `t = 1` will return `y`.
   *
   * @static
   * @method
   * @param {number} x - 起点 The start point
   * @param {number} y - 终点 The end point.
   * @param {number} t - 插值因子，在闭区间[0, 1]内 The interpolation factor in the closed interval `[0, 1]`.
   * @return {number} 插值结果 The interpolated value.
   */
  lerp: lerp,
  /**
   * 使用增量时间以弹簧式方式从x平滑插值到y，保持帧率无关的运动
   * Smoothly interpolate a number from `x` to `y` in  a spring-like manner using a delta
   * time to maintain frame rate independent movement. For details, see
   * [Frame rate independent damping using lerp]{@link http://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/}.
   *
   * @static
   * @method
   * @param {number} x - 当前点 The current point.
   * @param {number} y - 目标点 The target point.
   * @param {number} lambda - 阻尼系数，值越大运动越突然，值越小运动越渐进 A higher lambda value will make the movement more sudden,
   * and a lower value will make the movement more gradual.
   * @param {number} dt - 增量时间（秒） Delta time in seconds.
   * @return {number} 插值结果 The interpolated value.
   */
  damp: damp,
  /**
   * 返回在0和给定长度参数之间交替的值（乒乓效果）
   * Returns a value that alternates between `0` and the given `length` parameter.
   *
   * @static
   * @method
   * @param {number} x - 要进行乒乓运算的值 The value to pingpong.
   * @param {number} [length=1] - 乒乓函数的正值上限 The positive value the function will pingpong to.
   * @return {number} 交替后的值 The alternated value.
   */
  pingpong: pingpong,
  /**
   * 返回范围[0,1]内的值，表示x在min和max之间移动的百分比
   * 但在接近min和max时会平滑或减缓
   * Returns a value in the range `[0,1]` that represents the percentage that `x` has
   * moved between `min` and `max`, but smoothed or slowed down the closer `x` is to
   * the `min` and `max`.
   *
   * 详情参见：[Smoothstep]{@link http://en.wikipedia.org/wiki/Smoothstep}
   * See [Smoothstep]{@link http://en.wikipedia.org/wiki/Smoothstep} for more details.
   *
   * @static
   * @method
   * @param {number} x - 基于其在min和max之间位置进行评估的值 The value to evaluate based on its position between min and max.
   * @param {number} min - 最小值，任何小于min的x值将返回0 The min value. Any x value below min will be `0`.
   * @param {number} max - 最大值，任何大于max的x值将返回1 The max value. Any x value above max will be `1`.
   * @return {number} 平滑步进值 The smoothed value.
   */
  smoothstep: smoothstep,
  /**
   * smoothstep的变体，在x=0和x=1处具有零一阶和二阶导数
   * A [variation on smoothstep]{@link https://en.wikipedia.org/wiki/Smoothstep#Variations}
   * that has zero 1st and 2nd order derivatives at x=0 and x=1.
   *
   * @static
   * @method
   * @param {number} x - 基于其在min和max之间位置进行评估的值 The value to evaluate based on its position between min and max.
   * @param {number} min - 最小值，任何小于min的x值将返回0 The min value. Any x value below min will be `0`.
   * @param {number} max - 最大值，任何大于max的x值将返回1 The max value. Any x value above max will be `1`.
   * @return {number} 更平滑的步进值 The smoother stepped value.
   */
  smootherstep: smootherstep,
  /**
   * 返回指定区间<low, high>内的随机整数
   * Returns a random integer from `<low, high>` interval.
   *
   * @static
   * @method
   * @param {number} low - 下边界值 The lower value boundary.
   * @param {number} high - 上边界值 The upper value boundary
   * @return {number} 随机整数 A random integer.
   */
  randInt: randInt,
  /**
   * 返回指定区间<low, high>内的随机浮点数
   * Returns a random float from `<low, high>` interval.
   *
   * @static
   * @method
   * @param {number} low - 下边界值 The lower value boundary.
   * @param {number} high - 上边界值 The upper value boundary
   * @return {number} 随机浮点数 A random float.
   */
  randFloat: randFloat,
  /**
   * 返回区间<-range/2, range/2>内的随机浮点数
   * Returns a random float from `<-range/2, range/2>` interval.
   *
   * @static
   * @method
   * @param {number} range - 定义值的范围 Defines the value range.
   * @return {number} 随机浮点数 A random float.
   */
  randFloatSpread: randFloatSpread,
  /**
   * 返回区间[0, 1]内的确定性伪随机浮点数
   * Returns a deterministic pseudo-random float in the interval `[0, 1]`.
   *
   * @static
   * @method
   * @param {number} [s] - 整数种子值 The integer seed.
   * @return {number} 伪随机浮点数 A pseudo-random float.
   */
  seededRandom: seededRandom,
  /**
   * 将角度转换为弧度
   * Converts degrees to radians.
   *
   * @static
   * @method
   * @param {number} degrees - 角度值 A value in degrees.
   * @return {number} 转换后的弧度值 The converted value in radians.
   */
  degToRad: degToRad,
  /**
   * 将弧度转换为角度
   * Converts radians to degrees.
   *
   * @static
   * @method
   * @param {number} radians - 弧度值 A value in radians.
   * @return {number} 转换后的角度值 The converted value in degrees.
   */
  radToDeg: radToDeg,
  /**
   * 如果给定数字是2的幂，则返回true
   * Returns `true` if the given number is a power of two.
   *
   * @static
   * @method
   * @param {number} value - 要检查的值 The value to check.
   * @return {boolean} 给定数字是否为2的幂 Whether the given number is a power of two or not.
   */
  isPowerOfTwo: isPowerOfTwo,
  /**
   * 返回大于或等于给定数字的最小2的幂
   * Returns the smallest power of two that is greater than or equal to the given number.
   *
   * @static
   * @method
   * @param {number} value - 要查找2的幂的值 The value to find a POT for.
   * @return {number} 大于或等于给定数字的最小2的幂 The smallest power of two that is greater than or equal to the given number.
   */
  ceilPowerOfTwo: ceilPowerOfTwo,
  /**
   * 返回小于或等于给定数字的最大2的幂
   * Returns the largest power of two that is less than or equal to the given number.
   *
   * @static
   * @method
   * @param {number} value - 要查找2的幂的值 The value to find a POT for.
   * @return {number} 小于或等于给定数字的最大2的幂 The largest power of two that is less than or equal to the given number.
   */
  floorPowerOfTwo: floorPowerOfTwo,
  /**
   * 根据给定的角度和顺序，从内在本征欧拉角设置四元数
   * Sets the given quaternion from the [Intrinsic Proper Euler Angles]{@link https://en.wikipedia.org/wiki/Euler_angles}
   * defined by the given angles and order.
   *
   * 旋转按照order指定的顺序应用到轴上：
   * 首先应用角度a的旋转，然后是角度b，最后是角度c
   * Rotations are applied to the axes in the order specified by order:
   * rotation by angle `a` is applied first, then by angle `b`, then by angle `c`.
   *
   * @static
   * @method
   * @param {Quaternion} q - 要设置的四元数 The quaternion to set.
   * @param {number} a - 应用到第一个轴的旋转角度（弧度） The rotation applied to the first axis, in radians.
   * @param {number} b - 应用到第二个轴的旋转角度（弧度） The rotation applied to the second axis, in radians.
   * @param {number} c - 应用到第三个轴的旋转角度（弧度） The rotation applied to the third axis, in radians.
   * @param {('XYX'|'XZX'|'YXY'|'YZY'|'ZXZ'|'ZYZ')} order - 指定轴顺序的字符串 A string specifying the axes order.
   */
  setQuaternionFromProperEuler: setQuaternionFromProperEuler,
  /**
   * 根据给定的类型化数组对值进行归一化
   * Normalizes the given value according to the given typed array.
   *
   * @static
   * @method
   * @param {number} value - 要归一化的浮点值，范围在[0,1] The float value in the range `[0,1]` to normalize.
   * @param {TypedArray} array - 定义值数据类型的类型化数组 The typed array that defines the data type of the value.
   * @return {number} 归一化后的值 The normalized value.
   */
  normalize: normalize,
  /**
   * 根据给定的类型化数组对值进行反归一化
   * Denormalizes the given value according to the given typed array.
   *
   * @static
   * @method
   * @param {number} value - 要反归一化的值 The value to denormalize.
   * @param {TypedArray} array - 定义值数据类型的类型化数组 The typed array that defines the data type of the value.
   * @return {number} 反归一化后的浮点值，范围在[0,1] The denormalized (float) value in the range `[0,1]`.
   */
  denormalize: denormalize,
};

// 导出所有数学工具函数和常量
export {
  DEG2RAD, // 角度转弧度常数
  RAD2DEG, // 弧度转角度常数
  generateUUID, // UUID生成函数
  clamp, // 值限制函数
  euclideanModulo, // 欧几里得模运算函数
  mapLinear, // 线性映射函数
  inverseLerp, // 反向线性插值函数
  lerp, // 线性插值函数
  damp, // 阻尼插值函数
  pingpong, // 乒乓函数
  smoothstep, // 平滑步进函数
  smootherstep, // 更平滑步进函数
  randInt, // 随机整数函数
  randFloat, // 随机浮点数函数
  randFloatSpread, // 对称随机浮点数函数
  seededRandom, // 种子随机数函数
  degToRad, // 角度转弧度函数
  radToDeg, // 弧度转角度函数
  isPowerOfTwo, // 二次幂检查函数
  ceilPowerOfTwo, // 向上取二次幂函数
  floorPowerOfTwo, // 向下取二次幂函数
  setQuaternionFromProperEuler, // 欧拉角转四元数函数
  normalize, // 归一化函数
  denormalize, // 反归一化函数
  MathUtils, // 数学工具对象
};
