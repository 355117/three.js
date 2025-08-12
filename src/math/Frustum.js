// 导入坐标系统常量，用于处理不同的图形API坐标系
import { WebGLCoordinateSystem, WebGPUCoordinateSystem } from "../constants.js";
// 导入2D向量类，用于精灵中心点计算
import { Vector2 } from "./Vector2.js";
// 导入3D向量类，用于空间计算
import { Vector3 } from "./Vector3.js";
// 导入球体类，用于包围球相交检测
import { Sphere } from "./Sphere.js";
// 导入平面类，用于构建视锥体的六个平面
import { Plane } from "./Plane.js";

// 临时球体，用于相交检测计算
const _sphere = /*@__PURE__*/ new Sphere();
// 默认精灵中心点（0.5, 0.5）
const _defaultSpriteCenter = /*@__PURE__*/ new Vector2(0.5, 0.5);
// 临时向量，用于各种计算
const _vector = /*@__PURE__*/ new Vector3();

/**
 * 视锥体用于确定摄像机视野内的内容。
 * 它们有助于加速渲染过程 - 位于摄像机视锥体外的对象可以安全地从渲染中排除。
 * Frustums are used to determine what is inside the camera's field of view.
 * They help speed up the rendering process - objects which lie outside a camera's
 * frustum can safely be excluded from rendering.
 *
 * 此类主要供渲染器内部使用。
 * This class is mainly intended for use internally by a renderer.
 */
class Frustum {
  /**
   * 构造一个新的视锥体
   * Constructs a new frustum.
   *
   * @param {Plane} [p0] - 包围视锥体的第一个平面（通常是右平面） The first plane that encloses the frustum.
   * @param {Plane} [p1] - 包围视锥体的第二个平面（通常是左平面） The second plane that encloses the frustum.
   * @param {Plane} [p2] - 包围视锥体的第三个平面（通常是下平面） The third plane that encloses the frustum.
   * @param {Plane} [p3] - 包围视锥体的第四个平面（通常是上平面） The fourth plane that encloses the frustum.
   * @param {Plane} [p4] - 包围视锥体的第五个平面（通常是远平面） The fifth plane that encloses the frustum.
   * @param {Plane} [p5] - 包围视锥体的第六个平面（通常是近平面） The sixth plane that encloses the frustum.
   */
  constructor(p0 = new Plane(), p1 = new Plane(), p2 = new Plane(), p3 = new Plane(), p4 = new Plane(), p5 = new Plane()) {
    /**
     * 此数组保存包围视锥体的平面
     * 顺序通常为：[右, 左, 下, 上, 远, 近]
     * This array holds the planes that enclose the frustum.
     *
     * @type {Array<Plane>}
     */
    this.planes = [p0, p1, p2, p3, p4, p5];
  }

  /**
   * 通过复制给定平面来设置视锥体平面
   * Sets the frustum planes by copying the given planes.
   *
   * @param {Plane} [p0] - 包围视锥体的第一个平面（通常是右平面） The first plane that encloses the frustum.
   * @param {Plane} [p1] - 包围视锥体的第二个平面（通常是左平面） The second plane that encloses the frustum.
   * @param {Plane} [p2] - 包围视锥体的第三个平面（通常是下平面） The third plane that encloses the frustum.
   * @param {Plane} [p3] - 包围视锥体的第四个平面（通常是上平面） The fourth plane that encloses the frustum.
   * @param {Plane} [p4] - 包围视锥体的第五个平面（通常是远平面） The fifth plane that encloses the frustum.
   * @param {Plane} [p5] - 包围视锥体的第六个平面（通常是近平面） The sixth plane that encloses the frustum.
   * @return {Frustum} 对此视锥体的引用 A reference to this frustum.
   */
  set(p0, p1, p2, p3, p4, p5) {
    // 获取平面数组的引用
    const planes = this.planes;

    // 复制每个平面到对应位置
    planes[0].copy(p0); // 右平面
    planes[1].copy(p1); // 左平面
    planes[2].copy(p2); // 下平面
    planes[3].copy(p3); // 上平面
    planes[4].copy(p4); // 远平面
    planes[5].copy(p5); // 近平面

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将给定视锥体的值复制到此实例
   * Copies the values of the given frustum to this instance.
   *
   * @param {Frustum} frustum - 要复制的视锥体 The frustum to copy.
   * @return {Frustum} 对此视锥体的引用 A reference to this frustum.
   */
  copy(frustum) {
    // 获取平面数组的引用
    const planes = this.planes;

    // 复制所有六个平面
    for (let i = 0; i < 6; i++) {
      planes[i].copy(frustum.planes[i]);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 从给定的投影矩阵设置视锥体平面
   * Sets the frustum planes from the given projection matrix.
   *
   * @param {Matrix4} m - 投影矩阵 The projection matrix.
   * @param {(WebGLCoordinateSystem|WebGPUCoordinateSystem)} coordinateSystem - 坐标系统 The coordinate system.
   * @param {boolean} [reversedDepth=false] - 是否使用反向深度 Whether to use a reversed depth.
   * @return {Frustum} 对此视锥体的引用 A reference to this frustum.
   */
  setFromProjectionMatrix(m, coordinateSystem = WebGLCoordinateSystem, reversedDepth = false) {
    // 获取平面数组和矩阵元素的引用
    const planes = this.planes;
    const me = m.elements;

    // 提取矩阵元素以便后续计算
    // 矩阵按列主序存储：[m00, m10, m20, m30, m01, m11, m21, m31, ...]
    const me0 = me[0],
      me1 = me[1],
      me2 = me[2],
      me3 = me[3]; // 第一列
    const me4 = me[4],
      me5 = me[5],
      me6 = me[6],
      me7 = me[7]; // 第二列
    const me8 = me[8],
      me9 = me[9],
      me10 = me[10],
      me11 = me[11]; // 第三列
    const me12 = me[12],
      me13 = me[13],
      me14 = me[14],
      me15 = me[15]; // 第四列

    // 从投影矩阵提取视锥体平面
    // 使用Gribb-Hartmann方法从投影矩阵中提取平面方程

    // 右平面：第四行 - 第一行
    planes[0].setComponents(me3 - me0, me7 - me4, me11 - me8, me15 - me12).normalize();
    // 左平面：第四行 + 第一行
    planes[1].setComponents(me3 + me0, me7 + me4, me11 + me8, me15 + me12).normalize();
    // 下平面：第四行 + 第二行
    planes[2].setComponents(me3 + me1, me7 + me5, me11 + me9, me15 + me13).normalize();
    // 上平面：第四行 - 第二行
    planes[3].setComponents(me3 - me1, me7 - me5, me11 - me9, me15 - me13).normalize();

    // 处理深度平面的设置，根据是否使用反向深度
    if (reversedDepth) {
      // 反向深度：远平面和近平面的计算方式不同
      planes[4].setComponents(me2, me6, me10, me14).normalize(); // 远平面：第三行
      planes[5].setComponents(me3 - me2, me7 - me6, me11 - me10, me15 - me14).normalize(); // 近平面：第四行 - 第三行
    } else {
      // 正常深度：标准的平面提取
      planes[4].setComponents(me3 - me2, me7 - me6, me11 - me10, me15 - me14).normalize(); // 远平面：第四行 - 第三行

      // 根据坐标系统设置近平面
      if (coordinateSystem === WebGLCoordinateSystem) {
        // WebGL坐标系：近平面 = 第四行 + 第三行
        planes[5].setComponents(me3 + me2, me7 + me6, me11 + me10, me15 + me14).normalize(); // 近平面
      } else if (coordinateSystem === WebGPUCoordinateSystem) {
        // WebGPU坐标系：近平面 = 第三行
        planes[5].setComponents(me2, me6, me10, me14).normalize(); // 近平面
      } else {
        // 不支持的坐标系统
        throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: " + coordinateSystem);
      }
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 如果3D对象的包围球与此视锥体相交，则返回true
   * Returns `true` if the 3D object's bounding sphere is intersecting this frustum.
   *
   * 注意，3D对象必须有几何体，以便可以计算包围球
   * Note that the 3D object must have a geometry so that the bounding sphere can be calculated.
   *
   * @param {Object3D} object - 要测试的3D对象 The 3D object to test.
   * @return {boolean} 3D对象的包围球是否与此视锥体相交 Whether the 3D object's bounding sphere is intersecting this frustum or not.
   */
  intersectsObject(object) {
    // 检查对象是否有预计算的包围球
    if (object.boundingSphere !== undefined) {
      // 如果包围球为空，计算包围球
      if (object.boundingSphere === null) object.computeBoundingSphere();

      // 复制包围球并应用对象的世界变换矩阵
      _sphere.copy(object.boundingSphere).applyMatrix4(object.matrixWorld);
    } else {
      // 如果对象没有包围球，从几何体获取
      const geometry = object.geometry;

      // 如果几何体的包围球为空，计算包围球
      if (geometry.boundingSphere === null) geometry.computeBoundingSphere();

      // 复制几何体的包围球并应用对象的世界变换矩阵
      _sphere.copy(geometry.boundingSphere).applyMatrix4(object.matrixWorld);
    }

    // 使用球体相交检测
    return this.intersectsSphere(_sphere);
  }

  /**
   * 如果给定精灵与此视锥体相交，则返回true
   * Returns `true` if the given sprite is intersecting this frustum.
   *
   * @param {Sprite} sprite - 要测试的精灵 The sprite to test.
   * @return {boolean} 精灵是否与此视锥体相交 Whether the sprite is intersecting this frustum or not.
   */
  intersectsSprite(sprite) {
    // 设置球体中心为原点
    _sphere.center.set(0, 0, 0);

    // 计算精灵中心与默认中心的偏移距离
    const offset = _defaultSpriteCenter.distanceTo(sprite.center);

    // 设置球体半径：√2/2 + 偏移量（√2/2 ≈ 0.7071067811865476）
    // 这个值确保覆盖精灵的对角线距离
    _sphere.radius = 0.7071067811865476 + offset;
    // 应用精灵的世界变换矩阵
    _sphere.applyMatrix4(sprite.matrixWorld);

    // 使用球体相交检测
    return this.intersectsSphere(_sphere);
  }

  /**
   * 如果给定包围球与此视锥体相交，则返回true
   * Returns `true` if the given bounding sphere is intersecting this frustum.
   *
   * @param {Sphere} sphere - 要测试的包围球 The bounding sphere to test.
   * @return {boolean} 包围球是否与此视锥体相交 Whether the bounding sphere is intersecting this frustum or not.
   */
  intersectsSphere(sphere) {
    // 获取视锥体的平面数组
    const planes = this.planes;
    // 获取球心位置
    const center = sphere.center;
    // 计算负半径（用于优化比较）
    const negRadius = -sphere.radius;

    // 检查球体是否与所有六个平面相交
    for (let i = 0; i < 6; i++) {
      // 计算球心到平面的距离
      const distance = planes[i].distanceToPoint(center);

      // 如果距离小于负半径，说明球体完全在平面的背面
      if (distance < negRadius) {
        return false; // 球体在视锥体外
      }
    }

    // 球体与所有平面都相交或在正面，说明在视锥体内
    return true;
  }

  /**
   * 如果给定包围盒与此视锥体相交，则返回true
   * Returns `true` if the given bounding box is intersecting this frustum.
   *
   * @param {Box3} box - 要测试的包围盒 The bounding box to test.
   * @return {boolean} 包围盒是否与此视锥体相交 Whether the bounding box is intersecting this frustum or not.
   */
  intersectsBox(box) {
    // 获取视锥体的平面数组
    const planes = this.planes;

    // 检查包围盒是否与所有六个平面相交
    for (let i = 0; i < 6; i++) {
      const plane = planes[i];

      // 找到包围盒上距离平面最远的角点
      // 根据平面法向量的方向选择包围盒的最大或最小坐标
      _vector.x = plane.normal.x > 0 ? box.max.x : box.min.x;
      _vector.y = plane.normal.y > 0 ? box.max.y : box.min.y;
      _vector.z = plane.normal.z > 0 ? box.max.z : box.min.z;

      // 如果最远角点都在平面背面，则包围盒完全在视锥体外
      if (plane.distanceToPoint(_vector) < 0) {
        return false;
      }
    }

    // 包围盒与所有平面都相交，说明在视锥体内
    return true;
  }

  /**
   * 如果给定点位于视锥体内，则返回true
   * Returns `true` if the given point lies within the frustum.
   *
   * @param {Vector3} point - 要测试的点 The point to test.
   * @return {boolean} 点是否位于此视锥体内 Whether the point lies within this frustum or not.
   */
  containsPoint(point) {
    // 获取视锥体的平面数组
    const planes = this.planes;

    // 检查点是否在所有六个平面的正面
    for (let i = 0; i < 6; i++) {
      // 如果点到任何一个平面的距离为负，说明点在平面背面
      if (planes[i].distanceToPoint(point) < 0) {
        return false; // 点在视锥体外
      }
    }

    // 点在所有平面的正面，说明在视锥体内
    return true;
  }

  /**
   * 返回一个复制了此实例值的新视锥体
   * Returns a new frustum with copied values from this instance.
   *
   * @return {Frustum} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 创建新的构造函数实例并复制当前值
    return new this.constructor().copy(this);
  }
}

// 导出Frustum类
export { Frustum };
