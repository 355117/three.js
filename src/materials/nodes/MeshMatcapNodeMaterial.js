// 导入节点材质基类
import NodeMaterial from "./NodeMaterial.js";
// 导入材质引用节点，用于访问材质属性
import { materialReference } from "../../nodes/accessors/MaterialReferenceNode.js";
// 导入漫反射颜色属性节点
import { diffuseColor } from "../../nodes/core/PropertyNode.js";
// 导入三维向量节点类型
import { vec3 } from "../../nodes/tsl/TSLBase.js";
// 导入混合数学节点函数
import { mix } from "../../nodes/math/MathNode.js";
// 导入 Matcap UV 坐标计算工具
import { matcapUV } from "../../nodes/utils/MatcapUV.js";

// 导入网格 Matcap 材质基类
import { MeshMatcapMaterial } from "../MeshMatcapMaterial.js";

// 创建默认值实例，使用纯函数标记进行优化
const _defaultValues = /*@__PURE__*/ new MeshMatcapMaterial();

/**
 * 网格 Matcap 节点材质类 - {@link MeshMatcapMaterial} 的节点版本
 *
 * Matcap（Material Capture）是一种特殊的材质技术，通过预渲染的球体纹理
 * 来模拟复杂的光照和材质效果。这个类扩展了 NodeMaterial，
 * 为网格对象提供基于节点系统的 Matcap 材质功能。
 *
 * @augments NodeMaterial
 */
class MeshMatcapNodeMaterial extends NodeMaterial {
  // 静态方法：返回材质类型标识符
  static get type() {
    // 返回材质类型名称，用于材质系统识别
    return "MeshMatcapNodeMaterial";
  }

  /**
   * 构造函数：创建新的网格 Matcap 节点材质实例
   *
   * @param {Object} [parameters] - 可选的配置参数对象，用于初始化材质属性
   */
  constructor(parameters) {
    // 调用父类构造函数，初始化节点材质基础功能
    super();

    /**
     * 类型标识标志，用于运行时类型检测
     *
     * 这个标志可以用来快速判断一个对象是否为 MeshMatcapNodeMaterial 实例，
     * 避免使用 instanceof 操作符带来的性能开销
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMeshMatcapNodeMaterial = true;

    // 设置材质的默认属性值
    this.setDefaultValues(_defaultValues);

    // 应用用户传入的参数，覆盖默认值
    this.setValues(parameters);
  }

  /**
   * 设置 Matcap 特定的节点变量和渲染逻辑
   *
   * 这个方法配置 Matcap 材质的核心渲染逻辑，包括 UV 坐标计算、
   * Matcap 纹理采样以及颜色混合等操作。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器，用于构建着色器代码
   */
  setupVariants(builder) {
    // 获取 Matcap UV 坐标，这是基于法线计算的特殊 UV 坐标
    const uv = matcapUV;

    // 声明 Matcap 颜色变量
    let matcapColor;

    // 检查材质是否设置了 Matcap 纹理
    if (builder.material.matcap) {
      // 如果有 Matcap 纹理，创建材质引用节点来采样纹理
      // 使用自定义的 UV 坐标获取函数
      matcapColor = materialReference("matcap", "texture").context({ getUV: () => uv });
    } else {
      // 如果没有 Matcap 纹理，创建默认的渐变颜色
      // 使用 UV 的 Y 坐标在 0.2 到 0.8 之间进行线性插值
      matcapColor = vec3(mix(0.2, 0.8, uv.y)); // 默认渐变，当 matcap 纹理缺失时使用
    }

    // 将 Matcap 颜色与漫反射颜色相乘，实现最终的颜色效果
    // mulAssign 是乘法赋值操作，相当于 diffuseColor.rgb *= matcapColor.rgb
    diffuseColor.rgb.mulAssign(matcapColor.rgb);
  }
}

// 导出网格 Matcap 节点材质类作为默认导出
export default MeshMatcapNodeMaterial;
