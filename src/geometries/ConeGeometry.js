// 导入圆柱体几何类，圆锥体是圆柱体的特殊形式（顶部半径为0）
import { CylinderGeometry } from "./CylinderGeometry.js";

/**
 * 圆锥体几何类，用于创建圆锥形状的3D几何体
 * 圆锥体是一种特殊的圆柱体，其顶部半径为0，底部有指定的半径
 *
 * 使用示例：
 * ```js
 * const geometry = new THREE.ConeGeometry( 5, 20, 32 );
 * const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
 * const cone = new THREE.Mesh(geometry, material );
 * scene.add( cone );
 * ```
 *
 * @augments CylinderGeometry
 */
class ConeGeometry extends CylinderGeometry {
  /**
   * 构造一个新的圆锥体几何对象
   * 通过调用父类CylinderGeometry的构造函数来实现，将顶部半径设为0
   *
   * @param {number} [radius=1] - 圆锥体底面的半径
   * @param {number} [height=1] - 圆锥体的高度
   * @param {number} [radialSegments=32] - 圆锥体周围的分段数，决定圆锥体的圆滑程度
   * @param {number} [heightSegments=1] - 圆锥体高度方向的分段数，决定高度方向的细分程度
   * @param {boolean} [openEnded=false] - 是否开放底面，false表示封闭底面，true表示开放底面
   * @param {number} [thetaStart=0] - 起始角度，以弧度为单位，决定圆锥体从哪个角度开始绘制
   * @param {number} [thetaLength=Math.PI*2] - 圆锥体的圆心角，以弧度为单位，默认值2π表示完整的圆锥体
   */
  constructor(radius = 1, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false, thetaStart = 0, thetaLength = Math.PI * 2) {
    // 调用父类CylinderGeometry的构造函数
    // 参数说明：顶部半径=0, 底部半径=radius, 其他参数保持不变
    // 这样就创建了一个顶部半径为0的圆柱体，即圆锥体
    super(0, radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength);

    // 设置几何体类型标识为'ConeGeometry'
    this.type = "ConeGeometry";

    /**
     * 保存构造函数参数的对象
     * 这些参数用于生成几何体，实例化后的任何修改都不会改变几何体
     * 主要用于序列化、调试和重新创建几何体
     *
     * @type {Object}
     */
    this.parameters = {
      radius: radius, // 底面半径
      height: height, // 圆锥体高度
      radialSegments: radialSegments, // 径向分段数
      heightSegments: heightSegments, // 高度分段数
      openEnded: openEnded, // 是否开放底面
      thetaStart: thetaStart, // 起始角度
      thetaLength: thetaLength, // 圆心角长度
    };
  }

  /**
   * 从JSON对象创建ConeGeometry实例的工厂方法
   * 用于反序列化，将序列化的JSON数据重新构建为几何体对象
   *
   * @param {Object} data - 包含序列化几何体数据的JSON对象
   * @return {ConeGeometry} 返回新创建的圆锥体几何实例
   */
  static fromJSON(data) {
    // 使用JSON数据中的参数创建新的ConeGeometry实例
    return new ConeGeometry(data.radius, data.height, data.radialSegments, data.heightSegments, data.openEnded, data.thetaStart, data.thetaLength);
  }
}

// 导出ConeGeometry类，使其可以被其他模块导入和使用
export { ConeGeometry };
