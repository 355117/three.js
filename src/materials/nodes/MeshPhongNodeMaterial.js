// 导入节点材质基类
import NodeMaterial from "./NodeMaterial.js";
// 导入光泽度和镜面反射颜色属性节点
import { shininess, specularColor } from "../../nodes/core/PropertyNode.js";
// 导入材质光泽度和镜面反射访问器
import { materialShininess, materialSpecular } from "../../nodes/accessors/MaterialNode.js";
// 导入TSL基础类型：浮点数
import { float } from "../../nodes/tsl/TSLBase.js";
// 导入基础环境节点，用于简单的环境映射
import BasicEnvironmentNode from "../../nodes/lighting/BasicEnvironmentNode.js";
// 导入Phong光照模型
import PhongLightingModel from "../../nodes/functions/PhongLightingModel.js";

// 导入传统的网格Phong材质类
import { MeshPhongMaterial } from "../MeshPhongMaterial.js";

// 创建默认值实例，使用纯函数标记进行优化
const _defaultValues = /*@__PURE__*/ new MeshPhongMaterial();

/**
 * 网格Phong节点材质类 - {@link MeshPhongMaterial} 的节点版本
 * 实现Phong光照模型的材质，支持环境光、漫反射和镜面反射
 *
 * @augments NodeMaterial
 */
class MeshPhongNodeMaterial extends NodeMaterial {
  // 静态方法：返回材质类型标识符
  static get type() {
    return "MeshPhongNodeMaterial"; // 返回材质类型字符串
  }

  /**
   * 构造函数 - 创建新的网格Phong节点材质实例
   *
   * @param {Object} [parameters] - 配置参数对象，包含材质的各种属性设置
   */
  constructor(parameters) {
    // 调用父类构造函数初始化基础功能
    super();

    /**
     * 类型检测标志 - 用于运行时类型判断
     * 可以通过此属性快速判断对象是否为MeshPhongNodeMaterial实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMeshPhongNodeMaterial = true;

    /**
     * 光照响应标志 - 设置为true因为Phong材质需要响应光照
     * Phong材质依赖光源来计算漫反射和镜面反射效果
     *
     * @type {boolean}
     * @default true
     */
    this.lights = true;

    /**
     * 光泽度节点 - Phong材质的光泽度默认从shininess属性推断
     * 此节点属性允许覆盖默认值，用节点来定义光泽度
     *
     * 如果不想覆盖光泽度而是修改现有值，请使用 {@link materialShininess}
     *
     * @type {?Node<float>}
     * @default null
     */
    this.shininessNode = null;

    /**
     * 镜面反射颜色节点 - Phong材质的镜面反射颜色默认从specular属性推断
     * 此节点属性允许覆盖默认值，用节点来定义镜面反射颜色
     *
     * 如果不想覆盖镜面反射颜色而是修改现有值，请使用 {@link materialSpecular}
     *
     * @type {?Node<vec3>}
     * @default null
     */
    this.specularNode = null;

    // 设置材质的默认属性值
    this.setDefaultValues(_defaultValues);

    // 应用用户传入的参数，覆盖默认值
    this.setValues(parameters);
  }

  /**
   * 设置环境映射 - 重写父类实现
   * 此类型的材质使用 {@link BasicEnvironmentNode} 来实现默认的环境映射
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {?BasicEnvironmentNode<vec3>} 环境节点，如果没有环境则返回null
   */
  setupEnvironment(builder) {
    // 调用父类方法获取基础环境节点
    const envNode = super.setupEnvironment(builder);

    // 如果存在环境节点，则包装为BasicEnvironmentNode，否则返回null
    return envNode ? new BasicEnvironmentNode(envNode) : null;
  }

  /**
   * 设置光照模型 - 配置Phong光照计算
   *
   * @return {PhongLightingModel} 返回Phong光照模型实例
   */
  setupLightingModel(/*builder*/) {
    // 创建并返回新的Phong光照模型实例
    return new PhongLightingModel();
  }

  /**
   * 设置Phong特定的节点变量 - 配置光泽度和镜面反射颜色
   *
   * @param {NodeBuilder} builder - 当前的节点构建器（未使用）
   */
  setupVariants(/*builder*/) {
    // 光泽度设置

    // 获取光泽度节点：使用自定义节点或材质默认值，并限制最小值防止pow(0.0, 0.0)错误
    const shininessNode = (this.shininessNode ? float(this.shininessNode) : materialShininess).max(1e-4); // 防止pow(0.0, 0.0)计算错误

    // 将计算得到的光泽度赋值给全局光泽度属性
    shininess.assign(shininessNode);

    // 镜面反射颜色设置

    // 获取镜面反射节点：使用自定义节点或材质默认值
    const specularNode = this.specularNode || materialSpecular;

    // 将镜面反射颜色赋值给全局镜面反射颜色属性
    specularColor.assign(specularNode);
  }

  /**
   * 复制方法 - 从源材质复制属性到当前材质
   *
   * @param {MeshPhongNodeMaterial} source - 源材质对象
   * @return {MeshPhongNodeMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 复制光泽度节点
    this.shininessNode = source.shininessNode;
    // 复制镜面反射节点
    this.specularNode = source.specularNode;

    // 调用父类复制方法处理其他属性
    return super.copy(source);
  }
}

// 导出网格Phong节点材质类作为默认导出
export default MeshPhongNodeMaterial;
