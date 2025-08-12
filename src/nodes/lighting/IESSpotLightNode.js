// 从聚光灯节点模块导入基础类
import SpotLightNode from "./SpotLightNode.js";
// 从纹理访问器模块导入texture函数
import { texture } from "../accessors/TextureNode.js";
// 从TSL基础模块导入二维向量类型
import { vec2 } from "../tsl/TSLBase.js";

/**
 * IES聚光灯节点类
 *
 * 默认聚光灯节点的IES版本，实现了符合IES标准的光照分布。
 * IES (Illuminating Engineering Society) 是照明工程学会制定的
 * 光度数据标准，用于描述真实灯具的光照分布特性。
 *
 * IES光度数据的特点：
 * - 基于真实测量：来自实际灯具的光度测量数据
 * - 精确分布：准确描述光在不同角度的强度分布
 * - 工业标准：广泛应用于建筑和照明设计
 * - 真实感强：提供更逼真的光照效果
 *
 * IES文件格式：
 * - 包含光强度在不同角度的分布数据
 * - 通常以纹理形式存储和使用
 * - 支持复杂的非对称光照分布
 * - 可以模拟各种真实灯具的特性
 *
 * 应用场景：
 * - 建筑可视化中的真实灯具模拟
 * - 室内设计的精确光照预览
 * - 产品展示中的专业照明
 * - 需要高真实感的渲染场景
 *
 * @augments SpotLightNode
 */
class IESSpotLightNode extends SpotLightNode {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'IESSpotLightNode'
   */
  static get type() {
    return "IESSpotLightNode";
  }

  /**
   * 重写默认实现以计算符合IES标准的聚光灯衰减
   *
   * 根据IES光度数据计算光照在不同角度的衰减系数。
   * 如果有IES贴图，则使用贴图数据；否则回退到标准聚光灯计算。
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @param {Node<float>} angleCosine - 用于计算聚光灯衰减的角度余弦值
   * @return {Node<float>} 聚光灯衰减系数
   */
  getSpotAttenuation(builder, angleCosine) {
    // 获取光源的IES贴图
    const iesMap = this.light.iesMap;

    let spotAttenuation = null;

    // 如果存在IES贴图且是有效的纹理
    if (iesMap && iesMap.isTexture === true) {
      // 将角度余弦值转换为角度（弧度），然后归一化到0-1范围
      // acos() 将余弦值转换为角度，除以π进行归一化
      const angle = angleCosine.acos().mul(1.0 / Math.PI);

      // 从IES贴图中采样衰减值
      // 使用角度作为U坐标，V坐标为0（因为IES数据通常是一维的）
      // 取红色通道的值作为衰减系数
      spotAttenuation = texture(iesMap, vec2(angle, 0), 0).r;
    } else {
      // 如果没有IES贴图，使用父类的标准聚光灯衰减计算
      spotAttenuation = super.getSpotAttenuation(angleCosine);
    }

    // 返回计算得到的衰减系数
    return spotAttenuation;
  }
}

// 导出IES聚光灯节点类作为默认导出
export default IESSpotLightNode;
