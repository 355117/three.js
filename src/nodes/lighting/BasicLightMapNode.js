// 从光照节点模块导入基础类
import LightingNode from "./LightingNode.js";
// 从TSL基础模块导入浮点数类型
import { float } from "../tsl/TSLBase.js";

/**
 * 基础光照贴图节点类
 *
 * {@link IrradianceNode} 的特定版本，仅与 {@link MeshBasicNodeMaterial} 相关。
 * 由于基础材质是无光照的(unlit)，它需要为光照贴图使用特殊的缩放因子。
 *
 * 光照贴图(Light Map)的概念：
 * - 预计算的光照信息存储在纹理中
 * - 提供静态光照效果，无需实时计算
 * - 常用于静态场景的光照烘焙
 * - 可以包含直接光照和间接光照信息
 *
 * 基础光照贴图的特点：
 * - 专为无光照材质设计
 * - 使用1/π缩放因子进行正确的能量守恒
 * - 简化的光照计算，适合性能敏感的应用
 * - 直接应用预烘焙的光照数据
 *
 * @augments LightingNode
 */
class BasicLightMapNode extends LightingNode {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'BasicLightMapNode'
   */
  static get type() {
    return "BasicLightMapNode";
  }

  /**
   * 构造一个新的基础光照贴图节点
   *
   * @param {?Node<vec3>} [lightMapNode=null] - 光照贴图节点，包含预计算的光照信息
   */
  constructor(lightMapNode = null) {
    // 调用父类构造函数
    super();

    /**
     * 光照贴图节点
     *
     * 存储预计算光照信息的节点，通常包含：
     * - 直接光照的烘焙结果
     * - 间接光照的近似值
     * - 阴影信息
     * - 环境光遮蔽数据
     *
     * @type {?Node<vec3>}
     */
    this.lightMapNode = lightMapNode;
  }

  /**
   * 设置基础光照贴图的计算
   *
   * 将光照贴图数据应用到光照计算中，使用1/π的缩放因子
   * 来确保正确的能量守恒和光照强度。
   *
   * @param {NodeBuilder} builder - 节点构建器，包含光照计算的上下文
   */
  setup(builder) {
    // irradianceLightMap属性在BasicLightingModel的indirectDiffuse()方法中使用

    // 定义1/π的倒数，用于光照贴图的正确缩放
    // 这个因子确保光照贴图的能量守恒，符合物理光照原理
    const RECIPROCAL_PI = float(1 / Math.PI);

    // 将光照贴图值乘以1/π缩放因子，设置到辐照度光照贴图上下文中
    // 这样处理后的光照贴图可以直接用于基础光照模型的间接漫反射计算
    builder.context.irradianceLightMap = this.lightMapNode.mul(RECIPROCAL_PI);
  }
}

// 导出基础光照贴图节点类作为默认导出
export default BasicLightMapNode;
