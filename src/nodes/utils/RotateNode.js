// 导入临时节点基类
import TempNode from "../core/TempNode.js";
// 导入TSL基础功能：节点代理、向量和矩阵构造
import { nodeProxy, vec4, mat2, mat4 } from "../tsl/TSLBase.js";
// 导入数学函数：余弦和正弦
import { cos, sin } from "../math/MathNode.js";

/**
 * 旋转节点类，对给定的位置节点应用旋转变换。
 *
 * 该节点封装了2D和3D空间中的旋转操作。根据位置数据的维度，
 * 旋转可以用不同的方式表示：
 * - 2D旋转：使用单个浮点值表示角度
 * - 3D旋转：使用欧拉角（三个分量的向量）
 *
 * 常见的使用场景包括：
 * - 对象的旋转动画
 * - 相机的旋转控制
 * - 粒子系统中粒子的旋转
 * - 程序化几何体的变换
 *
 * @augments TempNode
 */
class RotateNode extends TempNode {
  /**
   * 获取节点类型标识符。
   *
   * @static
   * @return {string} 返回'RotateNode'类型标识符。
   */
  static get type() {
    return "RotateNode";
  }

  /**
   * 构造一个新的旋转节点。
   *
   * @param {Node} positionNode - 位置节点，表示要旋转的位置向量。
   * @param {Node} rotationNode - 旋转节点，表示应用到位置节点的旋转。根据位置数据是2D还是3D，旋转用单个浮点值或欧拉角表示。
   */
  constructor(positionNode, rotationNode) {
    super();

    /**
     * 位置节点。
     *
     * 表示要应用旋转变换的位置向量。
     * 可以是2D向量（vec2）或3D向量（vec3）。
     *
     * @type {Node}
     */
    this.positionNode = positionNode;

    /**
     * 旋转节点。
     *
     * 表示应用到位置节点的旋转变换。
     * 根据位置数据的维度，旋转的表示方式不同：
     * - 2D位置：单个浮点值（角度，以弧度为单位）
     * - 3D位置：欧拉角（vec3，分别表示X、Y、Z轴的旋转角度）
     *
     * @type {Node}
     */
    this.rotationNode = rotationNode;
  }

  /**
   * 获取节点的数据类型。
   *
   * {@link RotateNode#positionNode} 的类型定义了节点的类型。
   * 旋转操作不会改变向量的维度，所以输出类型与输入位置的类型相同。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 节点的数据类型。
   */
  getNodeType(builder) {
    return this.positionNode.getNodeType(builder);
  }

  /**
   * 设置节点并生成旋转变换逻辑。
   *
   * 该方法根据位置数据的维度选择合适的旋转算法：
   * - 2D旋转：使用2x2旋转矩阵
   * - 3D旋转：使用欧拉角构建三个轴的旋转矩阵并组合
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {Node} 旋转后的位置节点。
   */
  setup(builder) {
    const { rotationNode, positionNode } = this;

    // 获取位置节点的类型以确定是2D还是3D旋转
    const nodeType = this.getNodeType(builder);

    if (nodeType === "vec2") {
      // 2D旋转：使用单个角度值构建2x2旋转矩阵
      const cosAngle = rotationNode.cos();
      const sinAngle = rotationNode.sin();

      // 构建2D旋转矩阵：
      // [cos(θ)  -sin(θ)]
      // [sin(θ)   cos(θ)]
      const rotationMatrix = mat2(cosAngle, sinAngle, sinAngle.negate(), cosAngle);

      // 应用旋转矩阵到位置向量
      return rotationMatrix.mul(positionNode);
    } else {
      // 3D旋转：使用欧拉角构建旋转矩阵
      const rotation = rotationNode;

      // X轴旋转矩阵（绕X轴旋转）
      const rotationXMatrix = mat4(
        vec4(1.0, 0.0, 0.0, 0.0),
        vec4(0.0, cos(rotation.x), sin(rotation.x).negate(), 0.0),
        vec4(0.0, sin(rotation.x), cos(rotation.x), 0.0),
        vec4(0.0, 0.0, 0.0, 1.0)
      );

      // Y轴旋转矩阵（绕Y轴旋转）
      const rotationYMatrix = mat4(
        vec4(cos(rotation.y), 0.0, sin(rotation.y), 0.0),
        vec4(0.0, 1.0, 0.0, 0.0),
        vec4(sin(rotation.y).negate(), 0.0, cos(rotation.y), 0.0),
        vec4(0.0, 0.0, 0.0, 1.0)
      );

      // Z轴旋转矩阵（绕Z轴旋转）
      const rotationZMatrix = mat4(
        vec4(cos(rotation.z), sin(rotation.z).negate(), 0.0, 0.0),
        vec4(sin(rotation.z), cos(rotation.z), 0.0, 0.0),
        vec4(0.0, 0.0, 1.0, 0.0),
        vec4(0.0, 0.0, 0.0, 1.0)
      );

      // 组合三个旋转矩阵（顺序：X -> Y -> Z）并应用到位置向量
      // 将3D位置扩展为4D齐次坐标，应用变换后提取xyz分量
      return rotationXMatrix.mul(rotationYMatrix).mul(rotationZMatrix).mul(vec4(positionNode, 1.0)).xyz;
    }
  }
}

// 导出RotateNode类作为默认导出
export default RotateNode;

/**
 * TSL函数，用于创建旋转节点。
 *
 * 该函数提供了一个便捷的方式来创建RotateNode实例，
 * 用于对位置向量应用旋转变换。支持2D和3D旋转：
 *
 * - 2D旋转示例：
 *   ```js
 *   const rotatedPos = rotate(position2D, angle);
 *   ```
 *
 * - 3D旋转示例：
 *   ```js
 *   const rotatedPos = rotate(position3D, eulerAngles);
 *   ```
 *
 * @tsl
 * @function
 * @param {Node} positionNode - 位置节点，要旋转的位置向量。
 * @param {Node} rotationNode - 旋转节点，表示应用到位置节点的旋转。根据位置数据是2D还是3D，旋转用单个浮点值或欧拉角表示。
 * @returns {RotateNode} 旋转节点实例。
 */
export const rotate = /*@__PURE__*/ nodeProxy(RotateNode).setParameterLength(2);
