// 导入节点材质基类
import NodeMaterial from "./NodeMaterial.js";
// 导入阴影遮罩模型
import ShadowMaskModel from "../../nodes/functions/ShadowMaskModel.js";

// 导入传统的阴影材质类
import { ShadowMaterial } from "../ShadowMaterial.js";

// 创建默认值实例，使用纯函数标记进行优化
const _defaultValues = /*@__PURE__*/ new ShadowMaterial();

/**
 * 阴影节点材质类 - {@link ShadowMaterial} 的节点版本
 * 用于创建阴影效果，通常用于阴影平面或阴影接收器
 *
 * @augments NodeMaterial
 */
class ShadowNodeMaterial extends NodeMaterial {
  // 静态方法：返回材质类型标识符
  static get type() {
    return "ShadowNodeMaterial"; // 返回材质类型字符串
  }

  /**
   * 构造函数 - 创建新的阴影节点材质实例
   *
   * @param {Object} [parameters] - 配置参数对象，包含材质的各种属性设置
   */
  constructor(parameters) {
    // 调用父类构造函数初始化基础功能
    super();

    /**
     * 类型检测标志 - 用于运行时类型判断
     * 可以通过此属性快速判断对象是否为ShadowNodeMaterial实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isShadowNodeMaterial = true;

    /**
     * 光照响应标志 - 设置为true以便实现阴影遮罩效果
     * 阴影材质需要光照信息来计算阴影区域
     *
     * @type {boolean}
     * @default true
     */
    this.lights = true;

    /**
     * 透明度标志 - 重写默认值，因为阴影材质默认是透明的
     * 阴影通常需要与背景混合以产生正确的视觉效果
     *
     * @type {boolean}
     * @default true
     */
    this.transparent = true;

    // 设置材质的默认属性值
    this.setDefaultValues(_defaultValues);

    // 应用用户传入的参数，覆盖默认值
    this.setValues(parameters);
  }

  /**
   * 设置光照模型 - 配置阴影遮罩光照计算
   *
   * @return {ShadowMaskModel} 返回阴影遮罩模型实例
   */
  setupLightingModel(/*builder*/) {
    // 创建并返回新的阴影遮罩模型实例
    return new ShadowMaskModel();
  }
}

// 导出阴影节点材质类作为默认导出
export default ShadowNodeMaterial;
