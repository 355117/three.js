// 导入Earcut三角剖分库，用于将多边形分解为三角形
import { Earcut } from "./Earcut.js";

/**
 * 包含形状实用工具函数的类。
 * 提供多边形面积计算、顺时针检测、三角剖分等功能。
 *
 * @hideconstructor
 */
class ShapeUtils {
  /**
   * 计算二维轮廓多边形的面积。
   * 使用鞋带公式（Shoelace formula）计算多边形面积。
   *
   * @param {Array<Vector2>} contour - 二维点数组，定义多边形轮廓。
   * @return {number} 多边形的面积值。正值表示逆时针，负值表示顺时针。
   */
  static area(contour) {
    const n = contour.length; // 获取轮廓点的数量
    let a = 0.0; // 初始化面积累加器

    // 使用鞋带公式计算面积：遍历所有相邻点对
    for (let p = n - 1, q = 0; q < n; p = q++) {
      // 计算叉积：(x_p * y_q - x_q * y_p)
      a += contour[p].x * contour[q].y - contour[q].x * contour[p].y;
    }

    return a * 0.5; // 返回面积的一半（鞋带公式的结果需要除以2）
  }

  /**
   * 判断给定的轮廓是否使用顺时针绕序。
   * 通过计算面积的符号来判断绕序方向。
   *
   * @param {Array<Vector2>} pts - 定义多边形的二维点数组。
   * @return {boolean} 如果轮廓使用顺时针绕序则返回true，否则返回false。
   */
  static isClockWise(pts) {
    return ShapeUtils.area(pts) < 0; // 面积为负值表示顺时针绕序
  }

  /**
   * 对给定的形状定义进行三角剖分。
   * 将带有孔洞的多边形分解为三角形数组，用于渲染。
   *
   * @param {Array<Vector2>} contour - 定义轮廓的二维点数组。
   * @param {Array<Array<Vector2>>} holes - 包含定义孔洞的二维点数组的数组。
   * @return {Array<Array<number>>} 包含每个面定义的三个索引的数组。
   */
  static triangulateShape(contour, holes) {
    const vertices = []; // 顶点的平坦数组，格式如 [ x0,y0, x1,y1, x2,y2, ... ]
    const holeIndices = []; // 孔洞索引数组
    const faces = []; // 最终的顶点索引数组，格式如 [ [ a,b,d ], [ b,c,d ] ]

    removeDupEndPts(contour); // 移除轮廓中重复的端点
    addContour(vertices, contour); // 将轮廓点添加到顶点数组

    // 处理孔洞部分

    let holeIndex = contour.length; // 孔洞起始索引

    holes.forEach(removeDupEndPts); // 移除每个孔洞中重复的端点

    for (let i = 0; i < holes.length; i++) {
      // 遍历所有孔洞
      holeIndices.push(holeIndex); // 记录当前孔洞的起始索引
      holeIndex += holes[i].length; // 更新下一个孔洞的起始索引
      addContour(vertices, holes[i]); // 将孔洞点添加到顶点数组
    }

    // 执行三角剖分

    const triangles = Earcut.triangulate(vertices, holeIndices); // 使用Earcut库进行三角剖分

    // 构建面数组

    for (let i = 0; i < triangles.length; i += 3) {
      // 每三个索引组成一个三角形
      faces.push(triangles.slice(i, i + 3)); // 将三角形索引添加到面数组
    }

    return faces; // 返回三角形面数组
  }
}

/**
 * 移除点数组中重复的端点。
 * 如果首尾点相同，则移除最后一个点以避免重复。
 * @param {Array<Vector2>} points - 要处理的点数组
 */
function removeDupEndPts(points) {
  const l = points.length; // 获取点数组长度

  if (l > 2 && points[l - 1].equals(points[0])) {
    // 如果有超过2个点且首尾点相同
    points.pop(); // 移除最后一个重复点
  }
}

/**
 * 将轮廓点添加到顶点数组中。
 * 将Vector2点转换为平坦的x,y坐标数组格式。
 * @param {Array<number>} vertices - 目标顶点数组（平坦格式）
 * @param {Array<Vector2>} contour - 源轮廓点数组
 */
function addContour(vertices, contour) {
  for (let i = 0; i < contour.length; i++) {
    // 遍历轮廓中的每个点
    vertices.push(contour[i].x); // 添加x坐标
    vertices.push(contour[i].y); // 添加y坐标
  }
}

// 导出ShapeUtils类
export { ShapeUtils };
