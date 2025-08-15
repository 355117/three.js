// 导入4x4矩阵类
import { Matrix4 } from "../math/Matrix4.js";
// 导入角度转弧度常量
import { DEG2RAD } from "../math/MathUtils.js";
// 导入透视相机类
import { PerspectiveCamera } from "./PerspectiveCamera.js";

// 右眼变换矩阵
const _eyeRight = /*@__PURE__*/ new Matrix4();
// 左眼变换矩阵
const _eyeLeft = /*@__PURE__*/ new Matrix4();
// 投影矩阵
const _projectionMatrix = /*@__PURE__*/ new Matrix4();

/**
 * 一种特殊类型的相机，使用两个透视相机进行立体投影。
 * 可用于渲染立体效果，如3D红蓝眼镜或视差屏障。
 *
 * 立体相机通过模拟人眼的双眼视差来创建3D效果：
 * - 左眼和右眼相机分别从略微不同的位置观察场景
 * - 两个视图的差异产生深度感知
 * - 适用于VR、3D显示器等应用
 */
class StereoCamera {
  /**
   * 构造一个新的立体相机
   */
  constructor() {
    /**
     * 类型属性，用于在序列化/反序列化上下文中检测对象类型
     *
     * @type {string}
     * @readonly
     */
    this.type = "StereoCamera";

    /**
     * 宽高比
     * 用于调整立体效果的比例
     *
     * @type {number}
     * @default 1
     */
    this.aspect = 1;

    /**
     * 眼间距，表示左右相机之间的距离
     * 模拟人眼的瞳距，影响立体效果的强度
     *
     * @type {number}
     * @default 0.064
     */
    this.eyeSep = 0.064;

    /**
     * 代表左眼的相机。添加到层级1，因此要被左眼相机渲染的对象
     * 也必须添加到此层级
     *
     * @type {PerspectiveCamera}
     */
    this.cameraL = new PerspectiveCamera();
    // 启用层级1，用于左眼渲染
    this.cameraL.layers.enable(1);
    // 禁用自动矩阵更新，手动控制
    this.cameraL.matrixAutoUpdate = false;

    /**
     * 代表右眼的相机。添加到层级2，因此要被右眼相机渲染的对象
     * 也必须添加到此层级
     *
     * @type {PerspectiveCamera}
     */
    this.cameraR = new PerspectiveCamera();
    // 启用层级2，用于右眼渲染
    this.cameraR.layers.enable(2);
    // 禁用自动矩阵更新，手动控制
    this.cameraR.matrixAutoUpdate = false;

    // 缓存对象，用于检测相机参数是否发生变化
    this._cache = {
      focus: null, // 焦点距离
      fov: null, // 视野角度
      aspect: null, // 宽高比
      near: null, // 近平面
      far: null, // 远平面
      zoom: null, // 缩放因子
      eyeSep: null, // 眼间距
    };
  }

  /**
   * 根据给定的透视相机更新立体相机
   * 计算左右眼相机的投影矩阵和世界矩阵
   *
   * @param {PerspectiveCamera} camera - 基础透视相机
   */
  update(camera) {
    // 获取缓存对象
    const cache = this._cache;

    // 检查是否需要更新（任何参数发生变化）
    const needsUpdate =
      cache.focus !== camera.focus ||
      cache.fov !== camera.fov ||
      cache.aspect !== camera.aspect * this.aspect ||
      cache.near !== camera.near ||
      cache.far !== camera.far ||
      cache.zoom !== camera.zoom ||
      cache.eyeSep !== this.eyeSep;

    // 如果需要更新，重新计算立体投影
    if (needsUpdate) {
      // 更新缓存值
      cache.focus = camera.focus;
      cache.fov = camera.fov;
      cache.aspect = camera.aspect * this.aspect;
      cache.near = camera.near;
      cache.far = camera.far;
      cache.zoom = camera.zoom;
      cache.eyeSep = this.eyeSep;

      // 基于离轴立体视觉效果的计算
      // 参考：http://paulbourke.net/stereographics/stereorender/

      // 复制基础相机的投影矩阵
      _projectionMatrix.copy(camera.projectionMatrix);
      // 计算眼间距的一半
      const eyeSepHalf = cache.eyeSep / 2;
      // 计算投影平面上的眼间距
      const eyeSepOnProjection = (eyeSepHalf * cache.near) / cache.focus;
      // 计算视锥体的最大Y值
      const ymax = (cache.near * Math.tan(DEG2RAD * cache.fov * 0.5)) / cache.zoom;
      let xmin, xmax;

      // 设置X轴偏移量

      // 左眼矩阵：向左偏移
      _eyeLeft.elements[12] = -eyeSepHalf;
      // 右眼矩阵：向右偏移
      _eyeRight.elements[12] = eyeSepHalf;

      // 计算左眼的投影矩阵

      // 计算左眼视锥体的X轴范围
      xmin = -ymax * cache.aspect + eyeSepOnProjection;
      xmax = ymax * cache.aspect + eyeSepOnProjection;

      // 设置投影矩阵的缩放和偏移参数
      _projectionMatrix.elements[0] = (2 * cache.near) / (xmax - xmin);
      _projectionMatrix.elements[8] = (xmax + xmin) / (xmax - xmin);

      // 应用到左眼相机
      this.cameraL.projectionMatrix.copy(_projectionMatrix);

      // 计算右眼的投影矩阵

      // 计算右眼视锥体的X轴范围
      xmin = -ymax * cache.aspect - eyeSepOnProjection;
      xmax = ymax * cache.aspect - eyeSepOnProjection;

      // 设置投影矩阵的缩放和偏移参数
      _projectionMatrix.elements[0] = (2 * cache.near) / (xmax - xmin);
      _projectionMatrix.elements[8] = (xmax + xmin) / (xmax - xmin);

      // 应用到右眼相机
      this.cameraR.projectionMatrix.copy(_projectionMatrix);
    }

    // 更新左右眼相机的世界矩阵
    // 左眼相机：基础相机矩阵乘以左眼偏移矩阵
    this.cameraL.matrixWorld.copy(camera.matrixWorld).multiply(_eyeLeft);
    // 右眼相机：基础相机矩阵乘以右眼偏移矩阵
    this.cameraR.matrixWorld.copy(camera.matrixWorld).multiply(_eyeRight);
  }
}

// 导出StereoCamera类
export { StereoCamera };
