/**
 * WebGL 程序的 Uniform 变量管理器
 *
 * 这些 Uniform 变量形成一个树状结构，具有特殊的顶级容器作为根节点，
 * 通过调用 'new WebGLUniforms( gl, program )' 来获取。
 *
 * 内部节点（包括顶级容器）的属性：
 *
 * .seq - 嵌套 uniform 变量的数组
 * .map - 按名称索引的嵌套 uniform 变量
 *
 * 除顶级容器外所有节点的方法：
 *
 * .setValue( gl, value, [textures] )
 *
 * 		上传 uniform 变量值
 *  	对于采样器 uniform，需要 'textures' 参数
 *
 * 顶级容器的静态方法（纹理分解）：
 *
 * .upload( gl, seq, values, textures )
 *
 * 		将 'seq' 中的 uniform 设置为 'values[id].value'
 *
 * .seqWithValue( seq, values ) : filteredSeq
 *
 * 		过滤 'seq' 中在 values 中有对应条目的项
 *
 * 顶级容器的方法（纹理分解）：
 *
 * .setValue( gl, name, value, textures )
 *
 * 		将名为 'name' 的 uniform 设置为 'value'
 *
 * .setOptional( gl, obj, prop )
 *
 * 		类似 .set，但用于对象的可选属性
 *
 */

// 导入纹理相关类
import { CubeTexture } from "../../textures/CubeTexture.js";
import { Texture } from "../../textures/Texture.js";
import { DataArrayTexture } from "../../textures/DataArrayTexture.js";
import { Data3DTexture } from "../../textures/Data3DTexture.js";
import { DepthTexture } from "../../textures/DepthTexture.js";
// 导入渲染常量
import { LessEqualCompare } from "../../constants.js";

// 空纹理对象，用作默认值
const emptyTexture = /*@__PURE__*/ new Texture();

// 空阴影纹理，用于阴影映射的默认值
const emptyShadowTexture = /*@__PURE__*/ new DepthTexture(1, 1);

// 空数组纹理和3D纹理，用作默认值
const emptyArrayTexture = /*@__PURE__*/ new DataArrayTexture();
const empty3dTexture = /*@__PURE__*/ new Data3DTexture();
const emptyCubeTexture = /*@__PURE__*/ new CubeTexture();

// --- 工具函数 ---

// 数组缓存（按大小提供临时类型化数组）
const arrayCacheF32 = [];
const arrayCacheI32 = [];

// 用于上传矩阵 uniform 的 Float32Array 缓存
const mat4array = new Float32Array(16);
const mat3array = new Float32Array(9);
const mat2array = new Float32Array(4);

/**
 * 将向量和矩阵数组扁平化
 *
 * @param {Array} array - 要扁平化的数组
 * @param {number} nBlocks - 块数量
 * @param {number} blockSize - 每块大小
 * @returns {Float32Array} 扁平化后的数组
 */
function flatten(array, nBlocks, blockSize) {
  const firstElem = array[0];

  // 如果第一个元素是数字，直接返回原数组
  if (firstElem <= 0 || firstElem > 0) return array;
  // 未优化版本: ! isNaN( firstElem )
  // 参见 http://jacksondunstan.com/articles/983

  const n = nBlocks * blockSize;
  let r = arrayCacheF32[n];

  // 如果缓存中没有对应大小的数组，创建新的
  if (r === undefined) {
    r = new Float32Array(n);
    arrayCacheF32[n] = r;
  }

  // 将所有块的数据复制到扁平化数组中
  if (nBlocks !== 0) {
    firstElem.toArray(r, 0);

    for (let i = 1, offset = 0; i !== nBlocks; ++i) {
      offset += blockSize;
      array[i].toArray(r, offset);
    }
  }

  return r;
}

/**
 * 比较两个数组是否相等
 *
 * @param {Array} a - 第一个数组
 * @param {Array} b - 第二个数组
 * @returns {boolean} 如果数组相等返回 true
 */
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;

  for (let i = 0, l = a.length; i < l; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

/**
 * 将数组 b 的内容复制到数组 a
 *
 * @param {Array} a - 目标数组
 * @param {Array} b - 源数组
 */
function copyArray(a, b) {
  for (let i = 0, l = b.length; i < l; i++) {
    a[i] = b[i];
  }
}

// Texture unit allocation

/**
 * 分配纹理单元数组
 *
 * 为多个纹理分配连续的纹理单元，并返回包含这些单元ID的数组。
 * 使用缓存机制避免重复创建相同大小的数组。
 *
 * @param {Object} textures - 纹理管理器对象
 * @param {number} n - 需要分配的纹理单元数量
 * @returns {Int32Array} 包含纹理单元ID的数组
 */
function allocTexUnits(textures, n) {
  let r = arrayCacheI32[n];

  // 如果缓存中没有对应大小的数组，创建新的
  if (r === undefined) {
    r = new Int32Array(n);
    arrayCacheI32[n] = r;
  }

  // 为每个位置分配一个纹理单元
  for (let i = 0; i !== n; ++i) {
    r[i] = textures.allocateTextureUnit();
  }

  return r;
}

// --- Uniform 值设置函数 ---

// 注意：这些方法定义在外部，因为它们数量很多，
// 这样可以让它们的名称在压缩时更短。

// 单个标量值设置函数

/**
 * 设置单个浮点数 uniform 值
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {number} v - 要设置的浮点数值
 */
function setValueV1f(gl, v) {
  const cache = this.cache;

  // 如果值没有变化，跳过设置
  if (cache[0] === v) return;

  // 设置 uniform 值
  gl.uniform1f(this.addr, v);

  // 更新缓存
  cache[0] = v;
}

// 单个浮点向量设置函数（支持扁平数组或 THREE.VectorN 对象）

/**
 * 设置二维向量 uniform 值
 *
 * 支持两种输入格式：
 * 1. 具有 x, y 属性的向量对象（如 THREE.Vector2）
 * 2. 包含两个元素的数组
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Vector2|Array} v - 要设置的二维向量值
 */
function setValueV2f(gl, v) {
  const cache = this.cache;

  // 如果是向量对象（有 x, y 属性）
  if (v.x !== undefined) {
    if (cache[0] !== v.x || cache[1] !== v.y) {
      gl.uniform2f(this.addr, v.x, v.y);

      cache[0] = v.x;
      cache[1] = v.y;
    }
  } else {
    // 如果是数组格式
    if (arraysEqual(cache, v)) return;

    gl.uniform2fv(this.addr, v);

    copyArray(cache, v);
  }
}

/**
 * 设置三维向量 uniform 值
 *
 * 支持三种输入格式：
 * 1. 具有 x, y, z 属性的向量对象（如 THREE.Vector3）
 * 2. 具有 r, g, b 属性的颜色对象（如 THREE.Color）
 * 3. 包含三个元素的数组
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Vector3|Color|Array} v - 要设置的三维向量值
 */
function setValueV3f(gl, v) {
  const cache = this.cache;

  // 如果是向量对象（有 x, y, z 属性）
  if (v.x !== undefined) {
    if (cache[0] !== v.x || cache[1] !== v.y || cache[2] !== v.z) {
      gl.uniform3f(this.addr, v.x, v.y, v.z);

      cache[0] = v.x;
      cache[1] = v.y;
      cache[2] = v.z;
    }
  } else if (v.r !== undefined) {
    // 如果是颜色对象（有 r, g, b 属性）
    if (cache[0] !== v.r || cache[1] !== v.g || cache[2] !== v.b) {
      gl.uniform3f(this.addr, v.r, v.g, v.b);

      cache[0] = v.r;
      cache[1] = v.g;
      cache[2] = v.b;
    }
  } else {
    // 如果是数组格式
    if (arraysEqual(cache, v)) return;

    gl.uniform3fv(this.addr, v);

    copyArray(cache, v);
  }
}

/**
 * 设置四维向量 uniform 值
 *
 * 支持两种输入格式：
 * 1. 具有 x, y, z, w 属性的向量对象（如 THREE.Vector4）
 * 2. 包含四个元素的数组
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Vector4|Array} v - 要设置的四维向量值
 */
function setValueV4f(gl, v) {
  const cache = this.cache;

  // 如果是向量对象（有 x, y, z, w 属性）
  if (v.x !== undefined) {
    if (cache[0] !== v.x || cache[1] !== v.y || cache[2] !== v.z || cache[3] !== v.w) {
      gl.uniform4f(this.addr, v.x, v.y, v.z, v.w);

      cache[0] = v.x;
      cache[1] = v.y;
      cache[2] = v.z;
      cache[3] = v.w;
    }
  } else {
    // 如果是数组格式
    if (arraysEqual(cache, v)) return;

    gl.uniform4fv(this.addr, v);

    copyArray(cache, v);
  }
}

// 单个矩阵设置函数（支持扁平数组或 THREE.MatrixN 对象）

/**
 * 设置 2x2 矩阵 uniform 值
 *
 * 支持两种输入格式：
 * 1. 具有 elements 属性的矩阵对象（如 THREE.Matrix2）
 * 2. 包含 4 个元素的扁平数组
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Matrix2|Array} v - 要设置的 2x2 矩阵值
 */
function setValueM2(gl, v) {
  const cache = this.cache;
  const elements = v.elements;

  if (elements === undefined) {
    // 如果是扁平数组格式
    if (arraysEqual(cache, v)) return;

    gl.uniformMatrix2fv(this.addr, false, v);

    copyArray(cache, v);
  } else {
    // 如果是矩阵对象格式
    if (arraysEqual(cache, elements)) return;

    // 使用预分配的数组避免内存分配
    mat2array.set(elements);

    gl.uniformMatrix2fv(this.addr, false, mat2array);

    copyArray(cache, elements);
  }
}

/**
 * 设置 3x3 矩阵 uniform 值
 *
 * 支持两种输入格式：
 * 1. 具有 elements 属性的矩阵对象（如 THREE.Matrix3）
 * 2. 包含 9 个元素的扁平数组
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Matrix3|Array} v - 要设置的 3x3 矩阵值
 */
function setValueM3(gl, v) {
  const cache = this.cache;
  const elements = v.elements;

  if (elements === undefined) {
    // 如果是扁平数组格式
    if (arraysEqual(cache, v)) return;

    gl.uniformMatrix3fv(this.addr, false, v);

    copyArray(cache, v);
  } else {
    // 如果是矩阵对象格式
    if (arraysEqual(cache, elements)) return;

    // 使用预分配的数组避免内存分配
    mat3array.set(elements);

    gl.uniformMatrix3fv(this.addr, false, mat3array);

    copyArray(cache, elements);
  }
}

/**
 * 设置 4x4 矩阵 uniform 值
 *
 * 支持两种输入格式：
 * 1. 具有 elements 属性的矩阵对象（如 THREE.Matrix4）
 * 2. 包含 16 个元素的扁平数组
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Matrix4|Array} v - 要设置的 4x4 矩阵值
 */
function setValueM4(gl, v) {
  const cache = this.cache;
  const elements = v.elements;

  if (elements === undefined) {
    // 如果是扁平数组格式
    if (arraysEqual(cache, v)) return;

    gl.uniformMatrix4fv(this.addr, false, v);

    copyArray(cache, v);
  } else {
    // 如果是矩阵对象格式
    if (arraysEqual(cache, elements)) return;

    // 使用预分配的数组避免内存分配
    mat4array.set(elements);

    gl.uniformMatrix4fv(this.addr, false, mat4array);

    copyArray(cache, elements);
  }
}

// 单个整数/布尔值设置函数

/**
 * 设置单个整数或布尔值 uniform
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {number|boolean} v - 要设置的整数或布尔值
 */
function setValueV1i(gl, v) {
  const cache = this.cache;

  // 如果值没有变化，跳过设置
  if (cache[0] === v) return;

  gl.uniform1i(this.addr, v);

  // 更新缓存
  cache[0] = v;
}

// 整数/布尔值向量设置函数（支持扁平数组或 THREE.VectorN 对象）

/**
 * 设置二维整数向量 uniform 值
 *
 * 支持两种输入格式：
 * 1. 具有 x, y 属性的向量对象
 * 2. 包含两个元素的数组
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Object|Array} v - 要设置的二维整数向量值
 */
function setValueV2i(gl, v) {
  const cache = this.cache;

  // 如果是向量对象（有 x, y 属性）
  if (v.x !== undefined) {
    if (cache[0] !== v.x || cache[1] !== v.y) {
      gl.uniform2i(this.addr, v.x, v.y);

      cache[0] = v.x;
      cache[1] = v.y;
    }
  } else {
    // 如果是数组格式
    if (arraysEqual(cache, v)) return;

    gl.uniform2iv(this.addr, v);

    copyArray(cache, v);
  }
}

function setValueV3i(gl, v) {
  const cache = this.cache;

  if (v.x !== undefined) {
    if (cache[0] !== v.x || cache[1] !== v.y || cache[2] !== v.z) {
      gl.uniform3i(this.addr, v.x, v.y, v.z);

      cache[0] = v.x;
      cache[1] = v.y;
      cache[2] = v.z;
    }
  } else {
    if (arraysEqual(cache, v)) return;

    gl.uniform3iv(this.addr, v);

    copyArray(cache, v);
  }
}

function setValueV4i(gl, v) {
  const cache = this.cache;

  if (v.x !== undefined) {
    if (cache[0] !== v.x || cache[1] !== v.y || cache[2] !== v.z || cache[3] !== v.w) {
      gl.uniform4i(this.addr, v.x, v.y, v.z, v.w);

      cache[0] = v.x;
      cache[1] = v.y;
      cache[2] = v.z;
      cache[3] = v.w;
    }
  } else {
    if (arraysEqual(cache, v)) return;

    gl.uniform4iv(this.addr, v);

    copyArray(cache, v);
  }
}

// Single unsigned integer

function setValueV1ui(gl, v) {
  const cache = this.cache;

  if (cache[0] === v) return;

  gl.uniform1ui(this.addr, v);

  cache[0] = v;
}

// Single unsigned integer vector (from flat array or THREE.VectorN)

function setValueV2ui(gl, v) {
  const cache = this.cache;

  if (v.x !== undefined) {
    if (cache[0] !== v.x || cache[1] !== v.y) {
      gl.uniform2ui(this.addr, v.x, v.y);

      cache[0] = v.x;
      cache[1] = v.y;
    }
  } else {
    if (arraysEqual(cache, v)) return;

    gl.uniform2uiv(this.addr, v);

    copyArray(cache, v);
  }
}

function setValueV3ui(gl, v) {
  const cache = this.cache;

  if (v.x !== undefined) {
    if (cache[0] !== v.x || cache[1] !== v.y || cache[2] !== v.z) {
      gl.uniform3ui(this.addr, v.x, v.y, v.z);

      cache[0] = v.x;
      cache[1] = v.y;
      cache[2] = v.z;
    }
  } else {
    if (arraysEqual(cache, v)) return;

    gl.uniform3uiv(this.addr, v);

    copyArray(cache, v);
  }
}

function setValueV4ui(gl, v) {
  const cache = this.cache;

  if (v.x !== undefined) {
    if (cache[0] !== v.x || cache[1] !== v.y || cache[2] !== v.z || cache[3] !== v.w) {
      gl.uniform4ui(this.addr, v.x, v.y, v.z, v.w);

      cache[0] = v.x;
      cache[1] = v.y;
      cache[2] = v.z;
      cache[3] = v.w;
    }
  } else {
    if (arraysEqual(cache, v)) return;

    gl.uniform4uiv(this.addr, v);

    copyArray(cache, v);
  }
}

// 单个纹理设置函数（2D / 立方体）

/**
 * 设置 2D 纹理 uniform 值
 *
 * 分配一个纹理单元并将纹理绑定到该单元。
 * 支持普通 2D 纹理和阴影纹理。
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Texture} v - 要设置的纹理对象
 * @param {Object} textures - 纹理管理器
 */
function setValueT1(gl, v, textures) {
  const cache = this.cache;
  const unit = textures.allocateTextureUnit();

  // 如果纹理单元发生变化，更新 uniform
  if (cache[0] !== unit) {
    gl.uniform1i(this.addr, unit);
    cache[0] = unit;
  }

  let emptyTexture2D;

  // 根据采样器类型选择合适的空纹理
  if (this.type === gl.SAMPLER_2D_SHADOW) {
    emptyShadowTexture.compareFunction = LessEqualCompare; // #28670
    emptyTexture2D = emptyShadowTexture;
  } else {
    emptyTexture2D = emptyTexture;
  }

  // 设置纹理，如果没有提供纹理则使用空纹理
  textures.setTexture2D(v || emptyTexture2D, unit);
}

/**
 * 设置 3D 纹理 uniform 值
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Texture3D} v - 要设置的 3D 纹理对象
 * @param {Object} textures - 纹理管理器
 */
function setValueT3D1(gl, v, textures) {
  const cache = this.cache;
  const unit = textures.allocateTextureUnit();

  if (cache[0] !== unit) {
    gl.uniform1i(this.addr, unit);
    cache[0] = unit;
  }

  // 设置 3D 纹理，如果没有提供纹理则使用空 3D 纹理
  textures.setTexture3D(v || empty3dTexture, unit);
}

/**
 * 设置立方体纹理 uniform 值
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {CubeTexture} v - 要设置的立方体纹理对象
 * @param {Object} textures - 纹理管理器
 */
function setValueT6(gl, v, textures) {
  const cache = this.cache;
  const unit = textures.allocateTextureUnit();

  if (cache[0] !== unit) {
    gl.uniform1i(this.addr, unit);
    cache[0] = unit;
  }

  // 设置立方体纹理，如果没有提供纹理则使用空立方体纹理
  textures.setTextureCube(v || emptyCubeTexture, unit);
}

/**
 * 设置 2D 数组纹理 uniform 值
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {DataArrayTexture} v - 要设置的 2D 数组纹理对象
 * @param {Object} textures - 纹理管理器
 */
function setValueT2DArray1(gl, v, textures) {
  const cache = this.cache;
  const unit = textures.allocateTextureUnit();

  if (cache[0] !== unit) {
    gl.uniform1i(this.addr, unit);
    cache[0] = unit;
  }

  // 设置 2D 数组纹理，如果没有提供纹理则使用空数组纹理
  textures.setTexture2DArray(v || emptyArrayTexture, unit);
}

// 辅助函数：为单个值情况选择正确的设置器

/**
 * 根据 uniform 类型获取对应的单值设置函数
 *
 * 这个函数根据 WebGL uniform 类型常量返回相应的设置函数。
 * 支持浮点数、整数、无符号整数、矩阵和各种纹理采样器类型。
 *
 * @param {number} type - WebGL uniform 类型常量
 * @returns {Function} 对应的设置函数
 */
function getSingularSetter(type) {
  switch (type) {
    case 0x1406:
      return setValueV1f; // FLOAT
    case 0x8b50:
      return setValueV2f; // _VEC2
    case 0x8b51:
      return setValueV3f; // _VEC3
    case 0x8b52:
      return setValueV4f; // _VEC4

    case 0x8b5a:
      return setValueM2; // _MAT2
    case 0x8b5b:
      return setValueM3; // _MAT3
    case 0x8b5c:
      return setValueM4; // _MAT4

    case 0x1404:
    case 0x8b56:
      return setValueV1i; // INT, BOOL
    case 0x8b53:
    case 0x8b57:
      return setValueV2i; // _VEC2
    case 0x8b54:
    case 0x8b58:
      return setValueV3i; // _VEC3
    case 0x8b55:
    case 0x8b59:
      return setValueV4i; // _VEC4

    case 0x1405:
      return setValueV1ui; // UINT
    case 0x8dc6:
      return setValueV2ui; // _VEC2
    case 0x8dc7:
      return setValueV3ui; // _VEC3
    case 0x8dc8:
      return setValueV4ui; // _VEC4

    case 0x8b5e: // SAMPLER_2D
    case 0x8d66: // SAMPLER_EXTERNAL_OES
    case 0x8dca: // INT_SAMPLER_2D
    case 0x8dd2: // UNSIGNED_INT_SAMPLER_2D
    case 0x8b62: // SAMPLER_2D_SHADOW
      return setValueT1;

    case 0x8b5f: // SAMPLER_3D
    case 0x8dcb: // INT_SAMPLER_3D
    case 0x8dd3: // UNSIGNED_INT_SAMPLER_3D
      return setValueT3D1;

    case 0x8b60: // SAMPLER_CUBE
    case 0x8dcc: // INT_SAMPLER_CUBE
    case 0x8dd4: // UNSIGNED_INT_SAMPLER_CUBE
    case 0x8dc5: // SAMPLER_CUBE_SHADOW
      return setValueT6;

    case 0x8dc1: // SAMPLER_2D_ARRAY
    case 0x8dcf: // INT_SAMPLER_2D_ARRAY
    case 0x8dd7: // UNSIGNED_INT_SAMPLER_2D_ARRAY
    case 0x8dc4: // SAMPLER_2D_ARRAY_SHADOW
      return setValueT2DArray1;
  }
}

// 标量数组设置函数

/**
 * 设置浮点数标量数组 uniform
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 浮点数数组
 */
function setValueV1fArray(gl, v) {
  gl.uniform1fv(this.addr, v);
}

// 向量数组设置函数（来自扁平数组或 THREE.VectorN 数组）

/**
 * 设置二维浮点向量数组 uniform
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 二维向量数组（可以是 Vector2 对象数组或扁平数组）
 */
function setValueV2fArray(gl, v) {
  // 将向量数组扁平化为连续的浮点数组
  const data = flatten(v, this.size, 2);

  gl.uniform2fv(this.addr, data);
}

/**
 * 设置三维浮点向量数组 uniform
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 三维向量数组（可以是 Vector3 对象数组或扁平数组）
 */
function setValueV3fArray(gl, v) {
  // 将向量数组扁平化为连续的浮点数组
  const data = flatten(v, this.size, 3);

  gl.uniform3fv(this.addr, data);
}

/**
 * 设置四维浮点向量数组 uniform
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 四维向量数组（可以是 Vector4 对象数组或扁平数组）
 */
function setValueV4fArray(gl, v) {
  // 将向量数组扁平化为连续的浮点数组
  const data = flatten(v, this.size, 4);

  gl.uniform4fv(this.addr, data);
}

// 矩阵数组设置函数（来自扁平数组或 THREE.MatrixN 数组）

/**
 * 设置 2x2 矩阵数组 uniform
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 2x2 矩阵数组
 */
function setValueM2Array(gl, v) {
  // 将矩阵数组扁平化为连续的浮点数组
  const data = flatten(v, this.size, 4);

  gl.uniformMatrix2fv(this.addr, false, data);
}

/**
 * 设置 3x3 矩阵数组 uniform 值
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 矩阵数组
 */
function setValueM3Array(gl, v) {
  // 将矩阵数组扁平化为连续的浮点数组
  const data = flatten(v, this.size, 9);

  gl.uniformMatrix3fv(this.addr, false, data);
}

/**
 * 设置 4x4 矩阵数组 uniform 值
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 矩阵数组
 */
function setValueM4Array(gl, v) {
  // 将矩阵数组扁平化为连续的浮点数组
  const data = flatten(v, this.size, 16);

  gl.uniformMatrix4fv(this.addr, false, data);
}

// 整数/布尔值数组设置函数

/**
 * 设置整数/布尔值数组 uniform
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 整数/布尔值数组
 */
function setValueV1iArray(gl, v) {
  gl.uniform1iv(this.addr, v);
}

// 整数/布尔值向量数组设置函数（来自扁平数组）

/**
 * 设置二维整数向量数组 uniform
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 二维整数向量数组
 */
function setValueV2iArray(gl, v) {
  gl.uniform2iv(this.addr, v);
}

/**
 * 设置三维整数向量数组 uniform
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 三维整数向量数组
 */
function setValueV3iArray(gl, v) {
  gl.uniform3iv(this.addr, v);
}

/**
 * 设置四维整数向量数组 uniform
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 四维整数向量数组
 */
function setValueV4iArray(gl, v) {
  gl.uniform4iv(this.addr, v);
}

// 无符号整数数组设置函数

/**
 * 设置无符号整数数组 uniform
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 无符号整数数组
 */
function setValueV1uiArray(gl, v) {
  gl.uniform1uiv(this.addr, v);
}

// 无符号整数向量数组设置函数（来自扁平数组）

/**
 * 设置二维无符号整数向量数组 uniform
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 二维无符号整数向量数组
 */
function setValueV2uiArray(gl, v) {
  gl.uniform2uiv(this.addr, v);
}

/**
 * 设置三维无符号整数向量数组 uniform
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 三维无符号整数向量数组
 */
function setValueV3uiArray(gl, v) {
  gl.uniform3uiv(this.addr, v);
}

/**
 * 设置四维无符号整数向量数组 uniform
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 四维无符号整数向量数组
 */
function setValueV4uiArray(gl, v) {
  gl.uniform4uiv(this.addr, v);
}

// 纹理数组设置函数（2D / 3D / 立方体 / 2D数组）

/**
 * 设置 2D 纹理数组 uniform
 *
 * 为数组中的每个纹理分配纹理单元，并将它们绑定到相应的单元。
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 纹理数组
 * @param {Object} textures - 纹理管理器
 */
function setValueT1Array(gl, v, textures) {
  const cache = this.cache;

  const n = v.length;

  // 为所有纹理分配纹理单元
  const units = allocTexUnits(textures, n);

  // 如果纹理单元发生变化，更新 uniform
  if (!arraysEqual(cache, units)) {
    gl.uniform1iv(this.addr, units);

    copyArray(cache, units);
  }

  // 将每个纹理绑定到对应的纹理单元
  for (let i = 0; i !== n; ++i) {
    textures.setTexture2D(v[i] || emptyTexture, units[i]);
  }
}

function setValueT3DArray(gl, v, textures) {
  const cache = this.cache;

  const n = v.length;

  const units = allocTexUnits(textures, n);

  if (!arraysEqual(cache, units)) {
    gl.uniform1iv(this.addr, units);

    copyArray(cache, units);
  }

  for (let i = 0; i !== n; ++i) {
    textures.setTexture3D(v[i] || empty3dTexture, units[i]);
  }
}

function setValueT6Array(gl, v, textures) {
  const cache = this.cache;

  const n = v.length;

  const units = allocTexUnits(textures, n);

  if (!arraysEqual(cache, units)) {
    gl.uniform1iv(this.addr, units);

    copyArray(cache, units);
  }

  for (let i = 0; i !== n; ++i) {
    textures.setTextureCube(v[i] || emptyCubeTexture, units[i]);
  }
}

/**
 * 设置 2D 数组纹理数组 uniform
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Array} v - 2D 数组纹理数组
 * @param {Object} textures - 纹理管理器
 */
function setValueT2DArrayArray(gl, v, textures) {
  const cache = this.cache;

  const n = v.length;

  // 为所有纹理分配纹理单元
  const units = allocTexUnits(textures, n);

  // 如果纹理单元发生变化，更新 uniform
  if (!arraysEqual(cache, units)) {
    gl.uniform1iv(this.addr, units);

    copyArray(cache, units);
  }

  // 将每个 2D 数组纹理绑定到对应的纹理单元
  for (let i = 0; i !== n; ++i) {
    textures.setTexture2DArray(v[i] || emptyArrayTexture, units[i]);
  }
}

// 辅助函数：为纯（底层）数组选择正确的设置器

/**
 * 根据 uniform 类型获取对应的数组设置函数
 *
 * 这个函数根据 WebGL uniform 类型常量返回相应的数组设置函数。
 * 支持各种基本类型的数组：浮点数、整数、无符号整数、矩阵和纹理采样器。
 *
 * @param {number} type - WebGL uniform 类型常量
 * @returns {Function} 对应的数组设置函数
 */
function getPureArraySetter(type) {
  switch (type) {
    case 0x1406:
      return setValueV1fArray; // FLOAT
    case 0x8b50:
      return setValueV2fArray; // _VEC2
    case 0x8b51:
      return setValueV3fArray; // _VEC3
    case 0x8b52:
      return setValueV4fArray; // _VEC4

    case 0x8b5a:
      return setValueM2Array; // _MAT2
    case 0x8b5b:
      return setValueM3Array; // _MAT3
    case 0x8b5c:
      return setValueM4Array; // _MAT4

    case 0x1404:
    case 0x8b56:
      return setValueV1iArray; // INT, BOOL
    case 0x8b53:
    case 0x8b57:
      return setValueV2iArray; // _VEC2
    case 0x8b54:
    case 0x8b58:
      return setValueV3iArray; // _VEC3
    case 0x8b55:
    case 0x8b59:
      return setValueV4iArray; // _VEC4

    case 0x1405:
      return setValueV1uiArray; // UINT
    case 0x8dc6:
      return setValueV2uiArray; // _VEC2
    case 0x8dc7:
      return setValueV3uiArray; // _VEC3
    case 0x8dc8:
      return setValueV4uiArray; // _VEC4

    case 0x8b5e: // SAMPLER_2D
    case 0x8d66: // SAMPLER_EXTERNAL_OES
    case 0x8dca: // INT_SAMPLER_2D
    case 0x8dd2: // UNSIGNED_INT_SAMPLER_2D
    case 0x8b62: // SAMPLER_2D_SHADOW
      return setValueT1Array;

    case 0x8b5f: // SAMPLER_3D
    case 0x8dcb: // INT_SAMPLER_3D
    case 0x8dd3: // UNSIGNED_INT_SAMPLER_3D
      return setValueT3DArray;

    case 0x8b60: // SAMPLER_CUBE
    case 0x8dcc: // INT_SAMPLER_CUBE
    case 0x8dd4: // UNSIGNED_INT_SAMPLER_CUBE
    case 0x8dc5: // SAMPLER_CUBE_SHADOW
      return setValueT6Array;

    case 0x8dc1: // SAMPLER_2D_ARRAY
    case 0x8dcf: // INT_SAMPLER_2D_ARRAY
    case 0x8dd7: // UNSIGNED_INT_SAMPLER_2D_ARRAY
    case 0x8dc4: // SAMPLER_2D_ARRAY_SHADOW
      return setValueT2DArrayArray;
  }
}

// --- Uniform 类定义 ---

/**
 * 单一 Uniform 变量类
 *
 * 表示一个单独的 uniform 变量，不是数组或结构体的一部分。
 * 包含变量的 ID、地址、缓存和类型信息。
 */
class SingleUniform {
  constructor(id, activeInfo, addr) {
    this.id = id; // uniform 变量的 ID
    this.addr = addr; // WebGL uniform 位置
    this.cache = []; // 值缓存，用于避免重复设置
    this.type = activeInfo.type; // uniform 变量类型
    this.setValue = getSingularSetter(activeInfo.type); // 设置值的函数

    // this.path = activeInfo.name; // DEBUG
  }
}

/**
 * 纯数组 Uniform 变量类
 *
 * 表示一个数组类型的 uniform 变量，包含多个相同类型的元素。
 * 除了基本属性外，还包含数组大小信息。
 */
class PureArrayUniform {
  constructor(id, activeInfo, addr) {
    this.id = id; // uniform 变量的 ID
    this.addr = addr; // WebGL uniform 位置
    this.cache = []; // 值缓存，用于避免重复设置
    this.type = activeInfo.type; // uniform 变量类型
    this.size = activeInfo.size; // 数组大小
    this.setValue = getPureArraySetter(activeInfo.type); // 设置数组值的函数

    // this.path = activeInfo.name; // DEBUG
  }
}

/**
 * 结构化 Uniform 变量类
 *
 * 表示一个结构体类型的 uniform 变量，包含多个子 uniform。
 * 维护一个序列和映射表来管理子 uniform。
 */
class StructuredUniform {
  constructor(id) {
    this.id = id; // uniform 变量的 ID

    this.seq = []; // 子 uniform 的序列
    this.map = {}; // 按名称索引的子 uniform 映射
  }

  /**
   * 设置结构化 uniform 的值
   *
   * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
   * @param {Object} value - 要设置的值对象
   * @param {Object} textures - 纹理管理器
   */
  setValue(gl, value, textures) {
    const seq = this.seq;

    // 遍历所有子 uniform 并设置其值
    for (let i = 0, n = seq.length; i !== n; ++i) {
      const u = seq[i];
      u.setValue(gl, value[u.id], textures);
    }
  }
}

// --- 顶级解析器 ---

// 解析器 - 从路径字符串构建属性树

/**
 * 正则表达式，用于解析 uniform 路径的各个部分
 *
 * 提取：
 * - 标识符（成员名称或数组索引）
 * - 可选的右方括号（在数组索引时出现）
 * - 可选的左方括号或点（下标类型）
 *
 * 注意：这些部分可以以非重叠的方式读取，
 * 允许直接解析 WebGL 在 uniform 名称中编码的层次结构。
 */
const RePathPart = /(\w+)(\])?(\[|\.)?/g;

/**
 * 将 uniform 对象添加到容器中
 *
 * @param {Object} container - 容器对象
 * @param {Object} uniformObject - 要添加的 uniform 对象
 */
function addUniform(container, uniformObject) {
  container.seq.push(uniformObject);
  container.map[uniformObject.id] = uniformObject;
}

/**
 * 解析 uniform 变量并构建层次结构
 *
 * 这个函数解析 WebGL uniform 的名称路径，并在容器中构建相应的层次结构。
 * 它处理简单变量、数组和结构体的嵌套情况。
 *
 * 例如：
 * - "color" -> SingleUniform
 * - "lights[0]" -> PureArrayUniform
 * - "material.diffuse" -> StructuredUniform 包含 SingleUniform
 * - "lights[0].position" -> StructuredUniform 包含 StructuredUniform 包含 SingleUniform
 *
 * @param {WebGLActiveInfo} activeInfo - WebGL 活跃 uniform 信息
 * @param {WebGLUniformLocation} addr - uniform 位置
 * @param {Object} container - 目标容器对象
 */
function parseUniform(activeInfo, addr, container) {
  const path = activeInfo.name,
    pathLength = path.length;

  // 重置正则表达式对象，因为之前的运行可能提前退出
  RePathPart.lastIndex = 0;

  while (true) {
    const match = RePathPart.exec(path),
      matchEnd = RePathPart.lastIndex;

    let id = match[1];
    const idIsIndex = match[2] === "]", // 是否为数组索引
      subscript = match[3]; // 下标类型（[ 或 .）

    // 如果是数组索引，转换为整数
    if (idIsIndex) id = id | 0;

    if (subscript === undefined || (subscript === "[" && matchEnd + 2 === pathLength)) {
      // 裸名称或"纯"底层数组 "[0]" 后缀
      // 这是路径的终点，创建相应的 uniform 对象

      addUniform(container, subscript === undefined ? new SingleUniform(id, activeInfo, addr) : new PureArrayUniform(id, activeInfo, addr));

      break;
    } else {
      // 进入内部节点 / 如果不存在则创建它
      // 这是路径的中间部分，需要创建结构化容器

      const map = container.map;
      let next = map[id];

      if (next === undefined) {
        next = new StructuredUniform(id);
        addUniform(container, next);
      }

      container = next;
    }
  }
}

// 根容器

/**
 * WebGL Uniform 变量管理器
 *
 * 这是顶级容器类，负责管理一个 WebGL 程序中的所有 uniform 变量。
 * 它解析程序中的 uniform 变量，构建树状结构，并提供设置和上传 uniform 值的方法。
 */
class WebGLUniforms {
  /**
   * 构造函数
   *
   * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
   * @param {WebGLProgram} program - WebGL 程序对象
   */
  constructor(gl, program) {
    this.seq = []; // uniform 变量序列
    this.map = {}; // 按名称索引的 uniform 变量映射

    // 获取程序中活跃的 uniform 变量数量
    const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

    // 遍历所有 uniform 变量并解析
    for (let i = 0; i < n; ++i) {
      const info = gl.getActiveUniform(program, i),
        addr = gl.getUniformLocation(program, info.name);

      parseUniform(info, addr, this);
    }
  }

  /**
   * 设置指定名称的 uniform 变量值
   *
   * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
   * @param {string} name - uniform 变量名称
   * @param {*} value - 要设置的值
   * @param {Object} textures - 纹理管理器
   */
  setValue(gl, name, value, textures) {
    const u = this.map[name];

    if (u !== undefined) u.setValue(gl, value, textures);
  }

  /**
   * 设置对象的可选属性作为 uniform 变量值
   *
   * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
   * @param {Object} object - 包含属性的对象
   * @param {string} name - 属性名称
   */
  setOptional(gl, object, name) {
    const v = object[name];

    if (v !== undefined) this.setValue(gl, name, v);
  }

  /**
   * 批量上传 uniform 变量值（静态方法）
   *
   * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
   * @param {Array} seq - uniform 变量序列
   * @param {Object} values - 包含值的对象
   * @param {Object} textures - 纹理管理器
   */
  static upload(gl, seq, values, textures) {
    for (let i = 0, n = seq.length; i !== n; ++i) {
      const u = seq[i],
        v = values[u.id];

      if (v.needsUpdate !== false) {
        // 注意：当 .needsUpdate 为 undefined 时总是更新
        u.setValue(gl, v.value, textures);
      }
    }
  }

  /**
   * 过滤具有对应值的 uniform 变量序列（静态方法）
   *
   * @param {Array} seq - uniform 变量序列
   * @param {Object} values - 包含值的对象
   * @returns {Array} 过滤后的 uniform 变量序列
   */
  static seqWithValue(seq, values) {
    const r = [];

    // 遍历序列，只保留在 values 中有对应值的 uniform
    for (let i = 0, n = seq.length; i !== n; ++i) {
      const u = seq[i];
      if (u.id in values) r.push(u);
    }

    return r;
  }
}

export { WebGLUniforms };
