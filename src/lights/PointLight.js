// 导入光源基类
import { Light } from "./Light.js";
// 导入点光源阴影类
import { PointLightShadow } from "./PointLightShadow.js";

/**
 * 点光源类
 * 从单个点向所有方向发射光线的光源
 * 常见的用例是复制裸露灯泡发出的光线
 *
 * 这种光源可以投射阴影 - 详见{@link PointLightShadow}
 *
 * ```js
 * const light = new THREE.PointLight( 0xff0000, 1, 100 );
 * light.position.set( 50, 50, 50 );
 * scene.add( light );
 * ```
 *
 * @augments Light
 */
class PointLight extends Light {
  /**
   * 构造一个新的点光源
   *
   * @param {(number|Color|string)} [color=0xffffff] - 光源的颜色
   * @param {number} [intensity=1] - 光源的强度/亮度，以坎德拉(cd)为单位测量
   * @param {number} [distance=0] - 光源的最大照射距离，0表示无限制
   * @param {number} [decay=2] - 光源沿距离衰减的程度
   */
  constructor(color, intensity, distance = 0, decay = 2) {
    // 调用父类构造函数，传入颜色和强度参数
    super(color, intensity);

    /**
     * 用于类型检测的标志位
     * 可以通过此属性判断对象是否为点光源
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isPointLight = true;

    // 设置光源类型标识
    this.type = "PointLight";

    /**
     * 光源的最大照射距离
     * 当距离为零时，光线将根据平方反比定律衰减到无限距离
     * 当距离非零时，光线将根据平方反比定律衰减，直到接近距离截止点，
     * 然后快速平滑地衰减到0。本质上，截止点在物理上是不正确的
     *
     * @type {number}
     * @default 0
     */
    this.distance = distance;

    /**
     * 光源沿距离衰减的程度
     * 在物理正确渲染的上下文中，不应更改默认值
     *
     * @type {number}
     * @default 2
     */
    this.decay = decay;

    /**
     * 此属性保存光源的阴影配置
     * 包含阴影相机、阴影贴图等设置
     *
     * @type {PointLightShadow}
     */
    this.shadow = new PointLightShadow();
  }

  /**
   * 光源的功率
   * 功率是以流明(lm)为单位测量的光源光通量
   * 改变功率也会改变光源的强度
   *
   * @type {number}
   */
  get power() {
    // 从强度(以坎德拉为单位)计算光源的光通量(以流明为单位)
    // 对于各向同性光源，光通量(lm) = 4π × 光强度(cd)
    return this.intensity * 4 * Math.PI;
  }

  set power(power) {
    // 从所需的光通量(以流明为单位)设置光源的强度(以坎德拉为单位)
    this.intensity = power / (4 * Math.PI);
  }

  /**
   * 释放光源占用的资源
   * 主要是释放阴影相关的资源
   */
  dispose() {
    // 释放阴影资源
    this.shadow.dispose();
  }

  /**
   * 复制另一个点光源的属性到当前对象
   *
   * @param {PointLight} source - 要复制的源对象
   * @param {boolean} recursive - 是否递归复制子对象
   * @returns {PointLight} 返回当前对象以支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的复制方法
    super.copy(source, recursive);

    // 复制距离属性
    this.distance = source.distance;
    // 复制衰减属性
    this.decay = source.decay;

    // 克隆阴影配置
    this.shadow = source.shadow.clone();

    // 返回当前对象以支持链式调用
    return this;
  }
}

// 导出点光源类
export { PointLight };
