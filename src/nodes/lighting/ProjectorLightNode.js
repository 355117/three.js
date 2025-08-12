// 从聚光灯节点模块导入基础类
import SpotLightNode from "./SpotLightNode.js";

// 从TSL核心模块导入基础类型和函数
import { float, Fn, If, vec2 } from "../tsl/TSLCore.js";
// 从数学节点模块导入数学函数
import { length, min, max, saturate, acos } from "../math/MathNode.js";
// 从操作符节点模块导入除法和减法操作
import { div, sub } from "../math/OperatorNode.js";
// 从光源访问器模块导入光源阴影矩阵
import { lightShadowMatrix } from "../accessors/Lights.js";
// 从位置访问器模块导入世界位置
import { positionWorld } from "../accessors/Position.js";

/**
 * 有符号距离场盒子函数
 *
 * 计算点到盒子边界的有符号距离，用于投影光的边界检测。
 * 这是一个标准的SDF（Signed Distance Field）函数。
 *
 * @param {Node} p - 查询点的坐标
 * @param {Node} b - 盒子的半尺寸
 * @returns {Node} 到盒子边界的有符号距离
 */
const sdBox = /*@__PURE__*/ Fn(([p, b]) => {
  // 计算点到盒子各轴的距离
  const d = p.abs().sub(b);

  // 返回有符号距离：外部为正值，内部为负值
  // length(max(d, 0)) 计算外部距离
  // min(max(d.x, d.y), 0) 计算内部距离
  return length(max(d, 0.0)).add(min(max(d.x, d.y), 0.0));
});

/**
 * 投影光节点类
 *
 * 投影光节点的实现，基于聚光灯扩展而来。投影光可以将矩形光斑
 * 投射到场景中，常用于模拟投影仪、舞台灯光等效果。
 *
 * 投影光的特点：
 * - 矩形投影：投射矩形而非圆形的光斑
 * - 边界清晰：具有明确的投影边界
 * - 宽高比控制：支持不同的投影宽高比
 * - 距离衰减：支持基于距离的光照衰减
 *
 * 技术实现：
 * - 基于聚光灯：继承聚光灯的基础功能
 * - SDF边界检测：使用有符号距离场检测投影边界
 * - 投影变换：将世界坐标转换为投影坐标
 * - 平滑衰减：在投影边界处实现平滑过渡
 *
 * 应用场景：
 * - 建筑照明：建筑外立面的矩形投影
 * - 舞台灯光：剧院、演出中的方形光斑
 * - 室内设计：天花板投影、墙面装饰光
 * - 游戏场景：传送门、魔法阵等特效
 *
 * @augments SpotLightNode
 */
class ProjectorLightNode extends SpotLightNode {
  /**
   * 获取节点类型标识符
   *
   * @returns {string} 返回节点类型名称 'ProjectorLightNode'
   */
  static get type() {
    return "ProjectorLightNode";
  }

  /**
   * 更新投影光的参数
   *
   * 更新投影光的半影余弦值和宽高比设置。
   * 宽高比会影响投影的形状和阴影贴图的配置。
   *
   * @param {NodeFrame} frame - 当前节点帧的引用
   */
  update(frame) {
    // 调用父类的更新方法
    super.update(frame);

    // 获取光源引用
    const light = this.light;

    // 计算半影余弦值，用于控制投影边缘的柔和程度
    // penumbra控制边缘的柔和度，值越大边缘越柔和
    this.penumbraCosNode.value = Math.min(Math.cos(light.angle * (1 - light.penumbra)), 0.99999);

    // 处理投影的宽高比设置
    if (light.aspect === null) {
      // 如果没有明确设置宽高比，使用默认值1（正方形）
      let aspect = 1;

      // 如果有投影贴图，使用贴图的宽高比
      if (light.map !== null) {
        aspect = light.map.width / light.map.height;
      }

      // 设置阴影的宽高比
      light.shadow.aspect = aspect;
    } else {
      // 如果明确设置了宽高比，直接使用
      light.shadow.aspect = light.aspect;
    }
  }

  /**
   * 重写默认实现以计算投影衰减
   *
   * 计算投影光的衰减系数，基于片段在投影空间中的位置。
   * 使用有符号距离场来检测片段是否在投影范围内。
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @return {Node<float>} 投影光衰减系数
   */
  getSpotAttenuation(builder) {
    // 初始化衰减值为0（无光照）
    const attenuation = float(0);
    // 获取半影余弦值，用于边缘柔化计算
    const penumbraCos = this.penumbraCosNode;

    // 计算片段在光源裁剪空间中的位置
    // 使用光源的阴影矩阵将世界坐标转换为光源的投影坐标
    const spotLightCoord = lightShadowMatrix(this.light).mul(builder.context.positionWorld || positionWorld);

    // w分量的符号决定当前片段是在光源前方还是后方
    // 为了避免背面投影，只有当w为正值时才计算衰减
    If(spotLightCoord.w.greaterThan(0), () => {
      // 执行透视除法，得到标准化的投影UV坐标
      const projectionUV = spotLightCoord.xyz.div(spotLightCoord.w);

      // 使用SDF盒子函数计算到投影边界的距离
      // 将UV坐标从[0,1]转换到[-0.5,0.5]，然后计算到边界的距离
      const boxDist = sdBox(projectionUV.xy.sub(vec2(0.5)), vec2(0.5));

      // 计算角度因子，用于控制边缘的柔和程度
      // 基于半影角度计算衰减的陡峭程度
      const angleFactor = div(-1.0, sub(1.0, acos(penumbraCos)).sub(1.0));

      // 计算最终的衰减值
      // boxDist * -2.0 * angleFactor 创建从边界向内的平滑衰减
      // saturate确保值在[0,1]范围内
      attenuation.assign(saturate(boxDist.mul(-2.0).mul(angleFactor)));
    });

    // 返回计算得到的衰减系数
    return attenuation;
  }
}

export default ProjectorLightNode;
