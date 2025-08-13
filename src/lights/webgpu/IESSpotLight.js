// 导入聚光灯基类
import { SpotLight } from "../SpotLight.js";

/**
 * IES聚光灯类
 * 这是{@link SpotLight}的IES版本，只能与{@link WebGPURenderer}一起使用
 * IES (Illuminating Engineering Society) 是照明工程学会制定的光度数据标准
 *
 * @augments SpotLight
 */
class IESSpotLight extends SpotLight {
  /**
   * 构造一个新的IES聚光灯
   *
   * @param {(number|Color|string)} [color=0xffffff] - 光源的颜色
   * @param {number} [intensity=1] - 光源的强度/亮度，以坎德拉(cd)为单位测量
   * @param {number} [distance=0] - 光源的最大照射距离，0表示无限制
   * @param {number} [angle=Math.PI/3] - 光源从其方向发散的最大角度，上限为Math.PI/2
   * @param {number} [penumbra=0] - 聚光灯锥体中由于半影而衰减的百分比，取值范围[0,1]
   * @param {number} [decay=2] - 光源沿距离衰减的程度
   */
  constructor(color, intensity, distance, angle, penumbra, decay) {
    // 调用父类构造函数，传入所有聚光灯参数
    super(color, intensity, distance, angle, penumbra, decay);

    /**
     * IES光度数据贴图
     * 用于存储IES格式的光度分布数据
     *
     * @type {?Texture}
     * @default null
     */
    this.iesMap = null;
  }

  /**
   * 复制另一个IES聚光灯的属性到当前对象
   *
   * @param {IESSpotLight} source - 要复制的源对象
   * @param {boolean} recursive - 是否递归复制子对象
   * @returns {IESSpotLight} 返回当前对象以支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的复制方法
    super.copy(source, recursive);

    // 复制IES贴图引用
    this.iesMap = source.iesMap;

    // 返回当前对象以支持链式调用
    return this;
  }
}

// 导出IES聚光灯类（使用默认导出）
export default IESSpotLight;
