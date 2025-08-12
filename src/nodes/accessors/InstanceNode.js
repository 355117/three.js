// 导入节点基类
import Node from "../core/Node.js";
// 导入变量属性
import { varyingProperty } from "../core/PropertyNode.js";
// 导入实例化缓冲区属性
import { instancedBufferAttribute, instancedDynamicBufferAttribute } from "./BufferAttributeNode.js";
// 导入法线相关节点
import { normalLocal, transformNormal } from "./Normal.js";
// 导入位置节点
import { positionLocal } from "./Position.js";
// 导入TSL基础函数
import { nodeProxy, vec3, mat4 } from "../tsl/TSLBase.js";
// 导入节点更新类型常量
import { NodeUpdateType } from "../core/constants.js";
// 导入缓冲区节点
import { buffer } from "../accessors/BufferNode.js";
// 导入实例索引
import { instanceIndex } from "../core/IndexNode.js";

// 导入实例化交错缓冲区
import { InstancedInterleavedBuffer } from "../../core/InstancedInterleavedBuffer.js";
// 导入实例化缓冲区属性
import { InstancedBufferAttribute } from "../../core/InstancedBufferAttribute.js";
// 导入动态绘制使用常量
import { DynamicDrawUsage } from "../../constants.js";

/**
 * 此节点实现通过实例化渲染3D对象时所需的顶点着色器逻辑。
 * 代码确保顶点位置、法线和颜色可以通过实例化数据进行修改。
 *
 * @augments Node
 */
class InstanceNode extends Node {
  // 返回节点类型标识符
  static get type() {
    return "InstanceNode";
  }

  /**
   * 构造一个新的实例节点
   *
   * @param {number} count - 实例数量
   * @param {InstancedBufferAttribute} instanceMatrix - 表示实例变换的实例化缓冲区属性
   * @param {?InstancedBufferAttribute} instanceColor - 表示实例颜色的实例化缓冲区属性
   */
  constructor(count, instanceMatrix, instanceColor = null) {
    // 调用父类构造函数，类型为void
    super("void");

    /**
     * 实例数量
     *
     * @type {number}
     */
    this.count = count;

    /**
     * 表示实例变换的实例化缓冲区属性
     *
     * @type {InstancedBufferAttribute}
     */
    this.instanceMatrix = instanceMatrix;

    /**
     * 表示实例颜色的实例化缓冲区属性
     *
     * @type {InstancedBufferAttribute}
     */
    this.instanceColor = instanceColor;

    /**
     * 表示实例矩阵数据的节点
     *
     * @type {?Node}
     */
    this.instanceMatrixNode = null;

    /**
     * 表示实例颜色数据的节点
     *
     * @type {?Node}
     * @default null
     */
    this.instanceColorNode = null;

    /**
     * 更新类型设置为 `frame`，因为实例化缓冲区数据的更新必须每帧检查
     *
     * @type {string}
     * @default 'frame'
     */
    this.updateType = NodeUpdateType.FRAME;

    /**
     * 对 `instanceMatrixNode` 使用的缓冲区的引用
     *
     * @type {?InstancedInterleavedBuffer}
     */
    this.buffer = null;

    /**
     * 对 `instanceColorNode` 使用的缓冲区的引用
     *
     * @type {?InstancedBufferAttribute}
     */
    this.bufferColor = null;
  }

  /**
   * 设置内部缓冲区和节点，并将变换后的顶点数据分配给预定义的节点变量进行累积。
   * 这遵循与变形和蒙皮节点相同的模式。
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   */
  setup(builder) {
    // 解构获取实例相关属性
    const { count, instanceMatrix, instanceColor } = this;

    // 获取实例矩阵和颜色节点
    let { instanceMatrixNode, instanceColorNode } = this;

    // 如果实例矩阵节点为空，则创建
    if (instanceMatrixNode === null) {
      // WebGPU和WebGL后端的UBO最大限制为64kb。矩阵数量大于1000（16 * 4 * 1000 = 64kb）将回退到属性。

      if (count <= 1000) {
        // 对于小于等于1000个实例，使用缓冲区节点
        instanceMatrixNode = buffer(instanceMatrix.array, "mat4", Math.max(count, 1)).element(instanceIndex);
      } else {
        // 对于大于1000个实例，创建实例化交错缓冲区
        const buffer = new InstancedInterleavedBuffer(instanceMatrix.array, 16, 1);

        // 保存缓冲区引用
        this.buffer = buffer;

        // 根据使用模式选择缓冲区函数
        const bufferFn = instanceMatrix.usage === DynamicDrawUsage ? instancedDynamicBufferAttribute : instancedBufferAttribute;

        // 创建实例缓冲区数组（4x4矩阵分解为4个vec4）
        const instanceBuffers = [
          // 函数签名 -> bufferAttribute( array, type, stride, offset )
          bufferFn(buffer, "vec4", 16, 0), // 第一行
          bufferFn(buffer, "vec4", 16, 4), // 第二行
          bufferFn(buffer, "vec4", 16, 8), // 第三行
          bufferFn(buffer, "vec4", 16, 12), // 第四行
        ];

        // 组合成mat4矩阵节点
        instanceMatrixNode = mat4(...instanceBuffers);
      }

      // 保存实例矩阵节点
      this.instanceMatrixNode = instanceMatrixNode;
    }

    // 如果有实例颜色且颜色节点为空，则创建
    if (instanceColor && instanceColorNode === null) {
      // 创建实例化缓冲区属性
      const buffer = new InstancedBufferAttribute(instanceColor.array, 3);

      // 根据使用模式选择缓冲区函数
      const bufferFn = instanceColor.usage === DynamicDrawUsage ? instancedDynamicBufferAttribute : instancedBufferAttribute;

      // 保存颜色缓冲区引用
      this.bufferColor = buffer;

      // 创建vec3颜色节点
      instanceColorNode = vec3(bufferFn(buffer, "vec3", 3, 0));

      // 保存实例颜色节点
      this.instanceColorNode = instanceColorNode;
    }

    // 位置变换

    // 计算实例位置：实例矩阵 * 本地位置
    const instancePosition = instanceMatrixNode.mul(positionLocal).xyz;
    // 将变换后的位置赋值给本地位置
    positionLocal.assign(instancePosition);

    // 法线变换

    // 如果几何体有法线属性
    if (builder.hasGeometryAttribute("normal")) {
      // 变换法线：使用实例矩阵变换本地法线
      const instanceNormal = transformNormal(normalLocal, instanceMatrixNode);

      // 赋值操作

      // 将变换后的法线赋值给本地法线
      normalLocal.assign(instanceNormal);
    }

    // 颜色处理

    // 如果有实例颜色节点
    if (this.instanceColorNode !== null) {
      // 创建变量属性并赋值实例颜色
      varyingProperty("vec3", "vInstanceColor").assign(this.instanceColorNode);
    }
  }

  /**
   * 检查内部缓冲区是否需要更新
   *
   * @param {NodeFrame} frame - 当前节点帧
   */
  update(/*frame*/) {
    // 检查实例矩阵缓冲区是否需要更新
    if (this.instanceMatrix.usage !== DynamicDrawUsage && this.buffer !== null && this.instanceMatrix.version !== this.buffer.version) {
      // 同步版本号
      this.buffer.version = this.instanceMatrix.version;
    }

    // 检查实例颜色缓冲区是否需要更新
    if (this.instanceColor && this.instanceColor.usage !== DynamicDrawUsage && this.bufferColor !== null && this.instanceColor.version !== this.bufferColor.version) {
      // 同步版本号
      this.bufferColor.version = this.instanceColor.version;
    }
  }
}

// 导出InstanceNode类作为默认导出
export default InstanceNode;

/**
 * 用于创建实例节点的TSL函数
 *
 * @tsl
 * @function
 * @param {number} count - 实例数量
 * @param {InstancedBufferAttribute} instanceMatrix - 表示实例变换的实例化缓冲区属性
 * @param {?InstancedBufferAttribute} instanceColor - 表示实例颜色的实例化缓冲区属性
 * @returns {InstanceNode}
 */
export const instance = /*@__PURE__*/ nodeProxy(InstanceNode).setParameterLength(2, 3);
