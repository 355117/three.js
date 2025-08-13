// 导入节点材质基类
import NodeMaterial from "./NodeMaterial.js";

// 导入线条基础材质类
import { LineBasicMaterial } from "../LineBasicMaterial.js";

// 创建默认值实例，使用纯函数标记进行优化
const _defaultValues = /*@__PURE__*/ new LineBasicMaterial();

/**
 * 线条基础节点材质类 - {@link LineBasicMaterial} 的节点版本
 *
 * 这个类扩展了 NodeMaterial，为线条渲染提供基础的节点材质功能。
 * 它允许使用节点系统来定义线条的外观和行为。
 *
 * @augments NodeMaterial
 */
class LineBasicNodeMaterial extends NodeMaterial {
  // 静态方法：返回材质类型标识符
  static get type() {
    // 返回材质类型名称，用于材质系统识别
    return "LineBasicNodeMaterial";
  }

  /**
   * 构造函数：创建新的线条基础节点材质实例
   *
   * @param {Object} [parameters] - 可选的配置参数对象，用于初始化材质属性
   */
  constructor(parameters) {
    // 调用父类构造函数，初始化节点材质基础功能
    super();

    /**
     * 类型标识标志，用于运行时类型检测
     *
     * 这个标志可以用来快速判断一个对象是否为 LineBasicNodeMaterial 实例，
     * 避免使用 instanceof 操作符带来的性能开销
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isLineBasicNodeMaterial = true;

    // 设置材质的默认属性值
    this.setDefaultValues(_defaultValues);

    // 应用用户传入的参数，覆盖默认值
    this.setValues(parameters);
  }
}

// 导出线条基础节点材质类作为默认导出
export default LineBasicNodeMaterial;
