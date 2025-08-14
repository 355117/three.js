/* eslint-disable */
// copy of mapbox/earcut version 3.0.1
// https://github.com/mapbox/earcut/tree/v3.0.1

/**
 * Earcut三角剖分算法主函数
 * 将多边形（可能包含孔洞）转换为三角形数组
 * @param {Array} data - 顶点坐标数组，格式为[x0,y0,x1,y1,...]
 * @param {Array} holeIndices - 孔洞起始索引数组
 * @param {number} dim - 每个顶点的维度数（默认为2，即2D坐标）
 * @returns {Array} 三角形索引数组
 */
export default function earcut(data, holeIndices, dim = 2) {
  // 检查是否存在孔洞
  const hasHoles = holeIndices && holeIndices.length;
  // 计算外轮廓的长度（如果有孔洞，则到第一个孔洞为止；否则为整个数据长度）
  const outerLen = hasHoles ? holeIndices[0] * dim : data.length;
  // 创建外轮廓的双向链表，顺时针方向
  let outerNode = linkedList(data, 0, outerLen, dim, true);
  // 存储三角形索引的数组
  const triangles = [];

  // 如果外轮廓不存在或只有一个点，直接返回空数组
  if (!outerNode || outerNode.next === outerNode.prev) return triangles;

  // 用于Z-order曲线哈希的变量
  let minX, minY, invSize;

  // 如果存在孔洞，先消除孔洞，将其连接到外轮廓
  if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);

  // 如果形状不太简单（顶点数超过80个），使用Z-order曲线哈希优化；计算多边形边界框
  if (data.length > 80 * dim) {
    // 初始化边界框的最小值
    minX = Infinity;
    minY = Infinity;
    // 初始化边界框的最大值
    let maxX = -Infinity;
    let maxY = -Infinity;

    // 遍历所有顶点，计算边界框
    for (let i = dim; i < outerLen; i += dim) {
      const x = data[i]; // 当前顶点的x坐标
      const y = data[i + 1]; // 当前顶点的y坐标
      if (x < minX) minX = x; // 更新最小x值
      if (y < minY) minY = y; // 更新最小y值
      if (x > maxX) maxX = x; // 更新最大x值
      if (y > maxY) maxY = y; // 更新最大y值
    }

    // minX, minY和invSize稍后用于将坐标转换为整数以进行Z-order计算
    invSize = Math.max(maxX - minX, maxY - minY); // 计算边界框的最大边长
    invSize = invSize !== 0 ? 32767 / invSize : 0; // 计算逆缩放因子，32767是15位整数的最大值
  }

  // 执行链表形式的三角剖分算法
  earcutLinked(outerNode, triangles, dim, minX, minY, invSize, 0);

  // 返回三角形索引数组
  return triangles;
}

/**
 * 根据指定的缠绕顺序从多边形顶点创建循环双向链表
 * @param {Array} data - 顶点坐标数组
 * @param {number} start - 起始索引
 * @param {number} end - 结束索引
 * @param {number} dim - 每个顶点的维度数
 * @param {boolean} clockwise - 是否按顺时针方向创建链表
 * @returns {Object} 链表的最后一个节点
 */
function linkedList(data, start, end, dim, clockwise) {
  let last; // 链表的最后一个节点

  // 检查实际的多边形方向是否与期望的方向一致
  if (clockwise === signedArea(data, start, end, dim) > 0) {
    // 按正向顺序创建链表（从start到end）
    for (let i = start; i < end; i += dim) last = insertNode((i / dim) | 0, data[i], data[i + 1], last);
  } else {
    // 按反向顺序创建链表（从end到start）
    for (let i = end - dim; i >= start; i -= dim) last = insertNode((i / dim) | 0, data[i], data[i + 1], last);
  }

  // 如果最后一个节点与下一个节点重复，移除重复节点
  if (last && equals(last, last.next)) {
    removeNode(last); // 移除重复节点
    last = last.next; // 更新last指针
  }

  return last; // 返回链表的最后一个节点
}

/**
 * 消除共线或重复的点
 * @param {Object} start - 链表的起始节点
 * @param {Object} end - 链表的结束节点（可选）
 * @returns {Object} 过滤后的链表结束节点
 */
function filterPoints(start, end) {
  if (!start) return start; // 如果起始节点不存在，直接返回
  if (!end) end = start; // 如果结束节点未指定，设为起始节点

  let p = start, // 当前处理的节点
    again; // 标记是否需要再次遍历
  do {
    again = false; // 重置标记

    // 检查当前节点是否应该被移除：
    // 1. 不是Steiner点
    // 2. 与下一个节点重复，或者与前后节点共线（面积为0）
    if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
      removeNode(p); // 移除当前节点
      p = end = p.prev; // 将指针移到前一个节点
      if (p === p.next) break; // 如果只剩一个节点，退出循环
      again = true; // 标记需要再次遍历
    } else {
      p = p.next; // 移动到下一个节点
    }
  } while (again || p !== end); // 继续遍历直到没有节点被移除且回到起始位置

  return end; // 返回过滤后的结束节点
}

/**
 * 主要的耳朵切割循环，对多边形（以链表形式给出）进行三角剖分
 * @param {Object} ear - 当前处理的耳朵节点
 * @param {Array} triangles - 存储三角形索引的数组
 * @param {number} dim - 每个顶点的维度数
 * @param {number} minX - 边界框最小X值
 * @param {number} minY - 边界框最小Y值
 * @param {number} invSize - 逆缩放因子
 * @param {number} pass - 当前处理轮次（0,1,2）
 */
function earcutLinked(ear, triangles, dim, minX, minY, invSize, pass) {
  if (!ear) return; // 如果没有耳朵节点，直接返回

  // 在第一轮处理时，如果有逆缩放因子，按Z-order连接多边形节点
  if (!pass && invSize) indexCurve(ear, minX, minY, invSize);

  let stop = ear; // 记录停止位置，用于检测是否完成一轮遍历

  // 逐个切割耳朵，直到多边形被完全三角化
  while (ear.prev !== ear.next) {
    const prev = ear.prev; // 前一个节点
    const next = ear.next; // 后一个节点

    // 检查当前节点是否为有效的耳朵（使用哈希优化或基本检查）
    if (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {
      triangles.push(prev.i, ear.i, next.i); // 切掉三角形，添加到结果数组

      removeNode(ear); // 从链表中移除当前耳朵节点

      // 跳过下一个顶点可以减少细长三角形的产生
      ear = next.next;
      stop = next.next;

      continue; // 继续处理下一个耳朵
    }

    ear = next; // 移动到下一个节点

    // 如果遍历了整个剩余多边形但找不到更多耳朵
    if (ear === stop) {
      // 尝试过滤点并再次切割
      if (!pass) {
        earcutLinked(filterPoints(ear), triangles, dim, minX, minY, invSize, 1);

        // 如果这不起作用，尝试局部修复所有小的自相交
      } else if (pass === 1) {
        ear = cureLocalIntersections(filterPoints(ear), triangles);
        earcutLinked(ear, triangles, dim, minX, minY, invSize, 2);

        // 作为最后的手段，尝试将剩余多边形分割为两部分
      } else if (pass === 2) {
        splitEarcut(ear, triangles, dim, minX, minY, invSize);
      }

      break; // 退出主循环
    }
  }
}

/**
 * 检查多边形节点是否与相邻节点形成有效的耳朵
 * @param {Object} ear - 要检查的耳朵节点
 * @returns {boolean} 如果是有效耳朵返回true，否则返回false
 */
function isEar(ear) {
  const a = ear.prev, // 前一个节点
    b = ear, // 当前节点
    c = ear.next; // 后一个节点

  if (area(a, b, c) >= 0) return false; // 反射角，不能是耳朵

  // 现在确保潜在耳朵内部没有其他点
  const ax = a.x, // 前一个节点的x坐标
    bx = b.x, // 当前节点的x坐标
    cx = c.x, // 后一个节点的x坐标
    ay = a.y, // 前一个节点的y坐标
    by = b.y, // 当前节点的y坐标
    cy = c.y; // 后一个节点的y坐标

  // 计算三角形的边界框
  const x0 = Math.min(ax, bx, cx), // 边界框最小x值
    y0 = Math.min(ay, by, cy), // 边界框最小y值
    x1 = Math.max(ax, bx, cx), // 边界框最大x值
    y1 = Math.max(ay, by, cy); // 边界框最大y值

  let p = c.next; // 从下一个节点开始检查
  while (p !== a) {
    // 检查点是否在边界框内，且在三角形内部，且不是反射顶点
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && pointInTriangleExceptFirst(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
    p = p.next; // 移动到下一个节点
  }

  return true; // 是有效的耳朵
}

/**
 * 使用Z-order哈希优化的耳朵检查函数
 * @param {Object} ear - 要检查的耳朵节点
 * @param {number} minX - 边界框最小X值
 * @param {number} minY - 边界框最小Y值
 * @param {number} invSize - 逆缩放因子
 * @returns {boolean} 如果是有效耳朵返回true，否则返回false
 */
function isEarHashed(ear, minX, minY, invSize) {
  const a = ear.prev, // 前一个节点
    b = ear, // 当前节点
    c = ear.next; // 后一个节点

  if (area(a, b, c) >= 0) return false; // 反射角，不能是耳朵

  const ax = a.x, // 前一个节点的x坐标
    bx = b.x, // 当前节点的x坐标
    cx = c.x, // 后一个节点的x坐标
    ay = a.y, // 前一个节点的y坐标
    by = b.y, // 当前节点的y坐标
    cy = c.y; // 后一个节点的y坐标

  // 计算三角形的边界框
  const x0 = Math.min(ax, bx, cx), // 边界框最小x值
    y0 = Math.min(ay, by, cy), // 边界框最小y值
    x1 = Math.max(ax, bx, cx), // 边界框最大x值
    y1 = Math.max(ay, by, cy); // 边界框最大y值

  // 计算当前三角形边界框的Z-order范围
  const minZ = zOrder(x0, y0, minX, minY, invSize), // 最小Z值
    maxZ = zOrder(x1, y1, minX, minY, invSize); // 最大Z值

  let p = ear.prevZ, // Z-order链表中的前一个节点
    n = ear.nextZ; // Z-order链表中的后一个节点

  // 在两个方向上查找三角形内部的点
  while (p && p.z >= minZ && n && n.z <= maxZ) {
    // 检查前向节点是否在三角形内部且不是反射顶点
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && pointInTriangleExceptFirst(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0)
      return false;
    p = p.prevZ; // 移动到Z-order链表的前一个节点

    // 检查后向节点是否在三角形内部且不是反射顶点
    if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && pointInTriangleExceptFirst(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0)
      return false;
    n = n.nextZ; // 移动到Z-order链表的后一个节点
  }

  // 在递减的Z-order中查找剩余点
  while (p && p.z >= minZ) {
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && pointInTriangleExceptFirst(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0)
      return false;
    p = p.prevZ; // 继续向前移动
  }

  // 在递增的Z-order中查找剩余点
  while (n && n.z <= maxZ) {
    if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && pointInTriangleExceptFirst(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0)
      return false;
    n = n.nextZ; // 继续向后移动
  }

  return true; // 是有效的耳朵
}

/**
 * 遍历所有多边形节点并修复小的局部自相交
 * @param {Object} start - 起始节点
 * @param {Array} triangles - 三角形索引数组
 * @returns {Object} 过滤后的节点
 */
function cureLocalIntersections(start, triangles) {
  let p = start; // 当前处理的节点
  do {
    const a = p.prev, // 前一个节点
      b = p.next.next; // 下下个节点

    // 检查是否存在局部自相交：节点不重复、线段相交、且局部内部
    if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {
      triangles.push(a.i, p.i, b.i); // 添加三角形

      // 移除涉及的两个节点
      removeNode(p); // 移除当前节点
      removeNode(p.next); // 移除下一个节点

      p = start = b; // 重新设置起始点
    }
    p = p.next; // 移动到下一个节点
  } while (p !== start); // 遍历完整个多边形

  return filterPoints(p); // 过滤并返回结果节点
}

/**
 * 尝试将多边形分割为两部分并独立进行三角剖分
 * @param {Object} start - 起始节点
 * @param {Array} triangles - 三角形索引数组
 * @param {number} dim - 每个顶点的维度数
 * @param {number} minX - 边界框最小X值
 * @param {number} minY - 边界框最小Y值
 * @param {number} invSize - 逆缩放因子
 */
function splitEarcut(start, triangles, dim, minX, minY, invSize) {
  // 寻找将多边形分为两部分的有效对角线
  let a = start; // 起始节点
  do {
    let b = a.next.next; // 从第三个节点开始
    while (b !== a.prev) {
      // 检查是否可以形成有效的对角线
      if (a.i !== b.i && isValidDiagonal(a, b)) {
        // 通过对角线将多边形分割为两部分
        let c = splitPolygon(a, b);

        // 过滤切割点周围的共线点
        a = filterPoints(a, a.next);
        c = filterPoints(c, c.next);

        // 对每一半分别运行earcut算法
        earcutLinked(a, triangles, dim, minX, minY, invSize, 0);
        earcutLinked(c, triangles, dim, minX, minY, invSize, 0);
        return; // 分割成功，退出函数
      }
      b = b.next; // 移动到下一个节点
    }
    a = a.next; // 移动到下一个起始节点
  } while (a !== start); // 遍历所有可能的起始点
}

/**
 * 将每个孔洞连接到外环，生成无孔洞的单环多边形
 * @param {Array} data - 顶点坐标数组
 * @param {Array} holeIndices - 孔洞起始索引数组
 * @param {Object} outerNode - 外环节点
 * @param {number} dim - 每个顶点的维度数
 * @returns {Object} 连接后的外环节点
 */
function eliminateHoles(data, holeIndices, outerNode, dim) {
  const queue = []; // 存储孔洞的最左端点的队列

  // 为每个孔洞创建链表并找到最左端点
  for (let i = 0, len = holeIndices.length; i < len; i++) {
    const start = holeIndices[i] * dim; // 当前孔洞的起始索引
    const end = i < len - 1 ? holeIndices[i + 1] * dim : data.length; // 当前孔洞的结束索引
    const list = linkedList(data, start, end, dim, false); // 创建孔洞的链表（逆时针）
    if (list === list.next) list.steiner = true; // 如果只有一个点，标记为Steiner点
    queue.push(getLeftmost(list)); // 添加最左端点到队列
  }

  queue.sort(compareXYSlope); // 按X坐标和斜率排序孔洞

  // 从左到右处理孔洞
  for (let i = 0; i < queue.length; i++) {
    outerNode = eliminateHole(queue[i], outerNode); // 消除每个孔洞
  }

  return outerNode; // 返回连接后的外环节点
}

/**
 * 比较两个孔洞节点的X坐标和斜率，用于排序
 * @param {Object} a - 第一个节点
 * @param {Object} b - 第二个节点
 * @returns {number} 比较结果
 */
function compareXYSlope(a, b) {
  let result = a.x - b.x; // 首先按X坐标比较
  // 当两个孔洞的最左点在同一顶点相遇时，按逆时针方向排序孔洞
  // 这样当我们找到通往外壳的桥梁时，总是它们相遇的那个点
  if (result === 0) {
    result = a.y - b.y; // X坐标相同时按Y坐标比较
    if (result === 0) {
      // X和Y坐标都相同时，按斜率比较
      const aSlope = (a.next.y - a.y) / (a.next.x - a.x); // 计算a的斜率
      const bSlope = (b.next.y - b.y) / (b.next.x - b.x); // 计算b的斜率
      result = aSlope - bSlope; // 比较斜率
    }
  }
  return result; // 返回比较结果
}

/**
 * 找到连接孔洞与外环的桥梁顶点并连接它们
 * @param {Object} hole - 孔洞节点
 * @param {Object} outerNode - 外环节点
 * @returns {Object} 连接后的外环节点
 */
function eliminateHole(hole, outerNode) {
  const bridge = findHoleBridge(hole, outerNode); // 寻找桥梁点
  if (!bridge) {
    return outerNode; // 如果找不到桥梁，返回原外环
  }

  const bridgeReverse = splitPolygon(bridge, hole); // 分割多边形创建桥梁

  // 过滤切割点周围的共线点
  filterPoints(bridgeReverse, bridgeReverse.next);
  return filterPoints(bridge, bridge.next); // 返回过滤后的桥梁节点
}

/**
 * David Eberly的算法，用于寻找孔洞与外多边形之间的桥梁
 * @param {Object} hole - 孔洞节点
 * @param {Object} outerNode - 外环节点
 * @returns {Object|null} 桥梁节点或null
 */
function findHoleBridge(hole, outerNode) {
  let p = outerNode; // 当前检查的外环节点
  const hx = hole.x; // 孔洞点的x坐标
  const hy = hole.y; // 孔洞点的y坐标
  let qx = -Infinity; // 射线与线段交点的x坐标
  let m; // 潜在的连接点

  // 寻找从孔洞最左点向左发射的射线与外环线段的交点
  // 具有较小x坐标的线段端点将是潜在的连接点
  // 除非它们在顶点相交，则选择该顶点
  if (equals(hole, p)) return p; // 如果孔洞点与当前点重合，直接返回
  do {
    if (equals(hole, p.next)) return p.next; // 如果孔洞点与下一个点重合，返回下一个点
    else if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
      // 计算射线与线段的交点x坐标
      const x = p.x + ((hy - p.y) * (p.next.x - p.x)) / (p.next.y - p.y);
      if (x <= hx && x > qx) {
        qx = x; // 更新交点x坐标
        m = p.x < p.next.x ? p : p.next; // 选择x坐标较小的端点
        if (x === hx) return m; // 孔洞接触外环线段，选择最左端点
      }
    }
    p = p.next; // 移动到下一个节点
  } while (p !== outerNode);

  if (!m) return null; // 如果没有找到交点，返回null

  // 在孔洞点、线段交点和端点组成的三角形内寻找点
  // 如果没有找到点，我们有一个有效的连接
  // 否则选择与射线夹角最小的点作为连接点

  const stop = m; // 停止点
  const mx = m.x; // 连接点的x坐标
  const my = m.y; // 连接点的y坐标
  let tanMin = Infinity; // 最小正切值

  p = m; // 从连接点开始

  do {
    // 检查点是否在有效范围内且在三角形内部
    if (hx >= p.x && p.x >= mx && hx !== p.x && pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {
      const tan = Math.abs(hy - p.y) / (hx - p.x); // 计算正切值

      // 选择局部内部且角度最小的点
      if (locallyInside(p, hole) && (tan < tanMin || (tan === tanMin && (p.x > m.x || (p.x === m.x && sectorContainsSector(m, p)))))) {
        m = p; // 更新连接点
        tanMin = tan; // 更新最小正切值
      }
    }

    p = p.next; // 移动到下一个节点
  } while (p !== stop);

  return m; // 返回最终的连接点
}

/**
 * 检查顶点m的扇形是否包含顶点p的扇形（在相同坐标系中）
 * @param {Object} m - 第一个顶点
 * @param {Object} p - 第二个顶点
 * @returns {boolean} 如果m的扇形包含p的扇形返回true
 */
function sectorContainsSector(m, p) {
  return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
}

/**
 * 按Z-order连接多边形节点
 * @param {Object} start - 起始节点
 * @param {number} minX - 边界框最小X值
 * @param {number} minY - 边界框最小Y值
 * @param {number} invSize - 逆缩放因子
 */
function indexCurve(start, minX, minY, invSize) {
  let p = start; // 当前处理的节点
  do {
    if (p.z === 0) p.z = zOrder(p.x, p.y, minX, minY, invSize); // 计算Z-order值
    p.prevZ = p.prev; // 设置Z-order链表的前向指针
    p.nextZ = p.next; // 设置Z-order链表的后向指针
    p = p.next; // 移动到下一个节点
  } while (p !== start);

  p.prevZ.nextZ = null; // 断开循环链表，准备排序
  p.prevZ = null; // 清空前向指针

  sortLinked(p); // 对Z-order链表进行排序
}

/**
 * Simon Tatham的链表归并排序算法
 * 参考：http://www.chiark.greenend.org.uk/~sgtatham/algorithms/listsort.html
 * @param {Object} list - 要排序的链表
 * @returns {Object} 排序后的链表头节点
 */
function sortLinked(list) {
  let numMerges; // 合并次数
  let inSize = 1; // 初始子列表大小

  do {
    let p = list; // 当前处理的节点
    let e; // 当前选择的元素
    list = null; // 重置链表头
    let tail = null; // 链表尾部
    numMerges = 0; // 重置合并计数

    while (p) {
      numMerges++; // 增加合并计数
      let q = p; // 第二个子列表的起始点
      let pSize = 0; // 第一个子列表的大小

      // 找到第二个子列表的起始位置
      for (let i = 0; i < inSize; i++) {
        pSize++;
        q = q.nextZ;
        if (!q) break; // 如果到达链表末尾，退出
      }
      let qSize = inSize; // 第二个子列表的大小

      // 合并两个子列表
      while (pSize > 0 || (qSize > 0 && q)) {
        if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {
          e = p; // 选择第一个子列表的元素
          p = p.nextZ; // 移动第一个子列表指针
          pSize--; // 减少第一个子列表大小
        } else {
          e = q; // 选择第二个子列表的元素
          q = q.nextZ; // 移动第二个子列表指针
          qSize--; // 减少第二个子列表大小
        }

        // 将选择的元素添加到结果链表
        if (tail) tail.nextZ = e; // 连接到尾部
        else list = e; // 设置为链表头

        e.prevZ = tail; // 设置前向指针
        tail = e; // 更新尾部指针
      }

      p = q; // 移动到下一对子列表
    }

    tail.nextZ = null; // 设置链表尾部
    inSize *= 2; // 双倍子列表大小
  } while (numMerges > 1); // 继续直到只有一次合并

  return list; // 返回排序后的链表
}

/**
 * 根据给定坐标和数据边界框长边的逆值计算点的Z-order值
 * @param {number} x - 点的x坐标
 * @param {number} y - 点的y坐标
 * @param {number} minX - 边界框最小X值
 * @param {number} minY - 边界框最小Y值
 * @param {number} invSize - 逆缩放因子
 * @returns {number} Z-order值
 */
function zOrder(x, y, minX, minY, invSize) {
  // 将坐标转换为非负的15位整数范围
  x = ((x - minX) * invSize) | 0;
  y = ((y - minY) * invSize) | 0;

  // 使用位操作将x坐标的位分散开（Morton编码的一部分）
  x = (x | (x << 8)) & 0x00ff00ff; // 分散到16位
  x = (x | (x << 4)) & 0x0f0f0f0f; // 分散到8位
  x = (x | (x << 2)) & 0x33333333; // 分散到4位
  x = (x | (x << 1)) & 0x55555555; // 分散到2位

  // 使用位操作将y坐标的位分散开（Morton编码的一部分）
  y = (y | (y << 8)) & 0x00ff00ff; // 分散到16位
  y = (y | (y << 4)) & 0x0f0f0f0f; // 分散到8位
  y = (y | (y << 2)) & 0x33333333; // 分散到4位
  y = (y | (y << 1)) & 0x55555555; // 分散到2位

  // 交错x和y的位来创建Z-order（Morton）值
  return x | (y << 1);
}

/**
 * 找到多边形环的最左端节点
 * @param {Object} start - 起始节点
 * @returns {Object} 最左端的节点
 */
function getLeftmost(start) {
  let p = start, // 当前检查的节点
    leftmost = start; // 当前最左端的节点
  do {
    // 如果当前节点更靠左，或者x坐标相同但y坐标更小，则更新最左端节点
    if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) leftmost = p;
    p = p.next; // 移动到下一个节点
  } while (p !== start);

  return leftmost; // 返回最左端节点
}

/**
 * 检查点是否位于凸三角形内部
 * @param {number} ax - 三角形顶点A的x坐标
 * @param {number} ay - 三角形顶点A的y坐标
 * @param {number} bx - 三角形顶点B的x坐标
 * @param {number} by - 三角形顶点B的y坐标
 * @param {number} cx - 三角形顶点C的x坐标
 * @param {number} cy - 三角形顶点C的y坐标
 * @param {number} px - 测试点的x坐标
 * @param {number} py - 测试点的y坐标
 * @returns {boolean} 如果点在三角形内部返回true
 */
function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
  return (cx - px) * (ay - py) >= (ax - px) * (cy - py) && (ax - px) * (by - py) >= (bx - px) * (ay - py) && (bx - px) * (cy - py) >= (cx - px) * (by - py);
}

/**
 * 检查点是否位于凸三角形内部，但如果点等于三角形的第一个点则返回false
 * @param {number} ax - 三角形顶点A的x坐标
 * @param {number} ay - 三角形顶点A的y坐标
 * @param {number} bx - 三角形顶点B的x坐标
 * @param {number} by - 三角形顶点B的y坐标
 * @param {number} cx - 三角形顶点C的x坐标
 * @param {number} cy - 三角形顶点C的y坐标
 * @param {number} px - 测试点的x坐标
 * @param {number} py - 测试点的y坐标
 * @returns {boolean} 如果点在三角形内部且不等于第一个顶点返回true
 */
function pointInTriangleExceptFirst(ax, ay, bx, by, cx, cy, px, py) {
  return !(ax === px && ay === py) && pointInTriangle(ax, ay, bx, by, cx, cy, px, py);
}

/**
 * 检查两个多边形节点之间的对角线是否有效（位于多边形内部）
 * @param {Object} a - 第一个节点
 * @param {Object} b - 第二个节点
 * @returns {boolean} 如果对角线有效返回true
 */
function isValidDiagonal(a, b) {
  return (
    a.next.i !== b.i && // a的下一个节点不是b
    a.prev.i !== b.i && // a的前一个节点不是b
    !intersectsPolygon(a, b) && // 不与其他边相交
    ((locallyInside(a, b) && // 局部可见
      locallyInside(b, a) &&
      middleInside(a, b) && // 中点在多边形内部
      (area(a.prev, a, b.prev) || area(a, b.prev, b))) || // 不创建相对的扇形
      (equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0)) // 特殊的零长度情况
  );
}

/**
 * 计算三角形的有向面积
 * @param {Object} p - 第一个点
 * @param {Object} q - 第二个点
 * @param {Object} r - 第三个点
 * @returns {number} 三角形的有向面积
 */
function area(p, q, r) {
  return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

/**
 * 检查两个点是否相等
 * @param {Object} p1 - 第一个点
 * @param {Object} p2 - 第二个点
 * @returns {boolean} 如果两点相等返回true
 */
function equals(p1, p2) {
  return p1.x === p2.x && p1.y === p2.y;
}

/**
 * 检查两个线段是否相交
 * @param {Object} p1 - 第一个线段的起点
 * @param {Object} q1 - 第一个线段的终点
 * @param {Object} p2 - 第二个线段的起点
 * @param {Object} q2 - 第二个线段的终点
 * @returns {boolean} 如果两个线段相交返回true
 */
function intersects(p1, q1, p2, q2) {
  const o1 = sign(area(p1, q1, p2)); // 计算方向1
  const o2 = sign(area(p1, q1, q2)); // 计算方向2
  const o3 = sign(area(p2, q2, p1)); // 计算方向3
  const o4 = sign(area(p2, q2, q1)); // 计算方向4

  if (o1 !== o2 && o3 !== o4) return true; // 一般情况：方向不同则相交

  // 特殊情况：共线点的检查
  if (o1 === 0 && onSegment(p1, p2, q1)) return true; // p1, q1和p2共线且p2在p1q1上
  if (o2 === 0 && onSegment(p1, q2, q1)) return true; // p1, q1和q2共线且q2在p1q1上
  if (o3 === 0 && onSegment(p2, p1, q2)) return true; // p2, q2和p1共线且p1在p2q2上
  if (o4 === 0 && onSegment(p2, q1, q2)) return true; // p2, q2和q1共线且q1在p2q2上

  return false; // 不相交
}

/**
 * 对于共线的点p, q, r，检查点q是否位于线段pr上
 * @param {Object} p - 线段的起点
 * @param {Object} q - 要检查的点
 * @param {Object} r - 线段的终点
 * @returns {boolean} 如果点q在线段pr上返回true
 */
function onSegment(p, q, r) {
  return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
}

/**
 * 返回数字的符号
 * @param {number} num - 输入数字
 * @returns {number} 1表示正数，-1表示负数，0表示零
 */
function sign(num) {
  return num > 0 ? 1 : num < 0 ? -1 : 0;
}

/**
 * 检查多边形对角线是否与任何多边形线段相交
 * @param {Object} a - 对角线的起点
 * @param {Object} b - 对角线的终点
 * @returns {boolean} 如果对角线与多边形线段相交返回true
 */
function intersectsPolygon(a, b) {
  let p = a; // 当前检查的节点
  do {
    // 检查当前线段是否与对角线相交（排除端点）
    if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i && intersects(p, p.next, a, b)) return true;
    p = p.next; // 移动到下一个节点
  } while (p !== a);

  return false; // 没有相交
}

/**
 * 检查多边形对角线是否在多边形内部（局部检查）
 * @param {Object} a - 对角线的起点
 * @param {Object} b - 对角线的终点
 * @returns {boolean} 如果对角线在多边形内部返回true
 */
function locallyInside(a, b) {
  return area(a.prev, a, a.next) < 0 ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
}

/**
 * 检查多边形对角线的中点是否在多边形内部
 * @param {Object} a - 对角线的起点
 * @param {Object} b - 对角线的终点
 * @returns {boolean} 如果中点在多边形内部返回true
 */
function middleInside(a, b) {
  let p = a; // 当前检查的节点
  let inside = false; // 内部标记
  const px = (a.x + b.x) / 2; // 中点的x坐标
  const py = (a.y + b.y) / 2; // 中点的y坐标
  do {
    // 使用射线投射算法检查点是否在多边形内部
    if (p.y > py !== p.next.y > py && p.next.y !== p.y && px < ((p.next.x - p.x) * (py - p.y)) / (p.next.y - p.y) + p.x) inside = !inside;
    p = p.next; // 移动到下一个节点
  } while (p !== a);

  return inside; // 返回内部检查结果
}

/**
 * 用桥梁连接两个多边形顶点；如果顶点属于同一环，则将多边形分割为两部分；
 * 如果一个属于外环，另一个属于孔洞，则将它们合并为单环
 * @param {Object} a - 第一个顶点
 * @param {Object} b - 第二个顶点
 * @returns {Object} 新创建的节点
 */
function splitPolygon(a, b) {
  const a2 = createNode(a.i, a.x, a.y), // 创建a的副本
    b2 = createNode(b.i, b.x, b.y), // 创建b的副本
    an = a.next, // a的下一个节点
    bp = b.prev; // b的前一个节点

  a.next = b; // 连接a到b
  b.prev = a; // 连接b到a

  a2.next = an; // 连接a2到原来a的下一个节点
  an.prev = a2; // 反向连接

  b2.next = a2; // 连接b2到a2
  a2.prev = b2; // 反向连接

  bp.next = b2; // 连接原来b的前一个节点到b2
  b2.prev = bp; // 反向连接

  return b2; // 返回新创建的节点
}

/**
 * 创建一个节点并可选地将其与前一个节点链接（在循环双向链表中）
 * @param {number} i - 顶点在坐标数组中的索引
 * @param {number} x - x坐标
 * @param {number} y - y坐标
 * @param {Object} last - 前一个节点（可选）
 * @returns {Object} 新创建的节点
 */
function insertNode(i, x, y, last) {
  const p = createNode(i, x, y); // 创建新节点

  if (!last) {
    // 如果没有前一个节点，创建自循环
    p.prev = p;
    p.next = p;
  } else {
    // 插入到链表中
    p.next = last.next; // 设置下一个节点
    p.prev = last; // 设置前一个节点
    last.next.prev = p; // 更新原下一个节点的前向指针
    last.next = p; // 更新前一个节点的后向指针
  }
  return p; // 返回新节点
}

/**
 * 从链表中移除节点
 * @param {Object} p - 要移除的节点
 */
function removeNode(p) {
  p.next.prev = p.prev; // 更新下一个节点的前向指针
  p.prev.next = p.next; // 更新前一个节点的后向指针

  // 如果存在Z-order链表连接，也要更新
  if (p.prevZ) p.prevZ.nextZ = p.nextZ;
  if (p.nextZ) p.nextZ.prevZ = p.prevZ;
}

/**
 * 创建一个新的节点对象
 * @param {number} i - 顶点在坐标数组中的索引
 * @param {number} x - x坐标
 * @param {number} y - y坐标
 * @returns {Object} 新创建的节点对象
 */
function createNode(i, x, y) {
  return {
    i, // 顶点在坐标数组中的索引
    x,
    y, // 顶点坐标
    prev: null, // 多边形环中的前一个和下一个顶点节点
    next: null,
    z: 0, // Z-order曲线值
    prevZ: null, // Z-order中的前一个和下一个节点
    nextZ: null,
    steiner: false, // 指示这是否是Steiner点
  };
}

/**
 * 返回多边形面积与其三角剖分面积之间的百分比差异
 * 用于验证三角剖分的正确性
 * @param {Array} data - 顶点坐标数组
 * @param {Array} holeIndices - 孔洞起始索引数组
 * @param {number} dim - 每个顶点的维度数
 * @param {Array} triangles - 三角形索引数组
 * @returns {number} 面积差异的百分比
 */
export function deviation(data, holeIndices, dim, triangles) {
  const hasHoles = holeIndices && holeIndices.length; // 检查是否有孔洞
  const outerLen = hasHoles ? holeIndices[0] * dim : data.length; // 外轮廓长度

  // 计算多边形的总面积（外轮廓面积）
  let polygonArea = Math.abs(signedArea(data, 0, outerLen, dim));
  if (hasHoles) {
    // 减去所有孔洞的面积
    for (let i = 0, len = holeIndices.length; i < len; i++) {
      const start = holeIndices[i] * dim; // 孔洞起始位置
      const end = i < len - 1 ? holeIndices[i + 1] * dim : data.length; // 孔洞结束位置
      polygonArea -= Math.abs(signedArea(data, start, end, dim)); // 减去孔洞面积
    }
  }

  // 计算三角剖分的总面积
  let trianglesArea = 0;
  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i] * dim; // 第一个顶点的索引
    const b = triangles[i + 1] * dim; // 第二个顶点的索引
    const c = triangles[i + 2] * dim; // 第三个顶点的索引
    // 计算三角形面积并累加
    trianglesArea += Math.abs((data[a] - data[c]) * (data[b + 1] - data[a + 1]) - (data[a] - data[b]) * (data[c + 1] - data[a + 1]));
  }

  // 返回面积差异的百分比
  return polygonArea === 0 && trianglesArea === 0 ? 0 : Math.abs((trianglesArea - polygonArea) / polygonArea);
}

/**
 * 计算多边形的有向面积
 * @param {Array} data - 顶点坐标数组
 * @param {number} start - 起始索引
 * @param {number} end - 结束索引
 * @param {number} dim - 每个顶点的维度数
 * @returns {number} 有向面积
 */
function signedArea(data, start, end, dim) {
  let sum = 0; // 面积累加器
  for (let i = start, j = end - dim; i < end; i += dim) {
    // 使用鞋带公式计算有向面积
    sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
    j = i; // 更新前一个顶点的索引
  }
  return sum; // 返回有向面积
}

/**
 * 将多维数组形式的多边形（如GeoJSON格式）转换为Earcut接受的形式
 * @param {Array} data - 多维数组形式的多边形数据
 * @returns {Object} 包含vertices、holes和dimensions的对象
 */
export function flatten(data) {
  const vertices = []; // 扁平化的顶点数组
  const holes = []; // 孔洞索引数组
  const dimensions = data[0][0].length; // 顶点的维度数
  let holeIndex = 0; // 当前孔洞索引
  let prevLen = 0; // 前一个环的长度

  // 遍历所有环（外轮廓和孔洞）
  for (const ring of data) {
    // 遍历环中的每个点
    for (const p of ring) {
      // 将点的所有坐标添加到vertices数组
      for (let d = 0; d < dimensions; d++) vertices.push(p[d]);
    }
    if (prevLen) {
      // 如果不是第一个环，记录孔洞的起始索引
      holeIndex += prevLen;
      holes.push(holeIndex);
    }
    prevLen = ring.length; // 更新前一个环的长度
  }
  return { vertices, holes, dimensions }; // 返回扁平化的数据
}
