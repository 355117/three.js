// 导入必要的Three.js核心模块
import { BufferGeometry } from "../core/BufferGeometry.js"; // 导入缓冲几何体基类
import { Float32BufferAttribute } from "../core/BufferAttribute.js"; // 导入32位浮点数缓冲属性类
import * as Curves from "../extras/curves/Curves.js"; // 导入曲线类集合
import { Vector2 } from "../math/Vector2.js"; // 导入二维向量类
import { Vector3 } from "../math/Vector3.js"; // 导入三维向量类

/**
 * 管道几何体类
 * 创建沿3D曲线挤出的管道
 *
 * 使用示例：
 * ```js
 * class CustomSinCurve extends THREE.Curve {
 *
 * 	getPoint( t, optionalTarget = new THREE.Vector3() ) {
 *
 * 		const tx = t * 3 - 1.5;
 * 		const ty = Math.sin( 2 * Math.PI * t );
 * 		const tz = 0;
 *
 * 		return optionalTarget.set( tx, ty, tz );
 * 	}
 *
 * }
 *
 * const path = new CustomSinCurve( 10 );
 * const geometry = new THREE.TubeGeometry( path, 20, 2, 8, false );
 * const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
 * const mesh = new THREE.Mesh( geometry, material );
 * scene.add( mesh );
 * ```
 *
 * @augments BufferGeometry
 */
class TubeGeometry extends BufferGeometry {
  /**
   * 构造一个新的管道几何体
   *
   * @param {Curve} [path=QuadraticBezierCurve3] - 定义管道路径的3D曲线
   * @param {number} [tubularSegments=64] - 构成管道的分段数
   * @param {number} [radius=1] - 管道的半径
   * @param {number} [radialSegments=8] - 构成横截面的分段数
   * @param {boolean} [closed=false] - 管道是否封闭
   */
  constructor(
    path = new Curves["QuadraticBezierCurve3"](new Vector3(-1, -1, 0), new Vector3(-1, 1, 0), new Vector3(1, 1, 0)),
    tubularSegments = 64,
    radius = 1,
    radialSegments = 8,
    closed = false
  ) {
    // 调用父类构造函数
    super();

    // 设置几何体类型标识
    this.type = "TubeGeometry";

    /**
     * 保存用于生成几何体的构造函数参数
     * 实例化后的任何修改都不会改变几何体
     *
     * @type {Object}
     */
    this.parameters = {
      path: path, // 3D路径曲线
      tubularSegments: tubularSegments, // 管状分段数
      radius: radius, // 管道半径
      radialSegments: radialSegments, // 径向分段数
      closed: closed, // 是否封闭
    };

    // 计算路径的Frenet标架（切线、法线、副法线）
    const frames = path.computeFrenetFrames(tubularSegments, closed);

    // 暴露内部数据

    this.tangents = frames.tangents; // 切线向量数组
    this.normals = frames.normals; // 法线向量数组
    this.binormals = frames.binormals; // 副法线向量数组

    // 辅助变量

    const vertex = new Vector3(); // 当前顶点向量
    const normal = new Vector3(); // 当前法线向量
    const uv = new Vector2(); // 当前UV坐标向量
    let P = new Vector3(); // 路径上的点

    // 缓冲区数组

    const vertices = []; // 顶点坐标数组
    const normals = []; // 法线数组
    const uvs = []; // UV纹理坐标数组
    const indices = []; // 索引数组

    // 创建缓冲区数据

    generateBufferData();

    // 构建几何体

    this.setIndex(indices); // 设置索引数组
    this.setAttribute("position", new Float32BufferAttribute(vertices, 3)); // 设置位置属性（每个顶点3个分量：x,y,z）
    this.setAttribute("normal", new Float32BufferAttribute(normals, 3)); // 设置法线属性（每个顶点3个分量：nx,ny,nz）
    this.setAttribute("uv", new Float32BufferAttribute(uvs, 2)); // 设置UV纹理坐标属性（每个顶点2个分量：u,v）

    // 内部函数定义

    /**
     * 生成缓冲区数据的主函数
     */
    function generateBufferData() {
      for (let i = 0; i < tubularSegments; i++) {
        // 遍历管状分段
        generateSegment(i); // 生成每个分段
      }

      // 如果几何体不封闭，在给定路径上的常规位置生成最后一行顶点和法线
      // 如果几何体封闭，复制第一行顶点和法线（UV会有所不同）

      generateSegment(closed === false ? tubularSegments : 0);

      // UV坐标在单独的函数中生成
      // 这使得为封闭几何体计算正确值变得容易

      generateUVs();

      // 最后创建面

      generateIndices();
    }

    /**
     * 生成指定分段的顶点和法线
     * @param {number} i - 分段索引
     */
    function generateSegment(i) {
      // 我们使用getPointAt从给定路径中采样均匀分布的点

      P = path.getPointAt(i / tubularSegments, P);

      // 获取对应的法线和副法线

      const N = frames.normals[i]; // 法线向量
      const B = frames.binormals[i]; // 副法线向量

      // 为当前分段生成法线和顶点

      for (let j = 0; j <= radialSegments; j++) {
        // 遍历径向分段
        const v = (j / radialSegments) * Math.PI * 2; // 径向角度参数

        const sin = Math.sin(v); // sin值
        const cos = -Math.cos(v); // cos值（负号用于正确的法线方向）

        // 计算法线

        normal.x = cos * N.x + sin * B.x; // 法线X分量
        normal.y = cos * N.y + sin * B.y; // 法线Y分量
        normal.z = cos * N.z + sin * B.z; // 法线Z分量
        normal.normalize(); // 标准化法线向量

        normals.push(normal.x, normal.y, normal.z); // 添加法线到数组

        // 计算顶点

        vertex.x = P.x + radius * normal.x; // 顶点X坐标
        vertex.y = P.y + radius * normal.y; // 顶点Y坐标
        vertex.z = P.z + radius * normal.z; // 顶点Z坐标

        vertices.push(vertex.x, vertex.y, vertex.z); // 添加顶点到数组
      }
    }

    /**
     * 生成索引数组
     */
    function generateIndices() {
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
    }

    /**
     * 生成UV纹理坐标
     */
    function generateUVs() {
      for (let i = 0; i <= tubularSegments; i++) {
        // 遍历管状分段
        for (let j = 0; j <= radialSegments; j++) {
          // 遍历径向分段
          uv.x = i / tubularSegments; // U坐标（管状方向）
          uv.y = j / radialSegments; // V坐标（径向方向）

          uvs.push(uv.x, uv.y); // 添加UV坐标到数组
        }
      }
    }
  }

  /**
   * 复制方法 - 从另一个几何体复制属性
   * @param {TubeGeometry} source - 源几何体对象
   * @return {TubeGeometry} 返回当前对象以支持链式调用
   */
  copy(source) {
    super.copy(source); // 调用父类的复制方法

    this.parameters = Object.assign({}, source.parameters); // 深拷贝参数对象

    return this; // 返回当前对象
  }

  /**
   * 转换为JSON格式
   * @return {Object} JSON格式的几何体数据
   */
  toJSON() {
    const data = super.toJSON(); // 获取父类的JSON数据

    data.path = this.parameters.path.toJSON(); // 添加路径的JSON数据

    return data; // 返回完整的JSON数据
  }

  /**
   * 从JSON数据创建几何体实例的工厂方法
   *
   * @param {Object} data - 表示序列化几何体的JSON对象
   * @return {TubeGeometry} 新的几何体实例
   */
  static fromJSON(data) {
    // 这只适用于内置曲线（例如CatmullRomCurve3）
    // 用户定义的曲线或CurvePath实例不会被反序列化
    return new TubeGeometry(new Curves[data.path.type]().fromJSON(data.path), data.tubularSegments, data.radius, data.radialSegments, data.closed); // 使用JSON数据创建新实例
  }
}

// 导出管道几何体类供外部使用
export { TubeGeometry };
