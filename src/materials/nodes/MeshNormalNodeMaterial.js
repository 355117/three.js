// 导入节点材质基类
import NodeMaterial from "./NodeMaterial.js";
// 导入漫反射颜色属性节点
import { diffuseColor } from "../../nodes/core/PropertyNode.js";
// 导入方向转颜色的打包工具函数
import { directionToColor } from "../../nodes/utils/Packing.js";
// 导入材质不透明度访问器
import { materialOpacity } from "../../nodes/accessors/MaterialNode.js";
// 导入视图空间法线访问器
import { normalView } from "../../nodes/accessors/Normal.js";
// 导入颜色空间转换节点
import { colorSpaceToWorking } from "../../nodes/display/ColorSpaceNode.js";
// 导入TSL基础类型：浮点数和四维向量
import { float, vec4 } from "../../nodes/tsl/TSLBase.js";
// 导入sRGB颜色空间常量
import { SRGBColorSpace } from "../../constants.js";

// 导入传统的网格法线材质类
import { MeshNormalMaterial } from "../MeshNormalMaterial.js";

// 创建默认值实例，使用纯函数标记进行优化
const _defaultValues = /*@__PURE__*/ new MeshNormalMaterial();

/**
 * 网格法线节点材质类 - {@link MeshNormalMaterial} 的节点版本
 * 用于显示几何体表面法线信息的材质，将法线向量转换为RGB颜色显示
 *
 * @augments NodeMaterial
 */
class MeshNormalNodeMaterial extends NodeMaterial {
  // 静态方法：返回材质类型标识符
  static get type() {
    return "MeshNormalNodeMaterial"; // 返回材质类型字符串
  }

  /**
   * 构造函数 - 创建新的网格法线节点材质实例
   *
   * @param {Object} [parameters] - 配置参数对象，包含材质的各种属性设置
   */
  constructor(parameters) {
    // 调用父类构造函数初始化基础功能
    super();

    /**
     * 类型检测标志 - 用于运行时类型判断
     * 可以通过此属性快速判断对象是否为MeshNormalNodeMaterial实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMeshNormalNodeMaterial = true;

    // 设置材质的默认属性值
    this.setDefaultValues(_defaultValues);

    // 应用用户传入的参数，覆盖默认值
    this.setValues(parameters);
  }

  /**
   * 设置漫反射颜色 - 重写默认实现
   * 基于法线数据计算漫反射颜色，将法线向量转换为可视化的颜色信息
   */
  setupDiffuseColor() {
    // 获取不透明度节点：如果存在自定义不透明度节点则使用，否则使用材质默认不透明度
    const opacityNode = this.opacityNode ? float(this.opacityNode) : materialOpacity;

    // 按照约定，打包到RGB的法线数据位于sRGB颜色空间中，需要转换到工作颜色空间
    // 将视图空间法线转换为颜色，与不透明度组合成四维向量，然后转换颜色空间

    // 执行颜色赋值：将法线转换为颜色并应用颜色空间转换
    diffuseColor.assign(colorSpaceToWorking(vec4(directionToColor(normalView), opacityNode), SRGBColorSpace));
  }
}

// 导出网格法线节点材质类作为默认导出
export default MeshNormalNodeMaterial;
