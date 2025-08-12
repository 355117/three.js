// 从光照节点模块导入基础类
import LightingNode from "./LightingNode.js";
// 从立方体贴图节点工具模块导入立方体贴图节点函数
import { cubeMapNode } from "../utils/CubeMapNode.js";

/**
 * 基础环境节点类
 *
 * 表示基于图像的光照(Image-based Lighting, IBL)的基础模型。
 * 环境通过等距柱状投影或立方体贴图格式的环境贴图来定义。
 *
 * IBL的核心概念：
 * - 使用环境贴图作为光源
 * - 提供真实的环境反射和照明
 * - 支持全景图像和立方体贴图
 * - 为场景提供丰富的环境光照
 *
 * `BasicEnvironmentNode` 专为非PBR材质设计，如：
 * - {@link MeshBasicNodeMaterial}
 * - {@link MeshPhongNodeMaterial}
 *
 * 与PBR环境节点相比，基础环境节点提供简化的环境光照计算，
 * 适用于不需要复杂物理光照模型的场景。
 *
 * @augments LightingNode
 */
class BasicEnvironmentNode extends LightingNode {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'BasicEnvironmentNode'
   */
  static get type() {
    return "BasicEnvironmentNode";
  }

  /**
   * 构造一个新的基础环境节点
   *
   * @param {Node} [envNode=null] - 表示环境的节点，通常是纹理节点或环境贴图节点
   */
  constructor(envNode = null) {
    // 调用父类构造函数
    super();

    /**
     * 表示环境的节点
     *
     * 存储环境贴图数据的节点，可以是：
     * - 等距柱状投影贴图 (Equirectangular Map)
     * - 立方体贴图 (Cube Map)
     * - HDR环境贴图
     * - 其他格式的环境纹理
     *
     * @type {Node}
     * @default null
     */
    this.envNode = envNode;
  }

  /**
   * 设置基础环境光照
   *
   * 将环境节点转换为立方体贴图格式，并设置到光照上下文中。
   * 环境属性将在BasicLightingModel的finish()方法中使用。
   *
   * @param {NodeBuilder} builder - 节点构建器，包含光照计算的上下文
   */
  setup(builder) {
    // 将环境节点转换为立方体贴图节点并设置到上下文中
    // environment属性在BasicLightingModel的finish()方法中使用
    // 用于提供环境反射和基础的环境光照
    builder.context.environment = cubeMapNode(this.envNode);
  }
}

// 导出基础环境节点类作为默认导出
export default BasicEnvironmentNode;
