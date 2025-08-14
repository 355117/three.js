// 导入必要的Three.js核心模块
import { BufferGeometry } from "../core/BufferGeometry.js"; // 导入缓冲几何体基类
import { Float32BufferAttribute } from "../core/BufferAttribute.js"; // 导入32位浮点数缓冲属性类
import { Vector3 } from "../math/Vector3.js"; // 导入三维向量类
import { Vector2 } from "../math/Vector2.js"; // 导入二维向量类

/**
 * 多面体几何体类
 * 多面体是三维空间中具有平面的立体。此类将接受一个顶点数组，
 * 将它们投影到球面上，然后根据所需的细节级别进行细分。
 *
 * @augments BufferGeometry
 */
class PolyhedronGeometry extends BufferGeometry {
  /**
   * 构造一个新的多面体几何体
   *
   * @param {Array<number>} [vertices] - 描述基础形状的顶点平面数组
   * @param {Array<number>} [indices] - 描述基础形状的索引平面数组
   * @param {number} [radius=1] - 形状的半径
   * @param {number} [detail=0] - 细分几何体的级别数。细节越多，形状越平滑
   */
  constructor(vertices = [], indices = [], radius = 1, detail = 0) {
    // 调用父类构造函数
    super();

    // 设置几何体类型标识
    this.type = "PolyhedronGeometry";

    /**
     * 保存用于生成几何体的构造函数参数
     * 实例化后的任何修改都不会改变几何体
     *
     * @type {Object}
     */
    this.parameters = {
      vertices: vertices, // 顶点数组
      indices: indices, // 索引数组
      radius: radius, // 半径
      detail: detail, // 细节级别
    };

    // 默认缓冲区数据

    const vertexBuffer = []; // 顶点缓冲区数组
    const uvBuffer = []; // UV纹理坐标缓冲区数组

    // 细分操作创建顶点缓冲区数据

    subdivide(detail);

    // 所有顶点都应位于给定半径的概念球面上

    applyRadius(radius);

    // 最后，创建UV纹理坐标数据

    generateUVs();

    // 构建非索引几何体

    this.setAttribute("position", new Float32BufferAttribute(vertexBuffer, 3)); // 设置位置属性（每个顶点3个分量：x,y,z）
    this.setAttribute("normal", new Float32BufferAttribute(vertexBuffer.slice(), 3)); // 设置法线属性（复制顶点数据作为法线）
    this.setAttribute("uv", new Float32BufferAttribute(uvBuffer, 2)); // 设置UV纹理坐标属性（每个顶点2个分量：u,v）

    // 根据细节级别选择法线计算方式
    if (detail === 0) {
      this.computeVertexNormals(); // 计算平面法线（用于低细节级别）
    } else {
      this.normalizeNormals(); // 标准化法线（用于高细节级别，产生平滑效果）
    }

    // 辅助函数定义

    /**
     * 细分函数 - 根据细节级别对几何体进行细分
     * @param {number} detail - 细分级别
     */
    function subdivide(detail) {
      // 创建三个向量来存储三角面的三个顶点
      const a = new Vector3(); // 三角面顶点A
      const b = new Vector3(); // 三角面顶点B
      const c = new Vector3(); // 三角面顶点C

      // 遍历所有面并应用给定细节值的细分

      for (let i = 0; i < indices.length; i += 3) {
        // 每3个索引构成一个三角面
        // 获取面的顶点

        getVertexByIndex(indices[i + 0], a); // 获取第一个顶点
        getVertexByIndex(indices[i + 1], b); // 获取第二个顶点
        getVertexByIndex(indices[i + 2], c); // 获取第三个顶点

        // 执行面细分

        subdivideFace(a, b, c, detail);
      }
    }

    /**
     * 细分单个三角面
     * @param {Vector3} a - 三角面顶点A
     * @param {Vector3} b - 三角面顶点B
     * @param {Vector3} c - 三角面顶点C
     * @param {number} detail - 细分级别
     */
    function subdivideFace(a, b, c, detail) {
      const cols = detail + 1; // 计算列数（细分级别+1）

      // 使用多维数组作为创建细分的数据结构

      const v = []; // 存储细分后顶点的二维数组

      // 构造此细分的所有顶点

      for (let i = 0; i <= cols; i++) {
        // 遍历每一行
        v[i] = []; // 初始化当前行的数组

        // 在AC边上进行线性插值
        const aj = a.clone().lerp(c, i / cols); // 从A到C的插值点
        const bj = b.clone().lerp(c, i / cols); // 从B到C的插值点

        const rows = cols - i; // 当前行的顶点数量

        for (let j = 0; j <= rows; j++) {
          // 遍历当前行的每个顶点
          if (j === 0 && i === cols) {
            // 特殊情况：最后一行的第一个点
            v[i][j] = aj; // 直接使用aj点
          } else {
            // 在aj和bj之间进行线性插值
            v[i][j] = aj.clone().lerp(bj, j / rows);
          }
        }
      }

      // 构造所有的面

      for (let i = 0; i < cols; i++) {
        // 遍历每一行
        for (let j = 0; j < 2 * (cols - i) - 1; j++) {
          // 遍历当前行的每个三角形
          const k = Math.floor(j / 2); // 计算基础索引

          if (j % 2 === 0) {
            // 偶数索引：向上的三角形
            pushVertex(v[i][k + 1]); // 添加第一个顶点
            pushVertex(v[i + 1][k]); // 添加第二个顶点
            pushVertex(v[i][k]); // 添加第三个顶点
          } else {
            // 奇数索引：向下的三角形
            pushVertex(v[i][k + 1]); // 添加第一个顶点
            pushVertex(v[i + 1][k + 1]); // 添加第二个顶点
            pushVertex(v[i + 1][k]); // 添加第三个顶点
          }
        }
      }
    }

    /**
     * 应用半径函数 - 将所有顶点投影到指定半径的球面上
     * @param {number} radius - 目标半径
     */
    function applyRadius(radius) {
      const vertex = new Vector3(); // 临时向量用于存储当前顶点

      // 遍历整个缓冲区并对每个顶点应用半径

      for (let i = 0; i < vertexBuffer.length; i += 3) {
        // 每3个值表示一个顶点的x,y,z坐标
        // 从缓冲区读取顶点坐标
        vertex.x = vertexBuffer[i + 0]; // X坐标
        vertex.y = vertexBuffer[i + 1]; // Y坐标
        vertex.z = vertexBuffer[i + 2]; // Z坐标

        // 标准化向量并乘以半径（投影到球面）
        vertex.normalize().multiplyScalar(radius);

        // 将修改后的坐标写回缓冲区
        vertexBuffer[i + 0] = vertex.x; // 更新X坐标
        vertexBuffer[i + 1] = vertex.y; // 更新Y坐标
        vertexBuffer[i + 2] = vertex.z; // 更新Z坐标
      }
    }

    /**
     * 生成UV纹理坐标函数
     */
    function generateUVs() {
      const vertex = new Vector3(); // 临时向量用于存储当前顶点

      // 遍历所有顶点生成UV坐标
      for (let i = 0; i < vertexBuffer.length; i += 3) {
        // 每3个值表示一个顶点
        // 从缓冲区读取顶点坐标
        vertex.x = vertexBuffer[i + 0]; // X坐标
        vertex.y = vertexBuffer[i + 1]; // Y坐标
        vertex.z = vertexBuffer[i + 2]; // Z坐标

        // 计算球面坐标系下的UV值
        const u = azimuth(vertex) / 2 / Math.PI + 0.5; // 方位角转换为U坐标（0-1范围）
        const v = inclination(vertex) / Math.PI + 0.5; // 倾斜角转换为V坐标（0-1范围）
        uvBuffer.push(u, 1 - v); // 添加UV坐标到缓冲区（V坐标翻转）
      }

      // 修正UV坐标
      correctUVs();

      // 修正接缝处的UV坐标
      correctSeam();
    }

    /**
     * 修正接缝处的UV坐标函数
     * 处理面跨越接缝的情况，参见 #3269
     */
    function correctSeam() {
      // 处理面跨越接缝的情况，参见 #3269

      for (let i = 0; i < uvBuffer.length; i += 6) {
        // 每6个值表示一个三角面的UV数据
        // 单个面的UV数据

        const x0 = uvBuffer[i + 0]; // 第一个顶点的U坐标
        const x1 = uvBuffer[i + 2]; // 第二个顶点的U坐标
        const x2 = uvBuffer[i + 4]; // 第三个顶点的U坐标

        const max = Math.max(x0, x1, x2); // 找到最大U值
        const min = Math.min(x0, x1, x2); // 找到最小U值

        // 0.9是一个相对任意的阈值

        if (max > 0.9 && min < 0.1) {
          // 如果U坐标跨越了0-1边界
          // 调整小于0.2的U坐标，加1使其连续
          if (x0 < 0.2) uvBuffer[i + 0] += 1; // 调整第一个顶点
          if (x1 < 0.2) uvBuffer[i + 2] += 1; // 调整第二个顶点
          if (x2 < 0.2) uvBuffer[i + 4] += 1; // 调整第三个顶点
        }
      }
    }

    /**
     * 将顶点添加到顶点缓冲区
     * @param {Vector3} vertex - 要添加的顶点
     */
    function pushVertex(vertex) {
      vertexBuffer.push(vertex.x, vertex.y, vertex.z); // 将顶点的x,y,z坐标添加到缓冲区
    }

    /**
     * 根据索引获取顶点坐标
     * @param {number} index - 顶点索引
     * @param {Vector3} vertex - 用于存储结果的向量对象
     */
    function getVertexByIndex(index, vertex) {
      const stride = index * 3; // 计算在顶点数组中的偏移量（每个顶点占3个位置）

      // 从顶点数组中读取坐标
      vertex.x = vertices[stride + 0]; // X坐标
      vertex.y = vertices[stride + 1]; // Y坐标
      vertex.z = vertices[stride + 2]; // Z坐标
    }

    /**
     * 修正UV坐标函数
     * 处理球面UV映射中的极点和边界问题
     */
    function correctUVs() {
      // 创建向量存储三角面的三个顶点
      const a = new Vector3(); // 顶点A
      const b = new Vector3(); // 顶点B
      const c = new Vector3(); // 顶点C

      const centroid = new Vector3(); // 三角面的重心

      // 创建二维向量存储UV坐标
      const uvA = new Vector2(); // 顶点A的UV坐标
      const uvB = new Vector2(); // 顶点B的UV坐标
      const uvC = new Vector2(); // 顶点C的UV坐标

      // 遍历所有三角面
      for (let i = 0, j = 0; i < vertexBuffer.length; i += 9, j += 6) {
        // i每次增加9（3个顶点×3个坐标），j每次增加6（3个顶点×2个UV坐标）
        // 设置三角面的三个顶点坐标
        a.set(vertexBuffer[i + 0], vertexBuffer[i + 1], vertexBuffer[i + 2]); // 顶点A
        b.set(vertexBuffer[i + 3], vertexBuffer[i + 4], vertexBuffer[i + 5]); // 顶点B
        c.set(vertexBuffer[i + 6], vertexBuffer[i + 7], vertexBuffer[i + 8]); // 顶点C

        // 设置对应的UV坐标
        uvA.set(uvBuffer[j + 0], uvBuffer[j + 1]); // 顶点A的UV
        uvB.set(uvBuffer[j + 2], uvBuffer[j + 3]); // 顶点B的UV
        uvC.set(uvBuffer[j + 4], uvBuffer[j + 5]); // 顶点C的UV

        // 计算三角面的重心
        centroid.copy(a).add(b).add(c).divideScalar(3);

        // 计算重心的方位角
        const azi = azimuth(centroid);

        // 修正每个顶点的UV坐标
        correctUV(uvA, j + 0, a, azi); // 修正顶点A的UV
        correctUV(uvB, j + 2, b, azi); // 修正顶点B的UV
        correctUV(uvC, j + 4, c, azi); // 修正顶点C的UV
      }
    }

    /**
     * 修正单个UV坐标
     * @param {Vector2} uv - UV坐标对象
     * @param {number} stride - 在UV缓冲区中的索引位置
     * @param {Vector3} vector - 对应的3D向量
     * @param {number} azimuth - 方位角
     */
    function correctUV(uv, stride, vector, azimuth) {
      // 处理方位角为负且U坐标为1的情况
      if (azimuth < 0 && uv.x === 1) {
        uvBuffer[stride] = uv.x - 1; // 将U坐标调整为0
      }

      // 处理极点情况（向量在Y轴上）
      if (vector.x === 0 && vector.z === 0) {
        uvBuffer[stride] = azimuth / 2 / Math.PI + 0.5; // 根据方位角重新计算U坐标
      }
    }

    /**
     * 计算方位角函数
     * 围绕Y轴的角度，从上方看时为逆时针方向
     * @param {Vector3} vector - 输入向量
     * @return {number} 方位角（弧度）
     */
    function azimuth(vector) {
      return Math.atan2(vector.z, -vector.x); // 使用atan2计算方位角
    }

    /**
     * 计算倾斜角函数
     * 相对于XZ平面的角度
     * @param {Vector3} vector - 输入向量
     * @return {number} 倾斜角（弧度）
     */
    function inclination(vector) {
      return Math.atan2(-vector.y, Math.sqrt(vector.x * vector.x + vector.z * vector.z)); // 计算与XZ平面的夹角
    }
  }

  /**
   * 复制方法 - 从另一个几何体复制属性
   * @param {PolyhedronGeometry} source - 源几何体对象
   * @return {PolyhedronGeometry} 返回当前对象以支持链式调用
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
   * @return {PolyhedronGeometry} 新的几何体实例
   */
  static fromJSON(data) {
    return new PolyhedronGeometry(data.vertices, data.indices, data.radius, data.details); // 使用JSON数据创建新实例
  }
}

// 导出多面体几何体类供外部使用
export { PolyhedronGeometry };
