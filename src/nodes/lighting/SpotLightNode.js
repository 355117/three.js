// 导入解析光源节点基类
import AnalyticLightNode from "./AnalyticLightNode.js";
// 导入距离衰减计算函数
import { getDistanceAttenuation } from "./LightUtils.js";
// 导入统一变量节点
import { uniform } from "../core/UniformNode.js";
// 导入平滑步进数学函数
import { smoothstep } from "../math/MathNode.js";
// 导入渲染组
import { renderGroup } from "../core/UniformGroupNode.js";
// 导入光源目标方向和光源投影UV访问器
import { lightTargetDirection, lightProjectionUV } from "../accessors/Lights.js";
// 导入纹理访问器
import { texture } from "../accessors/TextureNode.js";

/**
 * 用于将聚光灯表示为节点的模块。
 *
 * @augments AnalyticLightNode
 */
class SpotLightNode extends AnalyticLightNode {
  // 返回节点类型标识符
  static get type() {
    return "SpotLightNode";
  }

  /**
   * 构造一个新的聚光灯节点。
   *
   * @param {?SpotLight} [light=null] - 聚光灯光源对象
   */
  constructor(light = null) {
    // 调用父类构造函数
    super(light);

    /**
     * 表示锥形余弦值的统一变量节点。
     *
     * @type {UniformNode<float>}
     */
    this.coneCosNode = uniform(0).setGroup(renderGroup);

    /**
     * 表示半影余弦值的统一变量节点。
     *
     * @type {UniformNode<float>}
     */
    this.penumbraCosNode = uniform(0).setGroup(renderGroup);

    /**
     * 表示截止距离的统一变量节点。
     *
     * @type {UniformNode<float>}
     */
    this.cutoffDistanceNode = uniform(0).setGroup(renderGroup);

    /**
     * 表示衰减指数的统一变量节点。
     *
     * @type {UniformNode<float>}
     */
    this.decayExponentNode = uniform(0).setGroup(renderGroup);

    /**
     * 表示光源颜色的统一变量节点。
     *
     * @type {UniformNode<Color>}
     */
    this.colorNode = uniform(this.color).setGroup(renderGroup);
  }

  /**
   * 重写以更新聚光灯特定的统一变量。
   *
   * @param {NodeFrame} frame - 当前节点帧的引用
   */
  update(frame) {
    // 调用父类的更新方法
    super.update(frame);

    // 获取光源对象
    const { light } = this;

    // 计算并设置锥形角度的余弦值
    this.coneCosNode.value = Math.cos(light.angle);
    // 计算并设置半影角度的余弦值（考虑半影衰减）
    this.penumbraCosNode.value = Math.cos(light.angle * (1 - light.penumbra));

    // 设置截止距离
    this.cutoffDistanceNode.value = light.distance;
    // 设置衰减指数
    this.decayExponentNode.value = light.decay;
  }

  /**
   * 计算给定角度的聚光灯衰减。
   *
   * @param {NodeBuilder} builder - 节点构建器（此参数未使用但保持接口一致性）
   * @param {Node<float>} angleCosine - 要计算聚光灯衰减的角度余弦值
   * @return {Node<float>} 聚光灯衰减值
   */
  getSpotAttenuation(builder, angleCosine) {
    // 获取锥形和半影余弦值节点
    const { coneCosNode, penumbraCosNode } = this;

    // 使用平滑步进函数计算衰减，在锥形边缘和半影边缘之间进行插值
    return smoothstep(coneCosNode, penumbraCosNode, angleCosine);
  }

  /**
   * 获取光源坐标（用于投影纹理映射）。
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @return {Node} 投影UV坐标
   */
  getLightCoord(builder) {
    // 获取节点属性
    const properties = builder.getNodeProperties(this);
    let projectionUV = properties.projectionUV;

    // 如果投影UV未定义，则计算它
    if (projectionUV === undefined) {
      // 计算光源投影UV坐标
      projectionUV = lightProjectionUV(this.light, builder.context.positionWorld);

      // 缓存计算结果
      properties.projectionUV = projectionUV;
    }

    return projectionUV;
  }

  /**
   * 设置直接光照计算。
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @return {Object} 包含光源颜色和光源方向的对象
   */
  setupDirect(builder) {
    // 解构获取所需的节点和光源对象
    const { colorNode, cutoffDistanceNode, decayExponentNode, light } = this;

    // 获取光源向量（从表面点到光源的向量）
    const lightVector = this.getLightVector(builder);

    // 计算光源方向（归一化的光源向量）
    const lightDirection = lightVector.normalize();
    // 计算光源方向与目标方向的夹角余弦值
    const angleCos = lightDirection.dot(lightTargetDirection(light));

    // 计算聚光灯衰减（基于角度的衰减）
    const spotAttenuation = this.getSpotAttenuation(builder, angleCos);

    // 计算光源距离
    const lightDistance = lightVector.length();

    // 计算距离衰减
    const lightAttenuation = getDistanceAttenuation({
      lightDistance,
      cutoffDistance: cutoffDistanceNode,
      decayExponent: decayExponentNode,
    });

    // 计算基础光源颜色（应用聚光灯衰减和距离衰减）
    let lightColor = colorNode.mul(spotAttenuation).mul(lightAttenuation);

    // 声明投影相关变量
    let projected, lightCoord;

    // 如果光源有颜色节点（程序化颜色）
    if (light.colorNode) {
      lightCoord = this.getLightCoord(builder);
      projected = light.colorNode(lightCoord);
    } else if (light.map) {
      // 如果光源有纹理贴图
      lightCoord = this.getLightCoord(builder);
      projected = texture(light.map, lightCoord.xy).onRenderUpdate(() => light.map);
    }

    // 如果有投影内容，应用投影效果
    if (projected) {
      // 检查是否在聚光灯贴图范围内（UV坐标在[-1,1]范围内）
      const inSpotLightMap = lightCoord.mul(2).sub(1).abs().lessThan(1).all();

      // 根据是否在贴图范围内选择应用投影或原始颜色
      lightColor = inSpotLightMap.select(lightColor.mul(projected), lightColor);
    }

    // 返回光源颜色和光源方向
    return { lightColor, lightDirection };
  }
}

// 导出聚光灯节点类作为默认导出
export default SpotLightNode;
