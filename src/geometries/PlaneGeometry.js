// 导入缓冲几何体基类
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入32位浮点数缓冲属性类
import { Float32BufferAttribute } from "../core/BufferAttribute.js";

/**
 * 平面几何体类，用于创建矩形平面
 * 平面是一个二维的矩形表面，可以用于创建地面、墙壁、屏幕等
 *
 * ```js
 * const geometry = new THREE.PlaneGeometry( 1, 1 );
 * const material = new THREE.MeshBasicMaterial( { color: 0xffff00, side: THREE.DoubleSide } );
 * const plane = new THREE.Mesh( geometry, material );
 * scene.add( plane );
 * ```
 *
 * @augments BufferGeometry
 */
class PlaneGeometry extends BufferGeometry {
  /**
   * 构造一个新的平面几何体
   *
   * @param {number} [width=1] - 沿X轴的宽度
   * @param {number} [height=1] - 沿Y轴的高度
   * @param {number} [widthSegments=1] - 沿X轴的分段数，用于增加细节
   * @param {number} [heightSegments=1] - 沿Y轴的分段数，用于增加细节
   */
  constructor(width = 1, height = 1, widthSegments = 1, heightSegments = 1) {
    // 调用父类构造函数
    super();

    // 设置几何体类型标识
    this.type = "PlaneGeometry";

    /**
     * 保存用于生成几何体的构造参数
     * 实例化后的任何修改都不会改变几何体
     *
     * @type {Object}
     */
    this.parameters = {
      width: width, // 宽度参数
      height: height, // 高度参数
      widthSegments: widthSegments, // 宽度分段数
      heightSegments: heightSegments, // 高度分段数
    };

    // 计算平面的半宽和半高，用于居中定位
    const width_half = width / 2;
    const height_half = height / 2;

    // 确保分段数为整数
    const gridX = Math.floor(widthSegments);
    const gridY = Math.floor(heightSegments);

    // 计算网格顶点数量（分段数+1）
    const gridX1 = gridX + 1;
    const gridY1 = gridY + 1;

    // 计算每个分段的宽度和高度
    const segment_width = width / gridX;
    const segment_height = height / gridY;

    // 初始化存储几何数据的数组

    const indices = []; // 存储三角形索引
    const vertices = []; // 存储顶点坐标
    const normals = []; // 存储法向量
    const uvs = []; // 存储UV纹理坐标

    // 生成顶点、法向量和UV坐标
    // 外层循环：遍历Y方向的所有网格行
    for (let iy = 0; iy < gridY1; iy++) {
      // 计算当前行的Y坐标（从-height_half到+height_half）
      const y = iy * segment_height - height_half;

      // 内层循环：遍历X方向的所有网格列
      for (let ix = 0; ix < gridX1; ix++) {
        // 计算当前列的X坐标（从-width_half到+width_half）
        const x = ix * segment_width - width_half;

        // 添加顶点坐标（x, -y, 0），注意Y坐标取负值以符合Three.js坐标系
        vertices.push(x, -y, 0);

        // 添加法向量（0, 0, 1），平面法向量指向Z轴正方向
        normals.push(0, 0, 1);

        // 添加UV纹理坐标
        uvs.push(ix / gridX); // U坐标：从0到1
        uvs.push(1 - iy / gridY); // V坐标：从1到0（翻转Y轴）
      }
    }

    // 生成三角形索引
    // 外层循环：遍历Y方向的所有网格单元
    for (let iy = 0; iy < gridY; iy++) {
      // 内层循环：遍历X方向的所有网格单元
      for (let ix = 0; ix < gridX; ix++) {
        // 计算当前网格单元四个顶点的索引
        const a = ix + gridX1 * iy; // 左下角顶点
        const b = ix + gridX1 * (iy + 1); // 左上角顶点
        const c = ix + 1 + gridX1 * (iy + 1); // 右上角顶点
        const d = ix + 1 + gridX1 * iy; // 右下角顶点

        // 将网格单元分割为两个三角形
        indices.push(a, b, d); // 第一个三角形：左下-左上-右下
        indices.push(b, c, d); // 第二个三角形：左上-右上-右下
      }
    }

    // 设置几何体的索引数组
    this.setIndex(indices);
    // 设置位置属性（顶点坐标）
    this.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    // 设置法向量属性
    this.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    // 设置UV纹理坐标属性
    this.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  }

  /**
   * 复制另一个平面几何体的属性到当前实例
   *
   * @param {PlaneGeometry} source - 要复制的源几何体
   * @return {PlaneGeometry} 返回当前实例，支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 复制构造参数
    this.parameters = Object.assign({}, source.parameters);

    // 返回当前实例
    return this;
  }

  /**
   * 从JSON对象创建平面几何体实例的工厂方法
   *
   * @param {Object} data - 表示序列化几何体的JSON对象
   * @return {PlaneGeometry} 新的平面几何体实例
   */
  static fromJSON(data) {
    // 使用JSON数据中的参数创建新的平面几何体实例
    return new PlaneGeometry(data.width, data.height, data.widthSegments, data.heightSegments);
  }
}

// 导出平面几何体类
export { PlaneGeometry };
