// 导入光源阴影基类
import { LightShadow } from "./LightShadow.js";
// 导入弧度转角度的常量
import { RAD2DEG } from "../math/MathUtils.js";
// 导入透视相机类
import { PerspectiveCamera } from "../cameras/PerspectiveCamera.js";

/**
 * 表示聚光灯的阴影配置
 * 聚光灯阴影使用透视相机来生成阴影贴图
 *
 * @augments LightShadow
 */
class SpotLightShadow extends LightShadow {
  /**
   * 构造一个新的聚光灯阴影对象
   * 使用透视相机来模拟聚光灯的锥形投射特性
   */
  constructor() {
    // 调用父类构造函数，传入透视相机参数
    // 参数：视野角度(50°), 宽高比(1), 近裁剪面(0.5), 远裁剪面(500)
    super(new PerspectiveCamera(50, 1, 0.5, 500));

    /**
     * 用于类型检测的标志位
     * 可以通过此属性判断对象是否为聚光灯阴影
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSpotLightShadow = true;

    /**
     * 用于聚焦阴影相机的参数
     * 相机的视野角度设置为聚光灯视野角度的百分比，取值范围[0, 1]
     *
     * @type {number}
     * @default 1
     */
    this.focus = 1;

    /**
     * 纹理宽高比
     * 用于调整阴影贴图的宽高比例
     *
     * @type {number}
     * @default 1
     */
    this.aspect = 1;
  }

  /**
   * 更新相机和阴影的矩阵，由渲染器内部调用
   *
   * @param {Light} light - 要渲染阴影的光源
   */
  updateMatrices(light) {
    // 获取阴影相机引用
    const camera = this.camera;

    // 计算相机视野角度：弧度转角度 * 2 * 光源角度 * 聚焦参数
    const fov = RAD2DEG * 2 * light.angle * this.focus;
    // 计算宽高比：(贴图宽度 / 贴图高度) * 纹理宽高比
    const aspect = (this.mapSize.width / this.mapSize.height) * this.aspect;
    // 获取远裁剪面距离：光源距离或相机远裁剪面
    const far = light.distance || camera.far;

    // 如果相机参数发生变化，则更新相机
    if (fov !== camera.fov || aspect !== camera.aspect || far !== camera.far) {
      // 设置相机视野角度
      camera.fov = fov;
      // 设置相机宽高比
      camera.aspect = aspect;
      // 设置相机远裁剪面
      camera.far = far;
      // 更新投影矩阵
      camera.updateProjectionMatrix();
    }

    // 调用父类的矩阵更新方法
    super.updateMatrices(light);
  }

  /**
   * 复制另一个聚光灯阴影的属性到当前对象
   *
   * @param {SpotLightShadow} source - 要复制的源对象
   * @returns {SpotLightShadow} 返回当前对象以支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 复制聚焦参数
    this.focus = source.focus;

    // 返回当前对象以支持链式调用
    return this;
  }
}

// 导出聚光灯阴影类
export { SpotLightShadow };
