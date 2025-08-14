// 贝塞尔曲线公式来源: https://en.wikipedia.org/wiki/B%C3%A9zier_curve
// Bezier Curves formulas obtained from: https://en.wikipedia.org/wiki/B%C3%A9zier_curve

/**
 * 计算Catmull-Rom样条曲线上的一个点。
 * Catmull-Rom样条是一种平滑的插值曲线，通过四个控制点生成平滑的曲线段。
 *
 * Computes a point on a Catmull-Rom spline.
 *
 * @param {number} t - 插值因子，范围通常在[0,1]之间 / The interpolation factor.
 * @param {number} p0 - 第一个控制点 / The first control point.
 * @param {number} p1 - 第二个控制点（曲线段起点） / The second control point.
 * @param {number} p2 - 第三个控制点（曲线段终点） / The third control point.
 * @param {number} p3 - 第四个控制点 / The fourth control point.
 * @return {number} 计算得到的Catmull-Rom样条曲线上的点 / The calculated point on a Catmull-Rom spline.
 */
function CatmullRom(t, p0, p1, p2, p3) {
  // 计算切线向量v0和v1，用于确定曲线的方向和斜率
  // Calculate tangent vectors v0 and v1 for curve direction and slope
  const v0 = (p2 - p0) * 0.5; // 在p1处的切线向量 / Tangent vector at p1
  const v1 = (p3 - p1) * 0.5; // 在p2处的切线向量 / Tangent vector at p2

  // 预计算t的幂次，提高计算效率
  // Pre-calculate powers of t for efficiency
  const t2 = t * t; // t的平方 / t squared
  const t3 = t * t2; // t的立方 / t cubed

  // 使用Hermite插值公式计算Catmull-Rom样条点
  // Use Hermite interpolation formula to calculate Catmull-Rom spline point
  return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
}

// 二次贝塞尔曲线相关函数
// Quadratic Bezier curve related functions

/**
 * 计算二次贝塞尔曲线中第一个控制点的贡献。
 * 使用伯恩斯坦基函数 B₀²(t) = (1-t)²
 *
 * Calculate the contribution of the first control point in a quadratic Bezier curve.
 * Uses Bernstein basis function B₀²(t) = (1-t)²
 *
 * @param {number} t - 插值参数，范围[0,1] / Interpolation parameter, range [0,1]
 * @param {number} p - 第一个控制点的值 / Value of the first control point
 * @return {number} 第一个控制点对曲线的贡献 / Contribution of the first control point to the curve
 */
function QuadraticBezierP0(t, p) {
  const k = 1 - t; // 计算(1-t) / Calculate (1-t)
  return k * k * p; // 返回(1-t)²×p / Return (1-t)²×p
}

/**
 * 计算二次贝塞尔曲线中第二个控制点的贡献。
 * 使用伯恩斯坦基函数 B₁²(t) = 2(1-t)t
 *
 * Calculate the contribution of the second control point in a quadratic Bezier curve.
 * Uses Bernstein basis function B₁²(t) = 2(1-t)t
 *
 * @param {number} t - 插值参数，范围[0,1] / Interpolation parameter, range [0,1]
 * @param {number} p - 第二个控制点的值 / Value of the second control point
 * @return {number} 第二个控制点对曲线的贡献 / Contribution of the second control point to the curve
 */
function QuadraticBezierP1(t, p) {
  return 2 * (1 - t) * t * p; // 返回2(1-t)t×p / Return 2(1-t)t×p
}

/**
 * 计算二次贝塞尔曲线中第三个控制点的贡献。
 * 使用伯恩斯坦基函数 B₂²(t) = t²
 *
 * Calculate the contribution of the third control point in a quadratic Bezier curve.
 * Uses Bernstein basis function B₂²(t) = t²
 *
 * @param {number} t - 插值参数，范围[0,1] / Interpolation parameter, range [0,1]
 * @param {number} p - 第三个控制点的值 / Value of the third control point
 * @return {number} 第三个控制点对曲线的贡献 / Contribution of the third control point to the curve
 */
function QuadraticBezierP2(t, p) {
  return t * t * p; // 返回t²×p / Return t²×p
}

/**
 * 计算二次贝塞尔曲线上的一个点。
 * 二次贝塞尔曲线由三个控制点定义，生成平滑的抛物线段。
 *
 * Computes a point on a Quadratic Bezier curve.
 *
 * @param {number} t - 插值因子，范围[0,1] / The interpolation factor.
 * @param {number} p0 - 第一个控制点（起点） / The first control point.
 * @param {number} p1 - 第二个控制点（控制点） / The second control point.
 * @param {number} p2 - 第三个控制点（终点） / The third control point.
 * @return {number} 计算得到的二次贝塞尔曲线上的点 / The calculated point on a Quadratic Bezier curve.
 */
function QuadraticBezier(t, p0, p1, p2) {
  // 将三个控制点的贡献相加得到最终的曲线点
  // Sum the contributions of all three control points to get the final curve point
  return QuadraticBezierP0(t, p0) + QuadraticBezierP1(t, p1) + QuadraticBezierP2(t, p2);
}

// 三次贝塞尔曲线相关函数
// Cubic Bezier curve related functions

/**
 * 计算三次贝塞尔曲线中第一个控制点的贡献。
 * 使用伯恩斯坦基函数 B₀³(t) = (1-t)³
 *
 * Calculate the contribution of the first control point in a cubic Bezier curve.
 * Uses Bernstein basis function B₀³(t) = (1-t)³
 *
 * @param {number} t - 插值参数，范围[0,1] / Interpolation parameter, range [0,1]
 * @param {number} p - 第一个控制点的值 / Value of the first control point
 * @return {number} 第一个控制点对曲线的贡献 / Contribution of the first control point to the curve
 */
function CubicBezierP0(t, p) {
  const k = 1 - t; // 计算(1-t) / Calculate (1-t)
  return k * k * k * p; // 返回(1-t)³×p / Return (1-t)³×p
}

/**
 * 计算三次贝塞尔曲线中第二个控制点的贡献。
 * 使用伯恩斯坦基函数 B₁³(t) = 3(1-t)²t
 *
 * Calculate the contribution of the second control point in a cubic Bezier curve.
 * Uses Bernstein basis function B₁³(t) = 3(1-t)²t
 *
 * @param {number} t - 插值参数，范围[0,1] / Interpolation parameter, range [0,1]
 * @param {number} p - 第二个控制点的值 / Value of the second control point
 * @return {number} 第二个控制点对曲线的贡献 / Contribution of the second control point to the curve
 */
function CubicBezierP1(t, p) {
  const k = 1 - t; // 计算(1-t) / Calculate (1-t)
  return 3 * k * k * t * p; // 返回3(1-t)²t×p / Return 3(1-t)²t×p
}

/**
 * 计算三次贝塞尔曲线中第三个控制点的贡献。
 * 使用伯恩斯坦基函数 B₂³(t) = 3(1-t)t²
 *
 * Calculate the contribution of the third control point in a cubic Bezier curve.
 * Uses Bernstein basis function B₂³(t) = 3(1-t)t²
 *
 * @param {number} t - 插值参数，范围[0,1] / Interpolation parameter, range [0,1]
 * @param {number} p - 第三个控制点的值 / Value of the third control point
 * @return {number} 第三个控制点对曲线的贡献 / Contribution of the third control point to the curve
 */
function CubicBezierP2(t, p) {
  return 3 * (1 - t) * t * t * p; // 返回3(1-t)t²×p / Return 3(1-t)t²×p
}

/**
 * 计算三次贝塞尔曲线中第四个控制点的贡献。
 * 使用伯恩斯坦基函数 B₃³(t) = t³
 *
 * Calculate the contribution of the fourth control point in a cubic Bezier curve.
 * Uses Bernstein basis function B₃³(t) = t³
 *
 * @param {number} t - 插值参数，范围[0,1] / Interpolation parameter, range [0,1]
 * @param {number} p - 第四个控制点的值 / Value of the fourth control point
 * @return {number} 第四个控制点对曲线的贡献 / Contribution of the fourth control point to the curve
 */
function CubicBezierP3(t, p) {
  return t * t * t * p; // 返回t³×p / Return t³×p
}

/**
 * 计算三次贝塞尔曲线上的一个点。
 * 三次贝塞尔曲线由四个控制点定义，是最常用的贝塞尔曲线类型，
 * 提供了良好的形状控制能力和平滑性。
 *
 * Computes a point on a Cubic Bezier curve.
 *
 * @param {number} t - 插值因子，范围[0,1] / The interpolation factor.
 * @param {number} p0 - 第一个控制点（起点） / The first control point.
 * @param {number} p1 - 第二个控制点（第一个控制点） / The second control point.
 * @param {number} p2 - 第三个控制点（第二个控制点） / The third control point.
 * @param {number} p3 - 第四个控制点（终点） / The fourth control point.
 * @return {number} 计算得到的三次贝塞尔曲线上的点 / The calculated point on a Cubic Bezier curve.
 */
function CubicBezier(t, p0, p1, p2, p3) {
  // 将四个控制点的贡献相加得到最终的曲线点
  // Sum the contributions of all four control points to get the final curve point
  return CubicBezierP0(t, p0) + CubicBezierP1(t, p1) + CubicBezierP2(t, p2) + CubicBezierP3(t, p3);
}

// 导出插值函数供其他模块使用
// Export interpolation functions for use by other modules
export { CatmullRom, QuadraticBezier, CubicBezier };
