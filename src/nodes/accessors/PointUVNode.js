// 导入节点基类
import Node from "../core/Node.js";
// 导入不可变节点函数
import { nodeImmutable } from "../tsl/TSLBase.js";

/**
 * 点UV节点 - 用于表示点的UV坐标
 *
 * 只能与WebGL后端一起使用。在WebGPU中，点图元
 * 始终具有一个像素的大小，因此不能用作显示纹理的
 * 类似精灵的对象。
 *
 * @augments Node
 */
class PointUVNode extends Node {
  // 返回节点类型标识符
  static get type() {
    return "PointUVNode";
  }

  /**
   * 构造一个新的点UV节点
   */
  constructor() {
    // 调用父类构造函数，返回类型为vec2
    super("vec2");

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isPointUVNode = true;
  }

  // 生成着色器代码
  generate(/*builder*/) {
    // 返回点坐标的UV，注意Y轴需要翻转（1.0 - y）
    return "vec2( gl_PointCoord.x, 1.0 - gl_PointCoord.y )";
  }
}

// 导出PointUVNode类作为默认导出
export default PointUVNode;

/**
 * TSL对象 - 表示点的UV坐标
 *
 * @tsl
 * @type {PointUVNode}
 */
export const pointUV = /*@__PURE__*/ nodeImmutable(PointUVNode);
