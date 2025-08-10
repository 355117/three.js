// 从数学模块导入球体类，用于边界球计算
import { Sphere } from "../math/Sphere.js";
// 从数学模块导入射线类，用于射线检测
import { Ray } from "../math/Ray.js";
// 从数学模块导入4x4矩阵类，用于变换计算
import { Matrix4 } from "../math/Matrix4.js";
// 从核心模块导入3D对象基类
import { Object3D } from "../core/Object3D.js";
// 从数学模块导入3D向量类
import { Vector3 } from "../math/Vector3.js";
// 从材质模块导入线条基础材质
import { LineBasicMaterial } from "../materials/LineBasicMaterial.js";
// 从核心模块导入缓冲几何体类
import { BufferGeometry } from "../core/BufferGeometry.js";
// 从核心模块导入32位浮点缓冲属性类
import { Float32BufferAttribute } from "../core/BufferAttribute.js";

// 用于射线检测的线段起始点向量（模块级别的重用对象，避免重复创建）
const _vStart = /*@__PURE__*/ new Vector3();
// 用于射线检测的线段结束点向量（模块级别的重用对象，避免重复创建）
const _vEnd = /*@__PURE__*/ new Vector3();

// 用于射线检测的逆变换矩阵（模块级别的重用对象，避免重复创建）
const _inverseMatrix = /*@__PURE__*/ new Matrix4();
// 用于射线检测的射线对象（模块级别的重用对象，避免重复创建）
const _ray = /*@__PURE__*/ new Ray();
// 用于边界检测的球体对象（模块级别的重用对象，避免重复创建）
const _sphere = /*@__PURE__*/ new Sphere();

// 用于存储射线上的交点（模块级别的重用对象，避免重复创建）
const _intersectPointOnRay = /*@__PURE__*/ new Vector3();
// 用于存储线段上的交点（模块级别的重用对象，避免重复创建）
const _intersectPointOnSegment = /*@__PURE__*/ new Vector3();

/**
 * 连续线条类。线条通过连接连续的顶点与直线段来渲染。
 *
 * Line类用于创建由一系列连接的线段组成的3D线条。
 * 每个线段连接几何体中相邻的两个顶点。
 *
 * 使用示例：
 * ```js
 * const material = new THREE.LineBasicMaterial( { color: 0x0000ff } ); // 创建蓝色线条材质
 *
 * const points = []; // 创建点数组
 * points.push( new THREE.Vector3( - 10, 0, 0 ) ); // 添加第一个点
 * points.push( new THREE.Vector3( 0, 10, 0 ) );   // 添加第二个点
 * points.push( new THREE.Vector3( 10, 0, 0 ) );   // 添加第三个点
 *
 * const geometry = new THREE.BufferGeometry().setFromPoints( points ); // 从点创建几何体
 *
 * const line = new THREE.Line( geometry, material ); // 创建线条对象
 * scene.add( line ); // 将线条添加到场景中
 * ```
 *
 * @augments Object3D
 */
class Line extends Object3D {
  /**
   * 构造一个新的线条对象
   *
   * @param {BufferGeometry} [geometry] - 线条的几何体，默认为空的BufferGeometry
   * @param {Material|Array<Material>} [material] - 线条的材质，可以是单个材质或材质数组，默认为LineBasicMaterial
   */
  constructor(geometry = new BufferGeometry(), material = new LineBasicMaterial()) {
    // 调用父类Object3D的构造函数
    super();

    /**
     * 用于类型检测的标志位
     *
     * 这个标志可以用来快速判断一个对象是否为Line类型，
     * 在渲染器和其他系统中用于优化处理流程
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isLine = true;

    // 设置对象类型名称，用于调试和序列化
    this.type = "Line";

    /**
     * 线条的几何体
     *
     * 包含线条的顶点位置、颜色、UV坐标等几何信息。
     * 线条通过连接几何体中相邻的顶点来渲染。
     *
     * @type {BufferGeometry}
     */
    this.geometry = geometry;

    /**
     * 线条的材质
     *
     * 定义线条的外观，包括颜色、透明度、线宽等属性。
     * 可以是单个材质或材质数组（用于多材质线条）。
     *
     * @type {Material|Array<Material>}
     * @default LineBasicMaterial
     */
    this.material = material;

    /**
     * 变形目标字典
     *
     * 表示几何体中变形目标的字典。键是变形目标的名称，值是其属性索引。
     * 默认情况下此成员为undefined，只有在几何体中检测到变形目标时才会设置。
     * 变形目标用于实现顶点动画和形状插值。
     *
     * @type {Object<String,number>|undefined}
     * @default undefined
     */
    this.morphTargetDictionary = undefined;

    /**
     * 变形目标影响权重数组
     *
     * 通常在[0,1]范围内的权重数组，指定应用多少变形。
     * 默认情况下此成员为undefined，只有在几何体中检测到变形目标时才会设置。
     * 每个权重对应一个变形目标，控制该变形目标对最终形状的影响程度。
     *
     * @type {Array<number>|undefined}
     * @default undefined
     */
    this.morphTargetInfluences = undefined;

    // 更新变形目标，初始化变形目标相关的属性
    this.updateMorphTargets();
  }

  /**
   * 复制另一个线条对象的属性到当前对象
   *
   * @param {Line} source - 要复制的源线条对象
   * @param {boolean} recursive - 是否递归复制子对象
   * @return {Line} 返回当前线条对象的引用，支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的复制方法，复制基础的Object3D属性
    super.copy(source, recursive);

    // 复制材质，如果源材质是数组则创建新数组，否则直接引用
    this.material = Array.isArray(source.material) ? source.material.slice() : source.material;
    // 复制几何体引用
    this.geometry = source.geometry;

    // 返回当前对象，支持链式调用
    return this;
  }

  /**
   * 计算渲染虚线所需的距离值数组
   *
   * 对于几何体中的每个顶点，该方法计算从当前点到线条起始点的累积长度。
   * 这些距离值用于虚线材质的渲染，确定虚线模式在线条上的分布。
   *
   * @return {Line} 返回当前线条对象的引用，支持链式调用
   */
  computeLineDistances() {
    // 获取线条的几何体
    const geometry = this.geometry;

    // 我们假设这是非索引几何体（顶点按顺序连接）

    // 检查几何体是否为非索引类型
    if (geometry.index === null) {
      // 获取位置属性，包含所有顶点的坐标
      const positionAttribute = geometry.attributes.position;
      // 初始化距离数组，第一个点的距离为0
      const lineDistances = [0];

      // 遍历所有顶点，计算累积距离
      for (let i = 1, l = positionAttribute.count; i < l; i++) {
        // 从缓冲属性中获取前一个顶点位置
        _vStart.fromBufferAttribute(positionAttribute, i - 1);
        // 从缓冲属性中获取当前顶点位置
        _vEnd.fromBufferAttribute(positionAttribute, i);

        // 继承前一个点的累积距离
        lineDistances[i] = lineDistances[i - 1];
        // 加上当前线段的长度
        lineDistances[i] += _vStart.distanceTo(_vEnd);
      }

      // 将计算出的距离数组设置为几何体的属性
      geometry.setAttribute("lineDistance", new Float32BufferAttribute(lineDistances, 1));
    } else {
      // 对于索引几何体，输出警告信息
      console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");
    }

    // 返回当前对象，支持链式调用
    return this;
  }

  /**
   * 计算投射射线与此线条的交点
   *
   * 该方法用于射线投射检测，确定射线是否与线条相交，
   * 并将交点信息添加到结果数组中。
   *
   * @param {Raycaster} raycaster - 射线投射器对象
   * @param {Array<Object>} intersects - 存储交点信息的目标数组
   */
  raycast(raycaster, intersects) {
    // 获取线条的几何体
    const geometry = this.geometry;
    // 获取线条的世界变换矩阵
    const matrixWorld = this.matrixWorld;
    // 获取射线检测的阈值距离
    const threshold = raycaster.params.Line.threshold;
    // 获取几何体的绘制范围
    const drawRange = geometry.drawRange;

    // 检查边界球与射线的距离

    // 如果边界球未计算，则先计算边界球
    if (geometry.boundingSphere === null) geometry.computeBoundingSphere();

    // 复制几何体的边界球
    _sphere.copy(geometry.boundingSphere);
    // 将边界球变换到世界坐标系
    _sphere.applyMatrix4(matrixWorld);
    // 扩大边界球半径，加入阈值距离
    _sphere.radius += threshold;

    // 如果射线不与扩大后的边界球相交，则直接返回
    if (raycaster.ray.intersectsSphere(_sphere) === false) return;

    // 准备进行详细的射线-线条交点检测

    // 计算世界变换矩阵的逆矩阵
    _inverseMatrix.copy(matrixWorld).invert();
    // 将射线变换到线条的本地坐标系
    _ray.copy(raycaster.ray).applyMatrix4(_inverseMatrix);

    // 计算本地坐标系下的阈值，考虑对象的缩放
    const localThreshold = threshold / ((this.scale.x + this.scale.y + this.scale.z) / 3);
    // 计算阈值的平方，用于距离比较（避免开方运算）
    const localThresholdSq = localThreshold * localThreshold;

    // 确定遍历步长：线段模式每次跳过2个顶点，连续线条每次跳过1个顶点
    const step = this.isLineSegments ? 2 : 1;

    // 获取几何体的索引数组
    const index = geometry.index;
    // 获取几何体的所有属性
    const attributes = geometry.attributes;
    // 获取位置属性
    const positionAttribute = attributes.position;

    // 处理索引几何体的情况
    if (index !== null) {
      // 计算遍历的起始位置，不能小于0
      const start = Math.max(0, drawRange.start);
      // 计算遍历的结束位置，不能超过索引数量
      const end = Math.min(index.count, drawRange.start + drawRange.count);

      // 遍历所有线段，检查射线交点
      for (let i = start, l = end - 1; i < l; i += step) {
        // 获取线段的第一个顶点索引
        const a = index.getX(i);
        // 获取线段的第二个顶点索引
        const b = index.getX(i + 1);

        // 检查射线与当前线段的交点
        const intersect = checkIntersection(this, raycaster, _ray, localThresholdSq, a, b, i);

        // 如果有交点，添加到结果数组
        if (intersect) {
          intersects.push(intersect);
        }
      }

      // 如果是闭合线条，检查最后一个顶点与第一个顶点的连线
      if (this.isLineLoop) {
        // 获取最后一个顶点索引
        const a = index.getX(end - 1);
        // 获取第一个顶点索引
        const b = index.getX(start);

        // 检查闭合线段的交点
        const intersect = checkIntersection(this, raycaster, _ray, localThresholdSq, a, b, end - 1);

        // 如果有交点，添加到结果数组
        if (intersect) {
          intersects.push(intersect);
        }
      }
    } else {
      // 处理非索引几何体的情况
      // 计算遍历的起始位置，不能小于0
      const start = Math.max(0, drawRange.start);
      // 计算遍历的结束位置，不能超过顶点数量
      const end = Math.min(positionAttribute.count, drawRange.start + drawRange.count);

      // 遍历所有线段，检查射线交点
      for (let i = start, l = end - 1; i < l; i += step) {
        // 检查射线与当前线段的交点（直接使用顶点索引）
        const intersect = checkIntersection(this, raycaster, _ray, localThresholdSq, i, i + 1, i);

        // 如果有交点，添加到结果数组
        if (intersect) {
          intersects.push(intersect);
        }
      }

      // 如果是闭合线条，检查最后一个顶点与第一个顶点的连线
      if (this.isLineLoop) {
        // 检查闭合线段的交点
        const intersect = checkIntersection(this, raycaster, _ray, localThresholdSq, end - 1, start, end - 1);

        // 如果有交点，添加到结果数组
        if (intersect) {
          intersects.push(intersect);
        }
      }
    }
  }

  /**
   * 更新变形目标
   *
   * 设置morphTargetDictionary和morphTargetInfluences的值，
   * 确保现有的变形目标能够影响这个3D对象。
   */
  updateMorphTargets() {
    // 获取线条的几何体
    const geometry = this.geometry;

    // 获取几何体的变形属性
    const morphAttributes = geometry.morphAttributes;
    // 获取所有变形属性的键名
    const keys = Object.keys(morphAttributes);

    // 如果存在变形属性
    if (keys.length > 0) {
      // 获取第一个变形属性（通常是position）
      const morphAttribute = morphAttributes[keys[0]];

      // 如果变形属性存在
      if (morphAttribute !== undefined) {
        // 初始化变形目标影响权重数组
        this.morphTargetInfluences = [];
        // 初始化变形目标字典
        this.morphTargetDictionary = {};

        // 遍历所有变形目标
        for (let m = 0, ml = morphAttribute.length; m < ml; m++) {
          // 获取变形目标的名称，如果没有名称则使用索引
          const name = morphAttribute[m].name || String(m);

          // 添加初始权重值0
          this.morphTargetInfluences.push(0);
          // 在字典中记录名称到索引的映射
          this.morphTargetDictionary[name] = m;
        }
      }
    }
  }
}

/**
 * 检查射线与线段的交点
 *
 * 这是一个辅助函数，用于计算射线与特定线段的交点信息。
 *
 * @param {Line} object - 线条对象
 * @param {Raycaster} raycaster - 射线投射器
 * @param {Ray} ray - 变换到本地坐标系的射线
 * @param {number} thresholdSq - 阈值距离的平方
 * @param {number} a - 线段第一个顶点的索引
 * @param {number} b - 线段第二个顶点的索引
 * @param {number} i - 线段在几何体中的索引
 * @return {Object|undefined} 交点信息对象，如果没有交点则返回undefined
 */
function checkIntersection(object, raycaster, ray, thresholdSq, a, b, i) {
  // 获取对象几何体的位置属性
  const positionAttribute = object.geometry.attributes.position;

  // 从缓冲属性中获取线段起始点
  _vStart.fromBufferAttribute(positionAttribute, a);
  // 从缓冲属性中获取线段结束点
  _vEnd.fromBufferAttribute(positionAttribute, b);

  // 计算射线到线段的最短距离的平方
  const distSq = ray.distanceSqToSegment(_vStart, _vEnd, _intersectPointOnRay, _intersectPointOnSegment);

  // 如果距离超过阈值，则没有交点
  if (distSq > thresholdSq) return;

  // 将射线上的交点变换回世界坐标系，用于距离计算
  _intersectPointOnRay.applyMatrix4(object.matrixWorld);

  // 计算从射线起点到交点的距离
  const distance = raycaster.ray.origin.distanceTo(_intersectPointOnRay);

  // 检查距离是否在射线投射器的有效范围内
  if (distance < raycaster.near || distance > raycaster.far) return;

  // 返回交点信息对象
  return {
    distance: distance, // 从射线起点到交点的距离
    // 我们想要什么？射线上的交点还是线段上的交点？
    // point: raycaster.ray.at( distance ), // 射线上的交点
    point: _intersectPointOnSegment.clone().applyMatrix4(object.matrixWorld), // 线段上的交点（世界坐标）
    index: i, // 线段索引
    face: null, // 面信息（线条没有面）
    faceIndex: null, // 面索引（线条没有面）
    barycoord: null, // 重心坐标（线条不适用）
    object: object, // 相交的对象
  };
}

// 导出Line类供其他模块使用
export { Line };
