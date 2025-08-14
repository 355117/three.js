// 导入earcut三角剖分算法的核心实现
import earcut from "./lib/earcut.js";

/**
 * 包含三角剖分工具函数的类
 * 提供多边形三角剖分功能的封装类
 *
 * @hideconstructor
 */
class Earcut {
  /**
   * 对给定的形状定义进行三角剖分，返回三角形数组
   * 将多边形（可能包含孔洞）分解为三角形，返回顶点索引数组
   *
   * @param {Array<number>} data - 包含2D点坐标的数组，格式如 [x0,y0, x1,y1, x2,y2, ...]
   * @param {Array<number>} holeIndices - 定义孔洞的索引数组，例如 [5, 8] 表示孔洞的起始位置
   * @param {number} [dim=2] - 输入数组中每个顶点的坐标数量，默认为2（2D坐标）
   * @return {Array<number>} 表示三角剖分面的数组，每个面由三个连续的数字定义，代表顶点索引
   */
  static triangulate(data, holeIndices, dim = 2) {
    // 调用核心earcut算法进行三角剖分
    return earcut(data, holeIndices, dim);
  }
}

// 导出Earcut类
export { Earcut };
