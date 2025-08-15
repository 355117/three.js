// 导入三维向量类，用于表示3D空间中的点和方向
import { Vector3 } from "../math/Vector3.js";
// 导入二维向量类，用于表示2D坐标（如UV坐标）
import { Vector2 } from "../math/Vector2.js";
// 导入三维包围盒类，用于表示几何体的边界框
import { Box3 } from "../math/Box3.js";
// 导入事件分发器类，用于处理事件监听和分发
import { EventDispatcher } from "./EventDispatcher.js";
// 导入缓冲区属性相关类，用于存储顶点数据
import { BufferAttribute, Float32BufferAttribute, Uint16BufferAttribute, Uint32BufferAttribute } from "./BufferAttribute.js";
// 导入球体类，用于表示几何体的边界球
import { Sphere } from "../math/Sphere.js";
// 导入3D对象基类
import { Object3D } from "./Object3D.js";
// 导入4x4矩阵类，用于变换操作
import { Matrix4 } from "../math/Matrix4.js";
// 导入3x3矩阵类，用于法线变换
import { Matrix3 } from "../math/Matrix3.js";
// 导入UUID生成函数，用于创建唯一标识符
import { generateUUID } from "../math/MathUtils.js";
// 导入工具函数，用于判断数组是否需要32位索引
import { arrayNeedsUint32 } from "../utils.js";

// 全局ID计数器，用于为每个几何体分配唯一ID
let _id = 0;

// 临时矩阵，用于变换计算（标记为纯函数以便优化）
const _m1 = /*@__PURE__*/ new Matrix4();
// 临时3D对象，用于lookAt操作
const _obj = /*@__PURE__*/ new Object3D();
// 临时向量，用于偏移计算
const _offset = /*@__PURE__*/ new Vector3();
// 临时包围盒，用于边界计算
const _box = /*@__PURE__*/ new Box3();
// 临时包围盒，专用于变形目标的边界计算
const _boxMorphTargets = /*@__PURE__*/ new Box3();
// 临时向量，用于各种向量计算
const _vector = /*@__PURE__*/ new Vector3();

/**
 * 网格、线条或点几何体的表示。包含顶点位置、面索引、法线、颜色、UV坐标和自定义属性
 * 这些数据存储在缓冲区中，减少了向GPU传递数据的成本。
 *
 * ```js
 * const geometry = new THREE.BufferGeometry();
 * // 创建一个简单的正方形。我们复制左上角和右下角的顶点
 * // 因为每个顶点需要在每个三角形中出现一次。
 * const vertices = new Float32Array( [
 * 	-1.0, -1.0,  1.0, // v0
 * 	 1.0, -1.0,  1.0, // v1
 * 	 1.0,  1.0,  1.0, // v2
 *
 * 	 1.0,  1.0,  1.0, // v3
 * 	-1.0,  1.0,  1.0, // v4
 * 	-1.0, -1.0,  1.0  // v5
 * ] );
 * // itemSize = 3 因为每个顶点有3个值（分量）
 * geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
 * const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
 * const mesh = new THREE.Mesh( geometry, material );
 * ```
 *
 * @augments EventDispatcher
 */
class BufferGeometry extends EventDispatcher {
  /**
   * 构造一个新的几何体。
   */
  constructor() {
    // 调用父类构造函数
    super();

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isBufferGeometry = true;

    /**
     * 几何体的ID。
     *
     * @name BufferGeometry#id
     * @type {number}
     * @readonly
     */
    Object.defineProperty(this, "id", { value: _id++ });

    /**
     * 几何体的UUID（通用唯一标识符）。
     *
     * @type {string}
     * @readonly
     */
    this.uuid = generateUUID();

    /**
     * 几何体的名称。
     *
     * @type {string}
     */
    this.name = "";
    // 几何体类型标识
    this.type = "BufferGeometry";

    /**
     * 允许顶点在多个三角形之间重复使用；这被称为"索引三角形"。
     * 每个三角形与三个顶点的索引相关联。因此，此属性存储每个三角面的每个顶点的索引。
     * 如果未设置此属性，渲染器假定每三个连续位置代表一个三角形。
     *
     * @type {?BufferAttribute}
     * @default null
     */
    this.index = null;

    /**
     * 由计算着色器生成的（存储）缓冲区属性，现在定义间接绘制调用。
     *
     * 只能与 {@link WebGPURenderer} 和 WebGPU 后端一起使用。
     *
     * @type {?BufferAttribute}
     * @default null
     */
    this.indirect = null;

    /**
     * 此字典以属性名称作为键，以要设置的缓冲区属性作为值。
     * 不要直接访问此属性，而是使用 `setAttribute()` 和 `getAttribute()` 来访问此几何体的属性。
     *
     * @type {Object<string,(BufferAttribute|InterleavedBufferAttribute)>}
     */
    this.attributes = {};

    /**
     * 此字典保存几何体的变形目标。
     *
     * 注意：一旦几何体被渲染，变形属性数据就不能更改。
     * 您必须调用 `dispose()` 并创建一个新的几何体实例。
     *
     * @type {Object}
     */
    this.morphAttributes = {};

    /**
     * 用于控制变形目标行为；当设置为 `true` 时，变形目标数据被视为相对偏移，
     * 而不是绝对位置/法线。
     *
     * @type {boolean}
     * @default false
     */
    this.morphTargetsRelative = false;

    /**
     * 将几何体分割成组，每个组将在单独的绘制调用中渲染。
     * 这允许将材质数组与几何体一起使用。
     *
     * 使用 `addGroup()` 和 `clearGroups()` 来编辑组，而不是直接修改此数组。
     *
     * 每个顶点和索引必须恰好属于一个组——组不能共享顶点或索引，
     * 也不能留下未使用的顶点或索引。
     *
     * @type {Array<Object>}
     */
    this.groups = [];

    /**
     * 几何体的边界盒，可以通过 `computeBoundingBox()` 计算。
     *
     * @type {Box3}
     * @default null
     */
    this.boundingBox = null;

    /**
     * 几何体的边界球，可以通过 `computeBoundingSphere()` 计算。
     *
     * @type {Sphere}
     * @default null
     */
    this.boundingSphere = null;

    /**
     * 确定要渲染的几何体部分。不应直接设置此属性，
     * 而应使用 `setDrawRange()`。
     *
     * @type {{start:number,count:number}}
     */
    this.drawRange = { start: 0, count: Infinity };

    /**
     * 可用于存储有关几何体的自定义数据的对象。
     * 它不应包含对函数的引用，因为这些函数不会被克隆。
     *
     * @type {Object}
     */
    this.userData = {};
  }

  /**
   * 返回此几何体的索引。
   *
   * @return {?BufferAttribute} 索引。如果未定义索引则返回 `null`。
   */
  getIndex() {
    return this.index;
  }

  /**
   * 为此几何体设置给定的索引。
   *
   * @param {Array<number>|BufferAttribute} index - 要设置的索引。
   * @return {BufferGeometry} 对此实例的引用。
   */
  setIndex(index) {
    // 如果索引是数组，则根据数组大小选择合适的缓冲区属性类型
    if (Array.isArray(index)) {
      this.index = new (arrayNeedsUint32(index) ? Uint32BufferAttribute : Uint16BufferAttribute)(index, 1);
    } else {
      // 直接设置缓冲区属性
      this.index = index;
    }

    return this;
  }

  /**
   * 为此几何体设置给定的间接属性。
   *
   * @param {BufferAttribute} indirect - 保存间接绘制调用的属性。
   * @return {BufferGeometry} 对此实例的引用。
   */
  setIndirect(indirect) {
    this.indirect = indirect;

    return this;
  }

  /**
   * 返回此几何体的间接属性。
   *
   * @return {?BufferAttribute} 间接属性。如果未定义间接属性则返回 `null`。
   */
  getIndirect() {
    return this.indirect;
  }

  /**
   * 返回给定名称的缓冲区属性。
   *
   * @param {string} name - 属性名称。
   * @return {BufferAttribute|InterleavedBufferAttribute|undefined} 缓冲区属性。
   * 如果未找到属性则返回 `undefined`。
   */
  getAttribute(name) {
    return this.attributes[name];
  }

  /**
   * 为给定名称设置给定属性。
   *
   * @param {string} name - 属性名称。
   * @param {BufferAttribute|InterleavedBufferAttribute} attribute - 要设置的属性。
   * @return {BufferGeometry} 对此实例的引用。
   */
  setAttribute(name, attribute) {
    this.attributes[name] = attribute;

    return this;
  }

  /**
   * 删除给定名称的属性。
   *
   * @param {string} name - 要删除的属性名称。
   * @return {BufferGeometry} 对此实例的引用。
   */
  deleteAttribute(name) {
    delete this.attributes[name];

    return this;
  }

  /**
   * 如果此几何体具有给定名称的属性，则返回 `true`。
   *
   * @param {string} name - 属性名称。
   * @return {boolean} 此几何体是否具有给定名称的属性。
   */
  hasAttribute(name) {
    return this.attributes[name] !== undefined;
  }

  /**
   * 向此几何体添加一个组。
   *
   * @param {number} start - 此绘制调用中的第一个元素。对于非索引几何体，这是第一个顶点，
   * 否则是第一个三角形索引。
   * @param {number} count - 指定此组包含多少个顶点（或索引）。
   * @param {number} [materialIndex=0] - 要使用的材质数组索引。
   */
  addGroup(start, count, materialIndex = 0) {
    this.groups.push({
      start: start,
      count: count,
      materialIndex: materialIndex,
    });
  }

  /**
   * 清除所有组。
   */
  clearGroups() {
    this.groups = [];
  }

  /**
   * 设置此几何体的绘制范围。
   *
   * @param {number} start - 对于非索引几何体，这是第一个顶点，否则是第一个三角形索引。
   * @param {number} count - 对于非索引 BufferGeometry，`count` 是要渲染的顶点数。
   * 对于索引 BufferGeometry，`count` 是要渲染的索引数。
   */
  setDrawRange(start, count) {
    this.drawRange.start = start;
    this.drawRange.count = count;
  }

  /**
   * 将给定的4x4变换矩阵应用于几何体。
   *
   * @param {Matrix4} matrix - 要应用的矩阵。
   * @return {BufferGeometry} 对此实例的引用。
   */
  applyMatrix4(matrix) {
    // 获取位置属性
    const position = this.attributes.position;

    if (position !== undefined) {
      // 对位置应用矩阵变换
      position.applyMatrix4(matrix);

      // 标记需要更新
      position.needsUpdate = true;
    }

    // 获取法线属性
    const normal = this.attributes.normal;

    if (normal !== undefined) {
      // 创建法线矩阵（矩阵的逆转置）
      const normalMatrix = new Matrix3().getNormalMatrix(matrix);

      // 对法线应用法线矩阵变换
      normal.applyNormalMatrix(normalMatrix);

      // 标记需要更新
      normal.needsUpdate = true;
    }

    // 获取切线属性
    const tangent = this.attributes.tangent;

    if (tangent !== undefined) {
      // 对切线应用方向变换
      tangent.transformDirection(matrix);

      // 标记需要更新
      tangent.needsUpdate = true;
    }

    // 如果存在边界盒，重新计算
    if (this.boundingBox !== null) {
      this.computeBoundingBox();
    }

    // 如果存在边界球，重新计算
    if (this.boundingSphere !== null) {
      this.computeBoundingSphere();
    }

    return this;
  }

  /**
   * 将四元数表示的旋转应用于几何体。
   *
   * @param {Quaternion} q - 要应用的四元数。
   * @return {BufferGeometry} 对此实例的引用。
   */
  applyQuaternion(q) {
    // 从四元数创建旋转矩阵
    _m1.makeRotationFromQuaternion(q);

    // 应用矩阵变换
    this.applyMatrix4(_m1);

    return this;
  }

  /**
   * 绕X轴旋转几何体。这通常作为一次性操作完成，而不是在循环中进行。
   * 对于典型的实时网格旋转，请使用 {@link Object3D#rotation}。
   *
   * @param {number} angle - 以弧度为单位的角度。
   * @return {BufferGeometry} 对此实例的引用。
   */
  rotateX(angle) {
    // 绕世界坐标系X轴旋转几何体

    _m1.makeRotationX(angle);

    this.applyMatrix4(_m1);

    return this;
  }

  /**
   * 绕Y轴旋转几何体。这通常作为一次性操作完成，而不是在循环中进行。
   * 对于典型的实时网格旋转，请使用 {@link Object3D#rotation}。
   *
   * @param {number} angle - 以弧度为单位的角度。
   * @return {BufferGeometry} 对此实例的引用。
   */
  rotateY(angle) {
    // 绕世界坐标系Y轴旋转几何体

    _m1.makeRotationY(angle);

    this.applyMatrix4(_m1);

    return this;
  }

  /**
   * 绕Z轴旋转几何体。这通常作为一次性操作完成，而不是在循环中进行。
   * 对于典型的实时网格旋转，请使用 {@link Object3D#rotation}。
   *
   * @param {number} angle - 以弧度为单位的角度。
   * @return {BufferGeometry} 对此实例的引用。
   */
  rotateZ(angle) {
    // 绕世界坐标系Z轴旋转几何体

    _m1.makeRotationZ(angle);

    this.applyMatrix4(_m1);

    return this;
  }

  /**
   * 平移几何体。这通常作为一次性操作完成，而不是在循环中进行。
   * 对于典型的实时网格位置变化，请使用 {@link Object3D#position}。
   *
   * @param {number} x - X轴偏移量。
   * @param {number} y - Y轴偏移量。
   * @param {number} z - Z轴偏移量。
   * @return {BufferGeometry} 对此实例的引用。
   */
  translate(x, y, z) {
    // 平移几何体

    _m1.makeTranslation(x, y, z);

    this.applyMatrix4(_m1);

    return this;
  }

  /**
   * 缩放几何体。这通常作为一次性操作完成，而不是在循环中进行。
   * 对于典型的实时网格缩放，请使用 {@link Object3D#scale}。
   *
   * @param {number} x - X轴缩放因子。
   * @param {number} y - Y轴缩放因子。
   * @param {number} z - Z轴缩放因子。
   * @return {BufferGeometry} 对此实例的引用。
   */
  scale(x, y, z) {
    // 缩放几何体

    _m1.makeScale(x, y, z);

    this.applyMatrix4(_m1);

    return this;
  }

  /**
   * 旋转几何体以面向3D空间中的一个点。这通常作为一次性操作完成，而不是在循环中进行。
   * 对于典型的实时网格旋转，请使用 {@link Object3D#lookAt}。
   *
   * @param {Vector3} vector - 目标点。
   * @return {BufferGeometry} 对此实例的引用。
   */
  lookAt(vector) {
    // 使用临时对象执行lookAt操作
    _obj.lookAt(vector);

    // 更新对象的矩阵
    _obj.updateMatrix();

    // 应用矩阵变换
    this.applyMatrix4(_obj.matrix);

    return this;
  }

  /**
   * 基于边界盒将几何体居中。
   *
   * @return {BufferGeometry} 对此实例的引用。
   */
  center() {
    // 计算边界盒
    this.computeBoundingBox();

    // 获取边界盒中心并取反作为偏移量
    this.boundingBox.getCenter(_offset).negate();

    // 应用平移
    this.translate(_offset.x, _offset.y, _offset.z);

    return this;
  }

  /**
   * 通过基于给定点数组创建 `position` 属性来定义几何体。数组可以包含2D或3D向量。
   * 当使用二维数据时，所有顶点的 `z` 坐标设置为 `0`。
   *
   * 如果该方法与现有的 `position` 属性一起使用，顶点数据将被数组中的数据覆盖。
   * 数组的长度必须与顶点数匹配。
   *
   * @param {Array<Vector2>|Array<Vector3>} points - 点数组。
   * @return {BufferGeometry} 对此实例的引用。
   */
  setFromPoints(points) {
    // 获取现有的位置属性
    const positionAttribute = this.getAttribute("position");

    if (positionAttribute === undefined) {
      // 如果没有现有的位置属性，创建新的
      const position = [];

      // 遍历所有点，将坐标添加到数组中
      for (let i = 0, l = points.length; i < l; i++) {
        const point = points[i];
        position.push(point.x, point.y, point.z || 0);
      }

      // 创建新的位置属性
      this.setAttribute("position", new Float32BufferAttribute(position, 3));
    } else {
      // 如果已有位置属性，更新现有数据
      const l = Math.min(points.length, positionAttribute.count); // 确保数据不超过缓冲区大小

      // 更新现有位置数据
      for (let i = 0; i < l; i++) {
        const point = points[i];
        positionAttribute.setXYZ(i, point.x, point.y, point.z || 0);
      }

      // 如果点数超过缓冲区大小，发出警告
      if (points.length > positionAttribute.count) {
        console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.");
      }

      // 标记需要更新
      positionAttribute.needsUpdate = true;
    }

    return this;
  }

  /**
   * 计算几何体的边界盒，并更新 `boundingBox` 成员。
   * 边界盒不由引擎计算；必须由您的应用程序计算。
   * 如果几何体顶点被修改，您可能需要重新计算边界盒。
   */
  computeBoundingBox() {
    // 如果边界盒为空，创建新的边界盒
    if (this.boundingBox === null) {
      this.boundingBox = new Box3();
    }

    // 获取位置属性和变形目标位置属性
    const position = this.attributes.position;
    const morphAttributesPosition = this.morphAttributes.position;

    // 检查是否为GL缓冲区属性（需要手动设置边界盒）
    if (position && position.isGLBufferAttribute) {
      console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.", this);

      // 设置无限大的边界盒
      this.boundingBox.set(new Vector3(-Infinity, -Infinity, -Infinity), new Vector3(+Infinity, +Infinity, +Infinity));

      return;
    }

    if (position !== undefined) {
      // 从位置属性设置边界盒
      this.boundingBox.setFromBufferAttribute(position);

      // 如果存在变形属性，处理变形属性

      if (morphAttributesPosition) {
        // 遍历所有变形目标
        for (let i = 0, il = morphAttributesPosition.length; i < il; i++) {
          const morphAttribute = morphAttributesPosition[i];
          // 从变形属性设置临时边界盒
          _box.setFromBufferAttribute(morphAttribute);

          if (this.morphTargetsRelative) {
            // 如果变形目标是相对的，添加到现有边界盒
            _vector.addVectors(this.boundingBox.min, _box.min);
            this.boundingBox.expandByPoint(_vector);

            _vector.addVectors(this.boundingBox.max, _box.max);
            this.boundingBox.expandByPoint(_vector);
          } else {
            // 如果变形目标是绝对的，直接扩展边界盒
            this.boundingBox.expandByPoint(_box.min);
            this.boundingBox.expandByPoint(_box.max);
          }
        }
      }
    } else {
      // 如果没有位置属性，创建空的边界盒
      this.boundingBox.makeEmpty();
    }

    // 检查计算结果是否有效
    if (isNaN(this.boundingBox.min.x) || isNaN(this.boundingBox.min.y) || isNaN(this.boundingBox.min.z)) {
      console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.', this);
    }
  }

  /**
   * 计算几何体的边界球，并更新 `boundingSphere` 成员。
   * 引擎在需要时自动计算边界球，例如用于射线投射或视锥体剔除。
   * 如果几何体顶点被修改，您可能需要重新计算边界球。
   */
  computeBoundingSphere() {
    // 如果边界球为空，创建新的边界球
    if (this.boundingSphere === null) {
      this.boundingSphere = new Sphere();
    }

    // 获取位置属性和变形目标位置属性
    const position = this.attributes.position;
    const morphAttributesPosition = this.morphAttributes.position;

    // 检查是否为GL缓冲区属性（需要手动设置边界球）
    if (position && position.isGLBufferAttribute) {
      console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.", this);

      // 设置无限大的边界球
      this.boundingSphere.set(new Vector3(), Infinity);

      return;
    }

    if (position) {
      // 第一步：找到边界球的中心

      const center = this.boundingSphere.center;

      // 从位置属性设置边界盒
      _box.setFromBufferAttribute(position);

      // 如果存在变形属性，处理变形属性

      if (morphAttributesPosition) {
        // 遍历所有变形目标
        for (let i = 0, il = morphAttributesPosition.length; i < il; i++) {
          const morphAttribute = morphAttributesPosition[i];
          // 从变形属性设置变形目标边界盒
          _boxMorphTargets.setFromBufferAttribute(morphAttribute);

          if (this.morphTargetsRelative) {
            // 如果变形目标是相对的，添加到现有边界盒
            _vector.addVectors(_box.min, _boxMorphTargets.min);
            _box.expandByPoint(_vector);

            _vector.addVectors(_box.max, _boxMorphTargets.max);
            _box.expandByPoint(_vector);
          } else {
            // 如果变形目标是绝对的，直接扩展边界盒
            _box.expandByPoint(_boxMorphTargets.min);
            _box.expandByPoint(_boxMorphTargets.max);
          }
        }
      }

      // 获取边界盒的中心作为边界球的中心
      _box.getCenter(center);

      // 第二步：尝试找到半径比边界盒的边界球更小的边界球：
      // 在最佳情况下小 sqrt(3) 倍

      let maxRadiusSq = 0;

      // 遍历所有顶点，找到距离中心最远的点
      for (let i = 0, il = position.count; i < il; i++) {
        _vector.fromBufferAttribute(position, i);

        maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(_vector));
      }

      // 如果存在变形属性，处理变形属性

      if (morphAttributesPosition) {
        // 遍历所有变形目标
        for (let i = 0, il = morphAttributesPosition.length; i < il; i++) {
          const morphAttribute = morphAttributesPosition[i];
          const morphTargetsRelative = this.morphTargetsRelative;

          // 遍历变形属性中的所有顶点
          for (let j = 0, jl = morphAttribute.count; j < jl; j++) {
            _vector.fromBufferAttribute(morphAttribute, j);

            if (morphTargetsRelative) {
              // 如果是相对变形，添加原始位置
              _offset.fromBufferAttribute(position, j);
              _vector.add(_offset);
            }

            // 更新最大半径平方
            maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(_vector));
          }
        }
      }

      // 设置边界球半径
      this.boundingSphere.radius = Math.sqrt(maxRadiusSq);

      // 检查计算结果是否有效
      if (isNaN(this.boundingSphere.radius)) {
        console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.', this);
      }
    }
  }

  /**
   * 计算并为此几何体添加切线属性。
   *
   * 该计算仅支持索引几何体，并且需要定义位置、法线和UV属性。
   * 当使用切线空间法线贴图时，建议使用 {@link BufferGeometryUtils#computeMikkTSpaceTangents}
   * 提供的 MikkTSpace 算法。
   */
  computeTangents() {
    // 获取索引和属性
    const index = this.index;
    const attributes = this.attributes;

    // 基于 http://www.terathon.com/code/tangent.html
    // （每顶点切线）

    // 检查必需的属性是否存在
    if (index === null || attributes.position === undefined || attributes.normal === undefined || attributes.uv === undefined) {
      console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");
      return;
    }

    // 获取各个属性
    const positionAttribute = attributes.position;
    const normalAttribute = attributes.normal;
    const uvAttribute = attributes.uv;

    // 如果没有切线属性，创建一个新的
    if (this.hasAttribute("tangent") === false) {
      this.setAttribute("tangent", new BufferAttribute(new Float32Array(4 * positionAttribute.count), 4));
    }

    const tangentAttribute = this.getAttribute("tangent");

    // 创建临时数组存储切线向量
    const tan1 = [],
      tan2 = [];

    // 为每个顶点初始化切线向量
    for (let i = 0; i < positionAttribute.count; i++) {
      tan1[i] = new Vector3();
      tan2[i] = new Vector3();
    }

    // 创建临时向量用于计算
    const vA = new Vector3(),
      vB = new Vector3(),
      vC = new Vector3(),
      uvA = new Vector2(),
      uvB = new Vector2(),
      uvC = new Vector2(),
      sdir = new Vector3(),
      tdir = new Vector3();

    // 处理三角形的函数，计算切线向量
    function handleTriangle(a, b, c) {
      // 获取三角形三个顶点的位置
      vA.fromBufferAttribute(positionAttribute, a);
      vB.fromBufferAttribute(positionAttribute, b);
      vC.fromBufferAttribute(positionAttribute, c);

      // 获取三角形三个顶点的UV坐标
      uvA.fromBufferAttribute(uvAttribute, a);
      uvB.fromBufferAttribute(uvAttribute, b);
      uvC.fromBufferAttribute(uvAttribute, c);

      // 计算边向量
      vB.sub(vA);
      vC.sub(vA);

      // 计算UV边向量
      uvB.sub(uvA);
      uvC.sub(uvA);

      // 计算切线空间的倒数
      const r = 1.0 / (uvB.x * uvC.y - uvC.x * uvB.y);

      // 静默忽略退化的UV三角形（具有重合或共线顶点）

      if (!isFinite(r)) return;

      // 计算S方向（切线方向）和T方向（副切线方向）
      sdir.copy(vB).multiplyScalar(uvC.y).addScaledVector(vC, -uvB.y).multiplyScalar(r);
      tdir.copy(vC).multiplyScalar(uvB.x).addScaledVector(vB, -uvC.x).multiplyScalar(r);

      // 将计算出的切线向量累加到每个顶点
      tan1[a].add(sdir);
      tan1[b].add(sdir);
      tan1[c].add(sdir);

      tan2[a].add(tdir);
      tan2[b].add(tdir);
      tan2[c].add(tdir);
    }

    // 获取几何体的组
    let groups = this.groups;

    // 如果没有组，创建一个包含所有索引的默认组
    if (groups.length === 0) {
      groups = [
        {
          start: 0,
          count: index.count,
        },
      ];
    }

    // 遍历所有组，处理每个三角形
    for (let i = 0, il = groups.length; i < il; ++i) {
      const group = groups[i];

      const start = group.start;
      const count = group.count;

      // 每3个索引构成一个三角形
      for (let j = start, jl = start + count; j < jl; j += 3) {
        handleTriangle(index.getX(j + 0), index.getX(j + 1), index.getX(j + 2));
      }
    }

    // 创建临时向量用于正交化计算
    const tmp = new Vector3(),
      tmp2 = new Vector3();
    const n = new Vector3(),
      n2 = new Vector3();

    // 处理顶点的函数，计算最终的切线向量
    function handleVertex(v) {
      // 获取顶点的法线
      n.fromBufferAttribute(normalAttribute, v);
      n2.copy(n);

      // 获取累积的切线向量
      const t = tan1[v];

      // Gram-Schmidt 正交化
      // 使切线向量与法线向量正交

      tmp.copy(t);
      tmp.sub(n.multiplyScalar(n.dot(t))).normalize();

      // 计算手性（左手或右手坐标系）

      tmp2.crossVectors(n2, t);
      const test = tmp2.dot(tan2[v]);
      const w = test < 0.0 ? -1.0 : 1.0;

      // 设置切线属性（包含w分量用于手性）
      tangentAttribute.setXYZW(v, tmp.x, tmp.y, tmp.z, w);
    }

    // 再次遍历所有组，为每个顶点计算最终的切线
    for (let i = 0, il = groups.length; i < il; ++i) {
      const group = groups[i];

      const start = group.start;
      const count = group.count;

      // 处理每个三角形的每个顶点
      for (let j = start, jl = start + count; j < jl; j += 3) {
        handleVertex(index.getX(j + 0));
        handleVertex(index.getX(j + 1));
        handleVertex(index.getX(j + 2));
      }
    }
  }

  /**
   * 为给定的顶点数据计算顶点法线。对于索引几何体，该方法将每个顶点法线设置为
   * 共享该顶点的面法线的平均值。对于非索引几何体，顶点不共享，
   * 该方法将每个顶点法线设置为与面法线相同。
   */
  computeVertexNormals() {
    // 获取索引和位置属性
    const index = this.index;
    const positionAttribute = this.getAttribute("position");

    if (positionAttribute !== undefined) {
      // 获取或创建法线属性
      let normalAttribute = this.getAttribute("normal");

      if (normalAttribute === undefined) {
        // 如果没有法线属性，创建一个新的
        normalAttribute = new BufferAttribute(new Float32Array(positionAttribute.count * 3), 3);
        this.setAttribute("normal", normalAttribute);
      } else {
        // 将现有法线重置为零

        for (let i = 0, il = normalAttribute.count; i < il; i++) {
          normalAttribute.setXYZ(i, 0, 0, 0);
        }
      }

      // 创建临时向量用于计算
      const pA = new Vector3(),
        pB = new Vector3(),
        pC = new Vector3();
      const nA = new Vector3(),
        nB = new Vector3(),
        nC = new Vector3();
      const cb = new Vector3(),
        ab = new Vector3();

      // 索引元素

      if (index) {
        // 遍历所有三角形（每3个索引构成一个三角形）
        for (let i = 0, il = index.count; i < il; i += 3) {
          // 获取三角形的三个顶点索引
          const vA = index.getX(i + 0);
          const vB = index.getX(i + 1);
          const vC = index.getX(i + 2);

          // 获取三个顶点的位置
          pA.fromBufferAttribute(positionAttribute, vA);
          pB.fromBufferAttribute(positionAttribute, vB);
          pC.fromBufferAttribute(positionAttribute, vC);

          // 计算面法线（通过叉积）
          cb.subVectors(pC, pB);
          ab.subVectors(pA, pB);
          cb.cross(ab);

          // 获取三个顶点当前的法线
          nA.fromBufferAttribute(normalAttribute, vA);
          nB.fromBufferAttribute(normalAttribute, vB);
          nC.fromBufferAttribute(normalAttribute, vC);

          // 将面法线累加到每个顶点的法线
          nA.add(cb);
          nB.add(cb);
          nC.add(cb);

          // 更新法线属性
          normalAttribute.setXYZ(vA, nA.x, nA.y, nA.z);
          normalAttribute.setXYZ(vB, nB.x, nB.y, nB.z);
          normalAttribute.setXYZ(vC, nC.x, nC.y, nC.z);
        }
      } else {
        // 非索引元素（不连接的三角形汤）

        for (let i = 0, il = positionAttribute.count; i < il; i += 3) {
          // 获取三个顶点的位置
          pA.fromBufferAttribute(positionAttribute, i + 0);
          pB.fromBufferAttribute(positionAttribute, i + 1);
          pC.fromBufferAttribute(positionAttribute, i + 2);

          // 计算面法线
          cb.subVectors(pC, pB);
          ab.subVectors(pA, pB);
          cb.cross(ab);

          // 为三个顶点设置相同的面法线
          normalAttribute.setXYZ(i + 0, cb.x, cb.y, cb.z);
          normalAttribute.setXYZ(i + 1, cb.x, cb.y, cb.z);
          normalAttribute.setXYZ(i + 2, cb.x, cb.y, cb.z);
        }
      }

      // 标准化所有法线向量
      this.normalizeNormals();

      // 标记需要更新
      normalAttribute.needsUpdate = true;
    }
  }

  /**
   * 确保几何体中的每个法线向量的长度为 `1`。这将
   * 修正几何体表面的光照效果。
   */
  normalizeNormals() {
    // 获取法线属性
    const normals = this.attributes.normal;

    // 遍历所有法线向量
    for (let i = 0, il = normals.count; i < il; i++) {
      // 从缓冲区属性获取法线向量
      _vector.fromBufferAttribute(normals, i);

      // 标准化向量（使其长度为1）
      _vector.normalize();

      // 将标准化后的向量写回缓冲区
      normals.setXYZ(i, _vector.x, _vector.y, _vector.z);
    }
  }

  /**
   * 返回此索引几何体的新的非索引版本。如果几何体已经是非索引的，
   * 该方法是无操作的。
   *
   * @return {BufferGeometry} 此索引几何体的非索引版本。
   */
  toNonIndexed() {
    // 转换缓冲区属性的内部函数
    function convertBufferAttribute(attribute, indices) {
      // 获取原始数组、项大小和标准化标志
      const array = attribute.array;
      const itemSize = attribute.itemSize;
      const normalized = attribute.normalized;

      // 创建新的数组，大小为索引数量乘以项大小
      const array2 = new array.constructor(indices.length * itemSize);

      let index = 0,
        index2 = 0;

      // 遍历所有索引
      for (let i = 0, l = indices.length; i < l; i++) {
        if (attribute.isInterleavedBufferAttribute) {
          // 如果是交错缓冲区属性，计算正确的索引位置
          index = indices[i] * attribute.data.stride + attribute.offset;
        } else {
          // 普通缓冲区属性
          index = indices[i] * itemSize;
        }

        // 复制数据
        for (let j = 0; j < itemSize; j++) {
          array2[index2++] = array[index++];
        }
      }

      // 返回新的缓冲区属性
      return new BufferAttribute(array2, itemSize, normalized);
    }

    //

    // 如果已经是非索引几何体，直接返回
    if (this.index === null) {
      console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.");
      return this;
    }

    // 创建新的几何体
    const geometry2 = new BufferGeometry();

    // 获取索引数组和属性
    const indices = this.index.array;
    const attributes = this.attributes;

    // 转换属性

    for (const name in attributes) {
      const attribute = attributes[name];

      // 转换每个属性
      const newAttribute = convertBufferAttribute(attribute, indices);

      geometry2.setAttribute(name, newAttribute);
    }

    // 转换变形属性

    const morphAttributes = this.morphAttributes;

    for (const name in morphAttributes) {
      const morphArray = [];
      const morphAttribute = morphAttributes[name]; // morphAttribute: Float32BufferAttributes 数组

      // 转换每个变形属性
      for (let i = 0, il = morphAttribute.length; i < il; i++) {
        const attribute = morphAttribute[i];

        const newAttribute = convertBufferAttribute(attribute, indices);

        morphArray.push(newAttribute);
      }

      geometry2.morphAttributes[name] = morphArray;
    }

    // 复制变形目标相对标志
    geometry2.morphTargetsRelative = this.morphTargetsRelative;

    // 复制组

    const groups = this.groups;

    for (let i = 0, l = groups.length; i < l; i++) {
      const group = groups[i];
      geometry2.addGroup(group.start, group.count, group.materialIndex);
    }

    return geometry2;
  }

  /**
   * 将几何体序列化为JSON。
   *
   * @return {Object} 表示序列化几何体的JSON对象。
   */
  toJSON() {
    // 创建基础数据结构
    const data = {
      metadata: {
        version: 4.7,
        type: "BufferGeometry",
        generator: "BufferGeometry.toJSON",
      },
    };

    // 标准 BufferGeometry 序列化

    data.uuid = this.uuid;
    data.type = this.type;
    if (this.name !== "") data.name = this.name;
    if (Object.keys(this.userData).length > 0) data.userData = this.userData;

    // 如果有参数，直接序列化参数并返回
    if (this.parameters !== undefined) {
      const parameters = this.parameters;

      for (const key in parameters) {
        if (parameters[key] !== undefined) data[key] = parameters[key];
      }

      return data;
    }

    // 为简化起见，代码假设属性不在几何体之间共享，参见 #15811

    data.data = { attributes: {} };

    // 序列化索引
    const index = this.index;

    if (index !== null) {
      data.data.index = {
        type: index.array.constructor.name,
        array: Array.prototype.slice.call(index.array),
      };
    }

    // 序列化属性
    const attributes = this.attributes;

    for (const key in attributes) {
      const attribute = attributes[key];

      data.data.attributes[key] = attribute.toJSON(data.data);
    }

    // 序列化变形属性
    const morphAttributes = {};
    let hasMorphAttributes = false;

    for (const key in this.morphAttributes) {
      const attributeArray = this.morphAttributes[key];

      const array = [];

      // 序列化每个变形属性
      for (let i = 0, il = attributeArray.length; i < il; i++) {
        const attribute = attributeArray[i];

        array.push(attribute.toJSON(data.data));
      }

      if (array.length > 0) {
        morphAttributes[key] = array;

        hasMorphAttributes = true;
      }
    }

    // 如果有变形属性，添加到数据中
    if (hasMorphAttributes) {
      data.data.morphAttributes = morphAttributes;
      data.data.morphTargetsRelative = this.morphTargetsRelative;
    }

    // 序列化组
    const groups = this.groups;

    if (groups.length > 0) {
      data.data.groups = JSON.parse(JSON.stringify(groups));
    }

    // 序列化边界球
    const boundingSphere = this.boundingSphere;

    if (boundingSphere !== null) {
      data.data.boundingSphere = boundingSphere.toJSON();
    }

    return data;
  }

  /**
   * 返回一个具有从此实例复制的值的新几何体。
   *
   * @return {BufferGeometry} 此实例的克隆。
   */
  clone() {
    return new this.constructor().copy(this);
  }

  /**
   * 将给定几何体的值复制到此实例。
   *
   * @param {BufferGeometry} source - 要复制的几何体。
   * @return {BufferGeometry} 对此实例的引用。
   */
  copy(source) {
    // 重置当前实例

    this.index = null;
    this.attributes = {};
    this.morphAttributes = {};
    this.groups = [];
    this.boundingBox = null;
    this.boundingSphere = null;

    // 用于存储克隆的共享数据

    const data = {};

    // 复制名称

    this.name = source.name;

    // 复制索引

    const index = source.index;

    if (index !== null) {
      this.setIndex(index.clone());
    }

    // 复制属性

    const attributes = source.attributes;

    for (const name in attributes) {
      const attribute = attributes[name];
      this.setAttribute(name, attribute.clone(data));
    }

    // 复制变形属性

    const morphAttributes = source.morphAttributes;

    for (const name in morphAttributes) {
      const array = [];
      const morphAttribute = morphAttributes[name]; // morphAttribute: Float32BufferAttributes 数组

      // 克隆每个变形属性
      for (let i = 0, l = morphAttribute.length; i < l; i++) {
        array.push(morphAttribute[i].clone(data));
      }

      this.morphAttributes[name] = array;
    }

    // 复制变形目标相对标志
    this.morphTargetsRelative = source.morphTargetsRelative;

    // 复制组

    const groups = source.groups;

    for (let i = 0, l = groups.length; i < l; i++) {
      const group = groups[i];
      this.addGroup(group.start, group.count, group.materialIndex);
    }

    // 复制边界盒

    const boundingBox = source.boundingBox;

    if (boundingBox !== null) {
      this.boundingBox = boundingBox.clone();
    }

    // 复制边界球

    const boundingSphere = source.boundingSphere;

    if (boundingSphere !== null) {
      this.boundingSphere = boundingSphere.clone();
    }

    // 复制绘制范围

    this.drawRange.start = source.drawRange.start;
    this.drawRange.count = source.drawRange.count;

    // 复制用户数据

    this.userData = source.userData;

    return this;
  }

  /**
   * 释放此实例分配的GPU相关资源。当此实例在您的应用程序中不再使用时，
   * 请调用此方法。
   *
   * @fires BufferGeometry#dispose
   */
  dispose() {
    // 分发dispose事件，通知监听器资源即将被释放
    this.dispatchEvent({ type: "dispose" });
  }
}

// 导出 BufferGeometry 类
export { BufferGeometry };
