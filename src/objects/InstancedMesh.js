// 从核心模块导入实例化缓冲属性类
import { InstancedBufferAttribute } from "../core/InstancedBufferAttribute.js";
// 从当前目录导入网格基类
import { Mesh } from "./Mesh.js";
// 从数学模块导入3D包围盒类
import { Box3 } from "../math/Box3.js";
// 从数学模块导入4x4矩阵类
import { Matrix4 } from "../math/Matrix4.js";
// 从数学模块导入球体类
import { Sphere } from "../math/Sphere.js";
// 从纹理模块导入数据纹理类
import { DataTexture } from "../textures/DataTexture.js";
// 从常量模块导入浮点类型和红色格式常量
import { FloatType, RedFormat } from "../constants.js";

// 用于存储实例本地变换矩阵的临时对象（模块级别的重用对象，避免重复创建）
const _instanceLocalMatrix = /*@__PURE__*/ new Matrix4();
// 用于存储实例世界变换矩阵的临时对象（模块级别的重用对象，避免重复创建）
const _instanceWorldMatrix = /*@__PURE__*/ new Matrix4();

// 用于存储实例交点信息的数组（模块级别的重用对象，避免重复创建）
const _instanceIntersects = [];

// 用于边界计算的3D包围盒临时对象（模块级别的重用对象，避免重复创建）
const _box3 = /*@__PURE__*/ new Box3();
// 单位矩阵临时对象（模块级别的重用对象，避免重复创建）
const _identity = /*@__PURE__*/ new Matrix4();
// 用于射线检测的网格临时对象（模块级别的重用对象，避免重复创建）
const _mesh = /*@__PURE__*/ new Mesh();
// 用于边界计算的球体临时对象（模块级别的重用对象，避免重复创建）
const _sphere = /*@__PURE__*/ new Sphere();

/**
 * 实例化网格类，支持实例化渲染的特殊网格版本。
 *
 * 当你需要渲染大量具有相同几何体和材质但具有不同世界变换的对象时，使用此类。
 * InstancedMesh的使用将帮助你减少绘制调用次数，从而提高应用程序的整体渲染性能。
 *
 * 实例化渲染是一种优化技术，允许在单次绘制调用中渲染同一对象的多个副本，
 * 每个副本可以有不同的位置、旋转、缩放和颜色。
 *
 * @augments Mesh
 */
class InstancedMesh extends Mesh {
  /**
   * 构造一个新的实例化网格
   *
   * @param {BufferGeometry} [geometry] - 网格的几何体，所有实例共享同一几何体
   * @param {Material|Array<Material>} [material] - 网格的材质，所有实例共享同一材质
   * @param {number} count - 实例的数量，必须在创建时指定
   */
  constructor(geometry, material, count) {
    // 调用父类Mesh的构造函数
    super(geometry, material);

    /**
     * 用于类型检测的标志位
     *
     * 这个标志可以用来快速判断一个对象是否为InstancedMesh类型，
     * 在渲染器中用于识别需要实例化渲染的对象
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isInstancedMesh = true;

    /**
     * 表示所有实例的本地变换矩阵
     *
     * 这是一个包含所有实例变换矩阵的缓冲属性。每个实例占用16个浮点数（4x4矩阵）。
     * 如果你通过setMatrixAt方法修改实例数据，必须将其needsUpdate标志设置为true。
     *
     * @type {InstancedBufferAttribute}
     */
    this.instanceMatrix = new InstancedBufferAttribute(new Float32Array(count * 16), 16);

    /**
     * 表示所有实例的颜色
     *
     * 这是一个可选的缓冲属性，用于为每个实例指定不同的颜色。
     * 如果你通过setColorAt方法修改实例数据，必须将其needsUpdate标志设置为true。
     *
     * @type {?InstancedBufferAttribute}
     * @default null
     */
    this.instanceColor = null;

    /**
     * 表示所有实例的变形目标权重
     *
     * 这是一个可选的数据纹理，用于存储每个实例的变形目标权重。
     * 如果你通过setMorphAt方法修改实例数据，必须将其needsUpdate标志设置为true。
     *
     * @type {?DataTexture}
     * @default null
     */
    this.morphTexture = null;

    /**
     * 实例的数量
     *
     * 指定要渲染的实例总数。这个值在创建时设定，
     * 决定了instanceMatrix等缓冲区的大小。
     *
     * @type {number}
     */
    this.count = count;

    /**
     * 实例化网格的包围盒
     *
     * 包含所有实例的轴对齐包围盒。可以通过computeBoundingBox方法计算。
     * 用于视锥体剔除和碰撞检测等优化。
     *
     * @type {?Box3}
     * @default null
     */
    this.boundingBox = null;

    /**
     * 实例化网格的包围球
     *
     * 包含所有实例的包围球。可以通过computeBoundingSphere方法计算。
     * 用于视锥体剔除和距离计算等优化。
     *
     * @type {?Sphere}
     * @default null
     */
    this.boundingSphere = null;

    // 初始化所有实例的变换矩阵为单位矩阵
    for (let i = 0; i < count; i++) {
      // 将第i个实例的变换矩阵设置为单位矩阵（无变换）
      this.setMatrixAt(i, _identity);
    }
  }

  /**
   * 计算实例化网格的包围盒
   *
   * 计算包含所有实例的包围盒，并更新boundingBox属性。
   * 引擎不会自动计算包围盒；此方法必须由你的应用程序调用。
   * 如果通过setMatrixAt变换实例，你可能需要重新计算包围盒。
   */
  computeBoundingBox() {
    // 获取共享的几何体
    const geometry = this.geometry;
    // 获取实例数量
    const count = this.count;

    // 如果包围盒尚未创建，则创建一个新的
    if (this.boundingBox === null) {
      this.boundingBox = new Box3();
    }

    // 如果几何体的包围盒尚未计算，则先计算几何体包围盒
    if (geometry.boundingBox === null) {
      geometry.computeBoundingBox();
    }

    // 清空当前包围盒，准备重新计算
    this.boundingBox.makeEmpty();

    // 遍历所有实例，计算包含所有实例的包围盒
    for (let i = 0; i < count; i++) {
      // 获取第i个实例的变换矩阵
      this.getMatrixAt(i, _instanceLocalMatrix);

      // 将几何体包围盒应用实例变换，得到实例的包围盒
      _box3.copy(geometry.boundingBox).applyMatrix4(_instanceLocalMatrix);

      // 将实例包围盒合并到总包围盒中
      this.boundingBox.union(_box3);
    }
  }

  /**
   * 计算实例化网格的包围球
   *
   * 计算包含所有实例的包围球，并更新boundingSphere属性。
   * 引擎在需要时会自动计算包围球，例如用于射线投射或视锥体剔除。
   * 如果通过setMatrixAt变换实例，你可能需要重新计算包围球。
   */
  computeBoundingSphere() {
    // 获取共享的几何体
    const geometry = this.geometry;
    // 获取实例数量
    const count = this.count;

    // 如果包围球尚未创建，则创建一个新的
    if (this.boundingSphere === null) {
      this.boundingSphere = new Sphere();
    }

    // 如果几何体的包围球尚未计算，则先计算几何体包围球
    if (geometry.boundingSphere === null) {
      geometry.computeBoundingSphere();
    }

    // 清空当前包围球，准备重新计算
    this.boundingSphere.makeEmpty();

    // 遍历所有实例，计算包含所有实例的包围球
    for (let i = 0; i < count; i++) {
      // 获取第i个实例的变换矩阵
      this.getMatrixAt(i, _instanceLocalMatrix);

      // 将几何体包围球应用实例变换，得到实例的包围球
      _sphere.copy(geometry.boundingSphere).applyMatrix4(_instanceLocalMatrix);

      // 将实例包围球合并到总包围球中
      this.boundingSphere.union(_sphere);
    }
  }

  /**
   * 复制另一个实例化网格的属性到当前对象
   *
   * @param {InstancedMesh} source - 要复制的源实例化网格对象
   * @param {boolean} recursive - 是否递归复制子对象
   * @return {InstancedMesh} 返回当前对象的引用，支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的复制方法，复制基础的Mesh属性
    super.copy(source, recursive);

    // 复制实例变换矩阵缓冲属性
    this.instanceMatrix.copy(source.instanceMatrix);

    // 如果源对象有变形纹理，则克隆它
    if (source.morphTexture !== null) this.morphTexture = source.morphTexture.clone();
    // 如果源对象有实例颜色，则克隆它
    if (source.instanceColor !== null) this.instanceColor = source.instanceColor.clone();

    // 复制实例数量
    this.count = source.count;

    // 如果源对象有包围盒，则克隆它
    if (source.boundingBox !== null) this.boundingBox = source.boundingBox.clone();
    // 如果源对象有包围球，则克隆它
    if (source.boundingSphere !== null) this.boundingSphere = source.boundingSphere.clone();

    // 返回当前对象，支持链式调用
    return this;
  }

  /**
   * 获取指定实例的颜色
   *
   * @param {number} index - 实例索引
   * @param {Color} color - 用于存储方法结果的目标颜色对象
   */
  getColorAt(index, color) {
    // 从实例颜色数组中读取颜色值（每个颜色占用3个浮点数：RGB）
    color.fromArray(this.instanceColor.array, index * 3);
  }

  /**
   * 获取指定实例的本地变换矩阵
   *
   * @param {number} index - 实例索引
   * @param {Matrix4} matrix - 用于存储方法结果的目标矩阵对象
   */
  getMatrixAt(index, matrix) {
    // 从实例矩阵数组中读取矩阵值（每个矩阵占用16个浮点数：4x4矩阵）
    matrix.fromArray(this.instanceMatrix.array, index * 16);
  }

  /**
   * 获取指定实例的变形目标权重
   *
   * @param {number} index - 实例索引
   * @param {Mesh} object - 用于存储方法结果的目标网格对象
   */
  getMorphAt(index, object) {
    // 获取目标对象的变形目标影响权重数组
    const objectInfluences = object.morphTargetInfluences;

    // 获取变形纹理的数据数组
    const array = this.morphTexture.source.data.data;

    // 计算数据长度：所有影响权重 + 基础影响权重总和
    const len = objectInfluences.length + 1;

    // 计算数据索引：跳过开头的基础影响权重总和
    const dataIndex = index * len + 1;

    // 从纹理数据中读取变形目标权重
    for (let i = 0; i < objectInfluences.length; i++) {
      objectInfluences[i] = array[dataIndex + i];
    }
  }

  /**
   * 计算射线与实例化网格的交点
   *
   * 该方法对每个实例进行射线检测，找出所有相交的实例。
   *
   * @param {Raycaster} raycaster - 射线投射器对象
   * @param {Array<Object>} intersects - 存储交点信息的目标数组
   */
  raycast(raycaster, intersects) {
    // 获取实例化网格的世界变换矩阵
    const matrixWorld = this.matrixWorld;
    // 获取需要进行射线检测的次数（实例数量）
    const raycastTimes = this.count;

    // 设置临时网格对象的几何体和材质
    _mesh.geometry = this.geometry;
    _mesh.material = this.material;

    // 如果材质未定义，则直接返回
    if (_mesh.material === undefined) return;

    // 首先使用包围球进行快速检测

    // 如果包围球尚未计算，则先计算包围球
    if (this.boundingSphere === null) this.computeBoundingSphere();

    // 复制包围球并变换到世界坐标系
    _sphere.copy(this.boundingSphere);
    _sphere.applyMatrix4(matrixWorld);

    // 如果射线不与包围球相交，则直接返回
    if (raycaster.ray.intersectsSphere(_sphere) === false) return;

    // 现在测试每个实例

    // 遍历所有实例进行射线检测
    for (let instanceId = 0; instanceId < raycastTimes; instanceId++) {
      // 计算每个实例的世界变换矩阵

      // 获取当前实例的本地变换矩阵
      this.getMatrixAt(instanceId, _instanceLocalMatrix);

      // 计算实例的世界变换矩阵：世界矩阵 × 实例本地矩阵
      _instanceWorldMatrix.multiplyMatrices(matrixWorld, _instanceLocalMatrix);

      // 临时网格对象代表这个单独的实例

      // 设置临时网格的世界变换矩阵
      _mesh.matrixWorld = _instanceWorldMatrix;

      // 对当前实例进行射线检测
      _mesh.raycast(raycaster, _instanceIntersects);

      // 处理射线检测的结果

      // 遍历当前实例的所有交点
      for (let i = 0, l = _instanceIntersects.length; i < l; i++) {
        const intersect = _instanceIntersects[i];
        // 设置交点的实例ID
        intersect.instanceId = instanceId;
        // 设置交点的对象引用为当前实例化网格
        intersect.object = this;
        // 将交点添加到结果数组
        intersects.push(intersect);
      }

      // 清空临时交点数组，准备下一次检测
      _instanceIntersects.length = 0;
    }
  }

  /**
   * 设置指定实例的颜色
   *
   * 更新所有颜色后，确保将instanceColor的needsUpdate标志设置为true。
   *
   * @param {number} index - 实例索引
   * @param {Color} color - 实例颜色
   */
  setColorAt(index, color) {
    // 如果实例颜色缓冲区尚未创建，则创建它
    if (this.instanceColor === null) {
      // 创建颜色缓冲区，每个实例3个浮点数（RGB），初始值为1（白色）
      this.instanceColor = new InstancedBufferAttribute(new Float32Array(this.instanceMatrix.count * 3).fill(1), 3);
    }

    // 将颜色值写入缓冲区数组（每个颜色占用3个浮点数）
    color.toArray(this.instanceColor.array, index * 3);
  }

  /**
   * 设置指定实例的本地变换矩阵
   *
   * 更新所有矩阵后，确保将instanceMatrix的needsUpdate标志设置为true。
   *
   * @param {number} index - 实例索引
   * @param {Matrix4} matrix - 本地变换矩阵
   */
  setMatrixAt(index, matrix) {
    // 将矩阵值写入缓冲区数组（每个矩阵占用16个浮点数）
    matrix.toArray(this.instanceMatrix.array, index * 16);
  }

  /**
   * 设置指定实例的变形目标权重
   *
   * 更新所有影响权重后，确保将morphTexture的needsUpdate标志设置为true。
   *
   * @param {number} index - 实例索引
   * @param {Mesh} object - 包含单个实例变形目标权重的网格对象，其morphTargetInfluences属性包含权重值
   */
  setMorphAt(index, object) {
    // 获取对象的变形目标影响权重数组
    const objectInfluences = object.morphTargetInfluences;

    // 计算数据长度：基础变形影响 + 所有影响权重
    const len = objectInfluences.length + 1;

    // 如果变形纹理尚未创建，则创建它
    if (this.morphTexture === null) {
      // 创建数据纹理来存储变形权重，使用红色格式和浮点类型
      this.morphTexture = new DataTexture(new Float32Array(len * this.count), len, this.count, RedFormat, FloatType);
    }

    // 获取纹理数据数组
    const array = this.morphTexture.source.data.data;

    // 计算所有变形影响权重的总和
    let morphInfluencesSum = 0;

    for (let i = 0; i < objectInfluences.length; i++) {
      morphInfluencesSum += objectInfluences[i];
    }

    // 计算基础变形影响：如果是相对变形目标则为1，否则为1减去权重总和
    const morphBaseInfluence = this.geometry.morphTargetsRelative ? 1 : 1 - morphInfluencesSum;

    // 计算当前实例在数据数组中的起始索引
    const dataIndex = len * index;

    // 设置基础变形影响值
    array[dataIndex] = morphBaseInfluence;

    // 将变形目标权重复制到数据数组中
    array.set(objectInfluences, dataIndex + 1);
  }

  /**
   * 更新变形目标
   *
   * 实例化网格的变形目标更新是空实现，
   * 因为变形目标权重存储在纹理中而不是几何体属性中。
   */
  updateMorphTargets() {}

  /**
   * 释放此实例分配的GPU相关资源
   *
   * 当此实例在你的应用程序中不再使用时，调用此方法。
   * 这有助于防止内存泄漏和GPU资源浪费。
   */
  dispose() {
    // 派发dispose事件，通知监听器对象即将被销毁
    this.dispatchEvent({ type: "dispose" });

    // 如果存在变形纹理，则释放它
    if (this.morphTexture !== null) {
      this.morphTexture.dispose();
      this.morphTexture = null;
    }
  }
}

// 导出InstancedMesh类供其他模块使用
export { InstancedMesh };
