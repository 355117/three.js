// 导入32位浮点数缓冲属性类
import { Float32BufferAttribute } from "../core/BufferAttribute.js";
// 导入缓冲几何体基类
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入三维向量类
import { Vector3 } from "../math/Vector3.js";
// 导入二维向量类
import { Vector2 } from "../math/Vector2.js";
// 导入数学工具函数中的限制函数
import { clamp } from "../math/MathUtils.js";

/**
 * 创建具有轴对称性的网格，如花瓶。车床几何体围绕Y轴旋转。
 * 通过将2D轮廓绕Y轴旋转来生成3D几何体。
 *
 * ```js
 * const points = [];
 * for ( let i = 0; i < 10; i ++ ) {
 * 	points.push( new THREE.Vector2( Math.sin( i * 0.2 ) * 10 + 5, ( i - 5 ) * 2 ) );
 * }
 * const geometry = new THREE.LatheGeometry( points );
 * const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
 * const lathe = new THREE.Mesh( geometry, material );
 * scene.add( lathe );
 * ```
 *
 * @augments BufferGeometry
 */
class LatheGeometry extends BufferGeometry {
  /**
   * 构造一个新的车床几何体。
   *
   * @param {Array<Vector2|Vector3>} [points] - 2D空间中的点数组。每个点的x坐标
   * 必须大于零。
   * @param {number} [segments=12] - 要生成的圆周分段数。
   * @param {number} [phiStart=0] - 起始角度（弧度）。
   * @param {number} [phiLength=Math.PI*2] - 车床截面的弧度范围（0到2PI），
   * 2PI是闭合车床，小于2PI是部分车床。
   */
  constructor(points = [new Vector2(0, -0.5), new Vector2(0.5, 0), new Vector2(0, 0.5)], segments = 12, phiStart = 0, phiLength = Math.PI * 2) {
    // 调用父类构造函数
    super();

    // 设置几何体类型标识
    this.type = "LatheGeometry";

    /**
     * 保存用于生成几何体的构造函数参数。
     * 实例化后的任何修改都不会改变几何体。
     *
     * @type {Object}
     */
    this.parameters = {
      points: points, // 保存轮廓点数组
      segments: segments, // 保存分段数
      phiStart: phiStart, // 保存起始角度
      phiLength: phiLength, // 保存角度范围
    };

    // 将分段数向下取整，确保为整数
    segments = Math.floor(segments);

    // 将角度范围限制在[0, 2PI]范围内
    phiLength = clamp(phiLength, 0, Math.PI * 2);

    // 缓冲区数组，用于存储几何体数据

    const indices = []; // 存储三角形索引
    const vertices = []; // 存储顶点坐标
    const uvs = []; // 存储UV纹理坐标
    const initNormals = []; // 存储初始法向量
    const normals = []; // 存储最终法向量

    // 辅助变量

    const inverseSegments = 1.0 / segments; // 分段的倒数，用于计算UV坐标
    const vertex = new Vector3(); // 临时顶点向量
    const uv = new Vector2(); // 临时UV坐标向量
    const normal = new Vector3(); // 临时法向量
    const curNormal = new Vector3(); // 当前法向量
    const prevNormal = new Vector3(); // 前一个法向量
    let dx = 0; // X方向的差值
    let dy = 0; // Y方向的差值

    // 为初始"经线"预计算法向量
    // 经线是指从轮廓点生成的初始法向量，后续会旋转这些法向量

    for (let j = 0; j <= points.length - 1; j++) {
      switch (j) {
        case 0: // 对路径上第一个顶点的特殊处理
          // 计算第一个点到第二个点的方向向量
          dx = points[j + 1].x - points[j].x;
          dy = points[j + 1].y - points[j].y;

          // 计算垂直于路径方向的法向量
          // 通过将方向向量旋转90度得到法向量
          normal.x = dy * 1.0; // 法向量X分量
          normal.y = -dx; // 法向量Y分量
          normal.z = dy * 0.0; // 法向量Z分量（在XY平面内为0）

          // 保存当前法向量作为前一个法向量
          prevNormal.copy(normal);

          // 标准化法向量
          normal.normalize();

          // 将计算出的法向量添加到初始法向量数组中
          initNormals.push(normal.x, normal.y, normal.z);

          break;

        case points.length - 1: // 对路径上最后一个顶点的特殊处理
          // 最后一个顶点直接使用前一个法向量
          initNormals.push(prevNormal.x, prevNormal.y, prevNormal.z);

          break;

        default: // 对中间所有顶点的默认处理
          // 计算当前点到下一个点的方向向量
          dx = points[j + 1].x - points[j].x;
          dy = points[j + 1].y - points[j].y;

          // 计算当前段的法向量
          normal.x = dy * 1.0;
          normal.y = -dx;
          normal.z = dy * 0.0;

          // 保存当前法向量
          curNormal.copy(normal);

          // 将当前法向量与前一个法向量相加，实现平滑过渡
          normal.x += prevNormal.x;
          normal.y += prevNormal.y;
          normal.z += prevNormal.z;

          // 标准化合成后的法向量
          normal.normalize();

          // 将平滑后的法向量添加到初始法向量数组中
          initNormals.push(normal.x, normal.y, normal.z);

          // 更新前一个法向量为当前法向量
          prevNormal.copy(curNormal);
      }
    }

    // 生成顶点、UV坐标和法向量
    // 通过旋转轮廓点来创建3D几何体

    // 遍历每个圆周分段
    for (let i = 0; i <= segments; i++) {
      // 计算当前分段的角度
      const phi = phiStart + i * inverseSegments * phiLength;

      // 计算角度的正弦和余弦值，用于旋转变换
      const sin = Math.sin(phi);
      const cos = Math.cos(phi);

      // 遍历轮廓上的每个点
      for (let j = 0; j <= points.length - 1; j++) {
        // 计算顶点坐标
        // 将2D轮廓点绕Y轴旋转生成3D顶点

        vertex.x = points[j].x * sin; // X坐标：半径乘以正弦值
        vertex.y = points[j].y; // Y坐标：保持不变（旋转轴）
        vertex.z = points[j].x * cos; // Z坐标：半径乘以余弦值

        // 将顶点坐标添加到顶点数组中
        vertices.push(vertex.x, vertex.y, vertex.z);

        // 计算UV纹理坐标
        // UV坐标用于纹理映射

        uv.x = i / segments; // U坐标：基于圆周分段的比例
        uv.y = j / (points.length - 1); // V坐标：基于轮廓点的比例

        // 将UV坐标添加到UV数组中
        uvs.push(uv.x, uv.y);

        // 计算法向量
        // 将初始法向量绕Y轴旋转

        const x = initNormals[3 * j + 0] * sin; // 旋转后的X分量
        const y = initNormals[3 * j + 1]; // Y分量保持不变
        const z = initNormals[3 * j + 0] * cos; // 旋转后的Z分量

        // 将法向量添加到法向量数组中
        normals.push(x, y, z);
      }
    }

    // 生成三角形索引
    // 连接相邻的顶点形成三角形面

    // 遍历每个分段，生成四边形面（分解为两个三角形）
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < points.length - 1; j++) {
        // 计算当前四边形的基础索引
        const base = j + i * points.length;

        // 定义四边形的四个顶点索引
        const a = base; // 当前分段的当前点
        const b = base + points.length; // 下一个分段的当前点
        const c = base + points.length + 1; // 下一个分段的下一个点
        const d = base + 1; // 当前分段的下一个点

        // 生成三角形面
        // 将四边形分解为两个三角形

        indices.push(a, b, d); // 第一个三角形：a-b-d
        indices.push(c, d, b); // 第二个三角形：c-d-b
      }
    }

    // 构建几何体
    // 设置几何体的各种属性

    this.setIndex(indices); // 设置索引缓冲区
    this.setAttribute("position", new Float32BufferAttribute(vertices, 3)); // 设置位置属性（每个顶点3个分量）
    this.setAttribute("uv", new Float32BufferAttribute(uvs, 2)); // 设置UV属性（每个顶点2个分量）
    this.setAttribute("normal", new Float32BufferAttribute(normals, 3)); // 设置法向量属性（每个顶点3个分量）
  }

  /**
   * 复制源几何体的属性到当前几何体。
   *
   * @param {LatheGeometry} source - 要复制的源几何体。
   * @return {LatheGeometry} 返回当前几何体实例，支持链式调用。
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 复制构造参数
    this.parameters = Object.assign({}, source.parameters);

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 从给定的JSON对象创建此类实例的工厂方法。
   *
   * @param {Object} data - 表示序列化几何体的JSON对象。
   * @return {LatheGeometry} 一个新的实例。
   */
  static fromJSON(data) {
    // 使用JSON数据中的参数创建新的车床几何体实例
    return new LatheGeometry(data.points, data.segments, data.phiStart, data.phiLength);
  }
}

// 导出车床几何体类
export { LatheGeometry };
