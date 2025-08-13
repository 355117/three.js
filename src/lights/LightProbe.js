// 导入球面谐波类
import { SphericalHarmonics3 } from "../math/SphericalHarmonics3.js";
// 导入光源基类
import { Light } from "./Light.js";

/**
 * 光照探针类
 * 光照探针是向3D场景添加光照的另一种方式。与传统光源（如平行光、点光源或聚光灯）不同，
 * 光照探针不发射光线。相反，它们存储关于通过3D空间的光线信息。
 * 在渲染过程中，通过使用光照探针的数据来近似计算照射到3D对象上的光线。
 *
 * 光照探针通常从（辐射度）环境贴图创建。{@link LightProbeGenerator}类可用于
 * 从立方体纹理或渲染目标创建光照探针。然而，光照估计数据也可以通过其他形式提供，
 * 例如通过WebXR。这使得能够渲染对真实世界光照做出反应的增强现实内容。
 *
 * three.js中当前的探针实现支持所谓的漫反射光照探针。
 * 这种类型的光照探针在功能上等同于辐照度环境贴图。
 *
 * @augments Light
 */
class LightProbe extends Light {
  /**
   * 构造一个新的光照探针
   *
   * @param {SphericalHarmonics3} sh - 表示编码光照信息的球面谐波
   * @param {number} [intensity=1] - 光源的强度/亮度
   */
  constructor(sh = new SphericalHarmonics3(), intensity = 1) {
    // 调用父类构造函数，颜色参数为undefined，传入强度
    super(undefined, intensity);

    /**
     * 用于类型检测的标志位
     * 可以通过此属性判断对象是否为光照探针
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isLightProbe = true;

    /**
     * 光照探针使用球面谐波来编码光照信息
     * 球面谐波是一种数学工具，用于高效地表示球面上的函数
     *
     * @type {SphericalHarmonics3}
     */
    this.sh = sh;
  }

  /**
   * 复制另一个光照探针的属性到当前对象
   *
   * @param {LightProbe} source - 要复制的源对象
   * @returns {LightProbe} 返回当前对象以支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 复制球面谐波数据
    this.sh.copy(source.sh);

    // 返回当前对象以支持链式调用
    return this;
  }

  /**
   * 从给定的JSON反序列化光照探针
   *
   * @param {Object} json - 包含序列化光照探针的JSON对象
   * @return {LightProbe} 返回当前光照探针的引用
   */
  fromJSON(json) {
    // 设置光照强度 // TODO: 将此部分移动到 Light.fromJSON()
    this.intensity = json.intensity;
    // 从数组恢复球面谐波数据
    this.sh.fromArray(json.sh);

    // 返回当前对象
    return this;
  }

  /**
   * 将光照探针序列化为JSON格式
   *
   * @param {Object} meta - 元数据对象
   * @returns {Object} 包含序列化数据的对象
   */
  toJSON(meta) {
    // 调用父类的序列化方法
    const data = super.toJSON(meta);

    // 将球面谐波数据转换为数组并添加到序列化数据中
    data.object.sh = this.sh.toArray();

    // 返回序列化数据
    return data;
  }
}

// 导出光照探针类
export { LightProbe };
