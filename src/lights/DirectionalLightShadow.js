// 导入光源阴影基类
import { LightShadow } from "./LightShadow.js";
// 导入正交相机类，用于阴影投射
import { OrthographicCamera } from "../cameras/OrthographicCamera.js";

/**
 * 表示平行光的阴影配置
 * 平行光阴影使用正交相机来生成阴影贴图
 *
 * @augments LightShadow
 */
class DirectionalLightShadow extends LightShadow {
  /**
   * 构造一个新的平行光阴影对象
   * 使用正交相机来模拟平行光的无限远特性
   */
  constructor() {
    // 调用父类构造函数，传入正交相机参数
    // 参数：左边界(-5), 右边界(5), 上边界(5), 下边界(-5), 近裁剪面(0.5), 远裁剪面(500)
    super(new OrthographicCamera(-5, 5, 5, -5, 0.5, 500));

    /**
     * 用于类型检测的标志位
     * 可以通过此属性判断对象是否为平行光阴影
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isDirectionalLightShadow = true;
  }
}

// 导出平行光阴影类
export { DirectionalLightShadow };
