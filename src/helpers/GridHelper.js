// 导入LineSegments类，用于创建线段对象
import { LineSegments } from "../objects/LineSegments.js";
// 导入LineBasicMaterial类，用于创建基础线材质
import { LineBasicMaterial } from "../materials/LineBasicMaterial.js";
// 导入Float32BufferAttribute类，用于创建32位浮点数缓冲区属性
import { Float32BufferAttribute } from "../core/BufferAttribute.js";
// 导入BufferGeometry类，用于创建缓冲几何体
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入Color类，用于处理颜色
import { Color } from "../math/Color.js";

/**
 * 网格辅助器是一个用于定义网格的对象。网格是由线条组成的二维数组。
 *
 * 使用示例：
 * ```js
 * const size = 10;        // 网格大小
 * const divisions = 10;   // 网格分割数
 *
 * const gridHelper = new THREE.GridHelper( size, divisions );
 * scene.add( gridHelper );
 * ```
 *
 * @augments LineSegments
 */
class GridHelper extends LineSegments {
  /**
   * 构造一个新的网格辅助器
   *
   * @param {number} [size=10] - 网格的大小
   * @param {number} [divisions=10] - 网格的分割数量
   * @param {number|Color|string} [color1=0x444444] - 中心线的颜色
   * @param {number|Color|string} [color2=0x888888] - 网格线的颜色
   */
  constructor(size = 10, divisions = 10, color1 = 0x444444, color2 = 0x888888) {
    // 将颜色参数转换为Color对象
    color1 = new Color(color1);
    color2 = new Color(color2);

    // 计算网格中心位置
    const center = divisions / 2;
    // 计算每个分割的步长
    const step = size / divisions;
    // 计算网格的一半大小
    const halfSize = size / 2;

    // 初始化顶点数组和颜色数组
    const vertices = [],
      colors = [];

    // 循环生成网格线的顶点和颜色
    for (let i = 0, j = 0, k = -halfSize; i <= divisions; i++, k += step) {
      // 添加水平线的顶点（从左到右）
      vertices.push(-halfSize, 0, k, halfSize, 0, k);
      // 添加垂直线的顶点（从前到后）
      vertices.push(k, 0, -halfSize, k, 0, halfSize);

      // 根据是否为中心线选择颜色
      const color = i === center ? color1 : color2;

      // 将颜色添加到颜色数组中，每条线需要4个颜色值（两个端点，每个端点两次）
      color.toArray(colors, j);
      j += 3;
      color.toArray(colors, j);
      j += 3;
      color.toArray(colors, j);
      j += 3;
      color.toArray(colors, j);
      j += 3;
    }

    // 创建缓冲几何体
    const geometry = new BufferGeometry();
    // 设置位置属性，每个顶点包含3个坐标值(x, y, z)
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    // 设置颜色属性，每个顶点包含3个颜色值(r, g, b)
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));

    // 创建线材质，启用顶点颜色，禁用色调映射
    const material = new LineBasicMaterial({ vertexColors: true, toneMapped: false });

    // 调用父类构造函数
    super(geometry, material);

    // 设置对象类型标识
    this.type = "GridHelper";
  }

  /**
   * 释放此实例分配的GPU相关资源。当应用程序中不再使用此实例时，
   * 应调用此方法以避免内存泄漏。
   */
  dispose() {
    // 释放几何体资源
    this.geometry.dispose();
    // 释放材质资源
    this.material.dispose();
  }
}

// 导出GridHelper类
export { GridHelper };
