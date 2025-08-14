// 导入线段对象类，用于创建由多个线段组成的几何体
import { LineSegments } from "../objects/LineSegments.js";
// 导入基础线材质类，用于定义线条的外观
import { LineBasicMaterial } from "../materials/LineBasicMaterial.js";
// 导入32位浮点数缓冲属性类，用于存储顶点数据
import { Float32BufferAttribute } from "../core/BufferAttribute.js";
// 导入缓冲几何体类，用于高效存储几何数据
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入颜色类，用于处理颜色相关操作
import { Color } from "../math/Color.js";

/**
 * 用于以简单方式可视化3个坐标轴的轴对象。
 * X轴为红色，Y轴为绿色，Z轴为蓝色。
 *
 * ```js
 * const axesHelper = new THREE.AxesHelper( 5 );
 * scene.add( axesHelper );
 * ```
 *
 * @augments LineSegments
 */
class AxesHelper extends LineSegments {
  /**
   * 构造一个新的坐标轴辅助器。
   *
   * @param {number} [size=1] - 表示坐标轴的线条长度。
   */
  constructor(size = 1) {
    // 定义顶点坐标数组：原点到X轴终点，原点到Y轴终点，原点到Z轴终点
    const vertices = [0, 0, 0, size, 0, 0, 0, 0, 0, 0, size, 0, 0, 0, 0, 0, 0, size];

    // 定义颜色数组：X轴红色，Y轴绿色，Z轴蓝色（每个轴两个顶点的颜色）
    const colors = [1, 0, 0, 1, 0.6, 0, 0, 1, 0, 0.6, 1, 0, 0, 0, 1, 0, 0.6, 1];

    // 创建缓冲几何体对象
    const geometry = new BufferGeometry();
    // 设置位置属性，每3个数值表示一个顶点的xyz坐标
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    // 设置颜色属性，每3个数值表示一个顶点的rgb颜色
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));

    // 创建线材质，启用顶点颜色，禁用色调映射
    const material = new LineBasicMaterial({ vertexColors: true, toneMapped: false });

    // 调用父类构造函数，传入几何体和材质
    super(geometry, material);

    // 设置对象类型标识
    this.type = "AxesHelper";
  }

  /**
   * 定义坐标轴辅助器的颜色。
   *
   * @param {number|Color|string} xAxisColor - X轴的颜色。
   * @param {number|Color|string} yAxisColor - Y轴的颜色。
   * @param {number|Color|string} zAxisColor - Z轴的颜色。
   * @return {AxesHelper} 返回此坐标轴辅助器的引用。
   */
  setColors(xAxisColor, yAxisColor, zAxisColor) {
    // 创建颜色对象用于颜色转换
    const color = new Color();
    // 获取几何体颜色属性的数组引用
    const array = this.geometry.attributes.color.array;

    // 设置X轴颜色并写入数组的对应位置（索引0和3）
    color.set(xAxisColor);
    color.toArray(array, 0); // X轴起点颜色
    color.toArray(array, 3); // X轴终点颜色

    // 设置Y轴颜色并写入数组的对应位置（索引6和9）
    color.set(yAxisColor);
    color.toArray(array, 6); // Y轴起点颜色
    color.toArray(array, 9); // Y轴终点颜色

    // 设置Z轴颜色并写入数组的对应位置（索引12和15）
    color.set(zAxisColor);
    color.toArray(array, 12); // Z轴起点颜色
    color.toArray(array, 15); // Z轴终点颜色

    // 标记颜色属性需要更新到GPU
    this.geometry.attributes.color.needsUpdate = true;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 释放此实例分配的GPU相关资源。当此实例在应用中不再使用时调用此方法。
   */
  dispose() {
    // 释放几何体资源
    this.geometry.dispose();
    // 释放材质资源
    this.material.dispose();
  }
}

// 导出AxesHelper类
export { AxesHelper };
