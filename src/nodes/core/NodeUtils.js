// 导入数学相关的类
import { Color } from "../../math/Color.js"; // 导入颜色类
import { Matrix2 } from "../../math/Matrix2.js"; // 导入2x2矩阵类
import { Matrix3 } from "../../math/Matrix3.js"; // 导入3x3矩阵类
import { Matrix4 } from "../../math/Matrix4.js"; // 导入4x4矩阵类
import { Vector2 } from "../../math/Vector2.js"; // 导入二维向量类
import { Vector3 } from "../../math/Vector3.js"; // 导入三维向量类
import { Vector4 } from "../../math/Vector4.js"; // 导入四维向量类

// cyrb53 (c) 2018 bryc (github.com/bryc). 许可证：公共领域。感谢署名。
// 一个快速简单的64位（或53位）字符串哈希函数，具有良好的碰撞抗性。
// 主要受 MurmurHash2/3 启发，但专注于速度/简单性。
// 参见 https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript/52171480#52171480
// https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
function cyrb53(value, seed = 0) {
  // 定义cyrb53哈希函数，接受值和种子参数

  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed; // 初始化两个哈希值，使用种子进行异或操作

  if (value instanceof Array) {
    // 如果输入值是数组

    for (let i = 0, val; i < value.length; i++) {
      // 遍历数组中的每个元素

      val = value[i]; // 获取当前元素值
      h1 = Math.imul(h1 ^ val, 2654435761); // 对h1进行哈希计算
      h2 = Math.imul(h2 ^ val, 1597334677); // 对h2进行哈希计算
    }
  } else {
    // 如果输入值是字符串

    for (let i = 0, ch; i < value.length; i++) {
      // 遍历字符串中的每个字符

      ch = value.charCodeAt(i); // 获取字符的ASCII码
      h1 = Math.imul(h1 ^ ch, 2654435761); // 对h1进行哈希计算
      h2 = Math.imul(h2 ^ ch, 1597334677); // 对h2进行哈希计算
    }
  }

  // 最终混合步骤，增强哈希值的分布性
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); // 对h1进行最终混合
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909); // 使用h2更新h1
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); // 对h2进行最终混合
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909); // 使用h1更新h2

  return 4294967296 * (2097151 & h2) + (h1 >>> 0); // 返回最终的53位哈希值
}

/**
 * 计算给定字符串的哈希值。
 *
 * @method
 * @param {string} str - 要进行哈希计算的字符串。
 * @return {number} 哈希值。
 */
export const hashString = (str) => cyrb53(str); // 导出字符串哈希函数

/**
 * 计算给定数组的哈希值。
 *
 * @method
 * @param {Array<number>} array - 要进行哈希计算的数组。
 * @return {number} 哈希值。
 */
export const hashArray = (array) => cyrb53(array); // 导出数组哈希函数

/**
 * 计算给定参数列表的哈希值。
 *
 * @method
 * @param {...number} params - 参数列表。
 * @return {number} 哈希值。
 */
export const hash = (...params) => cyrb53(params); // 导出通用哈希函数

/**
 * 计算给定节点的缓存键。
 *
 * @method
 * @param {Object|Node} object - 要进行哈希计算的对象。
 * @param {boolean} [force=false] - 是否强制计算缓存键。
 * @return {number} 哈希值。
 */
export function getCacheKey(object, force = false) {
  // 导出获取缓存键的函数
  const values = []; // 创建用于存储值的数组

  if (object.isNode === true) {
    // 如果对象是节点
    values.push(object.id); // 将节点ID添加到值数组中
    object = object.getSelf(); // 获取节点的自身引用
  }

  for (const { property, childNode } of getNodeChildren(object)) {
    // 遍历对象的所有子节点
    values.push(cyrb53(property.slice(0, -4)), childNode.getCacheKey(force)); // 添加属性名和子节点缓存键的哈希值
  }

  return cyrb53(values); // 返回所有值的哈希值
}

/**
 * 此生成器函数可用于遍历给定对象的节点子元素。
 *
 * @generator
 * @param {Object} node - 要进行哈希计算的对象。
 * @param {boolean} [toJSON=false] - 是否返回JSON格式。
 * @yields {Object} 包含属性、索引（如果可用）和子节点的结果节点。
 */
export function* getNodeChildren(node, toJSON = false) {
  // 导出节点子元素遍历生成器函数
  for (const property in node) {
    // 遍历节点的所有属性
    // 忽略私有属性。
    if (property.startsWith("_") === true) continue; // 跳过以下划线开头的私有属性

    const object = node[property]; // 获取属性对应的对象

    if (Array.isArray(object) === true) {
      // 如果对象是数组
      for (let i = 0; i < object.length; i++) {
        // 遍历数组中的每个元素
        const child = object[i]; // 获取数组中的子元素

        if (child && (child.isNode === true || (toJSON && typeof child.toJSON === "function"))) {
          // 如果子元素是节点或具有toJSON方法
          yield { property, index: i, childNode: child }; // 生成包含属性、索引和子节点的对象
        }
      }
    } else if (object && object.isNode === true) {
      // 如果对象是节点
      yield { property, childNode: object }; // 生成包含属性和子节点的对象
    } else if (object && Object.getPrototypeOf(object) === Object.prototype) {
      // 如果对象是普通对象
      for (const subProperty in object) {
        // 遍历对象的所有子属性
        // 忽略私有属性。
        if (subProperty.startsWith("_") === true) continue; // 跳过以下划线开头的私有子属性

        const child = object[subProperty]; // 获取子属性对应的子对象

        if (child && (child.isNode === true || (toJSON && typeof child.toJSON === "function"))) {
          // 如果子对象是节点或具有toJSON方法
          yield { property, index: subProperty, childNode: child }; // 生成包含属性、子属性索引和子节点的对象
        }
      }
    }
  }
}

// 根据长度映射数据类型的Map对象（使用纯函数标记优化）
const typeFromLength = /*@__PURE__*/ new Map([
  [1, "float"], // 长度为1对应float类型
  [2, "vec2"], // 长度为2对应vec2类型
  [3, "vec3"], // 长度为3对应vec3类型
  [4, "vec4"], // 长度为4对应vec4类型
  [9, "mat3"], // 长度为9对应mat3类型
  [16, "mat4"], // 长度为16对应mat4类型
]);

// 用于存储对象数据的WeakMap（使用纯函数标记优化）
const dataFromObject = /*@__PURE__*/ new WeakMap();

/**
 * 根据给定长度返回数据类型。
 *
 * @method
 * @param {number} length - 长度。
 * @return {string} 数据类型。
 */
export function getTypeFromLength(length) {
  // 导出根据长度获取类型的函数
  return typeFromLength.get(length); // 从映射表中获取对应的数据类型
}

/**
 * 根据给定数据类型返回类型化数组。
 *
 * @method
 * @param {string} type - 数据类型。
 * @return {TypedArray} 类型化数组。
 */
export function getTypedArrayFromType(type) {
  // 导出根据类型获取类型化数组的函数
  // 处理向量和矩阵的组件类型
  if (/[iu]?vec\d/.test(type)) {
    // 如果类型匹配向量模式
    // 处理整数向量
    if (type.startsWith("ivec")) return Int32Array; // 如果是整数向量，返回Int32Array
    // 处理无符号整数向量
    if (type.startsWith("uvec")) return Uint32Array; // 如果是无符号整数向量，返回Uint32Array
    // 默认为浮点向量
    return Float32Array; // 默认返回Float32Array
  }

  // 处理矩阵（总是浮点数）
  if (/mat\d/.test(type)) return Float32Array; // 如果是矩阵类型，返回Float32Array

  // 基本类型
  if (/float/.test(type)) return Float32Array; // 如果是浮点类型，返回Float32Array
  if (/uint/.test(type)) return Uint32Array; // 如果是无符号整数类型，返回Uint32Array
  if (/int/.test(type)) return Int32Array; // 如果是整数类型，返回Int32Array

  throw new Error(`THREE.NodeUtils: Unsupported type: ${type}`); // 抛出不支持的类型错误
}

/**
 * 根据给定数据类型返回长度。
 *
 * @method
 * @param {string} type - 数据类型。
 * @return {number} 长度。
 */
export function getLengthFromType(type) {
  // 导出根据类型获取长度的函数
  if (/float|int|uint/.test(type)) return 1; // 基本数值类型长度为1
  if (/vec2/.test(type)) return 2; // vec2类型长度为2
  if (/vec3/.test(type)) return 3; // vec3类型长度为3
  if (/vec4/.test(type)) return 4; // vec4类型长度为4
  if (/mat2/.test(type)) return 4; // mat2类型长度为4
  if (/mat3/.test(type)) return 9; // mat3类型长度为9
  if (/mat4/.test(type)) return 16; // mat4类型长度为16

  console.error("THREE.TSL: Unsupported type:", type); // 输出不支持的类型错误
}

/**
 * 根据给定数据类型返回GPU内存长度。
 *
 * @method
 * @param {string} type - 数据类型。
 * @return {number} 长度。
 */
export function getMemoryLengthFromType(type) {
  // 导出根据类型获取GPU内存长度的函数
  if (/float|int|uint/.test(type)) return 1; // 基本数值类型GPU内存长度为1
  if (/vec2/.test(type)) return 2; // vec2类型GPU内存长度为2
  if (/vec3/.test(type)) return 3; // vec3类型GPU内存长度为3
  if (/vec4/.test(type)) return 4; // vec4类型GPU内存长度为4
  if (/mat2/.test(type)) return 4; // mat2类型GPU内存长度为4
  if (/mat3/.test(type)) return 12; // mat3类型GPU内存长度为12
  if (/mat4/.test(type)) return 16; // mat4类型GPU内存长度为16

  console.error("THREE.TSL: Unsupported type:", type); // 输出不支持的类型错误
}

/**
 * 根据给定数据类型返回字节边界。
 *
 * @method
 * @param {string} type - 数据类型。
 * @return {number} 字节边界。
 */
export function getByteBoundaryFromType(type) {
  // 导出根据类型获取字节边界的函数
  if (/float|int|uint/.test(type)) return 4; // 基本数值类型字节边界为4
  if (/vec2/.test(type)) return 8; // vec2类型字节边界为8
  if (/vec3/.test(type)) return 16; // vec3类型字节边界为16
  if (/vec4/.test(type)) return 16; // vec4类型字节边界为16
  if (/mat2/.test(type)) return 8; // mat2类型字节边界为8
  if (/mat3/.test(type)) return 48; // mat3类型字节边界为48
  if (/mat4/.test(type)) return 64; // mat4类型字节边界为64

  console.error("THREE.TSL: Unsupported type:", type); // 输出不支持的类型错误
}

/**
 * 根据给定值返回数据类型。
 *
 * @method
 * @param {any} value - 值。
 * @return {?string} 数据类型。
 */
export function getValueType(value) {
  // 导出根据值获取类型的函数
  if (value === undefined || value === null) return null; // 如果值为undefined或null，返回null

  const typeOf = typeof value; // 获取值的基本类型

  if (value.isNode === true) {
    // 如果值是节点
    return "node"; // 返回"node"类型
  } else if (typeOf === "number") {
    // 如果值是数字
    return "float"; // 返回"float"类型
  } else if (typeOf === "boolean") {
    // 如果值是布尔值
    return "bool"; // 返回"bool"类型
  } else if (typeOf === "string") {
    // 如果值是字符串
    return "string"; // 返回"string"类型
  } else if (typeOf === "function") {
    // 如果值是函数
    return "shader"; // 返回"shader"类型
  } else if (value.isVector2 === true) {
    // 如果值是二维向量
    return "vec2"; // 返回"vec2"类型
  } else if (value.isVector3 === true) {
    // 如果值是三维向量
    return "vec3"; // 返回"vec3"类型
  } else if (value.isVector4 === true) {
    // 如果值是四维向量
    return "vec4"; // 返回"vec4"类型
  } else if (value.isMatrix2 === true) {
    // 如果值是2x2矩阵
    return "mat2"; // 返回"mat2"类型
  } else if (value.isMatrix3 === true) {
    // 如果值是3x3矩阵
    return "mat3"; // 返回"mat3"类型
  } else if (value.isMatrix4 === true) {
    // 如果值是4x4矩阵
    return "mat4"; // 返回"mat4"类型
  } else if (value.isColor === true) {
    // 如果值是颜色
    return "color"; // 返回"color"类型
  } else if (value instanceof ArrayBuffer) {
    // 如果值是ArrayBuffer
    return "ArrayBuffer"; // 返回"ArrayBuffer"类型
  }

  return null; // 如果都不匹配，返回null
}

/**
 * 根据给定数据类型和参数返回值/对象。
 *
 * @method
 * @param {string} type - 给定的类型。
 * @param {...any} params - 参数列表。
 * @return {any} 值/对象。
 */
export function getValueFromType(type, ...params) {
  // 导出根据类型获取值的函数
  const last4 = type ? type.slice(-4) : undefined; // 获取类型字符串的最后4个字符

  if (params.length === 1) {
    // 如果只有一个参数
    // 确保与NodeBuilder.format()中的行为一致

    if (last4 === "vec2") params = [params[0], params[0]]; // 如果是vec2类型，复制参数
    else if (last4 === "vec3") params = [params[0], params[0], params[0]]; // 如果是vec3类型，复制参数
    else if (last4 === "vec4") params = [params[0], params[0], params[0], params[0]]; // 如果是vec4类型，复制参数
  }

  if (type === "color") {
    // 如果类型是颜色
    return new Color(...params); // 创建并返回Color对象
  } else if (last4 === "vec2") {
    // 如果类型是vec2
    return new Vector2(...params); // 创建并返回Vector2对象
  } else if (last4 === "vec3") {
    // 如果类型是vec3
    return new Vector3(...params); // 创建并返回Vector3对象
  } else if (last4 === "vec4") {
    // 如果类型是vec4
    return new Vector4(...params); // 创建并返回Vector4对象
  } else if (last4 === "mat2") {
    // 如果类型是mat2
    return new Matrix2(...params); // 创建并返回Matrix2对象
  } else if (last4 === "mat3") {
    // 如果类型是mat3
    return new Matrix3(...params); // 创建并返回Matrix3对象
  } else if (last4 === "mat4") {
    // 如果类型是mat4
    return new Matrix4(...params); // 创建并返回Matrix4对象
  } else if (type === "bool") {
    // 如果类型是布尔值
    return params[0] || false; // 返回第一个参数或false
  } else if (type === "float" || type === "int" || type === "uint") {
    // 如果类型是数值类型
    return params[0] || 0; // 返回第一个参数或0
  } else if (type === "string") {
    // 如果类型是字符串
    return params[0] || ""; // 返回第一个参数或空字符串
  } else if (type === "ArrayBuffer") {
    // 如果类型是ArrayBuffer
    return base64ToArrayBuffer(params[0]); // 将Base64字符串转换为ArrayBuffer
  }

  return null; // 如果都不匹配，返回null
}

/**
 * 获取可在不同渲染步骤之间共享的对象数据。
 *
 * @param {Object} object - 要获取数据的对象。
 * @return {Object} 对象数据。
 */
export function getDataFromObject(object) {
  // 导出从对象获取数据的函数
  let data = dataFromObject.get(object); // 从WeakMap中获取对象对应的数据

  if (data === undefined) {
    // 如果数据不存在
    data = {}; // 创建一个空对象
    dataFromObject.set(object, data); // 将对象和数据存储到WeakMap中
  }

  return data; // 返回对象数据
}

/**
 * 将给定的数组缓冲区转换为Base64字符串。
 *
 * @method
 * @param {ArrayBuffer} arrayBuffer - 数组缓冲区。
 * @return {string} Base64字符串。
 */
export function arrayBufferToBase64(arrayBuffer) {
  // 导出数组缓冲区转Base64的函数
  let chars = ""; // 初始化字符串

  const array = new Uint8Array(arrayBuffer); // 创建Uint8Array视图

  for (let i = 0; i < array.length; i++) {
    // 遍历数组中的每个字节
    chars += String.fromCharCode(array[i]); // 将字节转换为字符并添加到字符串中
  }

  return btoa(chars); // 使用btoa函数将字符串编码为Base64
}

/**
 * 将给定的Base64字符串转换为数组缓冲区。
 *
 * @method
 * @param {string} base64 - Base64字符串。
 * @return {ArrayBuffer} 数组缓冲区。
 */
export function base64ToArrayBuffer(base64) {
  // 导出Base64转数组缓冲区的函数
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer; // 使用atob解码Base64，然后创建Uint8Array并返回其缓冲区
}
