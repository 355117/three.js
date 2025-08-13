// 导入聚光灯基类
import { SpotLight } from "../SpotLight.js";

/**
 * 投影光源类
 * 这是{@link SpotLight}的投影版本，只能与{@link WebGPURenderer}一起使用
 * 投影光源可以将纹理图像投射到场景中的物体上
 *
 * @augments SpotLight
 */
class ProjectorLight extends SpotLight {
  /**
   * 构造一个新的投影光源
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
     * 光源的宽高比
     * 设置为null时将使用纹理的宽高比
     *
     * @type {number}
     * @default null
     */
    this.aspect = null;
  }

  /**
   * 复制另一个投影光源的属性到当前对象
   *
   * @param {ProjectorLight} source - 要复制的源对象
   * @param {boolean} recursive - 是否递归复制子对象
   * @returns {ProjectorLight} 返回当前对象以支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的复制方法
    super.copy(source, recursive);

    // 复制宽高比属性
    this.aspect = source.aspect;

    // 返回当前对象以支持链式调用
    return this;
  }
}

// 导出投影光源类（使用默认导出）
export default ProjectorLight;
