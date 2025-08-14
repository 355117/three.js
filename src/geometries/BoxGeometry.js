// 导入缓冲几何体基类
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入32位浮点数缓冲属性类，用于存储顶点数据
import { Float32BufferAttribute } from "../core/BufferAttribute.js";
// 导入三维向量类，用于处理3D坐标
import { Vector3 } from "../math/Vector3.js";

/**
 * 立方体几何体类，用于创建矩形长方体的3D几何体
 * 创建时，长方体以原点为中心，每条边都平行于坐标轴
 * 可以指定宽度、高度、深度以及各个方向的分段数
 *
 * 使用示例：
 * ```js
 * const geometry = new THREE.BoxGeometry( 1, 1, 1 );
 * const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
 * const cube = new THREE.Mesh( geometry, material );
 * scene.add( cube );
 * ```
 *
 * @augments BufferGeometry
 */
class BoxGeometry extends BufferGeometry {
  /**
   * 构造一个新的立方体几何体
   *
   * @param {number} [width=1] - 宽度，即平行于X轴的边的长度
   * @param {number} [height=1] - 高度，即平行于Y轴的边的长度
   * @param {number} [depth=1] - 深度，即平行于Z轴的边的长度
   * @param {number} [widthSegments=1] - 沿宽度方向的分段数，影响侧面的细分程度
   * @param {number} [heightSegments=1] - 沿高度方向的分段数，影响侧面的细分程度
   * @param {number} [depthSegments=1] - 沿深度方向的分段数，影响侧面的细分程度
   */
  constructor(width = 1, height = 1, depth = 1, widthSegments = 1, heightSegments = 1, depthSegments = 1) {
    // 调用父类BufferGeometry的构造函数
    super();

    // 设置几何体类型标识
    this.type = "BoxGeometry";

    /**
     * 保存构造函数参数的对象
     * 这些参数用于生成几何体，实例化后的任何修改都不会改变几何体
     * 主要用于序列化、调试和重新创建几何体
     *
     * @type {Object}
     */
    this.parameters = {
      width: width, // 宽度
      height: height, // 高度
      depth: depth, // 深度
      widthSegments: widthSegments, // 宽度分段数
      heightSegments: heightSegments, // 高度分段数
      depthSegments: depthSegments, // 深度分段数
    };

    // 保存当前实例的引用，用于内部函数访问
    const scope = this;

    // 分段数标准化（确保为整数）

    widthSegments = Math.floor(widthSegments); // 宽度分段数取整
    heightSegments = Math.floor(heightSegments); // 高度分段数取整
    depthSegments = Math.floor(depthSegments); // 深度分段数取整

    // 缓冲区数组，用于存储几何体数据

    const indices = []; // 顶点索引数组，定义三角形的顶点连接关系
    const vertices = []; // 顶点位置数组，存储每个顶点的x,y,z坐标
    const normals = []; // 法向量数组，存储每个顶点的法向量
    const uvs = []; // UV坐标数组，存储纹理映射坐标

    // 辅助变量

    let numberOfVertices = 0; // 当前已生成的顶点总数
    let groupStart = 0; // 当前材质组的起始索引

    // 构建立方体的六个面
    // 每个面都通过buildPlane函数生成，参数指定了坐标轴映射、方向和尺寸

    buildPlane("z", "y", "x", -1, -1, depth, height, width, depthSegments, heightSegments, 0); // 正X面 (右面)
    buildPlane("z", "y", "x", 1, -1, depth, height, -width, depthSegments, heightSegments, 1); // 负X面 (左面)
    buildPlane("x", "z", "y", 1, 1, width, depth, height, widthSegments, depthSegments, 2); // 正Y面 (顶面)
    buildPlane("x", "z", "y", 1, -1, width, depth, -height, widthSegments, depthSegments, 3); // 负Y面 (底面)
    buildPlane("x", "y", "z", 1, -1, width, height, depth, widthSegments, heightSegments, 4); // 正Z面 (前面)
    buildPlane("x", "y", "z", -1, -1, width, height, -depth, widthSegments, heightSegments, 5); // 负Z面 (后面)

    // 构建几何体，设置各种属性

    this.setIndex(indices); // 设置顶点索引
    this.setAttribute("position", new Float32BufferAttribute(vertices, 3)); // 设置位置属性（每个顶点3个分量：x,y,z）
    this.setAttribute("normal", new Float32BufferAttribute(normals, 3)); // 设置法向量属性（每个法向量3个分量）
    this.setAttribute("uv", new Float32BufferAttribute(uvs, 2)); // 设置UV属性（每个UV坐标2个分量：u,v）

    /**
     * 构建立方体的一个面的内部函数
     *
     * @param {string} u - U轴对应的坐标轴名称 ('x', 'y', 或 'z')
     * @param {string} v - V轴对应的坐标轴名称 ('x', 'y', 或 'z')
     * @param {string} w - W轴（深度轴）对应的坐标轴名称 ('x', 'y', 或 'z')
     * @param {number} udir - U轴方向 (1 或 -1)
     * @param {number} vdir - V轴方向 (1 或 -1)
     * @param {number} width - 面的宽度
     * @param {number} height - 面的高度
     * @param {number} depth - 面的深度（距离原点的距离）
     * @param {number} gridX - 水平方向的分段数
     * @param {number} gridY - 垂直方向的分段数
     * @param {number} materialIndex - 材质索引，用于多材质支持
     */
    function buildPlane(u, v, w, udir, vdir, width, height, depth, gridX, gridY, materialIndex) {
      const segmentWidth = width / gridX; // 每个分段的宽度
      const segmentHeight = height / gridY; // 每个分段的高度

      const widthHalf = width / 2; // 宽度的一半，用于居中
      const heightHalf = height / 2; // 高度的一半，用于居中
      const depthHalf = depth / 2; // 深度的一半，用于定位面的位置

      const gridX1 = gridX + 1; // 水平方向的顶点数（分段数+1）
      const gridY1 = gridY + 1; // 垂直方向的顶点数（分段数+1）

      let vertexCounter = 0; // 当前面的顶点计数器
      let groupCount = 0; // 当前面的三角形计数器

      const vector = new Vector3(); // 临时向量，用于计算顶点位置和法向量

      // 生成顶点、法向量和UV坐标

      for (let iy = 0; iy < gridY1; iy++) {
        const y = iy * segmentHeight - heightHalf; // 当前行的Y坐标（相对于面中心）

        for (let ix = 0; ix < gridX1; ix++) {
          const x = ix * segmentWidth - widthHalf; // 当前列的X坐标（相对于面中心）

          // 设置向量的正确分量（根据面的方向）

          vector[u] = x * udir; // U轴坐标
          vector[v] = y * vdir; // V轴坐标
          vector[w] = depthHalf; // W轴坐标（面的深度位置）

          // 将向量应用到顶点缓冲区

          vertices.push(vector.x, vector.y, vector.z);

          // 设置法向量的正确分量

          vector[u] = 0; // U轴法向量分量为0
          vector[v] = 0; // V轴法向量分量为0
          vector[w] = depth > 0 ? 1 : -1; // W轴法向量分量，根据深度方向确定

          // 将法向量应用到法向量缓冲区

          normals.push(vector.x, vector.y, vector.z);

          // 生成UV坐标

          uvs.push(ix / gridX); // U坐标：从0到1
          uvs.push(1 - iy / gridY); // V坐标：从1到0（翻转Y轴）

          // 更新计数器

          vertexCounter += 1;
        }
      }

      // 生成索引

      // 索引生成说明：
      // 1. 绘制一个三角形面需要三个索引
      // 2. 一个分段由两个三角形面组成
      // 3. 所以每个分段需要生成六个索引 (2*3)

      for (let iy = 0; iy < gridY; iy++) {
        for (let ix = 0; ix < gridX; ix++) {
          // 计算四个顶点的索引，形成一个四边形
          const a = numberOfVertices + ix + gridX1 * iy; // 左下角顶点
          const b = numberOfVertices + ix + gridX1 * (iy + 1); // 左上角顶点
          const c = numberOfVertices + (ix + 1) + gridX1 * (iy + 1); // 右上角顶点
          const d = numberOfVertices + (ix + 1) + gridX1 * iy; // 右下角顶点

          // 将四边形分解为两个三角形

          indices.push(a, b, d); // 第一个三角形：左下 -> 左上 -> 右下
          indices.push(b, c, d); // 第二个三角形：左上 -> 右上 -> 右下

          // 增加三角形计数器

          groupCount += 6; // 每个四边形产生6个索引（2个三角形 × 3个顶点）
        }
      }

      // 为几何体添加一个组，这将确保多材质支持

      scope.addGroup(groupStart, groupCount, materialIndex);

      // 计算下一个组的起始值

      groupStart += groupCount;

      // 更新顶点总数

      numberOfVertices += vertexCounter;
    }
  }

  /**
   * 复制另一个BoxGeometry实例的属性到当前实例
   *
   * @param {BoxGeometry} source - 要复制的源几何体对象
   * @return {BoxGeometry} 返回当前实例，支持链式调用
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
   * 从JSON对象创建BoxGeometry实例的工厂方法
   * 用于反序列化，将序列化的JSON数据重新构建为几何体对象
   *
   * @param {Object} data - 包含序列化几何体数据的JSON对象
   * @return {BoxGeometry} 返回新创建的立方体几何体实例
   */
  static fromJSON(data) {
    // 使用JSON数据中的参数创建新的BoxGeometry实例
    return new BoxGeometry(data.width, data.height, data.depth, data.widthSegments, data.heightSegments, data.depthSegments);
  }
}

// 导出BoxGeometry类，使其可以被其他模块导入和使用
export { BoxGeometry };
