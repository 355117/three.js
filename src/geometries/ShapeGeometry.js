// 导入必要的Three.js核心模块
import { BufferGeometry } from "../core/BufferGeometry.js"; // 导入缓冲几何体基类
import { Float32BufferAttribute } from "../core/BufferAttribute.js"; // 导入32位浮点数缓冲属性类
import { Shape } from "../extras/core/Shape.js"; // 导入形状类
import { ShapeUtils } from "../extras/ShapeUtils.js"; // 导入形状工具类
import { Vector2 } from "../math/Vector2.js"; // 导入二维向量类

/**
 * 形状几何体类
 * 从一个或多个路径形状创建单面多边形几何体
 *
 * 使用示例：
 * ```js
 * const arcShape = new THREE.Shape()
 *	.moveTo( 5, 1 )
 *	.absarc( 1, 1, 4, 0, Math.PI * 2, false );
 *
 * const geometry = new THREE.ShapeGeometry( arcShape );
 * const material = new THREE.MeshBasicMaterial( { color: 0x00ff00, side: THREE.DoubleSide } );
 * const mesh = new THREE.Mesh( geometry, material ) ;
 * scene.add( mesh );
 * ```
 *
 * @augments BufferGeometry
 */
class ShapeGeometry extends BufferGeometry {
  /**
   * 构造一个新的形状几何体
   *
   * @param {Shape|Array<Shape>} [shapes] - 一个形状或形状数组
   * @param {number} [curveSegments=12] - 每个形状的分段数
   */
  constructor(shapes = new Shape([new Vector2(0, 0.5), new Vector2(-0.5, -0.5), new Vector2(0.5, -0.5)]), curveSegments = 12) {
    // 调用父类构造函数
    super();

    // 设置几何体类型标识
    this.type = "ShapeGeometry";

    /**
     * 保存用于生成几何体的构造函数参数
     * 实例化后的任何修改都不会改变几何体
     *
     * @type {Object}
     */
    this.parameters = {
      shapes: shapes, // 形状数据
      curveSegments: curveSegments, // 曲线分段数
    };

    // 缓冲区数组

    const indices = []; // 索引数组
    const vertices = []; // 顶点坐标数组
    const normals = []; // 法线数组
    const uvs = []; // UV纹理坐标数组

    // 辅助变量

    let groupStart = 0; // 当前组的起始索引
    let groupCount = 0; // 当前组的索引数量

    // 允许"shapes"参数为单个值或数组值

    if (Array.isArray(shapes) === false) {
      // 如果shapes不是数组
      addShape(shapes); // 直接添加单个形状
    } else {
      // 如果shapes是数组
      for (let i = 0; i < shapes.length; i++) {
        // 遍历形状数组
        addShape(shapes[i]); // 添加每个形状

        this.addGroup(groupStart, groupCount, i); // 启用多材质支持，为每个形状创建一个组

        groupStart += groupCount; // 更新下一组的起始位置
        groupCount = 0; // 重置组计数
      }
    }

    // 构建几何体

    this.setIndex(indices); // 设置索引数组
    this.setAttribute("position", new Float32BufferAttribute(vertices, 3)); // 设置位置属性（每个顶点3个分量：x,y,z）
    this.setAttribute("normal", new Float32BufferAttribute(normals, 3)); // 设置法线属性（每个顶点3个分量：nx,ny,nz）
    this.setAttribute("uv", new Float32BufferAttribute(uvs, 2)); // 设置UV纹理坐标属性（每个顶点2个分量：u,v）

    // 辅助函数定义

    /**
     * 添加形状函数 - 将形状转换为几何体数据
     * @param {Shape} shape - 要添加的形状对象
     */
    function addShape(shape) {
      const indexOffset = vertices.length / 3; // 计算当前顶点索引偏移量
      const points = shape.extractPoints(curveSegments); // 从形状中提取点数据

      let shapeVertices = points.shape; // 形状外轮廓顶点
      const shapeHoles = points.holes; // 形状内部孔洞顶点数组

      // 检查顶点方向

      if (ShapeUtils.isClockWise(shapeVertices) === false) {
        // 如果外轮廓不是顺时针方向
        shapeVertices = shapeVertices.reverse(); // 反转顶点顺序使其变为顺时针
      }

      // 处理孔洞顶点方向
      for (let i = 0, l = shapeHoles.length; i < l; i++) {
        // 遍历所有孔洞
        const shapeHole = shapeHoles[i]; // 当前孔洞顶点

        if (ShapeUtils.isClockWise(shapeHole) === true) {
          // 如果孔洞是顺时针方向
          shapeHoles[i] = shapeHole.reverse(); // 反转顶点顺序使其变为逆时针
        }
      }

      // 对形状进行三角剖分
      const faces = ShapeUtils.triangulateShape(shapeVertices, shapeHoles);

      // 将内部和外部路径的顶点合并到单个数组中

      for (let i = 0, l = shapeHoles.length; i < l; i++) {
        // 遍历所有孔洞
        const shapeHole = shapeHoles[i]; // 当前孔洞顶点
        shapeVertices = shapeVertices.concat(shapeHole); // 将孔洞顶点合并到主顶点数组
      }

      // 生成顶点、法线和UV坐标

      for (let i = 0, l = shapeVertices.length; i < l; i++) {
        // 遍历所有顶点
        const vertex = shapeVertices[i]; // 当前顶点

        vertices.push(vertex.x, vertex.y, 0); // 添加顶点坐标（Z坐标为0，形状在XY平面上）
        normals.push(0, 0, 1); // 添加法线向量（指向Z轴正方向）
        uvs.push(vertex.x, vertex.y); // 添加世界UV坐标（直接使用世界坐标）
      }

      // 生成索引

      for (let i = 0, l = faces.length; i < l; i++) {
        // 遍历所有三角面
        const face = faces[i]; // 当前三角面（包含3个顶点索引）

        // 计算实际的顶点索引（加上偏移量）
        const a = face[0] + indexOffset; // 第一个顶点索引
        const b = face[1] + indexOffset; // 第二个顶点索引
        const c = face[2] + indexOffset; // 第三个顶点索引

        indices.push(a, b, c); // 添加三角面索引
        groupCount += 3; // 增加组计数（每个三角面3个索引）
      }
    }
  }

  /**
   * 复制方法 - 从另一个几何体复制属性
   * @param {ShapeGeometry} source - 源几何体对象
   * @return {ShapeGeometry} 返回当前对象以支持链式调用
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

    const shapes = this.parameters.shapes; // 获取形状参数

    return toJSON(shapes, data); // 调用toJSON辅助函数
  }

  /**
   * 从JSON数据创建几何体实例的工厂方法
   *
   * @param {Object} data - 表示序列化几何体的JSON对象
   * @param {Array<Shape>} shapes - 形状数组
   * @return {ShapeGeometry} 新的几何体实例
   */
  static fromJSON(data, shapes) {
    const geometryShapes = []; // 存储几何体形状的数组

    // 根据JSON数据中的形状ID查找对应的形状对象
    for (let j = 0, jl = data.shapes.length; j < jl; j++) {
      // 遍历形状ID数组
      const shape = shapes[data.shapes[j]]; // 根据ID获取形状对象

      geometryShapes.push(shape); // 添加到几何体形状数组
    }

    return new ShapeGeometry(geometryShapes, data.curveSegments); // 使用形状数组和曲线分段数创建新实例
  }
}

/**
 * 将形状转换为JSON格式的辅助函数
 * @param {Shape|Array<Shape>} shapes - 形状或形状数组
 * @param {Object} data - 几何体数据对象
 * @return {Object} 包含形状UUID的数据对象
 */
function toJSON(shapes, data) {
  data.shapes = []; // 初始化形状数组

  if (Array.isArray(shapes)) {
    // 如果shapes是数组
    for (let i = 0, l = shapes.length; i < l; i++) {
      // 遍历形状数组
      const shape = shapes[i]; // 当前形状

      data.shapes.push(shape.uuid); // 添加形状的UUID到数据中
    }
  } else {
    // 如果shapes是单个形状
    data.shapes.push(shapes.uuid); // 直接添加形状的UUID
  }

  return data; // 返回包含形状信息的数据对象
}

// 导出形状几何体类供外部使用
export { ShapeGeometry };
