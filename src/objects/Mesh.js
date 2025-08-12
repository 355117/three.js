// 导入三维向量类，用于位置、法线等计算
import { Vector3 } from "../math/Vector3.js";
// 导入二维向量类，用于UV坐标计算
import { Vector2 } from "../math/Vector2.js";
// 导入球体类，用于包围球计算和射线检测优化
import { Sphere } from "../math/Sphere.js";
// 导入射线类，用于射线投射和交点检测
import { Ray } from "../math/Ray.js";
// 导入4x4矩阵类，用于坐标变换
import { Matrix4 } from "../math/Matrix4.js";
// 导入3D对象基类
import { Object3D } from "../core/Object3D.js";
// 导入三角形类，用于三角形相关计算
import { Triangle } from "../math/Triangle.js";
// 导入材质面向常量，用于确定三角形的正反面
import { BackSide, FrontSide } from "../constants.js";
// 导入基础网格材质类，作为默认材质
import { MeshBasicMaterial } from "../materials/MeshBasicMaterial.js";
// 导入缓冲几何体类，作为默认几何体
import { BufferGeometry } from "../core/BufferGeometry.js";

// 用于射线检测的逆矩阵（将世界坐标转换为本地坐标）
const _inverseMatrix = /*@__PURE__*/ new Matrix4();
// 用于射线检测的射线对象（本地坐标系）
const _ray = /*@__PURE__*/ new Ray();
// 用于包围球检测的球体对象
const _sphere = /*@__PURE__*/ new Sphere();
// 射线与包围球的交点
const _sphereHitAt = /*@__PURE__*/ new Vector3();

// 三角形的三个顶点（用于射线-三角形交点检测）
const _vA = /*@__PURE__*/ new Vector3();
const _vB = /*@__PURE__*/ new Vector3();
const _vC = /*@__PURE__*/ new Vector3();

// 用于变形目标计算的临时向量
const _tempA = /*@__PURE__*/ new Vector3();
// 用于存储变形目标的累积偏移
const _morphA = /*@__PURE__*/ new Vector3();

// 射线与三角形的交点（本地坐标系）
const _intersectionPoint = /*@__PURE__*/ new Vector3();
// 射线与三角形的交点（世界坐标系）
const _intersectionPointWorld = /*@__PURE__*/ new Vector3();

/**
 * 表示基于三角形多边形的网格对象类
 * 网格是Three.js中最常用的3D对象类型，由几何体和材质组成，用于渲染3D模型。
 *
 * 使用示例：
 * ```js
 * const geometry = new THREE.BoxGeometry( 1, 1, 1 );
 * const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
 * const mesh = new THREE.Mesh( geometry, material );
 * scene.add( mesh );
 * ```
 *
 * @augments Object3D
 */
class Mesh extends Object3D {
  /**
   * 构造一个新的网格对象
   *
   * @param {BufferGeometry} [geometry] - 网格的几何体，定义形状和顶点数据
   * @param {Material|Array<Material>} [material] - 网格的材质，定义外观和渲染属性
   */
  constructor(geometry = new BufferGeometry(), material = new MeshBasicMaterial()) {
    // 调用父类构造函数
    super();

    /**
     * 用于类型检测的标志
     * 可以通过此属性判断对象是否为网格对象
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMesh = true;

    /**
     * 对象类型标识
     * 用于序列化和调试时识别对象类型
     *
     * @type {string}
     */
    this.type = "Mesh";

    /**
     * 网格的几何体
     * 包含顶点位置、法线、UV坐标等几何数据
     *
     * @type {BufferGeometry}
     */
    this.geometry = geometry;

    /**
     * 网格的材质
     * 可以是单个材质或材质数组（用于多材质网格）
     *
     * @type {Material|Array<Material>}
     * @default MeshBasicMaterial
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

    /**
     * 此网格的实例数量
     * 仅可与WebGPU渲染器一起使用，用于实例化渲染
     *
     * @type {number}
     * @default 1
     */
    this.count = 1;

    // 更新变形目标设置
    this.updateMorphTargets();
  }

  /**
   * 复制另一个网格对象的属性
   * 包括几何体、材质、变形目标等所有相关属性
   *
   * @param {Mesh} source - 要复制的源网格对象
   * @param {boolean} recursive - 是否递归复制子对象
   * @return {Mesh} 返回当前网格对象，支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的copy方法
    super.copy(source, recursive);

    // 复制变形目标影响权重数组
    if (source.morphTargetInfluences !== undefined) {
      this.morphTargetInfluences = source.morphTargetInfluences.slice();
    }

    // 复制变形目标字典
    if (source.morphTargetDictionary !== undefined) {
      this.morphTargetDictionary = Object.assign({}, source.morphTargetDictionary);
    }

    // 复制材质（如果是数组则复制数组，否则直接赋值）
    this.material = Array.isArray(source.material) ? source.material.slice() : source.material;
    // 复制几何体引用
    this.geometry = source.geometry;

    return this;
  }

  /**
   * 更新变形目标设置
   * 设置morphTargetDictionary和morphTargetInfluences的值，
   * 确保现有的变形目标能够影响此3D对象。
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

  /**
   * 获取指定索引顶点的本地空间位置
   * 考虑变形目标和骨骼动画的当前动画状态
   *
   * @param {number} index - 顶点索引
   * @param {Vector3} target - 用于存储方法结果的目标向量对象
   * @return {Vector3} 本地空间中的顶点位置
   */
  getVertexPosition(index, target) {
    // 获取几何体引用
    const geometry = this.geometry;
    // 获取位置属性
    const position = geometry.attributes.position;
    // 获取变形位置属性
    const morphPosition = geometry.morphAttributes.position;
    // 获取变形目标是否为相对模式
    const morphTargetsRelative = geometry.morphTargetsRelative;

    // 从位置属性中获取基础顶点位置
    target.fromBufferAttribute(position, index);

    // 获取变形目标影响权重
    const morphInfluences = this.morphTargetInfluences;

    // 如果存在变形位置和影响权重
    if (morphPosition && morphInfluences) {
      // 重置变形累积向量
      _morphA.set(0, 0, 0);

      // 遍历所有变形目标
      for (let i = 0, il = morphPosition.length; i < il; i++) {
        // 获取当前变形目标的影响权重
        const influence = morphInfluences[i];
        // 获取当前变形目标的属性
        const morphAttribute = morphPosition[i];

        // 如果影响权重为0，跳过此变形目标
        if (influence === 0) continue;

        // 从变形属性中获取顶点位置
        _tempA.fromBufferAttribute(morphAttribute, index);

        // 根据变形目标模式应用变形
        if (morphTargetsRelative) {
          // 相对模式：直接添加变形偏移
          _morphA.addScaledVector(_tempA, influence);
        } else {
          // 绝对模式：添加与基础位置的差值
          _morphA.addScaledVector(_tempA.sub(target), influence);
        }
      }

      // 将累积的变形偏移添加到目标位置
      target.add(_morphA);
    }

    return target;
  }

  /**
   * 计算射线与此网格的交点
   * 使用多层优化策略：包围球检测 -> 包围盒检测 -> 精确几何体检测
   *
   * @param {Raycaster} raycaster - 射线投射器
   * @param {Array<Object>} intersects - 存储交点信息的目标数组
   */
  raycast(raycaster, intersects) {
    // 获取几何体、材质和世界变换矩阵
    const geometry = this.geometry;
    const material = this.material;
    const matrixWorld = this.matrixWorld;

    // 如果没有材质，直接返回
    if (material === undefined) return;

    // 第一步：在世界空间中进行包围球测试

    // 如果包围球未计算，先计算包围球
    if (geometry.boundingSphere === null) geometry.computeBoundingSphere();

    // 将包围球转换到世界空间
    _sphere.copy(geometry.boundingSphere);
    _sphere.applyMatrix4(matrixWorld);

    // 检查射线起点到包围球的距离

    // 根据近裁剪面调整射线起点
    _ray.copy(raycaster.ray).recast(raycaster.near);

    // 如果射线起点不在包围球内
    if (_sphere.containsPoint(_ray.origin) === false) {
      // 检查射线是否与包围球相交
      if (_ray.intersectSphere(_sphere, _sphereHitAt) === null) return;

      // 检查交点是否在远裁剪面范围内
      if (_ray.origin.distanceToSquared(_sphereHitAt) > (raycaster.far - raycaster.near) ** 2) return;
    }

    // 第二步：将射线转换到网格的本地空间

    // 计算世界变换矩阵的逆矩阵
    _inverseMatrix.copy(matrixWorld).invert();
    // 将射线转换到本地空间
    _ray.copy(raycaster.ray).applyMatrix4(_inverseMatrix);

    // 第三步：在本地空间中进行包围盒测试

    if (geometry.boundingBox !== null) {
      // 如果射线不与包围盒相交，直接返回
      if (_ray.intersectsBox(geometry.boundingBox) === false) return;
    }

    // 第四步：进行精确的几何体交点测试

    this._computeIntersections(raycaster, intersects, _ray);
  }

  /**
   * 计算射线与几何体的精确交点
   * 处理索引和非索引几何体，支持多材质网格
   *
   * @private
   * @param {Raycaster} raycaster - 射线投射器
   * @param {Array<Object>} intersects - 存储交点信息的数组
   * @param {Ray} rayLocalSpace - 本地空间中的射线
   */
  _computeIntersections(raycaster, intersects, rayLocalSpace) {
    let intersection;

    // 获取几何体和材质引用
    const geometry = this.geometry;
    const material = this.material;

    // 获取几何体的各种属性
    const index = geometry.index; // 索引数组
    const position = geometry.attributes.position; // 顶点位置
    const uv = geometry.attributes.uv; // UV坐标
    const uv1 = geometry.attributes.uv1; // 第二套UV坐标
    const normal = geometry.attributes.normal; // 顶点法线
    const groups = geometry.groups; // 材质组
    const drawRange = geometry.drawRange; // 绘制范围

    if (index !== null) {
      // 处理索引缓冲几何体

      if (Array.isArray(material)) {
        // 多材质情况：遍历每个材质组
        for (let i = 0, il = groups.length; i < il; i++) {
          const group = groups[i];
          const groupMaterial = material[group.materialIndex];

          // 计算当前组的有效绘制范围
          const start = Math.max(group.start, drawRange.start);
          const end = Math.min(index.count, Math.min(group.start + group.count, drawRange.start + drawRange.count));

          // 遍历当前组的所有三角形（每3个索引为一个三角形）
          for (let j = start, jl = end; j < jl; j += 3) {
            // 获取三角形的三个顶点索引
            const a = index.getX(j);
            const b = index.getX(j + 1);
            const c = index.getX(j + 2);

            // 检查射线与三角形的交点
            intersection = checkGeometryIntersection(this, groupMaterial, raycaster, rayLocalSpace, uv, uv1, normal, a, b, c);

            if (intersection) {
              // 设置面索引（在索引缓冲语义中的三角形编号）
              intersection.faceIndex = Math.floor(j / 3);
              // 设置材质索引
              intersection.face.materialIndex = group.materialIndex;
              // 添加到交点数组
              intersects.push(intersection);
            }
          }
        }
      } else {
        // 单材质情况
        const start = Math.max(0, drawRange.start);
        const end = Math.min(index.count, drawRange.start + drawRange.count);

        // 遍历所有三角形
        for (let i = start, il = end; i < il; i += 3) {
          // 获取三角形的三个顶点索引
          const a = index.getX(i);
          const b = index.getX(i + 1);
          const c = index.getX(i + 2);

          // 检查射线与三角形的交点
          intersection = checkGeometryIntersection(this, material, raycaster, rayLocalSpace, uv, uv1, normal, a, b, c);

          if (intersection) {
            // 设置面索引
            intersection.faceIndex = Math.floor(i / 3);
            // 添加到交点数组
            intersects.push(intersection);
          }
        }
      }
    } else if (position !== undefined) {
      // 处理非索引缓冲几何体

      if (Array.isArray(material)) {
        // 多材质情况：遍历每个材质组
        for (let i = 0, il = groups.length; i < il; i++) {
          const group = groups[i];
          const groupMaterial = material[group.materialIndex];

          // 计算当前组的有效绘制范围
          const start = Math.max(group.start, drawRange.start);
          const end = Math.min(position.count, Math.min(group.start + group.count, drawRange.start + drawRange.count));

          // 遍历当前组的所有三角形（每3个顶点为一个三角形）
          for (let j = start, jl = end; j < jl; j += 3) {
            // 对于非索引几何体，顶点索引就是位置索引
            const a = j;
            const b = j + 1;
            const c = j + 2;

            // 检查射线与三角形的交点
            intersection = checkGeometryIntersection(this, groupMaterial, raycaster, rayLocalSpace, uv, uv1, normal, a, b, c);

            if (intersection) {
              // 设置面索引（在非索引缓冲语义中的三角形编号）
              intersection.faceIndex = Math.floor(j / 3);
              // 设置材质索引
              intersection.face.materialIndex = group.materialIndex;
              // 添加到交点数组
              intersects.push(intersection);
            }
          }
        }
      } else {
        // 单材质情况
        const start = Math.max(0, drawRange.start);
        const end = Math.min(position.count, drawRange.start + drawRange.count);

        // 遍历所有三角形
        for (let i = start, il = end; i < il; i += 3) {
          // 对于非索引几何体，顶点索引就是位置索引
          const a = i;
          const b = i + 1;
          const c = i + 2;

          // 检查射线与三角形的交点
          intersection = checkGeometryIntersection(this, material, raycaster, rayLocalSpace, uv, uv1, normal, a, b, c);

          if (intersection) {
            // 设置面索引（在非索引缓冲语义中的三角形编号）
            intersection.faceIndex = Math.floor(i / 3);
            // 添加到交点数组
            intersects.push(intersection);
          }
        }
      }
    }
  }
}

/**
 * 检查射线与三角形的交点
 * 根据材质的面向设置处理正反面，并验证交点是否在有效距离范围内
 *
 * @param {Object3D} object - 3D对象
 * @param {Material} material - 材质对象
 * @param {Raycaster} raycaster - 射线投射器
 * @param {Ray} ray - 射线对象
 * @param {Vector3} pA - 三角形顶点A
 * @param {Vector3} pB - 三角形顶点B
 * @param {Vector3} pC - 三角形顶点C
 * @param {Vector3} point - 用于存储交点的向量
 * @return {Object|null} 交点信息对象，如果没有交点则返回null
 */
function checkIntersection(object, material, raycaster, ray, pA, pB, pC, point) {
  let intersect;

  // 根据材质的面向设置选择三角形顶点顺序
  if (material.side === BackSide) {
    // 背面材质：反转顶点顺序，启用背面剔除
    intersect = ray.intersectTriangle(pC, pB, pA, true, point);
  } else {
    // 正面或双面材质：使用正常顶点顺序
    intersect = ray.intersectTriangle(pA, pB, pC, material.side === FrontSide, point);
  }

  // 如果没有交点，返回null
  if (intersect === null) return null;

  // 将交点从本地空间转换到世界空间
  _intersectionPointWorld.copy(point);
  _intersectionPointWorld.applyMatrix4(object.matrixWorld);

  // 计算射线起点到交点的距离
  const distance = raycaster.ray.origin.distanceTo(_intersectionPointWorld);

  // 检查距离是否在有效范围内（近裁剪面到远裁剪面）
  if (distance < raycaster.near || distance > raycaster.far) return null;

  // 返回交点信息
  return {
    distance: distance, // 距离
    point: _intersectionPointWorld.clone(), // 世界空间中的交点位置
    object: object, // 相交的对象
  };
}

/**
 * 检查射线与几何体三角形的交点，并计算详细的交点信息
 * 包括UV坐标、法线、重心坐标等属性的插值计算
 *
 * @param {Mesh} object - 网格对象
 * @param {Material} material - 材质对象
 * @param {Raycaster} raycaster - 射线投射器
 * @param {Ray} ray - 射线对象
 * @param {BufferAttribute} uv - UV坐标属性
 * @param {BufferAttribute} uv1 - 第二套UV坐标属性
 * @param {BufferAttribute} normal - 法线属性
 * @param {number} a - 三角形顶点A的索引
 * @param {number} b - 三角形顶点B的索引
 * @param {number} c - 三角形顶点C的索引
 * @return {Object|null} 详细的交点信息对象，如果没有交点则返回null
 */
function checkGeometryIntersection(object, material, raycaster, ray, uv, uv1, normal, a, b, c) {
  // 获取三角形三个顶点的位置（考虑变形目标）
  object.getVertexPosition(a, _vA);
  object.getVertexPosition(b, _vB);
  object.getVertexPosition(c, _vC);

  // 检查射线与三角形的基础交点
  const intersection = checkIntersection(object, material, raycaster, ray, _vA, _vB, _vC, _intersectionPoint);

  if (intersection) {
    // 计算交点的重心坐标
    const barycoord = new Vector3();
    Triangle.getBarycoord(_intersectionPoint, _vA, _vB, _vC, barycoord);

    // 如果存在UV坐标属性，插值计算交点的UV坐标
    if (uv) {
      intersection.uv = Triangle.getInterpolatedAttribute(uv, a, b, c, barycoord, new Vector2());
    }

    // 如果存在第二套UV坐标属性，插值计算交点的第二套UV坐标
    if (uv1) {
      intersection.uv1 = Triangle.getInterpolatedAttribute(uv1, a, b, c, barycoord, new Vector2());
    }

    // 如果存在法线属性，插值计算交点的法线
    if (normal) {
      intersection.normal = Triangle.getInterpolatedAttribute(normal, a, b, c, barycoord, new Vector3());

      // 如果插值法线与射线方向同向，翻转法线方向
      // 确保法线始终指向射线来源方向
      if (intersection.normal.dot(ray.direction) > 0) {
        intersection.normal.multiplyScalar(-1);
      }
    }

    // 创建面信息对象
    const face = {
      a: a, // 顶点A索引
      b: b, // 顶点B索引
      c: c, // 顶点C索引
      normal: new Vector3(), // 面法线
      materialIndex: 0, // 材质索引
    };

    // 计算三角形面的法线
    Triangle.getNormal(_vA, _vB, _vC, face.normal);

    // 将面信息和重心坐标添加到交点对象
    intersection.face = face;
    intersection.barycoord = barycoord;
  }

  return intersection;
}

// 导出网格类
export { Mesh };
