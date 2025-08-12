// 导入节点基类
import Node from "../core/Node.js";
// 导入本地空间法线节点
import { normalLocal } from "./Normal.js";
// 导入本地空间位置节点
import { positionLocal } from "./Position.js";
// 导入TSL核心函数和数据类型
import { nodeProxy, vec3, mat3, mat4, int, ivec2, float, Fn } from "../tsl/TSLBase.js";
// 导入纹理加载节点
import { textureLoad } from "./TextureNode.js";
// 导入纹理尺寸节点
import { textureSize } from "./TextureSizeNode.js";
// 导入本地空间切线节点
import { tangentLocal } from "./Tangent.js";
// 导入实例索引和绘制索引节点
import { instanceIndex, drawIndex } from "../core/IndexNode.js";
// 导入变量属性节点
import { varyingProperty } from "../core/PropertyNode.js";

/**
 * 批处理节点，实现批处理渲染3D对象时所需的顶点着色器逻辑
 * BatchNode必须与BatchedMesh实例一起使用，用于高效渲染大量相似对象
 *
 * @augments Node
 */
class BatchNode extends Node {
  static get type() {
    return "BatchNode";
  }

  /**
   * 构造一个新的批处理节点
   *
   * @param {Object} batchMesh - 批处理网格的引用
   */
  constructor(batchMesh) {
    // 调用父类构造函数，返回类型为void
    super("void");

    /**
     * 批处理网格的引用
     * 包含批处理渲染所需的矩阵纹理、颜色纹理和间接纹理
     *
     * @type {Object}
     */
    this.batchMesh = batchMesh;

    /**
     * 批处理索引节点
     * 用于确定当前实例在批处理中的索引
     *
     * @type {?IndexNode}
     * @default null
     */
    this.batchingIdNode = null;
  }

  /**
   * 设置内部缓冲区和节点，并将变换后的顶点数据分配给预定义的节点变量进行累积
   * 这遵循与变形和蒙皮节点相同的模式
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   */
  setup(builder) {
    // 如果批处理ID节点尚未设置，根据绘制索引情况选择合适的索引节点
    if (this.batchingIdNode === null) {
      if (builder.getDrawIndex() === null) {
        // 没有绘制索引时使用实例索引
        this.batchingIdNode = instanceIndex;
      } else {
        // 有绘制索引时使用绘制索引
        this.batchingIdNode = drawIndex;
      }
    }

    // 定义获取间接索引的函数：从间接纹理中获取实际的批处理索引
    const getIndirectIndex = Fn(([id]) => {
      // 获取间接纹理的宽度
      const size = int(textureSize(textureLoad(this.batchMesh._indirectTexture), 0).x);
      // 计算纹理坐标：x为id对纹理宽度取模
      const x = int(id).mod(size);
      // y为id除以纹理宽度的整数部分
      const y = int(id).div(size);
      // 从间接纹理中加载实际的批处理索引
      return textureLoad(this.batchMesh._indirectTexture, ivec2(x, y)).x;
    }).setLayout({
      name: "getIndirectIndex",
      type: "uint",
      inputs: [{ name: "id", type: "int" }],
    });

    // 获取当前实例的间接索引
    const indirectId = getIndirectIndex(int(this.batchingIdNode));

    // 获取存储变换矩阵的纹理
    const matricesTexture = this.batchMesh._matricesTexture;

    // 获取矩阵纹理的宽度
    const size = int(textureSize(textureLoad(matricesTexture), 0).x);
    // 计算矩阵在纹理中的起始位置（每个矩阵占4个纹理像素）
    const j = float(indirectId).mul(4).toInt().toVar();

    // 计算矩阵第一行在纹理中的坐标
    const x = j.mod(size);
    const y = j.div(size);
    // 从纹理中加载4x4变换矩阵的四行数据
    const batchingMatrix = mat4(
      textureLoad(matricesTexture, ivec2(x, y)), // 第一行
      textureLoad(matricesTexture, ivec2(x.add(1), y)), // 第二行
      textureLoad(matricesTexture, ivec2(x.add(2), y)), // 第三行
      textureLoad(matricesTexture, ivec2(x.add(3), y)) // 第四行
    );

    // 获取存储颜色信息的纹理
    const colorsTexture = this.batchMesh._colorsTexture;

    // 如果存在颜色纹理，处理批处理颜色
    if (colorsTexture !== null) {
      // 定义获取批处理颜色的函数
      const getBatchingColor = Fn(([id]) => {
        // 获取颜色纹理的宽度
        const size = int(textureSize(textureLoad(colorsTexture), 0).x);
        const j = id;
        // 计算纹理坐标
        const x = j.mod(size);
        const y = j.div(size);
        // 从颜色纹理中加载RGB颜色值
        return textureLoad(colorsTexture, ivec2(x, y)).rgb;
      }).setLayout({
        name: "getBatchingColor",
        type: "vec3",
        inputs: [{ name: "id", type: "int" }],
      });

      // 获取当前实例的颜色
      const color = getBatchingColor(indirectId);

      // 将颜色分配给varying变量，传递给片段着色器
      varyingProperty("vec3", "vBatchColor").assign(color);
    }

    // 从4x4矩阵中提取3x3旋转缩放矩阵
    const bm = mat3(batchingMatrix);

    // 应用批处理变换矩阵到本地位置
    positionLocal.assign(batchingMatrix.mul(positionLocal));

    // 计算变换后的法线：考虑非均匀缩放的影响
    // 通过除以各轴的缩放平方来补偿缩放对法线的影响
    const transformedNormal = normalLocal.div(vec3(bm[0].dot(bm[0]), bm[1].dot(bm[1]), bm[2].dot(bm[2])));

    // 应用旋转变换到法线
    const batchingNormal = bm.mul(transformedNormal).xyz;

    // 更新本地法线
    normalLocal.assign(batchingNormal);

    // 如果几何体有切线属性，也应用变换
    if (builder.hasGeometryAttribute("tangent")) {
      tangentLocal.mulAssign(bm);
    }
  }
}

// 导出批处理节点类
export default BatchNode;

/**
 * TSL函数，用于创建批处理节点
 * 提供便捷的方式创建BatchNode实例，用于批处理渲染
 *
 * @tsl
 * @function
 * @param {Object} batchMesh - 批处理网格的引用
 * @returns {BatchNode} 批处理节点实例
 */
export const batch = /*@__PURE__*/ nodeProxy(BatchNode).setParameterLength(1);
