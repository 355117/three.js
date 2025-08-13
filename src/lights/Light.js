// 导入3D对象基类
import { Object3D } from "../core/Object3D.js";
// 导入颜色类
import { Color } from "../math/Color.js";

/**
 * 光源抽象基类
 * 所有其他光源类型都继承此处描述的属性和方法
 * 这是所有光源的基础类，定义了光源的通用属性和行为
 *
 * @abstract
 * @augments Object3D
 */
class Light extends Object3D {
  /**
   * 构造一个新的光源
   *
   * @param {(number|Color|string)} [color=0xffffff] - 光源的颜色
   * @param {number} [intensity=1] - 光源的强度/亮度
   */
  constructor(color, intensity = 1) {
    // 调用父类构造函数
    super();

    /**
     * 用于类型检测的标志位
     * 可以通过此属性判断对象是否为光源
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isLight = true;

    // 设置光源类型标识
    this.type = "Light";

    /**
     * 光源的颜色
     * 决定光源发出的光的颜色
     *
     * @type {Color}
     */
    this.color = new Color(color);

    /**
     * 光源的强度
     * 控制光源的亮度程度
     *
     * @type {number}
     * @default 1
     */
    this.intensity = intensity;
  }

  /**
   * 释放此实例分配的GPU相关资源
   * 当此实例在应用程序中不再使用时调用此方法
   */
  dispose() {
    // 在基类中为空；某些子类会重写此方法
  }

  /**
   * 复制另一个光源的属性到当前对象
   *
   * @param {Light} source - 要复制的源光源对象
   * @param {boolean} recursive - 是否递归复制子对象
   * @returns {Light} 返回当前对象以支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的复制方法
    super.copy(source, recursive);

    // 复制光源颜色
    this.color.copy(source.color);
    // 复制光源强度
    this.intensity = source.intensity;

    // 返回当前对象以支持链式调用
    return this;
  }

  /**
   * 将光源序列化为JSON格式
   *
   * @param {Object} meta - 元数据对象
   * @returns {Object} 包含序列化数据的对象
   */
  toJSON(meta) {
    // 调用父类的序列化方法
    const data = super.toJSON(meta);

    // 将颜色转换为十六进制值并添加到序列化数据
    data.object.color = this.color.getHex();
    // 添加强度到序列化数据
    data.object.intensity = this.intensity;

    // 如果存在地面颜色属性，则添加到序列化数据（用于半球光）
    if (this.groundColor !== undefined) data.object.groundColor = this.groundColor.getHex();

    // 如果存在距离属性，则添加到序列化数据（用于点光源和聚光灯）
    if (this.distance !== undefined) data.object.distance = this.distance;
    // 如果存在角度属性，则添加到序列化数据（用于聚光灯）
    if (this.angle !== undefined) data.object.angle = this.angle;
    // 如果存在衰减属性，则添加到序列化数据（用于点光源和聚光灯）
    if (this.decay !== undefined) data.object.decay = this.decay;
    // 如果存在半影属性，则添加到序列化数据（用于聚光灯）
    if (this.penumbra !== undefined) data.object.penumbra = this.penumbra;

    // 如果存在阴影属性，则序列化阴影配置
    if (this.shadow !== undefined) data.object.shadow = this.shadow.toJSON();
    // 如果存在目标属性，则添加目标的UUID（用于平行光和聚光灯）
    if (this.target !== undefined) data.object.target = this.target.uuid;

    // 返回序列化数据
    return data;
  }
}

// 导出光源基类
export { Light };
