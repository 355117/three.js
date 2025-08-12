/**
 * 节点解析器的基类。必须为每种支持的原生着色器语言实现派生解析器。
 *
 * 节点解析器负责将原生着色器代码解析为节点函数对象，
 * 使得Three.js的节点系统能够理解和使用外部着色器代码。
 */
class NodeParser {
  /**
   * 解析给定的原生代码并返回一个节点函数。
   * 抽象方法，必须在子类中实现以支持特定的着色器语言解析。
   *
   * @abstract
   * @param {string} source - 原生着色器代码字符串
   * @return {NodeFunction} 解析后的节点函数对象
   */
  parseFunction(/*source*/) {
    // 抽象方法警告，提醒开发者需要在子类中实现
    console.warn("Abstract function.");
  }
}

export default NodeParser;
