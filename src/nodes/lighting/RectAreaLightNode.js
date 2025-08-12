// 导入解析光源节点基类
import AnalyticLightNode from "./AnalyticLightNode.js";
// 导入纹理访问器
import { texture } from "../accessors/TextureNode.js";
// 导入统一变量节点
import { uniform } from "../core/UniformNode.js";
// 导入光源视图位置访问器
import { lightViewPosition } from "../accessors/Lights.js";
// 导入渲染组
import { renderGroup } from "../core/UniformGroupNode.js";

// 导入数学库
import { Matrix4 } from "../../math/Matrix4.js";
import { Vector3 } from "../../math/Vector3.js";
// 导入节点更新类型常量
import { NodeUpdateType } from "../core/constants.js";

// 用于矩阵计算的临时变量
const _matrix41 = /*@__PURE__*/ new Matrix4();
const _matrix42 = /*@__PURE__*/ new Matrix4();

// LTC（线性变换余弦）库的引用，用于矩形区域光源的BRDF近似
let _ltcLib = null;

/**
 * 用于将矩形区域光源表示为节点的模块。
 *
 * @augments AnalyticLightNode
 */
class RectAreaLightNode extends AnalyticLightNode {
  // 返回节点类型标识符
  static get type() {
    return "RectAreaLightNode";
  }

  /**
   * 构造一个新的矩形区域光源节点。
   *
   * @param {?Object} [light=null] - 矩形区域光源对象
   */
  constructor(light = null) {
    // 调用父类构造函数
    super(light);

    /**
     * 表示区域光源半高度的统一变量节点。
     *
     * @type {UniformNode<vec3>}
     */
    this.halfHeight = uniform(new Vector3()).setGroup(renderGroup);

    /**
     * 表示区域光源半宽度的统一变量节点。
     *
     * @type {UniformNode<vec3>}
     */
    this.halfWidth = uniform(new Vector3()).setGroup(renderGroup);

    /**
     * 更新类型设置为 `NodeUpdateType.RENDER`，因为光源
     * 依赖于可能在每次渲染调用中变化的 `viewMatrix`。
     *
     * @type {string}
     * @default 'render'
     */
    this.updateType = NodeUpdateType.RENDER;
  }

  /**
   * 重写以更新矩形区域光源特定的统一变量。
   *
   * @param {NodeFrame} frame - 当前节点帧的引用
   */
  update(frame) {
    // 调用父类的更新方法
    super.update(frame);

    // 获取光源对象
    const { light } = this;

    // 获取视图矩阵（相机的逆世界矩阵）
    const viewMatrix = frame.camera.matrixWorldInverse;

    // 重置旋转矩阵
    _matrix42.identity();
    // 复制光源的世界矩阵
    _matrix41.copy(light.matrixWorld);
    // 将光源矩阵转换到视图空间
    _matrix41.premultiply(viewMatrix);
    // 提取旋转部分
    _matrix42.extractRotation(_matrix41);

    // 设置半宽度向量（X轴方向）
    this.halfWidth.value.set(light.width * 0.5, 0.0, 0.0);
    // 设置半高度向量（Y轴方向）
    this.halfHeight.value.set(0.0, light.height * 0.5, 0.0);

    // 将半宽度和半高度向量转换到视图空间
    this.halfWidth.value.applyMatrix4(_matrix42);
    this.halfHeight.value.applyMatrix4(_matrix42);
  }

  /**
   * 设置直接矩形区域光照计算。
   *
   * @param {NodeBuilder} builder - 节点构建器
   * @return {Object} 包含光照计算所需参数的对象
   */
  setupDirectRectArea(builder) {
    // 声明LTC纹理变量
    let ltc_1, ltc_2;

    // 根据是否支持32位浮点纹理过滤选择合适的LTC纹理
    if (builder.isAvailable("float32Filterable")) {
      // 使用32位浮点LTC纹理
      ltc_1 = texture(_ltcLib.LTC_FLOAT_1);
      ltc_2 = texture(_ltcLib.LTC_FLOAT_2);
    } else {
      // 使用16位半精度LTC纹理
      ltc_1 = texture(_ltcLib.LTC_HALF_1);
      ltc_2 = texture(_ltcLib.LTC_HALF_2);
    }

    // 解构获取颜色节点和光源对象
    const { colorNode, light } = this;

    // 获取光源在视图空间中的位置
    const lightPosition = lightViewPosition(light);

    // 返回矩形区域光照计算所需的所有参数
    return {
      lightColor: colorNode, // 光源颜色
      lightPosition, // 光源位置
      halfWidth: this.halfWidth, // 半宽度
      halfHeight: this.halfHeight, // 半高度
      ltc_1, // LTC纹理1（用于漫反射）
      ltc_2, // LTC纹理2（用于镜面反射）
    };
  }

  /**
   * 用于配置内部BRDF近似纹理数据。
   *
   * @param {Object} ltc - BRDF近似纹理数据库
   */
  static setLTC(ltc) {
    // 设置全局LTC库引用
    _ltcLib = ltc;
  }
}

// 导出矩形区域光源节点类作为默认导出
export default RectAreaLightNode;
