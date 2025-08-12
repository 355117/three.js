// 导入3D向量类，用于表示线段的端点
import { Vector3 } from "./Vector3.js";
// 导入数学工具函数，用于数值夹紧
import { clamp } from "./MathUtils.js";

// 临时向量，用于存储起始点到目标点的向量
const _startP = /*@__PURE__*/ new Vector3();
// 临时向量，用于存储起始点到终点的向量
const _startEnd = /*@__PURE__*/ new Vector3();

// 临时向量，用于线段间距离计算
const _d1 = /*@__PURE__*/ new Vector3();
const _d2 = /*@__PURE__*/ new Vector3();
const _r = /*@__PURE__*/ new Vector3();
const _c1 = /*@__PURE__*/ new Vector3();
const _c2 = /*@__PURE__*/ new Vector3();

/**
 * 3D空间中由起始点和终点表示的解析线段
 * An analytical line segment in 3D space represented by a start and end point.
 *
 * 线段是3D几何中的基本元素，常用于射线检测、距离计算、
 * 路径规划、碰撞检测等应用场景。
 */
class Line3 {
  /**
   * 构造一个新的线段
   * Constructs a new line segment.
   *
   * @param {Vector3} [start=(0,0,0)] - 线段的起始点 Start of the line segment.
   * @param {Vector3} [end=(0,0,0)] - 线段的终点 End of the line segment.
   */
  constructor(start = new Vector3(), end = new Vector3()) {
    /**
     * 线段的起始点
     * Start of the line segment.
     *
     * @type {Vector3}
     */
    this.start = start;

    /**
     * 线段的终点
     * End of the line segment.
     *
     * @type {Vector3}
     */
    this.end = end;
  }

  /**
   * 通过复制给定向量来设置起始点和终点值
   * Sets the start and end values by copying the given vectors.
   *
   * @param {Vector3} start - 起始点 The start point.
   * @param {Vector3} end - 终点 The end point.
   * @return {Line3} 对此线段的引用 A reference to this line segment.
   */
  set(start, end) {
    // 复制起始点
    this.start.copy(start);
    // 复制终点
    this.end.copy(end);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * Copies the values of the given line segment to this instance.
   *
   * @param {Line3} line - The line segment to copy.
   * @return {Line3} A reference to this line segment.
   */
  copy(line) {
    // 复制起始点
    this.start.copy(line.start);
    // 复制终点
    this.end.copy(line.end);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 返回线段的中心点
   * Returns the center of the line segment.
   *
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 中心点 The center point.
   */
  getCenter(target) {
    // 计算起始点和终点的中点：(start + end) / 2
    return target.addVectors(this.start, this.end).multiplyScalar(0.5);
  }

  /**
   * 返回线段起始点和终点的差向量
   * Returns the delta vector of the line segment's start and end point.
   *
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 差向量 The delta vector.
   */
  delta(target) {
    // 计算从起始点到终点的向量：end - start
    return target.subVectors(this.end, this.start);
  }

  /**
   * 返回线段起始点和终点之间的欧几里得距离的平方
   * Returns the squared Euclidean distance between the line' start and end point.
   *
   * @return {number} 欧几里得距离的平方 The squared Euclidean distance.
   */
  distanceSq() {
    // 返回起始点到终点的距离平方
    return this.start.distanceToSquared(this.end);
  }

  /**
   * 返回线段起始点和终点之间的欧几里得距离
   * Returns the Euclidean distance between the line' start and end point.
   *
   * @return {number} 欧几里得距离 The Euclidean distance.
   */
  distance() {
    // 返回起始点到终点的距离
    return this.start.distanceTo(this.end);
  }

  /**
   * 返回线段上某个位置的向量
   * Returns a vector at a certain position along the line segment.
   *
   * @param {number} t - 表示线段上位置的值，范围[0,1] A value between `[0,1]` to represent a position along the line segment.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 线段上的位置向量 The position vector on the line segment.
   */
  at(t, target) {
    // 计算线段上的点：start + t * (end - start)
    return this.delta(target).multiplyScalar(t).add(this.start);
  }

  /**
   * 基于投影到线段上的最近点返回点参数
   * Returns a point parameter based on the closest point as projected on the line segment.
   *
   * @param {Vector3} point - 要返回点参数的点 The point for which to return a point parameter.
   * @param {boolean} clampToLine - 是否将结果夹紧到范围[0,1] Whether to clamp the result to the range `[0,1]` or not.
   * @return {number} 点参数 The point parameter.
   */
  closestPointToPointParameter(point, clampToLine) {
    // 计算从起始点到目标点的向量
    _startP.subVectors(point, this.start);
    // 计算线段的方向向量
    _startEnd.subVectors(this.end, this.start);

    // 计算线段方向向量的长度平方
    const startEnd2 = _startEnd.dot(_startEnd);
    // 计算目标点在线段方向上的投影长度
    const startEnd_startP = _startEnd.dot(_startP);

    // 计算参数t：投影长度 / 线段长度平方
    let t = startEnd_startP / startEnd2;

    // 如果需要夹紧到线段范围内
    if (clampToLine) {
      t = clamp(t, 0, 1);
    }

    // 返回参数t
    return t;
  }

  /**
   * 返回给定点在线段上的最近点
   * Returns the closest point on the line for a given point.
   *
   * @param {Vector3} point - 要计算线段上最近点的点 The point to compute the closest point on the line for.
   * @param {boolean} clampToLine - 是否将结果夹紧到范围[0,1] Whether to clamp the result to the range `[0,1]` or not.
   * @param {Vector3} target - 用于存储方法结果的目标向量 The target vector that is used to store the method's result.
   * @return {Vector3} 线段上的最近点 The closest point on the line.
   */
  closestPointToPoint(point, clampToLine, target) {
    // 获取最近点的参数t
    const t = this.closestPointToPointParameter(point, clampToLine);

    // 根据参数t计算线段上的点：start + t * (end - start)
    return this.delta(target).multiplyScalar(t).add(this.start);
  }

  /**
   * 返回此线段与给定线段之间的最近距离平方
   * Returns the closest squared distance between this line segment and the given one.
   *
   * @param {Line3} line - 要计算最近距离平方的线段 The line segment to compute the closest squared distance to.
   * @param {Vector3} [c1] - 此线段上的最近点 The closest point on this line segment.
   * @param {Vector3} [c2] - 给定线段上的最近点 The closest point on the given line segment.
   * @return {number} 此线段与给定线段之间的距离平方 The squared distance between this line segment and the given one.
   */
  distanceSqToLine3(line, c1 = _c1, c2 = _c2) {
    // 来源：Christer Ericson的《实时碰撞检测》第5.1.9章
    // from Real-Time Collision Detection by Christer Ericson, chapter 5.1.9

    // 计算S1(s)=P1+s*(Q1-P1)和S2(t)=P2+t*(Q2-P2)的最近点C1和C2，
    // 返回参数s和t。函数结果是S1(s)和S2(t)之间的距离平方
    // Computes closest points C1 and C2 of S1(s)=P1+s*(Q1-P1) and
    // S2(t)=P2+t*(Q2-P2), returning s and t. Function result is squared
    // distance between between S1(s) and S2(t)

    // 极小值常量，必须是平方值，因为我们比较的是长度平方
    const EPSILON = 1e-8 * 1e-8; // must be squared since we compare squared length
    let s, t; // 线段参数

    // 获取两个线段的端点
    const p1 = this.start; // 第一个线段的起点
    const p2 = line.start; // 第二个线段的起点
    const q1 = this.end; // 第一个线段的终点
    const q2 = line.end; // 第二个线段的终点

    // 计算线段的方向向量和连接向量
    _d1.subVectors(q1, p1); // 线段S1的方向向量 Direction vector of segment S1
    _d2.subVectors(q2, p2); // 线段S2的方向向量 Direction vector of segment S2
    _r.subVectors(p1, p2); // 从p2到p1的向量

    // 计算关键的几何量
    const a = _d1.dot(_d1); // 线段S1的长度平方，总是非负的 Squared length of segment S1, always nonnegative
    const e = _d2.dot(_d2); // 线段S2的长度平方，总是非负的 Squared length of segment S2, always nonnegative
    const f = _d2.dot(_r); // 用于计算的中间值

    // Check if either or both segments degenerate into points

    if (a <= EPSILON && e <= EPSILON) {
      // Both segments degenerate into points

      c1.copy(p1);
      c2.copy(p2);

      c1.sub(c2);

      return c1.dot(c1);
    }

    if (a <= EPSILON) {
      // First segment degenerates into a point

      s = 0;
      t = f / e; // s = 0 => t = (b*s + f) / e = f / e
      t = clamp(t, 0, 1);
    } else {
      const c = _d1.dot(_r);

      if (e <= EPSILON) {
        // Second segment degenerates into a point

        t = 0;
        s = clamp(-c / a, 0, 1); // t = 0 => s = (b*t - c) / a = -c / a
      } else {
        // The general nondegenerate case starts here

        const b = _d1.dot(_d2);
        const denom = a * e - b * b; // Always nonnegative

        // If segments not parallel, compute closest point on L1 to L2 and
        // clamp to segment S1. Else pick arbitrary s (here 0)

        if (denom !== 0) {
          s = clamp((b * f - c * e) / denom, 0, 1);
        } else {
          s = 0;
        }

        // Compute point on L2 closest to S1(s) using
        // t = Dot((P1 + D1*s) - P2,D2) / Dot(D2,D2) = (b*s + f) / e

        t = (b * s + f) / e;

        // If t in [0,1] done. Else clamp t, recompute s for the new value
        // of t using s = Dot((P2 + D2*t) - P1,D1) / Dot(D1,D1)= (t*b - c) / a
        // and clamp s to [0, 1]

        if (t < 0) {
          t = 0;
          s = clamp(-c / a, 0, 1);
        } else if (t > 1) {
          t = 1;
          s = clamp((b - c) / a, 0, 1);
        }
      }
    }

    c1.copy(p1).add(_d1.multiplyScalar(s));
    c2.copy(p2).add(_d2.multiplyScalar(t));

    c1.sub(c2);

    return c1.dot(c1);
  }

  /**
   * Applies a 4x4 transformation matrix to this line segment.
   *
   * @param {Matrix4} matrix - The transformation matrix.
   * @return {Line3} A reference to this line segment.
   */
  applyMatrix4(matrix) {
    this.start.applyMatrix4(matrix);
    this.end.applyMatrix4(matrix);

    return this;
  }

  /**
   * 如果此线段与给定线段相等，则返回true
   * Returns `true` if this line segment is equal with the given one.
   *
   * @param {Line3} line - 要测试相等性的线段 The line segment to test for equality.
   * @return {boolean} 此线段是否与给定线段相等 Whether this line segment is equal with the given one.
   */
  equals(line) {
    // 比较起始点和终点是否都相等
    return line.start.equals(this.start) && line.end.equals(this.end);
  }

  /**
   * 返回一个复制了此实例值的新线段
   * Returns a new line segment with copied values from this instance.
   *
   * @return {Line3} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 创建新的构造函数实例并复制当前值
    return new this.constructor().copy(this);
  }
}

// 导出Line3类
export { Line3 };
