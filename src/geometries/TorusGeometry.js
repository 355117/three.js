// 导入必要的Three.js核心模块
import { BufferGeometry } from "../core/BufferGeometry.js"; // 导入缓冲几何体基类
import { Float32BufferAttribute } from "../core/BufferAttribute.js"; // 导入32位浮点数缓冲属性类
import { Vector3 } from "../math/Vector3.js"; // 导入三维向量类

/**
 * 环面几何体类
 * 用于表示环面（甜甜圈形状）的几何体类
 *
 * 使用示例：
 * ```js
 * const geometry = new THREE.TorusGeometry( 10, 3, 16, 100 );
 * const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
 * const torus = new THREE.Mesh( geometry, material );
 * scene.add( torus );
 * ```
 *
 * @augments BufferGeometry
 */
class TorusGeometry extends BufferGeometry {
  /**
   * 构造一个新的环面几何体
   *
   * @param {number} [radius=1] - 环面半径，从环面中心到管道中心的距离
   * @param {number} [tube=0.4] - 管道半径。必须小于环面半径
   * @param {number} [radialSegments=12] - 径向分段数
   * @param {number} [tubularSegments=48] - 管状分段数
   * @param {number} [arc=Math.PI*2] - 中心角度（弧度）
   */
  constructor(radius = 1, tube = 0.4, radialSegments = 12, tubularSegments = 48, arc = Math.PI * 2) {
    // 调用父类构造函数
    super();

    // 设置几何体类型标识
    this.type = "TorusGeometry";

    /**
     * 保存用于生成几何体的构造函数参数
     * 实例化后的任何修改都不会改变几何体
     *
     * @type {Object}
     */
    this.parameters = {
      radius: radius, // 环面半径
      tube: tube, // 管道半径
      radialSegments: radialSegments, // 径向分段数
      tubularSegments: tubularSegments, // 管状分段数
      arc: arc, // 中心角度
    };

    // 确保分段数为整数
    radialSegments = Math.floor(radialSegments); // 径向分段数取整
    tubularSegments = Math.floor(tubularSegments); // 管状分段数取整

    // 缓冲区数组

    const indices = []; // 索引数组
    const vertices = []; // 顶点坐标数组
    const normals = []; // 法线数组
    const uvs = []; // UV纹理坐标数组

    // 辅助变量

    const center = new Vector3(); // 环面中心点向量
    const vertex = new Vector3(); // 当前顶点向量
    const normal = new Vector3(); // 当前法线向量

    // 生成顶点、法线和UV坐标

    for (let j = 0; j <= radialSegments; j++) {
      // 遍历径向分段
      for (let i = 0; i <= tubularSegments; i++) {
        // 遍历管状分段
        // 计算参数化坐标
        const u = (i / tubularSegments) * arc; // 管状方向参数（0到arc）
        const v = (j / radialSegments) * Math.PI * 2; // 径向参数（0到2π）

        // 计算顶点坐标（环面参数方程）

        vertex.x = (radius + tube * Math.cos(v)) * Math.cos(u); // X坐标
        vertex.y = (radius + tube * Math.cos(v)) * Math.sin(u); // Y坐标
        vertex.z = tube * Math.sin(v); // Z坐标

        vertices.push(vertex.x, vertex.y, vertex.z); // 添加顶点坐标到数组

        // 计算法线向量

        center.x = radius * Math.cos(u); // 环面中心轴上对应点的X坐标
        center.y = radius * Math.sin(u); // 环面中心轴上对应点的Y坐标
        // center.z = 0 (环面中心轴在XY平面上)
        normal.subVectors(vertex, center).normalize(); // 从中心点指向顶点的单位向量

        normals.push(normal.x, normal.y, normal.z); // 添加法线到数组

        // 计算UV纹理坐标

        uvs.push(i / tubularSegments); // U坐标（管状方向）
        uvs.push(j / radialSegments); // V坐标（径向方向）
      }
    }

    // 生成索引数组

    for (let j = 1; j <= radialSegments; j++) {
      // 遍历径向分段
      for (let i = 1; i <= tubularSegments; i++) {
        // 遍历管状分段
        // 计算四边形的四个顶点索引

        const a = (tubularSegments + 1) * j + i - 1; // 当前径向层的当前管状位置
        const b = (tubularSegments + 1) * (j - 1) + i - 1; // 前一径向层的当前管状位置
        const c = (tubularSegments + 1) * (j - 1) + i; // 前一径向层的下一管状位置
        const d = (tubularSegments + 1) * j + i; // 当前径向层的下一管状位置

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
  }

  /**
   * 复制方法 - 从另一个几何体复制属性
   * @param {TorusGeometry} source - 源几何体对象
   * @return {TorusGeometry} 返回当前对象以支持链式调用
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
   * @return {TorusGeometry} 新的几何体实例
   */
  static fromJSON(data) {
    return new TorusGeometry(data.radius, data.tube, data.radialSegments, data.tubularSegments, data.arc); // 使用JSON数据创建新实例
  }
}

// 导出环面几何体类供外部使用
export { TorusGeometry };
