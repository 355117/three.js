// 导入路径类和UUID生成工具
// Import Path class and UUID generation utility
import { Path } from "./Path.js";
import { generateUUID } from "../../math/MathUtils.js";

/**
 * 定义一个任意的2D形状平面，使用路径和可选的孔洞。
 * 可以与 {@link ExtrudeGeometry}、{@link ShapeGeometry} 一起使用，
 * 用于获取点或获取三角化面。
 *
 * Defines an arbitrary 2d shape plane using paths with optional holes. It
 * can be used with {@link ExtrudeGeometry}, {@link ShapeGeometry}, to get
 * points, or to get triangulated faces.
 *
 * ```js
 * // 创建一个心形形状的示例
 * // Example of creating a heart shape
 * const heartShape = new THREE.Shape();
 *
 * heartShape.moveTo( 25, 25 );
 * heartShape.bezierCurveTo( 25, 25, 20, 0, 0, 0 );
 * heartShape.bezierCurveTo( - 30, 0, - 30, 35, - 30, 35 );
 * heartShape.bezierCurveTo( - 30, 55, - 10, 77, 25, 95 );
 * heartShape.bezierCurveTo( 60, 77, 80, 55, 80, 35 );
 * heartShape.bezierCurveTo( 80, 35, 80, 0, 50, 0 );
 * heartShape.bezierCurveTo( 35, 0, 25, 25, 25, 25 );
 *
 * // 挤出设置
 * // Extrude settings
 * const extrudeSettings = {
 * 	depth: 8,
 * 	bevelEnabled: true,
 * 	bevelSegments: 2,
 * 	steps: 2,
 * 	bevelSize: 1,
 * 	bevelThickness: 1
 * };
 *
 * // 创建挤出几何体和网格
 * // Create extruded geometry and mesh
 * const geometry = new THREE.ExtrudeGeometry( heartShape, extrudeSettings );
 * const mesh = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial() );
 * ```
 *
 * @augments Path
 */
class Shape extends Path {
  /**
   * 构造一个新的形状。
   *
   * Constructs a new shape.
   *
   * @param {Array<Vector2>} [points] - 定义形状的2D点数组（可选） / An array of 2D points defining the shape.
   */
  constructor(points) {
    // 调用父类Path的构造函数
    // Call the parent Path constructor
    super(points);

    /**
     * 形状的唯一标识符UUID。
     *
     * The UUID of the shape.
     *
     * @type {string}
     * @readonly
     */
    this.uuid = generateUUID();

    // 设置对象类型标识
    // Set object type identifier
    this.type = "Shape";

    /**
     * 定义形状中的孔洞。孔洞定义必须使用与外部形状相反的缠绕顺序（顺时针/逆时针）。
     *
     * Defines the holes in the shape. Hole definitions must use the
     * opposite winding order (CW/CCW) than the outer shape.
     *
     * @type {Array<Path>}
     * @readonly
     */
    this.holes = [];
  }

  /**
   * 返回一个数组，表示每个孔洞的轮廓作为2D点列表。
   *
   * Returns an array representing each contour of the holes
   * as a list of 2D points.
   *
   * @param {number} divisions - 结果的精细度 / The fineness of the result.
   * @return {Array<Array<Vector2>>} 孔洞作为一系列2D点 / The holes as a series of 2D points.
   */
  getPointsHoles(divisions) {
    // 初始化孔洞点数组
    // Initialize holes points array
    const holesPts = [];

    // 遍历所有孔洞，获取每个孔洞的点
    // Iterate through all holes and get points for each hole
    for (let i = 0, l = this.holes.length; i < l; i++) {
      holesPts[i] = this.holes[i].getPoints(divisions);
    }

    return holesPts;
  }

  // 获取形状和孔洞的点（基于分段参数的关键点）
  // get points of shape and holes (keypoints based on segments parameter)

  /**
   * 返回一个对象，包含形状及其孔洞的轮廓数据作为2D点数组。
   *
   * Returns an object that holds contour data for the shape and its holes as
   * arrays of 2D points.
   *
   * @param {number} divisions - 结果的精细度 / The fineness of the result.
   * @return {{shape:Array<Vector2>,holes:Array<Array<Vector2>>}} 包含轮廓数据的对象 / An object with contour data.
   */
  extractPoints(divisions) {
    return {
      shape: this.getPoints(divisions), // 获取形状的点 / Get shape points
      holes: this.getPointsHoles(divisions), // 获取孔洞的点 / Get holes points
    };
  }

  /**
   * 从源形状复制属性到当前形状。
   *
   * Copies properties from source shape to this shape.
   *
   * @param {Shape} source - 要复制的源形状 / The source shape to copy from
   * @return {Shape} 返回当前形状实例 / Returns this shape instance
   */
  copy(source) {
    // 调用父类的copy方法
    // Call parent class copy method
    super.copy(source);

    // 重置孔洞数组
    // Reset holes array
    this.holes = [];

    // 复制所有孔洞
    // Copy all holes
    for (let i = 0, l = source.holes.length; i < l; i++) {
      const hole = source.holes[i]; // 获取源孔洞 / Get source hole

      this.holes.push(hole.clone()); // 克隆并添加孔洞 / Clone and add hole
    }

    return this;
  }

  /**
   * 将形状序列化为JSON对象。
   *
   * Serializes the shape to a JSON object.
   *
   * @return {Object} 包含形状数据的JSON对象 / JSON object containing shape data
   */
  toJSON() {
    // 调用父类的toJSON方法获取基础数据
    // Call parent class toJSON method to get base data
    const data = super.toJSON();

    // 添加形状特有的属性
    // Add shape-specific properties
    data.uuid = this.uuid; // 添加UUID / Add UUID
    data.holes = []; // 初始化孔洞数组 / Initialize holes array

    // 序列化所有孔洞
    // Serialize all holes
    for (let i = 0, l = this.holes.length; i < l; i++) {
      const hole = this.holes[i]; // 获取孔洞 / Get hole
      data.holes.push(hole.toJSON()); // 序列化孔洞并添加到数组 / Serialize hole and add to array
    }

    return data;
  }

  /**
   * 从JSON对象反序列化形状。
   *
   * Deserializes the shape from a JSON object.
   *
   * @param {Object} json - 包含形状数据的JSON对象 / JSON object containing shape data
   * @return {Shape} 返回当前形状实例 / Returns this shape instance
   */
  fromJSON(json) {
    // 调用父类的fromJSON方法恢复基础数据
    // Call parent class fromJSON method to restore base data
    super.fromJSON(json);

    // 恢复形状特有的属性
    // Restore shape-specific properties
    this.uuid = json.uuid; // 恢复UUID / Restore UUID
    this.holes = []; // 重置孔洞数组 / Reset holes array

    // 反序列化所有孔洞
    // Deserialize all holes
    for (let i = 0, l = json.holes.length; i < l; i++) {
      const hole = json.holes[i]; // 获取孔洞数据 / Get hole data
      this.holes.push(new Path().fromJSON(hole)); // 创建路径对象并反序列化 / Create Path object and deserialize
    }

    return this;
  }
}

// 导出Shape类供其他模块使用
// Export Shape class for use by other modules
export { Shape };
