// 从核心模块导入Object3D基类
import { Object3D } from "../core/Object3D.js";

/**
 * 表示一个非位置性（全局）音频对象。
 *
 * 此类和相关的音频模块使用了 [Web Audio API]{@link https://www.w3.org/TR/webaudio-1.1/}。
 *
 * ```js
 * // 创建一个AudioListener并将其添加到相机
 * const listener = new THREE.AudioListener();
 * camera.add( listener );
 *
 * // 创建一个全局音频源
 * const sound = new THREE.Audio( listener );
 *
 * // 加载声音并将其设置为Audio对象的缓冲区
 * const audioLoader = new THREE.AudioLoader();
 * audioLoader.load( 'sounds/ambient.ogg', function( buffer ) {
 * 	sound.setBuffer( buffer );
 * 	sound.setLoop( true );
 * 	sound.setVolume( 0.5 );
 * 	sound.play();
 * });
 * ```
 *
 * @augments Object3D
 */
class Audio extends Object3D {
  /**
   * 构造一个新的音频对象。
   *
   * @param {AudioListener} listener - 全局音频监听器。
   */
  constructor(listener) {
    // 调用父类构造函数
    super();

    // 设置对象类型为'Audio'
    this.type = "Audio";

    /**
     * 全局音频监听器。
     *
     * @type {AudioListener}
     * @readonly
     */
    this.listener = listener;

    /**
     * 音频上下文。
     *
     * @type {AudioContext}
     * @readonly
     */
    this.context = listener.context;

    /**
     * 用于音量控制的增益节点。
     *
     * @type {GainNode}
     * @readonly
     */
    this.gain = this.context.createGain(); // 创建增益节点
    this.gain.connect(listener.getInput()); // 连接到监听器的输入

    /**
     * 是否自动开始播放。
     *
     * @type {boolean}
     * @default false
     */
    this.autoplay = false;

    /**
     * 对音频缓冲区的引用。
     *
     * 通过 {@link Audio#setBuffer} 定义。
     *
     * @type {?AudioBuffer}
     * @default null
     * @readonly
     */
    this.buffer = null;

    /**
     * 修改音调，以音分为单位。+/- 100是一个半音。
     * +/- 1200是一个八度。
     *
     * 通过 {@link Audio#setDetune} 定义。
     *
     * @type {number}
     * @default 0
     * @readonly
     */
    this.detune = 0;

    /**
     * 音频是否应该循环播放。
     *
     * 通过 {@link Audio#setLoop} 定义。
     *
     * @type {boolean}
     * @default false
     * @readonly
     */
    this.loop = false;

    /**
     * 定义音频缓冲区中重播应该开始的位置，以秒为单位。
     *
     * @type {number}
     * @default 0
     */
    this.loopStart = 0;

    /**
     * 定义音频缓冲区中重播应该停止的位置，以秒为单位。
     *
     * @type {number}
     * @default 0
     */
    this.loopEnd = 0;

    /**
     * 音频缓冲区内播放应该开始的时间偏移量，以秒为单位。
     *
     * @type {number}
     * @default 0
     */
    this.offset = 0;

    /**
     * 覆盖音频的默认持续时间。
     *
     * @type {undefined|number}
     * @default undefined
     */
    this.duration = undefined;

    /**
     * 播放速度。
     *
     * 通过 {@link Audio#setPlaybackRate} 定义。
     *
     * @type {number}
     * @readonly
     * @default 1
     */
    this.playbackRate = 1;

    /**
     * 指示音频是否正在播放。
     *
     * 当使用 {@link Audio#play}、{@link Audio#pause}、{@link Audio#stop} 时，
     * 此标志将自动设置。
     *
     * @type {boolean}
     * @readonly
     * @default false
     */
    this.isPlaying = false;

    /**
     * 指示音频播放是否可以通过 {@link Audio#play} 或 {@link Audio#pause}
     * 等方法进行控制。
     *
     * 当定义音频源时，此标志将自动设置。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.hasPlaybackControl = true;

    /**
     * 保存对当前音频源的引用。
     *
     * 此属性由 `set*()` 方法之一自动设置。
     *
     * @type {?AudioNode}
     * @readonly
     * @default null
     */
    this.source = null;

    /**
     * 定义源类型。
     *
     * 此属性由 `set*()` 方法之一自动设置。
     *
     * @type {('empty'|'audioNode'|'mediaNode'|'mediaStreamNode'|'buffer')}
     * @readonly
     * @default 'empty'
     */
    this.sourceType = "empty";

    // 私有属性：记录开始播放的时间
    this._startedAt = 0;
    // 私有属性：记录播放进度
    this._progress = 0;
    // 私有属性：记录是否已连接
    this._connected = false;

    /**
     * 可用于应用各种低阶滤波器来创建更复杂的声音效果，
     * 例如通过 `BiquadFilterNode`。
     *
     * 此属性由 {@link Audio#setFilters} 自动设置。
     *
     * @type {Array<AudioNode>}
     * @readonly
     */
    this.filters = [];
  }

  /**
   * 返回输出音频节点。
   *
   * @return {GainNode} 输出节点。
   */
  getOutput() {
    // 返回增益节点作为输出
    return this.gain;
  }

  /**
   * 将给定的音频节点设置为此实例的源。
   *
   * {@link Audio#sourceType} 被设置为 `audioNode`，{@link Audio#hasPlaybackControl} 被设置为 `false`。
   *
   * @param {AudioNode} audioNode - 音频节点，如 `OscillatorNode` 的实例。
   * @return {Audio} 对此实例的引用。
   */
  setNodeSource(audioNode) {
    // 设置为无播放控制
    this.hasPlaybackControl = false;
    // 设置源类型为音频节点
    this.sourceType = "audioNode";
    // 设置音频源
    this.source = audioNode;
    // 连接音频源
    this.connect();

    return this;
  }

  /**
   * 将给定的媒体元素设置为此实例的源。
   *
   * {@link Audio#sourceType} 被设置为 `mediaNode`，{@link Audio#hasPlaybackControl} 被设置为 `false`。
   *
   * @param {HTMLMediaElement} mediaElement - 媒体元素。
   * @return {Audio} 对此实例的引用。
   */
  setMediaElementSource(mediaElement) {
    // 设置为无播放控制
    this.hasPlaybackControl = false;
    // 设置源类型为媒体节点
    this.sourceType = "mediaNode";
    // 从媒体元素创建音频源
    this.source = this.context.createMediaElementSource(mediaElement);
    // 连接音频源
    this.connect();

    return this;
  }

  /**
   * 将给定的媒体流设置为此实例的源。
   *
   * {@link Audio#sourceType} 被设置为 `mediaStreamNode`，{@link Audio#hasPlaybackControl} 被设置为 `false`。
   *
   * @param {MediaStream} mediaStream - 媒体流。
   * @return {Audio} 对此实例的引用。
   */
  setMediaStreamSource(mediaStream) {
    // 设置为无播放控制
    this.hasPlaybackControl = false;
    // 设置源类型为媒体流节点
    this.sourceType = "mediaStreamNode";
    // 从媒体流创建音频源
    this.source = this.context.createMediaStreamSource(mediaStream);
    // 连接音频源
    this.connect();

    return this;
  }

  /**
   * 将给定的音频缓冲区设置为此实例的源。
   *
   * {@link Audio#sourceType} 被设置为 `buffer`，{@link Audio#hasPlaybackControl} 被设置为 `true`。
   *
   * @param {AudioBuffer} audioBuffer - 音频缓冲区。
   * @return {Audio} 对此实例的引用。
   */
  setBuffer(audioBuffer) {
    // 设置音频缓冲区
    this.buffer = audioBuffer;
    // 设置源类型为缓冲区
    this.sourceType = "buffer";

    // 如果启用了自动播放，则开始播放
    if (this.autoplay) this.play();

    return this;
  }

  /**
   * 开始播放音频。
   *
   * 只能用于允许播放控制的兼容音频源。
   *
   * @param {number} [delay=0] - 音频应该开始播放的延迟时间，以秒为单位。
   * @return {Audio|undefined} 对此实例的引用。
   */
  play(delay = 0) {
    // 检查是否已经在播放
    if (this.isPlaying === true) {
      console.warn("THREE.Audio: Audio is already playing.");
      return;
    }

    // 检查是否有播放控制权限
    if (this.hasPlaybackControl === false) {
      console.warn("THREE.Audio: this Audio has no playback control.");
      return;
    }

    // 记录开始播放的时间
    this._startedAt = this.context.currentTime + delay;

    // 创建缓冲区源
    const source = this.context.createBufferSource();
    source.buffer = this.buffer; // 设置音频缓冲区
    source.loop = this.loop; // 设置循环播放
    source.loopStart = this.loopStart; // 设置循环开始位置
    source.loopEnd = this.loopEnd; // 设置循环结束位置
    source.onended = this.onEnded.bind(this); // 绑定播放结束事件
    // 开始播放，设置开始时间、偏移量和持续时间
    source.start(this._startedAt, this._progress + this.offset, this.duration);

    // 设置播放状态为true
    this.isPlaying = true;

    // 保存音频源引用
    this.source = source;

    // 应用音调调节
    this.setDetune(this.detune);
    // 应用播放速率
    this.setPlaybackRate(this.playbackRate);

    // 连接音频源并返回
    return this.connect();
  }

  /**
   * 暂停音频播放。
   *
   * 只能用于允许播放控制的兼容音频源。
   *
   * @return {Audio|undefined} 对此实例的引用。
   */
  pause() {
    // 检查是否有播放控制权限
    if (this.hasPlaybackControl === false) {
      console.warn("THREE.Audio: this Audio has no playback control.");
      return;
    }

    // 如果正在播放
    if (this.isPlaying === true) {
      // 更新当前播放进度

      this._progress += Math.max(this.context.currentTime - this._startedAt, 0) * this.playbackRate;

      // 如果是循环播放
      if (this.loop === true) {
        // 确保循环音频的进度不超过持续时间

        this._progress = this._progress % (this.duration || this.buffer.duration);
      }

      // 停止音频源
      this.source.stop();
      // 清除结束事件处理器
      this.source.onended = null;

      // 设置播放状态为false
      this.isPlaying = false;
    }

    return this;
  }

  /**
   * 停止音频播放。
   *
   * 只能用于允许播放控制的兼容音频源。
   *
   * @param {number} [delay=0] - 音频应该停止播放的延迟时间，以秒为单位。
   * @return {Audio|undefined} 对此实例的引用。
   */
  stop(delay = 0) {
    // 检查是否有播放控制权限
    if (this.hasPlaybackControl === false) {
      console.warn("THREE.Audio: this Audio has no playback control.");
      return;
    }

    // 重置播放进度
    this._progress = 0;

    // 如果音频源存在
    if (this.source !== null) {
      // 在指定延迟后停止音频源
      this.source.stop(this.context.currentTime + delay);
      // 清除结束事件处理器
      this.source.onended = null;
    }

    // 设置播放状态为false
    this.isPlaying = false;

    return this;
  }

  /**
   * 连接到音频源。这在初始化和设置/移除滤波器时内部使用。
   *
   * @return {Audio} 对此实例的引用。
   */
  connect() {
    // 如果有滤波器
    if (this.filters.length > 0) {
      // 将音频源连接到第一个滤波器
      this.source.connect(this.filters[0]);

      // 将滤波器串联连接
      for (let i = 1, l = this.filters.length; i < l; i++) {
        this.filters[i - 1].connect(this.filters[i]);
      }

      // 将最后一个滤波器连接到输出
      this.filters[this.filters.length - 1].connect(this.getOutput());
    } else {
      // 直接将音频源连接到输出
      this.source.connect(this.getOutput());
    }

    // 标记为已连接
    this._connected = true;

    return this;
  }

  /**
   * 断开与音频源的连接。这在初始化和设置/移除滤波器时内部使用。
   *
   * @return {Audio|undefined} 对此实例的引用。
   */
  disconnect() {
    // 如果未连接则直接返回
    if (this._connected === false) {
      return;
    }

    // 如果有滤波器
    if (this.filters.length > 0) {
      // 断开音频源与第一个滤波器的连接
      this.source.disconnect(this.filters[0]);

      // 断开滤波器之间的连接
      for (let i = 1, l = this.filters.length; i < l; i++) {
        this.filters[i - 1].disconnect(this.filters[i]);
      }

      // 断开最后一个滤波器与输出的连接
      this.filters[this.filters.length - 1].disconnect(this.getOutput());
    } else {
      // 直接断开音频源与输出的连接
      this.source.disconnect(this.getOutput());
    }

    // 标记为未连接
    this._connected = false;

    return this;
  }

  /**
   * 返回当前设置的滤波器。
   *
   * @return {Array<AudioNode>} 滤波器列表。
   */
  getFilters() {
    // 返回滤波器数组
    return this.filters;
  }

  /**
   * 设置滤波器数组并将它们与音频源连接。
   *
   * @param {Array<AudioNode>} [value] - 滤波器列表。
   * @return {Audio} 对此实例的引用。
   */
  setFilters(value) {
    // 如果没有提供值，则设置为空数组
    if (!value) value = [];

    // 如果已连接
    if (this._connected === true) {
      // 先断开连接
      this.disconnect();
      // 设置新的滤波器数组（创建副本）
      this.filters = value.slice();
      // 重新连接
      this.connect();
    } else {
      // 直接设置滤波器数组（创建副本）
      this.filters = value.slice();
    }

    return this;
  }

  /**
   * 定义振荡的失谐，以音分为单位。
   *
   * @param {number} value - 振荡的失谐，以音分为单位。
   * @return {Audio} 对此实例的引用。
   */
  setDetune(value) {
    // 设置失谐值
    this.detune = value;

    // 如果正在播放且音频源支持失谐
    if (this.isPlaying === true && this.source.detune !== undefined) {
      // 在指定时间设置失谐目标值
      this.source.detune.setTargetAtTime(this.detune, this.context.currentTime, 0.01);
    }

    return this;
  }

  /**
   * 返回振荡的失谐，以音分为单位。
   *
   * @return {number} 振荡的失谐，以音分为单位。
   */
  getDetune() {
    // 返回失谐值
    return this.detune;
  }

  /**
   * 返回滤波器列表中的第一个滤波器。
   *
   * @return {AudioNode|undefined} 滤波器列表中的第一个滤波器。
   */
  getFilter() {
    // 返回滤波器数组的第一个元素
    return this.getFilters()[0];
  }

  /**
   * 将单个滤波器节点应用到音频。
   *
   * @param {AudioNode} [filter] - 要设置的滤波器。
   * @return {Audio} 对此实例的引用。
   */
  setFilter(filter) {
    // 如果有滤波器则设置为包含该滤波器的数组，否则设置为空数组
    return this.setFilters(filter ? [filter] : []);
  }

  /**
   * 设置播放速率。
   *
   * 只能用于允许播放控制的兼容音频源。
   *
   * @param {number} [value] - 要设置的播放速率。
   * @return {Audio|undefined} 对此实例的引用。
   */
  setPlaybackRate(value) {
    // 检查是否有播放控制权限
    if (this.hasPlaybackControl === false) {
      console.warn("THREE.Audio: this Audio has no playback control.");
      return;
    }

    // 设置播放速率
    this.playbackRate = value;

    // 如果正在播放，立即应用播放速率
    if (this.isPlaying === true) {
      this.source.playbackRate.setTargetAtTime(this.playbackRate, this.context.currentTime, 0.01);
    }

    return this;
  }

  /**
   * 返回当前播放速率。
   *
   * @return {number} 播放速率。
   */
  getPlaybackRate() {
    // 返回播放速率
    return this.playbackRate;
  }

  /**
   * 播放结束时自动调用。
   */
  onEnded() {
    // 设置播放状态为false
    this.isPlaying = false;
    // 重置播放进度
    this._progress = 0;
  }

  /**
   * 返回循环标志。
   *
   * 只能用于允许播放控制的兼容音频源。
   *
   * @return {boolean} 音频是否应该循环播放。
   */
  getLoop() {
    // 检查是否有播放控制权限
    if (this.hasPlaybackControl === false) {
      console.warn("THREE.Audio: this Audio has no playback control.");
      return false;
    }

    // 返回循环标志
    return this.loop;
  }

  /**
   * 设置循环标志。
   *
   * 只能用于允许播放控制的兼容音频源。
   *
   * @param {boolean} value - 音频是否应该循环播放。
   * @return {Audio|undefined} 对此实例的引用。
   */
  setLoop(value) {
    // 检查是否有播放控制权限
    if (this.hasPlaybackControl === false) {
      console.warn("THREE.Audio: this Audio has no playback control.");
      return;
    }

    // 设置循环标志
    this.loop = value;

    // 如果正在播放，立即应用循环设置
    if (this.isPlaying === true) {
      this.source.loop = this.loop;
    }

    return this;
  }

  /**
   * 设置循环开始值，定义音频缓冲区中重播应该开始的位置，以秒为单位。
   *
   * @param {number} value - 循环开始值。
   * @return {Audio} 对此实例的引用。
   */
  setLoopStart(value) {
    // 设置循环开始位置
    this.loopStart = value;

    return this;
  }

  /**
   * 设置循环结束值，定义音频缓冲区中重播应该停止的位置，以秒为单位。
   *
   * @param {number} value - 循环结束值。
   * @return {Audio} 对此实例的引用。
   */
  setLoopEnd(value) {
    // 设置循环结束位置
    this.loopEnd = value;

    return this;
  }

  /**
   * 返回音量。
   *
   * @return {number} 音量。
   */
  getVolume() {
    // 返回增益节点的音量值
    return this.gain.gain.value;
  }

  /**
   * 设置音量。
   *
   * @param {number} value - 要设置的音量。
   * @return {Audio} 对此实例的引用。
   */
  setVolume(value) {
    // 在指定时间设置增益目标值
    this.gain.gain.setTargetAtTime(value, this.context.currentTime, 0.01);

    return this;
  }

  /**
   * 复制另一个Audio对象的属性到此实例。
   *
   * @param {Audio} source - 要复制的源Audio对象。
   * @param {boolean} recursive - 是否递归复制。
   * @return {Audio} 对此实例的引用。
   */
  copy(source, recursive) {
    // 调用父类的copy方法
    super.copy(source, recursive);

    // 检查源对象的类型是否为buffer
    if (source.sourceType !== "buffer") {
      console.warn("THREE.Audio: Audio source type cannot be copied.");

      return this;
    }

    // 复制自动播放设置
    this.autoplay = source.autoplay;

    // 复制音频相关属性
    this.buffer = source.buffer; // 音频缓冲区
    this.detune = source.detune; // 失谐值
    this.loop = source.loop; // 循环标志
    this.loopStart = source.loopStart; // 循环开始位置
    this.loopEnd = source.loopEnd; // 循环结束位置
    this.offset = source.offset; // 偏移量
    this.duration = source.duration; // 持续时间
    this.playbackRate = source.playbackRate; // 播放速率
    this.hasPlaybackControl = source.hasPlaybackControl; // 播放控制标志
    this.sourceType = source.sourceType; // 源类型

    // 复制滤波器数组（创建副本）
    this.filters = source.filters.slice();

    return this;
  }

  /**
   * 克隆此Audio对象。
   *
   * @param {boolean} recursive - 是否递归克隆。
   * @return {Audio} 新的Audio对象实例。
   */
  clone(recursive) {
    // 创建新的Audio实例并复制当前对象的属性
    return new this.constructor(this.listener).copy(this, recursive);
  }
}

// 导出Audio类
export { Audio };
