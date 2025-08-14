// 导入必要的Three.js核心模块
import { BufferGeometry } from "../core/BufferGeometry.js"; // 导入缓冲几何体基类
import { Float32BufferAttribute } from "../core/BufferAttribute.js"; // 导入32位浮点数缓冲属性类
import { Vector2 } from "../math/Vector2.js"; // 导入二维向量类
import { Vector3 } from "../math/Vector3.js"; // 导入三维向量类

/**
 * 环形几何体类
 * 用于生成二维环形几何体的类
 *
 * 使用示例：
 * ```js
 * const geometry = new THREE.RingGeometry( 1, 5, 32 );
 * const material = new THREE.MeshBasicMaterial( { color: 0xffff00, side: THREE.DoubleSide } );
 * const mesh = new THREE.Mesh( geometry, material );
 * scene.add( mesh );
 * ```
 *
 * @augments BufferGeometry
 */
class RingGeometry extends BufferGeometry {
  /**
   * 构造一个新的环形几何体
   *
   * @param {number} [innerRadius=0.5] - 环的内半径
   * @param {number} [outerRadius=1] - 环的外半径
   * @param {number} [thetaSegments=32] - 分段数。数值越高，环形越圆滑。最小值为3
   * @param {number} [phiSegments=1] - 每个环形分段的分段数。最小值为1
   * @param {number} [thetaStart=0] - 起始角度（弧度）
   * @param {number} [thetaLength=Math.PI*2] - 中心角度（弧度）
   */
  constructor(innerRadius = 0.5, outerRadius = 1, thetaSegments = 32, phiSegments = 1, thetaStart = 0, thetaLength = Math.PI * 2) {
    // 调用父类构造函数
    super();

    // 设置几何体类型标识
    this.type = "RingGeometry";

    /**
     * 保存用于生成几何体的构造函数参数
     * 实例化后的任何修改都不会改变几何体
     *
     * @type {Object}
     */
    this.parameters = {
      innerRadius: innerRadius, // 内半径
      outerRadius: outerRadius, // 外半径
      thetaSegments: thetaSegments, // 角度分段数
      phiSegments: phiSegments, // 径向分段数
      thetaStart: thetaStart, // 起始角度
      thetaLength: thetaLength, // 角度范围
    };

    // 确保分段数符合最小值要求
    thetaSegments = Math.max(3, thetaSegments); // 角度分段数最小为3
    phiSegments = Math.max(1, phiSegments); // 径向分段数最小为1

    // 缓冲区数组

    const indices = []; // 索引数组
    const vertices = []; // 顶点坐标数组
    const normals = []; // 法线数组
    const uvs = []; // UV纹理坐标数组

    // 辅助变量

    let radius = innerRadius; // 当前半径，从内半径开始
    const radiusStep = (outerRadius - innerRadius) / phiSegments; // 每个径向分段的半径步长
    const vertex = new Vector3(); // 临时顶点向量
    const uv = new Vector2(); // 临时UV坐标向量

    // 生成顶点、法线和UV坐标

    for (let j = 0; j <= phiSegments; j++) {
      // 遍历径向分段（从内到外）
      for (let i = 0; i <= thetaSegments; i++) {
        // 遍历角度分段（绕一圈）
        // 值从环的内侧生成到外侧

        const segment = thetaStart + (i / thetaSegments) * thetaLength; // 计算当前角度

        // 计算顶点坐标

        vertex.x = radius * Math.cos(segment); // X坐标 = 半径 × cos(角度)
        vertex.y = radius * Math.sin(segment); // Y坐标 = 半径 × sin(角度)
        // vertex.z 保持为0（环形在XY平面上）

        vertices.push(vertex.x, vertex.y, vertex.z); // 添加顶点坐标到数组

        // 计算法线（环形几何体的法线都指向Z轴正方向）

        normals.push(0, 0, 1); // 法线向量 (0, 0, 1)

        // 计算UV纹理坐标

        uv.x = (vertex.x / outerRadius + 1) / 2; // U坐标：将X坐标标准化到[0,1]范围
        uv.y = (vertex.y / outerRadius + 1) / 2; // V坐标：将Y坐标标准化到[0,1]范围

        uvs.push(uv.x, uv.y); // 添加UV坐标到数组
      }

      // 为下一行顶点增加半径

      radius += radiusStep; // 半径递增，向外扩展
    }

    // 生成索引数组

    for (let j = 0; j < phiSegments; j++) {
      // 遍历径向分段
      const thetaSegmentLevel = j * (thetaSegments + 1); // 计算当前径向层的起始索引

      for (let i = 0; i < thetaSegments; i++) {
        // 遍历角度分段
        const segment = i + thetaSegmentLevel; // 计算当前分段的基础索引

        // 定义四边形的四个顶点索引
        const a = segment; // 当前层当前位置
        const b = segment + thetaSegments + 1; // 下一层当前位置
        const c = segment + thetaSegments + 2; // 下一层下一位置
        const d = segment + 1; // 当前层下一位置

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
   * @param {RingGeometry} source - 源几何体对象
   * @return {RingGeometry} 返回当前对象以支持链式调用
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
   * @return {RingGeometry} 新的几何体实例
   */
  static fromJSON(data) {
    return new RingGeometry(data.innerRadius, data.outerRadius, data.thetaSegments, data.phiSegments, data.thetaStart, data.thetaLength); // 使用JSON数据创建新实例
  }
}

// 导出环形几何体类供外部使用
export { RingGeometry };
