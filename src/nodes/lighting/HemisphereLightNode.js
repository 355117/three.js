// 从分析光源节点模块导入基础类
import AnalyticLightNode from "./AnalyticLightNode.js";
// 从统一变量节点模块导入uniform函数
import { uniform } from "../core/UniformNode.js";
// 从数学节点模块导入mix函数
import { mix } from "../math/MathNode.js";
// 从法线访问器模块导入世界空间法线
import { normalWorld } from "../accessors/Normal.js";
// 从光源访问器模块导入光源位置函数
import { lightPosition } from "../accessors/Lights.js";
// 从统一变量组节点模块导入渲染组
import { renderGroup } from "../core/UniformGroupNode.js";

// 从数学模块导入颜色类
import { Color } from "../../math/Color.js";

/**
 * 半球光节点类
 *
 * 用于将半球光表示为节点的模块。半球光是一种特殊的环境光，
 * 它在上半球和下半球使用不同的颜色，模拟天空和地面的光照效果。
 *
 * 半球光的特点：
 * - 双色设计：天空颜色和地面颜色
 * - 平滑过渡：根据表面法线方向在两种颜色间插值
 * - 方向性：有明确的上下方向概念
 * - 环境感：提供更真实的环境光照效果
 *
 * 半球光的工作原理：
 * - 根据表面法线与光源方向的点积确定插值权重
 * - 朝向天空的表面更多地接收天空颜色
 * - 朝向地面的表面更多地接收地面颜色
 * - 垂直表面接收两种颜色的混合
 *
 * 应用场景：
 * - 室外场景的天空和地面光照
 * - 自然环境的基础照明
 * - 需要上下方向区分的环境光
 * - 简化的全局光照近似
 *
 * @augments AnalyticLightNode
 */
class HemisphereLightNode extends AnalyticLightNode {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'HemisphereLightNode'
   */
  static get type() {
    return "HemisphereLightNode";
  }

  /**
   * 构造一个新的半球光节点
   *
   * @param {?HemisphereLight} [light=null] - 半球光源对象，包含天空和地面颜色信息
   */
  constructor(light = null) {
    // 调用父类构造函数，初始化基础光源属性
    super(light);

    /**
     * 表示光源位置的统一变量节点
     *
     * 对于半球光，位置实际上定义了光照的方向，
     * 通常指向天空的方向（如Y轴正方向）。
     *
     * @type {UniformNode<vec3>}
     */
    this.lightPositionNode = lightPosition(light);

    /**
     * 表示光源方向的节点
     *
     * 通过将光源位置归一化得到方向向量，
     * 这个方向定义了天空的方向。
     *
     * @type {Node<vec3>}
     */
    this.lightDirectionNode = this.lightPositionNode.normalize();

    /**
     * 表示光源地面颜色的统一变量节点
     *
     * 存储半球光的地面颜色，与天空颜色（存储在colorNode中）
     * 一起用于计算最终的光照效果。
     *
     * @type {UniformNode<vec3>}
     */
    this.groundColorNode = uniform(new Color()).setGroup(renderGroup);
  }

  /**
   * 重写以更新半球光特定的统一变量
   *
   * 除了更新基础光源属性外，还需要更新半球光特有的
   * 地面颜色和光源位置等属性。
   *
   * @param {NodeFrame} frame - 当前节点帧的引用
   */
  update(frame) {
    // 获取光源引用
    const { light } = this;

    // 调用父类的更新方法，更新基础属性（如天空颜色）
    super.update(frame);

    // 设置光源位置节点的3D对象引用
    // 这样位置节点可以自动获取光源的变换信息
    this.lightPositionNode.object3d = light;

    // 更新地面颜色：复制光源的地面颜色并乘以强度
    // 这样可以将颜色和强度合并为一个颜色值传递给着色器
    this.groundColorNode.value.copy(light.groundColor).multiplyScalar(light.intensity);
  }

  /**
   * 设置半球光的光照计算
   *
   * 实现半球光的核心算法：根据表面法线与光源方向的关系，
   * 在天空颜色和地面颜色之间进行插值。
   *
   * @param {NodeBuilder} builder - 节点构建器，包含光照计算的上下文
   */
  setup(builder) {
    // 获取天空颜色、地面颜色和光源方向节点
    const { colorNode, groundColorNode, lightDirectionNode } = this;

    // 计算表面法线与光源方向的点积
    // 这个值表示表面朝向天空的程度：1表示完全朝向天空，-1表示完全朝向地面
    const dotNL = normalWorld.dot(lightDirectionNode);

    // 将点积值从[-1,1]范围映射到[0,1]范围
    // 0表示完全朝向地面，1表示完全朝向天空，0.5表示垂直表面
    const hemiDiffuseWeight = dotNL.mul(0.5).add(0.5);

    // 在地面颜色和天空颜色之间进行线性插值
    // 权重为0时使用地面颜色，权重为1时使用天空颜色
    const irradiance = mix(groundColorNode, colorNode, hemiDiffuseWeight);

    // 将计算得到的辐照度添加到光照上下文中
    builder.context.irradiance.addAssign(irradiance);
  }
}

// 导出半球光节点类作为默认导出
export default HemisphereLightNode;
