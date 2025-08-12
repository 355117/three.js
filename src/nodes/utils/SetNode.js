/**
 * SetNode.js - 向量分量设置节点
 *
 * 该文件实现了向量分量设置操作的节点。这是TSL核心的一部分，
 * 通常不在应用层代码中直接使用。
 */

// 导入临时节点基类
import TempNode from "../core/TempNode.js";
// 导入向量分量常量
import { vectorComponents } from "../core/constants.js";

/**
 * 分量设置节点类
 *
 * 该模块是TSL核心的一部分，通常不在应用层代码中使用。
 * SetNode 表示设置操作，用于实现节点对象上的
 * setXYZW()、setRGBA() 和 setSTPQ() 等方法调用。
 *
 * 使用示例：
 * ```js
 * materialLine.colorNode = color( 0, 0, 0 ).setR( float( 1 ) );
 * ```
 *
 * @augments TempNode
 */
class SetNode extends TempNode {
  /**
   * 获取节点类型名称
   * @returns {string} 返回 'SetNode'
   */
  static get type() {
    return "SetNode";
  }

  /**
   * 构造一个新的分量设置节点
   *
   * @param {Node} sourceNode - 要更新的源节点
   * @param {string} components - 要更新的分量（如'x', 'xy', 'rgb'等）
   * @param {Node} targetNode - 新值节点
   */
  constructor(sourceNode, components, targetNode) {
    super();

    /**
     * 要更新的源节点
     *
     * @type {Node}
     */
    this.sourceNode = sourceNode;

    /**
     * 要更新的分量
     *
     * @type {string}
     */
    this.components = components;

    /**
     * 新值节点
     *
     * @type {Node}
     */
    this.targetNode = targetNode;
  }

  /**
   * 重写此方法，因为节点类型是从源节点推断出来的
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 节点类型
   */
  getNodeType(builder) {
    return this.sourceNode.getNodeType(builder);
  }

  /**
   * 生成着色器代码
   * 创建一个新的向量，其中指定的分量被替换为目标值
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @returns {string} 生成的着色器代码片段
   */
  generate(builder) {
    const { sourceNode, components, targetNode } = this;

    // 获取源节点类型
    const sourceType = this.getNodeType(builder);

    // 获取目标节点的分量类型和目标类型
    const componentType = builder.getComponentType(targetNode.getNodeType(builder));
    const targetType = builder.getTypeFromLength(components.length, componentType);

    // 构建目标值和源值的代码片段
    const targetSnippet = targetNode.build(builder, targetType);
    const sourceSnippet = sourceNode.build(builder, sourceType);

    // 获取源类型的长度（向量维度）
    const length = builder.getTypeLength(sourceType);
    const snippetValues = [];

    // 遍历每个分量，构建新向量的值
    for (let i = 0; i < length; i++) {
      const component = vectorComponents[i];

      if (component === components[0]) {
        // 如果当前分量是要设置的分量，使用目标值
        snippetValues.push(targetSnippet);

        // 跳过已处理的分量
        i += components.length - 1;
      } else {
        // 否则使用源节点的对应分量
        snippetValues.push(sourceSnippet + "." + component);
      }
    }

    // 返回构造新向量的代码
    return `${builder.getType(sourceType)}( ${snippetValues.join(", ")} )`;
  }
}

// 导出默认类
export default SetNode;
