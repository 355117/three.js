// 导入必要的Three.js核心模块
import { BufferGeometry } from "../core/BufferGeometry.js"; // 导入缓冲几何体基类
import { Float32BufferAttribute } from "../core/BufferAttribute.js"; // 导入32位浮点数缓冲属性类
import { Vector3 } from "../math/Vector3.js"; // 导入三维向量类

/**
 * 球体几何体类
 * 用于生成球体几何体的类
 *
 * 使用示例：
 * ```js
 * const geometry = new THREE.SphereGeometry( 15, 32, 16 );
 * const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
 * const sphere = new THREE.Mesh( geometry, material );
 * scene.add( sphere );
 * ```
 *
 * @augments BufferGeometry
 */
class SphereGeometry extends BufferGeometry {
  /**
   * 构造一个新的球体几何体
   *
   * @param {number} [radius=1] - 球体半径
   * @param {number} [widthSegments=32] - 水平分段数。最小值为3
   * @param {number} [heightSegments=16] - 垂直分段数。最小值为2
   * @param {number} [phiStart=0] - 水平起始角度（弧度）
   * @param {number} [phiLength=Math.PI*2] - 水平扫描角度大小
   * @param {number} [thetaStart=0] - 垂直起始角度（弧度）
   * @param {number} [thetaLength=Math.PI] - 垂直扫描角度大小
   */
  constructor(radius = 1, widthSegments = 32, heightSegments = 16, phiStart = 0, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI) {
    // 调用父类构造函数
    super();

    // 设置几何体类型标识
    this.type = "SphereGeometry";

    /**
     * 保存用于生成几何体的构造函数参数
     * 实例化后的任何修改都不会改变几何体
     *
     * @type {Object}
     */
    this.parameters = {
      radius: radius, // 球体半径
      widthSegments: widthSegments, // 水平分段数
      heightSegments: heightSegments, // 垂直分段数
      phiStart: phiStart, // 水平起始角度
      phiLength: phiLength, // 水平扫描角度
      thetaStart: thetaStart, // 垂直起始角度
      thetaLength: thetaLength, // 垂直扫描角度
    };

    // 确保分段数符合最小值要求并取整
    widthSegments = Math.max(3, Math.floor(widthSegments)); // 水平分段数最小为3
    heightSegments = Math.max(2, Math.floor(heightSegments)); // 垂直分段数最小为2

    // 计算垂直扫描的结束角度（不超过π）
    const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI);

    let index = 0; // 顶点索引计数器
    const grid = []; // 存储顶点索引的二维网格

    // 临时向量用于计算
    const vertex = new Vector3(); // 顶点位置向量
    const normal = new Vector3(); // 法线向量

    // 缓冲区数组

    const indices = []; // 索引数组
    const vertices = []; // 顶点坐标数组
    const normals = []; // 法线数组
    const uvs = []; // UV纹理坐标数组

    // 生成顶点、法线和UV坐标

    for (let iy = 0; iy <= heightSegments; iy++) {
      // 遍历垂直分段
      const verticesRow = []; // 当前行的顶点索引数组

      const v = iy / heightSegments; // 垂直方向的参数化坐标（0到1）

      // 极点的特殊情况处理

      let uOffset = 0; // U坐标偏移量

      if (iy === 0 && thetaStart === 0) {
        // 北极点
        uOffset = 0.5 / widthSegments; // 正偏移
      } else if (iy === heightSegments && thetaEnd === Math.PI) {
        // 南极点
        uOffset = -0.5 / widthSegments; // 负偏移
      }

      for (let ix = 0; ix <= widthSegments; ix++) {
        // 遍历水平分段
        const u = ix / widthSegments; // 水平方向的参数化坐标（0到1）

        // 计算顶点坐标（球面坐标转换为笛卡尔坐标）

        vertex.x = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength); // X坐标
        vertex.y = radius * Math.cos(thetaStart + v * thetaLength); // Y坐标
        vertex.z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength); // Z坐标

        vertices.push(vertex.x, vertex.y, vertex.z); // 添加顶点坐标到数组

        // 计算法线（球面上的法线就是从球心指向顶点的单位向量）

        normal.copy(vertex).normalize(); // 复制顶点位置并标准化为单位向量
        normals.push(normal.x, normal.y, normal.z); // 添加法线到数组

        // 计算UV纹理坐标

        uvs.push(u + uOffset, 1 - v); // 添加UV坐标（V坐标翻转）

        verticesRow.push(index++); // 将当前顶点索引添加到行数组并递增索引
      }

      grid.push(verticesRow); // 将当前行添加到网格中
    }

    // 生成索引数组

    for (let iy = 0; iy < heightSegments; iy++) {
      // 遍历垂直分段
      for (let ix = 0; ix < widthSegments; ix++) {
        // 遍历水平分段
        // 获取四边形的四个顶点索引
        const a = grid[iy][ix + 1]; // 当前行右侧顶点
        const b = grid[iy][ix]; // 当前行左侧顶点
        const c = grid[iy + 1][ix]; // 下一行左侧顶点
        const d = grid[iy + 1][ix + 1]; // 下一行右侧顶点

        // 避免在极点处创建退化三角形
        if (iy !== 0 || thetaStart > 0) indices.push(a, b, d); // 上三角形（避免北极点退化）
        if (iy !== heightSegments - 1 || thetaEnd < Math.PI) indices.push(b, c, d); // 下三角形（避免南极点退化）
      }
    }

    // 构建几何体

    this.setIndex(indices); // 设置索引数组
    this.setAttribute("position", new Float32BufferAttribute(vertices, 3)); // 设置位置属性（每个顶点3个分量：x,y,z）
    this.setAttribute("normal", new Float32BufferAttribute(normals, 3)); // 设置法线属性（每个顶点3个分量：nx,ny,nz）
    this.setAttribute("uv", new Float32BufferAttribute(uvs, 2)); // 设置UV纹理坐标属性（每个顶点2个分量：u,v）
  }

  /**
   * 复制方法 - 从另一个几何体复制属性
   * @param {SphereGeometry} source - 源几何体对象
   * @return {SphereGeometry} 返回当前对象以支持链式调用
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
   * @return {SphereGeometry} 新的几何体实例
   */
  static fromJSON(data) {
    return new SphereGeometry(data.radius, data.widthSegments, data.heightSegments, data.phiStart, data.phiLength, data.thetaStart, data.thetaLength); // 使用JSON数据创建新实例
  }
}

// 导出球体几何体类供外部使用
export { SphereGeometry };
