// 导入相机基类
import { Camera } from "./Camera.js";

/**
 * 使用正交投影的相机类
 *
 * 在这种投影模式下，对象在渲染图像中的大小保持恒定，
 * 无论其与相机的距离如何。这对于渲染2D场景和UI元素等非常有用。
 *
 * 正交投影的特点：
 * - 没有透视效果，远近物体大小相同
 * - 平行线保持平行
 * - 适用于建筑图纸、工程图、2D游戏等
 *
 * 使用示例：
 * ```js
 * const camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, 1, 1000 );
 * scene.add( camera );
 * ```
 *
 * @augments Camera
 */
class OrthographicCamera extends Camera {
  /**
   * 构造一个新的正交相机
   *
   * @param {number} [left=-1] - 相机视锥体的左平面
   * @param {number} [right=1] - 相机视锥体的右平面
   * @param {number} [top=1] - 相机视锥体的上平面
   * @param {number} [bottom=-1] - 相机视锥体的下平面
   * @param {number} [near=0.1] - 相机的近平面
   * @param {number} [far=2000] - 相机的远平面
   */
  constructor(left = -1, right = 1, top = 1, bottom = -1, near = 0.1, far = 2000) {
    // 调用父类Camera的构造函数
    super();

    /**
     * 此标志可用于类型测试，标识这是一个正交相机实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isOrthographicCamera = true;

    // 设置对象类型为'OrthographicCamera'
    this.type = "OrthographicCamera";

    /**
     * 相机的缩放因子
     * 值越大，场景显示越小；值越小，场景显示越大
     *
     * @type {number}
     * @default 1
     */
    this.zoom = 1;

    /**
     * 表示视锥体窗口规范。此属性不应直接编辑，
     * 而应通过setViewOffset和clearViewOffset方法进行修改
     *
     * @type {?Object}
     * @default null
     */
    this.view = null;

    /**
     * 相机视锥体的左平面
     * 定义了可见区域的左边界
     *
     * @type {number}
     * @default -1
     */
    this.left = left;

    /**
     * 相机视锥体的右平面
     * 定义了可见区域的右边界
     *
     * @type {number}
     * @default 1
     */
    this.right = right;

    /**
     * 相机视锥体的上平面
     * 定义了可见区域的上边界
     *
     * @type {number}
     * @default 1
     */
    this.top = top;

    /**
     * 相机视锥体的下平面
     * 定义了可见区域的下边界
     *
     * @type {number}
     * @default -1
     */
    this.bottom = bottom;

    /**
     * 相机的近平面。有效范围大于0且小于far的当前值
     *
     * 注意：与透视相机不同，对于正交相机，0是近平面的有效值
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

    // 更新投影矩阵以应用新的参数
    this.updateProjectionMatrix();
  }

  /**
   * 从源相机复制属性到当前相机
   *
   * @param {OrthographicCamera} source - 源正交相机对象
   * @param {boolean} recursive - 是否递归复制子对象
   * @return {OrthographicCamera} 返回当前相机实例，支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的copy方法
    super.copy(source, recursive);

    // 复制视锥体边界参数
    this.left = source.left;
    this.right = source.right;
    this.top = source.top;
    this.bottom = source.bottom;
    this.near = source.near;
    this.far = source.far;

    // 复制缩放因子
    this.zoom = source.zoom;
    // 复制视图偏移设置（深拷贝）
    this.view = source.view === null ? null : Object.assign({}, source.view);

    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 在更大的视锥体中设置偏移。这对于多窗口或多显示器/多机器设置很有用
   *
   * @param {number} fullWidth - 多视图设置的完整宽度
   * @param {number} fullHeight - 多视图设置的完整高度
   * @param {number} x - 子相机的水平偏移
   * @param {number} y - 子相机的垂直偏移
   * @param {number} width - 子相机的宽度
   * @param {number} height - 子相机的高度
   * @see {@link PerspectiveCamera#setViewOffset}
   */
  setViewOffset(fullWidth, fullHeight, x, y, width, height) {
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
   * 正交投影矩阵的计算过程：
   * 1. 根据缩放因子调整视锥体尺寸
   * 2. 计算视锥体中心点
   * 3. 如果启用了视图偏移，应用偏移计算
   * 4. 生成正交投影矩阵
   */
  updateProjectionMatrix() {
    // 计算考虑缩放因子后的半宽和半高
    const dx = (this.right - this.left) / (2 * this.zoom);
    const dy = (this.top - this.bottom) / (2 * this.zoom);
    // 计算视锥体的中心点
    const cx = (this.right + this.left) / 2;
    const cy = (this.top + this.bottom) / 2;

    // 计算实际的视锥体边界
    let left = cx - dx;
    let right = cx + dx;
    let top = cy + dy;
    let bottom = cy - dy;

    // 如果启用了视图偏移，应用偏移计算
    if (this.view !== null && this.view.enabled) {
      // 计算宽度和高度的缩放因子
      const scaleW = (this.right - this.left) / this.view.fullWidth / this.zoom;
      const scaleH = (this.top - this.bottom) / this.view.fullHeight / this.zoom;

      // 应用偏移和子视图尺寸
      left += scaleW * this.view.offsetX;
      right = left + scaleW * this.view.width;
      top -= scaleH * this.view.offsetY;
      bottom = top - scaleH * this.view.height;
    }

    // 创建正交投影矩阵
    this.projectionMatrix.makeOrthographic(left, right, top, bottom, this.near, this.far, this.coordinateSystem, this.reversedDepth);

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

    // 添加正交相机特有的属性
    data.object.zoom = this.zoom;
    data.object.left = this.left;
    data.object.right = this.right;
    data.object.top = this.top;
    data.object.bottom = this.bottom;
    data.object.near = this.near;
    data.object.far = this.far;

    // 如果存在视图偏移设置，也序列化它
    if (this.view !== null) data.object.view = Object.assign({}, this.view);

    // 返回完整的序列化数据
    return data;
  }
}

// 导出OrthographicCamera类
export { OrthographicCamera };
