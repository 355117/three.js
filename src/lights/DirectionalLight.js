// 导入光源基类
import { Light } from "./Light.js";
// 导入平行光阴影类
import { DirectionalLightShadow } from "./DirectionalLightShadow.js";
// 导入3D对象基类
import { Object3D } from "../core/Object3D.js";

/**
 * 平行光源类
 * 发射特定方向光线的光源，表现为无限远的光源，所有光线都是平行的
 * 常用于模拟日光；太阳距离足够远，可以认为其位置是无限的，
 * 从太阳发出的所有光线都是平行的
 *
 * 平行光的一个常见困惑点是设置旋转没有效果。这是因为three.js的平行光
 * 相当于其他应用程序中常说的"目标定向光"。
 *
 * 这意味着它的方向是从光源的{@link Object3D#position}指向
 * {@link DirectionalLight#target}位置来计算的
 * （而不是只有旋转组件的"自由定向光"）。
 *
 * 这种光源可以投射阴影 - 详见{@link DirectionalLightShadow}。
 *
 * ```js
 * // 从顶部照射的半强度白色平行光
 * const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
 * scene.add( directionalLight );
 * ```
 *
 * @augments Light
 */
class DirectionalLight extends Light {
  /**
   * 构造一个新的平行光源
   *
   * @param {(number|Color|string)} [color=0xffffff] - 光源的颜色
   * @param {number} [intensity=1] - 光源的强度/亮度
   */
  constructor(color, intensity) {
    // 调用父类构造函数，传入颜色和强度参数
    super(color, intensity);

    /**
     * 用于类型检测的标志位
     * 可以通过此属性判断对象是否为平行光源
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isDirectionalLight = true;

    // 设置光源类型标识
    this.type = "DirectionalLight";

    // 将光源位置设置为默认向上方向（0, 1, 0）
    this.position.copy(Object3D.DEFAULT_UP);
    // 更新变换矩阵
    this.updateMatrix();

    /**
     * 平行光从其位置指向目标位置
     *
     * 要将目标位置更改为默认值以外的任何值，
     * 必须将其添加到场景中。
     *
     * 也可以将目标设置为场景中的另一个3D对象。
     * 光源现在将跟踪目标对象。
     *
     * @type {Object3D}
     */
    this.target = new Object3D();

    /**
     * 此属性保存光源的阴影配置
     * 包含阴影相机、阴影贴图等设置
     *
     * @type {DirectionalLightShadow}
     */
    this.shadow = new DirectionalLightShadow();
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
   * 复制另一个平行光源的属性到当前对象
   *
   * @param {DirectionalLight} source - 要复制的源对象
   * @returns {DirectionalLight} 返回当前对象以支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 克隆目标对象
    this.target = source.target.clone();
    // 克隆阴影配置
    this.shadow = source.shadow.clone();

    // 返回当前对象以支持链式调用
    return this;
  }
}

// 导出平行光源类
export { DirectionalLight };
