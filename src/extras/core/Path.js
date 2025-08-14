// 导入所需的数学和曲线类
// Import required math and curve classes
import { Vector2 } from "../../math/Vector2.js";
import { CurvePath } from "./CurvePath.js";
import { EllipseCurve } from "../curves/EllipseCurve.js";
import { SplineCurve } from "../curves/SplineCurve.js";
import { CubicBezierCurve } from "../curves/CubicBezierCurve.js";
import { QuadraticBezierCurve } from "../curves/QuadraticBezierCurve.js";
import { LineCurve } from "../curves/LineCurve.js";

/**
 * 2D路径表示。该类提供了创建路径和2D形状轮廓的方法，类似于2D Canvas API。
 *
 * A 2D path representation. The class provides methods for creating paths
 * and contours of 2D shapes similar to the 2D Canvas API.
 *
 * ```js
 * // 创建路径示例
 * // Example of creating a path
 * const path = new THREE.Path();
 *
 * path.lineTo( 0, 0.8 );
 * path.quadraticCurveTo( 0, 1, 0.2, 1 );
 * path.lineTo( 1, 1 );
 *
 * const points = path.getPoints();
 *
 * const geometry = new THREE.BufferGeometry().setFromPoints( points );
 * const material = new THREE.LineBasicMaterial( { color: 0xffffff } );
 *
 * const line = new THREE.Line( geometry, material );
 * scene.add( line );
 * ```
 *
 * @augments CurvePath
 */
class Path extends CurvePath {
  /**
   * 构造一个新的路径。
   *
   * Constructs a new path.
   *
   * @param {Array<Vector2>} [points] - 定义路径的2D点数组（可选） / An array of 2D points defining the path.
   */
  constructor(points) {
    // 调用父类构造函数
    // Call parent constructor
    super();

    // 设置对象类型标识
    // Set object type identifier
    this.type = "Path";

    /**
     * 路径的当前偏移量。任何新添加的曲线都将从这里开始。
     *
     * The current offset of the path. Any new curve added will start here.
     *
     * @type {Vector2}
     */
    this.currentPoint = new Vector2();

    // 如果提供了点数组，则从这些点创建路径
    // If points array is provided, create path from these points
    if (points) {
      this.setFromPoints(points);
    }
  }

  /**
   * 从给定的点列表创建路径。这些点作为 {@link LineCurve} 的实例添加到路径中。
   *
   * Creates a path from the given list of points. The points are added
   * to the path as instances of {@link LineCurve}.
   *
   * @param {Array<Vector2>} points - 2D点数组 / An array of 2D points.
   * @return {Path} 返回此路径的引用 / A reference to this path.
   */
  setFromPoints(points) {
    // 移动到第一个点
    // Move to the first point
    this.moveTo(points[0].x, points[0].y);

    // 连接剩余的点
    // Connect the remaining points
    for (let i = 1, l = points.length; i < l; i++) {
      this.lineTo(points[i].x, points[i].y);
    }

    return this;
  }

  /**
   * 将 {@link Path#currentPoint} 移动到给定点。
   *
   * Moves {@link Path#currentPoint} to the given point.
   *
   * @param {number} x - x坐标 / The x coordinate.
   * @param {number} y - y坐标 / The y coordinate.
   * @return {Path} 返回此路径的引用 / A reference to this path.
   */
  moveTo(x, y) {
    // 设置当前点位置 / Set current point position
    this.currentPoint.set(x, y); // TODO 考虑引用向量而不是复制？ / TODO consider referencing vectors instead of copying?

    return this;
  }

  /**
   * 通过连接当前点与给定点，向路径添加一个 {@link LineCurve} 实例。
   *
   * Adds an instance of {@link LineCurve} to the path by connecting
   * the current point with the given one.
   *
   * @param {number} x - 终点的x坐标 / The x coordinate of the end point.
   * @param {number} y - 终点的y坐标 / The y coordinate of the end point.
   * @return {Path} 返回此路径的引用 / A reference to this path.
   */
  lineTo(x, y) {
    // 创建从当前点到目标点的线性曲线
    // Create a linear curve from current point to target point
    const curve = new LineCurve(this.currentPoint.clone(), new Vector2(x, y));
    this.curves.push(curve); // 添加曲线到路径 / Add curve to path

    // 更新当前点位置
    // Update current point position
    this.currentPoint.set(x, y);

    return this;
  }

  /**
   * 通过连接当前点与给定点，向路径添加一个 {@link QuadraticBezierCurve} 实例。
   *
   * Adds an instance of {@link QuadraticBezierCurve} to the path by connecting
   * the current point with the given one.
   *
   * @param {number} aCPx - 控制点的x坐标 / The x coordinate of the control point.
   * @param {number} aCPy - 控制点的y坐标 / The y coordinate of the control point.
   * @param {number} aX - 终点的x坐标 / The x coordinate of the end point.
   * @param {number} aY - 终点的y坐标 / The y coordinate of the end point.
   * @return {Path} 返回此路径的引用 / A reference to this path.
   */
  quadraticCurveTo(aCPx, aCPy, aX, aY) {
    // 创建二次贝塞尔曲线：起点、控制点、终点
    // Create quadratic Bezier curve: start point, control point, end point
    const curve = new QuadraticBezierCurve(this.currentPoint.clone(), new Vector2(aCPx, aCPy), new Vector2(aX, aY));

    this.curves.push(curve); // 添加曲线到路径 / Add curve to path

    // 更新当前点位置
    // Update current point position
    this.currentPoint.set(aX, aY);

    return this;
  }

  /**
   * 通过连接当前点与给定点，向路径添加一个 {@link CubicBezierCurve} 实例。
   *
   * Adds an instance of {@link CubicBezierCurve} to the path by connecting
   * the current point with the given one.
   *
   * @param {number} aCP1x - 第一个控制点的x坐标 / The x coordinate of the first control point.
   * @param {number} aCP1y - 第一个控制点的y坐标 / The y coordinate of the first control point.
   * @param {number} aCP2x - 第二个控制点的x坐标 / The x coordinate of the second control point.
   * @param {number} aCP2y - 第二个控制点的y坐标 / The y coordinate of the second control point.
   * @param {number} aX - 终点的x坐标 / The x coordinate of the end point.
   * @param {number} aY - 终点的y坐标 / The y coordinate of the end point.
   * @return {Path} 返回此路径的引用 / A reference to this path.
   */
  bezierCurveTo(aCP1x, aCP1y, aCP2x, aCP2y, aX, aY) {
    // 创建三次贝塞尔曲线：起点、第一控制点、第二控制点、终点
    // Create cubic Bezier curve: start point, first control point, second control point, end point
    const curve = new CubicBezierCurve(this.currentPoint.clone(), new Vector2(aCP1x, aCP1y), new Vector2(aCP2x, aCP2y), new Vector2(aX, aY));

    this.curves.push(curve); // 添加曲线到路径 / Add curve to path

    // 更新当前点位置
    // Update current point position
    this.currentPoint.set(aX, aY);

    return this;
  }

  /**
   * 通过连接当前点与给定点列表，向路径添加一个 {@link SplineCurve} 实例。
   *
   * Adds an instance of {@link SplineCurve} to the path by connecting
   * the current point with the given list of points.
   *
   * @param {Array<Vector2>} pts - 2D空间中的点数组 / An array of points in 2D space.
   * @return {Path} 返回此路径的引用 / A reference to this path.
   */
  splineThru(pts) {
    // 将当前点添加到点列表的开头
    // Add current point to the beginning of the points list
    const npts = [this.currentPoint.clone()].concat(pts);

    // 创建样条曲线
    // Create spline curve
    const curve = new SplineCurve(npts);
    this.curves.push(curve); // 添加曲线到路径 / Add curve to path

    // 更新当前点为最后一个点
    // Update current point to the last point
    this.currentPoint.copy(pts[pts.length - 1]);

    return this;
  }

  /**
   * 向路径添加一个相对于当前点定位的弧作为 {@link EllipseCurve} 实例。
   *
   * Adds an arc as an instance of {@link EllipseCurve} to the path, positioned relative
   * to the current point.
   *
   * @param {number} [aX=0] - 弧心相对于前一条曲线的x坐标偏移 / The x coordinate of the center of the arc offsetted from the previous curve.
   * @param {number} [aY=0] - 弧心相对于前一条曲线的y坐标偏移 / The y coordinate of the center of the arc offsetted from the previous curve.
   * @param {number} [aRadius=1] - 弧的半径 / The radius of the arc.
   * @param {number} [aStartAngle=0] - 起始角度（弧度） / The start angle in radians.
   * @param {number} [aEndAngle=Math.PI*2] - 结束角度（弧度） / The end angle in radians.
   * @param {boolean} [aClockwise=false] - 是否顺时针扫描弧 / Whether to sweep the arc clockwise or not.
   * @return {Path} 返回此路径的引用 / A reference to this path.
   */
  arc(aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise) {
    // 获取当前点坐标
    // Get current point coordinates
    const x0 = this.currentPoint.x;
    const y0 = this.currentPoint.y;

    // 调用绝对定位弧方法，将相对坐标转换为绝对坐标
    // Call absolute arc method, converting relative coordinates to absolute coordinates
    this.absarc(aX + x0, aY + y0, aRadius, aStartAngle, aEndAngle, aClockwise);

    return this;
  }

  /**
   * 向路径添加一个绝对定位的弧作为 {@link EllipseCurve} 实例。
   *
   * Adds an absolutely positioned arc as an instance of {@link EllipseCurve} to the path.
   *
   * @param {number} [aX=0] - 弧心的x坐标 / The x coordinate of the center of the arc.
   * @param {number} [aY=0] - 弧心的y坐标 / The y coordinate of the center of the arc.
   * @param {number} [aRadius=1] - 弧的半径 / The radius of the arc.
   * @param {number} [aStartAngle=0] - 起始角度（弧度） / The start angle in radians.
   * @param {number} [aEndAngle=Math.PI*2] - 结束角度（弧度） / The end angle in radians.
   * @param {boolean} [aClockwise=false] - 是否顺时针扫描弧 / Whether to sweep the arc clockwise or not.
   * @return {Path} 返回此路径的引用 / A reference to this path.
   */
  absarc(aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise) {
    // 调用椭圆方法，x和y半径相等时就是圆弧
    // Call ellipse method, when x and y radii are equal it becomes a circular arc
    this.absellipse(aX, aY, aRadius, aRadius, aStartAngle, aEndAngle, aClockwise);

    return this;
  }

  /**
   * 向路径添加一个相对于当前点定位的椭圆作为 {@link EllipseCurve} 实例。
   *
   * Adds an ellipse as an instance of {@link EllipseCurve} to the path, positioned relative
   * to the current point
   *
   * @param {number} [aX=0] - 椭圆中心相对于前一条曲线的x坐标偏移 / The x coordinate of the center of the ellipse offsetted from the previous curve.
   * @param {number} [aY=0] - 椭圆中心相对于前一条曲线的y坐标偏移 / The y coordinate of the center of the ellipse offsetted from the previous curve.
   * @param {number} [xRadius=1] - 椭圆在x轴上的半径 / The radius of the ellipse in the x axis.
   * @param {number} [yRadius=1] - 椭圆在y轴上的半径 / The radius of the ellipse in the y axis.
   * @param {number} [aStartAngle=0] - 起始角度（弧度） / The start angle in radians.
   * @param {number} [aEndAngle=Math.PI*2] - 结束角度（弧度） / The end angle in radians.
   * @param {boolean} [aClockwise=false] - 是否顺时针扫描椭圆 / Whether to sweep the ellipse clockwise or not.
   * @param {number} [aRotation=0] - 椭圆的旋转角度（弧度），从正X轴逆时针方向 / The rotation angle of the ellipse in radians, counterclockwise from the positive X axis.
   * @return {Path} 返回此路径的引用 / A reference to this path.
   */
  ellipse(aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation) {
    // 获取当前点坐标
    // Get current point coordinates
    const x0 = this.currentPoint.x;
    const y0 = this.currentPoint.y;

    // 调用绝对定位椭圆方法，将相对坐标转换为绝对坐标
    // Call absolute ellipse method, converting relative coordinates to absolute coordinates
    this.absellipse(aX + x0, aY + y0, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation);

    return this;
  }

  /**
   * 向路径添加一个绝对定位的椭圆作为 {@link EllipseCurve} 实例。
   *
   * Adds an absolutely positioned ellipse as an instance of {@link EllipseCurve} to the path.
   *
   * @param {number} [aX=0] - 椭圆绝对中心的x坐标 / The x coordinate of the absolute center of the ellipse.
   * @param {number} [aY=0] - 椭圆绝对中心的y坐标 / The y coordinate of the absolute center of the ellipse.
   * @param {number} [xRadius=1] - 椭圆在x轴上的半径 / The radius of the ellipse in the x axis.
   * @param {number} [yRadius=1] - 椭圆在y轴上的半径 / The radius of the ellipse in the y axis.
   * @param {number} [aStartAngle=0] - 起始角度（弧度） / The start angle in radians.
   * @param {number} [aEndAngle=Math.PI*2] - 结束角度（弧度） / The end angle in radians.
   * @param {boolean} [aClockwise=false] - 是否顺时针扫描椭圆 / Whether to sweep the ellipse clockwise or not.
   * @param {number} [aRotation=0] - 椭圆的旋转角度（弧度），从正X轴逆时针方向 / The rotation angle of the ellipse in radians, counterclockwise from the positive X axis.
   * @return {Path} 返回此路径的引用 / A reference to this path.
   */
  absellipse(aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation) {
    // 创建椭圆曲线
    // Create ellipse curve
    const curve = new EllipseCurve(aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation);

    // 如果存在前一条曲线，尝试连接
    // If a previous curve is present, attempt to join
    if (this.curves.length > 0) {
      const firstPoint = curve.getPoint(0); // 获取椭圆的起始点 / Get the starting point of the ellipse

      // 如果椭圆起始点与当前点不相等，添加连接线
      // If ellipse start point doesn't equal current point, add connecting line
      if (!firstPoint.equals(this.currentPoint)) {
        this.lineTo(firstPoint.x, firstPoint.y);
      }
    }

    this.curves.push(curve); // 添加椭圆曲线到路径 / Add ellipse curve to path

    // 更新当前点为椭圆的结束点
    // Update current point to the end point of the ellipse
    const lastPoint = curve.getPoint(1);
    this.currentPoint.copy(lastPoint);

    return this;
  }

  /**
   * 从源路径复制属性到当前路径。
   *
   * Copies properties from source path to this path.
   *
   * @param {Path} source - 要复制的源路径 / The source path to copy from
   * @return {Path} 返回当前路径实例 / Returns this path instance
   */
  copy(source) {
    // 调用父类的copy方法
    // Call parent class copy method
    super.copy(source);

    // 复制当前点
    // Copy current point
    this.currentPoint.copy(source.currentPoint);

    return this;
  }

  /**
   * 将路径序列化为JSON对象。
   *
   * Serializes the path to a JSON object.
   *
   * @return {Object} 包含路径数据的JSON对象 / JSON object containing path data
   */
  toJSON() {
    // 调用父类的toJSON方法获取基础数据
    // Call parent class toJSON method to get base data
    const data = super.toJSON();

    // 添加当前点数据
    // Add current point data
    data.currentPoint = this.currentPoint.toArray();

    return data;
  }

  /**
   * 从JSON对象反序列化路径。
   *
   * Deserializes the path from a JSON object.
   *
   * @param {Object} json - 包含路径数据的JSON对象 / JSON object containing path data
   * @return {Path} 返回当前路径实例 / Returns this path instance
   */
  fromJSON(json) {
    // 调用父类的fromJSON方法恢复基础数据
    // Call parent class fromJSON method to restore base data
    super.fromJSON(json);

    // 恢复当前点数据
    // Restore current point data
    this.currentPoint.fromArray(json.currentPoint);

    return this;
  }
}

// 导出Path类供其他模块使用
// Export Path class for use by other modules
export { Path };
