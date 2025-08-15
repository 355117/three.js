// 导入动画相关的常量：结束模式、循环模式、混合模式等
import { WrapAroundEnding, ZeroCurvatureEnding, ZeroSlopeEnding, LoopPingPong, LoopOnce, LoopRepeat, NormalAnimationBlendMode, AdditiveAnimationBlendMode } from "../constants.js";

/**
 * AnimationAction 类的实例用于调度存储在 AnimationClip 中的动画播放
 * An instance of `AnimationAction` schedules the playback of an animation which is
 * stored in {@link AnimationClip}.
 */
class AnimationAction {
  /**
   * 构造一个新的动画动作
   * Constructs a new animation action.
   *
   * @param {AnimationMixer} mixer - 被此动作控制的混合器 The mixer that is controlled by this action.
   * @param {AnimationClip} clip - 包含实际关键帧的动画剪辑 The animation clip that holds the actual keyframes.
   * @param {?Object3D} [localRoot=null] - 执行此动作的根对象 The root object on which this action is performed.
   * @param {(NormalAnimationBlendMode|AdditiveAnimationBlendMode)} [blendMode] - 混合模式 The blend mode.
   */
  constructor(mixer, clip, localRoot = null, blendMode = clip.blendMode) {
    // 存储动画混合器的引用
    this._mixer = mixer;
    // 存储动画剪辑的引用
    this._clip = clip;
    // 存储本地根对象的引用
    this._localRoot = localRoot;

    /**
     * 定义当同时播放两个或多个动画时如何混合/组合动画
     * Defines how the animation is blended/combined when two or more animations
     * are simultaneously played.
     *
     * @type {(NormalAnimationBlendMode|AdditiveAnimationBlendMode)}
     */
    this.blendMode = blendMode;

    // 获取动画剪辑中的轨道数组
    const tracks = clip.tracks,
      // 获取轨道数量
      nTracks = tracks.length,
      // 创建插值器数组
      interpolants = new Array(nTracks);

    // 插值器设置对象，定义开始和结束的插值模式
    const interpolantSettings = {
      endingStart: ZeroCurvatureEnding, // 开始时使用零曲率结束模式
      endingEnd: ZeroCurvatureEnding, // 结束时使用零曲率结束模式
    };

    // 为每个轨道创建插值器
    for (let i = 0; i !== nTracks; ++i) {
      // 为当前轨道创建插值器
      const interpolant = tracks[i].createInterpolant(null);
      // 将插值器存储到数组中
      interpolants[i] = interpolant;
      // 设置插值器的配置
      interpolant.settings = interpolantSettings;
    }

    // 存储插值器设置的引用
    this._interpolantSettings = interpolantSettings;

    // 存储插值器数组（由混合器绑定）
    this._interpolants = interpolants; // bound by the mixer

    // 内部：PropertyMixer（由混合器管理）
    // inside: PropertyMixer (managed by the mixer)
    this._propertyBindings = new Array(nTracks);

    // 用于内存管理器的缓存索引
    this._cacheIndex = null; // for the memory manager
    // 用于内存管理器的按剪辑缓存索引
    this._byClipCacheIndex = null; // for the memory manager

    // 时间缩放插值器，用于时间扭曲效果
    this._timeScaleInterpolant = null;
    // 权重插值器，用于淡入淡出效果
    this._weightInterpolant = null;

    /**
     * 循环模式，通过 {@link AnimationAction#setLoop} 设置
     * The loop mode, set via {@link AnimationAction#setLoop}.
     *
     * @type {(LoopRepeat|LoopOnce|LoopPingPong)}
     * @default LoopRepeat
     */
    this.loop = LoopRepeat;
    // 循环计数，-1表示尚未开始
    this._loopCount = -1;

    // 动作开始时的全局混合器时间
    // global mixer time when the action is to be started
    // 动作开始时会被设置回 'null'
    // it's set back to 'null' upon start of the action
    this._startTime = null;

    /**
     * 此动作的本地时间（以秒为单位，从 `0` 开始）
     * The local time of this action (in seconds, starting with `0`).
     *
     * 该值会被限制或包装到 `[0,clip.duration]`（根据循环状态）
     * The value gets clamped or wrapped to `[0,clip.duration]` (according to the
     * loop state).
     *
     * @type {number}
     * @default Infinity
     */
    this.time = 0;

    /**
     * {@link AnimationAction#time} 的缩放因子。值为 `0` 会导致动画暂停。
     * 负值会导致动画反向播放。
     * Scaling factor for the {@link AnimationAction#time}. A value of `0` causes the
     * animation to pause. Negative values cause the animation to play backwards.
     *
     * @type {number}
     * @default 1
     */
    this.timeScale = 1;
    // 有效的时间缩放值
    this._effectiveTimeScale = 1;

    /**
     * 此动作的影响程度（在区间 `[0, 1]` 内）。
     * 介于 `0`（无影响）和 `1`（完全影响）之间的值可用于在多个动作之间进行混合。
     * The degree of influence of this action (in the interval `[0, 1]`). Values
     * between `0` (no impact) and `1` (full impact) can be used to blend between
     * several actions.
     *
     * @type {number}
     * @default 1
     */
    this.weight = 1;
    // 有效的权重值
    this._effectiveWeight = 1;

    /**
     * 在此动作过程中执行剪辑的重复次数。
     * 可以通过 {@link AnimationAction#setLoop} 设置。
     * The number of repetitions of the performed clip over the course of this action.
     * Can be set via {@link AnimationAction#setLoop}.
     *
     * 如果 {@link AnimationAction#loop} 设置为 `THREE:LoopOnce`，
     * 设置此数字无效。
     * Setting this number has no effect if {@link AnimationAction#loop} is set to
     * `THREE:LoopOnce`.
     *
     * @type {number}
     * @default Infinity
     */
    this.repetitions = Infinity;

    /**
     * 如果设置为 `true`，动作的播放将被暂停。
     * If set to `true`, the playback of the action is paused.
     *
     * @type {boolean}
     * @default false
     */
    this.paused = false;

    /**
     * 如果设置为 `false`，动作将被禁用，因此没有影响。
     * If set to `false`, the action is disabled so it has no impact.
     *
     * 当动作重新启用时，动画从其当前时间继续
     * （将 `enabled` 设置为 `false` 不会重置动作）。
     * When the action is re-enabled, the animation continues from its current
     * time (setting `enabled` to `false` doesn't reset the action).
     *
     * @type {boolean}
     * @default true
     */
    this.enabled = true;

    /**
     * 如果设置为 true，动画将在最后一帧自动暂停。
     * If set to true the animation will automatically be paused on its last frame.
     *
     * 如果设置为 false，当动作的最后一个循环完成时，
     * {@link AnimationAction#enabled} 将自动切换为 `false`，
     * 使此动作不再有影响。
     * If set to false, {@link AnimationAction#enabled} will automatically be switched
     * to `false` when the last loop of the action has finished, so that this action has
     * no further impact.
     *
     * 注意：如果动作被中断，此成员没有影响
     * （只有在最后一个循环真正完成时才有效果）。
     * Note: This member has no impact if the action is interrupted (it
     * has only an effect if its last loop has really finished).
     *
     * @type {boolean}
     * @default false
     */
    this.clampWhenFinished = false;

    /**
     * 启用平滑插值，无需为开始、循环和结束使用单独的剪辑。
     * Enables smooth interpolation without separate clips for start, loop and end.
     *
     * @type {boolean}
     * @default true
     */
    this.zeroSlopeAtStart = true;

    /**
     * 启用平滑插值，无需为开始、循环和结束使用单独的剪辑。
     * Enables smooth interpolation without separate clips for start, loop and end.
     *
     * @type {boolean}
     * @default true
     */
    this.zeroSlopeAtEnd = true;
  }

  /**
   * 开始播放动画
   * Starts the playback of the animation.
   *
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  play() {
    // 通过混合器激活此动作
    this._mixer._activateAction(this);

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 停止播放动画
   * Stops the playback of the animation.
   *
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  stop() {
    // 通过混合器停用此动作
    this._mixer._deactivateAction(this);

    // 停止后重置动作状态
    return this.reset();
  }

  /**
   * 重置动画播放状态
   * Resets the playback of the animation.
   *
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  reset() {
    // 取消暂停状态
    this.paused = false;
    // 启用动作
    this.enabled = true;

    // 重置时间到开始位置
    this.time = 0; // restart clip
    // 忘记之前的循环计数
    this._loopCount = -1; // forget previous loops
    // 忘记调度时间
    this._startTime = null; // forget scheduling

    // 停止淡入淡出和时间扭曲效果，并返回自身
    return this.stopFading().stopWarping();
  }

  /**
   * 返回动画是否正在运行
   * Returns `true` if the animation is running.
   *
   * @return {boolean} 动画是否正在运行 Whether the animation is running or not.
   */
  isRunning() {
    // 检查动画运行的所有必要条件：启用、未暂停、时间缩放不为零、没有延迟开始时间、在混合器中处于活动状态
    return this.enabled && !this.paused && this.timeScale !== 0 && this._startTime === null && this._mixer._isActiveAction(this);
  }

  /**
   * 当调用了 {@link AnimationAction#play} 时返回 `true`
   * Returns `true` when {@link AnimationAction#play} has been called.
   *
   * @return {boolean} 动画是否已被调度 Whether the animation is scheduled or not.
   */
  isScheduled() {
    // 检查此动作是否在混合器中处于活动状态
    return this._mixer._isActiveAction(this);
  }

  /**
   * 定义动画应该开始的时间
   * Defines the time when the animation should start.
   *
   * @param {number} time - 开始时间（秒） The start time in seconds.
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  startAt(time) {
    // 设置开始时间
    this._startTime = time;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 配置此动作的循环设置
   * Configures the loop settings for this action.
   *
   * @param {(LoopRepeat|LoopOnce|LoopPingPong)} mode - 循环模式 The loop mode.
   * @param {number} repetitions - 重复次数 The number of repetitions.
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  setLoop(mode, repetitions) {
    // 设置循环模式
    this.loop = mode;
    // 设置重复次数
    this.repetitions = repetitions;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 设置此动作的有效权重
   * Sets the effective weight of this action.
   *
   * 当动作被禁用时，动作没有效果，因此有效权重为零
   * An action has no effect and thus an effective weight of zero when the
   * action is disabled.
   *
   * @param {number} weight - 要设置的权重 The weight to set.
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  setEffectiveWeight(weight) {
    // 设置权重值
    this.weight = weight;

    // 注意：与运行时更新时的逻辑相同
    // note: same logic as when updated at runtime
    // 如果动作启用则使用设置的权重，否则为0
    this._effectiveWeight = this.enabled ? weight : 0;

    // 停止淡入淡出效果并返回自身
    return this.stopFading();
  }

  /**
   * 返回此动作的有效权重
   * Returns the effective weight of this action.
   *
   * @return {number} 有效权重 The effective weight.
   */
  getEffectiveWeight() {
    // 返回当前的有效权重
    return this._effectiveWeight;
  }

  /**
   * 通过在指定时间间隔内将权重从 `0` 逐渐增加到 `1` 来淡入动画
   * Fades the animation in by increasing its weight gradually from `0` to `1`,
   * within the passed time interval.
   *
   * @param {number} duration - 淡入持续时间 The duration of the fade.
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  fadeIn(duration) {
    // 调度淡入效果：从权重0到权重1
    return this._scheduleFading(duration, 0, 1);
  }

  /**
   * 通过在指定时间间隔内将权重从 `1` 逐渐减少到 `0` 来淡出动画
   * Fades the animation out by decreasing its weight gradually from `1` to `0`,
   * within the passed time interval.
   *
   * @param {number} duration - 淡出持续时间 The duration of the fade.
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  fadeOut(duration) {
    // 调度淡出效果：从权重1到权重0
    return this._scheduleFading(duration, 1, 0);
  }

  /**
   * 使此动作淡入，同时使给定动作淡出，在指定时间间隔内完成
   * Causes this action to fade in and the given action to fade out,
   * within the passed time interval.
   *
   * @param {AnimationAction} fadeOutAction - 要淡出的动画动作 The animation action to fade out.
   * @param {number} duration - 淡入淡出持续时间 The duration of the fade.
   * @param {boolean} [warp=false] - 是否使用时间扭曲 Whether warping should be used or not.
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  crossFadeFrom(fadeOutAction, duration, warp = false) {
    // 让传入的动作淡出
    fadeOutAction.fadeOut(duration);
    // 让当前动作淡入
    this.fadeIn(duration);

    // 如果启用了时间扭曲
    if (warp === true) {
      // 获取淡入动画的持续时间
      const fadeInDuration = this._clip.duration,
        // 获取淡出动画的持续时间
        fadeOutDuration = fadeOutAction._clip.duration,
        // 计算开始到结束的比率
        startEndRatio = fadeOutDuration / fadeInDuration,
        // 计算结束到开始的比率
        endStartRatio = fadeInDuration / fadeOutDuration;

      // 对淡出动作应用时间扭曲
      fadeOutAction.warp(1.0, startEndRatio, duration);
      // 对当前动作应用时间扭曲
      this.warp(endStartRatio, 1.0, duration);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 使此动作淡出，同时使给定动作淡入，在指定时间间隔内完成
   * Causes this action to fade out and the given action to fade in,
   * within the passed time interval.
   *
   * @param {AnimationAction} fadeInAction - 要淡入的动画动作 The animation action to fade in.
   * @param {number} duration - 淡入淡出持续时间 The duration of the fade.
   * @param {boolean} [warp=false] - 是否使用时间扭曲 Whether warping should be used or not.
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  crossFadeTo(fadeInAction, duration, warp = false) {
    // 委托给目标动作的crossFadeFrom方法
    return fadeInAction.crossFadeFrom(this, duration, warp);
  }

  /**
   * 停止应用于此动作的任何淡入淡出效果
   * Stops any fading which is applied to this action.
   *
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  stopFading() {
    // 获取权重插值器的引用
    const weightInterpolant = this._weightInterpolant;

    // 如果存在权重插值器
    if (weightInterpolant !== null) {
      // 清除权重插值器引用
      this._weightInterpolant = null;
      // 将插值器归还给混合器
      this._mixer._takeBackControlInterpolant(weightInterpolant);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 设置此动作的有效时间缩放
   * Sets the effective time scale of this action.
   *
   * 当动作暂停时，动作没有效果，因此有效时间缩放为零
   * An action has no effect and thus an effective time scale of zero when the
   * action is paused.
   *
   * @param {number} timeScale - 要设置的时间缩放 The time scale to set.
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  setEffectiveTimeScale(timeScale) {
    // 设置时间缩放值
    this.timeScale = timeScale;
    // 如果暂停则有效时间缩放为0，否则使用设置的值
    this._effectiveTimeScale = this.paused ? 0 : timeScale;

    // 停止时间扭曲效果并返回自身
    return this.stopWarping();
  }

  /**
   * 返回此动作的有效时间缩放
   * Returns the effective time scale of this action.
   *
   * @return {number} 有效时间缩放 The effective time scale.
   */
  getEffectiveTimeScale() {
    // 返回当前的有效时间缩放
    return this._effectiveTimeScale;
  }

  /**
   * 设置此动作单次循环的持续时间
   * Sets the duration for a single loop of this action.
   *
   * @param {number} duration - 要设置的持续时间 The duration to set.
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  setDuration(duration) {
    // 通过调整时间缩放来设置持续时间
    this.timeScale = this._clip.duration / duration;

    // 停止时间扭曲效果并返回自身
    return this.stopWarping();
  }

  /**
   * 将此动作与传入的其他动作同步
   * Synchronizes this action with the passed other action.
   *
   * @param {AnimationAction} action - 要同步的动作 The action to sync with.
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  syncWith(action) {
    // 同步时间
    this.time = action.time;
    // 同步时间缩放
    this.timeScale = action.timeScale;

    // 停止时间扭曲效果并返回自身
    return this.stopWarping();
  }

  /**
   * 在指定时间间隔内将此动画的速度减速到 `0`
   * Decelerates this animation's speed to `0` within the passed time interval.
   *
   * @param {number} duration - 减速持续时间 The duration.
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  halt(duration) {
    // 使用warp方法从当前有效时间缩放减速到0
    return this.warp(this._effectiveTimeScale, 0, duration);
  }

  /**
   * 在指定时间间隔内通过逐渐修改 {@link AnimationAction#timeScale}
   * 从 `startTimeScale` 到 `endTimeScale` 来改变播放速度
   * Changes the playback speed, within the passed time interval, by modifying
   * {@link AnimationAction#timeScale} gradually from `startTimeScale` to
   * `endTimeScale`.
   *
   * @param {number} startTimeScale - 开始时间缩放 The start time scale.
   * @param {number} endTimeScale - 结束时间缩放 The end time scale.
   * @param {number} duration - 扭曲持续时间 The duration.
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  warp(startTimeScale, endTimeScale, duration) {
    // 获取混合器引用
    const mixer = this._mixer,
      // 获取当前时间
      now = mixer.time,
      // 获取当前时间缩放
      timeScale = this.timeScale;

    // 获取时间缩放插值器
    let interpolant = this._timeScaleInterpolant;

    // 如果插值器不存在，从混合器借用一个
    if (interpolant === null) {
      interpolant = mixer._lendControlInterpolant();
      this._timeScaleInterpolant = interpolant;
    }

    // 获取插值器的时间位置和采样值数组
    const times = interpolant.parameterPositions,
      values = interpolant.sampleValues;

    // 设置开始时间
    times[0] = now;
    // 设置结束时间
    times[1] = now + duration;

    // 设置开始时间缩放值（相对于当前时间缩放）
    values[0] = startTimeScale / timeScale;
    // 设置结束时间缩放值（相对于当前时间缩放）
    values[1] = endTimeScale / timeScale;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 停止应用于此动作的任何已调度的时间扭曲
   * Stops any scheduled warping which is applied to this action.
   *
   * @return {AnimationAction} 返回此动画动作的引用 A reference to this animation action.
   */
  stopWarping() {
    // 获取时间缩放插值器的引用
    const timeScaleInterpolant = this._timeScaleInterpolant;

    // 如果存在时间缩放插值器
    if (timeScaleInterpolant !== null) {
      // 清除时间缩放插值器引用
      this._timeScaleInterpolant = null;
      // 将插值器归还给混合器
      this._mixer._takeBackControlInterpolant(timeScaleInterpolant);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 返回此动画动作的动画混合器
   * Returns the animation mixer of this animation action.
   *
   * @return {AnimationMixer} 动画混合器 The animation mixer.
   */
  getMixer() {
    // 返回混合器引用
    return this._mixer;
  }

  /**
   * 返回此动画动作的动画剪辑
   * Returns the animation clip of this animation action.
   *
   * @return {AnimationClip} 动画剪辑 The animation clip.
   */
  getClip() {
    // 返回动画剪辑引用
    return this._clip;
  }

  /**
   * 返回此动画动作的根对象
   * Returns the root object of this animation action.
   *
   * @return {Object3D} 根对象 The root object.
   */
  getRoot() {
    // 返回本地根对象，如果不存在则返回混合器的根对象
    return this._localRoot || this._mixer._root;
  }

  // 内部方法
  // Interna

  /**
   * 更新动画动作（由混合器调用）
   * Updates the animation action (called by the mixer)
   *
   * @param {number} time - 当前时间 Current time
   * @param {number} deltaTime - 时间增量 Time delta
   * @param {number} timeDirection - 时间方向 Time direction
   * @param {number} accuIndex - 累积索引 Accumulation index
   */
  _update(time, deltaTime, timeDirection, accuIndex) {
    // 由混合器调用
    // called by the mixer

    // 如果动作未启用
    if (!this.enabled) {
      // 调用 ._updateWeight() 来更新 ._effectiveWeight
      // call ._updateWeight() to update ._effectiveWeight

      this._updateWeight(time);
      return;
    }

    // 获取开始时间
    const startTime = this._startTime;

    // 如果设置了开始时间
    if (startTime !== null) {
      // 检查动作的调度开始
      // check for scheduled start of action

      // 计算已运行时间
      const timeRunning = (time - startTime) * timeDirection;
      // 如果还未到开始时间或时间方向为0
      if (timeRunning < 0 || timeDirection === 0) {
        // 设置时间增量为0
        deltaTime = 0;
      } else {
        // 取消调度
        this._startTime = null; // unschedule
        // 计算实际的时间增量
        deltaTime = timeDirection * timeRunning;
      }
    }

    // 应用时间缩放并推进时间
    // apply time scale and advance time

    // 应用时间缩放更新
    deltaTime *= this._updateTimeScale(time);
    // 更新剪辑时间
    const clipTime = this._updateTime(deltaTime);

    // 注意：_updateTime 可能会禁用动作，导致有效权重为 0
    // note: _updateTime may disable the action resulting in
    // an effective weight of 0

    // 更新权重
    const weight = this._updateWeight(time);

    // 如果权重大于0
    if (weight > 0) {
      // 获取插值器数组
      const interpolants = this._interpolants;
      // 获取属性混合器数组
      const propertyMixers = this._propertyBindings;

      // 根据混合模式处理插值
      switch (this.blendMode) {
        // 加法动画混合模式
        case AdditiveAnimationBlendMode:
          // 遍历所有插值器
          for (let j = 0, m = interpolants.length; j !== m; ++j) {
            // 在指定时间评估插值器
            interpolants[j].evaluate(clipTime);
            // 使用加法方式累积属性值
            propertyMixers[j].accumulateAdditive(weight);
          }

          break;

        // 正常动画混合模式（默认）
        case NormalAnimationBlendMode:
        default:
          // 遍历所有插值器
          for (let j = 0, m = interpolants.length; j !== m; ++j) {
            // 在指定时间评估插值器
            interpolants[j].evaluate(clipTime);
            // 使用正常方式累积属性值
            propertyMixers[j].accumulate(accuIndex, weight);
          }
      }
    }
  }

  /**
   * 更新权重（内部方法）
   * Updates the weight (internal method)
   *
   * @param {number} time - 当前时间 Current time
   * @return {number} 返回有效权重 Returns the effective weight
   */
  _updateWeight(time) {
    // 初始化权重为0
    let weight = 0;

    // 如果动作已启用
    if (this.enabled) {
      // 使用设置的权重
      weight = this.weight;
      // 获取权重插值器
      const interpolant = this._weightInterpolant;

      // 如果存在权重插值器（淡入淡出效果）
      if (interpolant !== null) {
        // 在当前时间评估插值器值
        const interpolantValue = interpolant.evaluate(time)[0];

        // 将权重乘以插值器值
        weight *= interpolantValue;

        // 如果超过了插值器的结束时间
        if (time > interpolant.parameterPositions[1]) {
          // 停止淡入淡出效果
          this.stopFading();

          // 如果插值器值为0（完全淡出）
          if (interpolantValue === 0) {
            // 淡出完成，禁用动作
            // faded out, disable
            this.enabled = false;
          }
        }
      }
    }

    // 设置有效权重
    this._effectiveWeight = weight;
    // 返回权重值
    return weight;
  }

  /**
   * 更新时间缩放（内部方法）
   * Updates the time scale (internal method)
   *
   * @param {number} time - 当前时间 Current time
   * @return {number} 返回有效时间缩放 Returns the effective time scale
   */
  _updateTimeScale(time) {
    // 初始化时间缩放为0
    let timeScale = 0;

    // 如果动作未暂停
    if (!this.paused) {
      // 使用设置的时间缩放
      timeScale = this.timeScale;

      // 获取时间缩放插值器
      const interpolant = this._timeScaleInterpolant;

      // 如果存在时间缩放插值器（时间扭曲效果）
      if (interpolant !== null) {
        // 在当前时间评估插值器值
        const interpolantValue = interpolant.evaluate(time)[0];

        // 将时间缩放乘以插值器值
        timeScale *= interpolantValue;

        // 如果超过了插值器的结束时间
        if (time > interpolant.parameterPositions[1]) {
          // 停止时间扭曲效果
          this.stopWarping();

          // 如果时间缩放为0
          if (timeScale === 0) {
            // 运动已停止，暂停动作
            // motion has halted, pause
            this.paused = true;
          } else {
            // 扭曲完成 - 应用最终时间缩放
            // warp done - apply final time scale
            this.timeScale = timeScale;
          }
        }
      }
    }

    // 设置有效时间缩放
    this._effectiveTimeScale = timeScale;
    // 返回时间缩放值
    return timeScale;
  }

  /**
   * 更新时间（内部方法）
   * Updates the time (internal method)
   *
   * @param {number} deltaTime - 时间增量 Time delta
   * @return {number} 返回剪辑时间 Returns the clip time
   */
  _updateTime(deltaTime) {
    // 获取剪辑持续时间
    const duration = this._clip.duration;
    // 获取循环模式
    const loop = this.loop;

    // 计算新的时间
    let time = this.time + deltaTime;
    // 获取循环计数
    let loopCount = this._loopCount;

    // 检查是否为乒乓循环模式
    const pingPong = loop === LoopPingPong;

    // 如果时间增量为0
    if (deltaTime === 0) {
      // 如果尚未开始循环，直接返回时间
      if (loopCount === -1) return time;

      // 对于乒乓模式，奇数循环时反转时间
      return pingPong && (loopCount & 1) === 1 ? duration - time : time;
    }

    // 如果是单次循环模式
    if (loop === LoopOnce) {
      // 如果刚开始
      if (loopCount === -1) {
        // 刚开始
        // just started

        // 设置循环计数为0
        this._loopCount = 0;
        // 设置结束模式
        this._setEndings(true, true, false);
      }

      // 处理停止逻辑的标签块
      handle_stop: {
        // 如果时间超过持续时间
        if (time >= duration) {
          // 限制时间为持续时间
          time = duration;
        } else if (time < 0) {
          // 如果时间小于0，限制为0
          time = 0;
        } else {
          // 时间在有效范围内，更新时间并跳出停止处理
          this.time = time;

          break handle_stop;
        }

        // 根据clampWhenFinished设置决定暂停还是禁用
        if (this.clampWhenFinished) this.paused = true;
        else this.enabled = false;

        // 设置最终时间
        this.time = time;

        // 派发完成事件
        this._mixer.dispatchEvent({
          type: "finished",
          action: this,
          direction: deltaTime < 0 ? -1 : 1,
        });
      }
    } else {
      // 重复循环模式（Repeat 或 PingPong）
      // repetitive Repeat or PingPong

      // 如果刚开始
      if (loopCount === -1) {
        // 刚开始
        // just started

        // 如果时间增量为正（正向播放）
        if (deltaTime >= 0) {
          // 设置循环计数为0
          loopCount = 0;

          // 设置结束模式
          this._setEndings(true, this.repetitions === 0, pingPong);
        } else {
          // 当反向循环时，初始通过零点的转换算作一次重复，
          // 所以保持 loopCount 为 -1
          // when looping in reverse direction, the initial
          // transition through zero counts as a repetition,
          // so leave loopCount at -1

          this._setEndings(this.repetitions === 0, true, pingPong);
        }
      }

      // 如果时间超出范围
      if (time >= duration || time < 0) {
        // 环绕处理
        // wrap around

        // 计算循环增量（带符号）
        const loopDelta = Math.floor(time / duration); // signed
        // 调整时间到有效范围内
        time -= duration * loopDelta;

        // 增加循环计数
        loopCount += Math.abs(loopDelta);

        // 计算剩余重复次数
        const pending = this.repetitions - loopCount;

        // 如果没有剩余重复次数
        if (pending <= 0) {
          // 必须停止（切换状态、限制时间、触发事件）
          // have to stop (switch state, clamp time, fire event)

          // 根据clampWhenFinished设置决定暂停还是禁用
          if (this.clampWhenFinished) this.paused = true;
          else this.enabled = false;

          // 设置最终时间
          time = deltaTime > 0 ? duration : 0;

          // 设置最终时间
          this.time = time;

          // 派发完成事件
          this._mixer.dispatchEvent({
            type: "finished",
            action: this,
            direction: deltaTime > 0 ? 1 : -1,
          });
        } else {
          // 继续运行
          // keep running

          // 如果只剩一次重复
          if (pending === 1) {
            // 进入最后一轮
            // entering the last round

            // 检查是否在开始位置
            const atStart = deltaTime < 0;
            // 设置结束模式
            this._setEndings(atStart, !atStart, pingPong);
          } else {
            // 设置中间循环的结束模式
            this._setEndings(false, false, pingPong);
          }

          // 更新循环计数
          this._loopCount = loopCount;

          // 更新时间
          this.time = time;

          // 派发循环事件
          this._mixer.dispatchEvent({
            type: "loop",
            action: this,
            loopDelta: loopDelta,
          });
        }
      } else {
        // 时间在正常范围内，直接更新
        this.time = time;
      }

      // 如果是乒乓模式且为奇数循环
      if (pingPong && (loopCount & 1) === 1) {
        // 为"乒乓回合"反转时间
        // invert time for the "pong round"

        return duration - time;
      }
    }

    // 返回最终时间
    return time;
  }

  /**
   * 设置插值结束模式（内部方法）
   * Sets the interpolation ending modes (internal method)
   *
   * @param {boolean} atStart - 是否在开始位置 Whether at start position
   * @param {boolean} atEnd - 是否在结束位置 Whether at end position
   * @param {boolean} pingPong - 是否为乒乓模式 Whether in ping-pong mode
   */
  _setEndings(atStart, atEnd, pingPong) {
    // 获取插值器设置
    const settings = this._interpolantSettings;

    // 如果是乒乓模式
    if (pingPong) {
      // 开始和结束都使用零斜率结束模式
      settings.endingStart = ZeroSlopeEnding;
      settings.endingEnd = ZeroSlopeEnding;
    } else {
      // 假设对于 LoopOnce，atStart == atEnd == true
      // assuming for LoopOnce atStart == atEnd == true

      // 设置开始结束模式
      if (atStart) {
        // 根据zeroSlopeAtStart设置选择零斜率或零曲率结束模式
        settings.endingStart = this.zeroSlopeAtStart ? ZeroSlopeEnding : ZeroCurvatureEnding;
      } else {
        // 使用环绕结束模式
        settings.endingStart = WrapAroundEnding;
      }

      // 设置结束结束模式
      if (atEnd) {
        // 根据zeroSlopeAtEnd设置选择零斜率或零曲率结束模式
        settings.endingEnd = this.zeroSlopeAtEnd ? ZeroSlopeEnding : ZeroCurvatureEnding;
      } else {
        // 使用环绕结束模式
        settings.endingEnd = WrapAroundEnding;
      }
    }
  }

  /**
   * 调度淡入淡出效果（内部方法）
   * Schedules fading effect (internal method)
   *
   * @param {number} duration - 淡入淡出持续时间 Fading duration
   * @param {number} weightNow - 当前权重 Current weight
   * @param {number} weightThen - 目标权重 Target weight
   * @return {AnimationAction} 返回此动画动作的引用 Returns this animation action
   */
  _scheduleFading(duration, weightNow, weightThen) {
    // 获取混合器和当前时间
    const mixer = this._mixer,
      now = mixer.time;
    // 获取权重插值器
    let interpolant = this._weightInterpolant;

    // 如果插值器不存在，从混合器借用一个
    if (interpolant === null) {
      interpolant = mixer._lendControlInterpolant();
      this._weightInterpolant = interpolant;
    }

    // 获取插值器的时间位置和采样值数组
    const times = interpolant.parameterPositions,
      values = interpolant.sampleValues;

    // 设置开始时间和权重
    times[0] = now;
    values[0] = weightNow;
    // 设置结束时间和权重
    times[1] = now + duration;
    values[1] = weightThen;

    // 返回自身以支持链式调用
    return this;
  }
}

// 导出 AnimationAction 类
export { AnimationAction };
