// 从核心节点模块导入基础Node类
import Node from "../core/Node.js";
// 从节点工具模块导入获取值类型的函数
import { getValueType } from "../core/NodeUtils.js";
// 从缓冲区节点模块导入buffer函数
import { buffer } from "../accessors/BufferNode.js";
// 从缓冲区属性节点模块导入实例化缓冲区属性函数
import { instancedBufferAttribute } from "../accessors/BufferAttributeNode.js";
// 从索引节点模块导入实例索引
import { instanceIndex } from "../core/IndexNode.js";
// 从TSL基础模块导入节点代理和浮点数函数
import { nodeProxy, float } from "../tsl/TSLBase.js";

// 从数学模块导入Vector4向量类
import { Vector4 } from "../../math/Vector4.js";
// 从数学工具模块导入数学工具类
import { MathUtils } from "../../math/MathUtils.js";
// 从核心模块导入实例化缓冲区属性类
import { InstancedBufferAttribute } from "../../core/InstancedBufferAttribute.js";

// 全局变量：存储范围的最小值向量（延迟初始化）
let min = null;
// 全局变量：存储范围的最大值向量（延迟初始化）
let max = null;

/**
 * `RangeNode` 在定义的范围内生成随机的实例化属性数据
 *
 * 这个实用节点的一个典型用例是为每个实例生成随机颜色：
 * ```js
 * const material = new MeshBasicNodeMaterial();
 * material.colorNode = range( new Color( 0x000000 ), new Color( 0xFFFFFF ) );
 * const mesh = new InstancedMesh( geometry, material, count );
 * ```
 *
 * 该节点支持各种数据类型的范围生成，包括：
 * - 标量值（float）
 * - 向量值（vec2, vec3, vec4）
 * - 颜色值（Color）
 *
 * @augments Node
 */
class RangeNode extends Node {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'RangeNode'
   */
  static get type() {
    return "RangeNode";
  }

  /**
   * 构造一个新的范围节点
   *
   * @param {Node<any>} [minNode=float()] - 定义范围下界的节点
   * @param {Node<any>} [maxNode=float()] - 定义范围上界的节点
   */
  constructor(minNode = float(), maxNode = float()) {
    // 调用父类构造函数
    super();

    /**
     * 定义范围下界的节点
     *
     * 可以是任何类型的节点，包括标量、向量或颜色值
     *
     * @type {Node<any>}
     * @default float()
     */
    this.minNode = minNode;

    /**
     * 定义范围上界的节点
     *
     * 可以是任何类型的节点，包括标量、向量或颜色值
     *
     * @type {Node<any>}
     * @default float()
     */
    this.maxNode = maxNode;
  }

  /**
   * 返回基于范围定义计算的向量长度
   *
   * 该方法分析最小值和最大值节点的数据类型，
   * 并返回两者中较大的向量长度，确保能够容纳所有数据
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {number} 向量长度（1=标量, 2=vec2, 3=vec3, 4=vec4）
   */
  getVectorLength(builder) {
    // 获取最小值节点的类型长度
    const minLength = builder.getTypeLength(getValueType(this.minNode.value));
    // 获取最大值节点的类型长度
    const maxLength = builder.getTypeLength(getValueType(this.maxNode.value));

    // 返回两者中的较大值，确保数据类型兼容性
    return minLength > maxLength ? minLength : maxLength;
  }

  /**
   * 重写此方法，因为节点类型是从范围定义推断出来的
   *
   * 根据对象的实例数量和向量长度确定最终的节点类型：
   * - 单实例：返回'float'类型
   * - 多实例：根据向量长度返回相应的向量类型
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {string} 节点类型（'float', 'vec2', 'vec3', 'vec4'等）
   */
  getNodeType(builder) {
    // 如果对象有多个实例，根据向量长度确定类型；否则返回float
    return builder.object.count > 1 ? builder.getTypeFromLength(this.getVectorLength(builder)) : "float";
  }

  /**
   * 设置范围节点的输出
   *
   * 这是节点的核心方法，负责生成随机范围数据：
   * 1. 对于多实例对象：生成随机属性数据数组
   * 2. 对于单实例对象：返回零值
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {Node} 输出节点
   */
  setup(builder) {
    // 获取构建器中的对象引用
    const object = builder.object;

    // 初始化输出节点
    let output = null;

    // 检查是否为多实例对象（需要生成随机数据）
    if (object.count > 1) {
      // 获取最小值和最大值
      const minValue = this.minNode.value;
      const maxValue = this.maxNode.value;

      // 获取最小值和最大值的向量长度
      const minLength = builder.getTypeLength(getValueType(minValue));
      const maxLength = builder.getTypeLength(getValueType(maxValue));

      // 延迟初始化全局向量变量（避免不必要的内存分配）
      min = min || new Vector4();
      max = max || new Vector4();

      // 重置向量为零值
      min.setScalar(0);
      max.setScalar(0);

      // 根据最小值的类型设置向量分量
      if (minLength === 1) min.setScalar(minValue); // 标量值
      else if (minValue.isColor) min.set(minValue.r, minValue.g, minValue.b, 1); // 颜色值
      else min.set(minValue.x, minValue.y, minValue.z || 0, minValue.w || 0); // 向量值

      // 根据最大值的类型设置向量分量
      if (maxLength === 1) max.setScalar(maxValue); // 标量值
      else if (maxValue.isColor) max.set(maxValue.r, maxValue.g, maxValue.b, 1); // 颜色值
      else max.set(maxValue.x, maxValue.y, maxValue.z || 0, maxValue.w || 0); // 向量值

      // 设置步长为4（vec4的分量数）
      const stride = 4;

      // 计算数组总长度（实例数 × 步长）
      const length = stride * object.count;
      // 创建浮点数组存储随机数据
      const array = new Float32Array(length);

      // 为每个数组元素生成随机值
      for (let i = 0; i < length; i++) {
        // 计算当前分量索引（0-3循环）
        const index = i % stride;

        // 获取当前分量的最小值和最大值
        const minElementValue = min.getComponent(index);
        const maxElementValue = max.getComponent(index);

        // 使用线性插值生成随机值
        array[i] = MathUtils.lerp(minElementValue, maxElementValue, Math.random());
      }

      // 获取节点的最终类型
      const nodeType = this.getNodeType(builder);

      // 根据实例数量选择不同的缓冲区创建策略
      if (object.count <= 4096) {
        // 小量实例：使用buffer节点创建
        output = buffer(array, "vec4", object.count).element(instanceIndex).convert(nodeType);
      } else {
        // 大量实例：使用实例化缓冲区属性
        // TODO: 改进匿名缓冲区属性创建，移除这部分代码
        const bufferAttribute = new InstancedBufferAttribute(array, 4);
        builder.geometry.setAttribute("__range" + this.id, bufferAttribute);

        output = instancedBufferAttribute(bufferAttribute).convert(nodeType);
      }
    } else {
      // 单实例对象：返回零值浮点数
      output = float(0);
    }

    // 返回生成的输出节点
    return output;
  }
}

// 导出RangeNode类作为默认导出
export default RangeNode;

/**
 * TSL函数，用于创建范围节点
 *
 * 这是一个便捷的工厂函数，通过nodeProxy包装RangeNode类，
 * 提供更简洁的节点创建语法。支持在指定范围内生成随机实例化数据。
 *
 * 使用示例：
 * ```js
 * // 生成随机颜色范围
 * const colorRange = range(new Color(0x000000), new Color(0xFFFFFF));
 *
 * // 生成随机标量范围
 * const scaleRange = range(float(0.5), float(2.0));
 *
 * // 生成随机向量范围
 * const positionRange = range(vec3(-1, -1, -1), vec3(1, 1, 1));
 * ```
 *
 * @tsl
 * @function
 * @param {Node<any>} [minNode=float()] - 定义范围下界的节点
 * @param {Node<any>} [maxNode=float()] - 定义范围上界的节点
 * @returns {RangeNode} 返回新创建的范围节点实例
 */
export const range = /*@__PURE__*/ nodeProxy(RangeNode).setParameterLength(2);
