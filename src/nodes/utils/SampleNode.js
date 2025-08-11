/**
 * SampleNode.js - 采样节点
 *
 * 该文件实现了使用回调函数进行采样的节点。
 * 常用于纹理采样和其他需要基于UV坐标进行计算的操作。
 */

// 导入核心节点类
import Node from "../core/Node.js";
// 导入UV坐标访问器
import { uv } from "../accessors/UV.js";
// 导入TSL核心工具
import { nodeObject } from "../tsl/TSLCore.js";

/**
 * 采样节点类
 *
 * 表示使用提供的回调函数进行采样的节点。
 * 主要用于纹理采样和基于UV坐标的计算操作。
 *
 * @extends Node
 */
class SampleNode extends Node {
  /**
   * 获取节点类型名称
   *
   * @type {string}
   * @readonly
   * @static
   */
  static get type() {
    return "SampleNode";
  }

  /**
   * 创建一个采样节点实例
   *
   * @param {Function} callback - 采样时调用的函数，应接受UV节点并返回一个值
   * @param {?Node<vec2>} [uvNode=null] - 用于纹理采样的UV节点
   */
  constructor(callback, uvNode = null) {
    super();

    /**
     * 采样回调函数
     *
     * @type {Function}
     */
    this.callback = callback;

    /**
     * 表示纹理坐标的节点
     *
     * @type {?Node<vec2|vec3>}
     * @default null
     */
    this.uvNode = uvNode;

    /**
     * 用于类型测试的标志
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSampleNode = true;
  }

  /**
   * 设置节点，使用默认的UV访问器进行采样
   *
   * @returns {Node} 使用UV节点调用回调函数的结果
   */
  setup() {
    return this.sample(uv());
  }

  /**
   * 使用提供的UV节点调用回调函数
   *
   * @param {Node<vec2>} uv - 要传递给回调函数的UV节点或值
   * @returns {Node} 回调函数的结果
   */
  sample(uv) {
    return this.callback(uv);
  }
}

// 导出默认类
export default SampleNode;

/**
 * 辅助函数：创建一个包装为节点对象的采样节点
 *
 * @function
 * @param {Function} callback - 采样时调用的函数，应接受UV节点并返回一个值
 * @param {?Node<vec2>} [uv=null] - 用于纹理采样的UV节点
 * @returns {SampleNode} 创建的采样节点实例，包装为节点对象
 */
export const sample = (callback, uv = null) => nodeObject(new SampleNode(callback, nodeObject(uv)));
