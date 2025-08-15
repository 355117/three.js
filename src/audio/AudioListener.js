// 从数学模块导入Vector3类
import { Vector3 } from "../math/Vector3.js";
// 从数学模块导入Quaternion类
import { Quaternion } from "../math/Quaternion.js";
// 从核心模块导入Clock类
import { Clock } from "../core/Clock.js";
// 从核心模块导入Object3D基类
import { Object3D } from "../core/Object3D.js";
// 从音频模块导入AudioContext类
import { AudioContext } from "./AudioContext.js";

// 用于存储位置信息的向量
const _position = /*@__PURE__*/ new Vector3();
// 用于存储四元数信息的四元数
const _quaternion = /*@__PURE__*/ new Quaternion();
// 用于存储缩放信息的向量
const _scale = /*@__PURE__*/ new Vector3();

// 用于存储前向方向的向量
const _forward = /*@__PURE__*/ new Vector3();
// 用于存储上方向的向量
const _up = /*@__PURE__*/ new Vector3();

/**
 * 此类表示场景中所有位置性和非位置性音频效果的虚拟监听器。
 * Three.js应用程序通常创建一个监听器。它是音频实体（如 {@link Audio} 和 {@link PositionalAudio}）
 * 的必需构造函数参数。
 *
 * 在大多数情况下，监听器对象是相机的子对象。因此相机的3D变换
 * 代表监听器的3D变换。
 *
 * @augments Object3D
 */
class AudioListener extends Object3D {
  /**
   * 构造一个新的音频监听器。
   */
  constructor() {
    // 调用父类构造函数
    super();

    // 设置对象类型
    this.type = "AudioListener";

    /**
     * 原生音频上下文。
     *
     * @type {AudioContext}
     * @readonly
     */
    this.context = AudioContext.getContext();

    /**
     * 用于音量控制的增益节点。
     *
     * @type {GainNode}
     * @readonly
     */
    this.gain = this.context.createGain(); // 创建增益节点
    this.gain.connect(this.context.destination); // 连接到音频上下文的目标

    /**
     * 可选的滤波器。
     *
     * 通过 {@link AudioListener#setFilter} 定义。
     *
     * @type {?AudioNode}
     * @default null
     * @readonly
     */
    this.filter = null;

    /**
     * `linearRampToValueAtTime()` 使用所需的时间增量值。
     *
     * @type {number}
     * @default 0
     * @readonly
     */
    this.timeDelta = 0;

    // 私有属性

    // 用于计算时间增量的时钟
    this._clock = new Clock();
  }

  /**
   * 返回监听器的输入节点。
   *
   * 此方法被其他音频节点用来连接到此监听器。
   *
   * @return {GainNode} 输入节点。
   */
  getInput() {
    // 返回增益节点作为输入
    return this.gain;
  }

  /**
   * 从此监听器中移除当前滤波器。
   *
   * @return {AudioListener} 对此监听器的引用。
   */
  removeFilter() {
    // 如果存在滤波器
    if (this.filter !== null) {
      // 断开增益节点与滤波器的连接
      this.gain.disconnect(this.filter);
      // 断开滤波器与目标的连接
      this.filter.disconnect(this.context.destination);
      // 重新连接增益节点到目标
      this.gain.connect(this.context.destination);
      // 清空滤波器引用
      this.filter = null;
    }

    return this;
  }

  /**
   * 返回当前设置的滤波器。
   *
   * @return {?AudioNode} 滤波器。
   */
  getFilter() {
    // 返回当前滤波器
    return this.filter;
  }

  /**
   * 将给定的滤波器设置到此监听器。
   *
   * @param {AudioNode} value - 要设置的滤波器。
   * @return {AudioListener} 对此监听器的引用。
   */
  setFilter(value) {
    // 如果已存在滤波器
    if (this.filter !== null) {
      // 断开增益节点与当前滤波器的连接
      this.gain.disconnect(this.filter);
      // 断开当前滤波器与目标的连接
      this.filter.disconnect(this.context.destination);
    } else {
      // 如果没有滤波器，断开增益节点与目标的直接连接
      this.gain.disconnect(this.context.destination);
    }

    // 设置新的滤波器
    this.filter = value;
    // 连接增益节点到新滤波器
    this.gain.connect(this.filter);
    // 连接新滤波器到目标
    this.filter.connect(this.context.destination);

    return this;
  }

  /**
   * 返回应用程序的主音量。
   *
   * @return {number} 主音量。
   */
  getMasterVolume() {
    // 返回增益节点的音量值
    return this.gain.gain.value;
  }

  /**
   * 设置应用程序的主音量。此音量设置影响
   * 场景中的所有音频节点。
   *
   * @param {number} value - 要设置的主音量。
   * @return {AudioListener} 对此监听器的引用。
   */
  setMasterVolume(value) {
    // 在指定时间设置增益目标值
    this.gain.gain.setTargetAtTime(value, this.context.currentTime, 0.01);

    return this;
  }

  /**
   * 更新世界矩阵并同步音频监听器的位置和方向。
   *
   * @param {boolean} force - 是否强制更新。
   */
  updateMatrixWorld(force) {
    // 调用父类的updateMatrixWorld方法
    super.updateMatrixWorld(force);

    // 获取音频上下文的监听器
    const listener = this.context.listener;

    // 更新时间增量
    this.timeDelta = this._clock.getDelta();

    // 分解世界矩阵为位置、旋转和缩放
    this.matrixWorld.decompose(_position, _quaternion, _scale);

    // 初始的前向和上方向必须是正交的
    _forward.set(0, 0, -1).applyQuaternion(_quaternion); // 计算前向方向
    _up.set(0, 1, 0).applyQuaternion(_quaternion); // 计算上方向

    // 检查监听器是否支持分离的位置属性
    if (listener.positionX) {
      // Chrome浏览器的代码路径（参见 #14393）

      // 计算结束时间
      const endTime = this.context.currentTime + this.timeDelta;

      // 使用线性渐变设置位置
      listener.positionX.linearRampToValueAtTime(_position.x, endTime);
      listener.positionY.linearRampToValueAtTime(_position.y, endTime);
      listener.positionZ.linearRampToValueAtTime(_position.z, endTime);
      // 使用线性渐变设置前向方向
      listener.forwardX.linearRampToValueAtTime(_forward.x, endTime);
      listener.forwardY.linearRampToValueAtTime(_forward.y, endTime);
      listener.forwardZ.linearRampToValueAtTime(_forward.z, endTime);
      // 使用线性渐变设置上方向
      listener.upX.linearRampToValueAtTime(_up.x, endTime);
      listener.upY.linearRampToValueAtTime(_up.y, endTime);
      listener.upZ.linearRampToValueAtTime(_up.z, endTime);
    } else {
      // 旧版浏览器的代码路径
      // 直接设置位置
      listener.setPosition(_position.x, _position.y, _position.z);
      // 直接设置方向
      listener.setOrientation(_forward.x, _forward.y, _forward.z, _up.x, _up.y, _up.z);
    }
  }
}

// 导出AudioListener类
export { AudioListener };
