// 从数学模块导入Vector3类
import { Vector3 } from "../math/Vector3.js";
// 从数学模块导入Quaternion类
import { Quaternion } from "../math/Quaternion.js";
// 从音频模块导入Audio基类
import { Audio } from "./Audio.js";

// 用于存储位置信息的向量
const _position = /*@__PURE__*/ new Vector3();
// 用于存储四元数信息的四元数
const _quaternion = /*@__PURE__*/ new Quaternion();
// 用于存储缩放信息的向量
const _scale = /*@__PURE__*/ new Vector3();
// 用于存储方向信息的向量
const _orientation = /*@__PURE__*/ new Vector3();

/**
 * 表示一个位置性音频对象。
 *
 * ```js
 * // 创建一个AudioListener并将其添加到相机
 * const listener = new THREE.AudioListener();
 * camera.add( listener );
 *
 * // 创建PositionalAudio对象（传入监听器）
 * const sound = new THREE.PositionalAudio( listener );
 *
 * // 加载声音并将其设置为PositionalAudio对象的缓冲区
 * const audioLoader = new THREE.AudioLoader();
 * audioLoader.load( 'sounds/song.ogg', function( buffer ) {
 * 	sound.setBuffer( buffer );
 * 	sound.setRefDistance( 20 );
 * 	sound.play();
 * });
 *
 * // 创建一个对象用于播放声音
 * const sphere = new THREE.SphereGeometry( 20, 32, 16 );
 * const material = new THREE.MeshPhongMaterial( { color: 0xff2200 } );
 * const mesh = new THREE.Mesh( sphere, material );
 * scene.add( mesh );
 *
 * // 最后将声音添加到网格
 * mesh.add( sound );
 *
 * @augments Audio
 */
class PositionalAudio extends Audio {
  /**
   * 构造一个位置性音频。
   *
   * @param {AudioListener} listener - 全局音频监听器。
   */
  constructor(listener) {
    // 调用父类构造函数
    super(listener);

    /**
     * 平移器节点表示音频源在3D空间中的位置、方向和行为。
     *
     * @type {PannerNode}
     * @readonly
     */
    this.panner = this.context.createPanner(); // 创建平移器节点
    this.panner.panningModel = "HRTF"; // 设置平移模型为HRTF（头部相关传递函数）
    this.panner.connect(this.gain); // 连接到增益节点
  }

  /**
   * 连接音频源。重写父类方法以包含平移器节点。
   *
   * @return {PositionalAudio} 对此实例的引用。
   */
  connect() {
    // 调用父类的连接方法
    super.connect();

    // 连接平移器到增益节点
    this.panner.connect(this.gain);

    return this;
  }

  /**
   * 断开音频源连接。重写父类方法以包含平移器节点。
   *
   * @return {PositionalAudio} 对此实例的引用。
   */
  disconnect() {
    // 调用父类的断开连接方法
    super.disconnect();

    // 断开平移器与增益节点的连接
    this.panner.disconnect(this.gain);

    return this;
  }

  /**
   * 返回输出音频节点。重写父类方法以返回平移器节点。
   *
   * @return {PannerNode} 平移器节点。
   */
  getOutput() {
    // 返回平移器节点作为输出
    return this.panner;
  }

  /**
   * 返回当前参考距离。
   *
   * @return {number} 参考距离。
   */
  getRefDistance() {
    // 返回平移器的参考距离
    return this.panner.refDistance;
  }

  /**
   * 定义当音频源远离监听器时减少音量的参考距离 —— 即音量减少
   * 开始生效的距离。
   *
   * @param {number} value - 要设置的参考距离。
   * @return {PositionalAudio} 对此实例的引用。
   */
  setRefDistance(value) {
    // 设置平移器的参考距离
    this.panner.refDistance = value;

    return this;
  }

  /**
   * 返回当前衰减因子。
   *
   * @return {number} 衰减因子。
   */
  getRolloffFactor() {
    // 返回平移器的衰减因子
    return this.panner.rolloffFactor;
  }

  /**
   * 定义当音源远离监听器时音量减少的速度。
   *
   * @param {number} value - 衰减因子。
   * @return {PositionalAudio} 对此实例的引用。
   */
  setRolloffFactor(value) {
    // 设置平移器的衰减因子
    this.panner.rolloffFactor = value;

    return this;
  }

  /**
   * 返回当前距离模型。
   *
   * @return {('linear'|'inverse'|'exponential')} 距离模型。
   */
  getDistanceModel() {
    // 返回平移器的距离模型
    return this.panner.distanceModel;
  }

  /**
   * 定义当音频源远离监听器时用于减少音量的算法。
   *
   * 阅读 [规范]{@link https://www.w3.org/TR/webaudio-1.1/#enumdef-distancemodeltype}
   * 了解更多详情。
   *
   * @param {('linear'|'inverse'|'exponential')} value - 要设置的距离模型。
   * @return {PositionalAudio} 对此实例的引用。
   */
  setDistanceModel(value) {
    // 设置平移器的距离模型
    this.panner.distanceModel = value;

    return this;
  }

  /**
   * 返回当前最大距离。
   *
   * @return {number} 最大距离。
   */
  getMaxDistance() {
    // 返回平移器的最大距离
    return this.panner.maxDistance;
  }

  /**
   * 定义音频源和监听器之间的最大距离，
   * 超过此距离后音量不再进一步减少。
   *
   * 此值仅由 `linear` 距离模型使用。
   *
   * @param {number} value - 最大距离。
   * @return {PositionalAudio} 对此实例的引用。
   */
  setMaxDistance(value) {
    // 设置平移器的最大距离
    this.panner.maxDistance = value;

    return this;
  }

  /**
   * 设置可以听到音频的方向锥体。
   *
   * @param {number} coneInnerAngle - 锥体内角，以度为单位，在此角度内不会有音量减少。
   * @param {number} coneOuterAngle - 锥体外角，以度为单位，在此角度外音量将被 `coneOuterGain` 参数定义的常量值减少。
   * @param {number} coneOuterGain - 在 `coneOuterAngle` 定义的锥体外的音量减少量。当设置为 `0` 时，听不到声音。
   * @return {PositionalAudio} 对此实例的引用。
   */
  setDirectionalCone(coneInnerAngle, coneOuterAngle, coneOuterGain) {
    // 设置锥体内角
    this.panner.coneInnerAngle = coneInnerAngle;
    // 设置锥体外角
    this.panner.coneOuterAngle = coneOuterAngle;
    // 设置锥体外增益
    this.panner.coneOuterGain = coneOuterGain;

    return this;
  }

  /**
   * 更新世界矩阵并同步位置性音频的位置和方向。
   *
   * @param {boolean} force - 是否强制更新。
   */
  updateMatrixWorld(force) {
    // 调用父类的updateMatrixWorld方法
    super.updateMatrixWorld(force);

    // 如果有播放控制但未播放，则直接返回
    if (this.hasPlaybackControl === true && this.isPlaying === false) return;

    // 分解世界矩阵为位置、旋转和缩放
    this.matrixWorld.decompose(_position, _quaternion, _scale);

    // 计算方向向量（前向方向）
    _orientation.set(0, 0, 1).applyQuaternion(_quaternion);

    // 获取平移器引用
    const panner = this.panner;

    // 检查平移器是否支持分离的位置属性
    if (panner.positionX) {
      // Chrome和Firefox浏览器的代码路径（参见 #14393）

      // 计算结束时间
      const endTime = this.context.currentTime + this.listener.timeDelta;

      // 使用线性渐变设置位置
      panner.positionX.linearRampToValueAtTime(_position.x, endTime);
      panner.positionY.linearRampToValueAtTime(_position.y, endTime);
      panner.positionZ.linearRampToValueAtTime(_position.z, endTime);
      // 使用线性渐变设置方向
      panner.orientationX.linearRampToValueAtTime(_orientation.x, endTime);
      panner.orientationY.linearRampToValueAtTime(_orientation.y, endTime);
      panner.orientationZ.linearRampToValueAtTime(_orientation.z, endTime);
    } else {
      // 旧版浏览器的代码路径
      // 直接设置位置
      panner.setPosition(_position.x, _position.y, _position.z);
      // 直接设置方向
      panner.setOrientation(_orientation.x, _orientation.y, _orientation.z);
    }
  }
}

// 导出PositionalAudio类
export { PositionalAudio };
