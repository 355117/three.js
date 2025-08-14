// 导入基础曲线类和曲线集合
// Import base Curve class and curves collection
import { Curve } from "./Curve.js";
import * as Curves from "../curves/Curves.js";

/**
 * 扩展 {@link Curve} 的基类。`CurvePath` 简单来说就是一个连接曲线的数组，
 * 但保留了曲线的API。
 *
 * A base class extending {@link Curve}. `CurvePath` is simply an
 * array of connected curves, but retains the API of a curve.
 *
 * @augments Curve
 */
class CurvePath extends Curve {
  /**
   * 构造一个新的曲线路径。
   *
   * Constructs a new curve path.
   */
  constructor() {
    // 调用父类构造函数
    // Call parent constructor
    super();

    // 设置对象类型标识
    // Set object type identifier
    this.type = "CurvePath";

    /**
     * 定义路径的曲线数组。
     *
     * An array of curves defining the
     * path.
     *
     * @type {Array<Curve>}
     */
    this.curves = [];

    /**
     * 路径是否应该通过线性曲线自动闭合。
     *
     * Whether the path should automatically be closed
     * by a line curve.
     *
     * @type {boolean}
     * @default false
     */
    this.autoClose = false;
  }

  /**
   * 向此曲线路径添加一条曲线。
   *
   * Adds a curve to this curve path.
   *
   * @param {Curve} curve - 要添加的曲线 / The curve to add.
   */
  add(curve) {
    // 将曲线添加到曲线数组中
    // Add the curve to the curves array
    this.curves.push(curve);
  }

  /**
   * 添加一条线性曲线来闭合路径。
   *
   * Adds a line curve to close the path.
   *
   * @return {CurvePath} 返回此曲线路径的引用 / A reference to this curve path.
   */
  closePath() {
    // 如果起点和终点没有连接，则添加一条线性曲线
    // Add a line curve if start and end of lines are not connected
    const startPoint = this.curves[0].getPoint(0); // 获取第一条曲线的起点 / Get start point of first curve
    const endPoint = this.curves[this.curves.length - 1].getPoint(1); // 获取最后一条曲线的终点 / Get end point of last curve

    // 检查起点和终点是否相等
    // Check if start and end points are equal
    if (!startPoint.equals(endPoint)) {
      // 根据点的类型选择合适的线性曲线类型
      // Choose appropriate line curve type based on point type
      const lineType = startPoint.isVector2 === true ? "LineCurve" : "LineCurve3";
      this.curves.push(new Curves[lineType](endPoint, startPoint)); // 添加闭合线段 / Add closing line segment
    }

    return this;
  }

  /**
   * 此方法根据给定的插值因子返回2D或3D空间中的向量（取决于曲线定义）。
   *
   * This method returns a vector in 2D or 3D space (depending on the curve definitions)
   * for the given interpolation factor.
   *
   * @param {number} t - 表示曲线上位置的插值因子，必须在[0,1]范围内 / A interpolation factor representing a position on the curve. Must be in the range `[0,1]`.
   * @param {(Vector2|Vector3)} [optionalTarget] - 可选的目标向量，结果将写入其中 / The optional target vector the result is written to.
   * @return {?(Vector2|Vector3)} 曲线上的位置，可以是2D或3D向量 / The position on the curve. It can be a 2D or 3D vector depending on the curve definition.
   */
  getPoint(t, optionalTarget) {
    // 要获得相对于时间t的整个路径距离的准确点，
    // 需要执行以下操作：
    // To get accurate point with reference to
    // entire path distance at time t,
    // following has to be done:

    // 1. 需要知道每个子路径的长度 / Length of each sub path have to be known
    // 2. 定位并识别曲线类型 / Locate and identify type of curve
    // 3. 获取曲线的t值 / Get t for the curve
    // 4. 返回curve.getPointAt(t') / Return curve.getPointAt(t')

    const d = t * this.getLength(); // 计算目标距离 / Calculate target distance
    const curveLengths = this.getCurveLengths(); // 获取累积曲线长度 / Get cumulative curve lengths
    let i = 0; // 曲线索引 / Curve index

    // 考虑边界点 / To think about boundaries points.

    // 遍历所有曲线，找到包含目标距离的曲线
    // Iterate through all curves to find the curve containing the target distance
    while (i < curveLengths.length) {
      if (curveLengths[i] >= d) {
        const diff = curveLengths[i] - d; // 计算距离差 / Calculate distance difference
        const curve = this.curves[i]; // 获取当前曲线 / Get current curve

        const segmentLength = curve.getLength(); // 获取曲线段长度 / Get curve segment length
        // 计算曲线内的参数u / Calculate parameter u within the curve
        const u = segmentLength === 0 ? 0 : 1 - diff / segmentLength;

        // 返回曲线上的点 / Return point on the curve
        return curve.getPointAt(u, optionalTarget);
      }

      i++; // 移动到下一条曲线 / Move to next curve
    }

    return null; // 如果没有找到有效点，返回null / Return null if no valid point found

    // 循环条件：sum != 0, sum > d , sum+1 <d
    // loop where sum != 0, sum > d , sum+1 <d
  }

  /**
   * 获取整个曲线路径的总长度。
   *
   * Gets the total length of the entire curve path.
   *
   * @return {number} 曲线路径的总长度 / The total length of the curve path
   */
  getLength() {
    // 我们不能使用默认的THREE.Curve getPoint()与getLength()，因为在
    // THREE.Curve中，getLength()依赖于getPoint()，但在THREE.CurvePath中
    // getPoint()依赖于getLength()
    // We cannot use the default THREE.Curve getPoint() with getLength() because in
    // THREE.Curve, getLength() depends on getPoint() but in THREE.CurvePath
    // getPoint() depends on getLength

    const lens = this.getCurveLengths(); // 获取累积长度数组 / Get cumulative lengths array
    return lens[lens.length - 1]; // 返回最后一个元素，即总长度 / Return last element, which is total length
  }

  /**
   * 更新弧长缓存。当曲线路径发生变化时需要调用此方法。
   *
   * Updates the arc length cache. Should be called when the curve path changes.
   */
  updateArcLengths() {
    // 缓存长度必须重新计算
    // cacheLengths must be recalculated.

    this.needsUpdate = true; // 标记需要更新 / Mark as needing update
    this.cacheLengths = null; // 清空缓存 / Clear cache
    this.getCurveLengths(); // 重新计算长度 / Recalculate lengths
  }

  /**
   * 返回定义曲线的累积曲线长度列表。
   *
   * Returns list of cumulative curve lengths of the defined curves.
   *
   * @return {Array<number>} 曲线长度数组 / The curve lengths.
   */
  getCurveLengths() {
    // 计算长度并缓存它们
    // 我们不能重写getLengths()，因为UtoT映射使用它
    // 如果曲线和缓存数组长度相同，我们使用缓存值
    // Compute lengths and cache them
    // We cannot overwrite getLengths() because UtoT mapping uses it.
    // We use cache values if curves and cache array are same length

    if (this.cacheLengths && this.cacheLengths.length === this.curves.length) {
      return this.cacheLengths; // 返回缓存的长度 / Return cached lengths
    }

    // 获取子曲线的长度
    // 将累积和推入缓存数组
    // Get length of sub-curve
    // Push sums into cached array

    const lengths = []; // 长度数组 / Lengths array
    let sums = 0; // 累积和 / Cumulative sum

    // 遍历所有曲线，计算累积长度
    // Iterate through all curves and calculate cumulative lengths
    for (let i = 0, l = this.curves.length; i < l; i++) {
      sums += this.curves[i].getLength(); // 累加当前曲线长度 / Add current curve length
      lengths.push(sums); // 推入累积长度 / Push cumulative length
    }

    this.cacheLengths = lengths; // 缓存结果 / Cache the result

    return lengths;
  }

  /**
   * 获取沿曲线路径等间距分布的点。
   *
   * Gets points evenly spaced along the curve path.
   *
   * @param {number} [divisions=40] - 分割数，默认为40 / Number of divisions, defaults to 40
   * @return {Array<Vector2|Vector3>} 等间距点的数组 / Array of evenly spaced points
   */
  getSpacedPoints(divisions = 40) {
    const points = []; // 点数组 / Points array

    // 根据分割数获取等间距的点
    // Get evenly spaced points based on divisions
    for (let i = 0; i <= divisions; i++) {
      points.push(this.getPoint(i / divisions)); // 添加插值点 / Add interpolated point
    }

    // 如果设置了自动闭合，添加起始点作为结束点
    // If auto-close is set, add starting point as ending point
    if (this.autoClose) {
      points.push(points[0]);
    }

    return points;
  }

  /**
   * 获取曲线路径上的点，考虑不同曲线类型的分辨率。
   *
   * Gets points on the curve path, considering resolution for different curve types.
   *
   * @param {number} [divisions=12] - 分割数，默认为12 / Number of divisions, defaults to 12
   * @return {Array<Vector2|Vector3>} 曲线路径上的点数组 / Array of points on the curve path
   */
  getPoints(divisions = 12) {
    const points = []; // 点数组 / Points array
    let last; // 上一个点，用于去重 / Last point, used for deduplication

    // 遍历所有曲线
    // Iterate through all curves
    for (let i = 0, curves = this.curves; i < curves.length; i++) {
      const curve = curves[i]; // 当前曲线 / Current curve

      // 根据曲线类型确定分辨率
      // Determine resolution based on curve type
      const resolution = curve.isEllipseCurve
        ? divisions * 2 // 椭圆曲线需要更高分辨率 / Ellipse curves need higher resolution
        : curve.isLineCurve || curve.isLineCurve3
        ? 1 // 线性曲线只需要1个分割 / Linear curves only need 1 division
        : curve.isSplineCurve
        ? divisions * curve.points.length // 样条曲线基于控制点数量 / Spline curves based on control points count
        : divisions; // 默认分辨率 / Default resolution

      const pts = curve.getPoints(resolution); // 获取曲线上的点 / Get points on the curve

      // 遍历曲线上的所有点
      // Iterate through all points on the curve
      for (let j = 0; j < pts.length; j++) {
        const point = pts[j]; // 当前点 / Current point

        // 确保没有连续的重复点
        // ensures no consecutive points are duplicates
        if (last && last.equals(point)) continue;

        points.push(point); // 添加点到数组 / Add point to array
        last = point; // 更新上一个点 / Update last point
      }
    }

    // 如果设置了自动闭合且起点和终点不相等，添加起始点
    // If auto-close is set and start/end points are not equal, add starting point
    if (this.autoClose && points.length > 1 && !points[points.length - 1].equals(points[0])) {
      points.push(points[0]);
    }

    return points;
  }

  /**
   * 从源曲线路径复制属性到当前曲线路径。
   *
   * Copies properties from source curve path to this curve path.
   *
   * @param {CurvePath} source - 要复制的源曲线路径 / The source curve path to copy from
   * @return {CurvePath} 返回当前曲线路径实例 / Returns this curve path instance
   */
  copy(source) {
    // 调用父类的copy方法
    // Call parent class copy method
    super.copy(source);

    // 重置曲线数组
    // Reset curves array
    this.curves = [];

    // 复制所有曲线
    // Copy all curves
    for (let i = 0, l = source.curves.length; i < l; i++) {
      const curve = source.curves[i]; // 获取源曲线 / Get source curve

      this.curves.push(curve.clone()); // 克隆并添加曲线 / Clone and add curve
    }

    // 复制自动闭合属性
    // Copy auto-close property
    this.autoClose = source.autoClose;

    return this;
  }

  /**
   * 将曲线路径序列化为JSON对象。
   *
   * Serializes the curve path to a JSON object.
   *
   * @return {Object} 包含曲线路径数据的JSON对象 / JSON object containing curve path data
   */
  toJSON() {
    // 调用父类的toJSON方法获取基础数据
    // Call parent class toJSON method to get base data
    const data = super.toJSON();

    // 添加曲线路径特有的属性
    // Add curve path specific properties
    data.autoClose = this.autoClose; // 添加自动闭合属性 / Add auto-close property
    data.curves = []; // 初始化曲线数组 / Initialize curves array

    // 序列化所有曲线
    // Serialize all curves
    for (let i = 0, l = this.curves.length; i < l; i++) {
      const curve = this.curves[i]; // 获取曲线 / Get curve
      data.curves.push(curve.toJSON()); // 序列化曲线并添加到数组 / Serialize curve and add to array
    }

    return data;
  }

  /**
   * 从JSON对象反序列化曲线路径。
   *
   * Deserializes the curve path from a JSON object.
   *
   * @param {Object} json - 包含曲线路径数据的JSON对象 / JSON object containing curve path data
   * @return {CurvePath} 返回当前曲线路径实例 / Returns this curve path instance
   */
  fromJSON(json) {
    // 调用父类的fromJSON方法恢复基础数据
    // Call parent class fromJSON method to restore base data
    super.fromJSON(json);

    // 恢复曲线路径特有的属性
    // Restore curve path specific properties
    this.autoClose = json.autoClose; // 恢复自动闭合属性 / Restore auto-close property
    this.curves = []; // 重置曲线数组 / Reset curves array

    // 反序列化所有曲线
    // Deserialize all curves
    for (let i = 0, l = json.curves.length; i < l; i++) {
      const curve = json.curves[i]; // 获取曲线数据 / Get curve data
      this.curves.push(new Curves[curve.type]().fromJSON(curve)); // 创建曲线对象并反序列化 / Create curve object and deserialize
    }

    return this;
  }
}

// 导出CurvePath类供其他模块使用
// Export CurvePath class for use by other modules
export { CurvePath };
