// 从核心模块导入节点解析器基类
import NodeParser from "../core/NodeParser.js";
// 从当前目录导入GLSL节点函数类
import GLSLNodeFunction from "./GLSLNodeFunction.js";

/**
 * GLSL节点解析器。
 *
 * @augments NodeParser
 */
class GLSLNodeParser extends NodeParser {
  /**
   * 该方法解析给定的GLSL代码并返回一个节点函数。
   *
   * @param {string} source - GLSL代码。
   * @return {GLSLNodeFunction} 节点函数。
   */
  parseFunction(source) {
    // 创建并返回新的GLSL节点函数实例
    return new GLSLNodeFunction(source);
  }
}

export default GLSLNodeParser; // 导出GLSLNodeParser类
