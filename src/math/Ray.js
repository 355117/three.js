// 导入Vector3类，用于表示三维向量
import { Vector3 } from "./Vector3.js";

// 用于临时计算的Vector3实例，避免重复创建对象
const _vector = /*@__PURE__*/ new Vector3();
// 线段中心点的临时向量
const _segCenter = /*@__PURE__*/ new Vector3();
// 线段方向的临时向量
const _segDir = /*@__PURE__*/ new Vector3();
// 差值向量的临时变量
const _diff = /*@__PURE__*/ new Vector3();

// 三角形边1的临时向量
const _edge1 = /*@__PURE__*/ new Vector3();
// 三角形边2的临时向量
const _edge2 = /*@__PURE__*/ new Vector3();
// 法向量的临时变量
const _normal = /*@__PURE__*/ new Vector3();

/**
 * 射线类 - 从原点向特定方向发射的射线
 * 该类被 {@link Raycaster} 使用来辅助射线投射
 * 射线投射用于鼠标拾取（确定3D空间中鼠标悬停的对象）等功能
 *
 * A ray that emits from an origin in a certain direction. The class is used by
 * {@link Raycaster} to assist with raycasting. Raycasting is used for
 * mouse picking (working out what objects in the 3D space the mouse is over)
 * amongst other things.
 */
class Ray {
  /**
   * 构造一个新的射线
   * Constructs a new ray.
   *
   * @param {Vector3} [origin=(0,0,0)] - 射线的起点 The origin of the ray.
   * @param {Vector3} [direction=(0,0,-1)] - 射线的（标准化）方向 The (normalized) direction of the ray.
   */
  constructor(origin = new Vector3(), direction = new Vector3(0, 0, -1)) {
    /**
     * 射线的起点
     * The origin of the ray.
     *
     * @type {Vector3}
     */
    this.origin = origin;

    /**
     * 射线的（标准化）方向
     * The (normalized) direction of the ray.
     *
     * @type {Vector3}
     */
    this.direction = direction;
  }

  /**
   * 通过复制给定值来设置射线的组件
   * Sets the ray's components by copying the given values.
   *
   * @param {Vector3} origin - 起点 The origin.
   * @param {Vector3} direction - 方向 The direction.
   * @return {Ray} 返回此射线的引用 A reference to this ray.
   */
  set(origin, direction) {
    // 复制起点坐标
    this.origin.copy(origin);
    // 复制方向向量
    this.direction.copy(direction);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将给定射线的值复制到此实例
   * Copies the values of the given ray to this instance.
   *
   * @param {Ray} ray - 要复制的射线 The ray to copy.
   * @return {Ray} 返回此射线的引用 A reference to this ray.
   */
  copy(ray) {
    // 复制射线的起点
    this.origin.copy(ray.origin);
    // 复制射线的方向
    this.direction.copy(ray.direction);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 返回沿此射线给定距离处的向量位置
   * Returns a vector that is located at a given distance along this ray.
   *
   * @param {number} t - 沿射线的距离参数 The distance along the ray to retrieve a position for.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 射线上的位置 A position on the ray.
   */
  at(t, target) {
    // 计算射线上的点：origin + t * direction
    return target.copy(this.origin).addScaledVector(this.direction, t);
  }

  /**
   * 调整射线方向以指向世界空间中的给定向量
   * Adjusts the direction of the ray to point at the given vector in world space.
   *
   * @param {Vector3} v - 目标位置 The target position.
   * @return {Ray} 返回此射线的引用 A reference to this ray.
   */
  lookAt(v) {
    // 计算从起点到目标点的方向并标准化
    this.direction.copy(v).sub(this.origin).normalize();

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 沿射线方向将此射线的起点移动给定距离
   * Shift the origin of this ray along its direction by the given distance.
   *
   * @param {number} t - 沿射线插值的距离 The distance along the ray to interpolate.
   * @return {Ray} 返回此射线的引用 A reference to this ray.
   */
  recast(t) {
    // 将起点移动到射线上距离为t的位置
    this.origin.copy(this.at(t, _vector));

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 返回此射线上最接近给定点的点
   * Returns the point along this ray that is closest to the given point.
   *
   * @param {Vector3} point - 3D空间中的一个点，用于获取射线上最接近的位置 A point in 3D space to get the closet location on the ray for.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 射线上最接近的点 The closest point on this ray.
   */
  closestPointToPoint(point, target) {
    // 计算从射线起点到目标点的向量
    target.subVectors(point, this.origin);

    // 计算该向量在射线方向上的投影长度
    const directionDistance = target.dot(this.direction);

    // 如果投影长度为负，说明点在射线起点后方，返回起点
    if (directionDistance < 0) {
      return target.copy(this.origin);
    }

    // 返回射线上距离起点directionDistance距离的点
    return target.copy(this.origin).addScaledVector(this.direction, directionDistance);
  }

  /**
   * 返回此射线与给定点之间最接近距离
   * Returns the distance of the closest approach between this ray and the given point.
   *
   * @param {Vector3} point - 3D空间中用于计算距离的点 A point in 3D space to compute the distance to.
   * @return {number} 距离值 The distance.
   */
  distanceToPoint(point) {
    // 返回距离平方的平方根
    return Math.sqrt(this.distanceSqToPoint(point));
  }

  /**
   * 返回此射线与给定点之间最接近距离的平方
   * Returns the squared distance of the closest approach between this ray and the given point.
   *
   * @param {Vector3} point - 3D空间中用于计算距离的点 A point in 3D space to compute the distance to.
   * @return {number} 距离的平方 The squared distance.
   */
  distanceSqToPoint(point) {
    // 计算从射线起点到目标点的向量在射线方向上的投影长度
    const directionDistance = _vector.subVectors(point, this.origin).dot(this.direction);

    // 点在射线后方
    // point behind the ray

    if (directionDistance < 0) {
      // 如果点在射线起点后方，返回起点到点的距离平方
      return this.origin.distanceToSquared(point);
    }

    // 计算射线上最接近点的位置
    _vector.copy(this.origin).addScaledVector(this.direction, directionDistance);

    // 返回最接近点到目标点的距离平方
    return _vector.distanceToSquared(point);
  }

  /**
   * 返回此射线与给定线段之间距离的平方
   * Returns the squared distance between this ray and the given line segment.
   *
   * @param {Vector3} v0 - 线段的起点 The start point of the line segment.
   * @param {Vector3} v1 - 线段的终点 The end point of the line segment.
   * @param {Vector3} [optionalPointOnRay] - 可选参数，接收射线上最接近线段的点 When provided, it receives the point on this ray that is closest to the segment.
   * @param {Vector3} [optionalPointOnSegment] - 可选参数，接收线段上最接近射线的点 When provided, it receives the point on the line segment that is closest to this ray.
   * @return {number} 距离的平方 The squared distance.
   */
  distanceSqToSegment(v0, v1, optionalPointOnRay, optionalPointOnSegment) {
    // 算法来源：https://github.com/pmjoniak/GeometricTools/blob/master/GTEngine/Include/Mathematics/GteDistRaySegment.h
    // 返回射线与由v0和v1定义的线段之间的最小距离
    // 还可以设置两个可选目标：
    // - 射线上最接近的点
    // - 线段上最接近的点
    // from https://github.com/pmjoniak/GeometricTools/blob/master/GTEngine/Include/Mathematics/GteDistRaySegment.h
    // It returns the min distance between the ray and the segment
    // defined by v0 and v1
    // It can also set two optional targets :
    // - The closest point on the ray
    // - The closest point on the segment

    // 计算线段的中心点
    _segCenter.copy(v0).add(v1).multiplyScalar(0.5);
    // 计算线段的方向向量（标准化）
    _segDir.copy(v1).sub(v0).normalize();
    // 计算射线起点到线段中心的向量
    _diff.copy(this.origin).sub(_segCenter);

    // 线段的半长度
    const segExtent = v0.distanceTo(v1) * 0.5;
    // 射线方向与线段方向的负点积
    const a01 = -this.direction.dot(_segDir);
    // 差值向量与射线方向的点积
    const b0 = _diff.dot(this.direction);
    // 差值向量与线段方向的负点积
    const b1 = -_diff.dot(_segDir);
    // 差值向量的长度平方
    const c = _diff.lengthSq();
    // 判别式，用于确定射线和线段是否平行
    const det = Math.abs(1 - a01 * a01);
    // 参数变量：s0为射线参数，s1为线段参数，sqrDist为距离平方，extDet为扩展判别式
    let s0, s1, sqrDist, extDet;

    if (det > 0) {
      // 射线和线段不平行
      // The ray and segment are not parallel.

      // 计算初始参数值
      s0 = a01 * b1 - b0;
      s1 = a01 * b0 - b1;
      extDet = segExtent * det;

      if (s0 >= 0) {
        // 射线参数为正（射线方向正确）
        if (s1 >= -extDet) {
          if (s1 <= extDet) {
            // 区域0：射线和线段的内部点处的最小值
            // region 0
            // Minimum at interior points of ray and segment.

            const invDet = 1 / det;
            s0 *= invDet;
            s1 *= invDet;
            // 计算距离平方
            sqrDist = s0 * (s0 + a01 * s1 + 2 * b0) + s1 * (a01 * s0 + s1 + 2 * b1) + c;
          } else {
            // 区域1：线段参数超出正边界
            // region 1

            s1 = segExtent;
            s0 = Math.max(0, -(a01 * s1 + b0));
            sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
          }
        } else {
          // 区域5：线段参数超出负边界
          // region 5

          s1 = -segExtent;
          s0 = Math.max(0, -(a01 * s1 + b0));
          sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
        }
      } else {
        // 射线参数为负（需要限制到射线起点）
        if (s1 <= -extDet) {
          // 区域4：射线起点，线段负端点
          // region 4

          s0 = Math.max(0, -(-a01 * segExtent + b0));
          s1 = s0 > 0 ? -segExtent : Math.min(Math.max(-segExtent, -b1), segExtent);
          sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
        } else if (s1 <= extDet) {
          // 区域3：射线起点，线段内部
          // region 3

          s0 = 0;
          s1 = Math.min(Math.max(-segExtent, -b1), segExtent);
          sqrDist = s1 * (s1 + 2 * b1) + c;
        } else {
          // 区域2：射线起点，线段正端点
          // region 2

          s0 = Math.max(0, -(a01 * segExtent + b0));
          s1 = s0 > 0 ? segExtent : Math.min(Math.max(-segExtent, -b1), segExtent);
          sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
        }
      }
    } else {
      // 射线和线段平行
      // Ray and segment are parallel.

      // 选择线段端点
      s1 = a01 > 0 ? -segExtent : segExtent;
      // 计算射线上最接近的点
      s0 = Math.max(0, -(a01 * s1 + b0));
      // 计算距离平方
      sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
    }

    // 如果提供了射线上的点参数，计算射线上最接近线段的点
    if (optionalPointOnRay) {
      optionalPointOnRay.copy(this.origin).addScaledVector(this.direction, s0);
    }

    // 如果提供了线段上的点参数，计算线段上最接近射线的点
    if (optionalPointOnSegment) {
      optionalPointOnSegment.copy(_segCenter).addScaledVector(_segDir, s1);
    }

    // 返回距离的平方
    return sqrDist;
  }

  /**
   * 计算此射线与给定球体的相交点，如果没有相交则返回null
   * Intersects this ray with the given sphere, returning the intersection
   * point or `null` if there is no intersection.
   *
   * @param {Sphere} sphere - 要相交的球体 The sphere to intersect.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {?Vector3} 相交点，如果没有相交则为null The intersection point.
   */
  intersectSphere(sphere, target) {
    // 计算从射线起点到球心的向量
    _vector.subVectors(sphere.center, this.origin);
    // 计算该向量在射线方向上的投影长度
    const tca = _vector.dot(this.direction);
    // 计算射线到球心的最短距离的平方
    const d2 = _vector.dot(_vector) - tca * tca;
    // 球体半径的平方
    const radius2 = sphere.radius * sphere.radius;

    // 如果最短距离大于半径，则没有相交
    if (d2 > radius2) return null;

    // 计算从最近点到相交点的距离
    const thc = Math.sqrt(radius2 - d2);

    // t0 = 第一个相交点 - 球体前表面的入口点
    // t0 = first intersect point - entrance on front of sphere
    const t0 = tca - thc;

    // t1 = 第二个相交点 - 球体后表面的出口点
    // t1 = second intersect point - exit point on back of sphere
    const t1 = tca + thc;

    // 测试t1是否在射线后方 - 如果是，返回null
    // test to see if t1 is behind the ray - if so, return null
    if (t1 < 0) return null;

    // 测试t0是否在射线后方：
    // 如果是，射线在球体内部，返回第二个出口点（按t1缩放），
    // 以确保总是返回射线前方的相交点
    // test to see if t0 is behind the ray:
    // if it is, the ray is inside the sphere, so return the second exit point scaled by t1,
    // in order to always return an intersect point that is in front of the ray.
    if (t0 < 0) return this.at(t1, target);

    // 否则t0在射线前方，返回第一个碰撞点（按t0缩放）
    // else t0 is in front of the ray, so return the first collision point scaled by t0
    return this.at(t0, target);
  }

  /**
   * 如果此射线与给定球体相交则返回true
   * Returns `true` if this ray intersects with the given sphere.
   *
   * @param {Sphere} sphere - 要相交的球体 The sphere to intersect.
   * @return {boolean} 此射线是否与给定球体相交 Whether this ray intersects with the given sphere or not.
   */
  intersectsSphere(sphere) {
    // 处理空球体的情况，参见 #31187
    if (sphere.radius < 0) return false; // handle empty spheres, see #31187

    // 检查射线到球心的距离平方是否小于等于半径平方
    return this.distanceSqToPoint(sphere.center) <= sphere.radius * sphere.radius;
  }

  /**
   * 计算从射线起点到给定平面的距离。如果射线不与平面相交则返回null
   * Computes the distance from the ray's origin to the given plane. Returns `null` if the ray
   * does not intersect with the plane.
   *
   * @param {Plane} plane - 要计算距离的平面 The plane to compute the distance to.
   * @return {?number} 距离值，如果不相交则为null Whether this ray intersects with the given sphere or not.
   */
  distanceToPlane(plane) {
    // 计算射线方向与平面法向量的点积（分母）
    const denominator = plane.normal.dot(this.direction);

    if (denominator === 0) {
      // 射线与平面共面，返回起点
      // line is coplanar, return origin
      if (plane.distanceToPoint(this.origin) === 0) {
        return 0;
      }

      // null比undefined更好，因为undefined意味着...它是未定义的
      // Null is preferable to undefined since undefined means.... it is undefined

      return null;
    }

    // 计算相交参数t
    const t = -(this.origin.dot(plane.normal) + plane.constant) / denominator;

    // 如果射线永远不与平面相交则返回null
    // Return if the ray never intersects the plane

    return t >= 0 ? t : null;
  }

  /**
   * 计算此射线与给定平面的相交点，如果没有相交则返回null
   * Intersects this ray with the given plane, returning the intersection
   * point or `null` if there is no intersection.
   *
   * @param {Plane} plane - 要相交的平面 The plane to intersect.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {?Vector3} 相交点，如果没有相交则为null The intersection point.
   */
  intersectPlane(plane, target) {
    // 获取到平面的距离
    const t = this.distanceToPlane(plane);

    // 如果没有相交，返回null
    if (t === null) {
      return null;
    }

    // 返回射线上距离为t的点
    return this.at(t, target);
  }

  /**
   * 如果此射线与给定平面相交则返回true
   * Returns `true` if this ray intersects with the given plane.
   *
   * @param {Plane} plane - 要相交的平面 The plane to intersect.
   * @return {boolean} 此射线是否与给定平面相交 Whether this ray intersects with the given plane or not.
   */
  intersectsPlane(plane) {
    // 首先检查射线是否位于平面上
    // check if the ray lies on the plane first

    const distToPoint = plane.distanceToPoint(this.origin);

    // 如果射线起点在平面上，则相交
    if (distToPoint === 0) {
      return true;
    }

    // 计算射线方向与平面法向量的点积
    const denominator = plane.normal.dot(this.direction);

    // 如果分母与距离的乘积为负，则相交
    if (denominator * distToPoint < 0) {
      return true;
    }

    // 射线起点在平面后方（且指向后方）
    // ray origin is behind the plane (and is pointing behind it)

    return false;
  }

  /**
   * 计算此射线与给定包围盒的相交点，如果没有相交则返回null
   * Intersects this ray with the given bounding box, returning the intersection
   * point or `null` if there is no intersection.
   *
   * @param {Box3} box - 要相交的包围盒 The box to intersect.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {?Vector3} 相交点，如果没有相交则为null The intersection point.
   */
  intersectBox(box, target) {
    // 声明各轴的最小和最大t值
    let tmin, tmax, tymin, tymax, tzmin, tzmax;

    // 计算射线方向各分量的倒数，用于优化计算
    const invdirx = 1 / this.direction.x,
      invdiry = 1 / this.direction.y,
      invdirz = 1 / this.direction.z;

    // 获取射线起点的引用
    const origin = this.origin;

    // 计算X轴方向的相交参数
    if (invdirx >= 0) {
      // 射线X方向为正
      tmin = (box.min.x - origin.x) * invdirx;
      tmax = (box.max.x - origin.x) * invdirx;
    } else {
      // 射线X方向为负，交换最小最大值
      tmin = (box.max.x - origin.x) * invdirx;
      tmax = (box.min.x - origin.x) * invdirx;
    }

    // 计算Y轴方向的相交参数
    if (invdiry >= 0) {
      // 射线Y方向为正
      tymin = (box.min.y - origin.y) * invdiry;
      tymax = (box.max.y - origin.y) * invdiry;
    } else {
      // 射线Y方向为负，交换最小最大值
      tymin = (box.max.y - origin.y) * invdiry;
      tymax = (box.min.y - origin.y) * invdiry;
    }

    // 检查X和Y轴的相交区间是否重叠
    if (tmin > tymax || tymin > tmax) return null;

    // 更新最小t值，处理NaN情况
    if (tymin > tmin || isNaN(tmin)) tmin = tymin;

    // 更新最大t值，处理NaN情况
    if (tymax < tmax || isNaN(tmax)) tmax = tymax;

    // 计算Z轴方向的相交参数
    if (invdirz >= 0) {
      // 射线Z方向为正
      tzmin = (box.min.z - origin.z) * invdirz;
      tzmax = (box.max.z - origin.z) * invdirz;
    } else {
      // 射线Z方向为负，交换最小最大值
      tzmin = (box.max.z - origin.z) * invdirz;
      tzmax = (box.min.z - origin.z) * invdirz;
    }

    // 检查所有轴的相交区间是否重叠
    if (tmin > tzmax || tzmin > tmax) return null;

    // 更新最小t值，处理NaN情况（tmin !== tmin 检查NaN）
    if (tzmin > tmin || tmin !== tmin) tmin = tzmin;

    // 更新最大t值，处理NaN情况（tmax !== tmax 检查NaN）
    if (tzmax < tmax || tmax !== tmax) tmax = tzmax;

    // 返回射线正方向上最接近的点
    //return point closest to the ray (positive side)

    // 如果最大t值为负，说明包围盒在射线后方
    if (tmax < 0) return null;

    // 返回最近的有效相交点
    return this.at(tmin >= 0 ? tmin : tmax, target);
  }

  /**
   * 如果此射线与给定包围盒相交则返回true
   * Returns `true` if this ray intersects with the given box.
   *
   * @param {Box3} box - 要相交的包围盒 The box to intersect.
   * @return {boolean} 此射线是否与给定包围盒相交 Whether this ray intersects with the given box or not.
   */
  intersectsBox(box) {
    // 调用intersectBox方法，如果返回非null则表示相交
    return this.intersectBox(box, _vector) !== null;
  }

  /**
   * 计算此射线与给定三角形的相交点，如果没有相交则返回null
   * Intersects this ray with the given triangle, returning the intersection
   * point or `null` if there is no intersection.
   *
   * @param {Vector3} a - 三角形的第一个顶点 The first vertex of the triangle.
   * @param {Vector3} b - 三角形的第二个顶点 The second vertex of the triangle.
   * @param {Vector3} c - 三角形的第三个顶点 The third vertex of the triangle.
   * @param {boolean} backfaceCulling - 是否使用背面剔除 Whether to use backface culling or not.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {?Vector3} 相交点，如果没有相交则为null The intersection point.
   */
  intersectTriangle(a, b, c, backfaceCulling, target) {
    // 计算偏移原点、边和法向量
    // Compute the offset origin, edges, and normal.

    // 算法来源：https://github.com/pmjoniak/GeometricTools/blob/master/GTEngine/Include/Mathematics/GteIntrRay3Triangle3.h
    // from https://github.com/pmjoniak/GeometricTools/blob/master/GTEngine/Include/Mathematics/GteIntrRay3Triangle3.h

    // 计算三角形的两条边
    _edge1.subVectors(b, a);
    _edge2.subVectors(c, a);
    // 计算三角形的法向量
    _normal.crossVectors(_edge1, _edge2);

    // 求解方程 Q + t*D = b1*E1 + b2*E2 (Q = kDiff, D = 射线方向,
    // E1 = kEdge1, E2 = kEdge2, N = Cross(E1,E2))
    // 通过以下公式：
    //   |Dot(D,N)|*b1 = sign(Dot(D,N))*Dot(D,Cross(Q,E2))
    //   |Dot(D,N)|*b2 = sign(Dot(D,N))*Dot(D,Cross(E1,Q))
    //   |Dot(D,N)|*t = -sign(Dot(D,N))*Dot(Q,N)
    // Solve Q + t*D = b1*E1 + b2*E2 (Q = kDiff, D = ray direction,
    // E1 = kEdge1, E2 = kEdge2, N = Cross(E1,E2)) by
    //   |Dot(D,N)|*b1 = sign(Dot(D,N))*Dot(D,Cross(Q,E2))
    //   |Dot(D,N)|*b2 = sign(Dot(D,N))*Dot(D,Cross(E1,Q))
    //   |Dot(D,N)|*t = -sign(Dot(D,N))*Dot(Q,N)
    let DdN = this.direction.dot(_normal);
    let sign;

    if (DdN > 0) {
      // 射线从三角形正面射入
      if (backfaceCulling) return null; // 如果启用背面剔除，返回null
      sign = 1;
    } else if (DdN < 0) {
      // 射线从三角形背面射入
      sign = -1;
      DdN = -DdN;
    } else {
      // 射线与三角形平行
      return null;
    }

    // 计算从射线起点到三角形顶点a的向量
    _diff.subVectors(this.origin, a);
    // 计算重心坐标的第一个分量
    const DdQxE2 = sign * this.direction.dot(_edge2.crossVectors(_diff, _edge2));

    // b1 < 0，没有相交
    // b1 < 0, no intersection
    if (DdQxE2 < 0) {
      return null;
    }

    // 计算重心坐标的第二个分量
    const DdE1xQ = sign * this.direction.dot(_edge1.cross(_diff));

    // b2 < 0，没有相交
    // b2 < 0, no intersection
    if (DdE1xQ < 0) {
      return null;
    }

    // b1+b2 > 1，没有相交（点在三角形外）
    // b1+b2 > 1, no intersection
    if (DdQxE2 + DdE1xQ > DdN) {
      return null;
    }

    // 直线与三角形相交，检查射线是否相交
    // Line intersects triangle, check if ray does.
    const QdN = -sign * _diff.dot(_normal);

    // t < 0，没有相交（相交点在射线起点后方）
    // t < 0, no intersection
    if (QdN < 0) {
      return null;
    }

    // 射线与三角形相交
    // Ray intersects triangle.
    return this.at(QdN / DdN, target);
  }

  /**
   * 使用给定的4x4变换矩阵变换此射线
   * Transforms this ray with the given 4x4 transformation matrix.
   *
   * @param {Matrix4} matrix4 - 变换矩阵 The transformation matrix.
   * @return {Ray} 返回此射线的引用 A reference to this ray.
   */
  applyMatrix4(matrix4) {
    // 变换射线起点
    this.origin.applyMatrix4(matrix4);
    // 变换射线方向（只变换方向，不包括平移）
    this.direction.transformDirection(matrix4);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 如果此射线与给定射线相等则返回true
   * Returns `true` if this ray is equal with the given one.
   *
   * @param {Ray} ray - 要测试相等性的射线 The ray to test for equality.
   * @return {boolean} 此射线是否与给定射线相等 Whether this ray is equal with the given one.
   */
  equals(ray) {
    // 比较起点和方向是否都相等
    return ray.origin.equals(this.origin) && ray.direction.equals(this.direction);
  }

  /**
   * 返回一个复制了此实例值的新射线
   * Returns a new ray with copied values from this instance.
   *
   * @return {Ray} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 创建新的射线实例并复制当前射线的值
    return new this.constructor().copy(this);
  }
}

// 导出Ray类
export { Ray };
