// 导入临时节点基类
import TempNode from "../core/TempNode.js";
// 导入向量分量常量
import { vectorComponents } from "../core/constants.js";

/**
 * 翻转节点类。
 *
 * 该模块是TSL核心的一部分，通常不在应用层代码中直接使用。
 * 它表示着色器生成过程中的翻转操作，即使用以下公式翻转归一化值：
 * ```
 * x = 1 - x;
 * ```
 *
 * `FlipNode`在内部用于实现节点对象上的任何`flipXYZW()`、`flipRGBA()`和
 * `flipSTPQ()`方法调用。例如：
 * ```js
 * uvNode = uvNode.flipY();
 * ```
 *
 * 这在处理纹理坐标、颜色值或其他需要翻转的归一化数据时非常有用。
 *
 * @augments TempNode
 */
class FlipNode extends TempNode {
  /**
   * 获取节点类型标识符。
   *
   * @static
   * @return {string} 返回'FlipNode'类型标识符。
   */
  static get type() {
    return "FlipNode";
  }

  /**
   * 构造一个新的翻转节点。
   *
   * @param {Node} sourceNode - 需要翻转分量的源节点。
   * @param {string} components - 需要翻转的分量，例如`'x'`或`'xy'`。
   */
  constructor(sourceNode, components) {
    super();

    /**
     * 需要翻转分量的源节点。
     *
     * 该节点的指定分量将被翻转（1 - 原值）。
     *
     * @type {Node}
     */
    this.sourceNode = sourceNode;

    /**
     * 需要翻转的分量字符串。
     *
     * 例如`'x'`表示只翻转X分量，`'xy'`表示翻转X和Y分量。
     * 支持的分量包括：
     * - XYZW坐标系：'x', 'y', 'z', 'w'
     * - RGBA颜色系：'r', 'g', 'b', 'a'
     * - STPQ纹理系：'s', 't', 'p', 'q'
     *
     * @type {string}
     */
    this.components = components;
  }

  /**
   * 获取节点的数据类型。
   *
   * 该方法被重写，因为节点类型是从源节点推断出来的。
   * 翻转操作不会改变数据类型，只是修改特定分量的值。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 节点的数据类型。
   */
  getNodeType(builder) {
    return this.sourceNode.getNodeType(builder);
  }

  /**
   * 生成着色器代码。
   *
   * 该方法生成翻转操作的着色器代码。对于指定的分量，
   * 使用公式 `1.0 - 原值` 进行翻转；对于未指定的分量，
   * 保持原值不变。最终构造一个新的向量类型返回。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器。
   * @return {string} 生成的着色器代码片段。
   */
  generate(builder) {
    const { components, sourceNode } = this;

    // 获取源节点的类型和代码片段
    const sourceType = this.getNodeType(builder);
    const sourceSnippet = sourceNode.build(builder);

    // 创建缓存变量来存储源节点的值
    const sourceCache = builder.getVarFromNode(this);
    const sourceProperty = builder.getPropertyName(sourceCache);

    // 添加赋值语句，将源节点的值存储到缓存变量中
    builder.addLineFlowCode(sourceProperty + " = " + sourceSnippet, this);

    // 获取向量类型的长度（分量数量）
    const length = builder.getTypeLength(sourceType);
    const snippetValues = [];

    let componentIndex = 0;

    // 遍历所有分量，决定是否翻转
    for (let i = 0; i < length; i++) {
      // 获取当前分量名称（如'x', 'y', 'z', 'w'）
      const component = vectorComponents[i];

      // 检查当前分量是否需要翻转
      if (component === components[componentIndex]) {
        // 需要翻转：使用 1.0 - 原值
        snippetValues.push("1.0 - " + (sourceProperty + "." + component));

        // 移动到下一个需要翻转的分量
        componentIndex++;
      } else {
        // 不需要翻转：保持原值
        snippetValues.push(sourceProperty + "." + component);
      }
    }

    // 构造新的向量类型，包含翻转后的分量值
    return `${builder.getType(sourceType)}( ${snippetValues.join(", ")} )`;
  }
}

// 导出FlipNode类作为默认导出
export default FlipNode;
