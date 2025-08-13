// 导入节点材质基类
import NodeMaterial from "./NodeMaterial.js";
// 导入卡通光照模型
import ToonLightingModel from "../../nodes/functions/ToonLightingModel.js";

// 导入传统的网格卡通材质类
import { MeshToonMaterial } from "../MeshToonMaterial.js";

// 创建默认值实例，使用纯函数标记进行优化
const _defaultValues = /*@__PURE__*/ new MeshToonMaterial();

/**
 * 网格卡通节点材质类 - {@link MeshToonMaterial} 的节点版本
 * 实现卡通风格的非真实感渲染材质，产生平面化的光照效果
 *
 * @augments NodeMaterial
 */
class MeshToonNodeMaterial extends NodeMaterial {
  // 静态方法：返回材质类型标识符
  static get type() {
    return "MeshToonNodeMaterial"; // 返回材质类型字符串
  }

  /**
   * 构造函数 - 创建新的网格卡通节点材质实例
   *
   * @param {Object} [parameters] - 配置参数对象，包含材质的各种属性设置
   */
  constructor(parameters) {
    // 调用父类构造函数初始化基础功能
    super();

    /**
     * 类型检测标志 - 用于运行时类型判断
     * 可以通过此属性快速判断对象是否为MeshToonNodeMaterial实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMeshToonNodeMaterial = true;

    /**
     * 光照响应标志 - 设置为true因为卡通材质需要响应光照
     * 卡通材质依赖光源来计算简化的光照效果
     *
     * @type {boolean}
     * @default true
     */
    this.lights = true;

    // 设置材质的默认属性值
    this.setDefaultValues(_defaultValues);

    // 应用用户传入的参数，覆盖默认值
    this.setValues(parameters);
  }

  /**
   * 设置光照模型 - 配置卡通光照计算
   *
   * @return {ToonLightingModel} 返回卡通光照模型实例
   */
  setupLightingModel(/*builder*/) {
    // 创建并返回新的卡通光照模型实例
    return new ToonLightingModel();
  }
}

// 导出网格卡通节点材质类作为默认导出
export default MeshToonNodeMaterial;
