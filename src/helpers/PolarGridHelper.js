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
 * 此辅助器是一个用于定义极坐标网格的对象。网格是由线条组成的二维数组。
 *
 * 使用示例：
 * ```js
 * const radius = 10;      // 半径
 * const sectors = 16;     // 扇形数量
 * const rings = 8;        // 环数
 * const divisions = 64;   // 每个圆的线段数
 *
 * const helper = new THREE.PolarGridHelper( radius, sectors, rings, divisions );
 * scene.add( helper );
 * ```
 *
 * @augments LineSegments
 */
class PolarGridHelper extends LineSegments {
  /**
   * 构造一个新的极坐标网格辅助器
   *
   * @param {number} [radius=10] - 极坐标网格的半径，可以是任何正数
   * @param {number} [sectors=16] - 网格将被分割的扇形数量，可以是任何正整数
   * @param {number} [rings=16] - 环的数量，可以是任何正整数
   * @param {number} [divisions=64] - 每个圆使用的线段数量，可以是任何正整数
   * @param {number|Color|string} [color1=0x444444] - 网格元素使用的第一种颜色
   * @param {number|Color|string} [color2=0x888888] - 网格元素使用的第二种颜色
   */
  constructor(radius = 10, sectors = 16, rings = 8, divisions = 64, color1 = 0x444444, color2 = 0x888888) {
    // 将颜色参数转换为Color对象
    color1 = new Color(color1);
    color2 = new Color(color2);

    // 初始化顶点数组和颜色数组
    const vertices = [];
    const colors = [];

    // 创建扇形线条
    if (sectors > 1) {
      // 遍历每个扇形
      for (let i = 0; i < sectors; i++) {
        // 计算当前扇形的角度（弧度）
        const v = (i / sectors) * (Math.PI * 2);

        // 计算扇形线条终点的x和z坐标
        const x = Math.sin(v) * radius;
        const z = Math.cos(v) * radius;

        // 添加从中心点到边缘的线条顶点
        vertices.push(0, 0, 0); // 中心点
        vertices.push(x, 0, z); // 边缘点

        // 根据扇形索引交替使用两种颜色
        const color = i & 1 ? color1 : color2;

        // 为线条的两个端点添加颜色
        colors.push(color.r, color.g, color.b);
        colors.push(color.r, color.g, color.b);
      }
    }

    // 创建环形线条
    for (let i = 0; i < rings; i++) {
      // 根据环的索引交替使用两种颜色
      const color = i & 1 ? color1 : color2;

      // 计算当前环的半径
      const r = radius - (radius / rings) * i;

      // 为每个环创建线段
      for (let j = 0; j < divisions; j++) {
        // 第一个顶点
        // 计算当前分割点的角度
        let v = (j / divisions) * (Math.PI * 2);

        // 计算第一个顶点的x和z坐标
        let x = Math.sin(v) * r;
        let z = Math.cos(v) * r;

        // 添加第一个顶点和颜色
        vertices.push(x, 0, z);
        colors.push(color.r, color.g, color.b);

        // 第二个顶点
        // 计算下一个分割点的角度
        v = ((j + 1) / divisions) * (Math.PI * 2);

        // 计算第二个顶点的x和z坐标
        x = Math.sin(v) * r;
        z = Math.cos(v) * r;

        // 添加第二个顶点和颜色
        vertices.push(x, 0, z);
        colors.push(color.r, color.g, color.b);
      }
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
    this.type = "PolarGridHelper";
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

// 导出PolarGridHelper类
export { PolarGridHelper };
