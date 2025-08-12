// 导入球体类，用于包围球计算和射线检测优化
import { Sphere } from "../math/Sphere.js";
// 导入射线类，用于射线投射和交点检测
import { Ray } from "../math/Ray.js";
// 导入4x4矩阵类，用于坐标变换
import { Matrix4 } from "../math/Matrix4.js";
// 导入3D对象基类
import { Object3D } from "../core/Object3D.js";
// 导入三维向量类，用于位置计算
import { Vector3 } from "../math/Vector3.js";
// 导入点材质类，作为默认材质
import { PointsMaterial } from "../materials/PointsMaterial.js";
// 导入缓冲几何体类，作为默认几何体
import { BufferGeometry } from "../core/BufferGeometry.js";

// 用于射线检测的逆矩阵（将世界坐标转换为本地坐标）
const _inverseMatrix = /*@__PURE__*/ new Matrix4();
// 用于射线检测的射线对象（本地坐标系）
const _ray = /*@__PURE__*/ new Ray();
// 用于包围球检测的球体对象
const _sphere = /*@__PURE__*/ new Sphere();
// 用于存储点位置的临时向量
const _position = /*@__PURE__*/ new Vector3();

/**
 * 用于显示点或点云的类
 * 点云是由大量独立点组成的3D对象，常用于粒子系统、星空效果、数据可视化等场景
 *
 * @augments Object3D
 */
class Points extends Object3D {
  /**
   * 构造一个新的点云对象
   *
   * @param {BufferGeometry} [geometry] - 点云的几何体，包含点的位置等数据
   * @param {PointsMaterial|Array<PointsMaterial>} [material] - 点云的材质，定义点的外观
   */
  constructor(geometry = new BufferGeometry(), material = new PointsMaterial()) {
    // 调用父类构造函数
    super();

    /**
     * 用于类型检测的标志
     * 可以通过此属性判断对象是否为点云对象
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isPoints = true;

    /**
     * 对象类型标识
     * 用于序列化和调试时识别对象类型
     *
     * @type {string}
     */
    this.type = "Points";

    /**
     * 点云的几何体
     * 包含点的位置、颜色、大小等几何数据
     *
     * @type {BufferGeometry}
     */
    this.geometry = geometry;

    /**
     * 点云的材质
     * 定义点的渲染方式，如颜色、大小、纹理等
     *
     * @type {PointsMaterial|Array<PointsMaterial>}
     * @default PointsMaterial
     */
    this.material = material;

    /**
     * 变形目标字典
     * 键是变形目标的名称，值是其属性索引。
     * 默认为undefined，只有在几何体中检测到变形目标时才设置。
     *
     * @type {Object<String,number>|undefined}
     * @default undefined
     */
    this.morphTargetDictionary = undefined;

    /**
     * 变形目标影响权重数组
     * 通常在[0,1]范围内，指定变形的应用程度。
     * 默认为undefined，只有在几何体中检测到变形目标时才设置。
     *
     * @type {Array<number>|undefined}
     * @default undefined
     */
    this.morphTargetInfluences = undefined;

    // 更新变形目标设置
    this.updateMorphTargets();
  }

  /**
   * 复制另一个点云对象的属性
   * 包括几何体、材质等所有相关属性
   *
   * @param {Points} source - 要复制的源点云对象
   * @param {boolean} recursive - 是否递归复制子对象
   * @return {Points} 返回当前点云对象，支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的copy方法
    super.copy(source, recursive);

    // 复制材质（如果是数组则复制数组，否则直接赋值）
    this.material = Array.isArray(source.material) ? source.material.slice() : source.material;
    // 复制几何体引用
    this.geometry = source.geometry;

    return this;
  }

  /**
   * 计算射线与此点云的交点
   * 使用阈值距离判断射线是否与点相交，支持索引和非索引几何体
   *
   * @param {Raycaster} raycaster - 射线投射器
   * @param {Array<Object>} intersects - 存储交点信息的目标数组
   */
  raycast(raycaster, intersects) {
    // 获取几何体、世界变换矩阵和射线检测阈值
    const geometry = this.geometry;
    const matrixWorld = this.matrixWorld;
    const threshold = raycaster.params.Points.threshold;
    const drawRange = geometry.drawRange;

    // 第一步：检查包围球与射线的距离

    // 如果包围球未计算，先计算包围球
    if (geometry.boundingSphere === null) geometry.computeBoundingSphere();

    // 将包围球转换到世界空间并扩展半径（加上阈值）
    _sphere.copy(geometry.boundingSphere);
    _sphere.applyMatrix4(matrixWorld);
    _sphere.radius += threshold;

    // 如果射线不与扩展后的包围球相交，直接返回
    if (raycaster.ray.intersectsSphere(_sphere) === false) return;

    // 第二步：将射线转换到本地空间进行精确检测

    // 计算世界变换矩阵的逆矩阵
    _inverseMatrix.copy(matrixWorld).invert();
    // 将射线转换到本地空间
    _ray.copy(raycaster.ray).applyMatrix4(_inverseMatrix);

    // 计算本地空间的阈值（考虑对象的缩放）
    const localThreshold = threshold / ((this.scale.x + this.scale.y + this.scale.z) / 3);
    const localThresholdSq = localThreshold * localThreshold;

    // 获取几何体的索引和属性
    const index = geometry.index;
    const attributes = geometry.attributes;
    const positionAttribute = attributes.position;

    if (index !== null) {
      // 处理索引几何体：遍历索引数组中的每个点
      const start = Math.max(0, drawRange.start);
      const end = Math.min(index.count, drawRange.start + drawRange.count);

      for (let i = start, il = end; i < il; i++) {
        // 获取点的索引
        const a = index.getX(i);

        // 从位置属性中获取点的坐标
        _position.fromBufferAttribute(positionAttribute, a);

        // 测试射线与点的交点
        testPoint(_position, a, localThresholdSq, matrixWorld, raycaster, intersects, this);
      }
    } else {
      // 处理非索引几何体：直接遍历位置属性中的每个点
      const start = Math.max(0, drawRange.start);
      const end = Math.min(positionAttribute.count, drawRange.start + drawRange.count);

      for (let i = start, l = end; i < l; i++) {
        // 从位置属性中获取点的坐标
        _position.fromBufferAttribute(positionAttribute, i);

        // 测试射线与点的交点
        testPoint(_position, i, localThresholdSq, matrixWorld, raycaster, intersects, this);
      }
    }
  }

  /**
   * 更新变形目标设置
   * 设置morphTargetDictionary和morphTargetInfluences的值，
   * 确保现有的变形目标能够影响此点云对象。
   */
  updateMorphTargets() {
    // 获取几何体引用
    const geometry = this.geometry;

    // 获取几何体的变形属性
    const morphAttributes = geometry.morphAttributes;
    // 获取所有变形属性的键名
    const keys = Object.keys(morphAttributes);

    // 如果存在变形属性
    if (keys.length > 0) {
      // 获取第一个变形属性（通常是position）
      const morphAttribute = morphAttributes[keys[0]];

      if (morphAttribute !== undefined) {
        // 初始化变形目标影响权重数组
        this.morphTargetInfluences = [];
        // 初始化变形目标字典
        this.morphTargetDictionary = {};

        // 遍历所有变形目标
        for (let m = 0, ml = morphAttribute.length; m < ml; m++) {
          // 获取变形目标名称，如果没有名称则使用索引
          const name = morphAttribute[m].name || String(m);

          // 添加初始权重（0表示不应用变形）
          this.morphTargetInfluences.push(0);
          // 在字典中记录名称到索引的映射
          this.morphTargetDictionary[name] = m;
        }
      }
    }
  }
}

/**
 * 测试射线与单个点的交点
 * 计算射线到点的距离，如果在阈值范围内则创建交点信息
 *
 * @param {Vector3} point - 点的位置（本地坐标系）
 * @param {number} index - 点的索引
 * @param {number} localThresholdSq - 本地阈值的平方
 * @param {Matrix4} matrixWorld - 世界变换矩阵
 * @param {Raycaster} raycaster - 射线投射器
 * @param {Array<Object>} intersects - 存储交点信息的数组
 * @param {Points} object - 点云对象
 */
function testPoint(point, index, localThresholdSq, matrixWorld, raycaster, intersects, object) {
  // 计算射线到点的距离的平方
  const rayPointDistanceSq = _ray.distanceSqToPoint(point);

  // 如果距离在阈值范围内
  if (rayPointDistanceSq < localThresholdSq) {
    // 创建交点向量
    const intersectPoint = new Vector3();

    // 计算射线上距离点最近的点
    _ray.closestPointToPoint(point, intersectPoint);
    // 将交点转换到世界坐标系
    intersectPoint.applyMatrix4(matrixWorld);

    // 计算射线起点到交点的距离
    const distance = raycaster.ray.origin.distanceTo(intersectPoint);

    // 检查距离是否在有效范围内（近裁剪面到远裁剪面）
    if (distance < raycaster.near || distance > raycaster.far) return;

    // 添加交点信息到结果数组
    intersects.push({
      distance: distance, // 距离
      distanceToRay: Math.sqrt(rayPointDistanceSq), // 到射线的距离
      point: intersectPoint, // 交点位置
      index: index, // 点索引
      face: null, // 面信息（点云没有面）
      faceIndex: null, // 面索引（点云没有面）
      barycoord: null, // 重心坐标（点云没有）
      object: object, // 相交的对象
    });
  }
}

// 导出点云类
export { Points };
