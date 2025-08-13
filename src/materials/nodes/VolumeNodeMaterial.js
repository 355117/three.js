// 导入节点材质基类
import NodeMaterial from "./NodeMaterial.js";
// 导入体积光照模型
import VolumetricLightingModel from "../../nodes/functions/VolumetricLightingModel.js";
// 导入背面渲染常量
import { BackSide } from "../../constants.js";

/**
 * 体积节点材质类 - 用于体积渲染的节点材质
 * 实现体积渲染效果，如云朵、烟雾、火焰等体积现象
 *
 * @augments NodeMaterial
 */
class VolumeNodeMaterial extends NodeMaterial {
  // 静态方法：返回材质类型标识符
  static get type() {
    return "VolumeNodeMaterial"; // 返回材质类型字符串
  }

  /**
   * 构造函数 - 创建新的体积节点材质实例
   *
   * @param {Object} [parameters] - 配置参数对象，包含材质的各种属性设置
   */
  constructor(parameters) {
    // 调用父类构造函数初始化基础功能
    super();

    /**
     * 类型检测标志 - 用于运行时类型判断
     * 可以通过此属性快速判断对象是否为VolumeNodeMaterial实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isVolumeNodeMaterial = true;

    /**
     * 光线步进步数 - 用于光线行进算法的步数
     * 步数越多，渲染质量越高，但性能开销也越大
     *
     * @type {number}
     * @default 25
     */
    this.steps = 25;

    /**
     * 偏移节点 - 偏移光线在体积中行进的距离
     * 可用于实现抖动以减少条带效应，改善渲染质量
     *
     * @type {Node<float>}
     * @default null
     */
    this.offsetNode = null;

    /**
     * 散射节点 - 用于散射计算的节点
     * 定义光线在体积中的散射行为和颜色
     *
     * @type {Function|FunctionNode<vec4>}
     * @default null
     */
    this.scatteringNode = null;

    // 启用光照响应，体积渲染需要光照信息
    this.lights = true;

    // 启用透明度，体积通常是半透明的
    this.transparent = true;
    // 设置为背面渲染，体积渲染通常从内部开始
    this.side = BackSide;

    // 禁用深度测试，体积渲染需要特殊的深度处理
    this.depthTest = false;
    // 禁用深度写入，避免影响其他对象的渲染
    this.depthWrite = false;

    // 应用用户传入的参数，覆盖默认值
    this.setValues(parameters);
  }

  /**
   * 设置光照模型 - 配置体积光照计算
   *
   * @return {VolumetricLightingModel} 返回体积光照模型实例
   */
  setupLightingModel() {
    // 创建并返回新的体积光照模型实例
    return new VolumetricLightingModel();
  }
}

// 导出体积节点材质类作为默认导出
export default VolumeNodeMaterial;
