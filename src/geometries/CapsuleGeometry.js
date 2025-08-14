// 导入缓冲几何体基类
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入32位浮点数缓冲属性类，用于存储顶点数据
import { Float32BufferAttribute } from "../core/BufferAttribute.js";
// 导入三维向量类，用于处理3D坐标和法向量计算
import { Vector3 } from "../math/Vector3.js";

/**
 * 胶囊几何体类，用于创建胶囊形状的3D几何体
 * 胶囊体由一个圆柱体和两个半球体组成，类似于药丸的形状
 * 顶部和底部是半球形的端盖，中间是圆柱形的主体
 *
 * 使用示例：
 * ```js
 * const geometry = new THREE.CapsuleGeometry( 1, 1, 4, 8, 1 );
 * const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
 * const capsule = new THREE.Mesh( geometry, material );
 * scene.add( capsule );
 * ```
 *
 * @augments BufferGeometry
 */
class CapsuleGeometry extends BufferGeometry {
  /**
   * 构造一个新的胶囊几何体
   *
   * @param {number} [radius=1] - 胶囊的半径，影响整个胶囊的粗细
   * @param {number} [height=1] - 中间圆柱部分的高度，不包括两端的半球
   * @param {number} [capSegments=4] - 每个端盖（半球）的曲线分段数，影响端盖的圆滑程度
   * @param {number} [radialSegments=8] - 胶囊周围的径向分段数，必须是>=3的整数，影响圆周的圆滑程度
   * @param {number} [heightSegments=1] - 中间圆柱部分沿高度方向的分段数，必须是>=1的整数
   */
  constructor(radius = 1, height = 1, capSegments = 4, radialSegments = 8, heightSegments = 1) {
    // 调用父类BufferGeometry的构造函数
    super();

    // 设置几何体类型标识
    this.type = "CapsuleGeometry";

    /**
     * 保存构造函数参数的对象
     * 这些参数用于生成几何体，实例化后的任何修改都不会改变几何体
     * 主要用于序列化、调试和重新创建几何体
     *
     * @type {Object}
     */
    this.parameters = {
      radius: radius, // 胶囊半径
      height: height, // 中间圆柱部分高度
      capSegments: capSegments, // 端盖分段数
      radialSegments: radialSegments, // 径向分段数
      heightSegments: heightSegments, // 高度分段数
    };

    // 参数验证和标准化
    height = Math.max(0, height); // 确保高度非负
    capSegments = Math.max(1, Math.floor(capSegments)); // 确保端盖分段数至少为1且为整数
    radialSegments = Math.max(3, Math.floor(radialSegments)); // 确保径向分段数至少为3且为整数
    heightSegments = Math.max(1, Math.floor(heightSegments)); // 确保高度分段数至少为1且为整数

    // 缓冲区数组，用于存储几何体数据

    const indices = []; // 顶点索引数组，定义三角形的顶点连接关系
    const vertices = []; // 顶点位置数组，存储每个顶点的x,y,z坐标
    const normals = []; // 法向量数组，存储每个顶点的法向量
    const uvs = []; // UV坐标数组，存储纹理映射坐标

    // 辅助变量和几何计算

    const halfHeight = height / 2; // 圆柱部分的半高
    const capArcLength = (Math.PI / 2) * radius; // 每个端盖的弧长（四分之一圆周）
    const cylinderPartLength = height; // 圆柱部分的长度
    const totalArcLength = 2 * capArcLength + cylinderPartLength; // 总弧长（两个端盖 + 圆柱部分）

    const numVerticalSegments = capSegments * 2 + heightSegments; // 垂直方向的总分段数（底部端盖 + 圆柱 + 顶部端盖）
    const verticesPerRow = radialSegments + 1; // 每行的顶点数（径向分段数 + 1）

    const normal = new Vector3(); // 临时向量，用于计算法向量
    const vertex = new Vector3(); // 临时向量，用于计算顶点位置

    // 生成顶点、法向量和UV坐标
    // 胶囊体从底部端盖开始，经过圆柱部分，到顶部端盖

    for (let iy = 0; iy <= numVerticalSegments; iy++) {
      // 当前分段的几何参数
      let currentArcLength = 0; // 当前位置在总弧长中的位置
      let profileY = 0; // 当前分段的Y坐标
      let profileRadius = 0; // 当前分段的半径
      let normalYComponent = 0; // 法向量的Y分量

      if (iy <= capSegments) {
        // 底部端盖（下半球）
        const segmentProgress = iy / capSegments; // 在端盖中的进度（0到1）
        const angle = (segmentProgress * Math.PI) / 2; // 角度从0到π/2
        profileY = -halfHeight - radius * Math.cos(angle); // Y坐标：从最底部开始向上
        profileRadius = radius * Math.sin(angle); // 半径：从0增加到最大半径
        normalYComponent = -radius * Math.cos(angle); // 法向量Y分量：向下
        currentArcLength = segmentProgress * capArcLength; // 弧长进度
      } else if (iy <= capSegments + heightSegments) {
        // 中间圆柱部分
        const segmentProgress = (iy - capSegments) / heightSegments; // 在圆柱部分的进度（0到1）
        profileY = -halfHeight + segmentProgress * height; // Y坐标：从底部到顶部线性变化
        profileRadius = radius; // 半径：保持恒定
        normalYComponent = 0; // 法向量Y分量：水平方向，为0
        currentArcLength = capArcLength + segmentProgress * cylinderPartLength; // 弧长进度
      } else {
        // 顶部端盖（上半球）
        const segmentProgress = (iy - capSegments - heightSegments) / capSegments; // 在端盖中的进度（0到1）
        const angle = (segmentProgress * Math.PI) / 2; // 角度从0到π/2
        profileY = halfHeight + radius * Math.sin(angle); // Y坐标：从圆柱顶部继续向上
        profileRadius = radius * Math.cos(angle); // 半径：从最大半径减少到0
        normalYComponent = radius * Math.sin(angle); // 法向量Y分量：向上
        currentArcLength = capArcLength + cylinderPartLength + segmentProgress * capArcLength; // 弧长进度
      }

      // 计算V坐标（纵向UV坐标），基于当前位置在总弧长中的比例
      const v = Math.max(0, Math.min(1, currentArcLength / totalArcLength));

      // 处理极点的特殊情况（顶部和底部的中心点）
      // 为了避免纹理扭曲，在极点处稍微偏移U坐标

      let uOffset = 0;

      if (iy === 0) {
        // 底部极点：稍微向右偏移
        uOffset = 0.5 / radialSegments;
      } else if (iy === numVerticalSegments) {
        // 顶部极点：稍微向左偏移
        uOffset = -0.5 / radialSegments;
      }

      // 生成当前水平圈上的所有顶点
      for (let ix = 0; ix <= radialSegments; ix++) {
        const u = ix / radialSegments; // U坐标（横向UV坐标）
        const theta = u * Math.PI * 2; // 当前角度（0到2π）

        const sinTheta = Math.sin(theta); // sin值，用于Z坐标计算
        const cosTheta = Math.cos(theta); // cos值，用于X坐标计算

        // 计算顶点位置

        vertex.x = -profileRadius * cosTheta; // X坐标：负号是为了正确的绕向
        vertex.y = profileY; // Y坐标：当前分段的高度
        vertex.z = profileRadius * sinTheta; // Z坐标：基于角度和半径
        vertices.push(vertex.x, vertex.y, vertex.z);

        // 计算法向量

        normal.set(-profileRadius * cosTheta, normalYComponent, profileRadius * sinTheta);
        normal.normalize(); // 标准化法向量，使其长度为1
        normals.push(normal.x, normal.y, normal.z);

        // 设置UV坐标

        uvs.push(u + uOffset, v); // U坐标加上极点偏移，V坐标基于弧长比例
      }

      // 生成三角形索引（除了第一行，因为没有前一行可以连接）
      if (iy > 0) {
        const prevIndexRow = (iy - 1) * verticesPerRow; // 前一行的起始索引
        for (let ix = 0; ix < radialSegments; ix++) {
          // 计算四个顶点的索引，形成一个四边形
          const i1 = prevIndexRow + ix; // 前一行当前列
          const i2 = prevIndexRow + ix + 1; // 前一行下一列
          const i3 = iy * verticesPerRow + ix; // 当前行当前列
          const i4 = iy * verticesPerRow + ix + 1; // 当前行下一列

          // 将四边形分解为两个三角形
          indices.push(i1, i2, i3); // 第一个三角形
          indices.push(i2, i4, i3); // 第二个三角形
        }
      }
    }

    // 构建几何体，设置各种属性

    this.setIndex(indices); // 设置顶点索引
    this.setAttribute("position", new Float32BufferAttribute(vertices, 3)); // 设置位置属性（每个顶点3个分量：x,y,z）
    this.setAttribute("normal", new Float32BufferAttribute(normals, 3)); // 设置法向量属性（每个法向量3个分量）
    this.setAttribute("uv", new Float32BufferAttribute(uvs, 2)); // 设置UV属性（每个UV坐标2个分量：u,v）
  }

  /**
   * 复制另一个CapsuleGeometry实例的属性到当前实例
   *
   * @param {CapsuleGeometry} source - 要复制的源几何体对象
   * @return {CapsuleGeometry} 返回当前实例，支持链式调用
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
   * 从JSON对象创建CapsuleGeometry实例的工厂方法
   * 用于反序列化，将序列化的JSON数据重新构建为几何体对象
   *
   * @param {Object} data - 包含序列化几何体数据的JSON对象
   * @return {CapsuleGeometry} 返回新创建的胶囊几何体实例
   */
  static fromJSON(data) {
    // 使用JSON数据中的参数创建新的CapsuleGeometry实例
    return new CapsuleGeometry(data.radius, data.height, data.capSegments, data.radialSegments, data.heightSegments);
  }
}

// 导出CapsuleGeometry类，使其可以被其他模块导入和使用
export { CapsuleGeometry };
