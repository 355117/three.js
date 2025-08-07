/**
 * Three.js 工具函数集合
 *
 * 这个模块包含了 Three.js 中常用的工具函数，包括：
 * - 数组操作函数
 * - 类型化数组处理
 * - DOM 元素创建
 * - 警告和调试工具
 * - WebGL 异步操作
 * - 投影矩阵变换
 */

// ========================================
// 数组操作工具函数
// ========================================

/**
 * 获取数组中的最小值
 *
 * 遍历数组找到最小的数值。对于空数组返回 Infinity，
 * 这样在数学运算中能保持一致性。
 *
 * @param {number[]} array - 数值数组
 * @returns {number} 数组中的最小值，空数组返回 Infinity
 *
 * @example
 * arrayMin([3, 1, 4, 1, 5]); // 返回 1
 * arrayMin([]); // 返回 Infinity
 */
function arrayMin(array) {
  // 空数组返回 Infinity，保持数学一致性
  if (array.length === 0) return Infinity;

  // 初始化最小值为第一个元素
  let min = array[0];

  // 从第二个元素开始遍历比较
  for (let i = 1, l = array.length; i < l; ++i) {
    if (array[i] < min) min = array[i];
  }

  return min;
}

/**
 * 获取数组中的最大值
 *
 * 遍历数组找到最大的数值。对于空数组返回 -Infinity，
 * 这样在数学运算中能保持一致性。
 *
 * @param {number[]} array - 数值数组
 * @returns {number} 数组中的最大值，空数组返回 -Infinity
 *
 * @example
 * arrayMax([3, 1, 4, 1, 5]); // 返回 5
 * arrayMax([]); // 返回 -Infinity
 */
function arrayMax(array) {
  // 空数组返回 -Infinity，保持数学一致性
  if (array.length === 0) return -Infinity;

  // 初始化最大值为第一个元素
  let max = array[0];

  // 从第二个元素开始遍历比较
  for (let i = 1, l = array.length; i < l; ++i) {
    if (array[i] > max) max = array[i];
  }

  return max;
}

/**
 * 检查数组是否需要使用 32 位无符号整数
 *
 * 检查数组中是否有值大于等于 65535（16位无符号整数的最大值）。
 * 如果有，则需要使用 Uint32Array 而不是 Uint16Array 来存储。
 *
 * 优化：假设较大的值通常在数组末尾，所以从后往前遍历。
 *
 * @param {number[]} array - 要检查的数值数组
 * @returns {boolean} 如果需要 32 位整数返回 true，否则返回 false
 *
 * @example
 * arrayNeedsUint32([1, 2, 3]); // 返回 false
 * arrayNeedsUint32([1, 2, 70000]); // 返回 true
 */
function arrayNeedsUint32(array) {
  // 假设较大的值通常在数组末尾，从后往前遍历以提高效率
  // assumes larger values usually on last

  for (let i = array.length - 1; i >= 0; --i) {
    // 检查是否超过 16 位无符号整数的最大值 (65535)
    // 考虑到 PRIMITIVE_RESTART_FIXED_INDEX 的情况，参见 #24565
    if (array[i] >= 65535) return true; // account for PRIMITIVE_RESTART_FIXED_INDEX, #24565
  }

  return false;
}

// ========================================
// 类型化数组工具函数
// ========================================

/**
 * 类型化数组构造函数映射表
 *
 * 包含所有 JavaScript 原生类型化数组的构造函数映射。
 * 用于根据字符串类型名称动态创建相应的类型化数组。
 *
 * 支持的类型：
 * - 有符号整数：Int8Array, Int16Array, Int32Array
 * - 无符号整数：Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array
 * - 浮点数：Float32Array, Float64Array
 */
const TYPED_ARRAYS = {
  Int8Array: Int8Array, // 8位有符号整数数组 (-128 到 127)
  Uint8Array: Uint8Array, // 8位无符号整数数组 (0 到 255)
  Uint8ClampedArray: Uint8ClampedArray, // 8位无符号整数数组，值会被钳制到 0-255
  Int16Array: Int16Array, // 16位有符号整数数组 (-32768 到 32767)
  Uint16Array: Uint16Array, // 16位无符号整数数组 (0 到 65535)
  Int32Array: Int32Array, // 32位有符号整数数组
  Uint32Array: Uint32Array, // 32位无符号整数数组
  Float32Array: Float32Array, // 32位浮点数数组
  Float64Array: Float64Array, // 64位浮点数数组
};

/**
 * 根据类型名称创建类型化数组
 *
 * 这是一个工厂函数，根据字符串类型名称动态创建相应的类型化数组实例。
 * 主要用于从序列化数据或配置中恢复类型化数组。
 *
 * @param {string} type - 类型化数组的类型名称（如 'Float32Array'）
 * @param {ArrayBuffer|number|Iterable} buffer - 数组缓冲区、长度或可迭代对象
 * @returns {TypedArray} 指定类型的类型化数组实例
 *
 * @example
 * getTypedArray('Float32Array', 10); // 创建长度为10的Float32Array
 * getTypedArray('Uint16Array', [1, 2, 3]); // 从数组创建Uint16Array
 */
function getTypedArray(type, buffer) {
  return new TYPED_ARRAYS[type](buffer);
}

// ========================================
// DOM 元素创建工具函数
// ========================================

/**
 * 创建带有 XHTML 命名空间的 DOM 元素
 *
 * 使用 XHTML 命名空间创建 DOM 元素，确保元素在所有浏览器中
 * 都能正确识别和处理。这对于 Canvas 等特殊元素特别重要。
 *
 * @param {string} name - 要创建的元素标签名
 * @returns {Element} 创建的 DOM 元素
 *
 * @example
 * createElementNS('canvas'); // 创建 canvas 元素
 * createElementNS('div'); // 创建 div 元素
 */
function createElementNS(name) {
  return document.createElementNS("http://www.w3.org/1999/xhtml", name);
}

/**
 * 创建 Canvas 元素
 *
 * 创建一个用于 WebGL 渲染的 Canvas 元素，并设置默认样式。
 * 设置 display: block 可以避免 inline 元素的默认间距问题。
 *
 * @returns {HTMLCanvasElement} 配置好的 Canvas 元素
 *
 * @example
 * const canvas = createCanvasElement();
 * document.body.appendChild(canvas);
 */
function createCanvasElement() {
  const canvas = createElementNS("canvas");
  canvas.style.display = "block"; // 避免 inline 元素的默认间距
  return canvas;
}

// ========================================
// 调试和警告工具函数
// ========================================

/**
 * 警告消息缓存
 *
 * 用于存储已经显示过的警告消息，避免重复显示相同的警告。
 * 这可以防止控制台被大量重复的警告信息淹没。
 *
 * @private
 */
const _cache = {};

/**
 * 只显示一次的警告函数
 *
 * 显示警告消息，但对于相同的消息只显示一次。
 * 这对于在循环或频繁调用的函数中显示警告特别有用，
 * 可以避免控制台被重复的警告信息淹没。
 *
 * @param {string} message - 要显示的警告消息
 *
 * @example
 * warnOnce('This feature is deprecated'); // 第一次会显示警告
 * warnOnce('This feature is deprecated'); // 第二次不会显示
 */
function warnOnce(message) {
  // 检查消息是否已经显示过
  if (message in _cache) return;

  // 标记消息为已显示
  _cache[message] = true;

  // 显示警告
  console.warn(message);
}

// ========================================
// WebGL 异步操作工具函数
// ========================================

/**
 * WebGL 同步对象异步探测
 *
 * 异步等待 WebGL 同步对象完成。这个函数用于等待 GPU 操作完成，
 * 而不阻塞主线程。通过定期检查同步对象的状态来实现异步等待。
 *
 * @param {WebGL2RenderingContext} gl - WebGL 2 渲染上下文
 * @param {WebGLSync} sync - WebGL 同步对象
 * @param {number} interval - 检查间隔时间（毫秒）
 * @returns {Promise} 当同步对象完成时解析的 Promise
 *
 * @example
 * const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
 * probeAsync(gl, sync, 1).then(() => {
 *   console.log('GPU operations completed');
 * });
 */
function probeAsync(gl, sync, interval) {
  return new Promise(function (resolve, reject) {
    /**
     * 内部探测函数
     *
     * 检查同步对象的状态，根据结果决定是继续等待、解析或拒绝 Promise。
     */
    function probe() {
      // 检查同步对象状态，不阻塞
      switch (gl.clientWaitSync(sync, gl.SYNC_FLUSH_COMMANDS_BIT, 0)) {
        case gl.WAIT_FAILED:
          // 同步失败，拒绝 Promise
          reject();
          break;

        case gl.TIMEOUT_EXPIRED:
          // 超时，继续等待
          setTimeout(probe, interval);
          break;

        default:
          // 同步完成，解析 Promise
          resolve();
      }
    }

    // 开始第一次探测
    setTimeout(probe, interval);
  });
}

// ========================================
// 投影矩阵变换工具函数
// ========================================

/**
 * 将投影矩阵转换为标准化形式
 *
 * 将 OpenGL 风格的投影矩阵（深度范围 [-1, 1]）转换为
 * 标准化的投影矩阵（深度范围 [0, 1]）。这种转换在某些
 * 渲染管线中是必需的，特别是在使用反向深度缓冲区时。
 *
 * 变换公式：z' = 0.5 * z + 0.5 * w
 * 这将 NDC 坐标系中的 z 分量从 [-1, 1] 映射到 [0, 1]
 *
 * @param {Matrix4} projectionMatrix - 要转换的投影矩阵（会被直接修改）
 *
 * @example
 * const matrix = new Matrix4().makePerspective(fov, aspect, near, far);
 * toNormalizedProjectionMatrix(matrix); // 转换为 [0, 1] 深度范围
 */
function toNormalizedProjectionMatrix(projectionMatrix) {
  const m = projectionMatrix.elements;

  // 将 [-1, 1] 深度范围转换为 [0, 1] 深度范围
  // Convert [-1, 1] to [0, 1] projection matrix
  m[2] = 0.5 * m[2] + 0.5 * m[3]; // 第3行第1列：x 分量的深度变换
  m[6] = 0.5 * m[6] + 0.5 * m[7]; // 第3行第2列：y 分量的深度变换
  m[10] = 0.5 * m[10] + 0.5 * m[11]; // 第3行第3列：z 分量的深度变换
  m[14] = 0.5 * m[14] + 0.5 * m[15]; // 第3行第4列：w 分量的深度变换
}

/**
 * 将投影矩阵转换为反向深度形式
 *
 * 将标准的投影矩阵（深度范围 [0, 1]）转换为反向深度矩阵。
 * 反向深度可以提供更好的深度精度分布，特别是在远距离场景中。
 *
 * 反向深度将近平面映射到 1.0，远平面映射到 0.0，
 * 这与传统的深度映射相反。
 *
 * @param {Matrix4} projectionMatrix - 要转换的投影矩阵（会被直接修改）
 *
 * @example
 * const matrix = new Matrix4().makePerspective(fov, aspect, near, far);
 * toNormalizedProjectionMatrix(matrix); // 先转换为 [0, 1]
 * toReversedProjectionMatrix(matrix);   // 再转换为反向深度
 */
function toReversedProjectionMatrix(projectionMatrix) {
  const m = projectionMatrix.elements;

  // 检查是否为透视投影矩阵
  // 透视矩阵的 m[11] 元素为 -1，正交矩阵为 0
  const isPerspectiveMatrix = m[11] === -1;

  // 反转 [0, 1] 投影矩阵的深度映射
  // Reverse [0, 1] projection matrix
  if (isPerspectiveMatrix) {
    // 透视投影的反向深度变换
    m[10] = -m[10] - 1; // z 分量：反转并偏移
    m[14] = -m[14]; // w 分量：简单反转
  } else {
    // 正交投影的反向深度变换
    m[10] = -m[10]; // z 分量：简单反转
    m[14] = -m[14] + 1; // w 分量：反转并偏移
  }
}

// ========================================
// 导出所有工具函数
// ========================================

/**
 * 导出 Three.js 工具函数集合
 *
 * 这些函数提供了 Three.js 内部使用的各种实用功能：
 *
 * 数组操作：
 * - arrayMin: 获取数组最小值
 * - arrayMax: 获取数组最大值
 * - arrayNeedsUint32: 检查是否需要32位整数数组
 *
 * 类型化数组：
 * - getTypedArray: 根据类型名称创建类型化数组
 *
 * DOM 操作：
 * - createElementNS: 创建带命名空间的DOM元素
 * - createCanvasElement: 创建Canvas元素
 *
 * 调试工具：
 * - warnOnce: 只显示一次的警告函数
 *
 * WebGL 异步：
 * - probeAsync: WebGL同步对象异步探测
 *
 * 矩阵变换：
 * - toNormalizedProjectionMatrix: 标准化投影矩阵
 * - toReversedProjectionMatrix: 反向深度投影矩阵
 */
export {
  arrayMin, // 数组最小值
  arrayMax, // 数组最大值
  arrayNeedsUint32, // 检查是否需要32位整数
  getTypedArray, // 创建类型化数组
  createElementNS, // 创建DOM元素
  createCanvasElement, // 创建Canvas元素
  warnOnce, // 一次性警告
  probeAsync, // 异步探测
  toNormalizedProjectionMatrix, // 标准化投影矩阵
  toReversedProjectionMatrix, // 反向深度投影矩阵
};
