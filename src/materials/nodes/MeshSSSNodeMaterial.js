// 导入网格物理节点材质基类
import MeshPhysicalNodeMaterial from "./MeshPhysicalNodeMaterial.js";
// 导入物理光照模型
import PhysicalLightingModel from "../../nodes/functions/PhysicalLightingModel.js";
// 导入视图空间法线访问器
import { normalView } from "../../nodes/accessors/Normal.js";
// 导入视图方向位置访问器
import { positionViewDirection } from "../../nodes/accessors/Position.js";
// 导入TSL基础类型：浮点数和三维向量
import { float, vec3 } from "../../nodes/tsl/TSLBase.js";

/**
 * SSS光照模型类 - 为 {@link MeshSSSNodeMaterial} 提供光照计算
 * 扩展物理光照模型，添加次表面散射(Subsurface Scattering)效果
 *
 * @augments PhysicalLightingModel
 */
class SSSLightingModel extends PhysicalLightingModel {
  /**
   * 构造函数 - 创建新的SSS物理光照模型实例
   *
   * @param {boolean} [clearcoat=false] - 是否支持清漆效果
   * @param {boolean} [sheen=false] - 是否支持光泽效果
   * @param {boolean} [iridescence=false] - 是否支持彩虹色效果
   * @param {boolean} [anisotropy=false] - 是否支持各向异性效果
   * @param {boolean} [transmission=false] - 是否支持透射效果
   * @param {boolean} [dispersion=false] - 是否支持色散效果
   * @param {boolean} [sss=false] - 是否支持次表面散射效果
   */
  constructor(clearcoat = false, sheen = false, iridescence = false, anisotropy = false, transmission = false, dispersion = false, sss = false) {
    // 调用父类构造函数，传递除SSS外的所有参数
    super(clearcoat, sheen, iridescence, anisotropy, transmission, dispersion);

    /**
     * SSS使用标志 - 光照模型是否应该使用次表面散射
     * 控制是否在光照计算中包含SSS效果
     *
     * @type {boolean}
     * @default false
     */
    this.useSSS = sss;
  }

  /**
   * 直接光照计算 - 扩展默认实现，添加SSS项
   * 实现次表面散射的光照效果，模拟光线在材质内部的散射
   *
   * 参考文献: [Approximating Translucency for a Fast, Cheap and Convincing Subsurface Scattering Look]{@link https://colinbarrebrisebois.com/2011/03/07/gdc-2011-approximating-translucency-for-a-fast-cheap-and-convincing-subsurface-scattering-look/}
   *
   * @param {Object} input - 输入数据对象
   * @param {NodeBuilder} builder - 当前的节点构建器
   */
  direct({ lightDirection, lightColor, reflectedLight }, builder) {
    // 如果启用了SSS效果
    if (this.useSSS === true) {
      // 获取当前材质实例
      const material = builder.material;

      // 解构获取材质的厚度相关节点属性
      const { thicknessColorNode, thicknessDistortionNode, thicknessAmbientNode, thicknessAttenuationNode, thicknessPowerNode, thicknessScaleNode } = material;

      // 计算散射半向量：光线方向加上扭曲后的法线，然后归一化
      const scatteringHalf = lightDirection.add(normalView.mul(thicknessDistortionNode)).normalize();
      // 计算散射点积：视图方向与散射半向量的负值的点积，饱和后进行幂运算并缩放
      const scatteringDot = float(positionViewDirection.dot(scatteringHalf.negate()).saturate().pow(thicknessPowerNode).mul(thicknessScaleNode));
      // 计算散射照明：散射点积加上环境项，再乘以厚度颜色
      const scatteringIllu = vec3(scatteringDot.add(thicknessAmbientNode).mul(thicknessColorNode));

      // 将散射照明添加到直接漫反射光照中，考虑厚度衰减和光源颜色
      reflectedLight.directDiffuse.addAssign(scatteringIllu.mul(thicknessAttenuationNode.mul(lightColor)));
    }

    // 调用父类的直接光照计算方法
    super.direct({ lightDirection, lightColor, reflectedLight }, builder);
  }
}

/**
 * 网格SSS节点材质类 - {@link MeshPhysicalNodeMaterial} 的实验性扩展
 * 实现次表面散射(Subsurface Scattering, SSS)效果的材质
 * 用于模拟光线在半透明材质内部的散射现象，如皮肤、蜡烛等
 *
 * @augments MeshPhysicalNodeMaterial
 */
class MeshSSSNodeMaterial extends MeshPhysicalNodeMaterial {
  // 静态方法：返回材质类型标识符
  static get type() {
    return "MeshSSSNodeMaterial"; // 返回材质类型字符串
  }

  /**
   * 构造函数 - 创建新的网格SSS节点材质实例
   *
   * @param {Object} [parameters] - 配置参数对象，包含材质的各种属性设置
   */
  constructor(parameters) {
    // 调用父类构造函数初始化物理材质基础功能
    super(parameters);

    /**
     * 厚度颜色节点 - 表示材质的厚度颜色
     * 控制次表面散射的颜色效果，影响光线穿透材质时的颜色变化
     *
     * @type {?Node<vec3>}
     * @default null
     */
    this.thicknessColorNode = null;

    /**
     * 厚度扭曲节点 - 表示扭曲因子
     * 控制光线在材质内部的扭曲程度，影响散射方向
     *
     * @type {?Node<float>}
     */
    this.thicknessDistortionNode = float(0.1);

    /**
     * 厚度环境节点 - 表示厚度环境因子
     * 控制环境光对次表面散射的贡献程度
     *
     * @type {?Node<float>}
     */
    this.thicknessAmbientNode = float(0.0);

    /**
     * 厚度衰减节点 - 表示厚度衰减
     * 控制光线在材质内部传播时的衰减程度
     *
     * @type {?Node<float>}
     */
    this.thicknessAttenuationNode = float(0.1);

    /**
     * 厚度幂次节点 - 表示厚度幂次
     * 控制散射效果的锐度，值越大散射越集中
     *
     * @type {?Node<float>}
     */
    this.thicknessPowerNode = float(2.0);

    /**
     * 厚度缩放节点 - 表示厚度缩放
     * 控制整体散射效果的强度
     *
     * @type {?Node<float>}
     */
    this.thicknessScaleNode = float(10.0);
  }

  /**
   * SSS使用标志 - 光照模型是否应该使用SSS
   * 通过检查厚度颜色节点是否存在来判断是否启用SSS效果
   *
   * @type {boolean}
   * @default true
   */
  get useSSS() {
    // 如果厚度颜色节点不为null，则启用SSS
    return this.thicknessColorNode !== null;
  }

  /**
   * 设置光照模型 - 配置SSS光照计算
   *
   * @return {SSSLightingModel} 返回SSS光照模型实例
   */
  setupLightingModel(/*builder*/) {
    // 创建并返回新的SSS光照模型实例，传递所有物理效果的启用状态
    return new SSSLightingModel(this.useClearcoat, this.useSheen, this.useIridescence, this.useAnisotropy, this.useTransmission, this.useDispersion, this.useSSS);
  }

  /**
   * 复制方法 - 从源材质复制属性到当前材质
   *
   * @param {MeshSSSNodeMaterial} source - 源材质对象
   * @return {MeshSSSNodeMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 复制所有厚度相关的节点属性
    this.thicknessColorNode = source.thicknessColorNode;
    this.thicknessDistortionNode = source.thicknessDistortionNode;
    this.thicknessAmbientNode = source.thicknessAmbientNode;
    this.thicknessAttenuationNode = source.thicknessAttenuationNode;
    this.thicknessPowerNode = source.thicknessPowerNode;
    this.thicknessScaleNode = source.thicknessScaleNode;

    // 调用父类复制方法处理其他属性
    return super.copy(source);
  }
}

// 导出网格SSS节点材质类作为默认导出
export default MeshSSSNodeMaterial;
