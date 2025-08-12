// 从分析光源节点模块导入基础类
import AnalyticLightNode from "./AnalyticLightNode.js";
// 从法线访问器模块导入世界空间法线
import { normalWorld } from "../accessors/Normal.js";
// 从统一数组节点访问器模块导入统一数组函数
import { uniformArray } from "../accessors/UniformArrayNode.js";
// 从数学模块导入三维向量类
import { Vector3 } from "../../math/Vector3.js";
// 从材质函数模块导入球面谐波辐照度计算函数
import getShIrradianceAt from "../functions/material/getShIrradianceAt.js";

/**
 * 光探针节点类
 *
 * 用于将光探针表示为节点的模块。光探针是一种高效的全局光照技术，
 * 使用球面谐波(Spherical Harmonics, SH)来存储和重现复杂的光照环境。
 *
 * 光探针的核心概念：
 * - 预计算光照：在特定位置预先计算光照信息
 * - 球面谐波：用数学函数表示球面上的光照分布
 * - 实时插值：运行时在多个探针间插值获得光照
 * - 高效存储：用少量系数表示复杂的光照环境
 *
 * 球面谐波的优势：
 * - 紧凑表示：9个系数可表示低频光照信息
 * - 快速计算：线性运算，适合实时渲染
 * - 平滑插值：在不同探针间平滑过渡
 * - 物理准确：基于数学理论的光照表示
 *
 * 应用场景：
 * - 室内场景的间接光照
 * - 开放世界的全局光照
 * - 动态物体的环境光照
 * - 实时全局光照系统
 *
 * @augments AnalyticLightNode
 */
class LightProbeNode extends AnalyticLightNode {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'LightProbeNode'
   */
  static get type() {
    return "LightProbeNode";
  }

  /**
   * 构造一个新的光探针节点
   *
   * @param {?LightProbe} [light=null] - 光探针对象，包含球面谐波系数
   */
  constructor(light = null) {
    // 调用父类构造函数，初始化基础光源属性
    super(light);

    // 创建球面谐波系数数组
    // 球面谐波的前9个系数足以表示低频光照信息
    const array = [];

    // 初始化9个三维向量，对应球面谐波的9个基函数
    // 每个向量存储RGB三个通道的系数
    for (let i = 0; i < 9; i++) array.push(new Vector3());

    /**
     * 以球面谐波形式表示的光探针统一变量
     *
     * 存储球面谐波系数的统一数组，包含9个三维向量：
     * - 第0个系数：常数项（环境光）
     * - 第1-3个系数：线性项（方向性光照）
     * - 第4-8个系数：二次项（更复杂的光照变化）
     *
     * 这些系数通过球面谐波基函数的线性组合
     * 可以重建出任意方向的光照强度。
     *
     * @type {UniformArrayNode}
     */
    this.lightProbe = uniformArray(array);
  }

  /**
   * 重写以更新光探针特定的统一变量
   *
   * 将光探针的球面谐波系数复制到着色器统一变量中，
   * 并应用光照强度进行缩放。
   *
   * @param {NodeFrame} frame - 当前节点帧的引用
   */
  update(frame) {
    // 获取光探针引用
    const { light } = this;

    // 调用父类的更新方法
    super.update(frame);

    // 更新球面谐波系数
    // 将光探针的SH系数复制到统一变量数组中
    for (let i = 0; i < 9; i++) {
      // 复制第i个球面谐波系数并乘以光照强度
      // light.sh.coefficients[i] 是预计算的球面谐波系数
      // multiplyScalar(light.intensity) 应用光照强度缩放
      this.lightProbe.array[i].copy(light.sh.coefficients[i]).multiplyScalar(light.intensity);
    }
  }

  /**
   * 设置光探针的光照计算
   *
   * 使用球面谐波系数和表面法线计算该位置的辐照度，
   * 并将结果添加到光照上下文中。
   *
   * @param {NodeBuilder} builder - 节点构建器，包含光照计算的上下文
   */
  setup(builder) {
    // 使用球面谐波函数计算当前表面法线方向的辐照度
    // getShIrradianceAt 函数根据法线方向和SH系数计算光照强度
    const irradiance = getShIrradianceAt(normalWorld, this.lightProbe);

    // 将计算得到的辐照度添加到光照上下文的总辐照度中
    builder.context.irradiance.addAssign(irradiance);
  }
}

// 导出光探针节点类作为默认导出
export default LightProbeNode;
