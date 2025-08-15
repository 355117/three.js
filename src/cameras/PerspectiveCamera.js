// 导入相机基类
import { Camera } from "./Camera.js";
// 导入数学工具函数
import { RAD2DEG, DEG2RAD } from "../math/MathUtils.js";
// 导入2D向量类
import { Vector2 } from "../math/Vector2.js";
// 导入3D向量类
import { Vector3 } from "../math/Vector3.js";

// 用于计算的临时3D向量
const _v3 = /*@__PURE__*/ new Vector3();
// 用于计算视图边界的最小目标向量
const _minTarget = /*@__PURE__*/ new Vector2();
// 用于计算视图边界的最大目标向量
const _maxTarget = /*@__PURE__*/ new Vector2();

/**
 * 使用透视投影的相机类
 *
 * 这种投影模式旨在模拟人眼看到的方式。它是用于渲染3D场景的最常见投影模式。
 *
 * 透视投影的特点：
 * - 具有透视效果，远处物体看起来更小
 * - 平行线会在远处汇聚
 * - 最接近人眼视觉效果
 * - 适用于大多数3D场景渲染
 *
 * 使用示例：
 * ```js
 * const camera = new THREE.PerspectiveCamera( 45, width / height, 1, 1000 );
 * scene.add( camera );
 * ```
 *
 * @augments Camera
 */
class PerspectiveCamera extends Camera {
  /**
   * 构造一个新的透视相机
   *
   * @param {number} [fov=50] - 垂直视野角度（度）
   * @param {number} [aspect=1] - 宽高比
   * @param {number} [near=0.1] - 相机的近平面
   * @param {number} [far=2000] - 相机的远平面
   */
  constructor(fov = 50, aspect = 1, near = 0.1, far = 2000) {
    // 调用父类Camera的构造函数
    super();

    /**
     * 此标志可用于类型测试，标识这是一个透视相机实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isPerspectiveCamera = true;

    // 设置对象类型为'PerspectiveCamera'
    this.type = "PerspectiveCamera";

    /**
     * 垂直视野角度，从视图底部到顶部，以度为单位
     * 控制相机的视野范围，值越大视野越宽
     *
     * @type {number}
     * @default 50
     */
    this.fov = fov;

    /**
     * 相机的缩放因子
     * 值越大，场景显示越大；值越小，场景显示越小
     *
     * @type {number}
     * @default 1
     */
    this.zoom = 1;

    /**
     * 相机的近平面。有效范围大于0且小于far的当前值
     *
     * 注意：与正交相机不同，0对于透视相机的近平面不是有效值
     *
     * @type {number}
     * @default 0.1
     */
    this.near = near;

    /**
     * 相机的远平面。必须大于near的当前值
     * 定义了相机能看到的最远距离
     *
     * @type {number}
     * @default 2000
     */
    this.far = far;

    /**
     * 用于立体视觉和景深效果的对象距离
     * 除非使用StereoCamera，否则此参数不会影响投影矩阵
     *
     * @type {number}
     * @default 10
     */
    this.focus = 10;

    /**
     * 宽高比，通常是画布宽度/画布高度
     * 影响图像的拉伸比例
     *
     * @type {number}
     * @default 1
     */
    this.aspect = aspect;

    /**
     * 表示视锥体窗口规范。此属性不应直接编辑，
     * 而应通过setViewOffset和clearViewOffset方法进行修改
     *
     * @type {?Object}
     * @default null
     */
    this.view = null;

    /**
     * 用于较大轴的胶片尺寸。默认为35（毫米）
     * 除非filmOffset设置为非零值，否则此参数不会影响投影矩阵
     *
     * @type {number}
     * @default 35
     */
    this.filmGauge = 35;

    /**
     * 与filmGauge相同单位的水平偏心偏移
     * 用于模拟相机镜头的偏移效果
     *
     * @type {number}
     * @default 0
     */
    this.filmOffset = 0;

    // 更新投影矩阵以应用新的参数
    this.updateProjectionMatrix();
  }

  /**
   * 从源相机复制属性到当前相机
   *
   * @param {PerspectiveCamera} source - 源透视相机对象
   * @param {boolean} recursive - 是否递归复制子对象
   * @return {PerspectiveCamera} 返回当前相机实例，支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的copy方法
    super.copy(source, recursive);

    // 复制视野角度和缩放因子
    this.fov = source.fov;
    this.zoom = source.zoom;

    // 复制近远平面和焦点距离
    this.near = source.near;
    this.far = source.far;
    this.focus = source.focus;

    // 复制宽高比和视图偏移设置
    this.aspect = source.aspect;
    this.view = source.view === null ? null : Object.assign({}, source.view);

    // 复制胶片相关参数
    this.filmGauge = source.filmGauge;
    this.filmOffset = source.filmOffset;

    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 根据当前的filmGauge通过焦距设置视野角度
   *
   * 默认胶片规格为35，因此可以为35mm（全画幅）相机指定焦距
   *
   * @param {number} focalLength - 焦距值，焦距和胶片规格必须使用相同的单位
   */
  setFocalLength(focalLength) {
    /** 参见 {@link http://www.bobatkins.com/photography/technical/field_of_view.html} */
    // 计算垂直范围斜率
    const vExtentSlope = (0.5 * this.getFilmHeight()) / focalLength;

    // 根据斜率计算视野角度并转换为度数
    this.fov = RAD2DEG * 2 * Math.atan(vExtentSlope);
    // 更新投影矩阵以应用新的视野角度
    this.updateProjectionMatrix();
  }

  /**
   * 根据当前的fov和filmGauge返回焦距
   *
   * @return {number} 计算得出的焦距
   */
  getFocalLength() {
    // 根据视野角度计算垂直范围斜率
    const vExtentSlope = Math.tan(DEG2RAD * 0.5 * this.fov);

    // 根据斜率和胶片高度计算焦距
    return (0.5 * this.getFilmHeight()) / vExtentSlope;
  }

  /**
   * 返回考虑缩放因子的当前垂直视野角度（度）
   *
   * @return {number} 有效的视野角度
   */
  getEffectiveFOV() {
    // 计算考虑缩放因子后的有效视野角度
    return RAD2DEG * 2 * Math.atan(Math.tan(DEG2RAD * 0.5 * this.fov) / this.zoom);
  }

  /**
   * 返回胶片上图像的宽度
   * 如果宽高比大于或等于1（横向格式），结果等于filmGauge
   *
   * @return {number} 胶片宽度
   */
  getFilmWidth() {
    // 在竖向格式下胶片未完全覆盖（宽高比 < 1）
    return this.filmGauge * Math.min(this.aspect, 1);
  }

  /**
   * 返回胶片上图像的高度
   * 如果宽高比大于或等于1（横向格式），结果等于filmGauge除以宽高比
   *
   * @return {number} 胶片高度
   */
  getFilmHeight() {
    // 在横向格式下胶片未完全覆盖（宽高比 > 1）
    return this.filmGauge / Math.max(this.aspect, 1);
  }

  /**
   * 计算相机在给定距离处可视矩形的2D边界
   * 将minTarget和maxTarget设置为视图矩形左下角和右上角的坐标
   *
   * @param {number} distance - 观察距离
   * @param {Vector2} minTarget - 视图矩形的左下角坐标写入此向量
   * @param {Vector2} maxTarget - 视图矩形的右上角坐标写入此向量
   */
  getViewBounds(distance, minTarget, maxTarget) {
    // 设置标准化设备坐标的左下角点，并应用投影矩阵的逆变换
    _v3.set(-1, -1, 0.5).applyMatrix4(this.projectionMatrixInverse);

    // 计算最小边界点，根据距离进行缩放
    minTarget.set(_v3.x, _v3.y).multiplyScalar(-distance / _v3.z);

    // 设置标准化设备坐标的右上角点，并应用投影矩阵的逆变换
    _v3.set(1, 1, 0.5).applyMatrix4(this.projectionMatrixInverse);

    // 计算最大边界点，根据距离进行缩放
    maxTarget.set(_v3.x, _v3.y).multiplyScalar(-distance / _v3.z);
  }

  /**
   * 计算相机在给定距离处可视矩形的宽度和高度
   *
   * @param {number} distance - 观察距离
   * @param {Vector2} target - 用于存储结果的目标向量，x为宽度，y为高度
   * @returns {Vector2} 视图尺寸
   */
  getViewSize(distance, target) {
    // 获取视图边界
    this.getViewBounds(distance, _minTarget, _maxTarget);

    // 计算尺寸（最大值减去最小值）
    return target.subVectors(_maxTarget, _minTarget);
  }

  /**
   * 在更大的视锥体中设置偏移。这对于多窗口或多显示器/多机器设置很有用
   *
   * 例如，如果您有3x2显示器，每个显示器是1920x1080，
   * 显示器按如下网格排列：
   *```
   *   +---+---+---+
   *   | A | B | C |
   *   +---+---+---+
   *   | D | E | F |
   *   +---+---+---+
   *```
   * 那么对于每个显示器，您可以这样调用：
   *```js
   * const w = 1920;
   * const h = 1080;
   * const fullWidth = w * 3;
   * const fullHeight = h * 2;
   *
   * // --A--
   * camera.setViewOffset( fullWidth, fullHeight, w * 0, h * 0, w, h );
   * // --B--
   * camera.setViewOffset( fullWidth, fullHeight, w * 1, h * 0, w, h );
   * // --C--
   * camera.setViewOffset( fullWidth, fullHeight, w * 2, h * 0, w, h );
   * // --D--
   * camera.setViewOffset( fullWidth, fullHeight, w * 0, h * 1, w, h );
   * // --E--
   * camera.setViewOffset( fullWidth, fullHeight, w * 1, h * 1, w, h );
   * // --F--
   * camera.setViewOffset( fullWidth, fullHeight, w * 2, h * 1, w, h );
   * ```
   *
   * 注意：显示器不必具有相同的尺寸或排列成网格
   *
   * @param {number} fullWidth - 多视图设置的完整宽度
   * @param {number} fullHeight - 多视图设置的完整高度
   * @param {number} x - 子相机的水平偏移
   * @param {number} y - 子相机的垂直偏移
   * @param {number} width - 子相机的宽度
   * @param {number} height - 子相机的高度
   */
  setViewOffset(fullWidth, fullHeight, x, y, width, height) {
    // 设置宽高比为完整视图的宽高比
    this.aspect = fullWidth / fullHeight;

    // 如果view对象不存在，创建默认的view对象
    if (this.view === null) {
      this.view = {
        enabled: true, // 启用视图偏移
        fullWidth: 1, // 完整宽度
        fullHeight: 1, // 完整高度
        offsetX: 0, // X轴偏移
        offsetY: 0, // Y轴偏移
        width: 1, // 子视图宽度
        height: 1, // 子视图高度
      };
    }

    // 启用视图偏移功能
    this.view.enabled = true;
    // 设置完整视图的尺寸
    this.view.fullWidth = fullWidth;
    this.view.fullHeight = fullHeight;
    // 设置子视图的偏移位置
    this.view.offsetX = x;
    this.view.offsetY = y;
    // 设置子视图的尺寸
    this.view.width = width;
    this.view.height = height;

    // 更新投影矩阵以应用新的视图偏移
    this.updateProjectionMatrix();
  }

  /**
   * 从投影矩阵中移除视图偏移
   * 禁用多视图渲染功能
   */
  clearViewOffset() {
    // 如果存在view对象，禁用视图偏移
    if (this.view !== null) {
      this.view.enabled = false;
    }

    // 更新投影矩阵以移除视图偏移效果
    this.updateProjectionMatrix();
  }

  /**
   * 更新相机的投影矩阵。在任何相机属性更改后都必须调用此方法
   *
   * 透视投影矩阵的计算过程：
   * 1. 根据视野角度和缩放因子计算视锥体尺寸
   * 2. 如果启用了视图偏移，应用偏移计算
   * 3. 如果有胶片偏移，应用偏移校正
   * 4. 生成透视投影矩阵
   */
  updateProjectionMatrix() {
    // 获取近平面距离
    const near = this.near;
    // 根据视野角度和缩放因子计算视锥体顶部
    let top = (near * Math.tan(DEG2RAD * 0.5 * this.fov)) / this.zoom;
    // 计算视锥体高度
    let height = 2 * top;
    // 根据宽高比计算视锥体宽度
    let width = this.aspect * height;
    // 计算视锥体左边界（居中）
    let left = -0.5 * width;
    // 获取视图对象引用
    const view = this.view;

    // 如果启用了视图偏移，应用偏移计算
    if (this.view !== null && this.view.enabled) {
      // 获取完整视图的尺寸
      const fullWidth = view.fullWidth,
        fullHeight = view.fullHeight;

      // 应用水平偏移
      left += (view.offsetX * width) / fullWidth;
      // 应用垂直偏移
      top -= (view.offsetY * height) / fullHeight;
      // 调整宽度比例
      width *= view.width / fullWidth;
      // 调整高度比例
      height *= view.height / fullHeight;
    }

    // 获取胶片偏移值
    const skew = this.filmOffset;
    // 如果有胶片偏移，应用偏移校正
    if (skew !== 0) left += (near * skew) / this.getFilmWidth();

    // 创建透视投影矩阵
    this.projectionMatrix.makePerspective(left, left + width, top, top - height, near, this.far, this.coordinateSystem, this.reversedDepth);

    // 计算投影矩阵的逆矩阵
    this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
  }

  /**
   * 将相机序列化为JSON格式
   *
   * @param {Object} meta - 序列化元数据
   * @return {Object} 序列化后的相机数据
   */
  toJSON(meta) {
    // 调用父类的toJSON方法获取基础数据
    const data = super.toJSON(meta);

    // 添加透视相机特有的属性
    data.object.fov = this.fov;
    data.object.zoom = this.zoom;

    data.object.near = this.near;
    data.object.far = this.far;
    data.object.focus = this.focus;

    data.object.aspect = this.aspect;

    // 如果存在视图偏移设置，也序列化它
    if (this.view !== null) data.object.view = Object.assign({}, this.view);

    // 序列化胶片相关参数
    data.object.filmGauge = this.filmGauge;
    data.object.filmOffset = this.filmOffset;

    // 返回完整的序列化数据
    return data;
  }
}

// 导出PerspectiveCamera类
export { PerspectiveCamera };
