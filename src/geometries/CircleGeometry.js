// 导入缓冲几何体基类
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入32位浮点数缓冲属性类，用于存储顶点数据
import { Float32BufferAttribute } from "../core/BufferAttribute.js";
// 导入三维向量类，用于处理3D坐标
import { Vector3 } from "../math/Vector3.js";
// 导入二维向量类，用于处理UV坐标
import { Vector2 } from "../math/Vector2.js";

/**
 * 圆形几何体类，用于创建圆形或扇形的2D几何体
 * 这是一个简单的欧几里得几何形状，由多个三角形片段构成
 * 这些三角形围绕中心点排列，延伸到指定的半径距离
 * 从起始角度开始逆时针构建，覆盖指定的圆心角
 * 也可以用来创建正多边形，分段数决定多边形的边数
 *
 * 使用示例：
 * ```js
 * const geometry = new THREE.CircleGeometry( 5, 32 );
 * const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
 * const circle = new THREE.Mesh( geometry, material );
 * scene.add( circle )
 * ```
 *
 * @augments BufferGeometry
 */
class CircleGeometry extends BufferGeometry {
  /**
   * 构造一个新的圆形几何体
   *
   * @param {number} [radius=1] - 圆的半径
   * @param {number} [segments=32] - 分段数（三角形数量），最小值为3
   * @param {number} [thetaStart=0] - 第一个分段的起始角度，以弧度为单位
   * @param {number} [thetaLength=Math.PI*2] - 圆形扇区的圆心角，以弧度为单位
   * 默认值2π表示完整的圆形
   */
  constructor(radius = 1, segments = 32, thetaStart = 0, thetaLength = Math.PI * 2) {
    // 调用父类BufferGeometry的构造函数
    super();

    // 设置几何体类型标识
    this.type = "CircleGeometry";

    /**
     * 保存构造函数参数的对象
     * 这些参数用于生成几何体，实例化后的任何修改都不会改变几何体
     * 主要用于序列化、调试和重新创建几何体
     *
     * @type {Object}
     */
    this.parameters = {
      radius: radius, // 圆的半径
      segments: segments, // 分段数
      thetaStart: thetaStart, // 起始角度
      thetaLength: thetaLength, // 圆心角长度
    };

    // 确保分段数至少为3（形成最基本的三角形）
    segments = Math.max(3, segments);

    // 缓冲区数组，用于存储几何体数据

    const indices = []; // 顶点索引数组，定义三角形的顶点连接关系
    const vertices = []; // 顶点位置数组，存储每个顶点的x,y,z坐标
    const normals = []; // 法向量数组，存储每个顶点的法向量
    const uvs = []; // UV坐标数组，存储纹理映射坐标

    // 辅助变量

    const vertex = new Vector3(); // 临时向量，用于计算顶点位置
    const uv = new Vector2(); // 临时向量，用于计算UV坐标

    // 添加圆心点作为第一个顶点

    vertices.push(0, 0, 0); // 圆心位置：原点(0,0,0)
    normals.push(0, 0, 1); // 圆心法向量：指向Z轴正方向
    uvs.push(0.5, 0.5); // 圆心UV坐标：纹理中心点

    // 生成圆周上的顶点
    // s是分段索引，i是顶点数组索引（每个顶点占3个位置：x,y,z）
    for (let s = 0, i = 3; s <= segments; s++, i += 3) {
      // 计算当前分段的角度
      const segment = thetaStart + (s / segments) * thetaLength;

      // 计算顶点位置

      vertex.x = radius * Math.cos(segment); // X坐标：半径 × cos(角度)
      vertex.y = radius * Math.sin(segment); // Y坐标：半径 × sin(角度)
      // vertex.z 保持为0（默认值），因为圆形在XY平面上

      // 将顶点坐标添加到顶点数组
      vertices.push(vertex.x, vertex.y, vertex.z);

      // 添加法向量（所有顶点的法向量都指向Z轴正方向）

      normals.push(0, 0, 1);

      // 计算UV坐标（将圆形坐标映射到[0,1]范围的纹理坐标）

      uv.x = (vertices[i] / radius + 1) / 2; // 将X坐标从[-radius,radius]映射到[0,1]
      uv.y = (vertices[i + 1] / radius + 1) / 2; // 将Y坐标从[-radius,radius]映射到[0,1]

      // 将UV坐标添加到UV数组
      uvs.push(uv.x, uv.y);
    }

    // 生成三角形索引
    // 每个三角形由圆心和圆周上相邻的两个点组成

    for (let i = 1; i <= segments; i++) {
      // 添加三角形索引：当前点、下一个点、圆心点
      // 注意：索引0是圆心点
      indices.push(i, i + 1, 0);
    }

    // 构建几何体，设置各种属性

    this.setIndex(indices); // 设置顶点索引
    this.setAttribute("position", new Float32BufferAttribute(vertices, 3)); // 设置位置属性（每个顶点3个分量：x,y,z）
    this.setAttribute("normal", new Float32BufferAttribute(normals, 3)); // 设置法向量属性（每个法向量3个分量）
    this.setAttribute("uv", new Float32BufferAttribute(uvs, 2)); // 设置UV属性（每个UV坐标2个分量：u,v）
  }

  /**
   * 复制另一个CircleGeometry实例的属性到当前实例
   *
   * @param {CircleGeometry} source - 要复制的源几何体对象
   * @return {CircleGeometry} 返回当前实例，支持链式调用
   */
  copy(source) {
    // 调用父类的copy方法，复制基础属性
    super.copy(source);

    // 复制构造参数对象
    this.parameters = Object.assign({}, source.parameters);

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 从JSON对象创建CircleGeometry实例的工厂方法
   * 用于反序列化，将序列化的JSON数据重新构建为几何体对象
   *
   * @param {Object} data - 包含序列化几何体数据的JSON对象
   * @return {CircleGeometry} 返回新创建的圆形几何体实例
   */
  static fromJSON(data) {
    // 使用JSON数据中的参数创建新的CircleGeometry实例
    return new CircleGeometry(data.radius, data.segments, data.thetaStart, data.thetaLength);
  }
}

// 导出CircleGeometry类，使其可以被其他模块导入和使用
export { CircleGeometry };
