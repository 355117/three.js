// 从核心模块导入缓冲属性类
import { BufferAttribute } from "../core/BufferAttribute.js";
// 从核心模块导入缓冲几何体类
import { BufferGeometry } from "../core/BufferGeometry.js";
// 从纹理模块导入数据纹理类
import { DataTexture } from "../textures/DataTexture.js";
// 从常量模块导入各种数据类型和格式常量
import { FloatType, RedIntegerFormat, UnsignedIntType, RGBAFormat } from "../constants.js";
// 从数学模块导入4x4矩阵类
import { Matrix4 } from "../math/Matrix4.js";
// 从当前目录导入网格基类
import { Mesh } from "./Mesh.js";
// 从数学模块导入颜色管理类
import { ColorManagement } from "../math/ColorManagement.js";
// 从数学模块导入3D包围盒类
import { Box3 } from "../math/Box3.js";
// 从数学模块导入球体类
import { Sphere } from "../math/Sphere.js";
// 从数学模块导入视锥体类
import { Frustum } from "../math/Frustum.js";
// 从数学模块导入3D向量类
import { Vector3 } from "../math/Vector3.js";
// 从数学模块导入颜色类
import { Color } from "../math/Color.js";
// 从数学模块导入视锥体数组类
import { FrustumArray } from "../math/FrustumArray.js";

/**
 * 升序ID排序函数
 *
 * 用于对ID进行升序排序的比较函数
 *
 * @param {number} a - 第一个ID
 * @param {number} b - 第二个ID
 * @return {number} 排序结果：负数表示a<b，正数表示a>b，0表示相等
 */
function ascIdSort(a, b) {
  return a - b;
}

/**
 * 不透明对象深度排序函数
 *
 * 用于对不透明对象按深度进行前到后排序的比较函数
 *
 * @param {Object} a - 第一个渲染项
 * @param {Object} b - 第二个渲染项
 * @return {number} 排序结果：按z值升序排列
 */
function sortOpaque(a, b) {
  return a.z - b.z;
}

/**
 * 透明对象深度排序函数
 *
 * 用于对透明对象按深度进行后到前排序的比较函数
 *
 * @param {Object} a - 第一个渲染项
 * @param {Object} b - 第二个渲染项
 * @return {number} 排序结果：按z值降序排列
 */
function sortTransparent(a, b) {
  return b.z - a.z;
}

/**
 * 多重绘制渲染列表类
 *
 * 用于管理批量渲染中的绘制调用列表，支持对象池以减少内存分配
 */
class MultiDrawRenderList {
  /**
   * 构造函数
   *
   * 初始化渲染列表的索引、对象池和列表
   */
  constructor() {
    // 当前使用的对象池索引
    this.index = 0;
    // 对象池，用于重用渲染项对象
    this.pool = [];
    // 当前帧的渲染项列表
    this.list = [];
  }

  /**
   * 添加渲染项到列表
   *
   * @param {number} start - 绘制起始索引
   * @param {number} count - 绘制数量
   * @param {number} z - 深度值，用于排序
   * @param {number} index - 几何体索引
   */
  push(start, count, z, index) {
    // 获取对象池和列表的引用
    const pool = this.pool;
    const list = this.list;

    // 如果对象池不够用，创建新的渲染项对象
    if (this.index >= pool.length) {
      pool.push({
        start: -1, // 绘制起始索引
        count: -1, // 绘制数量
        z: -1, // 深度值
        index: -1, // 几何体索引
      });
    }

    // 从对象池中获取一个渲染项对象
    const item = pool[this.index];
    // 将渲染项添加到当前列表
    list.push(item);
    // 移动到下一个对象池位置
    this.index++;

    // 设置渲染项的属性
    item.start = start;
    item.count = count;
    item.z = z;
    item.index = index;
  }

  /**
   * 重置渲染列表
   *
   * 清空当前列表并重置索引，准备下一帧的渲染
   */
  reset() {
    // 清空渲染列表
    this.list.length = 0;
    // 重置对象池索引
    this.index = 0;
  }
}

// 用于变换计算的临时矩阵（模块级别的重用对象，避免重复创建）
const _matrix = /*@__PURE__*/ new Matrix4();
// 白色颜色常量（模块级别的重用对象，避免重复创建）
const _whiteColor = /*@__PURE__*/ new Color(1, 1, 1);
// 用于视锥体剔除的视锥体对象（模块级别的重用对象，避免重复创建）
const _frustum = /*@__PURE__*/ new Frustum();
// 用于批量视锥体剔除的视锥体数组（模块级别的重用对象，避免重复创建）
const _frustumArray = /*@__PURE__*/ new FrustumArray();
// 用于边界计算的包围盒（模块级别的重用对象，避免重复创建）
const _box = /*@__PURE__*/ new Box3();
// 用于边界计算的球体（模块级别的重用对象，避免重复创建）
const _sphere = /*@__PURE__*/ new Sphere();
// 用于各种计算的临时向量（模块级别的重用对象，避免重复创建）
const _vector = /*@__PURE__*/ new Vector3();
// 用于方向计算的前向向量（模块级别的重用对象，避免重复创建）
const _forward = /*@__PURE__*/ new Vector3();
// 用于临时计算的向量（模块级别的重用对象，避免重复创建）
const _temp = /*@__PURE__*/ new Vector3();
// 多重绘制渲染列表实例（模块级别的重用对象，避免重复创建）
const _renderList = /*@__PURE__*/ new MultiDrawRenderList();
// 用于射线检测的临时网格对象（模块级别的重用对象，避免重复创建）
const _mesh = /*@__PURE__*/ new Mesh();
// 用于存储批量交点的数组（模块级别的重用对象，避免重复创建）
const _batchIntersects = [];

/**
 * 复制属性数据
 *
 * 将源属性"src"的数据复制到目标属性"target"中，从"targetOffset"开始
 *
 * @param {BufferAttribute} src - 源缓冲属性
 * @param {BufferAttribute} target - 目标缓冲属性
 * @param {number} targetOffset - 目标偏移量，默认为0
 */
function copyAttributeData(src, target, targetOffset = 0) {
  // 获取目标属性的项大小（每个顶点的组件数量）
  const itemSize = target.itemSize;

  // 如果源属性是交错缓冲属性或数组构造函数不匹配
  if (src.isInterleavedBufferAttribute || src.array.constructor !== target.array.constructor) {
    // 如果数组数据不能直接复制，则使用组件的getter和setter方法
    const vertexCount = src.count;
    for (let i = 0; i < vertexCount; i++) {
      for (let c = 0; c < itemSize; c++) {
        target.setComponent(i + targetOffset, c, src.getComponent(i, c));
      }
    }
  } else {
    // 使用类型化数组的set函数进行更快的复制
    target.array.set(src.array, targetOffset * itemSize);
  }

  // 标记目标属性需要更新
  target.needsUpdate = true;
}

/**
 * 安全地复制数组内容到可能更小的数组
 *
 * 这个函数处理不同类型数组之间的复制，确保数据正确传输
 *
 * @param {TypedArray} src - 源数组
 * @param {TypedArray} target - 目标数组
 */
function copyArrayContents(src, target) {
  // 如果数组构造函数不同（例如由于索引大小增加）
  if (src.constructor !== target.constructor) {
    // 则必须逐元素复制数据
    const len = Math.min(src.length, target.length);
    for (let i = 0; i < len; i++) {
      target[i] = src[i];
    }
  } else {
    // 如果数组使用相同的数据布局，我们可以使用快速块复制
    const len = Math.min(src.length, target.length);
    target.set(new src.constructor(src.buffer, 0, len));
  }
}

/**
 * 批量网格类，支持多重绘制批量渲染的特殊网格版本
 *
 * 当你需要渲染大量具有相同材质但具有不同几何体或世界变换的对象时，使用此类。
 * BatchedMesh的使用将帮助你减少绘制调用次数，从而提高应用程序的整体渲染性能。
 *
 * 批量渲染是一种高级优化技术，它将多个不同的几何体合并到单个缓冲区中，
 * 然后使用多重绘制调用在一次渲染过程中绘制所有实例。
 *
 * 使用示例：
 * ```js
 * const box = new THREE.BoxGeometry( 1, 1, 1 );        // 创建立方体几何体
 * const sphere = new THREE.SphereGeometry( 1, 12, 12 ); // 创建球体几何体
 * const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } ); // 创建绿色材质
 *
 * // 初始化批量网格并添加几何体
 * const batchedMesh = new BatchedMesh( 10, 5000, 10000, material );
 * const boxGeometryId = batchedMesh.addGeometry( box );       // 添加立方体几何体
 * const sphereGeometryId = batchedMesh.addGeometry( sphere ); // 添加球体几何体
 *
 * // 创建这些几何体的实例
 * const boxInstancedId1 = batchedMesh.addInstance( boxGeometryId );    // 立方体实例1
 * const boxInstancedId2 = batchedMesh.addInstance( boxGeometryId );    // 立方体实例2
 *
 * const sphereInstancedId1 = batchedMesh.addInstance( sphereGeometryId ); // 球体实例1
 * const sphereInstancedId2 = batchedMesh.addInstance( sphereGeometryId ); // 球体实例2
 *
 * // 设置几何体的位置
 * batchedMesh.setMatrixAt( boxInstancedId1, boxMatrix1 );       // 设置立方体1的变换矩阵
 * batchedMesh.setMatrixAt( boxInstancedId2, boxMatrix2 );       // 设置立方体2的变换矩阵
 *
 * batchedMesh.setMatrixAt( sphereInstancedId1, sphereMatrix1 ); // 设置球体1的变换矩阵
 * batchedMesh.setMatrixAt( sphereInstancedId2, sphereMatrix2 ); // 设置球体2的变换矩阵
 *
 * scene.add( batchedMesh ); // 将批量网格添加到场景中
 * ```
 *
 * @augments Mesh
 */
class BatchedMesh extends Mesh {
  /**
   * 构造一个新的批量网格
   *
   * @param {number} maxInstanceCount - 计划添加和渲染的单个实例的最大数量
   * @param {number} maxVertexCount - 所有唯一几何体使用的顶点最大数量
   * @param {number} [maxIndexCount=maxVertexCount*2] - 所有唯一几何体使用的索引最大数量
   * @param {Material|Array<Material>} [material] - 网格材质
   */
  constructor(maxInstanceCount, maxVertexCount, maxIndexCount = maxVertexCount * 2, material) {
    // 调用父类Mesh的构造函数，使用空的BufferGeometry
    super(new BufferGeometry(), material);

    /**
     * 用于类型检测的标志位
     *
     * 这个标志可以用来快速判断一个对象是否为BatchedMesh类型，
     * 在渲染器中用于识别需要批量渲染的对象
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isBatchedMesh = true;

    /**
     * 是否对批量中的单个对象进行视锥体剔除
     *
     * 当设置为true时，批量中的单个对象会进行视锥体剔除，
     * 只有在相机视野内的对象才会被渲染，提高性能
     *
     * @type {boolean}
     * @default true
     */
    this.perObjectFrustumCulled = true;

    /**
     * 是否对批量中的单个对象进行排序以改善过度绘制相关的伪影
     *
     * 当设置为true时，批量中的单个对象会被排序以改善渲染质量。
     * 如果材质标记为"透明"，对象从后到前渲染；如果不是，则从前到后渲染。
     *
     * @type {boolean}
     * @default true
     */
    this.sortObjects = true;

    /**
     * 批量网格的包围盒
     *
     * 包含所有批量对象的轴对齐包围盒。可以通过computeBoundingBox方法计算。
     * 用于视锥体剔除和碰撞检测等优化。
     *
     * @type {?Box3}
     * @default null
     */
    this.boundingBox = null;

    /**
     * 批量网格的包围球
     *
     * 包含所有批量对象的包围球。可以通过computeBoundingSphere方法计算。
     * 用于视锥体剔除和距离计算等优化。
     *
     * @type {?Sphere}
     * @default null
     */
    this.boundingSphere = null;

    /**
     * 自定义排序函数
     *
     * 接受一个在渲染前运行的排序函数。该函数接受要排序的实例列表和相机。
     * 列表中的对象包含一个"z"字段，用于执行深度排序。
     *
     * @type {?Function}
     * @default null
     */
    this.customSort = null;

    // 存储每个实例的可见性、活动状态和几何体ID，以及几何体的保留缓冲区范围
    this._instanceInfo = []; // 实例信息数组
    this._geometryInfo = []; // 几何体信息数组

    // 已设置为非活动状态的实例和几何体ID，可用于覆盖
    this._availableInstanceIds = []; // 可用的实例ID数组
    this._availableGeometryIds = []; // 可用的几何体ID数组

    // 用于跟踪几何体应该插入的下一个位置
    this._nextIndexStart = 0; // 下一个索引起始位置
    this._nextVertexStart = 0; // 下一个顶点起始位置
    this._geometryCount = 0; // 几何体数量计数

    // 状态标志
    this._visibilityChanged = true; // 可见性是否已更改
    this._geometryInitialized = false; // 几何体是否已初始化

    // 缓存的用户选项
    this._maxInstanceCount = maxInstanceCount; // 最大实例数量
    this._maxVertexCount = maxVertexCount; // 最大顶点数量
    this._maxIndexCount = maxIndexCount; // 最大索引数量

    // 多重绘制的缓冲区
    this._multiDrawCounts = new Int32Array(maxInstanceCount); // 多重绘制计数数组
    this._multiDrawStarts = new Int32Array(maxInstanceCount); // 多重绘制起始数组
    this._multiDrawCount = 0; // 多重绘制数量
    this._multiDrawInstances = null; // 多重绘制实例

    // 使用数据纹理存储每个几何体的本地矩阵
    this._matricesTexture = null; // 矩阵纹理
    this._indirectTexture = null; // 间接纹理
    this._colorsTexture = null; // 颜色纹理

    // 初始化矩阵纹理
    this._initMatricesTexture();
    // 初始化间接纹理
    this._initIndirectTexture();
  }

  /**
   * 批量中可以存储的单个实例的最大数量
   *
   * @type {number}
   * @readonly
   */
  get maxInstanceCount() {
    return this._maxInstanceCount;
  }

  /**
   * 当前实例数量
   *
   * 计算当前活动实例的数量（总实例数减去可用实例数）
   *
   * @type {number}
   * @readonly
   */
  get instanceCount() {
    return this._instanceInfo.length - this._availableInstanceIds.length;
  }

  /**
   * 未使用的顶点数量
   *
   * 返回还可以添加的顶点数量
   *
   * @type {number}
   * @readonly
   */
  get unusedVertexCount() {
    return this._maxVertexCount - this._nextVertexStart;
  }

  /**
   * 未使用的索引数量
   *
   * 返回还可以添加的索引数量
   *
   * @type {number}
   * @readonly
   */
  get unusedIndexCount() {
    return this._maxIndexCount - this._nextIndexStart;
  }

  /**
   * 初始化矩阵纹理
   *
   * 创建用于存储实例变换矩阵的数据纹理。
   * 每个矩阵需要4个像素来存储（每个像素存储矩阵的一列）
   */
  _initMatricesTexture() {
    // 布局（1个矩阵 = 4个像素）
    //      RGBA RGBA RGBA RGBA (=> 第1列, 第2列, 第3列, 第4列)
    //  使用  8x8  像素纹理最多   16个矩阵 * 4像素 =  (8 * 8)
    //       16x16 像素纹理最多   64个矩阵 * 4像素 = (16 * 16)
    //       32x32 像素纹理最多  256个矩阵 * 4像素 = (32 * 32)
    //       64x64 像素纹理最多 1024个矩阵 * 4像素 = (64 * 64)

    // 计算纹理大小：每个矩阵需要4个像素
    let size = Math.sqrt(this._maxInstanceCount * 4);
    // 向上取整到4的倍数
    size = Math.ceil(size / 4) * 4;
    // 最小尺寸为4
    size = Math.max(size, 4);

    // 创建矩阵数组：每个RGBA像素4个浮点数
    const matricesArray = new Float32Array(size * size * 4);
    // 创建数据纹理
    const matricesTexture = new DataTexture(matricesArray, size, size, RGBAFormat, FloatType);

    // 保存矩阵纹理引用
    this._matricesTexture = matricesTexture;
  }

  /**
   * 初始化间接纹理
   *
   * 创建用于存储间接绘制信息的数据纹理。
   * 间接纹理用于GPU端的实例管理和绘制优化。
   */
  _initIndirectTexture() {
    // 计算纹理大小：基于最大实例数量的平方根
    let size = Math.sqrt(this._maxInstanceCount);
    // 向上取整
    size = Math.ceil(size);

    // 创建无符号32位整数数组
    const indirectArray = new Uint32Array(size * size);
    // 创建红色整数格式的数据纹理
    const indirectTexture = new DataTexture(indirectArray, size, size, RedIntegerFormat, UnsignedIntType);

    // 保存间接纹理引用
    this._indirectTexture = indirectTexture;
  }

  /**
   * 初始化颜色纹理
   *
   * 创建用于存储实例颜色信息的数据纹理。
   * 每个实例可以有独立的颜色。
   */
  _initColorsTexture() {
    // 计算纹理大小：基于最大实例数量的平方根
    let size = Math.sqrt(this._maxInstanceCount);
    // 向上取整
    size = Math.ceil(size);

    // 创建颜色数组：每个RGBA像素4个浮点数，初始化为白色
    const colorsArray = new Float32Array(size * size * 4).fill(1);
    // 创建RGBA格式的数据纹理
    const colorsTexture = new DataTexture(colorsArray, size, size, RGBAFormat, FloatType);
    // 设置颜色空间为工作颜色空间
    colorsTexture.colorSpace = ColorManagement.workingColorSpace;

    this._colorsTexture = colorsTexture;
  }

  /**
   * 初始化几何体缓冲区
   *
   * 根据参考几何体初始化批量网格的几何体缓冲区。
   * 这个方法只在第一次添加几何体时调用，用于设置所有必要的属性缓冲区。
   *
   * @param {BufferGeometry} reference - 参考几何体，用于确定需要创建哪些属性
   * @private
   */
  _initializeGeometry(reference) {
    // 获取当前批量网格的几何体引用
    const geometry = this.geometry;
    // 获取最大顶点数量限制
    const maxVertexCount = this._maxVertexCount;
    // 获取最大索引数量限制
    const maxIndexCount = this._maxIndexCount;

    // 只有在几何体尚未初始化时才进行初始化
    if (this._geometryInitialized === false) {
      // 遍历参考几何体的所有属性
      for (const attributeName in reference.attributes) {
        // 获取源属性的引用
        const srcAttribute = reference.getAttribute(attributeName);
        // 解构获取数组、项大小和标准化标志
        const { array, itemSize, normalized } = srcAttribute;

        // 创建目标数组，大小为最大顶点数乘以项大小
        const dstArray = new array.constructor(maxVertexCount * itemSize);
        // 创建目标缓冲属性
        const dstAttribute = new BufferAttribute(dstArray, itemSize, normalized);

        // 将属性设置到批量几何体中
        geometry.setAttribute(attributeName, dstAttribute);
      }

      // 如果参考几何体有索引缓冲区
      if (reference.getIndex() !== null) {
        // 为原始重启保留最后一个u16索引
        // 根据顶点数量选择合适的索引数组类型
        const indexArray = maxVertexCount > 65535 ? new Uint32Array(maxIndexCount) : new Uint16Array(maxIndexCount);

        // 设置索引缓冲区到几何体
        geometry.setIndex(new BufferAttribute(indexArray, 1));
      }

      // 标记几何体已初始化
      this._geometryInitialized = true;
    }
  }

  /**
   * 验证几何体兼容性
   *
   * 确保要添加的几何体与现有的合并几何体属性兼容。
   * 所有几何体必须具有一致的属性结构，包括索引、属性名称、项大小和标准化标志。
   *
   * @param {BufferGeometry} geometry - 要验证的几何体
   * @throws {Error} 如果几何体不兼容则抛出错误
   * @private
   */
  _validateGeometry(geometry) {
    // 检查以确保几何体使用一致的属性和索引
    const batchGeometry = this.geometry;

    // 检查索引一致性：要么都有索引，要么都没有索引
    if (Boolean(geometry.getIndex()) !== Boolean(batchGeometry.getIndex())) {
      throw new Error('THREE.BatchedMesh: All geometries must consistently have "index".');
    }

    // 遍历批量几何体的所有属性，确保新几何体也有相同的属性
    for (const attributeName in batchGeometry.attributes) {
      // 检查新几何体是否缺少必需的属性
      if (!geometry.hasAttribute(attributeName)) {
        throw new Error(`THREE.BatchedMesh: Added geometry missing "${attributeName}". All geometries must have consistent attributes.`);
      }

      // 获取源属性和目标属性的引用
      const srcAttribute = geometry.getAttribute(attributeName);
      const dstAttribute = batchGeometry.getAttribute(attributeName);

      // 检查属性的项大小和标准化标志是否一致
      if (srcAttribute.itemSize !== dstAttribute.itemSize || srcAttribute.normalized !== dstAttribute.normalized) {
        throw new Error("THREE.BatchedMesh: All attributes must have a consistent itemSize and normalized value.");
      }
    }
  }

  /**
   * 验证实例ID的有效性
   *
   * 检查给定的实例ID是否有效，包括范围检查和活动状态检查。
   * 如果实例ID无效，则抛出错误。
   *
   * @param {number} instanceId - 要验证的实例ID
   * @throws {Error} 如果实例ID无效则抛出错误
   */
  validateInstanceId(instanceId) {
    // 获取实例信息数组的引用
    const instanceInfo = this._instanceInfo;

    // 检查实例ID是否在有效范围内，以及实例是否处于活动状态
    if (instanceId < 0 || instanceId >= instanceInfo.length || instanceInfo[instanceId].active === false) {
      throw new Error(`THREE.BatchedMesh: Invalid instanceId ${instanceId}. Instance is either out of range or has been deleted.`);
    }
  }

  /**
   * 验证几何体ID的有效性
   *
   * 检查给定的几何体ID是否有效，包括范围检查和活动状态检查。
   * 如果几何体ID无效，则抛出错误。
   *
   * @param {number} geometryId - 要验证的几何体ID
   * @throws {Error} 如果几何体ID无效则抛出错误
   */
  validateGeometryId(geometryId) {
    // 获取几何体信息列表的引用
    const geometryInfoList = this._geometryInfo;

    // 检查几何体ID是否在有效范围内，以及几何体是否处于活动状态
    if (geometryId < 0 || geometryId >= geometryInfoList.length || geometryInfoList[geometryId].active === false) {
      throw new Error(`THREE.BatchedMesh: Invalid geometryId ${geometryId}. Geometry is either out of range or has been deleted.`);
    }
  }

  /**
   * 设置自定义排序函数
   *
   * 接受一个在渲染前运行的排序函数。该函数接受要排序的实例列表和相机。
   * 列表中的对象包含一个"z"字段，用于执行深度排序。
   *
   * @param {Function} func - 自定义排序函数，接受(list, camera)参数
   * @return {BatchedMesh} 返回当前批量网格的引用，支持链式调用
   */
  setCustomSort(func) {
    // 设置自定义排序函数
    this.customSort = func;
    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 计算包围盒
   *
   * 计算并更新BatchedMesh的boundingBox属性。
   * 包围盒默认不会被计算，需要显式计算，否则为null。
   * 包围盒包含所有活动实例的变换后几何体。
   */
  computeBoundingBox() {
    // 如果包围盒尚未创建，则创建一个新的
    if (this.boundingBox === null) {
      this.boundingBox = new Box3();
    }

    // 获取包围盒和实例信息的引用
    const boundingBox = this.boundingBox;
    const instanceInfo = this._instanceInfo;

    // 清空包围盒，准备重新计算
    boundingBox.makeEmpty();

    // 遍历所有实例
    for (let i = 0, l = instanceInfo.length; i < l; i++) {
      // 跳过非活动实例
      if (instanceInfo[i].active === false) continue;

      // 获取实例的几何体ID
      const geometryId = instanceInfo[i].geometryIndex;
      // 获取实例的变换矩阵
      this.getMatrixAt(i, _matrix);
      // 获取几何体包围盒并应用实例变换，然后合并到总包围盒
      this.getBoundingBoxAt(geometryId, _box).applyMatrix4(_matrix);
      boundingBox.union(_box);
    }
  }

  /**
   * 计算包围球
   *
   * 计算并更新BatchedMesh的boundingSphere属性。
   * 包围球默认不会被计算，需要显式计算，否则为null。
   * 包围球包含所有活动实例的变换后几何体。
   */
  computeBoundingSphere() {
    // 如果包围球尚未创建，则创建一个新的
    if (this.boundingSphere === null) {
      this.boundingSphere = new Sphere();
    }

    // 获取包围球和实例信息的引用
    const boundingSphere = this.boundingSphere;
    const instanceInfo = this._instanceInfo;

    // 清空包围球，准备重新计算
    boundingSphere.makeEmpty();

    // 遍历所有实例
    for (let i = 0, l = instanceInfo.length; i < l; i++) {
      // 跳过非活动实例
      if (instanceInfo[i].active === false) continue;

      // 获取实例的几何体ID
      const geometryId = instanceInfo[i].geometryIndex;
      // 获取实例的变换矩阵
      this.getMatrixAt(i, _matrix);
      // 获取几何体包围球并应用实例变换，然后合并到总包围球
      this.getBoundingSphereAt(geometryId, _sphere).applyMatrix4(_matrix);
      boundingSphere.union(_sphere);
    }
  }

  /**
   * 添加新实例到批量中
   *
   * 使用给定ID的几何体向批量中添加新实例，并返回一个新的ID，
   * 该ID引用新实例，可用于其他函数。
   *
   * @param {number} geometryId - 通过addGeometry方法预先添加的几何体的ID
   * @return {number} 实例ID
   * @throws {Error} 如果达到最大实例数量限制则抛出错误
   */
  addInstance(geometryId) {
    // 检查是否已达到容量上限
    const atCapacity = this._instanceInfo.length >= this.maxInstanceCount;

    // 确保没有超过几何体容量限制
    // 如果已达到容量且没有可重用的ID，则抛出错误
    if (atCapacity && this._availableInstanceIds.length === 0) {
      throw new Error("THREE.BatchedMesh: Maximum item count reached.");
    }

    // 创建实例信息对象，包含实例的基本属性
    const instanceInfo = {
      visible: true, // 实例可见性，默认为可见
      active: true, // 实例活动状态，默认为活动
      geometryIndex: geometryId, // 关联的几何体索引
    };

    // 声明绘制ID变量
    let drawId = null;

    // 优先使用之前释放的实例ID以避免浪费空间
    if (this._availableInstanceIds.length > 0) {
      // 对可用ID进行升序排序，确保使用最小的可用ID
      this._availableInstanceIds.sort(ascIdSort);

      // 获取最小的可用ID并从可用列表中移除
      drawId = this._availableInstanceIds.shift();
      // 更新对应位置的实例信息
      this._instanceInfo[drawId] = instanceInfo;
    } else {
      // 如果没有可用ID，则使用新的ID（数组长度）
      drawId = this._instanceInfo.length;
      // 将新实例信息推入数组
      this._instanceInfo.push(instanceInfo);
    }

    // 在矩阵纹理中设置单位矩阵作为默认变换
    const matricesTexture = this._matricesTexture;
    // 将单位矩阵转换为数组并存储到纹理数据中
    _matrix.identity().toArray(matricesTexture.image.data, drawId * 16);
    // 标记矩阵纹理需要更新
    matricesTexture.needsUpdate = true;

    // 在颜色纹理中设置白色作为默认颜色（如果颜色纹理存在）
    const colorsTexture = this._colorsTexture;
    if (colorsTexture) {
      // 将白色转换为数组并存储到纹理数据中
      _whiteColor.toArray(colorsTexture.image.data, drawId * 4);
      // 标记颜色纹理需要更新
      colorsTexture.needsUpdate = true;
    }

    // 标记可见性已更改，触发下次渲染时的重新计算
    this._visibilityChanged = true;
    // 返回新创建的实例ID
    return drawId;
  }

  /**
   * 添加几何体到批量中
   *
   * 将给定的几何体添加到批量中，并返回关联的几何体ID，
   * 该ID可在其他函数中使用。
   *
   * @param {BufferGeometry} geometry - 要添加的几何体
   * @param {number} [reservedVertexCount=-1] - 可选参数，指定为添加的几何体保留的顶点缓冲区空间量。
   * 如果计划稍后在此索引处设置比原始几何体更大的新几何体，则这是必需的。
   * 默认为给定几何体顶点缓冲区的长度。
   * @param {number} [reservedIndexCount=-1] - 可选参数，指定为添加的几何体保留的索引缓冲区空间量。
   * 如果计划稍后在此索引处设置比原始几何体更大的新几何体，则这是必需的。
   * 默认为给定几何体索引缓冲区的长度。
   * @return {number} 几何体ID
   */
  addGeometry(geometry, reservedVertexCount = -1, reservedIndexCount = -1) {
    // 初始化几何体（如果尚未初始化）
    this._initializeGeometry(geometry);

    // 验证几何体的兼容性
    this._validateGeometry(geometry);

    // 创建几何体信息对象，包含所有必要的几何体元数据
    const geometryInfo = {
      // 几何体信息
      vertexStart: -1, // 顶点在缓冲区中的起始位置
      vertexCount: -1, // 实际顶点数量
      reservedVertexCount: -1, // 保留的顶点数量

      indexStart: -1, // 索引在缓冲区中的起始位置
      indexCount: -1, // 实际索引数量
      reservedIndexCount: -1, // 保留的索引数量

      // 绘制范围信息
      start: -1, // 绘制起始位置
      count: -1, // 绘制数量

      // 状态信息
      boundingBox: null, // 包围盒（延迟计算）
      boundingSphere: null, // 包围球（延迟计算）
      active: true, // 几何体活动状态
    };

    // 获取几何体信息列表的引用
    const geometryInfoList = this._geometryInfo;
    // 设置顶点起始位置为当前下一个可用位置
    geometryInfo.vertexStart = this._nextVertexStart;
    // 设置保留顶点数量：如果未指定则使用几何体的实际顶点数量
    geometryInfo.reservedVertexCount = reservedVertexCount === -1 ? geometry.getAttribute("position").count : reservedVertexCount;

    // 获取几何体的索引缓冲区
    const index = geometry.getIndex();
    // 检查是否有索引缓冲区
    const hasIndex = index !== null;
    if (hasIndex) {
      // 设置索引起始位置为当前下一个可用位置
      geometryInfo.indexStart = this._nextIndexStart;
      // 设置保留索引数量：如果未指定则使用几何体的实际索引数量
      geometryInfo.reservedIndexCount = reservedIndexCount === -1 ? index.count : reservedIndexCount;
    }

    // 检查保留空间是否超过最大缓冲区大小
    if (
      (geometryInfo.indexStart !== -1 && geometryInfo.indexStart + geometryInfo.reservedIndexCount > this._maxIndexCount) ||
      geometryInfo.vertexStart + geometryInfo.reservedVertexCount > this._maxVertexCount
    ) {
      throw new Error("THREE.BatchedMesh: Reserved space request exceeds the maximum buffer size.");
    }

    // 更新几何体ID
    let geometryId;
    // 优先使用之前释放的几何体ID
    if (this._availableGeometryIds.length > 0) {
      // 对可用ID进行升序排序
      this._availableGeometryIds.sort(ascIdSort);

      // 获取最小的可用ID并从可用列表中移除
      geometryId = this._availableGeometryIds.shift();
      // 更新对应位置的几何体信息
      geometryInfoList[geometryId] = geometryInfo;
    } else {
      // 如果没有可用ID，则使用新的ID
      geometryId = this._geometryCount;
      // 增加几何体计数
      this._geometryCount++;
      // 将新几何体信息推入列表
      geometryInfoList.push(geometryInfo);
    }

    // 更新几何体数据
    this.setGeometryAt(geometryId, geometry);

    // 增加下一个几何体位置的指针
    this._nextIndexStart = geometryInfo.indexStart + geometryInfo.reservedIndexCount;
    this._nextVertexStart = geometryInfo.vertexStart + geometryInfo.reservedVertexCount;

    return geometryId;
  }

  /**
   * 替换指定ID位置的几何体
   *
   * 用提供的几何体替换给定ID处的几何体。如果保留空间不足则抛出错误。
   * 调用此方法将影响所有正在渲染该几何体的实例。
   *
   * @param {number} geometryId - 要替换几何体的ID
   * @param {BufferGeometry} geometry - 新的几何体
   * @return {number} 几何体ID
   * @throws {Error} 如果几何体ID超出范围或保留空间不足则抛出错误
   */
  setGeometryAt(geometryId, geometry) {
    // 检查几何体ID是否超出范围
    if (geometryId >= this._geometryCount) {
      throw new Error("THREE.BatchedMesh: Maximum geometry count reached.");
    }

    // 验证新几何体的兼容性
    this._validateGeometry(geometry);

    // 获取批量几何体和相关信息
    const batchGeometry = this.geometry;
    const hasIndex = batchGeometry.getIndex() !== null;
    const dstIndex = batchGeometry.getIndex();
    const srcIndex = geometry.getIndex();
    const geometryInfo = this._geometryInfo[geometryId];

    // 检查保留空间是否足够容纳新几何体
    if ((hasIndex && srcIndex.count > geometryInfo.reservedIndexCount) || geometry.attributes.position.count > geometryInfo.reservedVertexCount) {
      throw new Error("THREE.BatchedMesh: Reserved space not large enough for provided geometry.");
    }

    // 复制几何体缓冲区数据
    const vertexStart = geometryInfo.vertexStart;
    const reservedVertexCount = geometryInfo.reservedVertexCount;
    // 更新实际顶点数量
    geometryInfo.vertexCount = geometry.getAttribute("position").count;

    // 遍历批量几何体的所有属性并复制数据
    for (const attributeName in batchGeometry.attributes) {
      // 复制属性数据
      const srcAttribute = geometry.getAttribute(attributeName);
      const dstAttribute = batchGeometry.getAttribute(attributeName);
      // 使用工具函数复制属性数据到指定偏移位置
      copyAttributeData(srcAttribute, dstAttribute, vertexStart);

      // 用零填充剩余的保留空间
      const itemSize = srcAttribute.itemSize;
      for (let i = srcAttribute.count, l = reservedVertexCount; i < l; i++) {
        const index = vertexStart + i;
        // 将每个组件设置为0
        for (let c = 0; c < itemSize; c++) {
          dstAttribute.setComponent(index, c, 0);
        }
      }

      // 标记属性需要更新
      dstAttribute.needsUpdate = true;
      // 添加更新范围以优化GPU上传
      dstAttribute.addUpdateRange(vertexStart * itemSize, reservedVertexCount * itemSize);
    }

    // 复制索引数据（如果存在）
    if (hasIndex) {
      const indexStart = geometryInfo.indexStart;
      const reservedIndexCount = geometryInfo.reservedIndexCount;
      // 更新实际索引数量
      geometryInfo.indexCount = geometry.getIndex().count;

      // 复制索引数据并调整偏移量
      for (let i = 0; i < srcIndex.count; i++) {
        // 设置索引值，加上顶点起始偏移量
        dstIndex.setX(indexStart + i, vertexStart + srcIndex.getX(i));
      }

      // 用顶点起始位置填充剩余的保留空间
      for (let i = srcIndex.count, l = reservedIndexCount; i < l; i++) {
        dstIndex.setX(indexStart + i, vertexStart);
      }

      // 标记索引需要更新
      dstIndex.needsUpdate = true;
      // 添加更新范围以优化GPU上传
      dstIndex.addUpdateRange(indexStart, geometryInfo.reservedIndexCount);
    }

    // 更新绘制范围
    geometryInfo.start = hasIndex ? geometryInfo.indexStart : geometryInfo.vertexStart;
    geometryInfo.count = hasIndex ? geometryInfo.indexCount : geometryInfo.vertexCount;

    // 存储包围盒信息
    geometryInfo.boundingBox = null;
    if (geometry.boundingBox !== null) {
      // 克隆源几何体的包围盒
      geometryInfo.boundingBox = geometry.boundingBox.clone();
    }

    // 存储包围球信息
    geometryInfo.boundingSphere = null;
    if (geometry.boundingSphere !== null) {
      // 克隆源几何体的包围球
      geometryInfo.boundingSphere = geometry.boundingSphere.clone();
    }

    // 标记可见性已更改
    this._visibilityChanged = true;
    return geometryId;
  }

  /**
   * 删除指定ID的几何体
   *
   * 从批量中删除给定ID定义的几何体。引用此几何体的任何实例也将作为副作用被移除。
   *
   * @param {number} geometryId - 要从批量中移除的几何体ID
   * @return {BatchedMesh} 返回当前批量网格的引用，支持链式调用
   */
  deleteGeometry(geometryId) {
    // 获取几何体信息列表的引用
    const geometryInfoList = this._geometryInfo;
    // 如果几何体ID超出范围或已被删除，则直接返回
    if (geometryId >= geometryInfoList.length || geometryInfoList[geometryId].active === false) {
      return this;
    }

    // 删除与此几何体关联的任何实例
    const instanceInfo = this._instanceInfo;
    for (let i = 0, l = instanceInfo.length; i < l; i++) {
      // 如果实例是活动的且引用了要删除的几何体
      if (instanceInfo[i].active && instanceInfo[i].geometryIndex === geometryId) {
        // 删除该实例
        this.deleteInstance(i);
      }
    }

    // 将几何体标记为非活动状态
    geometryInfoList[geometryId].active = false;
    // 将几何体ID添加到可用ID列表中以供重用
    this._availableGeometryIds.push(geometryId);
    // 标记可见性已更改
    this._visibilityChanged = true;

    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 删除指定ID的实例
   *
   * 使用给定ID从批量中删除现有实例。
   *
   * @param {number} instanceId - 要从批量中移除的实例ID
   * @return {BatchedMesh} 返回当前批量网格的引用，支持链式调用
   */
  deleteInstance(instanceId) {
    // 验证实例ID的有效性
    this.validateInstanceId(instanceId);

    // 将实例标记为非活动状态
    this._instanceInfo[instanceId].active = false;
    // 将实例ID添加到可用ID列表中以供重用
    this._availableInstanceIds.push(instanceId);
    // 标记可见性已更改
    this._visibilityChanged = true;

    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 优化几何体布局
   *
   * 重新打包子几何体以移除之前删除几何体留下的未使用空间，
   * 释放空间以添加新几何体。这个过程会压缩缓冲区，提高内存使用效率。
   *
   * @return {BatchedMesh} 返回当前批量网格的引用，支持链式调用
   */
  optimize() {
    // 跟踪要复制数据的下一个索引位置
    let nextVertexStart = 0;
    let nextIndexStart = 0;

    // 按几何体缓冲区中从最早到最晚的顺序遍历所有几何体范围
    // 因为绘制范围对象可以重用，所以不能保证它们的顺序
    const geometryInfoList = this._geometryInfo;
    const indices = geometryInfoList
      .map((_, i) => i) // 创建索引数组
      .sort((a, b) => {
        // 按顶点起始位置排序
        return geometryInfoList[a].vertexStart - geometryInfoList[b].vertexStart;
      });

    // 获取几何体引用
    const geometry = this.geometry;
    for (let i = 0, l = geometryInfoList.length; i < l; i++) {
      // 如果几何体范围是非活动的，则不复制任何内容
      const index = indices[i];
      const geometryInfo = geometryInfoList[index];
      if (geometryInfo.active === false) {
        continue;
      }

      // 如果几何体包含索引缓冲区，则也需要移动它
      if (geometry.index !== null) {
        if (geometryInfo.indexStart !== nextIndexStart) {
          const { indexStart, vertexStart, reservedIndexCount } = geometryInfo;
          const index = geometry.index;
          const array = index.array;

          // 根据顶点数据的移动来调整索引指针
          // 必须首先调整索引，以便原始顶点起始值可用
          const elementDelta = nextVertexStart - vertexStart;
          for (let j = indexStart; j < indexStart + reservedIndexCount; j++) {
            array[j] = array[j] + elementDelta;
          }

          // 将索引数据复制到新位置
          index.array.copyWithin(nextIndexStart, indexStart, indexStart + reservedIndexCount);
          // 添加更新范围以优化GPU上传
          index.addUpdateRange(nextIndexStart, reservedIndexCount);

          // 更新几何体信息中的索引起始位置
          geometryInfo.indexStart = nextIndexStart;
        }

        // 移动到下一个索引起始位置
        nextIndexStart += geometryInfo.reservedIndexCount;
      }

      // 如果几何体需要移动，则复制属性数据以覆盖未使用的空间
      if (geometryInfo.vertexStart !== nextVertexStart) {
        const { vertexStart, reservedVertexCount } = geometryInfo;
        const attributes = geometry.attributes;
        // 遍历所有属性
        for (const key in attributes) {
          const attribute = attributes[key];
          const { array, itemSize } = attribute;
          // 将属性数据复制到新位置
          array.copyWithin(nextVertexStart * itemSize, vertexStart * itemSize, (vertexStart + reservedVertexCount) * itemSize);
          // 添加更新范围以优化GPU上传
          attribute.addUpdateRange(nextVertexStart * itemSize, reservedVertexCount * itemSize);
        }

        // 更新几何体信息中的顶点起始位置
        geometryInfo.vertexStart = nextVertexStart;
      }

      // 移动到下一个顶点起始位置
      nextVertexStart += geometryInfo.reservedVertexCount;
      // 更新绘制起始位置
      geometryInfo.start = geometry.index ? geometryInfo.indexStart : geometryInfo.vertexStart;

      // 将下一个几何体指针步进到移动后的位置
      this._nextIndexStart = geometry.index ? geometryInfo.indexStart + geometryInfo.reservedIndexCount : 0;
      this._nextVertexStart = geometryInfo.vertexStart + geometryInfo.reservedVertexCount;
    }

    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 获取指定几何体的包围盒
   *
   * 返回给定几何体的包围盒。如果包围盒尚未计算，则会进行计算并缓存。
   *
   * @param {number} geometryId - 要返回包围盒的几何体ID
   * @param {Box3} target - 用于存储方法结果的目标对象
   * @return {Box3|null} 几何体的包围盒。如果找不到给定ID的几何体则返回null
   */
  getBoundingBoxAt(geometryId, target) {
    // 检查几何体ID是否超出范围
    if (geometryId >= this._geometryCount) {
      return null;
    }

    // 计算包围盒
    const geometry = this.geometry;
    const geometryInfo = this._geometryInfo[geometryId];
    // 如果包围盒尚未计算，则进行计算
    if (geometryInfo.boundingBox === null) {
      const box = new Box3();
      const index = geometry.index;
      const position = geometry.attributes.position;

      // 遍历几何体的所有顶点
      for (let i = geometryInfo.start, l = geometryInfo.start + geometryInfo.count; i < l; i++) {
        let iv = i;
        // 如果有索引缓冲区，则使用索引获取实际顶点位置
        if (index) {
          iv = index.getX(iv);
        }

        // 将顶点位置添加到包围盒中
        box.expandByPoint(_vector.fromBufferAttribute(position, iv));
      }

      // 缓存计算结果
      geometryInfo.boundingBox = box;
    }

    // 将结果复制到目标对象
    target.copy(geometryInfo.boundingBox);
    return target;
  }

  /**
   * 获取指定几何体的包围球
   *
   * 返回给定几何体的包围球。如果包围球尚未计算，则会进行计算并缓存。
   *
   * @param {number} geometryId - 要返回包围球的几何体ID
   * @param {Sphere} target - 用于存储方法结果的目标对象
   * @return {Sphere|null} 几何体的包围球。如果找不到给定ID的几何体则返回null
   */
  getBoundingSphereAt(geometryId, target) {
    // 检查几何体ID是否超出范围
    if (geometryId >= this._geometryCount) {
      return null;
    }

    // 计算包围球
    const geometry = this.geometry;
    const geometryInfo = this._geometryInfo[geometryId];
    // 如果包围球尚未计算，则进行计算
    if (geometryInfo.boundingSphere === null) {
      const sphere = new Sphere();
      // 首先获取包围盒并将其中心作为球心
      this.getBoundingBoxAt(geometryId, _box);
      _box.getCenter(sphere.center);

      const index = geometry.index;
      const position = geometry.attributes.position;

      // 计算最大半径的平方
      let maxRadiusSq = 0;
      for (let i = geometryInfo.start, l = geometryInfo.start + geometryInfo.count; i < l; i++) {
        let iv = i;
        // 如果有索引缓冲区，则使用索引获取实际顶点位置
        if (index) {
          iv = index.getX(iv);
        }

        // 获取顶点位置
        _vector.fromBufferAttribute(position, iv);
        // 计算顶点到球心的距离平方，并更新最大值
        maxRadiusSq = Math.max(maxRadiusSq, sphere.center.distanceToSquared(_vector));
      }

      // 设置球的半径
      sphere.radius = Math.sqrt(maxRadiusSq);
      // 缓存计算结果
      geometryInfo.boundingSphere = sphere;
    }

    // 将结果复制到目标对象
    target.copy(geometryInfo.boundingSphere);
    return target;
  }

  /**
   * 设置指定实例的本地变换矩阵
   *
   * 为定义的实例设置给定的本地变换矩阵。
   * 不支持负缩放矩阵。
   *
   * @param {number} instanceId - 要设置矩阵的实例ID
   * @param {Matrix4} matrix - 表示单个实例本地变换的4x4矩阵
   * @return {BatchedMesh} 返回当前批量网格的引用，支持链式调用
   */
  setMatrixAt(instanceId, matrix) {
    // 验证实例ID的有效性
    this.validateInstanceId(instanceId);

    // 获取矩阵纹理和数据数组的引用
    const matricesTexture = this._matricesTexture;
    const matricesArray = this._matricesTexture.image.data;
    // 将矩阵转换为数组并存储到纹理数据中（每个矩阵占16个浮点数）
    matrix.toArray(matricesArray, instanceId * 16);
    // 标记矩阵纹理需要更新
    matricesTexture.needsUpdate = true;

    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 获取指定实例的本地变换矩阵
   *
   * 返回定义实例的本地变换矩阵。
   *
   * @param {number} instanceId - 要获取矩阵的实例ID
   * @param {Matrix4} matrix - 用于存储方法结果的目标对象
   * @return {Matrix4} 实例的本地变换矩阵
   */
  getMatrixAt(instanceId, matrix) {
    // 验证实例ID的有效性
    this.validateInstanceId(instanceId);
    // 从矩阵纹理数据中读取矩阵并返回
    return matrix.fromArray(this._matricesTexture.image.data, instanceId * 16);
  }

  /**
   * 设置指定实例的颜色
   *
   * 为定义的实例设置给定的颜色。
   *
   * @param {number} instanceId - 要设置颜色的实例ID
   * @param {Color} color - 要设置给实例的颜色
   * @return {BatchedMesh} 返回当前批量网格的引用，支持链式调用
   */
  setColorAt(instanceId, color) {
    // 验证实例ID的有效性
    this.validateInstanceId(instanceId);

    // 如果颜色纹理尚未初始化，则进行初始化
    if (this._colorsTexture === null) {
      this._initColorsTexture();
    }

    // 将颜色转换为数组并存储到纹理数据中（每个颜色占4个浮点数：RGBA）
    color.toArray(this._colorsTexture.image.data, instanceId * 4);
    // 标记颜色纹理需要更新
    this._colorsTexture.needsUpdate = true;

    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 获取指定实例的颜色
   *
   * 返回定义实例的颜色。
   *
   * @param {number} instanceId - 要获取颜色的实例ID
   * @param {Color} color - 用于存储方法结果的目标对象
   * @return {Color} 实例的颜色
   */
  getColorAt(instanceId, color) {
    // 验证实例ID的有效性
    this.validateInstanceId(instanceId);
    // 从颜色纹理数据中读取颜色并返回
    return color.fromArray(this._colorsTexture.image.data, instanceId * 4);
  }

  /**
   * 设置实例的可见性
   *
   * 设置实例是否可见。
   *
   * @param {number} instanceId - 要设置可见性的实例ID
   * @param {boolean} visible - 实例是否可见
   * @return {BatchedMesh} 返回当前批量网格的引用，支持链式调用
   */
  setVisibleAt(instanceId, visible) {
    // 验证实例ID的有效性
    this.validateInstanceId(instanceId);

    // 如果可见性没有变化，则直接返回
    if (this._instanceInfo[instanceId].visible === visible) {
      return this;
    }

    // 更新实例的可见性状态
    this._instanceInfo[instanceId].visible = visible;
    // 标记可见性已更改
    this._visibilityChanged = true;

    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 获取指定实例的可见性状态
   *
   * 返回定义实例的可见性状态。
   *
   * @param {number} instanceId - 要获取可见性状态的实例ID
   * @return {boolean} 实例是否可见
   */
  getVisibleAt(instanceId) {
    // 验证实例ID的有效性
    this.validateInstanceId(instanceId);

    // 返回实例的可见性状态
    return this._instanceInfo[instanceId].visible;
  }

  /**
   * 设置指定索引处实例的几何体ID
   *
   * 为给定索引处的实例设置几何体ID。
   *
   * @param {number} instanceId - 要设置几何体ID的实例ID
   * @param {number} geometryId - 实例要使用的几何体ID
   * @return {BatchedMesh} 返回当前批量网格的引用，支持链式调用
   */
  setGeometryIdAt(instanceId, geometryId) {
    // 验证实例ID和几何体ID的有效性
    this.validateInstanceId(instanceId);
    this.validateGeometryId(geometryId);

    // 设置实例的几何体索引
    this._instanceInfo[instanceId].geometryIndex = geometryId;

    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 获取指定实例的几何体ID
   *
   * 返回定义实例的几何体ID。
   *
   * @param {number} instanceId - 要获取几何体ID的实例ID
   * @return {number} 实例的几何体ID
   */
  getGeometryIdAt(instanceId) {
    // 验证实例ID的有效性
    this.validateInstanceId(instanceId);

    // 返回实例的几何体索引
    return this._instanceInfo[instanceId].geometryIndex;
  }

  /**
   * 获取几何体范围信息
   *
   * 获取表示与附加几何体相关的三角形子集的范围，
   * 指示起始偏移量和计数，如果无效则返回null。
   *
   * @param {number} geometryId - 要获取范围的几何体ID
   * @param {Object} [target={}] - 用于存储方法结果的目标对象
   * @return {{
   * 	vertexStart:number,vertexCount:number,reservedVertexCount:number,
   * 	indexStart:number,indexCount:number,reservedIndexCount:number,
   * 	start:number,count:number
   * }} 包含范围数据的结果对象
   */
  getGeometryRangeAt(geometryId, target = {}) {
    // 验证几何体ID的有效性
    this.validateGeometryId(geometryId);

    // 获取几何体信息
    const geometryInfo = this._geometryInfo[geometryId];
    // 设置顶点相关信息
    target.vertexStart = geometryInfo.vertexStart;
    target.vertexCount = geometryInfo.vertexCount;
    target.reservedVertexCount = geometryInfo.reservedVertexCount;

    // 设置索引相关信息
    target.indexStart = geometryInfo.indexStart;
    target.indexCount = geometryInfo.indexCount;
    target.reservedIndexCount = geometryInfo.reservedIndexCount;

    // 设置绘制相关信息
    target.start = geometryInfo.start;
    target.count = geometryInfo.count;

    // 返回目标对象
    return target;
  }

  /**
   * 调整实例数量
   *
   * 调整必要的缓冲区大小以支持提供的实例数量。
   * 如果提供的参数缩小了实例数量，但列表末尾没有足够的未使用ID，则会抛出错误。
   *
   * @param {number} maxInstanceCount - 批量可以添加和渲染的单个实例的最大数量
   * @throws {Error} 如果无法缩小到所需大小则抛出错误
   */
  setInstanceCount(maxInstanceCount) {
    // 尽可能缩小可用实例
    const availableInstanceIds = this._availableInstanceIds;
    const instanceInfo = this._instanceInfo;
    // 对可用ID进行排序
    availableInstanceIds.sort(ascIdSort);
    // 移除末尾连续的可用ID和对应的实例信息
    while (availableInstanceIds[availableInstanceIds.length - 1] === instanceInfo.length - 1) {
      instanceInfo.pop();
      availableInstanceIds.pop();
    }

    // 如果无法缩小到所需大小则抛出错误
    if (maxInstanceCount < instanceInfo.length) {
      throw new Error(`BatchedMesh: Instance ids outside the range ${maxInstanceCount} are being used. Cannot shrink instance count.`);
    }

    // 复制多重绘制计数数组
    const multiDrawCounts = new Int32Array(maxInstanceCount);
    const multiDrawStarts = new Int32Array(maxInstanceCount);
    copyArrayContents(this._multiDrawCounts, multiDrawCounts);
    copyArrayContents(this._multiDrawStarts, multiDrawStarts);

    // 更新多重绘制数组和最大实例数量
    this._multiDrawCounts = multiDrawCounts;
    this._multiDrawStarts = multiDrawStarts;
    this._maxInstanceCount = maxInstanceCount;

    // 更新实例采样的纹理数据
    const indirectTexture = this._indirectTexture;
    const matricesTexture = this._matricesTexture;
    const colorsTexture = this._colorsTexture;

    // 重新创建间接纹理
    indirectTexture.dispose();
    this._initIndirectTexture();
    copyArrayContents(indirectTexture.image.data, this._indirectTexture.image.data);

    // 重新创建矩阵纹理
    matricesTexture.dispose();
    this._initMatricesTexture();
    copyArrayContents(matricesTexture.image.data, this._matricesTexture.image.data);

    // 重新创建颜色纹理（如果存在）
    if (colorsTexture) {
      colorsTexture.dispose();
      this._initColorsTexture();
      copyArrayContents(colorsTexture.image.data, this._colorsTexture.image.data);
    }
  }

  /**
   * 调整几何体大小
   *
   * 将批量的顶点和索引缓冲区属性中的可用空间调整为提供的大小。
   * 如果提供的参数缩小了几何体缓冲区，但几何体属性末尾没有足够的未使用空间，则会抛出错误。
   *
   * @param {number} maxVertexCount - 所有唯一几何体要调整到的最大顶点数量
   * @param {number} maxIndexCount - 所有唯一几何体要调整到的最大索引数量
   * @throws {Error} 如果无法缩小到所需大小则抛出错误
   */
  setGeometrySize(maxVertexCount, maxIndexCount) {
    // 检查是否可以缩小到请求的顶点属性大小
    const validRanges = [...this._geometryInfo].filter((info) => info.active);
    const requiredVertexLength = Math.max(...validRanges.map((range) => range.vertexStart + range.reservedVertexCount));
    if (requiredVertexLength > maxVertexCount) {
      throw new Error(`BatchedMesh: Geometry vertex values are being used outside the range ${maxVertexCount}. Cannot shrink further.`);
    }

    // 检查是否可以缩小到请求的索引属性大小
    if (this.geometry.index) {
      const requiredIndexLength = Math.max(...validRanges.map((range) => range.indexStart + range.reservedIndexCount));
      if (requiredIndexLength > maxIndexCount) {
        throw new Error(`BatchedMesh: Geometry index values are being used outside the range ${maxIndexCount}. Cannot shrink further.`);
      }
    }

    // 销毁之前的几何体
    const oldGeometry = this.geometry;
    oldGeometry.dispose();

    // 根据之前的变体重新创建所需的几何体
    this._maxVertexCount = maxVertexCount;
    this._maxIndexCount = maxIndexCount;

    // 如果几何体已初始化，则重新初始化
    if (this._geometryInitialized) {
      this._geometryInitialized = false;
      this.geometry = new BufferGeometry();
      this._initializeGeometry(oldGeometry);
    }

    // 从之前的几何体复制数据
    const geometry = this.geometry;
    if (oldGeometry.index) {
      copyArrayContents(oldGeometry.index.array, geometry.index.array);
    }

    // 复制所有属性数据
    for (const key in oldGeometry.attributes) {
      copyArrayContents(oldGeometry.attributes[key].array, geometry.attributes[key].array);
    }
  }

  /**
   * 射线检测
   *
   * 对批量网格中的所有可见和活动实例进行射线检测。
   * 为每个交点添加批量ID信息。
   *
   * @param {Raycaster} raycaster - 射线投射器
   * @param {Array} intersects - 用于存储交点的数组
   */
  raycast(raycaster, intersects) {
    // 获取实例信息、几何体信息列表、世界矩阵和批量几何体的引用
    const instanceInfo = this._instanceInfo;
    const geometryInfoList = this._geometryInfo;
    const matrixWorld = this.matrixWorld;
    const batchGeometry = this.geometry;

    // 遍历每个几何体
    // 设置临时网格的材质和几何体属性
    _mesh.material = this.material;
    _mesh.geometry.index = batchGeometry.index;
    _mesh.geometry.attributes = batchGeometry.attributes;

    // 确保临时网格有包围盒
    if (_mesh.geometry.boundingBox === null) {
      _mesh.geometry.boundingBox = new Box3();
    }

    // 确保临时网格有包围球
    if (_mesh.geometry.boundingSphere === null) {
      _mesh.geometry.boundingSphere = new Sphere();
    }

    // 遍历所有实例
    for (let i = 0, l = instanceInfo.length; i < l; i++) {
      // 跳过不可见或非活动的实例
      if (!instanceInfo[i].visible || !instanceInfo[i].active) {
        continue;
      }

      // 获取实例的几何体ID和几何体信息
      const geometryId = instanceInfo[i].geometryIndex;
      const geometryInfo = geometryInfoList[geometryId];
      // 设置临时网格的绘制范围
      _mesh.geometry.setDrawRange(geometryInfo.start, geometryInfo.count);

      // 获取交点
      // 设置临时网格的世界矩阵（实例矩阵乘以批量网格的世界矩阵）
      this.getMatrixAt(i, _mesh.matrixWorld).premultiply(matrixWorld);
      // 设置临时网格的包围盒和包围球
      this.getBoundingBoxAt(geometryId, _mesh.geometry.boundingBox);
      this.getBoundingSphereAt(geometryId, _mesh.geometry.boundingSphere);
      // 对临时网格进行射线检测
      _mesh.raycast(raycaster, _batchIntersects);

      // 为交点添加批量ID
      for (let j = 0, l = _batchIntersects.length; j < l; j++) {
        const intersect = _batchIntersects[j];
        // 设置交点对象为当前批量网格
        intersect.object = this;
        // 添加批量ID（实例ID）
        intersect.batchId = i;
        // 将交点添加到结果数组
        intersects.push(intersect);
      }

      // 清空临时交点数组
      _batchIntersects.length = 0;
    }

    // 清理临时网格的属性
    _mesh.material = null;
    _mesh.geometry.index = null;
    _mesh.geometry.attributes = {};
    _mesh.geometry.setDrawRange(0, Infinity);
  }

  /**
   * 复制批量网格
   *
   * 从源批量网格复制所有属性和数据到当前实例。
   * 这是一个深度复制，会克隆所有相关的对象和数据。
   *
   * @param {BatchedMesh} source - 要复制的源批量网格
   * @return {BatchedMesh} 返回当前实例，支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 复制几何体和基本属性
    this.geometry = source.geometry.clone();
    this.perObjectFrustumCulled = source.perObjectFrustumCulled;
    this.sortObjects = source.sortObjects;
    this.boundingBox = source.boundingBox !== null ? source.boundingBox.clone() : null;
    this.boundingSphere = source.boundingSphere !== null ? source.boundingSphere.clone() : null;

    // 复制几何体信息数组，包括包围盒和包围球的深度复制
    this._geometryInfo = source._geometryInfo.map((info) => ({
      ...info,
      // 深度复制包围盒和包围球
      boundingBox: info.boundingBox !== null ? info.boundingBox.clone() : null,
      boundingSphere: info.boundingSphere !== null ? info.boundingSphere.clone() : null,
    }));
    // 复制实例信息数组
    this._instanceInfo = source._instanceInfo.map((info) => ({ ...info }));

    // 复制可用ID数组
    this._availableInstanceIds = source._availableInstanceIds.slice();
    this._availableGeometryIds = source._availableGeometryIds.slice();

    // 复制位置和计数信息
    this._nextIndexStart = source._nextIndexStart;
    this._nextVertexStart = source._nextVertexStart;
    this._geometryCount = source._geometryCount;

    // 复制容量限制
    this._maxInstanceCount = source._maxInstanceCount;
    this._maxVertexCount = source._maxVertexCount;
    this._maxIndexCount = source._maxIndexCount;

    // 复制状态和多重绘制数组
    this._geometryInitialized = source._geometryInitialized;
    this._multiDrawCounts = source._multiDrawCounts.slice();
    this._multiDrawStarts = source._multiDrawStarts.slice();

    // 复制间接纹理及其数据
    this._indirectTexture = source._indirectTexture.clone();
    this._indirectTexture.image.data = this._indirectTexture.image.data.slice();

    // 复制矩阵纹理及其数据
    this._matricesTexture = source._matricesTexture.clone();
    this._matricesTexture.image.data = this._matricesTexture.image.data.slice();

    // 复制颜色纹理及其数据（如果存在）
    if (this._colorsTexture !== null) {
      this._colorsTexture = source._colorsTexture.clone();
      this._colorsTexture.image.data = this._colorsTexture.image.data.slice();
    }

    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 销毁资源
   *
   * 释放此实例分配的GPU相关资源。
   * 当此实例在应用程序中不再使用时，请调用此方法。
   */
  dispose() {
    // 假设几何体不与其他网格共享，直接销毁
    this.geometry.dispose();

    // 销毁矩阵纹理
    this._matricesTexture.dispose();
    this._matricesTexture = null;

    // 销毁间接纹理
    this._indirectTexture.dispose();
    this._indirectTexture = null;

    // 销毁颜色纹理（如果存在）
    if (this._colorsTexture !== null) {
      this._colorsTexture.dispose();
      this._colorsTexture = null;
    }
  }

  /**
   * 渲染前处理
   *
   * 在渲染前执行的回调函数，用于准备多重绘制数据、视锥体剔除和对象排序。
   * 这是批量渲染的核心优化逻辑。
   *
   * @param {WebGLRenderer} renderer - WebGL渲染器（未使用但保持接口一致性）
   * @param {Scene} scene - 场景对象（未使用但保持接口一致性）
   * @param {Camera} camera - 相机对象，用于视锥体剔除和排序
   * @param {BufferGeometry} geometry - 几何体对象
   * @param {Material} material - 材质对象，用于确定排序方式
   */
  onBeforeRender(renderer, scene, camera, geometry, material /*, _group*/) {
    // 如果可见性没有变化且不需要视锥体剔除和对象排序
    // 则跳过遍历所有项目
    if (!this._visibilityChanged && !this.perObjectFrustumCulled && !this.sortObjects) {
      return;
    }

    // 多重绘制函数的索引版本需要指定起始偏移量（以字节为单位）
    const index = geometry.getIndex();
    const bytesPerElement = index === null ? 1 : index.array.BYTES_PER_ELEMENT;

    // 获取各种数据的引用以提高性能
    const instanceInfo = this._instanceInfo;
    const multiDrawStarts = this._multiDrawStarts;
    const multiDrawCounts = this._multiDrawCounts;
    const geometryInfoList = this._geometryInfo;
    const perObjectFrustumCulled = this.perObjectFrustumCulled;
    const indirectTexture = this._indirectTexture;
    const indirectArray = indirectTexture.image.data;

    // 根据相机类型选择合适的视锥体
    const frustum = camera.isArrayCamera ? _frustumArray : _frustum;
    // 在本地坐标系中准备视锥体
    if (perObjectFrustumCulled && !camera.isArrayCamera) {
      // 计算投影视图矩阵并乘以批量网格的世界矩阵
      _matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(this.matrixWorld);

      // 从投影矩阵设置视锥体
      _frustum.setFromProjectionMatrix(_matrix, camera.coordinateSystem, camera.reversedDepth);
    }

    // 初始化多重绘制计数
    let multiDrawCount = 0;

    // 如果需要对对象进行排序
    if (this.sortObjects) {
      // 获取相机在本地坐标系中的位置
      _matrix.copy(this.matrixWorld).invert();
      _vector.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(_matrix);
      _forward.set(0, 0, -1).transformDirection(camera.matrixWorld).transformDirection(_matrix);

      // 遍历所有实例进行视锥体剔除和深度计算
      for (let i = 0, l = instanceInfo.length; i < l; i++) {
        if (instanceInfo[i].visible && instanceInfo[i].active) {
          const geometryId = instanceInfo[i].geometryIndex;

          // 获取世界空间中的边界
          this.getMatrixAt(i, _matrix);
          this.getBoundingSphereAt(geometryId, _sphere).applyMatrix4(_matrix);

          // 确定批量几何体是否在视锥体内
          let culled = false;
          if (perObjectFrustumCulled) {
            culled = !frustum.intersectsSphere(_sphere, camera);
          }

          // 如果没有被剔除，则添加到渲染列表
          if (!culled) {
            // 获取用于排序的相机距离
            const geometryInfo = geometryInfoList[geometryId];
            const z = _temp.subVectors(_sphere.center, _vector).dot(_forward);
            _renderList.push(geometryInfo.start, geometryInfo.count, z, i);
          }
        }
      }

      // 对绘制范围进行排序并准备渲染
      const list = _renderList.list;
      const customSort = this.customSort;
      if (customSort === null) {
        // 根据材质透明度选择排序方式：透明材质从后到前，不透明材质从前到后
        list.sort(material.transparent ? sortTransparent : sortOpaque);
      } else {
        // 使用自定义排序函数
        customSort.call(this, list, camera);
      }

      // 填充多重绘制数组
      for (let i = 0, l = list.length; i < l; i++) {
        const item = list[i];
        multiDrawStarts[multiDrawCount] = item.start * bytesPerElement;
        multiDrawCounts[multiDrawCount] = item.count;
        indirectArray[multiDrawCount] = item.index;
        multiDrawCount++;
      }

      // 重置渲染列表以供下次使用
      _renderList.reset();
    } else {
      // 如果不需要排序，则直接进行视锥体剔除
      for (let i = 0, l = instanceInfo.length; i < l; i++) {
        if (instanceInfo[i].visible && instanceInfo[i].active) {
          const geometryId = instanceInfo[i].geometryIndex;

          // 确定批量几何体是否在视锥体内
          let culled = false;
          if (perObjectFrustumCulled) {
            // 获取世界空间中的边界
            this.getMatrixAt(i, _matrix);
            this.getBoundingSphereAt(geometryId, _sphere).applyMatrix4(_matrix);
            culled = !frustum.intersectsSphere(_sphere, camera);
          }

          // 如果没有被剔除，则添加到多重绘制数组
          if (!culled) {
            const geometryInfo = geometryInfoList[geometryId];
            multiDrawStarts[multiDrawCount] = geometryInfo.start * bytesPerElement;
            multiDrawCounts[multiDrawCount] = geometryInfo.count;
            indirectArray[multiDrawCount] = i;
            multiDrawCount++;
          }
        }
      }
    }

    // 标记间接纹理需要更新
    indirectTexture.needsUpdate = true;
    // 保存多重绘制数量
    this._multiDrawCount = multiDrawCount;
    // 重置可见性更改标志
    this._visibilityChanged = false;
  }

  /**
   * 阴影渲染前处理
   *
   * 在阴影渲染前执行的回调函数，直接调用onBeforeRender方法。
   *
   * @param {WebGLRenderer} renderer - WebGL渲染器
   * @param {Object3D} object - 对象（未使用但保持接口一致性）
   * @param {Camera} camera - 相机对象（未使用但保持接口一致性）
   * @param {Camera} shadowCamera - 阴影相机对象
   * @param {BufferGeometry} geometry - 几何体对象
   * @param {Material} depthMaterial - 深度材质对象
   */
  onBeforeShadow(renderer, object, camera, shadowCamera, geometry, depthMaterial /* , group */) {
    // 调用onBeforeRender方法，使用阴影相机和深度材质
    this.onBeforeRender(renderer, null, shadowCamera, geometry, depthMaterial);
  }
}

export { BatchedMesh };
