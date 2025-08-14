// 导入必要的Three.js核心模块
import { BufferGeometry } from "../core/BufferGeometry.js"; // 导入缓冲几何体基类
import { Float32BufferAttribute } from "../core/BufferAttribute.js"; // 导入32位浮点数缓冲属性类
import { Vector3 } from "../math/Vector3.js"; // 导入三维向量类

/**
 * 环面结几何体类
 * 创建环面结，其特定形状由一对互质整数p和q定义。
 * 如果p和q不互质，结果将是环面链。
 *
 * 使用示例：
 * ```js
 * const geometry = new THREE.TorusKnotGeometry( 10, 3, 100, 16 );
 * const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
 * const torusKnot = new THREE.Mesh( geometry, material );
 * scene.add( torusKnot );
 * ```
 *
 * @augments BufferGeometry
 */
class TorusKnotGeometry extends BufferGeometry {
  /**
   * 构造一个新的环面结几何体
   *
   * @param {number} [radius=1] - 环面结的半径
   * @param {number} [tube=0.4] - 管道的半径
   * @param {number} [tubularSegments=64] - 管状分段数
   * @param {number} [radialSegments=8] - 径向分段数
   * @param {number} [p=2] - 此值决定几何体围绕其旋转对称轴缠绕的次数
   * @param {number} [q=3] - 此值决定几何体围绕环面内部圆圈缠绕的次数
   */
  constructor(radius = 1, tube = 0.4, tubularSegments = 64, radialSegments = 8, p = 2, q = 3) {
    // 调用父类构造函数
    super();

    // 设置几何体类型标识
    this.type = "TorusKnotGeometry";

    /**
     * 保存用于生成几何体的构造函数参数
     * 实例化后的任何修改都不会改变几何体
     *
     * @type {Object}
     */
    this.parameters = {
      radius: radius, // 环面结半径
      tube: tube, // 管道半径
      tubularSegments: tubularSegments, // 管状分段数
      radialSegments: radialSegments, // 径向分段数
      p: p, // 旋转对称轴缠绕次数
      q: q, // 内部圆圈缠绕次数
    };

    // 确保分段数为整数
    tubularSegments = Math.floor(tubularSegments); // 管状分段数取整
    radialSegments = Math.floor(radialSegments); // 径向分段数取整

    // 缓冲区数组

    const indices = []; // 索引数组
    const vertices = []; // 顶点坐标数组
    const normals = []; // 法线数组
    const uvs = []; // UV纹理坐标数组

    // 辅助变量

    const vertex = new Vector3(); // 当前顶点向量
    const normal = new Vector3(); // 当前法线向量

    const P1 = new Vector3(); // 曲线上的当前点
    const P2 = new Vector3(); // 曲线上稍微靠前的点

    const B = new Vector3(); // 副法线向量（Binormal）
    const T = new Vector3(); // 切线向量（Tangent）
    const N = new Vector3(); // 法线向量（Normal）

    // 生成顶点、法线和UV坐标

    for (let i = 0; i <= tubularSegments; ++i) {
      // 遍历管状分段
      // 弧度"u"用于计算当前管状分段在环面结曲线上的位置

      const u = (i / tubularSegments) * p * Math.PI * 2;

      // 现在我们计算两个点。P1是我们在曲线上的当前位置，P2是稍微靠前的位置。
      // 这些点用于创建一个特殊的"坐标空间"，这对于计算正确的顶点位置是必要的

      calculatePositionOnCurve(u, p, q, radius, P1); // 计算当前位置
      calculatePositionOnCurve(u + 0.01, p, q, radius, P2); // 计算稍微靠前的位置

      // 计算正交标准基

      T.subVectors(P2, P1); // 切线向量 = P2 - P1
      N.addVectors(P2, P1); // 临时向量 = P2 + P1
      B.crossVectors(T, N); // 副法线向量 = T × N
      N.crossVectors(B, T); // 法线向量 = B × T

      // 标准化B和N向量。T可以忽略，我们不使用它

      B.normalize(); // 标准化副法线向量
      N.normalize(); // 标准化法线向量

      for (let j = 0; j <= radialSegments; ++j) {
        // 遍历径向分段
        // 现在计算顶点。它们只不过是环面结曲线的挤出。
        // 因为我们在xy平面上挤出形状，所以不需要计算z值。

        const v = (j / radialSegments) * Math.PI * 2; // 径向角度参数
        const cx = -tube * Math.cos(v); // 挤出圆的X坐标
        const cy = tube * Math.sin(v); // 挤出圆的Y坐标

        // 现在计算最终的顶点位置。
        // 首先我们用基向量定向挤出，然后将其添加到曲线上的当前位置

        vertex.x = P1.x + (cx * N.x + cy * B.x); // 最终X坐标
        vertex.y = P1.y + (cx * N.y + cy * B.y); // 最终Y坐标
        vertex.z = P1.z + (cx * N.z + cy * B.z); // 最终Z坐标

        vertices.push(vertex.x, vertex.y, vertex.z); // 添加顶点坐标到数组

        // 法线（P1始终是挤出的中心/原点，因此我们可以用它来计算法线）

        normal.subVectors(vertex, P1).normalize(); // 从中心点指向顶点的单位向量

        normals.push(normal.x, normal.y, normal.z); // 添加法线到数组

        // UV纹理坐标

        uvs.push(i / tubularSegments); // U坐标（管状方向）
        uvs.push(j / radialSegments); // V坐标（径向方向）
      }
    }

    // 生成索引数组

    for (let j = 1; j <= tubularSegments; j++) {
      // 遍历管状分段
      for (let i = 1; i <= radialSegments; i++) {
        // 遍历径向分段
        // 计算四边形的四个顶点索引

        const a = (radialSegments + 1) * (j - 1) + (i - 1); // 前一管状层的前一径向位置
        const b = (radialSegments + 1) * j + (i - 1); // 当前管状层的前一径向位置
        const c = (radialSegments + 1) * j + i; // 当前管状层的当前径向位置
        const d = (radialSegments + 1) * (j - 1) + i; // 前一管状层的当前径向位置

        // 将四边形分解为两个三角面

        indices.push(a, b, d); // 第一个三角形：a-b-d
        indices.push(b, c, d); // 第二个三角形：b-c-d
      }
    }

    // 构建几何体

    this.setIndex(indices); // 设置索引数组
    this.setAttribute("position", new Float32BufferAttribute(vertices, 3)); // 设置位置属性（每个顶点3个分量：x,y,z）
    this.setAttribute("normal", new Float32BufferAttribute(normals, 3)); // 设置法线属性（每个顶点3个分量：nx,ny,nz）
    this.setAttribute("uv", new Float32BufferAttribute(uvs, 2)); // 设置UV纹理坐标属性（每个顶点2个分量：u,v）

    // 辅助函数：计算环面结曲线上当前位置的坐标

    /**
     * 计算环面结曲线上指定参数位置的坐标
     * @param {number} u - 参数u（弧度）
     * @param {number} p - 旋转对称轴缠绕次数
     * @param {number} q - 内部圆圈缠绕次数
     * @param {number} radius - 环面结半径
     * @param {Vector3} position - 用于存储结果的向量对象
     */
    function calculatePositionOnCurve(u, p, q, radius, position) {
      const cu = Math.cos(u); // cos(u)
      const su = Math.sin(u); // sin(u)
      const quOverP = (q / p) * u; // (q/p) * u
      const cs = Math.cos(quOverP); // cos((q/p) * u)

      // 环面结的参数方程
      position.x = radius * (2 + cs) * 0.5 * cu; // X坐标
      position.y = radius * (2 + cs) * su * 0.5; // Y坐标
      position.z = radius * Math.sin(quOverP) * 0.5; // Z坐标
    }
  }

  /**
   * 复制方法 - 从另一个几何体复制属性
   * @param {TorusKnotGeometry} source - 源几何体对象
   * @return {TorusKnotGeometry} 返回当前对象以支持链式调用
   */
  copy(source) {
    super.copy(source); // 调用父类的复制方法

    this.parameters = Object.assign({}, source.parameters); // 深拷贝参数对象

    return this; // 返回当前对象
  }

  /**
   * 从JSON数据创建几何体实例的工厂方法
   *
   * @param {Object} data - 表示序列化几何体的JSON对象
   * @return {TorusKnotGeometry} 新的几何体实例
   */
  static fromJSON(data) {
    return new TorusKnotGeometry(data.radius, data.tube, data.tubularSegments, data.radialSegments, data.p, data.q); // 使用JSON数据创建新实例
  }
}

// 导出环面结几何体类供外部使用
export { TorusKnotGeometry };
