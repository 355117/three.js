// 导入光源基类
import { Light } from "./Light.js";
// 导入聚光灯阴影类
import { SpotLightShadow } from "./SpotLightShadow.js";
// 导入3D对象基类
import { Object3D } from "../core/Object3D.js";

/**
 * 聚光灯类
 * 从单个点向一个方向发射光线，沿着一个锥形区域，
 * 距离光源越远锥形越大
 *
 * 这种光源可以投射阴影 - 详见{@link SpotLightShadow}
 *
 * ```js
 * // 从侧面照射的白色聚光灯，由纹理调制
 * const spotLight = new THREE.SpotLight( 0xffffff );
 * spotLight.position.set( 100, 1000, 100 );
 * spotLight.map = new THREE.TextureLoader().load( url );
 *
 * spotLight.castShadow = true;
 * spotLight.shadow.mapSize.width = 1024;
 * spotLight.shadow.mapSize.height = 1024;
 * spotLight.shadow.camera.near = 500;
 * spotLight.shadow.camera.far = 4000;
 * spotLight.shadow.camera.fov = 30;
 * ```
 *
 * @augments Light
 */
class SpotLight extends Light {
  /**
   * 构造一个新的聚光灯
   *
   * @param {(number|Color|string)} [color=0xffffff] - 光源的颜色
   * @param {number} [intensity=1] - 光源的强度/亮度，以坎德拉(cd)为单位测量
   * @param {number} [distance=0] - 光源的最大照射距离，0表示无限制
   * @param {number} [angle=Math.PI/3] - 光源从其方向发散的最大角度，上限为Math.PI/2
   * @param {number} [penumbra=0] - 聚光灯锥体中由于半影而衰减的百分比，取值范围[0,1]
   * @param {number} [decay=2] - 光源沿距离衰减的程度
   */
  constructor(color, intensity, distance = 0, angle = Math.PI / 3, penumbra = 0, decay = 2) {
    // 调用父类构造函数，传入颜色和强度参数
    super(color, intensity);

    /**
     * 用于类型检测的标志位
     * 可以通过此属性判断对象是否为聚光灯
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSpotLight = true;

    // 设置光源类型标识
    this.type = "SpotLight";

    // 将光源位置设置为默认向上方向（0, 1, 0）
    this.position.copy(Object3D.DEFAULT_UP);
    // 更新变换矩阵
    this.updateMatrix();

    /**
     * 聚光灯从其位置指向目标位置
     *
     * 要将目标位置更改为默认值以外的任何值，
     * 必须将其添加到场景中
     *
     * 也可以将目标设置为场景中的另一个3D对象
     * 光源现在将跟踪目标对象
     *
     * @type {Object3D}
     */
    this.target = new Object3D();

    /**
     * 光源的最大照射距离
     * 0表示无限制
     *
     * @type {number}
     * @default 0
     */
    this.distance = distance;

    /**
     * 光源从其方向发散的最大角度
     * 上限为Math.PI/2
     *
     * @type {number}
     * @default Math.PI/3
     */
    this.angle = angle;

    /**
     * 聚光灯锥体中由于半影而衰减的百分比
     * 取值范围[0,1]
     *
     * @type {number}
     * @default 0
     */
    this.penumbra = penumbra;

    /**
     * 光源沿距离衰减的程度
     * 在物理正确渲染的上下文中，不应更改默认值
     *
     * @type {number}
     * @default 2
     */
    this.decay = decay;

    /**
     * 用于调制光源颜色的纹理
     * 聚光灯颜色与此纹理的RGB值混合，比例对应其alpha值
     * 使用像素值(0, 0, 0, 1-cookie_value)重现类似cookie的遮罩效果
     *
     * *警告*：如果{@link Object3D#castShadow}设置为false，此属性将被禁用
     *
     * @type {?Texture}
     * @default null
     */
    this.map = null;

    /**
     * 此属性保存光源的阴影配置
     * 包含阴影相机、阴影贴图等设置
     *
     * @type {SpotLightShadow}
     */
    this.shadow = new SpotLightShadow();
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
    // 按照聚光灯的惯例，光通量(lm) = π × 光强度(cd)
    return this.intensity * Math.PI;
  }

  set power(power) {
    // 从所需的光通量(以流明为单位)设置光源的强度(以坎德拉为单位)
    this.intensity = power / Math.PI;
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
   * 复制另一个聚光灯的属性到当前对象
   *
   * @param {SpotLight} source - 要复制的源对象
   * @param {boolean} recursive - 是否递归复制子对象
   * @returns {SpotLight} 返回当前对象以支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的复制方法
    super.copy(source, recursive);

    // 复制距离属性
    this.distance = source.distance;
    // 复制角度属性
    this.angle = source.angle;
    // 复制半影属性
    this.penumbra = source.penumbra;
    // 复制衰减属性
    this.decay = source.decay;

    // 克隆目标对象
    this.target = source.target.clone();

    // 克隆阴影配置
    this.shadow = source.shadow.clone();

    // 返回当前对象以支持链式调用
    return this;
  }
}

// 导出聚光灯类
export { SpotLight };
