// 导入缓冲几何体基类
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入32位浮点数缓冲属性类，用于存储顶点数据
import { Float32BufferAttribute } from "../core/BufferAttribute.js";
// 导入三维向量类，用于处理3D坐标和法向量计算
import { Vector3 } from "../math/Vector3.js";
// 导入二维向量类，用于处理UV坐标
import { Vector2 } from "../math/Vector2.js";

/**
 * 圆柱体几何体类，用于创建圆柱形状的3D几何体
 * 可以创建完整的圆柱体、圆锥体（顶部或底部半径为0）或截锥体（顶部和底部半径不同）
 * 支持开放式（无顶盖和底盖）或封闭式圆柱体
 *
 * 使用示例：
 * ```js
 * const geometry = new THREE.CylinderGeometry( 5, 5, 20, 32 );
 * const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
 * const cylinder = new THREE.Mesh( geometry, material );
 * scene.add( cylinder );
 * ```
 *
 * @augments BufferGeometry
 */
class CylinderGeometry extends BufferGeometry {
  /**
   * 构造一个新的圆柱体几何体
   *
   * @param {number} [radiusTop=1] - 圆柱体顶部的半径
   * @param {number} [radiusBottom=1] - 圆柱体底部的半径
   * @param {number} [height=1] - 圆柱体的高度
   * @param {number} [radialSegments=32] - 圆柱体周围的径向分段数，影响圆周的圆滑程度
   * @param {number} [heightSegments=1] - 圆柱体沿高度方向的分段数，影响侧面的细分程度
   * @param {boolean} [openEnded=false] - 是否开放端面，false表示封闭（有顶盖和底盖），true表示开放
   * @param {number} [thetaStart=0] - 第一个分段的起始角度，以弧度为单位
   * @param {number} [thetaLength=Math.PI*2] - 圆形扇区的圆心角，以弧度为单位，默认值2π表示完整的圆柱体
   */
  constructor(radiusTop = 1, radiusBottom = 1, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false, thetaStart = 0, thetaLength = Math.PI * 2) {
    // 调用父类BufferGeometry的构造函数
    super();

    // 设置几何体类型标识
    this.type = "CylinderGeometry";

    /**
     * 保存构造函数参数的对象
     * 这些参数用于生成几何体，实例化后的任何修改都不会改变几何体
     * 主要用于序列化、调试和重新创建几何体
     *
     * @type {Object}
     */
    this.parameters = {
      radiusTop: radiusTop, // 顶部半径
      radiusBottom: radiusBottom, // 底部半径
      height: height, // 高度
      radialSegments: radialSegments, // 径向分段数
      heightSegments: heightSegments, // 高度分段数
      openEnded: openEnded, // 是否开放端面
      thetaStart: thetaStart, // 起始角度
      thetaLength: thetaLength, // 圆心角长度
    };

    // 保存当前实例的引用，用于内部函数访问
    const scope = this;

    // 参数标准化（确保为整数）
    radialSegments = Math.floor(radialSegments); // 径向分段数取整
    heightSegments = Math.floor(heightSegments); // 高度分段数取整

    // 缓冲区数组，用于存储几何体数据

    const indices = []; // 顶点索引数组，定义三角形的顶点连接关系
    const vertices = []; // 顶点位置数组，存储每个顶点的x,y,z坐标
    const normals = []; // 法向量数组，存储每个顶点的法向量
    const uvs = []; // UV坐标数组，存储纹理映射坐标

    // 辅助变量

    let index = 0; // 当前顶点索引计数器
    const indexArray = []; // 索引数组，用于存储每一圈顶点的索引
    const halfHeight = height / 2; // 圆柱体的半高，用于定位顶部和底部
    let groupStart = 0; // 当前材质组的起始索引

    // 生成几何体

    generateTorso(); // 生成圆柱体的侧面（主体部分）

    // 如果不是开放式圆柱体，则生成顶盖和底盖
    if (openEnded === false) {
      if (radiusTop > 0) generateCap(true); // 生成顶盖（如果顶部半径大于0）
      if (radiusBottom > 0) generateCap(false); // 生成底盖（如果底部半径大于0）
    }

    // 构建几何体，设置各种属性

    this.setIndex(indices); // 设置顶点索引
    this.setAttribute("position", new Float32BufferAttribute(vertices, 3)); // 设置位置属性（每个顶点3个分量：x,y,z）
    this.setAttribute("normal", new Float32BufferAttribute(normals, 3)); // 设置法向量属性（每个法向量3个分量）
    this.setAttribute("uv", new Float32BufferAttribute(uvs, 2)); // 设置UV属性（每个UV坐标2个分量：u,v）

    /**
     * 生成圆柱体侧面（主体部分）的内部函数
     * 这个函数创建圆柱体的侧面几何体，包括顶点、法向量和UV坐标
     */
    function generateTorso() {
      const normal = new Vector3(); // 临时向量，用于计算法向量
      const vertex = new Vector3(); // 临时向量，用于计算顶点位置

      let groupCount = 0; // 当前组的三角形计数器

      // 计算斜率，用于法向量计算
      // 对于圆锥体或截锥体，侧面不是垂直的，需要考虑斜率
      const slope = (radiusBottom - radiusTop) / height;

      // 生成顶点、法向量和UV坐标

      // 沿高度方向循环，从顶部到底部
      for (let y = 0; y <= heightSegments; y++) {
        const indexRow = []; // 存储当前行的顶点索引

        const v = y / heightSegments; // V坐标（纵向UV坐标），从0到1

        // 计算当前行的半径
        // 通过线性插值在顶部半径和底部半径之间计算
        const radius = v * (radiusBottom - radiusTop) + radiusTop;

        // 沿圆周方向循环
        for (let x = 0; x <= radialSegments; x++) {
          const u = x / radialSegments; // U坐标（横向UV坐标），从0到1

          // 计算当前角度
          const theta = u * thetaLength + thetaStart;

          const sinTheta = Math.sin(theta); // sin值，用于X坐标计算
          const cosTheta = Math.cos(theta); // cos值，用于Z坐标计算

          // 计算顶点位置

          vertex.x = radius * sinTheta; // X坐标：基于半径和角度
          vertex.y = -v * height + halfHeight; // Y坐标：从顶部到底部线性变化
          vertex.z = radius * cosTheta; // Z坐标：基于半径和角度
          vertices.push(vertex.x, vertex.y, vertex.z);

          // 计算法向量
          // 对于圆柱体，法向量指向外侧，需要考虑斜率
          normal.set(sinTheta, slope, cosTheta).normalize();
          normals.push(normal.x, normal.y, normal.z);

          // 设置UV坐标

          uvs.push(u, 1 - v); // U坐标沿圆周，V坐标沿高度（翻转）

          // 保存当前顶点的索引到当前行

          indexRow.push(index++);
        }

        // 将当前行的顶点索引保存到索引数组中

        indexArray.push(indexRow);
      }

      // 生成三角形索引

      // 沿圆周方向循环
      for (let x = 0; x < radialSegments; x++) {
        // 沿高度方向循环
        for (let y = 0; y < heightSegments; y++) {
          // 使用索引数组访问正确的顶点索引
          // 形成一个四边形，然后分解为两个三角形

          const a = indexArray[y][x]; // 当前行当前列
          const b = indexArray[y + 1][x]; // 下一行当前列
          const c = indexArray[y + 1][x + 1]; // 下一行下一列
          const d = indexArray[y][x + 1]; // 当前行下一列

          // 生成三角形面

          // 第一个三角形（避免在圆锥顶部生成退化三角形）
          if (radiusTop > 0 || y !== 0) {
            indices.push(a, b, d);
            groupCount += 3;
          }

          // 第二个三角形（避免在圆锥底部生成退化三角形）
          if (radiusBottom > 0 || y !== heightSegments - 1) {
            indices.push(b, c, d);
            groupCount += 3;
          }
        }
      }

      // 为几何体添加一个组，这将确保多材质支持

      scope.addGroup(groupStart, groupCount, 0);

      // 计算下一个组的起始值

      groupStart += groupCount;
    }

    /**
     * 生成圆柱体端盖（顶盖或底盖）的内部函数
     *
     * @param {boolean} top - true表示生成顶盖，false表示生成底盖
     */
    function generateCap(top) {
      // 保存第一个中心顶点的索引
      const centerIndexStart = index;

      const uv = new Vector2(); // 临时向量，用于计算UV坐标
      const vertex = new Vector3(); // 临时向量，用于计算顶点位置

      let groupCount = 0; // 当前组的三角形计数器

      // 根据是顶盖还是底盖确定半径和方向
      const radius = top === true ? radiusTop : radiusBottom; // 选择对应的半径
      const sign = top === true ? 1 : -1; // 方向标志：顶盖向上(+1)，底盖向下(-1)

      // 首先生成端盖的中心顶点数据
      // 因为几何体需要每个面有一套UV坐标，
      // 所以必须为每个面/分段生成一个中心顶点

      for (let x = 1; x <= radialSegments; x++) {
        // 中心顶点位置

        vertices.push(0, halfHeight * sign, 0); // 位置：圆心，Y坐标根据顶盖/底盖确定

        // 中心顶点法向量

        normals.push(0, sign, 0); // 法向量：垂直向上或向下

        // 中心顶点UV坐标

        uvs.push(0.5, 0.5); // UV坐标：纹理中心点

        // 增加索引计数器

        index++;
      }

      // 保存最后一个中心顶点的索引
      const centerIndexEnd = index;

      // 现在生成周围的顶点、法向量和UV坐标

      for (let x = 0; x <= radialSegments; x++) {
        const u = x / radialSegments; // U坐标参数
        const theta = u * thetaLength + thetaStart; // 当前角度

        const cosTheta = Math.cos(theta); // cos值，用于坐标计算
        const sinTheta = Math.sin(theta); // sin值，用于坐标计算

        // 周围顶点位置

        vertex.x = radius * sinTheta; // X坐标：基于半径和角度
        vertex.y = halfHeight * sign; // Y坐标：端盖的高度位置
        vertex.z = radius * cosTheta; // Z坐标：基于半径和角度
        vertices.push(vertex.x, vertex.y, vertex.z);

        // 周围顶点法向量

        normals.push(0, sign, 0); // 法向量：垂直向上或向下

        // 周围顶点UV坐标
        // 将圆形坐标映射到[0,1]范围的纹理坐标

        uv.x = cosTheta * 0.5 + 0.5; // U坐标：从圆形坐标转换为纹理坐标
        uv.y = sinTheta * 0.5 * sign + 0.5; // V坐标：考虑顶盖/底盖的方向
        uvs.push(uv.x, uv.y);

        // 增加索引计数器

        index++;
      }

      // 生成三角形索引

      for (let x = 0; x < radialSegments; x++) {
        const c = centerIndexStart + x; // 中心顶点索引
        const i = centerIndexEnd + x; // 周围顶点索引

        if (top === true) {
          // 顶盖面（逆时针方向，法向量向上）

          indices.push(i, i + 1, c);
        } else {
          // 底盖面（顺时针方向，法向量向下）

          indices.push(i + 1, i, c);
        }

        groupCount += 3; // 每个三角形3个索引
      }

      // 为几何体添加一个组，这将确保多材质支持
      // 材质索引：0=侧面，1=顶盖，2=底盖

      scope.addGroup(groupStart, groupCount, top === true ? 1 : 2);

      // 计算下一个组的起始值

      groupStart += groupCount;
    }
  }

  /**
   * 复制另一个CylinderGeometry实例的属性到当前实例
   *
   * @param {CylinderGeometry} source - 要复制的源几何体对象
   * @return {CylinderGeometry} 返回当前实例，支持链式调用
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
   * 从JSON对象创建CylinderGeometry实例的工厂方法
   * 用于反序列化，将序列化的JSON数据重新构建为几何体对象
   *
   * @param {Object} data - 包含序列化几何体数据的JSON对象
   * @return {CylinderGeometry} 返回新创建的圆柱体几何体实例
   */
  static fromJSON(data) {
    // 使用JSON数据中的参数创建新的CylinderGeometry实例
    return new CylinderGeometry(data.radiusTop, data.radiusBottom, data.height, data.radialSegments, data.heightSegments, data.openEnded, data.thetaStart, data.thetaLength);
  }
}

// 导出CylinderGeometry类，使其可以被其他模块导入和使用
export { CylinderGeometry };
