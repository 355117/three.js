// 导入节点材质基类
import NodeMaterial from "./NodeMaterial.js";
// 导入基础环境节点，用于环境光照处理
import BasicEnvironmentNode from "../../nodes/lighting/BasicEnvironmentNode.js";
// 导入 Phong 光照模型，用于计算光照效果
import PhongLightingModel from "../../nodes/functions/PhongLightingModel.js";

// 导入网格 Lambert 材质基类
import { MeshLambertMaterial } from "../MeshLambertMaterial.js";

// 创建默认值实例，使用纯函数标记进行优化
const _defaultValues = /*@__PURE__*/ new MeshLambertMaterial();

/**
 * 网格 Lambert 节点材质类 - {@link MeshLambertMaterial} 的节点版本
 *
 * Lambert 材质是一种基础的漫反射材质，它实现了 Lambert 反射模型，
 * 提供均匀的漫反射光照效果。这个类扩展了 NodeMaterial，
 * 为网格对象提供基于节点系统的 Lambert 材质功能。
 *
 * @augments NodeMaterial
 */
class MeshLambertNodeMaterial extends NodeMaterial {
  // 静态方法：返回材质类型标识符
  static get type() {
    // 返回材质类型名称，用于材质系统识别
    return "MeshLambertNodeMaterial";
  }

  /**
   * 构造函数：创建新的网格 Lambert 节点材质实例
   *
   * @param {Object} [parameters] - 可选的配置参数对象，用于初始化材质属性
   */
  constructor(parameters) {
    // 调用父类构造函数，初始化节点材质基础功能
    super();

    /**
     * 类型标识标志，用于运行时类型检测
     *
     * 这个标志可以用来快速判断一个对象是否为 MeshLambertNodeMaterial 实例，
     * 避免使用 instanceof 操作符带来的性能开销
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isMeshLambertNodeMaterial = true;

    /**
     * 光照响应标志，设置为 true 因为 Lambert 材质会对光照产生反应
     *
     * Lambert 材质是一种受光照影响的材质，需要计算光照效果，
     * 所以这个属性必须设置为 true 来启用光照计算
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
   * 设置环境光照节点
   *
   * 这个方法被重写是因为 Lambert 材质类型使用 {@link BasicEnvironmentNode}
   * 来实现默认的环境映射功能。环境映射可以为材质提供反射环境的效果。
   *
   * @param {NodeBuilder} builder - 当前的节点构建器，用于构建着色器代码
   * @return {?BasicEnvironmentNode<vec3>} 环境节点，如果没有环境设置则返回 null
   */
  setupEnvironment(builder) {
    // 调用父类方法获取基础环境节点
    const envNode = super.setupEnvironment(builder);

    // 如果存在环境节点，则包装为 BasicEnvironmentNode，否则返回 null
    return envNode ? new BasicEnvironmentNode(envNode) : null;
  }

  /**
   * 设置光照模型
   *
   * 这个方法配置材质使用的光照计算模型。Lambert 材质使用
   * Phong 光照模型但禁用镜面反射，只保留漫反射效果。
   *
   * @return {PhongLightingModel} 配置为 Lambert 模式的 Phong 光照模型
   */
  setupLightingModel(/*builder*/) {
    // 创建 Phong 光照模型，参数 false 表示禁用镜面反射，强制使用 Lambert 模式
    return new PhongLightingModel(false); // ( specular ) -> 强制使用 lambert 模式
  }
}

// 导出网格 Lambert 节点材质类作为默认导出
export default MeshLambertNodeMaterial;
