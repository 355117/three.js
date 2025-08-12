// 导入线条基类
import { Line } from "./Line.js";
// 导入三维向量类，用于计算线段距离
import { Vector3 } from "../math/Vector3.js";
// 导入浮点数缓冲属性类，用于存储线段距离数据
import { Float32BufferAttribute } from "../core/BufferAttribute.js";

// 用于计算线段距离的临时向量（线段起点）
const _start = /*@__PURE__*/ new Vector3();
// 用于计算线段距离的临时向量（线段终点）
const _end = /*@__PURE__*/ new Vector3();

/**
 * 线段对象，用于绘制一系列独立的线段
 * 顶点按对处理，每两个顶点形成一条独立的线段，不会连接相邻的线段。
 * 常用于绘制网格线、坐标轴、边框等需要独立线段的场景。
 *
 * @augments Line
 */
class LineSegments extends Line {
  /**
   * 构造一个新的线段对象
   *
   * @param {BufferGeometry} [geometry] - 线段的几何体，包含顶点位置等数据
   * @param {Material|Array<Material>} [material] - 线段的材质，可以是单个材质或材质数组
   */
  constructor(geometry, material) {
    // 调用父类构造函数，初始化基础线条属性
    super(geometry, material);

    /**
     * 用于类型检测的标志
     * 可以通过此属性判断对象是否为线段对象
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isLineSegments = true;

    /**
     * 对象类型标识
     * 用于序列化和调试时识别对象类型
     *
     * @type {string}
     */
    this.type = "LineSegments";
  }

  /**
   * 计算线段距离并将其存储为几何体属性
   * 为每个顶点计算从起始点到该点的累积距离，用于支持虚线材质等需要距离信息的效果。
   * 注意：此方法仅适用于非索引几何体。
   *
   * @return {LineSegments} 返回当前线段对象，支持链式调用
   */
  computeLineDistances() {
    // 获取几何体引用
    const geometry = this.geometry;

    // 假设使用非索引几何体（顶点数据直接存储，不使用索引）

    if (geometry.index === null) {
      // 获取位置属性，包含所有顶点的坐标信息
      const positionAttribute = geometry.attributes.position;
      // 用于存储每个顶点的累积距离
      const lineDistances = [];

      // 遍历所有顶点，每次处理一对顶点（一条线段）
      for (let i = 0, l = positionAttribute.count; i < l; i += 2) {
        // 从缓冲属性中获取线段起点坐标
        _start.fromBufferAttribute(positionAttribute, i);
        // 从缓冲属性中获取线段终点坐标
        _end.fromBufferAttribute(positionAttribute, i + 1);

        // 设置起点的累积距离（第一个点为0，其他点继承前一个点的距离）
        lineDistances[i] = i === 0 ? 0 : lineDistances[i - 1];
        // 计算终点的累积距离（起点距离 + 当前线段长度）
        lineDistances[i + 1] = lineDistances[i] + _start.distanceTo(_end);
      }

      // 将计算出的距离数组设置为几何体的lineDistance属性
      geometry.setAttribute("lineDistance", new Float32BufferAttribute(lineDistances, 1));
    } else {
      // 对于索引几何体，暂不支持距离计算，输出警告信息
      console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");
    }

    // 返回当前对象，支持链式调用
    return this;
  }
}

// 导出线段类
export { LineSegments };
