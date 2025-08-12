// 导入输出结构节点基类
import OutputStructNode from "./OutputStructNode.js";
// 导入TSL基础功能：节点代理和四维向量
import { nodeProxy, vec4 } from "../tsl/TSLBase.js";

/**
 * 获取指定名称的MRT纹理索引
 *
 * @param {Array<Texture>} textures - MRT配置渲染目标的纹理数组
 * @param {string} name - 请求索引的MRT纹理名称
 * @return {number} 纹理索引，如果未找到则返回-1
 */
export function getTextureIndex(textures, name) {
  // 遍历纹理数组查找匹配的名称
  for (let i = 0; i < textures.length; i++) {
    // 如果找到匹配的纹理名称
    if (textures[i].name === name) {
      // 返回对应的索引
      return i;
    }
  }

  // 未找到匹配的纹理，返回-1
  return -1;
}

/**
 * MRT节点类 - 用于设置渲染的MRT（多渲染目标）上下文
 * 典型的后处理MRT设置如下所示：
 * ```js
 * const mrtNode = mrt( {
 *   output: output,
 *   normal: normalView
 * } );
 * ```
 * MRT输出定义为字典形式
 *
 * @augments OutputStructNode
 */
class MRTNode extends OutputStructNode {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "MRTNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的MRT节点
   *
   * @param {Object<string, Node>} outputNodes - MRT输出节点字典
   */
  constructor(outputNodes) {
    // 调用父类构造函数
    super();

    /**
     * 表示MRT输出的字典对象
     * 键是输出的名称，值是产生输出结果的节点
     *
     * @type {Object<string, Node>}
     */
    this.outputNodes = outputNodes;

    /**
     * 类型测试标志 - 用于识别此节点为MRT节点
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMRTNode = true;
  }

  /**
   * 检查MRT节点是否具有指定名称的输出
   *
   * @param {string} name - 输出的名称
   * @return {boolean} 如果MRT节点具有指定名称的输出则返回true，否则返回false
   */
  has(name) {
    // 检查输出节点字典中是否存在指定名称的输出
    return this.outputNodes[name] !== undefined;
  }

  /**
   * 获取指定名称的输出节点
   *
   * @param {string} name - 输出的名称
   * @return {Node} 对应的输出节点
   */
  get(name) {
    // 从输出节点字典中返回指定名称的节点
    return this.outputNodes[name];
  }

  /**
   * 合并指定MRT节点的输出与当前节点的输出
   *
   * @param {MRTNode} mrtNode - 要合并的MRT节点
   * @return {MRTNode} 包含合并输出的新MRT节点
   */
  merge(mrtNode) {
    // 使用展开运算符合并两个输出节点字典
    const outputs = { ...this.outputNodes, ...mrtNode.outputNodes };

    // 创建并返回新的MRT节点
    return mrt(outputs);
  }

  /**
   * 设置MRT节点 - 配置多渲染目标的输出结构
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @return {any} 父类setup方法的返回值
   */
  setup(builder) {
    // 获取输出节点字典
    const outputNodes = this.outputNodes;
    // 获取渲染器的渲染目标
    const mrt = builder.renderer.getRenderTarget();

    // 初始化成员数组
    const members = [];

    // 获取渲染目标的纹理数组
    const textures = mrt.textures;

    // 遍历所有输出节点
    for (const name in outputNodes) {
      // 获取当前输出名称对应的纹理索引
      const index = getTextureIndex(textures, name);

      // 将输出节点转换为vec4并存储到对应索引位置
      members[index] = vec4(outputNodes[name]);
    }

    // 设置成员数组
    this.members = members;

    // 调用父类的setup方法
    return super.setup(builder);
  }
}

// 导出MRT节点类作为默认导出
export default MRTNode;

/**
 * TSL函数：创建MRT节点
 *
 * @tsl
 * @function
 * @param {Object<string, Node>} outputNodes - MRT输出节点字典
 * @returns {MRTNode} MRT节点实例
 */
export const mrt = /*@__PURE__*/ nodeProxy(MRTNode);
