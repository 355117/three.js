// 导入光源基类
import { Light } from "./Light.js";

/**
 * 环境光源类
 * 这种光源会均匀地照亮场景中的所有物体，没有方向性
 *
 * 环境光不能用来投射阴影，因为它没有方向
 *
 * ```js
 * const light = new THREE.AmbientLight( 0x404040 ); // 柔和的白光
 * scene.add( light );
 * ```
 *
 * @augments Light
 */
class AmbientLight extends Light {
  /**
   * 构造一个新的环境光源
   *
   * @param {(number|Color|string)} [color=0xffffff] - 光源的颜色
   * @param {number} [intensity=1] - 光源的强度/亮度
   */
  constructor(color, intensity) {
    // 调用父类构造函数，传入颜色和强度参数
    super(color, intensity);

    /**
     * 用于类型检测的标志位
     * 可以通过此属性判断对象是否为环境光源
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isAmbientLight = true;

    // 设置光源类型标识
    this.type = "AmbientLight";
  }
}

// 导出环境光源类
export { AmbientLight };
