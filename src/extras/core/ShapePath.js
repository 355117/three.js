// 导入所需的颜色、路径、形状和工具类
// Import required color, path, shape and utility classes
import { Color } from "../../math/Color.js";
import { Path } from "./Path.js";
import { Shape } from "./Shape.js";
import { ShapeUtils } from "../ShapeUtils.js";

/**
 * 此类用于将一系列路径转换为形状数组。
 * 它专门用于字体和SVG的上下文中。
 *
 * This class is used to convert a series of paths to an array of
 * shapes. It is specifically used in context of fonts and SVG.
 */
class ShapePath {
  /**
   * 构造一个新的形状路径。
   *
   * Constructs a new shape path.
   */
  constructor() {
    // 设置对象类型标识
    // Set object type identifier
    this.type = "ShapePath";

    /**
     * 形状的颜色。
     *
     * The color of the shape.
     *
     * @type {Color}
     */
    this.color = new Color();

    /**
     * 为此形状生成的路径数组。
     *
     * The paths that have been generated for this shape.
     *
     * @type {Array<Path>}
     * @default null
     */
    this.subPaths = [];

    /**
     * 当前正在生成的路径。
     *
     * The current path that is being generated.
     *
     * @type {?Path}
     * @default null
     */
    this.currentPath = null;
  }

  /**
   * 创建一个新路径并将其当前点移动到给定位置。
   *
   * Creates a new path and moves it current point to the given one.
   *
   * @param {number} x - x坐标 / The x coordinate.
   * @param {number} y - y坐标 / The y coordinate.
   * @return {ShapePath} 返回此形状路径的引用 / A reference to this shape path.
   */
  moveTo(x, y) {
    // 创建新的路径
    // Create new path
    this.currentPath = new Path();
    this.subPaths.push(this.currentPath); // 添加到子路径数组 / Add to sub-paths array
    this.currentPath.moveTo(x, y); // 移动到指定位置 / Move to specified position

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
   * @return {ShapePath} 返回此形状路径的引用 / A reference to this shape path.
   */
  lineTo(x, y) {
    // 在当前路径上添加线段
    // Add line segment to current path
    this.currentPath.lineTo(x, y);

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
   * @return {ShapePath} 返回此形状路径的引用 / A reference to this shape path.
   */
  quadraticCurveTo(aCPx, aCPy, aX, aY) {
    // 在当前路径上添加二次贝塞尔曲线
    // Add quadratic Bezier curve to current path
    this.currentPath.quadraticCurveTo(aCPx, aCPy, aX, aY);

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
   * @return {ShapePath} 返回此形状路径的引用 / A reference to this shape path.
   */
  bezierCurveTo(aCP1x, aCP1y, aCP2x, aCP2y, aX, aY) {
    // 在当前路径上添加三次贝塞尔曲线
    // Add cubic Bezier curve to current path
    this.currentPath.bezierCurveTo(aCP1x, aCP1y, aCP2x, aCP2y, aX, aY);

    return this;
  }

  /**
   * 通过连接当前点与给定点列表，向路径添加一个 {@link SplineCurve} 实例。
   *
   * Adds an instance of {@link SplineCurve} to the path by connecting
   * the current point with the given list of points.
   *
   * @param {Array<Vector2>} pts - 2D空间中的点数组 / An array of points in 2D space.
   * @return {ShapePath} 返回此形状路径的引用 / A reference to this shape path.
   */
  splineThru(pts) {
    // 在当前路径上添加样条曲线
    // Add spline curve to current path
    this.currentPath.splineThru(pts);

    return this;
  }

  /**
   * 将路径转换为形状数组。
   *
   * Converts the paths into an array of shapes.
   *
   * @param {boolean} isCCW - 默认情况下，实体形状定义为顺时针(CW)，孔洞定义为逆时针(CCW)。如果此标志设置为true，则翻转这些定义。
   * By default solid shapes are defined clockwise (CW) and holes are defined counterclockwise (CCW).
   * If this flag is set to `true`, then those are flipped.
   * @return {Array<Shape>} 形状数组 / An array of shapes.
   */
  toShapes(isCCW) {
    /**
     * 将子路径转换为没有孔洞的形状数组。
     *
     * Converts sub-paths to shapes array without holes.
     *
     * @param {Array<Path>} inSubpaths - 输入的子路径数组 / Input sub-paths array
     * @return {Array<Shape>} 形状数组 / Array of shapes
     */
    function toShapesNoHoles(inSubpaths) {
      const shapes = []; // 形状数组 / Shapes array

      // 遍历所有子路径
      // Iterate through all sub-paths
      for (let i = 0, l = inSubpaths.length; i < l; i++) {
        const tmpPath = inSubpaths[i]; // 当前路径 / Current path

        // 创建新形状并复制曲线
        // Create new shape and copy curves
        const tmpShape = new Shape();
        tmpShape.curves = tmpPath.curves;

        shapes.push(tmpShape); // 添加到形状数组 / Add to shapes array
      }

      return shapes;
    }

    /**
     * 判断点是否在多边形内部（使用射线投射算法）。
     *
     * Determines if a point is inside a polygon using ray casting algorithm.
     *
     * @param {Vector2} inPt - 要测试的点 / Point to test
     * @param {Array<Vector2>} inPolygon - 多边形顶点数组 / Array of polygon vertices
     * @return {boolean} 如果点在多边形内部则返回true / Returns true if point is inside polygon
     */
    function isPointInsidePolygon(inPt, inPolygon) {
      const polyLen = inPolygon.length; // 多边形顶点数量 / Number of polygon vertices

      // 如果点在多边形轮廓上 => 立即成功，或者
      // 在通过inPt的水平线与边的每个交点处切换内部/外部状态，
      // 不计算边的下端点和该线上的整条边
      // inPt on polygon contour => immediate success or
      // toggling of inside/outside at every single! intersection point of an edge
      // with the horizontal line through inPt, left of inPt
      // not counting lowerY endpoints of edges and whole edges on that line
      let inside = false; // 内部标志 / Inside flag

      // 遍历多边形的所有边
      // Iterate through all edges of the polygon
      for (let p = polyLen - 1, q = 0; q < polyLen; p = q++) {
        let edgeLowPt = inPolygon[p]; // 边的低点 / Low point of edge
        let edgeHighPt = inPolygon[q]; // 边的高点 / High point of edge

        let edgeDx = edgeHighPt.x - edgeLowPt.x; // 边的x方向差值 / X difference of edge
        let edgeDy = edgeHighPt.y - edgeLowPt.y; // 边的y方向差值 / Y difference of edge

        if (Math.abs(edgeDy) > Number.EPSILON) {
          // 边不平行于x轴 / Edge is not parallel to x-axis
          if (edgeDy < 0) {
            // 确保edgeLowPt是较低的点 / Ensure edgeLowPt is the lower point
            edgeLowPt = inPolygon[q];
            edgeDx = -edgeDx;
            edgeHighPt = inPolygon[p];
            edgeDy = -edgeDy;
          }

          // 检查点的y坐标是否在边的y范围内
          // Check if point's y coordinate is within edge's y range
          if (inPt.y < edgeLowPt.y || inPt.y > edgeHighPt.y) continue;

          if (inPt.y === edgeLowPt.y) {
            if (inPt.x === edgeLowPt.x) return true; // 点在轮廓上 / Point is on contour
            // continue; // 没有交点或edgeLowPt => 不计算！/ no intersection or edgeLowPt => doesn't count!
          } else {
            // 计算垂直距离来判断交点位置
            // Calculate perpendicular distance to determine intersection position
            const perpEdge = edgeDy * (inPt.x - edgeLowPt.x) - edgeDx * (inPt.y - edgeLowPt.y);
            if (perpEdge === 0) return true; // 点在轮廓上 / Point is on contour
            if (perpEdge < 0) continue;
            inside = !inside; // 在inPt左侧有真实交点 / True intersection left of inPt
          }
        } else {
          // 边平行或共线 / Edge is parallel or collinear
          if (inPt.y !== edgeLowPt.y) continue; // 平行 / Parallel
          // 边位于与inPt相同的水平线上
          // Edge lies on the same horizontal line as inPt
          if ((edgeHighPt.x <= inPt.x && inPt.x <= edgeLowPt.x) || (edgeLowPt.x <= inPt.x && inPt.x <= edgeHighPt.x)) return true; // 点在轮廓上 / Point on contour
          // continue;
        }
      }

      return inside; // 返回是否在内部 / Return whether inside
    }

    // 获取顺时针判断函数
    // Get clockwise detection function
    const isClockWise = ShapeUtils.isClockWise;

    const subPaths = this.subPaths; // 获取子路径 / Get sub-paths
    if (subPaths.length === 0) return []; // 如果没有子路径，返回空数组 / If no sub-paths, return empty array

    let solid, tmpPath, tmpShape; // 临时变量 / Temporary variables
    const shapes = []; // 结果形状数组 / Result shapes array

    // 如果只有一个子路径，直接转换为形状
    // If only one sub-path, directly convert to shape
    if (subPaths.length === 1) {
      tmpPath = subPaths[0];
      tmpShape = new Shape();
      tmpShape.curves = tmpPath.curves;
      shapes.push(tmpShape);
      return shapes;
    }

    // 判断第一个路径是否为孔洞（逆时针）
    // Determine if first path is a hole (counter-clockwise)
    let holesFirst = !isClockWise(subPaths[0].getPoints());
    holesFirst = isCCW ? !holesFirst : holesFirst; // 根据isCCW标志调整 / Adjust based on isCCW flag

    // console.log("Holes first", holesFirst);

    const betterShapeHoles = []; // 更好的形状孔洞数组 / Better shape holes array
    const newShapes = []; // 新形状数组 / New shapes array
    let newShapeHoles = []; // 新形状孔洞数组 / New shape holes array
    let mainIdx = 0; // 主索引 / Main index
    let tmpPoints; // 临时点数组 / Temporary points array

    // 初始化数组
    // Initialize arrays
    newShapes[mainIdx] = undefined;
    newShapeHoles[mainIdx] = [];

    // 遍历所有子路径，分类为实体形状和孔洞
    // Iterate through all sub-paths, categorize as solid shapes and holes
    for (let i = 0, l = subPaths.length; i < l; i++) {
      tmpPath = subPaths[i]; // 当前路径 / Current path
      tmpPoints = tmpPath.getPoints(); // 获取路径点 / Get path points
      solid = isClockWise(tmpPoints); // 判断是否为实体（顺时针） / Check if solid (clockwise)
      solid = isCCW ? !solid : solid; // 根据isCCW标志调整 / Adjust based on isCCW flag

      if (solid) {
        // 实体形状处理 / Solid shape processing
        if (!holesFirst && newShapes[mainIdx]) mainIdx++; // 如果不是孔洞优先且当前索引已有形状，增加索引 / If not holes first and current index has shape, increment index

        // 创建新形状
        // Create new shape
        newShapes[mainIdx] = { s: new Shape(), p: tmpPoints };
        newShapes[mainIdx].s.curves = tmpPath.curves;

        if (holesFirst) mainIdx++; // 如果孔洞优先，增加索引 / If holes first, increment index
        newShapeHoles[mainIdx] = []; // 初始化孔洞数组 / Initialize holes array

        //console.log('cw', i);
      } else {
        // 孔洞处理 / Hole processing
        newShapeHoles[mainIdx].push({ h: tmpPath, p: tmpPoints[0] }); // 添加孔洞信息 / Add hole information

        //console.log('ccw', i);
      }
    }

    // 只有孔洞？-> 可能所有形状的方向都错了
    // only Holes? -> probably all Shapes with wrong orientation
    if (!newShapes[0]) return toShapesNoHoles(subPaths);

    // 如果有多个形状，需要正确分配孔洞
    // If multiple shapes, need to correctly assign holes
    if (newShapes.length > 1) {
      let ambiguous = false; // 是否存在歧义 / Whether ambiguous exists
      let toChange = 0; // 需要改变的数量 / Number to change

      // 初始化更好的形状孔洞数组
      // Initialize better shape holes array
      for (let sIdx = 0, sLen = newShapes.length; sIdx < sLen; sIdx++) {
        betterShapeHoles[sIdx] = [];
      }

      // 遍历所有形状，重新分配孔洞
      // Iterate through all shapes, reassign holes
      for (let sIdx = 0, sLen = newShapes.length; sIdx < sLen; sIdx++) {
        const sho = newShapeHoles[sIdx]; // 当前形状的孔洞 / Current shape's holes

        // 遍历当前形状的所有孔洞
        // Iterate through all holes of current shape
        for (let hIdx = 0; hIdx < sho.length; hIdx++) {
          const ho = sho[hIdx]; // 当前孔洞 / Current hole
          let hole_unassigned = true; // 孔洞是否未分配 / Whether hole is unassigned

          // 检查孔洞应该属于哪个形状
          // Check which shape the hole should belong to
          for (let s2Idx = 0; s2Idx < newShapes.length; s2Idx++) {
            if (isPointInsidePolygon(ho.p, newShapes[s2Idx].p)) {
              if (sIdx !== s2Idx) toChange++; // 如果不是原来的形状，计数需要改变的数量 / If not original shape, count changes needed

              if (hole_unassigned) {
                hole_unassigned = false; // 标记为已分配 / Mark as assigned
                betterShapeHoles[s2Idx].push(ho); // 分配给正确的形状 / Assign to correct shape
              } else {
                ambiguous = true; // 存在歧义 / Ambiguous exists
              }
            }
          }

          // 如果孔洞仍未分配，保持原来的分配
          // If hole still unassigned, keep original assignment
          if (hole_unassigned) {
            betterShapeHoles[sIdx].push(ho);
          }
        }
      }

      // 如果有改变且没有歧义，使用更好的分配
      // If there are changes and no ambiguity, use better assignment
      if (toChange > 0 && ambiguous === false) {
        newShapeHoles = betterShapeHoles;
      }
    }

    let tmpHoles; // 临时孔洞变量 / Temporary holes variable

    // 构建最终的形状数组
    // Build final shapes array
    for (let i = 0, il = newShapes.length; i < il; i++) {
      tmpShape = newShapes[i].s; // 获取形状 / Get shape
      shapes.push(tmpShape); // 添加到结果数组 / Add to result array
      tmpHoles = newShapeHoles[i]; // 获取对应的孔洞 / Get corresponding holes

      // 将孔洞添加到形状中
      // Add holes to shape
      for (let j = 0, jl = tmpHoles.length; j < jl; j++) {
        tmpShape.holes.push(tmpHoles[j].h);
      }
    }

    //console.log("shape", shapes);

    return shapes; // 返回形状数组 / Return shapes array
  }
}

// 导出ShapePath类供其他模块使用
// Export ShapePath class for use by other modules
export { ShapePath };
