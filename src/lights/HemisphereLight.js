// 导入光源基类
import { Light } from "./Light.js";
// 导入颜色类
import { Color } from "../math/Color.js";
// 导入3D对象基类
import { Object3D } from "../core/Object3D.js";

/**
 * 半球光源类
 * 位于场景正上方的光源，颜色从天空色渐变到地面色
 * 模拟天空光照效果，提供柔和的环境光照
 *
 * 这种光源不能用来投射阴影
 *
 * ```js
 * const light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
 * scene.add( light );
 * ```
 *
 * @augments Light
 */
class HemisphereLight extends Light {
  /**
   * 构造一个新的半球光源
   *
   * @param {(number|Color|string)} [skyColor=0xffffff] - 光源的天空颜色
   * @param {(number|Color|string)} [groundColor=0xffffff] - 光源的地面颜色
   * @param {number} [intensity=1] - 光源的强度/亮度
   */
  constructor(skyColor, groundColor, intensity) {
    // 调用父类构造函数，传入天空颜色和强度
    super(skyColor, intensity);

    /**
     * 用于类型检测的标志位
     * 可以通过此属性判断对象是否为半球光源
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isHemisphereLight = true;

    // 设置光源类型标识
    this.type = "HemisphereLight";

    // 将光源位置设置为默认向上方向（0, 1, 0）
    this.position.copy(Object3D.DEFAULT_UP);
    // 更新变换矩阵
    this.updateMatrix();

    /**
     * 光源的地面颜色
     * 用于模拟从地面反射的光照
     *
     * @type {Color}
     */
    this.groundColor = new Color(groundColor);
  }

  /**
   * 复制另一个半球光源的属性到当前对象
   *
   * @param {HemisphereLight} source - 要复制的源对象
   * @param {boolean} recursive - 是否递归复制子对象
   * @returns {HemisphereLight} 返回当前对象以支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的复制方法
    super.copy(source, recursive);

    // 复制地面颜色
    this.groundColor.copy(source.groundColor);

    // 返回当前对象以支持链式调用
    return this;
  }
}

// 导出半球光源类
export { HemisphereLight };
